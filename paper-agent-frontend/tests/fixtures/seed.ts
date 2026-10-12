/* ==========================================================================
   契约级 fixtures —— 后端 BFF 实测响应形状（v2.5「移除 mock」的测试基石）

   本文件所有数据按 apps/bff/src 的实测投影书写，**不是**前端 DTO 形状：
   - 任务快照   routes/v1/tasks.ts taskSnapshot()
                 {task_id,title(=goal 全文),workflow,run_status,steps[{id,label,status,attempts}],
                  degraded,session_id,created_at,updated_at,archived,archived_at}
                 —— 无 goal / lit_source / sources / report_ready / agh_recorded
   - 步骤标签   routes/v1/tasks.ts WORKFLOW_STEPS.research
                 R1 多源检索 / R2 论文精读 / R3 创新点拆解 / R4 事实验证 /
                 R5 综述写作 / R6 自评审 / S1 综合回答（7 步）
   - 证据账本   services/report.ts getEvidence()
                 evidence[{ev_id,tier,kind,title,producer_step,doi:string|null,
                           authors:string[],year:number|string|null,venue,source,
                           sha256:string|null,at,chain_hash}]
                 conclusions[{cid,text,evidence_ids,confidence,producer_step,at}]
                 judgments[{seq,at,summary,data}] / notes[{seq,at,text}]
                 —— 无 cite_no（前端 ReportView 的参考文献由账本确定性派生）
   - 结构化报告 services/report.ts StructuredReport
                 {task_id,title,abstract,sections,conclusions,evidence_count?,
                  degraded?,degraded_statement?,ledger_digest?,ledger_head?,
                  gate?:{passed,bypass?},run_status?,generated_at?}
                 —— 无 meta / verdict
   - SSE 帧     events/model.ts RelayEvent = {type,seq,ts,id?} & 判别联合
   - 健康探针   routes/health.ts：{status,service,version,root,runs_dir,tasks,
                 agh{connected,agnes_version,socket,sessions_open,error},
                 runs_dir_ok,runs_dir_error}
   - 文献库     services/library.ts toItem()/dedupeByDoi()/matches()
                 ref.authors 实发 string[]、year 实发 number|string|null
   - 消息       services/message.ts + routes/v1/messages.ts

   消费方：tests/liveEnv.ts（fetch + EventSource 契约级假后端）。
   ========================================================================== */

/* -------------------------------------------------------------------------- */
/* 不透明标识符                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 把标签确定性地展开成 64 位小写十六进制，用作 sha256 / chain_hash 的占位。
 * 这些串**不冒充真实哈希**——只是 fixtures 内稳定、可复现的不透明 ID；
 * 所有断言都经对象取值（如 `EV-0001.sha256.slice(0, 8)`），不硬编码字面量。
 */
export function fixtureHash(label: string): string {
  let h = 0x811c9dc5;
  const out: string[] = [];
  for (let round = 0; round < 8; round += 1) {
    for (let i = 0; i < label.length; i += 1) {
      h ^= label.charCodeAt(i) + round * 31;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out.push(h.toString(16).padStart(8, '0'));
  }
  return out.join('');
}

/* -------------------------------------------------------------------------- */
/* 时间基准                                                                     */
/* -------------------------------------------------------------------------- */

export const TS = {
  /** 锂金属枝晶（失败，已归档）—— 最旧 */
  lithiumCreated: '2026-10-07T09:30:00.000Z',
  lithiumUpdated: '2026-10-07T09:58:12.000Z',
  lithiumArchived: '2026-10-07T10:05:00.000Z',
  /** 钙钛矿（降级完成） */
  perovskiteCreated: '2026-10-08T14:25:00.000Z',
  perovskiteUpdated: '2026-10-08T15:06:40.000Z',
  /** 固态电解质（成功完成） */
  solidCreated: '2026-10-09T10:00:00.000Z',
  solidUpdated: '2026-10-09T10:41:33.000Z',
  /** 硬碳（运行中）—— 最新 */
  hardCarbonCreated: '2026-10-10T16:15:00.000Z',
  hardCarbonUpdated: '2026-10-10T16:32:10.000Z',
  checkedAt: '2026-10-10T16:40:00.000Z',
} as const;

/* -------------------------------------------------------------------------- */
/* 任务种子（TaskRecord 形状：含 goal，快照投影见 snapshotOf）                     */
/* -------------------------------------------------------------------------- */

export type SeedRunStatus = 'PLANNED' | 'RUNNING' | 'DONE' | 'FAILED';
export type SeedStepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'SKIPPED' | 'FAILED';

export interface SeedStep {
  id: string;
  label: string;
  status: SeedStepStatus;
  attempts: number;
}

export interface SeedTask {
  task_id: string;
  goal: string;
  workflow: 'research';
  lit_source: 'auto' | 'local' | 'arxiv';
  sources: string[];
  run_status: SeedRunStatus;
  degraded: boolean;
  degraded_reasons: Array<{
    level: 'info' | 'degraded';
    source: string;
    reason: string;
    impact: string;
    resumable: boolean;
    step: string;
    at: string;
  }>;
  session_id: string;
  created_at: string;
  updated_at: string;
  steps: SeedStep[];
  archived?: boolean;
  archived_at?: string | null;
}

/** 后端 WORKFLOW_STEPS.research（routes/v1/tasks.ts:40-49）——与前端 registry 预览标签是两套，勿混 */
export const RESEARCH_STEPS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'R1', label: '多源检索' },
  { id: 'R2', label: '论文精读' },
  { id: 'R3', label: '创新点拆解' },
  { id: 'R4', label: '事实验证' },
  { id: 'R5', label: '综述写作' },
  { id: 'R6', label: '自评审' },
  { id: 'S1', label: '综合回答' },
];

const ALL_DONE = (): SeedStep[] =>
  RESEARCH_STEPS.map((s) => ({ ...s, status: 'DONE' as const, attempts: 1 }));

export const TASK_IDS = {
  solid: 'run-20261009-100000-abcdef',
  perovskite: 'run-20261008-142500-feedbee',
  lithium: 'run-20261007-093000-deadc0w',
  hardCarbon: 'run-20261010-161500-cafe123',
} as const;

const SOLID_GOAL = '固态电解质界面阻抗的主要表征方法有哪些？请检索近五年文献，给出方法对比与结论。';
const PEROVSKITE_GOAL = '钙钛矿太阳能电池缺陷钝化有哪些主流策略？请比较其效率与稳定性提升。';
const LITHIUM_GOAL = '锂金属负极枝晶生长的临界电流密度有哪些报道值？受哪些制备因素影响？';
const HARD_CARBON_GOAL = '钠离子电池硬碳负极孔径调控对首次库伦效率的影响有哪些结论？';

export const SEED_TASKS: SeedTask[] = [
  {
    task_id: TASK_IDS.solid,
    goal: SOLID_GOAL,
    workflow: 'research',
    lit_source: 'auto',
    sources: ['arxiv', 'crossref', 'openalex', 'semantic_scholar', 'local'],
    run_status: 'DONE',
    degraded: false,
    degraded_reasons: [
      {
        level: 'info',
        source: 'semantic_scholar',
        reason: '该来源返回 429（限流），系统自动跳过',
        impact: '其余 4 个来源覆盖充足，结果不受影响，不构成降级',
        resumable: true,
        step: 'R1',
        at: '2026-10-09T10:03:20.000Z',
      },
    ],
    session_id: 'sess-abcdef',
    created_at: TS.solidCreated,
    updated_at: TS.solidUpdated,
    steps: ALL_DONE(),
  },
  {
    task_id: TASK_IDS.perovskite,
    goal: PEROVSKITE_GOAL,
    workflow: 'research',
    lit_source: 'auto',
    sources: ['arxiv', 'crossref', 'openalex', 'semantic_scholar', 'local'],
    run_status: 'DONE',
    degraded: true,
    degraded_reasons: [
      {
        level: 'degraded',
        source: 'semantic_scholar',
        reason: '原计划使用的语义检索来源连续 3 次返回 429，重试与退避后仍不可用',
        impact:
          '已加大 OpenAlex 与本地语料的检索比重，文献覆盖度由约 92% 降至约 78%；排序结论需在来源恢复后复核',
        resumable: true,
        step: 'R1',
        at: '2026-10-08T14:29:10.000Z',
      },
    ],
    session_id: 'sess-feedbee',
    created_at: TS.perovskiteCreated,
    updated_at: TS.perovskiteUpdated,
    steps: ALL_DONE(),
  },
  {
    task_id: TASK_IDS.lithium,
    goal: LITHIUM_GOAL,
    workflow: 'research',
    lit_source: 'auto',
    sources: ['arxiv', 'crossref', 'openalex', 'semantic_scholar', 'local'],
    run_status: 'FAILED',
    degraded: false,
    degraded_reasons: [],
    session_id: 'sess-deadc0w',
    created_at: TS.lithiumCreated,
    updated_at: TS.lithiumUpdated,
    steps: [
      { id: 'R1', label: '多源检索', status: 'DONE', attempts: 1 },
      { id: 'R2', label: '论文精读', status: 'DONE', attempts: 1 },
      {
        id: 'R3',
        label: '创新点拆解',
        status: 'FAILED',
        attempts: 3,
      },
      { id: 'R4', label: '事实验证', status: 'PENDING', attempts: 0 },
      { id: 'R5', label: '综述写作', status: 'PENDING', attempts: 0 },
      { id: 'R6', label: '自评审', status: 'PENDING', attempts: 0 },
      { id: 'S1', label: '综合回答', status: 'PENDING', attempts: 0 },
    ],
    archived: true,
    archived_at: TS.lithiumArchived,
  },
  {
    task_id: TASK_IDS.hardCarbon,
    goal: HARD_CARBON_GOAL,
    workflow: 'research',
    lit_source: 'auto',
    sources: ['arxiv', 'crossref', 'openalex', 'semantic_scholar', 'local'],
    run_status: 'RUNNING',
    degraded: false,
    degraded_reasons: [],
    session_id: 'sess-cafe123',
    created_at: TS.hardCarbonCreated,
    updated_at: TS.hardCarbonUpdated,
    steps: [
      { id: 'R1', label: '多源检索', status: 'DONE', attempts: 1 },
      { id: 'R2', label: '论文精读', status: 'RUNNING', attempts: 1 },
      { id: 'R3', label: '创新点拆解', status: 'PENDING', attempts: 0 },
      { id: 'R4', label: '事实验证', status: 'PENDING', attempts: 0 },
      { id: 'R5', label: '综述写作', status: 'PENDING', attempts: 0 },
      { id: 'R6', label: '自评审', status: 'PENDING', attempts: 0 },
      { id: 'S1', label: '综合回答', status: 'PENDING', attempts: 0 },
    ],
  },
];

export function taskById(taskId: string): SeedTask {
  const hit = SEED_TASKS.find((t) => t.task_id === taskId);
  if (!hit) throw new Error(`fixtures: 未知任务 ${taskId}`);
  return hit;
}

/** taskSnapshot() 投影（routes/v1/tasks.ts:208-227）：只发视图字段，goal/lit_source/sources 不下发 */
export function snapshotOf(task: SeedTask) {
  return {
    task_id: task.task_id,
    title: task.goal,
    workflow: task.workflow,
    run_status: task.run_status,
    steps: task.steps.map((s) => ({
      id: s.id,
      label: s.label,
      status: s.status,
      attempts: s.attempts,
    })),
    degraded: task.degraded,
    session_id: task.session_id,
    created_at: task.created_at,
    updated_at: task.updated_at,
    archived: task.archived === true,
    archived_at: task.archived_at ?? null,
  };
}

/** 新建任务的 PLANNED 快照（POST /tasks 落库即此形状，7 步全 PENDING） */
export function plannedSnapshot(
  taskId: string,
  sessionId: string,
  goal: string,
  now: string,
) {
  return {
    task_id: taskId,
    title: goal,
    workflow: 'research' as const,
    run_status: 'PLANNED' as const,
    steps: RESEARCH_STEPS.map((s) => ({ ...s, status: 'PENDING' as const, attempts: 0 })),
    degraded: false,
    session_id: sessionId,
    created_at: now,
    updated_at: now,
    archived: false,
    archived_at: null,
  };
}

/* -------------------------------------------------------------------------- */
/* 证据账本（services/report.ts getEvidence 投影形状）                          */
/* -------------------------------------------------------------------------- */

export interface RawEvidence {
  ev_id: string;
  tier: 'fact' | 'artifact';
  kind: string;
  title: string;
  producer_step: string;
  doi: string | null;
  authors: string[];
  year: number | string | null;
  venue: string;
  source: string;
  sha256: string | null;
  at: string;
  chain_hash: string;
}

export interface RawConclusion {
  cid: string;
  text: string;
  evidence_ids: string[];
  confidence: string;
  producer_step: string;
  at: string;
}

export interface RawJudgment {
  seq: number;
  at: string;
  summary: string;
  data: Record<string, unknown>;
}

export interface RawNote {
  seq: number;
  at: string;
  text: string;
}

/** 文献条目（带 DOI/题录） */
function lit(o: {
  ev_id: string;
  kind?: string;
  title: string;
  step: string;
  doi: string;
  authors: string[];
  year: number;
  venue: string;
  source: string;
  at: string;
  tier?: 'fact' | 'artifact';
}): RawEvidence {
  return {
    ev_id: o.ev_id,
    tier: o.tier ?? 'fact',
    kind: o.kind ?? 'literature',
    title: o.title,
    producer_step: o.step,
    doi: o.doi,
    authors: o.authors,
    year: o.year,
    venue: o.venue,
    source: o.source,
    sha256: fixtureHash(`sha256:${o.ev_id}:${o.doi}`),
    at: o.at,
    chain_hash: fixtureHash(`chain:${o.ev_id}:${o.doi}`),
  };
}

/** 产物条目（无 DOI：data/analysis/note/factcheck/draft/review/synthesis） */
function art(o: {
  ev_id: string;
  tier?: 'fact' | 'artifact';
  kind: string;
  title: string;
  step: string;
  at: string;
  source?: string;
}): RawEvidence {
  return {
    ev_id: o.ev_id,
    tier: o.tier ?? 'artifact',
    kind: o.kind,
    title: o.title,
    producer_step: o.step,
    doi: null,
    authors: [],
    year: null,
    venue: '',
    source: o.source ?? 'local',
    sha256: fixtureHash(`sha256:${o.ev_id}:${o.title}`),
    at: o.at,
    chain_hash: fixtureHash(`chain:${o.ev_id}:${o.title}`),
  };
}

/**
 * 固态电解质（DONE，未降级）：13 条证据 = 6 文献 + 6 产物 + 1 条 S1 synthesis。
 * synthesis 是内核 S1「综合回答」产物（kernel/sciret_kernel/ledger.py EVIDENCE_KINDS），
 * tier=artifact、无 DOI——文献库八类 kind 覆盖与「新增 kind 未登记文案」回归都靠它。
 */
const SOLID_EVIDENCE: RawEvidence[] = [
  lit({
    ev_id: 'EV-0001',
    title: '固态电解质界面阻抗 EIS 建模综述',
    step: 'R1',
    doi: '10.1039/d2ee01234a',
    authors: ['N. Kumar', 'A. R. Smith'],
    year: 2022,
    venue: 'Energy & Environmental Science',
    source: 'crossref',
    at: '2026-10-09T10:03:05.000Z',
  }),
  lit({
    ev_id: 'EV-0002',
    title: '分布弛豫时间（DRT）在电化学阻抗中的应用',
    step: 'R1',
    doi: '10.1016/j.jpowsour.2023.233111',
    authors: ['L. Rossi', 'M. Bianchi'],
    year: 2023,
    venue: 'Journal of Power Sources',
    source: 'crossref',
    at: '2026-10-09T10:03:06.000Z',
  }),
  lit({
    ev_id: 'EV-0003',
    title: '变温阻抗谱分离晶界与体相贡献',
    step: 'R2',
    doi: '10.1021/acs.chemmater.1b01023',
    authors: ['M. Tanaka'],
    year: 2021,
    venue: 'Chemistry of Materials',
    source: 'openalex',
    at: '2026-10-09T10:09:41.000Z',
  }),
  lit({
    ev_id: 'EV-0004',
    title: '原位 (S)TEM 观测固态界面演化',
    step: 'R2',
    doi: '10.1038/s41560-024-01567-8',
    authors: ['S. Weber', 'J. F. M. Oudenhoven'],
    year: 2024,
    venue: 'Nature Energy',
    source: 'openalex',
    at: '2026-10-09T10:09:42.000Z',
  }),
  lit({
    ev_id: 'EV-0005',
    title: '原位 XPS 研究界面化学态与空间电荷层',
    step: 'R2',
    doi: '10.1149/1945-7111/ac5b7d',
    authors: ['J. Park', 'H. Li'],
    year: 2022,
    venue: 'Journal of the Electrochemical Society',
    source: 'crossref',
    at: '2026-10-09T10:09:43.000Z',
  }),
  lit({
    ev_id: 'EV-0006',
    title: 'FIB-SEM 三维量化界面接触面积',
    step: 'R3',
    doi: '10.1016/j.matchar.2025.111222',
    authors: ['H. Zhang', 'Y. Chen', 'R. Novak'],
    year: 2025,
    venue: 'Materials Characterization',
    source: 'arxiv',
    at: '2026-10-09T10:15:18.000Z',
  }),
  art({
    ev_id: 'EV-0007',
    kind: 'data',
    title: '方法—原理—可测界面—优劣势对照表（v3）',
    step: 'R3',
    at: '2026-10-09T10:15:40.000Z',
  }),
  art({
    ev_id: 'EV-0008',
    kind: 'analysis',
    title: '晶界活化能分歧的区间统计',
    step: 'R4',
    at: '2026-10-09T10:21:12.000Z',
  }),
  art({
    ev_id: 'EV-0009',
    kind: 'note',
    title: '术语界定笔记：空间电荷层 / SEI / 晶界阻抗',
    step: 'R1',
    at: '2026-10-09T10:03:30.000Z',
  }),
  art({
    ev_id: 'EV-0010',
    tier: 'fact',
    kind: 'factcheck',
    title: '引用核验结果：12 条 DOI 全部有效',
    step: 'R4',
    at: '2026-10-09T10:21:40.000Z',
  }),
  art({
    ev_id: 'EV-0011',
    kind: 'draft',
    title: '综述草稿（第 2 版）',
    step: 'R5',
    at: '2026-10-09T10:28:05.000Z',
  }),
  art({
    ev_id: 'EV-0012',
    tier: 'fact',
    kind: 'review',
    title: '自评审与复现校验结论',
    step: 'R6',
    at: '2026-10-09T10:35:22.000Z',
  }),
  art({
    ev_id: 'EV-0013',
    kind: 'synthesis',
    title: '综合回答：固态电解质界面阻抗表征方法总览',
    step: 'S1',
    at: '2026-10-09T10:40:51.000Z',
  }),
];

/**
 * 钙钛矿（DONE，真降级）：8 条证据 = 4 文献条目（3 个唯一 DOI）+ 4 产物。
 * EV-0001 是跨任务借用的同一篇论文（与固态电解质任务共享 DOI，演示跨任务去重）；
 * EV-0003 与 EV-0002 同 DOI 同任务（核验阶段从另一来源再次命中，演示同任务去重）。
 * 步骤按 research 链路编号（唯一已实现工作流）。
 */
const PEROVSKITE_EVIDENCE: RawEvidence[] = [
  lit({
    ev_id: 'EV-0001',
    title: '固态电解质界面阻抗 EIS 建模综述',
    step: 'R1',
    doi: '10.1039/d2ee01234a',
    authors: ['N. Kumar', 'A. R. Smith'],
    year: 2022,
    venue: 'Energy & Environmental Science',
    source: 'semantic_scholar',
    at: '2026-10-08T14:27:31.000Z',
  }),
  lit({
    ev_id: 'EV-0002',
    title: '钙钛矿太阳能电池缺陷钝化策略综述',
    step: 'R1',
    doi: '10.1038/s41578-023-00601-x',
    authors: ['A. Müller', 'K. Schmidt'],
    year: 2023,
    venue: 'Nature Reviews Materials',
    source: 'openalex',
    at: '2026-10-08T14:27:32.000Z',
  }),
  lit({
    ev_id: 'EV-0003',
    title: '钙钛矿太阳能电池缺陷钝化策略综述',
    step: 'R4',
    doi: '10.1038/s41578-023-00601-x',
    authors: ['A. Müller', 'K. Schmidt'],
    year: 2023,
    venue: 'Nature Reviews Materials',
    source: 'crossref',
    at: '2026-10-08T14:44:15.000Z',
  }),
  lit({
    ev_id: 'EV-0004',
    title: '2D/3D 异质结构钝化对稳定性的影响',
    step: 'R1',
    doi: '10.1126/science.adf1234',
    authors: ['Y. Liu', 'X. Wang'],
    year: 2024,
    venue: 'Science',
    source: 'crossref',
    at: '2026-10-08T14:27:33.000Z',
  }),
  art({
    ev_id: 'EV-0005',
    kind: 'data',
    title: '钝化策略—效率—稳定性对照矩阵',
    step: 'R3',
    at: '2026-10-08T14:38:02.000Z',
  }),
  art({
    ev_id: 'EV-0006',
    tier: 'fact',
    kind: 'factcheck',
    title: '效率数值一致性核验',
    step: 'R4',
    at: '2026-10-08T14:44:41.000Z',
  }),
  art({
    ev_id: 'EV-0007',
    kind: 'analysis',
    title: '钝化策略收益—成本排序',
    step: 'R5',
    at: '2026-10-08T14:52:19.000Z',
  }),
  art({
    ev_id: 'EV-0008',
    kind: 'note',
    title: '降级说明：来源切换记录',
    step: 'R1',
    at: '2026-10-08T14:29:10.000Z',
  }),
];

/** 锂金属枝晶（R3 FAILED）：只走到 R2，2 条产物证据，无结论无报告 */
const LITHIUM_EVIDENCE: RawEvidence[] = [
  art({
    ev_id: 'EV-0001',
    kind: 'data',
    title: '锂金属负极枝晶生长原位观测数据集（本地语料）',
    step: 'R1',
    at: '2026-10-07T09:33:47.000Z',
  }),
  art({
    ev_id: 'EV-0002',
    kind: 'analysis',
    title: '枝晶生长临界电流密度文献值汇总',
    step: 'R2',
    at: '2026-10-07T09:41:08.000Z',
  }),
];

/**
 * 硬碳（RUNNING，R2 精读中）：5 条证据 = 4 文献 + 1 产物。
 * EV-0003/EV-0005 是与固态电解质任务共享 DOI 的跨任务命中（去重演示）。
 * 续跑完成后由 HARD_CARBON_DELTA 追加 EV-0006/EV-0007 与 2 条结论。
 */
const HARD_CARBON_EVIDENCE: RawEvidence[] = [
  lit({
    ev_id: 'EV-0001',
    title: '硬碳负极孔径分布与钠储存机理',
    step: 'R1',
    doi: '10.1038/s41560-023-04567-8',
    authors: ['K. Sato', 'T. Yamamoto'],
    year: 2023,
    venue: 'Nature Energy',
    source: 'arxiv',
    at: '2026-10-10T16:17:26.000Z',
  }),
  lit({
    ev_id: 'EV-0002',
    title: '首次库伦效率与比表面积的相关性研究',
    step: 'R1',
    doi: '10.1016/j.ensm.2024.103456',
    authors: ['P. Novak', 'E. Fischer'],
    year: 2024,
    venue: 'Energy Storage Materials',
    source: 'crossref',
    at: '2026-10-10T16:17:27.000Z',
  }),
  lit({
    ev_id: 'EV-0003',
    title: '分布弛豫时间（DRT）在电化学阻抗中的应用',
    step: 'R2',
    doi: '10.1016/j.jpowsour.2023.233111',
    authors: ['L. Rossi', 'M. Bianchi'],
    year: 2023,
    venue: 'Journal of Power Sources',
    source: 'semantic_scholar',
    at: '2026-10-10T16:24:53.000Z',
  }),
  art({
    ev_id: 'EV-0004',
    kind: 'note',
    title: '孔径调控术语与表征口径笔记',
    step: 'R1',
    at: '2026-10-10T16:17:50.000Z',
  }),
  lit({
    ev_id: 'EV-0005',
    title: '固态电解质界面阻抗 EIS 建模综述',
    step: 'R2',
    doi: '10.1039/d2ee01234a',
    authors: ['N. Kumar', 'A. R. Smith'],
    year: 2022,
    venue: 'Energy & Environmental Science',
    source: 'semantic_scholar',
    at: '2026-10-10T16:24:54.000Z',
  }),
];

export const EVIDENCE_BY_TASK: Record<string, RawEvidence[]> = {
  [TASK_IDS.solid]: SOLID_EVIDENCE,
  [TASK_IDS.perovskite]: PEROVSKITE_EVIDENCE,
  [TASK_IDS.lithium]: LITHIUM_EVIDENCE,
  [TASK_IDS.hardCarbon]: HARD_CARBON_EVIDENCE,
};

const SOLID_CONCLUSIONS: RawConclusion[] = [
  {
    cid: 'C-0001',
    text: 'EIS 是基础且不可替代的定量手段，须以物理约束等效电路或 DRT 降低拟合多解性。',
    evidence_ids: ['EV-0001', 'EV-0002', 'EV-0010'],
    confidence: 'high',
    producer_step: 'R4',
    at: '2026-10-09T10:22:10.000Z',
  },
  {
    cid: 'C-0002',
    text: '晶界与电极界面阻抗的可靠分离依赖变温 EIS 与显微/化学手段交叉验证，单一方法不足。',
    evidence_ids: ['EV-0003', 'EV-0004', 'EV-0005'],
    confidence: 'high',
    producer_step: 'R4',
    at: '2026-10-09T10:22:11.000Z',
  },
  {
    cid: 'C-0003',
    text: '原位与三维成像为高置信趋势，但制样与环境差异是主要误差来源。',
    evidence_ids: ['EV-0004', 'EV-0006'],
    confidence: 'medium',
    producer_step: 'R4',
    at: '2026-10-09T10:22:12.000Z',
  },
  {
    cid: 'C-0004',
    text: '当前主要缺口是跨尺度、多手段联合标定与自动化、可复现的分析流程。',
    evidence_ids: ['EV-0007', 'EV-0008', 'EV-0012'],
    confidence: 'medium',
    producer_step: 'R5',
    at: '2026-10-09T10:28:30.000Z',
  },
];

const PEROVSKITE_CONCLUSIONS: RawConclusion[] = [
  {
    cid: 'C-0001',
    text: '2D/3D 异质结构钝化在效率与湿热稳定性上收益最均衡，但工艺窗口最窄。',
    evidence_ids: ['EV-0002', 'EV-0004', 'EV-0007'],
    confidence: 'high',
    producer_step: 'R4',
    at: '2026-10-08T14:45:20.000Z',
  },
  {
    cid: 'C-0002',
    text: '卤素空位钝化主要改善界面复合，对长期稳定性的贡献需与封装方案合并评估。',
    evidence_ids: ['EV-0003', 'EV-0006'],
    confidence: 'medium',
    producer_step: 'R4',
    at: '2026-10-08T14:45:21.000Z',
  },
  {
    cid: 'C-0003',
    text: '本次覆盖度受来源切换影响（78%），排序结论应在来源恢复后复核。',
    evidence_ids: ['EV-0008'],
    confidence: 'medium',
    producer_step: 'R5',
    at: '2026-10-08T14:52:40.000Z',
  },
];

export const CONCLUSIONS_BY_TASK: Record<string, RawConclusion[]> = {
  [TASK_IDS.solid]: SOLID_CONCLUSIONS,
  [TASK_IDS.perovskite]: PEROVSKITE_CONCLUSIONS,
  [TASK_IDS.lithium]: [],
  [TASK_IDS.hardCarbon]: [],
};

export const JUDGMENTS_BY_TASK: Record<string, RawJudgment[]> = {
  [TASK_IDS.solid]: [
    {
      seq: 18,
      at: '2026-10-09T10:36:10.000Z',
      summary: '证据绑定校验',
      data: { binding_rate: '100%', unbound: [], conclusions: 4 },
    },
    {
      seq: 19,
      at: '2026-10-09T10:36:40.000Z',
      summary: '哈希链与复现校验',
      data: { chain: 'intact', reproduce: 'PASS', records: 20 },
    },
  ],
  [TASK_IDS.perovskite]: [
    {
      seq: 12,
      at: '2026-10-08T14:58:10.000Z',
      summary: '证据绑定校验',
      data: { binding_rate: '100%', unbound: [], conclusions: 3 },
    },
    {
      seq: 13,
      at: '2026-10-08T14:58:40.000Z',
      summary: '降级影响评估',
      data: { coverage: '78%', resumable: true },
    },
  ],
  [TASK_IDS.lithium]: [
    {
      seq: 3,
      at: '2026-10-07T09:57:50.000Z',
      summary: '步骤失败判定',
      data: { step: 'R3', reason: '检索来源连续超时', attempts: 3 },
    },
  ],
  [TASK_IDS.hardCarbon]: [],
};

export const NOTES_BY_TASK: Record<string, RawNote[]> = {
  [TASK_IDS.solid]: [
    {
      seq: 20,
      at: '2026-10-09T10:04:10.000Z',
      text: '共命中 38 篇，去重后 23 篇，按相关度保留 14 篇高相关（6 篇综述、8 篇方法学）。',
    },
  ],
  [TASK_IDS.perovskite]: [
    {
      seq: 14,
      at: '2026-10-08T14:29:10.000Z',
      text: 'Semantic Scholar 连续 3 次 429，切换 OpenAlex 与本地语料兜底，覆盖度降至约 78%。',
    },
  ],
  [TASK_IDS.lithium]: [
    {
      seq: 4,
      at: '2026-10-07T09:58:12.000Z',
      text: 'R3 检索来源连续超时（attempts=3），未能建立完整对比维度，任务按失败终止。',
    },
  ],
  [TASK_IDS.hardCarbon]: [
    {
      seq: 6,
      at: '2026-10-10T16:25:10.000Z',
      text: 'R1 完成：4 篇文献入库（含 2 篇跨任务重复命中）；R2 精读进行中。',
    },
  ],
};

export interface EvidenceSource {
  task: SeedTask;
  evidence: RawEvidence[];
  conclusions: RawConclusion[];
  judgments: RawJudgment[];
  notes: RawNote[];
}

/** getEvidence() 完整响应（含 counts / chain_head / run） */
export function evidenceResponseOf(src: EvidenceSource) {
  const { task, evidence, conclusions, judgments, notes } = src;
  const last = evidence[evidence.length - 1];
  return {
    task_id: task.task_id,
    run_status: task.run_status,
    degraded: task.degraded,
    counts: {
      evidence: evidence.length,
      conclusions: conclusions.length,
      judgments: judgments.length,
      notes: notes.length,
      records: evidence.length + conclusions.length + judgments.length + notes.length,
    },
    evidence,
    conclusions,
    judgments,
    notes,
    chain_head: last ? last.chain_hash : null,
    run: {
      workflow: task.workflow,
      goal: task.goal,
      steps: task.steps.map((s) => ({ id: s.id, label: s.label, status: s.status, attempts: s.attempts })),
    },
  };
}

/** 按 task_id 取种子账本（fixtures 自校验与 liveEnv 初始态共用） */
export function evidenceResponse(taskId: string): ReturnType<typeof evidenceResponseOf> {
  return evidenceResponseOf({
    task: taskById(taskId),
    evidence: EVIDENCE_BY_TASK[taskId] ?? [],
    conclusions: CONCLUSIONS_BY_TASK[taskId] ?? [],
    judgments: JUDGMENTS_BY_TASK[taskId] ?? [],
    notes: NOTES_BY_TASK[taskId] ?? [],
  });
}

/* -------------------------------------------------------------------------- */
/* 结构化报告（StructuredReport：无 meta / verdict，门禁结论在 gate）             */
/* -------------------------------------------------------------------------- */

export interface RawReportSection {
  id: string;
  title: string;
  body: string;
}

export interface RawReport {
  task_id: string;
  title: string;
  abstract: string;
  sections: RawReportSection[];
  conclusions: Array<{ cid: string; text: string; evidence_ids: string[]; confidence?: string }>;
  evidence_count?: number;
  degraded?: boolean;
  degraded_statement?: string;
  ledger_digest?: string;
  ledger_head?: string;
  gate?: { passed: boolean; bypass?: boolean };
  run_status?: string;
  generated_at?: string;
}

const SOLID_SECTIONS: RawReportSection[] = [
  {
    id: 'background',
    title: '一、研究背景',
    body: '固态电池的界面阻抗直接决定倍率与循环性能。文献中的"界面阻抗"可能指空间电荷层、界面相（SEI）或晶界阻抗，因此需要先界定术语，再按界面类型匹配表征手段。\n\n本报告覆盖 **电极/电解质界面** 与 **晶界（颗粒间）界面** 两类高阻界面，检索窗口为 2021–2026 年。',
  },
  {
    id: 'research_question',
    title: '二、研究问题',
    body: '研究目标：检索并综述固态电解质界面阻抗的表征方法\n\n目标关键要素（确定性分词）：固态、电解、解质、界面、阻抗、表征、方法\n\n检索使用查询：solid-state electrolyte interface impedance characterization',
  },
  {
    id: 'method',
    title: '三、方法与过程',
    body: '执行链路为：多源检索 → 去重与相关度筛选 → 结构化抽取（原理/界面/条件/指标）→ 对比维度归纳 → 引用与数值核验 → 综述撰写 → 自评审与复现校验。\n\n共命中 38 篇文献，去重后 23 篇，按相关度保留 14 篇高相关（6 篇综述、8 篇方法学），抽取等效电路模型 9 套、原位/工况表征 5 类。',
  },
  {
    id: 'findings',
    title: '四、核心发现',
    body: '共形成 4 条结论，每条均绑定 fact 级证据（详见结论列表与证据角标）；多源印证主题词 11 个（每个获 ≥2 个独立来源支撑）。',
  },
  {
    id: 'S3',
    title: '五、核心发现：表征方法对比',
    body:
      '| 方法 | 原理 | 可测界面 | 优势 | 局限 | 证据 |\n| --- | --- | --- | --- | --- | --- |\n' +
      '| EIS + 等效电路 / DRT | 频域小信号，Nyquist 弧段对应不同界面 | 电极 / 晶界 | 无损、可定量、可原位 | 拟合多解，需物理约束 | EV-0001, EV-0002 |\n' +
      '| 变温 / 工况 EIS | Arrhenius 关系提取活化能，分离体相与晶界 | 晶界 / 体相 | 可分离晶界贡献 | 装置复杂、耗时 | EV-0003 |\n' +
      '| (S)TEM（含原位偏压） | 纳米尺度界面形貌与元素分布 | 电极 / 晶界 | 直观、高分辨 | 制样损伤、真空差异 | EV-0004 |\n' +
      '| XPS / 原位 XPS | 界面化学态、空间电荷层 | 电极界面化学 | 化学信息明确 | 难测离子动力学 | EV-0005 |\n' +
      '| FIB-SEM 三维成像 | 界面三维结构与接触面积 | 接触 / 孔隙 | 三维定量 | 分辨率与视野权衡 | EV-0006 |',
  },
  {
    id: 'answer',
    title: '六、对研究问题的回答（模型综合生成）',
    body:
      '固态电解质界面阻抗的表征以电化学阻抗谱（EIS）为核心手段 [EV-0001]，配合等效电路拟合与 DRT 分析可区分电极/电解质界面与晶界贡献 [EV-0002]。变温 EIS 通过 Arrhenius 关系提取活化能，可分离体相与晶界阻抗 [EV-0003]。\n\n' +
      '对界面化学态与形貌，XPS（含原位）与 (S)TEM 互补：前者给出空间电荷层与界面相的化学信息 [EV-0005]，后者提供纳米尺度形貌与元素分布 [EV-0004]。FIB-SEM 三维成像可定量接触面积与孔隙分布 [EV-0006]。\n\n' +
      '> ⚠️ 本节为**模型综合生成**（非确定性内容），已绑定证据清单：EV-0001、EV-0002、EV-0003、EV-0004、EV-0005、EV-0006。该内容为 artifact 级产物，不进入确定性结论，也不参与门禁的 fact 绑定校验。',
  },
  {
    id: 'limits',
    title: '七、关键争议与研究缺口',
    body: '晶界活化能在不同体系中报道为约 **0.4–0.9 eV**，存在明显分歧；本报告按 as-reported 标注，不做跨体系直接比较（EV-0008）。\n\n主要缺口：跨尺度、多手段联合标定，以及基于 DRT/机器学习的可复现拟合流程。',
  },
];

const PEROVSKITE_SECTIONS: RawReportSection[] = [
  {
    id: 'S1',
    title: '一、体系界定与性能指标',
    body: '指标固定为：认证效率、Voc 损失、85 °C/85% RH 老化 1000 h 的 T80 保留率、工艺步骤数。所有数据按 as-reported 记录并标注测量条件。',
  },
  {
    id: 'S2',
    title: '二、方法与过程',
    body: '检索窗口 2021–2026，来源为 arXiv、Crossref、OpenAlex 与本地语料库。因 Semantic Scholar 连续 429（见降级声明），配方—工艺—性能矩阵由本地语料与已复现数据集补齐 27 组配方。',
  },
  {
    id: 'S3',
    title: '三、核心发现：策略对比',
    body:
      '| 钝化策略 | 效率增益 | T80（85/85） | 工艺复杂度 | 证据 |\n| --- | --- | --- | --- | --- |\n' +
      '| 长链铵盐 2D/3D | +1.4 – 2.1% | 900–1050 h | 高（旋涂+反溶剂） | EV-0002 |\n' +
      '| 卤素富集（KF/Rb） | +0.6 – 1.2% | 700–860 h | 中 | EV-0003 |\n' +
      '| 聚合物嵌入 | +0.4 – 0.9% | >1100 h | 低（共混） | EV-0001 |',
  },
];

export const REPORTS: Record<string, RawReport> = {
  [TASK_IDS.solid]: {
    task_id: TASK_IDS.solid,
    title: '固态电解质界面阻抗表征方法研究综述（2021–2026）',
    abstract:
      '固态电解质的高阻抗界面主要来自电极/电解质界面与晶界（颗粒间）界面两类。本报告基于近五年文献，按原理归纳六类表征方法，建立"原理—可测界面—优势—局限"对比矩阵，并给出方法选择与组合验证建议。',
    sections: SOLID_SECTIONS,
    conclusions: SOLID_CONCLUSIONS.map((c) => ({
      cid: c.cid,
      text: c.text,
      evidence_ids: c.evidence_ids,
      confidence: c.confidence,
    })),
    evidence_count: SOLID_EVIDENCE.length,
    degraded: false,
    ledger_digest: fixtureHash('digest:solid'),
    ledger_head: SOLID_EVIDENCE[SOLID_EVIDENCE.length - 1]!.chain_hash,
    gate: { passed: true },
    run_status: 'DONE',
    generated_at: '2026-10-09T10:41:00.000Z',
  },
  [TASK_IDS.perovskite]: {
    task_id: TASK_IDS.perovskite,
    title: '钙钛矿薄膜缺陷钝化策略对比与方案建议',
    abstract:
      '围绕钙钛矿太阳能电池的体相与界面缺陷，比较铵盐、卤素与聚合物三类钝化路径在效率增益、工艺复杂度与湿热稳定性上的表现，给出可执行的方案排序。',
    sections: PEROVSKITE_SECTIONS,
    conclusions: PEROVSKITE_CONCLUSIONS.map((c) => ({
      cid: c.cid,
      text: c.text,
      evidence_ids: c.evidence_ids,
      confidence: c.confidence,
    })),
    evidence_count: PEROVSKITE_EVIDENCE.length,
    degraded: true,
    degraded_statement:
      '本次执行发生一次降级：R1 阶段 Semantic Scholar 连续 3 次返回 429 且重试无效，系统切换至 OpenAlex 与本地语料库继续执行，任务未中断；文献覆盖度由约 92% 降至约 78%，排序结论的普适性受影响（EV-0008）。',
    ledger_digest: fixtureHash('digest:perovskite'),
    ledger_head: PEROVSKITE_EVIDENCE[PEROVSKITE_EVIDENCE.length - 1]!.chain_hash,
    gate: { passed: true },
    run_status: 'DONE',
    generated_at: '2026-10-08T15:06:00.000Z',
  },
};

/** 硬碳续跑完成后的增量（fake backend 在 pump 时应用：证据 + 结论 + 报告就绪） */
export const HARD_CARBON_DELTA = {
  evidence: [
    art({
      ev_id: 'EV-0006',
      kind: 'draft',
      title: '综述草稿（第 1 版）',
      step: 'R5',
      at: '2026-10-10T16:44:30.000Z',
    }),
    art({
      ev_id: 'EV-0007',
      kind: 'synthesis',
      title: '综合回答：硬碳负极孔径调控与首次库伦效率',
      step: 'S1',
      at: '2026-10-10T16:49:10.000Z',
    }),
  ] as RawEvidence[],
  conclusions: [
    {
      cid: 'C-0001',
      text: '硬碳负极的首次库伦效率与可逆比容量受孔径分布调控：微孔主导吸附容量、大孔主导离子传输，制备中需协同优化。',
      evidence_ids: ['EV-0001', 'EV-0002'],
      confidence: 'high',
      producer_step: 'R5',
      at: '2026-10-10T16:44:31.000Z',
    },
    {
      cid: 'C-0002',
      text: '首次库伦效率与比表面积呈负相关的报道一致，但孔径区间划分口径不一，跨研究比较需按 as-reported 标注。',
      evidence_ids: ['EV-0002', 'EV-0003'],
      confidence: 'medium',
      producer_step: 'R5',
      at: '2026-10-10T16:44:32.000Z',
    },
  ] as RawConclusion[],
  report: {
    task_id: TASK_IDS.hardCarbon,
    title: '钠离子电池硬碳负极孔径调控对首次库伦效率的影响',
    abstract:
      '汇总硬碳负极孔径分布与钠储存机理的近三年文献，比较微孔/大孔划分口径对首次库伦效率结论的影响，给出制备层面的优化建议。',
    sections: [
      {
        id: 'background',
        title: '一、研究背景',
        body: '硬碳负极被视为钠离子电池最具可行性的负极材料，其首次库伦效率偏低是产业化的主要瓶颈之一。文献普遍将孔径划分为微孔（<2 nm）与大孔/介孔，但划分口径与测试条件不统一，结论的可比性存疑。',
      },
      {
        id: 'findings',
        title: '二、核心发现',
        body: '共形成 2 条结论，均绑定 fact 级证据；孔径—效率关系存在两类解释（吸附—填充 vs 传输主导），本报告按 as-reported 并列标注。',
      },
    ],
    conclusions: [
      {
        cid: 'C-0001',
        text: '硬碳负极的首次库伦效率与可逆比容量受孔径分布调控：微孔主导吸附容量、大孔主导离子传输，制备中需协同优化。',
        evidence_ids: ['EV-0001', 'EV-0002'],
        confidence: 'high',
      },
      {
        cid: 'C-0002',
        text: '首次库伦效率与比表面积呈负相关的报道一致，但孔径区间划分口径不一，跨研究比较需按 as-reported 标注。',
        evidence_ids: ['EV-0002', 'EV-0003'],
        confidence: 'medium',
      },
    ],
    evidence_count: 7,
    degraded: false,
    ledger_digest: fixtureHash('digest:hard-carbon'),
    gate: { passed: true },
    run_status: 'DONE',
    generated_at: '2026-10-10T16:49:30.000Z',
  } as RawReport,
};

/* -------------------------------------------------------------------------- */
/* SSE 帧（events/model.ts RelayEvent 形状）                                    */
/* -------------------------------------------------------------------------- */

export type RelayFrame =
  | { type: 'ping'; seq: number; ts: string }
  | {
      type: 'step';
      seq: number;
      ts: string;
      step: string;
      status: 'PENDING' | 'RUNNING' | 'DONE' | 'SKIPPED' | 'FAILED';
      elapsed_ms?: number;
      error?: string;
    }
  | { type: 'activity'; seq: number; ts: string; step: string; human_message: string; detail?: unknown }
  | { type: 'thinking'; seq: number; ts: string; step?: string; text: string }
  | {
      type: 'tool';
      seq: number;
      ts: string;
      step: string;
      tool: string;
      status: 'running' | 'ok' | 'error';
      input?: unknown;
      output?: unknown;
      sources_status?: Record<string, string>;
    }
  | {
      type: 'degraded';
      seq: number;
      ts: string;
      level: 'info' | 'degraded';
      source: string;
      reason: string;
      impact: string;
      resumable: boolean;
      step: string;
    }
  | { type: 'conclusion'; seq: number; ts: string; cid: string; text: string; evidence_ids: string[] }
  | {
      type: 'message';
      seq: number;
      ts: string;
      turn_id: string;
      role: 'assistant' | 'user';
      text?: string;
      delta?: string;
      status: 'running' | 'done';
      queued_order?: number;
    }
  | { type: 'report'; seq: number; ts: string; task_id: string; status: 'ready' | 'generating' }
  | { type: 'done'; seq: number; ts: string; run_status: 'DONE' | 'FAILED'; report_ready: boolean; error?: string };

/** 帧构造器：seq 自增，ts 取任务时间线（fixtures 内单调即可） */
/** 分布式 Omit：直接 Omit<RelayFrame, …> 会退化成只保留公共字段，各分支专属字段全丢 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type FrameInput = DistributiveOmit<RelayFrame, 'seq' | 'ts'> & { at?: number };

class FrameBuilder {
  readonly frames: RelayFrame[] = [];
  private seq = 0;
  constructor(private readonly baseTs: string) {}

  private stamp(offsetSec: number): string {
    const base = new Date(this.baseTs).getTime() + offsetSec * 1000;
    return new Date(base).toISOString();
  }

  push(frame: FrameInput, offsetSec = 0): void {
    this.seq += 1;
    const { at, ...rest } = frame;
    this.frames.push({ ...rest, seq: this.seq, ts: this.stamp(at ?? offsetSec) } as RelayFrame);
  }
}

const SOLID_SOURCES_STATUS: Record<string, string> = {
  arxiv: 'ok',
  crossref: 'ok',
  openalex: 'ok',
  semantic_scholar: 'skipped',
  local: 'ok',
};

/**
 * 固态电解质：建连快照（ping → 7 步 DONE → info 级来源提示 → 4 结论 → report ready → done），
 * 其后是按 events/relay.ts snapshot() 语义补发的过程帧。
 * 过程帧**只含 activity/tool**——trace.jsonl 只持久化这两类（appendTrace），
 * 思考帧是 AGH 预览流的实时帧、不落盘，终态回放里不会出现（见 HARD_CARBON 续跑帧）。
 */
function solidFrames(): RelayFrame[] {
  const b = new FrameBuilder(TS.solidCreated);
  b.push({ type: 'ping' });
  const stepElapsed: Record<string, number> = {
    R1: 5200,
    R2: 4400,
    R3: 3600,
    R4: 3400,
    R5: 5200,
    R6: 3800,
    S1: 4100,
  };
  for (const s of RESEARCH_STEPS) {
    b.push({ type: 'step', step: s.id, status: 'DONE', elapsed_ms: stepElapsed[s.id]! });
  }
  b.push({
    type: 'degraded',
    level: 'info',
    source: 'semantic_scholar',
    reason: '该来源返回 429（限流），系统自动跳过',
    impact: '其余 4 个来源覆盖充足，结果不受影响，不构成降级',
    resumable: true,
    step: 'R1',
  });
  for (const c of SOLID_CONCLUSIONS) {
    b.push({ type: 'conclusion', cid: c.cid, text: c.text, evidence_ids: c.evidence_ids });
  }
  b.push({ type: 'report', task_id: TASK_IDS.solid, status: 'ready' });
  b.push({ type: 'done', run_status: 'DONE', report_ready: true });

  // ---- 过程帧补发（trace 回放：只含 activity/tool/thinking） ----
  b.push(
    { type: 'activity', step: 'R1', human_message: '正在检索相关文献…', detail: `研究目标：${SOLID_GOAL}` },
    120,
  );
  b.push(
    {
      type: 'tool',
      step: 'R1',
      tool: 'sciret_search_literature',
      status: 'running',
      input: {
        query: 'solid-state electrolyte interfacial impedance characterization',
        years: '2021-2026',
        sources: ['arxiv', 'crossref', 'openalex', 'semantic_scholar', 'local'],
      },
    },
    140,
  );
  b.push(
    { type: 'activity', step: 'R1', human_message: 'Crossref、OpenAlex、本地语料库 已返回结果，正在合并去重…' },
    320,
  );
  b.push(
    {
      type: 'tool',
      step: 'R1',
      tool: 'sciret_search_literature',
      status: 'ok',
      output: { hits: 50, deduped: 23, high_relevance: 14 },
      sources_status: SOLID_SOURCES_STATUS,
    },
    500,
  );
  b.push({ type: 'activity', step: 'R2', human_message: '正在精读 14 篇高相关论文，提取表征原理与关键参数…' }, 580);
  b.push(
    { type: 'tool', step: 'R2', tool: 'sciret_read_papers', status: 'running', input: { papers: 14, extract: ['method', 'interface_type', 'conditions', 'metrics'] } },
    610,
  );
  b.push({ type: 'activity', step: 'R2', human_message: '已抽取 9 套等效电路模型与 5 类原位表征条件…' }, 900);
  b.push(
    { type: 'tool', step: 'R2', tool: 'sciret_read_papers', status: 'ok', output: { ecu_models: 9, in_situ_methods: 5, parameter_pairs: 23 } },
    960,
  );
  b.push({ type: 'activity', step: 'R3', human_message: '正在建立统一对比维度（原理 / 可测界面 / 优势 / 局限）…' }, 1060);
  b.push(
    { type: 'tool', step: 'R3', tool: 'sciret_analyze', status: 'running', input: { dimensions: ['原理', '可测界面', '优势', '局限', '典型条件'] } },
    1160,
  );
  b.push({ type: 'tool', step: 'R3', tool: 'sciret_analyze', status: 'ok', output: { method_classes: 6, matrix_rows: 5, research_gaps: 3 } }, 1380);
  b.push({ type: 'activity', step: 'R4', human_message: '正在核验引用与数据一致性，并标注争议数值…' }, 1460);
  b.push(
    { type: 'tool', step: 'R4', tool: 'sciret_factcheck', status: 'running', input: { citations: 12, check: ['DOI', '数值一致性', '矛盾'] } },
    1560,
  );
  b.push(
    { type: 'tool', step: 'R4', tool: 'sciret_factcheck', status: 'ok', output: { doi_valid: 12, conflicts: 1, conflict_note: '晶界活化能 0.4–0.9 eV 分歧，按 as-reported 标注' } },
    1760,
  );
  b.push({ type: 'activity', step: 'R5', human_message: '正在整合对比表并撰写综述与结论…' }, 1840);
  b.push({ type: 'tool', step: 'R5', tool: 'sciret_write_report', status: 'running', input: { format: 'structured + table + bibtex', language: 'zh' } }, 1940);
  b.push({ type: 'activity', step: 'R6', human_message: '正在做自评审：证据绑定、哈希链与复现校验…' }, 2400);
  b.push({ type: 'tool', step: 'R6', tool: 'sciret_review', status: 'running', input: { checks: ['evidence_binding', 'hash_chain', 'reproduce'] } }, 2500);
  b.push({ type: 'tool', step: 'R6', tool: 'sciret_review', status: 'ok', output: { binding_rate: '100%', chain: 'intact', reproduce: 'PASS' } }, 2720);
  return b.frames;
}

/** 钙钛矿：快照含 degraded 级降级帧；过程帧体现切源与覆盖度下降 */
function perovskiteFrames(): RelayFrame[] {
  const b = new FrameBuilder(TS.perovskiteCreated);
  b.push({ type: 'ping' });
  const stepElapsed: Record<string, number> = { R1: 4100, R2: 3900, R3: 2400, R4: 2200, R5: 3000, R6: 2100, S1: 3300 };
  for (const s of RESEARCH_STEPS) {
    b.push({ type: 'step', step: s.id, status: 'DONE', elapsed_ms: stepElapsed[s.id]! });
  }
  b.push({
    type: 'degraded',
    level: 'degraded',
    source: 'semantic_scholar',
    reason: '原计划使用的语义检索来源连续 3 次返回 429，重试与退避后仍不可用',
    impact: '已加大 OpenAlex 与本地语料的检索比重，文献覆盖度由约 92% 降至约 78%；排序结论需在来源恢复后复核',
    resumable: true,
    step: 'R1',
  });
  for (const c of PEROVSKITE_CONCLUSIONS) {
    b.push({ type: 'conclusion', cid: c.cid, text: c.text, evidence_ids: c.evidence_ids });
  }
  b.push({ type: 'report', task_id: TASK_IDS.perovskite, status: 'ready' });
  b.push({ type: 'done', run_status: 'DONE', report_ready: true });

  b.push({ type: 'activity', step: 'R1', human_message: '正在检索缺陷钝化策略文献…', detail: `研究目标：${PEROVSKITE_GOAL}` }, 150);
  b.push(
    { type: 'tool', step: 'R1', tool: 'sciret_search_literature', status: 'running', input: { query: 'perovskite defect passivation efficiency stability', sources: ['arxiv', 'crossref', 'openalex', 'semantic_scholar', 'local'] } },
    180,
  );
  b.push(
    {
      type: 'tool',
      step: 'R1',
      tool: 'sciret_search_literature',
      status: 'ok',
      output: { hits: 19, deduped: 15, high_relevance: 12, coverage: '78%' },
      sources_status: { arxiv: 'ok', crossref: 'ok', openalex: 'ok', semantic_scholar: 'unavailable', local: 'ok' },
    },
    420,
  );
  b.push({ type: 'activity', step: 'R3', human_message: '正在建立性能对比矩阵…' }, 830);
  b.push({ type: 'activity', step: 'R4', human_message: '正在核验效率数值一致性，6 处与原文相差 >0.5% 已按原文回退…' }, 1110);
  b.push({ type: 'tool', step: 'R4', tool: 'sciret_factcheck', status: 'ok', output: { checked: 9, rolled_back: 6 } }, 1300);
  b.push({ type: 'activity', step: 'R5', human_message: '正在撰写方案建议与结论…' }, 1370);
  b.push({ type: 'activity', step: 'R6', human_message: '正在做自评审与降级影响评估…' }, 1560);
  return b.frames;
}

/**
 * 锂金属枝晶：快照带 R3 FAILED（含 error）与后续 PENDING 步骤，
 * report 为 generating、done 为 FAILED——前端据此进入失败态而非空转"生成中"。
 */
function lithiumFrames(): RelayFrame[] {
  const b = new FrameBuilder(TS.lithiumCreated);
  b.push({ type: 'ping' });
  b.push({ type: 'step', step: 'R1', status: 'DONE', elapsed_ms: 3100 });
  b.push({ type: 'step', step: 'R2', status: 'DONE', elapsed_ms: 4200 });
  b.push({
    type: 'step',
    step: 'R3',
    status: 'FAILED',
    elapsed_ms: 9000,
    error: '检索来源连续超时，未能建立完整对比维度',
  });
  for (const id of ['R4', 'R5', 'R6', 'S1']) {
    b.push({ type: 'step', step: id, status: 'PENDING' });
  }
  b.push({ type: 'report', task_id: TASK_IDS.lithium, status: 'generating' });
  b.push({
    type: 'done',
    run_status: 'FAILED',
    report_ready: false,
    error: 'R3 创新点拆解失败：检索来源连续超时，未能建立完整对比维度（attempts=3）',
  });

  b.push({ type: 'activity', step: 'R1', human_message: '正在检索锂金属负极枝晶生长文献…' }, 200);
  b.push(
    { type: 'tool', step: 'R1', tool: 'sciret_search_literature', status: 'ok', output: { hits: 11, deduped: 8, high_relevance: 5 }, sources_status: SOLID_SOURCES_STATUS },
    340,
  );
  b.push({ type: 'activity', step: 'R2', human_message: '正在精读并汇总临界电流密度报道值…' }, 620);
  b.push({ type: 'tool', step: 'R2', tool: 'sciret_read_papers', status: 'ok', output: { papers: 5, parameter_pairs: 8 } }, 900);
  b.push({ type: 'activity', step: 'R3', human_message: '正在尝试建立跨文献对比维度…' }, 1500);
  b.push({ type: 'tool', step: 'R3', tool: 'sciret_analyze', status: 'running', input: { dimensions: ['体系', '电流密度', '压制压力', '循环次数'] } }, 1600);
  b.push(
    { type: 'tool', step: 'R3', tool: 'sciret_analyze', status: 'error', output: { error: '检索来源连续超时', attempts: 3 } },
    1700,
  );
  return b.frames;
}

/** 硬碳：RUNNING——快照只发进度（R1 DONE / R2 RUNNING / 其余 PENDING）与 report generating，**不发 done** */
function hardCarbonSnapshotFrames(): RelayFrame[] {
  const b = new FrameBuilder(TS.hardCarbonCreated);
  b.push({ type: 'ping' });
  b.push({ type: 'step', step: 'R1', status: 'DONE', elapsed_ms: 2900 });
  b.push({ type: 'step', step: 'R2', status: 'RUNNING', elapsed_ms: 1800 });
  for (const id of ['R3', 'R4', 'R5', 'R6', 'S1']) {
    b.push({ type: 'step', step: id, status: 'PENDING' });
  }
  // 运行中任务的进程内过程帧（appendTrace 口径：activity/tool 已持久化，
  // 重建连接时随 trace 回放；step/report 由快照按当前状态重建，不在此混入）
  b.push({ type: 'activity', step: 'R1', human_message: '正在检索硬碳负极孔径调控文献…' });
  b.push({ type: 'tool', step: 'R1', tool: 'sciret_search_literature', status: 'ok', output: { hits: 9, deduped: 6 } });
  b.push({ type: 'activity', step: 'R2', human_message: '正在精读孔径分布与钠储存机理文献…' });
  b.push({ type: 'tool', step: 'R2', tool: 'sciret_read_papers', status: 'running', input: { papers: 3 } });
  b.push({ type: 'report', task_id: TASK_IDS.hardCarbon, status: 'generating' });
  return b.frames;
}

/**
 * 硬碳续跑帧（fake backend 在 pump 时释放）：R2 完成 → …→ S1 → report ready → done DONE。
 * 这是**运行期实时帧**：含 thinking（AGH 预览流，PreviewMerger 按 offset 对齐、
 * 只下发新增片段）——当前部署模型 agnes-3.0-flash thinking=0 时真实后端无思考帧，
 * fixtures 照发以便锁定前端「不过滤、按 step 聚合、逐帧累加」的翻译链路。
 */
function hardCarbonContinuationFrames(): RelayFrame[] {
  const b = new FrameBuilder(TS.hardCarbonCreated);
  const offset = 1200; // 相对快照的时间线后移
  b.push({ type: 'activity', step: 'R2', human_message: '正在精读孔径分布与钠储存机理文献…' }, offset + 60);
  b.push({ type: 'thinking', step: 'R2', text: '硬碳的孔径—平台区对应关系存在两类解释，需要分别标注证据，不能合并表述。' }, offset + 120);
  b.push({ type: 'tool', step: 'R2', tool: 'sciret_read_papers', status: 'running', input: { papers: 3 } }, offset + 150);
  b.push({ type: 'tool', step: 'R2', tool: 'sciret_read_papers', status: 'ok', output: { papers: 3, parameter_pairs: 6 } }, offset + 300);
  b.push({ type: 'step', step: 'R2', status: 'DONE', elapsed_ms: 5100 }, offset + 320);
  b.push({ type: 'step', step: 'R3', status: 'RUNNING' }, offset + 340);
  b.push({ type: 'activity', step: 'R3', human_message: '正在建立孔径调控对比维度…' }, offset + 380);
  b.push({ type: 'tool', step: 'R3', tool: 'sciret_analyze', status: 'ok', output: { dimensions: 4 } }, offset + 700);
  b.push({ type: 'step', step: 'R3', status: 'DONE', elapsed_ms: 3200 }, offset + 720);
  b.push({ type: 'step', step: 'R4', status: 'RUNNING' }, offset + 740);
  b.push({ type: 'tool', step: 'R4', tool: 'sciret_factcheck', status: 'ok', output: { checked: 4, conflicts: 1 } }, offset + 1000);
  b.push({ type: 'step', step: 'R4', status: 'DONE', elapsed_ms: 2800 }, offset + 1020);
  b.push({ type: 'step', step: 'R5', status: 'RUNNING' }, offset + 1040);
  b.push({ type: 'activity', step: 'R5', human_message: '正在撰写综述与结论…' }, offset + 1080);
  b.push({ type: 'tool', step: 'R5', tool: 'sciret_write_report', status: 'ok', output: { sections: 2, conclusions: 2 } }, offset + 1300);
  for (const c of HARD_CARBON_DELTA.conclusions) {
    b.push({ type: 'conclusion', cid: c.cid, text: c.text, evidence_ids: c.evidence_ids }, offset + 1320);
  }
  b.push({ type: 'step', step: 'R5', status: 'DONE', elapsed_ms: 4600 }, offset + 1400);
  b.push({ type: 'step', step: 'R6', status: 'RUNNING' }, offset + 1420);
  b.push({ type: 'tool', step: 'R6', tool: 'sciret_review', status: 'ok', output: { binding_rate: '100%', chain: 'intact', reproduce: 'PASS' } }, offset + 1600);
  b.push({ type: 'step', step: 'R6', status: 'DONE', elapsed_ms: 2600 }, offset + 1620);
  b.push({ type: 'step', step: 'S1', status: 'RUNNING' }, offset + 1640);
  b.push({ type: 'step', step: 'S1', status: 'DONE', elapsed_ms: 3800 }, offset + 1900);
  b.push({ type: 'report', task_id: TASK_IDS.hardCarbon, status: 'ready' }, offset + 1920);
  b.push({ type: 'done', run_status: 'DONE', report_ready: true }, offset + 1940);
  return b.frames;
}

/** 每个任务建连即重放的帧序列（终态任务 = 快照 + 过程帧；RUNNING = 仅快照） */
export const SSE_FRAMES: Record<string, RelayFrame[]> = {
  [TASK_IDS.solid]: solidFrames(),
  [TASK_IDS.perovskite]: perovskiteFrames(),
  [TASK_IDS.lithium]: lithiumFrames(),
  [TASK_IDS.hardCarbon]: hardCarbonSnapshotFrames(),
};

/** RUNNING 任务续跑时释放的帧（fake backend 的 pump 入口） */
export const SSE_CONTINUATION: Record<string, RelayFrame[]> = {
  [TASK_IDS.hardCarbon]: hardCarbonContinuationFrames(),
};

/**
 * 追问/修订轮次帧（相对插入时刻）。
 * 终态任务（DONE/FAILED）的语义红线（services/message.ts buildInstruction）：
 * 产物不可变——revise 只输出修订建议文本，**不发 report 帧、不改报告**；
 * ask 基于既有证据回答。队列消息在运行中任务上排队，回合结束才投递。
 */
/**
 * 追问/修订的 assistant 回复文本（与 SSE 帧同源：帧里的 delta 拼接结果即此文本）。
 * liveEnv 落历史消息时直接复用，避免"帧里一套、历史里另一套"。
 */
export function followUpReply(action: 'ask' | 'revise', text: string): string {
  return action === 'revise'
    ? `已记录修订请求：「${text}」。修订建议：第三节对比矩阵建议补充 FIB-SEM 的视野—分辨率权衡说明（依据 EV-0006）；结论 C-0003 的误差来源表述可并入制样与环境差异（依据 EV-0004）。任务已终态，产物不作改动，建议供后续重建参考。`
    : `基于本任务证据账本回答「${text}」：近两年的进展集中在原位 (S)TEM 与 DRT 拟合的自动化方向（EV-0004、EV-0002），晶界活化能报道区间仍为 0.4–0.9 eV（EV-0008）。以上引用均来自账本证据，未新增外部检索。`;
}

export function followUpFrames(
  turnId: string,
  action: 'ask' | 'revise',
  text: string,
  opts: { queuedOrder?: number } = {},
): RelayFrame[] {
  const b = new FrameBuilder('2026-10-10T17:00:00.000Z');
  const reply = followUpReply(action, text);
  const chunks: string[] = [];
  for (let i = 0; i < reply.length; i += 24) chunks.push(reply.slice(i, i + 24));
  b.push({ type: 'message', turn_id: turnId, role: 'user', status: 'running', text, ...(opts.queuedOrder ? { queued_order: opts.queuedOrder } : {}) });
  chunks.forEach((chunk, i) => {
    b.push({ type: 'message', turn_id: turnId, role: 'assistant', status: 'running', delta: chunk }, 200 + i * 60);
  });
  b.push(
    { type: 'tool', step: action === 'revise' ? 'R5' : 'R3', tool: 'sciret_analyze', status: 'ok', input: { followup: text, scope: 'existing session' }, output: { turn_id: turnId } },
    100 + chunks.length * 60,
  );
  b.push({ type: 'message', turn_id: turnId, role: 'assistant', status: 'done' }, 300 + chunks.length * 60);
  return b.frames;
}

/* -------------------------------------------------------------------------- */
/* 文献库（services/library.ts：过滤 → 排序 → DOI 去重 → 分页）                  */
/* -------------------------------------------------------------------------- */

export interface RawLibraryRef {
  doi: string;
  title: string;
  authors: string[];
  year: number | string | null;
  venue: string;
  source: string;
}

export interface RawLibraryItem {
  ev_id: string;
  task_id: string;
  task_goal: string;
  tier: string;
  kind: string;
  title: string;
  ref: RawLibraryRef;
  producer_step: string;
  duplicates_count: number;
}

export interface RawLibraryResponse {
  total: number;
  tasks_scanned: number;
  items: RawLibraryItem[];
  offset: number;
  limit: number;
}

export interface LibraryQuery {
  q?: string;
  kind?: string;
  tier?: string;
  source?: string;
  task_id?: string;
  dedupe?: boolean;
  limit?: number;
  offset?: number;
}

/** 后端 normalizeDoi：剥 doi.org 前缀、小写、去空白 */
export function normalizeDoi(doi: string): string {
  return doi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:/, '');
}

/** 文献条目 ref（带题录）；产物条目 ref 只有 title 与 source，无 DOI（liveEnv 复用） */
export function libraryRefOf(ev: RawEvidence): RawLibraryRef {
  if (ev.doi !== null) {
    return {
      doi: ev.doi,
      title: ev.title,
      authors: ev.authors,
      year: ev.year,
      venue: ev.venue,
      source: ev.source,
    };
  }
  return { doi: '', title: ev.title, authors: [], year: null, venue: '', source: ev.source };
}

/**
 * 文献库查询语料（services/library.ts 的 collect 口径）。
 * liveEnv 假后端把"测试中新建任务"的账本并进来，DOI 组跨任务合并才与真后端同结果。
 */
export interface LibraryCorpus {
  tasks: SeedTask[];
  evidence: Record<string, RawEvidence[]>;
}

export const SEED_CORPUS: LibraryCorpus = { tasks: SEED_TASKS, evidence: EVIDENCE_BY_TASK };

/**
 * 文献库查询（与 services/library.ts query() 同序实现）：
 * 1) 从各任务账本收集证据（backend collect：任务 created_at 降序 → task_id 升序 → 任务内 seq 升序）
 * 2) matches() 过滤（q 命中 title/ref.title/doi/作者/venue/source，大小写不敏感；其余精确匹配）
 * 3) dedupeByDoi()：仅按规范化 DOI 合并，无 DOI 不聚合；代表 = 该顺序下首现者，duplicates_count = 组内-1
 * 4) 分页（total/tasks_scanned 与分页无关）
 */
export function libraryQuery(
  params: LibraryQuery = {},
  corpus: LibraryCorpus = SEED_CORPUS,
  opts: { producerStep?: string } = {},
): RawLibraryResponse {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const dedupe = params.dedupe !== false;

  // 任务排序：created_at 降序 → task_id 升序（后端 collect 口径）
  const orderedTasks = [...corpus.tasks].sort((a, b) => {
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
    return a.task_id < b.task_id ? -1 : 1;
  });

  const rows: RawLibraryItem[] = [];
  for (const task of orderedTasks) {
    const evidence = corpus.evidence[task.task_id] ?? [];
    for (const ev of evidence) {
      rows.push({
        // ev_id 与后端同形：任务内序号，跨任务会重复——列表 key 必须带 task_id
        ev_id: ev.ev_id,
        task_id: task.task_id,
        task_goal: task.goal,
        tier: ev.tier,
        kind: ev.kind,
        title: ev.title,
        ref: libraryRefOf(ev),
        producer_step: ev.producer_step,
        duplicates_count: 0,
      });
    }
  }

  // R1 作用域（后端 literature() 口径：collect 全任务 → 过滤 producer_step='R1' → dedupeByDoi）。
  // 全库 BibTeX 导出走此路径；普通查询不传该参数，口径不变。
  const scoped = opts.producerStep ? rows.filter((it) => it.producer_step === opts.producerStep) : rows;

  const q = (params.q ?? '').trim().toLowerCase();
  let items = scoped.filter((it) => {
    if (params.kind && it.kind !== params.kind) return false;
    if (params.tier && it.tier !== params.tier) return false;
    if (params.source && it.ref.source !== params.source) return false;
    if (params.task_id && it.task_id !== params.task_id) return false;
    if (!q) return true;
    // haystack 与后端 matches() 逐项一致：title/ref.title/doi/作者/venue/source，
    // **不含 task_goal**（后端不按任务目标检索，fixtures 不自行扩大口径）
    const haystack = [it.title, it.ref.title, it.ref.doi, it.ref.authors.join(' '), it.ref.venue, it.ref.source]
      .join('\n')
      .toLowerCase();
    return haystack.includes(q);
  });

  if (dedupe) {
    // 两遍扫描（与后端 dedupeByDoi 同构）：先统计每组条目数，再按原序输出、
    // DOI 组只在首现处输出代表，duplicates_count = 组内条目数 - 1
    const counts = new Map<string, number>();
    for (const it of items) {
      const doi = normalizeDoi(it.ref.doi);
      if (!doi) continue;
      counts.set(doi, (counts.get(doi) ?? 0) + 1);
    }
    const seenRep = new Set<string>();
    const out: RawLibraryItem[] = [];
    for (const it of items) {
      const doi = normalizeDoi(it.ref.doi);
      if (!doi) {
        out.push(it); // 无 DOI：各自独立，duplicates_count=0
        continue;
      }
      if (seenRep.has(doi)) continue;
      seenRep.add(doi);
      out.push({ ...it, duplicates_count: (counts.get(doi) ?? 1) - 1 });
    }
    items = out;
  }

  return {
    total: items.length,
    tasks_scanned: new Set(items.map((x) => x.task_id)).size,
    items: items.slice(offset, offset + Math.max(0, limit)),
    offset,
    limit,
  };
}

/** 文献库规模常量（默认 dedupe=on）：4 任务 28 条原始证据，去重后 24 条 */
export const LIBRARY_STATS = {
  raw: SEED_TASKS.reduce((n, t) => n + (EVIDENCE_BY_TASK[t.task_id]?.length ?? 0), 0),
  dedupedTotal: libraryQuery().total,
  tasksScanned: libraryQuery().tasks_scanned,
  /** 10.1039/d2ee01234a：3 个任务各命中一次 → duplicates_count=2，代表为最新任务（硬碳） */
  doiD2ee: '10.1039/d2ee01234a',
  /** 10.1038/s41578-023-00601-x：钙钛矿任务内两次命中 → duplicates_count=1 */
  doiS41578: '10.1038/s41578-023-00601-x',
  /** 10.1016/j.jpowsour.2023.233111：固态 + 硬碳 → duplicates_count=1 */
  doiJpowsour: '10.1016/j.jpowsour.2023.233111',
} as const;

/* ── BibTeX 渲染（与 export/bibtex.ts 逐行同口径，v2.4 起两边共用） ── */

const BIB_ESCAPE: Record<string, string> = {
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
  '\\': '\\textbackslash{}',
};

/** BibTeX 特殊字符转义：单次扫描映射，避免花括号被二次转义 */
export function escapeBib(value: string): string {
  return value.replace(/[&%$#_{}~^\\]/g, (c) => BIB_ESCAPE[c] ?? c);
}

/** 第一作者姓（末段词去非字母数字/中文）；取不到回退 Anon */
export function surnameOf(author: string): string {
  const parts = author.trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  return last.replace(/[^0-9A-Za-z\u4e00-\u9fff]/g, '') || 'Anon';
}

/** BibTeX 引用键：第一作者姓 + 年份 + 序号（序号防碰撞；年份取数字，缺失为 nd） */
export function bibKey(ref: RawLibraryRef, index: number): string {
  const first = ref.authors[0];
  const surname = first ? surnameOf(first) : 'Anon';
  const yearRaw = ref.year;
  const year =
    yearRaw === null || yearRaw === undefined || yearRaw === ''
      ? 'nd'
      : String(yearRaw).replace(/[^0-9]/g, '') || 'nd';
  return `${surname}${year}${index}`;
}

/** 单条 BibTeX 条目：author 用 ', ' 连接；字段缺失跳行；条目以换行加右花括号收尾 */
export function toBibEntry(ref: RawLibraryRef, index: number): string {
  const author = ref.authors.join(', ');
  const fields: Array<[string, string]> = [];
  if (author) fields.push(['author', author]);
  if (ref.title) fields.push(['title', ref.title]);
  if (ref.venue) fields.push(['journal', ref.venue]);
  if (ref.year !== null && ref.year !== undefined && ref.year !== '') fields.push(['year', String(ref.year)]);
  if (ref.doi) fields.push(['doi', ref.doi]);
  const body = fields.map(([k, v]) => `  ${k} = {${escapeBib(v)}}`).join(',\n');
  return `@article{${bibKey(ref, index)},\n${body}\n}\n`;
}

/** 一批 ref → 完整 .bib 文本（条目之间空行分隔；序号即防碰撞键的尾号） */
export function bibtexOf(refs: RawLibraryRef[]): string {
  return refs.map((ref, i) => toBibEntry(ref, i + 1)).join('\n');
}

/**
 * 全库 BibTeX 导出内容（GET /api/v1/library/export?kind=bibtex）。
 * 后端口径 = literature()：collect 全任务 → 过滤 producer_step='R1' → dedupeByDoi，
 * **不过滤无 DOI 条目**（renderBibtex 对缺失字段跳行而非丢条目）。
 */
export function libraryBibtex(corpus: LibraryCorpus = SEED_CORPUS): string {
  const items = libraryQuery({ limit: 1000 }, corpus, { producerStep: 'R1' }).items;
  return bibtexOf(items.map((it) => it.ref));
}

/* -------------------------------------------------------------------------- */
/* 健康探针 / 预检 / 消息 / 导出                                                */
/* -------------------------------------------------------------------------- */

/** GET /api/health 原始响应（routes/health.ts）：无 model / issues 字段 */
export const HEALTH_OK = {
  status: 'ok',
  service: 'paper-agent-bff',
  version: '2.5.0',
  root: 'C:/paper-agent',
  runs_dir: 'C:/paper-agent/runs',
  tasks: SEED_TASKS.length,
  agh: {
    connected: true,
    agnes_version: 'agnes-3.0-flash',
    socket: '\\\\.\\pipe\\agnes-daemon',
    sessions_open: SEED_TASKS.length,
    error: undefined,
  },
  runs_dir_ok: true,
  runs_dir_error: undefined,
} as const;

/** AGH 断连时的降级探针（健康卡 blocked 态回归用） */
export const HEALTH_AGH_DOWN = {
  ...HEALTH_OK,
  status: 'degraded',
  agh: {
    connected: false,
    agnes_version: 'agnes-3.0-flash',
    socket: '\\\\.\\pipe\\agnes-daemon',
    sessions_open: 0,
    error: 'daemon socket not found',
  },
} as const;

/** POST /tasks 的 preflight.sources（services/preflight.ts probeSources：Record<string,string>） */
export const PREFLIGHT_SOURCES: Record<string, string> = {
  arxiv: 'ok',
  crossref: 'ok',
  openalex: 'ok',
  semantic_scholar: 'unavailable:429',
  local: 'ok',
};

/** 统一错误体（infra/errors.ts errorBody：恰好 error/code 两个字段） */
export function errorBody(code: string, message: string, action?: string) {
  return { error: action ? `${message}（${action}）` : message, code };
}

/** GET /tasks/{id}/messages 初始状态（services/message.ts list） */
export interface SeedMessageEntry {
  turn_id: string;
  task_id: string;
  action: 'ask' | 'revise';
  role: 'user' | 'assistant';
  text: string;
  order: number;
  queued_at: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'deleted';
}

/** 固态电解质任务带一轮已完成的追问（刷新后恢复历史用） */
export const MESSAGE_HISTORY: Record<string, SeedMessageEntry[]> = {
  [TASK_IDS.solid]: [
    {
      turn_id: 'turn-1',
      task_id: TASK_IDS.solid,
      action: 'ask',
      role: 'user',
      text: '请补充近两年的最新进展。',
      order: 1,
      queued_at: '2026-10-09T11:02:00.000Z',
      status: 'done',
    },
    {
      turn_id: 'turn-1',
      task_id: TASK_IDS.solid,
      action: 'ask',
      role: 'assistant',
      text: '近两年进展集中在原位 (S)TEM 与 DRT 拟合自动化方向 [EV-0004, EV-0002]；晶界活化能报道区间仍为 0.4–0.9 eV [EV-0008]。',
      order: 2,
      queued_at: '2026-10-09T11:02:20.000Z',
      status: 'done',
    },
  ],
};

/** GET /tasks/{id}/cite?ev= 成功响应（services/report.ts toCitation） */
export interface CiteLookupDone {
  found: true;
  evidence: RawEvidence;
}
export interface CiteLookupMiss {
  found: false;
  reason: string;
}
export type CiteLookup = CiteLookupDone | CiteLookupMiss;

export function citationOf(ev: RawEvidence) {
  return {
    found: true,
    citation: {
      ev_id: ev.ev_id,
      tier: ev.tier,
      kind: ev.kind,
      title: ev.title,
      producer_step: ev.producer_step,
      doi: ev.doi,
      authors: ev.authors,
      year: ev.year,
      venue: ev.venue,
      source: ev.source,
      file: null,
      sha256: ev.sha256,
      chain_hash: ev.chain_hash,
      seq: 1,
      at: ev.at,
    },
  };
}

/** 在账本里按 ev_id 或 ≥6 位十六进制哈希前缀找证据（后端 cite() 同口径） */
export function lookupEvidenceIn(all: RawEvidence[], rawEv: string): CiteLookup {
  const ev = rawEv.trim();
  if (ev === '') return { found: false, reason: '缺少查询参数 ev（证据编号如 EV-0001，或 ≥6 位哈希前缀）' };
  const byId = all.find((e) => e.ev_id === ev);
  if (byId) return { found: true, evidence: byId };
  if (/^[0-9a-fA-F]{6,64}$/.test(ev)) {
    const lower = ev.toLowerCase();
    const hit = all.find(
      (e) =>
        (e.sha256 ?? '').toLowerCase().startsWith(lower) ||
        (e.chain_hash ?? '').toLowerCase().startsWith(lower),
    );
    if (hit) return { found: true, evidence: hit };
    return { found: false, reason: `未找到哈希前缀匹配的证据（${ev}…）` };
  }
  return { found: false, reason: `未找到证据 ${ev}（请使用 EV-#### 编号或 ≥6 位哈希前缀）` };
}

export function lookupEvidence(taskId: string, rawEv: string): CiteLookup {
  return lookupEvidenceIn(EVIDENCE_BY_TASK[taskId] ?? [], rawEv);
}

export function citeFound(taskId: string, evId: string) {
  const hit = lookupEvidence(taskId, evId);
  if (!hit.found) throw new Error(`fixtures: ${taskId} 无证据 ${evId}`);
  return citationOf(hit.evidence);
}

/** GET /tasks/{id}/cite 未命中响应（含可用编号提示） */
export function citeNotFound(taskId: string, ev: string) {
  return {
    found: false,
    reason: `未找到证据 ${ev}（请使用 EV-#### 编号或 ≥6 位哈希前缀）`,
    available: (EVIDENCE_BY_TASK[taskId] ?? []).slice(0, 20).map((e) => e.ev_id),
  };
}

/** 审计包导出内容清单（export/service.ts：run/ 前缀产物 + verify.py + manifest.json） */
export const AUDIT_EXPORT_CONTENTS = [
  'run/report.md',
  'run/ledger.jsonl',
  'run/state.json',
  'run/report_gate.json',
  'run/events.json',
  'run/conclusions.json',
  'verify.py',
  'manifest.json',
] as const;

/** 报告 Markdown 直下（GET /tasks/{id}/report.md；未就绪 404 NO_REPORT） */
export function reportMarkdownOf(report: RawReport): string {
  const lines: string[] = [`# ${report.title}`, '', report.abstract, ''];
  for (const s of report.sections) {
    lines.push(`## ${s.title}`, '', s.body, '');
  }
  lines.push('## 结论', '');
  report.conclusions.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.text}（证据：${c.evidence_ids.join(', ')}）`);
  });
  if (report.degraded_statement) {
    lines.push('', '## 降级声明', '', report.degraded_statement);
  }
  return `${lines.join('\n')}\n`;
}

export function reportMarkdown(taskId: string): string | null {
  const report = REPORTS[taskId];
  return report ? reportMarkdownOf(report) : null;
}

/**
 * 会话轨迹导出内容（export/service.ts session）。
 * 前端不传 format → 后端默认 agnes：文件名 {task_id}-session.jsonl、清单项 session.agnes。
 */
export const SESSION_EXPORT_CONTENTS = ['session.agnes'] as const;
