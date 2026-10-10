import type { AppContext } from '../../app.js'
import { ApiError } from '../../infra/errors.js'
import { validateGoal, validateTaskId, validateEnum, validateSources } from '../../infra/validate.js'
import { KNOWN_SOURCES, probeSources } from '../../services/preflight.js'
import type { RunStatus, TaskRecord } from '../../store/task-index.js'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 任务路由（BE-03，§8.1）：
 * - GET  /api/v1/tasks            列表（?status=）
 * - POST /api/v1/tasks            创建（goal/workflow/lit_source/sources）
 * - GET  /api/v1/tasks/{id}       任务快照（面向视图 DTO）
 * 面向视图 DTO（P-02）：用户字段与审计字段分离，默认响应不含原始提示词/哈希。
 */

/**
 * 工作流白名单。
 *
 * ⚠️ `materials` 已从"声明可用"改为**显式未实现**（2026-10-11）。
 * 之前它和其他值一样被接受、步骤表也定义了，直到执行到某一步才抛
 * `PipelineError: 步骤 P1 尚未实现`——**失败点太晚**：用户建完任务、连会话都建好了、
 * 才发现自己选的工作流根本跑不通，白白消耗一次 AGH 回合。
 *
 * 现在的行为：创建时即400，并说清"未实现 + 可用什么替代"。
 * 这是 §11 Fail-fast 原则的直接应用：越早暴露��越省资源。
 */
const WORKFLOWS = ['research'] as const

/** 已声明但**尚未实现**的工作流（入口即拒绝，附替代方案）。 */
const WORKFLOWS_NOT_IMPLEMENTED: Record<string, string> = {
  materials: '材料发现工作流（候选生成/性质预测/条件搜索/多目标排序/报告汇总）尚未实现内核算子。MVP 请用 workflow=research。',
}

const LIT_SOURCES = ['local', 'arxiv', 'auto'] as const

/** 工作流步骤定义（与领域内核 WorkflowSpec 同源；M2 内核落地后由其提供） */
export const WORKFLOW_STEPS: Record<string, { id: string; label: string }[]> = {
  research: [
    { id: 'R1', label: '多源检索' },
    { id: 'R2', label: '论文精读' },
    { id: 'R3', label: '创新点拆解' },
    { id: 'R4', label: '事实验证' },
    { id: 'R5', label: '综述写作' },
    { id: 'R6', label: '自评审' },
  ],
  materials: [
    { id: 'P1', label: '候选生成' },
    { id: 'P2', label: '性质预测' },
    { id: 'P3', label: '条件搜索' },
    { id: 'P4', label: '多目标排序' },
    { id: 'P5', label: '报告汇总' },
  ],
}

function newTaskId(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const rand = Math.random().toString(36).slice(2, 8)
  return `run-${stamp}-${rand}`
}

export function registerTasksRoutes(app: import('fastify').FastifyInstance, ctx: AppContext): void {
  app.get('/tasks', async (req) => {
    const query = req.query as { status?: string }
    let statusFilter: RunStatus | undefined
    if (query.status) {
      const allowed: readonly RunStatus[] = ['PLANNED', 'RUNNING', 'DONE', 'FAILED']
      const hit = allowed.includes(query.status as RunStatus) ? (query.status as RunStatus) : undefined
      if (!hit) throw new ApiError('BAD_PARAM', `status 过滤值非法：${query.status}`, '允许：PLANNED | RUNNING | DONE | FAILED。')
      statusFilter = hit
    }
    const tasks = ctx.index.list(statusFilter)
    return { tasks: tasks.map(taskSnapshot), total: tasks.length }
  })

  app.get('/tasks/:id', async (req) => {
    const { id } = req.params as { id: string }
    const taskId = validateTaskId(id)
    const rec = ctx.index.get(taskId)
    if (!rec) throw ApiError.notFound(`任务 ${taskId}`)
    return taskSnapshot(rec)
  })

  app.post('/tasks', async (req, reply) => {
    // body 必须是 JSON 对象
    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>
    const goal = validateGoal(body['goal'])

    // ⚠️ 顺序要紧：先判"未实现"再走 validateEnum。
    // 反过来的话，materials 会先被 validateEnum 拦下，抛通用错误，
    // 我写的"未实现 + 替代方案"说明永远轮不到执行（等于白写）。
    const wfRaw = typeof body['workflow'] === 'string' ? body['workflow'].trim() : ''
    if (wfRaw && !WORKFLOWS.includes(wfRaw as (typeof WORKFLOWS)[number])) {
      const why = WORKFLOWS_NOT_IMPLEMENTED[wfRaw]
      throw new ApiError(
        'BAD_PARAM',
        `workflow=${wfRaw} 暂不可用`,
        why ??
          `支持的工作流：${WORKFLOWS.join(' / ')}。` +
            `注：白名单按实现情况收紧——新增工作流须先落地内核算子，不能只在 API 层声明。`,
      )
    }
    const workflow = validateEnum(body['workflow'], WORKFLOWS, 'research', 'workflow')
    const litSource = validateEnum(body['lit_source'], LIT_SOURCES, 'auto', 'lit_source')
    const sources = validateSources(body['sources'], KNOWN_SOURCES)

    // 默认源集合（lit_source=local 时不默认启用远程源）
    const effectiveSources = sources.value.length > 0 ? sources.value : litSource.value === 'local' ? [] : KNOWN_SOURCES

    // 1) 连通性预检（P-01）：不可达源仅记录、不阻断创建
    const preflight = await probeSources(effectiveSources)

    // 2) 建立任务与运行目录
    const taskId = newTaskId()
    const runDir = resolve(ctx.cfg.runsDir, taskId)
    mkdirSync(runDir, { recursive: true })

    // 3) 经会话网关建立 AGH 会话（Task↔Session 1:1，P-04 核心）
    let sessionId: string
    try {
      sessionId = await ctx.gateway.createSession(taskId, runDir)
    } catch (e) {
      throw ApiError.sessionError(e instanceof Error ? e.message : String(e))
    }

    // 4) 持久化任务记录（含 session 映射）
    const steps = (WORKFLOW_STEPS[workflow.value] ?? WORKFLOW_STEPS['research']!).map((s) => ({
      id: s.id,
      label: s.label,
      status: 'PENDING' as const,
      attempts: 0,
    }))
    const now = new Date().toISOString()
    ctx.index.put({
      task_id: taskId,
      goal,
      workflow: workflow.value,
      lit_source: litSource.value,
      sources: effectiveSources,
      run_status: 'PLANNED',
      degraded: false,
      degraded_reasons: [],
      session_id: sessionId,
      created_at: now,
      updated_at: now,
      steps,
    })

    const rec = ctx.index.get(taskId)!
    ctx.log.info('任务已创建', { taskId, sessionId, workflow: workflow.value })

    reply.code(201)
    const notes: string[] = []
    if (workflow.fellBack && workflow.reason) notes.push(workflow.reason)
    if (litSource.fellBack && litSource.reason) notes.push(litSource.reason)
    if (sources.dropped.length > 0) notes.push(`已忽略非法数据源：${sources.dropped.join(', ')}`)
    return {
      task_id: taskId,
      session_id: sessionId,
      state: taskSnapshot(rec),
      preflight: { sources: preflight },
      ...(notes.length > 0 ? { notes } : {}),
    }
  })
}

/** 面向视图 DTO（P-02）：用户面向字段；审计字段（哈希/提示词）默认不出现在此 */
export function taskSnapshot(rec: TaskRecord) {
  return {
    task_id: rec.task_id,
    title: rec.goal,
    workflow: rec.workflow,
    run_status: rec.run_status,
    steps: rec.steps.map((s) => ({
      id: s.id,
      label: s.label,
      status: s.status,
      attempts: s.attempts,
    })),
    degraded: rec.degraded,
    session_id: rec.session_id,
    created_at: rec.created_at,
    updated_at: rec.updated_at,
  }
}
