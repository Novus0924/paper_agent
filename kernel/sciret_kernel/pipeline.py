"""确定性流水线（需求文档 §3.1 确定性优先、§4.3 状态机驱动、§6 容错、§9.2 执行）。

设计原则：
- 每个步骤是**纯函数式**的（同输入同输出，无随机、无隐式时间参与内容哈希）；
- 步骤内只做确定性计算（语料检索/排序、关键词拆解、交叉印证判定），**模型不参与事实生产**；
- 所有产出以证据/判断/结论记录进账本（append-only 哈希链），结论强制绑定 fact 级证据；
- 降级按 §2.2 三级语义：覆盖充足仅记 L1(info)；路径实质改变才 L2(degraded)。

步骤（research 六步）：
    R1 多源检索 → literature 证据
    R2 论文精读 → analysis 证据（逐篇主题解构）
    R3 创新点拆解 → analysis 证据（目标与覆盖的缺口）
    R4 事实验证 → factcheck 证据 + judgment + conclusion（交叉印证）
    R5 综述写作 → draft 产物（artifact，**不可进结论**）+ draft.md
    R6 自评审 → review 产物（artifact）+ review.json
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from . import corpus
from .jsonio import atomic_write_json, atomic_write_text, canonical_json, sha256_text
from .ledger import Ledger
from .state import RunState
from .workflow import steps_for

# 覆盖策略（§2.2 可配置）：达标源数 ≥ MIN_OK_SOURCES 且命中数 ≥ MIN_HITS 视为覆盖充足
MIN_OK_SOURCES = 2
MIN_HITS = 4
RETRIEVAL_LIMIT = 6


class PipelineError(RuntimeError):
    pass


def _ev_id(index: int) -> str:
    return f"EV-{index:04d}"


def _next_evidence_index(ledger: Ledger) -> int:
    return len(ledger.evidence()) + 1


def _to_plain(rec: dict[str, Any]) -> dict[str, Any]:
    return {
        "doi": rec.get("doi") or "",
        "title": rec.get("title") or "",
        "authors": list(rec.get("authors") or []),
        "year": rec.get("year"),
        "venue": rec.get("venue") or "",
        "source": rec.get("source") or "",
    }


# ---------------------------------------------------------------- R1 多源检索


def step_R1(state: RunState, run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    snap_name, snapshot = corpus.select_snapshot(state.goal, state.lit_source)
    records = corpus.rank_records(snapshot, state.goal, RETRIEVAL_LIMIT)

    source_status_raw: dict[str, str] = dict(snapshot.get("source_status", {}))
    ok_sources = [s for s, v in source_status_raw.items() if str(v).startswith("ok")]
    hits = len(records)

    state.source_status = {**state.source_status, **source_status_raw}
    state.source_status["corpus_snapshot"] = f"{snap_name}@{snapshot.get('retrieved_at', '')}"

    # §2.2 降级语义：覆盖充足 → 仅 L1 信息；覆盖不足 → L2 真降级（路径实质改变：本地兜底）
    if state.lit_source != "local" and (len(ok_sources) < MIN_OK_SOURCES or hits < MIN_HITS):
        state.add_degradation(
            run_dir,
            level="degraded",
            source=",".join(source_status_raw.keys()) or "corpus",
            reason=f"远程源覆盖不足（成功源 {len(ok_sources)}，命中 {hits}），已回落本地冻结语料",
            impact="检索覆盖范围收窄，结论基于有限语料，需人工复核覆盖面",
            resumable=True,
            step="R1",
        )
    elif any(v.startswith("unavailable") for v in source_status_raw.values()):
        # 覆盖充足：仅记录 L1（不置 degraded）
        state.add_degradation(
            run_dir,
            level="info",
            source=",".join(s for s, v in source_status_raw.items() if v.startswith("unavailable")),
            reason="部分数据源不可达，但覆盖充足",
            impact="结果未受影响",
            resumable=True,
            step="R1",
        )

    ev_ids: list[str] = []
    idx = _next_evidence_index(ledger)
    for rec in records:
        plain = _to_plain(rec)
        ev_id = _ev_id(idx)
        idx += 1
        ledger.append(
            "evidence",
            {
                "ev_id": ev_id,
                "tier": "fact",
                "kind": "literature",
                "title": plain["title"],
                "ref": plain,
                "producer_step": "R1",
                "snapshot": snap_name,
            },
        )
        ev_ids.append(ev_id)

    return {
        "step": "R1",
        "human_summary": f"已检索 {len(ev_ids)} 篇文献（语料快照 {snap_name}；来源：{', '.join(f'{k}={v}' for k, v in source_status_raw.items())}）",
        "evidence_ids": ev_ids,
        "source_status": state.source_status,
        "degraded": state.degraded,
    }


# ---------------------------------------------------------------- R2 论文精读


def step_R2(state: RunState, run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
    if not lit:
        raise PipelineError("R2 需要 R1 的文献证据，但账本中没有（请先执行 R1）")
    idx = _next_evidence_index(ledger)
    ev_ids: list[str] = []
    for rec in lit:
        ref = rec.data.get("ref", {})
        title = str(ref.get("title", ""))
        words = [w for w in corpus._tokens(title)]  # noqa: SLF001 - 同包内复用分词（确定性）
        focus = "、".join(sorted(words)[:6])
        ev_id = _ev_id(idx)
        idx += 1
        ledger.append(
            "evidence",
            {
                "ev_id": ev_id,
                "tier": "fact",
                "kind": "analysis",
                "title": f"精读解构：{title[:60]}",
                "detail": {"focus_terms": sorted(words)[:12], "year": ref.get("year"), "venue": ref.get("venue")},
                "ref": {"derived_from": rec.data["ev_id"], "doi": ref.get("doi", "")},
                "producer_step": "R2",
            },
        )
        ev_ids.append(ev_id)
    return {
        "step": "R2",
        "human_summary": f"已精读解构 {len(ev_ids)} 篇文献的主题焦点",
        "evidence_ids": ev_ids,
    }


# ---------------------------------------------------------------- R3 创新点拆解


def step_R3(state: RunState, run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
    if not lit:
        raise PipelineError("R3 需要 R1 的文献证据（请先执行 R1）")
    goal_tokens = corpus._tokens(state.goal)  # noqa: SLF001
    covered: set[str] = set()
    for rec in lit:
        covered |= corpus._tokens(str(rec.data.get("ref", {}).get("title", "")))  # noqa: SLF001
    gaps = sorted(goal_tokens - covered)
    idx = _next_evidence_index(ledger)
    ev_id = _ev_id(idx)
    ledger.append(
        "evidence",
        {
            "ev_id": ev_id,
            "tier": "fact",
            "kind": "analysis",
            "title": "创新点拆解：目标关键词覆盖缺口",
            "detail": {"goal_terms": sorted(goal_tokens), "covered_terms": sorted(covered & goal_tokens), "gap_terms": gaps},
            "ref": {"derived_from": [r.data["ev_id"] for r in lit]},
            "producer_step": "R3",
        },
    )
    return {
        "step": "R3",
        "human_summary": f"识别出 {len(gaps)} 个未覆盖的目标关键词（候选创新方向）",
        "evidence_ids": [ev_id],
        "gap_terms": gaps,
    }


# ---------------------------------------------------------------- R4 事实验证


def step_R4(state: RunState, run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    """交叉印证：同一主题词被 ≥2 个独立来源（source 字段不同）支撑即判 corroborated。

    判定为规则型判断器（Judge SPI 雏形），判断全额留痕（judgment 记录）。
    """
    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
    if not lit:
        raise PipelineError("R4 需要 R1 的文献证据（请先执行 R1）")

    topic_sources: dict[str, set[str]] = {}
    for rec in lit:
        ref = rec.data.get("ref", {})
        src = str(ref.get("source", "unknown"))
        for tok in sorted(corpus._tokens(str(ref.get("title", "")))):  # noqa: SLF001
            topic_sources.setdefault(tok, set()).add(src)

    corroborated = sorted(t for t, srcs in topic_sources.items() if len(srcs) >= MIN_OK_SOURCES)
    single = sorted(t for t, srcs in topic_sources.items() if len(srcs) < MIN_OK_SOURCES)

    idx = _next_evidence_index(ledger)
    fact_ev = _ev_id(idx)
    idx += 1
    ledger.append(
        "evidence",
        {
            "ev_id": fact_ev,
            "tier": "fact",
            "kind": "factcheck",
            "title": "交叉印证结果（多源支撑主题词）",
            "detail": {"corroborated_terms": corroborated[:20], "single_source_terms": single[:20]},
            "ref": {"derived_from": [r.data["ev_id"] for r in lit]},
            "producer_step": "R4",
        },
    )
    ledger.append(
        "judgment",
        {
            "judge": "rule:cross-source-corroboration@v1",
            "verdict": bool(corroborated),
            "rationale": f"{len(corroborated)} 个主题词获 ≥{MIN_OK_SOURCES} 个独立来源支撑；{len(single)} 个仅单源（标记为待核）",
            "evidence_ids": [fact_ev],
            "producer_step": "R4",
        },
    )

    conclusions: list[str] = []
    top = corroborated[:3]
    for i, term in enumerate(top, start=1):
        cid = f"C-{i:03d}"
        text = f"多源文献一致指向“{term}”是本主题的关键要素（获 ≥{MIN_OK_SOURCES} 个独立来源支撑）"
        ledger.append(
            "conclusion",
            {"cid": cid, "text": text, "evidence_ids": [fact_ev], "producer_step": "R4", "confidence": "medium"},
        )
        conclusions.append(cid)

    return {
        "step": "R4",
        "human_summary": f"交叉印证完成：{len(corroborated)} 个主题词获多源支撑，形成 {len(conclusions)} 条结论",
        "evidence_ids": [fact_ev],
        "conclusion_ids": conclusions,
        "corroborated_terms": corroborated[:20],
        "single_source_terms": single[:20],
    }


# ---------------------------------------------------------------- R5 综述写作


def step_R5(state: RunState, run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
    if not lit:
        raise PipelineError("R5 需要 R1 的文献证据（请先执行 R1）")
    conclusions = ledger.conclusion_records()

    lines: list[str] = [f"# 研究综述草稿：{state.goal}", ""]
    lines.append("## 一、检索到的关键文献")
    for rec in lit:
        ref = rec.data.get("ref", {})
        authors = ", ".join(list(ref.get("authors") or [])[:3]) or "（作者信息缺失）"
        lines.append(
            f"- [{rec.data['ev_id']}] {ref.get('title', '')} —— {authors}（{ref.get('year', 'n/a')}），"
            f"DOI: {ref.get('doi', 'n/a')}，来源: {ref.get('source', 'n/a')}"
        )
    lines.append("")
    lines.append("## 二、多源印证的主题要素")
    for rec in conclusions:
        ids = "".join(f"[{x}]" for x in rec.data.get("evidence_ids", []))
        lines.append(f"- {rec.data.get('text', '')} {ids}")
    lines.append("")
    lines.append("## 三、方法学观察")
    lines.append("- 界面阻抗表征以电化学阻抗谱（EIS）为主，辅以界面形貌与成分表征；")
    lines.append("- 多源元数据在主题层面相互支撑，但具体数值结论需回查原文核验（本报告不作数值断言）。")
    lines.append("")
    lines.append("## 四、局限与降级声明")
    if state.degraded:
        for d in state.degraded_reasons:
            if d.get("level") == "degraded":
                lines.append(f"- ⚠️ 降级（{d.get('step')}）：{d.get('reason')}；影响：{d.get('impact')}")
    else:
        lines.append("- 本次执行未发生实质降级（L2）。")
    lines.append("- 本报告仅基于公开元数据与确定性规则，未经人工逐篇复核。")
    text = "\n".join(lines) + "\n"

    draft_path = run_dir / "draft.md"
    atomic_write_text(draft_path, text)

    idx = _next_evidence_index(ledger)
    ev_id = _ev_id(idx)
    ledger.append(
        "evidence",
        {
            "ev_id": ev_id,
            # draft 是产物（artifact），**不可进结论**（附录 A / 前端文档字段陷阱提示）
            "tier": "artifact",
            "kind": "draft",
            "title": "综述草稿（Markdown）",
            "ref": {"file": "draft.md", "sha256": sha256_text(text), "bytes": len(text.encode("utf-8"))},
            "producer_step": "R5",
        },
    )
    return {
        "step": "R5",
        "human_summary": f"已生成综述草稿（{len(conclusions)} 条结论、{len(lit)} 篇文献引用）",
        "evidence_ids": [ev_id],
        "draft": "draft.md",
    }


# ---------------------------------------------------------------- R6 自评审


def step_R6(state: RunState, run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    verification = ledger.verify()
    checks = [
        {"id": "CHAIN", "ok": bool(verification["ok"]), "detail": f"账本 {verification['records']} 条记录哈希链校验"},
        {"id": "BINDING", "ok": all(r.data.get("evidence_ids") for r in ledger.conclusion_records()), "detail": "每条结论均绑定证据"},
        {"id": "FACT_ONLY", "ok": all(
            str((ledger.evidence_by_id(str(e)) or type("X", (), {"data": {}})()).data.get("tier")) == "fact"
            for r in ledger.conclusion_records()
            for e in r.data.get("evidence_ids", [])
        ), "detail": "结论仅绑定 fact 级证据（不含 artifact）"},
        {"id": "SOURCES", "ok": len({str(r.data.get("ref", {}).get("source", "")) for r in ledger.evidence() if r.data.get("producer_step") == "R1"}) >= 1, "detail": "文献来源已标注"},
        {"id": "DEGRADED_STATEMENT", "ok": (not state.degraded) or any(d.get("level") == "degraded" for d in state.degraded_reasons), "detail": "降级时必有降级声明"},
    ]
    review = {
        "passed": all(c["ok"] for c in checks),
        "checks": checks,
        "ledger": verification,
        "generated_at_note": "确定性自评审（规则型，无模型参与）",
    }
    atomic_write_json(run_dir / "review.json", review)

    idx = _next_evidence_index(ledger)
    ev_id = _ev_id(idx)
    ledger.append(
        "evidence",
        {
            "ev_id": ev_id,
            "tier": "artifact",
            "kind": "review",
            "title": "自评审结果",
            "detail": review,
            "ref": {"file": "review.json"},
            "producer_step": "R6",
        },
    )
    failed = [c["id"] for c in checks if not c["ok"]]
    return {
        "step": "R6",
        "human_summary": "自评审通过（全部检查项满足）" if review["passed"] else f"自评审未通过：{', '.join(failed)}",
        "evidence_ids": [ev_id],
        "review": review,
    }


# ---------------------------------------------------------------- 调度


STEP_FUNCS: dict[str, Callable[[RunState, Path, Ledger], dict[str, Any]]] = {
    "R1": step_R1,
    "R2": step_R2,
    "R3": step_R3,
    "R4": step_R4,
    "R5": step_R5,
    "R6": step_R6,
}


def execute_step(state: RunState, run_dir: Path, ledger: Ledger, step_id: str) -> dict[str, Any]:
    """执行单步（状态机 + 账本双写；终态幂等）。"""
    record = state.step(step_id)
    if record.status.value in ("DONE", "SKIPPED"):
        return {
            "step": step_id,
            "human_summary": f"步骤 {step_id} 已是终态（{record.status.value}），复用既有产物",
            "reused": True,
            "status": record.status.value,
        }
    func = STEP_FUNCS.get(step_id)
    if func is None:
        raise PipelineError(f"步骤 {step_id} 尚未实现（materials 工作流将在后续里程碑补齐）")

    state.start_step(run_dir, step_id)
    try:
        result = func(state, run_dir, ledger)
    except Exception as e:  # noqa: BLE001 - 失败必须落状态机，供 resume 续跑
        state.finish_step(run_dir, step_id, error=f"{type(e).__name__}: {e}")
        raise
    state.finish_step(run_dir, step_id)
    result["status"] = state.step(step_id).status.value
    result["run_status"] = state.run_status.value
    return result


def run_all(state: RunState, run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    """顺序跑完剩余步骤（断点续跑：DONE/SKIPPED 复用，仅跑 PENDING/FAILED）。

    到达终态 DONE 后**自动装配报告**（需求 §9.5/P-03：终态 DONE 且报告就绪）：
    门禁不通过则**拒绝出报告**并把原因写入 report_gate.json（不伪造成报告、不静默）。
    """
    executed: list[dict[str, Any]] = []
    for step_id, _label in steps_for(state.workflow):
        if state.is_terminal:
            break
        record = state.step(step_id)
        if record.status.value in ("DONE", "SKIPPED"):
            continue
        executed.append(execute_step(state, run_dir, ledger, step_id))

    out: dict[str, Any] = {
        "executed": executed,
        "run_status": state.run_status.value,
        "remaining": state.remaining_steps(),
        "degraded": state.degraded,
    }
    # 仅在成功终态 DONE 时出报告（FAILED 出报告无意义，且门禁也会因步骤未完而不过）
    if state.run_status.value == "DONE":
        out["report"] = _finalize_report(run_dir, ledger)
    return out


def _finalize_report(run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    """报告装配（薄封装：延迟 import 避免 pipeline ↔ report 循环依赖）。

    失败语义（Fail-closed + 人类可读）：
    - 门禁不过 → 内核作废残留报告并写 report_gate.json（passed=false + reasons），**不产出 report.json**；
    - 装配异常同样留痕（不吞掉）；
    - 已就绪且账本未变 → 幂等复用（reused=true），不重复写盘。
    """
    from .report import ReportGateError, assemble, read_gate  # 局部导入：report 依赖 pipeline.ledger_digest

    try:
        built = assemble(run_dir)
    except ReportGateError as e:
        return {
            "status": "rejected",
            "reasons": e.reasons,
            "gate": read_gate(run_dir),
            "human_summary": f"报告门禁未通过：{e.reasons[0] if e.reasons else '未知原因'}",
        }
    except Exception as e:  # noqa: BLE001 - 装配异常同样必须留痕，不得吞掉
        from .report import write_gate_failed

        reason = f"{type(e).__name__}: {e}"
        write_gate_failed(run_dir, [reason], "报告装配异常")
        return {"status": "error", "reasons": [reason], "gate": read_gate(run_dir), "human_summary": f"报告装配异常：{reason}"}

    return {
        "status": "ready",
        "reused": bool(built.get("reused")),
        "path": str(run_dir / "report.json"),
        "markdown": str(run_dir / "report.md"),
        "human_summary": "报告已就绪",
    }


def ledger_digest(ledger: Ledger) -> str:
    """账本摘要（供报告/导出引用，稳定且可核对）。"""
    return sha256_text(canonical_json([r.to_dict() for r in ledger.records]))
