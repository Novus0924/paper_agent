#!/usr/bin/env node
/**
 * doctor 环境自检（BE-02 / §12.2，M0 雏形）：
 * 逐项检查 状态/实测值/修复指引。
 * - --json   供启动器消费
 * - --quiet  仅退出码
 * 退出码：0 全绿 / 2 有可继续告警 / 1 有阻断。
 */

import { AGH_MARKER, aghRootCandidates, resolveAghRoot, workbuddyPythonPaths } from './lib/paths.mjs'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { homedir } from 'node:os'
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
// 同 start.mjs：AGH 根靠探测，不写死某台机器的路径
const AGH_ROOT = resolveAghRoot(ROOT)
const AGH_CLI = AGH_ROOT ? resolve(AGH_ROOT, AGH_MARKER) : null
const BFF_PORT = Number(process.env['PAPER_AGENT_PORT'] ?? 8787)
/** AGH home（发现文件与包锁都在此处）。提前定义：下方多处检查项都要用。 */
const AGH_HOME = process.env['AGH_HOME'] ?? join(homedir(), '.agh')
const AGNES_PROFILE = process.env['AGNES_PROFILE'] ?? 'local-dev'

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
    ...workbuddyPythonPaths(),
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
  const cliExists = Boolean(AGH_CLI) && existsSync(AGH_CLI)
  add(
    'agh',
    'AGH 仓库与构建产物',
    cliExists ? 'ok' : 'warn',
    AGH_CLI ?? `未探测到（已尝试：${aghRootCandidates(ROOT).join(' | ')}）`,
    cliExists
      ? undefined
      : '未找到 AGH 构建产物。请把 AGH 仓库放在与本项目同级目录并执行构建，或用 PAPER_AGENT_AGH_ROOT 指向已构建的 AGH 目录（详见 AGH install 文档）。' +
        // 实测订正：原写成"AGH 缺失时…但 BFF 可启动"。真正可缺的是 **daemon**（BFF 起来后
        // health 显示 degraded，建任务时再连）；AGH **构建产物**是 config 必需项，
        // 缺失时 loadConfig 直接 fail-fast，BFF 根本起不来。
        '注意：AGH 构建产物缺失时 BFF 会启动失败（config fail-fast）；只有 daemon 未运行才不影响启动（health 降级为 degraded）。',
  )

  // 6. AGH daemon 运行中（**零副作用**：只读发现文件，不执行任何 CLI）
  //
  // ⚠️ 不要用 `agnes.mjs daemon status` 判断——它会 ensureLocalBackend **自动拉起一个
  // 不带本项目环境变量**（PAPER_AGENT_PYTHON / KERNEL_ROOT / RUNS_DIR）的 daemon；
  // 之后用户/启动器启动的 serve 会复用这个 daemon，导致插件子进程找不到 Python 内核。
  // 这是本项目踩过的经典误诊：「插件工具调不动」被当成插件问题，实为 daemon 被抢跑污染。
  // 这里改读~/.agh/data/daemon/{owner,discovery}.json（依据见 §8.6）。
  if (cliExists) {
    const probe = await probeDaemon(AGH_HOME)
    add(
      'daemon',
      'AGH daemon 状态',
      probe.running ? 'ok' : 'warn',
      probe.detail,
      probe.running
        ? undefined
        : probe.stale
          // 僵尸记录要给出**可执行**的处置，而不是笼统的"没运行"
          ? `${probe.reason}。执行 node scripts/start.mjs 会自动隔离该记录并启动新 daemon；` +
            `也可手工改名隔离（勿直接删，AGH 用它识别"上一代已死"）。`
          : `未运行（${probe.reason ?? '无发现记录'}）。执行: node "${AGH_CLI}" daemon start 启动 AGH 后台（首次使用请在 AGH Web 完成模型配置）。`,
      false,
    )
  }

  // 7. BFF 端口可用
  const portFree = await checkPortFree(BFF_PORT)
  add('port', `BFF 端口 ${BFF_PORT}`, portFree ? 'ok' : 'warn', portFree ? '可用' : '被占用', portFree ? undefined : '端口被占用：设置 PAPER_AGENT_PORT 换端口，或释放该端口。', false)

  // 8. sciret 插件安装状态（零副作用：直接读 AGH 锁文件，不启动 daemon）
  //    注意：不要用 `package status` 检查——它会自动拉起一个**不带环境变量**的 daemon，
  //    之后用户启动的 serve 会复用该 daemon，导致插件子进程找不到 Python 内核（经典误诊）。
  const lockPath = join(AGH_HOME, 'profiles', AGNES_PROFILE, 'agnes-lock.json')
  try {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
    const packages = lock.packages ?? {}
    const mine = Object.entries(packages).filter(([name]) => /plugin-sciret/.test(name))
    const old = Object.entries(packages).filter(([name]) => name === 'paper-agent-tools')
    if (mine.length === 0) {
      add(
        'plugin',
        'sciret 插件安装状态',
        'warn',
        '未安装',
        '安装（唯一人工步骤：AGH 强制真实终端确认）：bash agh.sh install file:./plugin/sciret → 敲 y；随后 bash scripts/install-plugin.sh finish。预检：bash scripts/install-plugin.sh check',
        false,
      )
    } else {
      const [name, info] = mine[0]
      const enabled = Boolean(info?.state?.enabled)
      const trusted = info?.trust === 'trusted'
      add(
        'plugin',
        'sciret 插件安装状态',
        enabled && trusted ? 'ok' : 'warn',
        `${name} v${info?.version ?? '?'} enabled=${enabled} trusted=${trusted}`,
        enabled && trusted ? undefined : '已安装但未启用/未信任：bash scripts/install-plugin.sh finish',
        false,
      )
    }
    if (old.length > 0 && old[0][1]?.state?.enabled) {
      add(
        'plugin-conflict',
        '遗留包冲突（paper-agent-tools）',
        'warn',
        '仍启用 → 与 sciret_* 工具重名',
        '先停用旧包（可逆）：bash scripts/install-plugin.sh disable-old（恢复：bash agh.sh package enable ext:paper-agent/tools）',
        false,
      )
    }
  } catch (e) {
    add(
      'plugin',
      'sciret 插件安装状态',
      'warn',
      `无法读取 AGH 锁文件：${lockPath}`,
      `若 AGH 尚未初始化，请先启动一次 AGH：bash agh.sh daemon start。原始错误：${e instanceof Error ? e.message : String(e)}`,
      false,
    )
  }

  // 9. 环境变量**实际生效值**（§12.2 要求：不只是"设了没"，而是"程序读到的值是什么"）
  //    只报关键项；密钥类**只报是否已设置，绝不回显值**（安全红线）。
  const envRows = [
    ['PAPER_AGENT_ROOT', ROOT],
    ['PAPER_AGENT_PYTHON', py],
    ['PAPER_AGENT_PORT', String(BFF_PORT)],
    ['AGH_HOME', AGH_HOME],
    ['AGNES_PROFILE', AGNES_PROFILE],
  ]
  const secrets = [
    ['PAPER_AGENT_TOKEN', Boolean(process.env['PAPER_AGENT_TOKEN'])],
    ['AGNES_API_KEY', Boolean(process.env['AGNES_API_KEY'])],
    ['HTTP_PROXY / HTTPS_PROXY', Boolean(process.env['HTTP_PROXY'] || process.env['HTTPS_PROXY'])],
  ]
  add(
    'env',
    '环境变量生效值',
    'ok',
    envRows.map(([k, v]) => `${k}=${v}`).join('  ') + secrets.map(([k, has]) => `  ${k}=${has ? '(已设置)' : '(未设置)'}`).join(''),
    '以上为本进程实际读到的值（非磁盘配置）。写路由令牌请用 PAPER_AGENT_TOKEN；模型密钥建议经 AGH 原生设置而非明文环境变量。',
    false,
  )

  // 10. AGH 工具注册数（§12.2：插件"已信任并启用（工具注册数）"）
  //     从 AGH 锁文件里的包信息推断，不启动会话——真要数注册数得跑会话，故此处标明来源。
  const toolCount = await countRegisteredTools(lockPath)
  if (toolCount.status === 'ok') {
    add(
      'tools',
      'AGH 工具注册数',
      toolCount.count > 0 ? 'ok' : 'warn',
      `${toolCount.count} 个（插件包 ${toolCount.pkg}）`,
      toolCount.count > 0 ? undefined : '插件已安装但未查到工具定义：请检查 plugin/sciret 的 package.json 是否声明 tools，以及是否需要重启 daemon 使新能力生效（插件被拷贝到 AGH home 运行）。',
      false,
    )
  } else {
    add('tools', 'AGH 工具注册数', 'warn', toolCount.reason, '插件安装状态未知，先确认上一项「sciret 插件安装状态」。', false)
  }

  // 11. 模型已配置（§12.2）——只报**有没有**，不回显任何密钥
  const modelInfo = inspectModelConfig(AGH_HOME, AGNES_PROFILE)
  add(
    'model',
    '模型配置',
    modelInfo.configured ? 'ok' : 'warn',
    modelInfo.detail,
    modelInfo.configured ? undefined : modelInfo.hint,
    false,
  )

  // 12. 数据源连通性（含代理，§12.2）—— 零网络，只查源定义/代理/冻结语料就位情况
  const ds = await probeDataSources(ROOT, py)
  add(
    'datasources',
    '数据源连通性',
    ds.status,
    ds.detail,
    ds.hint,
    false,
  )

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

/**
 * 只读探测 AGH daemon 是否可用（**不启动任何东西**）。
 *
 * 判据与 AGH 自己的 `readDaemonDiscovery()` 对齐（§8.6）：
 *   owner.json 与 discovery.json 必须指向**同一 pid/管道**（同代数），
 *   且 discovery.ready === true。
 * 只看 discovery.json 里的 socketPath 会**假通过**——上一代 daemon 留下的僵尸记录里也有 socket。
 */
async function probeDaemon(aghHome) {
  const dir = join(aghHome, 'data', 'daemon')
  const readJson = (p) => {
    try {
      return JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      return null
    }
  }
  const owner = readJson(join(dir, 'owner.json'))
  const discovery = readJson(join(dir, 'discovery.json'))
  if (!owner) return { running: false, reason: `未找到 ${join(dir, 'owner.json')}`, detail: '未运行' }
  if (!discovery) return { running: false, reason: `未找到 ${join(dir, 'discovery.json')}`, detail: '未运行' }
  const ownerPid = Number(owner.pid)
  if (Number(discovery.owner?.pid) !== ownerPid) {
    return { running: false, reason: `代数不符（owner=${ownerPid} / discovery=${discovery.owner?.pid}），属僵尸发现记录`, detail: '未运行' }
  }
  if (discovery.ready !== true) return { running: false, reason: 'discovery.ready 不为 true', detail: '未就绪' }
  if (!discovery.socketPath) return { running: false, reason: 'discovery.socketPath 为空', detail: '未就绪' }
  // ⚠️ 关键：文件在≠ 进程还活着。AGH daemon 是派生进程，进程被回收后
  // 发现文件仍留在盘上——只查文件会把"僵尸记录"报成"运行中"（假通过）。
  if (!(await processAlive(ownerPid))) {
    return {
      running: false,
      stale: true,
      reason: `僵尸发现记录：pid ${ownerPid} 已不存在，但 owner.json / discovery.json 仍在`,
      detail: '未运行（发现记录已失效）',
    }
  }
  return { running: true, detail: `pid=${ownerPid} pipe=${discovery.socketPath}` }
}

/**
 * 进程存活检测（Windows 用 tasklist；注意必须**异步** spawn——本机 spawnSync 一律 EBUSY）。
 */
async function processAlive(pid) {
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
      finish(out.includes(`"${pid}"`) && !/没有运行|no tasks/i.test(out))
    })
  })
}

/**
 * 统计插件注册的 sciret 工具数（只读本项目插件源码，不启动会话）。
 *
 * ⚠️ 工具**不是**在 package.json 里声明的（那里只有 extension 入口），
 * 而是在 plugin/sciret/index.mjs 里逐个 `register('sciret_xxx', ...)` 声明的。
 * 早先我按 `package.json.tools` 读 → 恒为 0 → 会把正常状态报成告警（假告警）。
 *
 * count 来源是**本项目源码**，不是 AGH 运行时真值；真正权威的注册数需在会话里问 AGH
 * （apps/bff/scripts/verify-tool-call.ts）。故 value 里标明来源，不冒充运行时观测。
 */
async function countRegisteredTools(lockPath) {
  try {
    if (!existsSync(lockPath)) return { status: 'skip', reason: '读不到 AGH 锁文件' }
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
    const pkgName = Object.keys(lock.packages ?? {}).find((n) => /plugin-sciret/.test(n))
    if (!pkgName) return { status: 'skip', reason: '未安装 sciret 插件' }
    const indexPath = resolve(ROOT, 'plugin/sciret/index.mjs')
    if (!existsSync(indexPath)) return { status: 'ok', count: 0, pkg: pkgName, note: '插件入口不可读' }
    const src = readFileSync(indexPath, 'utf8')
    const names = [...src.matchAll(/\bregister\(\s*'(sciret_[a-z0-9_]+)'/g)].map((m) => m[1])
    const unique = [...new Set(names)]
    return { status: 'ok', count: unique.length, pkg: pkgName, names: unique }
  } catch (e) {
    return { status: 'skip', reason: `解析失败：${e instanceof Error ? e.message : String(e)}` }
  }
}

/**
 * 检查模型是否已配置（**只看有无与来源，绝不回显密钥**）。
 * 判据：AGH profile 配置里是否声明了带 routes 的 provider；或在 BFF 侧有可用的 api-key。
 */
function inspectModelConfig(aghHome, profile) {
  const cfgPath = join(aghHome, 'profiles', profile, 'configuration.json')
  if (!existsSync(cfgPath)) {
    return {
      configured: false,
      detail: `未找到 ${cfgPath}`,
      hint: '尚未配置 AGH 模型：启动一次 AGH（bash agh.sh daemon start）后在 AGH Web 完成模型配置，或写入 AGH 原生设置。',
    }
  }
  try {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
    const accounts = Array.isArray(cfg.accounts) ? cfg.accounts : []
    const enabled = accounts.filter((a) => a?.enabled !== false)
    const withRoutes = enabled.filter((a) => Array.isArray(a?.routes) && a.routes.length > 0)
    const withKey = enabled.filter((a) => a?.credentialRef || a?.apiKey)
    if (withRoutes.length > 0 || withKey.length > 0) {
      return {
        configured: true,
        detail: `已配置 ${enabled.length} 个账户（routes=${withRoutes.length} 含凭据引用=${withKey.length}）；凭据值不回显`,
      }
    }
    return {
      configured: false,
      detail: `存在 ${accounts.length} 个账户但均无可用 routes`,
      hint: '模型未配置：模型与供应商建议经 AGH 原生设置完成（AGH Web 或 agh config），避免明文密钥进环境变量。',
    }
  } catch (e) {
    return {
      configured: false,
      detail: `读取配置失败：${e instanceof Error ? e.message : String(e)}`,
      hint: `检查 ${cfgPath} 是否为合法 JSON。`,
    }
  }
}

/**
 * 数据源连通性（§12.2，含代理）。
 *
 * ⚠️ **刻意不发任何网络请求**：doctor 是"环境自检"，不是"功能测试"。
 * 发请求会带来三个问题：①拖慢启动（每个源都要等超时）②在受限网络下把环境问题
 * 误报成项目问题 ③可能真的抓下数据，产生副作用。
 *
 * 源定义的**单一真源是内核的 Source SPI 注册表**（kernel/sciret_kernel/sources.py 的 REGISTRY）。
 * 早先这里用正则去扫 `kernel/tools/fetch_corpus.py` 里的"源名 → URL"字面量表 ——
 * SPI 重构后引擎不再认识具体源，那张表根本不存在了，于是 doctor **恒报**
 * "未解析到在线源定义"，把真实可用的 crossref/openalex 说成没配（假告警）。
 * 现在直接问注册表：`build_url()` 只拼字符串，`transport()` 才发请求，这里不调用它，
 * 所以零网络这条约束仍然成立。
 */
const SOURCES_PROBE_PY = [
  'import json',
  'from sciret_kernel import sources as s',
  'print(json.dumps([{"name": n, "endpoint": s.get(n).build_url("probe", 1).split("?")[0]} for n in s.known_sources()]))',
].join('\n')

async function probeDataSources(root, py) {
  const spi = resolve(root, 'kernel', 'sciret_kernel', 'sources.py')
  if (!existsSync(spi)) {
    return { status: 'warn', detail: `未找到 ${spi}`, hint: '内核 Source SPI 缺失，在线检索不可用（冻结语料仍可用）。' }
  }
  /** @type {Array<{name:string, endpoint:string}>} */
  let declared = []
  let probeError = ''
  if (!py) {
    probeError = '无可用 Python 解释器'
  } else {
    const r = await run(py, ['-c', SOURCES_PROBE_PY], {
      cwd: root,
      env: { ...process.env, PYTHONPATH: resolve(root, 'kernel') },
      timeoutMs: 20000,
    })
    if (r.status === 0) {
      try {
        declared = JSON.parse(r.out.trim())
      } catch (e) {
        probeError = `注册表输出解析失败：${e instanceof Error ? e.message : String(e)}`
      }
    } else {
      probeError = `内核探测失败：${(r.err || r.out || `退出码 ${r.status}`).trim().split('\n').slice(-1)[0]}`
    }
  }
  const proxy = process.env['HTTP_PROXY'] || process.env['HTTPS_PROXY'] || process.env['http_proxy'] || process.env['https_proxy']
  // 冻结语料的真实位置由内核定义：kernel/sciret_kernel/corpus.py → CORPUS_DIR = <包目录>/corpus
  // 早先我按 kernel/corpus、data/corpus 猜 → 恒为"未找到"（假告警）。改为跟随内核定义。
  const corpusDir = resolve(root, 'kernel/sciret_kernel/corpus')
  const corpus = existsSync(corpusDir)
  const bits = [
    declared.length > 0
      ? `在线源 ${declared.length} 个（${declared.map((d) => `${d.name}→${d.endpoint}`).join(' ')}）`
      : `未取到内核注册的源（${probeError}）`,
    proxy ? `代理已配置（${proxy.replace(/:\/\/[^@/]*@/, '://***@')}）` : '未配置代理',
    corpus ? '冻结语料已就位（可离线运行）' : '未找到冻结语料目录',
  ]
  return {
    status: declared.length > 0 ? 'ok' : 'warn',
    detail: bits.join('；'),
    hint:
      declared.length > 0
        ? undefined
        : `请确认内核可用（${probeError}）：注册表在 kernel/sciret_kernel/sources.py 的 REGISTRY，` +
          `解释器由 PAPER_AGENT_PYTHON 指定；离线场景依赖冻结语料。`,
  }
}

main().catch((e) => {
  process.stderr.write(`doctor 自身失败: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})
