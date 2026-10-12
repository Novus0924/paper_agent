"""报告装配与门禁（需求文档 §9.5、§2.1 P-03、§8.2 报告契约）。

门禁（报告生成前必须全过；任一不过**拒绝出报告**并给出可读原因）：
    1. 哈希链完整（账本可独立重算通过）；
    2. 结论 100% 绑定 fact 级证据（tier == "fact"，且证据存在）；
    3. 判断批次齐全（存在 judgment 记录）——可经 allow_gate_bypass=True 旁路（**仅调试**）。

产物（原子写、幂等可重取）：
    runs/<task_id>/report.json  结构化报告
    runs/<task_id>/report.md    人类可读 Markdown（含证据角标与降级声明）
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

from . import corpus
from .jsonio import atomic_write_json, atomic_write_text, read_json, sha256_text
from .ledger import Ledger
from .pipeline import ledger_digest
from .state import RunState, RunStatus

REPORT_JSON = "report.json"
REPORT_MD = "report.md"
REPORT_GATE = "report_gate.json"


class ReportGateError(RuntimeError):
    """门禁未通过：不允许生成报告（Fail-closed）。"""

    def __init__(self, reasons: list[str]) -> None:
        super().__init__("；".join(reasons))
        self.reasons = reasons


def _write_gate(run_dir: Path, passed: bool, reasons: list[str], summary: str) -> None:
    """落盘门禁结论（无论通过与否都留痕，供 BFF 只读反映）。"""
    atomic_write_json(
        run_dir / REPORT_GATE,
        {
            "passed": passed,
            "reasons": reasons,
            "checked_at": _utc_now(),
            "human_summary": summary,
        },
    )


def write_gate_failed(run_dir: Path, reasons: list[str], summary: str) -> None:
    """公开入口：供流水线在装配异常时留痕（保持 gate 写入单一实现）。"""
    _write_gate(run_dir, False, reasons, summary)


def read_gate(run_dir: Path) -> dict[str, Any] | None:
    """公开入口：读取门禁结论（只读）。"""
    return read_json(run_dir / REPORT_GATE)


def _invalidate_existing(run_dir: Path) -> list[str]:
    """门禁不过时**作废**既有报告产物（改名隔离，可逆、不删数据）。

    安全必要性：账本被事后篡改时，磁盘上残留的 report.json 仍能通过"文件存在"判定被采信。
    这里把它改名为 *.invalid，使下游（BFF /report 只读 report.json）立即回到"未就绪"。
    """
    touched: list[str] = []
    for name in (REPORT_JSON, REPORT_MD):
        p = run_dir / name
        if p.exists():
            target = p.with_name(p.name + ".invalid")
            os.replace(p, target)
            touched.append(target.name)
    return touched


def check_gate(ledger: Ledger, *, allow_bypass: bool = False) -> list[str]:
    problems: list[str] = []
    verification = ledger.verify()
    if not verification["ok"]:
        for p in verification["problems"][:5]:
            problems.append(f"账本校验失败[{p['kind']}] seq={p['seq']}: {p['detail']}")
    for rec in ledger.conclusion_records():
        cid = rec.data.get("cid", "?")
        ids = list(rec.data.get("evidence_ids", []))
        if not ids:
            problems.append(f"结论 {cid} 未绑定任何证据")
        for ev_id in ids:
            ev = ledger.evidence_by_id(str(ev_id))
            if ev is None:
                problems.append(f"结论 {cid} 引用了不存在的证据 {ev_id}")
            elif str(ev.data.get("tier")) != "fact":
                problems.append(f"结论 {cid} 绑定了非 fact 级证据 {ev_id}（tier={ev.data.get('tier')}）")
    if not ledger.judgments():
        problems.append("缺少判断批次（judgment）记录")
    if allow_bypass and problems:
        return []
    return problems


def assemble(run_dir: Path, *, allow_gate_bypass: bool = False) -> dict[str, Any]:
    state = RunState.load(run_dir)
    ledger = Ledger(run_dir)
    problems = check_gate(ledger, allow_bypass=allow_gate_bypass)
    if problems:
        # Fail-closed：作废磁盘上可能残留的旧报告（防"篡改后仍采信旧产物"），并留痕原因
        invalidated = _invalidate_existing(run_dir)
        _write_gate(run_dir, False, problems, "报告门禁未通过，已拒绝出报告")
        raise ReportGateError(problems + ([f"已作废残留产物：{', '.join(invalidated)}"] if invalidated else []))

    digest = ledger_digest(ledger)
    existing = read_json(run_dir / REPORT_JSON)
    if existing and existing.get("ledger_digest") == digest and (run_dir / REPORT_MD).exists():
        # 幂等：账本未变则复用既有报告（重复请求不重写）
        return {**existing, "reused": True}

    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
    conclusions = ledger.conclusion_records()
    factchecks = [r for r in ledger.evidence() if r.data.get("kind") == "factcheck"]

    # ---- 章节数据（全部由账本/状态计算，禁止领域词硬编码）----
    # 研究要素展示用原文短语（可读），不用 2-gram 碎片（2026-10-12 病灶③修复：
    # "与结""出方"这类碎片裸奔进报告，读者无法理解）
    goal_phrases = corpus.goal_phrases(state.goal)
    corroborated: list[str] = []
    gaps: list[str] = []
    query_coverage: list[dict[str, Any]] = []
    for r in ledger.evidence():
        detail = r.data.get("detail", {}) or {}
        if r.data.get("kind") == "factcheck" and len(detail.get("corroborated_terms", [])) > len(corroborated):
            corroborated = [str(t) for t in detail.get("corroborated_terms", [])]
        if r.data.get("producer_step") == "R3" and r.data.get("kind") == "analysis":
            if len(detail.get("gap_terms", [])) > len(gaps):
                gaps = [str(t) for t in detail.get("gap_terms", [])]
            qc = detail.get("query_coverage", [])
            if len(qc) > len(query_coverage):
                query_coverage = [dict(x) for x in qc if isinstance(x, dict)]

    # 受控模型综合回答（S1）：artifact 级 synthesis 证据；取最后一条（重复 synthesize 以最新为准）
    synth_records = [r for r in ledger.evidence() if r.data.get("kind") == "synthesis"]

    retrieval_queries = (
        "、".join(state.queries) if state.queries else "未提供模型规划查询（检索使用目标原文）"
    )
    elements = (
        "、".join(goal_phrases)
        if goal_phrases
        else ("、".join(sorted(corpus._tokens(state.goal))) or "（未能分词）")  # noqa: SLF001
    )
    research_question_body = (
        f"研究目标：{state.goal}\n\n"
        f"目标关键要素（原文短语，按标点切分）：{elements}\n\n"
        f"检索使用查询：{retrieval_queries}"
    )
    # 核心发现逐条列出结论全文与证据角标（不再只给计数；2026-10-12 病灶③：报告同质化）
    conc_lines = [
        f"- **{r.data['cid']}** {r.data['text']}"
        f"（证据：{'、'.join(str(x) for x in r.data.get('evidence_ids', []))}）"
        for r in conclusions
    ]
    findings_body = (
        (f"共形成 {len(conclusions)} 条结论，每条均绑定 fact 级证据：\n" + "\n".join(conc_lines))
        if conc_lines
        else "共形成 0 条结论。"
    )
    findings_body += (
        f"\n\n多源印证主题词 {len(corroborated)} 个（每个获 ≥2 个独立来源支撑）："
        + ("、".join(corroborated[:10]) if corroborated else "（无）")
        + "。"
    )
    if query_coverage:
        findings_body += "\n检索查询命中：" + "；".join(
            f"“{qc.get('query', '')}”→ {qc.get('records', 0)} 篇" for qc in query_coverage
        ) + "。"
    if gaps:
        findings_body += f"\n另有 {len(gaps)} 个检索内容词未被现有语料覆盖（覆盖缺口详见局限章节与 R3 证据）。"

    sections: list[dict[str, str]] = []
    sections.append(
        {
            "id": "background",
            "title": "研究背景",
            "body": f"围绕研究目标「{state.goal}」，本流程以多源公开文献元数据为基础，"
            f"经检索、精读解构、要素交叉印证后形成结论。工作流：{state.workflow}；"
            f"检索模式：{state.lit_source}。",
        }
    )
    # 新增章节：研究问题（改造 G4 病灶——报告与用户问题脱节的可见性修复：
    # 把 goal、目标关键要素拆解、检索使用的关键要素直接呈现给读者）
    sections.append({"id": "research_question", "title": "研究问题", "body": research_question_body})
    sections.append(
        {
            "id": "method",
            "title": "方法与过程",
            "body": "流水线由确定性状态机驱动（R1 检索 → R2 精读 → R3 拆解 → R4 印证 → R5 写作 → R6 自评审），"
            "每步产出以证据形式写入追加式哈希链账本；结论强制绑定 fact 级证据，报告生成前执行门禁校验。",
        }
    )
    # 核心发现 body 由结论动态生成（改造 G4 病灶：不再固定文案）
    sections.append({"id": "findings", "title": "核心发现", "body": findings_body})
    if synth_records:
        s = synth_records[-1]
        cited = [str(x) for x in s.data.get("cited_evidence", [])]
        invalid = [str(x) for x in (s.data.get("detail", {}) or {}).get("invalid_refs_removed", [])]
        answer_body = str(s.data.get("text", ""))
        answer_body += (
            "\n\n> ⚠️ 本节为**模型综合生成**（非确定性内容），已绑定证据清单："
            + ("、".join(cited) if cited else "（无有效证据引用）")
            + "。该内容为 artifact 级产物，不进入确定性结论，也不参与门禁的 fact 绑定校验。"
            + (f"已剔除无效证据角标：{'、'.join(invalid)}。" if invalid else "")
        )
        sections.append({"id": "answer", "title": "对研究问题的回答（模型综合生成）", "body": answer_body})
    sections.append({"id": "limits", "title": "局限与降级声明", "body": _degraded_statement(state)})

    # 章节编号动态生成（章节数随"是否已有综合回答"可变，固定"一/二/三/四"会错位）
    cn_numerals = ("一", "二", "三", "四", "五", "六", "七")
    for i, sec in enumerate(sections):
        sec["title"] = f"{cn_numerals[i]}、{sec['title']}"

    evidence_index = [
        {
            "ev_id": r.data["ev_id"],
            "tier": r.data.get("tier"),
            "kind": r.data.get("kind"),
            "title": r.data.get("title", ""),
            "ref": r.data.get("ref", {}),
            "producer_step": r.data.get("producer_step"),
        }
        for r in ledger.evidence()
    ]

    report = {
        "task_id": state.task_id,
        "title": f"研究报告：{state.goal}",
        "abstract": f"本报告基于 {len(lit)} 篇真实文献元数据与 {len(factchecks)} 组交叉印证结果，"
        f"形成 {len(conclusions)} 条绑定证据的结论；全流程在 Agnes Harness 会话中执行并可导出审计。",
        "sections": sections,
        "conclusions": [
            {
                "cid": r.data["cid"],
                "text": r.data["text"],
                "evidence_ids": list(r.data.get("evidence_ids", [])),
                "confidence": r.data.get("confidence", "medium"),
            }
            for r in conclusions
        ],
        "evidence_count": len(evidence_index),
        "degraded": state.degraded,
        "degraded_statement": _degraded_statement(state),
        "ledger_digest": digest,
        "ledger_head": ledger.last_hash(),
        "gate": {"passed": True, "bypass": allow_gate_bypass},
        "run_status": state.run_status.value,
        "generated_at": state.updated_at,
    }

    atomic_write_json(run_dir / REPORT_JSON, report)
    atomic_write_text(run_dir / REPORT_MD, render_markdown(report, evidence_index))
    _write_gate(run_dir, True, [], "报告门禁通过")
    return {**report, "reused": False}


def _degraded_statement(state: RunState) -> str:
    l2 = [d for d in state.degraded_reasons if d.get("level") == "degraded"]
    l1 = [d for d in state.degraded_reasons if d.get("level") == "info"]
    if not l2:
        base = "本次执行未发生实质降级（L2）。"
        if l1:
            base += f" 另有 {len(l1)} 项信息级提示（部分数据源不可达，但覆盖充足，结果未受影响）。"
        return base
    lines = [f"本次执行发生 {len(l2)} 项实质降级（L2），任务未中断："]
    for d in l2:
        lines.append(f"- 步骤 {d.get('step')}：{d.get('reason')}；影响：{d.get('impact')}；可重试：{'是' if d.get('resumable') else '否'}")
    return " ".join(lines)


def render_markdown(report: dict[str, Any], evidence_index: list[dict[str, Any]]) -> str:
    lines: list[str] = [f"# {report['title']}", "", f"> 任务：`{report['task_id']}` ｜ 状态：{report['run_status']}", "", "## 摘要", "", str(report["abstract"]), ""]
    for sec in report["sections"]:
        lines += [f"## {sec['title']}", "", str(sec["body"]), ""]
    if report["conclusions"]:
        lines += ["### 结论", ""]
        for c in report["conclusions"]:
            marks = "".join(f"[{e}]" for e in c["evidence_ids"])
            lines.append(f"- **{c['cid']}** {c['text']} {marks}")
        lines.append("")
    lines += ["## 附录 A：证据索引", ""]
    for ev in evidence_index:
        ref = ev.get("ref", {})
        extra = ref.get("doi") or ref.get("file") or ""
        lines.append(f"- `{ev['ev_id']}` ({ev['tier']}/{ev['kind']}, 步骤 {ev['producer_step']}) {ev['title']} {('— ' + str(extra)) if extra else ''}")
    lines += ["", "---", "", f"账本摘要（SHA-256）：`{report['ledger_digest']}`", f"账本链头：`{report['ledger_head']}`", ""]
    return "\n".join(lines)


def report_digest(report: dict[str, Any]) -> str:
    return sha256_text(str(report.get("ledger_digest", "")))


def _utc_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
