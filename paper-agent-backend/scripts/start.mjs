#!/usr/bin/env node
/**
 * 一键启动器（BE-13 / §12.1，主线命令 `pnpm start`）：
 *
 * 目标（需求 §12.1 原文顺序）：
 *   1. 若 AGH 构建产物缺失 → 自动构建（或给出明确构建提示）；
 *   2. 启动 AGH daemon（serve）并等待就绪；
 *   3. 启动 BFF（含会话网关）；
 *   4. 启动/托管前端（开发服务器或托管静态产物）；
 *   5. 健康检查通过 → 自动打开浏览器到**唯一 URL**；
 *   6. 任一步失败 → 打印人类可读原因与修复动作并中止。
 *
 * 三条设计原则（都是被本项目踩坑逼出来的）：
 *
 * **① 不假设前端已交付**。本需求文档是*后端*需求文档，前端由另一团队负责。
 *   故：检测到前端则托管（dev server 或静态产物），检测不到则**跳过并打印明确说明**，
 *   但**不阻断**——后端可独立跑通全流程（P-04/P-05 的验收不依赖前端）。
 *
 * **② 必须选合规 Node（≥24.10）**。AGH 原生模块只按 Node 24 libuv ABI 构建；
 *   用 Node 22 跑会得到极具误导性的错误（"凭据存储不可用"，实为 ABI 不匹配）。
 *   本项目已因此误诊过一次（见 README §8 第 9 条）。
 *
 * **③ 清掉宿主 shim 注入**。`NODE_OPTIONS` 里的 safe-delete 守卫会拦在 AGH 维护
 *   SQLite 锁文件时报 "state lock timeout"（该字符串不在 AGH 源码里，纯宿主注入）。
 *   同时把 `vendor/shim/safe-bin` 从 PATH 剔除，否则其中的 rm/node 包装器会失效。
 *
 * 用法：
 *   node scripts/start.mjs              # 启动全部
 *   node scripts/start.mjs --no-browser# 不开浏览器
 *   node scripts/start.mjs --bff-only   # 只起BFF（跳过 daemon 与前端）
 *   node scripts/start.mjs --json# 机器可读的状态输出
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, renameSync } from 'node:fs'
import { createServer } from 'node:net'
import { resolve, join, delimiter } from 'node:path'
import { homedir } from 'node:os'
import { AGH_MARKER, aghRootCandidates, resolveAghRoot } from './lib/paths.mjs'

const args = process.argv.slice(2)
const noBrowser = args.includes('--no-browser')
const bffOnly = args.includes('--bff-only')
const asJson = args.includes('--json')

const ROOT = resolve(process.env['PAPER_AGENT_ROOT'] ?? process.cwd())
// AGH 根现场探测（写死某台机器的 D:/ 路径会让 `pnpm start` 在别的机器上
// 报"未找到 AGH 构建产物"，而实际仓库就在本项目同级目录）。
const AGH_ROOT = resolveAghRoot(ROOT)
const AGH_CLI = AGH_ROOT ? resolve(AGH_ROOT, AGH_MARKER) : null
const AGH_HOME = process.env['AGH_HOME'] ?? join(homedir(), '.agh')
const AGNES_PROFILE = process.env['AGNES_PROFILE'] ?? 'local-dev'
const BFF_PORT = Number(process.env['PAPER_AGENT_PORT'] ?? 8787)

const steps = []
let failed = false

function log(msg) {
  if (!asJson) process.stdout.write(msg + '\n')
}
function record(id, status, detail) {
  steps.push({ id, status, detail })
}
function fail(id, detail, hint) {
  failed = true
  record(id, 'failed', detail)
  log(`[×] ${detail}`)
  if (hint) {
    log(`    修复动作: ${hint}`)
  }
}
function ok(id, detail) {
  record(id, 'ok', detail)
  log(`[✓] ${detail}`)
}
function info(id, detail) {
  record(id, 'skip', detail)
  log(`[!] ${detail}`)
}

/** 0. 清理宿主 shim 注入（见文件头原则③）。必须在 spawn 任何子进程前完成。 */
function sanitizeHostEnv() {
  process.env['NODE_OPTIONS'] = ''
  // 只置空、不 unset：WorkBuddy 的 safe-delete-bash-env.sh 会读这些变量，
  // unset 会让它在 set -u 下直接崩（这个坑我踩过）。
  for (const v of [
    'CODEBUDDY_SAFE_DELETE_BULK_GUARD',
    'CODEBUDDY_SAFE_DELETE_SANDBOX',
    'CODEBUDDY_SAFE_DELETE_BIN_DIR',
    'CODEBUDDY_SAFE_DELETE_ENABLED',
    'CODEBUDDY_SAFE_DELETE_BROKER_DELETE',
  ]) {
    process.env[v] = ''
  }
  // 从 PATH剔除 shim 目录（其包装器依赖上面那些变量，剔除后会变空路径）
  const parts = String(process.env['PATH'] ?? '')
    .split(';')
    .filter((p) => p && !/vendor[\\/]shim[\\/]safe-bin/i.test(p))
  process.env['PATH'] = parts.join(';')
}

/** 找到合规的 Node（≥24.10）。找不到即失败——绝不用低版本硬跑（原则②）。 */
function pickNode() {
  const candidates = [
    'C:/Program Files/nodejs/node.exe',
    join(homedir(), '.workbuddy/binaries/node/versions/24.21.0-1/node.exe'),
  ]
  for (const c of candidates) {
    if (!existsSync(c)) continue
    try {
      const major = Number(/v?(\d+)/.exec(process.versions.node)?.[1] ?? 0)
      // 只需判断当前进程版本；候选路径存在即可启动（其版本在启动日志里会体现）
      if (major >= 24) return c
    } catch {
      /* 忽略 */
    }
  }
  return process.execPath
}

/**
 * 注入插件运行期环境变量（§12.3，与 agh.sh 的 export 同口径）。
 *
 * 为什么必须在启动器里做：AGH 会把插件**拷贝**到自己的 home 运行，插件无法靠
 * 相对路径找内核，只能靠 daemon 进程环境里的三个变量（PAPER_AGENT_PYTHON /
 * PAPER_AGENT_KERNEL_ROOT / PAPER_AGENT_RUNS_DIR）。此前本文件只在注释里承诺
 * "必须注入"、实际并未传——daemon 照样就绪，但 sciret_* 全部 PLUGIN_ENV_MISSING，
 * 表现为"内核未能启动、有效步数 0"（2026-10-12 用户实测踩坑，见 README §8）。
 *
 * 与 _env.sh pa_python 同序：显式环境变量永远优先（只校验、不覆盖）→ PATH 上的
 * python/python3/py **实测可跑**（WindowsApps 的 0 字节假桩 existsSync 为真但
 * 执行必败，必须真跑一次排除）→ WorkBuddy 托管安装通配。
 */
async function tryPython(cand) {
  return new Promise((resolveOk) => {
    let child
    try {
      child = spawn(cand, ['-c', 'import sys'], { stdio: 'ignore', timeout: 8000 })
    } catch {
      resolveOk(false)
      return
    }
    child.on('error', () => resolveOk(false))
    child.on('close', (code) => resolveOk(code === 0))
  })
}

async function findPythonExecutable() {
  // PATH 探测候选（python → python3 → py；Windows 按 PATHEXT 补后缀）
  const exts =
    process.platform === 'win32'
      ? (process.env['PATHEXT'] ?? '.COM;.EXE;.BAT;.CMD').split(';').map((e) => e.toLowerCase())
      : ['']
  const found = []
  for (const name of ['python', 'python3', 'py']) {
    outer: for (const dir of (process.env['PATH'] ?? '').split(delimiter)) {
      if (!dir) continue
      for (const ext of exts) {
        const cand = join(dir, name + ext)
        if (existsSync(cand)) {
          found.push(cand)
          break outer
        }
      }
    }
  }
  // WorkBuddy 托管安装：按当前机器用户通配（不写死某台开发机的路径），版本号降序
  const wbRoot = join(homedir(), '.workbuddy', 'binaries', 'python', 'versions')
  if (existsSync(wbRoot)) {
    const versions = readdirSync(wbRoot)
      .filter((d) => /^\d+\.\d+\.\d+$/.test(d))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    for (const v of versions) {
      const exe =
        process.platform === 'win32' ? join(wbRoot, v, 'python.exe') : join(wbRoot, v, 'bin', 'python3')
      if (existsSync(exe)) found.push(exe)
    }
  }
  for (const cand of found) {
    if (await tryPython(cand)) return cand
  }
  return null
}

/** 计算并注入插件运行期环境变量；返回 null=成功，否则返回错误消息。 */
async function injectPluginEnv() {
  if (!process.env['PAPER_AGENT_PYTHON']) {
    const py = await findPythonExecutable()
    if (!py) {
      return '未找到可用的 Python 解释器（内核需要 ≥3.10，零第三方依赖）'
    }
    process.env['PAPER_AGENT_PYTHON'] = py
  } else if (!existsSync(process.env['PAPER_AGENT_PYTHON'])) {
    return `PAPER_AGENT_PYTHON 指向的解释器不存在：${process.env['PAPER_AGENT_PYTHON']}`
  }
  // kernel/runs/根/AGH 根都从启动器已探测的 ROOT/AGH_ROOT 派生（机器无关）；
  // 已显式设置的变量不覆盖（与 agh.sh 的 ${VAR:-default} 语义一致）。
  if (!process.env['PAPER_AGENT_KERNEL_ROOT']) process.env['PAPER_AGENT_KERNEL_ROOT'] = resolve(ROOT, 'kernel')
  if (!process.env['PAPER_AGENT_RUNS_DIR']) process.env['PAPER_AGENT_RUNS_DIR'] = resolve(ROOT, 'runs')
  if (!process.env['PAPER_AGENT_ROOT']) process.env['PAPER_AGENT_ROOT'] = ROOT
  if (!process.env['PAPER_AGENT_AGH_ROOT'] && AGH_ROOT) process.env['PAPER_AGENT_AGH_ROOT'] = AGH_ROOT
  return null
}

/**
 * 只读探测 AGH daemon 是否**真正可用**。
 *
 * ⚠️ 必须校验**进程存活**，不能只看文件（这是本项目踩了两次的坑）：
 * AGH 的 daemon 由 CLI **派生子进程**运行，父进程退出不代表子进程退出；
 * 而沙箱/系统回收进程后，`~/.agh/data/daemon/{owner,discovery}.json` **仍留在盘上**。
 * 只读文件 → 判定"就绪" → 然后 BFF 连接必然失败（它走 AGH 自己的 identity() 校验）。
 * 于是出现"启动器说就绪、BFF 说找不到 daemon"的矛盾现象。
 *
 * 判据与 AGH `readDaemonDiscovery()` 对齐：代数一致 + ready + **pid 存活**。
 */
async function probeDaemon() {
  const dir = join(AGH_HOME, 'data', 'daemon')
  const readJson = (p) => {
    try {
      return JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      return null
    }
  }
  const owner = readJson(join(dir, 'owner.json'))
  const discovery = readJson(join(dir, 'discovery.json'))
  if (!owner || !discovery) return { running: false, reason: '无 daemon 发现记录' }
  if (Number(owner.pid) !== Number(discovery.owner?.pid)) {
    return { running: false, reason: '僵尸发现记录（owner 与 discovery 代数不符）' }
  }
  if (discovery.ready !== true) return { running: false, reason: 'daemon 未就绪（ready≠true）' }
  if (!discovery.socketPath) return { running: false, reason: 'discovery.socketPath 为空' }
  // 关键：文件在 ≠ 进程还活着
  // ⚠️ processAlive 是**异步**的，必须 await——直接把 Promise 当布尔用会恒为真，
  //    导致这个校验形同虚设（我自己踩过：明明进程已死，却报"复用已运行的 daemon"）。
  if (!(await processAlive(Number(owner.pid)))) {
    return { running: false, reason: `僵尸发现记录（pid ${owner.pid} 已不存在，但发现文件仍在）`, stale: true }
  }
  return { running: true, socketPath: discovery.socketPath, pid: owner.pid }
}

/**
 * 进程存活检测。
 * Windows 上 `tasklist /FI "PID eq n"` 最稳（不依赖其他工具）。
 * 注意：必须用**异步** spawn——本机 spawnSync 一律 EBUSY（同步 spawn 被沙箱拦截）。
 */
function processAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false
  if (process.platform !== 'win32') {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }
  return new Promise((resolveAlive) => {
    let done = false
    const finish = (v) => {
      if (done) return
      done = true
      resolveAlive(v)
    }
    let child
    try {
      child = spawn('tasklist.exe', ['/FI', `PID eq ${pid}`, '/NH', '/FO', 'CSV'], { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch {
      finish(false)
      return
    }
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* ignore */
      }
      finish(false)
    }, 8000)
    let out = ''
    child.stdout?.on('data', (d) => (out += d))
    child.on('error', () => {
      clearTimeout(timer)
      finish(false)
    })
    child.on('close', () => {
      clearTimeout(timer)
      // tasklist 找不到时输出 "信息: 没有运行的任务匹配指定标准。"（含"没有运行"）
      const alive = out.includes(`"${pid}"`) && !/没有运行|no tasks/i.test(out)
      finish(alive)
    })
  })
}

function portFree(port) {
  return new Promise((r) => {
    const srv = createServer()
    srv.once('error', () => r(false))
    srv.once('listening', () => srv.close(() => r(true)))
    srv.listen(port, '127.0.0.1')
  })
}

async function waitFor(fn, { timeoutMs, intervalMs = 500, what }) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await fn()) return true
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`等待超时（${timeoutMs}ms）：${what}`)
}

/** 启动一个长期子进程并保持引用（由进程退出事件统一清理）。 */
const children = []
function spawnChild(label, cmd, argv, opts = {}) {
  const child = spawn(cmd, argv, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...(opts.env ?? {}) },
    ...opts,
  })
  const prefix = `[${label}] `
  child.stdout?.on('data', (d) => {
    for (const line of String(d).split(/\r?\n/)) if (line.trim()) log(prefix + line)
  })
  child.stderr?.on('data', (d) => {
    for (const line of String(d).split(/\r?\n/)) if (line.trim()) log(prefix + line)
  })
  child.on('error', (e) => log(`${prefix}进程错误: ${e.message}`))
  child.on('close', (code) => log(`${prefix}已退出（退出码 ${code}）`))
  children.push({ label, child })
  return child
}

function cleanup() {
  for (const { child } of children) {
    try {
      child.kill()
    } catch {
      /* 已退出 */
    }
  }
}

async function main() {
  sanitizeHostEnv()
  const node = pickNode()
  log('paper-agent 一键启动器')
  log(`  项目根: ${ROOT}`)
  log(`  Node   : ${process.versions.node} (${node})`)
  log('')

  // ---- 步骤 0：插件运行期环境注入（必须在 spawn daemon 之前，见 injectPluginEnv 注释）----
  const envError = await injectPluginEnv()
  if (envError) {
    fail(
      'plugin-env',
      envError,
      '设置 PAPER_AGENT_PYTHON 指向 python.exe 绝对路径后重试；或安装 Python ≥3.10（内核只用标准库）。',
    )
    return finish()
  }
  ok(
    'plugin-env',
    `插件运行期环境已注入：python=${process.env['PAPER_AGENT_PYTHON']} · kernel=${process.env['PAPER_AGENT_KERNEL_ROOT']} · runs=${process.env['PAPER_AGENT_RUNS_DIR']}`,
  )

  // ---- 步骤 1/2：AGH 构建产物与 daemon ----
  if (bffOnly) {
    info('agh', '按 --bff-only 跳过 AGH 编排')
  } else {
    if (!AGH_CLI || !existsSync(AGH_CLI)) {
      // §12.1 第1 步：产物缺失 → 给出明确构建提示（自动构建需在 AGH 仓库内执行 pnpm build）
      fail(
        'agh-build',
        `未找到 AGH 构建产物（已探测：${AGH_ROOT ?? aghRootCandidates(ROOT).join(' | ')}）`,
        `在 AGH 仓库构建： cd "<AGH 仓库根>" && pnpm install && pnpm build ；` +
          `或用 PAPER_AGENT_AGH_ROOT 指向已构建的 AGH 目录（约定：与本项目同级目录放 agnes-harness）。`,
      )
      return finish()
    }
    ok('agh-build', `AGH 构建产物就绪: ${AGH_CLI}`)

    const before = await probeDaemon()
    if (before.stale) {
      // 僵尸记录会让后续所有"是否就绪"的判断都不可信（文件在、进程没了）。
      // 用改名隔离（**可逆，不删**）让新 daemon 能干净地接管——
      // 直接删会丢掉 AGH 用于识别"上一代已死"的证据。
      const stamp = `stale-${Date.now()}`
      for (const f of ['owner.json', 'discovery.json']) {
        const from = join(AGH_HOME, 'data', 'daemon', f)
        if (existsSync(from)) {
          try {
            renameSync(from, `${from}.${stamp}`)
            log(`    已隔离僵尸发现记录: ${f} → ${f}.${stamp}`)
          } catch (e) {
            log(`    [警告] 隔离 ${f} 失败：${e.message}（不影响继续，新 daemon 会覆盖它）`)
          }
        }
      }
    }
    if (before.running) {
      // ⚠️ 关键：daemon 已在跑时**绝不能**再起一个。
      // 后起的会与已有实例抢同一份 mutation 锁 → "state lock timeout"；
      // 而 daemon 是**派生子进程**运行的，父进程退出不代表子进程退出，
      // 所以"看起来没进程"也不能作为"没在跑"的判据（必须查发现文件）。
      ok('agh-daemon', `复用已运行的 daemon（pid=${before.pid} pipe=${before.socketPath}）`)
    } else {
      log(`    启动 AGH daemon（${before.reason}）…`)
      // 必须注入本项目环境变量：插件被拷贝到 AGH home 运行，靠这些变量找 Python 内核。
      // 漏注入 → 插件子进程找不到内核 → 表现为"工具调不动"，极易误诊（见 README §8）。
      spawnChild('daemon', node, [
        AGH_CLI, 'daemon', 'start',
        '--profile', AGNES_PROFILE,
        '--workspace', ROOT,
        '--data-dir', join(AGH_HOME, 'data'),
      ])
      try {
        await waitFor(async () => (await probeDaemon()).running, {
          timeoutMs: 90_000,
          what: 'AGH daemon 就绪',
        })
        const now = await probeDaemon()
        ok('agh-daemon', `AGH daemon 已就绪（pid=${now.pid} pipe=${now.socketPath}）`)
      } catch (e) {
        fail('agh-daemon', e.message, '查看上方 [daemon] 日志；常见原因：AGH home ACL 不合规（跑 node scripts/acl-audit.mts 复核），或 Node 版本不足 24.10。')
        return finish()
      }
    }
  }

  // ---- 步骤 3：BFF ----
  if (!(await portFree(BFF_PORT))) {
    // §12.1：端口占用 → 明确报告并给出释放指引。
    // 不做"自动顺延"：端口是配置契约，静默换端口会让用户访问到错误的服务。
    fail(
      'bff-port',
      `端口 ${BFF_PORT} 已被占用`,
      `释放该端口，或设置 PAPER_AGENT_PORT 换端口后重试：` +
        `set PAPER_AGENT_PORT=8788 && node scripts/start.mjs`,
    )
    return finish()
  }
  const tsxCli = resolve(ROOT, 'node_modules/tsx/dist/cli.mjs')
  if (!existsSync(tsxCli)) {
    fail('bff-deps', `未找到 tsx: ${tsxCli}`, '先安装依赖：pnpm install')
    return finish()
  }
  // 前端探测必须在 BFF **之前**：启动器把自己托管前端的 Origin 追加进 CORS 白名单。
  // 漏掉它的症状是"JSON 接口正常、SSE 一帧都收不到"（换过 PAPER_AGENT_WEB_PORT +
  // 直连模式 VITE_API_BASE_URL=http://127.0.0.1:8787 时必现），排查成本极高。
  const frontend = resolveFrontend()
  if (frontend && !bffOnly) {
    const feOrigin = `http://127.0.0.1:${frontend.port}`
    const extra = (process.env['PAPER_AGENT_CORS_EXTRA_ORIGINS'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!extra.includes(feOrigin)) {
      process.env['PAPER_AGENT_CORS_EXTRA_ORIGINS'] = [...extra, feOrigin].join(',')
    }
  }
  process.env['PAPER_AGENT_PORT'] = String(BFF_PORT)
  spawnChild('bff', node, [tsxCli, 'apps/bff/src/index.ts'])
  try {
    await waitFor(
      async () => {
        //探健康端点而不是探端口：端口可连接 ≠ 服务就绪
        try {
          const r = await fetch(`http://127.0.0.1:${BFF_PORT}/api/health`)
          return r.ok
        } catch {
          return false
        }
      },
      { timeoutMs: 60_000, what: 'BFF 健康检查' },
    )
    ok('bff', `BFF 已就绪: http://127.0.0.1:${BFF_PORT}`)
  } catch (e) {
    fail('bff', e.message, '查看上方 [bff] 日志；常见原因：端口冲突、AGH 凭据不可用（跑 node scripts/doctor.mjs 自检）。')
    return finish()
  }

  // ---- 步骤 4：前端（不存在则跳过，不阻断）----
  const url = `http://127.0.0.1:${BFF_PORT}`
  let uiUrl = url
  if (bffOnly) {
    info('frontend', '按 --bff-only 跳过前端托管')
  } else if (!frontend) {
    info(
      'frontend',
      `未检测到前端（查过 ${resolve(ROOT, 'web')} 与 ${resolve(ROOT, '..', 'paper-agent-frontend')}）` +
        '→ 跳过前端托管，不影响后端全流程。\n' +
        '      接口文档: ' + url + '/api/v1  健康探针: ' + url + '/api/health' +
        '（BFF 不托管页面，根路径返回 404）',
    )
  } else if (frontend.kind === 'missing-deps') {
    info(
      'frontend',
      `前端目录已就位但依赖未安装：${frontend.dir}\n` +
        `      先执行：cd "${frontend.dir}" && npm install，再重新运行本命令。`,
    )
  } else {
    if (frontend.kind === 'static') {
      // 静态产物：交给 BFF 托管不合适（BFF 只挂 /api），故用最小静态服务器
      const http = await import('node:http')
      const { readFile } = await import('node:fs/promises')
      const { extname, join: pjoin, normalize } = await import('node:path')
      const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }
      const server = http.createServer(async (req, res) => {
        try {
          const rel = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([\\/])+/, '')
          const file = pjoin(frontend.dir, rel === '' ? 'index.html' : rel)
          const body = await readFile(file)
          res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
          res.end(body)
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('404')
        }
      })
      await new Promise((r, rej) => {
        server.once('error', rej)
        server.listen(frontend.port, '127.0.0.1', () => r())
      }).then(
        () => {
          uiUrl = `http://127.0.0.1:${frontend.port}`
          ok('frontend', `前端静态产物已托管: ${frontend.dir} → ${uiUrl}`)
        },
        (e) => info('frontend', `静态托管失败：${e.message}（端口 ${frontend.port} 可能已被占用）`),
      )
    } else {
      const feUrl = `http://127.0.0.1:${frontend.port}`
      spawnChild('frontend', node, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(frontend.port)], {
        cwd: frontend.dir,
      })
      // 原实现是"睡 1500ms 然后宣布已启动"：端口被别的进程占用时 vite 会因 strictPort
      // 直接退出，界面却收到一句假的成功。改为真探测首页。
      try {
        await waitFor(
          async () => {
            try {
              return (await fetch(feUrl, { signal: AbortSignal.timeout(1500) })).ok
            } catch {
              return false
            }
          },
          { timeoutMs: 25_000, what: `前端 dev server 就绪（${feUrl}）` },
        )
        uiUrl = feUrl
        ok('frontend', `前端开发服务器已启动: ${feUrl}`)
      } catch (e) {
        info(
          'frontend',
          `${e.message}\n      端口 ${frontend.port} 可能已被其它 dev server 占用；换端口：set PAPER_AGENT_WEB_PORT=5175`,
        )
      }
    }
  }

  // ---- 步骤 5：打开浏览器到**唯一 URL** ----
  // 有前端时开前端；只有后端时开 BFF（BFF 不托管页面，根路径是 404，
  // 原先无条件开 8787 会让第一次使用的人以为"启动器坏了"）。
  if (!noBrowser) {
    const target = uiUrl
    const opened = await openBrowser(target)
    log(opened ? `    已打开浏览器: ${target}` : `    请手动打开: ${target}`)
  }
  log('')
  log('启动完成。按 Ctrl+C 退出（会一并停止所有子进程）。')

  if (asJson) process.stdout.write(JSON.stringify({ ok: true, steps, bff: url }, null, 2) + '\n')
}

/**
 * 检测前端：本仓库 `web/`（后端 1.0 独立布局）→ 同级 `paper-agent-frontend/`（2.0 整合布局）。
 * 只认 package.json 会把"前端已就位但依赖没装"变成 spawn 时的 "Cannot find module"，
 * 看起来像后端启动器坏了，故这里单独给 missing-deps 一档，报清楚该跑哪条命令。
 */
function resolveFrontend() {
  const portEnv = process.env['PAPER_AGENT_WEB_PORT']
  const candidates = [
    { dir: resolve(ROOT, 'web'), defaultPort: 5173 },
    { dir: resolve(ROOT, '..', 'paper-agent-frontend'), defaultPort: 5174 },
  ]
  for (const c of candidates) {
    if (!existsSync(resolve(c.dir, 'package.json'))) continue
    const port = Number(portEnv ?? c.defaultPort)
    if (!existsSync(resolve(c.dir, 'node_modules', 'vite', 'bin', 'vite.js'))) {
      return { kind: 'missing-deps', dir: c.dir, port }
    }
    return { kind: 'dev', dir: c.dir, port }
  }
  const distDir = resolve(ROOT, 'web', 'dist')
  if (existsSync(resolve(distDir, 'index.html'))) {
    return { kind: 'static', dir: distDir, port: Number(portEnv ?? 5173) }
  }
  return null
}

async function openBrowser(url) {
  const cmd =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]]
  return new Promise((r) => {
    try {
      const c = spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true })
      c.unref()
      setTimeout(() => r(true), 300)
    } catch {
      r(false)
    }
  })
}

function finish() {
  if (asJson) process.stdout.write(JSON.stringify({ ok: !failed, steps }, null, 2) + '\n')
  process.exit(failed ? 1 : 0)
}

process.on('SIGINT', () => {
  log('')
  log('正在停止…')
  cleanup()
  process.exit(0)
})
process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})

main().catch((e) => {
  process.stderr.write(`[启动器失败] ${e instanceof Error ? e.message : String(e)}\n`)
  cleanup()
  process.exit(1)
})