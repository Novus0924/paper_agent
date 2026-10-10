"""工作流规格（需求文档 §14 Workflow SPI：新增工作流=声明规格，复用状态机）。

research：六步 R1~R6（**已实现**，MVP 唯一可执行工作流）；
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
