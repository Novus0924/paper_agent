// 诊断：打印包管理列表与操作回执的完整字段（定位 capabilityHash 的正确来源）
import { readDaemonDiscovery, resolveDaemonScope } from '@agnes/daemon'
import { createClient, memoryJournal, unixTransport, type Client } from '@agnes/sdk'

const PROFILE = process.env['AGNES_PROFILE'] ?? 'local-dev'
const NEW_PKG = '@paper-agent/plugin-sciret'

async function connect(): Promise<Client> {
  const scope = await resolveDaemonScope({ env: process.env, cwd: process.cwd() })
  const d = await readDaemonDiscovery(scope)
  if (!d) throw new Error('daemon 未运行')
  const path = d.socketPath
  const client = createClient({
    transport: { kind: 'unix', path },
    auth: { kind: 'local' },
    journal: memoryJournal(),
    transportFactories: {
      unix: () =>
        unixTransport({
          path,
          resolveServerIdentity: async () => ({ pid: d.owner.pid, processStartId: d.owner.processStartId }),
        }),
    },
  })
  await client.initialize()
  return client
}

const client = await connect()
const list = (await client.packages.list({ profile: PROFILE })) as unknown as Record<string, unknown>
console.log('=== list 原始返回 ===')
console.log(JSON.stringify(list, null, 2).slice(0, 3000))

const packages = (list['packages'] ?? []) as Array<Record<string, unknown>>
const mine = packages.find((p) => p['id'] === NEW_PKG)
console.log('=== 本插件条目 ===')
console.log(JSON.stringify(mine, null, 2))

// 再跑一次 inspect，打印完整 receipt + 操作记录，找 capability 相关字段
const clientId = await client.clientId()
const receipt = (await client.packages.inspect({
  profile: PROFILE,
  clientId,
  commandId: `probe-inspect-${Date.now()}`,
  source: { type: 'file', ref: 'file:./plugin/sciret' },
})) as unknown as Record<string, unknown>
console.log('=== inspect receipt ===', JSON.stringify(receipt))

// 直接尝试 trust 并打印完整操作记录（含 error），定位失败原因
const mineEntry = mine as { integrity?: string; capabilityHash?: string } | undefined
console.log('=== 尝试 trust（试算）===')
const trustReceipt = (await client.packages.trust({
  profile: PROFILE,
  clientId,
  commandId: `probe-trust-${Date.now()}`,
  id: NEW_PKG,
  expectedIntegrity: String(mineEntry?.integrity ?? ''),
  capabilityHash: String(mineEntry?.capabilityHash ?? ''),
})) as unknown as Record<string, unknown>
console.log('trust receipt =', JSON.stringify(trustReceipt))
for (let i = 0; i < 20; i++) {
  const op = (await client.packages.operation.get({
    profile: PROFILE,
    operationId: String(trustReceipt['operationId']),
  })) as unknown as Record<string, unknown>
  console.log('  trust op:', JSON.stringify(op).slice(0, 900))
  if (['completed', 'failed', 'cancelled'].includes(String(op['state']))) break
  await new Promise((r) => setTimeout(r, 500))
}
await client.close()
