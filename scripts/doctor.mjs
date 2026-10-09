#!/usr/bin/env node
/**
 * doctor 环境自检（BE-02 / §12.2，M0 雏形）：
 * 逐项检查 状态/实测值/修复指引。
 * - --json   供启动器消费
 * - --quiet  仅退出码
 * 退出码：0 全绿 / 2 有可继续告警 / 1 有阻断。
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const quiet = args.includes('--quiet')

/** 异步执行子进程（不用 spawnSync：部分受限环境会 EBUSY） */
function run(cmd, argv, opts = {}) {
  return new Promise((resolveRun) => {
    let out = ''
    let err = ''
    let child
    try {
      child = spawn(cmd, argv, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (e) {
      resolveRun({ status: null, out, err: String(e), error: e })
      return
    }
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {}
      resolveRun({ status: null, out, err, timedOut: true })
    }, opts.timeoutMs ?? 20000)
    child.stdout?.on('data', (d) => (out += d))
    child.stderr?.on('data', (d) => (err += d))
    child.on('error', (e) => {
      clearTimeout(timer)
      resolveRun({ status: null, out, err, error: e })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolveRun({ status: code, out, err })
    })
  })
}

const ROOT = resolve(process.env['PAPER_AGENT_ROOT'] ?? process.cwd())
const AGH_ROOT = process.env['PAPER_AGENT_AGH_ROOT'] ?? 'D:/agnes-harness-main'
const AGH_CLI = resolve(AGH_ROOT, 'packages/cli/dist/local/agnes.mjs')
const BFF_PORT = Number(process.env['PAPER_AGENT_PORT'] ?? 8787)

/** @type {Array<{id:string, name:string, status:'ok'|'warn'|'fail', value:string, hint?:string, blocking:boolean}>} */
const checks = []

function add(id, name, status, value, hint, blocking = false) {
  checks.push({ id, name, status, value, hint, blocking })
}

async function main() {
  // 1. Node 版本（≥24.10，与 AGH 同生态）
  const nodeMajor = Number(process.versions.node.split('.')[0])
  const nodeOk = nodeMajor >= 24
  add(
    'node',
    'Node.js 版本（需 ≥ 24）',
    nodeOk ? 'ok' : 'fail',
    process.versions.node,
    nodeOk ? undefined : '请安装 Node.js 24+ 并使其位于 PATH 最前（本项目与 AGH 同生态）。',
    !nodeOk,
  )

  // 2. Python（≥3.10，内核运行时）：自动探测多个候选
  const pyCandidates = [
    process.env['PAPER_AGENT_PYTHON'],
    'python',
    'python3',
    'py',
    'C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe',
  ].filter(Boolean)
  let py = pyCandidates[0]
  let pyProbe = { status: null, out: '', err: '' }
  for (const candidate of pyCandidates) {
    const r = await run(candidate, ['-c', 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'], { timeoutMs: 20000 })
    if (r.status === 0) {
      py = candidate
      pyProbe = r
      break
    }
    if (candidate === pyCandidates[0]) pyProbe = r
  }
  if (pyProbe.status === 0) {
    const ver = pyProbe.out.trim()
    const [maj, min] = ver.split('.').map(Number)
    const ok = maj > 3 || (maj === 3 && min >= 10)
    add('python', 'Python 版本（需 ≥ 3.10）', ok ? 'ok' : 'fail', `${py} → ${ver}`, ok ? undefined : '请安装 Python 3.10+，或设置 PAPER_AGENT_PYTHON 指向可用解释器。', !ok)
  } else {
    add('python', 'Python 解释器', 'fail', py, `未找到可用 Python（已尝试：${pyCandidates.join(' / ')}）。请安装 Python 3.10+ 或设置 PAPER_AGENT_PYTHON。`, true)
  }

  // 3. 项目根与内核可导入
  const kernelDir = resolve(ROOT, 'kernel/sciret_kernel/__main__.py')
  add('kernel', '领域内核存在', existsSync(kernelDir) ? 'ok' : 'warn', kernelDir, existsSync(kernelDir) ? undefined : '内核尚未就位（M2 里程碑交付），主线暂不可运行。')
  if (existsSync(kernelDir) && pyProbe.status === 0) {
    const k = await run(py, ['-m', 'sciret_kernel', 'ping', '--run-dir', resolve(ROOT, 'runs/.doctor-probe'), '--args-json', '{}'], {
      cwd: resolve(ROOT, 'kernel'),
      timeoutMs: 20000,
    })
    const okRun = k.status === 0 && k.out.includes('"ok": true')
    add('kernel-run', '内核可执行（ping）', okRun ? 'ok' : 'fail', okRun ? 'ping ok' : `退出码 ${k.status}: ${(k.err || k.out || '').slice(0, 200)}`, okRun ? undefined : '内核自检失败，请查看输出排错。', false)
  }

  // 4. 运行目录可写
  const runsDir = resolve(ROOT, 'runs')
  let writable = false
  try {
    const { mkdirSync, writeFileSync, rmSync } = await import('node:fs')
    mkdirSync(runsDir, { recursive: true })
    writeFileSync(resolve(runsDir, '.doctor-write-probe'), 'ok')
    rmSync(resolve(runsDir, '.doctor-write-probe'))
    writable = true
  } catch {
    writable = false
  }
  add('runs', '运行目录可写', writable ? 'ok' : 'fail', runsDir, writable ? undefined : '请检查目录权限或更换 PAPER_AGENT_ROOT。', !writable)

  // 5. AGH 仓库与构建产物
  const cliExists = existsSync(AGH_CLI)
  add('agh', 'AGH 仓库与构建产物', cliExists ? 'ok' : 'warn', AGH_CLI, cliExists ? undefined : '未找到 AGH 构建产物。请设置 PAPER_AGENT_AGH_ROOT，或在 AGH 仓库执行构建（详见 AGH install 文档）。AGH 缺失时任务无法执行，但 BFF 可启动。')

  // 6. AGH daemon 运行中（discovery/owner 记录 + 进程存活）
  if (cliExists) {
    const probe = await run(process.execPath, [AGH_CLI, 'daemon', 'status'], { timeoutMs: 25000 })
    const out = `${probe.out}${probe.err}`
    const running = probe.status === 0 && /"running"\s*:\s*true/.test(out)
    add(
      'daemon',
      'AGH daemon 状态',
      running ? 'ok' : 'warn',
      running ? out.trim().slice(0, 200) : '未运行',
      running ? undefined : `执行: node "${AGH_CLI}" daemon start 启动 AGH 后台（首次使用请在 AGH Web 完成模型配置）。`,
      false,
    )
  }

  // 7. BFF 端口可用
  const portFree = await checkPortFree(BFF_PORT)
  add('port', `BFF 端口 ${BFF_PORT}`, portFree ? 'ok' : 'warn', portFree ? '可用' : '被占用', portFree ? undefined : '端口被占用：设置 PAPER_AGENT_PORT 换端口，或释放该端口。', false)

  // 8. sciret 插件是否已加载（AGH 扩展注册表）
  if (cliExists) {
    const ext = await run(process.execPath, [AGH_CLI, 'doctor', 'extensions'], { timeoutMs: 30000 })
    const out = `${ext.out}${ext.err}`
    const loaded = /paper-agent\/sciret|sciret/.test(out)
    add(
      'plugin',
      'sciret 插件（AGH 扩展）',
      loaded ? 'ok' : 'warn',
      loaded ? '已加载' : '未加载',
      loaded ? undefined : '安装指引：AGH 插件管理中对 plugin/sciret 执行 install → trust → enable（见 README「插件安装」章节）。未安装时 sciret_* 工具在会话中不可用。',
      false,
    )
  }

  // 汇总
  const hasFail = checks.some((c) => c.status === 'fail')
  const exitCode = hasFail ? 1 : checks.some((c) => c.status === 'warn') ? 2 : 0
  if (!quiet) {
    if (asJson) {
      process.stdout.write(JSON.stringify({ exitCode, checks }, null, 2) + '\n')
    } else {
      for (const c of checks) {
        const icon = c.status === 'ok' ? '✓' : c.status === 'warn' ? '!' : '×'
        process.stdout.write(`[${icon}] ${c.name}: ${c.value}\n`)
        if (c.hint) process.stdout.write(`      修复指引: ${c.hint}\n`)
      }
      process.stdout.write(`\n结论: ${exitCode === 0 ? '全绿' : exitCode === 2 ? '有告警（可继续）' : '存在阻断项'}（退出码 ${exitCode}）\n`)
    }
  }
  process.exit(exitCode)
}

function checkPortFree(port) {
  return new Promise((resolveFree) => {
    const srv = createServer()
    srv.once('error', () => resolveFree(false))
    srv.once('listening', () => srv.close(() => resolveFree(true)))
    srv.listen(port, '127.0.0.1')
  })
}

main().catch((e) => {
  process.stderr.write(`doctor 自身失败: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})
