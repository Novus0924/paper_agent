import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EventRelay } from '../src/events/relay.js'
import { TaskIndex } from '../src/store/task-index.js'
import { createLogger } from '../src/infra/logger.js'
import type { AgnesGateway } from '../src/agh/gateway.js'
import type { RelayEvent } from '../src/events/model.js'

/**
 * 思考流接线验收（v2.4）。
 *
 * 取证结论（真实会话原始事件 + AGH 源码）：
 *  - 账本行 `assistant/output` 只有 `chars:{text,thinking}` **计数**，不含思考文本；
 *  - 「思考文本」的唯一载体是 AGH 原生**预览流** `_agnes/v1/session.preview`（stream='thinking'，
 *    载荷 `{ lane, effectId, stream, offset, delta }`）。它随流式增量到达、可能重复/丢帧，
 *    故用官方 `PreviewMerger` 做偏移对齐后，只把**新增片段**归一出帧。
 *  - 无思考内容（当前部署模型 thinking=0）时**不发帧**，绝不硬造。
 *
 * 同时把 `turn/start|end`、`step/start|end` 生命周期接为人类可读 `activity` 增强。
 */

const TASK_ID = 'run-20261012-100000-relay01'
const SESSION_ID = 'agnes:local:local-dev:cli:workspace:relayhash'
const log = createLogger('error')

/** 可控假会话：可推原始账本事件 + 触发预览回调 */
function makeSession() {
  const queue: Array<{ seq: number; type: string; data: unknown }> = []
  let waiter: ((v: { seq: number; type: string; data: unknown }) => void) | null = null
  let previewHandler: ((p: Record<string, unknown>) => void) | null = null
  const session = {
    id: SESSION_ID,
    onPreview(fn: (p: Record<string, unknown>) => void) {
      previewHandler = fn
      return () => {
        previewHandler = null
      }
    },
    events() {
      return {
        [Symbol.asyncIterator]() {
          return {
            next(): Promise<{ value: unknown; done: boolean }> {
              if (queue.length > 0) return Promise.resolve({ value: queue.shift(), done: false })
              return new Promise((resolve) => {
                waiter = (v) => resolve({ value: v, done: false })
              })
            },
            return: () => Promise.resolve({ value: undefined, done: true }),
          }
        },
      }
    },
  }
  return {
    session,
    pushEvent(raw: { seq: number; type: string; data: unknown }) {
      if (waiter) {
        const w = waiter
        waiter = null
        w(raw)
      } else queue.push(raw)
    },
    pushPreview(p: Record<string, unknown>) {
      previewHandler?.(p)
    },
    get previewRegistered() {
      return previewHandler !== null
    },
  }
}

let tmp: string
let index: TaskIndex
let relay: EventRelay
let harness: ReturnType<typeof makeSession>

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 15))

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'paper-relay-'))
  index = new TaskIndex(join(tmp, 'data'), log)
  index.put({
    task_id: TASK_ID,
    goal: '思考流接线',
    workflow: 'research',
    lit_source: 'local',
    sources: [],
    run_status: 'RUNNING',
    degraded: false,
    degraded_reasons: [],
    session_id: SESSION_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [],
  })
  harness = makeSession()
  const gateway = { attachSession: async () => harness.session } as unknown as AgnesGateway
  relay = new EventRelay(gateway, index, join(tmp, 'runs'), log)
  relay.start(TASK_ID, SESSION_ID, join(tmp, 'runs', TASK_ID))
  await tick() // 等事件泵附加 + 注册预览监听
})

afterEach(() => {
  relay.stop(TASK_ID)
  rmSync(tmp, { recursive: true, force: true })
})

function frames(): RelayEvent[] {
  return relay.events.since(TASK_ID, 0)
}
function ofType(t: RelayEvent['type']): RelayEvent[] {
  return frames().filter((e) => e.type === t)
}

describe('思考流接线 · preview → thinking', () => {
  it('订阅了 AGH 原生预览流（thinking 文本唯一载体）', () => {
    expect(harness.previewRegistered).toBe(true)
  })

  it('思考增量 → 归一为 thinking 帧，text 为新增片段', async () => {
    harness.pushPreview({ sessionId: SESSION_ID, lane: 'main', effectId: 'e1', stream: 'thinking', offset: 0, delta: '先看目标' })
    await tick()
    const th = ofType('thinking')
    expect(th).toHaveLength(1)
    expect(th[0]).toMatchObject({ type: 'thinking', text: '先看目标' })
    expect(typeof (th[0] as { seq: number }).seq).toBe('number')
    expect(typeof (th[0] as { ts: string }).ts).toBe('string')
  })

  it('流式增量合并：连续 delta 只下发各自新增片段', async () => {
    harness.pushPreview({ sessionId: SESSION_ID, lane: 'main', effectId: 'e1', stream: 'thinking', offset: 0, delta: 'abc' })
    harness.pushPreview({ sessionId: SESSION_ID, lane: 'main', effectId: 'e1', stream: 'thinking', offset: 3, delta: 'def' })
    await tick()
    expect(ofType('thinking').map((e) => (e as { text: string }).text)).toEqual(['abc', 'def'])
  })

  it('重复/重叠的预览被裁剪，不重复下发（PreviewMerger 对齐偏移）', async () => {
    harness.pushPreview({ sessionId: SESSION_ID, lane: 'main', effectId: 'e1', stream: 'thinking', offset: 0, delta: 'hello' })
    // 快照与其覆盖的增量重叠：offset 0 + 'hello' 全部已说过 → 不产生新片段
    harness.pushPreview({ sessionId: SESSION_ID, lane: 'main', effectId: 'e1', stream: 'thinking', offset: 0, delta: 'hello' })
    await tick()
    expect(ofType('thinking')).toHaveLength(1)
  })

  it('空内容不发送（不发空帧）', async () => {
    harness.pushPreview({ sessionId: SESSION_ID, lane: 'main', effectId: 'e1', stream: 'thinking', offset: 0, delta: '' })
    await tick()
    expect(ofType('thinking')).toHaveLength(0)
  })

  it('非 thinking 流（正式回答 text）不产生 thinking 帧', async () => {
    harness.pushPreview({ sessionId: SESSION_ID, lane: 'main', effectId: 'e1', stream: 'text', offset: 0, delta: '正式回答' })
    await tick()
    expect(ofType('thinking')).toHaveLength(0)
  })

  it('不同 effectId 的思考各自独立成帧（不串流）', async () => {
    harness.pushPreview({ sessionId: SESSION_ID, lane: 'main', effectId: 'e1', stream: 'thinking', offset: 0, delta: 'A' })
    harness.pushPreview({ sessionId: SESSION_ID, lane: 'main', effectId: 'e2', stream: 'thinking', offset: 0, delta: 'B' })
    await tick()
    expect(ofType('thinking').map((e) => (e as { text: string }).text)).toEqual(['A', 'B'])
  })
})

describe('生命周期 activity（人类可读过程可见）', () => {
  it('turn/start → activity「回合开始」', async () => {
    harness.pushEvent({ seq: 6, type: 'turn/start', data: { turn: 1, trigger: 'prompt' } })
    await tick()
    const act = ofType('activity')
    expect(act.some((e) => (e as { human_message: string }).human_message.includes('回合 1 开始'))).toBe(true)
  })

  it('step/start 与 step/end → activity「第 N 步开始/结束」', async () => {
    harness.pushEvent({ seq: 11, type: 'step/start', data: { turn: 1, step: 2 } })
    harness.pushEvent({ seq: 25, type: 'step/end', data: { turn: 1, step: 2 } })
    await tick()
    const msgs = ofType('activity').map((e) => (e as { human_message: string }).human_message)
    expect(msgs.some((m) => m.includes('第 2 步开始'))).toBe(true)
    expect(msgs.some((m) => m.includes('第 2 步结束'))).toBe(true)
  })

  it('turn/end → activity「回合结束（reason）」', async () => {
    harness.pushEvent({ seq: 75, type: 'turn/end', data: { reason: 'completed', lastAssistantSeq: 70 } })
    await tick()
    const msgs = ofType('activity').map((e) => (e as { human_message: string }).human_message)
    expect(msgs.some((m) => m.includes('回合结束') && m.includes('completed'))).toBe(true)
  })
})

describe('assistant 回复文本外送（v2.4：供消息服务落盘）', () => {
  it('assistant/message 有文本 → 触发 onAssistantReply（内容一致）；空文本不触发', async () => {
    const seen: Array<{ taskId: string; text: string }> = []
    relay.onAssistantReply = (taskId, text) => seen.push({ taskId, text })
    harness.pushEvent({ seq: 16, type: 'assistant/message', data: { content: [], stopReason: 'tool_use', requestSeq: 15 } })
    harness.pushEvent({
      seq: 70,
      type: 'assistant/message',
      data: { content: [{ type: 'text', text: '本轮结论如下' }], stopReason: 'end_turn', requestSeq: 69 },
    })
    await tick()
    expect(seen).toEqual([{ taskId: TASK_ID, text: '本轮结论如下' }])
  })
})

/**
 * P2 修复验收：终态任务 Agent Trace/研究过程为空、无耗时。
 *
 * 病灶：`snapshot()` 只下发 ping/step/degraded/conclusion/report/done，**不含 activity/tool**；
 * 且过程帧无落盘 → 终态任务重访（换页/重启后内存缓冲为空）时 Trace 恒空、每步无耗时。
 * 修复：过程帧 append 落盘 `runs/<task_id>/trace.jsonl`（滚动上限）；步骤 RUNNING→DONE 记耗时；
 * 终态任务快照从 trace 回放 activity/tool 并回填 step elapsed_ms。
 */
describe('过程帧持久化 · trace.jsonl（P2 修复）', () => {
  const runDir = (): string => join(tmp, 'runs', TASK_ID)
  const traceFile = (): string => join(runDir(), 'trace.jsonl')
  const traceLines = (): RelayEvent[] => {
    if (!existsSync(traceFile())) return []
    const out: RelayEvent[] = []
    for (const l of readFileSync(traceFile(), 'utf8').split('\n')) {
      if (!l.trim()) continue
      try {
        out.push(JSON.parse(l) as RelayEvent)
      } catch {
        /* 裁剪窗口内可能读到半截行，忽略 */
      }
    }
    return out
  }
  const waitTraceCount = async (n: number): Promise<void> => {
    const deadline = Date.now() + 3000
    while (traceLines().length < n && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5))
    }
  }

  it('activity/tool 实时帧 append 落盘到 trace.jsonl', async () => {
    harness.pushEvent({ seq: 6, type: 'turn/start', data: { turn: 1, trigger: 'prompt' } })
    harness.pushEvent({ seq: 9, type: 'tool/call', data: { name: 'sciret_run_all', toolUseId: 'tu1', args: {} } })
    await tick()
    const types = traceLines().map((e) => e.type)
    expect(types).toContain('activity')
    expect(types).toContain('tool')
  })

  it('非过程帧（message/report/ping）不落 trace', async () => {
    harness.pushEvent({
      seq: 70,
      type: 'assistant/message',
      data: { content: [{ type: 'text', text: '回复' }], requestSeq: 69 },
    })
    await tick()
    const types = traceLines().map((e) => e.type)
    expect(types).not.toContain('message')
    expect(types).not.toContain('report')
    expect(types).not.toContain('ping')
  })

  it('超过滚动上限即裁剪，只保留最近 500 条', async () => {
    const total = 520
    for (let i = 0; i < total; i++) {
      harness.pushEvent({ seq: 1000 + i, type: 'tool/call', data: { name: `t${i}`, toolUseId: `tu${i}`, args: {} } })
    }
    await waitTraceCount(500)
    await tick()
    const lines = traceLines()
    expect(lines.length).toBe(500)
    // 保留的是最近的：末条应为 t519
    expect(lines.at(-1)).toMatchObject({ type: 'tool', tool: `t${total - 1}` })
  })

  it('终态任务快照回放 trace 的 activity/tool（Trace 非空）', async () => {
    harness.pushEvent({ seq: 6, type: 'turn/start', data: { turn: 1, trigger: 'prompt' } })
    harness.pushEvent({ seq: 9, type: 'tool/call', data: { name: 'sciret_run_all', toolUseId: 'tu1', args: {} } })
    await tick()
    const t = index.get(TASK_ID)!
    t.run_status = 'DONE'
    index.put(t)
    const snap = relay.snapshot(TASK_ID)
    expect(snap.filter((e) => e.type === 'activity').length).toBeGreaterThan(0)
    expect(snap.filter((e) => e.type === 'tool').length).toBeGreaterThan(0)
  })

  it('BFF 重启（新 relay、内存缓冲为空）后终态快照仍从 trace 回放', async () => {
    harness.pushEvent({ seq: 6, type: 'turn/start', data: { turn: 1, trigger: 'prompt' } })
    await tick()
    relay.stop(TASK_ID)
    const t = index.get(TASK_ID)!
    t.run_status = 'DONE'
    index.put(t)
    const gateway2 = { attachSession: async () => harness.session } as unknown as AgnesGateway
    const relay2 = new EventRelay(gateway2, index, join(tmp, 'runs'), log)
    const snap = relay2.snapshot(TASK_ID)
    expect(snap.filter((e) => e.type === 'activity').length).toBeGreaterThan(0)
  })

  it('进行中任务（缓冲非空）快照不回放，避免与实时帧重复', async () => {
    harness.pushEvent({ seq: 6, type: 'turn/start', data: { turn: 1, trigger: 'prompt' } })
    harness.pushEvent({ seq: 9, type: 'tool/call', data: { name: 'sciret_run_all', toolUseId: 'tu1', args: {} } })
    await tick()
    // run_status 仍为 RUNNING，且内存缓冲非空 → 内存优先，不回放
    const snap = relay.snapshot(TASK_ID)
    expect(snap.filter((e) => e.type === 'activity' || e.type === 'tool')).toHaveLength(0)
  })

  it('步骤 RUNNING→DONE 计算耗时并落 trace，快照回填 elapsed_ms', async () => {
    mkdirSync(runDir(), { recursive: true })
    const stateFile = join(runDir(), 'state.json')
    writeFileSync(stateFile, JSON.stringify({ steps: [{ id: 'R1', status: 'RUNNING' }] }), 'utf8')
    harness.pushEvent({ seq: 6, type: 'turn/start', data: { turn: 1, trigger: 'prompt' } })
    await new Promise((r) => setTimeout(r, 30))
    writeFileSync(stateFile, JSON.stringify({ steps: [{ id: 'R1', status: 'DONE' }] }), 'utf8')
    harness.pushEvent({ seq: 7, type: 'turn/end', data: { reason: 'completed' } })
    await tick()

    const done = traceLines().find((e) => e.type === 'step' && e.step === 'R1' && e.status === 'DONE')
    const doneElapsed = done && done.type === 'step' ? done.elapsed_ms : undefined
    expect(doneElapsed ?? 0).toBeGreaterThan(0)

    // 快照回填：索引存步（无 elapsed_ms），耗时来自 trace
    const t = index.get(TASK_ID)!
    t.steps = [{ id: 'R1', label: 'R1', status: 'DONE', attempts: 1 }]
    index.put(t)
    const snapStep = relay.snapshot(TASK_ID).find((e) => e.type === 'step' && e.step === 'R1')
    const snapElapsed = snapStep && snapStep.type === 'step' ? snapStep.elapsed_ms : undefined
    expect(snapElapsed ?? 0).toBeGreaterThan(0)
  })
})
