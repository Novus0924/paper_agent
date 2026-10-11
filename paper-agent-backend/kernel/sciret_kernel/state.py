"""Run / Step 状态机（需求文档 §4.3、附录 A 权威枚举）。

规则（严格照抄文档，不得自创）：
- Run 状态：PLANNED → RUNNING → DONE | FAILED（DONE/FAILED 为终态）
- Step 状态：PENDING → RUNNING → DONE | FAILED；PENDING → SKIPPED；
             FAILED → RUNNING（重试/续跑）；DONE/SKIPPED 为终态
- 收敛规则：全部步骤 DONE/SKIPPED → 自动收敛 DONE；
            存在 FAILED → 由调用方显式决策（重试或 FAILED）
- 终态幂等：重复执行不重复登记；DONE/FAILED 不可逆
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

from .jsonio import atomic_write_json, read_json
from .workflow import MODEL_STEPS

STATE_FILE = "state.json"


class RunStatus(str, Enum):
    PLANNED = "PLANNED"
    RUNNING = "RUNNING"
    DONE = "DONE"
    FAILED = "FAILED"


class StepStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


TERMINAL_STEP = {StepStatus.DONE, StepStatus.SKIPPED}
TERMINAL_RUN = {RunStatus.DONE, RunStatus.FAILED}


class StateError(RuntimeError):
    """非法状态迁移（Fail-fast：调用方必须显式决策，不允许静默纠正）。"""


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


@dataclass
class StepRecord:
    id: str
    label: str
    status: StepStatus = StepStatus.PENDING
    attempts: int = 0
    started_at: str | None = None
    ended_at: str | None = None
    error: str | None = None
    optional: bool = False
    """受控模型步骤标记（True = 不由确定性流水线执行，且**不阻塞任务收敛**）。

    背景：S1（综合回答）是"受控模型判断点"——由模型在整链完成后经
    sciret_synthesize 落盘，确定性流水线 run_all 不执行它。若让一个永远
    PENDING 的 S1 阻塞收敛，所有任务都到不了 DONE 终态（报告永远不出），
    故 optional 步骤不参与收敛判定；它完成后也不改变 run_status（终态不可逆）。
    """

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "id": self.id,
            "label": self.label,
            "status": self.status.value,
            "attempts": self.attempts,
        }
        if self.started_at:
            d["started_at"] = self.started_at
        if self.ended_at:
            d["ended_at"] = self.ended_at
        if self.error:
            d["error"] = self.error
        if self.optional:
            # 仅在为 True 时落盘：老 state.json（无此字段）反序列化默认 False，天然向后兼容
            d["optional"] = True
        return d

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "StepRecord":
        return StepRecord(
            id=str(d["id"]),
            label=str(d.get("label", d["id"])),
            status=StepStatus(str(d.get("status", "PENDING"))),
            attempts=int(d.get("attempts", 0)),
            started_at=d.get("started_at"),
            ended_at=d.get("ended_at"),
            error=d.get("error"),
            optional=bool(d.get("optional", False)),
        )


@dataclass
class RunState:
    task_id: str
    goal: str
    workflow: str
    lit_source: str = "auto"
    sources: list[str] = field(default_factory=list)
    queries: list[str] = field(default_factory=list)
    """模型规划检索查询（T5 受控判断点产物，plan 时写入并持久化）。

    为空表示"未提供规划查询"——检索回落使用 goal 原文（既有行为，不阻断）。
    仅在非空时落盘：老 state.json 无此字段，反序列化默认空列表，向后兼容。
    """
    run_status: RunStatus = RunStatus.PLANNED
    degraded: bool = False
    """降级声明（§2.2）：仅 L2 真降级置位；L1 仅记录 source_status。"""
    degraded_reasons: list[dict[str, Any]] = field(default_factory=list)
    source_status: dict[str, str] = field(default_factory=dict)
    circuit: dict[str, str] = field(default_factory=dict)
    """源熔断留痕（v2.2）：本 run 内抓取失败（source_status unavailable）的源不再二次尝试。
    键=源名，值=open_until_run_end。仅非空时落盘（老 state.json 无此字段，向后兼容）。"""
    steps: list[StepRecord] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""

    # ---------- 持久化 ----------

    @staticmethod
    def path(run_dir: Path) -> Path:
        return run_dir / STATE_FILE

    @classmethod
    def create(
        cls,
        run_dir: Path,
        task_id: str,
        goal: str,
        workflow: str,
        lit_source: str,
        sources: list[str],
        steps: list[tuple[str, str]],
        queries: list[str] | None = None,
    ) -> "RunState":
        exist = read_json(cls.path(run_dir))
        if exist:
            # 幂等：已存在则直接读取（重复 plan 不重建，不丢历史）
            return cls.from_dict(exist)
        now = _now()
        state = cls(
            task_id=task_id,
            goal=goal,
            workflow=workflow,
            lit_source=lit_source,
            sources=sources,
            run_status=RunStatus.PLANNED,
            # 受控模型步骤（workflow.MODEL_STEPS，如 S1）标记 optional：
            # 不由确定性流水线执行、不阻塞收敛（见 StepRecord.optional 注释）
            steps=[StepRecord(id=sid, label=label, optional=sid in MODEL_STEPS) for sid, label in steps],
            created_at=now,
            updated_at=now,
        )
        # 规划查询在 create 之外统一赋值（保证幂等重建路径与新建路径共用同一份清洗逻辑）
        if queries:
            state.queries = [str(q).strip() for q in queries if str(q).strip()]
        state.save(run_dir)
        return state

    def save(self, run_dir: Path) -> None:
        self.updated_at = _now()
        atomic_write_json(self.path(run_dir), self.to_dict())

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "task_id": self.task_id,
            "goal": self.goal,
            "workflow": self.workflow,
            "lit_source": self.lit_source,
            "sources": list(self.sources),
            "run_status": self.run_status.value,
            "degraded": self.degraded,
            "degraded_reasons": list(self.degraded_reasons),
            "source_status": dict(self.source_status),
            "steps": [s.to_dict() for s in self.steps],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self.queries:
            d["queries"] = list(self.queries)
        if self.circuit:
            d["circuit"] = dict(self.circuit)
        return d

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "RunState":
        return RunState(
            task_id=str(d["task_id"]),
            goal=str(d.get("goal", "")),
            workflow=str(d.get("workflow", "research")),
            lit_source=str(d.get("lit_source", "auto")),
            sources=list(d.get("sources", [])),
            queries=[str(q) for q in d.get("queries", [])],
            run_status=RunStatus(str(d.get("run_status", "PLANNED"))),
            degraded=bool(d.get("degraded", False)),
            degraded_reasons=list(d.get("degraded_reasons", [])),
            source_status=dict(d.get("source_status", {})),
            circuit=dict(d.get("circuit", {})),
            steps=[StepRecord.from_dict(s) for s in d.get("steps", [])],
            created_at=str(d.get("created_at", "")),
            updated_at=str(d.get("updated_at", "")),
        )

    @classmethod
    def load(cls, run_dir: Path) -> "RunState":
        data = read_json(cls.path(run_dir))
        if not data:
            raise StateError(f"运行状态不存在：{cls.path(run_dir)}（请先执行 sciret_plan）")
        return cls.from_dict(data)

    # ---------- 状态迁移 ----------

    def step(self, step_id: str) -> StepRecord:
        for s in self.steps:
            if s.id == step_id:
                return s
        raise StateError(f"未知步骤：{step_id}（可选：{', '.join(s.id for s in self.steps)}）")

    @property
    def is_terminal(self) -> bool:
        return self.run_status in TERMINAL_RUN

    def start_step(self, run_dir: Path, step_id: str) -> StepRecord:
        if self.is_terminal:
            raise StateError(f"任务已处于终态 {self.run_status.value}，不允许再执行步骤（终态不可逆）")
        s = self.step(step_id)
        if s.status in TERMINAL_STEP:
            # 终态幂等：重复执行不重复登记
            return s
        prev = s.status
        if prev == StepStatus.RUNNING:
            #僵死 RUNNING（僵尸执行态）→ 允许接管。
            #
            # 为什么必须允许：进程被强杀时，状态停在 RUNNING 而结果**永远写不出来**，
            # 于是这个步骤既不是 DONE（不能复用）也不是 PENDING（等待中），
            # 若此处继续报错，**崩溃后续跑就完全不可用**——每崩一次任务就永久卡死。
            #
            # 安全性如何保证：per-Task 互斥由**上层**保证（BFF ExecutionService 的
            # per-Task 锁，见§11），内核是单进程单次调用，不会有真的并发执行。
            # 换句话说：能走到这里说明没有另一个执行者，这个 RUNNING 一定是遗留的。
            # 留痕：attempts 照常递增（能看到"这次是第几次尝试"），
            # 并把 started_at 刷新为接管时刻，便于事后判断停在哪。
            s.status = StepStatus.RUNNING
            s.attempts += 1
            s.started_at = _now()
            self.run_status = RunStatus.RUNNING
            self.save(run_dir)
            return s
        s.status = StepStatus.RUNNING
        s.attempts += 1
        s.started_at = _now()
        if prev == StepStatus.FAILED:
            s.error = None
        self.run_status = RunStatus.RUNNING
        self.save(run_dir)
        return s

    def finish_step(self, run_dir: Path, step_id: str, error: str | None = None) -> StepRecord:
        s = self.step(step_id)
        if s.status != StepStatus.RUNNING:
            raise StateError(f"步骤 {step_id} 当前状态 {s.status.value}，不能结束（需先 RUNNING）")
        s.status = StepStatus.FAILED if error else StepStatus.DONE
        s.ended_at = _now()
        s.error = error
        self.converge()
        self.save(run_dir)
        return s

    def skip_step(self, run_dir: Path, step_id: str) -> StepRecord:
        s = self.step(step_id)
        if s.status != StepStatus.PENDING:
            raise StateError(f"仅 PENDING 步骤可跳过，{step_id} 当前 {s.status.value}")
        s.status = StepStatus.SKIPPED
        s.ended_at = _now()
        self.converge()
        self.save(run_dir)
        return s

    def converge(self) -> RunStatus:
        """收敛：全部步骤 DONE/SKIPPED → DONE；存在 FAILED → 保持 RUNNING 等调用方决策。

        optional（受控模型）步骤**不阻塞收敛**：S1（综合回答）由模型在终态后
        经 sciret_synthesize 补做；若让它参与收敛判定，一个永远 PENDING 的 S1
        会让所有任务到不了 DONE（报告永远不出）。它完成后也不改变 run_status。
        """
        if self.is_terminal:
            return self.run_status
        if all(s.status in TERMINAL_STEP or s.optional for s in self.steps):
            self.run_status = RunStatus.DONE
        return self.run_status

    def mark_failed(self, run_dir: Path) -> RunStatus:
        """调用方显式决策：将 RUNNING 置为 FAILED 终态。"""
        if self.run_status in TERMINAL_RUN:
            return self.run_status
        self.run_status = RunStatus.FAILED
        self.save(run_dir)
        return self.run_status

    def remaining_steps(self) -> list[str]:
        """断点续跑：仅 PENDING / FAILED 需要执行（DONE/SKIPPED 复用）。

        optional（受控模型）步骤不在此列：它们不走确定性流水线，
        由 sciret_synthesize 在终态后补做，列入"待续跑"只会误导续跑方。
        """
        return [
            s.id
            for s in self.steps
            if not s.optional and s.status in (StepStatus.PENDING, StepStatus.FAILED)
        ]

    def next_pending(self) -> str | None:
        for s in self.steps:
            if not s.optional and s.status in (StepStatus.PENDING, StepStatus.FAILED):
                return s.id
        return None

    def complete_optional_step(self, run_dir: Path, step_id: str) -> StepRecord:
        """受控模型步骤专用：PENDING → DONE 直接完成（不改 run_status）。

        为什么不走 start/finish 两段式：synthesize 发生在任务已收敛 DONE **之后**
        （终态不可逆，start_step 会拒绝终态任务），而 S1 恰恰设计为"终态后补做"。
        本方法只允许 optional 步骤、只允许 PENDING → DONE 单向迁移、不触碰
        run_status——终态不可逆红线不受影响；attempts/时间戳照常留痕。
        """
        s = self.step(step_id)
        if not s.optional:
            raise StateError(f"步骤 {step_id} 不是受控模型步骤（optional），不允许直接置 DONE")
        if s.status == StepStatus.DONE:
            return s  # 幂等：重复 synthesize 不重复改状态
        if s.status != StepStatus.PENDING:
            raise StateError(f"步骤 {step_id} 当前状态 {s.status.value}，仅 PENDING 可直接完成")
        s.status = StepStatus.DONE
        s.attempts += 1
        s.started_at = s.started_at or _now()
        s.ended_at = _now()
        self.save(run_dir)
        return s

    def add_degradation(self, run_dir: Path, *, level: str, source: str, reason: str, impact: str, resumable: bool, step: str) -> None:
        """降级记录（§2.2）：level ∈ {info, degraded}；仅 degraded 置 degraded=True。"""
        if level not in ("info", "degraded"):
            raise StateError(f"非法降级级别：{level}（允许 info | degraded）")
        entry = {
            "level": level,
            "source": source,
            "reason": reason,
            "impact": impact,
            "resumable": resumable,
            "step": step,
            "at": _now(),
        }
        self.degraded_reasons.append(entry)
        if level == "degraded":
            self.degraded = True
        self.save(run_dir)
