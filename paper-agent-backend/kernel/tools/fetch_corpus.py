"""冻结真实文献元数据快照（仅元数据，不取全文）。

数据源通过 **Source SPI**（`sciret_kernel/sources.py`）接入：
本脚本**只做编排**（并发、超时、重试、降级记录、去重、排序），
不认识任何具体源 —— 新增检索源 = 在 sources.py 实现一个 Source + 注册，
**不改本文件任何一行**（需求 §14「新增检索源=实现一个 Source」）。

合规（§11）：仅调用各源的**元数据** API，不抓取论文全文。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

_KERNEL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _KERNEL_DIR not in sys.path:  # 内核不装包，靠路径定位自身
    sys.path.insert(0, _KERNEL_DIR)

from sciret_kernel.resilience import (  # noqa: E402
    PermanentError,
    default_retry_policy,
    map_ordered,
    run_with_retry,
)
from sciret_kernel import sources as source_spi  # noqa: E402

#: 受控并发度：够用又不至于把公共 API 打爆
#（§6「多源受控并发，整体耗时≈最慢源而非各源之和」）
MAX_WORKERS = 4

#: abstract 截断上限（字符）：仅防快照膨胀，保留足够供 R2 摘要级精读的正文
ABSTRACT_MAX_CHARS = 4000


def truncate_abstract(rec: dict) -> dict:
    """就地截断单条记录的 abstract（超长时），返回该记录（便于链式调用）。

    仅截断不补齐：缺失/非字符串/no-op 不改动（不伪造内容）。
    """
    a = rec.get("abstract")
    if isinstance(a, str) and len(a) > ABSTRACT_MAX_CHARS:
        rec["abstract"] = a[:ABSTRACT_MAX_CHARS]
    return rec


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="冻结真实文献元数据快照（仅元数据，不取全文）")
    ap.add_argument("--query", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--per-source", type=int, default=8)
    ap.add_argument("--sources", default="crossref,openalex")
    ns = ap.parse_args(argv)

    wanted = [s.strip() for s in ns.sources.split(",") if s.strip()]
    unknown = [s for s in wanted if s not in source_spi.REGISTRY]
    if unknown:
        # Fail-fast：未知源名必须报错，而不是静默跳过
        # ——静默跳过会让"配了源却没抓"完全不可见。
        print(
            f"[error] 未知数据源：{', '.join(unknown)}（已注册：{', '.join(source_spi.known_sources())}）",
            file=sys.stderr,
        )
        return 2

    policy = default_retry_policy()
    transport = source_spi.default_transport()
    fetched: dict[str, list[dict]] = {}
    source_status: dict[str, str] = {}

    def fetch_one(src_name: str) -> list[dict]:
        """单源抓取：源自己声明超时，统一重试策略（4xx 永久错误不重试）。"""
        source = source_spi.get(src_name)
        url = source.build_url(ns.query, ns.per_source)

        def once() -> list[dict]:
            return source.parse(transport(url, source.timeout_s))

        return run_with_retry(once, policy=policy)

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
            fetched[src] = got
            items.extend(got)

    # 去重（按 DOI，保序）+ 稳定排序（保确定性 —— 相同输入必须得到相同输出）
    seen: set[str] = set()
    deduped: list[dict] = []
    for it in items:
        key = (it.get("doi") or it.get("title") or "").lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(it)
    deduped.sort(key=lambda x: ((x.get("doi") or ""), (x.get("title") or "")))
    # abstract 截断（防快照膨胀）：源解析已携带 abstract，此处只做体积治理
    for it in deduped:
        truncate_abstract(it)

    if not deduped:
        print("[error] 未获取到任何记录，不生成快照（禁止伪造数据）。", file=sys.stderr)
        return 1

    snapshot = {
        "snapshot_version": 1,
        "query": ns.query,
        "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_status": source_status,
        "license_note": (
            "仅收录各源返回的元数据（标题/作者/年份/DOI/期刊/许可），未抓取全文；使用时请遵循各源许可。"
        ),
        "records": deduped,
    }
    os.makedirs(os.path.dirname(os.path.abspath(ns.out)), exist_ok=True)
    with open(ns.out, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(snapshot, fh, ensure_ascii=False, indent=2, sort_keys=True)
        fh.write("\n")
    print(
        json.dumps(
            {"ok": True, "out": ns.out, "records": len(deduped), "source_status": source_status},
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())