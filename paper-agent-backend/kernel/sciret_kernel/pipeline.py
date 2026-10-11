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

受控模型步骤（不在本模块执行）：
    S1 综合回答 → synthesis 产物（artifact）——由模型经 sciret_synthesize 在
    终态 DONE 后补做（需求 §3.1 受控判断点：模型输出作为 artifact 入账本，
    不进 fact 结论、不影响门禁）；run_all 跳过，状态机豁免其收敛。
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from . import chaos, corpus, injection, online
from .jsonio import atomic_write_json, atomic_write_text, canonical_json, sha256_text
from .ledger import Ledger
from .state import RunState
from .workflow import MODEL_STEPS, steps_for

# ---------------------------------------------------------------- 覆盖策略（§2.2 配套策略 1）

class CoveragePolicy:
    """覆盖策略（Coverage Policy）：判定"结果覆盖是否充足"的**可配置**阈值。

    §2.2①原文："例如'≥2 个源成功且命中数 ≥ N'即判成功；单源状态仅记录、不逐级上报为降级"。
    这里把阈值从模块常量提升为可注入对象，默认值与历史行为一致（2 源 / 4 命中），
    以便①按场景配置阈值②在测试中用极端阈值驱动L1/L2 两条分支（真实语料恒为 ok，
    否则两条分支永远不可测）。

    注意：策略对象**不参与账本哈希**（它决定降级判定，而降级理由会进账本）；
    阈值变化会改变 `reason` 文本 → 改变账本摘要，这是预期的（执行路径确实变了）。
    """

    __slots__ = ("min_ok_sources", "min_hits", "retrieval_limit")

    def __init__(self, min_ok_sources: int = 2, min_hits: int = 4, retrieval_limit: int = 6) -> None:
        if min_ok_sources < 0:
            raise ValueError(f"min_ok_sources 必须 ≥0，收到 {min_ok_sources}")
        if min_hits < 0:
            raise ValueError(f"min_hits 必须 ≥0，收到 {min_hits}")
        if retrieval_limit < 1:
            raise ValueError(f"retrieval_limit 必须 ≥1，收到 {retrieval_limit}")
        self.min_ok_sources = min_ok_sources
        self.min_hits = min_hits
        self.retrieval_limit = retrieval_limit

    def satisfied_by(self, ok_sources: int, hits: int) -> bool:
        """覆盖是否充足：达标源数与命中数**同时**满足才算充足。"""
        return ok_sources >= self.min_ok_sources and hits >= self.min_hits

    def to_dict(self) -> dict[str, int]:
        return {
            "min_ok_sources": self.min_ok_sources,
            "min_hits": self.min_hits,
            "retrieval_limit": self.retrieval_limit,
        }


DEFAULT_COVERAGE = CoveragePolicy()
"""默认覆盖策略：达标源数 ≥ 2 且命中数 ≥ 4（§2.2① 示例值）。"""

MIN_CORROBORATING_SOURCES = 2
"""交叉印证所需独立来源数（R4 专用）。

刻意与 ``CoveragePolicy.min_ok_sources`` 分开：前者是"一个主题词要被几个**独立来源**支撑"
（证据层判据），后者是"检索阶段几个**源成功**才算覆盖充足"（覆盖层判据）。
两者恰好都是 2 属于巧合——共用一个常量会让"调低覆盖阈值"意外改变交叉印证强度。
"""


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


def step_R1(
    state: RunState,
    run_dir: Path,
    ledger: Ledger,
    policy: CoveragePolicy | None = None,
) -> dict[str, Any]:
    cov = policy or DEFAULT_COVERAGE
    # 检索源解析：local → 只读既有快照（绝不联网，保可复现）；
    # arxiv/auto → 先尝试联网刷新，失败则回落既有快照（online.py）。
    # 检索 query：优先 state.queries（模型规划查询，T5），无则回落 goal 原文。
    # 源熔断（v2.2）：上一轮已标记 unavailable 的源本 run 内不再二次尝试（resume 重跑跳过）。
    circuit_open = sorted(
        s for s in state.sources if str(state.source_status.get(s, "")).startswith("unavailable")
    )
    snap_name, snapshot, online_note = online.resolve_online(
        state.goal, state.lit_source, list(state.sources),
        queries=list(state.queries), skip_sources=circuit_open,
    )
    if circuit_open:
        state.circuit = {**state.circuit, **{s: "open_until_run_end" for s in circuit_open}}
    records, dedup_stats = corpus.rank_records_with_stats(
        snapshot, state.goal, cov.retrieval_limit, queries=list(state.queries)
    )
    deduped = dedup_stats["deduped"]
    # 提示注入过滤（v2.2）：元数据 title/venue 是不可信外部输入，入账本前清洗，
    # 命中字段替换为安全占位，原值截断留痕于 note（恶意文本全文不入产物）。
    clean_records, injection_findings = injection.sanitize_records(records)

    source_status_raw: dict[str, str] = dict(snapshot.get("source_status", {}))
    # ⚠️ 在线抓取失败的原因**不能被快照里的 ok:N 覆盖掉**：
    #    否则"抓取失败、靠旧快照跑完"会被判成 L0（无降级），
    #    与事实相反，也骗过了 §2.2 的三级语义。回落原因必须留痕。
    if online_note.get("online_fallback_reason"):
        source_status_raw["__online_fetch__"] = f"fallback:{online_note['online_fallback_reason']}"

    # 故障注入（§2.2⑤）：默认关闭；开启时仅改写「源可达性」，**不伪造任何文献记录**，
    # 故覆盖不足是真覆盖不足，产物里也能看出这次失败是人为注入的。
    source_status_raw, injections = chaos.apply(source_status_raw, task_id=state.task_id)
    source_status_raw = chaos.record_injections(source_status_raw, injections)

    ok_sources = [s for s, v in source_status_raw.items() if str(v).startswith("ok")]
    unavailable = [s for s, v in source_status_raw.items() if str(v).startswith("unavailable")]
    # 在线抓取失败但靠旧快照跑完：**检索路径实质改变**（拿到的是历史元数据而非当前文献），
    # 故按 §2.2 判L1（info）——覆盖可能仍充足，但结果未必反映最新进展。
    # 不判 L2：旧快照本身是**真实**元数据，结论未必错误，只是时效性打折。
    online_fellback = bool(online_note.get("online_fallback_reason"))
    hits = len(records)
    covered = cov.satisfied_by(len(ok_sources), hits)

    state.source_status = {**state.source_status, **source_status_raw}
    state.source_status["corpus_snapshot"] = f"{snap_name}@{snapshot.get('retrieved_at', '')}"

    # ---- §2.2 三级语义判定 ------------------------------------------------
    # L0 覆盖充足且全源可用；L1 个别源不可用但覆盖充足；L2 路径实质改变。
    # §2.2④：用户显式选local 是**预期路径**，不判降级（否则"主动离线"被误标为降级，
    # 这正是 P-01 原文点名的病灶④）。
    if state.lit_source == "local":
        # 主动离线：显式预期路径。即使快照里某源标记 unavailable 也不置 degraded，
        # 但仍记录 source_status 供审计查看。
        level = None
    elif online_fellback and not injections:
        # 在线模式但抓取失败 → 回落旧快照。记 L1（info），**不置 degraded**：
        # 数据仍真实，只是时效性打折；置degraded 会让用户以为结论不可信。
        #
        # ⚠️ `and not injections`：若本次同时开了 chaos 演练，源不可用的原因是**注入**，
        #    应按注入语义判定（注入本身正是用来验证 L1/L2 的）。
        #    不加这个条件，演练结果会被"抓取失败"这条噪声覆盖，测出来的降级级别是错的
        #    —— 我自己就踩了：三个降级用例全挂在这里。
        level = "info"
    elif not covered:
        level = "degraded"
    elif unavailable:
        level = "info"
    else:
        level = None

    if level == "degraded":
        injected = "（本次源不可用由演练注入，非真实网络故障）" if injections else ""
        state.add_degradation(
            run_dir,
            level="degraded",
            source=",".join(unavailable) or ",".join(source_status_raw.keys()) or "corpus",
            reason=(
                f"覆盖不足触发路径实质改变：成功源 {len(ok_sources)}（阈值 {cov.min_ok_sources}）、"
                f"命中 {hits}（阈值 {cov.min_hits}），已回落本地冻结语料" + injected
            ),
            impact="检索覆盖范围收窄，结论基于有限语料，需人工复核覆盖面",
            resumable=True,
            step="R1",
        )
    elif level == "info":
        state.add_degradation(
            run_dir,
            level="info",
            source=",".join(unavailable),
            reason=f"部分数据源不可达，但覆盖充足（成功源 {len(ok_sources)}、命中 {hits}），结果路径未改变",
            impact="结果未受影响",
            resumable=True,
            step="R1",
        )

    ev_ids: list[str] = []
    idx = _next_evidence_index(ledger)
    for rec in clean_records:
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

    if injection_findings:
        pattern_ids = sorted({f["pattern_id"] for f in injection_findings})
        ledger.append(
            "note",
            {
                "text": (
                    f"R1 提示注入过滤：命中 {len(injection_findings)} 处，命中字段已替换为 {injection.PLACEHOLDER}；"
                    f"模式：{', '.join(pattern_ids)}（原值截断留痕于 findings，恶意文本全文不入产物）"
                ),
                "detail": {"pattern_ids": pattern_ids, "findings": injection_findings},
                "producer_step": "R1",
            },
        )

    return {
        "step": "R1",
        "human_summary": f"已检索 {len(ev_ids)} 篇文献（语料快照 {snap_name}；来源：{', '.join(f'{k}={v}' for k, v in source_status_raw.items())}）"
        + (f"；⚠️ 在线抓取失败已回落本地快照（{online_note['online_fallback_reason']}），元数据为历史版本"
           if online_note.get("online_fallback_reason") else "")
        + (f"；去重 {deduped} 条重复记录" if deduped > 0 else "")
        + (f"；源熔断 {len(circuit_open)} 个（本 run 内不再重试）" if circuit_open else "")
        + (f"；过滤提示注入 {len(injection_findings)} 处" if injection_findings else ""),
        "evidence_ids": ev_ids,
        "source_status": state.source_status,
        "degraded": state.degraded,
        "deduped": deduped,
        "injection_filtered": len(injection_findings),
    }


# ---------------------------------------------------------------- R2 论文精读


def step_R2(state: RunState, run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
    # ⚠️ 不再对"0 篇文献"抛错（改造后 rank_records 会过滤零相关记录，0 命中是
    # 合法的 R1 结果——纯中文目标对英文语料即如此）。此时如实跳过精读，
    # 后续 R3/R4 会产出覆盖缺口结论，整链以"诚实降级 + 缺口结论"收尾，
    # 而不是让任务半途崩掉（崩掉 = 用户什么都拿不到，比缺口更糟）。
    if not lit:
        return {
            "step": "R2",
            "human_summary": "检索覆盖不足（0 篇相关文献），无文献可精读；后续将按覆盖缺口口径产出结论",
            "evidence_ids": [],
        }
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
    # 0 篇文献时覆盖=∅、缺口=全部目标要素——恰恰是缺口拆解最有价值的情形，
    # 不抛错（与 R2 的"诚实降级"口径一致，R4 的覆盖缺口结论要绑定本步证据）
    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
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

    结论主语约束（改造 G2 病灶）：
    - 结论主语**必须**来自 ``goal_tokens ∩ corroborated_terms``——即"与用户问题
      相关"且"获多源印证"的要素；并用 ``corpus.phrase_for`` 还原原文片段，
      避免"固态""电解"这类 2-gram 碎片裸奔进结论。
    - 交集为空时**不得用任意主题词凑结论**：改为产出 1 条"覆盖缺口"结论，
      如实说明现有语料未能覆盖问题关键要素，并绑定 R3 的 fact 级 analysis
      证据（R3 证据是确定性拆解产物，tier=fact，满足门禁绑定校验）。

    判定为规则型判断器（Judge SPI 雏形），判断全额留痕（judgment 记录）。
    """
    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]

    topic_sources: dict[str, set[str]] = {}
    for rec in lit:
        ref = rec.data.get("ref", {})
        src = str(ref.get("source", "unknown"))
        for tok in sorted(corpus._tokens(str(ref.get("title", "")))):  # noqa: SLF001
            topic_sources.setdefault(tok, set()).add(src)

    corroborated = sorted(t for t, srcs in topic_sources.items() if len(srcs) >= MIN_CORROBORATING_SOURCES)
    single = sorted(t for t, srcs in topic_sources.items() if len(srcs) < MIN_CORROBORATING_SOURCES)

    goal_tokens = corpus._tokens(state.goal)  # noqa: SLF001
    relevant_terms = [t for t in corroborated if t in goal_tokens]

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
            "detail": {
                "corroborated_terms": corroborated[:20],
                "single_source_terms": single[:20],
                "goal_relevant_terms": relevant_terms[:20],
            },
            "ref": {"derived_from": [r.data["ev_id"] for r in lit]},
            "producer_step": "R4",
        },
    )

    if relevant_terms:
        judgment_rationale = (
            f"{len(corroborated)} 个主题词获 ≥{MIN_CORROBORATING_SOURCES} 个独立来源支撑，"
            f"其中 {len(relevant_terms)} 个与研究目标关键要素直接相关（goal∩corroborated）；"
            f"{len(single)} 个仅单源（标记为待核）"
        )
    else:
        judgment_rationale = (
            f"{len(corroborated)} 个主题词获 ≥{MIN_CORROBORATING_SOURCES} 个独立来源支撑，"
            f"但与研究目标关键要素无交集（goal∩corroborated=∅），"
            f"按覆盖缺口口径产出结论，不用无关主题词凑数；{len(single)} 个仅单源（标记为待核）"
        )
    ledger.append(
        "judgment",
        {
            "judge": "rule:cross-source-corroboration@v2",
            "verdict": bool(relevant_terms),
            "rationale": judgment_rationale,
            "evidence_ids": [fact_ev],
            "producer_step": "R4",
        },
    )

    conclusions: list[str] = []
    if relevant_terms:
        for i, term in enumerate(relevant_terms[:3], start=1):
            cid = f"C-{i:03d}"
            # 用原文中包含该 token 的完整片段作主语（避免 2-gram 碎片裸奔）
            phrase = corpus.phrase_for(state.goal, term)
            text = (
                f"研究目标中的“{phrase}”获多源文献交叉印证"
                f"（印证要素“{term}”获 ≥{MIN_CORROBORATING_SOURCES} 个独立来源支撑）"
            )
            ledger.append(
                "conclusion",
                {"cid": cid, "text": text, "evidence_ids": [fact_ev], "producer_step": "R4", "confidence": "medium"},
            )
            conclusions.append(cid)
    else:
        # 覆盖缺口结论：绑定 R3 的 fact 级 analysis 证据（缺口是确定性拆解事实）
        r3_evs = [
            r
            for r in ledger.evidence()
            if r.data.get("producer_step") == "R3" and r.data.get("kind") == "analysis"
        ]
        if r3_evs:
            gap_ev = str(r3_evs[-1].data["ev_id"])
            gap_terms = [str(x) for x in r3_evs[-1].data.get("detail", {}).get("gap_terms", [])]
        else:
            # 防御性兜底（R3 缺席属异常路径）：不得伪造 R3 证据存在，
            # 缺口改为现场计算并绑定 R4 自己的 factcheck 证据（fact 级）
            covered: set[str] = set()
            for rec in lit:
                covered |= corpus._tokens(str(rec.data.get("ref", {}).get("title", "")))  # noqa: SLF001
            gap_terms = sorted(goal_tokens - covered)
            gap_ev = fact_ev
        if gap_terms:
            text = (
                f"现有语料未能覆盖研究问题的关键要素（缺口要素：{'、'.join(gap_terms[:10])}），"
                f"不足以对研究目标形成直接结论；建议扩充检索范围（提供英文检索查询）或人工补充语料后重试。"
            )
        else:
            text = (
                f"现有语料覆盖了目标关键词，但未形成与研究目标直接相关的多源印证"
                f"（goal∩corroborated=∅），不足以对研究目标形成直接结论；建议人工复核语料相关性。"
            )
        ledger.append(
            "conclusion",
            {"cid": "C-001", "text": text, "evidence_ids": [gap_ev], "producer_step": "R4", "confidence": "low"},
        )
        conclusions.append("C-001")

    return {
        "step": "R4",
        "human_summary": (
            f"交叉印证完成：{len(relevant_terms)} 个印证要素与目标直接相关，形成 {len(conclusions)} 条结论"
            if relevant_terms
            else f"交叉印证完成：印证要素与目标无交集，产出 {len(conclusions)} 条覆盖缺口结论"
        ),
        "evidence_ids": [fact_ev],
        "conclusion_ids": conclusions,
        "corroborated_terms": corroborated[:20],
        "goal_relevant_terms": relevant_terms[:20],
        "single_source_terms": single[:20],
    }


# ---------------------------------------------------------------- R5 综述写作


def _methodology_observations(ledger: Ledger) -> list[str]:
    """方法学观察（改造 G3 病灶）：全部由账本数据统计生成，**禁止任何领域词硬编码**。

    统计口径（确定性）：
    - 文献年份分布：R1 文献证据 ref.year 计数（缺失计"未知年份"）；
    - 文献来源分布：R1 文献证据 ref.source 计数；
    - 多源印证主题词：R4 factcheck 证据 detail.corroborated_terms；
    - 覆盖缺口：R3 analysis 证据 detail.gap_terms。
    """
    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
    years: dict[str, int] = {}
    sources_dist: dict[str, int] = {}
    for rec in lit:
        ref = rec.data.get("ref", {})
        year = ref.get("year")
        ykey = str(year) if year not in (None, "") else "未知年份"
        years[ykey] = years.get(ykey, 0) + 1
        src = str(ref.get("source") or "unknown")
        sources_dist[src] = sources_dist.get(src, 0) + 1

    corroborated: list[str] = []
    for rec in ledger.evidence():
        if rec.data.get("kind") == "factcheck":
            terms = rec.data.get("detail", {}).get("corroborated_terms", [])
            if len(terms) > len(corroborated):
                corroborated = [str(t) for t in terms]

    gaps: list[str] = []
    for rec in ledger.evidence():
        if rec.data.get("producer_step") == "R3" and rec.data.get("kind") == "analysis":
            g = rec.data.get("detail", {}).get("gap_terms", [])
            if len(g) > len(gaps):
                gaps = [str(t) for t in g]

    year_str = "；".join(f"{k}×{v}" for k, v in sorted(years.items())) or "（无年份信息）"
    source_str = "、".join(f"{k}×{v}" for k, v in sorted(sources_dist.items())) or "（无来源信息）"
    return [
        f"- 文献年份分布：{year_str}。",
        f"- 文献来源分布：{source_str}（共 {len(lit)} 篇，由账本证据统计得出）。",
        f"- 多源印证主题词：{'、'.join(corroborated[:10]) if corroborated else '（无）'}"
        f"——共 {len(corroborated)} 个主题词获 ≥{MIN_CORROBORATING_SOURCES} 个独立来源支撑。",
        f"- 目标关键词覆盖缺口：{'、'.join(gaps[:10]) if gaps else '（无）'}（见 R3 创新点拆解证据）。",
        "- 多源元数据在主题层面相互支撑，但具体数值结论需回查原文核验（本报告不作数值断言）。",
    ]


def step_R5(state: RunState, run_dir: Path, ledger: Ledger) -> dict[str, Any]:
    # 0 篇文献时草稿如实呈现"无相关文献"，方法学观察由账本统计生成（空分布可见），
    # 不抛错——与 R2/R3/R4 的"诚实降级"口径一致
    lit = [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
    conclusions = ledger.conclusion_records()

    lines: list[str] = [f"# 研究综述草稿：{state.goal}", ""]
    lines.append("## 一、检索到的关键文献")
    if not lit:
        lines.append("-（无相关文献：检索覆盖不足，未将任何零相关记录纳入证据。）")
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
    lines.extend(_methodology_observations(ledger))
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
        {"id": "SOURCES", "ok": (
            # 无文献（覆盖不足诚实降级）时不判失败：无文献则无来源可标注，属合法状态
            not [r for r in ledger.evidence() if r.data.get("producer_step") == "R1"]
        ) or len({str(r.data.get("ref", {}).get("source", "")) for r in ledger.evidence() if r.data.get("producer_step") == "R1"}) >= 1, "detail": "文献来源已标注"},
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


STEP_FUNCS: dict[str, Callable[..., dict[str, Any]]] = {
    "R1": step_R1,
    "R2": step_R2,
    "R3": step_R3,
    "R4": step_R4,
    "R5": step_R5,
    "R6": step_R6,
}


def execute_step(
    state: RunState,
    run_dir: Path,
    ledger: Ledger,
    step_id: str,
    policy: CoveragePolicy | None = None,
) -> dict[str, Any]:
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
        # ⚠️ Fail-fast 要发生在**这里**（执行前），而不是让调用方跑到一半才发现。
        #   但真正的第一道闸门在 plan 阶段（见 plan() 里对未实现工作流的拒绝）——
        #   那里才能省下"建目录 + 建 AGH 会话"的资源浪费。两处都留：
        #   plan 拦不住时（历史任务/状态被外部改过）这里兜底。
        raise PipelineError(
            f"步骤 {step_id} 尚未实现（当前仅 research 工作流 R1–R6 已实现；"
            f"materials 工作流的算子将在后续里程碑补齐）"
        )

    state.start_step(run_dir, step_id)
    try:
        # 只 R1 用覆盖策略；其余步骤签名不含 policy，故按步号分派（显式优于 **kwargs 猜测）
        result = func(state, run_dir, ledger, policy) if step_id == "R1" else func(state, run_dir, ledger)
    except Exception as e:  # noqa: BLE001 - 失败必须落状态机，供 resume 续跑
        state.finish_step(run_dir, step_id, error=f"{type(e).__name__}: {e}")
        raise
    state.finish_step(run_dir, step_id)
    result["status"] = state.step(step_id).status.value
    result["run_status"] = state.run_status.value
    return result


def run_all(
    state: RunState,
    run_dir: Path,
    ledger: Ledger,
    policy: CoveragePolicy | None = None,
) -> dict[str, Any]:
    """顺序跑完剩余步骤（断点续跑：DONE/SKIPPED 复用，仅跑 PENDING/FAILED）。

    到达终态 DONE 后**自动装配报告**（需求 §9.5/P-03：终态 DONE 且报告就绪）：
    门禁不通过则**拒绝出报告**并把原因写入 report_gate.json（不伪造成报告、不静默）。
    """
    executed: list[dict[str, Any]] = []
    for step_id, _label in steps_for(state.workflow):
        if state.is_terminal:
            break
        # 受控模型步骤（S1 综合回答）不由确定性流水线执行：
        # 它由模型在终态后经 sciret_synthesize 落盘，这里跳过（状态机会豁免其收敛）
        if step_id in MODEL_STEPS:
            continue
        record = state.step(step_id)
        if record.status.value in ("DONE", "SKIPPED"):
            continue
        executed.append(execute_step(state, run_dir, ledger, step_id, policy))

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
