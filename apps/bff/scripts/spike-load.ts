// 验证：会话 load（reattach 恢复路径）+ 历史事件可读
// 用法: npx tsx scripts/spike-load.ts "<session_id>"
import { readDaemonDiscovery, resolveDaemonScope } from '@agnes/daemon'
import { createClient, memoryJournal, unixTransport } from '@agnes/sdk'

const SID = process.argv[2] ?? ''
const RUN_DIR = process.argv[3] ?? 'D:/workBubbyStore/paper-agent-2/runs'

async function main() {
  const scope = await resolveDaemonScope({ env: process.env, cwd: 'D:/workBubbyStore/paper-agent-2' })
  const d = await readDaemonDiscovery(scope)
  if (!d) {
    console.log('[load] daemon 未运行')
    return
  }
  const socketPath = d.socketPath
  const owner = d.owner
  const c = createClient({
    transport: { kind: 'unix', path: socketPath },
    auth: { kind: 'local' },
    journal: memoryJournal(),
    transportFactories: {
      unix: () =>
        unixTransport({
          path: socketPath,
          resolveServerIdentity: async () => ({ pid: owner.pid, processStartId: owner.processStartId }),
        }),
    },
  })
  await c.initialize()
  try {
    // 实测：load 与 new 一样要求 cwd 已注册为工作区（否则 SEMANTIC_REJECTED）
    await c.workspace.add(RUN_DIR).catch(() => undefined)
    const s = await c.session.load(SID, { cwd: RUN_DIR })
    console.log('[load] OK id=', s.id, 'lastServerSeq=', s.lastServerSeq)
    const types: string[] = []
    const it = s.events({})[Symbol.asyncIterator]()
    for (let i = 0; i < 500; i++) {
      const n = await Promise.race([
        it.next(),
        new Promise<{ done: true; value: undefined }>((r) => setTimeout(() => r({ done: true, value: undefined }), 400)),
      ])
      if (n.done) break
      types.push((n.value as unknown as { type: string }).type)
    }
    await it.return?.(undefined as never)
    console.log('[load] 历史事件数=', types.length, '前 3 =', types.slice(0, 3).join(','))
  } catch (e) {
    const x = e as { code?: unknown; message?: string }
    console.log('[load] FAIL:', String(x.code), x.message)
  }
  await c.close()
}

main().catch((e) => {
  console.error('[load] 未捕获:', e)
  process.exit(1)
})
