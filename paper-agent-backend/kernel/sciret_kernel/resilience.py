"""容错策略原语（需求文档 §2.2 配套策略 3、§6 容错与降级策略表）。

标准库实现，零第三方依赖，可独立单测。

三项策略：
- **重试**：瞬时错误（5xx / 429 / 连接 / 超时）按指数退避 + 抖动重试有限次；
  4xx 等**永久错误不重试**（重试只会浪费配额并加重对方限流）。
- **超时**：单源独立超时，互不阻塞。
- **受控并发**：多源并发取数，但**结果按输入顺序归并**——并发只影响耗时，
  不影响输出顺序，从而保住确定性（这是 §2.2③ 的核心约束，不是性能优化）。
"""

from __future__ import annotations

import random
import time

__all__ = [
    "RetryPolicy",
    "TransientError",
    "PermanentError",
    "classify_http_error",
    "run_with_retry",
    "map_ordered",
    "default_retry_policy",
]


class TransientError(RuntimeError):
    """瞬时错误：值得重试（网络抖动、限流、5xx、超时）。"""


class PermanentError(RuntimeError):
    """永久错误：重试无意义（4xx 参数错、404、不支持的操作）。"""


class RetryPolicy:
    """指数退避 + 抖动的重试策略。

    退避序列：``base * factor**(n-1)``，上限 ``cap``；抖动为 ``delay * jitter_ratio * u``，
    其中 ``u ∈ [0, 1)``。抖动用**显式传入的 rng**，不用全局 random——
    这样单测可以注入确定性 rng，生产用 ``random.Random`` 即可。
    """

    __slots__ = ("max_attempts", "base_delay_s", "cap_delay_s", "factor", "jitter_ratio")

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay_s: float = 1.0,
        cap_delay_s: float = 8.0,
        factor: float = 2.0,
        jitter_ratio: float = 0.25,
    ) -> None:
        if max_attempts < 1:
            raise ValueError(f"max_attempts 必须 ≥1，收到 {max_attempts}")
        if base_delay_s <= 0:
            raise ValueError(f"base_delay_s 必须 >0，收到 {base_delay_s}")
        if cap_delay_s < base_delay_s:
            raise ValueError(f"cap_delay_s({cap_delay_s}) 不得小于 base_delay_s({base_delay_s})")
        if factor < 1:
            raise ValueError(f"factor 必须 ≥1，收到 {factor}")
        if not (0 <= jitter_ratio < 1):
            raise ValueError(f"jitter_ratio 必须 ∈[0,1)，收到 {jitter_ratio}")
        self.max_attempts = max_attempts
        self.base_delay_s = base_delay_s
        self.cap_delay_s = cap_delay_s
        self.factor = factor
        self.jitter_ratio = jitter_ratio

    def delay_for(self, attempt: int, rng) -> float:
        """第 ``attempt`` 次重试前的等待秒数（attempt 从 1 起）。"""
        if attempt < 1:
            raise ValueError(f"attempt 从 1 起，收到 {attempt}")
        raw = self.base_delay_s * (self.factor ** (attempt - 1))
        capped = min(raw, self.cap_delay_s)
        if self.jitter_ratio <= 0:
            return capped
        return capped + capped * self.jitter_ratio * rng.random()

    def to_dict(self) -> dict:
        return {
            "max_attempts": self.max_attempts,
            "base_delay_s": self.base_delay_s,
            "cap_delay_s": self.cap_delay_s,
            "factor": self.factor,
            "jitter_ratio": self.jitter_ratio,
        }


def default_retry_policy() -> RetryPolicy:
    """需求 §6 的默认策略：指数退避（如 1s/2s）+ 抖动；上限次数（如 3）。"""
    return RetryPolicy(max_attempts=3, base_delay_s=1.0, cap_delay_s=8.0, factor=2.0, jitter_ratio=0.25)


def classify_http_error(status: int) -> type[Exception]:
    """按 HTTP 状态码分类：429/5xx 瞬时，其余 4xx 永久。

    429 单列——限流是典型的瞬时错误，退避后往往能成功；
    而 400/401/403/404 重试只会浪费配额并可能触发更严的封禁。
    """
    if status == 429 or 500 <= status <= 599:
        return TransientError
    if 400 <= status <= 499:
        return PermanentError
    # 3xx/2xx 走到这里说明调用方判断有误，按永久处理（不重试）
    return PermanentError


def run_with_retry(fn, *, policy: RetryPolicy | None = None, rng=None, sleep=None):
    """执行 ``fn()``，按 ``policy`` 重试瞬时错误；永久错误立即抛出。

    - 瞬时错误：重试至``max_attempts`` 次，仍失败则抛出**最后一次**异常；
    - 永久错误：立刻抛出，不浪费任何一次重试。
    - ``sleep``/``rng`` 可注入 → 单测无需真实等待，且完全确定性。
    """
    p = policy or default_retry_policy()
    r = rng if rng is not None else random.Random()
    sl = sleep if sleep is not None else time.sleep

    last: Exception | None = None
    for attempt in range(1, p.max_attempts + 1):
        try:
            return fn()
        except PermanentError:
            raise
        except TransientError as e:
            last = e
            if attempt >= p.max_attempts:
                break
            sl(p.delay_for(attempt, r))
    assert last is not None
    raise last


def map_ordered(fn, items, *, workers: int = 4):
    """受控并发执行 ``fn(item)``，**结果按items 顺序返回**。

    §6：「检索多源并发取数，结果按固定顺序归并（保确定性）」。
    并发只压缩耗时；顺序由本函数保证，因此调用方拿到的序列与串行完全一致。

    - 超过 ``workers`` 的部分不额外起线程（受控并发，避免把对方 API 打爆）；
    - 任一项失败即抛出（由调用方决定是否降级为该源 unavailable）。
    """
    from concurrent.futures import ThreadPoolExecutor

    items = list(items)
    if not items:
        return []
    n = max(1, min(int(workers), len(items)))
    if n == 1:
        return [fn(x) for x in items]
    with ThreadPoolExecutor(max_workers=n) as pool:
        # executor.map 按输入顺序产出结果 → 顺序天然保持
        return list(pool.map(fn, items))
