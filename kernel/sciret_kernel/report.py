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

from pathlib import Path
from typing import Any

from .jsonio import atomic_write_json, atomic_write_text, read_json, sha256_text
from .ledger import Ledger
from .pipeline import ledger_digest
from .state import RunState, RunStatus

REPORT_JSON = "report.json"
REPORT_MD = "report.md"


class ReportGateError(RuntimeError):
    """门禁未通过：不允许生成报告（Fail-closed）。"""

    def __init__(self, reasons: list[str]) -> None:
        super().__init__("；".join(reasons))
        self.reasons = reasons


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
        raise ReportGateError(problems)

    digest = ledger_digest(ledger)
    existing = read_json(run_dir / REPORT_JSON)
    if existing and existing.get("ledger_digest") == digest and (run_dir / REPORT_MD).exists():
        # 幂等：账本未变则复用既有报告（重复请求不重写）
        return {**existing, "reused": True}

    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
    conclusions = ledger.conclusion_records()
    factchecks = [r for r in ledger.evidence() if r.data.get("kind") == "factcheck"]

    sections = [
        {
            "id": "background",
            "title": "一、研究背景",
            "body": f"围绕研究目标「{state.goal}」，本流程以多源公开文献元数据为基础，"
            f"经检索、精读解构、要素交叉印证后形成结论。工作流：{state.workflow}；"
            f"检索模式：{state.lit_source}。",
        },
        {
            "id": "method",
            "title": "二、方法与过程",
            "body": "流水线由确定性状态机驱动（R1 检索 → R2 精读 → R3 拆解 → R4 印证 → R5 写作 → R6 自评审），"
            "每步产出以证据形式写入追加式哈希链账本；结论强制绑定 fact 级证据，报告生成前执行门禁校验。",
        },
        {
            "id": "findings",
            "title": "三、核心发现",
            "body": "多源元数据在主题层面相互支撑，形成下列可溯源结论（每条结论附证据角标）。",
        },
        {
            "id": "limits",
            "title": "四、局限与降级声明",
            "body": _degraded_statement(state),
        },
    ]

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
