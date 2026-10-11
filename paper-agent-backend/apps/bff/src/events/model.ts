/**
 * 归一事件模型（需求文档 §5.1 事件目录，字段与命名**不得自创**）。
 *
 * 有序（§5.2）：每条事件带单调递增 seq（同任务内），SSE 按序下发；
 * 幂等（§5.2）：step/tool/conclusion/message 以稳定 ID 去重合并，终态/终步重复事件安全；
 * 可恢复（§5.2）：先注册订阅再补发快照，支持 Last-Event-ID 续传。
 */

export type EventType =
  | 'ping'
  | 'step'
  | 'activity'
  | 'tool'
  | 'degraded'
  | 'conclusion'
  | 'message'
  | 'report'
  | 'done'

export type RelayEvent = {
  type: EventType
  /** 单调序号（同任务内递增；SSE 的 id 字段，用于 Last-Event-ID） */
  seq: number
  ts: string
  /** 幂等去重键（ping/done 无需去重，缺省即不去重） */
  id?: string
} & (
  | { type: 'ping' }
  | { type: 'step'; step: string; status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'SKIPPED'; elapsed_ms?: number; error?: string }
  | { type: 'activity'; step: string; human_message: string; detail?: unknown }
  | {
      type: 'tool'
      step: string
      tool: string
      status: 'running' | 'ok' | 'error'
      input?: unknown
      output?: unknown
      sources_status?: Record<string, string>
    }
  | { type: 'degraded'; level: 'info' | 'degraded'; source: string; reason: string; impact: string; resumable: boolean; step: string }
  | { type: 'conclusion'; cid: string; text: string; evidence_ids: string[] }
  | { type: 'message'; turn_id: string; role: 'assistant' | 'user'; text?: string; delta?: string; status: 'running' | 'done' }
  | { type: 'report'; task_id: string; status: 'ready' | 'generating' }
  | { type: 'done'; run_status: 'DONE' | 'FAILED'; report_ready: boolean; error?: string }
)

/** 幂等键（§5.2：step/tool/conclusion/message 以稳定 ID 合并） */
export function dedupeKey(e: RelayEvent): string | undefined {
  switch (e.type) {
    case 'step':
      return `step:${e.step}:${e.status}`
    case 'tool':
      return `tool:${e.step}:${e.id ?? ''}:${e.status}`
    case 'conclusion':
      return `conclusion:${e.cid}`
    case 'degraded':
      return `degraded:${e.level}:${e.source}:${e.reason}:${e.step}`
    case 'message':
      return `message:${e.turn_id}:${e.role}:${e.status}`
    case 'report':
      // 报告状态变化才发（否则每个 AGH 事件都会重复推一条 report）
      return `report:${e.status}`
    case 'activity':
      // 活动描述允许重复（人读消息），但同一 seq 只发一次
      return undefined
    default:
      return undefined
  }
}

/**
 * 发布入参：对联合类型做**分布式** Omit（直接 `Omit<RelayEvent, 'seq'|'ts'>` 会退化成
 * 只保留公共字段，导致各分支的专属字段被判为"未知属性"）。
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type RelayEventInput = DistributiveOmit<RelayEvent, 'seq' | 'ts'> & { ts?: string }
