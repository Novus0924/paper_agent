import { describe, expect, it } from 'vitest'
import { EventBus } from '../src/events/bus.js'
import { dedupeKey, type RelayEventInput } from '../src/events/model.js'

/**
 * 事件总线测试（需求文档 §5.2）：
 *   - 有序：seq 单调递增，同连接按序；
 *   - 幂等：step/tool/conclusion/message 以稳定 ID 合并去重；
 *   - 可恢复：**先注册订阅再补发**（旧版竞态缺陷的回归测试）、Last-Event-ID 续传。
 */

const T = 'run-test-1'

describe('EventBus · 有序与幂等', () => {
  it('seq 单调递增', () => {
    const bus = new EventBus()
    const a = bus.publish(T, { type: 'activity', step: 'R1', human_message: 'a' })!
    const b = bus.publish(T, { type: 'activity', step: 'R1', human_message: 'b' })!
    expect(a.seq).toBe(1)
    expect(b.seq).toBe(2)
  })

  it('重复的 step/conclusion/tool 被去重（幂等合并）', () => {
    const bus = new EventBus()
    const step: RelayEventInput = { type: 'step', step: 'R1', status: 'DONE' }
    expect(bus.publish(T, step)).toBeDefined()
    expect(bus.publish(T, step)).toBeUndefined() // 同 step+status 只发一次
    const c: RelayEventInput = { type: 'conclusion', cid: 'C-001', text: 'x', evidence_ids: ['EV-0001'] }
    expect(bus.publish(T, c)).toBeDefined()
    expect(bus.publish(T, c)).toBeUndefined()
  })

  it('不同状态的同一 step 不去重（RUNNING → DONE 都要发）', () => {
    const bus = new EventBus()
    bus.publish(T, { type: 'step', step: 'R1', status: 'RUNNING' })
    bus.publish(T, { type: 'step', step: 'R1', status: 'DONE' })
    const kinds = bus.since(T, 0).map((e) => (e.type === 'step' ? e.status : e.type))
    expect(kinds).toEqual(['RUNNING', 'DONE'])
  })

  it('dedupeKey 覆盖 step/tool/conclusion/degraded/message', () => {
    expect(dedupeKey({ type: 'step', step: 'R2', status: 'RUNNING', seq: 1, ts: 't' })).toBe('step:R2:RUNNING')
    expect(
      dedupeKey({ type: 'tool', step: 'R1', tool: 'sciret_run_step', status: 'ok', id: 't1', seq: 1, ts: 't' }),
    ).toBe('tool:R1:t1:ok')
    expect(dedupeKey({ type: 'conclusion', cid: 'C-001', text: '', evidence_ids: [], seq: 1, ts: 't' })).toBe('conclusion:C-001')
    expect(
      dedupeKey({ type: 'degraded', level: 'info', source: 's', reason: 'r', impact: 'i', resumable: true, step: 'R1', seq: 1, ts: 't' }),
    ).toBe('degraded:info:s:r:R1')
    expect(dedupeKey({ type: 'message', turn_id: '1', role: 'assistant', status: 'done', seq: 1, ts: 't' })).toBe('message:1:assistant:done')
    expect(dedupeKey({ type: 'done', run_status: 'DONE', report_ready: true, seq: 1, ts: 't' })).toBeUndefined()
  })
})

describe('EventBus · 先订阅后补发（旧版竞态回归）', () => {
  it('订阅后立即产生的事件，在 drain 时按序补齐（不丢）', async () => {
    const bus = new EventBus()
    // ① 先注册订阅
    const sub = bus.open(T)
    // ② 补发期间事件照常产生（这就是旧版会丢的那批）
    bus.publish(T, { type: 'activity', step: 'R1', human_message: 'during-snapshot-1' })
    bus.publish(T, { type: 'activity', step: 'R1', human_message: 'during-snapshot-2' })
    // ③ 结束补发 → 期间事件必须补齐且有序
    sub.drain()
    const first = await sub.next(10)
    const second = await sub.next(10)
    expect(first?.type).toBe('activity')
    expect(second?.type).toBe('activity')
    expect((first as { human_message: string }).human_message).toBe('during-snapshot-1')
    expect((second as { human_message: string }).human_message).toBe('during-snapshot-2')
    expect(second!.seq).toBe(first!.seq + 1)
    sub.close()
  })

  it('drain 之后进入实时推送', async () => {
    const bus = new EventBus()
    const sub = bus.open(T)
    sub.drain()
    const pending = sub.next(0) // 等待实时事件
    bus.publish(T, { type: 'activity', step: 'R2', human_message: 'live' })
    const e = await pending
    expect((e as { human_message: string }).human_message).toBe('live')
    sub.close()
  })

  it('关闭订阅后 next 返回 null', async () => {
    const bus = new EventBus()
    const sub = bus.open(T)
    sub.drain()
    sub.close()
    expect(await sub.next(10)).toBeNull()
  })
})

describe('EventBus · 断线续传（Last-Event-ID）', () => {
  it('since(lastSeq) 只返回其后的事件', () => {
    const bus = new EventBus()
    bus.publish(T, { type: 'activity', step: 'R1', human_message: '1' })
    bus.publish(T, { type: 'activity', step: 'R1', human_message: '2' })
    bus.publish(T, { type: 'activity', step: 'R1', human_message: '3' })
    expect(bus.since(T, 0)).toHaveLength(3)
    expect(bus.since(T, 2)).toHaveLength(1)
    expect((bus.since(T, 2)[0] as { human_message: string }).human_message).toBe('3')
    expect(bus.lastSeq(T)).toBe(3)
  })

  it('多个订阅者互不影响', async () => {
    const bus = new EventBus()
    const a = bus.open(T)
    const b = bus.open(T)
    a.drain()
    b.drain()
    bus.publish(T, { type: 'activity', step: 'R1', human_message: 'shared' })
    expect((await a.next(50))?.seq).toBe(1)
    expect((await b.next(50))?.seq).toBe(1)
    a.close()
    b.close()
  })
})
