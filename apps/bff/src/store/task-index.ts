import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Logger } from '../infra/logger.js'

/**
 * 任务索引（BE-03）：Task↔Session 1:1 映射与任务元数据。
 * MVP 用本地 JSON（结构对 SQLite 友好：一任务一记录、可整体替换为表）；
 * 原子写（tmp + rename），BFF 重启后凭此重建内存态。
 */

export type RunStatus = 'PLANNED' | 'RUNNING' | 'DONE' | 'FAILED'
export type StepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'SKIPPED'

export type TaskStepRecord = {
  id: string
  label: string
  status: StepStatus
  attempts: number
}

export type TaskRecord = {
  task_id: string
  goal: string
  workflow: string
  lit_source: string
  sources: string[]
  run_status: RunStatus
  degraded: boolean
  session_id: string
  created_at: string
  updated_at: string
  steps: TaskStepRecord[]
}

export type TaskIndexFile = {
  version: 1
  tasks: TaskRecord[]
}

export class TaskIndex {
  private readonly file: string
  private readonly log: Logger
  private tasks = new Map<string, TaskRecord>()

  constructor(dataDir: string, log: Logger) {
    this.file = resolve(dataDir, 'task-index.json')
    this.log = log.child({ component: 'task-index' })
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
    this.load()
  }

  private load(): void {
    if (!existsSync(this.file)) {
      this.log.info('任务索引不存在，从空开始', { file: this.file })
      return
    }
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as TaskIndexFile
      if (raw.version !== 1 || !Array.isArray(raw.tasks)) {
        throw new Error('索引文件结构非法（期望 version 1 + tasks 数组）')
      }
      this.tasks = new Map(raw.tasks.map((t) => [t.task_id, t]))
      this.log.info('任务索引已加载', { file: this.file, count: this.tasks.size })
    } catch (e) {
      // fail-fast + 人类可读：索引损坏不允许被静默重置（防数据丢失）
      throw new Error(
        `任务索引文件损坏：${this.file}（${e instanceof Error ? e.message : String(e)}）。` +
          '请人工核对该文件或将其移走后重启（原文件保留证据）。',
      )
    }
  }

  private persist(): void {
    // 原子写：tmp + rename，防半截文件被采信（§6 容错策略）
    const payload: TaskIndexFile = { version: 1, tasks: [...this.tasks.values()] }
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8')
    renameSync(tmp, this.file)
  }

  count(): number {
    return this.tasks.size
  }

  list(status?: RunStatus): TaskRecord[] {
    const all = [...this.tasks.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    return status ? all.filter((t) => t.run_status === status) : all
  }

  get(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId)
  }

  put(record: TaskRecord): void {
    record.updated_at = new Date().toISOString()
    this.tasks.set(record.task_id, record)
    this.persist()
  }

  /** BFF 重启后：列出所有带 session 的任务（供网关批量附加恢复） */
  allWithSessions(): TaskRecord[] {
    return [...this.tasks.values()].filter((t) => Boolean(t.session_id))
  }
}
