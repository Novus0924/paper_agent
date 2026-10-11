"""在线检索（`lit_source` != local）：真联网抓取 → 冻结快照 → 供流水线消费。

⚠️ 为什么在线检索**不走流水线路径**，而是先冻结成快照再读：
项目红线是**可复现**（README §5.1）——相同输入必须得到相同摘要。
若流水线直接联网，同一目标两次执行会拿到不同文献 → `ledger_digest` 变化 → 摘要不可复现。
故沿用既有约定：**先冻结（fetch_corpus）→ 再确定性读取**，
在线模式只是"在读之前多一步刷新快照"，读的那一步仍是纯函数。

与离线（local）路径的关系：
- `local`：只读既有快照，**绝不联网**（可复现 + 用户明确选择的离线路径）。
- `arxiv` / `auto`：先尝试刷新快照；成功→用新快照；失败→**回落既有快照**并如实记录原因。

**绝不伪造**：抓取失败且无可用快照时抛错，不编造文献记录（与 fetch_corpus 的行为一致）。
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from . import corpus, sources as source_spi

# 抓取器与语料目录的定位（与 corpus.py 同源：内核靠自身位置定位，不依赖 cwd）
_KERNEL_DIR = Path(__file__).resolve().parent
_REPO_KERNEL_DIR = _KERNEL_DIR.parent
FETCH_TOOL = _REPO_KERNEL_DIR / "tools" / "fetch_corpus.py"

# 快照文件名需与 goal 对应且稳定，故用目标的哈希而不是时间戳——
# 时间戳会让"同一目标"产生不同文件名，进而让 corpus_snapshot 字段抖动。
_SAFE_NAME_RE = re.compile(r"[^0-9A-Za-z._-]+")

# 禁用在线抓取的开关（仅供测试与"强制离线"运行用）。
# ⚠️ 它**只**关掉联网，不改 lit_source 语义——auto 仍是 auto，只是抓取会失败并回落。
# 这样降级语义的测试可以在无网络环境下稳定运行（否则 CI 里随网络状况飘）。
ENV_OFFLINE = "PAPER_AGENT_OFFLINE"


def offline_forced() -> bool:
    return str(os.environ.get(ENV_OFFLINE, "")).strip().lower() in ("1", "true", "yes")


def snapshot_name_for(goal: str) -> str:
    """由目标推导**稳定**的快照名（相同目标恒得同名）。"""
    from .ledger import sha256_text  # 延迟导入：避免循环依赖

    digest = sha256_text(goal.strip().lower())[:12]
    slug = _SAFE_NAME_RE.sub("-", goal.strip().lower())[:40].strip("-") or "task"
    return f"live-{slug}-{digest}"


def pick_fetch_query(goal: str, queries: list[str] | None) -> str:
    """检索 query 选择：优先模型规划查询（state.queries），否则回落 goal 原文。

    背景（G1b 病灶）：中文 goal 原文直接透传 Crossref/OpenAlex 的英文文献库，
    相关性极差。规划查询（T5 受控判断点产出）由模型依据 goal 生成英文关键词式
    查询，显著提升命中质量；模型拒绝/未传时回落 goal 原文（既有行为，不阻断）。

    确定性：取第一个非空查询（不做逐个尝试——多查询会引入"第一次成功与否"
    的时序依赖，破坏可复现红线；多余查询留给未来扩展）。
    """
    for q in (queries or []):
        q = str(q).strip()
        if q:
            return q
    return goal


def refresh_snapshot(
    goal: str,
    sources: list[str],
    per_source: int = 8,
    timeout_s: float = 90.0,
    queries: list[str] | None = None,
) -> dict[str, Any]:
    """尝试联网抓取并写入快照目录。

    返回 `{ ok, name, path, source_status, records, reason }`：
    - `ok=True`  已写入新快照（可能是刷新前的同名覆盖）
    - `ok=False` 抓取失败，**调用方必须回落既有快照**（不得伪造）

    失败**不抛异常**：网络不可用是预期情形（受限环境/离线演示），
    应当降级而不是让整条流水线崩掉。真正无快照可用时由调用方报错。

    检索 query：优先 `queries` 中的规划查询（见 `pick_fetch_query`），
    实际使用的 query 随返回值 `query` 字段留痕（审计可查"这次到底拿什么查的"）。
    快照名仍由 goal 稳定派生（`snapshot_name_for`），规划查询只影响抓取内容、
    不影响快照命名——否则同名任务会因查询不同产生不同文件名，摘要抖动。
    """
    if not FETCH_TOOL.exists():
        return {"ok": False, "reason": f"抓取器不存在：{FETCH_TOOL}"}
    if not sources:
        return {"ok": False, "reason": "未指定数据源（sources 为空，无法联网抓取）"}
    if offline_forced():
        return {"ok": False, "reason": f"已由 {ENV_OFFLINE}=1 强制离线"}

    fetch_query = pick_fetch_query(goal, queries)
    name = snapshot_name_for(goal)
    out_path = corpus.CORPUS_DIR / f"{name}.json"
    corpus.CORPUS_DIR.mkdir(parents=True, exist_ok=True)

    # 写到临时文件再原子替换：抓取失败时**不能**留下半截快照
    # （半截文件会被 available_snapshots() 当成合法快照读进来 → 脏数据）。
    fd, tmp_name = tempfile.mkstemp(prefix=f"{name}.", suffix=".tmp", dir=str(corpus.CORPUS_DIR))
    os.close(fd)
    tmp_path = Path(tmp_name)
    try:
        proc = subprocess.run(
            [
                sys.executable,
                str(FETCH_TOOL),
                "--query", fetch_query,
                "--out", str(tmp_path),
                "--per-source", str(per_source),
                "--sources", ",".join(sources),
            ],
            capture_output=True,
            text=True,
            # ⚠️ Windows 下抓取器 stderr 可能写入非 UTF-8（GBK）字节：text=True 默认按系统编码解码，
            #    reader 线程会抛 UnicodeDecodeError（本次未致命但属隐患）。显式 UTF-8 + errors=replace，
            #    坏字节被替换而非抛异常（text=True 与 encoding 可共存，encoding 优先）。
            encoding="utf-8",
            errors="replace",
            timeout=timeout_s,
            # ⚠️ cwd 必须是 kernel/：fetch_corpus.py 以 `from sciret_kernel...` 导入内核模块，
            #    而内核**不装包**（靠 cwd 定位自身）。cwd 错了就是
            #    "No module named 'sciret_kernel" —— 我第一次就踩了这个。
            cwd=str(_KERNEL_DIR),
            # ⚠️ 必须把 **kernel/**（内核包的父目录，不是包目录本身）放进 PYTHONPATH：
            #    fetch_corpus.py 用 `from sciret_kernel.xxx` 导入，内核**不装包**（靠路径定位）。
            #    cwd 只影响相对路径解析，**不会**自动加进 sys.path —— 只设 cwd 仍报
            #    "No module named 'sciret_kernel"（我连踩两次就是这个）。
            #    这里要的是 _REPO_KERNEL_DIR（= kernel/），写成 _KERNEL_DIR（= kernel/sciret_kernel/）
            #    会让解释器去找 kernel/sciret_kernel/sciret_kernel —— 仍然找不到。
            #    显式给一个干净的最小环境：抓取器不需要 AGH 的任何变量，
            #    继承宿主环境反而可能带入代理/token 造成不可控行为。
            env={"PATH": os.environ.get("PATH", ""), "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
                 "PYTHONPATH": str(_REPO_KERNEL_DIR),
                 "HTTP_PROXY": os.environ.get("HTTP_PROXY", ""), "HTTPS_PROXY": os.environ.get("HTTPS_PROXY", ""),
                 "NO_PROXY": os.environ.get("NO_PROXY", "")},
        )
        # 抓取器**没有记录时返回 1**（明确禁止伪造数据），此时 tmp_path 可能不存在
        if proc.returncode != 0 or not tmp_path.exists():
            reason = (proc.stderr or proc.stdout or f"退出码 {proc.returncode}").strip().splitlines()
            return {"ok": False, "reason": f"抓取失败：{reason[-1] if reason else '未知原因'}"}

        with open(tmp_path, "r", encoding="utf-8") as fh:
            snap = json.load(fh)
        records = snap.get("records") or []
        if not records:
            # 理论上抓取器不会写出空 records（它自己会拒绝），这里再兜一层：
            # 空快照会一路读到底，最终产出"检索到 0 篇"的假成功。
            return {"ok": False, "reason": "抓取结果为空（不生成空快照，避免假成功）"}

        # 原子替换
        os.replace(tmp_path, out_path)
        return {
            "ok": True,
            "name": name,
            "path": out_path,
            "records": len(records),
            "source_status": dict(snap.get("source_status", {})),
            "query": fetch_query,
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "reason": f"抓取超时（>{int(timeout_s)}s）"}
    except Exception as e:  # noqa: BLE001 - 任何失败都必须转为"回落"，不得中断流水线
        return {"ok": False, "reason": f"抓取异常：{type(e).__name__}: {e}"}
    finally:
        # 清理临时文件（此时要么已 os.replace 走掉，要么是残留）
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except OSError:
            pass


def resolve_online(
    goal: str,
    lit_source: str,
    sources: list[str],
    per_source: int = 8,
    timeout_s: float = 90.0,
    queries: list[str] | None = None,
    skip_sources: list[str] | None = None,
) -> tuple[str, dict[str, Any], dict[str, Any]]:
    """为在线模式解析出(快照名, 快照数据, 来源状态注记)。

    流程：尝试刷新 → 成功用新的；失败回落**既有**快照（按关键词选优）。
    注记 `online` 会进 `source_status`，让审计能看出"本次是真联网还是回落"，
    `online_query` 留痕实际使用的检索查询（规划查询或 goal 原文）。

    源熔断（v2.2）：`skip_sources` 中的源在本 run 内不再抓取（上一轮已标记
    unavailable），全部源熔断时直接回落既有快照；无快照仍 Fail-fast，绝不伪造。

    两条必须守住的性质：
    1. **回落时不覆盖 source_status 里的失败原因** —— 否则"抓取失败"会被
       快照里的 `ok:8` 覆盖掉，降级语义（L1/L2）就会被误判为 L0；
    2. **绝不伪造记录** —— 无既有快照可回落时抛错，让流水线 Fail-fast。
    """
    fetch_query = pick_fetch_query(goal, queries)
    attempt = {"online_attempted": lit_source != "local", "online_refresh": False, "online_query": fetch_query}
    if lit_source == "local":
        name, snap = corpus.select_snapshot(goal, lit_source)
        return name, snap, attempt

    #在线模式：显式指定的 sources 优先；为空则用内核已知的两个远程源
    # 只抓**已注册**的源。不再硬编码 ("crossref", "openalex") ——
    # 那是又一处"声明与实现可能不一致"的地方：新增源忘了改这里就会被静默忽略。
    # 问注册表则天然一致（§14：新增源只需注册一次）。
    fetch_sources = [s for s in sources if s in source_spi.REGISTRY]
    if not fetch_sources:
        fetch_sources = source_spi.known_sources()
    skipped = sorted({str(s) for s in (skip_sources or [])})
    if skipped:
        fetch_sources = [s for s in fetch_sources if s not in set(skipped)]
        attempt["circuit_skipped"] = list(skipped)
    if not fetch_sources:
        # 全部源已熔断：不再发起任何抓取，直落既有快照（无快照则照旧 Fail-fast）
        reason = f"源熔断生效（{', '.join(skipped)} 本 run 内不再重试）"
        names = corpus.available_snapshots()
        if not names:
            raise FileNotFoundError(
                f"在线检索失败且无可用本地快照可回落：{reason}。"
                f"请检查网络/代理，或先运行 kernel/tools/fetch_corpus.py 冻结一份语料。"
            )
        name, snap = corpus.select_snapshot(goal, "auto")
        return name, snap, {**attempt, "online_refresh": False, "online_fallback_reason": reason}

    result = refresh_snapshot(goal, fetch_sources, per_source=per_source, timeout_s=timeout_s, queries=queries)
    if result.get("ok"):
        name = str(result["name"])
        return name, corpus.load_snapshot(name), {
            **attempt,
            "online_refresh": True,
            "online_records": result.get("records", 0),
        }

    # 回落：读既有快照（不联网）
    reason = str(result.get("reason", "未知原因"))
    names = corpus.available_snapshots()
    if not names:
        # Fail-fast：既抓不到、也无快照 → 不编造，直接报错
        raise FileNotFoundError(
            f"在线检索失败且无可用本地快照可回落：{reason}。"
            f"请检查网络/代理，或先运行 kernel/tools/fetch_corpus.py 冻结一份语料。"
        )
    name, snap = corpus.select_snapshot(goal, "auto")
    return name, snap, {
        **attempt,
        "online_refresh": False,
        "online_fallback_reason": reason,
    }