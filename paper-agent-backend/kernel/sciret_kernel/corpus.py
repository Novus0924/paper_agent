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
#: 目标原文短语切分：中英文标点 + 空白（供 goal_phrases 还原可读短语）
_CJK_PHRASE_SPLIT_RE = re.compile(r"[，。？！；、：,.;?!:()\[\]【】（）\s]+")

_DOI_PREFIX_RE = re.compile(r"^https?://(dx\.)?doi\.org/", re.IGNORECASE)
_TITLE_PUNCT_RE = re.compile(r"[^\w\u4e00-\u9fff]+", re.UNICODE)


def _norm_doi(doi: str) -> str:
    """DOI 规范化（判重键）：小写、剥 https://doi.org/ 与 http://dx.doi.org/ 前缀。"""
    return _DOI_PREFIX_RE.sub("", (doi or "").strip().lower())


def _norm_title(title: str) -> str:
    """标题规范化（无 DOI 时的判重键）：小写、去标点、压空白。"""
    lowered = _TITLE_PUNCT_RE.sub(" ", (title or "").lower())
    return " ".join(lowered.split())


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


def rank_records_with_stats(
    snapshot: dict[str, Any], goal: str, limit: int = 6, queries: list[str] | None = None
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """rank_records 的带统计版本：额外返回 ``{"deduped": n}``（被剔除的重复记录数）。

    去重（v2.1，排序截断**前**执行）：crossref/openalex 对同题文献常各返回一条，
    不去重会让 EV-0001/EV-0002 这样"同题重复"的证据挤占 limit 名额。
    判重键：规范化 DOI 相同（小写、剥 doi.org / dx.doi.org 前缀）；无 DOI 时按
    规范化标题（小写、去标点、压空白）。重复组保留打分最高者；分数相同按 DOI
    字典序取最小（维持确定性）。零相关过滤（score==0）与既有行为一致，先于去重。
    """
    goal_tokens = _tokens(goal) | _tokens(" ".join(queries or []))
    scored: list[tuple[int, str, str, dict[str, Any]]] = []
    for rec in snapshot.get("records", []):
        rec_tokens = _tokens(str(rec.get("title", ""))) | _tokens(" ".join(rec.get("authors", []) or []))
        score = len(goal_tokens & rec_tokens)
        if score <= 0:
            continue  # 零相关：不得进入证据（宁少选、不凑数）
        doi_key = _norm_doi(str(rec.get("doi", "")))
        title_key = _norm_title(str(rec.get("title", "")))
        scored.append((score, doi_key, title_key, rec))

    kept: dict[tuple[str, str], tuple[int, str, dict[str, Any]]] = {}
    deduped = 0
    for score, doi_key, title_key, rec in scored:
        if doi_key:
            key: tuple[str, str] = ("doi", doi_key)
        elif title_key:
            key = ("title", title_key)
        else:
            # 无 DOI 且无标题：无从判重，各自独立（不进去重统计）
            key = ("solo", f"#{len(kept)}")
            kept[key] = (score, doi_key, rec)
            continue
        if key not in kept:
            kept[key] = (score, doi_key, rec)
            continue
        cur = kept[key]
        if (-score, doi_key) < (-cur[0], cur[1]):
            kept[key] = (score, doi_key, rec)
        deduped += 1

    ranked = sorted(kept.values(), key=lambda x: (-x[0], x[1]))
    return [rec for _, _, rec in ranked[:limit]], {"deduped": deduped}


def rank_records(
    snapshot: dict[str, Any], goal: str, limit: int = 6, queries: list[str] | None = None
) -> list[dict[str, Any]]:
    """按与目标的关键词覆盖度打分排序（确定性：分数降序 → DOI 升序）。

    相关性堵漏（改造前病灶）：score==0 的记录也会入选——当快照内没有任何
    与目标相关的文献时，排序退化为 DOI 字典序取前 limit 条，"零相关文献"
    由此混进证据链，报告结论与用户问题彻底脱节。

    现行为：**零相关记录一律过滤**（score==0 不得进证据）；过滤后不足 limit
    就少选，如实反映——覆盖不足由上游 CoveragePolicy 按 §2.2 判定降级，
    本函数不重复实现降级逻辑，只保证"选出的每一条都至少与问题共享一个关键词"。

    v2.1：在排序截断前做同题去重（详见 rank_records_with_stats）；
    需要知道剔除数时请改用 rank_records_with_stats。

    queries（T5 规划查询）：与 goal 一起参与相关性度量。动机：中文 goal 的
    CJK bigram 与英文文献标题天然零交集，若只按 goal 打分，"用英文查询抓到了
    高相关文献、却因 goal 打分为 0 而全军覆没"——检索与排序自相矛盾。
    相关性口径必须是"问题 + 规划查询"的整体（与检索 query 口径一致）。
    """
    records, _ = rank_records_with_stats(snapshot, goal, limit, queries=queries)
    return records


def goal_phrases(goal: str, min_len: int = 2, max_phrases: int = 12) -> list[str]:
    """目标原文要素短语（可读、确定性）：按标点/空白切分 CJK 连续段。

    背景：2-gram 是**匹配**用的最小单元，不适合直接当"研究要素"展示——
    "给出方法对比与结论"会碎成"出方""法对""与结"这类无意义片段（实测问题）。
    本函数把 goal 还原到用户可读的短语层面，供报告「研究问题」章节展示；
    检索与缺口判定仍走 :func:`retrieval_tokens`，两者口径分离、各司其职。
    """
    out: list[str] = []
    for run in _CJK_RE.findall(goal or ""):
        for part in _CJK_PHRASE_SPLIT_RE.split(run):
            part = part.strip()
            if len(part) >= min_len and part not in out:
                out.append(part)
            if len(out) >= max_phrases:
                return out
    return out


def retrieval_tokens(goal: str, queries: list[str] | None = None) -> set[str]:
    """检索与相关性判定的统一口径：goal + 规划查询（与 rank_records 打分口径一致）。

    R1 的相关性度量用这个口径；R3 缺口拆解 / R4 印证相关性**必须**同口径——
    否则会出现"规划查询检索到了高相关文献，R4 却因 goal(中文) ∩ corroborated(英文)=∅
    而误报覆盖缺口"（2026-10-12 实测病灶：31 个中文 2-gram 被误判为缺口要素，
    已检索到 6 篇相关文献却产出"语料缺失"结论）。
    """
    return _tokens(goal) | _tokens(" ".join(queries or []))


def phrase_for(text: str, token: str, max_len: int = 30) -> str:
    """在原文 ``text`` 中还原包含 ``token`` 的可读片段（确定性，无第三方依赖）。

    背景：中文分词采用 2-gram 滑窗，直接把 bigram 当结论主语会产生"固态""电解"
    这类碎片。本函数按 CJK 连续段还原"原文中包含该 bigram 的完整片段"，
    使结论主语回到用户可读的词组层面。

    规则（确定性，同输入同输出）：
    - token 本身不含 CJK（英文词）→ 已是完整词，原样返回；
    - token 命中某个 CJK 连续段 → 段长 ≤ max_len 时返回整段；
      超长句以 token 为中心取 max_len 窗口（中心对齐偏左，保证可复现）；
    - token 未命中原文（理论上不该发生）→ 回落返回 token 本身。
    """
    text = text or ""
    token = token or ""
    if not token:
        return text[:max_len]
    if not _CJK_RE.search(token):
        return token  # 英文 token 已是完整词
    for run in _CJK_RE.findall(text):
        pos = run.find(token)
        if pos < 0:
            continue
        if len(run) <= max_len:
            return run
        half = (max_len - len(token)) // 2
        start = max(0, pos - half)
        end = min(len(run), start + max_len)
        start = max(0, end - max_len)
        return run[start:end]
    return token


def select_snapshot(goal: str, lit_source: str) -> tuple[str, dict[str, Any]]:
    """选择语料快照：本地/离线模式按可用快照取第一个；auto 模式优先匹配关键词。

    ⚠️ **在线快照（`live-*`）必须被排除在 local 的候选之外**。
    原因：`local` 的语义是"用**已冻结**的语料跑，结果可复现"。
    而 `live-*` 是运行时按目标联网抓的，同一目标在不同时刻抓到的文献**不同**——
    若 local 选中它，`local` 就不再可复现了（而且用户明明选了离线，却吃到了联网结果）。
    目录列举是按文件名排序的，新增 live-* 后字典序会排在 `sse-interface` 之前，
    `names[0]` 于是变成在线快照—— 我第一版没处理这个，实测才发现 L0 用例挂了。
    """
    names = available_snapshots()
    if not names:
        raise FileNotFoundError("未找到任何语料快照，请先运行 kernel/tools/fetch_corpus.py 冻结真实元数据")
    # local只用「离线冻结」的快照：排除 live-*（在线运行时产物）
    frozen = [n for n in names if not n.startswith("live-")]
    if lit_source == "local":
        pool = frozen or names
        if not pool:
            raise FileNotFoundError(
                "未找到离线冻结的语料快照（仅有在线运行时产物 live-*）。"
                "请先运行 kernel/tools/fetch_corpus.py 冻结一份语料，或改用 lit_source=auto/arxiv。"
            )
        return pool[0], load_snapshot(pool[0])
    goal_tokens = _tokens(goal)
    # auto/arxiv 路径：优先在**离线冻结**快照里选（可复现）；
    # 只有当一个冻结快照都没有时，才允许用 live-*（否则在线抓取产物就永远选不到了）。
    pool = frozen or names
    best = max(pool, key=lambda n: (len(goal_tokens & _tokens(n.replace("-", " "))), n))
    return best, load_snapshot(best)
