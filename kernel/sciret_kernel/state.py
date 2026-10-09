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
        )


@dataclass
class RunState:
    task_id: str
    goal: str
    workflow: str
    lit_source: str = "auto"
    sources: list[str] = field(default_factory=list)
    run_status: RunStatus = RunStatus.PLANNED
    degraded: bool = False
    """降级声明（§2.2）：仅 L2 真降级置位；L1 仅记录 source_status。"""
    degraded_reasons: list[dict[str, Any]] = field(default_factory=list)
    source_status: dict[str, str] = field(default_factory=dict)
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
            steps=[StepRecord(id=sid, label=label) for sid, label in steps],
            created_at=now,
            updated_at=now,
        )
        state.save(run_dir)
        return state

    def save(self, run_dir: Path) -> None:
        self.updated_at = _now()
        atomic_write_json(self.path(run_dir), self.to_dict())

    def to_dict(self) -> dict[str, Any]:
        return {
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

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "RunState":
        return RunState(
            task_id=str(d["task_id"]),
            goal=str(d.get("goal", "")),
            workflow=str(d.get("workflow", "research")),
            lit_source=str(d.get("lit_source", "auto")),
            sources=list(d.get("sources", [])),
            run_status=RunStatus(str(d.get("run_status", "PLANNED"))),
            degraded=bool(d.get("degraded", False)),
            degraded_reasons=list(d.get("degraded_reasons", [])),
            source_status=dict(d.get("source_status", {})),
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
        if s.status == StepStatus.RUNNING:
            raise StateError(f"步骤 {step_id} 正在执行（per-Task 互斥应由上层保证）")
        prev = s.status
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
        """收敛：全部 DONE/SKIPPED → DONE；存在 FAILED → 保持 RUNNING 等调用方决策。"""
        if self.is_terminal:
            return self.run_status
        if all(s.status in TERMINAL_STEP for s in self.steps):
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
        """断点续跑：仅 PENDING / FAILED 需要执行（DONE/SKIPPED 复用）。"""
        return [s.id for s in self.steps if s.status in (StepStatus.PENDING, StepStatus.FAILED)]

    def next_pending(self) -> str | None:
        for s in self.steps:
            if s.status in (StepStatus.PENDING, StepStatus.FAILED):
                return s.id
        return None

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
