"""工作流规格（需求文档 §14 Workflow SPI：新增工作流=声明规格，复用状态机）。

research：六步 R1~R6；materials：五步 P1~P5（README 术语表定义）。
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


def steps_for(workflow: str) -> list[tuple[str, str]]:
    return WORKFLOWS.get(workflow, WORKFLOWS[DEFAULT_WORKFLOW])


def is_known(workflow: str) -> bool:
    return workflow in WORKFLOWS
