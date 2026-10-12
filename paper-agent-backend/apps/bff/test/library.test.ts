import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { ReportService } from '../src/services/report.js'
import { LibraryService } from '../src/services/library.js'
import { TaskIndex, type TaskRecord } from '../src/store/task-index.js'
import { createLogger } from '../src/infra/logger.js'
import { errorBody } from '../src/infra/errors.js'
import { registerLibraryRoutes } from '../src/routes/v1/library.js'

/**
 * 跨 run 文献/证据库 API 测试（契约冻结，前端并行开发）：
 *   GET /api/v1/library/evidence?q=&kind=&tier=&source=&task_id=&dedupe=on&limit=50&offset=0
 *
 * 覆盖：多任务聚合计数、q/kind/tier/source/task_id 过滤、dedupe 开关行为（同 DOI 合并、
 * 无 DOI 不聚合、representative 取最新任务）、分页边界、空目录、非法参数。
 *
 * duplicates_count 语义（本实现采用）：**被合并掉的重复条数**（组内条目数 - 1）——
 * 单条/无 DOI 为 0；3 条同 DOI 合并为 1 条代表 + duplicates_count=2。
 */

const log = createLogger('error')

let tmp: string
let runsDir: string
let index: TaskIndex
let reports: ReportService
let library: LibraryService
let app: FastifyInstance

type EvSeed = {
  ev_id: string
  tier?: string
  kind?: string
  title: string
  producer_step?: string
  ref: { doi?: string; title?: string; authors?: string[]; year?: number; venue?: string; source?: string }
}

function seedTask(taskId: string, over: Partial<TaskRecord> = {}): void {
  index.put({
    task_id: taskId,
    goal: '检索并综述固态电解质界面阻抗的表征方法',
    workflow: 'research',
    lit_source: 'local',
    sources: [],
    run_status: 'DONE',
    degraded: false,
    degraded_reasons: [],
    session_id: 'manual-task',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    steps: [],
    ...over,
  } as TaskRecord)
}

/** 写一份账本：evidence 记录（seq 递增）+ 末尾一条 conclusion，保证结构真实 */
function seedLedger(taskId: string, evidences: EvSeed[]): void {
  const dir = join(runsDir, taskId)
  mkdirSync(dir, { recursive: true })
  const lines: string[] = []
  evidences.forEach((e, i) => {
    lines.push(
      JSON.stringify({
        seq: i + 1,
        record_type: 'evidence',
        at: '2026-10-01T00:00:00Z',
        ev_id: e.ev_id,
        tier: e.tier ?? 'fact',
        kind: e.kind ?? 'literature',
        title: e.title,
        producer_step: e.producer_step ?? 'R1',
        ref: {
          doi: e.ref.doi ?? '',
          title: e.ref.title ?? e.title,
          authors: e.ref.authors ?? [],
          year: e.ref.year ?? null,
          venue: e.ref.venue ?? '',
          source: e.ref.source ?? '',
        },
        chain_hash: 'aa'.repeat(32),
      }),
    )
  })
  lines.push(
    JSON.stringify({
      seq: evidences.length + 1,
      record_type: 'conclusion',
      at: '2026-10-01T00:00:00Z',
      cid: 'C-001',
      text: '结论',
      evidence_ids: evidences.length > 0 ? [evidences[0]!.ev_id] : [],
      chain_hash: 'cc'.repeat(32),
    }),
  )
  writeFileSync(join(dir, 'ledger.jsonl'), lines.join('\n') + '\n', 'utf8')
}

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'paper-library-'))
  runsDir = join(tmp, 'runs')
  mkdirSync(runsDir, { recursive: true })
  index = new TaskIndex(join(tmp, 'data'), log)
  reports = new ReportService(runsDir, index, log)
  library = new LibraryService(runsDir, index, reports, log)

  app = Fastify({ logger: false })
  app.setErrorHandler((err, _req, reply) => {
    const e = err as { code?: string; status?: number; message?: string }
    if (e && typeof e.code === 'string' && typeof e.status === 'number') {
      reply.code(e.status).send(errorBody(err as never))
      return
    }
    reply.code(500).send({ error: String(e?.message ?? err), code: 'INTERNAL' })
  })
  await app.register(async (v1) => registerLibraryRoutes(v1 as never, library), { prefix: '/api/v1' })
  await app.ready()
})

afterEach(async () => {
  await app.close()
  rmSync(tmp, { recursive: true, force: true })
})

async function get(query = ''): Promise<{ status: number; body: any }> {
  const res = await app.inject({ method: 'GET', url: `/api/v1/library/evidence${query}` })
  return { status: res.statusCode, body: res.json() }
}

// ------------------------------------------------------------------ 聚合

describe('GET /api/v1/library/evidence · 跨任务聚合', () => {
  it('聚合多任务账本的 evidence 记录，并带出任务 goal', async () => {
    seedTask('run-a', { goal: '目标 A', created_at: '2026-10-01T00:00:00Z' })
    seedLedger('run-a', [
      { ev_id: 'EV-0001', title: 'Solid Electrolyte A', ref: { doi: '10.1/a', source: 'crossref' } },
      { ev_id: 'EV-0002', title: 'Solid Electrolyte B', ref: { doi: '10.1/b', source: 'openalex' } },
    ])
    seedTask('run-b', { goal: '目标 B', created_at: '2026-10-02T00:00:00Z' })
    seedLedger('run-b', [
      { ev_id: 'EV-0001', title: 'Interface Impedance C', ref: { doi: '10.1/c', source: 'crossref' } },
    ])

    const { status, body } = await get()
    expect(status).toBe(200)
    expect(body.tasks_scanned).toBe(2)
    expect(body.total).toBe(3)
    expect(body.items).toHaveLength(3)
    expect(body.offset).toBe(0)
    expect(body.limit).toBe(50)
    // 最新任务优先（run-b created_at 更晚）
    expect(body.items[0].task_id).toBe('run-b')
    expect(body.items[0].task_goal).toBe('目标 B')
    expect(body.items[0].ref).toMatchObject({ doi: '10.1/c', source: 'crossref' })
  })

  it('tasks_scanned = 结果 items 的去重任务数（与分页无关，未命中的任务不计）', async () => {
    seedTask('run-a')
    seedLedger('run-a', [{ ev_id: 'EV-0001', title: 'X', ref: { doi: '10.1/x' } }])
    seedTask('run-empty') // 无账本 → 不计入结果
    const { body } = await get()
    expect(body.tasks_scanned).toBe(1)
    expect(body.total).toBe(1)
    // 分页不改 tasks_scanned（基于过滤后全量，而非当前页）
    const paged = await get('?limit=1&offset=0')
    expect(paged.body.tasks_scanned).toBe(1)
  })
})

// ------------------------------------------------------------------ 过滤

describe('GET /api/v1/library/evidence · 过滤', () => {
  beforeEach(() => {
    seedTask('run-a', { created_at: '2026-10-02T00:00:00Z' })
    seedLedger('run-a', [
      { ev_id: 'EV-0001', kind: 'literature', title: 'Solid State Battery', ref: { doi: '10.1/a', authors: ['Alice Zhang'], source: 'crossref' } },
      { ev_id: 'EV-0002', kind: 'analysis', tier: 'fact', title: '摘要精读：Solid State', ref: { doi: '10.1/b', authors: ['Bob Li'], source: 'openalex' } },
      { ev_id: 'EV-0003', kind: 'factcheck', tier: 'inference', title: 'Cross Source Check', ref: { doi: '10.1/c', authors: ['Carol'], source: 'crossref' } },
    ])
  })

  it('q 关键词大小写不敏感，匹配 title / ref.title / doi / 作者', async () => {
    expect((await get('?q=solid')).body.total).toBe(2)
    expect((await get('?q=SOLID')).body.total).toBe(2)
    expect((await get('?q=10.1/C')).body.total).toBe(1)
    expect((await get('?q=alice')).body.total).toBe(1)
    expect((await get('?q=nomatch')).body.total).toBe(0)
    // 空结果契约：tasks_scanned=0（未覆盖任何任务）
    expect((await get('?q=nomatch')).body.tasks_scanned).toBe(0)
  })

  it('kind / tier / source 精确匹配', async () => {
    expect((await get('?kind=literature')).body.total).toBe(1)
    expect((await get('?kind=analysis')).body.total).toBe(1)
    expect((await get('?tier=inference')).body.total).toBe(1)
    expect((await get('?source=openalex')).body.total).toBe(1)
    expect((await get('?source=crossref&kind=literature')).body.total).toBe(1)
  })

  it('task_id 限定来源任务；引用不存在任务返回空集（不报错）', async () => {
    seedTask('run-b', { created_at: '2026-10-03T00:00:00Z' })
    seedLedger('run-b', [{ ev_id: 'EV-0001', title: 'Other', ref: { doi: '10.1/z' } }])
    expect((await get('?task_id=run-a')).body.total).toBe(3)
    expect((await get('?task_id=run-b')).body.total).toBe(1)
    expect((await get('?task_id=run-none')).body.total).toBe(0)
  })
})

// ------------------------------------------------------------------ dedupe

describe('GET /api/v1/library/evidence · dedupe', () => {
  it('dedupe=on（默认）按规范化 DOI 合并，代表取最新任务，duplicates_count=重复条数', async () => {
    seedTask('run-old', { goal: '旧', created_at: '2026-10-01T00:00:00Z' })
    seedLedger('run-old', [
      { ev_id: 'EV-0001', title: 'Old Title', ref: { doi: 'https://doi.org/10.1/same', title: 'Old Title', source: 'crossref' } },
    ])
    seedTask('run-new', { goal: '新', created_at: '2026-10-05T00:00:00Z' })
    seedLedger('run-new', [
      { ev_id: 'EV-0001', title: 'New Title', ref: { doi: '10.1/SAME', title: 'New Title', source: 'openalex' } },
      { ev_id: 'EV-0002', title: 'Unique', ref: { doi: '10.1/unique', source: 'crossref' } },
    ])

    const { body } = await get()
    expect(body.total).toBe(2)
    const merged = body.items.find((i: any) => i.ref.doi.toLowerCase() === '10.1/same')
    expect(merged.task_id).toBe('run-new') // 代表取最新任务
    expect(merged.title).toBe('New Title')
    expect(merged.duplicates_count).toBe(1) // 两条合并 → 1 条重复
    const unique = body.items.find((i: any) => i.ref.doi === '10.1/unique')
    expect(unique.duplicates_count).toBe(0)
  })

  it('无 DOI 不聚合（各自独立，duplicates_count=0）', async () => {
    seedTask('run-a')
    seedLedger('run-a', [
      { ev_id: 'EV-0001', title: 'Same Title No DOI', ref: { title: 'Same Title No DOI' } },
      { ev_id: 'EV-0002', title: 'Same Title No DOI', ref: { title: 'Same Title No DOI' } },
    ])
    const { body } = await get()
    expect(body.total).toBe(2)
    expect(body.items.every((i: any) => i.duplicates_count === 0)).toBe(true)
  })

  it('dedupe=off 返回原始逐条（同 DOI 不合并，duplicates_count=0）', async () => {
    seedTask('run-a')
    seedLedger('run-a', [
      { ev_id: 'EV-0001', title: 'A', ref: { doi: '10.1/dup' } },
      { ev_id: 'EV-0002', title: 'B', ref: { doi: '10.1/dup' } },
    ])
    const on = await get()
    expect(on.body.total).toBe(1)
    const off = await get('?dedupe=off')
    expect(off.body.total).toBe(2)
    expect(off.body.items.every((i: any) => i.duplicates_count === 0)).toBe(true)
  })
})

// ------------------------------------------------------------------ 分页 / 边界

describe('GET /api/v1/library/evidence · 分页与边界', () => {
  beforeEach(() => {
    seedTask('run-a')
    seedLedger(
      'run-a',
      Array.from({ length: 5 }, (_, i) => ({
        ev_id: `EV-000${i + 1}`,
        title: `Paper ${i + 1}`,
        ref: { doi: `10.1/p${i + 1}` },
      })),
    )
  })

  it('total 为过滤后总数，limit/offset 正确切片', async () => {
    const p1 = await get('?limit=2&offset=0')
    expect(p1.body.total).toBe(5)
    expect(p1.body.items).toHaveLength(2)
    expect(p1.body.limit).toBe(2)
    expect(p1.body.offset).toBe(0)

    const p3 = await get('?limit=2&offset=4')
    expect(p3.body.total).toBe(5)
    expect(p3.body.items).toHaveLength(1)
    expect(p3.body.items[0].ref.doi).toBe('10.1/p5')
  })

  it('空目录返回空集且不报错', async () => {
    const fresh = new LibraryService(runsDir, new TaskIndex(join(tmp, 'empty-data'), log), reports, log)
    const out = fresh.query({})
    expect(out.total).toBe(0)
    expect(out.tasks_scanned).toBe(0)
    expect(out.items).toEqual([])
  })

  it('非法参数 → 400 BAD_PARAM', async () => {
    for (const q of ['?limit=0', '?limit=abc', '?offset=-1', '?dedupe=maybe', '?limit=1&limit=2']) {
      const { status, body } = await get(q)
      expect(status, `查询 ${q} 应 400`).toBe(400)
      expect(body.code).toBe('BAD_PARAM')
    }
  })
})

// ------------------------------------------------------------------ 全库 BibTeX 导出（v2.4）

describe('GET /api/v1/library/export?kind=bibtex · 全库 BibTeX 导出', () => {
  const getExport = async (query = ''): Promise<{ status: number; body: string; headers: Record<string, string> }> => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/library/export${query}` })
    return { status: res.statusCode, body: res.body, headers: res.headers as Record<string, string> }
  }

  it('聚合多任务 R1 文献并按 DOI 去重，产出 attachment paper-agent-library.bib', async () => {
    seedTask('run-a', { created_at: '2026-10-02T00:00:00Z' })
    seedLedger('run-a', [
      { ev_id: 'EV-0001', title: 'Solid-State Electrolytes', ref: { doi: '10.1007/s41918-019-00048-0', authors: ['Alice Zhang', 'Bob Li'], year: 2019, venue: 'Electrochemical Energy Reviews' } },
      { ev_id: 'EV-0002', title: 'Shared Paper', ref: { doi: 'https://doi.org/10.1/SAME', authors: ['Alice Zhang'], year: 2020 } },
    ])
    seedTask('run-b', { created_at: '2026-10-05T00:00:00Z' })
    seedLedger('run-b', [
      // 与 run-a 的 EV-0002 同 DOI（大小写/前缀不同）→ 去重为一条
      { ev_id: 'EV-0001', title: 'Shared Paper（新版）', ref: { doi: '10.1/same', authors: ['Carol Wang'], year: 2021 } },
      { ev_id: 'EV-0002', title: 'Another', ref: { doi: '10.1/another', authors: ['Dave'], year: 2018 } },
    ])

    const res = await getExport('?kind=bibtex')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/plain')
    expect(res.headers['content-disposition']).toBe('attachment; filename="paper-agent-library.bib"')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    // 去重后 3 条：唯一 DOI 两条 + 同 DOI 合并 1 条 = 3
    expect((res.body.match(/@article\{/g) ?? []).length).toBe(3)
    expect(res.body).toContain('author = {Alice Zhang, Bob Li}')
    expect(res.body).toContain('journal = {Electrochemical Energy Reviews}')
    expect(res.body).toContain('year = {2019}')
    expect(res.body).toContain('doi = {10.1007/s41918-019-00048-0}')
  })

  it('引用键防碰撞：同姓同年不同条不撞（姓+年+序号），与任务级导出同口径', async () => {
    seedTask('run-a')
    seedLedger('run-a', [
      // 姓=末段词（与任务级导出同口径）：两条末段同为 Zhang 且同年 → 靠序号区分
      { ev_id: 'EV-0001', title: 'A', ref: { doi: '10.1/a', authors: ['Wei Zhang'], year: 2019 } },
      { ev_id: 'EV-0002', title: 'B', ref: { doi: '10.1/b', authors: ['Li Zhang'], year: 2019 } },
    ])
    const res = await getExport('?kind=bibtex')
    const keys = [...res.body.matchAll(/@article\{([^,]+),/g)].map((m) => m[1])
    expect(keys).toEqual(['Zhang20191', 'Zhang20192'])
  })

  it('特殊字符按 BibTeX 惯例转义（& % _ #）', async () => {
    seedTask('run-a')
    seedLedger('run-a', [
      { ev_id: 'EV-0001', title: 'A & B: 50% _test_ #1', ref: { doi: '10.1/x', authors: ['Zhang'], year: 2020 } },
    ])
    const res = await getExport('?kind=bibtex')
    expect(res.body).toContain('title = {A \\& B: 50\\% \\_test\\_ \\#1}')
  })

  it('空库（无任何 R1 文献）→ 409 NOT_READY，附可读说明，不产出空文件', async () => {
    seedTask('run-a')
    seedLedger('run-a', []) // 只有 conclusion，无 evidence
    const res = await getExport('?kind=bibtex')
    expect(res.status).toBe(409)
    const body = JSON.parse(res.body) as { code: string; error: string }
    expect(body.code).toBe('NOT_READY')
    expect(body.error).toContain('文献')
  })

  it('缺 kind / 非法 kind → 400 BAD_PARAM 并列出允许值', async () => {
    seedTask('run-a')
    seedLedger('run-a', [{ ev_id: 'EV-0001', title: 'X', ref: { doi: '10.1/x' } }])
    for (const q of ['', '?kind=', '?kind=json', '?kind=csv']) {
      const res = await getExport(q)
      expect(res.status, `查询 ${q} 应 400`).toBe(400)
      expect(JSON.parse(res.body).code).toBe('BAD_PARAM')
    }
  })
})
