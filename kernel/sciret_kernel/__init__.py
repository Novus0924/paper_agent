"""paper-agent 确定性科研内核（sciret_kernel）。

技术红线（需求文档 §1.2）：
- 零第三方依赖：仅 Python 标准库；
- 可复现：相同输入 → 相同产物（状态机驱动、产物带 SHA-256、原子写）。

模块布局（随里程碑演进）：
- __main__.py     CLI 入口（AGH 插件 sciret_* 工具的调用目标）
- state.py        Run/Step 状态机（M3）
- ledger.py       证据 append-only 哈希链账本（M2）
- pipeline.py     research/materials 流水线（M2/M3）
- report.py       报告装配与门禁（M6）
"""

__version__ = "0.1.0-mvp"
