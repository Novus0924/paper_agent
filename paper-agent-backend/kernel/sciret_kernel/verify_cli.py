"""校验与引用回查（对应接口 `GET /cite?ev=` 与 `sciret_verify`）。

- verify_run：重算哈希链 + 结论绑定完整性 + 证据统计（只读，不修改任何产物）；
- cite_lookup：按 EV 编号回查文献 DOI/作者/年份，或产物哈希前缀（§9.6 验收）。
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .ledger import Ledger
from .state import RunState


def verify_run(run_dir: Path) -> dict[str, Any]:
    ledger = Ledger(run_dir)
    result = ledger.verify()
    state_exists = (RunState.path(run_dir)).exists()
    state = RunState.load(run_dir) if state_exists else None
    return {
        "ok": bool(result["ok"]),
        "tool": "verify",
        "ledger": result,
        "evidence_count": len(ledger.evidence()),
        "conclusion_count": len(ledger.conclusion_records()),
        "judgment_count": len(ledger.judgments()),
        "run_status": state.run_status.value if state else None,
        "human_summary": "哈希链校验通过" if result["ok"] else f"哈希链校验失败：{len(result['problems'])} 处问题",
    }


def cite_lookup(run_dir: Path, ev_id: str) -> dict[str, Any]:
    ledger = Ledger(run_dir)
    rec = ledger.evidence_by_id(ev_id)
    if rec is None:
        return {"ok": False, "error": f"未找到证据 {ev_id}", "available": [r.data.get("ev_id") for r in ledger.evidence()][:20]}
    data = rec.data
    ref = data.get("ref", {}) or {}
    citation = {
        "ev_id": data.get("ev_id"),
        "tier": data.get("tier"),
        "kind": data.get("kind"),
        "title": data.get("title", ""),
        "producer_step": data.get("producer_step"),
        "doi": ref.get("doi") or None,
        "authors": ref.get("authors") or ([ref.get("derived_from")] if ref.get("derived_from") else []),
        "year": ref.get("year"),
        "venue": ref.get("venue"),
        "source": ref.get("source"),
        "file": ref.get("file"),
        "sha256": ref.get("sha256") or data.get("sha256"),
        "chain_hash": rec.chain_hash,
    }
    return {"ok": True, "tool": "cite", "citation": citation}
