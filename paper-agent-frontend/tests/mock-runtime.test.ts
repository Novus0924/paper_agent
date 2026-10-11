import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_STORAGE_KEY, MockRuntime } from '@/api/mock/runtime';

/* ==========================================================================
   「刷新页面就找不到任务」（用户实测）的根因守卫：
   新建任务不能只排在 180ms 防抖里，刷新窗口内必须已经落盘。
   ========================================================================== */

interface Stored {
  tasks: Record<string, { script: unknown[] }>;
}

function readStore(): Stored {
  const raw = localStorage.getItem(MOCK_STORAGE_KEY);
  expect(raw, 'mock 演示数据应写入 localStorage').not.toBeNull();
  return JSON.parse(raw ?? '{}') as Stored;
}

const scriptLen = (id: string) => readStore().tasks[id]?.script.length ?? -1;

describe('Mock 运行时持久化时机', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('创建任务后立即读取存储就能看到该任务（不留防抖窗口）', () => {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '刷新取证：固态电解质界面阻抗表征方法如何对比？',
      workflow: 'research',
      sources: ['arxiv', 'crossref'],
    });
    expect(readStore().tasks[task_id], `新建任务 ${task_id} 未落盘`).toBeTruthy();
    expect(scriptLen(task_id)).toBeGreaterThan(0);
  });

  it('页面卸载前把防抖中的变更刷进存储', () => {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '刷新取证：只做一次追问也要能恢复。',
      workflow: 'research',
      sources: ['arxiv'],
    });
    const baseline = scriptLen(task_id);
    const sent = runtime.sendMessage(task_id, '请补充近三年的结论。', 'ask');
    // 防抖未到期：这条追问此时还只在内存里
    expect(scriptLen(task_id)).toBe(baseline);

    window.dispatchEvent(new Event('pagehide'));

    expect(JSON.stringify(readStore().tasks[task_id]?.script)).toContain(sent.turn_id);
  });

  it('失效标识返回空快照而不是崩栈', () => {
    const runtime = new MockRuntime();
    expect(runtime.get('run-not-existing')).toBeNull();
  });
});

/* ==========================================================================
   v2.1 停止执行：与后端同形——运行中停止收敛为 FAILED + CANCELLED，
   记录"用户请求停止执行"的 info 降级，剩余步骤保持可 resume；终态任务幂等。
   ========================================================================== */

describe('Mock 运行时：停止执行', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeRunning() {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '停止取证：运行中请求停止后时间线不再推进。',
      workflow: 'research',
      sources: ['arxiv'],
    });
    runtime.startRun(task_id);
    vi.advanceTimersByTime(3000);
    expect(runtime.get(task_id)?.run_status).toBe('RUNNING');
    return { runtime, task_id };
  }

  it('运行中停止：立即收敛 FAILED/CANCELLED，时间线不再推进，记录用户停止的 info 降级', () => {
    const { runtime, task_id } = makeRunning();

    let events = 0;
    const unsub = runtime.subscribe(task_id, () => {
      events += 1;
    });
    const baseline = events;

    const res = runtime.stop(task_id);
    expect(res).toMatchObject({
      task_id,
      run_status: 'FAILED',
      final_state: 'CANCELLED',
    });
    expect(typeof res.stopped_at).toBe('string');
    expect(runtime.get(task_id)?.run_status).toBe('FAILED');

    // 立即生效：这次停止已推送事件；之后再怎么推进时间线也不会有新帧
    const afterStop = events;
    expect(afterStop).toBeGreaterThan(baseline);
    vi.advanceTimersByTime(600_000);
    expect(events).toBe(afterStop);
    unsub();

    const degraded = runtime.state(task_id)?.degraded ?? [];
    expect(
      degraded.some((d) => d.source === 'user' && d.reason.includes('停止')),
    ).toBe(true);
  });

  it('停止后可断点续跑：resume 回到 RUNNING 并继续推进', () => {
    const { runtime, task_id } = makeRunning();
    runtime.stop(task_id);

    runtime.resume(task_id);
    expect(runtime.get(task_id)?.run_status).toBe('RUNNING');
    vi.advanceTimersByTime(5000);
    expect(
      runtime.state(task_id)?.activities.length ?? 0,
      '续跑后应继续产生过程事件',
    ).toBeGreaterThan(0);
  });

  it('终态任务重复停止：幂等返回实际终态，不动状态', () => {
    const { runtime, task_id } = makeRunning();
    runtime.stop(task_id);

    const again = runtime.stop(task_id);
    expect(again).toMatchObject({ run_status: 'FAILED', final_state: 'FAILED' });
    expect(runtime.get(task_id)?.run_status).toBe('FAILED');
  });

  it('不存在的任务抛 NOT_FOUND', () => {
    const runtime = new MockRuntime();
    expect(() => runtime.stop('run-not-existing')).toThrow('NOT_FOUND');
  });
});

/* ==========================================================================
   v2.1 归档与列表过滤：与后端同形——运行中归档 BAD_STATE，恢复清 archived_at，
   list 的 status/archived 过滤语义与 GET /tasks?status=&archived= 一致。
   ========================================================================== */

describe('Mock 运行时：归档与列表过滤', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeDone() {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '归档取证：完成的任务可归档与恢复。',
      workflow: 'research',
      sources: ['arxiv'],
    });
    return { runtime, task_id };
  }

  it('归档写 archived/archived_at，恢复清空 archived_at', () => {
    const { runtime, task_id } = makeDone();

    const archived = runtime.archive(task_id, true);
    expect(archived).toMatchObject({ task_id, archived: true });
    expect(typeof archived.archived_at).toBe('string');
    expect(runtime.get(task_id)?.archived).toBe(true);

    const restored = runtime.archive(task_id, false);
    expect(restored.archived).toBe(false);
    expect(restored.archived_at).toBeNull();
    expect(runtime.get(task_id)?.archived).toBe(false);
  });

  it('运行中任务归档抛 BAD_STATE（与后端 409 同形）', () => {
    const { runtime, task_id } = makeDone();
    runtime.startRun(task_id);

    expect(() => runtime.archive(task_id, true)).toThrow('BAD_STATE');
    expect(runtime.get(task_id)?.archived).toBeFalsy();
  });

  it('list 按 status/archived 本地过滤，语义与 GET /tasks 一致（旧数据视作未归档）', () => {
    const runtime = new MockRuntime();
    const a = runtime.createTask({ goal: '任务甲', workflow: 'research', sources: ['arxiv'] });
    const b = runtime.createTask({ goal: '任务乙', workflow: 'materials', sources: ['arxiv'] });
    runtime.archive(a.task_id, true);

    const ids = (params?: Parameters<MockRuntime['list']>[0]) =>
      runtime.list(params).map((t) => t.task_id);
    // 运行时还带着演示种子任务，断言只看新建两条的过滤归属
    expect(ids({ archived: 'true' })).toEqual([a.task_id]);
    expect(ids({ archived: 'all' })).toContain(a.task_id);
    expect(ids({ archived: 'all' })).toContain(b.task_id);
    expect(ids({ archived: 'false' })).not.toContain(a.task_id);
    expect(ids({ archived: 'false' })).toContain(b.task_id);
    expect(ids({ status: 'PLANNED' })).toContain(b.task_id);
    expect(ids({ status: 'DONE' })).not.toContain(b.task_id);
  });

  it('归档不存在的任务抛 NOT_FOUND', () => {
    const runtime = new MockRuntime();
    expect(() => runtime.archive('run-not-existing', true)).toThrow('NOT_FOUND');
  });
});

/* ==========================================================================
   v2.1 消息队列查询：与 GET /tasks/{id}/messages 同形——
   pending 是还没轮到的排队消息，history 是已投递（含失败）的消息。
   ========================================================================== */

describe('Mock 运行时：消息队列查询', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('运行中排队：pending 含排队消息与顺序；轮到后转入 history', () => {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '队列取证：运行中排队的消息可查询。',
      workflow: 'research',
      sources: ['arxiv'],
    });
    runtime.startRun(task_id);

    const sent = runtime.sendMessage(task_id, '请补充近三年的结论。', 'ask');
    let queue = runtime.listMessages(task_id);
    expect(queue.task_id).toBe(task_id);
    expect(queue.pending.map((m) => m.turn_id)).toContain(sent.turn_id);
    expect(queue.pending.find((m) => m.turn_id === sent.turn_id)).toMatchObject({
      text: '请补充近三年的结论。',
      status: 'queued',
    });

    // 时间线推进到该消息被放行：pending 清空、history 收录
    vi.advanceTimersByTime(120_000);
    queue = runtime.listMessages(task_id);
    expect(queue.pending.map((m) => m.turn_id)).not.toContain(sent.turn_id);
    expect(queue.history.map((m) => m.turn_id)).toContain(sent.turn_id);
  });

  it('终态任务发送：消息直接进 history（queued=false 语义）', () => {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '队列取证：空闲时发送不排队。',
      workflow: 'research',
      sources: ['arxiv'],
    });
    runtime.startRun(task_id);
    // 把演示脚本播放完，任务进入 DONE（后端对终态任务立即投递）
    vi.advanceTimersByTime(3_600_000);
    expect(runtime.get(task_id)?.run_status).toBe('DONE');
    const sent = runtime.sendMessage(task_id, '空闲提问。', 'ask');

    const queue = runtime.listMessages(task_id);
    expect(queue.pending).toHaveLength(0);
    expect(queue.history.find((m) => m.turn_id === sent.turn_id)).toMatchObject({
      status: 'done',
    });
  });

  it('不存在的任务抛 NOT_FOUND', () => {
    const runtime = new MockRuntime();
    expect(() => runtime.listMessages('run-not-existing')).toThrow('NOT_FOUND');
  });
});

/* ==========================================================================
   v2.1 报告 Markdown 直下：mock 用演示数据生成，文件名 {task_id}.md
   ========================================================================== */

describe('Mock 运行时：报告 Markdown 直下', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('报告就绪的任务：生成 Markdown 内容，文件名 {task_id}.md', () => {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '直下取证：完成后可下载报告 Markdown。',
      workflow: 'research',
      sources: ['arxiv'],
    });
    runtime.startRun(task_id);
    vi.advanceTimersByTime(3_600_000);
    expect(runtime.get(task_id)?.report_ready).toBe(true);

    const res = runtime.downloadReportMd(task_id);
    expect(res.ok).toBe(true);
    expect(res.filename).toBe(`${task_id}.md`);
    expect(res.content).toContain('# ');
  });

  it('报告未生成的任务：ok=false + NOT_READY', () => {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '直下取证：未完成不给下载。',
      workflow: 'research',
      sources: ['arxiv'],
    });

    const res = runtime.downloadReportMd(task_id);
    expect(res.ok).toBe(false);
    expect(res.code).toBe('NOT_READY');
  });
});
