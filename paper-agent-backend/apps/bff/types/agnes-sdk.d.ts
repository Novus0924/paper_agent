/**
 * @agnes/sdk 最小类型声明。
 *
 * 约定（见 apps/bff/src/agh/gateway.ts）：
 *   - 运行期：经 pnpm `link:` 使用 D:/agnes-harness-main 的真实包（只读引用，绝不修改 AGH 源码）；
 *   - 类型期：用本文件，避免把 AGH 整个 monorepo 的 TS 源码拉进本项目 tsc program；
 *   - 契约保障：test/contract.test.ts 在运行期校验这些接口真实存在，防 AGH 升级后静默漂移。
 */

export type SessionEventRecord = {
  seq: number
  type: string
  data?: unknown
  [k: string]: unknown
}

/** 预览流载荷（`_agnes/v1/session.preview`）：流式文本增量，无 seq、只有 offset。 */
export type SessionPreviewParams = {
  sessionId: string
  lane: string
  effectId: string
  stream: 'text' | 'thinking'
  offset: number
  delta: string
}

/** `PreviewMerger.add` 接受的形状（sessionId 可省）。 */
export type Preview = Omit<SessionPreviewParams, 'sessionId'> & { sessionId?: string }

/**
 * 思考/正文预览的增量合并器（官方实现，见 AGH preview-merger.ts）：
 * 按 offset 裁剪重复/重叠、缓存乱序片段，只暴露单调增长的文本。
 */
export declare class PreviewMerger {
  add(p: Preview): boolean
  text(effectId: string): { text: string; thinking: string; capped: boolean } | undefined
  finish(effectId: string): void
  reset(): void
  apply<T extends { nodes: unknown[] }>(timeline: T): T
}

export type TurnResult = {
  stopReason: string
  reason: string
  lastSeq: number
  credits?: { used: number; source: string }
}

export declare class Session {
  readonly id: string
  readonly client: unknown
  readonly lastSeq: number
  readonly lastServerSeq: number
  readonly attached: boolean
  readonly closed: boolean
  attach(opts?: { cursor?: { fromSeq: number; generation: number } }): Promise<void>
  detach(): Promise<void>
  prompt(input: string | unknown[], opts?: { signal?: AbortSignal }): Promise<TurnResult>
  steer(input: string | unknown[], opts?: { commandId?: string }): Promise<number>
  followUp(input: string | unknown[], opts?: { commandId?: string }): Promise<number>
  cancel(): Promise<void>
  events(opts?: { types?: string[]; lanes?: string[]; preview?: boolean }): AsyncIterable<SessionEventRecord>
  /** 订阅预览流（需以 `events({ preview: true })` 附加）：thinking 文本的唯一载体。返回取消订阅函数。 */
  onPreview(fn: (p: SessionPreviewParams) => void): () => void
  onPermissionRequest(handler: (req: unknown) => Promise<{ optionId?: string; verdict?: 'allowed-once' | 'allowed-session' | 'allowed-permanent' | 'rejected' }> | { optionId?: string; verdict?: string }): () => void
  flushCursor(): Promise<void>
}

export interface Client {
  readonly connectionState: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'
  readonly isClosed: boolean
  readonly sessions: ReadonlyMap<string, Session>
  readonly journal: { cursor(sessionId: string): Promise<unknown> }
  initialize(): Promise<{ agnesVersion: string; capabilities: Record<string, unknown> }>
  close(): Promise<void>
  call<T = unknown>(method: string, params: Record<string, unknown>, opts?: Record<string, unknown>): Promise<T>
  session: {
    /** 注意：`new` 是关键字，需加引号声明为方法而非构造签名 */
    'new'(o: { cwd: string; preset?: string; sessionKey?: string }): Promise<Session>
    load(id: string, o?: { cwd?: string }): Promise<Session>
    attach(id: string, o?: Record<string, unknown>): Promise<Session>
    list(o?: { limit?: number; cursor?: string }): Promise<unknown>
    rename(sessionId: string, title: string): Promise<unknown>
  }
  workspace: {
  add(path: string): Promise<unknown>
    list(): Promise<{ items: Array<{ path: string }> }>
  }
  /**
   * 包管理（插件安装/信任/启用）。
   *
   * 运行时已实测可用（apps/bff/scripts/install-plugin.ts 靠它完成安装→信任→启用→终验），
   * 且 test/contract.test.ts 会在运行期校验这些方法真实存在——
   * 即"声明与运行期一致性"由测试保障，不是靠我这份手写声明自说自话。
   *
   * 参数形状保持宽松（Record/未知），因为 AGH 可能增删字段；
   * 一旦需要精确类型，应从 AGH 的真实 .d.ts 派生而不是在这里猜。
   */
  packages: {
    list(o?: Record<string, unknown>): Promise<unknown>
    /** 查看来源信息（安装前确认 source 形状，脚本用它做终验） */
    inspect(o: Record<string, unknown>): Promise<Record<string, unknown>>
    /** 安装（等价于 Web「从来源安装」通道） */
    install(o: Record<string, unknown>): Promise<{ operationId?: string; state?: string; [k: string]: unknown }>
    remove(o: Record<string, unknown>): Promise<{ operationId?: string; state?: string; [k: string]: unknown }>
    trust(o: Record<string, unknown>): Promise<{ operationId?: string; state?: string; [k: string]: unknown }>
    enable(o: Record<string, unknown>): Promise<{ operationId?: string; state?: string; [k: string]: unknown }>
    disable(o: Record<string, unknown>): Promise<{ operationId?: string; state?: string; [k: string]: unknown }>
    status?(o?: Record<string, unknown>): Promise<unknown>
    operation: {
      get(o: { profile?: string; operationId?: string; clientId?: string }): Promise<{
        state?: string
        progress?: number
        error?: string
        result?: unknown
      }>
    }
  }
  /** daemon 分配的客户端标识（包管理调用必须带它做审计归属） */
  clientId(): Promise<string>
}

export type TransportOption =
  | { kind: 'unix'; path: string; serverIdentity?: { pid: number; processStartId: string } }
  | { kind: 'ws'; url: string; protocols?: string[] }
  | { kind: 'stdio'; cmd: string[]; cwd?: string; env?: Record<string, string> }

export type CreateClientOptions = {
  transport: TransportOption
  auth?: { kind: 'local' } | { kind: 'jwt'; token: string }
  clientId?: string
  journal?: unknown
  bufferLimit?: number
  transportFactories?: Partial<Record<string, (opt: TransportOption) => unknown>>
}

export function createClient(opts: CreateClientOptions): Client
export function memoryJournal(): unknown
export function unixTransport(opts: {
  path: string
  resolveServerIdentity?: () => Promise<{ pid: number; processStartId: string }>
}): unknown
export function wsTransport(opts: Record<string, unknown>): unknown
