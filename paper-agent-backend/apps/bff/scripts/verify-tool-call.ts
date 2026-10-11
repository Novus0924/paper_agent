/**
 * S4 决定性验证：新开 AGH 会话 → 模型真实调用 sciret_* 工具 → 核对工具记录。
 *
 * 这是 P-04/P-06 的核心证据：领域能力确实由 AGH 会话中的模型调用触发，
 * 而不是 BFF 直接 spawn 内核（红线：执行不得绕过 AGH）。
 *
 * 用法：需 daemon 已由项目根启动且带 PAPER_AGENT_* 环境变量
 *   npx tsx scripts/verify-tool-call.ts [run_dir]
 */

import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { readDaemonDiscovery, resolveDaemonScope } from '@agnes/daemon'
import { createClient, memoryJournal, unixTransport, type Client, type Session } from '@agnes/sdk'

const PROJECT_ROOT = resolve(process.env['PAPER_AGENT_ROOT'] ?? 'D:/workBubbyStore/paper-agent-2')
const RUN_DIR = resolve(process.argv[2] ?? resolve(PROJECT_ROOT, 'runs/verify-toolcall'))

const log = (...a: unknown[]) => console.log('[verify]', ...a)

async function connect(): Promise<Client> {
  const scope = await resolveDaemonScope({ env: process.env, cwd: PROJECT_ROOT })
  const d = await readDaemonDiscovery(scope)
  if (!d) throw new Error('AGH daemon 未运行：请先 bash agh.sh daemon start')
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
            if (!fresh || fresh.socketPath !== path) throw new Error('pipe identity mismatch')
            return { pid: fresh.owner.pid, processStartId: fresh.owner.processStartId }
          },
        }),
    },
  })
  const info = await client.initialize()
  log('daemon 已连接：', JSON.stringify(info))
  return client
}

async function main() {
  mkdirSync(RUN_DIR, { recursive: true })
  const client = await connect()

  await client.workspace.add(RUN_DIR)
  const session: Session = await client.session.new({ cwd: RUN_DIR })
  log('新会话已创建：', session.id)

  const events: Array<{ seq: number; type: string; data: unknown }> = []
  void (async () => {
    try {
      for await (const ev of session.events({})) {
        const e = ev as unknown as { seq: number; type: string; data?: unknown; _meta?: unknown }
        events.push({ seq: e.seq, type: e.type, data: e.data })
      }
    } catch {
      /* 会话关闭时结束 */
    }
  })()

  const prompt = [
    '请使用工具完成一次内核自检：',
    `1) 调用 sciret_ping，参数 run_dir="${RUN_DIR}"；`,
    '2) 把返回的 kernel_version 原样告诉我。',
    '必须真正调用该工具，不要凭空回答。',
  ].join('\n')

  log('发送指令（等待模型回合）…')
  const turn = await session.prompt(prompt)
  log('回合结束：', JSON.stringify(turn))

  await new Promise((r) => setTimeout(r, 1500))

  // 证据 1：工具调用事件（AGH 原生事件词汇）
  const toolEvents = events.filter((e) => /tool|effect|request/i.test(e.type))
  log(`\n=== 事件类型统计（共 ${events.length} 条） ===`)
  const counts = new Map<string, number>()
  for (const e of events) counts.set(e.type, (counts.get(e.type) ?? 0) + 1)
  for (const [type, n] of [...counts.entries()].sort()) log(`  ${type} × ${n}`)

  log('\n=== 工具相关事件（前 8 条） ===')
  for (const e of toolEvents.slice(0, 8)) {
    log(`  seq=${e.seq} ${e.type} ${JSON.stringify(e.data).slice(0, 300)}`)
  }

  // 证据 2：内核产物是否被真实写出（run 目录内容）
  const { readdirSync, existsSync } = await import('node:fs')
  log('\n=== run 目录产物 ===')
  log(existsSync(RUN_DIR) ? readdirSync(RUN_DIR).join(', ') : '(目录不存在)')

  const sawSciret = events.some((e) => /sciret/i.test(JSON.stringify(e.data ?? '')))
  log(`\n结论：${sawSciret ? '✅ 事件流中出现 sciret 工具调用' : '⚠️ 未在事件流中捕获 sciret 工具调用（需人工核对上方事件）'}`)
  log(`会话 id（可导出核查）：${session.id}`)

  await client.close()
  process.exit(sawSciret ? 0 : 1)
}

main().catch((e) => {
  console.error('[verify] 失败:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
