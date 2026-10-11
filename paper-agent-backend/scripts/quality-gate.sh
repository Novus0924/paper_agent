#!/usr/bin/env bash
# 全量质量门（§7）：BFF 单测 + 内核单测 + 类型检查
#
# ⚠️ 关键前置：**必须用 Node ≥24.10 跑 BFF 测试**（engines 要求）。
# AGH 的 Windows 原生模块（packages/system-node/dist/native/agnes-system.node）只按 Node 24
# 的 libuv ABI 构建；用 Node 22 跑时原生模块加载失败 →
#   windowsPrivateFilesAvailable() === false → 凭据 ACL 判定 unavailable →
#   credentialStore.read() 抛 CONFIG_CREDENTIAL_STORE →
#   contract.test.ts 的 resolveDaemonScope 用例失败（表现为"AGH 集成坏了"，实为运行时版本不匹配）。
# 本机Bash 的裸 `node` 可能解析到 WorkBuddy 托管的 22.x，故这里显式挑选合规 Node。
set -uo pipefail
cd "$(dirname "$0")/.."

export PATH="/c/Program Files/nodejs:/c/Windows/System32:/c/Windows:${PATH:-}"
for d in /c/Users/*/.workbuddy/binaries/PortableGit/versions/*/usr/bin /c/Users/*/.workbuddy/binaries/PortableGit/versions/*/mingw64/bin; do
  [ -d "$d" ] && export PATH="$d:$PATH"
done
hash -r 2>/dev/null || true

NODE_BIN=""
for cand in "/c/Program Files/nodejs/node.exe" "$(command -v node 2>/dev/null)"; do
  [ -x "$cand" ] || continue
  maj=$("$cand" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
  min=$("$cand" -p 'process.versions.node.split(".")[1]' 2>/dev/null || echo 0)
  if [ "$maj" -gt 24 ] || { [ "$maj" -eq 24 ] && [ "$min" -ge 10 ]; }; then NODE_BIN="$cand"; break; fi
done
if [ -z "$NODE_BIN" ]; then
  echo "[FATAL] 未找到 Node ≥24.10（AGH 原生模块需要）。请安装 Node 24 或修正 PATH。" >&2
  exit 1
fi
echo "使用 Node: $NODE_BIN ($("$NODE_BIN" -v))"

PY="$(. "$(dirname "$0")/_env.sh" && pa_python || true)"
[ -n "$PY" ] || { echo "[FATAL] 未找到 Python（内核需要 ≥3.10，可用 PAPER_AGENT_PYTHON 指定）" >&2; exit 1; }
fail=0

echo ""
echo "== 1/4 BFF 单测（vitest）=="
"$NODE_BIN" node_modules/vitest/vitest.mjs run 2>&1 | tail -6 || fail=1
"$NODE_BIN" node_modules/vitest/vitest.mjs run >/dev/null 2>&1 || fail=1

echo ""
echo "== 2/4 内核单测（python unittest，连跑两次查抖动）=="
for i in 1 2; do
  ( cd kernel && "$PY" -m unittest discover -s tests 2>&1 | grep -E "^(OK|FAILED|Ran )" ) || fail=1
done

echo ""
echo "== 3/4 类型检查（tsc）=="
"$NODE_BIN" node_modules/typescript/bin/tsc -p apps/bff/tsconfig.check.json && echo "tsc: 0 errors" || fail=1

echo ""
# Lint 是 §15「CI 质量门：类型检查 + Lint + 构建 + 测试」与 §16 DoD 明确要求的一环——
# 此前**根本没有 lint 配置**，我却在 DoD 判定表里给它打了 ✅（只因 quality-gate 全绿）。
# 教训：门禁里没有的东西，不能声称它通过了。现在它是第4 道真门禁。
echo "== 4/4 Lint（eslint，类型感知；0 error 才算通过）=="
# 用 eslint 的**真实入口**：node_modules/.bin/eslint 是 shell 包装脚本，
# 用 node 直接执行会因 shell 语法而 SyntaxError（本机踩过）。
# warning 不阻断（30 个非空断言等是既有合理写法），但记下来防止无声堆积；
# 想收紧用 pnpm lint:strict（--max-warnings 0）。
if "$NODE_BIN" node_modules/eslint/bin/eslint.js apps/bff/src apps/bff/test apps/bff/scripts scripts; then
  echo "eslint: 0 error"
else
  fail=1
fi

echo ""
[ "$fail" = "0" ] && echo "质量门：全部通过" || echo "质量门：存在失败项"
exit $fail