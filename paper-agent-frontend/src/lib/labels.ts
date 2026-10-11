import type { MsgKey } from '@/i18n';
import type { EvidenceKind, EvidenceTier, StepStatus, ToolCall } from '@/api/types';

/** 证据层级/类型的展示文案键（单一真源，报告页与溯源页共用） */
export const TIER_LABEL: Record<EvidenceTier, MsgKey> = {
  fact: 'evidence.tierFact',
  artifact: 'evidence.tierArtifact',
};

/** 步骤/工具状态的展示文案键（运行统计与步骤条共用） */
export const STEP_STATE_LABEL: Record<StepStatus, MsgKey> = {
  PENDING: 'status.step.PENDING',
  RUNNING: 'status.step.RUNNING',
  DONE: 'status.step.DONE',
  SKIPPED: 'status.step.SKIPPED',
  FAILED: 'status.step.FAILED',
};

export const TOOL_STATE_LABEL: Record<ToolCall['status'], MsgKey> = {
  running: 'monitor.toolRunning',
  done: 'monitor.toolDone',
  warn: 'monitor.toolWarn',
  failed: 'monitor.toolFailed',
};

export const KIND_LABEL: Record<EvidenceKind, MsgKey> = {
  literature: 'evidence.kindLiterature',
  data: 'evidence.kindData',
  analysis: 'evidence.kindAnalysis',
  note: 'evidence.kindNote',
  factcheck: 'evidence.kindFactcheck',
  draft: 'evidence.kindDraft',
  review: 'evidence.kindReview',
  // 内核 S1「综合回答」产物。不进 KIND_ORDER：它是模型的非确定性输出，
  // 只在文献库/证据列表里以徽标出现，不作为筛选主维度（筛选仍聚焦七类确定性证据）。
  synthesis: 'evidence.kindSynthesis',
};

/** 筛选下拉主维度：七类确定性证据（synthesis 见上，不在此列） */
export const KIND_ORDER: EvidenceKind[] = [
  'literature',
  'data',
  'analysis',
  'note',
  'factcheck',
  'draft',
  'review',
];

export const TIER_ORDER: EvidenceTier[] = ['fact', 'artifact'];

/**
 * 检索来源的短标签（文献库来源徽标用）：与 config/registry 的 SOURCES 同源，
 * 只是把长名压到徽标可容长度，避免在窄列里换行。
 */
export const SOURCE_SHORT: Record<string, string> = {
  arxiv: 'arXiv',
  crossref: 'Crossref',
  openalex: 'OpenAlex',
  semantic_scholar: 'Semantic Scholar',
  local: '本地语料库',
};


export function sourceLabel(source: string): string {
  return SOURCE_SHORT[source] ?? source;
}
