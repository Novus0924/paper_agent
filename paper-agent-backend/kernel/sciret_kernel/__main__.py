"""内核 CLI 入口 —— AGH 插件工具（sciret_*）的调用契约。

调用契约（插件 ←→ 内核）：
    python -m sciret_kernel <tool> --run-dir <dir> --args-json <json>

- stdout 输出**单个 JSON 对象**（结构化结果）；非 0 退出码 = 工具失败；
- `--run-dir` 为权威值：覆盖 args-json 中的 run_dir，并做路径白名单校验（防目录穿越）；
- 工具集与 AGH 插件 sciret_* 一一对应
  （ping/workflows/plan/run_step/run_all/status/verify/report/cite/resume/synthesize）。

退出码：0 成功 / 1 工具执行失败 / 2 参数非法 / 3 路径越权。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Callable

from . import __version__, corpus, injection, report as report_mod, workflow
from .jsonio import sha256_text
from .ledger import Ledger, LedgerError
from .pipeline import CoveragePolicy, DEFAULT_COVERAGE, PipelineError, execute_step, run_all
from .pipeline import _ev_id, _next_evidence_index  # noqa: SLF001 - 同包复用证据编号规则（保持全局唯一）
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


def _sanitize_queries(raw: Any) -> list[str]:
    """清洗规划查询：接受字符串数组或逗号分隔字符串；去空/去重/截断（≤3 条、每条 ≤200 字符）。

    T5 查询规划：模型产出的 1-3 个英文检索查询；清洗是确定性的，
    同输入恒得同列表（写入 state.json，参与后续检索与审计）。
    """
    if raw is None:
        return []
    if isinstance(raw, str):
        raw = raw.split(",")
    if not isinstance(raw, (list, tuple)):
        raise ValueError(f"queries 必须是字符串数组或逗号分隔字符串，收到 {type(raw).__name__}")
    out: list[str] = []
    for q in raw:
        s = str(q).strip()[:200]
        if s and s not in out:
            out.append(s)
    return out[:3]


def tool_plan(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    task_id = str(args.get("task_id") or run_dir.name)
    goal = str(args.get("goal") or "").strip()
    if not goal:
        raise ValueError("plan 需要 goal")
    wf_raw = str(args.get("workflow") or workflow.DEFAULT_WORKFLOW)
    # ⚠️ Fail-fast：**规格存在**与**算子已实现**是两件事，这里按后者拦。
    #
    #   之前的做法有两个问题，都会让用户吃亏：
    #   ① 对「规格已知但未实现」（materials）照收 → 建好任务、连AGH 会话都开了，
    #      才在执行某一步时被告知"尚未实现"；
    #   ② 对**完全未知**的工作流静默回退research，只在返回值里写一行
    #      workflow_fallback → 用户以为自己跑的是 materials，其实跑的是 research，
    #      结果与预期不符却没有任何拦截。静默回退在这里是有害的：
    #      工作流决定了步骤集与产物结构，跑错就是错的。
    #
    #   故：未知 → 报错；已知但未实现 → 报错并说明可用的替代。
    if not workflow.is_known(wf_raw):
        raise ValueError(
            f"未知工作流：{wf_raw}（可用：{', '.join(sorted(workflow.WORKFLOWS))}）。"
            f"不再静默回退到 {workflow.DEFAULT_WORKFLOW} —— 工作流决定步骤集与产物结构，跑错就是错的。"
        )
    if not workflow.is_implemented(wf_raw):
        raise ValueError(workflow.NOT_IMPLEMENTED_REASON.get(wf_raw, f"工作流 {wf_raw} 尚未实现。"))
    wf = wf_raw
    lit_source = str(args.get("lit_source") or "auto")
    sources = [str(s) for s in (args.get("sources") or [])]
    queries = _sanitize_queries(args.get("queries"))
    state = RunState.create(
        run_dir,
        task_id=task_id,
        goal=goal,
        workflow=wf,
        lit_source=lit_source,
        sources=sources,
        steps=workflow.steps_for(wf),
        queries=queries,
    )
    # 幂等 plan 场景（state 已存在）也要吸收本次传入的 queries：
    # T5 中模型在 plan 时给出查询，若 state 已存在而静默丢弃，检索质量就静默回落。
    if queries and not state.queries:
        state.queries = queries
        state.save(run_dir)
    ledger = Ledger(run_dir)
    # 提示注入检测（v2.2）：goal 是不可信外部输入。命中只附 warning **不阻断**——
    # 科研目标可能合法包含模式词（如引用攻击样本做研究），如实标记即可。
    goal_findings = injection.scan_text(goal)
    result = {
        "ok": True,
        "tool": "plan",
        "state": state.to_dict(),
        "ledger_records": len(ledger),
        "queries": list(state.queries),
        "workflow_fallback": None if wf_raw == wf else f"workflow 非法（{wf_raw}），已回退 {wf}",
        "human_summary": f"已初始化 {wf} 工作流（{len(state.steps)} 步），目标：{goal[:40]}"
        + (f"；规划查询 {len(state.queries)} 条" if state.queries else ""),
    }
    if goal_findings:
        warn_ids = sorted({f.pattern_id for f in goal_findings})
        result["injection_warning"] = {
            "count": len(goal_findings),
            "pattern_ids": warn_ids,
            "message": (
                f"目标文本命中疑似提示注入 {len(goal_findings)} 处（模式：{', '.join(warn_ids)}）；"
                "已如实标记、不阻断，请人工确认目标语义"
            ),
        }
        result["human_summary"] += f"；⚠️ 检测到疑似提示注入 {len(goal_findings)} 处（不阻断）"
    return result


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


_EV_REF_RE = re.compile(r"EV-\d{4}")
_MAX_SYNTHESIS_CHARS = 20000


def tool_synthesize(args: dict[str, Any], run_dir: Path) -> dict[str, Any]:
    """受控模型综合回答（S1，需求 §3.1"受控判断点 + 全额留痕"）。

    职责：把**模型撰写的**对研究问题的直接回答作为 artifact 落入账本，
    并重装配报告（新增"对研究问题的回答"章节）。

    红线落实：
    - 模型文本是 artifact（tier=artifact, kind=synthesis, producer_step=S1），
      **不进 conclusions、不影响门禁的 fact 绑定校验**；
    - 文本中的 [EV-xxxx] 角标逐一校验：引用不存在的证据 → 角标剔除并留痕
      （invalid_refs_removed），绝不保留虚构引用；
    - 全额留痕：同时落 judgment 记录（judge=model:llm-synthesis@v1）。
    """
    state, ledger = _load(run_dir)
    if state.run_status.value != "DONE":
        raise PipelineError(
            f"synthesize 仅在任务终态 DONE 后可用（当前 {state.run_status.value}）——"
            f"综合回答必须基于已通过门禁的完整证据链"
        )
    raw_path = str(args.get("text_file") or "").strip()
    if not raw_path:
        raise ValueError("synthesize 需要 text_file（模型综合回答文本文件路径，须位于 run_dir 内）")
    tf = Path(raw_path)
    if ".." in tf.parts:
        raise PathGuardError(f"text_file 不允许包含 '..'：{raw_path}")
    if not tf.is_absolute():
        raise PathGuardError(f"text_file 必须是绝对路径：{raw_path}")
    # 归一化后再比对：run_dir 已被 guard resolve，text_file 不同 resolve 形式
    # （如 Windows 临时目录短名/长名）会让 parents 判断误报越界
    tf = tf.resolve()
    # 越权防护：文本文件必须落在 run_dir 内（防止借 synthesize 读任意文件入账本）
    if run_dir != tf and run_dir not in tf.parents:
        raise PathGuardError(f"text_file 越界：{tf} 不在 run_dir {run_dir} 之内")
    if not tf.exists():
        raise ValueError(f"综合回答文本文件不存在：{tf}")
    text = tf.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError("综合回答文本为空")
    if len(text) > _MAX_SYNTHESIS_CHARS:
        raise ValueError(f"综合回答文本过长：{len(text)} 字符（上限 {_MAX_SYNTHESIS_CHARS}）")

    # ---- [EV-xxxx] 角标校验：存在的保留，不存在的剔除并留痕 ----
    seen: list[str] = []
    for ref in _EV_REF_RE.findall(text):
        if ref not in seen:
            seen.append(ref)
    valid_refs = [r for r in seen if ledger.evidence_by_id(r) is not None]
    invalid_refs = [r for r in seen if r not in valid_refs]
    cleaned = text
    for bad in invalid_refs:
        cleaned = cleaned.replace(f"[{bad}]", "").replace(bad, "")

    idx = _next_evidence_index(ledger)
    ev_id = _ev_id(idx)
    ledger.append(
        "evidence",
        {
            "ev_id": ev_id,
            # artifact：模型输出不可进结论（红线），仅供报告"对研究问题的回答"章节引用
            "tier": "artifact",
            "kind": "synthesis",
            "title": "对研究问题的综合回答（模型生成，artifact）",
            "text": cleaned,
            "detail": {
                "raw_chars": len(text),
                "invalid_refs_removed": invalid_refs,
                "note": "模型综合生成，非确定性内容；不进入确定性结论，不影响门禁",
            },
            "ref": {"file": tf.name, "sha256": sha256_text(text), "bytes": len(text.encode("utf-8"))},
            "cited_evidence": valid_refs,
            "producer_step": "S1",
        },
    )
    ledger.append(
        "judgment",
        {
            "judge": "model:llm-synthesis@v1",
            "verdict": True,
            "rationale": (
                f"模型综合回答已落盘为 artifact（{ev_id}，{len(cleaned)} 字符，"
                f"引用有效证据 {len(valid_refs)} 条）；非确定性内容，不进入确定性结论，不影响门禁 fact 绑定。"
                + (f"剔除无效证据角标 {len(invalid_refs)} 个：{'、'.join(invalid_refs)}。" if invalid_refs else "")
            ),
            "evidence_ids": [ev_id],
            "producer_step": "S1",
        },
    )

    # S1 步骤收尾（受控模型步骤：不改 run_status，终态不可逆不受影响）
    if any(s.id == "S1" for s in state.steps):
        state.complete_optional_step(run_dir, "S1")

    # 重装配报告：账本已变化 → assemble 的幂等短路必然失效 → report.json 增补 answer 章节
    built = report_mod.assemble(run_dir)
    return {
        "ok": True,
        "tool": "synthesize",
        "evidence_id": ev_id,
        "cited_evidence": valid_refs,
        "invalid_refs_removed": invalid_refs,
        "report_status": "ready" if built.get("reused") is not None else "unknown",
        "path": str(run_dir / report_mod.REPORT_JSON),
        "markdown": str(run_dir / report_mod.REPORT_MD),
        "human_summary": (
            f"综合回答已入账本（{ev_id}）：引用有效证据 {len(valid_refs)} 条"
            + (f"，剔除无效角标 {len(invalid_refs)} 个" if invalid_refs else "")
            + "；报告已重装配并包含「对研究问题的回答」章节"
        ),
    }


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
    "synthesize": tool_synthesize,
}


def main(argv: list[str] | None = None) -> int:
    # stdout 是 JSON 契约通道，且各处都用 ensure_ascii=False 输出中文原文。
    # Windows 下 sys.stdout 跟随系统代码页（简中 = cp936），管道里的中文会按 GBK 落盘，
    # 调用方按 UTF-8 解码即成乱码 —— 生产插件显式设 PYTHONIOENCODING=utf-8 才掩盖了这一点，
    # 契约测试没设就红了一片（标签本身并没有漂移）。JSON 交换通道的编码不该由调用方决定，这里钉死 UTF-8。
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass  # 被测试框架替换成非文件流时，保持调用方给的编码

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
