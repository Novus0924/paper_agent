"""冻结语料抓取工具（离线演示与可复现的基础）。

合规（需求文档 §11 数据真实性）：
- **只取元数据**（DOI/标题/作者/年份/期刊/许可），**绝不抓取论文全文**；
- 结果冻结为 JSON 快照（含来源、抓取时间、许可），随仓库入库，保证离线可复现；
- 网络不可达时脚本明确失败，不生成伪造数据。

容错（需求文档 §6 容错与降级策略表）：
- **统一重试**：瞬时错误（5xx/429/连接/超时）指数退避 + 抖动重试；4xx 永久错误不重试；
- **独立超时**：各源各自超时，互不阻塞；
- **受控并发**：多源并发取数，但**结果按 --sources 声明顺序归并**（保确定性）——
  并发只压缩耗时，不影响快照内容与顺序。

用法（标准库，无第三方依赖）：
    python -m tools.fetch_corpus --query "solid-state electrolyte interface impedance" \
        --out sciret_kernel/corpus/sse-interface.json --per-source 8
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from sciret_kernel.resilience import (
    PermanentError,
    TransientError,
    classify_http_error,
    default_retry_policy,
    map_ordered,
    run_with_retry,
)

UA = "paper-agent/2.0 (hackathon research assistant; contact: team-u046)"

SOURCE_ENDPOINTS = {
    "crossref": "https://api.crossref.org/works",
    "openalex": "https://api.openalex.org/works",
}

#: 各源独立超时（秒）。§6「单源/单步独立超时；多源受控并发，整体耗时≈最慢源而非各源之和」
SOURCE_TIMEOUT_S = {"crossref": 20.0, "openalex": 20.0}
#: 受控并发度：够用又不至于把公共 API 打爆
MAX_WORKERS = 4


def _get_json(url: str, timeout: float = 20.0) -> dict:
    """单次 GET；HTTP 状态码按§6 分类为瞬时/永久错误。"""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - 固定官方元数据 API
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise classify_http_error(e.code)(f"HTTP {e.code} {url}") from e
    except urllib.error.URLError as e:
        # 连接被拒/超时/DNS 等网络层问题 → 瞬时，值得退避后重试
        raise TransientError(f"{type(e.reason).__name__}: {e.reason}") from e
    except TimeoutError as e:
        raise TransientError(f"TimeoutError: {e}") from e
    except json.JSONDecodeError as e:
        # 响应不是合法 JSON：通常是网关返回的 HTML 错误页，重试有意义
        raise TransientError(f"JSONDecodeError: {e}") from e


def fetch_crossref(query: str, rows: int, *, timeout: float = 20.0) -> list[dict]:
    params = urllib.parse.urlencode({"query.bibliographic": query, "rows": rows, "select": "DOI,title,author,issued,container-title,license,type"})
    data = _get_json(f"{SOURCE_ENDPOINTS['crossref']}?{params}", timeout=timeout)
    out = []
    for item in data.get("message", {}).get("items", []):
        title = (item.get("title") or [""])[0]
        if not title:
            continue
        issued = (item.get("issued", {}).get("date-parts") or [[None]])[0]
        authors = []
        for a in item.get("author", []) or []:
            name = " ".join(x for x in [a.get("given"), a.get("family")] if x) or a.get("name") or ""
            if name:
                authors.append(name)
        out.append(
            {
                "doi": item.get("DOI", ""),
                "title": title.strip(),
                "authors": authors,
                "year": issued[0] if issued else None,
                "venue": (item.get("container-title") or [""])[0],
                "type": item.get("type", ""),
                "license": [lic.get("URL", "") for lic in (item.get("license") or [])],
                "source": "crossref",
            }
        )
    return out


def fetch_openalex(query: str, rows: int, *, timeout: float = 20.0) -> list[dict]:
    # 注意：OpenAlex 的 select 只接受合法字段名，含未知字段会返回 400
    params = urllib.parse.urlencode(
        {"search": query, "per-page": rows, "select": "doi,title,publication_year,authorships,primary_location,type"}
    )
    data = _get_json(f"{SOURCE_ENDPOINTS['openalex']}?{params}", timeout=timeout)
    out = []
    for item in data.get("results", []):
        title = item.get("title") or ""
        if not title:
            continue
        authors = [a.get("author", {}).get("display_name", "") for a in item.get("authorships", []) or []]
        loc = item.get("primary_location") or {}
        out.append(
            {
                "doi": (item.get("doi") or "").replace("https://doi.org/", ""),
                "title": title.strip(),
                "authors": [a for a in authors if a],
                "year": item.get("publication_year"),
                "venue": ((loc.get("source") or {}).get("display_name") or ""),
                "type": item.get("type", ""),
                "license": "",
                "source": "openalex",
            }
        )
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="冻结真实文献元数据快照（仅元数据，不取全文）")
    ap.add_argument("--query", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--per-source", type=int, default=8)
    ap.add_argument("--sources", default="crossref,openalex")
    ns = ap.parse_args(argv)

    wanted = [s.strip() for s in ns.sources.split(",") if s.strip()]
    policy = default_retry_policy()
    fetched: dict[str, list[dict]] = {}
    source_status: dict[str, str] = {}

    def fetch_one(src: str) -> list[dict]:
        """单源抓取：带独立超时 + 统一重试策略。

        4xx（永久错误）**不重试** —— 重试只会浪费配额并可能招致更严限流。
        """
        timeout = SOURCE_TIMEOUT_S.get(src, 20.0)
        if src == "crossref":
            fn = lambda: fetch_crossref(ns.query, ns.per_source, timeout=timeout)  # noqa: E731
        elif src == "openalex":
            fn = lambda: fetch_openalex(ns.query, ns.per_source, timeout=timeout)  # noqa: E731
        else:
            raise PermanentError(f"unsupported source: {src}")
        return run_with_retry(fn, policy=policy)

    def safe_fetch(src: str) -> tuple[str, list[dict] | None, str]:
        try:
            got = fetch_one(src)
            return src, got, f"ok:{len(got)}"
        except PermanentError as e:
            # 永久错误：立即放弃（已按策略不重试），但**如实记录**——绝不伪造成功
            print(f"[warn] {src} 永久失败（不重试）：{e}", file=sys.stderr)
            return src, None, f"unavailable:PermanentError:{e}"
        except Exception as e:  # noqa: BLE001 - 抓取失败必须显式记录，绝不伪造
            print(f"[warn] {src} 重试 {policy.max_attempts} 次后仍失败：{e}", file=sys.stderr)
            return src, None, f"unavailable:{type(e).__name__}:{e}"

    # 受控并发 + 按声明顺序归并（map_ordered 保证顺序；并发只压缩耗时）
    results = map_ordered(safe_fetch, wanted, workers=MAX_WORKERS)
    items: list[dict] = []
    for src, got, status in results:
        source_status[src] = status
        if got:
            items.extend(got)

    # 去重（按 DOI，保序）+ 稳定排序（保确定性）
    seen: set[str] = set()
    deduped: list[dict] = []
    for it in items:
        key = (it.get("doi") or it.get("title") or "").lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(it)
    deduped.sort(key=lambda x: ((x.get("doi") or ""), (x.get("title") or "")))

    if not deduped:
        print("[error] 未获取到任何记录，不生成快照（禁止伪造数据）。", file=sys.stderr)
        return 1

    snapshot = {
        "snapshot_version": 1,
        "query": ns.query,
        "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_status": source_status,
        "license_note": "仅收录各源返回的元数据（标题/作者/年份/DOI/期刊/许可），未抓取全文；使用时请遵循各源许可。",
        "records": deduped,
    }
    os.makedirs(os.path.dirname(os.path.abspath(ns.out)), exist_ok=True)
    with open(ns.out, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(snapshot, fh, ensure_ascii=False, indent=2, sort_keys=True)
        fh.write("\n")
    print(json.dumps({"ok": True, "out": ns.out, "records": len(deduped), "source_status": source_status}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
