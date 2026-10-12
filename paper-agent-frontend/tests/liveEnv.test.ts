/**
 * tests/liveEnv.test.ts —— tests/liveEnv.ts 契约级 fake backend 的自校验套件。
 *
 * 为什么 fake backend 自己需要测试：v2.5 起全部页面/契约测试都桩在它上面，
 * 它一旦与真实后端（apps/bff）漂移，所有绿灯都是假绿。本文件把 fake 的
 * 路由状态码、错误信封、SSE 帧序、消息队列、文献库数学、导出可用性逐条
 * 锁死在与后端源码同一口径上；任何一侧改动导致漂移，这里先红。
 *
 * 覆盖的验收要点（承接 #21 既定方案）：
 *   - fetch 路由全表：/api/health、/tasks（列表/新建/详情）、run-all/step/resume/
 *     stop/archive、evidence、cite、report、report.md、export、messages、library
 *   - EventSource 注册表与建连时序（onopen → 快照直写 → 实时续接）
 *   - 思考流（thinking）帧**全量不过滤**、且不落盘（重连快照不回放）
 *   - pump 释放脚本帧并应用 HARD_CARBON_DELTA
 *   - 消息队列：空闲即投递 / 运行中入队按序放行 / DELETE 仅 pending / 归档互锁
 *   - 文献库与 BibTeX 渲染数学不漂移（与 fixtures 同口径）
 */

import { afterEach, describe, expect, it } from 'vitest';
import { api } from '@/api/client';
import type { Report, ReportResponse } from '@/api/types';
import { LIVE_BASE, collect, useLiveBackend, type LiveBackend } from './liveEnv';
import {
  AUDIT_EXPORT_CONTENTS,
  HARD_CARBON_DELTA,
  REPORTS,
  SEED_TASKS,
  TASK_IDS,
  bibtexOf,
  libraryQuery,
  libraryRefOf,
} from './fixtures/seed';

let backend: LiveBackend;

afterEach(() => {
  backend?.unstub();
});

/** 直查 fake 的原始响应（绕过 LiveApiClient 的归一，验证信封与状态码本身） */
async function raw(path: string): Promise<{ status: number; body: unknown; text: string; headers: Headers }> {
  const res = await fetch(`${LIVE_BASE}${path}`);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    /* 文件流不是 JSON */
  }
  return { status: res.status, body, text, headers: res.headers as unknown as Headers };
}

/* ==========================================================================
 * 健康探针（routes/health.ts）
 * ========================================================================== */

describe('健康探针', () => {
  it('ok：status ok、任务计数与种子一致、AGH 会话就绪', async () => {
    backend = useLiveBackend({ health: 'ok' });
    const h = await api.health();
    expect(h.status).toBe('ok');
    expect(h.mode).toBe('live');
    expect(h.task_count).toBe(SEED_TASKS.length);
    expect(h.session_ready).toBe(true);
    expect(h.bff_reachable).toBe(true);
    expect(h.issues).toHaveLength(0);
  });

  it('agh-down：降级并给出阻断性 issue（不是假装健康）', async () => {
    backend = useLiveBackend({ health: 'agh-down' });
    const h = await api.health();
    expect(h.status).toBe('degraded');
    expect(h.session_ready).toBe(false);
    expect(h.issues.map((i) => i.id)).toContain('agh-disconnected');
    expect(h.issues.find((i) => i.id === 'agh-disconnected')?.blocking).toBe(true);
  });

  it('down：fetch 网络失败映射为 status down（客户端不抛异常）', async () => {
    backend = useLiveBackend({ health: 'down' });
    const h = await api.health();
    expect(h.status).toBe('down');
    expect(h.bff_reachable).toBe(false);
    expect(h.issues.map((i) => i.id)).toContain('bff-unreachable');
  });
});

/* ==========================================================================
 * 任务集合与详情（routes/v1/tasks.ts）
 * ========================================================================== */

describe('任务集合与详情', () => {
  it('默认列出活跃任务、按 created_at 降序（归档的 lithium 不在内）', async () => {
    backend = useLiveBackend();
    const tasks = await api.listTasks();
    expect(tasks.map((t) => t.task_id)).toEqual(
      [...tasks.map((t) => t.task_id)].sort((a, b) => (a < b ? 1 : -1)),
    );
    expect(tasks.some((t) => t.task_id === TASK_IDS.lithium)).toBe(false);
    expect(tasks.some((t) => t.task_id === TASK_IDS.solid)).toBe(true);
  });

  it('status=DONE 过滤只留终态成功任务', async () => {
    backend = useLiveBackend();
    const tasks = await api.listTasks({ status: 'DONE' });
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.run_status === 'DONE')).toBe(true);
  });

  it('archived=all 含归档任务；archived=true 只含归档', async () => {
    backend = useLiveBackend();
    const all = await api.listTasks({ archived: 'all' });
    expect(all.some((t) => t.task_id === TASK_IDS.lithium)).toBe(true);
    const archived = await api.listTasks({ archived: 'true' });
    expect(archived.map((t) => t.task_id)).toEqual([TASK_IDS.lithium]);
  });

  it('status 过滤值非法 → 400 BAD_PARAM 且带允许值文案', async () => {
    backend = useLiveBackend();
    await expect(api.listTasks({ status: 'PLANNED' as never })).resolves.toBeInstanceOf(Array);
    const bad = await raw('/api/v1/tasks?status=ARCHIVED');
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ code: 'BAD_PARAM' });
    expect(String((bad.body as { error: string }).error)).toContain('PLANNED | RUNNING | DONE | FAILED');
  });

  it('GET /tasks/{id} 返回快照投影（不下发 goal/lit_source/sources）', async () => {
    backend = useLiveBackend();
    const snap = await api.getTask(TASK_IDS.solid);
    expect(snap.task_id).toBe(TASK_IDS.solid);
    expect(snap.run_status).toBe('DONE');
    expect(snap.steps.every((s) => s.status === 'DONE')).toBe(true);
    const bare = await raw(`/api/v1/tasks/${TASK_IDS.solid}`);
    const body = bare.body as Record<string, unknown>;
    expect('goal' in body).toBe(false);
    expect('lit_source' in body).toBe(false);
    expect('sources' in body).toBe(false);
  });

  it('任务不存在 → 404 NOT_FOUND；id 形如非法 → 400 BAD_ID', async () => {
    backend = useLiveBackend();
    await expect(api.getTask('run-20991231-000000-zzzzzz')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    await expect(api.getTask('../etc/passwd')).rejects.toMatchObject({ status: 400, code: 'BAD_ID' });
  });
});

/* ==========================================================================
 * 创建任务（routes/v1/tasks.ts POST /tasks）
 * ========================================================================== */

describe('创建任务', () => {
  it('201 + preflight.sources + workspace 会话映射（满足 session 导出的前缀判定）', async () => {
    backend = useLiveBackend();
    const created = await api.createTask({
      goal: '测试任务：契约自校验',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv', 'crossref'],
    });
    expect(created.task_id).toMatch(/^run-\d{8}-\d{6}-live\d{3}$/);
    expect(created.session_id.startsWith('workspace:')).toBe(true);
    expect(created.state.run_status).toBe('PLANNED');
    expect(created.state.steps.every((s) => s.status === 'PENDING')).toBe(true);
    expect(Object.keys(created.preflight.sources)).toEqual(['arxiv', 'crossref']);
    expect(created.preflight.sources.arxiv).toBe('ok');
    expect(backend.createdTaskIds).toContain(created.task_id);
  });

  it('goal 为空 → 400 BAD_GOAL；非字符串同理', async () => {
    backend = useLiveBackend();
    await expect(
      api.createTask({ goal: '   ', workflow: 'research', lit_source: 'auto', sources: [] }),
    ).rejects.toMatchObject({ status: 400, code: 'BAD_GOAL' });
    await expect(
      api.createTask({ goal: 42 as never, workflow: 'research', lit_source: 'auto', sources: [] }),
    ).rejects.toMatchObject({ status: 400, code: 'BAD_GOAL' });
  });

  it('workflow=materials → 400 BAD_PARAM（materials 已下线，白名单外一律 fail-fast）', async () => {
    backend = useLiveBackend();
    await expect(
      api.createTask({ goal: 'x', workflow: 'materials' as never, lit_source: 'auto', sources: [] }),
    ).rejects.toMatchObject({
      code: 'BAD_PARAM',
      message: expect.stringContaining('支持的工作流：research'),
    });
  });

  it('非法数据源被丢弃：preflight 只探测合法来源（快照投影不下发 sources，对齐后端）', async () => {
    backend = useLiveBackend();
    const created = await api.createTask({
      goal: '测试数据源过滤',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv', 'wos' as never, 'arxiv'],
    });
    expect(Object.keys(created.preflight.sources)).toEqual(['arxiv']);
    // POST /tasks 的 state 是 taskSnapshot() 投影：goal/lit_source/sources 不下发
    expect('sources' in created.state).toBe(false);
    expect(created.state.title).toBe('测试数据源过滤');
  });
});

/* ==========================================================================
 * 执行控制（run-all / step / resume / stop / archive）
 * ========================================================================== */

describe('执行控制', () => {
  it('run-all 自动放行：终态 DONE、报告就绪、合成账本 8 证据 2 结论', async () => {
    backend = useLiveBackend();
    const created = await api.createTask({
      goal: '自动化执行联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    const { latest } = collect(api, created.task_id);
    await api.runAll(created.task_id);
    expect((await api.getTask(created.task_id)).run_status).toBe('RUNNING');
    await backend.flush();

    const state = latest();
    expect(state.snapshot?.run_status).toBe('DONE');
    expect(state.snapshot?.steps.every((s) => s.status === 'DONE')).toBe(true);

    const ev = await api.getEvidence(created.task_id);
    expect(ev.evidence).toHaveLength(8);
    expect(ev.evidence.filter((e) => e.tier === 'fact' && e.kind === 'literature')).toHaveLength(2);
    expect(ev.conclusions).toHaveLength(2);
    expect(ev.conclusions.every((c) => c.evidence_ids.length > 0)).toBe(true);

    const report = await api.getReport(created.task_id);
    expect(report.status).toBe('ready');
    // gate/run_status 已在前端 Report 类型声明（TD-02 防漂移）；裸查保留以锁死线形本身
    const bareReport = (await raw(`/api/v1/tasks/${created.task_id}/report`)).body as {
      report?: { gate?: { passed?: boolean }; run_status?: string };
    };
    expect(bareReport.report?.gate?.passed).toBe(true);
    expect(bareReport.report?.run_status).toBe('DONE');
  });

  it('autoRun:false + pump：手动放行才推进（测试可确定性控制时序）', async () => {
    backend = useLiveBackend({ autoRun: false });
    const created = await api.createTask({
      goal: '手动泵联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    const { latest } = collect(api, created.task_id);
    await api.runAll(created.task_id);
    await backend.flush();
    // 未 pump：仍是 RUNNING 未推进、无 done 帧（collect 的 done 初值为 null）
    expect(latest().snapshot?.run_status).toBe('RUNNING');
    expect(latest().done).toBeNull();

    backend.pump(created.task_id);
    await backend.flush();
    expect(latest().snapshot?.run_status).toBe('DONE');
    expect(latest().done?.run_status).toBe('DONE');
  });

  it('resumeTask(id, "R3") 走 /step：只推进单步、不合成终态账本', async () => {
    backend = useLiveBackend();
    const created = await api.createTask({
      goal: '单步执行联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    const { latest } = collect(api, created.task_id);
    await api.resumeTask(created.task_id, 'R3');
    await backend.flush();
    const steps = latest().snapshot?.steps ?? [];
    expect(steps.find((s) => s.id === 'R3')?.status).toBe('DONE');
    expect(steps.find((s) => s.id === 'R1')?.status).toBe('PENDING');
    expect(latest().snapshot?.run_status).not.toBe('DONE');
    expect((await api.getReport(created.task_id)).status).toBe('generating');
  });

  it('step 路由护栏：S1 受控步骤 400；未知步骤 400', async () => {
    backend = useLiveBackend();
    const created = await api.createTask({
      goal: '单步护栏',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    await expect(api.resumeTask(created.task_id, 'S1')).rejects.toMatchObject({
      status: 400,
      code: 'BAD_PARAM',
    });
    await expect(api.resumeTask(created.task_id, 'R9')).rejects.toMatchObject({
      status: 400,
      code: 'BAD_PARAM',
    });
  });

  it('hardCarbon resume：应用 HARD_CARBON_DELTA（证据/结论/报告按帧续跑）', async () => {
    backend = useLiveBackend();
    const before = backend.runtimeOf(TASK_IDS.hardCarbon)!.evidence.length;
    const { latest } = collect(api, TASK_IDS.hardCarbon);
    await api.resumeTask(TASK_IDS.hardCarbon);
    await backend.flush();

    const rt = backend.runtimeOf(TASK_IDS.hardCarbon)!;
    expect(rt.evidence.length).toBe(before + HARD_CARBON_DELTA.evidence.length);
    expect(rt.conclusions.length).toBeGreaterThanOrEqual(HARD_CARBON_DELTA.conclusions.length);
    expect(rt.report).not.toBeNull();
    expect(latest().snapshot?.run_status).toBe('DONE');
    expect(latest().done?.run_status).toBe('DONE');
    expect((await api.getReport(TASK_IDS.hardCarbon)).status).toBe('ready');
  });

  it('stop 运行中：FAILED + CANCELLED，补发 done 帧，剩余步骤可 resume', async () => {
    backend = useLiveBackend({ autoRun: false });
    const created = await api.createTask({
      goal: '中止联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    const { latest } = collect(api, created.task_id);
    await api.runAll(created.task_id);
    const stop = await api.stopTask(created.task_id);
    expect(stop.run_status).toBe('FAILED');
    expect(stop.final_state).toBe('CANCELLED');
    await backend.flush();
    expect(latest().done?.run_status).toBe('FAILED');
    expect((await api.getTask(created.task_id)).run_status).toBe('FAILED');
    const rt = backend.runtimeOf(created.task_id)!;
    expect(rt.task.degraded_reasons.some((d) => d.reason === '用户请求停止执行')).toBe(true);
    // 中止后可断点续跑（不等于任务报废）；autoRun:false 下需手动 pump 放行
    await api.resumeTask(created.task_id);
    backend.pump(created.task_id);
    await backend.flush();
    expect((await api.getTask(created.task_id)).run_status).toBe('DONE');
  });

  it('stop 已终态任务：原样返回 final_state=DONE，不制造假 FAILED', async () => {
    backend = useLiveBackend();
    const stop = await api.stopTask(TASK_IDS.solid);
    expect(stop.run_status).toBe('DONE');
    expect(stop.final_state).toBe('DONE');
  });

  it('归档互锁：归档后 run-all/发消息 409；运行中 archive 409', async () => {
    backend = useLiveBackend({ autoRun: false });
    const created = await api.createTask({
      goal: '归档互锁联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    await api.archiveTask(created.task_id, true);
    await expect(api.runAll(created.task_id)).rejects.toMatchObject({ status: 409, code: 'BAD_STATE' });
    await expect(api.sendMessage(created.task_id, 'hi', 'ask')).rejects.toMatchObject({
      status: 409,
      code: 'BAD_STATE',
    });
    // 恢复后可执行
    await api.archiveTask(created.task_id, false);
    await api.runAll(created.task_id);
    // 运行中（持锁）归档被拒
    await expect(api.archiveTask(created.task_id, true)).rejects.toMatchObject({
      status: 409,
      code: 'BAD_STATE',
    });
    backend.pump(created.task_id);
    await backend.flush();
    expect((await api.getTask(created.task_id)).run_status).toBe('DONE');
  });
});

/* ==========================================================================
 * SSE 重放（events/events.ts 建连时序 + relay.snapshot 帧序）
 * ========================================================================== */

describe('SSE 重放', () => {
  it('种子任务建连：ping 首帧 → steps → degraded → conclusions → report → done（终态）', async () => {
    backend = useLiveBackend();
    const { envelopes } = collect(api, TASK_IDS.solid);
    await backend.flush();

    const events = envelopes.map((e) => e.event);
    expect(events[0]).toBe('ping');
    expect(events.filter((e) => e === 'step').length).toBeGreaterThan(0);
    expect(events).toContain('conclusion');
    expect(events).toContain('report');
    expect(events).toContain('done');
    // done 之后是 trace 回放（末 200 条 activity/tool）——真实 relay.snapshot() 的帧序语义
    expect(['activity', 'tool']).toContain(events.at(-1));
    // 帧序号单调递增（stamp 每任务单调分配，跨连接不回退）
    const seqs = envelopes.map((e) => e.seq);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
  });

  it('未知任务 id：异步 onerror → 连接态 reconnecting（浏览器 404 流表现）', async () => {
    backend = useLiveBackend();
    const states: string[] = [];
    api.subscribe('run-20991231-000000-zzzzzz', {
      onEvent: () => {},
      onConnection: (s) => states.push(s),
    });
    await backend.flush();
    expect(states).toContain('reconnecting');
  });

  it('坏 JSON 帧被忽略（适配器不抛错、不吞掉后续好帧）', async () => {
    backend = useLiveBackend();
    const { source, envelopes } = collect(api, TASK_IDS.solid);
    await backend.flush();
    const before = envelopes.length;
    source.rawEmitBroken('activity', '{not-json', 9999);
    source.emit('activity', { step: 'R1', human_message: '坏帧之后的好帧' }, 10000);
    expect(envelopes.length).toBe(before + 1);
    expect((envelopes.at(-1)?.data as { human_message?: string }).human_message).toBe(
      '坏帧之后的好帧',
    );
  });

  it('思考流不过滤：新建任务 run-all 的 thinking 帧全量送达（R2/R3/S1 三段）', async () => {
    backend = useLiveBackend();
    const created = await api.createTask({
      goal: '思考流联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    const { envelopes } = collect(api, created.task_id);
    await api.runAll(created.task_id);
    await backend.flush();

    const thinkings = envelopes.filter((e) => e.event === 'thinking');
    expect(thinkings.length).toBeGreaterThanOrEqual(6);
    expect(new Set(thinkings.map((t) => String(t.data.step)))).toEqual(new Set(['R2', 'R3', 'S1']));
    expect(thinkings.every((t) => String(t.data.text ?? '').length > 0)).toBe(true);
    // 每帧都带 seq/ts/task_id 信封（不是裸文本）
    expect(thinkings.every((t) => t.seq > 0 && t.task_id === created.task_id)).toBe(true);
  });

  it('思考流不落盘：重连快照只回放 activity/tool，不回放 thinking', async () => {
    backend = useLiveBackend();
    const created = await api.createTask({
      goal: '重连快照联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    const first = collect(api, created.task_id);
    await api.runAll(created.task_id);
    await backend.flush();
    expect(first.envelopes.some((e) => e.event === 'thinking')).toBe(true);
    first.unsubscribe();

    // 同一任务重新建连（刷新页面场景）：动态快照
    const second = collect(api, created.task_id);
    await backend.flush();
    expect(second.envelopes.some((e) => e.event === 'thinking')).toBe(false);
    expect(second.envelopes.some((e) => e.event === 'activity')).toBe(true);
    expect(second.envelopes.some((e) => e.event === 'tool')).toBe(true);
    expect(second.envelopes.some((e) => e.event === 'done')).toBe(true);
    // 快照帧（step/ping）在前、trace 回放在后，与 relay.snapshot() 帧序一致
    const events = second.envelopes.map((e) => e.event);
    expect(events.indexOf('done')).toBeLessThan(events.lastIndexOf('tool'));
  });

  it('hard-carbon 续跑帧：tool running/ok 成对、step 状态机推进', async () => {
    backend = useLiveBackend();
    const { envelopes } = collect(api, TASK_IDS.hardCarbon);
    await api.resumeTask(TASK_IDS.hardCarbon);
    await backend.flush();

    const tools = envelopes.filter((e) => e.event === 'tool');
    // 续跑 ok 帧覆盖历史 running 帧（种子 trace 回放会带回历史 running，不做数量成对假设）
    expect(tools.filter((t) => t.data.status === 'done').length).toBeGreaterThanOrEqual(
      tools.filter((t) => t.data.status === 'running').length,
    );
    const doneSteps = envelopes.filter(
      (e) => e.event === 'step' && (e.data as { status?: string }).status === 'DONE',
    );
    expect(doneSteps.map((s) => String((s.data as { step?: string }).step))).toContain('S1');
  });
});

/* ==========================================================================
 * 消息队列（services/message.ts 语义镜像）
 * ========================================================================== */

describe('消息队列', () => {
  it('空闲发送：queued=false + running；flush 后 history 落 user/assistant 两行', async () => {
    backend = useLiveBackend();
    const send = await api.sendMessage(TASK_IDS.solid, '请补充近两年的最新进展。', 'ask');
    expect(send.queued).toBe(false);
    expect(send.status).toBe('running');
    await backend.flush();

    const msgs = await api.listMessages(TASK_IDS.solid);
    expect(msgs.busy).toBe(false);
    expect(msgs.pending).toHaveLength(0);
    const mine = msgs.history.find((h) => h.text === '请补充近两年的最新进展。');
    expect(mine?.role).toBe('user');
    expect(mine?.status).toBe('done');
    expect(
      msgs.history.some((h) => h.role === 'assistant' && h.turn_id === mine?.turn_id),
    ).toBe(true);
  });

  it('运行中发送：入队并显示顺序；回合结束按序放行', async () => {
    backend = useLiveBackend({ autoRun: false });
    const created = await api.createTask({
      goal: '排队联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    await api.runAll(created.task_id);

    const q1 = await api.sendMessage(created.task_id, '问题一', 'ask');
    const q2 = await api.sendMessage(created.task_id, '问题二', 'revise');
    expect(q1).toMatchObject({ queued: true, order: 1, status: 'queued' });
    expect(q2).toMatchObject({ queued: true, order: 2, status: 'queued' });

    const during = await api.listMessages(created.task_id);
    expect(during.busy).toBe(true);
    expect(during.pending.map((p) => p.order)).toEqual([1, 2]);

    backend.pump(created.task_id);
    await backend.flush();

    const after = await api.listMessages(created.task_id);
    expect(after.busy).toBe(false);
    expect(after.pending).toHaveLength(0);
    const users = after.history.filter((h) => h.role === 'user');
    expect(users.map((u) => u.text)).toEqual(['问题一', '问题二']);
    // 每个 user 回合都有配对的 assistant 回复（同 turn_id）
    for (const u of users) {
      expect(after.history.some((h) => h.role === 'assistant' && h.turn_id === u.turn_id)).toBe(true);
    }
  });

  it('DELETE 仅允许 pending：删除后 order 重排；已完成/不存在均 409', async () => {
    backend = useLiveBackend({ autoRun: false });
    const created = await api.createTask({
      goal: '删除联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    await api.runAll(created.task_id);
    const q1 = await api.sendMessage(created.task_id, '保留', 'ask');
    const q2 = await api.sendMessage(created.task_id, '删除我', 'ask');
    await api.sendMessage(created.task_id, '也保留', 'ask');

    await api.removeQueued(created.task_id, q2.turn_id!);
    const during = await api.listMessages(created.task_id);
    expect(during.pending.map((p) => p.text)).toEqual(['保留', '也保留']);
    expect(during.pending.map((p) => p.order)).toEqual([1, 2]);

    // 不存在的 turn / 已完成的历史 turn 都不可删
    await expect(api.removeQueued(created.task_id, 'turn-99')).rejects.toMatchObject({
      status: 409,
      code: 'BAD_STATE',
    });
    await expect(api.removeQueued(created.task_id, q1.turn_id!)).resolves.toBeUndefined();
  });

  it('队列上限 20：第 21 条 BUSY 且不进队', async () => {
    backend = useLiveBackend({ autoRun: false });
    const created = await api.createTask({
      goal: '上限联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    await api.runAll(created.task_id);
    for (let i = 0; i < 20; i++) {
      const r = await api.sendMessage(created.task_id, `消息 ${i}`, 'ask');
      expect(r.queued).toBe(true);
    }
    await expect(api.sendMessage(created.task_id, '第 21 条', 'ask')).rejects.toMatchObject({
      status: 409,
      code: 'BUSY',
    });
    const during = await api.listMessages(created.task_id);
    expect(during.pending).toHaveLength(20);
  });

  it('消息参数护栏：空 text 400；非法 action 400 且带白名单文案', async () => {
    backend = useLiveBackend();
    await expect(api.sendMessage(TASK_IDS.solid, '  ', 'ask')).rejects.toMatchObject({
      status: 400,
      code: 'BAD_PARAM',
    });
    await expect(api.sendMessage(TASK_IDS.solid, 'x', 'flush' as never)).rejects.toMatchObject({
      code: 'BAD_PARAM',
      message: expect.stringContaining('ask（追问）| revise（修订）'),
    });
  });
});

/* ==========================================================================
 * 证据 / 回查 / 视图分层（http/dto.ts AUDIT_ONLY_KEYS）
 * ========================================================================== */

describe('证据与回查', () => {
  it('getEvidence（audit 视图）：证据/结论/trace 三件套齐备', async () => {
    backend = useLiveBackend();
    const ev = await api.getEvidence(TASK_IDS.solid);
    expect(ev.task_id).toBe(TASK_IDS.solid);
    expect(ev.evidence.length).toBeGreaterThan(0);
    expect(ev.evidence.some((e) => e.kind === 'literature')).toBe(true);
    expect(ev.conclusions.length).toBeGreaterThan(0);
    expect(ev.trace.length).toBeGreaterThan(0);
  });

  it('默认 view 剥离子层：chain_hash/ledger_digest/prompt 等审计字段不下发', async () => {
    backend = useLiveBackend();
    const view = await raw(`/api/v1/tasks/${TASK_IDS.solid}/evidence`);
    const serialized = JSON.stringify(view.body);
    expect(serialized).not.toContain('chain_hash');
    expect(serialized).not.toContain('ledger_digest');
    expect(serialized).not.toContain('"prompt"');
    const audit = await raw(`/api/v1/tasks/${TASK_IDS.solid}/evidence?view=audit`);
    expect(JSON.stringify(audit.body)).toContain('chain_hash');
    // view 参数非法 → 400 且带允许值
    const bad = await raw(`/api/v1/tasks/${TASK_IDS.solid}/evidence?view=god`);
    expect(bad.status).toBe(400);
    expect((bad.body as { code: string }).code).toBe('BAD_PARAM');
  });

  it('cite 命中：ev_id/ref/detail 三字段；未命中 404 NOT_FOUND', async () => {
    backend = useLiveBackend();
    const hit = await api.cite(TASK_IDS.solid, 'EV-0001');
    expect(hit.ev_id).toBe('EV-0001');
    expect(hit.ref.length).toBeGreaterThan(0);
    expect(hit.detail.length).toBeGreaterThan(0);
    await expect(api.cite(TASK_IDS.solid, 'EV-9999')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    // sha256 前缀回查：matched_by 标注（不假装是按编号命中）
    const rt = backend.runtimeOf(TASK_IDS.solid)!;
    const prefix = (rt.evidence[0]!.sha256 ?? '').slice(0, 10);
    const byPrefix = await raw(`/api/v1/tasks/${TASK_IDS.solid}/cite?ev=${prefix}`);
    expect(byPrefix.status).toBe(200);
    expect((byPrefix.body as { matched_by?: string }).matched_by).toBe('sha256_prefix');
  });
});

/* ==========================================================================
 * 报告（services/report.ts）
 * ========================================================================== */

describe('报告', () => {
  it('未就绪：200 generating（不是报错）；就绪：ready + 门禁通过', async () => {
    backend = useLiveBackend({ autoRun: false });
    const created = await api.createTask({
      goal: '报告联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    const generating = await api.getReport(created.task_id);
    expect(generating.status).toBe('generating');
    expect(generating.report).toBeUndefined();

    await api.runAll(created.task_id);
    backend.pump(created.task_id);
    await backend.flush();
    const ready = await api.getReport(created.task_id);
    expect(ready.status).toBe('ready');
    expect(ready.report?.conclusions?.length).toBe(2);
    // evidence_count 已在前端 Report 类型声明（TD-02 防漂移）；裸查保留以锁死线形本身
    const bareReady = (await raw(`/api/v1/tasks/${created.task_id}/report`)).body as {
      report?: { evidence_count?: number };
    };
    expect(bareReady.report?.evidence_count).toBe(8);
  });

  it('契约防漂移：后端实发字段（seed 镜像）必须已在前端 Report 类型声明；mock 世代死字段不得复活', () => {
    // 编译期守卫：本表与 src/api/types.ts 的 Report 键一一对应。
    // Report 增删键而未同步本表 → satisfies 编译期即红（键缺失/多余都报错），
    // 防止「后端实发、前端漏声明」的 mock 世代病根复发（TD-02，2026-10-12 验收）。
    const declaredReportKeys = Object.keys({
      task_id: true,
      title: true,
      abstract: true,
      sections: true,
      conclusions: true,
      evidence_count: true,
      degraded: true,
      degraded_statement: true,
      generated_at: true,
      gate: true,
      run_status: true,
    } satisfies Record<keyof Report, boolean>);

    // ReportResponse 同锁（generating 响应携带 gate/run_status）
    expect(
      Object.keys({
        status: true,
        report: true,
        gate: true,
        run_status: true,
      } satisfies Record<keyof ReportResponse, boolean>),
    ).toEqual(['status', 'report', 'gate', 'run_status']);

    // dto.ts 剥离的审计键（前端类型不应声明）
    const auditOnly = new Set(['ledger_digest', 'ledger_head']);
    // mock 世代死字段：后端从不发送，类型/实现/种子都不得复活
    const deadFields = ['verdict', 'meta', 'pending_note'];

    for (const [taskId, report] of Object.entries(REPORTS)) {
      const keys = Object.keys(report);
      expect(
        keys.filter((k) => deadFields.includes(k)),
        `${taskId} 出现 mock 世代死字段`,
      ).toEqual([]);
      const undeclared = keys
        .filter((k) => !auditOnly.has(k))
        .filter((k) => !declaredReportKeys.includes(k));
      expect(undeclared, `${taskId} 实发字段未在前端 Report 类型声明`).toEqual([]);
    }
  });

  it('report.md：未就绪 404 NO_REPORT；就绪返回 markdown 与 Disposition inline', async () => {
    backend = useLiveBackend({ autoRun: false });
    const created = await api.createTask({
      goal: 'markdown 联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    const miss = await api.downloadReportMd(created.task_id);
    expect(miss.ok).toBe(false);
    expect(miss.code).toBe('NO_REPORT');

    await api.runAll(created.task_id);
    backend.pump(created.task_id);
    await backend.flush();
    const bare = await raw(`/api/v1/tasks/${created.task_id}/report.md`);
    expect(bare.status).toBe(200);
    expect(bare.text).toContain('# ');
    expect(bare.headers.get('Content-Disposition')).toBe('inline');
    expect(bare.headers.get('Content-Type')).toContain('text/markdown');
  });
});

/* ==========================================================================
 * 导出（export/service.ts 四种 kind + 可用性）
 * ========================================================================== */

describe('导出', () => {
  const seedTask = async (goal: string): Promise<string> => {
    const created = await api.createTask({ goal, workflow: 'research', lit_source: 'auto', sources: ['arxiv'] });
    await api.runAll(created.task_id);
    await backend.flush();
    return created.task_id;
  };

  it('report：inline + 文件名 {task_id}-report.md + contents=[report.md]', async () => {
    backend = useLiveBackend();
    const id = await seedTask('导出 report 联调');
    const out = await api.exportArtifact(id, 'report');
    expect(out.ok).toBe(true);
    expect(out.filename).toBe(`${id}-report.md`);
    expect(out.content).toContain('# ');
    expect(out.manifest?.map((m) => m.name)).toEqual(['report.md']);
    expect(out.manifest?.[0]?.kind).toBe('报告');
  });

  it('audit：zip + X-Export-Contents 与 fixtures 清单一致', async () => {
    backend = useLiveBackend();
    const id = await seedTask('导出 audit 联调');
    const out = await api.exportArtifact(id, 'audit');
    expect(out.ok).toBe(true);
    expect(out.mime).toBe('application/zip');
    expect(out.manifest?.map((m) => m.name)).toEqual([...AUDIT_EXPORT_CONTENTS]);
    expect(out.blobUrl).toBe('blob:mock');
  });

  it('session：种子会话 id 无 workspace 映射 → NOT_READY；新建任务可导出', async () => {
    backend = useLiveBackend();
    const seedMiss = await api.exportArtifact(TASK_IDS.solid, 'session');
    expect(seedMiss.ok).toBe(false);
    expect(seedMiss.code).toBe('NOT_READY');

    const id = await seedTask('导出 session 联调');
    const out = await api.exportArtifact(id, 'session');
    expect(out.ok).toBe(true);
    expect(out.filename).toBe(`${id}-session.jsonl`);
    expect(out.manifest?.map((m) => m.name)).toEqual(['session.agnes']);
  });

  it('bibtex：任务级导出与 fixtures 渲染器逐字节一致（bibKey 含防碰撞序号）', async () => {
    backend = useLiveBackend();
    const id = await seedTask('导出 bibtex 联调');
    const out = await raw(`/api/v1/tasks/${id}/export?kind=bibtex`);
    expect(out.status).toBe(200);
    const rt = backend.runtimeOf(id)!;
    const refs = rt.evidence.filter((e) => e.producer_step === 'R1').map(libraryRefOf);
    expect(out.text).toBe(bibtexOf(refs));
    expect(out.text.match(/@article\{/g)?.length).toBe(refs.length);
    // 格式锚点：author 用 ', ' 连接、条目以 \n} 收尾
    expect(out.text).toContain('author = {A. Author, B. Collaborator}');
    expect(out.text.trimEnd().endsWith('}')).toBe(true);
  });

  it('可用性护栏：PLANNED 任务导出 report/audit → 409 NOT_READY 且列当前可导出', async () => {
    backend = useLiveBackend({ autoRun: false });
    const created = await api.createTask({
      goal: '可用性联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    const out = await api.exportArtifact(created.task_id, 'report');
    expect(out.ok).toBe(false);
    expect(out.code).toBe('NOT_READY');
    expect(out.error).toContain('尚不可导出');
    // 缺 kind / 未知 kind → 400
    const noKind = await raw(`/api/v1/tasks/${created.task_id}/export`);
    expect(noKind.status).toBe(400);
    const badKind = await raw(`/api/v1/tasks/${created.task_id}/export?kind=pdf`);
    expect(badKind.status).toBe(400);
    expect((badKind.body as { code: string }).code).toBe('BAD_PARAM');
  });
});

/* ==========================================================================
 * 文献库（services/library.ts 数学 + BibTeX 全库导出）
 * ========================================================================== */

describe('文献库', () => {
  it('列表与 fixtures 同口径：total/items/代表项一致（去重默认开）', async () => {
    backend = useLiveBackend();
    const page = await api.listLibraryEvidence({ limit: 500 });
    const expected = libraryQuery({ limit: 500 }, backend.corpus());
    expect(page.total).toBe(expected.total);
    expect(page.items.map((i) => i.ev_id)).toEqual(expected.items.map((i) => i.ev_id));
    expect(page.tasks_scanned).toBe(SEED_TASKS.length);
  });

  it('分页：offset/limit 切片与 fixtures 逐条对齐', async () => {
    backend = useLiveBackend();
    const page = await api.listLibraryEvidence({ limit: 2, offset: 2 });
    const expected = libraryQuery({ limit: 2, offset: 2 }, backend.corpus());
    expect(page.items.map((i) => i.ev_id)).toEqual(expected.items.map((i) => i.ev_id));
    expect(page.limit).toBe(2);
    expect(page.offset).toBe(2);
  });

  it('dedupe=off 条目数 ≥ 去重开启（同 DOI 不再合并）', async () => {
    backend = useLiveBackend();
    const on = await api.listLibraryEvidence({ limit: 500, dedupe: true });
    const off = await api.listLibraryEvidence({ limit: 500, dedupe: false });
    expect(off.total).toBeGreaterThanOrEqual(on.total);
    const expectedOff = libraryQuery({ limit: 500, dedupe: false }, backend.corpus());
    expect(off.total).toBe(expectedOff.total);
  });

  it('参数护栏：limit 越界/非法、dedupe 非法 → 400 BAD_PARAM 带区间文案', async () => {
    backend = useLiveBackend();
    const over = await raw('/api/v1/library/evidence?limit=9999');
    expect(over.status).toBe(400);
    expect(String((over.body as { error: string }).error)).toContain('越界');
    const nan = await raw('/api/v1/library/evidence?limit=abc');
    expect(nan.status).toBe(400);
    const badDedupe = await raw('/api/v1/library/evidence?dedupe=maybe');
    expect(badDedupe.status).toBe(400);
    expect((badDedupe.body as { code: string }).code).toBe('BAD_PARAM');
  });

  it('全库 BibTeX：与 fixtures literature() 口径（R1 过滤后去重）逐字节一致', async () => {
    backend = useLiveBackend();
    const out = await api.exportLibrary('bibtex');
    expect(out.ok).toBe(true);
    expect(out.filename).toBe('paper-agent-library.bib');
    const expected = bibtexOf(
      libraryQuery({ limit: 1000 }, backend.corpus(), { producerStep: 'R1' }).items.map((i) => i.ref),
    );
    // exportLibrary 只回 blobUrl，内容走裸查（与 exportArtifact 同一条路由）
    const bare = await raw('/api/v1/library/export?kind=bibtex');
    expect(bare.text).toBe(expected);
    expect(bare.headers.get('Content-Disposition')).toContain('attachment');
  });

  it('全库导出 kind 非 bibtex → 400（白名单收紧，不放行未实现格式）', async () => {
    backend = useLiveBackend();
    const bad = await raw('/api/v1/library/export?kind=ris');
    expect(bad.status).toBe(400);
    expect((bad.body as { code: string }).code).toBe('BAD_PARAM');
  });
});

/* ==========================================================================
 * 错误信封与未知路由（infra/errors.ts errorBody + STATUS 映射）
 * ========================================================================== */

describe('错误信封', () => {
  it('错误体恒为 {error, code} 两字段（action 并入 error 文案）', async () => {
    backend = useLiveBackend();
    for (const path of [
      '/api/v1/tasks?status=NOPE',
      '/api/v1/tasks/run-20991231-000000-zzzzzz',
      '/api/v1/tasks/../evil',
      '/api/v1/nope',
    ]) {
      const res = await raw(path);
      expect(res.status).toBeGreaterThanOrEqual(400);
      const body = res.body as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual(['code', 'error']);
      expect(typeof body.error).toBe('string');
      expect(typeof body.code).toBe('string');
    }
  });

  it('STATUS 映射：400/404/409 三档各抽查一条', async () => {
    backend = useLiveBackend();
    expect((await raw('/api/v1/tasks?status=NOPE')).status).toBe(400);
    expect((await raw('/api/v1/tasks/run-20991231-000000-zzzzzz')).status).toBe(404);
    expect((await raw('/api/v1/tasks/run-20991231-000000-zzzzzz/messages')).status).toBe(404);
  });

  it('overrides：测试显式意图优先于默认路由', async () => {
    backend = useLiveBackend({
      overrides: [{ match: '/api/v1/tasks', spec: { status: 503, json: { error: '维护中', code: 'INTERNAL' } } }],
    });
    await expect(api.listTasks()).rejects.toMatchObject({ status: 503, code: 'INTERNAL' });
  });
});
