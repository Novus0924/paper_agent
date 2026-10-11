import { describe, expect, it } from 'vitest';
import { buildScript, datasetFor } from '@/api/mock/fixtures';
import { WORKFLOWS } from '@/config/registry';
import type { WorkflowName } from '@/api/types';

/* ==========================================================================
   DoD「结论证据绑定 100%」的不变量测试（#30）
   R6 自评审帧声称 binding_rate: 100%，这个断言必须能被测试证伪，
   而不是只靠人工核对。
   ========================================================================== */

const WORKFLOW_NAMES: WorkflowName[] = ['research', 'materials'];

function conclusionFrames(workflow: WorkflowName) {
  return buildScript(workflow, '目标', WORKFLOWS[workflow].defaultSources)
    .filter((f) => f.event === 'conclusion')
    .map((f) => f.data as { cid: string; text: string; evidence_ids: string[] });
}

describe('结论 ↔ 证据绑定不变量（FE-07/08）', () => {
  it('每条结论都至少绑定一条证据', () => {
    for (const workflow of WORKFLOW_NAMES) {
      const dangling = datasetFor(workflow).conclusions.filter(
        (c) => c.evidence_ids.length === 0,
      );
      expect(dangling, `${workflow} 存在无证据结论`).toEqual([]);
    }
  });

  it('结论引用的每个 EV 编号都能在同一数据集里取到', () => {
    for (const workflow of WORKFLOW_NAMES) {
      const { evidence, conclusions } = datasetFor(workflow);
      const known = new Set(evidence.map((e) => e.ev_id));
      const missing = conclusions
        .flatMap((c) => c.evidence_ids)
        .filter((id) => !known.has(id));
      expect(Array.from(new Set(missing)), `${workflow} 引用了不存在的证据`).toEqual([]);
    }
  });

  it('报告正文里的结论集合与结论数据一致', () => {
    for (const workflow of WORKFLOW_NAMES) {
      const { report, conclusions } = datasetFor(workflow);
      expect(report.conclusions.map((c) => c.cid).sort()).toEqual(
        conclusions.map((c) => c.cid).sort(),
      );
    }
  });

  it('事件流里广播的结论与数据集结论逐条对应', () => {
    for (const workflow of WORKFLOW_NAMES) {
      const frames = conclusionFrames(workflow);
      const { conclusions } = datasetFor(workflow);
      expect(frames.map((f) => f.cid)).toEqual(conclusions.map((c) => c.cid));
      frames.forEach((frame, i) => {
        expect(frame.evidence_ids, `${frame.cid} 缺少证据绑定`).toEqual(
          conclusions[i]?.evidence_ids,
        );
        expect(frame.evidence_ids.length).toBeGreaterThan(0);
      });
    }
  });

  it('证据都由该工作流已登记的步骤产出，产物归组不会落空', () => {
    for (const workflow of WORKFLOW_NAMES) {
      const steps = new Set(WORKFLOWS[workflow].steps.map((s) => s.id));
      const orphans = datasetFor(workflow).evidence.filter(
        (e) => !steps.has(e.producer_step),
      );
      expect(orphans, `${workflow} 有证据挂在未知步骤`).toEqual([]);
    }
  });

  it('证据编号唯一，tier/kind 取值符合契约（附录 A 字段陷阱）', () => {
    const KINDS = [
      'literature',
      'data',
      'analysis',
      'note',
      'factcheck',
      'draft',
      'review',
    ];
    for (const workflow of WORKFLOW_NAMES) {
      const evidence = datasetFor(workflow).evidence;
      const ids = evidence.map((e) => e.ev_id);
      expect(new Set(ids).size, `${workflow} 证据编号重复`).toBe(ids.length);
      for (const e of evidence) {
        expect(['fact', 'artifact'], `${e.ev_id} 的 tier 非法`).toContain(e.tier);
        expect(KINDS, `${e.ev_id} 的 kind 非法`).toContain(e.kind);
      }
    }
  });
});
