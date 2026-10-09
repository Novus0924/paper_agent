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

export type TurnResult = {
  stopReason: string
  reason: string
  lastSeq: number
  credits?: { used: number; source: string }
}

export interface Session {
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
  onPermissionRequest(handler: (req: unknown) => unknown): () => void
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
