import type { Logger } from '../infra/logger.js'
import type { TaskIndex, TaskRecord } from '../store/task-index.js'
import type { ReportService, LedgerRecordView } from './report.js'
import { ApiError } from '../infra/errors.js'
import { asArray, asRecord, asText } from '../infra/coerce.js'

/**
 * 跨 run 文献/证据库服务（科研 agent 知识沉淀核心）。
 *
 * 数据源：`data/task-index.json` 的任务列表 → 逐任务读 `runs/<task_id>/ledger.jsonl`，
 * 聚合**全部任务**的 evidence 记录（不只是单任务），形成可跨任务检索的文献库。
 * 关联任务 goal 取自 task-index（账本里没有 goal）。
 *
 * 契约（已冻结，前端并行开发，字段名不得改）：
 *   GET /api/v1/library/evidence?q=&kind=&tier=&source=&task_id=&dedupe=on&limit=50&offset=0
 *   响应：{ total, tasks_scanned, items:[{ev_id,task_id,task_goal,tier,kind,title,
 *          ref:{doi,title,authors,year,venue,source}, producer_step, duplicates_count}],
 *          offset, limit }
 *
 * 设计取舍：
 * - **正确性优先**：不做复杂索引，按需读账本（ReportService 已带 mtime 指纹缓存）。
 * - **dedupe 语义**：仅按**规范化 DOI**聚合（无 DOI 不聚合）；代表条目取「最新任务」的
 *   那条（同任务内取 seq 最小者，即最先产生的那条证据）；`duplicates_count` = 该组内
 *   **被合并掉的重复条数**（组内条目数 - 1）——单条/无 DOI 恒为 0，dedupe=off 恒为 0。
 * - **total** 为过滤 + 去重后的总数（即分页可迭代的条目数）。
 * - **tasks_scanned** 为本次结果**覆盖的任务数**（结果 items 中去重的 task_id 数，与分页无关；
 *   与前端 LibraryPage「收录任务数」统计口径一致）。
 * - 非法参数 → 400 BAD_PARAM（不静默回退）；无 runs / 空索引 → 空集，不报错。
 */

export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 500

export type LibraryRef = {
  doi: string
  title: string
  authors: string[]
  year: number | string | null
  venue: string
  source: string
}

export type LibraryItem = {
  ev_id: string
  task_id: string
  task_goal: string
  tier: string
  kind: string
  title: string
  ref: LibraryRef
  producer_step: string
  duplicates_count: number
}

export type LibraryResponse = {
  total: number
  tasks_scanned: number
  items: LibraryItem[]
  offset: number
  limit: number
}

/** 内部：一条待聚合的原始证据（带任务上下文与排序键） */
type RawEvidence = {
  task_id: string
  task_goal: string
  task_created_at: string
  seq: number
  item: LibraryItem
}

/** 规范化 DOI（判重键）：小写、去两端空白、剥 doi.org / dx.doi.org 前缀 */
function normalizeDoi(doi: string): string {
  return doi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '')
}

export class LibraryService {
  private readonly log: Logger

  constructor(
    private readonly runsDir: string,
    private readonly index: TaskIndex,
    private readonly reports: ReportService,
    log: Logger,
  ) {
    this.log = log.child({ component: 'library-service' })
  }

  /**
   * 查询跨 run 文献/证据库。参数全部来自 query string（`unknown`，需自行校验）。
   * 非法参数抛 400 BAD_PARAM。
   */
  query(raw: Record<string, unknown>): LibraryResponse {
    const q = queryText(raw['q'], 'q').toLowerCase()
    const kind = queryText(raw['kind'], 'kind')
    const tier = queryText(raw['tier'], 'tier')
    const source = queryText(raw['source'], 'source')
    const taskId = queryText(raw['task_id'], 'task_id')
    const dedupe = parseDedupe(raw['dedupe'])
    const limit = queryInt(raw['limit'], 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT)
    const offset = queryInt(raw['offset'], 'offset', 0, 0, Number.MAX_SAFE_INTEGER)

    const tasks = this.index.list()
    const rawItems = this.collect(tasks, { q, kind, tier, source, taskId })

    const items = dedupe ? dedupeByDoi(rawItems) : rawItems.map((r) => r.item)
    const total = items.length
    const page = items.slice(offset, offset + limit)

    // tasks_scanned = 本次结果**覆盖的任务数**（结果 items 中去重的 task_id 数，
    // 与分页无关）——与前端 LibraryPage 的"收录任务数"统计口径一致。
    const tasksScanned = new Set(items.map((i) => i.task_id)).size
    return { total, tasks_scanned: tasksScanned, items: page, offset, limit }
  }

  /**
   * 全库 R1 文献证据（v2.4）：聚合**全部任务**的 R1 检索证据，按规范化 DOI 去重。
   * 与 `query()` 同源同去重口径，仅额外限定 `producer_step === 'R1'`——供全库 BibTeX 导出复用，
   * 避免导出侧另造一套聚合/去重逻辑而与文献库漂移。
   */
  literature(): LibraryItem[] {
    const rows = this.collect(this.index.list(), { q: '', kind: '', tier: '', source: '', taskId: '' })
    return dedupeByDoi(rows.filter((r) => r.item.producer_step === 'R1'))
  }

  /** 扫描全部任务账本，返回通过过滤的原始证据（保持稳定顺序） */
  private collect(
    tasks: TaskRecord[],
    f: { q: string; kind: string; tier: string; source: string; taskId: string },
  ): RawEvidence[] {
    const out: RawEvidence[] = []
    for (const task of tasks) {
      let records: LedgerRecordView[]
      try {
        records = this.reports.readLedger(task.task_id)
      } catch (e) {
        // 单个任务账本读取失败不应拖垮整个文献库：如实跳过并留日志。
        this.log.warn('文献库跳过不可读账本', {
          taskId: task.task_id,
          reason: e instanceof Error ? e.message : String(e),
        })
        continue
      }
      for (const rec of records) {
        if (rec.record_type !== 'evidence') continue
        const item = toItem(task, rec)
        if (!matches(item, f)) continue
        out.push({
          task_id: task.task_id,
          task_goal: task.goal,
          task_created_at: task.created_at ?? '',
          seq: rec.seq,
          item,
        })
      }
    }
    // 稳定排序：最新任务优先（created_at 降序）→ task_id 升序 → seq 升序。
    // 该顺序同时决定去重时「代表条目」的选取（首个出现者即代表）。
    out.sort((a, b) => {
      if (a.task_created_at !== b.task_created_at) return a.task_created_at < b.task_created_at ? 1 : -1
      if (a.task_id !== b.task_id) return a.task_id < b.task_id ? -1 : 1
      return a.seq - b.seq
    })
    return out
  }
}

/** 记录 → 文献库条目 */
function toItem(task: TaskRecord, rec: LedgerRecordView): LibraryItem {
  const ref = asRecord(rec.data['ref'])
  return {
    ev_id: asText(rec.data['ev_id']),
    task_id: task.task_id,
    task_goal: task.goal,
    tier: asText(rec.data['tier']),
    kind: asText(rec.data['kind']),
    title: asText(rec.data['title']),
    ref: {
      doi: asText(ref['doi']),
      title: asText(ref['title']),
      authors: asArray(ref['authors']).map((a) => asText(a)),
      year: (ref['year'] as number | string | null) ?? null,
      venue: asText(ref['venue']),
      source: asText(ref['source']),
    },
    producer_step: asText(rec.data['producer_step']),
    duplicates_count: 0,
  }
}

/** 过滤：q 命中 title / ref.title / ref.doi / 作者（大小写不敏感，已小写化）；其余精确匹配 */
function matches(item: LibraryItem, f: { q: string; kind: string; tier: string; source: string; taskId: string }): boolean {
  if (f.kind && item.kind !== f.kind) return false
  if (f.tier && item.tier !== f.tier) return false
  if (f.source && item.ref.source !== f.source) return false
  if (f.taskId && item.task_id !== f.taskId) return false
  if (f.q) {
    const haystack = [item.title, item.ref.title, item.ref.doi, item.ref.authors.join(' '), item.ref.venue, item.ref.source]
      .join('\n')
      .toLowerCase()
    if (!haystack.includes(f.q)) return false
  }
  return true
}

/** 按规范化 DOI 合并（无 DOI 保留为独立条目）；代表取首个出现者，duplicates_count=组内条目数-1 */
function dedupeByDoi(rows: RawEvidence[]): LibraryItem[] {
  // 先统计每组条目数（两遍扫描，避免在重排时持有可变分组数组）
  const counts = new Map<string, number>()
  for (const row of rows) {
    const doi = normalizeDoi(row.item.ref.doi)
    if (!doi) continue // 无 DOI 不聚合
    counts.set(doi, (counts.get(doi) ?? 0) + 1)
  }

  // 保持原顺序：按 rows 原始次序输出，DOI 组只在其首次出现处输出一个代表。
  const seenRep = new Set<string>()
  const out: LibraryItem[] = []
  for (const row of rows) {
    const doi = normalizeDoi(row.item.ref.doi)
    if (!doi) {
      out.push(row.item) // 无 DOI：各自独立，duplicates_count=0
      continue
    }
    if (seenRep.has(doi)) continue
    seenRep.add(doi)
    out.push({ ...row.item, duplicates_count: (counts.get(doi) ?? 1) - 1 })
  }
  return out
}

// ---------------------------------------------------------------- 参数解析

function queryText(raw: unknown, name: string): string {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string') {
    throw new ApiError(
      'BAD_PARAM',
      `查询参数 ${name} 非法：应为一个字符串`,
      '同一参数不可重复出现（如 ?limit=1&limit=2）；请只传一次。',
    )
  }
  return raw.trim()
}

function parseDedupe(raw: unknown): boolean {
  const v = queryText(raw, 'dedupe').toLowerCase()
  if (v === '' || v === 'on') return true
  if (v === 'off') return false
  throw new ApiError('BAD_PARAM', `查询参数 dedupe 非法：${v}`, '允许值：on | off（默认 on）。')
}

function queryInt(raw: unknown, name: string, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw === null || raw === '') return fallback
  if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) {
    throw new ApiError('BAD_PARAM', `查询参数 ${name} 非法：${String(raw)}`, `应为 ${min}~${max} 之间的整数。`)
  }
  const n = Number(raw.trim())
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ApiError('BAD_PARAM', `查询参数 ${name} 越界：${n}`, `应为 ${min}~${max} 之间的整数。`)
  }
  return n
}
