#!/usr/bin/env bash
# S6 SSE 端到端验收脚本（一次性验证用；不进入产品代码）
set -uo pipefail
export PATH="/c/Users/lenovo/.workbuddy/binaries/PortableGit/versions/1.2.0/usr/bin:/c/Users/lenovo/.workbuddy/binaries/PortableGit/versions/1.2.0/mingw64/bin:/c/Program Files/nodejs:/c/Windows/System32:/c/Windows"
ROOT="D:/workBubbyStore/paper-agent-2"
cd "$ROOT"
export PAPER_AGENT_PYTHON="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"

echo "=== 启动 AGH daemon ==="
# 环境说明：本机沙箱中 `agnes daemon start` 的"脱离式启动 + 就绪探测"会超时
# （同一入口前台启动正常）。故验收脚本在**同一次调用内**以普通后台进程启动 daemon，
# 产品/用户侧仍使用 `bash agh.sh daemon start`。
export AGH_HOME="C:/Users/lenovo/.agh" AGNES_PROFILE="local-dev"
export PAPER_AGENT_PYTHON="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"
export PAPER_AGENT_KERNEL_ROOT="$ROOT/kernel"
export PAPER_AGENT_RUNS_DIR="$ROOT/runs"
node "D:/agnes-harness-main/packages/cli/dist/local/daemon.mjs" \
  --profile local-dev --workspace "$ROOT" --data-dir "C:/Users/lenovo/.agh/data" \
  > "$ROOT/runs/_daemon_sse.log" 2>&1 &
for i in $(seq 1 15); do
  sleep 2
  if grep -q "listening on" "$ROOT/runs/_daemon_sse.log" 2>/dev/null; then
    echo "daemon 已监听（$((i*2))s）"
    break
  fi
done
head -1 "$ROOT/runs/_daemon_sse.log"

echo "=== 启动 BFF ==="
npx tsx apps/bff/src/index.ts > "$ROOT/runs/_bff_sse.log" 2>&1 &
BFF_PID=$!
for i in $(seq 1 20); do
  sleep 2
  if curl -s --noproxy '*' --max-time 3 http://127.0.0.1:8787/api/health > /dev/null 2>&1; then
    echo "BFF 就绪（$((i*2))s）"
    break
  fi
done

echo "=== 1) SSE 响应头（§8.2）==="
curl -s -i --noproxy '*' --max-time 3 http://127.0.0.1:8787/api/v1/tasks/run-nonexistent/events 2>/dev/null | head -3

echo "=== 2) 创建任务并抓 SSE 流 ==="
TASK=$(curl -s --noproxy '*' -X POST http://127.0.0.1:8787/api/v1/tasks -H 'Content-Type: application/json' \
  -d '{"goal":"检索并综述固态电解质界面阻抗的表征方法","workflow":"research","lit_source":"local"}')
TID=$(node -e "console.log(JSON.parse(process.argv[1]).task_id)" "$TASK" 2>/dev/null)
SID=$(node -e "console.log(JSON.parse(process.argv[1]).session_id)" "$TASK" 2>/dev/null)
echo "task=$TID"
echo "$TID" > "$ROOT/runs/_sse_tid.txt"

# 先建 SSE 连接（快照），再触发执行（实时）
curl -s --noproxy '*' -N --max-time 90 "http://127.0.0.1:8787/api/v1/tasks/$TID/events" > "$ROOT/runs/_sse_capture.txt" &
SSE_PID=$!
sleep 3
echo "=== 3) 触发 run-all ==="
curl -s --noproxy '*' -X POST "http://127.0.0.1:8787/api/v1/tasks/$TID/run-all" -o /dev/null -w "HTTP %{http_code}\n"
wait $SSE_PID 2>/dev/null

echo "=== 4) SSE 事件统计 ==="
node -e "
const fs=require('fs');
const raw=fs.readFileSync('runs/_sse_capture.txt','utf8');
const evs=[]; let cur={};
for(const l of raw.split('\n')){
  if(l.startsWith('event: ')) cur.event=l.slice(7).trim();
  else if(l.startsWith('id: ')) cur.id=Number(l.slice(4));
  else if(l.startsWith('data: ')){ try{ cur.data=JSON.parse(l.slice(6)); evs.push(cur);}catch{} cur={}; }
}
console.log('SSE 事件总数:', evs.length);
const c={}; for(const e of evs) c[e.event]=(c[e.event]||0)+1;
console.log('按类型:', JSON.stringify(c));
const ids=evs.map(e=>e.id);
console.log('seq 单调递增:', ids.every((v,i)=>i===0||v>ids[i-1]));
const dup = ids.filter((v,i)=>i>0 && v<=ids[i-1]).length;
console.log('乱序/重复 id 数:', dup);
const done=evs.find(e=>e.event==='done');
console.log('终态 done:', done? JSON.stringify(done.data) : '未收到');
console.log('步骤事件:', evs.filter(e=>e.event==='step').map(e=>e.data.step+':'+e.data.status).join(' → '));
console.log('工具事件:', evs.filter(e=>e.event==='tool').map(e=>e.data.tool+':'+e.data.status).join(', '));
console.log('活动事件:', evs.filter(e=>e.event==='activity').map(e=>e.data.human_message.slice(0,30)).join(' | '));
console.log('结论事件:', evs.filter(e=>e.event==='conclusion').map(e=>e.data.cid).join(','));
console.log('报告事件:', evs.filter(e=>e.event==='report').map(e=>e.data.status).join(','));
"
echo "=== 5) Last-Event-ID 断线续传 ==="
LAST=$(node -e "
const fs=require('fs');
const raw=fs.readFileSync('runs/_sse_capture.txt','utf8');
const ids=[...raw.matchAll(/^id: (\d+)\$/gm)].map(m=>Number(m[1]));
console.log(ids.length>2 ? ids[1] : 0);
")
echo "用 Last-Event-ID=$LAST 续传："
curl -s --noproxy '*' -N --max-time 6 -H "Last-Event-ID: $LAST" "http://127.0.0.1:8787/api/v1/tasks/$TID/events" 2>/dev/null | grep -c "^id:" || true

kill $BFF_PID 2>/dev/null
echo "=== 完成 ==="
