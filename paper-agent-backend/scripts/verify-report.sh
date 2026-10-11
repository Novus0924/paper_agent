#!/usr/bin/env bash
# M6 报告聚合接口端到端验收（需求 §8.1 接口 10–13、§8.2、§9.5、§9.6）
# 说明：BFF 只读内核产物，不 spawn 内核；因此本脚本用**已完成的真实 run 目录**验证只读装配，
#      并另行用内核 CLI 验证门禁/篡改拒绝。
set -uo pipefail
cd "$(dirname "$0")/.."
# 本机 Bash 工具的基础 PATH 可能为空（curl/node 缺失），这里自补系统与 PortableGit 路径。
# 注意必须**前置**并 hash -r 清缓存：追加到末尾时 bash 可能已缓存"command not found"。
export PATH="/c/Program Files/nodejs:/c/Windows/System32:/c/Windows:${PATH:-}"
for d in /c/Users/*/.workbuddy/binaries/PortableGit/versions/*/usr/bin /c/Users/*/.workbuddy/binaries/PortableGit/versions/*/mingw64/bin; do
  [ -d "$d" ] && export PATH="$d:$PATH"
done
hash -r 2>/dev/null || true
command -v curl >/dev/null || { echo "[FATAL] 未找到 curl，请确认 PATH 中含 /c/Windows/System32"; exit 1; }
command -v node >/dev/null || { echo "[FATAL] 未找到 node，请确认 PATH 中含 /c/Program Files/nodejs"; exit 1; }
ROOT=$(pwd -W 2>/dev/null || pwd)
PY="$(. "$(dirname "$0")/_env.sh" && pa_python || true)"
[ -n "$PY" ] || { echo "[FATAL] 未找到 Python（内核需要 ≥3.10，可用 PAPER_AGENT_PYTHON 指定）" >&2; exit 1; }
PORT="${PAPER_AGENT_PORT:-8799}"
TID="run-m6e2e-$(date +%H%M%S)"
RUN="$ROOT/runs/$TID"

pass=0; fail=0
ok(){ echo "  [PASS] $1"; pass=$((pass+1)); }
ng(){ echo "  [FAIL] $1"; fail=$((fail+1)); }

echo "== 1. 内核跑完整流程（产出真实报告）=="
( cd kernel && "$PY" -m sciret_kernel plan --run-dir "$(cygpath -m "$RUN" 2>/dev/null || echo "$RUN")" \
    --args-json '{"goal":"检索并综述固态电解质界面阻抗的表征方法","workflow":"research","lit_source":"local"}' >/dev/null )
( cd kernel && "$PY" -m sciret_kernel run_all --run-dir "$RUN" --args-json '{}' >/dev/null )
[ -f "$RUN/report.json" ] && ok "终态 DONE 自动产出 report.json" || ng "report.json 未产出"
[ -f "$RUN/report.md" ] && ok "产出 report.md" || ng "report.md 未产出"
[ -f "$RUN/report_gate.json" ] && ok "门禁结论留痕 report_gate.json" || ng "缺 report_gate.json"

# 注入到任务索引（BFF 只读索引判断任务存在）
node -e '
const fs=require("fs"),p="data/task-index.json";
const j=JSON.parse(fs.readFileSync(p,"utf8"));
const now=new Date().toISOString();
if(!j.tasks.find(t=>t.task_id===process.argv[1])){
 j.tasks.push({task_id:process.argv[1],goal:"检索并综述固态电解质界面阻抗的表征方法",workflow:"research",
  lit_source:"local",sources:[],run_status:"DONE",degraded:false,degraded_reasons:[],session_id:"agnes:e2e",
  created_at:now,updated_at:now,steps:[{id:"R1",label:"多源检索",status:"DONE",attempts:1}]});
 fs.writeFileSync(p,JSON.stringify(j));
}
console.log("  索引已注入", process.argv[1]);
' "$TID"

echo "== 2. 启动 BFF（仅回环）=="
PAPER_AGENT_PORT="$PORT" npx tsx apps/bff/src/index.ts >"$ROOT/data/_m6-bff.log" 2>&1 &
BFF_PID=$!
trap 'kill $BFF_PID 2>/dev/null' EXIT
for i in $(seq 1 40); do
  curl -s --noproxy '*' "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break
  sleep 0.5
done
curl -s --noproxy '*' "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && ok "BFF 健康探针通过" || ng "BFF 未就绪"

B="http://127.0.0.1:$PORT/api/v1/tasks/$TID"
echo "== 3. 接口10 /report（就绪）=="
R=$(curl -s --noproxy '*' "$B/report")
echo "$R" | grep -q '"status":"ready"' && ok "就绪 → status=ready" || ng "就绪判定失败: $R"
echo "$R" | grep -q '"title"' && echo "$R" | grep -q '"abstract"' && echo "$R" | grep -q '"sections"' && echo "$R" | grep -q '"conclusions"' \
  && ok "契约字段齐备（title/abstract/sections/conclusions）" || ng "契约字段缺失"
echo "$R" | grep -q '"evidence_ids":\["EV-' && ok "结论带 fact 级证据角标" || ng "结论缺证据绑定"

echo "== 4. 接口11 /report.md（安全头与角标）=="
H=$(curl -s --noproxy '*' -D - -o "$ROOT/data/_m6-report.md" "$B/report.md")
echo "$H" | grep -qi 'content-type:.*text/markdown' && ok "Content-Type: text/markdown" || ng "Content-Type 不符"
echo "$H" | grep -qi 'x-content-type-options: nosniff' && ok "X-Content-Type-Options: nosniff" || ng "缺 nosniff"
echo "$H" | grep -qi 'content-disposition: inline' && ok "Content-Disposition: inline" || ng "缺 inline"
grep -q '\[EV-' "$ROOT/data/_m6-report.md" && ok "MD 含结论证据角标" || ng "MD 缺角标"
grep -q '降级' "$ROOT/data/_m6-report.md" && ok "MD 含降级声明" || ng "MD 缺降级声明"

echo "== 5. 接口12 /evidence（只读装配）=="
E=$(curl -s --noproxy '*' "$B/evidence")
echo "$E" | grep -q '"evidence":\[' && echo "$E" | grep -q '"conclusions":\[' && ok "证据与结论均装配" || ng "装配缺失"
echo "$E" | grep -q '"doi":"10\.' && ok "含真实 DOI" || ng "缺 DOI"
echo "$E" | grep -q '"chain_head"' && ok "含账本链头（可溯源）" || ng "缺 chain_head"

echo "== 6. 接口13 /cite（引用回查）=="
C=$(curl -s --noproxy '*' "$B/cite?ev=EV-0001")
echo "$C" | grep -q '"found":true' && ok "按 EV 编号回查命中" || ng "cite 未命中: $C"
echo "$C" | grep -q '"year":' && ok "回查含年份" || ng "回查缺年份"
SHA=$(node -e 'const l=require("fs").readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean).map(JSON.parse).find(r=>r.record_type==="evidence");console.log(String(l.ref.sha256||l.sha256).slice(0,8))' "$RUN/ledger.jsonl")
CP=$(curl -s --noproxy '*' "$B/cite?ev=$SHA")
echo "$CP" | grep -q '"matched_by":"sha256_prefix"' && ok "按哈希前缀（$SHA…）回查命中" || ng "哈希前缀回查失败: $CP"
CN=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' "$B/cite?ev=EV-9999")
[ "$CN" = "404" ] && ok "查无此项 → 404" || ng "查无此项应 404，实得 $CN"

echo "== 7. 未就绪 / 404 语义 =="
NR=$(curl -s --noproxy '*' "$B/report" -o /dev/null -w '%{http_code}'); [ "$NR" = "200" ] && ok "已就绪任务 /report → 200" || ng "状态码 $NR"
G="run-m6e2e-empty"
mkdir -p "runs/$G"
node -e '
const fs=require("fs"),p="data/task-index.json";const j=JSON.parse(fs.readFileSync(p,"utf8"));const now=new Date().toISOString();
if(!j.tasks.find(t=>t.task_id===process.argv[1])){j.tasks.push({task_id:process.argv[1],goal:"未就绪任务",workflow:"research",lit_source:"local",sources:[],run_status:"RUNNING",degraded:false,degraded_reasons:[],session_id:"agnes:e2e",created_at:now,updated_at:now,steps:[]});fs.writeFileSync(p,JSON.stringify(j));}
' "$G"
GB="http://127.0.0.1:$PORT/api/v1/tasks/$G"
GG=$(curl -s --noproxy '*' "$GB/report")
echo "$GG" | grep -q '"status":"generating"' && ok "未就绪 → 200 {status:generating}（不报错）" || ng "未就绪语义错: $GG"
GN=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' "$GB/report.md")
[ "$GN" = "404" ] && ok "未就绪 /report.md → 404 NO_REPORT" || ng "未就绪 report.md 应 404，实得 $GN"
ROOT_URL="http://127.0.0.1:${PORT}"
GN2=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' "${ROOT_URL}/api/v1/tasks/run-19700101-000000-nope00/report")
[ "$GN2" = "404" ] && ok "任务不存在 → 404" || ng "不存在应 404，实得 $GN2"
GN3=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' "${ROOT_URL}/api/v1/tasks/notAId/report")
[ "$GN3" = "400" ] && ok "非法标识 → 400 BAD_ID" || ng "非法标识应 400，实得 $GN3"

echo "== 8. §9.5 门禁：篡改账本 → 拒绝并作废旧报告 =="
cp "$RUN/ledger.jsonl" "$RUN/ledger.jsonl.bak"
sed -i 's/关键要素/被篡改要素/' "$RUN/ledger.jsonl"
( cd kernel && "$PY" -m sciret_kernel report --run-dir "$RUN" --args-json '{}' >/dev/null 2>&1 )
[ ! -f "$RUN/report.json" ] && ok "篡改后拒绝出报告（report.json 已移除）" || ng "篡改后仍出报告！"
[ -f "$RUN/report.json.invalid" ] && ok "旧报告被可逆作废（.invalid）" || ng "旧报告未作废"
grep -q '"passed":false' "$RUN/report_gate.json" && ok "门禁结论留痕 passed=false" || ng "门禁未留痕"
mv "$RUN/ledger.jsonl.bak" "$RUN/ledger.jsonl"
( cd kernel && "$PY" -m sciret_kernel report --run-dir "$RUN" --args-json '{}' >/dev/null 2>&1 )
[ -f "$RUN/report.json" ] && ok "恢复账本后报告可重建（可恢复性）" || ng "恢复后未重建"

echo ""
echo "==================== 结果 ===================="
echo "PASS=$pass FAIL=$fail"
[ "$fail" = "0" ] || exit 1
