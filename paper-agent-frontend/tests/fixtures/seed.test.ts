import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_BY_TASK,
  LIBRARY_STATS,
  SEED_TASKS,
  SSE_CONTINUATION,
  SSE_FRAMES,
  TASK_IDS,
  evidenceResponse,
  libraryQuery,
  normalizeDoi,
  reportMarkdown,
  snapshotOf,
  taskById,
} from './seed';

/* ==========================================================================
   fixtures 自校验：这些数字与帧序是 liveEnv 假后端与各页面测试的共同前提，
   契约形状一旦漂移（如后端 taskSnapshot 增删字段），这里先红。
   ========================================================================== */

describe('seed fixtures 契约自校验', () => {
  it('四个种子任务快照与后端 taskSnapshot 投影一致', () => {
    for (const t of SEED_TASKS) {
      const snap = snapshotOf(t);
      expect(Object.keys(snap).sort()).toEqual(
        [
          'archived',
          'archived_at',
          'created_at',
          'degraded',
          'run_status',
          'session_id',
          'steps',
          'task_id',
          'title',
          'updated_at',
          'workflow',
        ].sort(),
      );
      // 后端不下发的字段不得出现在快照里（lit_source/sources 只在 TaskRecord 与 POST 入参）
      expect(snap).not.toHaveProperty('goal');
      expect(snap).not.toHaveProperty('lit_source');
      expect(snap).not.toHaveProperty('sources');
    }
    // title = goal 全文（非截断摘要）
    expect(snapshotOf(taskById(TASK_IDS.solid)).title).toBe(taskById(TASK_IDS.solid).goal);
  });

  it('文献库默认口径：28 条原始证据去重后 24 条、覆盖 4 个任务', () => {
    expect(LIBRARY_STATS.raw).toBe(28);
    expect(LIBRARY_STATS.dedupedTotal).toBe(24);
    expect(LIBRARY_STATS.tasksScanned).toBe(4);
  });

  it('去重代表项与 duplicates_count 对齐后端口径', () => {
    const all = libraryQuery({ limit: 100 }).items;
    // 10.1039/d2ee01234a：3 个任务各命中一次 → 代表为最新任务（硬碳），duplicates_count=2
    const d2ee = all.find((i) => i.ref.doi === LIBRARY_STATS.doiD2ee);
    expect(d2ee).toBeDefined();
    expect(d2ee!.duplicates_count).toBe(2);
    expect(d2ee!.task_id).toBe(TASK_IDS.hardCarbon);
    // 10.1038/s41578-023-00601-x：钙钛矿任务内两次命中 → duplicates_count=1
    const s41578 = all.find((i) => i.ref.doi === LIBRARY_STATS.doiS41578);
    expect(s41578!.duplicates_count).toBe(1);
    expect(s41578!.task_id).toBe(TASK_IDS.perovskite);
    // 10.1016/j.jpowsour.2023.233111：固态 + 硬碳 → duplicates_count=1
    const jpowsour = all.find((i) => i.ref.doi === LIBRARY_STATS.doiJpowsour);
    expect(jpowsour!.duplicates_count).toBe(1);
    // 无 DOI 不聚合：10 个 DOI 组 + 14 条无 DOI = 24
    const noDoi = all.filter((i) => i.ref.doi === '');
    expect(noDoi).toHaveLength(14);
    expect(noDoi.every((i) => i.duplicates_count === 0)).toBe(true);
    // 任务 created_at 降序：硬碳 → 固态 → 钙钛矿 → 锂
    const firstTaskOf = (id: string) => all.findIndex((i) => i.task_id === id);
    expect(firstTaskOf(TASK_IDS.hardCarbon)).toBeLessThan(firstTaskOf(TASK_IDS.solid));
    expect(firstTaskOf(TASK_IDS.solid)).toBeLessThan(firstTaskOf(TASK_IDS.perovskite));
    expect(firstTaskOf(TASK_IDS.perovskite)).toBeLessThan(firstTaskOf(TASK_IDS.lithium));
  });

  it('dedupe=off 全量 28 条；synthesis 落在 limit=10 的第二页；八类 kind 全覆盖', () => {
    expect(libraryQuery({ dedupe: false, limit: 100 }).total).toBe(28);
    const page2 = libraryQuery({ limit: 10, offset: 10 });
    expect(page2.items).toHaveLength(10);
    expect(page2.items.some((i) => i.kind === 'synthesis')).toBe(true);
    const kinds = new Set(libraryQuery({ limit: 100 }).items.map((i) => i.kind));
    expect([...kinds].sort()).toEqual(
      ['analysis', 'data', 'draft', 'factcheck', 'literature', 'note', 'review', 'synthesis'].sort(),
    );
  });

  it('证据响应 counts / chain_head / run 齐备且无 cite_no', () => {
    const res = evidenceResponse(TASK_IDS.solid);
    expect(res.counts).toEqual({ evidence: 13, conclusions: 4, judgments: 2, notes: 1, records: 20 });
    expect(res.chain_head).toBe(EVIDENCE_BY_TASK[TASK_IDS.solid]![12]!.chain_hash);
    expect(res.run).toEqual({
      workflow: 'research',
      goal: taskById(TASK_IDS.solid).goal,
      steps: expect.any(Array),
    });
    // 后端证据投影字段：doi / authors[] / year，无 cite_no
    const first = res.evidence[0]!;
    expect(first).not.toHaveProperty('cite_no');
    expect(first).toHaveProperty('doi');
    expect(Array.isArray(first.authors)).toBe(true);
  });

  it('SSE 帧序：快照以 done 收尾、其后仅回放 activity/tool；RUNNING 不发 done', () => {
    for (const id of [TASK_IDS.solid, TASK_IDS.perovskite, TASK_IDS.lithium]) {
      const frames = SSE_FRAMES[id]!;
      const doneIdx = frames.findIndex((f) => f.type === 'done');
      expect(doneIdx).toBeGreaterThan(0);
      // relay.ts snapshot()：done 之后只回放 activity/tool（step/degraded/conclusion/report/done 不混入）
      expect(frames.slice(doneIdx + 1).every((f) => f.type === 'activity' || f.type === 'tool')).toBe(true);
      const before = frames.slice(0, doneIdx + 1).map((f) => f.type);
      expect(before[0]).toBe('ping');
      expect(before.at(-1)).toBe('done');
      expect(before.at(-2)).toBe('report');
      const firstStep = before.indexOf('step');
      const lastStep = before.lastIndexOf('step');
      expect(firstStep).toBe(1);
      expect(before.slice(firstStep, lastStep + 1).every((t) => t === 'step')).toBe(true);
    }
    expect(SSE_FRAMES[TASK_IDS.solid]!.find((f) => f.type === 'done')).toMatchObject({
      run_status: 'DONE',
      report_ready: true,
    });
    expect(SSE_FRAMES[TASK_IDS.perovskite]!.find((f) => f.type === 'done')).toMatchObject({
      run_status: 'DONE',
      report_ready: true,
    });
    expect(SSE_FRAMES[TASK_IDS.lithium]!.find((f) => f.type === 'done')).toMatchObject({
      run_status: 'FAILED',
      report_ready: false,
    });
    // RUNNING 任务：只发快照（report generating），不发 done
    expect(SSE_FRAMES[TASK_IDS.hardCarbon]!.some((f) => f.type === 'done')).toBe(false);
    expect(
      SSE_FRAMES[TASK_IDS.hardCarbon]!.some((f) => f.type === 'report' && f.status === 'generating'),
    ).toBe(true);
    // 思考帧不落入终态回放（trace.jsonl 只持久化 activity/tool），只在运行期实时帧里
    for (const id of [TASK_IDS.solid, TASK_IDS.perovskite, TASK_IDS.lithium]) {
      expect(SSE_FRAMES[id]!.some((f) => f.type === 'thinking')).toBe(false);
    }
    const continuation = SSE_CONTINUATION[TASK_IDS.hardCarbon]!;
    expect(continuation.filter((f) => f.type === 'thinking').length).toBeGreaterThanOrEqual(1);
    expect(continuation.at(-1)).toMatchObject({ type: 'done', run_status: 'DONE', report_ready: true });
    // 锂金属 R3 FAILED 带 error（前端失败态依据）
    expect(
      SSE_FRAMES[TASK_IDS.lithium]!.find((f) => f.type === 'step' && f.step === 'R3'),
    ).toMatchObject({
      status: 'FAILED',
      error: '检索来源连续超时，未能建立完整对比维度',
    });
    // seq 全程单调递增
    for (const frames of [...Object.values(SSE_FRAMES), ...Object.values(SSE_CONTINUATION)]) {
      const seqs = frames.map((f) => f.seq);
      expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
    }
  });

  it('报告 Markdown 直下与未就绪任务', () => {
    expect(reportMarkdown(TASK_IDS.solid)).toContain('# 固态电解质界面阻抗表征方法研究综述');
    expect(reportMarkdown(TASK_IDS.perovskite)).toContain('## 降级声明');
    // 失败/运行中任务无 report.json → null（路由层 404 NO_REPORT）
    expect(reportMarkdown(TASK_IDS.lithium)).toBeNull();
    expect(reportMarkdown(TASK_IDS.hardCarbon)).toBeNull();
  });

  it('normalizeDoi 剥前缀并小写', () => {
    expect(normalizeDoi('https://doi.org/10.1039/D2EE01234A')).toBe('10.1039/d2ee01234a');
    expect(normalizeDoi('doi:10.1039/d2ee01234a')).toBe('10.1039/d2ee01234a');
    expect(normalizeDoi('  10.1039/D2EE01234A  ')).toBe('10.1039/d2ee01234a');
  });
});
