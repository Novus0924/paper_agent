import { describe, expect, it } from 'vitest';
import { buildScript, type ScriptFrame } from '@/api/mock/fixtures';
import { WORKFLOWS } from '@/config/registry';
import type { SourceName } from '@/api/types';

/* ==========================================================================
   FE-06 验收第 4 条 + P-01 的 Mock 侧不变量：
   演示脚本必须与「本次任务实际选择的来源」一致——
   不能对未被选中的来源报降级，也不能声称检索了未被选中的来源。
   ========================================================================== */

const GOAL = '固态电解质界面阻抗的主要表征方法有哪些？请检索近五年文献。';

type Degraded = { level: string; source: string };

function degradedFrames(frames: ScriptFrame[]): Degraded[] {
  return frames
    .filter((f) => f.event === 'degraded')
    .map((f) => f.data as unknown as Degraded);
}

/** 从工具帧里把「计划检索的来源」和「来源状态」两种列表取出来 */
function listedSources(frames: ScriptFrame[]): SourceName[] {
  const found: SourceName[] = [];
  for (const f of frames) {
    if (f.event !== 'tool') continue;
    const d = f.data as { input?: string; sources_status?: { source: string }[] };
    if (d.input) {
      const parsed = JSON.parse(d.input) as { sources?: string[] };
      (parsed.sources ?? []).forEach((s) => found.push(s as SourceName));
    }
    (d.sources_status ?? []).forEach((s) => found.push(s.source as SourceName));
  }
  return found;
}

function toolOutput(frames: ScriptFrame[], tool: string): Record<string, unknown> | null {
  const frame = frames.find(
    (f) =>
      f.event === 'tool' &&
      (f.data as { tool?: string; output?: string }).tool === tool &&
      (f.data as { output?: string }).output !== undefined,
  );
  const output = frame ? (frame.data as { output?: string }).output : undefined;
  return output ? (JSON.parse(output) as Record<string, unknown>) : null;
}

describe('Mock 脚本与所选数据源一致（FE-06 / P-01）', () => {
  it('研究任务只选本地/离线来源时不产生任何降级帧', () => {
    expect(degradedFrames(buildScript('research', GOAL, ['local']))).toEqual([]);
  });

  it('材料任务只选本地/离线来源时不产生任何降级帧', () => {
    expect(degradedFrames(buildScript('materials', GOAL, ['local']))).toEqual([]);
  });

  it('降级帧只涉及本次计划内的来源', () => {
    const selections: SourceName[][] = [
      ['arxiv', 'crossref'],
      ['arxiv', 'local'],
      ['crossref', 'openalex', 'local'],
      WORKFLOWS.research.defaultSources,
    ];
    for (const sources of selections) {
      for (const d of degradedFrames(buildScript('research', GOAL, sources))) {
        expect(sources, `降级提到了未选中的来源 ${d.source}`).toContain(d.source);
      }
    }
  });

  it('检索工具只列所选来源，不声称查过别的源', () => {
    const sources: SourceName[] = ['arxiv', 'local'];
    const listed = listedSources(buildScript('research', GOAL, sources));
    const unexpected = listed.filter((s) => !sources.includes(s));
    expect(Array.from(new Set(unexpected))).toEqual([]);
  });

  it('检索数量随所选来源收敛（不沿用全源的固定数字）', () => {
    const full = toolOutput(
      buildScript('research', GOAL, WORKFLOWS.research.defaultSources),
      'sciret_search_literature',
    );
    const few = toolOutput(
      buildScript('research', GOAL, ['arxiv']),
      'sciret_search_literature',
    );
    expect(full).not.toBeNull();
    expect(few).not.toBeNull();
    expect(Number(few?.hits)).toBeLessThan(Number(full?.hits));
    expect(Number(few?.deduped)).toBeLessThan(Number(full?.deduped));
  });

  it('默认研究计划仍给出信息级"部分源不可用"提示', () => {
    const info = degradedFrames(
      buildScript('research', GOAL, WORKFLOWS.research.defaultSources),
    ).filter((d) => d.level === 'info');
    expect(info.map((d) => d.source)).toEqual(['semantic_scholar']);
  });

  it('默认材料计划仍给出真实降级（橙色横幅展示位不丢）', () => {
    const real = degradedFrames(
      buildScript('materials', GOAL, WORKFLOWS.materials.defaultSources),
    ).filter((d) => d.level === 'degraded');
    expect(real).toHaveLength(1);
  });

  it('材料降级提到语义检索源时，该源必须在默认计划内', () => {
    const frames = degradedFrames(
      buildScript('materials', GOAL, WORKFLOWS.materials.defaultSources),
    );
    expect(WORKFLOWS.materials.defaultSources).toContain(frames[0]?.source);
  });

  it('所选来源全部可用时不标 warn，也不发降级帧', () => {
    const frames = buildScript('research', GOAL, ['arxiv', 'crossref']);
    expect(degradedFrames(frames)).toEqual([]);
    const warn = frames.filter(
      (f) => f.event === 'tool' && (f.data as { status?: string }).status === 'warn',
    );
    expect(warn).toEqual([]);
  });

  it('脚本结尾仍收敛到 DONE 终态（过滤降级帧不影响流程闭合）', () => {
    for (const workflow of ['research', 'materials'] as const) {
      const last = buildScript(workflow, GOAL, ['local']).at(-1);
      expect(last?.event).toBe('done');
      expect((last?.data as { run_status?: string }).run_status).toBe('DONE');
    }
  });

  it('未选中的来源不会在进度文案里被点名', () => {
    const frames = buildScript('research', GOAL, ['arxiv', 'local']);
    const text = frames
      .filter((f) => f.event === 'activity')
      .map((f) => (f.data as { human_message: string }).human_message)
      .join('\n');
    expect(text).toContain('arXiv');
    expect(text).toContain('本地语料库');
    expect(text).not.toContain('Crossref');
    expect(text).not.toContain('OpenAlex');
    expect(text).not.toContain('Semantic Scholar');
  });
});
