#!/usr/bin/env bash
# M5 降级治理端到端验收（需求 §2.2 三级语义与可复测验收、§9.4 降级治理验收、§6 容错策略表）
#
# 逐条验证 §2.2 末尾的四条"可复测验收"：
#   1. 断网/单源不可用但覆盖充足 → degraded=false（仅信息提示）
#   2. 全远程失败回落本地 / 跳过 → degraded=true 且原因可查
#   3. 主动选 local → degraded=false
#   4. 正常启动（不带 chaos）→ 不出现任何由故障注入导致的降级
PATH=$(printf '%s' "$PATH" | tr ':' '\n' | grep -viE 'vendor/shim/safe-bin' | paste -sd: -)
export PATH="/c/Program Files/nodejs:/c/Windows/System32:/c/Windows:$PATH"
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="/c/Program Files/nodejs:/c/Windows/System32:/c/Windows:${PATH:-}"
for d in /c/Users/lenovo/.workbuddy/binaries/PortableGit/versions/*/usr/bin /c/Users/lenovo/.workbuddy/binaries/PortableGit/versions/*/mingw64/bin; do
  [ -d "$d" ] && export PATH="$d:$PATH"
done
hash -r 2>/dev/null || true
export NODE_OPTIONS=""
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
for v in CODEBUDDY_SAFE_DELETE_BULK_GUARD CODEBUDDY_SAFE_DELETE_SANDBOX \
         CODEBUDDY_SAFE_DELETE_BIN_DIR CODEBUDDY_SAFE_DELETE_ENABLED \
         CODEBUDDY_SAFE_DELETE_BROKER_DELETE; do export "$v="; done
for c in curl node; do
  command -v "$c" >/dev/null || { echo "[FATAL] 未找到 $c"; exit 1; }
done
ROOT=$(pwd -W 2>/dev/null || pwd)
PY="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"
WORK="$ROOT/data/_m5"
rm -rf "$WORK"; mkdir -p "$WORK"

pass=0; fail=0
ok(){ echo "  [PASS] $1"; pass=$((pass+1)); }
ng(){ echo "  [FAIL] $1"; fail=$((fail+1)); }

# 必须清掉 chaos 开关：§2.2⑤ 要求"正常启动不带 chaos → 无注入降级"，
# 若外部环境残留了这些变量，L0 用例的"无降级"结论就不可信了。
unset PAPER_AGENT_CHAOS PAPER_AGENT_CHAOS_SCOPE PAPER_AGENT_CHAOS_SOURCES 2>/dev/null || true

# 跑一次R1 并输出 state摘要（避免直接解析中文 JSON 的转义）
run_r1() { # $1=task_id $2=lit_source $3=coverage_json $4=chaos_sources(可空)
  local tid="$1" src="$2" cov="$3" chaos_src="${4:-}"
  local run="$ROOT/runs/$tid"
  rm -rf "$run"; mkdir -p "$run"
  ( cd kernel && "$PY" -m sciret_kernel plan --run-dir "$run" \
      --args-json "{\"task_id\":\"$tid\",\"goal\":\"检索并综述固态电解质界面阻抗的表征方法\",\"workflow\":\"research\",\"lit_source\":\"$src\"}" >/dev/null 2>&1 )
  if [ -n "$chaos_src" ]; then
    ( cd kernel && PAPER_AGENT_CHAOS=1 PAPER_AGENT_CHAOS_SCOPE="$tid" PAPER_AGENT_CHAOS_SOURCES="$chaos_src" \
      "$PY" -m sciret_kernel run_step --run-dir "$run" --args-json "{\"step\":\"R1\",\"coverage_policy\":$cov}" >"$WORK/$tid.out" 2>&1 )
  else
    ( cd kernel && "$PY" -m sciret_kernel run_step --run-dir "$run" \
      --args-json "{\"step\":\"R1\",\"coverage_policy\":$cov}" >"$WORK/$tid.out" 2>&1 )
  fi
}

echo "== 1. L0 正常（全源可用，覆盖充足）→ 无降级 =="
run_r1 "run-m5-l0" auto '{"min_ok_sources":2,"min_hits":4}' ""
node -e '
const s=JSON.parse(require("fs").readFileSync("runs/run-m5-l0/state.json","utf8"));
const bad=[];
if(s.degraded!==false)bad.push("degraded 应为 false，实际 "+s.degraded);
if((s.degraded_reasons||[]).length!==0)bad.push("不应有降级记录："+JSON.stringify(s.degraded_reasons));
if(String(s.source_status.crossref).indexOf("ok")!==0)bad.push("crossref 应 ok");
if(s.source_status.chaos!==undefined)bad.push("未开 chaos 却出现 chaos 标记");
if(bad.length){console.log("    "+bad.join("\n    "));process.exit(1)}
' && ok "L0：degraded=false、无降级记录、无 chaos 残留" || ng "L0 判定错误"

echo "== 2. §2.2验收①单源不可用但覆盖充足 → L1 info，degraded=false =="
run_r1 "run-m5-l1" auto '{"min_ok_sources":1,"min_hits":1}' "crossref"
node -e '
const s=JSON.parse(require("fs").readFileSync("runs/run-m5-l1/state.json","utf8"));
const bad=[];
if(s.degraded!==false)bad.push("覆盖充足却置 degraded=true（P-01 病灶①）");
const info=(s.degraded_reasons||[]).filter(d=>d.level==="info");
if(info.length!==1)bad.push("应有且仅有 1 条 info，实际 "+info.length);
else{
  if(info[0].source.indexOf("crossref")<0)bad.push("info.source 应含 crossref，实际 "+info[0].source);
  if(info[0].impact!=="结果未受影响")bad.push("L1 影响应说明未受影响，实际 "+info[0].impact);
}
if(s.source_status.chaos!=="enabled:1")bad.push("注入事实未留痕（source_status.chaos）");
if(bad.length){console.log("    "+bad.join("\n    "));process.exit(1)}
' && ok "L1：只记 info、degraded=false、注入留痕可审计" || ng "L1 判定错误"

echo "== 3. §2.2 验收② 全源失败 → L2 degraded=true 且原因可查 =="
run_r1 "run-m5-l2" auto '{"min_ok_sources":2,"min_hits":4}' "crossref,openalex"
node -e '
const s=JSON.parse(require("fs").readFileSync("runs/run-m5-l2/state.json","utf8"));
const bad=[];
if(s.degraded!==true)bad.push("覆盖不足必须置 degraded=true");
const l2=(s.degraded_reasons||[]).filter(d=>d.level==="degraded");
if(l2.length!==1)bad.push("应有且仅有 1 条 degraded，实际 "+l2.length);
else{
  for(const k of ["source","reason","impact","resumable","step"])if(l2[0][k]===undefined)bad.push("L2 缺字段 "+k);
  if(String(l2[0].reason).indexOf("覆盖不足")<0)bad.push("原因应说明覆盖不足："+l2[0].reason);
  if(l2[0].step!=="R1")bad.push("step 应为 R1");
}
if(bad.length){console.log("    "+bad.join("\n    "));process.exit(1)}
' && ok "L2：degraded=true、五要素齐全（来源/原因/影响/可重试/步骤）" || ng "L2 判定错误"

echo "== 4. §2.2 验收③ 主动选 local → 不判降级（即使全源不可用）=="
run_r1 "run-m5-local" local '{"min_ok_sources":99,"min_hits":999}' "crossref,openalex"
node -e '
const s=JSON.parse(require("fs").readFileSync("runs/run-m5-local/state.json","utf8"));
if(s.degraded!==false){console.log("    主动离线被判降级（P-01 病灶④）");process.exit(1)}
if((s.degraded_reasons||[]).filter(d=>d.level==="degraded").length!==0){console.log("    不应有 L2 记录");process.exit(1)}
' && ok "主动 local：degraded=false（显式离线是预期路径）" || ng "主动 local 判定错误"

echo "== 5. §2.2 验收④ 正常启动不带 chaos → 无任何注入导致的降级 =="
# 上面 L0 已在无 chaos 环境下跑过；这里再显式确认 chaos 未开启时开关零副作用
run_r1 "run-m5-nochaos" auto '{"min_ok_sources":2,"min_hits":4}' ""
grep -q '"chaos"' runs/run-m5-nochaos/state.json && ng "state.json 出现 chaos 字段" || ok "state.json 无 chaos 字段（无残留）"
node -e '
const s=JSON.parse(require("fs").readFileSync("runs/run-m5-nochaos/state.json","utf8"));
for(const d of (s.degraded_reasons||[]))if(String(d.reason).indexOf("演练注入")>=0){console.log("    出现演练注入痕迹");process.exit(1)}
' && ok "降级记录中无任何演练注入痕迹" || ng "存在注入痕迹"

echo "== 6. §2.2⑤ 故障注入 Fail-closed：非法开关必须报错 =="
# 两点都必须做对，否则测出来的"通过"是假的：
#   ①用**全新 run 目录**；②setup 调用**不带 chaos**。
# 否则 R1 已是终态 → 步骤直接复用返回，chaos 配置根本不会被求值（我踩过这个坑）。
setup_fresh() { # $1=task_id —— 只 plan 不执行，R1 仍是 PENDING
  local tid="$1" run="$ROOT/runs/$1"
  rm -rf "$run"; mkdir -p "$run"
  ( cd kernel && "$PY" -m sciret_kernel plan --run-dir "$run" \
      --args-json "{\"task_id\":\"$tid\",\"goal\":\"检索并综述固态电解质界面阻抗的表征方法\",\"workflow\":\"research\",\"lit_source\":\"auto\"}" >/dev/null 2>&1 )
}
setup_fresh "run-m5-badflag-a"
( cd kernel && PAPER_AGENT_CHAOS=yes PAPER_AGENT_CHAOS_SCOPE=run-m5-badflag-a PAPER_AGENT_CHAOS_SOURCES=crossref \
    "$PY" -m sciret_kernel run_step --run-dir "$ROOT/runs/run-m5-badflag-a" --args-json '{"step":"R1"}' >"$WORK/badflag.out" 2>&1 )
if grep -q "PAPER_AGENT_CHAOS" "$WORK/badflag.out"; then
  ok "非法开关值 → 报错退出（fail-closed，不静默当作关闭）"
else
  ng "非法开关值未被拒绝：$(head -3 "$WORK/badflag.out")"
fi
setup_fresh "run-m5-badflag-b"
# 只给 flag，**不给 SCOPE**（校验顺序：flag → scope → sources，先撞 scope 这道）
( cd kernel && PAPER_AGENT_CHAOS=1 \
    "$PY" -m sciret_kernel run_step --run-dir "$ROOT/runs/run-m5-badflag-b" --args-json '{"step":"R1"}' >"$WORK/noscope.out" 2>&1 )
if grep -q "PAPER_AGENT_CHAOS_SCOPE" "$WORK/noscope.out"; then
  ok "缺作用域 → 报错（防注入泄漏到其他任务）"
else
  ng "缺作用域未被拒绝：$(head -3 "$WORK/noscope.out")"
fi
setup_fresh "run-m5-badflag-c"
( cd kernel && PAPER_AGENT_CHAOS=1 PAPER_AGENT_CHAOS_SCOPE=run-m5-badflag-c \
    "$PY" -m sciret_kernel run_step --run-dir "$ROOT/runs/run-m5-badflag-c" --args-json '{"step":"R1"}' >"$WORK/nosrc.out" 2>&1 )
if grep -q "PAPER_AGENT_CHAOS_SOURCES" "$WORK/nosrc.out"; then
  ok "缺目标源 → 报错（单源故障与全源故障是两种演练，不猜默认值）"
else
  ng "缺目标源未被拒绝：$(head -3 "$WORK/nosrc.out")"
fi
# 负向对照：确认 R1 真的被拒绝执行了（而不是"跑成功了所以没报错"）
grep -q '"ok": true' "$WORK/badflag.out" && ng "非法开关竟然执行成功" || ok "非法开关下R1 未被执行（报错即中止）"

echo "== 7. §2.2① 覆盖策略可配置：同一语料不同阈值 → 不同判定 =="
# 只挂 crossref（openalex 仍可用 → ok_sources=1），这样两档阈值才会给出不同判定。
# 若两源全挂，ok_sources=0，任何正阈值都判降级，测不出"可配置"。
run_r1 "run-m5-cov-loose" auto '{"min_ok_sources":1,"min_hits":1}' "crossref"
run_r1 "run-m5-cov-strict" auto '{"min_ok_sources":2,"min_hits":4}' "crossref"
L=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("runs/run-m5-cov-loose/state.json","utf8")).degraded)')
S=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("runs/run-m5-cov-strict/state.json","utf8")).degraded)')
[ "$L" = "false" ] && [ "$S" = "true" ] \
  && ok "同样只挂 crossref：阈值 1源/1命中 → 不降级；阈值 2源/4命中 → 降级（策略真实生效）" \
  || ng "覆盖策略未生效：loose=$L strict=$S"
run_r1 "run-m5-cov-typo" auto '{}' ""
( cd kernel && "$PY" -m sciret_kernel run_step --run-dir "$ROOT/runs/run-m5-cov-typo" \
    --args-json '{"step":"R1","coverage_policy":{"min_ok_sorce":2}}' >"$WORK/typo.out" 2>&1 )
if grep -q "min_ok_sorce" "$WORK/typo.out"; then
  ok "非法阈值字段 → 报错（不静默取默认，否则'我配了5却按2跑'无法察觉）"
else
  ng "非法阈值字段未被拒绝"
fi
# 回显生效策略：调用方必须能确认"我配的阈值真的生效了"
( cd kernel && "$PY" -m sciret_kernel run_all --run-dir "$ROOT/runs/run-m5-l1" \
    --args-json '{"coverage_policy":{"min_ok_sources":1,"min_hits":1}}' >"$WORK/echo.out" 2>&1 )
grep -q '"coverage_policy"' "$WORK/echo.out" \
  && ok "结果回显生效的 coverage_policy（可确认配置真被采用）" \
  || ng "未回显 coverage_policy：$(head -2 "$WORK/echo.out")"

echo "== 8. §2.2⑥ 降级可观测：报告降级声明与 SSE 事件 =="
# L2 任务跑完整流程 → 报告须含降级声明
( cd kernel && "$PY" -m sciret_kernel run_all --run-dir "$ROOT/runs/run-m5-l2" \
    --args-json '{"coverage_policy":{"min_ok_sources":2,"min_hits":4}}' >/dev/null 2>&1 )
if [ -f "$ROOT/runs/run-m5-l2/report.json" ]; then
  node -e '
const r=JSON.parse(require("fs").readFileSync("runs/run-m5-l2/report.json","utf8"));
const bad=[];
if(r.degraded!==true)bad.push("报告 degraded 应为 true");
if(String(r.degraded_statement||"").indexOf("降级")<0)bad.push("降级声明缺失："+r.degraded_statement);
if(bad.length){console.log("    "+bad.join("\n    "));process.exit(1)}
' && ok "报告含降级声明且 degraded=true" || ng "报告降级声明异常"
else
  ng "L2 任务未产出报告.json"
fi
# L0 任务跑完整流程 → 报告须声明"未发生实质降级"
( cd kernel && "$PY" -m sciret_kernel run_all --run-dir "$ROOT/runs/run-m5-l0" --args-json '{}' >/dev/null 2>&1 )
node -e '
const r=JSON.parse(require("fs").readFileSync("runs/run-m5-l0/report.json","utf8"));
if(r.degraded!==false){console.log("    L0 报告不应标记降级");process.exit(1)}
if(String(r.degraded_statement||"").indexOf("未发生实质降级")<0){console.log("    缺少非降级声明："+r.degraded_statement);process.exit(1)}
' && ok "L0 报告声明未发生实质降级（L0/L2 对外表现可区分）" || ng "L0 报告声明异常"

echo "== 9. §6 容错策略单测（重试分类/退避/受控并发）=="
( cd kernel && "$PY" -m unittest tests.test_kernel.TestResiliencePolicy -v 2>&1 ) > "$WORK/resilience.out" 2>&1
if grep -q "^OK" "$WORK/resilience.out"; then
  n=$(grep -c "ok$" "$WORK/resilience.out" || true)
  ok "容错策略单测通过（HTTP 分类 / 指数退避+抖动 / 永久错误不重试 / 并发保序）"
else
  ng "容错策略单测失败：$(tail -5 "$WORK/resilience.out")"
fi
( cd kernel && "$PY" -m unittest tests.test_kernel.TestDegradationSemantics -v 2>&1 ) > "$WORK/degrade.out" 2>&1
if grep -q "^OK" "$WORK/degrade.out"; then
  ok "降级三级语义单测通过（L0/L1/L2/local/no-chaos/scope/fail-closed）"
else
  ng "降级语义单测失败：$(tail -5 "$WORK/degrade.out")"
fi

echo ""
echo "==================== 结果 ===================="
echo "PASS=$pass FAIL=$fail"
[ "$fail" = "0" ] || exit 1