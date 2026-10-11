/**
 * sciret 插件安装（经 AGH 官方包管理 API —— 与 Web「从来源安装」同一条 daemon 通道）
 *
 * 背景（重要）：
 *   AGH CLI 的 `package add` 会强制要求真实 TTY 交互确认（packages/cli/src/bin.ts
 *   `confirmPackageInstall`：stdin/stdout 非 TTY 直接返回 false → "Installation cancelled."，无 --yes 后门），
 *   因此脚本化安装走 CLI 不可行。本脚本改用 **daemon 的包管理 API**（`client.packages.*`），
 *   即 Web 管理页"从来源安装"所使用的同一通道；用户明确指示执行安装。
 *
 * 流程：inspect → install → trust（integrity + capabilityHash）→ enable → list 终验
 * 可选：--disable-old 先停用 v1.0 遗留包 paper-agent-tools（避免 sciret_* 工具重名）
 *
 * 用法（需 daemon 已启动，且由项目根启动以便 file:./ 解析）：
 *   PAPER_AGENT_* 环境变量齐备后：
 *   npx tsx scripts/install-plugin.ts [--disable-old] [--source file:./plugin/sciret]
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { readDaemonDiscovery, resolveDaemonScope } from '@agnes/daemon'
import { createClient, memoryJournal, unixTransport, type Client } from '@agnes/sdk'

const PROFILE = process.env['AGNES_PROFILE'] ?? 'local-dev'
const OLD_PKG = 'paper-agent-tools'
const NEW_PKG = '@paper-agent/plugin-sciret'

const argv = process.argv.slice(2)
const DISABLE_OLD = argv.includes('--disable-old')
const SOURCE_REF = pick('--source') ?? 'file:./plugin/sciret'

function pick(flag: string): string | undefined {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

type AnyOp = {
  operationId: string
  state: string
  progress?: number
  preview?: { id?: string; version?: string; integrity?: string; capabilityHash?: string; blockers?: unknown[] }
  installed?: { id?: string; version?: string; integrity?: string; capabilityHash?: string }
  // ⚠️ error 里code/blockers 是**运行期确实存在**的字段（失败时就是这么打印的）。
//    声明里原本只有 safeMessage，TS 因此认为 err.code 不可访问——
//    说明这份 AnyOp 是"写的时候按印象写的"，没有被类型检查过
//    （scripts/ 此前不在 tsconfig.include 里，做 ESLint 时才纳入）。
  error?: { code?: string; safeMessage?: string; blockers?: unknown[] }
}

const log = (...a: unknown[]) => console.log('[install]', ...a)

async function connect(): Promise<Client> {
  const scope = await resolveDaemonScope({ env: process.env, cwd: process.cwd() })
  const d = await readDaemonDiscovery(scope)
  if (!d) throw new Error('AGH daemon 未运行：请先执行 `bash agh.sh daemon start`（必须在项目根启动）')
  const path = d.socketPath
  const client = createClient({
    transport: { kind: 'unix', path },
    auth: { kind: 'local' },
    journal: memoryJournal(),
    transportFactories: {
      unix: () =>
        unixTransport({
          path,
          resolveServerIdentity: async () => {
            const fresh = await readDaemonDiscovery(scope)
            if (!fresh || fresh.socketPath !== path) throw new Error('local pipe does not match a verified daemon')
            return { pid: fresh.owner.pid, processStartId: fresh.owner.processStartId }
          },
        }),
    },
  })
  await client.initialize()
  return client
}

async function waitOp(client: Client, operationId: unknown, label: string): Promise<AnyOp> {
  // Fail-fast：operationId 缺失时**绝不能**继续轮询。
  // 否则会用 undefined 反复查operation.get → 要么空转到超时（2 分钟白等），
  // 要么误取到别的操作结果，然后基于它报告"安装成功"——那是**最坏**的失败：
  // 看起来成功，实际没装。
  // 收窄类型：未知形状一律 Fail-fast（见上方注释：空轮询会误判成功）
  if (typeof operationId !== 'string' || operationId === '') {
    throw new Error(
      `${label} 未返回 operationId（daemon 回执形状异常，实际类型 ${typeof operationId}）；` +
        `已中止，避免空等超时或误判成功`,
    )
  }
  const deadline = Date.now() + 120_000
  let last: AnyOp | null = null
  while (Date.now() < deadline) {
    const op = (await client.packages.operation.get({ profile: PROFILE, operationId })) as unknown as AnyOp
    if (op.state !== last?.state) {
      log(`  ${label}: ${op.state}${op.progress !== undefined ? ` (${op.progress}%)` : ''}`)
      if (op.state === 'failed') {
        const err = op.error
        log(`  ✗ ${label} 失败：code=${err?.code ?? '?'} message=${err?.safeMessage ?? '?'} blockers=${JSON.stringify(err?.blockers ?? [])}`)
      }
    }
    last = op
    if (['completed', 'failed', 'cancelled', 'rolled-back'].includes(op.state)) return op
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`${label} 超时未完成（最后状态 ${last?.state}）`)
}

function capabilityHashFromAudit(pkgName: string): string | undefined {
  const home = process.env['AGH_HOME'] ?? join(homedir(), '.agh')
  const audit = join(home, 'profiles', PROFILE, '.agnes-package-audit.jsonl')
  try {
    const lines = readFileSync(audit, 'utf8').split('\n').filter(Boolean)
    for (const line of lines.reverse()) {
      const e = JSON.parse(line) as { package?: string; operation?: string; capabilityDiff?: { next?: string } }
      if (e.package === pkgName && e.operation === 'install' && e.capabilityDiff?.next) return e.capabilityDiff.next
    }
  } catch {
    return undefined
  }
  return undefined
}

async function main() {
  const client = await connect()
  const clientId = await client.clientId()
  const cmd = (kind: string) => `paper-agent-${kind}-${Date.now()}`
  log('已连接 daemon，clientId =', clientId, '｜profile =', PROFILE)

  const before = (await client.packages.list({ profile: PROFILE })) as {
    packages: Array<{ id: string; version: string; desired?: string; actual?: string; trusted?: boolean }>
  }
  log('安装前状态：')
  for (const p of before.packages) log(`  - ${p.id}@${p.version} desired=${p.desired} actual=${p.actual} trusted=${p.trusted}`)

  if (DISABLE_OLD && before.packages.some((p) => p.id === OLD_PKG && p.desired === 'enabled')) {
    log(`停用遗留包 ${OLD_PKG}（避免 sciret_* 工具重名；可逆：package enable ${OLD_PKG}）`)
    const r = await client.packages.disable({ profile: PROFILE, clientId, commandId: cmd('disable-old'), id: OLD_PKG })
    const op = await waitOp(client, r.operationId, 'disable')
    log('  → 结果:', op.state)
  }

  // 已存在（哪怕未启用）时先移除：AGH 不允许在"已安装未信任"暂存态上直接重装（E_PACKAGE_STATE）
  if (before.packages.some((p) => p.id === NEW_PKG)) {
    log(`移除旧副本 ${NEW_PKG}（源码已变更或上次安装未完成信任；integrity 会随之变化）`)
    const r = await client.packages.remove({ profile: PROFILE, clientId, commandId: cmd('remove'), id: NEW_PKG })
    const op = await waitOp(client, r.operationId, 'remove')
    if (op.state !== 'completed') throw new Error(`移除失败：${op.state}`)
  }

  const source = { type: 'file' as const, ref: SOURCE_REF }
  log('1) inspect', SOURCE_REF)
  const inspectReceipt = await client.packages.inspect({ profile: PROFILE, clientId, commandId: cmd('inspect'), source })
  const inspectOp = await waitOp(client, inspectReceipt.operationId, 'inspect')
  if (inspectOp.state !== 'completed' || !inspectOp.preview) {
    throw new Error(`inspect 未通过：state=${inspectOp.state} error=${inspectOp.error?.safeMessage ?? '-'}`)
  }
  const preview = inspectOp.preview
  log(`   预览：${preview.id}@${preview.version} integrity=${preview.integrity} blockers=${preview.blockers?.length ?? 0}`)

  log('2) install')
  const installReceipt = await client.packages.install({
    profile: PROFILE,
    clientId,
    commandId: cmd('install'),
    source,
    expectedIntegrity: preview.integrity!,
  })
  const installOp = await waitOp(client, installReceipt.operationId, 'install')
  if (installOp.state !== 'completed') throw new Error(`install 失败：${installOp.error?.safeMessage ?? installOp.state}`)
  log('   install 完成')

  const capabilityHash =
    installOp.preview?.capabilityHash ?? installOp.installed?.capabilityHash ?? capabilityHashFromAudit(NEW_PKG)
  const integrity = installOp.installed?.integrity ?? preview.integrity!
  log(`3) trust（integrity=${integrity} capabilityHash=${capabilityHash ?? '未取到'}）`)
  if (!capabilityHash) {
    throw new Error('未取到 capabilityHash（可改用 AGH Web 管理页安装，页面会自动绑定）')
  }
  const trustReceipt = await client.packages.trust({
    profile: PROFILE,
    clientId,
    commandId: cmd('trust'),
    id: NEW_PKG,
    expectedIntegrity: integrity,
    capabilityHash,
  })
  const trustOp = await waitOp(client, trustReceipt.operationId, 'trust')
  log('   → ', trustOp.state)

  log('4) enable')
  const enableReceipt = await client.packages.enable({ profile: PROFILE, clientId, commandId: cmd('enable'), id: NEW_PKG })
  const enableOp = await waitOp(client, enableReceipt.operationId, 'enable')
  log('   → ', enableOp.state)

  log('5) 终验三字段（desired=enabled 且 actual=running 且 trusted=true）')
  const after = (await client.packages.list({ profile: PROFILE })) as {
    packages: Array<{ id: string; version: string; desired?: string; actual?: string; trusted?: boolean }>
  }
  let okAll = false
  for (const p of after.packages) {
    const mine = p.id === NEW_PKG
    const ok = p.desired === 'enabled' && p.actual === 'running' && p.trusted === true
    if (mine) okAll = ok
    log(`  - ${mine ? '★ ' : '  '}${p.id}@${p.version} desired=${p.desired} actual=${p.actual} trusted=${p.trusted}`)
  }
  log(okAll ? '✅ 三字段全部满足' : '⚠️ 三字段未全部满足（见上表）')
  await client.close()
  process.exit(okAll ? 0 : 1)
}

main().catch((e) => {
  console.error('[install] 失败:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
