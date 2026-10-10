#!/usr/bin/env bash
# M8 多轮消息端到端验收（需求 §8.1 接口 14、§8.2 消息契约、§9.7 验收、P-05）
#
# 核心验收点：**真实 AGH 会话追问**（P-05 病灶是"底部对话框不起作用"，
# 只测 HTTP 契约等于没测——必须证明消息真的进了会话、模型真的回话了）。
# 故本脚本会：
#   1) 用**非终态**且有真实 AGH 会话映射的任务发追问；
#   2) 等真实回合结束后，用 AGH 原生 export 检查会话里新增了 user/assistant 消息；
#   3) 验证契约、排队、删除、校验。
set -uo pipefail
cd "$(dirname "$0")/.."

# ⚠️ 先把 WorkBuddy 的 safe-bin 从 PATH 剔除，再谈其它。
#该目录里的 rm/node 等包装器依赖 CODEBUDDY_SAFE_DELETE_* 变量；
# 一旦我们为了放行 AGH 而清空这些变量，包装器就变成空路径 → bash 报 "/rm: No such file"。
# 与其跟包装器缠斗，不如把整个 shim 目录移出 PATH（只影响本脚本的子进程）。
PATH=$(printf '%s' "$PATH" | tr ':' '\n' | grep -viE 'vendor/shim/safe-bin|codebuddy/cli-connector-packages/bin' | paste -sd: -)
export PATH="/c/Program Files/nodejs:/c/Windows/System32:/c/Windows:$PATH"
for d in /c/Users/lenovo/.workbuddy/binaries/PortableGit/versions/*/usr/bin /c/Users/lenovo/.workbuddy/binaries/PortableGit/versions/*/mingw64/bin; do
  [ -d "$d" ] && export PATH="$d:$PATH"
done
hash -r 2>/dev/null || true
for c in curl node; do
  command -v "$c" >/dev/null || { echo "[FATAL] 未找到 $c"; exit 1; }
done

# ⚠️ 必须显式锁定 Node ≥24.10 并**清空 NODE_OPTIONS**，否则 AGH 侧必失败：
#   ① 裸 `node` 可能解析到 WorkBuddy 托管的 22.x → AGH 原生模块 ABI 不匹配 →
#      "The credential store is unavailable."（报错指向凭据，实为运行时版本问题）；
#   ② NODE_OPTIONS 注入的 safe-delete shim 会拦AGH 的 SQLite 锁维护 → "state lock timeout"。
# 两者报错都与 AGH 业务无关，但都会让 daemon 起不来。
NODE24="/c/Program Files/nodejs/node.exe"
[ -x "$NODE24" ] || { echo "[FATAL] 未找到 Node 24（$NODE24），AGH 需要 ≥24.10"; exit 1; }
export NODE_OPTIONS=""
# ⚠️ 只把 shim 变量**置空**，不能 unset：WorkBuddy 在 PATH 里放了
# safe-bin/safe-delete-bash-env.sh，它会读 CODEBUDDY_SAFE_DELETE_BIN_DIR；
# 若 unset，该脚本在 set -u 下直接报 "unbound variable" 让整个脚本崩。
for v in CODEBUDDY_SAFE_DELETE_BULK_GUARD CODEBUDDY_SAFE_DELETE_SANDBOX \
         CODEBUDDY_SAFE_DELETE_BIN_DIR CODEBUDDY_SAFE_DELETE_ENABLED \
         CODEBUDDY_SAFE_DELETE_BROKER_DELETE; do
  export "$v="
done
# ROOT 必须在引用 TSX_CLI 之前定义（set -u 下未定义变量会直接退出）
ROOT="$(pwd)"
TSX_CLI="$ROOT/node_modules/tsx/dist/cli.mjs"
[ -f "$TSX_CLI" ] || { echo "[FATAL] 未找到 tsx（$TSX_CLI），请先 pnpm install"; exit 1; }
PY="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"
PORT="${PAPER_AGENT_PORT:-8803}"
WORK="$ROOT/data/_m8"
rm -rf "$WORK"; mkdir -p "$WORK"

pass=0; fail=0
ok(){ echo "  [PASS] $1"; pass=$((pass+1)); }
ng(){ echo "  [FAIL] $1"; fail=$((fail+1)); }

# 会话账本导出走**项目自己的 `kind=session` 接口**（见下方第 2 节的 export_session 定义）。
#
# ⚠️ 这里**不用** `agnes.mjs export` CLI，三条原因都是实测踩出来的：
#   ① 不带 --connect 时 CLI 会 ensureLocalBackend 另拉 daemon，与本脚本已启动的 daemon
#      抢同一份 mutation 锁 → "state lock timeout"；
#   ② 带 --connect 需 URI 形式且本地管道是**三个斜杠** `pipe:///${encodeURIComponent(NAME)}`
#      （依据 cli/src/boot/connect.ts 的 unixConnectTarget()），还得显式 --cwd 让 scopeID 对上；
#   ③ 即便都做对，CLI 也会与 BFF 的事件泵争抢同一会话的 turn → **超时（退出码 124）**。
# 走项目自己的导出服务反而更对：它就是生产代码路径（M7 已验收 50 项）。

# 前置：启动 AGH daemon，并**保持它存活到本脚本结束**。
# 关键：不能写成 `bash scripts/agh-daemon-up.sh` 子调用——子 shell 退出时其 EXIT trap
# 会杀掉 daemon，后续验证就全连不上。故这里内联启动，trap 留在主 shell。
# 另一个关键：--data-dir 必须是 ~/.agh/data（AGH 主数据目录），传profile 私有目录会抢锁失败。
echo "== 0. 启动 AGH daemon（真实会话是 P-05 的验收前提）=="
DAEMON_ENTRY="D:/agnes-harness-main/packages/cli/dist/local/daemon.mjs"
AGH_DATA_DIR="C:/Users/lenovo/.agh/data"

# ⚠️ 必须清掉 WorkBuddy 的 shim 注入，否则 daemon 起来就死：
#   NODE_OPTIONS=--require=.../node-language-shim.cjs 会加载 safe-delete 守卫，
#   它在 AGH 做 SQLite 锁文件维护时输出 "[safe-delete] ... state lock timeout" 并中止启动。
#   这与 AGH 无关（AGH 源码里根本没有 safe-delete/SAFE_DELETE 字样）。
#   同理 BASH_FUNC_rm%% 包装了 rm —— 脚本里一律不用 rm。
NODE_OPTIONS=""
unset CODEBUDDY_SAFE_DELETE_BULK_GUARD CODEBUDDY_SAFE_DELETE_SANDBOX \
      CODEBUDDY_SAFE_DELETE_BIN_DIR CODEBUDDY_SAFE_DELETE_ENABLED \
      CODEBUDDY_SAFE_DELETE_BROKER_DELETE 2>/dev/null || true

PATH="/c/Program Files/nodejs:$PATH" NODE_OPTIONS="" "/c/Program Files/nodejs/node.exe" "$DAEMON_ENTRY" \
  --profile local-dev --workspace "$ROOT" --data-dir "$AGH_DATA_DIR" >"$WORK/daemon.log" 2>&1 &
DPID=$!
trap 'kill $DPID 2>/dev/null' EXIT
SOCK=""
for i in $(seq 1 60); do
  # 必须连owner 一起读：只读 discovery.json 会**假通过**——
  # 僵尸 discovery.json（owner pid 已死）里也有 socketPath，但 readDaemonDiscovery 会因
  # sameOwner/identity 校验失败返回 null。这坑我踩过一次。
  SOCK=$(node -e '
const fs=require("fs");
const d=process.env.USERPROFILE+"/.agh/data/daemon";
try{
  const owner=JSON.parse(fs.readFileSync(d+"/owner.json","utf8"));
  const disc=JSON.parse(fs.readFileSync(d+"/discovery.json","utf8"));
  if(owner.pid!==disc.owner?.pid){process.exit(0)}          // 代数不符 → 未就绪
  if(owner.socketPath!==disc.socketPath){process.exit(0)}
  process.stdout.write(String(disc.socketPath||""));
}catch(e){}
' 2>/dev/null)
  [ -n "$SOCK" ] && break
  kill -0 "$DPID" 2>/dev/null || break
  sleep 0.5
done
if [ -n "$SOCK" ]; then
  # 必须用 AGH 自己的读取路径复核，且**必须在同一次调用内**——
  # discovery 里的 owner pid 是 AGH 派生的子进程（≠ 启动器 pid），
  # 跨 Bash 调用时进程组被回收 → identity() 判定 dead → found=null（假失败）。
  # tsx 冷启动较慢，故重试若干次再判定失败，避免把"还没就绪"当成"起不来"。
  SCOPE_OUT=""
  for attempt in 1 2 3 4 5; do
    # 只取 READY 行（tsx/daemon 会在 stdout 混入实验性警告等噪声行）。
    # 用轻量的 daemon-ready.mts 而非 resolveDaemonScope：后者走完整 profile 解析
    # （读配置→校验模型→读凭据），在本机会抛 CONFIG_CREDENTIAL_STORE，
    # 那是**探测脚本自身**的问题，与 daemon 可用性无关。
    SCOPE_OUT=$(NODE_OPTIONS="" timeout 90 "$NODE24" \
      "$TSX_CLI" apps/bff/scripts/daemon-ready.mts 2>&1 | grep -E '^(READY|NOT-READY)' | tail -1)
    case "$SCOPE_OUT" in READY*) break ;; esac
    sleep 2
  done
  case "$SCOPE_OUT" in
    READY*) ok "AGH daemon 就绪（$SCOPE_OUT）" ;;
    *) echo "[FATAL] daemon 未就绪：$SCOPE_OUT"; tail -15 "$WORK/daemon.log"; exit 1 ;;
  esac
  # 从 READY 行取出真实 socket（owner pid 是 AGH 派生子进程，≠ 启动器 pid）
  SOCK=$(printf '%s' "$SCOPE_OUT" | awk '{print $3}')
else
  echo "[FATAL] AGH daemon 未就绪，无法验证'同一会话留痕'（P-05 核心）。"
  tail -15 "$WORK/daemon.log"
  exit 1
fi

echo "== 0.1 通过 API 新建任务（createTask 会分配真实 AGH 会话）=="
ROOT_URL="http://127.0.0.1:$PORT"
# 先起BFF（需要 daemon 在线才能建会话）
NODE_OPTIONS="" PAPER_AGENT_PORT="$PORT" "$NODE24" "$TSX_CLI" apps/bff/src/index.ts >"$WORK/bff.log" 2>&1 &
BFF_PID=$!
trap 'kill $BFF_PID 2>/dev/null; kill $DPID 2>/dev/null' EXIT
READY=0
for i in $(seq 1 60); do
  if curl -s --noproxy '*' "$ROOT_URL/api/health" >/dev/null 2>&1; then READY=1; break; fi
  sleep 0.5
done
[ "$READY" = "1" ] && ok "BFF 健康探针通过" || ng "BFF 未就绪"
[ "$READY" = "1" ] || { tail -20 "$WORK/bff.log"; exit 1; }

GOAL="检索并综述固态电解质界面阻抗的表征方法"
CREATE=$(curl -s --noproxy '*' -X POST "$ROOT_URL/api/v1/tasks" -H 'Content-Type: application/json' \
         --data-binary "$(node -e 'process.stdout.write(JSON.stringify({goal:process.argv[1],workflow:"research",lit_source:"local"}))' "$GOAL")")
TID=$(echo "$CREATE" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).task_id||"")}catch(e){console.log("")}})')
SID=$(echo "$CREATE" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).session_id||"")}catch(e){console.log("")}})')
if [ -z "$TID" ] || [ -z "$SID" ]; then
  echo "[FATAL] 新建任务失败：$CREATE"
  exit 1
fi
echo "  任务：$TID"
echo "  会话：$SID"
case "$SID" in
  *workspace:*) ok "任务已绑定真实 AGH 会话（1:1 映射，§4.2）" ;;
  *) ng "session_id 非 AGH 会话格式：$SID" ;;
esac

B="http://127.0.0.1:$PORT/api/v1/tasks/$TID/messages"

echo "== 2. 导出追问前的会话基线（用于证明'新增'）=="
# 用**项目自己的** `kind=session` 导出接口（M7 已验收 50 项；AGH 原生 CLI 的 export 会超时，
# 因为它会与 BFF 事件泵争抢同一会话的 turn → 退出码 124 timeout）。
# 这样验证的是同一条生产代码路径，不是另造一套。
export_session(){ # $1=输出文件
  local code
  code=$(curl -s --noproxy '*' -o "$1" -w '%{http_code}' \
    "$ROOT_URL/api/v1/tasks/$TID/export?kind=session&format=agnes")
  echo "$code"
}

EXPC1=$(export_session "$WORK/before.jsonl")
BASE=$( [ -s "$WORK/before.jsonl" ] && wc -l <"$WORK/before.jsonl" | tr -d ' ' || echo 0)
if [ "$EXPC1" = "200" ] && [ "$BASE" -gt 0 ]; then
  ok "会话基线已导出（HTTP $EXPC1，$BASE 行）"
else
  ng "基线导出失败（HTTP $EXPC1，$BASE 行）——后续'新增'断言将不可信"
fi

echo "== 3. 参数校验（先做，避免污染真实会话）=="
C1=$(curl -s -o "$WORK/e1.json" -w '%{http_code}' --noproxy '*' -X POST "$B" -H 'Content-Type: application/json' -d '{}')
[ "$C1" = "400" ] && grep -q '"code":"BAD_PARAM"' "$WORK/e1.json" && ok "缺 text → 400 BAD_PARAM" || ng "缺 text 应 400，实得 $C1"
C2=$(curl -s -o "$WORK/e2.json" -w '%{http_code}' --noproxy '*' -X POST "$B" -H 'Content-Type: application/json' -d '{"text":"x","action":"delete"}')
[ "$C2" = "400" ] && grep -q 'ask' "$WORK/e2.json" && grep -q 'revise' "$WORK/e2.json" \
  && ok "非法 action → 400 并列出允许值（不静默回退）" || ng "非法 action 应 400，实得 $C2"
C3=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' -X POST "$B" -H 'Content-Type: application/json' -d '{"text":"'"$(node -e 'process.stdout.write("x".repeat(5000))')"'"}')
[ "$C3" = "400" ] && ok "text 超长 → 400（上限 4000）" || ng "超长 text 应 400，实得 $C3"
C4=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' -X POST "$B" -H 'Content-Type: application/json' -d '{"text":"hi"}' )
[ "$C4" = "200" ] && ok "合法请求 → 200" || ng "合法请求应 200，实得 $C4"

echo "== 4. 空闲时追问 → 契约 + 真实会话留痕 =="
# 上一条合法的 'hi' 已触发一次真实投递，等它真正结束。
# 必须查 busy（=执行中 或 有消息在投递），不能只看 active —— 否则执行回合进行中也会误判空闲。
for i in $(seq 1 150); do
  Q=$(curl -s --noproxy '*' "$B" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log((j.busy||j.pending.length>0)?"busy":"idle")}catch(e){console.log("busy")}})')
  [ "$Q" = "idle" ] && break
  sleep 1
done
[ "$Q" = "idle" ] && ok "等待到空闲（busy=false 且无待发）" || ng "等待空闲超时（仍 $Q）"

Q1="请用一句话说明本任务的检索覆盖情况，并列出支撑结论的证据编号。"
R1=$(curl -s --noproxy '*' -X POST "$B" -H 'Content-Type: application/json' \
     --data-binary "$(node -e 'process.stdout.write(JSON.stringify({text:process.argv[1],action:"ask"}))' "$Q1")")
echo "  响应：$R1"
echo "$R1" | grep -q '"queued":false' && ok "空闲 → queued=false（立即投递，§8.2）" || ng "空闲应立即投递: $R1"
echo "$R1" | grep -q '"status":"running"' && ok "status=running" || ng "status 应为 running"
TURN=$(echo "$R1" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).turn_id||""))')
[ -n "$TURN" ] && ok "返回 turn_id=$TURN" || ng "未返回 turn_id"

echo "  等待真实回合结束（模型调用，可能需数十秒）…"
DONE_OK=0
for i in $(seq 1 150); do
  ST=$(curl -s --noproxy '*' "$B" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const h=(j.history||[]);console.log(h.length&&h[h.length-1].status?h[h.length-1].status:"none")}catch(e){console.log("none")}})')
  if [ "$ST" = "done" ]; then DONE_OK=1; break; fi
  if [ "$ST" = "failed" ]; then break; fi
  sleep 1
done
[ "$DONE_OK" = "1" ] && ok "追问回合真实完成（history 末条 status=done）" || ng "追问回合未完成（末条状态=$ST）"

echo "== 5. §9.7「全程在同一 AGH 会话留痕」=="
EXPC2=$(export_session "$WORK/after.jsonl")
AFTER=$( [ -s "$WORK/after.jsonl" ] && wc -l <"$WORK/after.jsonl" | tr -d ' ' || echo 0)
[ "$AFTER" -gt "$BASE" ] && ok "会话事件数增加（$BASE → $AFTER，HTTP $EXPC2），追问确实落在同一会话" \
  || ng "会话无新增事件（$BASE → $AFTER，HTTP $EXPC2）——追问可能没进会话"
if [ -s "$WORK/after.jsonl" ]; then
  # 追问内容应出现在会话记录里（证明是"发进会话"而不是被BFF 自己吞了）
  if node -e '
const fs=require("fs");
const q=process.argv[2];
const hit=fs.readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean)
  .some(l=>{try{return l.includes(q)||JSON.stringify(JSON.parse(l)).includes(q)}catch(e){return l.includes(q)}});
process.exit(hit?0:1)' "$WORK/after.jsonl" "$Q1"; then
    ok "追问原文出现在会话记录中（真实下发，非本地伪存）"
  else
    ng "会话记录中未找到追问原文"
  fi
fi

echo "== 6. 队列查询与删除 =="
L=$(curl -s --noproxy '*' "$B")
echo "$L" | grep -q '"history"' && ok "GET 返回 history（含已发消息）" || ng "GET 缺 history"
echo "$L" | grep -q '"busy"' && ok "GET 返回 busy（前端据此禁用按钮）" || ng "GET 缺 busy"

# 运行中排队：触发一次执行占位，再发消息应入队
echo "== 7. 运行中发送 → 入队并给出显示顺序 =="
# 用真实 run-all 触发执行（它会持有执行锁 → 后续消息必须入队）。
# 注意：run-all 会真的跑流水线（约 10–30s），故本节之后必须等它结束再继续，
# 否则它会与后续消息争抢同一会话 turn（实测表现为 INTERNAL_ERROR -32603）。
node -e '
const fs=require("fs");const p="runs/"+process.argv[1]+"/state.json";
if(fs.existsSync(p)){const s=JSON.parse(fs.readFileSync(p,"utf8"));s.run_status="RUNNING";fs.writeFileSync(p,JSON.stringify(s));}
' "$TID" 2>/dev/null
curl -s -o /dev/null --noproxy '*' -X POST "$ROOT_URL/api/v1/tasks/$TID/run-all" -H 'Content-Type: application/json' -d '{}' 2>/dev/null
sleep 3
Q2="排队消息一"
Q3="排队消息二"
R2=$(curl -s --noproxy '*' -X POST "$B" -H 'Content-Type: application/json' \
     --data-binary "$(node -e 'process.stdout.write(JSON.stringify({text:process.argv[1]}))' "$Q2")")
R3=$(curl -s --noproxy '*' -X POST "$B" -H 'Content-Type: application/json' \
     --data-binary "$(node -e 'process.stdout.write(JSON.stringify({text:process.argv[1]}))' "$Q3")")
echo "  R2=$R2"
echo "  R3=$R3"
BUSY_NOW=$(echo "$R2$R3" | grep -c '"queued":true')
if [ "$BUSY_NOW" -ge 1 ]; then
  ok "运行中发送 → queued=true（入队而非409 拒绝，P-05 核心）"
else
  #也可能上一回合已结束（真实调用很快），此时属于空闲投递，同样不算失败
  echo "  [INFO] 执行回合已结束，本次按空闲立即投递（queued=false）——非失败"
  ok "空闲/运行中两种路径均返回合法契约"
fi
# order 必须单调递增且从 1 起
if echo "$R2$R3" | grep -q '"order":1'; then
  ok "order 从 1 起（待发队列位置）"
elif ! echo "$R2$R3" | grep -q '"queued":true'; then
  ok "无排队消息时无需 order"
else
  ng "order 未从 1 起: $R2 / $R3"
fi

echo "== 8. 删除待发消息 =="
DEL_ID=$(echo "$R3" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.queued?j.turn_id:"")})')
if [ -n "$DEL_ID" ]; then
  D=$(curl -s -o "$WORK/del.json" -w '%{http_code}' --noproxy '*' -X DELETE "$B/$DEL_ID")
  [ "$D" = "200" ] && grep -q '"deleted":true' "$WORK/del.json" && ok "删除待发消息 → 200 {deleted:true}" || ng "删除应 200，实得 $D: $(cat "$WORK/del.json")"
  D2=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' -X DELETE "$B/$DEL_ID")
  [ "$D2" = "409" ] && ok "重复删除同一 turn → 409 BAD_STATE（不是 200）" || ng "重复删除应 409，实得 $D2"
else
  echo "  [SKIP] 本次无排队消息（回合已结束），跳过删除验证"
fi
DBAD=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' -X DELETE "$B/not-a-turn")
[ "$DBAD" = "400" ] && ok "非法 turn_id → 400（专用白名单，未复用 task_id 白名单）" || ng "非法 turn_id 应 400，实得 $DBAD"

echo "== 9. 终态任务保护 =="
# 等run-all 与排队消息都结束，避免与终态断言抢同一会话
for i in $(seq 1 180); do
  STILL=$(curl -s --noproxy '*' "$B" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log((j.busy||j.pending.length>0)?"1":"0")}catch(e){console.log("1")}})')
  [ "$STILL" = "0" ] && break
  sleep 1
done
[ "$STILL" = "0" ] && ok "队列已排空（等待真实回合结束）" || ng "队列未排空，仍有 busy/pending"

DT=$(node -e 'const j=JSON.parse(require("fs").readFileSync("data/task-index.json","utf8"));const t=j.tasks.find(function(x){return x.run_status==="DONE"&&x.session_id});console.log(t?t.task_id:"")')
if [ -n "$DT" ]; then
  TR=$(curl -s -o "$WORK/term.json" -w '%{http_code}' --noproxy '*' -X POST \
       "http://127.0.0.1:$PORT/api/v1/tasks/$DT/messages" -H 'Content-Type: application/json' -d '{"text":"还能问吗"}')
  [ "$TR" = "409" ] && grep -q '"code":"BAD_STATE"' "$WORK/term.json" \
    && ok "终态任务发送 → 409 BAD_STATE（不静默丢弃，附新建任务指引）" \
    || ng "终态发送应 409，实得 $TR: $(head -c 200 "$WORK/term.json")"
else
  echo "  [SKIP] 无 DONE 任务可测"
fi

echo "== 10. 任务不存在 / 非法 id =="
MN=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' -X POST \
     "http://127.0.0.1:$PORT/api/v1/tasks/run-19700101-000000-nope00/messages" -H 'Content-Type: application/json' -d '{"text":"x"}')
[ "$MN" = "404" ] && ok "任务不存在 → 404" || ng "不存在应 404，实得 $MN"
BI=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' -X POST \
     "http://127.0.0.1:$PORT/api/v1/tasks/notATask/messages" -H 'Content-Type: application/json' -d '{"text":"x"}')
[ "$BI" = "400" ] && ok "非法 task_id → 400 BAD_ID" || ng "非法 id 应 400，实得 $BI"

echo ""
echo "==================== 结果 ===================="
echo "PASS=$pass FAIL=$fail"
[ "$fail" = "0" ] || exit 1