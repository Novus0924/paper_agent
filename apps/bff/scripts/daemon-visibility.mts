/**
 * 诊断 BFF 网关为何读不到 daemon 发现文件（启动器与 BFF 判据不一致时用）。
 *
 * 现象（本项目 M9 实测）：`scripts/start.mjs` 读~/.agh/data/daemon/{owner,discovery}.json
 * 判定 daemon 就绪，但同一时刻 BFF 启动却报"未找到运行中的 AGH daemon 发现文件"。
 *
 * 原因：两者判据不同。
 *   - 启动器 / doctor：**只读文件**（快，但可能与 AGH 真实校验不一致 → 假通过）；
 *   - BFF 网关：走 AGH 的 `resolveDaemonScope()` + `readDaemonDiscovery()`，
 *     后者会做 **profile 解析（读配置 → 校验模型路由 → 读凭据）** 与**进程存活校验**。
 *
 * 所以「文件在」≠「AGH 会认」。本探针跑 BFF 的同一条路径，把失败原因打出来。
 *
 * 用法：tsx daemon-visibility.mts [cwd]
 */
import { resolveDaemonScope, readDaemonDiscovery } from '@agnes/daemon'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

const cwd = process.argv[2] ?? process.cwd()
const aghHome = process.env['AGH_HOME'] ?? join(homedir(), '.agh')
const dir = join(aghHome, 'data', 'daemon')

console.log('=== 1. 文件层（启动器/doctor 的判据）===')
for (const f of ['owner.json', 'discovery.json']) {
  const p = join(dir, f)
  console.log(`  ${f}: ${existsSync(p) ? '存在' : '缺失'}`)
  if (existsSync(p)) {
    const j = JSON.parse(readFileSync(p, 'utf8'))
    console.log(`    pid=${j.pid ?? j.owner?.pid} socket=${j.socketPath ?? j.owner?.socketPath} ready=${j.ready}`)
  }
}

console.log('\n=== 2. AGH 校验层（BFF 网关的判据）===')
try {
  const scope = await resolveDaemonScope({ env: process.env, cwd })
  console.log('  dataDir=', scope.dataDir)
  console.log('  discoveryPath=', scope.discoveryPath)
  const d = await readDaemonDiscovery(scope)
  if (!d) {
    console.log('  结果: readDaemonDiscovery 返回 null')
    console.log('  →可能原因：owner 与 discovery 代数不符 / pid 不在运行 / 文件读取失败。')
    console.log('    用 npx tsx 启动本探针时，若 Node 版本不是 24.x，identity() 校验会判 dead。')
    console.log(`    当前 Node: ${process.versions.node}`)
  } else {
    console.log(`  结果: OK socket=${d.socketPath} pid=${d.owner.pid}`)
  }
} catch (e) {
  const err = e as { code?: string; message?: string }
  console.log(`  结果: 抛错 code=${err.code ?? '-'} message=${err.message ?? String(e)}`)
  if (err.code === 'CONFIG_CREDENTIAL_STORE') {
    console.log('  → profile 解析阶段读凭据失败：AGH home 的 ACL 需仅 SYSTEM + 当前用户。')
    console.log('    复核： tsx apps/bff/scripts/acl-audit.mts')
  }
}

console.log('\n=== 3. 结论 ===')
console.log('  启动器判"就绪"只看文件；BFF 还要过 profile 解析与进程存活。')
console.log('  两层不一致时以 BFF 为准——它才是真正要连的那一方。')
console.log('  修法：先让本探针第 2 节为 OK，再启动 BFF；否则 BFF 只能"延后重试"。')