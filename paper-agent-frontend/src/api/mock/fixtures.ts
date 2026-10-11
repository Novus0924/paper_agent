import type {
  ActivityEvent,
  Conclusion,
  ConclusionEvent,
  DegradedEvent,
  DoneEvent,
  EvidenceItem,
  EvidenceKind,
  EvidenceTier,
  LibraryRef,
  MessageEvent,
  Report,
  ReportEvent,
  SourceName,
  SourcePreflight,
  StepEvent,
  ToolEvent,
  WorkflowName,
} from '../types';
import { SOURCE_BY_NAME, SOURCES } from '@/config/registry';
export {
  EXAMPLE_QUESTIONS,
  SOURCES,
  SOURCE_BY_NAME,
  WORKFLOWS,
  WORKFLOW_ORDER,
} from '@/config/registry';
export type { SourceDef, WorkflowDef } from '@/config/registry';

/* ==========================================================================
   Mock 数据资产（FE-12）：字段结构与后端 DTO 完全一致，禁止自创字段。
   工作流 / 步骤链 / 数据源 / 示例问题登记在 @/config/registry（§12 配置驱动）。
   ========================================================================== */

/** 预检结果：semantic_scholar 在演示数据里模拟 429 限流（不构成降级） */
export function mockPreflight(sources: SourceName[]): SourcePreflight[] {
  return sources.map((name) => {
    if (name === 'semantic_scholar') {
      return { source: name, ok: false, detail: 'unavailable:429', latency_ms: 1240 };
    }
    const base = SOURCE_BY_NAME[name];
    return {
      source: name,
      ok: true,
      detail: 'ok',
      latency_ms: base?.offline ? 12 : 180 + Math.round((name.length % 7) * 40),
    };
  });
}

/* ---------------- 证据与报告（research） ---------------- */

const RESEARCH_EVIDENCE: EvidenceItem[] = [
  {
    ev_id: 'EV-0001',
    tier: 'fact',
    kind: 'literature',
    title: '固态电解质界面阻抗 EIS 建模综述',
    ref: '10.1039/d2ee01234a',
    producer_step: 'R1',
    year: '2022',
    authors: 'N. Kumar 等',
    summary: '归纳电极/电解质界面与晶界阻抗的 EIS 等效电路建模路线。',
    sha256: 'a1f4c2e77b9d4c6f0a3b5d1e9c2f4a71b0d3e6f9a2c5d8e1b4f7a0c3d6e9f2a5',
    chain_hash: '9c31f7a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0a3f6d9e2b5c8f1a4d7e0c3f6',
    cite_no: 1,
  },
  {
    ev_id: 'EV-0002',
    tier: 'fact',
    kind: 'literature',
    title: '分布弛豫时间（DRT）在电化学阻抗中的应用',
    ref: '10.1016/j.jpowsour.2023.233111',
    producer_step: 'R1',
    year: '2023',
    authors: 'L. Rossi 等',
    summary: '以 DRT 分离重叠弧段，降低等效电路拟合的多解性。',
    sha256: '7b2e5d8a1c4f7a0d3e6b9c2f5a8d1e4b7c0a3f6d9e2b5c8f1a4d7e0c3b6f9a2d5',
    chain_hash: 'e7a1c4f7b0d3e6a9c2f5b8d1e4a7c0f3d6b9e2c5f8a1d4e7c0b3f6a9d2e5c8f1',
    cite_no: 2,
  },
  {
    ev_id: 'EV-0003',
    tier: 'fact',
    kind: 'literature',
    title: '变温阻抗谱分离晶界与体相贡献',
    ref: '10.1021/acs.chemmater.1b01023',
    producer_step: 'R2',
    year: '2021',
    authors: 'M. Tanaka 等',
    summary: 'Arrhenius 关系提取活化能，晶界活化能报道区间 0.4–0.9 eV。',
    sha256: '3c6f9a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0a3f6d9e2b5c8f1a4d7e0c3f6a9',
    chain_hash: 'b2d5f8a1c4e7f0b3d6a9c2f5e8b1c4d7f0a3c6e9b2d5f8a1c4e7b0d3f6a9c2e5',
    cite_no: 3,
  },
  {
    ev_id: 'EV-0004',
    tier: 'fact',
    kind: 'literature',
    title: '原位 (S)TEM 观测固态界面演化',
    ref: '10.1038/s41560-024-01567-8',
    producer_step: 'R2',
    year: '2024',
    authors: 'S. Weber 等',
    summary: '纳米尺度界面形貌与元素分布，含偏压下的原位观测。',
    sha256: 'f1a4d7e0c3f6a9d2e5b8c1f4a7d0e3b6f9c2a5d8e1f4b7c0d3e6f9a2c5d8b1e4',
    chain_hash: 'd3e6a9c2f5b8e1c4d7a0f3e6b9c2d5a8f1e4b7c0d3a6f9e2c5b8d1f4a7c0e3b6',
    cite_no: 4,
  },
  {
    ev_id: 'EV-0005',
    tier: 'fact',
    kind: 'literature',
    title: '原位 XPS 研究界面化学态与空间电荷层',
    ref: '10.1149/1945-7111/ac5b7d',
    producer_step: 'R2',
    year: '2022',
    authors: 'J. Park 等',
    summary: '界面化学态深度剖析，指出制样与真空环境带来的偏差。',
    sha256: 'e2b5c8f1a4d7e0c3b6f9a2d5c8e1f4b7a0c3d6e9f2b5c8a1d4e7f0b3c6d9e2f5',
    chain_hash: 'a5d8e1b4f7c0d3a6e9f2b5c8d1e4a7f0c3b6e9d2f5a8c1e4b7d0f3a6c9e2b5',
    cite_no: 5,
  },
  {
    ev_id: 'EV-0006',
    tier: 'fact',
    kind: 'literature',
    title: 'FIB-SEM 三维量化界面接触面积',
    ref: '10.1016/j.matchar.2025.111222',
    producer_step: 'R3',
    year: '2025',
    authors: 'H. Zhang 等',
    summary: '三维重构给出孔隙率与真实接触面积分布。',
    sha256: 'c1d4f7a0c3e6b9f2a5d8c1e4b7f0c3a6d9e2f5b8c1a4d7e0f3b6c9d2e5f8a1b4',
    chain_hash: 'f8a1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7f0a3c6e9b2d5f8',
    cite_no: 6,
  },
  {
    ev_id: 'EV-0007',
    tier: 'artifact',
    kind: 'data',
    title: '方法—原理—可测界面—优劣势对照表（v3）',
    ref: 'artifacts/R3/method_matrix_v3.csv',
    producer_step: 'R3',
    summary: '由 23 篇去重文献抽取的六类方法对照矩阵。',
    sha256: '9a2f5c8b1e4d7a0c3f6b9e2d5a8c1f4b7e0d3a6f9c2b5e8d1a4f7c0b3e6d9a2',
    chain_hash: '1c4e7a0d3f6c9b2e5a8d1f4c7e0b3d6a9f2c5e8b1d4a7f0c3e6b9d2a5f8c1',
  },
  {
    ev_id: 'EV-0008',
    tier: 'artifact',
    kind: 'analysis',
    title: '晶界活化能分歧的区间统计',
    ref: 'artifacts/R4/gb_activation_band.json',
    producer_step: 'R4',
    summary: '按体系分组给出 as-reported 区间，避免跨体系直接比较。',
    sha256: '5d8e1f4b7a0c3f6d9e2b5c8a1d4f7e0b3e6c9a2d5f8e1b4c7d0e3a6f9b2d5c8',
    chain_hash: '7e0b3d6a9f2c5e8b1d4a7f0c3e6b9d2a5f8c1e4b7d0a3f6c9e2b5d8a1f4c7',
  },
  {
    ev_id: 'EV-0009',
    tier: 'artifact',
    kind: 'note',
    title: '术语界定笔记：空间电荷层 / SEI / 晶界阻抗',
    ref: 'artifacts/R1/glossary.md',
    producer_step: 'R1',
    summary: '统一检索同义词，避免漏检与误并。',
    sha256: '2f5a8d1e4b7c0f3a6e9d2c5f8b1e4a7d0c3f6b9e2d5a8c1f4e7b0d3a6f9c2',
  },
  {
    ev_id: 'EV-0010',
    tier: 'fact',
    kind: 'factcheck',
    title: '引用核验结果：12 条 DOI 全部有效',
    ref: 'artifacts/R4/citation_check.json',
    producer_step: 'R4',
    summary: '逐条回查 DOI、年份与作者，标记 1 处数值分歧。',
    sha256: '8b1e4a7d0c3f6b9e2d5a8c1f4e7b0d3a6f9c2e5b8d1a4f7c0e3b6d9a2f5c8',
    chain_hash: '4a7d0c3f6b9e2d5a8c1f4e7b0d3a6f9c2e5b8d1a4f7c0e3b6d9a2f5c8e1b4',
  },
  {
    ev_id: 'EV-0011',
    tier: 'artifact',
    kind: 'draft',
    title: '综述草稿（第 2 版）',
    ref: 'artifacts/R5/report_draft_v2.md',
    producer_step: 'R5',
    summary: '含对比矩阵与结论初稿，供自评审使用。',
    sha256: '6c9f2e5b8d1a4f7c0e3b6d9a2f5c8e1b4a7d0f3e6c9b2d5a8f1e4c7b0d3a6',
  },
  {
    ev_id: 'EV-0012',
    tier: 'fact',
    kind: 'review',
    title: '自评审与复现校验结论',
    ref: 'artifacts/R6/self_review.json',
    producer_step: 'R6',
    summary: '证据绑定 100%、哈希链完整、复现校验 PASS。',
    sha256: '0e3b6d9a2f5c8e1b4a7d0f3e6c9b2d5a8f1e4c7b0d3a6f9c2e5b8d1a4f7c0',
    chain_hash: '3b6d9a2f5c8e1b4a7d0f3e6c9b2d5a8f1e4c7b0d3a6f9c2e5b8d1a4f7c0e3',
  },
];

const RESEARCH_CONCLUSIONS: Conclusion[] = [
  {
    cid: 'C-0001',
    text: 'EIS 是基础且不可替代的定量手段，须以物理约束等效电路或 DRT 降低拟合多解性。',
    evidence_ids: ['EV-0001', 'EV-0002', 'EV-0010'],
    cite_no: 1,
  },
  {
    cid: 'C-0002',
    text: '晶界与电极界面阻抗的可靠分离依赖变温 EIS 与显微/化学手段交叉验证，单一方法不足。',
    evidence_ids: ['EV-0003', 'EV-0004', 'EV-0005'],
    cite_no: 3,
  },
  {
    cid: 'C-0003',
    text: '原位与三维成像为高置信趋势，但制样与环境差异是主要误差来源。',
    evidence_ids: ['EV-0004', 'EV-0006'],
    cite_no: 4,
  },
  {
    cid: 'C-0004',
    text: '当前主要缺口是跨尺度、多手段联合标定与自动化、可复现的分析流程。',
    evidence_ids: ['EV-0007', 'EV-0008', 'EV-0012'],
    cite_no: 2,
  },
];

const RESEARCH_SECTIONS: Report['sections'] = [
  {
    id: 'background',
    title: '一、研究背景',
    body: '固态电池的界面阻抗直接决定倍率与循环性能。文献中的"界面阻抗"可能指空间电荷层、界面相（SEI）或晶界阻抗，因此需要先界定术语，再按界面类型匹配表征手段。\n\n本报告覆盖 **电极/电解质界面** 与 **晶界（颗粒间）界面** 两类高阻界面，检索窗口为 2021–2026 年。',
  },
  {
    // 与 live 模式同形（内核 report.assemble 新增章节）：研究问题（goal + 关键要素拆解 + 检索查询）
    id: 'research_question',
    title: '二、研究问题',
    body: '研究目标：检索并综述固态电解质界面阻抗的表征方法\n\n目标关键要素（确定性分词，英文取词、中文取 2-gram）：固态、电解、解质、界面、阻抗、表征、方法\n\n检索使用查询：solid-state electrolyte interface impedance characterization',
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
    // 与 live 模式同形：对研究问题的回答（模型综合生成，非确定性内容，已绑定证据清单）
    id: 'answer',
    title: '六、对研究问题的回答（模型综合生成）',
    body:
      '固态电解质界面阻抗的表征以电化学阻抗谱（EIS）为核心手段 [EV-0001]，配合等效电路拟合与 DRT 分析可区分电极/电解质界面与晶界贡献 [EV-0002]。变温 EIS 通过 Arrhenius 关系提取活化能，可分离体相与晶界阻抗 [EV-0003]。\n\n'
      + '对界面化学态与形貌，XPS（含原位）与 (S)TEM 互补：前者给出空间电荷层与界面相的化学信息 [EV-0005]，后者提供纳米尺度形貌与元素分布 [EV-0004]。FIB-SEM 三维成像可定量接触面积与孔隙分布 [EV-0006]。\n\n'
      + '> ⚠️ 本节为**模型综合生成**（非确定性内容），已绑定证据清单：EV-0001、EV-0002、EV-0003、EV-0004、EV-0005、EV-0006。该内容为 artifact 级产物，不进入确定性结论，也不参与门禁的 fact 绑定校验。',
  },
  {
    id: 'limits',
    title: '七、关键争议与研究缺口',
    body: '晶界活化能在不同体系中报道为约 **0.4–0.9 eV**，存在明显分歧；本报告按 as-reported 标注，不做跨体系直接比较（EV-0008）。\n\n主要缺口：跨尺度、多手段联合标定，以及基于 DRT/机器学习的可复现拟合流程。',
  },
];

export const RESEARCH_REPORT: Report = {
  task_id: 'seed',
  title: '固态电解质界面阻抗表征方法研究综述（2021–2026）',
  abstract:
    '固态电解质的高阻抗界面主要来自电极/电解质界面与晶界（颗粒间）界面两类。本报告基于近五年文献，按原理归纳六类表征方法，建立"原理—可测界面—优势—局限"对比矩阵，并给出方法选择与组合验证建议。',
  sections: RESEARCH_SECTIONS,
  conclusions: RESEARCH_CONCLUSIONS,
  verdict: {
    passed: true,
    text: '12 条引用 DOI 有效（真实运行）；4 条结论 100% 绑定 fact 级证据；账本哈希链完整；复现校验 PASS。Semantic Scholar 429 已跳过、其余来源覆盖充足，未降级。',
  },
  meta: {
    model: 'Agnes · Flash',
    evidence_count: RESEARCH_EVIDENCE.length,
    citation_count: 12,
  },
};

/* ---------------- 证据与报告（materials，演示真实降级） ---------------- */

const MATERIALS_EVIDENCE: EvidenceItem[] = [
  {
    ev_id: 'EV-0001',
    tier: 'fact',
    kind: 'literature',
    title: '钙钛矿薄膜缺陷钝化策略综述',
    ref: '10.1038/s41578-023-00601-x',
    producer_step: 'P2',
    year: '2023',
    authors: 'A. Khan 等',
    summary: '按缺陷类型归纳铵盐/卤素/聚合物钝化路径。',
    sha256: 'b4d7f0a3c6e9f2b5d8a1c4e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e',
    chain_hash: 'e9f2b5d8a1c4e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6',
    cite_no: 1,
  },
  {
    ev_id: 'EV-0002',
    tier: 'fact',
    kind: 'literature',
    title: '2D/3D 异质结构钝化对稳定性的影响',
    ref: '10.1126/science.adf1234',
    producer_step: 'P2',
    year: '2024',
    authors: 'Y. Liu 等',
    summary: '给出效率增益与湿热老化 1000h 保留率数据。',
    sha256: 'c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6a',
    chain_hash: 'a1c4e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8',
    cite_no: 2,
  },
  {
    ev_id: 'EV-0003',
    tier: 'fact',
    kind: 'literature',
    title: '卤素空位钝化的界面复合动力学',
    ref: '10.1021/acsnano.3c04567',
    producer_step: 'P2',
    year: '2022',
    authors: 'P. Novak 等',
    summary: 'TRPL 与阻抗联合分析界面复合寿命变化。',
    sha256: 'd8a1c4e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8a',
    chain_hash: 'b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8a1b4d7f0',
    cite_no: 3,
  },
  {
    ev_id: 'EV-0004',
    tier: 'artifact',
    kind: 'data',
    title: '配方—工艺—性能矩阵（本地语料）',
    ref: 'artifacts/P3/matrix_local.csv',
    producer_step: 'P3',
    summary: '因外部来源受限，改由本地语料与已复现数据集补齐 27 组配方。',
    sha256: 'f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8a1b4d7f0a',
  },
  {
    ev_id: 'EV-0005',
    tier: 'fact',
    kind: 'factcheck',
    title: '效率数值一致性核验',
    ref: 'artifacts/P4/consistency.json',
    producer_step: 'P4',
    summary: '6 处报告效率与原文相差 >0.5%，已按原文回退标注。',
    sha256: 'a3c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3',
    chain_hash: 'c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9',
  },
  {
    ev_id: 'EV-0006',
    tier: 'artifact',
    kind: 'analysis',
    title: '钝化策略收益—成本排序',
    ref: 'artifacts/P5/ranking.json',
    producer_step: 'P5',
    summary: '按效率增益/工艺复杂度/稳定性三轴排序。',
    sha256: 'e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8a1b4d7',
  },
  {
    ev_id: 'EV-0007',
    tier: 'artifact',
    kind: 'note',
    title: '降级说明：来源切换记录',
    ref: 'artifacts/P2/degradation.md',
    producer_step: 'P2',
    summary: 'Semantic Scholar 429 → 切换 OpenAlex 与本地语料，覆盖度由 92% 降至 78%。',
    sha256: '9c2e5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2',
  },
  {
    ev_id: 'EV-0008',
    tier: 'fact',
    kind: 'review',
    title: '自评审结论',
    ref: 'artifacts/P5/review.json',
    producer_step: 'P5',
    summary: '结论与证据绑定完整；已标注降级影响范围。',
    sha256: 'd5f8a1b4d7f0a3c6e9b2d5f8a1c4e7f0b3d6a9c2e5f8a1b4d7f0a3c6e9b2d5',
  },
];

const MATERIALS_CONCLUSIONS: Conclusion[] = [
  {
    cid: 'C-0001',
    text: '2D/3D 异质结构钝化在效率与湿热稳定性上收益最均衡，但工艺窗口最窄。',
    evidence_ids: ['EV-0002', 'EV-0006'],
    cite_no: 2,
  },
  {
    cid: 'C-0002',
    text: '卤素空位钝化主要改善界面复合，对长期稳定性的贡献需与封装方案合并评估。',
    evidence_ids: ['EV-0003', 'EV-0005'],
    cite_no: 3,
  },
  {
    cid: 'C-0003',
    text: '本次覆盖度受来源切换影响（78%），排序结论应在来源恢复后复核。',
    evidence_ids: ['EV-0007', 'EV-0008'],
    cite_no: 1,
  },
];

export const MATERIALS_REPORT: Report = {
  task_id: 'seed',
  title: '钙钛矿薄膜缺陷钝化策略对比与方案建议',
  abstract:
    '围绕钙钛矿太阳能电池的体相与界面缺陷，比较铵盐、卤素与聚合物三类钝化路径在效率增益、工艺复杂度与湿热稳定性上的表现，给出可执行的方案排序。',
  sections: [
    {
      id: 'S1',
      title: '一、体系界定与性能指标',
      body: '指标固定为：认证效率、Voc 损失、85 °C/85% RH 老化 1000 h 的 T80 保留率、工艺步骤数。所有数据按 as-reported 记录并标注测量条件。',
    },
    {
      id: 'S2',
      title: '二、方法与过程',
      body: '检索窗口 2021–2026，来源为 arXiv、OpenAlex 与本地语料库。因外部来源受限（见降级声明），配方—工艺—性能矩阵由本地语料与已复现数据集补齐 27 组配方。',
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
  ],
  conclusions: MATERIALS_CONCLUSIONS,
  degraded_statement:
    '本次执行发生一次降级：P2 阶段 Semantic Scholar 返回 429 且重试无效，系统切换至 OpenAlex 与本地语料库继续执行，任务未中断；文献覆盖度由约 92% 降至约 78%，排序结论的普适性受影响（EV-0007）。',
  verdict: {
    passed: true,
    text: '3 条结论均绑定 fact 级证据；6 处效率数值已按原文回退；哈希链完整。存在 1 次来源切换降级，已在报告中声明影响范围。',
  },
  meta: {
    model: 'Agnes · Flash',
    evidence_count: MATERIALS_EVIDENCE.length,
    citation_count: 6,
  },
};

export interface Dataset {
  report: Report;
  evidence: EvidenceItem[];
  conclusions: Conclusion[];
}

export function datasetFor(workflow: WorkflowName): Dataset {
  if (workflow === 'materials') {
    return {
      report: MATERIALS_REPORT,
      evidence: MATERIALS_EVIDENCE,
      conclusions: MATERIALS_CONCLUSIONS,
    };
  }
  return {
    report: RESEARCH_REPORT,
    evidence: RESEARCH_EVIDENCE,
    conclusions: RESEARCH_CONCLUSIONS,
  };
}

/* ---------------- 文献库（跨任务证据汇总） ---------------- */

/**
 * 文献库演示种子：3 个任务、23 条证据。
 * 刻意覆盖：同一 DOI 被多个任务/同一任务多次检索到（跨任务 + 同任务去重演示）、
 * fact/artifact 两级、literature/data/analysis/note/factcheck/draft/review/synthesis 八类、五种检索来源。
 * synthesis 是内核 S1「综合回答」产物（tier=artifact、无 DOI），与 live 同形——缺它就会漏测
 * "新增 kind 未登记文案 → t(undefined) 崩溃" 这一类问题。
 * task.goal 与运行时种子任务的 goal 逐字一致，便于把 task_id 映射回真实任务，跳转报告可落地。
 */
export interface LibrarySeedTask {
  key: string;
  goal: string;
}

export interface LibrarySeedItem {
  task_key: string;
  tier: EvidenceTier;
  kind: EvidenceKind;
  title: string;
  ref: LibraryRef;
  producer_step: string;
}

export const LIBRARY_SEED_TASKS: LibrarySeedTask[] = [
  {
    key: 'solid-electrolyte',
    goal: '固态电解质界面阻抗的主要表征方法有哪些？请检索近五年文献，给出方法对比与结论。',
  },
  {
    key: 'perovskite',
    goal: '钙钛矿太阳能电池缺陷钝化有哪些主流策略？请比较其效率与稳定性提升。',
  },
  {
    key: 'hard-carbon',
    goal: '钠离子电池硬碳负极孔径调控对首次库伦效率的影响有哪些结论？',
  },
];

/** 文献书目块：同一篇论文在不同任务里共享同一 DOI 与题录，是去重的依据 */
function lit(
  doi: string,
  title: string,
  authors: string,
  year: string,
  venue: string,
  source: string,
): LibraryRef {
  return { doi, title, authors, year, venue, source };
}

/** 非文献证据（产物）：无 DOI，去重时按条独立，不参与合并 */
function artifact(title: string, source = 'local'): LibraryRef {
  return { doi: '', title, authors: '', year: '', venue: '', source };
}

export const LIBRARY_SEED_EVIDENCE: LibrarySeedItem[] = [
  // 任务 A —— 固态电解质界面阻抗（research）
  {
    task_key: 'solid-electrolyte',
    tier: 'fact',
    kind: 'literature',
    title: '固态电解质界面阻抗 EIS 建模综述',
    ref: lit(
      '10.1039/d2ee01234a',
      '固态电解质界面阻抗 EIS 建模综述',
      'N. Kumar 等',
      '2022',
      'Energy & Environmental Science',
      'crossref',
    ),
    producer_step: 'R1',
  },
  {
    task_key: 'solid-electrolyte',
    tier: 'fact',
    kind: 'literature',
    title: '分布弛豫时间（DRT）在电化学阻抗中的应用',
    ref: lit(
      '10.1016/j.jpowsour.2023.233111',
      '分布弛豫时间（DRT）在电化学阻抗中的应用',
      'L. Rossi 等',
      '2023',
      'Journal of Power Sources',
      'crossref',
    ),
    producer_step: 'R1',
  },
  {
    task_key: 'solid-electrolyte',
    tier: 'fact',
    kind: 'literature',
    title: '变温阻抗谱分离晶界与体相贡献',
    ref: lit(
      '10.1021/acs.chemmater.1b01023',
      '变温阻抗谱分离晶界与体相贡献',
      'M. Tanaka 等',
      '2021',
      'Chemistry of Materials',
      'crossref',
    ),
    producer_step: 'R2',
  },
  {
    task_key: 'solid-electrolyte',
    tier: 'fact',
    kind: 'literature',
    title: '原位 (S)TEM 观测固态界面演化',
    ref: lit(
      '10.1038/s41560-024-01567-8',
      '原位 (S)TEM 观测固态界面演化',
      'S. Weber 等',
      '2024',
      'Nature Energy',
      'openalex',
    ),
    producer_step: 'R2',
  },
  {
    task_key: 'solid-electrolyte',
    tier: 'artifact',
    kind: 'data',
    title: '方法—原理—可测界面—优劣势对照表（v3）',
    ref: artifact('方法对照矩阵 v3'),
    producer_step: 'R3',
  },
  {
    task_key: 'solid-electrolyte',
    tier: 'artifact',
    kind: 'analysis',
    title: '晶界活化能分歧的区间统计',
    ref: artifact('晶界活化能区间统计'),
    producer_step: 'R4',
  },
  {
    task_key: 'solid-electrolyte',
    tier: 'fact',
    kind: 'factcheck',
    title: '引用核验结果：12 条 DOI 全部有效',
    ref: artifact('引用核验结果'),
    producer_step: 'R4',
  },
  {
    task_key: 'solid-electrolyte',
    tier: 'artifact',
    kind: 'draft',
    title: '综述草稿（第 2 版）',
    ref: artifact('综述草稿 v2'),
    producer_step: 'R5',
  },
  {
    task_key: 'solid-electrolyte',
    tier: 'fact',
    kind: 'review',
    title: '自评审与复现校验结论',
    ref: artifact('自评审结论'),
    producer_step: 'R6',
  },
  {
    // 内核 S1「综合回答」（kernel/sciret_kernel/ledger.py synthesize）：模型综合生成的 artifact，
    // tier=artifact、producer_step=S1、无 DOI（是产物而非论文，不参与 DOI 去重）。
    // 它是该任务组最后一条，排序后落到列表第 2 页——正是 QA 终验里翻页白屏的那一页。
    task_key: 'solid-electrolyte',
    tier: 'artifact',
    kind: 'synthesis',
    title: '综合回答：固态电解质界面阻抗表征方法总览',
    ref: artifact('综合回答（模型综合生成）'),
    producer_step: 'S1',
  },

  // 任务 B —— 钙钛矿缺陷钝化（materials）；首条借用了任务 A 的同一篇论文
  {
    task_key: 'perovskite',
    tier: 'fact',
    kind: 'literature',
    title: '固态电解质界面阻抗 EIS 建模综述',
    ref: lit(
      '10.1039/d2ee01234a',
      '固态电解质界面阻抗 EIS 建模综述',
      'N. Kumar 等',
      '2022',
      'Energy & Environmental Science',
      'semantic_scholar',
    ),
    producer_step: 'P2',
  },
  {
    task_key: 'perovskite',
    tier: 'fact',
    kind: 'literature',
    title: '钙钛矿太阳能电池缺陷钝化策略综述',
    ref: lit(
      '10.1038/s41578-023-00601-x',
      '钙钛矿太阳能电池缺陷钝化策略综述',
      'A. Müller 等',
      '2023',
      'Nature Reviews Materials',
      'openalex',
    ),
    producer_step: 'P2',
  },
  {
    // 同一任务、同一 DOI 的第二条：核验阶段（P4）从另一来源再次命中同一篇论文，
    // 去重开启时应与上面的 P2 条目合并为一条（duplicates_count=1）。
    task_key: 'perovskite',
    tier: 'fact',
    kind: 'literature',
    title: '钙钛矿太阳能电池缺陷钝化策略综述',
    ref: lit(
      '10.1038/s41578-023-00601-x',
      '钙钛矿太阳能电池缺陷钝化策略综述',
      'A. Müller 等',
      '2023',
      'Nature Reviews Materials',
      'crossref',
    ),
    producer_step: 'P4',
  },
  {
    task_key: 'perovskite',
    tier: 'fact',
    kind: 'literature',
    title: '分子钝化剂对钙钛矿界面缺陷的钝化机理',
    ref: lit(
      '10.1126/science.adf1234',
      '分子钝化剂对钙钛矿界面缺陷的钝化机理',
      'R. Chen 等',
      '2023',
      'Science',
      'crossref',
    ),
    producer_step: 'P2',
  },
  {
    task_key: 'perovskite',
    tier: 'artifact',
    kind: 'data',
    title: '钝化策略—效率—稳定性对照矩阵',
    ref: artifact('钝化策略对照矩阵'),
    producer_step: 'P3',
  },
  {
    task_key: 'perovskite',
    tier: 'fact',
    kind: 'factcheck',
    title: '效率与稳定性数据一致性核验',
    ref: artifact('数据一致性核验'),
    producer_step: 'P4',
  },
  {
    task_key: 'perovskite',
    tier: 'artifact',
    kind: 'analysis',
    title: '钝化策略排序与证据强度分级',
    ref: artifact('策略排序与分级'),
    producer_step: 'P5',
  },
  {
    task_key: 'perovskite',
    tier: 'fact',
    kind: 'review',
    title: '材料方案自评审与复现校验',
    ref: artifact('方案自评审'),
    producer_step: 'P5',
  },

  // 任务 C —— 硬碳负极孔径调控（research，运行中）
  {
    task_key: 'hard-carbon',
    tier: 'fact',
    kind: 'literature',
    title: '硬碳负极孔径分布与钠储存机理',
    ref: lit(
      '10.1038/s41560-023-04567-8',
      '硬碳负极孔径分布与钠储存机理',
      'K. Sato 等',
      '2023',
      'Nature Energy',
      'arxiv',
    ),
    producer_step: 'R1',
  },
  {
    task_key: 'hard-carbon',
    tier: 'fact',
    kind: 'literature',
    title: '首次库伦效率与比表面积的相关性研究',
    ref: lit(
      '10.1016/j.ensm.2024.103456',
      '首次库伦效率与比表面积的相关性研究',
      'P. Novak 等',
      '2024',
      'Energy Storage Materials',
      'crossref',
    ),
    producer_step: 'R1',
  },
  {
    task_key: 'hard-carbon',
    tier: 'fact',
    kind: 'literature',
    title: '分布弛豫时间（DRT）在电化学阻抗中的应用',
    ref: lit(
      '10.1016/j.jpowsour.2023.233111',
      '分布弛豫时间（DRT）在电化学阻抗中的应用',
      'L. Rossi 等',
      '2023',
      'Journal of Power Sources',
      'semantic_scholar',
    ),
    producer_step: 'R2',
  },
  {
    task_key: 'hard-carbon',
    tier: 'artifact',
    kind: 'note',
    title: '孔径调控术语与表征口径笔记',
    ref: artifact('术语与表征口径笔记'),
    producer_step: 'R1',
  },
  {
    task_key: 'hard-carbon',
    tier: 'fact',
    kind: 'literature',
    title: '固态电解质界面阻抗 EIS 建模综述',
    ref: lit(
      '10.1039/d2ee01234a',
      '固态电解质界面阻抗 EIS 建模综述',
      'N. Kumar 等',
      '2022',
      'Energy & Environmental Science',
      'semantic_scholar',
    ),
    producer_step: 'R2',
  },
];

/* ---------------- 事件脚本 ---------------- */

export type ScriptData =
  | StepEvent
  | ActivityEvent
  | ToolEvent
  | DegradedEvent
  | ConclusionEvent
  | MessageEvent
  | ReportEvent
  | DoneEvent;

export interface ScriptFrame {
  /** 距本次运行开始的毫秒偏移 */
  at: number;
  event: string;
  data: ScriptData;
  /** 多轮追问/修订产生的帧带 turnId，用于"立即发送"优先调度 */
  turnId?: string;
}

const j = (obj: unknown) => JSON.stringify(obj, null, 2);

/** 检索来源在演示脚本里的表现：命中数、状态与进度文案使用的简称 */
interface SearchRow {
  short: string;
  hits: number;
  status: 'ok' | 'skipped' | 'unavailable';
  note: string;
}

type SelectedRow = SearchRow & { name: SourceName };

const RESEARCH_ROWS: Record<SourceName, SearchRow> = {
  arxiv: { short: 'arXiv', hits: 8, status: 'ok', note: '8 篇' },
  crossref: { short: 'Crossref', hits: 15, status: 'ok', note: '15 篇' },
  openalex: { short: 'OpenAlex', hits: 15, status: 'ok', note: '15 篇' },
  semantic_scholar: {
    short: 'Semantic Scholar',
    hits: 0,
    status: 'skipped',
    note: '429 已跳过',
  },
  local: { short: '本地语料库', hits: 12, status: 'ok', note: '12 篇' },
};

const MATERIALS_ROWS: Record<SourceName, SearchRow> = {
  arxiv: { short: 'arXiv', hits: 5, status: 'ok', note: '5 篇' },
  crossref: { short: 'Crossref', hits: 4, status: 'ok', note: '4 篇' },
  openalex: { short: 'OpenAlex', hits: 10, status: 'ok', note: '10 篇' },
  semantic_scholar: {
    short: 'Semantic Scholar',
    hits: 0,
    status: 'unavailable',
    note: '重试后仍不可用',
  },
  local: { short: '本地语料库', hits: 4, status: 'ok', note: '27 组配方' },
};

/** 只保留本次任务实际选中的来源，顺序跟随登记表 */
function selectedRows(
  sources: SourceName[],
  rows: Record<SourceName, SearchRow>,
): SelectedRow[] {
  return SOURCES.map((s) => s.name)
    .filter((n) => sources.includes(n))
    .map((name) => ({ name, ...rows[name] }));
}

const statusList = (list: SelectedRow[]) =>
  list.map((r) => ({ source: r.name, status: r.status, note: r.note }));

/** 检索统计随所选来源收敛：可用来源命中数求和，去重与高相关按固定比例推出 */
function searchTotals(list: SelectedRow[], dedupRatio: number) {
  const hits = list.filter((r) => r.status === 'ok').reduce((sum, r) => sum + r.hits, 0);
  const deduped = Math.round(hits * dedupRatio);
  return { hits, deduped, high: Math.round(deduped * dedupRatio) };
}

const shortNames = (list: SelectedRow[]) =>
  list.filter((r) => r.status === 'ok').map((r) => r.short);

function researchScript(goal: string, sources: SourceName[]): ScriptFrame[] {
  const q = goal.length > 70 ? `${goal.slice(0, 70)}…` : goal;
  const f: ScriptFrame[] = [];
  const push = (at: number, event: string, data: ScriptData) =>
    f.push({ at, event, data });

  const rows = selectedRows(sources, RESEARCH_ROWS);
  const limited = rows.filter((r) => r.status !== 'ok');
  const okNames = shortNames(rows);
  const totals = searchTotals(rows, 0.61);

  // R1 多源检索
  push(200, 'step', { step: 'R1', status: 'RUNNING' });
  push(600, 'activity', {
    step: 'R1',
    human_message: '正在检索相关文献…',
    detail: `研究目标：${q}`,
    ts: '',
  });
  push(1400, 'tool', {
    step: 'R1',
    tool: 'sciret_search_literature',
    label: '多源文献检索',
    status: 'running',
    input: j({
      query: 'solid-state electrolyte interfacial impedance characterization',
      years: '2021-2026',
      sources: rows.map((r) => r.name),
    }),
  });
  push(3200, 'activity', {
    step: 'R1',
    human_message:
      okNames.length === 0
        ? '所选来源本次均未返回可用结果，正在复核检索条件与来源可用性…'
        : `${okNames.join('、')} 已返回结果，正在合并去重…`,
    ts: '',
  });
  // 可用性提示只针对本次计划内的来源（FE-06：未选中的来源不参与运行）
  if (rows.some((r) => r.name === 'semantic_scholar' && r.status !== 'ok')) {
    push(4200, 'degraded', {
      level: 'info',
      source: 'semantic_scholar',
      reason: '该来源返回 429（限流），系统自动跳过',
      impact: `其余 ${rows.length - 1} 个来源覆盖充足，结果不受影响，不构成降级`,
      resumable: true,
      step: 'R1',
      action: '跳过该来源',
    });
  }
  push(5000, 'tool', {
    step: 'R1',
    tool: 'sciret_search_literature',
    label: '多源文献检索',
    status: limited.length > 0 ? 'warn' : 'done',
    output: j({
      hits: totals.hits,
      deduped: totals.deduped,
      high_relevance: totals.high,
    }),
    sources_status: statusList(rows),
  });
  push(5400, 'step', { step: 'R1', status: 'DONE', elapsed_ms: 5200 });

  // R2 精读
  push(5800, 'step', { step: 'R2', status: 'RUNNING' });
  push(6100, 'activity', {
    step: 'R2',
    human_message: `正在精读 ${totals.high} 篇高相关论文，提取表征原理与关键参数…`,
    ts: '',
  });
  push(6800, 'tool', {
    step: 'R2',
    tool: 'sciret_read_papers',
    label: '论文精读',
    status: 'running',
    input: j({
      papers: totals.high,
      extract: ['method', 'interface_type', 'conditions', 'metrics'],
    }),
  });
  const ecuModels = Math.round((totals.high * 9) / 14);
  const inSitu = Math.round((totals.high * 5) / 14);
  push(9000, 'activity', {
    step: 'R2',
    human_message: `已抽取 ${ecuModels} 套等效电路模型与 ${inSitu} 类原位表征条件…`,
    ts: '',
  });
  push(9600, 'tool', {
    step: 'R2',
    tool: 'sciret_read_papers',
    label: '论文精读',
    status: 'done',
    output: j({
      ecu_models: ecuModels,
      in_situ_methods: inSitu,
      parameter_pairs: totals.deduped,
    }),
  });
  push(10200, 'step', { step: 'R2', status: 'DONE', elapsed_ms: 4400 });

  // R3 分析
  push(10600, 'step', { step: 'R3', status: 'RUNNING' });
  push(10900, 'activity', {
    step: 'R3',
    human_message: '正在建立统一对比维度（原理 / 可测界面 / 优势 / 局限）…',
    ts: '',
  });
  push(11600, 'tool', {
    step: 'R3',
    tool: 'sciret_analyze',
    label: '方法脉络拆解',
    status: 'running',
    input: j({ dimensions: ['原理', '可测界面', '优势', '局限', '典型条件'] }),
  });
  push(13800, 'tool', {
    step: 'R3',
    tool: 'sciret_analyze',
    label: '方法脉络拆解',
    status: 'done',
    output: j({ method_classes: 6, matrix_rows: 5, research_gaps: 3 }),
  });
  push(14200, 'step', { step: 'R3', status: 'DONE', elapsed_ms: 3600 });

  // R4 核验
  push(14600, 'step', { step: 'R4', status: 'RUNNING' });
  push(14900, 'activity', {
    step: 'R4',
    human_message: '正在核验引用与数据一致性，并标注争议数值…',
    ts: '',
  });
  push(15600, 'tool', {
    step: 'R4',
    tool: 'sciret_factcheck',
    label: '事实验证',
    status: 'running',
    input: j({ citations: 12, check: ['DOI', '数值一致性', '矛盾'] }),
  });
  push(17600, 'tool', {
    step: 'R4',
    tool: 'sciret_factcheck',
    label: '事实验证',
    status: 'done',
    output: j({
      doi_valid: 12,
      conflicts: 1,
      conflict_note: '晶界活化能 0.4–0.9 eV 分歧，按 as-reported 标注',
    }),
  });
  push(18000, 'step', { step: 'R4', status: 'DONE', elapsed_ms: 3400 });

  // R5 写作 + 结论
  push(18400, 'step', { step: 'R5', status: 'RUNNING' });
  push(18700, 'activity', {
    step: 'R5',
    human_message: '正在整合对比表并撰写综述与结论…',
    ts: '',
  });
  push(19400, 'tool', {
    step: 'R5',
    tool: 'sciret_write_report',
    label: '综述写作',
    status: 'running',
    input: j({ format: 'structured + table + bibtex', language: 'zh' }),
  });
  push(20200, 'report', { task_id: '', status: 'generating' });
  RESEARCH_CONCLUSIONS.forEach((c, i) => {
    push(21000 + i * 500, 'conclusion', {
      cid: c.cid,
      text: c.text,
      evidence_ids: c.evidence_ids,
    });
  });
  push(23200, 'tool', {
    step: 'R5',
    tool: 'sciret_write_report',
    label: '综述写作',
    status: 'done',
    output: j({ sections: 4, conclusions: 4, references: 6 }),
  });
  push(23600, 'step', { step: 'R5', status: 'DONE', elapsed_ms: 5200 });

  // R6 自评审
  push(24000, 'step', { step: 'R6', status: 'RUNNING' });
  push(24300, 'activity', {
    step: 'R6',
    human_message: '正在做自评审：证据绑定、哈希链与复现校验…',
    ts: '',
  });
  push(25000, 'tool', {
    step: 'R6',
    tool: 'sciret_review',
    label: '自评审 · 复现校验',
    status: 'running',
    input: j({ checks: ['evidence_binding', 'hash_chain', 'reproduce'] }),
  });
  push(27200, 'tool', {
    step: 'R6',
    tool: 'sciret_review',
    label: '自评审 · 复现校验',
    status: 'done',
    output: j({ binding_rate: '100%', chain: 'intact', reproduce: 'PASS' }),
  });
  push(27800, 'step', { step: 'R6', status: 'DONE', elapsed_ms: 3800 });
  push(28200, 'report', { task_id: '', status: 'ready' });
  push(28400, 'done', { run_status: 'DONE', report_ready: true });
  return f;
}

function materialsScript(sources: SourceName[]): ScriptFrame[] {
  const f: ScriptFrame[] = [];
  const push = (at: number, event: string, data: ScriptData) =>
    f.push({ at, event, data });

  const rows = selectedRows(sources, MATERIALS_ROWS);
  const limited = rows.filter((r) => r.status !== 'ok');
  const totals = searchTotals(rows, 0.79);

  push(200, 'step', { step: 'P1', status: 'RUNNING' });
  push(600, 'activity', {
    step: 'P1',
    human_message: '正在界定材料体系与性能指标…',
    ts: '',
  });
  push(2400, 'step', { step: 'P1', status: 'DONE', elapsed_ms: 2200 });

  push(2800, 'step', { step: 'P2', status: 'RUNNING' });
  push(3100, 'activity', {
    step: 'P2',
    human_message: '正在检索配方—工艺—性能数据…',
    ts: '',
  });
  push(3800, 'tool', {
    step: 'P2',
    tool: 'sciret_search_literature',
    label: '数据与文献检索',
    status: 'running',
    input: j({
      query: 'perovskite defect passivation efficiency stability',
      sources: rows.map((r) => r.name),
    }),
  });
  // 真实降级：计划路径被改变（切源 + 回落本地语料）。
  // 只有当受限来源在本次任务计划内时成立，否则不构成降级（FE-06 验收）。
  if (rows.some((r) => r.name === 'semantic_scholar' && r.status !== 'ok')) {
    push(6000, 'degraded', {
      level: 'degraded',
      source: 'semantic_scholar',
      reason: '原计划使用的语义检索来源连续 3 次返回 429，重试与退避后仍不可用',
      impact:
        '已加大 OpenAlex 与本地语料的检索比重，文献覆盖度由约 92% 降至约 78%；排序结论需在来源恢复后复核',
      resumable: true,
      step: 'P2',
      action: '切换数据源并使用本地语料兜底',
    });
  }
  push(7200, 'tool', {
    step: 'P2',
    tool: 'sciret_search_literature',
    label: '数据与文献检索',
    status: limited.length > 0 ? 'warn' : 'done',
    output: j({
      hits: totals.hits,
      deduped: totals.deduped,
      coverage: limited.length > 0 ? '78%' : '92%',
    }),
    sources_status: statusList(rows),
  });
  push(7600, 'step', { step: 'P2', status: 'DONE', elapsed_ms: 4800 });

  push(8000, 'step', { step: 'P3', status: 'RUNNING' });
  push(8300, 'activity', {
    step: 'P3',
    human_message: '正在建立性能对比矩阵…',
    ts: '',
  });
  push(10400, 'step', { step: 'P3', status: 'DONE', elapsed_ms: 2400 });

  push(10800, 'step', { step: 'P4', status: 'RUNNING' });
  push(11100, 'activity', {
    step: 'P4',
    human_message: '正在核验效率数值一致性…',
    detail: '6 处与原文相差 >0.5%，已按原文回退标注',
    ts: '',
  });
  push(13000, 'step', { step: 'P4', status: 'DONE', elapsed_ms: 2200 });

  push(13400, 'step', { step: 'P5', status: 'RUNNING' });
  push(13700, 'activity', {
    step: 'P5',
    human_message: '正在撰写方案建议与结论…',
    ts: '',
  });
  push(14500, 'report', { task_id: '', status: 'generating' });
  MATERIALS_CONCLUSIONS.forEach((c, i) => {
    push(15000 + i * 400, 'conclusion', {
      cid: c.cid,
      text: c.text,
      evidence_ids: c.evidence_ids,
    });
  });
  push(16400, 'step', { step: 'P5', status: 'DONE', elapsed_ms: 3000 });
  push(16800, 'report', { task_id: '', status: 'ready' });
  push(17000, 'done', { run_status: 'DONE', report_ready: true });
  return f;
}

/**
 * 演示脚本必须按任务实际选择的来源生成：
 * 未选中的来源不会出现在检索入参、来源状态与降级帧里（FE-06 验收第 4 条）。
 */
export function buildScript(
  workflow: WorkflowName,
  goal: string,
  sources: SourceName[],
): ScriptFrame[] {
  return workflow === 'materials'
    ? materialsScript(sources)
    : researchScript(goal, sources);
}

/**
 * 追问/修订的多轮回复脚本（相对插入时刻的偏移）。
 * 对话轮次只回放消息与工具帧：不发 done（那是运行终态），也不声称证据绑定结果。
 */
export function buildFollowUpScript(
  turnId: string,
  text: string,
  action: 'ask' | 'revise',
  ctx: { reportReady: boolean },
): ScriptFrame[] {
  const f: ScriptFrame[] = [];
  const push = (at: number, event: string, data: ScriptData) =>
    f.push({ at, event, data, turnId });

  push(200, 'message', {
    turn_id: turnId,
    role: 'agent',
    status: 'streaming',
    delta: '',
  });
  push(900, 'tool', {
    step: action === 'revise' ? 'R5' : 'R3',
    tool: 'sciret_analyze',
    label: action === 'revise' ? '按请求修订报告' : '补充分析',
    status: 'running',
    input: j({ followup: text, scope: 'existing session' }),
  });
  const answer =
    action === 'revise'
      ? `（演示数据回放）已记录修订请求：「${text}」。真实运行的改动内容由 AGH 在同一会话中生成；这里演示的是请求如何排队、回写并并入报告附录。`
      : `（演示数据回放）已收到追问：「${text}」。真实运行由 AGH 在同一会话中作答并按需绑定证据编号；这里演示的是发送、排队与回写链路。`;

  const chunks = splitChunks(answer);
  chunks.forEach((chunk, i) => {
    push(2000 + i * 320, 'message', {
      turn_id: turnId,
      role: 'agent',
      status: 'streaming',
      delta: chunk,
    });
  });
  push(2200 + chunks.length * 320, 'tool', {
    step: action === 'revise' ? 'R5' : 'R3',
    tool: 'sciret_analyze',
    label: action === 'revise' ? '按请求修订报告' : '补充分析',
    status: 'done',
    output: j({ turn_id: turnId, mode: 'mock-replay' }),
  });
  push(2600 + chunks.length * 320, 'message', {
    turn_id: turnId,
    role: 'agent',
    status: 'done',
  });
  // 只有报告本来就就绪时，修订才谈得上"并入报告"；失败任务没有报告，不伪造 report 帧
  if (action === 'revise' && ctx.reportReady) {
    push(2800 + chunks.length * 320, 'report', { task_id: '', status: 'ready' });
  }
  return f;
}

function splitChunks(text: string): string[] {
  const size = 18;
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

/** 修订轮次并入报告的附加章节 */
export function revisionSection(turnNo: number, text: string) {
  return {
    id: `S-REV-${turnNo}`,
    title: `附录：第 ${turnNo} 轮修订（${turnNo ? '按请求改写' : '补充'}）`,
    body: `用户请求：${text}\n\n系统改动：已将新增/改写内容并入正文，结论编号与证据编号保持连续，修订过程在同一 AGH 会话中留痕。`,
  };
}
