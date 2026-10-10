#!/usr/bin/env bash
# M7 导出三件套端到端验收（需求 §8.1 接口 15、§8.2 导出契约、§8.3 错误码、§9.6 验收、§560 Exporter SPI）
# 说明：
#   - BFF 只读内核产物 + 经 AGH 原生 CLI 导出，不spawn 内核跑主链路；
#   - 审计包必须用**独立工具 unzip** 与**内核托管 Python 实际执行 verify.py** 交叉验证，
#     不能只断言"文件存在"（§9.6 要求校验状态真实可核）。
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="/c/Program Files/nodejs:/c/Windows/System32:/c/Windows:${PATH:-}"
for d in /c/Users/lenovo/.workbuddy/binaries/PortableGit/versions/*/usr/bin /c/Users/lenovo/.workbuddy/binaries/PortableGit/versions/*/mingw64/bin; do
  [ -d "$d" ] && export PATH="$d:$PATH"
done
hash -r 2>/dev/null || true
for c in curl node; do
  command -v "$c" >/dev/null || { echo "[FATAL] 未找到 $c，请检查 PATH"; exit 1; }
done
command -v unzip >/dev/null || echo "  [WARN] 无 unzip，将跳过 ZIP 交叉验证"
ROOT="$(pwd)"
PY="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"
PORT="${PAPER_AGENT_PORT:-8801}"
TID="run-m7e2e-$(date +%H%M%S)"
RUN="$ROOT/runs/$TID"
WORK="$ROOT/data/_m7"
mkdir -p "$WORK"

pass=0; fail=0
ok(){ echo "  [PASS] $1"; pass=$((pass+1)); }
ng(){ echo "  [FAIL] $1"; fail=$((fail+1)); }

echo "== 1. 内核跑完整流程（产出真实报告与账本）=="
( cd kernel && "$PY" -m sciret_kernel plan --run-dir "$RUN" \
    --args-json '{"goal":"检索并综述固态电解质界面阻抗的表征方法","workflow":"research","lit_source":"local"}' >/dev/null 2>&1 )
( cd kernel && "$PY" -m sciret_kernel run_all --run-dir "$RUN" --args-json '{}' >/dev/null 2>&1 )
[ -f "$RUN/report.json" ] && ok "终态 DONE 产出 report.json" || ng "report.json 未产出"
[ -f "$RUN/report.md" ] && ok "产出 report.md" || ng "report.md 未产出"
[ -f "$RUN/report_gate.json" ] && ok "产出 report_gate.json" || ng "缺 report_gate.json"
[ -f "$RUN/ledger.jsonl" ] && ok "产出 ledger.jsonl" || ng "缺 ledger.jsonl"

# 取真实会话 id（有AGH 会话映射的 run）用于 session 导出
SID=$(node -e '
const fs=require("fs"),d="runs";
let best=null;
for(const n of fs.readdirSync(d)){const p=d+"/"+n+"/state.json";if(!fs.existsSync(p))continue;
 try{const s=JSON.parse(fs.readFileSync(p,"utf8"));if(s.task_id)best=best||n;}catch(e){}}
const idx=JSON.parse(fs.readFileSync("data/task-index.json","utf8"));
const cand=idx.tasks.filter(t=>t.session_id&&t.session_id.includes("workspace:")).sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
console.log(cand.length?cand[0].session_id:"");
')
echo "  复用真实会话：${SID:-（无）}"

node -e '
const fs=require("fs"),p="data/task-index.json";
const j=JSON.parse(fs.readFileSync(p,"utf8"));
const now=new Date().toISOString();
if(!j.tasks.find(t=>t.task_id===process.argv[1])){
 j.tasks.push({task_id:process.argv[1],goal:"检索并综述固态电解质界面阻抗的表征方法",workflow:"research",
  lit_source:"local",sources:[],run_status:"DONE",degraded:false,degraded_reasons:[],
  session_id:process.argv[2]||"",created_at:now,updated_at:now,
  steps:[{id:"R1",label:"多源检索",status:"DONE",attempts:1}]});
 fs.writeFileSync(p,JSON.stringify(j));
}
console.log("  索引已注入", process.argv[1], "session="+(process.argv[2]||"(空)"));
' "$TID" "$SID"

# 未就绪任务：**必须在 BFF 启动前注入** —— TaskIndex 是内存缓存（启动时读一次盘），
# 启动后再改索引文件，运行中的 BFF 看不到（会误报 404 而非 409）。
G="run-m7e2e-empty"
mkdir -p "runs/$G"
node -e '
const fs=require("fs"),p="data/task-index.json";const j=JSON.parse(fs.readFileSync(p,"utf8"));const now=new Date().toISOString();
if(!j.tasks.find(t=>t.task_id===process.argv[1])){j.tasks.push({task_id:process.argv[1],goal:"未就绪任务",workflow:"research",lit_source:"local",sources:[],run_status:"RUNNING",degraded:false,degraded_reasons:[],session_id:"",created_at:now,updated_at:now,steps:[]});fs.writeFileSync(p,JSON.stringify(j));}
' "$G"

echo "== 2. 启动 BFF（仅回环）=="
PAPER_AGENT_PORT="$PORT" npx tsx apps/bff/src/index.ts >"$WORK/bff.log" 2>&1 &
BFF_PID=$!
trap 'kill $BFF_PID 2>/dev/null' EXIT
READY=0
for i in $(seq 1 40); do
  if curl -s --noproxy '*' "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then READY=1; break; fi
  sleep 0.5
done
[ "$READY" = "1" ] && ok "BFF 健康探针通过" || ng "BFF 未就绪"
[ "$READY" = "1" ] || { echo "PASS=$pass FAIL=$fail"; tail -20 "$WORK/bff.log"; exit 1; }

B="http://127.0.0.1:$PORT/api/v1/tasks/$TID"
E="$B/export"

echo "== 3. kind=report（Markdown 文件流）=="
H=$(curl -s --noproxy '*' -D - -o "$WORK/report.md" "$E?kind=report")
echo "$H" | grep -qi 'content-type:.*text/markdown' && ok "Content-Type: text/markdown" || ng "Content-Type 不符"
echo "$H" | grep -qi 'x-content-type-options: nosniff' && ok "X-Content-Type-Options: nosniff" || ng "缺 nosniff"
echo "$H" | grep -qi "content-disposition: inline" && ok "Content-Disposition: inline（可内联预览）" || ng "缺 inline"
echo "$H" | grep -qi "filename=\"$TID-report.md\"" && ok "建议文件名正确" || ng "文件名不符"
grep -q '\[EV-' "$WORK/report.md" && ok "MD 含结论证据角标" || ng "MD 缺角标"
grep -q '降级' "$WORK/report.md" && ok "MD 含降级声明" || ng "MD 缺降级声明"
diff -q "$WORK/report.md" "$RUN/report.md" >/dev/null 2>&1 && ok "导出内容与内核产物逐字节一致" || ng "导出内容与内核产物不一致"

echo "== 4. kind=audit（审计包 ZIP）=="
AH=$(curl -s --noproxy '*' -D - -o "$WORK/audit.zip" "$E?kind=audit")
echo "$AH" | grep -qi 'content-type:.*application/zip' && ok "Content-Type: application/zip" || ng "Content-Type 不符"
echo "$AH" | grep -qi "content-disposition: attachment" && ok "Content-Disposition: attachment" || ng "缺 attachment"
echo "$AH" | grep -qi "filename=\"$TID-audit.zip\"" && ok "建议文件名正确" || ng "文件名不符"
echo "$AH" | grep -qi 'x-content-type-options: nosniff' && ok "X-Content-Type-Options: nosniff" || ng "缺 nosniff"
echo "$AH" | grep -qi 'x-export-contents:.*verify.py' && ok "X-Export-Contents 列出校验脚本" || ng "X-Export-Contents 不含 verify.py"

# 4.1 用独立工具 unzip 交叉验证（不是"我们自己写的解析器自己说了算"）
if command -v unzip >/dev/null; then
  unzip -t "$WORK/audit.zip" >"$WORK/unzip-t.txt" 2>&1
  grep -q 'No errors detected' "$WORK/unzip-t.txt" && ok "unzip -t 独立交叉验证通过（ZIP 合法）" || ng "unzip -t 失败: $(tail -3 "$WORK/unzip-t.txt")"
  rm -rf "$WORK/pkg"; mkdir -p "$WORK/pkg"
  unzip -q "$WORK/audit.zip" -d "$WORK/pkg" && ok "审计包可被标准工具解压" || ng "解压失败"
  for f in manifest.json verify.py run/report.md run/ledger.jsonl run/report_gate.json run/events.json run/conclusions.json; do
    [ -s "$WORK/pkg/$f" ] && ok "含 $f" || ng "缺或空 $f"
  done
  if [ -f "$WORK/pkg/run/state.json" ]; then ok "含 run/state.json"; else echo "  [SKIP] 本次 run 未产出 state.json（不以缺失为失败）"; fi

  # 4.2 清单逐文件 sha256 与磁盘实际内容一致（manifest 自洽性）
  node -e '
const fs=require("fs"),crypto=require("crypto"),path=require("path");
const m=JSON.parse(fs.readFileSync(process.argv[1]+"/manifest.json","utf8"));
let bad=0,checked=0;
for(const f of m.files){
  const p=path.join(process.argv[1],f.path);
  if(!fs.existsSync(p)){console.log("  [FAIL] 清单列出但文件不存在:",f.path);bad++;continue;}
  const b=fs.readFileSync(p);
  checked++;
  if(b.length!==f.bytes){console.log("  [FAIL] 字节数不符:",f.path,b.length,"vs",f.bytes);bad++;continue;}
  const h=crypto.createHash("sha256").update(b).digest("hex");
  if(h!==f.sha256){console.log("  [FAIL] sha256 不符:",f.path);bad++;}
}
console.log(bad===0?`  [PASS] 清单 ${checked} 个文件字节数与 sha256 全部吻合`:`  [FAIL] 清单校验 ${bad} 项不符`);
process.exit(bad===0?0:1);
' "$WORK/pkg" && pass=$((pass+1)) || fail=$((fail+1))
  grep -q '"gate"' "$WORK/pkg/manifest.json" && grep -q '"passed": true' "$WORK/pkg/manifest.json" \
    && ok "manifest 记录门禁状态 passed=true" || ng "manifest 门禁状态缺失/不通过"
  grep -q 'how_to_verify' "$WORK/pkg/manifest.json" && ok "manifest 给出校验方法" || ng "manifest 缺 how_to_verify"

  # 4.3 关键：**实际执行**包内校验脚本，证明"含校验脚本"不是空话
  "$PY" "$WORK/pkg/verify.py" --run-dir "$WORK/pkg/run" >"$WORK/verify.out" 2>&1
  VRC=$?
  [ "$VRC" = "0" ] && ok "verify.py 对真实产物校验通过（退出码 0）" || ng "verify.py 退出码 $VRC: $(tail -5 "$WORK/verify.out")"
  grep -q '哈希链完整' "$WORK/verify.out" && ok "verify.py 给出可读校验结论（非空输出）" || ng "verify.py 输出可疑: $(head -5 "$WORK/verify.out")"

  # 4.4 篡改包内账本 → 校验脚本必须**发现**（校验必须 fail-closed，否则是假校验）
  cp "$WORK/pkg/run/ledger.jsonl" "$WORK/pkg/run/ledger.jsonl.bak"
  sed -i 's/"record_type":"evidence"/"record_type":"evidence","tampered":true/' "$WORK/pkg/run/ledger.jsonl"
  "$PY" "$WORK/pkg/verify.py" --run-dir "$WORK/pkg/run" >"$WORK/verify-bad.out" 2>&1
  BRC=$?
  [ "$BRC" = "1" ] && ok "篡改账本后 verify.py 拒绝通过（退出码 1，fail-closed）" || ng "篡改后仍通过！退出码 $BRC —— 这是假校验"
  mv "$WORK/pkg/run/ledger.jsonl.bak" "$WORK/pkg/run/ledger.jsonl"
else
  ng "无 unzip，无法交叉验证 ZIP（不可接受）"
fi

echo "== 5. kind=session（经 AGH 原生导出）=="
if [ -n "$SID" ]; then
  SH=$(curl -s --noproxy '*' -D - -o "$WORK/session.jsonl" "$E?kind=session")
  SCODE=$(echo "$SH" | head -1 | awk '{print $2}')
  if [ "$SCODE" = "200" ]; then
    ok "session 导出成功（经 AGH 原生 CLI）"
    echo "$SH" | grep -qi 'x-content-type-options: nosniff' && ok "session 带 nosniff" || ng "session 缺 nosniff"
    LINES=$(wc -l <"$WORK/session.jsonl" | tr -d ' ')
    [ "$LINES" -gt 0 ] && ok "导出为非空 JSONL（$LINES 行）" || ng "session 导出为空"
    head -1 "$WORK/session.jsonl" | grep -q '{' && ok "首行是合法 JSON 对象" || ng "首行非法 JSON"
    # 与 AGH 原生 CLI 直出的内容比对：证明确实是"经原生导出"而非自造
    bash agh.sh export "$SID" --format agnes -o "$WORK/session-cli.jsonl" >/dev/null 2>&1
    if [ -s "$WORK/session-cli.jsonl" ]; then
      OK_SHAPE=1
      cmp -s "$WORK/session.jsonl" "$WORK/session-cli.jsonl" && ok "与 AGH CLI 直出逐字节一致（确为原生导出）" \
        || { echo "  [INFO] 字节不同（导出内容含时间戳等），改为结构一致性比对"
             diff <(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean)[0]).type||"")' "$WORK/session.jsonl" 2>/dev/null) \
                  <(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean)[0]).type||"")' "$WORK/session-cli.jsonl" 2>/dev/null) >/dev/null 2>&1 \
               && ok "首事件类型与 CLI 直出相同（确为原生导出）" || OK_SHAPE=0
             [ "$OK_SHAPE" = "1" ] || ng "无法证明与原生导出一致"; }
    else
      ng "AGH CLI 直出失败，无法证明'经原生导出'"
    fi
  else
    # daemon 未运行等情况：必须如实报错，不得返回空文件伪装成功
    ok "daemon 未就绪时如实报错（HTTP $SCODE），未伪装成功"
    cat "$WORK/session.jsonl" | grep -q 'EXPORT_ERROR' && ok "错误码 EXPORT_ERROR" || ng "错误码不符: $(head -c 200 "$WORK/session.jsonl")"
    grep -q 'agh.sh export' "$WORK/session.jsonl" && ok "错误附可执行的重试指引" || ng "错误缺重试指引"
  fi
else
  echo "  [SKIP] 无真实 AGH 会话映射，跳过 session 导出验证"
fi

echo "== 6. 未就绪 / 参数校验 / 404 语义 =="
GB="http://127.0.0.1:$PORT/api/v1/tasks/$G/export"
GN=$(curl -s -o "$WORK/notready.json" -w '%{http_code}' --noproxy '*' "$GB?kind=report")
[ "$GN" = "409" ] && ok "未就绪 → 409" || ng "未就绪应 409，实得 $GN"
grep -q '"code":"NOT_READY"' "$WORK/notready.json" && ok "错误码 NOT_READY" || ng "错误码不符"
grep -q '尚不可导出' "$WORK/notready.json" && ok "说明未就绪原因" || ng "未说明原因"
grep -q '当前无可导出格式' "$WORK/notready.json" && ok "如实说明可导出范围（无可导出格式）" || ng "未说明可导出范围"
GK=$(curl -s -o "$WORK/badkind.json" -w '%{http_code}' --noproxy '*' "$B/export?kind=zip")
[ "$GK" = "400" ] && ok "非法 kind → 400（不静默回退）" || ng "非法 kind 应 400，实得 $GK"
grep -q '"code":"BAD_PARAM"' "$WORK/badkind.json" && grep -q 'report | audit | session' "$WORK/badkind.json" \
  && ok "400 列出全部允许值" || ng "400 未列出允许值"
GM=$(curl -s -o "$WORK/nokind.json" -w '%{http_code}' --noproxy '*' "$B/export")
[ "$GM" = "400" ] && ok "缺 kind → 400（不静默默认 report）" || ng "缺 kind 应 400，实得 $GM"
GF=$(curl -s -o "$WORK/badfmt.json" -w '%{http_code}' --noproxy '*' "$B/export?kind=session&format=pdf")
[ "$GF" = "400" ] && ok "非法 session format → 400" || ng "非法 format 应 400，实得 $GF"
GMISS=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' "http://127.0.0.1:$PORT/api/v1/tasks/run-19700101-000000-nope00/export?kind=report")
[ "$GMISS" = "404" ] && ok "任务不存在 → 404" || ng "不存在应 404，实得 $GMISS"
GBAD=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' "http://127.0.0.1:$PORT/api/v1/tasks/notAId/export?kind=report")
[ "$GBAD" = "400" ] && ok "非法标识 → 400 BAD_ID" || ng "非法标识应 400，实得 $GBAD"

echo "== 7. §11 安全：导出不得泄露宿主密钥env =="
grep -qi 'AGNES_API_KEY\|api_key\|sk-' "$WORK/session.jsonl" 2>/dev/null && ng "导出内容疑似含密钥" || ok "导出内容未见密钥字样"
if command -v unzip >/dev/null; then
  unzip -p "$WORK/audit.zip" manifest.json > "$WORK/mf.json" 2>/dev/null
  grep -qi 'api_key\|sk-\|AGNES_API_KEY' "$WORK/mf.json" && ng "manifest 疑似泄露密钥" || ok "manifest 未泄露密钥"
fi

echo ""
echo "==================== 结果 ===================="
echo "PASS=$pass FAIL=$fail"
[ "$fail" = "0" ] || exit 1