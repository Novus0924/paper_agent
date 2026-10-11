"""工作流规格（需求文档 §14 Workflow SPI：新增工作流=声明规格，复用状态机）。

research：六步确定性步骤 R1~R6（**已实现**，MVP 唯一可执行工作流）
          + 尾部一个受控模型步骤 S1（综合回答，**不由 run_all 执行**）；
materials：五步 P1~P5（README 术语表已定义，但**算子尚未实现**）。

⚠️ 「规格存在」≠「可执行」。两者必须分开声明，否则就会出现
"API 收下了、建了任务、连 AGH 会话都开好了，才在第 3 步被告知尚未实现"——
白白消耗一次真实模型回合，用户的观感是"这产品半成品"。
故本模块同时提供 `is_known`（规格存在）与 `is_implemented`（算子齐备），
并让 plan / execute 两条路径都按 Fail-fast 拒绝未实现者。
"""

from __future__ import annotations

WORKFLOWS: dict[str, list[tuple[str, str]]] = {
    "research": [
        ("R1", "多源检索"),
        ("R2", "论文精读"),
        ("R3", "创新点拆解"),
        ("R4", "事实验证"),
        ("R5", "综述写作"),
        ("R6", "自评审"),
        ("S1", "综合回答"),
    ],
    "materials": [
        ("P1", "候选生成"),
        ("P2", "性质预测"),
        ("P3", "条件搜索"),
        ("P4", "多目标排序"),
        ("P5", "报告汇总"),
    ],
}

DEFAULT_WORKFLOW = "research"

#: 受控模型步骤（需求 §3.1"受控判断点 + 全额留痕"）：由模型经 sciret_synthesize
#: 在确定性整链**完成后**补做，输出以 artifact 入账本（不进结论、不影响门禁）。
#: ①确定性流水线 run_all 跳过它们；②它们标记 StepRecord.optional，不阻塞收敛；
#: ③步骤表加一条（方案 A）而非挂在 R6 下（方案 B）——理由：
#:   挂在 R6 下会让"综合回答"在状态机/事件流/前端步骤条里不可见，用户无法区分
#:   "报告已就绪"与"综合回答已生成"两个事实；独立步骤 id 让留痕与可见性对齐，
#:   兼容性由 StepRecord.optional（老 state.json 无该字段默认 False）与
#:   converge/remaining 的 optional 豁免保证，历史 run 不受影响。
MODEL_STEPS: frozenset[str] = frozenset({"S1"})

#: 算子已实现的工作流白名单（**规格已定义但算子未齐备**的不得列入）。
#: 增删工作流时必须同步 pipeline.STEP_FUNCS，否则 plan/execute 会拒绝。
IMPLEMENTED: frozenset[str] = frozenset({"research"})

#: 未实现工作流的人话说明（供 API 层直接透传给用户，别只丢一个错误码）
NOT_IMPLEMENTED_REASON: dict[str, str] = {
    "materials": (
        "材料发现工作流（候选生成/性质预测/条件搜索/多目标排序/报告汇总）的算子尚未实现。"
        "MVP 请用 workflow=research（多源检索→精读→拆解→验证→写作→自评审）。"
    ),
}


def steps_for(workflow: str) -> list[tuple[str, str]]:
    return WORKFLOWS.get(workflow, WORKFLOWS[DEFAULT_WORKFLOW])


def is_known(workflow: str) -> bool:
    """规格是否已定义（不保证算子已实现）。"""
    return workflow in WORKFLOWS


def is_implemented(workflow: str) -> bool:
    """算子是否已实现 —— 只有它为真，工作流才真正可跑。"""
    return workflow in IMPLEMENTED
