import {
  createClient,
  memoryJournal,
  unixTransport,
  type Client,
  type Session,
} from '@agnes/sdk'
import { readDaemonDiscovery, resolveDaemonScope, type DaemonScope } from '@agnes/daemon'
import type { Logger } from '../infra/logger.js'
import { ApiError } from '../infra/errors.js'

/**
 * Session Gateway（BE-04，端口 + AGH 适配器）：
 * - 唯一执行出口：所有任务执行经 AGH 会话，BFF 不直接 spawn 领域进程（红线，P-04/P-06）；
 * - 经 @agnes/sdk 连接本地 daemon（Windows 命名管道 + local 免 token 鉴权，与 AGH CLI 同路径）；
 * - Task ↔ Session 1:1：session.new 建立、session.load 附加恢复；
 * - 严禁修改 AGH 源码：本适配器对 AGH 仓库只读。
 */

export type GatewayStatus = {
  connected: boolean
  agnesVersion: string | undefined
  socketPath: string | undefined
  sessionsOpen: number
  error: string | undefined
}

export type SessionEvents = {
  sessionId: string
  taskId: string
}

export class AgnesGateway {
  private client: Client | null = null
  private scope: DaemonScope | null = null
  private socketPath: string | null = null
  private readonly log: Logger
  /** task_id → AGH Session 句柄（进程内缓存；磁盘映射在任务索引，重启后 load 重建） */
  private readonly sessions = new Map<string, Session>()

  constructor(log: Logger) {
    this.log = log.child({ component: 'agnes-gateway' })
  }

  /** 解析 daemon 发现信息（每次连接时刷新，trusted identity 不缓存过期值） */
  private async discover(): Promise<{ scope: DaemonScope; socketPath: string; owner: { pid: number; processStartId: string } }> {
    const scope = await resolveDaemonScope({ env: process.env, cwd: process.cwd() })
    const discovery = await readDaemonDiscovery(scope)
    if (!discovery) {
      throw ApiError.sessionError('未找到运行中的 AGH daemon 发现文件')
    }
    return {
      scope,
      socketPath: discovery.socketPath,
      owner: { pid: discovery.owner.pid, processStartId: discovery.owner.processStartId },
    }
  }

  /** 连接 daemon 并完成握手。幂等：已连接则直接返回。 */
  async connect(): Promise<void> {
    if (this.client && this.client.connectionState === 'connected') return
    const { scope, socketPath } = await this.discover()
    this.scope = scope
    this.socketPath = socketPath
    this.log.info('连接 AGH daemon', { socketPath: redactPipe(socketPath) })
    const client = createClient({
      transport: { kind: 'unix', path: socketPath },
      auth: { kind: 'local' },
      journal: memoryJournal(),
      transportFactories: {
        // 与 AGH CLI 相同的本地管道工厂：每次尝试刷新可信身份
        unix: () => {
          const path = socketPath
          return unixTransport({
            path,
            resolveServerIdentity: async () => {
              // 每次连接尝试都重新读取发现文件，不缓存过期 pid（与 AGH CLI 行为一致）
              const fresh = await readDaemonDiscovery(scope)
              if (!fresh || fresh.socketPath !== path) {
                throw new Error('local pipe does not match a verified daemon')
              }
              return { pid: fresh.owner.pid, processStartId: fresh.owner.processStartId }
            },
          })
        },
      },
    })
    const info = await client.initialize()
    this.client = client
    this.agnesVersion = info.agnesVersion
    this.log.info('AGH daemon 握手完成', { agnesVersion: info.agnesVersion })
  }

  /** 健康状态（不做重连，探测当前连接态） */
  status(): GatewayStatus {
    const c = this.client
    if (!c) {
      return { connected: false, agnesVersion: undefined, socketPath: undefined, sessionsOpen: 0, error: '尚未连接' }
    }
    const connected = c.connectionState === 'connected'
    return {
      connected,
      agnesVersion: connected ? this.agnesVersion : undefined,
      socketPath: this.socketPath ?? undefined,
      sessionsOpen: this.sessions.size,
      error: connected ? undefined : `连接状态：${c.connectionState}`,
    }
  }

  private agnesVersion: string | undefined
  /** 已注册工作区（避免重复 workspace.add；AGH 要求 cwd 必须先注册，否则 SEMANTIC_REJECTED） */
  private readonly registeredWorkspaces = new Set<string>()

  /** 确保 cwd 已注册为 AGH 工作区（实测：未注册时 session.new 返回 SEMANTIC_REJECTED） */
  private async ensureWorkspace(cwd: string): Promise<void> {
    const norm = cwd.replace(/\\/g, '/')
    if (this.registeredWorkspaces.has(norm)) return
    await this.client!.workspace.add(cwd)
    this.registeredWorkspaces.add(norm)
  }

  /** 为任务新建 AGH 会话（Task↔Session 1:1 起点） */
  async createSession(taskId: string, cwd: string): Promise<string> {
    await this.connect()
    const client = this.client!
    await this.ensureWorkspace(cwd)
    const session = await client.session.new({ cwd })
    this.sessions.set(taskId, session)
    this.log.info('已创建 AGH 会话', { taskId, sessionId: session.id })
    return session.id
  }

  /** 附加（reattach）已有会话：BFF 重启后凭映射恢复（P-04 可恢复约束） */
  async attachSession(taskId: string, sessionId: string, cwd: string): Promise<Session> {
    await this.connect()
    const client = this.client!
    const cached = this.sessions.get(taskId)
    if (cached && cached.id === sessionId) return cached
    await this.ensureWorkspace(cwd)
    const session = await client.session.load(sessionId, { cwd })
    this.sessions.set(taskId, session)
    this.log.info('已附加 AGH 会话', { taskId, sessionId })
    return session
  }

  getCachedSession(taskId: string): Session | undefined {
    return this.sessions.get(taskId)
  }

  /** 发一轮指令（经会话；BFF 不直接执行任何领域进程） */
  async prompt(taskId: string, sessionId: string, cwd: string, text: string): Promise<{ reason: string; lastSeq: number }> {
    const session = await this.attachSession(taskId, sessionId, cwd)
    const turn = await session.prompt(text)
    return { reason: turn.reason, lastSeq: turn.lastSeq }
  }

  /** 会话列表（核对 Task↔Session 映射可查证；P-04 验收：sessions 可查到记录） */
  async listSessions(): Promise<unknown> {
    await this.connect()
    return this.client!.session.list({})
  }

  /**
   * 采集会话的原始账本事件（AGH 原生导出路径：attach + events 迭代，见 AGH CLI export 实现）。
   * M7 导出服务据此生成"会话轨迹"文件；不绕过 AGH，不修改其源码。
   */
  async collectRawEvents(
    sessionId: string,
    opts: { maxEvents?: number; timeoutMs?: number } = {},
  ): Promise<Array<{ seq: number; type: string; data: unknown }>> {
    await this.connect()
    const client = this.client!
    const session = await client.session.attach(sessionId)
    const out: Array<{ seq: number; type: string; data: unknown }> = []
    const max = opts.maxEvents ?? 5000
    const deadline = Date.now() + (opts.timeoutMs ?? 15000)
    const iterator = session.events({ types: undefined })[Symbol.asyncIterator]()
    try {
      for (;;) {
        if (out.length >= max || Date.now() > deadline) break
        const next = await Promise.race([
          iterator.next(),
          new Promise<{ done: true; value: undefined }>((r) => setTimeout(() => r({ done: true, value: undefined }), 400)),
        ])
        if (next.done) break
        const ev = next.value as unknown as { seq: number; type: string; data?: unknown }
        out.push({ seq: ev.seq, type: ev.type, data: ev.data ?? ev })
      }
    } finally {
      await iterator.return?.(undefined as never).catch(() => undefined)
    }
    return out
  }

  /** 原始 RPC 调用（供后续里程碑的协议扩展用；不在业务层直接使用） */
  async rawCall(method: string, params: Record<string, unknown>): Promise<unknown> {
    await this.connect()
    const rpc = this.client as unknown as {
      call: (method: string, params: Record<string, unknown>) => Promise<unknown>
    }
    return rpc.call(method, params)
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close().catch(() => undefined)
      this.client = null
      this.sessions.clear()
      this.registeredWorkspaces.clear()
    }
  }
}

function redactPipe(path: string): string {
  // 管道名本身不含密钥，但保持日志整洁：只保留 pipe 名
  return path.replace(/^\\\\\.\\pipe\\/, 'pipe:')
}
