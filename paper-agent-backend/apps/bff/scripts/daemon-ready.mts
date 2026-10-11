/**
 * 读取 AGH daemon 发现信息（轻量，只读 discovery.json，不做 profile 解析）。
 *
 * 为什么不用 `resolveDaemonScope` + `readDaemonDiscovery` 那条路：
 * 那条路会走完整profile 解析（读配置 → 校验模型路由 → 读凭据），
 * 在本机会抛 `CONFIG_CREDENTIAL_STORE` —— 那是**探测脚本自己**的问题，
 * 与 daemon 是否可用无关（BFF 网关走同一条路，但它的运行上下文不同）。
 * 本脚本只用于 E2E 的就绪判定，判据是 daemon 写出的发现记录是否自洽：
 *   owner.json 与 discovery.json 指向同一 pid/管道，且 ready=true。
 *
 * 用法：tsx daemon-ready.mts
 * 输出： READY <pid> <socketPath>  或  NOT-READY <原因>
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const dataDir = process.env['AGH_DATA_DIR'] ?? join(homedir(), '.agh', 'data')
const dir = join(dataDir, 'daemon')

function readJson(p: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

const owner = readJson(join(dir, 'owner.json'))
const discovery = readJson(join(dir, 'discovery.json'))

if (!owner) {
  console.log('NOT-READY owner.json 缺失或不可读')
  process.exit(0)
}
if (!discovery) {
  console.log('NOT-READY discovery.json 缺失或不可读')
  process.exit(0)
}
const ownerPid = Number(owner['pid'])
const discOwner = (discovery['owner'] ?? {}) as Record<string, unknown>
if (Number(discOwner['pid']) !== ownerPid) {
  // 僵尸发现文件：上一代 daemon 的记录还没被新记录替换（我踩过这个假通过）
  console.log(`NOT-READY 代数不符 owner=${ownerPid} discovery=${String(discOwner['pid'])}`)
  process.exit(0)
}
if (discovery['ready'] !== true) {
  console.log('NOT-READY discovery.ready 不为 true')
  process.exit(0)
}
const socket = String(discovery['socketPath'] ?? '')
if (!socket) {
  console.log('NOT-READY discovery.socketPath 为空')
  process.exit(0)
}
console.log(`READY ${ownerPid} ${socket}`)
