import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Logger } from '../infra/logger.js'
import type { TaskIndex } from '../store/task-index.js'

/**
 * 报告与证据只读服务（BE-08 报告聚合 / BE-09 证据只读，需求 §8.1 接口 10–13、§8.2、§9.5、§9.6）。
 *
 * 设计红线：
 * 1. **只读**：只读 `runs/<task_id>/` 下的内核产物（report.json / report.md / ledger.jsonl / state.json），
 *    **不 spawn 内核、不写产物**——执行一律经 AGH（"执行不绕过 AGH"）；报告生成由内核在 run_all 终态完成。
 * 2. **门禁由内核裁定**：报告是否可出由内核 `report.assemble` 的门禁（哈希链完整 / 结论 100% 绑定 fact /
 *    判断批次齐全）决定；BFF 只如实反映 `report_gate.json` 的结果，不二次"放行"。
 * 3. **未就绪不报错**（§8.2）：报告未就绪 → 200 `{status:"generating"}`；任务不存在 → 404。
 * 4. **mtime 指纹缓存**（§10 性能）：热路径产物读取按 mtime+size 命中缓存，避免重复解析账本。
 */

export type ReportSection = { id: string; title: string; body: string }
export type ReportConclusion = { cid: string; text: string; evidence_ids: string[]; confidence?: string }

export type StructuredReport = {
  task_id: string
  title: string
  abstract: string
  sections: ReportSection[]
  conclusions: ReportConclusion[]
  evidence_count?: number
  degraded?: boolean
  degraded_statement?: string
  ledger_digest?: string
  ledger_head?: string
  gate?: { passed: boolean; bypass?: boolean }
  run_status?: string
  generated_at?: string
}

export type GateInfo = {
  passed: boolean
  reasons: string[]
  checked_at?: string
  human_summary?: string
}

export type LedgerRecordView = {
  seq: number
  record_type: string
  at: string
  chain_hash: string
  data: Record<string, unknown>
}

/** 缓存条目：以产物 mtimeMs+size 为指纹，命中即免去磁盘解析 */
type CacheEntry<T> = { fingerprint: string; value: T }

export class ReportService {
  private readonly runsDir: string
  private readonly log: Logger
  private readonly reportCache = new Map<string, CacheEntry<StructuredReport>>()
  private readonly markdownCache = new Map<string, CacheEntry<string>>()
  private readonly ledgerCache = new Map<string, CacheEntry<LedgerRecordView[]>>()

  constructor(
    runsDir: string,
    private readonly index: TaskIndex,
    log: Logger,
  ) {
    this.runsDir = runsDir
    this.log = log.child({ component: 'report-service' })
  }

  // ------------------------------------------------------------ 报告

  /** GET /tasks/{id}/report —— 就绪返回结构化报告；未就绪返回 generating（均 200） */
  getReport(taskId: string): { status: 'ready'; report: StructuredReport } | { status: 'generating'; gate: GateInfo | null; run_status: string } {
    const gate = this.readGate(taskId)
    const file = this.reportPath(taskId)
    if (!existsSync(file)) {
      const rec = this.index.get(taskId)
      return {
        status: 'generating',
        gate,
        run_status: rec?.run_status ?? 'PLANNED',
      }
    }
    const report = this.readCached(this.reportCache, taskId, file, () => this.parseReport(file))
    if (!report) {
      // 文件存在但解析失败：视为未就绪并留日志（不把半截文件当有效产物，§9.5）
      this.log.warn('报告产物解析失败，按未就绪处理', { taskId, file })
      return { status: 'generating', gate, run_status: this.index.get(taskId)?.run_status ?? 'PLANNED' }
    }
    return { status: 'ready', report }
  }

  /** 报告是否就绪（供事件泵/执行编排器判定 report_ready，避免重复 existsSync） */
  isReportReady(taskId: string): boolean {
    return existsSync(this.reportPath(taskId))
  }

  /**
   * GET /tasks/{id}/report.md —— 返回 Markdown 文本。
   * 未就绪 → null（路由层映射为 404 NO_REPORT）。
   */
  getReportMarkdown(taskId: string): string | null {
    const file = this.markdownPath(taskId)
    if (!existsSync(file)) return null
    return this.readCached(this.markdownCache, taskId, file, () => {
      try {
        return readFileSync(file, 'utf8')
      } catch {
        return null
      }
    })
  }

  /** 内核门禁结果（如实反映，不二次裁定） */
  readGate(taskId: string): GateInfo | null {
    const file = resolve(this.runsDir, taskId, 'report_gate.json')
    if (!existsSync(file)) return null
    try {
      const g = JSON.parse(readFileSync(file, 'utf8')) as GateInfo
      return {
        passed: Boolean(g.passed),
        reasons: Array.isArray(g.reasons) ? g.reasons.map(String) : [],
        checked_at: g.checked_at,
        human_summary: g.human_summary,
      }
    } catch {
      return null
    }
  }

  // ------------------------------------------------------------ 证据只读

  /**
   * GET /tasks/{id}/evidence —— 证据/结论/轨迹只读装配（面向视图 DTO）。
   * 轨迹来源：内核账本记录序列（含 at 时间戳与 chain_hash）+ 任务步骤快照；不重造 AGH 会话轨迹（那是导出接口的职责）。
   */
  getEvidence(taskId: string): {
    task_id: string
    run_status: string
    degraded: boolean
    counts: { evidence: number; conclusions: number; judgments: number; notes: number; records: number }
    evidence: Array<{
      ev_id: string
      tier: string
      kind: string
      title: string
      producer_step: string
      doi: string | null
      authors: string[]
      year: number | string | null
      venue: string
      source: string
      sha256: string | null
      at: string
      chain_hash: string
    }>
    conclusions: Array<{ cid: string; text: string; evidence_ids: string[]; confidence: string; producer_step: string; at: string }>
    judgments: Array<{ seq: number; at: string; summary: string; data: Record<string, unknown> }>
    notes: Array<{ seq: number; at: string; text: string }>
    chain_head: string | null
    run: { workflow?: string; goal?: string; steps?: unknown[] } | null
  } {
    const records = this.readLedger(taskId)
    const evidence = records
      .filter((r) => r.record_type === 'evidence')
      .map((r) => {
        const ref = (r.data['ref'] ?? {}) as Record<string, unknown>
        return {
          ev_id: String(r.data['ev_id'] ?? ''),
          tier: String(r.data['tier'] ?? ''),
          kind: String(r.data['kind'] ?? ''),
          title: String(r.data['title'] ?? ''),
          producer_step: String(r.data['producer_step'] ?? ''),
          doi: (ref['doi'] as string) || null,
          authors: Array.isArray(ref['authors']) ? (ref['authors'] as unknown[]).map(String) : [],
          year: (ref['year'] as number | string) ?? null,
          venue: String(ref['venue'] ?? ''),
          source: String(ref['source'] ?? ''),
          sha256: (ref['sha256'] as string) ?? (r.data['sha256'] as string) ?? null,
          at: r.at,
          chain_hash: r.chain_hash,
        }
      })

    const conclusions = records
      .filter((r) => r.record_type === 'conclusion')
      .map((r) => ({
        cid: String(r.data['cid'] ?? ''),
        text: String(r.data['text'] ?? ''),
        evidence_ids: Array.isArray(r.data['evidence_ids']) ? (r.data['evidence_ids'] as unknown[]).map(String) : [],
        confidence: String(r.data['confidence'] ?? 'medium'),
        producer_step: String(r.data['producer_step'] ?? ''),
        at: r.at,
      }))

    const judgments = records
      .filter((r) => r.record_type === 'judgment')
      .map((r) => ({
        seq: r.seq,
        at: r.at,
        summary: String(r.data['summary'] ?? r.data['dimension'] ?? '判断'),
        data: r.data,
      }))

    const notes = records
      .filter((r) => r.record_type === 'note')
      .map((r) => ({ seq: r.seq, at: r.at, text: String(r.data['text'] ?? '') }))

    const rec = this.index.get(taskId)
    return {
      task_id: taskId,
      run_status: rec?.run_status ?? 'PLANNED',
      degraded: rec?.degraded ?? false,
      counts: {
        evidence: evidence.length,
        conclusions: conclusions.length,
        judgments: judgments.length,
        notes: notes.length,
        records: records.length,
      },
      evidence,
      conclusions,
      judgments,
      notes,
      chain_head: records.length > 0 ? records[records.length - 1]!.chain_hash : null,
      run: rec ? { workflow: rec.workflow, goal: rec.goal, steps: rec.steps } : null,
    }
  }

  /**
   * GET /tasks/{id}/cite?ev= —— 引用回查（§9.6：DOI/作者/年份 或 产物哈希前缀）。
   * 支持：完整 EV 编号（EV-0001）、哈希前缀（≥6 位十六进制）。
   */
  cite(taskId: string, rawEv: string): { found: boolean; reason?: string; available?: string[]; citation?: unknown } {
    const ev = rawEv.trim()
    if (ev === '') return { found: false, reason: '缺少查询参数 ev（证据编号如 EV-0001，或 ≥6 位哈希前缀）' }

    const records = this.readLedger(taskId)
    const evidence = records.filter((r) => r.record_type === 'evidence')
    const byId = evidence.find((r) => String(r.data['ev_id'] ?? '') === ev)

    if (byId) return { found: true, citation: this.toCitation(byId) }

    // 哈希前缀回查（文献 ref.sha256 / 记录 sha256 / 链哈希皆可）
    if (/^[0-9a-fA-F]{6,64}$/.test(ev)) {
      const lower = ev.toLowerCase()
      const hit = evidence.find((r) => {
        const ref = (r.data['ref'] ?? {}) as Record<string, unknown>
        const candidates = [ref['sha256'], r.data['sha256'], r.chain_hash]
        return candidates.some((c) => typeof c === 'string' && (c as string).toLowerCase().startsWith(lower))
      })
      if (hit) return { found: true, citation: { ...this.toCitation(hit), matched_by: 'sha256_prefix' } }
      return {
        found: false,
        reason: `未找到哈希前缀匹配的证据（${ev}…）`,
        available: evidence.slice(0, 20).map((r) => String(r.data['ev_id'] ?? '')),
      }
    }

    return {
      found: false,
      reason: `未找到证据 ${ev}（请使用 EV-#### 编号或 ≥6 位哈希前缀）`,
      available: evidence.slice(0, 20).map((r) => String(r.data['ev_id'] ?? '')),
    }
  }

  private toCitation(rec: LedgerRecordView): Record<string, unknown> {
    const ref = (rec.data['ref'] ?? {}) as Record<string, unknown>
    const derivedFrom = ref['derived_from'] as string | undefined
    return {
      ev_id: String(rec.data['ev_id'] ?? ''),
      tier: String(rec.data['tier'] ?? ''),
      kind: String(rec.data['kind'] ?? ''),
      title: String(rec.data['title'] ?? ''),
      producer_step: String(rec.data['producer_step'] ?? ''),
      doi: (ref['doi'] as string) || null,
      authors: Array.isArray(ref['authors']) ? (ref['authors'] as unknown[]).map(String) : derivedFrom ? [derivedFrom] : [],
      year: (ref['year'] as number | string) ?? null,
      venue: String(ref['venue'] ?? ''),
      source: String(ref['source'] ?? ''),
      file: (ref['file'] as string) || null,
      sha256: (ref['sha256'] as string) ?? (rec.data['sha256'] as string) ?? null,
      chain_hash: rec.chain_hash,
      seq: rec.seq,
      at: rec.at,
    }
  }

  // ------------------------------------------------------------ 内部

  private reportPath(taskId: string): string {
    return resolve(this.runsDir, taskId, 'report.json')
  }
  private markdownPath(taskId: string): string {
    return resolve(this.runsDir, taskId, 'report.md')
  }

  /** 账本读取（jsonl → 记录视图），mtime 指纹缓存 */
  readLedger(taskId: string): LedgerRecordView[] {
    const file = resolve(this.runsDir, taskId, 'ledger.jsonl')
    if (!existsSync(file)) return []
    return (
      this.readCached(this.ledgerCache, taskId, file, () => {
        const raw = readFileSync(file, 'utf8')
        const out: LedgerRecordView[] = []
        for (const line of raw.split('\n')) {
          const t = line.trim()
          if (!t) continue
          try {
            const obj = JSON.parse(t) as Record<string, unknown>
            const { seq, record_type, chain_hash, at, ...data } = obj
            out.push({
              seq: Number(seq ?? 0),
              record_type: String(record_type ?? ''),
              chain_hash: String(chain_hash ?? ''),
              at: String(at ?? ''),
              data: data as Record<string, unknown>,
            })
          } catch {
            // 半截行（追加写崩溃残留）不采信，也不让整份账本解析失败
          }
        }
        return out
      }) ?? []
    )
  }

  private parseReport(file: string): StructuredReport | null {
    try {
      const r = JSON.parse(readFileSync(file, 'utf8')) as StructuredReport
      if (!r || typeof r !== 'object' || typeof r.title !== 'string' || !Array.isArray(r.sections)) return null
      return r
    } catch {
      return null
    }
  }

  /** mtime+size 指纹缓存（§10：热路径产物读取加指纹缓存） */
  private readCached<T>(cache: Map<string, CacheEntry<T>>, key: string, file: string, load: () => T | null): T | null {
    let fingerprint: string
    try {
      const st = statSync(file)
      fingerprint = `${st.mtimeMs}:${st.size}`
    } catch {
      return null
    }
    const hit = cache.get(key)
    if (hit && hit.fingerprint === fingerprint) return hit.value
    const value = load()
    if (value === null) {
      cache.delete(key)
      return null
    }
    cache.set(key, { fingerprint, value })
    return value
  }
}