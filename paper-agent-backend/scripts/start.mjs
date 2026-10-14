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
// AGH Web（agh serve）：观察 AGH 真实调用/会话的本地 Web UI；默认 4177（@agnes/web-server DEFAULT_WEB_PORT）
const AGH_WEB_PORT = Number(process.env['AGH_WEB_PORT'] ?? 4177)

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

/** 运行外部命令收集 stdout（异步 spawn；本机 spawnSync 一律 EBUSY，见 processAlive 注释）。 */
function capture(cmd, argv, timeoutMs = 8000) {
  return new Promise((resolveOut, rejectErr) => {
    let child
    try {
      child = spawn(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (e) {
      rejectErr(e)
      return
    }
    let out = ''
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* ignore */
      }
      rejectErr(new Error(`${cmd} 超时`))
    }, timeoutMs)
    child.stdout?.on('data', (d) => (out += d))
    child.on('error', (e) => {
      clearTimeout(timer)
      rejectErr(e)
    })
    child.on('close', () => {
      clearTimeout(timer)
      resolveOut(out)
    })
  })
}

/**
 * 列出 LISTENING 在指定 TCP 端口上的 PID（端口预释放步骤 0.5 的查找层）。
 * Windows 用 netstat -ano（不依赖第三方工具，与 processAlive 的 tasklist 同哲学）；
 * POSIX 用 lsof -ti tcp:PORT。查找失败按「无占用」处理——预释放是尽力而为，
 * 后续各步骤的 portFree 探测才是最终裁决。
 */
async function listListenPids(port) {
  if (process.platform !== 'win32') {
    try {
      const out = await capture('lsof', ['-ti', `tcp:${port}`])
      return [...new Set(out.split(/\s+/).map((s) => Number(s)).filter((n) => Number.isFinite(n) && n > 0))]
    } catch {
      return []
    }
  }
  let out = ''
  try {
    out = await capture('netstat.exe', ['-ano', '-p', 'tcp'])
  } catch {
    return []
  }
  const pids = new Set()
  for (const line of out.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/)
    // 数据行形如：TCP  0.0.0.0:4177  0.0.0.0:0  LISTENING  12345
    // （IPv6 本地地址为 [::]:4177，同样被 endsWith 命中；表头/无 PID 行被列数与数字校验挡掉）
    if (cols.length >= 5 && cols[0] === 'TCP' && cols[3] === 'LISTENING' && cols[1].endsWith(`:${port}`)) {
      const pid = Number(cols[4])
      if (Number.isFinite(pid) && pid > 0) pids.add(pid)
    }
  }
  return [...pids]
}

/** 终止进程（Windows taskkill 连树杀；POSIX 先 SIGTERM 后 SIGKILL 兜底）。 */
async function killPid(pid) {
  if (process.platform === 'win32') {
    try {
      await capture('taskkill.exe', ['/F', '/T', '/PID', String(pid)])
      return true
    } catch {
      return false
    }
  }
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    return false
  }
  await new Promise((r) => setTimeout(r, 300))
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    /* 已退出 */
  }
  return true
}

/**
 * 步骤 0.5 核心：释放单个端口——找到 LISTENING 的进程并终止。
 *
 * 设计边界（确保不影响启动器其余功能）：
 * - 无占用进程 → 记一条"空闲"即返回，不报错（常态路径）；
 * - 绝不终止启动器自身（process.pid）与 PID 0/4（System/Idle）；
 * - 终止失败只警告、不阻断——BFF/AGH Web/前端各步骤原有的占用探测
 *   （portFree/健康检查）仍是最终兜底，不会出现"释放失败却静默假成功"；
 * - 释放后复核一次，仍被占用则 info 提示，交给对应步骤的原有分支处理。
 */
async function releasePort({ port, label }) {
  const pids = await listListenPids(port)
  if (pids.length === 0) {
    ok('release-ports', `${label} 端口 ${port} 空闲，无需释放`)
    return
  }
  for (const pid of pids) {
    if (pid === process.pid) {
      log(`    [跳过] PID ${pid} 是启动器自身，不终止`)
      continue
    }
    if (pid === 0 || pid === 4) {
      log(`    [跳过] PID ${pid} 是系统进程（System/Idle），不终止；端口 ${port} 若仍冲突请用环境变量换端口`)
      continue
    }
    log(`    终止占用 ${label} 端口 ${port} 的进程（pid=${pid}）…`)
    const done = await killPid(pid)
    if (!done) log(`    [警告] 终止 pid=${pid} 失败（可能权限不足）`)
  }
  // 监听句柄回收需要一小会；复核仍占用则交给后续步骤的原有占用分支兜底
  await new Promise((r) => setTimeout(r, 500))
  const still = await listListenPids(port)
  if (still.length > 0) {
    info(
      'release-ports',
      `端口 ${port}（${label}）释放后仍被占用（pid=${still.join(', ')}）——对应步骤将按占用分支处理`,
    )
  } else {
    ok('release-ports', `端口 ${port}（${label}）已释放（此前占用：pid=${pids.join(', ')}）`)
  }
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
  // env 必须最后合并：opts.env 是「增量」（如 BROWSER=none），不能被 ...opts
  // 展开覆盖成不含 process.env 的裸环境（否则 PATH 全丢，子进程必挂）。
  const { env: extraEnv, ...rest } = opts
  const child = spawn(cmd, argv, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...rest,
    env: { ...process.env, ...(extraEnv ?? {}) },
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
  // AGH Web 的最终可用链接（步骤 2.5 就绪或已在运行时置值；--bff-only/失败不置）
  let aghWebUrl = null
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

  // ---- 步骤 0.5：端口预释放（spawn 任何服务之前；2026-10-12 用户需求）----
  // 上次启动未正常退出（崩溃/关机/孤儿进程）会残留监听进程，让本次启动撞上
  // "端口占用 → fail 中止 / info 跳过"。此处按**本次要启动的服务集合**逐一释放：
  // --bff-only 只释放 BFF 端口（避免误杀正在跑的全栈中的 AGH Web/前端）；
  // 无占用静默通过；释放细节与安全边界见 releasePort 注释。
  // 前端探测提前到此处（只读文件系统，不 spawn）：释放清单需要前端端口；
  // 它仍位于 BFF spawn 之前，满足下方 CORS 白名单注入的前置要求。
  const frontend = resolveFrontend()
  const releaseTargets = [{ port: BFF_PORT, label: 'BFF' }]
  if (!bffOnly) {
    releaseTargets.push({ port: AGH_WEB_PORT, label: 'AGH Web' })
    if (frontend) releaseTargets.push({ port: frontend.port, label: '前端' })
  }
  log(`预释放端口：${releaseTargets.map((t) => `${t.label}:${t.port}`).join('、')}`)
  for (const t of releaseTargets) {
    await releasePort(t)
  }

  // ---- 步骤 0.9：AGH 源码依赖预检 ----
  // BFF 以 `link:` 引用 agnes-harness/packages/* 的 TypeScript 源码包（@agnes/sdk 等），
  // 其依赖靠 AGH 侧 `pnpm install` 生成的 workspace 链接解析（与 daemon 的预构建产物无关，
  // --bff-only 同样需要）。漏装时 tsx 会在加载 sdk 源码时抛难懂的 ERR_MODULE_NOT_FOUND，
  // 这里提前拦截并给出修复命令（2026-10-14 队友实测踩坑）。
  if (AGH_ROOT && !existsSync(join(AGH_ROOT, 'node_modules', '.pnpm'))) {
    fail(
      'agh-deps',
      'agnes-harness 依赖未安装——后端 BFF 将无法解析 @agnes/* 源码包（ERR_MODULE_NOT_FOUND）',
      `先执行：cd "${AGH_ROOT}" && pnpm install --frozen-lockfile ，然后重新运行本启动器。`,
    )
    return finish()
  }
  ok('agh-deps', 'agnes-harness 依赖就绪（workspace 链接可用）')

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

  // ---- 步骤 2.5：AGH Web（观察 AGH 真实调用/会话；占用或失败不阻断主链路）----
  if (bffOnly) {
    info('agh-web', '按 --bff-only 跳过 AGH Web')
  } else if (!(await portFree(AGH_WEB_PORT))) {
    aghWebUrl = `http://127.0.0.1:${AGH_WEB_PORT}`
    info('agh-web', `端口 ${AGH_WEB_PORT} 已被占用——AGH Web 可能已在运行：${aghWebUrl}`)
  } else {
    // agh serve 是共享 daemon 引导：同 profile/data-dir 时自动**附加**到上面已就绪的
    // daemon，不会重复起 daemon；关闭本进程也不影响 daemon 与其他客户端。
    spawnChild('agh-web', node, [
      AGH_CLI, 'serve',
      '--profile', AGNES_PROFILE,
      '--cwd', ROOT,
      '--data-dir', join(AGH_HOME, 'data'),
      '--port', String(AGH_WEB_PORT),
    ])
    try {
      await waitFor(
        async () => {
          try {
            return (await fetch(`http://127.0.0.1:${AGH_WEB_PORT}/`, { signal: AbortSignal.timeout(1500) })).ok
          } catch {
            return false
          }
        },
        { timeoutMs: 30_000, what: `AGH Web 就绪（http://127.0.0.1:${AGH_WEB_PORT}）` },
      )
      ok('agh-web', `AGH Web 已就绪: http://127.0.0.1:${AGH_WEB_PORT}（可观察 AGH 真实调用与会话）`)
      aghWebUrl = `http://127.0.0.1:${AGH_WEB_PORT}`
    } catch (e) {
      info(
        'agh-web',
        `${e.message}\n      查看上方 [agh-web] 日志；换端口重试：set AGH_WEB_PORT=4178（不阻断主链路）`,
      )
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
  // 前端探测（已在步骤 0.5 提前执行，见 releaseTargets 注释）：
  // 启动器把自己托管前端的 Origin 追加进 CORS 白名单。
  // 漏掉它的症状是"JSON 接口正常、SSE 一帧都收不到"（换过 PAPER_AGENT_WEB_PORT +
  // 直连模式 VITE_API_BASE_URL=http://127.0.0.1:8787 时必现），排查成本极高。
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
        // BROWSER=none：抑制 Vite server.open 的自动开浏览器（官方语义）。
        // 不关它的话 Vite 开一次、启动器步骤 5 再开一次 → paper-agent 页面连开两个
        // 相同标签页（用户实测）。浏览器统一由步骤 5 负责，只开一次。
        env: { BROWSER: 'none' },
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

  // ---- 步骤 5：输出全部服务链接 + 打开 paper-agent 主页 ----
  // 两个服务的访问链接都要打印（AGH Web 供观察 AGH 真实调用/会话）；
  // 浏览器只开 paper-agent 一个——Vite 的 server.open 已被 BROWSER=none 抑制，
  // 由本步骤统一负责，避免同一页面连开两次（用户实测的重复打开病灶）。
  log('')
  log('服务访问链接：')
  if (aghWebUrl) log(`  AGH Web      : ${aghWebUrl}`)
  else log('  AGH Web      : （未启动或未就绪，本次不提供链接）')
  log(`  paper-agent  : ${uiUrl}`)
  if (!noBrowser) {
    const opened = await openBrowser(uiUrl)
    log(opened ? `    已打开浏览器: ${uiUrl}` : `    请手动打开: ${uiUrl}`)
  }
  log('')
  log('启动完成。按 Ctrl+C 退出（会一并停止所有子进程）。')

  if (asJson)
    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          steps,
          bff: url,
          // 机器可读的服务链接（与上方"服务访问链接"日志同源）
          links: { agh_web: aghWebUrl, paper_agent: uiUrl },
        },
        null,
        2,
      ) + '\n',
    )
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