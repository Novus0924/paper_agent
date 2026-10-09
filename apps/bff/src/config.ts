import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 配置加载（BE-01）：
 * - 环境变量优先，安全默认值兜底；
 * - 路径自动探测（换机零改动）；
 * - 失效配置 fail-fast 并给人类可读原因。
 */

export class ConfigError extends Error {
  readonly hint: string
  constructor(message: string, hint: string) {
    super(message)
    this.name = 'ConfigError'
    this.hint = hint
  }
}

export type AppConfig = {
  /** BFF 监听地址（仅回环，安全红线） */
  host: '127.0.0.1'
  port: number
  /** 项目根 */
  root: string
  /** AGH 仓库根（只读引用，严禁修改其源码） */
  aghRoot: string
  /** AGH CLI 入口（构建产物） */
  aghCli: string
  /** 运行产物目录 */
  runsDir: string
  /** 任务索引/数据目录 */
  dataDir: string
  /** Python 解释器（领域内核用） */
  python: string
  /** 可选写路由令牌（默认关） */
  token: string | undefined
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  /** AGH home（透传给会话网关做 daemon 发现；空 = AGH 默认 home） */
  aghHome: string | undefined
  /** AGNES profile（透传） */
  agnesProfile: string | undefined
}

const DEFAULT_AGH_CANDIDATES = [
  'D:/agnes-harness-main',
  'D:/agnes-harness',
  'C:/agnes-harness-main',
]

function detectAghRoot(envOverride: string | undefined): string {
  const candidates = envOverride ? [envOverride, ...DEFAULT_AGH_CANDIDATES] : DEFAULT_AGH_CANDIDATES
  for (const dir of candidates) {
    // CLI 构建产物存在即可认为可用（serve/export 均经它）
    if (existsSync(resolve(dir, 'packages/cli/dist/local/agnes.mjs'))) return dir
  }
  throw new ConfigError(
    envOverride
      ? `PAPER_AGENT_AGH_ROOT 指向的目录缺少构建产物：${envOverride}`
      : '未找到 Agnes Harness（AGH）本地仓库或其构建产物',
    '请设置环境变量 PAPER_AGENT_AGH_ROOT 指向 AGH 仓库根（需已执行构建，存在 packages/cli/dist/local/agnes.mjs），或运行 scripts/doctor.mjs 查看诊断。',
  )
}

function detectPython(envOverride: string | undefined): string {
  if (envOverride) {
    if (!existsSync(envOverride)) {
      throw new ConfigError(`PAPER_AGENT_PYTHON 指向的解释器不存在：${envOverride}`, '请修正该环境变量后重试。')
    }
    return envOverride
  }
  // 默认探测（Windows 常见安装位置 + PATH 由调用方保证）
  return 'python'
}

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ConfigError(`环境变量 ${name} 的值非法：${raw}`, `应为 ${min}~${max} 之间的整数。`)
  }
  return n
}

export function loadConfig(rootOverride?: string): AppConfig {
  const root = resolve(rootOverride ?? process.env['PAPER_AGENT_ROOT'] ?? process.cwd())
  const aghRoot = detectAghRoot(process.env['PAPER_AGENT_AGH_ROOT'])
  const logLevelRaw = process.env['PAPER_AGENT_LOG_LEVEL'] ?? 'info'
  if (!['debug', 'info', 'warn', 'error'].includes(logLevelRaw)) {
    throw new ConfigError(`PAPER_AGENT_LOG_LEVEL 非法：${logLevelRaw}`, '允许值：debug | info | warn | error。')
  }
  return {
    host: '127.0.0.1', // 硬编码回环，不允许覆盖（安全红线）
    port: intEnv('PAPER_AGENT_PORT', 8787, 1024, 65535),
    root,
    aghRoot,
    aghCli: resolve(aghRoot, 'packages/cli/dist/local/agnes.mjs'),
    runsDir: resolve(root, 'runs'),
    dataDir: resolve(root, 'data'),
    python: detectPython(process.env['PAPER_AGENT_PYTHON']),
    token: process.env['PAPER_AGENT_TOKEN'] || undefined,
    logLevel: logLevelRaw as AppConfig['logLevel'],
    aghHome: process.env['AGH_HOME'] || undefined,
    agnesProfile: process.env['AGNES_PROFILE'] || undefined,
  }
}
