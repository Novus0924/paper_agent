"""证据账本：append-only 哈希链（需求文档 §3.1 可审计/可溯源、§9.5 门禁、§11 防篡改）。

结构（链式防篡改，可独立重算）：
    chain_hash_0 = GENESIS（全 0）
    chain_hash_n = sha256(chain_hash_{n-1} + canonical_json(record_n 去掉 chain_hash 字段))

记录类型（record_type）：
    - evidence  证据条目（附录 A：tier ∈ {fact, artifact}；kind ∈ {literature,data,analysis,note,factcheck,draft,review}）
    - judgment  模型/规则判断（受控判断点，全额留痕）
    - conclusion 结论（必须绑定 fact 级证据 id）
    - note      过程备注（人类可读活动）

不变式（由 verify() 校验）：
    1. seq 连续自 1 递增；
    2. 每条 chain_hash 与重算值一致；
    3. 每条记录引用的证据 id 必须已存在（结论 → 证据绑定完整性）；
    4. 可进结论的 evidence 必须 tier == "fact"。
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .jsonio import GENESIS_HASH, append_line, canonical_json, read_json, sha256_text

LEDGER_FILE = "ledger.jsonl"

RECORD_TYPES = ("evidence", "judgment", "conclusion", "note")
EVIDENCE_TIERS = ("fact", "artifact")
EVIDENCE_KINDS = ("literature", "data", "analysis", "note", "factcheck", "draft", "review")
DEGRADED_LEVELS = ("info", "degraded")


class LedgerError(RuntimeError):
    """账本结构/引用/门禁违规。"""


@dataclass
class LedgerRecord:
    seq: int
    record_type: str
    data: dict[str, Any]
    chain_hash: str
    at: str

    def to_dict(self) -> dict[str, Any]:
        return {"seq": self.seq, "record_type": self.record_type, "at": self.at, **self.data, "chain_hash": self.chain_hash}


class Ledger:
    """单 run 账本（runs/<task_id>/ledger.jsonl）。"""

    def __init__(self, run_dir: Path) -> None:
        self.path = run_dir / LEDGER_FILE
        self._records: list[LedgerRecord] = []
        self._load()

    # ---------- 读 ----------

    def _load(self) -> None:
        self._records = []
        if not self.path.exists():
            return
        with open(self.path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                obj = read_json_str(line)
                self._records.append(
                    LedgerRecord(
                        seq=int(obj["seq"]),
                        record_type=str(obj["record_type"]),
                        data={k: v for k, v in obj.items() if k not in ("seq", "record_type", "chain_hash", "at")},
                        chain_hash=str(obj["chain_hash"]),
                        at=str(obj.get("at", "")),
                    )
                )

    @property
    def records(self) -> list[LedgerRecord]:
        return list(self._records)

    def last_hash(self) -> str:
        return self._records[-1].chain_hash if self._records else GENESIS_HASH

    def evidence(self) -> list[LedgerRecord]:
        return [r for r in self._records if r.record_type == "evidence"]

    def conclusion_records(self) -> list[LedgerRecord]:
        return [r for r in self._records if r.record_type == "conclusion"]

    def judgments(self) -> list[LedgerRecord]:
        return [r for r in self._records if r.record_type == "judgment"]

    def find(self, record_type: str, key: str, value: str) -> LedgerRecord | None:
        for r in self._records:
            if r.record_type == record_type and str(r.data.get(key)) == value:
                return r
        return None

    def evidence_by_id(self, ev_id: str) -> LedgerRecord | None:
        return self.find("evidence", "ev_id", ev_id)

    # ---------- 写 ----------

    def append(self, record_type: str, data: dict[str, Any]) -> LedgerRecord:
        if record_type not in RECORD_TYPES:
            raise LedgerError(f"非法记录类型：{record_type}（允许：{' | '.join(RECORD_TYPES)}）")
        seq = len(self._records) + 1
        payload = _validate_payload(record_type, data, self)
        at = str(payload.pop("at", "")) or _utc_now()
        body = {"seq": seq, "record_type": record_type, "at": at, **payload}
        chain = sha256_text(self.last_hash() + canonical_json(body))
        record = LedgerRecord(seq=seq, record_type=record_type, data=payload, chain_hash=chain, at=at)
        append_line(self.path, canonical_json(record.to_dict()))
        self._records.append(record)
        return record

    def __len__(self) -> int:
        return len(self._records)

    # ---------- 校验 ----------

    def verify(self) -> dict[str, Any]:
        """独立重算哈希链 + 校验引用完整性。返回结构化结果（供报告门禁与 sciret_verify 使用）。"""
        prev = GENESIS_HASH
        problems: list[dict[str, Any]] = []
        known_evidence: set[str] = set()
        for idx, r in enumerate(self._records):
            body = {"seq": r.seq, "record_type": r.record_type, "at": r.at, **r.data}
            expect = sha256_text(prev + canonical_json(body))
            if r.seq != idx + 1:
                problems.append({"seq": r.seq, "kind": "SEQUENCE", "detail": f"期望 seq={idx + 1}"})
            if expect != r.chain_hash:
                problems.append({"seq": r.seq, "kind": "CHAIN_MISMATCH", "detail": "chain_hash 与重算值不一致（疑似篡改）"})
            if r.record_type == "evidence":
                ev_id = str(r.data.get("ev_id", ""))
                if ev_id in known_evidence:
                    problems.append({"seq": r.seq, "kind": "DUPLICATE_EVIDENCE", "detail": ev_id})
                known_evidence.add(ev_id)
            if r.record_type == "conclusion":
                ids = list(r.data.get("evidence_ids", []))
                if not ids:
                    problems.append({"seq": r.seq, "kind": "CONCLUSION_UNBOUND", "detail": str(r.data.get("cid", ""))})
                for ev_id in ids:
                    ev = self.evidence_by_id(str(ev_id))
                    if ev is None:
                        problems.append({"seq": r.seq, "kind": "MISSING_EVIDENCE", "detail": str(ev_id)})
                    elif str(ev.data.get("tier")) != "fact":
                        problems.append(
                            {"seq": r.seq, "kind": "NON_FACT_EVIDENCE", "detail": f"{ev_id} tier={ev.data.get('tier')}"}
                        )
            prev = r.chain_hash
        return {
            "ok": not problems,
            "records": len(self._records),
            "chain_head": self.last_hash(),
            "problems": problems,
            "evidence_count": len(known_evidence),
        }


def _utc_now() -> str:
    import time

    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json_str(text: str) -> dict[str, Any]:
    import json

    return json.loads(text)


def _validate_payload(record_type: str, data: dict[str, Any], ledger: Ledger) -> dict[str, Any]:
    payload = dict(data)
    if record_type == "evidence":
        tier = str(payload.get("tier", ""))
        kind = str(payload.get("kind", ""))
        if tier not in EVIDENCE_TIERS:
            raise LedgerError(f"evidence.tier 非法：{tier}（允许：{' | '.join(EVIDENCE_TIERS)}）")
        if kind not in EVIDENCE_KINDS:
            raise LedgerError(f"evidence.kind 非法：{kind}（允许：{' | '.join(EVIDENCE_KINDS)}）")
        for key in ("ev_id", "ref", "producer_step"):
            if not str(payload.get(key, "")).strip():
                raise LedgerError(f"evidence 缺少必填字段：{key}")
        payload.setdefault("sha256", sha256_text(canonical_json({k: v for k, v in payload.items() if k != "sha256"})))
    elif record_type == "conclusion":
        if not str(payload.get("cid", "")).strip():
            raise LedgerError("conclusion 缺少 cid")
        if not str(payload.get("text", "")).strip():
            raise LedgerError("conclusion 缺少 text")
        ids: Iterable[Any] = payload.get("evidence_ids", [])
        payload["evidence_ids"] = [str(x) for x in ids]
        # Fail-closed：未绑定证据的结论不允许写入账本（§9.5 结论 100% 绑定证据）
        if not payload["evidence_ids"]:
            raise LedgerError(f"conclusion {payload['cid']} 未绑定任何证据（必须绑定 fact 级证据）")
    elif record_type == "judgment":
        if not str(payload.get("judge", "")).strip():
            raise LedgerError("judgment 缺少 judge（判断器标识）")
        if "verdict" not in payload:
            raise LedgerError("judgment 缺少 verdict")
    elif record_type == "note":
        if not str(payload.get("text", "")).strip():
            raise LedgerError("note 缺少 text")
    return payload
