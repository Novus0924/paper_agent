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

# 路径/解释器全部现场探测（见 scripts/_env.sh）。
# 这里原先写死某台开发机的 D:/ 与 C:/Users/lenovo 路径，README 的第 2、3 步
# 在别的机器上会直接 `cd: No such file or directory`。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/_env.sh
. "$SCRIPT_DIR/scripts/_env.sh"

PROJ_ROOT="$(pa_proj_root)"
PROJ_ROOT_WIN="$(pa_win "$PROJ_ROOT")"
AGH_ENTRY="$(pa_agh_entry)" || {
  echo "[agh.sh] ❌ 未找到 AGH 构建产物（packages/cli/dist/local/agnes.mjs）。" >&2
  echo "         请设置 PAPER_AGENT_AGH_ROOT 指向 AGH 仓库根，或把 AGH 放在本项目同级目录。" >&2
  exit 1
}

NODE_BIN="$(pa_node || true)"
if [ -z "$NODE_BIN" ]; then echo "[agh.sh] 找不到 node（需要 ≥24.10）" >&2; exit 1; fi

PY_BIN="$(pa_python || true)"
if [ -z "$PY_BIN" ]; then echo "[agh.sh] 找不到 Python（内核需要 ≥3.10；可用 PAPER_AGENT_PYTHON 指定）" >&2; exit 1; fi
PY_BIN="$(pa_win "$PY_BIN")"

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
export PAPER_AGENT_KERNEL_ROOT="${PAPER_AGENT_KERNEL_ROOT:-$PROJ_ROOT_WIN/kernel}"
export PAPER_AGENT_RUNS_DIR="${PAPER_AGENT_RUNS_DIR:-$PROJ_ROOT_WIN/runs}"
export PAPER_AGENT_ROOT="${PAPER_AGENT_ROOT:-$PROJ_ROOT_WIN}"
# BFF 与插件都按同一个 AGH 根解析（config.ts 的候选探测在此变成显式值）
export PAPER_AGENT_AGH_ROOT="${PAPER_AGENT_AGH_ROOT:-$(pa_win "$(pa_agh_root)")}"

exec "$NODE_BIN" "$AGH_ENTRY" "$@"
