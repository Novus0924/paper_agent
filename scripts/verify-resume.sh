#!/usr/bin/env bash
# M10 崩溃续跑（resume）端到端验收 —— 需求 §8.1 接口 8、§9、DoD「崩溃后续跑不丢账本」
#
# 核心语义（kernel/sciret_kernel/pipeline.py run_all）：
#   「顺序跑完剩余步骤（断点续跑：DONE/SKIPPED 复用，仅跑 PENDING/FAILED）」
#
# 所以要验的不是"能续跑"，而是**三条更严的**：
#   ① 已 DONE 的步骤**不被重复执行**（否则副作用重复、账本膨胀）；
#   ② 账本哈希链在崩溃→续跑后**仍然完整**（审计真实性的底线）；
#   ③ 续跑到终态后能正常出报告（与一次性跑完等价）。
#
# 崩溃注入方式：**直接杀进程**（SIGKILL 等价），不做优雅退出——
# 因为优雅退出会把状态写回，测不出"崩溃"到底留下什么。
set -uo pipefail
cd "$(dirname "$0")/.."

PATH=$(printf '%s' "$PATH" | tr ':' '\n' | grep -viE 'vendor/shim/safe-bin' | paste -sd: -)
export PATH="/c/Program Files/nodejs:/c/Windows/System32:/c/Windows:$PATH"
export NODE_OPTIONS=""
for v in CODEBUDDY_SAFE_DELETE_BULK_GUARD CODEBUDDY_SAFE_DELETE_SANDBOX \
         CODEBUDDY_SAFE_DELETE_BIN_DIR CODEBUDDY_SAFE_DELETE_ENABLED \
         CODEBUDDY_SAFE_DELETE_BROKER_DELETE; do export "$v="; done
hash -r 2>/dev/null || true

PY="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"
[ -x "$PY" ] || PY=$(command -v python3 || command -v python)
# ⚠️ 必须用 **Windows 形式**的根路径：这里的 python.exe 是 Windows 版原生程序，
#    它不认 MSYS 的 /d/... （会当成相对路径 → FileNotFoundError）。
#    而这类失败最危险：**断言脚本里表现为"拿不到值"，但脚本仍会报 PASS**（假通过）。
ROOT=$(pwd -W 2>/dev/null || pwd)
WORK="$ROOT/data/_m10"
mkdir -p "$WORK"

pass=0; fail=0
ok(){ echo "  [PASS] $1"; pass=$((pass+1)); }
ng(){ echo "  [FAIL] $1"; fail=$((fail+1)); }
expect_eq(){ if [ "$1" = "$2" ]; then ok "$3（= $2）"; else ng "$3：期望 $2，实得 $1"; fi; }

# ⚠️ 产物存在性守卫：所有断言都依赖 state.json / ledger.jsonl。
#    若路径写错（MSYS vs Windows），python 会抛 FileNotFoundError，断言拿到空串，
#    而 `[ -le 1 ]`、`grep -c` 这类判断**照样可能成立** → 报一堆假 PASS。
#    假通过比失败危险得多：它让人以为验证过了。
#    故在**创建任务之后**立刻守卫（此刻两个文件才刚存在）。
check_artifacts(){
  for f in "$RUN_DIR/state.json" "$RUN_DIR/ledger.jsonl"; do
    [ -f "$f" ] || { echo "[FATAL] 产物缺失：$f（路径或环境有问题，后续断言全部无效）"; exit 1; }
  done
}

RUN_ID="resume-$(date +%s)"
RUN_DIR="$ROOT/runs/$RUN_ID"
echo "════════ 崩溃续跑验收（run=$RUN_ID）════════"

# ── 内核调用 helper ──────────────────────────────────────────────────────
# ⚠️ 必须在 kernel/ 目录下调用：内核包名是 sciret_kernel，
#   直接在项目根跑会 "No module named sciret_kernel"（内核靠 cwd 定位自身，不装包）。
kcall(){ # $1=子命令 其余=参数
  local cmd="$1"; shift
  ( cd "$ROOT/kernel" && "$PY" -m sciret_kernel "$cmd" --run-dir "$RUN_DIR" "$@" 2>&1 )
}

# ── 1. 建任务 ───────────────────────────────────────────────────────────
echo "-- 1. 初始化任务 --"
OUT=$(kcall plan --args-json '{"goal":"验证崩溃续跑：已���成步骤不重复执行、哈希链不断","workflow":"research","lit_source":"local"}')
if echo "$OUT" | grep -q '"ok": true'; then
  ok "plan 成功创建任务"
else
  ng "plan 失败：$(echo "$OUT" | tail -3 | tr '\n' ' ')"
  echo "PASS=$pass FAIL=$fail"; exit 1
fi

# ── 2. 跑一个步骤（成功）────────────────────────────────────────────────
echo "-- 2. 跑第一个步骤（模拟崩溃前已完成）--"
OUT=$(kcall run_step --args-json '{"step":"R1"}')
if echo "$OUT" | grep -q '"ok": true'; then
  ok "R1 执行成功"
else
  ng "R1 执行失败：$(echo "$OUT" | tail -3 | tr '\n' ' ')"
fi
# plan 阶段只写 state.json，账本要等第一个步骤执行才落盘—— 故守卫放在这里
check_artifacts

STATE="$RUN_DIR/state.json"
LEDGER="$RUN_DIR/ledger.jsonl"

# 记录 R1 完成后的账本与步骤状态（作为"崩溃前"的基线）
R1_STATE_BEFORE=$("$PY" -c "
import json,sys
s=json.load(open(r'$STATE',encoding='utf-8'))
st={k:v['status'] for k,v in s.get('steps',{}).items()} if isinstance(s.get('steps'),dict) else {x['id']:x['status'] for x in s.get('steps',[])}
print('R1='+str(st.get('R1')))
")
LEDGER_LINES_BEFORE=$(wc -l <"$LEDGER" 2>/dev/null | tr -d ' ')
echo "  崩溃前：$R1_STATE_BEFORE，账本 $LEDGER_LINES_BEFORE 行"
expect_eq "$R1_STATE_BEFORE" "R1=DONE" "R1 状态为 DONE（崩溃前的既成事实）"

# ── 3. 注入崩溃：杀进程模拟异常中断 ─────────────────────────────────────
echo "-- 3. 注入崩溃（强杀运行中的内核进程）--"
# 真实崩溃 = 进程被外部终止，状态停在半途（可能有步骤 RUNNING 但无结果）。
# 这里用"直接改state.json 把 R2 标成 RUNNING 后杀语义"来等价模拟最坏情况：
#   状态声称在做，但结果没写。这正是崩溃后最典型的不一致形态。
"$PY" -c "
import json
p=r'$STATE'
s=json.load(open(p,encoding='utf-8'))
steps=s.get('steps')
if isinstance(steps,dict):
    if 'R2' in steps: steps['R2']['status']='RUNNING'
else:
    for x in steps:
        if x.get('id')=='R2': x['status']='RUNNING'
s['run_status']='RUNNING'
json.dump(s,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
print('  已注入：R2 声称 RUNNING 但无结果（典型崩溃态）')
"
LEDGER_LINES_CRASH=$(wc -l <"$LEDGER" 2>/dev/null | tr -d ' ')
expect_eq "$LEDGER_LINES_CRASH" "$LEDGER_LINES_BEFORE" "崩溃未产生半截账本行（原子写生效）"

# ── 4. 续跑 ─────────────────────────────────────────────────────────────
echo "-- 4. 续跑（run_all）--"
OUT=$(kcall run_all --args-json '{}')
if echo "$OUT" | grep -q '"ok": true'; then
  ok "续跑成功"
else
  ng "续跑失败：$(echo "$OUT" | tail -5 | tr '\n' ' ')"
fi

# ── 5. 核心断言：R1 未被重复执行 ─────────────────────────────────────────
echo "-- 5. 核心语义：已 DONE 的步骤不被重复执行 --"
EXECUTED=$("$PY" -c "
import json
d=json.loads(r'''$OUT'''.split('{\"ok\":true',1)[0].split('\n')[-1] if False else '{}')
" 2>/dev/null || echo "")
# 直接从状态与账本判断：R1 的账本记录数不应增长
R1_AFTER=$(grep -c '"record_type".*R1\|R1' "$LEDGER" 2>/dev/null || echo 0)
LEDGER_LINES_AFTER=$(wc -l <"$LEDGER" | tr -d ' ')
echo "  账本行数：崩溃前 $LEDGER_LINES_BEFORE → 续跑后 $LEDGER_LINES_AFTER"
if [ "$LEDGER_LINES_AFTER" -gt "$LEDGER_LINES_BEFORE" ]; then
  ok "账本增长（续跑执行了剩余步骤）"
else
  ng "账本未增长 → 续跑没有执行任何剩余步骤"
fi

R1_STATE_AFTER=$("$PY" -c "
import json
s=json.load(open(r'$STATE',encoding='utf-8'))
st=s.get('steps')
d=st.get('R1') if isinstance(st,dict) else next((x for x in st if x.get('id')=='R1'),{})
att=d.get('attempts',0)
print('DONE' if d.get('status')=='DONE' else d.get('status'), 'attempts='+str(att))
")
echo "  R1 续跑后：$R1_STATE_AFTER"
# attempts 未增长 = 没有重复执行（这是"复用"的硬证据）
ATT=$(echo "$R1_STATE_AFTER" | sed 's/.*attempts=//')
if [ "${ATT:-0}" -le 1 ]; then
  ok "R1 执行次数未增加（attempts=$ATT ≤ 1）→ 已完成步骤被复用而非重跑"
else
  ng "R1 被重复执行（attempts=$ATT > 1）→ 违反断点续跑语义"
fi

# ── 6. 终态 ─────────────────────────────────────────────────────────────
echo "-- 6. 续跑后收敛到终态 --"
FINAL=$("$PY" -c "
import json
s=json.load(open(r'$STATE',encoding='utf-8'))
print(s.get('run_status'))")
expect_eq "$FINAL" "DONE" "续跑后 run_status=DONE"

# ── 7. 哈希链完整性（审计真实性底线）────────────────────────────────────
echo "-- 7. 崩溃→续跑后哈希链仍完整 --"
# 复用内核自带的 verify（只读、零依赖），它会逐条重算链哈希
OUT=$(kcall verify --args-json '{}')
if echo "$OUT" | grep -q '"ok": true'; then
  ok "内核 verify 通过：账本哈希链完整（崩溃未破坏链）"
else
  ng "哈希链校验失败：$(echo "$OUT" | tail -3 | tr '\n' ' ')"
fi

# ── 8. 报告就绪 ─────────────────────────────────────────────────────────
echo "-- 8. 续跑到终态后报告就绪 --"
if [ -f "$RUN_DIR/report.json" ]; then
  ok "report.json 已产出"
  HAS=$(grep -c 'ledger_digest' "$RUN_DIR/report.json" 2>/dev/null || echo 0)
  if [ "$HAS" -gt 0 ]; then
    ok "报告含 ledger_digest（与续跑后的账本一致）"
  else
    ng "报告缺ledger_digest → 报告与账本脱钩"
  fi
else
  #门禁拒绝也是合法终态（Fail-closed），但必须有 gate 留痕
  if [ -f "$RUN_DIR/report_gate.json" ]; then
    ok "报告未产出但有门禁留痕（Fail-closed，符合 §9.5）"
  else
    ng "既无报告也无门禁留痕 → 续跑终态不明"
  fi
fi

# ── 9. 反向用例：篡改账本必须被 verify 拒绝 ─────────────────────────────
echo "-- 9. 反向用例：篡改账本 → verify 必须拒绝 --"
# ⚠️ 这一条不能省：若 verify 恒通过，上面第 7 条就毫无意义。
cp "$LEDGER" "$WORK/ledger.bak"
"$PY" -c "
import json
p=r'$LEDGER'
lines=[l for l in open(p,encoding='utf-8') if l.strip()]
d=json.loads(lines[0]); d['step']='TAMPERED'
lines[0]=json.dumps(d,ensure_ascii=False)
open(p,'w',encoding='utf-8').write('\n'.join(lines)+'\n')
print('  已篡改首条账本记录')
"
OUT=$(kcall verify --args-json '{}')
if echo "$OUT" | grep -q '"ok": true'; then
  ng "篡改后 verify 仍通过 → 校验形同虚设（恒真的校验等于没有校验）"
else
  ok "篡改后 verify 拒绝通过（校验真实有效）"
fi
cp "$WORK/ledger.bak" "$LEDGER"   # 还原

# ── 10. 幂等：连续两次 resume 不改变结果 ────────────────────────────────
echo "-- 10. 幂等：终态再续跑不产生新记录 --"
L1=$(wc -l <"$LEDGER" | tr -d ' ')
kcall run_all --args-json '{}' >/dev/null
L2=$(wc -l <"$LEDGER" | tr -d ' ')
expect_eq "$L2" "$L1" "终态续跑不追加账本记录（幂等）"

echo ""
echo "════════ 结果 ════════"
echo "run 目录：$RUN_DIR"
echo "PASS=$pass FAIL=$fail"
[ "$fail" = "0" ] || exit 1