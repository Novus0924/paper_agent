"""工作流规格（需求文档 §14 Workflow SPI：新增工作流=声明规格，复用状态机）。

research：六步确定性步骤 R1~R6（**已实现**，唯一工作流）
          + 尾部一个受控模型步骤 S1（综合回答，**不由 run_all 执行**）。

⚠️ 「规格存在」≠「可执行」。两者必须分开声明，否则就会出现
"API 收下了、建了任务、连 AGH 会话都开好了，才在第 3 步被告知尚未实现"——
白白消耗一次真实模型回合，用户的观感是"这产品半成品"。
故本模块同时提供 `is_known`（规格存在）与 `is_implemented`（算子齐备），
并让 plan / execute 两条路径都按 Fail-fast 拒绝未实现者。

历史注记：materials（材料发现五步 P1~P5）曾以「规格已定义、算子未实现」的
形态挂在规格表里，API/BFF/前端各留一份未实现提示——构成三层伪选项，
用户在新建任务页可选它、必然失败。2026-10-12 经价值评估后全层删除：
内核零算子的规格对用户没有任何实际作用，只制造"这产品能做材料分析"的假象。
未来新增工作流时按 §14 SPI 在此声明规格、在 pipeline.STEP_FUNCS 落算子，
两处同步后才对用户可见。
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


def steps_for(workflow: str) -> list[tuple[str, str]]:
    return WORKFLOWS.get(workflow, WORKFLOWS[DEFAULT_WORKFLOW])


def is_known(workflow: str) -> bool:
    """规格是否已定义（不保证算子已实现）。"""
    return workflow in WORKFLOWS


def is_implemented(workflow: str) -> bool:
    """算子是否已实现 —— 只有它为真，工作流才真正可跑。"""
    return workflow in IMPLEMENTED
