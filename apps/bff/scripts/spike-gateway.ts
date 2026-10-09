// 分步诊断 v2：workspace 注册 → session.new → events 订阅 → prompt
// 用法: npx tsx scripts/spike-gateway.ts
import { readDaemonDiscovery, resolveDaemonScope } from '@agnes/daemon'
import { createClient, memoryJournal, unixTransport } from '@agnes/sdk'

const log = (...a: unknown[]) => console.log('[spike]', ...a)
const RUN_DIR = 'D:/workBubbyStore/paper-agent-2/runs'

function err(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const x = e as { code?: unknown; message?: string; data?: unknown }
    return `${x.message ?? 'error'} code=${String(x.code)} data=${JSON.stringify(x.data)}`
  }
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e)
}

async function main() {
  const scope = await resolveDaemonScope({ env: process.env, cwd: process.cwd() })
  const discovery = await readDaemonDiscovery(scope)
  if (!discovery) {
    log('daemon 未运行（discovery=null）')
    return
  }
  const client = createClient({
    transport: { kind: 'unix', path: discovery.socketPath },
    auth: { kind: 'local' },
    journal: memoryJournal(),
    transportFactories: {
      unix: () =>
        unixTransport({
          path: discovery.socketPath,
          resolveServerIdentity: async () => ({ pid: discovery.owner.pid, processStartId: discovery.owner.processStartId }),
        }),
    },
  })
  log('initialize:', JSON.stringify(await client.initialize()))

  log('workspace.list ...')
  const wl = await client.workspace.list().catch((e) => ({ error: err(e) }))
  log('  =>', JSON.stringify(wl).slice(0, 400))

  log('workspace.add(', RUN_DIR, ') ...')
  const wa = await client.workspace.add(RUN_DIR).catch((e) => ({ error: err(e) }))
  log('  =>', JSON.stringify(wa).slice(0, 300))

  log('session.list ...')
  log('  =>', JSON.stringify(await client.session.list({}).catch((e) => ({ error: err(e) }))).slice(0, 300))

  log('session.new({cwd: runs}) ...')
  let sessionId: string
  try {
    const s = await client.session.new({ cwd: RUN_DIR })
    sessionId = s.id
    log('  => session_id =', sessionId)
  } catch (e) {
    log('  FAIL:', err(e))
    await client.close().catch(() => undefined)
    return
  }

  log('订阅事件（后台打印）...')
  const s = client.sessions.get(sessionId)!
  void (async () => {
    try {
      for await (const ev of s.events({})) {
        const e = ev as unknown as { type?: string; seq?: number; data?: unknown }
        log(`  [event] seq=${e.seq} type=${e.type}`)
      }
    } catch (e) {
      log('  事件流结束:', err(e))
    }
  })()

  log('prompt 最小指令（真实模型）...')
  try {
    const turn = await s.prompt('请只回复两个字：收到')
    log('  turn =', JSON.stringify(turn))
  } catch (e) {
    log('  prompt FAIL:', err(e))
  }
  await new Promise((r) => setTimeout(r, 1500))
  await client.close().catch(() => undefined)
  log('done')
}

main().catch((e) => {
  console.error('[spike] 未捕获:', e)
  process.exit(1)
})
