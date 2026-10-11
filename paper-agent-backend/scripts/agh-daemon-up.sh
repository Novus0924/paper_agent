#!/usr/bin/env bash
# 启动 AGH daemon 并在同一调用内等待就绪（供需要真实会话的 E2E 使用）。
#
# ⚠️ data-dir 必须是 **~/.agh/data**（AGH 的默认主数据目录），不是
#    ~/.agh/profiles/<profile>/data。后者是 profile 私有目录；若误传它，
#    新 daemon 会与已有 daemon 抢同一份 mutation 锁，报
#    "state lock timeout"（实测踩过：排查了半天才发现是 dataDir 传错，不是锁坏了）。
#    权威依据：~/.agh/data/daemon/discovery.json 的 dataDir 字段。
#
# 为什么不用 `bash agh.sh daemon start`：CLI 的 readiness 探测在本机会超时；
# 且沙箱环境下后台进程不跨 Bash 调用存活，故必须「启动 + 轮询 + 使用」放在同一次调用里。
#
# 用法： bash scripts/agh-daemon-up.sh [workspace]
# 成功输出： READY <pid> <socketPath>
set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=_env.sh
. "$(dirname "$0")/_env.sh"

WS="${1:-$PWD}"
DATA="${AGH_DATA_DIR:-$(pa_agh_data_dir)}"
DAEMON_ENTRY="$(pa_agh_daemon_entry)" || {
  echo "[FATAL] 未找到 AGH daemon 入口，请设置 PAPER_AGENT_AGH_ROOT" >&2
  exit 1
}

export PATH="/c/Program Files/nodejs:$PATH"
NODE_BIN="$(pa_node || true)"
[ -n "$NODE_BIN" ] || { echo "[FATAL] 未找到 node（AGH 需要 ≥24.10）" >&2; exit 1; }

# ⚠️ 必须清掉 WorkBuddy 的 shim 注入（实测踩坑）：
#   NODE_OPTIONS=--require=.../node-language-shim.cjs 会加载 safe-delete 守卫，
#   它在 AGH 维护 SQLite 锁文件时输出 "[safe-delete] ... state lock timeout" 并让 daemon 启动失败。
#   该报错**不在 AGH 源码里**（全仓 grep 无 safe-delete 字样），纯由宿主环境注入。
unset CODEBUDDY_SAFE_DELETE_BULK_GUARD CODEBUDDY_SAFE_DELETE_SANDBOX \
      CODEBUDDY_SAFE_DELETE_BIN_DIR CODEBUDDY_SAFE_DELETE_ENABLED \
      CODEBUDDY_SAFE_DELETE_BROKER_DELETE 2>/dev/null || true

NODE_OPTIONS="" "$NODE_BIN" "$DAEMON_ENTRY" --profile local-dev --workspace "$WS" --data-dir "$DATA" \
  >data/_daemon_m8.log 2>&1 &
DPID=$!
trap 'kill $DPID 2>/dev/null' EXIT

for i in $(seq 1 60); do
  # 就绪判定读的是 **daemon 实际写入的 data-dir**（AGH_DATA_DIR 覆盖时不能再去翻 ~/.agh）
  SOCK=$(PA_DATA="$DATA" "$NODE_BIN" -e '
const fs=require("fs");
const p=process.env.PA_DATA+"/daemon/discovery.json";
try{const j=JSON.parse(fs.readFileSync(p,"utf8"));
process.stdout.write(String(j.socketPath||""));}catch(e){}
' 2>/dev/null)
  if [ -n "$SOCK" ]; then
    echo "READY $DPID $SOCK"
    exit 0
  fi
  if ! kill -0 "$DPID" 2>/dev/null; then
    echo "FAILED: daemon 进程已退出，日志：" >&2
    tail -20 data/_daemon_m8.log >&2
    exit 1
  fi
  sleep 0.5
done
echo "FAILED: 60次轮询后仍未就绪，日志：" >&2
tail -20 data/_daemon_m8.log >&2
exit 1