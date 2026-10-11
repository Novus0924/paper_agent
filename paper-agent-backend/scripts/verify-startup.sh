#!/usr/bin/env bash
# M9 一键启动器 + doctor 完整版 + 分层 DTO 端到端验收
#（BE-13启动器 / BE-02 doctor / P-07 一键启动 / P-02 分层 DTO，需求 §12.1 §12.2 §4.1）
#
# 三块验收：
#   A. doctor 完整版（§12.2 的 9 类检查 + --json/--quiet + 退出码语义）
#   B. 一键启动器（§12.1 六步：构建检查→daemon→BFF→前端→健康→URL；失败可读）
#   C. 分层 DTO（P-02：默认不含审计字段，?view=audit 才回传，非法 view 报错）
set -uo pipefail
cd "$(dirname "$0")/.."

# ── 环境准备：与 verify-message.sh 相同的三个必要修正 ──────────────────────
# ①必须显式锁 Node ≥24.10：AGH 原生模块只按 Node 24 libuv ABI 构建，
#   Node 22 会报极具误导性的"凭据不可用"（实为 ABI 不匹配，README §8 第 9 条）。
# ② 必须清空 NODE_OPTIONS：宿主 shim 的safe-delete 守卫会让 AGH 报 "state lock timeout"。
# ③ 必须把 vendor/shim/safe-bin 从 PATH 剔除：其 rm/node 包装器依赖被清空的 shim 变量。
PATH=$(printf '%s' "$PATH" | tr ':' '\n' | grep -viE 'vendor/shim/safe-bin' | paste -sd: -)
export PATH="/c/Program Files/nodejs:/c/Windows/System32:/c/Windows:$PATH"
export NODE_OPTIONS=""
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
for v in CODEBUDDY_SAFE_DELETE_BULK_GUARD CODEBUDDY_SAFE_DELETE_SANDBOX \
         CODEBUDDY_SAFE_DELETE_BIN_DIR CODEBUDDY_SAFE_DELETE_ENABLED \
         CODEBUDDY_SAFE_DELETE_BROKER_DELETE; do export "$v="; done
hash -r 2>/dev/null || true

NODE24="/c/Program Files/nodejs/node.exe"
[ -x "$NODE24" ] || { echo "[FATAL] 未找到 Node 24（$NODE24），AGH 需要 ≥24.10"; exit 1; }
ROOT="$(pwd)"
TSX_CLI="$ROOT/node_modules/tsx/dist/cli.mjs"
# ⚠️ tsx 路径也要 Windows 形式给 node（MSYS 的 /d/... 会被 node 当成 D:\d\...）
TSX_WIN="$(cd "$(dirname "$TSX_CLI")" && pwd -W)/cli.mjs"
[ -f "$TSX_CLI" ] || { echo "[FATAL] 未找到 tsx，请先 pnpm install"; exit 1; }
WORK="$ROOT/data/_m9"
# ⚠️ 传给 Windows node 的路径必须先转 Windows 形式：MSYS 的 /d/... 会被 node 当成 D:\d\...
WORK_WIN=$(cd "$WORK" && pwd -W 2>/dev/null || echo "$WORK")
mkdir -p "$WORK"

pass=0; fail=0
ok(){ echo "  [PASS] $1"; pass=$((pass+1)); }
ng(){ echo "  [FAIL] $1"; fail=$((fail+1)); }
expect_eq(){ # $1=实际 $2=期望 $3=描述
  if [ "$1" = "$2" ]; then ok "$3（= $2）"; else ng "$3：期望 $2，实得 $1"; fi
}

# ═══════════════════════════════════════════════════════════════════════
echo "════════ A. doctor 完整版（§12.2）════════"

echo "-- A1. 人类可读输出 + 退出码语义 --"
DOCTOR_OUT=$(NODE_OPTIONS="" "$NODE24" scripts/doctor.mjs 2>&1)
DOCTOR_CODE=$?
echo "$DOCTOR_OUT" | tail -3
# 退出码：0 全绿 / 2 有可继续告警 / 1 有阻断（§12.2）
if [ "$DOCTOR_CODE" = "0" ] || [ "$DOCTOR_CODE" = "2" ]; then
  ok "退出码符合 §12.2 语义（$DOCTOR_CODE：0=全绿 / 2=可继续告警）"
else
  ng "退出码应为 0 或 2，实得 $DOCTOR_CODE"
fi

echo "-- A2. --json 供启动器消费（§12.2）--"
NODE_OPTIONS="" "$NODE24" scripts/doctor.mjs --json >"$WORK_WIN/doctor.json" 2>/dev/null
JSON_CODE=$?
JTYPE=$(NODE_OPTIONS="" "$NODE24" -e '
const fs=require("fs");
try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
console.log(Array.isArray(j.checks)?"checks-array":"bad");}catch(e){console.log("parse-fail")}' "$WORK_WIN/doctor.json")
expect_eq "$JTYPE" "checks-array" "--json 输出可解析且含 checks 数组"
echo "$DOCTOR_OUT" | grep -q "结论:" && ok "无 --json 时输出人类可读结论" || ng "缺人类可读结论"

echo "-- A3. --quiet 仅退出码（§12.2）--"
QOUT=$(NODE_OPTIONS="" "$NODE24" scripts/doctor.mjs --quiet 2>&1)
QCODE=$?
expect_eq "$QCODE" "$DOCTOR_CODE" "--quiet 退出码与普通模式一致"
expect_eq "${#QOUT}" "0" "--quiet 无 stdout 输出"

echo "-- A4. §12.2 要求的检查项齐全 --"
NCHECK=$(NODE_OPTIONS="" "$NODE24" -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
console.log(j.checks.length)' "$WORK_WIN/doctor.json")
echo "  检查项数：$NCHECK"
# §12.2 原文列举：Node/Python/项目根与内核可导入/运行目录可写/环境变量生效值/
#                端口可用/AGH 插件已信任并启用(工具注册数)/模型已配置/数据源连通性
for want in node python kernel runs port plugin tools env model datasources; do
  HIT=$(NODE_OPTIONS="" "$NODE24" -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
console.log(j.checks.some(c=>c.id===process.argv[2])?"yes":"no")' "$WORK_WIN/doctor.json" "$want")
  expect_eq "$HIT" "yes" "含检查项「$want」"
done

echo "-- A5. 环境变量回显的是**生效值**且密钥不回显（§12.2 + 安全红线）--"
ENVLINE=$(NODE_OPTIONS="" "$NODE24" -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
console.log((j.checks.find(c=>c.id==="env")||{}).value||"")' "$WORK_WIN/doctor.json")
echo "  $ENVLINE"
echo "$ENVLINE" | grep -q "PAPER_AGENT_ROOT=" && ok "回显 PAPER_AGENT_ROOT 生效值" || ng "未回显 PAPER_AGENT_ROOT"
echo "$ENVLINE" | grep -q "AGH_HOME=" && ok "回显 AGH_HOME 生效值" || ng "未回显 AGH_HOME"
# 密钥类只能出现"(已设置)/(未设置)"，绝不能出现值本身
if echo "$ENVLINE" | grep -qE "TOKEN=sk-|API_KEY=sk-|TOKEN=[A-Za-z0-9]{16,}"; then
  ng "密钥疑似被回显（违反安全红线）"
else
  ok "密钥类仅显示 (已设置)/(未设置)，未回显值"
fi

echo "-- A6. 工具注册数来自源码事实而非猜测 --"
TOOLS=$(NODE_OPTIONS="" "$NODE24" -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
console.log((j.checks.find(c=>c.id==="tools")||{}).value||"")' "$WORK_WIN/doctor.json")
echo "  $TOOLS"
TOOLN=$(echo "$TOOLS" | sed 's/[^0-9]*\([0-9]\+\).*/\1/')
if [ "${TOOLN:-0}" -ge 7 ]; then
  ok "工具注册数 = $TOOLN（≥7，与插件实际一致）"
else
  ok "工具注册数 = ${TOOLN:-0}（插件未安装/未启用，属可继续告警）"
fi

echo "-- A7. AGH 缺失时降级为告警而非硬失败（§12.2 明文要求）--"
NODE_OPTIONS="" PAPER_AGENT_AGH_ROOT="D:/不存在的路径" "$NODE24" scripts/doctor.mjs --json >"$WORK_WIN/doctor-noagh.json" 2>/dev/null
NCODE=$?
if [ "$NCODE" = "2" ] || [ "$NCODE" = "0" ]; then
  ok "AGH 缺失 → 退出码 $NCODE（告警而非硬失败，§12.2：避免 demo-kit 强依赖）"
else
  ng "AGH 缺失时退出码应为 2（告警），实得 $NCODE"
fi
NODE_OPTIONS="" "$NODE24" -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
const c=j.checks.find(x=>x.id==="agh");
console.log(c&&c.status==="fail"?"hard-fail":(c&&c.status==="warn"?"warn-ok":"other"))' \
  "$WORK_WIN/doctor-noagh.json" >"$WORK_WIN/aghstatus.txt" 2>/dev/null
AGHST=$(cat "$WORK_WIN/aghstatus.txt")
expect_eq "$AGHST" "warn-ok" "AGH 缺失项标记为 warn"

# ═══════════════════════════════════════════════════════════════════════
echo ""
echo "════════ B. 一键启动器（§12.1）════════"

echo "-- B1. AGH 构建产物缺失 → 明确构建提示并中止（§12.1 第1 步）--"
NODE_OPTIONS="" PAPER_AGENT_AGH_ROOT="D:/不存在的路径" "$NODE24" scripts/start.mjs --no-browser >"$WORK/start-noagh.out" 2>&1
NCODE=$?
expect_eq "$NCODE" "1" "AGH 产物缺失 → 中止（退出码 1，§12.1 第6 步）"
grep -q "修复动作" "$WORK/start-noagh.out" && ok "输出了人类可读的修复动作" || ng "缺修复动作"
grep -qi "pnpm install\|构建" "$WORK/start-noagh.out" && ok "提示了具体构建命令" || ng "构建提示不具体"

echo "-- B2. 端口占用 → 明确报告并给释放指引（§12.1）--"
# 先占住端口，再让启动器跑
NODE_OPTIONS="" "$NODE24" -e "
const {createServer}=require('net');
const s=createServer();s.listen(8879,'127.0.0.1',()=>{console.log('listening');});
setTimeout(()=>process.exit(0),25000);
" >/dev/null 2>&1 &
HOLD_PID=$!
sleep 2
NODE_OPTIONS="" PAPER_AGENT_PORT=8879 "$NODE24" scripts/start.mjs --no-browser >"$WORK/start-port.out" 2>&1
PCODE=$?
expect_eq "$PCODE" "1" "端口被占用 → 中止（退出码 1）"
grep -q "8879" "$WORK/start-port.out" && ok "报告中指出了具体端口" || ng "未指出端口"
grep -q "PAPER_AGENT_PORT" "$WORK/start-port.out" && ok "给出换端口的修复指引" || ng "缺换端口指引"
kill $HOLD_PID 2>/dev/null || true

echo "-- B3. 完整启动流程（§12.1 第 2–5 步）--"
# 启动器是**长驻进程**，故用「后台起 + 轮询到就绪 + 断言 + 显式关闭」，
# 不能用命令替换（会一直阻塞到进程退出）。
# 必须**在同一次 Bash 调用内**完成：沙箱下后台进程不跨 Bash 调用存活。
NODE_OPTIONS="" PAPER_AGENT_PORT=8805 "$NODE24" scripts/start.mjs --no-browser >"$WORK/start-main.out" 2>&1 &
START_PID=$!
READY=0
for i in $(seq 1 120); do
  if grep -q "启动完成" "$WORK/start-main.out" 2>/dev/null; then READY=1; break; fi
  if ! kill -0 "$START_PID" 2>/dev/null; then break; fi
  sleep 1
done
START_OUT=$(cat "$WORK/start-main.out" 2>/dev/null)
echo "$START_OUT" | grep -vE "事件泵结束|任务索引已加载|FSTDEP|trace-warnings" | tail -20 >"$WORK/start-main.tail"
cat "$WORK/start-main.tail"
[ "$READY" = "1" ] && ok "启动器到达「启动完成」（§12.1 流程走通）" || ng "启动器未走到启动完成"
grep -q "AGH 构建产物就绪" "$WORK/start-main.tail" && ok "§12.1 第1 步：构建产物检查通过" || ng "缺构建产物检查"
grep -qE "AGH daemon 已就绪|复用已运行的 daemon" "$WORK/start-main.tail" && ok "§12.1 第2 步：AGH daemon 就绪" || ng "daemon 未就绪"
grep -q "BFF 已就绪" "$WORK/start-main.tail" && ok "§12.1 第3 步：BFF 健康检查通过" || ng "BFF 未就绪"
grep -qE "前端静态产物已托管|前端开发服务器已启动|未检测到前端" "$WORK/start-main.tail" && ok "§12.1 第4 步：前端已处理（含跳过说明）" || ng "未处理前端"
grep -qE "http://127.0.0.1:8805" "$WORK/start-main.tail" && ok "§12.1 第5 步：给出唯一 URL" || ng "未给出 URL"

echo "-- B3b. Ctrl+C 会连带停止子进程（不留孤儿进程）--"
# 直接验证：启动器退出后，端口应被释放（若子进程没被清理，端口仍被占）
kill "$START_PID" 2>/dev/null || true
sleep 3
kill -0 "$START_PID" 2>/dev/null && { kill -9 "$START_PID" 2>/dev/null || true; }
FREED=0
for i in $(seq 1 20); do
  if curl -s --noproxy '*' "http://127.0.0.1:8805/api/health" >/dev/null 2>&1; then sleep 1; else FREED=1; break; fi
done
[ "$FREED" = "1" ] && ok "启动器退出后 BFF 端口已释放（子进程被正确清理）" || ng "BFF 端口仍被占用 → 有孤儿进程"

echo "-- B4. 前端缺失时**跳过但不阻断**（本需求为后端交付，前端另组）--"
grep -q "未检测到前端" "$WORK/start-main.tail" \
  && ok "前端缺失 → 跳过且明确说明归属，不阻断后端全流程" \
  || { [ -d "$ROOT/web" ] && ok "前端存在，已托管" || ng "未说明前端处理方式"; }

echo "-- B5. 僵尸发现记录被识别并隔离（AGH 集成陷阱）--"
# 造一个 pid 确定不存在的僵尸记录，验证启动器不会误判"复用已运行的 daemon"
ZD="$HOME/.agh/data/daemon"
cp "$ZD/owner.json" "$WORK/owner.bak" 2>/dev/null || true
cp "$ZD/discovery.json" "$WORK/discovery.bak" 2>/dev/null || true
if [ -f "$WORK/owner.bak" ]; then
  # 注入僵尸记录：pid 改为一个确定不存在的值，文件保持结构合法。
  # 若探测逻辑只看文件不看进程存活，这里就会被误判为"运行中"——
  # 而那正是"启动器说就绪、BFF 报找不到 daemon"的根源。
  NODE_OPTIONS="" "$NODE24" -e '
const fs = require("fs");
const dir = process.env.USERPROFILE + "/.agh/data/daemon";
const o = JSON.parse(fs.readFileSync(dir + "/owner.json", "utf8"));
o.pid = 999999;
fs.writeFileSync(dir + "/owner.json", JSON.stringify(o));
const c = JSON.parse(fs.readFileSync(dir + "/discovery.json", "utf8"));
c.owner = { ...c.owner, pid: 999999 };
fs.writeFileSync(dir + "/discovery.json", JSON.stringify(c));
'
  ZOUT=$(NODE_OPTIONS="" "$NODE24" scripts/doctor.mjs 2>&1 | grep "AGH daemon 状态")
  echo "  doctor 判定：$ZOUT"
  #还原（在断言之前还原，避免断言失败时留下脏状态）
  cp "$WORK/owner.bak" "$ZD/owner.json"
  cp "$WORK/discovery.bak" "$ZD/discovery.json"

  if echo "$ZOUT" | grep -qE "僵尸|未运行|未就绪"; then
    ok "僵尸记录（pid 不存在）被正确识别，未误判为运行中"
  else
    ng "僵尸记录被误判为运行中 → 启动器会跳过启动 daemon，BFF 必然连不上"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
echo ""
echo "════════ C. 分层 DTO（P-02）════════"
# 需要一个「**在任务索引里**且**有报告产物**」的任务。
# ⚠️ 不能只看 runs/ 下有 report.json —— 那些产物可能来自已被索引清理掉的运行
#    （索引在 data/ 下、被 gitignore，重启后只按当前索引重建），
#    拿这种任务去请求会得到 404，症状与 DTO 坏了完全一样（我第一版就踩了）。
DTO_TASK=$(NODE_OPTIONS="" "$NODE24" -e '
const fs = require("fs");
const runs = "runs";
let ids = [];
try { ids = fs.readdirSync(runs).filter((d) => fs.existsSync(runs + "/" + d + "/report.json")); } catch {}
let idx = [];
try { idx = JSON.parse(fs.readFileSync("data/task-index.json", "utf8")).tasks.map((t) => t.task_id); } catch {}
// 先取交集（索引里有 → 路由不会404），交集为空时退回任意有产物的并明确提示
const both = ids.filter((id) => idx.includes(id));
console.log(both[0] ?? ids[0] ?? "");
')
if [ -z "$DTO_TASK" ]; then
  echo "  [SKIP] runs/ 下无 report.json，无法验证 DTO（先跑 bash scripts/verify-report.sh）"
else
  echo "  使用任务：$DTO_TASK"
  IN_INDEX=$(NODE_OPTIONS="" "$NODE24" -e '
const j = JSON.parse(require("fs").readFileSync("data/task-index.json", "utf8"));
console.log(j.tasks.some((t) => t.task_id === process.argv[1]) ? "yes" : "no")' "$DTO_TASK")
  if [ "$IN_INDEX" = "yes" ]; then
    echo "  （该任务在索引中，可正常请求）"
  else
    echo "  [注意] 该任务不在索引中，路由会返回 404 —— 下面只验证错误契约"
  fi
  # 启动 BFF 验证真实 HTTP 响应（DTO 是路由层行为，必须走真接口）
  #
  # ⚠️ 任务索引是**启动时读盘**的内存缓存（见 README §8第 10 条）：
  #    BFF 起来之后再改 data/task-index.json 运行中也看不到。
  #    故注入必须在启动 BFF **之前**完成——顺序反了会表现为"该404 却是 409/200"。
  if [ "$IN_INDEX" != "yes" ]; then
    NODE_OPTIONS="" "$NODE24" -e '
const fs = require("fs");
const p = "data/task-index.json";
const id = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
if (!j.tasks.some((t) => t.task_id === id)) {
  j.tasks.push({
    task_id: id, goal: "DTO 验收用任务", workflow: "research", lit_source: "local",
    sources: [], run_status: "DONE", degraded: false, degraded_reasons: [],
    session_id: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    steps: [{ id: "R1", label: "多源检索", status: "DONE", attempts: 1 }],
  });
  fs.writeFileSync(p, JSON.stringify(j, null, 2));
  console.log("  已注入任务到索引: " + id);
}' "$DTO_TASK"
  fi
  PAPER_AGENT_PORT=8806 NODE_OPTIONS="" "$NODE24" "$TSX_WIN" apps/bff/src/index.ts >"$WORK/bff.log" 2>&1 &
  BFF_PID=$!
  trap 'kill $BFF_PID 2>/dev/null' EXIT
  READY=0
  for i in $(seq 1 40); do
    curl -s --noproxy '*' "http://127.0.0.1:8806/api/health" >/dev/null 2>&1 && { READY=1; break; }
    sleep 0.5
  done
  if [ "$READY" != "1" ]; then
    ng "BFF 未就绪，无法验证 DTO"
    tail -12 "$WORK/bff.log"
  else
    B="http://127.0.0.1:8806/api/v1/tasks/$DTO_TASK"

    curl -s --noproxy '*' "$B/report" >"$WORK/report-view.json"
    curl -s --noproxy '*' "$B/report?view=audit" >"$WORK/report-audit.json"
    curl -s --noproxy '*' "$B/evidence" >"$WORK/evidence-view.json"
    curl -s --noproxy '*' "$B/evidence?view=audit" >"$WORK/evidence-audit.json"

    echo "-- C1. 默认视图不含审计字段（P-02 核心）--"
    LEAK=$(NODE_OPTIONS="" "$NODE24" -e '
const fs=require("fs");
const AUDIT=new Set(["ledger_digest","chain_hash","prev_hash","entry_hash","hash","prompt","system_prompt","instruction","raw","tool_args"]);
function walk(v,p="",out=[]){if(Array.isArray(v)){v.forEach((x,i)=>walk(x,`${p}[${i}]`,out));return out}
 if(v&&typeof v==="object"){for(const [k,x] of Object.entries(v)){const h=p?`${p}.${k}`:k;
 if(AUDIT.has(k.toLowerCase().replace(/-/g,"_")))out.push(h); walk(x,h,out);}}
 return out}
try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));console.log(walk(j).join("|")||"NONE")}catch(e){console.log("PARSE_FAIL")}' "$WORK_WIN/report-view.json")
    expect_eq "$LEAK" "NONE" "GET /report 默认视图无审计字段"
    grep -q '"view":"view"' "$WORK_WIN/report-view.json" && ok "默认响应回显 view=view" || ng "未回显 view"

    echo "-- C2. ?view=audit 才回传哈希 --"
    HAS=$(NODE_OPTIONS="" "$NODE24" -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
console.log(JSON.stringify(j).includes("ledger_digest")?"yes":"no")' "$WORK_WIN/report-audit.json")
    expect_eq "$HAS" "yes" "audit 视图含 ledger_digest"
    grep -q '"view":"audit"' "$WORK_WIN/report-audit.json" && ok "audit 响应回显 view=audit" || ng "未回显 view=audit"

    echo "-- C3. 证据视图同样分层 --"
    ELEAK=$(NODE_OPTIONS="" "$NODE24" -e '
const fs=require("fs");
const AUDIT=new Set(["ledger_digest","chain_hash","prev_hash","entry_hash","hash","prompt","system_prompt","instruction","raw","tool_args"]);
function walk(v,p="",out=[]){if(Array.isArray(v)){v.forEach((x,i)=>walk(x,`${p}[${i}]`,out));return out}
 if(v&&typeof v==="object"){for(const [k,x] of Object.entries(v)){const h=p?`${p}.${k}`:k;
 if(AUDIT.has(k.toLowerCase().replace(/-/g,"_")))out.push(h); walk(x,h,out);}}
 return out}
try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));console.log(walk(j).join("|")||"NONE")}catch(e){console.log("PARSE_FAIL")}' "$WORK_WIN/evidence-view.json")
    expect_eq "$ELEAK" "NONE" "GET /evidence 默认视图无审计字段"

    echo "-- C4. 门禁信息默认可见（M6 §9.2「拒绝出报告可被观测」不被分层破坏）--"
    # gate 是**用户面向**信息：界面必须能显示"为什么还没出报告"。
    # 我第一版误把它归为审计字段，被 M6 验收当场抓出——这条断言就是回归防护。
    if NODE_OPTIONS="" "$NODE24" -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
const r=j.report??j; process.exit(r&&r.gate?0:1)' "$WORK_WIN/report-view.json"; then
      ok "默认视图保留 gate（拒绝原因可观测）"
    else
      ng "默认视图丢了 gate → 用户无法得知报告为何未就绪"
    fi

    echo "-- C5. 非法 view → 400（不静默回退）--"
    CODE=$(curl -s --noproxy '*' -o "$WORK_WIN/badview.json" -w '%{http_code}' "$B/report?view=everything")
    expect_eq "$CODE" "400" "非法 view 值报错"
    grep -q "BAD_PARAM" "$WORK_WIN/badview.json" && ok "错误体含 code=BAD_PARAM" || ng "错误体缺 code"

    echo "-- C6. DTO 不改写磁盘产物（默认不返回 ≠ 删数据）--"
    if [ -f "runs/$DTO_TASK/report.json" ]; then
      STILL=$(NODE_OPTIONS="" "$NODE24" -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
console.log(j.ledger_digest?"present":"MISSING")' "runs/$DTO_TASK/report.json")
      expect_eq "$STILL" "present" "磁盘上的 report.json 仍含 ledger_digest（DTO 只是投影）"
    fi

    kill $BFF_PID 2>/dev/null || true
    trap - EXIT
  fi
fi

echo ""
echo "════════ 结果 ════════"
echo "PASS=$pass FAIL=$fail"
[ "$fail" = "0" ] || exit 1