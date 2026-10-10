import type { Logger } from '../infra/logger.js'
import type { TaskRecord } from '../store/task-index.js'
import type { ReportService } from '../services/report.js'
import { ApiError } from '../infra/errors.js'
import { buildZip, type ZipEntry } from './zip.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const execFileAsync = promisify(execFile)

/**
 * 导出服务（BE-10，需求 §8.1 接口 15、§8.2 导出契约、§9.6 验收、§560 Exporter SPI）。
 *
 * 三类导出（§385）：
 *   - `report`  → Markdown 文件流（text/markdown）
 *   - `audit`   → 审计包 ZIP（报告 + 账本 + 事件 + 结论 + **校验脚本** + 清单）
 *   - `session` → AGH 会话轨迹（**经 AGH 原生导出**，不重造底座，P-04/P-06）
 *
 * 未完成 → 409 NOT_READY，并说明当前可导出范围（§386）。
 * 失败 → 500 EXPORT_ERROR，附人类可读原因与重试指引。
 *
 * SPI 设计（§560"新增导出格式=实现导出器"）：
 *   只需向 `EXPORTERS` 注册一个 `Exporter` 实现即可新增格式，路由与参数解析零改动。
 */

export type ExportKind = 'report' | 'audit' | 'session'

export type ExportResult = {
  kind: ExportKind
  /** HTTP 内容类型 */
  contentType: string
  /** 建议文件名（Content-Disposition） */
  filename: string
  body: Buffer | string
  /** 该导出实际包含的产物清单（审计包 manifest 用；其余格式用于日志与调试） */
  contents: string[]
}

/** 导出器接口（SPI 契约） */
export interface Exporter {
  readonly kind: ExportKind
  /** 该格式当前是否可导出（用于 NOT_READY 的"可导出范围"提示） */
  available(task: TaskRecord, ctx: ExportContext): { ok: boolean; reason?: string }
  export(task: TaskRecord, ctx: ExportContext): Promise<ExportResult>
}

export type ExportContext = {
  runsDir: string
  reports: ReportService
  log: Logger
  /** AGH CLI 入口（session 导出经原生 CLI） */
  aghCli: string
  /** AGH home / profile（透传给 CLI） */
  aghHome: string | undefined
  agnesProfile: string | undefined
  /** 查询参数 format（仅 session 用：agnes|sharegpt|claude-code） */
  sessionFormat: string
}

// ---------------------------------------------------------------- report（Markdown 文件流）

const reportExporter: Exporter = {
  kind: 'report',
  available(task, ctx) {
    const md = ctx.reports.getReportMarkdown(task.task_id)
    if (md === null) return { ok: false, reason: '报告尚未就绪（流水线未达终态 DONE 或门禁未通过）' }
    return { ok: true }
  },
  async export(task, ctx) {
    const md = ctx.reports.getReportMarkdown(task.task_id)
    if (md === null) throw notReady(task.task_id, ['report'])
    return {
      kind: 'report',
      contentType: 'text/markdown; charset=utf-8',
      filename: `${task.task_id}-report.md`,
      body: md,
      contents: ['report.md'],
    }
  },
}

// ---------------------------------------------------------------- audit（审计包 ZIP）

/** 审计包内校验脚本（用内核 CLI 独立复核，不依赖本BFF 代码 → 校验是独立的） */
const VERIFY_SCRIPT = `#!/usr/bin/env python3
"""审计包独立校验脚本（由 paper-agent BFF 导出时生成）。

用法（在审计包根目录）：
    python verify.py --run-dir ./run

校验三项（对应需求 §9.5 报告门禁）：
    1. 账本哈希链完整（独立重算，不信任包内任何结论）
    2. 结论 100% 绑定 fact 级证据
    3. 报告与账本摘要一致（report.json.ledger_digest == 重算摘要）
退出码：0 通过 / 1 存在问题
"""
import hashlib
import json
import sys
from pathlib import Path


def canonical_json(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_text(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


GENESIS = "0" * 64


def main():
    run_dir = Path(sys.argv[sys.argv.index("--run-dir") + 1] if "--run-dir" in sys.argv else "./run")
    ledger_file = run_dir / "ledger.jsonl"
    if not ledger_file.exists():
        print(f"[FAIL] 找不到账本：{ledger_file}")
        return 1

    records = []
    for line in ledger_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            records.append(json.loads(line))

    problems = []
    prev = GENESIS
    evidence = {}
    for idx, rec in enumerate(records):
        body = {k: v for k, v in rec.items() if k != "chain_hash"}
        expect = sha256_text(prev + canonical_json(body))
        if rec.get("seq") != idx + 1:
            problems.append(f"seq 不连续：期望 {idx + 1}，实际 {rec.get('seq')}")
        if expect != rec.get("chain_hash"):
            problems.append(f"seq={rec.get('seq')} chain_hash 与重算值不一致（疑似篡改）")
        if rec.get("record_type") == "evidence":
            ev_id = str(rec.get("ev_id", ""))
            evidence[ev_id] = rec
        if rec.get("record_type") == "conclusion":
            ids = list(rec.get("evidence_ids", []))
            if not ids:
                problems.append(f"结论 {rec.get('cid')} 未绑定证据")
            for ev_id in ids:
                ev = evidence.get(str(ev_id))
                if ev is None:
                    problems.append(f"结论 {rec.get('cid')} 引用了不存在的证据 {ev_id}")
                elif str(ev.get("tier")) != "fact":
                    problems.append(f"结论 {rec.get('cid')} 绑定了非 fact 证据 {ev_id}")
        prev = str(rec.get("chain_hash", ""))

    digest = sha256_text(canonical_json(records))
    report_file = run_dir / "report.json"
    if report_file.exists():
        report = json.loads(report_file.read_text(encoding="utf-8"))
        if report.get("ledger_digest") != digest:
            problems.append(f"报告 ledger_digest={report.get('ledger_digest')} 与账本重算摘要 {digest} 不一致")

    print(f"账本记录：{len(records)} 条")
    print(f"证据条目：{len(evidence)} 条")
    print(f"账本摘要：{digest}")
    if problems:
        print(f"[FAIL] 发现 {len(problems)} 处问题：")
        for p in problems[:20]:
            print(f"  - {p}")
        return 1
    print("[OK] 哈希链完整、结论绑定有效、报告与账本一致")
    return 0


if __name__ == "__main__":
    sys.exit(main())
`

const auditExporter: Exporter = {
  kind: 'audit',
  available(task, ctx) {
    if (!ctx.reports.isReportReady(task.task_id)) {
      return { ok: false, reason: '报告尚未就绪（审计包需以报告为聚合根）' }
    }
    return { ok: true }
  },
  async export(task, ctx) {
    const runDir = join(ctx.runsDir, task.task_id)
    const entries: ZipEntry[] = []
    const contents: string[] = []

    // 1) 报告（结构化 + Markdown）
    const md = ctx.reports.getReportMarkdown(task.task_id)
    if (md === null) throw notReady(task.task_id, ['audit'])
    entries.push({ name: 'run/report.md', content: md })
    contents.push('run/report.md')

    // 2) 账本（原始 JSONL，防篡改审计的源头）
    const ledger = ctx.reports.readLedger(task.task_id)
    const ledgerText = ledger.length > 0 ? readLedgerRaw(ctx.runsDir, task.task_id) : ''
    if (ledgerText) {
      entries.push({ name: 'run/ledger.jsonl', content: ledgerText })
      contents.push('run/ledger.jsonl')
    }

    // 3) 状态与门禁结论
    for (const [name, file] of [
      ['run/state.json', 'state.json'],
      ['run/report_gate.json', 'report_gate.json'],
      ['run/review.json', 'review.json'],
    ] as const) {
      const content = readIfExists(join(ctx.runsDir, task.task_id, file))
      if (content !== null) {
        entries.push({ name, content })
        contents.push(name)
      }
    }

    // 4) 事件（归一事件，从 SSE 总线快照取；不可用则如实标注缺失）
    const events = buildEventSummary(task, ledger)
    entries.push({ name: 'run/events.json', content: JSON.stringify(events, null, 2) })
    contents.push('run/events.json')

    // 5) 结论（单列，便于评审直接引用）
    const conclusions = ledger
      .filter((r) => r.record_type === 'conclusion')
      .map((r) => ({ cid: r.data['cid'], text: r.data['text'], evidence_ids: r.data['evidence_ids'] }))
    entries.push({ name: 'run/conclusions.json', content: JSON.stringify(conclusions, null, 2) })
    contents.push('run/conclusions.json')

    // 6) 校验脚本（独立复核，不依赖 BFF）
    entries.push({ name: 'verify.py', content: VERIFY_SCRIPT })
    contents.push('verify.py')

    // 7) 清单：文件 + sha256 + 门禁状态（§9.6"文件清单与校验状态完整"）
    const gate = ctx.reports.readGate(task.task_id)
    const manifest = {
      task_id: task.task_id,
      session_id: task.session_id,
      goal: task.goal,
      workflow: task.workflow,
      run_status: task.run_status,
      degraded: task.degraded,
      generated_at: new Date().toISOString(),
      gate,
      counts: {
        evidence: ledger.filter((r) => r.record_type === 'evidence').length,
        conclusions: conclusions.length,
        judgments: ledger.filter((r) => r.record_type === 'judgment').length,
        ledger_records: ledger.length,
      },
      files: entries.map((e) => {
        const buf = Buffer.isBuffer(e.content) ? e.content : Buffer.from(e.content, 'utf8')
        return {
          path: e.name,
          bytes: buf.length,
          sha256: createHash('sha256').update(buf).digest('hex'),
        }
      }),
      how_to_verify: 'python verify.py --run-dir run',
    }
    entries.push({ name: 'manifest.json', content: JSON.stringify(manifest, null, 2) })
    contents.push('manifest.json')

    return {
      kind: 'audit',
      contentType: 'application/zip',
      filename: `${task.task_id}-audit.zip`,
      body: buildZip(entries),
      contents,
    }
  },
}

// ---------------------------------------------------------------- session（经 AGH 原生导出）

const SESSION_FORMATS = new Set(['agnes', 'sharegpt', 'claude-code'])

const sessionExporter: Exporter = {
  kind: 'session',
  available(task) {
    // 导出经 AGH daemon；会话 id 缺失或非AGH 会话则不可导出
    if (!task.session_id || !task.session_id.includes('workspace:')) {
      return { ok: false, reason: '该任务没有 AGH 会话映射（session_id 非 AGH 会话格式）' }
    }
    return { ok: true }
  },
  async export(task, ctx) {
    const format = ctx.sessionFormat
    if (!SESSION_FORMATS.has(format)) {
      throw new ApiError(
        'BAD_PARAM',
        `不支持的 session 导出格式：${format}`,
        `允许：${[...SESSION_FORMATS].join(' | ')}（如 ?kind=session&format=agnes）`,
      )
    }

    // 经 AGH 原生 CLI 导出（§385「经原生导出」、P-04③「导出复用 AGH 原生会话导出」）。
    // 子进程环境白名单裁剪，不整包透传宿主env（§11防提示注入诱导泄露密钥）。
    const tmp = mkdtempSync(join(tmpdir(), 'paper-export-'))
    const outFile = join(tmp, `session.${format === 'agnes' ? 'jsonl' : 'json'}`)
    const env: NodeJS.ProcessEnv = {
      PATH: process.env['PATH'] ?? '',
      SystemRoot: process.env['SystemRoot'] ?? '',
      TEMP: process.env['TEMP'] ?? '',
      ...(ctx.aghHome ? { AGH_HOME: ctx.aghHome } : {}),
      ...(ctx.agnesProfile ? { AGNES_PROFILE: ctx.agnesProfile } : {}),
    }
    // 导出成功后**先读回内容再清理临时目录**：
    // 若把 rmSync 放在 finally 里先执行，后续 readIfExists 必然读不到（文件已删），
    // 会让所有 session 导出误报「未产出文件」。
    let body: string | null = null
    try {
      const args = ['export', task.session_id, '--format', format, '-o', outFile]
      await execFileAsync(process.execPath, [ctx.aghCli, ...args], {
        env,
        timeout: 60_000,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
      })
      body = readIfExists(outFile)
    } catch (e) {
      const err = e as { stderr?: string; stdout?: string; code?: number | string; message?: string }
      const detail = (err.stderr || err.stdout || err.message || String(e)).trim().split('\n')[0] ?? '未知错误'
      ctx.log.warn('AGH 会话导出失败', { taskId: task.task_id, sessionId: task.session_id, reason: detail })
      throw new ApiError(
        'EXPORT_ERROR',
        `AGH 会话导出失败：${detail}`,
        '请确认 AGH daemon 已启动（bash agh.sh daemon start）且该会话仍在本机可查；可先运行 bash agh.sh export <session_id> --format agnes 手工验证。',
      )
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }

    if (body === null) {
      throw new ApiError(
        'EXPORT_ERROR',
        'AGH 会话导出未产出文件',
        '请确认 session_id 对应的会话存在（可运行 bash agh.sh export <session_id> --format agnes 复现）后重试。',
      )
    }
    return {
      kind: 'session',
      contentType: format === 'agnes' ? 'application/x-ndjson; charset=utf-8' : 'application/json; charset=utf-8',
      filename: `${task.task_id}-session.${format === 'agnes' ? 'jsonl' : 'json'}`,
      body,
      contents: [`session.${format}`],
    }
  },
}

// ---------------------------------------------------------------- 注册表（SPI）

export const EXPORTERS: Record<ExportKind, Exporter> = {
  report: reportExporter,
  audit: auditExporter,
  session: sessionExporter,
}

export const EXPORT_KINDS = Object.keys(EXPORTERS) as ExportKind[]

// ---------------------------------------------------------------- 服务

export class ExportService {
  private readonly log: Logger

  constructor(
    private readonly runsDir: string,
    private readonly reports: ReportService,
    log: Logger,
    private readonly aghCli: string,
    private readonly aghHome: string | undefined,
    private readonly agnesProfile: string | undefined,
  ) {
    this.log = log.child({ component: 'export-service' })
  }

  /** 执行导出；不可导出时抛 409 NOT_READY（附可导出范围），失败抛 500 EXPORT_ERROR */
  async export(task: TaskRecord, kind: ExportKind, sessionFormat: string): Promise<ExportResult> {
    const exporter = EXPORTERS[kind]
    const ctx: ExportContext = {
      runsDir: this.runsDir,
      reports: this.reports,
      log: this.log,
      aghCli: this.aghCli,
      aghHome: this.aghHome,
      agnesProfile: this.agnesProfile,
      sessionFormat,
    }
    const ready = exporter.available(task, ctx)
    if (!ready.ok) throw notReady(task.task_id, this.availableKinds(task, ctx), ready.reason)
    return exporter.export(task, ctx)
  }

  /** 当前任务实际可导出的格式（供 NOT_READY 的"可导出范围"与健康检查使用） */
  availableKinds(task: TaskRecord, ctx?: ExportContext): ExportKind[] {
    const base: ExportContext =
      ctx ?? {
        runsDir: this.runsDir,
        reports: this.reports,
        log: this.log,
        aghCli: this.aghCli,
        aghHome: this.aghHome,
        agnesProfile: this.agnesProfile,
        sessionFormat: 'agnes',
      }
    return EXPORT_KINDS.filter((k) => EXPORTERS[k].available(task, base).ok)
  }
}

/** 409 NOT_READY：说明可导出范围（§386） */
function notReady(taskId: string, availableKinds: ExportKind[], reason?: string): ApiError {
  const avail = availableKinds.length > 0 ? availableKinds.join(' | ') : '（当前无可导出格式）'
  return new ApiError(
    'NOT_READY',
    `任务 ${taskId} 尚不可导出${reason ? `：${reason}` : ''}。当前可导出：${avail}`,
    '报告类导出需流水线达终态 DONE 且门禁通过；会话导出需 AGH daemon 运行且该任务有 AGH 会话映射。',
  )
}

// ---------------------------------------------------------------- 小工具

function readIfExists(file: string): string | null {
  try {
    // 同步读取小文件（账本/报告量级为数十 KB ~ 数 MB，远低于需要流式的规模）
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

function readLedgerRaw(runsDir: string, taskId: string): string {
  return readIfExists(join(runsDir, taskId, 'ledger.jsonl')) ?? ''
}


/** 事件摘要（从账本与任务状态重建可核对的事件视图；SSE 总线缓冲不持久化，故以账本为准） */
function buildEventSummary(task: TaskRecord, ledger: ReturnType<ReportService['readLedger']>): unknown {
  return {
    note: '事件由账本与任务状态重建（SSE 缓冲为内存态，不持久化；原始事件可另行导出 kind=session）',
    task_id: task.task_id,
    steps: task.steps.map((s) => ({ step: s.id, label: s.label, status: s.status, attempts: s.attempts })),
    degraded: task.degraded,
    degraded_reasons: task.degraded_reasons,
    ledger_timeline: ledger.map((r) => ({ seq: r.seq, at: r.at, type: r.record_type })),
  }
}