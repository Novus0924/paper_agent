// sciret 插件离线自检（安装 AGH 前的"插件本体"验证，无需 TTY）
//
// 用途：AGH 的 `package add` 强制真实终端交互确认（非 TTY 直接判为取消），
//       助手/CI 无法代装；但"插件代码到底能不能跑"可以完全离线验证 —— 本脚本即做这件事。
//
// 用法（关键：必须带上与 daemon 相同的环境变量）：
//   PAPER_AGENT_PYTHON="C:/.../python.exe" \
//   PAPER_AGENT_KERNEL_ROOT="D:/workBubbyStore/paper-agent-2/kernel" \
//   PAPER_AGENT_RUNS_DIR="D:/workBubbyStore/paper-agent-2/runs" \
//   node plugin/sciret/verify-offline.mjs
//
// 退出码：0 全通过 / 1 有失败。

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const PLUGIN_URL = pathToFileURL(join(import.meta.dirname, 'index.mjs')).href
const META_KEYS = [
  'isReadOnly',
  'isDestructive',
  'isConcurrencySafe',
  'isOpenWorld',
  'replay',
  'costHint',
  'deferLoading',
  'requiresApproval',
]
// AGH extension-api/src/tool.ts 的 checkToolMeta 是唯一权威门槛（八键齐全 + 取值合法）
const REPLAY_VALUES = new Set(['safe', 'never', 'idempotent'])
const APPROVAL_VALUES = new Set(['never', 'destructive', 'always'])
const COST_KEYS = new Set(['credits', 'wallMs'])
const EXPECTED_TOOLS = [
  'sciret_ping',
  'sciret_plan',
  'sciret_run_step',
  'sciret_run_all',
  'sciret_status',
  'sciret_verify',
  'sciret_report',
  'sciret_cite',
  'sciret_resume',
]

const results = []
function check(id, ok, detail) {
  results.push({ id, ok, detail })
  console.log(`[${ok ? '✓' : '×'}] ${id}${detail ? ` — ${detail}` : ''}`)
}

function loadTools(mod) {
  const tools = new Map()
  const stubCtx = {
    extension: () => ({
      registerTool: (t) => tools.set(t.name, t),
      on: () => undefined,
      ctx: { log: { info: () => undefined, warn: () => undefined } },
    }),
  }
  mod.sciret.apply(stubCtx)
  return tools
}

async function main() {
  const mod = await import(PLUGIN_URL)
  console.log('== sciret 插件离线自检 ==')
  console.log('插件文件:', PLUGIN_URL)

  // 1) 静态：导出形态与 inject
  check('静态·导出形状', typeof mod.sciret === 'object' && typeof mod.sciret.apply === 'function')
  check('静态·inject', JSON.stringify(mod.sciret.inject) === JSON.stringify(['extension']), JSON.stringify(mod.sciret.inject))

  // 2) 静态：工具数与 meta 完整性
  const tools = loadTools(mod)
  check('静态·工具数量', tools.size === EXPECTED_TOOLS.length, `${tools.size} 个（期望 ${EXPECTED_TOOLS.length}）`)
  const missing = EXPECTED_TOOLS.filter((n) => !tools.has(n))
  check('静态·工具齐全', missing.length === 0, missing.length ? `缺少 ${missing.join(',')}` : EXPECTED_TOOLS.join(', '))

  let metaOk = true
  for (const [name, t] of tools) {
    const m = t.meta ?? {}
    for (const k of META_KEYS) {
      if (!Object.hasOwn(m, k)) {
        metaOk = false
        console.log(`   !! ${name} 缺 meta 键 ${k}`)
      }
    }
    for (const k of ['isReadOnly', 'isDestructive', 'isConcurrencySafe', 'isOpenWorld']) {
      if (typeof m[k] !== 'boolean') {
        metaOk = false
        console.log(`   !! ${name} meta.${k} 必须是 boolean`)
      }
    }
    // replay：AGH 只接受 safe | never | idempotent（曾因写 'conditional' 被拒）
    if (!REPLAY_VALUES.has(String(m.replay))) {
      metaOk = false
      console.log(`   !! ${name} meta.replay 非法：${String(m.replay)}（允许 ${[...REPLAY_VALUES].join(' | ')}）`)
    }
    // costHint：仅允许 { credits?: number; wallMs?: number } 或 undefined
    if (m.costHint !== undefined) {
      const c = m.costHint
      if (typeof c !== 'object' || c === null || Array.isArray(c)) {
        metaOk = false
        console.log(`   !! ${name} meta.costHint 必须是 { credits?, wallMs? } 或 undefined`)
      } else {
        for (const k of Object.keys(c)) {
          if (!COST_KEYS.has(k) || typeof c[k] !== 'number' || !Number.isFinite(c[k])) {
            metaOk = false
            console.log(`   !! ${name} meta.costHint.${k} 非法（仅允许有限数值 credits/wallMs）`)
          }
        }
      }
    }
    if (m.requiresApproval !== undefined && !APPROVAL_VALUES.has(String(m.requiresApproval))) {
      metaOk = false
      console.log(`   !! ${name} meta.requiresApproval 非法：${String(m.requiresApproval)}`)
    }
    // parameters：必须是纯 JSON 数据（原型为 Object.prototype/Array.prototype，且可 JSON 序列化）
    try {
      JSON.parse(JSON.stringify(t.parameters))
    } catch {
      metaOk = false
      console.log(`   !! ${name} parameters 不可 JSON 序列化`)
    }
    const kind = t.parameters?.[Symbol.for('TypeBox.Kind')]
    if (kind !== 'Object') {
      metaOk = false
      console.log(`   !! ${name} parameters 未标记 TypeBox Kind=Object`)
    }
  }
  check('静态·meta 八键 + 取值合法（replay/costHint/approval）+ TypeBox schema', metaOk)

  // 3) 动态：缺环境变量时必须给出可读修复指引（不得静默退化）
  const hadKernelRoot = process.env['PAPER_AGENT_KERNEL_ROOT']
  if (hadKernelRoot) {
    const saved = process.env['PAPER_AGENT_KERNEL_ROOT']
    delete process.env['PAPER_AGENT_KERNEL_ROOT']
    try {
      await tools.get('sciret_ping').execute({ run_dir: join(tmpdir(), 'probe') })
      check('动态·缺 env 时应失败', false, '预期抛错但成功了')
    } catch (e) {
      check('动态·缺 env 给出修复指引', /daemon stop/.test(String(e.message ?? '')), '错误信息含可执行步骤')
    }
    process.env['PAPER_AGENT_KERNEL_ROOT'] = saved
  } else {
    console.log('[skip] 动态·缺 env 检查（当前未设置 PAPER_AGENT_KERNEL_ROOT）')
  }

  if (!process.env['PAPER_AGENT_PYTHON'] || !process.env['PAPER_AGENT_KERNEL_ROOT'] || !process.env['PAPER_AGENT_RUNS_DIR']) {
    check('动态·内核链路', false, '未设置 PAPER_AGENT_PYTHON / PAPER_AGENT_KERNEL_ROOT / PAPER_AGENT_RUNS_DIR，无法执行动态验证')
    return finish()
  }

  // 4) 动态：真实调用内核（ping → plan → run_step → report）
  const runsDir = process.env['PAPER_AGENT_RUNS_DIR']
  const runDir = mkdtempSync(join(runsDir, 'verify-'))
  try {
    const ping = await tools.get('sciret_ping').execute({ run_dir: runDir })
    check('动态·sciret_ping', ping.structured?.ok === true, `kernel_version=${ping.structured?.kernel_version}`)

    const plan = await tools.get('sciret_plan').execute({
      run_dir: runDir,
      goal: '检索并综述固态电解质界面阻抗的表征方法',
      workflow: 'research',
      lit_source: 'local',
      task_id: 'verify-offline',
    })
    check('动态·sciret_plan', plan.structured?.ok === true, plan.structured?.human_summary)

    const step = await tools.get('sciret_run_step').execute({ run_dir: runDir, step: 'R1' })
    check('动态·sciret_run_step R1', step.structured?.ok === true, step.structured?.human_summary)

    const status = await tools.get('sciret_status').execute({ run_dir: runDir })
    check('动态·sciret_status', status.structured?.ok === true, status.structured?.human_summary)

    // 5) 安全：非法 run_dir（目录穿越）必须被内核拦下
    try {
      await tools.get('sciret_ping').execute({ run_dir: `${runsDir}/../../etc` })
      check('动态·非法 run_dir 被拦', false, '预期抛错但成功了')
    } catch (e) {
      check('动态·非法 run_dir 被拦', /run_dir 非法|越界/.test(String(e.message ?? '')), String(e.message).slice(0, 120))
    }
  } finally {
    rmSync(runDir, { recursive: true, force: true })
  }

  finish()
}

function finish() {
  const failed = results.filter((r) => !r.ok)
  console.log(`\n结论：${failed.length === 0 ? '全部通过' : `${failed.length} 项失败`}（共 ${results.length} 项）`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('自检脚本异常:', e)
  process.exit(1)
})
