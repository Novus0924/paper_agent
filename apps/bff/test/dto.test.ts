import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import {
  AUDIT_ONLY_KEYS,
  findLeakedAuditFields,
  isAuditKey,
  parseViewLevel,
  stripAuditFields,
} from '../src/http/dto.js'
import { TaskIndex } from '../src/store/task-index.js'
import { createLogger } from '../src/infra/logger.js'
import { errorBody } from '../src/infra/errors.js'
import { registerReportRoutes } from '../src/routes/v1/report.js'
import type { AppContext } from '../src/app.js'

/**
 * 分层 DTO 测试（P-02，需求 §4.1 读模型装配）：
 *
 * 病灶：「后端把原始内部对象（系统提示词、工具原始 JSON、哈希）直接作为响应」
 * → 前端暴露过多后端内容。
 *
 * 契约：
 * 1. 默认（view）响应**不含**任何审计字段（ledger_digest / gate / 哈希 / 提示词）；
 * 2. `?view=audit` 才回传，且响应里回显 `view` 让调用方知道拿到哪一层；
 * 3. 非法 view → 400（不静默回退到 view，那会让审计请求"看起来成功但没数据"）；
 * 4. 递归剥除（证据里的嵌套哈希也要挡住）。
 *
 * 最关键的一条：**必须有"泄漏探测"正向断言**。
 * 剥字段是负向操作——一旦漏了，响应看起来完全正常，前端会静默拿到本不该有的字段。
 * 这与我踩过的 ACL 审计假通过同型：判定"已挡住"要有正向证据。
 */

const log = createLogger('error')
const TASK_ID = 'run-20261010-180000-dto00001'

let tmp: string
let app: FastifyInstance

/** 造一份含审计字段的"内核报告"，模拟真实产物形状。 */
const RAW_REPORT = {
  task_id: TASK_ID,
  title: '固态电解质界面阻抗表征综述',
  abstract: '本文综述…',
  run_status: 'DONE',
  degraded: false,
  degraded_statement: null,
  evidence_count: 3,
  generated_at: '2026-10-10T09:00:00Z',
  ledger_digest: 'sha256:deadbeef',
  ledger_head: 'sha256:cafebabe',
  gate: { passed: true, bypass: false, checks: { chain: 'ok', evidence_binding: 'ok' } },
  sections: [
    {
      id: 'R1',
      title: '多源检索',
      body: '检索到 12 条…',
      evidence_ids: ['EV-0001', 'EV-0002'],
    },
  ],
  conclusions: [
    {
      cid: 'C1',
      text: '界面阻抗主要由 SEI 膜贡献',
      evidence_ids: ['EV-0001'],
      entry_hash: 'sha256:1111',
      prev_hash: 'sha256:0000',
    },
  ],
}

const RAW_EVIDENCE = {
  task_id: TASK_ID,
  run_status: 'DONE',
  evidence: [
    { ev: 'EV-0001', title: 'Zhang 2023', year: 2023, source: 'crossref', hash: 'sha256:aaaa' },
    { ev: 'EV-0002', title: 'Li 2024', year: 2024, source: 'openalex', hash: 'sha256:bbbb' },
  ],
  ledger_digest: 'sha256:deadbeef',
  prompt: '你正在执行 paper-agent 科研流水线…',
}

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'paper-dto-'))
  const index = new TaskIndex(join(tmp, 'data'), log)
  index.put({
    task_id: TASK_ID,
    goal: '检索并综述固态电解质界面阻抗的表征方法',
    workflow: 'research',
    lit_source: 'local',
    sources: [],
    run_status: 'DONE',
    degraded: false,
    degraded_reasons: [],
    session_id: 'agnes:local:local-dev:cli:workspace:dto000hash',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [{ id: 'R1', label: '多源检索', status: 'DONE', attempts: 1 }],
  } as never)

  // 落一份真实产物到磁盘，让ReportService 只读地读它（不 mock 掉真实解析路径）
  const runDir = resolve(tmp, 'runs', TASK_ID)
  mkdirSync(runDir, { recursive: true })
  writeFileSync(join(runDir, 'report.json'), JSON.stringify(RAW_REPORT), 'utf8')
  writeFileSync(
    join(runDir, 'ledger.jsonl'),
    [
      JSON.stringify({ record_type: 'evidence', ev: 'EV-0001', title: 'Zhang 2023', year: 2023, source: 'crossref', hash: 'sha256:aaaa' }),
      JSON.stringify({ record_type: 'evidence', ev: 'EV-0002', title: 'Li 2024', year: 2024, source: 'openalex', hash: 'sha256:bbbb' }),
      JSON.stringify({ record_type: 'conclusion', cid: 'C1', text: '界面阻抗主要由 SEI 膜贡献', evidence_ids: ['EV-0001'] }),
    ].join('\n'),
    'utf8',
  )

  const { ReportService } = await import('../src/services/report.js')
  const reports = new ReportService(resolve(tmp, 'runs'), index, log)
  const stubCtx = { index, cfg: { runsDir: resolve(tmp, 'runs') } } as unknown as AppContext
  app = Fastify({ logger: false })
  app.setErrorHandler((err, _req, reply) => {
    const e = err as { code?: string; status?: number }
    if (e && typeof e.code === 'string' && typeof e.status === 'number') {
      reply.code(e.status).send(errorBody(err as never))
      return
    }
    reply.code(500).send({ error: String((err as Error)?.message ?? err), code: 'INTERNAL' })
  })
  await app.register(
    async (v1) => registerReportRoutes(v1 as never, stubCtx, reports),
    { prefix: '/api/v1' },
  )
  await app.ready()
})

afterEach(async () => {
  await app.close()
  rmSync(tmp, { recursive: true, force: true })
})

const get = (url: string) => app.inject({ method: 'GET', url })

// ------------------------------------------------------------------ 单元层

describe('DTO 单元：审计字段识别与剥除', () => {
  it('识别审计字段（含 -/_ 与大小写变体）', () => {
    expect(isAuditKey('ledger_digest')).toBe(true)
    expect(isAuditKey('Ledger_Digest')).toBe(true)
    expect(isAuditKey('ledger-digest')).toBe(true)
    expect(isAuditKey('chain_hash')).toBe(true)
    expect(isAuditKey('system_prompt')).toBe(true)
    // 用户面向字段不得误判
    expect(isAuditKey('title')).toBe(false)
    expect(isAuditKey('evidence_ids')).toBe(false)
    expect(isAuditKey('run_status')).toBe(false)
  })

  it('递归剥除嵌套哈希（不是只剥顶层）', () => {
    const out = stripAuditFields(RAW_EVIDENCE) as Record<string, unknown>
    const leaks = findLeakedAuditFields(out)
    expect(leaks, `泄漏字段: ${leaks.join(', ')}`).toEqual([])
    // 用户字段仍在
    const first = (out.evidence as Array<Record<string, unknown>>)[0]!
    expect(first.ev).toBe('EV-0001')
    expect(first.source).toBe('crossref')
  })

  it('不改动输入对象（DTO 是投影，不是裁剪）', () => {
    const input = structuredClone(RAW_REPORT)
    stripAuditFields(input)
    expect(input.ledger_digest).toBe('sha256:deadbeef') // 源对象保持完整
    expect(RAW_REPORT.gate.passed).toBe(true)
  })

  it('泄漏探测器本身有效：能找出已知泄漏', () => {
    // 反向用例——否则"探测不到泄漏"可能只是探测器坏了
    const leaky = { view: 'view', report: { ledger_digest: 'x', nested: [{ chain_hash: 'y' }] } }
    const found = findLeakedAuditFields(leaky)
    expect(found).toHaveLength(2)
    expect(found.some((f) => f.includes('ledger_digest'))).toBe(true)
    expect(found.some((f) => f.includes('chain_hash'))).toBe(true)
  })

  it('parseViewLevel：缺省=view，audit 显式，非法→400', () => {
    expect(parseViewLevel(undefined)).toBe('view')
    expect(parseViewLevel('')).toBe('view')
    expect(parseViewLevel('view')).toBe('view')
    expect(parseViewLevel('AUDIT')).toBe('audit')
    expect(() => parseViewLevel('raw')).toThrow()
    expect(() => parseViewLevel('everything')).toThrow()
  })

  it('AUDIT_ONLY_KEYS 覆盖内核 report.json 的真实审计字段', () => {
    // 这几个是内核 report.json 顶层确实存在的键（P-02 的核心目标）
    for (const k of ['ledger_digest']) {
      expect(AUDIT_ONLY_KEYS as readonly string[]).toContain(k)
    }
    //⚠️ 反向断言：gate / ledger_head **不得**被归为审计字段。
    // §9.2 要求"门禁拒绝出报告可被观测"（M6 验收直接断言 gate.passed===false），
    // 用户界面必须能显示"为什么还没出报告"。把它挡掉等于把关键状态藏成黑盒。
    for (const k of ['gate', 'ledger_head']) {
      expect(AUDIT_ONLY_KEYS as readonly string[]).not.toContain(k)
      expect(isAuditKey(k)).toBe(false)
    }
  })
})

// ------------------------------------------------------------------ 路由层

describe('GET /tasks/{id}/report 分层（P-02）', () => {
  it('默认响应不含审计字段，且回显 view=view', async () => {
    const res = await get(`/api/v1/tasks/${TASK_ID}/report`)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.view).toBe('view')
    expect(body.status).toBe('ready')
    const leaks = findLeakedAuditFields(body)
    expect(leaks, `默认视图泄漏了: ${leaks.join(', ')}`).toEqual([])
    // 用户面向字段仍在
    expect(body.report.title).toBeTruthy()
    expect(body.report.conclusions[0].cid).toBe('C1')
  })

  it('?view=audit 回传哈希与门禁，且回显 view=audit', async () => {
    const res = await get(`/api/v1/tasks/${TASK_ID}/report?view=audit`)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.view).toBe('audit')
    expect(body.report.ledger_digest).toBe('sha256:deadbeef')
    expect(body.report.gate.passed).toBe(true)
    // 审计视图允许有审计字段
    expect(findLeakedAuditFields(body).length).toBeGreaterThan(0)
  })

  it('两层字段集不同（证明分层真的生效，而非同一份数据换标签）', async () => {
    const v = (await get(`/api/v1/tasks/${TASK_ID}/report`)).json()
    const a = (await get(`/api/v1/tasks/${TASK_ID}/report?view=audit`)).json()
    expect(v.report.ledger_digest).toBeUndefined()
    expect(a.report.ledger_digest).toBeDefined()
    // 用户字段两边一致（分层只影响审计字段，不应误伤内容）
    expect(v.report.title).toBe(a.report.title)
  })

  it('门禁信息在**默认视图**仍可见（M6 §9.2「拒绝出报告可被观测」不得被分层破坏）', async () => {
    // 回归防护：P-02 分层曾把 gate 当审计字段挡掉，会让用户看不到"为什么还没出报告"。
    // 报告未就绪时 status=generating 是正常业务状态，其 gate 原因属用户面向信息。
    const res = await get(`/api/v1/tasks/${TASK_ID}/report`)
    const body = res.json()
    expect(body.status).toBe('ready')
    expect(body.report.gate).toBeDefined()
    expect(body.report.gate.passed).toBe(true)
  })

  it('非法 view → 400 且不静默回退', async () => {
    const res = await get(`/api/v1/tasks/${TASK_ID}/report?view=raw`)
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('BAD_PARAM')
  })
})

describe('GET /tasks/{id}/evidence 分层（P-02）', () => {
  it('默认不含证据哈希与账本摘要', async () => {
    const res = await get(`/api/v1/tasks/${TASK_ID}/evidence`)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.view).toBe('view')
    expect(findLeakedAuditFields(body)).toEqual([])
  })

  it('?view=audit 才回传哈希与链头', async () => {
    const res = await get(`/api/v1/tasks/${TASK_ID}/evidence?view=audit`)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.view).toBe('audit')
    // getEvidence 是**从账本重建**的视图（不读 report.json），字段名与 report.json 不同：
    //   顶层链头 = chain_head；证据项内= chain_hash / sha256。
    // 断言必须对着真实返回结构，不能照抄 report.json（我第一版就写错了，被这条测试当场抓出）。
    expect(findLeakedAuditFields(body).length).toBeGreaterThan(0)
    const joined = JSON.stringify(body)
    expect(joined).toContain('chain_hash')
  })
})

describe('GET /tasks/{id}/cite 分层（P-02）', () => {
  it('默认剥除哈希（cite 的产物含证据哈希）', async () => {
    const res = await get(`/api/v1/tasks/${TASK_ID}/cite?ev=EV-0001`)
    // cite 找不到时是 404（内核产物里 ev 记录可能不含该字段），两种都要满足"不含哈希"
    if (res.statusCode === 200) {
      expect(findLeakedAuditFields(res.json())).toEqual([])
    } else {
      expect(res.statusCode).toBe(404)
      // 404 的可查列表也不能带哈希
      expect(findLeakedAuditFields(res.json())).toEqual([])
    }
  })

  it('非法 view → 400', async () => {
    const res = await get(`/api/v1/tasks/${TASK_ID}/cite?ev=EV-0001&view=everything`)
    expect(res.statusCode).toBe(400)
  })
})