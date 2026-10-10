import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { ReportService } from '../src/services/report.js'
import { TaskIndex, type TaskRecord } from '../src/store/task-index.js'
import { createLogger } from '../src/infra/logger.js'
import { errorBody } from '../src/infra/errors.js'
import type { AppContext } from '../src/app.js'
import { registerReportRoutes } from '../src/routes/v1/report.js'

/**
 * 报告聚合与证据只读测试（BE-08/09，需求 §8.1 接口 10–13、§8.2 契约、§8.3 错误码）：
 * - /report 就绪 → 200 {status:"ready", report:{title,abstract,sections,conclusions[]}}；
 *   未就绪 → 200 {status:"generating"}（**不报错**）；任务不存在 → 404
 * - /report.md → text/markdown + nosniff + inline；未就绪 → 404 NO_REPORT
 * - /evidence → 证据/结论/轨迹只读 DTO
 * - /cite → EV 编号与哈希前缀回查；查无 → 404；缺参 → 404 带指引
 * - 标识白名单：非法 id / 目录穿越 → 400 BAD_ID
 */

const TASK_ID = 'run-20261010-120000-abc123'
const log = createLogger('error')

let tmp: string
let runsDir: string
let index: TaskIndex
let reports: ReportService
let app: FastifyInstance

function seedTask(taskId = TASK_ID, over: Partial<TaskRecord> = {}): void {
  index.put({
    task_id: taskId,
    goal: '检索并综述固态电解质界面阻抗的表征方法',
    workflow: 'research',
    lit_source: 'local',
    sources: [],
    run_status: 'DONE',
    degraded: false,
    degraded_reasons: [],
    session_id: 'agnes:test',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [{ id: 'R1', label: '多源检索', status: 'DONE', attempts: 1 }],
    ...over,
  })
}

/** 造一份"门禁通过"的真实产物：report.json + report.md + report_gate.json + ledger.jsonl */
function seedReadyArtifacts(taskId = TASK_ID): void {
  const dir = join(runsDir, taskId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'report.json'),
    JSON.stringify({
      task_id: taskId,
      title: '研究报告：固态电解质界面阻抗',
      abstract: '基于 8 篇真实文献元数据',
      sections: [{ id: 'background', title: '一、研究背景', body: '……' }],
      conclusions: [{ cid: 'C-001', text: '界面阻抗以 EIS 为主', evidence_ids: ['EV-0001'], confidence: 'medium' }],
      degraded: false,
      degraded_statement: '本次执行未发生实质降级（L2）。',
      ledger_digest: 'abc',
      gate: { passed: true },
      run_status: 'DONE',
    }),
    'utf8',
  )
  writeFileSync(
    join(dir, 'report.md'),
    '# 研究报告\n\n## 摘要\n\n基于真实文献。\n\n- **C-001** 界面阻抗以 EIS 为主 [EV-0001]\n\n> 本次执行未发生实质降级（L2）。\n',
    'utf8',
  )
  writeFileSync(join(dir, 'report_gate.json'), JSON.stringify({ passed: true, reasons: [], human_summary: '报告门禁通过' }), 'utf8')
  writeFileSync(
    join(dir, 'ledger.jsonl'),
    [
      JSON.stringify({
        seq: 1,
        record_type: 'evidence',
        at: '2026-10-10T02:39:59Z',
        ev_id: 'EV-0001',
        tier: 'fact',
        kind: 'literature',
        title: 'Solid-State Electrolytes for Lithium-Ion Batteries',
        producer_step: 'R1',
        sha256: '93e31bd3c43073fbe516cd32cd5bb249f0b355e484720e67e4b5367effe0796c',
        ref: { doi: '10.1007/s41918-019-00048-0', authors: ['Wenjia Zhao'], year: 2019, venue: 'Electrochemical Energy Reviews', source: 'openalex' },
        chain_hash: 'aa'.repeat(32),
      }),
      JSON.stringify({
        seq: 2,
        record_type: 'judgment',
        at: '2026-10-10T02:39:59Z',
        summary: '主题要素交叉印证',
        dimension: '电解质',
        chain_hash: 'bb'.repeat(32),
      }),
      JSON.stringify({
        seq: 3,
        record_type: 'conclusion',
        at: '2026-10-10T02:39:59Z',
        cid: 'C-001',
        text: '界面阻抗以 EIS 为主',
        evidence_ids: ['EV-0001'],
        confidence: 'medium',
        producer_step: 'R4',
        chain_hash: 'cc'.repeat(32),
      }),
    ].join('\n') + '\n',
    'utf8',
  )
}

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'paper-report-'))
  runsDir = join(tmp, 'runs')
  mkdirSync(runsDir, { recursive: true })
  index = new TaskIndex(join(tmp, 'data'), log)
  reports = new ReportService(runsDir, index, log)

  const stubCtx = { index, cfg: { runsDir } } as unknown as AppContext
  app = Fastify({ logger: false })
  app.setErrorHandler((err, _req, reply) => {
    const e = err as unknown as { code?: string; status?: number; message?: string }
    if (e && typeof e.code === 'string' && typeof e.status === 'number') {
      reply.code(e.status).send(errorBody(err as never))
      return
    }
    reply.code(500).send({ error: String(e?.message ?? err), code: 'INTERNAL' })
  })
  await app.register(async (v1) => registerReportRoutes(v1 as never, stubCtx, reports), { prefix: '/api/v1' })
  await app.ready()
})

afterEach(async () => {
  await app.close()
  rmSync(tmp, { recursive: true, force: true })
})

// ------------------------------------------------------------------ 报告

describe('GET /api/v1/tasks/{id}/report（§8.2 报告契约）', () => {
  it('就绪 → 200 {status:"ready", report:{title, abstract, sections, conclusions[]}}', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/report` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ready')
    expect(typeof body.report.title).toBe('string')
    expect(typeof body.report.abstract).toBe('string')
    expect(Array.isArray(body.report.sections)).toBe(true)
    expect(Array.isArray(body.report.conclusions)).toBe(true)
    expect(body.report.conclusions[0]).toMatchObject({ cid: 'C-001', evidence_ids: ['EV-0001'] })
  })

  it('未就绪 → 200 {status:"generating"}（不报错），并给出 run_status 与门禁信息', async () => {
    seedTask(TASK_ID, { run_status: 'RUNNING' })
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/report` })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'generating', run_status: 'RUNNING' })
  })

  it('门禁拒绝 → 仍返回 generating，且带门禁原因（拒绝出报告可被观测）', async () => {
    seedTask()
    const dir = join(runsDir, TASK_ID)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'report_gate.json'),
      JSON.stringify({ passed: false, reasons: ['结论 C-001 绑定了非 fact 级证据 EV-0009'], human_summary: '报告门禁未通过，已拒绝出报告' }),
      'utf8',
    )
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/report` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('generating')
    expect(body.gate.passed).toBe(false)
    expect(body.gate.reasons[0]).toContain('非 fact 级证据')
  })

  it('任务不存在 → 404 NOT_FOUND', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/tasks/run-19700101-000000-nope00/report' })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('NOT_FOUND')
  })

  it('非法标识 / 目录穿越 → 400 BAD_ID（§8.3 白名单）', async () => {
    // 注意：`run-x` 形式上**合法**（只是不存在 → 404），不属本用例范围
    for (const bad of ['..%2F..%2Fetc', 'run-x%20y', 'notATask', 'run-x.']) {
      const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${bad}/report` })
      expect(res.statusCode, bad).toBe(400)
      expect(res.json().code, bad).toBe('BAD_ID')
    }
  })

  it('白名单合法但不存在 → 404（区分 400 与 404）', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/tasks/run-x/report' })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('NOT_FOUND')
  })
})

// ------------------------------------------------------------------ Markdown

describe('GET /api/v1/tasks/{id}/report.md（§8.2 安全头与角标）', () => {
  it('就绪 → 200 text/markdown + nosniff + inline，且含证据角标与降级声明', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/report.md` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/markdown')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['content-disposition']).toBe('inline')
    expect(res.body).toContain('[EV-0001]')
    expect(res.body).toContain('未发生实质降级')
  })

  it('未就绪 → 404 NO_REPORT（带修复指引）', async () => {
    seedTask(TASK_ID, { run_status: 'RUNNING' })
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/report.md` })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('NO_REPORT')
  })
})

// ------------------------------------------------------------------ 证据

describe('GET /api/v1/tasks/{id}/evidence（BE-09 只读装配）', () => {
  it('返回证据/结论/判断/轨迹 DTO 与计数', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/evidence` })
    expect(res.statusCode).toBe(200)
    const b = res.json()
    expect(b.counts).toMatchObject({ evidence: 1, conclusions: 1, judgments: 1, records: 3 })
    expect(b.evidence[0]).toMatchObject({ ev_id: 'EV-0001', tier: 'fact', doi: '10.1007/s41918-019-00048-0', year: 2019 })
    expect(b.evidence[0].authors).toEqual(['Wenjia Zhao'])
    expect(b.conclusions[0]).toMatchObject({ cid: 'C-001', evidence_ids: ['EV-0001'] })
    expect(b.chain_head).toBe('cc'.repeat(32))
  })

  it('无账本 → 200 且计数为 0（只读，不报错）', async () => {
    seedTask()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/evidence` })
    expect(res.statusCode).toBe(200)
    expect(res.json().counts.records).toBe(0)
    expect(res.json().chain_head).toBeNull()
  })
})

// ------------------------------------------------------------------ cite

describe('GET /api/v1/tasks/{id}/cite?ev=（§9.6 引用回查）', () => {
  it('按 EV 编号回查 → DOI/作者/年份', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/cite?ev=EV-0001` })
    expect(res.statusCode).toBe(200)
    expect(res.json().citation).toMatchObject({
      ev_id: 'EV-0001',
      doi: '10.1007/s41918-019-00048-0',
      year: 2019,
      venue: 'Electrochemical Energy Reviews',
    })
  })

  it('按哈希前缀回查（≥6 位十六进制）', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/cite?ev=93e31b` })
    expect(res.statusCode).toBe(200)
    expect(res.json().citation.matched_by).toBe('sha256_prefix')
    expect(res.json().citation.ev_id).toBe('EV-0001')
  })

  it('查无此项 → 404 且带上可查证据列表', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/cite?ev=EV-9999` })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toContain('EV-9999')
    expect(res.json().error).toContain('EV-0001')
  })

  it('缺 ev → 404 并给出参数指引', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/cite` })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toContain('ev')
  })

  it('超长 ev → 400 BAD_PARAM', async () => {
    seedTask()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/cite?ev=${'x'.repeat(200)}` })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('BAD_PARAM')
  })
})

// ------------------------------------------------------------------ 缓存

describe('ReportService mtime 指纹缓存（§10 性能）', () => {
  it('同一次读取复用缓存；产物变更后失效重读', () => {
    seedTask()
    seedReadyArtifacts()
    const first = reports.getReport(TASK_ID)
    expect(first.status).toBe('ready')
    const second = reports.getReport(TASK_ID)
    expect(second.status).toBe('ready')

    // 改写产物（内容与长度均变化）→ 必须读到新值，不能被旧缓存挡住
    const dir = join(runsDir, TASK_ID)
    writeFileSync(
      join(dir, 'report.json'),
      JSON.stringify({
        task_id: TASK_ID,
        title: '改写后的标题（缓存失效验证）',
        abstract: 'x',
        sections: [],
        conclusions: [],
      }),
      'utf8',
    )
    const third = reports.getReport(TASK_ID)
    expect(third.status).toBe('ready')
    if (third.status === 'ready') expect(third.report.title).toContain('缓存失效验证')
  })
})