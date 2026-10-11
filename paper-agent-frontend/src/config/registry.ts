import type { SourceName, WorkflowName } from '@/api/types';

/**
 * 工作流与数据源登记表（§12 配置驱动）：
 * 步骤链与来源都是数据，新增工作流/来源只需在此登记，渲染层不改。
 */
export interface WorkflowDef {
  name: WorkflowName;
  label: string;
  description: string;
  steps: { id: string; label: string }[];
  defaultSources: SourceName[];
  outputNote: string;
}

export const WORKFLOWS: Record<WorkflowName, WorkflowDef> = {
  research: {
    name: 'research',
    label: '科研综述（默认）',
    description: '检索 → 精读 → 分析 → 核验 → 写作 → 自评审，产出结论可溯源的综述报告。',
    steps: [
      { id: 'R1', label: '多源检索近五年相关文献' },
      { id: 'R2', label: '精读高相关论文，提取原理与关键参数' },
      { id: 'R3', label: '拆解脉络，建立统一对比维度' },
      { id: 'R4', label: '核验引用与数据一致性，标注矛盾' },
      { id: 'R5', label: '整合对比表，撰写综述与结论' },
      { id: 'R6', label: '自评审：证据绑定与复现校验' },
    ],
    defaultSources: ['arxiv', 'crossref', 'openalex', 'semantic_scholar'],
    outputNote: '结构化综述报告 + 证据清单 + 审计包',
  },
  materials: {
    name: 'materials',
    label: '材料体系分析',
    description: '面向具体材料体系：配方—工艺—性能关联分析，输出可比对的方案矩阵。',
    steps: [
      { id: 'P1', label: '界定材料体系与性能指标' },
      { id: 'P2', label: '检索配方—工艺—性能数据' },
      { id: 'P3', label: '建立性能对比矩阵' },
      { id: 'P4', label: '一致性核验与异常标注' },
      { id: 'P5', label: '撰写方案建议与结论' },
    ],
    defaultSources: ['arxiv', 'openalex', 'semantic_scholar', 'local'],
    outputNote: '方案对比报告 + 数据证据 + 审计包',
  },
};

export const WORKFLOW_ORDER: WorkflowName[] = ['research', 'materials'];

export interface SourceDef {
  name: SourceName;
  label: string;
  kind: string;
  note: string;
  /** 离线/本地来源不联网，因此主动选择时不得判为降级（FE-06 验收） */
  offline?: boolean;
}

export const SOURCES: SourceDef[] = [
  {
    name: 'arxiv',
    label: 'arXiv 预印本',
    kind: '文献',
    note: '快速更新的预印本，适合追踪最新方法。',
  },
  {
    name: 'crossref',
    label: 'Crossref 正式出版',
    kind: '文献',
    note: 'DOI 与元数据权威，用于引用核验。',
  },
  {
    name: 'openalex',
    label: 'OpenAlex 开放学术',
    kind: '文献',
    note: '覆盖面广，用于补充引用与主题聚类。',
  },
  {
    name: 'semantic_scholar',
    label: 'Semantic Scholar',
    kind: '文献',
    note: '语义检索较强，但有速率限制，繁忙时可能不可用。',
  },
  {
    name: 'local',
    label: '本地语料库',
    kind: '离线',
    note: '断网可用；主动选择时按离线来源执行，不判为降级。',
    offline: true,
  },
];

export const SOURCE_BY_NAME: Record<string, SourceDef> = Object.fromEntries(
  SOURCES.map((s) => [s.name, s]),
);

export const EXAMPLE_QUESTIONS: { title: string; note: string; value: string }[] = [
  {
    title: '固态电解质界面阻抗表征方法综述',
    note: '多源检索 · 方法对比 · 结论溯源',
    value:
      '固态电解质界面阻抗的主要表征方法有哪些？请检索近五年文献，给出方法对比与结论。',
  },
  {
    title: '钙钛矿缺陷钝化策略对比',
    note: '文献精读 · 定量比较',
    value: '钙钛矿太阳能电池缺陷钝化有哪些主流策略？请比较其效率与稳定性提升。',
  },
  {
    title: '锂金属枝晶抑制进展',
    note: '机理拆解 · 综述写作',
    value: '锂金属负极枝晶的形成机理与抑制手段有哪些？请整理近五年进展。',
  },
];
