"""故障注入开关（需求文档 §2.2 配套策略 5、§9.4 验收第4 条）。

原文：
> **故障注入 Fail-closed**：chaos/实验开关默认关闭、不进入正常构建与演示；仅在显式演练命令下生效。

> 正常启动（不带 chaos）→ 不出现任何由故障注入导致的降级。

设计要点（每一条都对应一个被点名的失败模式）：

1. **默认关闭**：不设环境变量时``enabled()`` 恒为 False，且``apply()`` 是恒等函数——
   正常路径上多一次调用也无副作用，不可能"悄悄"注入故障。
2. **仅显式演练命令可开**：必须同时满足「环境变量显式开启」+「作用域前缀匹配」，
   前者防误开，后者防止给 A 任务注入的故障泄漏到 B 任务。
3. **Fail-closed 语义反过来了**：这里的 fail-closed 指的是**开关本身**——
   变量值无法识别时**报错退出**而不是静默当作关闭。理由：演练者以为自己开了 chaos
   却实际没开，会得出"故障注入无效"的错误结论；宁可炸掉也不给假阴性。
4. **注入留痕**：每次注入都记录到 ``injections``，由流水线写进 ``source_status``，
   于是"这次降级是不是人为注入的"在产物里可查、可审计。
"""

from __future__ import annotations

import os
from typing import Any

#: 显式开启 chaos 的环境变量（**必须**显式设为 "1"；其他值一律视为非法 → 报错）
ENV_FLAG = "PAPER_AGENT_CHAOS"
#: 作用域前缀：只对 task_id 以此开头的 run 注入（防跨任务泄漏）
ENV_SCOPE = "PAPER_AGENT_CHAOS_SCOPE"
#: 目标源列表（逗号分隔）。**必须显式指定**——演练"单源不可用"与"全部源不可用"
#: 是两种不同场景（P-01 病灶① 与 L2 行），靠默认值猜会把演练变成另一种故障。
ENV_SOURCES = "PAPER_AGENT_CHAOS_SOURCES"


class ChaosConfigError(RuntimeError):
    """chaos 开关配置非法（fail-closed：报错而非静默当作关闭）。"""


def enabled(task_id: str | None = None) -> bool:
    """chaos 是否对本次执行生效（默认 False）。"""
    raw = os.environ.get(ENV_FLAG)
    if raw is None or raw == "":
        return False
    if raw != "1":
        raise ChaosConfigError(
            f"{ENV_FLAG} 只能取 '1'（显式开启）或空/未设置（关闭），收到 {raw!r}。"
            " 为避免演练者误以为已开启故障注入，此处直接报错（fail-closed）。"
        )
    scope = os.environ.get(ENV_SCOPE, "").strip()
    if not scope:
        raise ChaosConfigError(
            f"{ENV_FLAG}=1 时必须同时设置 {ENV_SCOPE}=<task_id 前缀>，"
            "以免注入的故障泄漏到其他任务。"
        )
    targets = [s.strip() for s in os.environ.get(ENV_SOURCES, "").split(",") if s.strip()]
    if not targets:
        raise ChaosConfigError(
            f"{ENV_FLAG}=1 时必须同时设置 {ENV_SOURCES}=<源名,逗号分隔>。"
            " 不设默认值是刻意的：'单源不可用'（L1）与'全部源不可用'（L2）是两种不同演练，"
            "靠默认值猜会把演练悄悄变成另一种故障。"
        )
    if task_id is not None and not str(task_id).startswith(scope):
        return False
    return True


def targets() -> list[str]:
    """当前 chaos 配置要注入的源名列表（仅在已启用时有效）。"""
    if not enabled():
        return []
    return [s.strip() for s in os.environ.get(ENV_SOURCES, "").split(",") if s.strip()]


def inject_source_failure(
    source_status: dict[str, str],
    sources: list[str],
    *,
    attempts: int = 99,
    error: str = "chaos:injected_transient",
) -> dict[str, str]:
    """把指定源标记为"经历 ``attempts`` 次重试后仍失败"。

    仅用于**演练**：让降级路径在离线环境可测。返回**新字典**，不改原对象
    （调用方若误用返回值也不污染快照）。

    注意：注入的是 ``unavailable:...`` 状态，**不伪造任何文献记录**——
    语料条数仍来自真实冻结快照，因此覆盖不足是真覆盖不足，不是数据造假。
    """
    out = dict(source_status)
    for s in sources:
        out[s] = f"unavailable:{error}:attempts={attempts}"
    return out


def apply(
    state_source_status: dict[str, str],
    *,
    task_id: str | None = None,
) -> tuple[dict[str, str], list[dict[str, Any]]]:
    """按开关状态决定是否注入。

    返回 ``(source_status, injections)``；未启用时 ``injections`` 为空列表，
    且返回值与入参内容相等（便于测试断言"未注入时零副作用"）。
    """
    if not enabled(task_id):
        return dict(state_source_status), []
    targets_ = targets()
    # 只改写「源可达性」，绝不新增/删除文献记录 → 覆盖不足是真覆盖不足，不是数据造假
    return inject_source_failure(state_source_status, targets_), [
        {"kind": "source_failure", "sources": targets_, "note": "演练注入，非真实网络故障"}
    ]


def record_injections(state_source_status: dict[str, str], injections: list[dict[str, Any]]) -> dict[str, str]:
    """把注入事实写进 source_status（可审计：产物里能看出这次降级是人为注入的）。"""
    out = dict(state_source_status)
    if injections:
        out["chaos"] = f"enabled:{len(injections)}"
    return out


__all__ = [
    "ChaosConfigError",
    "ENV_FLAG",
    "ENV_SCOPE",
    "ENV_SOURCES",
    "apply",
    "enabled",
    "inject_source_failure",
    "record_injections",
    "targets",
]
