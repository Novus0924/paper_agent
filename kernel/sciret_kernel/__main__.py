"""内核 CLI 入口 —— AGH 插件工具（sciret_*）的调用契约。

调用契约（插件 ←→ 内核）：
    python -m sciret_kernel <tool> --run-dir <dir> --args-json <json>

- stdout 输出**单个 JSON 对象**（结构化结果）；非 0 退出码 = 工具失败；
- `--run-dir` 为权威值：覆盖 args-json 中的 run_dir，并做路径白名单校验（防目录穿越）；
- 工具集与 AGH 插件 sciret_* 一一对应（ping/workflows/plan/run_step/run_all/status/verify/report/cite/resume）。

退出码：0 成功 / 1 工具执行失败 / 2 参数非法 / 3 路径越权。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Callable

from . import __version__, corpus, report as report_mod, workflow
from .ledger import Ledger, LedgerError
from .pipeline import CoveragePolicy, DEFAULT_COVERAGE, PipelineError, execute_step, run_all
from .state import RunState, StateError
from .verify_cli import cite_lookup, verify_run


class PathGuardError(RuntimeError):
    """run_dir 越权（防目录穿越）。"""


def guard_run_dir(raw: str) -> Path:
    if not raw or not raw.strip():
        raise PathGuardError("run_dir 不能为空")
    p = Path(raw)
    if ".." in p.parts:
        raise PathGuardError(f"run_dir 不允许包含 '..'：{raw}")
    if not p.is_absolute():
        raise PathGuardError(f"run_dir 必须是绝对路径：{raw}")
    p = p.resolve()
    allow_root = os.environ.get("PAPER_AGENT_RUNS_DIR")
    if allow_root:
        root = Path(allow_root).resolve()
        if root != p and root not in p.parents:
            raise PathGuardError(f"run_dir 越界：{p} 不在白名单根 {root} 之内")
    return p


# ---------------------------------------------------------------- 工具实现


def tool_ping(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    run_dir.mkdir(parents=True, exist_ok=True)
    return {
        "ok": True,
        "tool": "ping",
        "kernel_version": __version__,
        "run_dir": str(run_dir),
        "writable": os.access(run_dir, os.W_OK),
        "snapshots": corpus.available_snapshots(),
        "workflows": sorted(workflow.WORKFLOWS),
    }


def tool_workflows(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    return {
        "ok": True,
        "default": workflow.DEFAULT_WORKFLOW,
        "workflows": {
            name: [{"id": sid, "label": label} for sid, label in steps] for name, steps in workflow.WORKFLOWS.items()
        },
    }


def tool_plan(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    task_id = str(args.get("task_id") or run_dir.name)
    goal = str(args.get("goal") or "").strip()
    if not goal:
        raise ValueError("plan 需要 goal")
    wf_raw = str(args.get("workflow") or workflow.DEFAULT_WORKFLOW)
    wf = wf_raw if workflow.is_known(wf_raw) else workflow.DEFAULT_WORKFLOW
    lit_source = str(args.get("lit_source") or "auto")
    sources = [str(s) for s in (args.get("sources") or [])]
    state = RunState.create(
        run_dir,
        task_id=task_id,
        goal=goal,
        workflow=wf,
        lit_source=lit_source,
        sources=sources,
        steps=workflow.steps_for(wf),
    )
    ledger = Ledger(run_dir)
    return {
        "ok": True,
        "tool": "plan",
        "state": state.to_dict(),
        "ledger_records": len(ledger),
        "workflow_fallback": None if wf_raw == wf else f"workflow 非法（{wf_raw}），已回退 {wf}",
        "human_summary": f"已初始化 {wf} 工作流（{len(state.steps)} 步），目标：{goal[:40]}",
    }


def _load(run_dir: Path) -> tuple[RunState, Ledger]:
    return RunState.load(run_dir), Ledger(run_dir)


def tool_run_step(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    state, ledger = _load(run_dir)
    step_id = str(args.get("step") or "").strip()
    if not step_id:
        step_id = state.next_pending() or ""
        if not step_id:
            return {"ok": True, "reused": True, "run_status": state.run_status.value, "human_summary": "没有待执行步骤"}
    result = execute_step(state, run_dir, ledger, step_id, _coverage_from_args(args))
    return {**result, "ok": True, "run_status": state.run_status.value, "degraded": state.degraded}


def _coverage_from_args(args: dict[str, Any]):
    """从 args-json 解析覆盖策略（§2.2①"可配置"）。

    未提供任何阈值时返回 None →流水线用DEFAULT_COVERAGE。
    非法值直接报错（不静默取默认）——静默取默认会让"我配了 5却按 2 跑"这类错误无法察觉。
    """
    raw = args.get("coverage_policy")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise ValueError(f"coverage_policy 必须是对象，收到 {type(raw).__name__}")
    d = DEFAULT_COVERAGE.to_dict()
    unknown = set(raw) - set(d)
    if unknown:
        raise ValueError(f"coverage_policy 含未知字段：{sorted(unknown)}（允许：{sorted(d)}）")
    d.update({k: int(v) for k, v in raw.items()})
    return CoveragePolicy(**d)


def tool_run_all(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    state, ledger = _load(run_dir)
    policy = _coverage_from_args(args)
    result = run_all(state, run_dir, ledger, policy)
    out = {"ok": True, **result}
    if policy is not None:
        # 回显生效的策略，否则调用方无法确认"我配的阈值真的生效了"
        out["coverage_policy"] = policy.to_dict()
    return out


def tool_status(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    state, ledger = _load(run_dir)
    done = sum(1 for s in state.steps if s.status.value in ("DONE", "SKIPPED"))
    return {
        "ok": True,
        "state": state.to_dict(),
        "ledger_records": len(ledger),
        "evidence_count": len(ledger.evidence()),
        "conclusion_count": len(ledger.conclusion_records()),
        "chain_head": ledger.last_hash(),
        "remaining_steps": state.remaining_steps(),
        "human_summary": f"{state.run_status.value}：已完成 {done}/{len(state.steps)} 步",
    }


def tool_verify(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    return verify_run(run_dir)


def tool_report(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    allow_bypass = bool(args.get("allow_gate_bypass", False))
    built = report_mod.assemble(run_dir, allow_gate_bypass=allow_bypass)
    return {
        "ok": True,
        "tool": "report",
        "report": built,
        "path": str(run_dir / report_mod.REPORT_JSON),
        "markdown": str(run_dir / report_mod.REPORT_MD),
    }


def tool_cite(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    ev = str(args.get("ev") or args.get("ev_id") or "").strip()
    if not ev:
        raise ValueError("cite 需要 ev（证据编号，如 EV-0001）")
    return cite_lookup(run_dir, ev)


def tool_resume(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    state, ledger = _load(run_dir)
    remaining = state.remaining_steps()
    executed: list[dict[str, Any]] = []
    if args.get("execute") and remaining and not state.is_terminal:
        executed = run_all(state, run_dir, ledger)["executed"]
    return {
        "ok": True,
        "remaining_steps": state.remaining_steps(),
        "run_status": state.run_status.value,
        "executed": executed,
        "human_summary": f"待续跑步骤：{', '.join(remaining) or '无'}",
    }


TOOLS: dict[str, Callable[[dict[str, Any], Path], dict[str, Any]]] = {
    "ping": tool_ping,
    "workflows": tool_workflows,
    "plan": tool_plan,
    "run_step": tool_run_step,
    "run_all": tool_run_all,
    "status": tool_status,
    "verify": tool_verify,
    "report": tool_report,
    "cite": tool_cite,
    "resume": tool_resume,
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="sciret_kernel", description="paper-agent 确定性科研内核")
    parser.add_argument("tool", choices=sorted(TOOLS), help="工具名")
    parser.add_argument("--run-dir", required=True, help="任务运行目录（绝对路径）")
    parser.add_argument("--args-json", default="{}", help="工具参数（JSON 对象）")
    ns = parser.parse_args(argv)

    try:
        args = json.loads(ns.args_json)
        if not isinstance(args, dict):
            raise ValueError("args-json 必须是 JSON 对象")
    except ValueError as e:
        print(json.dumps({"ok": False, "error": f"参数解析失败: {e}"}, ensure_ascii=False))
        return 2

    try:
        run_dir = guard_run_dir(ns.run_dir)
    except PathGuardError as e:
        print(json.dumps({"ok": False, "error": f"run_dir 非法: {e}"}, ensure_ascii=False))
        return 3

    args["run_dir"] = str(run_dir)

    try:
        result = TOOLS[ns.tool](args, run_dir)
    except (StateError, LedgerError, PipelineError, report_mod.ReportGateError) as e:
        payload: dict[str, Any] = {"ok": False, "error": f"{type(e).__name__}: {e}"}
        if isinstance(e, report_mod.ReportGateError):
            payload["gate_reasons"] = e.reasons
        print(json.dumps(payload, ensure_ascii=False))
        return 1
    except Exception as e:  # noqa: BLE001 - 内核边界：任何失败都结构化上报，不抛栈
        print(json.dumps({"ok": False, "error": f"{type(e).__name__}: {e}"}, ensure_ascii=False))
        return 1

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
