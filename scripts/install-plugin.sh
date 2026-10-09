#!/usr/bin/env bash
# sciret 插件安装向导（AGH）
#
# 背景（结构限制，非本脚本缺陷）：
#   AGH 的 `package add` 会强制要求**真实 TTY** 交互确认（源码 packages/cli/src/bin.ts
#   confirmPackageInstall：stdin/stdout 非 TTY 时直接返回 false → "Installation cancelled."），
#   且没有 --yes/--force/环境变量任何后门。因此助手/CI 无法代装 —— 那一步必须由人在真实终端敲一次 y。
#
# 本脚本把**除那一句 y 之外**的所有环节自动化，并在两侧做校验：
#   check        只读预检（node/AGH/daemon/旧包状态/inspect 预览/插件离线自检）
#   disable-old  停用 v1.0 遗留包 paper-agent-tools（避免 sciret_* 工具重名冲突，可逆）
#   add          打印需要人工执行的安装命令（本脚本不能代做）
#   finish       add 之后自动执行：trust（自动取 integrity/capabilityHash）→ enable → status 三字段校验 → 离线自检
#
# 用法（在项目根或任意位置均可，脚本内部会 cd）：
#   bash scripts/install-plugin.sh check
#   bash scripts/install-plugin.sh disable-old
#   >>> 人工：在真实终端执行 `bash agh.sh install file:./plugin/sciret` 并敲 y <<<
#   bash scripts/install-plugin.sh finish
set -uo pipefail

PROJ_ROOT="D:/workBubbyStore/paper-agent-2"
AGH_HOME_DEFAULT="C:/Users/lenovo/.agh"
PROFILE="${AGNES_PROFILE:-local-dev}"
PKG_SOURCE="file:./plugin/sciret"
PKG_ID="ext:paper-agent/sciret"
OLD_PKG_ID="ext:paper-agent/tools"
PY_BIN="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"

cd "$PROJ_ROOT"

ok()   { echo "[✓] $*"; }
warn() { echo "[!] $*"; }
err()  { echo "[×] $*" >&2; }
step() { echo; echo "=== $* ==="; }

agh() { bash "$PROJ_ROOT/agh.sh" "$@"; }

export_env() {
  export PAPER_AGENT_PYTHON="${PAPER_AGENT_PYTHON:-$PY_BIN}"
  export PAPER_AGENT_KERNEL_ROOT="${PAPER_AGENT_KERNEL_ROOT:-$PROJ_ROOT/kernel}"
  export PAPER_AGENT_RUNS_DIR="${PAPER_AGENT_RUNS_DIR:-$PROJ_ROOT/runs}"
}

lock_file() { echo "${AGH_HOME:-$AGH_HOME_DEFAULT}/profiles/$PROFILE/agnes-lock.json"; }
audit_file() { echo "${AGH_HOME:-$AGH_HOME_DEFAULT}/profiles/$PROFILE/.agnes-package-audit.jsonl"; }

pkg_state() { # $1 = package name → "trust=... enabled=..."
  "$PY_BIN" - "$1" <<'PY'
import json, sys
from pathlib import Path
name = sys.argv[1]
home = Path(__import__('os').environ.get('AGH_HOME', 'C:/Users/lenovo/.agh'))
profile = __import__('os').environ.get('AGNES_PROFILE', 'local-dev')
lock = home / 'profiles' / profile / 'agnes-lock.json'
if not lock.exists():
    print('MISSING'); raise SystemExit
d = json.loads(lock.read_text(encoding='utf-8'))
entry = (d.get('packages') or {}).get(name)
if not entry:
    print('NOT_INSTALLED'); raise SystemExit
st = entry.get('state') or {}
print(f"v{entry.get('version','?')} trust={entry.get('trust','?')} enabled={st.get('enabled')} integrity={entry.get('integrity','')}")
PY
}

cmd_check() {
  step "1/5 基础环境"
  local nodev; nodev="$("C:/Program Files/nodejs/node.exe" -v 2>/dev/null || echo missing)"
  case "$nodev" in v2[4-9]*|v[3-9]*) ok "node $nodev";; *) warn "node $nodev（AGH 需要 ≥24.10）";; esac
  [ -f "D:/agnes-harness-main/packages/cli/dist/local/agnes.mjs" ] && ok "AGH 构建产物存在" || err "AGH 构建产物缺失"

  step "2/5 daemon 状态（只读；不会拉起新 daemon）"
  local st; st="$(agh daemon status 2>&1 | head -1)"
  echo "$st"
  echo "$st" | grep -q '"running":true' && ok "daemon 运行中" || warn "daemon 未运行（安装/启用需要 daemon，脚本调用时会自动拉起，且已带环境变量）"

  step "3/5 遗留包冲突检查"
  local old; old="$(pkg_state paper-agent-tools)"
  if [ "$old" = "NOT_INSTALLED" ]; then ok "未安装 paper-agent-tools（无冲突）"
  elif echo "$old" | grep -q "enabled=True"; then warn "paper-agent-tools 仍启用：$old → 与本插件 7 个工具重名，请先执行 disable-old"
  else ok "paper-agent-tools 已停用：$old"; fi
  local mine; mine="$(pkg_state "@paper-agent/plugin-sciret")"
  [ "$mine" = "NOT_INSTALLED" ] && warn "本插件尚未安装" || ok "本插件已安装：$mine"

  step "4/5 包源可接受性（inspect 预览）"
  agh package inspect "$PKG_SOURCE" 2>&1 | head -12 || err "inspect 失败（若报 source could not be accepted：daemon 不是从项目根启动）"

  step "5/5 插件本体离线自检（无需安装）"
  export_env
  node plugin/sciret/verify-offline.mjs || err "离线自检失败"
}

cmd_disable_old() {
  step "停用遗留包 $OLD_PKG_ID（可逆：package enable $OLD_PKG_ID 即可恢复）"
  agh package disable "$OLD_PKG_ID" 2>&1 | head -10
  echo "当前状态：$(pkg_state paper-agent-tools)"
}

cmd_add() {
  step "需要人工执行的安装步骤（AGH 强制真实 TTY 确认，脚本无法代做）"
  cat <<'EOS'
请在【真实终端窗口】（Windows Terminal / PowerShell / 带 TTY 的 Git Bash）执行：

    cd D:/workBubbyStore/paper-agent-2
    bash agh.sh install file:./plugin/sciret
    # 出现 "Install @paper-agent/plugin-sciret@... ? [y/N]" 时输入 y 回车

完成后回到助手，执行：

    bash scripts/install-plugin.sh finish
EOS
  exit 2
}

cmd_finish() {
  step "1/4 收集 integrity 与 capabilityHash（自动）"
  local entry integrity capability
  entry="$(pkg_state "@paper-agent/plugin-sciret")"
  if [ "$entry" = "NOT_INSTALLED" ]; then err "尚未安装：请先在真实终端执行 bash agh.sh install $PKG_SOURCE"; exit 1; fi
  echo "锁文件条目：$entry"
  integrity="$(echo "$entry" | sed -n 's/.*integrity=\(.*\)$/\1/p')"
  capability="$("$PY_BIN" - <<PY
import json
from pathlib import Path
p = Path("${AGH_HOME:-$AGH_HOME_DEFAULT}/profiles/$PROFILE/.agnes-package-audit.jsonl")
cap = ""
if p.exists():
    for line in p.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            e = json.loads(line)
        except Exception:
            continue
        if e.get("package") == "@paper-agent/plugin-sciret" and e.get("operation") == "install":
            cap = ((e.get("capabilityDiff") or {}).get("next")) or cap
print(cap)
PY
)"
  [ -n "$integrity" ] && ok "integrity=$integrity" || err "未取到 integrity"
  [ -n "$capability" ] && ok "capabilityHash=$capability" || err "未取到 capabilityHash（可改用 Web 页面安装以自动绑定）"
  [ -z "$integrity" ] && exit 1

  step "2/4 trust + enable"
  if echo "$entry" | grep -q "trust=trusted"; then ok "已信任，跳过 trust"; else agh package trust "@paper-agent/plugin-sciret" "$integrity" "$capability" 2>&1 | head -6; fi
  agh package enable "$PKG_ID" 2>&1 | head -6

  step "3/4 终验三字段（desired=enabled 且 actual=running 且 trusted=true）"
  agh package status 2>&1 | head -12
  echo "锁文件状态：$(pkg_state "@paper-agent/plugin-sciret")"

  step "4/4 插件本体离线自检"
  export_env
  node plugin/sciret/verify-offline.mjs

  cat <<'EOS'

=== 下一步（真实会话验证）===
1) 确保 daemon 由【项目根】启动且带环境变量（agh.sh 已保证）：
       bash agh.sh daemon stop && bash agh.sh daemon start
2) 新开一个会话（旧会话不加载新能力），让模型调用工具：
       "请调用 sciret_ping 检查内核，然后用 sciret_plan 初始化一个 research 任务"
3) 导出执行记录作为比赛证据：
       bash agh.sh export <session_id> --format agnes -o runs/<task_id>/session.jsonl
EOS
}

case "${1:-check}" in
  check) cmd_check ;;
  disable-old) cmd_disable_old ;;
  add) cmd_add ;;
  finish) cmd_finish ;;
  *) echo "用法: bash scripts/install-plugin.sh {check|disable-old|add|finish}" >&2; exit 64 ;;
esac
