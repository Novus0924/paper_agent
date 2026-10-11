#!/usr/bin/env bash
# paper-agent AGH 包装脚本 —— 一条命令调用 AGH，并自动处理本机四个已知坑：
#   ① AGH 入口用**绝对路径**（agnes.mjs 只在 AGH 仓库里，不在本项目）
#   ② 强制 cd 到【项目根】（AGH 的 file:./ 包源与 daemon 工作目录都依赖它）
#   ③ 注入插件运行期环境变量（daemon 会继承 → 插件子进程才能找到 Python 内核）
#   ④ node 用**绝对路径 + 多候选**（干净 shell 里裸 node 可能解析到 <24 的托管版）
#
# 用法：
#   bash agh.sh daemon start | daemon status | daemon stop
#   bash agh.sh package status | package inspect "file:./plugin/sciret"
#   bash agh.sh serve
#   bash agh.sh sessions --json | export <session_id> --format agnes -o out.jsonl
set -euo pipefail

AGH_ENTRY="D:/agnes-harness-main/packages/cli/dist/local/agnes.mjs"
PROJ_ROOT="D:/workBubbyStore/paper-agent-2"
PY_BIN="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"

NODE_BIN=""
for candidate in "C:/Program Files/nodejs/node.exe" \
                 "C:/Users/lenovo/.workbuddy/binaries/node/versions/24.21.0-1/node.exe" \
                 "C:/Users/lenovo/.workbuddy/binaries/node/versions/22.22.2-6/node.exe"; do
  if [ -x "$candidate" ]; then NODE_BIN="$candidate"; break; fi
done
if [ -z "$NODE_BIN" ]; then NODE_BIN="$(command -v node || true)"; fi
if [ -z "$NODE_BIN" ]; then echo "[agh.sh] 找不到 node（需要 ≥24.10）" >&2; exit 1; fi

# 起飞前自检：AGH 入口若未被当作主模块执行，会"零输出 + 退出码 0"，这里当场暴露
if [ "${AGH_SKIP_SELFTEST:-0}" != "1" ]; then
  VERSION_OUT="$("$NODE_BIN" "$AGH_ENTRY" --version 2>&1 || true)"
  if [ -z "$VERSION_OUT" ]; then
    echo "[agh.sh] ❌ AGH 入口无输出（agnes.mjs 未被当作主模块执行）。" >&2
    echo "         请确认入口存在且用 Windows 盘符路径调用：$AGH_ENTRY" >&2
    exit 1
  fi
fi

cd "$PROJ_ROOT"
export PAPER_AGENT_PYTHON="${PAPER_AGENT_PYTHON:-$PY_BIN}"
export PAPER_AGENT_KERNEL_ROOT="${PAPER_AGENT_KERNEL_ROOT:-$PROJ_ROOT/kernel}"
export PAPER_AGENT_RUNS_DIR="${PAPER_AGENT_RUNS_DIR:-$PROJ_ROOT/runs}"
export PAPER_AGENT_ROOT="${PAPER_AGENT_ROOT:-$PROJ_ROOT}"

exec "$NODE_BIN" "$AGH_ENTRY" "$@"
