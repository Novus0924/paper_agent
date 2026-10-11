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
};

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
