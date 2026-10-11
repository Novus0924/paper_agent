import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { ReportService } from '../src/services/report.js'
import { TaskIndex } from '../src/store/task-index.js'
import { createLogger } from '../src/infra/logger.js'
import { errorBody } from '../src/infra/errors.js'
import type { AppContext } from '../src/app.js'
import { registerExportRoutes } from '../src/routes/v1/export.js'
import { EXPORTERS, EXPORT_KINDS, ExportService } from '../src/export/service.js'
import { buildZip, crc32, readZipEntry } from '../src/export/zip.js'

/**
 * 导出三件套测试（BE-10，需求 §8.1 接口 15、§8.2 导出契约、§8.3 错误码、§560 Exporter SPI、§9.6 验收）：
 * - ZIP 写入器自回读（含中文名/嵌套目录/deflate/store），且**同输入同字节**（审计包可复现）
 * - SPI 注册表完整性：新增格式 = 注册一个导出器，路由零改动
 * - report → Markdown 文件流（inline + nosniff）
 * - audit  → 审计包 ZIP：报告+账本+门禁+事件+结论+**verify.py 校验脚本**+manifest（含每文件 sha256）
 * - session → 经 AGH 原生导出；daemon 不可用时如实 500 EXPORT_ERROR（不伪造、不静默降级）
 * - 未就绪 → 409 NOT_READY 并说明可导出范围；非法 kind → 400 BAD_PARAM（不静默回退）
 */

const TASK_ID = 'run-20261010-120000-abc123'
const AGH_SESSION = 'agnes:local:local-dev:cli:workspace:abc123hash'
const log = createLogger('error')

let tmp: string
let runsDir: string
let index: TaskIndex
let reports: ReportService
let exports: ExportService
let app: FastifyInstance

function seedTask(taskId = TASK_ID, over: Record<string, unknown> = {}): void {
  index.put({
    task_id: taskId,
    goal: '检索并综述固态电解质界面阻抗的表征方法',
    workflow: 'research',
    lit_source: 'local',
    sources: [],
    run_status: 'DONE',
    degraded: false,
    degraded_reasons: [],
    session_id: AGH_SESSION,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [{ id: 'R1', label: '多源检索', status: 'DONE', attempts: 1 }],
    ...over,
  } as never)
}

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
    '# 研究报告\n\n- **C-001** 界面阻抗以 EIS 为主 [EV-0001]\n\n> 本次执行未发生实质降级（L2）。\n',
    'utf8',
  )
  writeFileSync(
    join(dir, 'report_gate.json'),
    JSON.stringify({ passed: true, reasons: [], human_summary: '报告门禁通过' }),
    'utf8',
  )
  writeFileSync(
    join(dir, 'review.json'),
    JSON.stringify({ total: 8, fact: 8, inference: 0, warning: 0 }),
    'utf8',
  )
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
        ref: { doi: '10.1007/s41918-019-00048-0', year: 2019, source: 'openalex' },
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
  tmp = mkdtempSync(join(tmpdir(), 'paper-export-'))
  runsDir = join(tmp, 'runs')
  mkdirSync(runsDir, { recursive: true })
  index = new TaskIndex(join(tmp, 'data'), log)
  reports = new ReportService(runsDir, index, log)
  exports = new ExportService(runsDir, reports, log, join(tmp, 'no-such-agnes.mjs'), undefined, 'local-dev')

  const stubCtx = { index, cfg: { runsDir } } as unknown as AppContext
  app = Fastify({ logger: false })
  app.setErrorHandler((err, _req, reply) => {
    const e = err as { code?: string; status?: number; message?: string }
    if (e && typeof e.code === 'string' && typeof e.status === 'number') {
      reply.code(e.status).send(errorBody(err as never))
      return
    }
    reply.code(500).send({ error: String(e?.message ?? err), code: 'INTERNAL' })
  })
  await app.register(async (v1) => registerExportRoutes(v1 as never, stubCtx, exports), { prefix: '/api/v1' })
  await app.ready()
})

afterEach(async () => {
  await app.close()
  rmSync(tmp, { recursive: true, force: true })
})

// ------------------------------------------------------------------ ZIP 写入器

describe('ZIP 写入器（零依赖，APPNOTE 6.3.x）', () => {
  it('CRC-32 与标准向量一致（0xedb88320 多项式）', () => {
    expect(crc32(Buffer.from('', 'utf8'))).toBe(0)
    expect(crc32(Buffer.from('a', 'utf8'))).toBe(0xe8b7be43)
    expect(crc32(Buffer.from('123456789', 'utf8'))).toBe(0xcbf43926)
    expect(crc32(Buffer.from('The quick brown fox jumps over the lazy dog', 'utf8'))).toBe(0x414fa339)
  })

  it('回读校验：中文文件名 + 嵌套目录 + store/deflate 两种方式', () => {
    const zip = buildZip([
      { name: 'run/report.md', content: '# 研究报告\n' },
      { name: 'run/嵌套/说明.txt', content: '中文内容', store: true },
      { name: 'manifest.json', content: JSON.stringify({ a: 1 }) },
    ])
    // 三个签名
    expect(zip.readUInt32LE(0)).toBe(0x04034b50)
    const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
    expect(eocd).toBeGreaterThan(0)
    expect(zip.readUInt32LE(eocd)).toBe(0x06054b50)

    expect(readZipEntry(zip, 'run/report.md')?.toString('utf8')).toBe('# 研究报告\n')
    expect(readZipEntry(zip, 'run/嵌套/说明.txt')?.toString('utf8')).toBe('中文内容')
    expect(readZipEntry(zip, 'manifest.json')?.toString('utf8')).toBe('{"a":1}')
    expect(readZipEntry(zip, 'run/absent.txt')).toBeNull()
  })

  it('可复现：同输入两次构建产出逐字节相同（固定 mod time/date）', () => {
    const entries = [
      { name: 'run/report.md', content: '# 报告\n' },
      { name: 'run/ledger.jsonl', content: '{"seq":1}\n' },
    ]
    expect(buildZip(entries).equals(buildZip(entries))).toBe(true)
  })
})

// ------------------------------------------------------------------ SPI 注册表

describe('Exporter SPI（§560 新增导出格式 = 实现导出器）', () => {
  it('注册表恰好覆盖需求规定的导出类型', () => {
    expect(EXPORT_KINDS.sort()).toEqual(['audit', 'bibtex', 'report', 'session'])
    for (const k of EXPORT_KINDS) {
      expect(EXPORTERS[k].kind).toBe(k)
      expect(typeof EXPORTERS[k].available).toBe('function')
      expect(typeof EXPORTERS[k].export).toBe('function')
    }
  })
})

// ------------------------------------------------------------------ report

describe('GET /api/v1/tasks/{id}/export?kind=report', () => {
  it('200 Markdown 文件流：inline + nosniff + 正文含结论角标', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=report` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/markdown')
    expect(res.headers['content-disposition']).toContain('inline')
    expect(res.headers['content-disposition']).toContain(`${TASK_ID}-report.md`)
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.body).toContain('[EV-0001]')
    expect(res.body).toContain('未发生实质降级')
  })

  it('报告未就绪 → 409 NOT_READY，并说明当前可导出范围', async () => {
    seedTask(TASK_ID, { run_status: 'RUNNING' })
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=report` })
    expect(res.statusCode).toBe(409)
    const body = res.json()
    expect(body.code).toBe('NOT_READY')
    // 可导出范围要如实告知：会话映射在，应列出 session
    expect(body.error).toContain('尚不可导出')
    expect(body.error).toContain('session')
  })

  it('无任何产物且无会话映射 → 409 且明说「当前无可导出格式」', async () => {
    seedTask(TASK_ID, { session_id: '' })
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=report` })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toContain('当前无可导出格式')
  })
})

// ------------------------------------------------------------------ audit

describe('GET /api/v1/tasks/{id}/export?kind=audit（审计包 ZIP）', () => {
  it('200 ZIP：含报告/账本/门禁/事件/结论/校验脚本/清单，且清单逐文件给出 sha256', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=audit` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/zip')
    expect(res.headers['content-disposition']).toContain(`attachment; filename="${TASK_ID}-audit.zip"`)

    const zip = res.rawPayload
    const manifest = JSON.parse(readZipEntry(zip, 'manifest.json')!.toString('utf8'))
    expect(manifest.task_id).toBe(TASK_ID)
    expect(manifest.session_id).toBe(AGH_SESSION)
    expect(manifest.gate.passed).toBe(true)
    expect(manifest.counts).toMatchObject({ evidence: 1, conclusions: 1, judgments: 1, ledger_records: 3 })
    expect(manifest.how_to_verify).toContain('verify.py')
    // 清单必须覆盖除清单自身外的每一个文件，且每项有字节数与 sha256
    for (const f of manifest.files) {
      expect(typeof f.bytes).toBe('number')
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/)
      const content = readZipEntry(zip, f.path)
      expect(content, `清单里的 ${f.path} 必须真实存在于 ZIP 中`).not.toBeNull()
      expect(content!.length).toBe(f.bytes)
    }

    // 关键产物
    expect(readZipEntry(zip, 'run/report.md')!.toString('utf8')).toContain('[EV-0001]')
    expect(readZipEntry(zip, 'run/ledger.jsonl')!.toString('utf8')).toContain('"record_type":"conclusion"')
    expect(readZipEntry(zip, 'run/report_gate.json')).not.toBeNull()
    expect(readZipEntry(zip, 'run/state.json')).toBeNull() // 未产出则不塞空文件

    // 校验脚本必须是可独立运行的 Python，且复核三项门禁
    const verify = readZipEntry(zip, 'verify.py')!.toString('utf8')
    expect(verify).toContain('def main()')
    expect(verify).toContain('import hashlib')
    expect(verify).toContain('ledger_digest')
    // 独立性：只用标准库，不 import 本项目任何模块（校验不能依赖被校验方的代码）
    expect(verify).not.toMatch(/^\s*(import|from)\s+(?!hashlib|json|sys|pathlib)/m)

    // 结论单列，便于评审直接引用
    const conclusions = JSON.parse(readZipEntry(zip, 'run/conclusions.json')!.toString('utf8'))
    expect(conclusions[0]).toMatchObject({ cid: 'C-001', evidence_ids: ['EV-0001'] })
    // 事件摘要须如实说明来源与局限
    const events = JSON.parse(readZipEntry(zip, 'run/events.json')!.toString('utf8'))
    expect(events.note).toContain('重建')
    expect(events.steps[0]).toMatchObject({ step: 'R1', status: 'DONE' })
  })

  it('响应头 X-Export-Contents 如实列出 ZIP 内容', async () => {
    seedTask()
    seedReadyArtifacts()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=audit` })
    expect(res.headers['x-export-contents']).toContain('manifest.json')
    expect(res.headers['x-export-contents']).toContain('verify.py')
  })

  it('审计包可复现：两次请求逐字节相同（清单内 generated_at 除外仍需一致 → 校验其稳定性）', async () => {
    seedTask()
    seedReadyArtifacts()
    const a = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=audit` })
    const b = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=audit` })
    const ma = readZipEntry(a.rawPayload, 'manifest.json')!.toString('utf8')
    const mb = readZipEntry(b.rawPayload, 'manifest.json')!.toString('utf8')
    // manifest 含 generated_at（真实导出时间，审计需要），故此处只断言"内容一致除时间戳"
expect(normalize(ma)).toBe(normalize(mb))
  })
})

function normalize(manifestText: string): string {
  const obj = JSON.parse(manifestText) as Record<string, unknown>
  delete obj['generated_at']
  return JSON.stringify(obj)
}

// ------------------------------------------------------------------ session

describe('GET /api/v1/tasks/{id}/export?kind=session（经 AGH 原生导出）', () => {
  it('非 AGH 会话格式 → 409 NOT_READY（不静默伪造空文件）', async () => {
    seedTask(TASK_ID, { session_id: 'manual-task' })
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=session` })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('NOT_READY')
    expect(res.json().error).toContain('AGH 会话映射')
  })

  it('非法 format → 400 BAD_PARAM 并列出允许值', async () => {
    seedTask()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=session&format=pdf` })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.code).toBe('BAD_PARAM')
    expect(body.error).toContain('pdf')
    // 契约：响应体恰好 {error, code}，action 并入 error（§8.3）
    expect(body.error).toMatch(/agnes/)
  })

  it('AGH 导出失败（CLI 不可用）→ 500 EXPORT_ERROR，附原因与重试指引，不返回空文件', async () => {
    seedTask()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=session` })
    expect(res.statusCode).toBe(500)
    const body = res.json()
    expect(body.code).toBe('EXPORT_ERROR')
    expect(body.error).toContain('agh.sh export')
    expect(res.rawPayload.length).toBeGreaterThan(0)
  })
})

// ------------------------------------------------------------------ bibtex

/** 写一份只含 R1 文献证据的账本（bibtex 导出只依赖它，不依赖报告门禁） */
function seedLiteratureLedger(
  taskId: string,
  items: Array<{ ev_id: string; title: string; ref?: Record<string, unknown> }>,
): void {
  const dir = join(runsDir, taskId)
  mkdirSync(dir, { recursive: true })
  const lines = items.map((it, i) =>
    JSON.stringify({
      seq: i + 1,
      record_type: 'evidence',
      at: '2026-10-10T00:00:00Z',
      ev_id: it.ev_id,
      tier: 'fact',
      kind: 'literature',
      title: it.title,
      producer_step: 'R1',
      ref: { doi: '', title: it.title, authors: [], year: null, venue: '', source: 'crossref', ...(it.ref ?? {}) },
      chain_hash: 'aa'.repeat(32),
    }),
  )
  writeFileSync(join(dir, 'ledger.jsonl'), lines.join('\n') + '\n', 'utf8')
}

describe('GET /api/v1/tasks/{id}/export?kind=bibtex（BibTeX 全量导出）', () => {
  it('200 text/plain：attachment 文件名 <task_id>.bib，含各字段条目', async () => {
    seedTask()
    seedLiteratureLedger(TASK_ID, [
      {
        ev_id: 'EV-0001',
        title: 'Solid-State Electrolytes',
        ref: { doi: '10.1007/s41918-019-00048-0', authors: ['Alice Zhang', 'Bob Li'], year: 2019, venue: 'Electrochemical Energy Reviews' },
      },
      {
        ev_id: 'EV-0002',
        title: 'Interface Impedance',
        ref: { doi: '10.1/xyz', authors: ['Carol Wang'], year: 2021 }, // 无 venue → 跳过 journal 行
      },
    ])
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=bibtex` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/plain')
    expect(res.headers['content-disposition']).toBe(`attachment; filename="${TASK_ID}.bib"`)
    expect(res.headers['x-content-type-options']).toBe('nosniff')

    const bib = res.body
    // 两条 @article 条目
    expect((bib.match(/@article\{/g) ?? []).length).toBe(2)
    // 字段齐全的条目
    expect(bib).toContain('author = {Alice Zhang, Bob Li}')
    expect(bib).toContain('title = {Solid-State Electrolytes}')
    expect(bib).toContain('journal = {Electrochemical Energy Reviews}')
    expect(bib).toContain('year = {2019}')
    expect(bib).toContain('doi = {10.1007/s41918-019-00048-0}')
    // 缺失字段（venue）跳过该行：EV-0002 条目不出现 journal
    const ev2 = bib.split('@article{')[2]!
    expect(ev2).not.toContain('journal = ')
    expect(ev2).toContain('doi = {10.1/xyz}')
  })

  it('键为 第一作者姓+年份+序号，同姓氏同年份不碰撞', async () => {
    seedTask()
    seedLiteratureLedger(TASK_ID, [
      { ev_id: 'EV-0001', title: 'One', ref: { authors: ['Alice Zhang'], year: 2020 } },
      { ev_id: 'EV-0002', title: 'Two', ref: { authors: ['Aaron Zhang'], year: 2020 } },
    ])
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=bibtex` })
    const keys = [...res.body.matchAll(/@article\{([^,]+),/g)].map((m) => m[1])
    expect(keys).toHaveLength(2)
    expect(new Set(keys).size).toBe(2)
    expect(keys[0]).toContain('Zhang')
    expect(keys[0]).toContain('2020')
  })

  it('特殊字符按 BibTeX 惯例转义（& % _ #）', async () => {
    seedTask()
    seedLiteratureLedger(TASK_ID, [
      { ev_id: 'EV-0001', title: 'A & B 50% _under_ #1', ref: { authors: ['X & Y'], year: 2022, venue: 'J_M' } },
    ])
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=bibtex` })
    expect(res.body).toContain('title = {A \\& B 50\\% \\_under\\_ \\#1}')
    expect(res.body).toContain('author = {X \\& Y}')
    expect(res.body).toContain('journal = {J\\_M}')
  })

  it('无 R1 文献证据 → 409 NOT_READY 并说明可导出范围（不含 bibtex）', async () => {
    seedTask(TASK_ID, { session_id: '' })
    mkdirSync(join(runsDir, TASK_ID), { recursive: true })
    writeFileSync(join(runsDir, TASK_ID, 'ledger.jsonl'), '', 'utf8')
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=bibtex` })
    expect(res.statusCode).toBe(409)
    const body = res.json()
    expect(body.code).toBe('NOT_READY')
    expect(body.error).toContain('尚不可导出')
    expect(body.error).not.toContain('bibtex')
  })
})

// ------------------------------------------------------------------ 参数校验

describe('导出参数校验（§6 枚举回退须显式告知）', () => {
  it('缺 kind → 400 BAD_PARAM 并列出允许值（不静默默认 report）', async () => {
    seedTask()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export` })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('BAD_PARAM')
    expect(res.json().error).toMatch(/report/)
  })

  it('非法 kind → 400 BAD_PARAM 并列出允许值', async () => {
    seedTask()
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/export?kind=zip` })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('zip')
  })

  it('非法任务 id → 400 BAD_ID；合法但不存在 → 404', async () => {
    const bad = await app.inject({ method: 'GET', url: '/api/v1/tasks/notATask/export?kind=report' })
    expect(bad.statusCode).toBe(400)
    expect(bad.json().code).toBe('BAD_ID')
    const missing = await app.inject({ method: 'GET', url: '/api/v1/tasks/run-nope/export?kind=report' })
    expect(missing.statusCode).toBe(404)
  })
})