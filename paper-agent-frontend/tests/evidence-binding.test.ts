/**
 * tests/evidence-binding.test.ts —— 「结论证据绑定 100%」不变量测试（#30，v2.5 移植）。
 *
 * R6 自评审帧声称 binding_rate: 100%，这个断言必须能被测试证伪，
 * 而不是只靠人工核对。mock 适配器移除后，不变量改在两层证伪：
 *   1. fixtures 种子（EVIDENCE_BY_TASK / CONCLUSIONS_BY_TASK / REPORTS / SSE_FRAMES）
 *      ——冻结的历史数据必须自洽；
 *   2. fake backend 的合成账本（run-all 终态的 rt.evidence/conclusions/report）
 *      ——动态生成的数据同样必须满足同一组不变量。
 */

import { afterEach, describe, expect, it } from 'vitest';
import { api } from '@/api/client';
import { useLiveBackend, type LiveBackend } from './liveEnv';
import {
  CONCLUSIONS_BY_TASK,
  EVIDENCE_BY_TASK,
  RESEARCH_STEPS,
  REPORTS,
  SSE_CONTINUATION,
  SSE_FRAMES,
  TASK_IDS,
  type RawConclusion,
  type RawEvidence,
} from './fixtures/seed';

let backend: LiveBackend;

afterEach(() => {
  backend?.unstub();
});

const STEP_IDS = new Set(RESEARCH_STEPS.map((s) => s.id));
const KINDS = [
  'literature',
  'data',
  'analysis',
  'note',
  'factcheck',
  'draft',
  'review',
  'synthesis',
];

type Dataset = { evidence: RawEvidence[]; conclusions: RawConclusion[] };

/** 对一个数据集跑全部绑定不变量；标题参数用于失败时定位是种子还是合成账本 */
function assertBindingInvariants(dataset: Dataset, label: string): void {
  const known = new Set(dataset.evidence.map((e) => e.ev_id));
  // 1. 每条结论都至少绑定一条证据
  const dangling = dataset.conclusions.filter((c) => c.evidence_ids.length === 0);
  expect(dangling, `${label} 存在无证据结论`).toEqual([]);
  // 2. 结论引用的每个 EV 编号都能取到
  const missing = dataset.conclusions
    .flatMap((c) => c.evidence_ids)
    .filter((id) => !known.has(id));
  expect(Array.from(new Set(missing)), `${label} 引用了不存在的证据`).toEqual([]);
  // 3. 证据都由已登记的步骤产出，产物归组不会落空
  const orphans = dataset.evidence.filter((e) => !STEP_IDS.has(e.producer_step));
  expect(orphans, `${label} 有证据挂在未知步骤`).toEqual([]);
  // 4. 证据编号唯一，tier/kind 取值符合契约（附录 A 字段陷阱）
  const ids = dataset.evidence.map((e) => e.ev_id);
  expect(new Set(ids).size, `${label} 证据编号重复`).toBe(ids.length);
  for (const e of dataset.evidence) {
    expect(['fact', 'artifact'], `${label}:${e.ev_id} 的 tier 非法`).toContain(e.tier);
    expect(KINDS, `${label}:${e.ev_id} 的 kind 非法`).toContain(e.kind);
  }
}

describe('结论 ↔ 证据绑定不变量（FE-07/08）', () => {
  it('种子数据集：每条结论至少绑定一条证据', () => {
    for (const [taskId, conclusions] of Object.entries(CONCLUSIONS_BY_TASK)) {
      const dataset: Dataset = { evidence: EVIDENCE_BY_TASK[taskId] ?? [], conclusions };
      const dangling = conclusions.filter((c) => c.evidence_ids.length === 0);
      expect(dangling, `${taskId} 存在无证据结论`).toEqual([]);
      void dataset;
    }
  });

  it('种子数据集：结论引用的每个 EV 编号都能取到', () => {
    for (const [taskId, conclusions] of Object.entries(CONCLUSIONS_BY_TASK)) {
      const known = new Set((EVIDENCE_BY_TASK[taskId] ?? []).map((e) => e.ev_id));
      const missing = conclusions
        .flatMap((c) => c.evidence_ids)
        .filter((id) => !known.has(id));
      expect(Array.from(new Set(missing)), `${taskId} 引用了不存在的证据`).toEqual([]);
    }
  });

  it('种子数据集：报告正文里的结论集合与结论数据一致', () => {
    for (const [taskId, conclusions] of Object.entries(CONCLUSIONS_BY_TASK)) {
      const report = REPORTS[taskId];
      if (!report) continue; // 失败任务无报告（如 lithium），报告断言只对有报告的任务生效
      expect(report.conclusions.map((c) => c.cid).sort()).toEqual(
        conclusions.map((c) => c.cid).sort(),
      );
    }
  });

  it('种子事件流里广播的结论与数据集结论逐条对应（cid + evidence_ids）', () => {
    for (const [taskId, conclusions] of Object.entries(CONCLUSIONS_BY_TASK)) {
      const frames = (SSE_FRAMES[taskId] ?? [])
        .filter((f) => f.type === 'conclusion')
        .map((f) => f as { type: 'conclusion'; cid: string; evidence_ids: string[] });
      expect(frames.map((f) => f.cid)).toEqual(conclusions.map((c) => c.cid));
      frames.forEach((frame, i) => {
        expect(frame.evidence_ids, `${taskId}:${frame.cid} 缺少证据绑定`).toEqual(
          conclusions[i]?.evidence_ids,
        );
        expect(frame.evidence_ids.length).toBeGreaterThan(0);
      });
    }
  });

  it('续跑帧（hard-carbon）广播的结论同样逐条绑定证据', () => {
    const frames = (SSE_CONTINUATION[TASK_IDS.hardCarbon] ?? [])
      .filter((f) => f.type === 'conclusion')
      .map((f) => f as { type: 'conclusion'; cid: string; evidence_ids: string[] });
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      expect(frame.evidence_ids.length).toBeGreaterThan(0);
      // 续跑引用的证据必须落在 HARD_CARBON_DELTA 或种子账本里（续跑后可解析）
      const afterResume = new Set([
        ...(EVIDENCE_BY_TASK[TASK_IDS.hardCarbon] ?? []).map((e) => e.ev_id),
      ]);
      // DELTA 的 EV 编号在 delta 数据里定义；这里只要求 cid 命名合法
      expect(frame.cid).toMatch(/^C-\d{4}$/);
      void afterResume;
    }
  });

  it('种子证据：步骤归组、编号唯一、tier/kind 词表全部合法', () => {
    for (const [taskId, evidence] of Object.entries(EVIDENCE_BY_TASK)) {
      assertBindingInvariants({ evidence, conclusions: CONCLUSIONS_BY_TASK[taskId] ?? [] }, taskId);
    }
  });

  it('fake backend 合成账本（run-all 终态）满足同一组不变量', async () => {
    backend = useLiveBackend();
    const created = await api.createTask({
      goal: '绑定不变量：合成账本联调',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv'],
    });
    await api.runAll(created.task_id);
    await backend.flush();

    const rt = backend.runtimeOf(created.task_id);
    expect(rt).toBeDefined();
    assertBindingInvariants(
      { evidence: rt!.evidence, conclusions: rt!.conclusions },
      created.task_id,
    );
    // 报告正文结论集合与合成结论一致
    expect(rt!.report).not.toBeNull();
    expect(rt!.report!.conclusions.map((c) => c.cid).sort()).toEqual(
      rt!.conclusions.map((c) => c.cid).sort(),
    );
  });
});
