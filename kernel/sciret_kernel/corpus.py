"""本地冻结语料（离线可复现演示的基础）。

- 语料来源：`kernel/tools/fetch_corpus.py` 从 Crossref / OpenAlex 抓取并冻结的**真实元数据**快照；
- 只含元数据（DOI/标题/作者/年份/期刊/来源），**不含论文全文**（合规 §11）；
- 排序与选取完全确定性（关键词覆盖打分 + DOI 字典序），保证相同输入可复现。
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

CORPUS_DIR = Path(__file__).resolve().parent / "corpus"

_STOPWORDS = {
    "the", "of", "and", "for", "in", "on", "with", "a", "an", "to", "by", "via", "using",
    "study", "review", "方法", "研究", "的", "与", "和", "及", "对", "中", "一种",
}

_CJK_RE = re.compile(r"[\u4e00-\u9fff]+")
_ASCII_RE = re.compile(r"[A-Za-z][A-Za-z0-9\-]{2,}")


def _tokens(text: str) -> set[str]:
    """确定性分词：英文取词（≥3 字符），中文取 2-gram 滑窗（无需第三方分词库）。

    中文若整串作为一个 token，会导致"缺口分析"退化为整句比较（实测问题），故采用 bigram。
    """
    text = text or ""
    out: set[str] = set()
    for w in _ASCII_RE.findall(text):
        lw = w.lower()
        if lw not in _STOPWORDS:
            out.add(lw)
    for run in _CJK_RE.findall(text):
        if len(run) == 1:
            continue
        for i in range(len(run) - 1):
            bg = run[i : i + 2]
            if bg not in _STOPWORDS:
                out.add(bg)
    return out


def available_snapshots() -> list[str]:
    if not CORPUS_DIR.exists():
        return []
    return sorted(p.stem for p in CORPUS_DIR.glob("*.json"))


def load_snapshot(name: str) -> dict[str, Any]:
    path = CORPUS_DIR / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"语料快照不存在：{path}（可用：{', '.join(available_snapshots()) or '无'}）")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def rank_records(snapshot: dict[str, Any], goal: str, limit: int = 6) -> list[dict[str, Any]]:
    """按与目标的关键词覆盖度打分排序（确定性：分数降序 → DOI 升序）。"""
    goal_tokens = _tokens(goal)
    scored: list[tuple[int, str, dict[str, Any]]] = []
    for rec in snapshot.get("records", []):
        rec_tokens = _tokens(str(rec.get("title", ""))) | _tokens(" ".join(rec.get("authors", []) or []))
        score = len(goal_tokens & rec_tokens)
        # 年份可作为次级可复现排序键（不参与内容哈希）
        scored.append((score, str(rec.get("doi", "")).lower(), rec))
    scored.sort(key=lambda x: (-x[0], x[1]))
    return [rec for _, _, rec in scored[:limit]]


def select_snapshot(goal: str, lit_source: str) -> tuple[str, dict[str, Any]]:
    """选择语料快照：本地/离线模式按可用快照取第一个；auto 模式优先匹配关键词。"""
    names = available_snapshots()
    if not names:
        raise FileNotFoundError("未找到任何语料快照，请先运行 kernel/tools/fetch_corpus.py 冻结真实元数据")
    if lit_source == "local":
        return names[0], load_snapshot(names[0])
    goal_tokens = _tokens(goal)
    best = max(names, key=lambda n: (len(goal_tokens & _tokens(n.replace("-", " "))), n))
    return best, load_snapshot(best)
