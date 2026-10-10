import type { RelayEvent, RelayEventInput } from './model.js'
import { dedupeKey } from './model.js'

/**
 * 每任务事件总线（有序 + 幂等 + 可补发）。
 *
 * 关键顺序（§5.2 强制）：**先注册订阅，再补发快照**。
 * 旧版缺陷：先补发后入集合 → 建连瞬间产生的事件永久丢失（竞态）。
 * 本实现：open() 先建立队列并记下游标；补发完成后调用 drain()，把期间缓冲的事件按序冲入队列，之后转为实时推送。
 */
export type Subscription = {
  /** 注册时刻的游标（补发用） */
  readonly cursor: number
  /**
   * 结束补发阶段：把注册期间缓冲的事件按序冲入队列，之后为实时推送。
   * @param skipTo 已在连接上直写（快照/续传）过的事件末尾 seq；这些不重复下发。
   */
  drain(skipTo?: number): RelayEvent[]
  /** 把订阅游标前移到指定 seq（丢弃 ≤ seq 的队列项），用于"快照已直写"场景 */
  skipTo(seq: number): void
  /** 取下一条事件（实时等待）；订阅关闭返回 null */
  next(timeoutMs?: number): Promise<RelayEvent | null>
  close(): void
}

type Queue = {
  cursor: number
  draining: boolean
  closed: boolean
  items: RelayEvent[]
  waiter: ((e: RelayEvent | null) => void) | null
}

const BUFFER_LIMIT = 800

class TaskChannel {
  private seq = 0
  private buffer: RelayEvent[] = []
  private queues = new Set<Queue>()
  /** 已发出的幂等键（防止重复事件二次下发，§5.2） */
  private emitted = new Set<string>()

  get lastSeq(): number {
    return this.seq
  }

  open(): { queue: Queue; cursor: number } {
    const q: Queue = { cursor: this.seq, draining: true, closed: false, items: [], waiter: null }
    this.queues.add(q)
    return { queue: q, cursor: this.seq }
  }

  publish(e: RelayEventInput, opts: { dedupe?: boolean } = {}): RelayEvent | undefined {
    if (opts.dedupe !== false) {
      const key = dedupeKey(e as RelayEvent)
      if (key) {
        if (this.emitted.has(key)) return undefined
        this.emitted.add(key)
      }
    }
    this.seq += 1
    const full = { ...(e as object), seq: this.seq, ts: e.ts ?? new Date().toISOString() } as RelayEvent
    this.buffer.push(full)
    if (this.buffer.length > BUFFER_LIMIT) this.buffer.splice(0, this.buffer.length - BUFFER_LIMIT)
    this.push(q0(full))
    return full
  }

  /** 仅入缓冲（不下发给已订阅者）：用于"快照直写本连接"（§5.2 快照不走全局广播） */
  reserve(e: RelayEventInput): RelayEvent {
    this.seq += 1
    const full = { ...(e as object), seq: this.seq, ts: e.ts ?? new Date().toISOString() } as RelayEvent
    this.buffer.push(full)
    if (this.buffer.length > BUFFER_LIMIT) this.buffer.splice(0, this.buffer.length - BUFFER_LIMIT)
    return full
  }

  /** 推送给所有订阅者（已 drain 的直接进队列；未 drain 的进缓冲，靠 drain 补） */
  private push(e: RelayEvent): void {
    for (const q of this.queues) {
      if (q.closed) {
        this.queues.delete(q)
        continue
      }
      if (!q.draining) {
        if (q.waiter) {
          const w = q.waiter
          q.waiter = null
          w(e)
        } else q.items.push(e)
      }
    }
  }

  drain(q: Queue): RelayEvent[] {
    const pending = this.buffer.filter((e) => e.seq > q.cursor)
    q.draining = false
    for (const e of pending) {
      if (q.waiter) {
        const w = q.waiter
        q.waiter = null
        w(e)
      } else q.items.push(e)
    }
    return pending
  }

  close(q: Queue): void {
    q.closed = true
    this.queues.delete(q)
    if (q.waiter) {
      const w = q.waiter
      q.waiter = null
      w(null)
    }
  }

  since(lastSeq: number): RelayEvent[] {
    return this.buffer.filter((e) => e.seq > lastSeq)
  }

  subscribers(): number {
    return this.queues.size
  }

  closeAll(): void {
    for (const q of [...this.queues]) this.close(q)
  }
}

function q0(e: RelayEvent): RelayEvent {
  return e
}

export class EventBus {
  private readonly channels = new Map<string, TaskChannel>()

  private channel(taskId: string): TaskChannel {
    let ch = this.channels.get(taskId)
    if (!ch) {
      ch = new TaskChannel()
      this.channels.set(taskId, ch)
    }
    return ch
  }

  /** ① 先注册订阅 */
  open(taskId: string): Subscription {
    const ch = this.channel(taskId)
    const { queue, cursor } = ch.open()
    return {
      cursor,
      skipTo: (seq: number): void => {
        if (seq > queue.cursor) queue.cursor = seq
        queue.items = queue.items.filter((e) => e.seq > seq)
      },
      drain: (skipTo?: number): RelayEvent[] => {
        if (skipTo !== undefined && skipTo > queue.cursor) queue.cursor = skipTo
        return ch.drain(queue)
      },
      next: async (timeoutMs = 0): Promise<RelayEvent | null> => {
        const head = queue.items.shift()
        if (head) return head
        if (queue.closed) return null
        if (timeoutMs <= 0) {
          return new Promise<RelayEvent | null>((resolve) => {
            queue.waiter = resolve
          })
        }
        return new Promise<RelayEvent | null>((resolve) => {
          const timer = setTimeout(() => {
            if (queue.waiter) queue.waiter = null
            resolve(null)
          }, timeoutMs)
          queue.waiter = (e) => {
            clearTimeout(timer)
            resolve(e)
          }
        })
      },
      close: () => ch.close(queue),
    }
  }

  publish(taskId: string, e: RelayEventInput, opts: { dedupe?: boolean } = {}): RelayEvent | undefined {
    return this.channel(taskId).publish(e, opts)
  }

  /** 快照直写用：只入缓冲（供 Last-Event-ID 续传），不下发给其他订阅者 */
  reserve(taskId: string, e: RelayEventInput): RelayEvent {
    return this.channel(taskId).reserve(e)
  }

  since(taskId: string, lastSeq: number): RelayEvent[] {
    return this.channel(taskId).since(lastSeq)
  }

  lastSeq(taskId: string): number {
    return this.channel(taskId).lastSeq
  }

  subscribers(taskId: string): number {
    return this.channel(taskId).subscribers()
  }

  close(taskId: string): void {
    this.channel(taskId).closeAll()
  }
}
