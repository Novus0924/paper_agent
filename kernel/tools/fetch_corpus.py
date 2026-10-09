"""冻结语料抓取工具（离线演示与可复现的基础）。

合规（需求文档 §11 数据真实性）：
- **只取元数据**（DOI/标题/作者/年份/期刊/许可），**绝不抓取论文全文**；
- 结果冻结为 JSON 快照（含来源、抓取时间、许可），随仓库入库，保证离线可复现；
- 网络不可达时脚本明确失败，不生成伪造数据。

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
import urllib.parse
import urllib.request

UA = "paper-agent/2.0 (hackathon research assistant; contact: team-u046)"

SOURCE_ENDPOINTS = {
    "crossref": "https://api.crossref.org/works",
    "openalex": "https://api.openalex.org/works",
}


def _get_json(url: str, timeout: int = 20) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - 固定官方元数据 API
        return json.loads(resp.read().decode("utf-8"))


def fetch_crossref(query: str, rows: int) -> list[dict]:
    params = urllib.parse.urlencode({"query.bibliographic": query, "rows": rows, "select": "DOI,title,author,issued,container-title,license,type"})
    data = _get_json(f"{SOURCE_ENDPOINTS['crossref']}?{params}")
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


def fetch_openalex(query: str, rows: int) -> list[dict]:
    # 注意：OpenAlex 的 select 只接受合法字段名，含未知字段会返回 400
    params = urllib.parse.urlencode(
        {"search": query, "per-page": rows, "select": "doi,title,publication_year,authorships,primary_location,type"}
    )
    data = _get_json(f"{SOURCE_ENDPOINTS['openalex']}?{params}")
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
    items: list[dict] = []
    source_status: dict[str, str] = {}
    for src in wanted:
        try:
            if src == "crossref":
                got = fetch_crossref(ns.query, ns.per_source)
            elif src == "openalex":
                got = fetch_openalex(ns.query, ns.per_source)
            else:
                source_status[src] = "unsupported"
                continue
            items.extend(got)
            source_status[src] = f"ok:{len(got)}"
        except Exception as e:  # noqa: BLE001 - 抓取失败必须显式记录，绝不伪造
            source_status[src] = f"unavailable:{type(e).__name__}:{e}"
            print(f"[warn] {src} 抓取失败：{e}", file=sys.stderr)

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
