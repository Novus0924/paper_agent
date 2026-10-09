"""内核 CLI 入口。

调用契约（AGH 插件 sciret_* 工具 → 本内核）：
    python -m sciret_kernel <tool> --run-dir <dir> --args-json <json>

输出：stdout 上的单个 JSON 对象（结构化结果）；非 0 退出码 = 工具失败。
M0：仅 ping（连通性/可写性检查）。后续里程碑在此注册完整工具目录。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from . import __version__


def tool_ping(args: dict) -> dict:
    run_dir = Path(args["run_dir"])
    run_dir.mkdir(parents=True, exist_ok=True)
    probe = run_dir / ".sciret-ping"
    probe.write_text(json.dumps({"pong": True, "ts_utc_epoch": 0}), encoding="utf-8")
    return {
        "ok": True,
        "tool": "ping",
        "kernel_version": __version__,
        "run_dir": str(run_dir),
        "writable": os.access(run_dir, os.W_OK),
    }


TOOLS = {
    "ping": tool_ping,
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="sciret_kernel", description="paper-agent 确定性科研内核")
    parser.add_argument("tool", choices=sorted(TOOLS), help="工具名")
    parser.add_argument("--run-dir", required=True, help="任务运行目录")
    parser.add_argument("--args-json", default="{}", help="工具参数（JSON 字符串）")
    ns = parser.parse_args(argv)

    try:
        args = json.loads(ns.args_json)
        if not isinstance(args, dict):
            raise ValueError("args-json 必须是 JSON 对象")
    except ValueError as e:
        print(json.dumps({"ok": False, "error": f"参数解析失败: {e}"}), file=sys.stdout)
        return 2

    # --run-dir 为权威值（CLI 传入），覆盖 args-json 中的同名字段
    args["run_dir"] = ns.run_dir

    try:
        result = TOOLS[ns.tool](args)
    except Exception as e:  # noqa: BLE001 - 内核边界：任何工具失败都结构化上报
        print(json.dumps({"ok": False, "error": f"{type(e).__name__}: {e}"}), file=sys.stdout)
        return 1

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
