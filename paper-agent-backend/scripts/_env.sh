# 机器无关的环境发现（仓库内 shell 脚本共用；由 agh.sh 与 scripts/*.sh source）
#
# 为什么要抽出来：这些脚本原先把**某一台开发机**的绝对路径写死在正文里
#   AGH_ENTRY="D:/agnes-harness-main/..."   PROJ_ROOT="D:/workBubbyStore/paper-agent-2"
#   PY_BIN="C:/Users/lenovo/.workbuddy/.../python.exe"
# 后果不是"不够优雅"，而是 README 第 2 步（`bash agh.sh daemon start`）在第二台机器上
# 直接 `cd: No such file or directory` 退出 —— 换机的人只能靠口口相传绕开脚本。
#
# 约定：
#   - 环境变量永远优先（PAPER_AGENT_PYTHON / PAPER_AGENT_AGH_ROOT / AGH_DATA_DIR …），
#     显式指定错了要**报错并给出该变量的含义**，而不是静默回落到探测值；
#   - 探测顺序统一：env → PATH 上的命令名 → 常见安装位置通配；
#   - 传给 node/python 子进程的路径用 Windows 盘符式（cygpath -m），
#     因为 AGH 与内核都按原生 Windows 路径解析，MSYS 的 /c/... 形式在部分调用里会被原样带过去。

# 仓库根（本文件在 <root>/scripts/ 或 <root>/scripts/_env.sh 被 source 时都能定位）
pa_proj_root() {
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  (cd "$here/.." && pwd)
}

# 转成 Windows 盘符路径（C:/...）；无 cygpath 时原样返回
pa_win() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$1" 2>/dev/null || echo "$1"
  else
    echo "$1"
  fi
}

# 挑一个能跑且版本 ≥24.10 的 node（AGH 原生模块按 Node 24 的 libuv ABI 构建）
pa_node() {
  local c maj min
  for c in "$(command -v node 2>/dev/null || true)" \
           "/c/Program Files/nodejs/node.exe" "C:/Program Files/nodejs/node.exe" \
           /c/Users/*/.workbuddy/binaries/node/versions/*/node.exe; do
    [ -n "$c" ] && [ -x "$c" ] || continue
    maj="$("$c" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    min="$("$c" -p 'process.versions.node.split(".")[1]' 2>/dev/null || echo 0)"
    if [ "${maj:-0}" -gt 24 ] 2>/dev/null || { [ "${maj:-0}" -eq 24 ] && [ "${min:-0}" -ge 10 ]; } 2>/dev/null; then
      echo "$c"
      return 0
    fi
  done
  # 没有合规版本时退回第一个可用的 node，让调用方自己按自检脚本给指引
  for c in "$(command -v node 2>/dev/null || true)" "/c/Program Files/nodejs/node.exe"; do
    [ -n "$c" ] && [ -x "$c" ] && { echo "$c"; return 0; }
  done
  return 1
}

# 挑一个可用的 Python（内核只要标准库，版本要求见 README §安装：≥3.10）
pa_python() {
  local c d
  if [ -n "${PAPER_AGENT_PYTHON:-}" ]; then
    if [ -x "$PAPER_AGENT_PYTHON" ] || command -v "$PAPER_AGENT_PYTHON" >/dev/null 2>&1; then
      echo "$PAPER_AGENT_PYTHON"
      return 0
    fi
    echo "PAPER_AGENT_PYTHON 指向的解释器不可用：$PAPER_AGENT_PYTHON" >&2
    return 1
  fi
  for c in python python3 py; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys' >/dev/null 2>&1; then
      command -v "$c"
      return 0
    fi
  done
  # WorkBuddy 托管安装：按当前机器的任意用户名匹配，而不是写死某个人
  for d in /c/Users/*/.workbuddy/binaries/python/versions/*/python.exe; do
    [ -x "$d" ] && { echo "$d"; return 0; }
  done
  return 1
}

# AGH 仓库根：显式变量优先，其次与本项目同级/上级的约定布局，最后历史候选
pa_agh_root() {
  local r d
  if [ -n "${PAPER_AGENT_AGH_ROOT:-}" ]; then
    if [ -f "$PAPER_AGENT_AGH_ROOT/packages/cli/dist/local/agnes.mjs" ]; then
      echo "$PAPER_AGENT_AGH_ROOT"
      return 0
    fi
    echo "PAPER_AGENT_AGH_ROOT 指向的目录没有 AGH 构建产物：$PAPER_AGENT_AGH_ROOT" >&2
    echo "（需要 packages/cli/dist/local/agnes.mjs；AGH 仓库要先执行构建）" >&2
    return 1
  fi
  local root
  root="$(pa_proj_root)"
  for r in \
    "$root/../../agnes-harness-main" "$root/../../agnes-harness" \
    "$root/../agnes-harness-main" "$root/../agnes-harness" \
    "D:/agnes-harness-main" "D:/agnes-harness" "C:/agnes-harness-main"; do
    for d in "$r" "$(pa_win "$r")"; do
      if [ -f "$d/packages/cli/dist/local/agnes.mjs" ]; then
        echo "$d"
        return 0
      fi
    done
  done
  return 1
}

pa_agh_entry() {
  local root
  root="$(pa_agh_root)" || return 1
  pa_win "$root/packages/cli/dist/local/agnes.mjs"
}

pa_agh_daemon_entry() {
  local root
  root="$(pa_agh_root)" || return 1
  pa_win "$root/packages/cli/dist/local/daemon.mjs"
}

# AGH 主数据目录（**必须**是 ~/.agh/data，不是 profile 私有目录，详见 agh-daemon-up.sh 顶部说明）
pa_agh_data_dir() {
  if [ -n "${AGH_DATA_DIR:-}" ]; then
    echo "$AGH_DATA_DIR"
    return 0
  fi
  local home h
  home="${USERPROFILE:-$HOME}"
  h="$(pa_win "$home")"
  echo "${h%/}/.agh/data"
}
