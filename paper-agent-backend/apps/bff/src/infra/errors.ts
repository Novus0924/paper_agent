/**
 * 统一错误模型（BE-01 / §8.3）：
 * 所有 API 错误统一为 { "error": string, "code": string }，HTTP 状态码按 code 映射。
 */

export type ErrorCode =
  | 'BAD_GOAL'
  | 'BAD_BODY'
  | 'BAD_PARAM'
  | 'BAD_ID'
  | 'NOT_FOUND'
  | 'NO_REPORT'
  | 'BUSY'
  | 'BAD_STATE'
  | 'NOT_READY'
  | 'SESSION_ERROR'
  | 'CLI_ERROR'
  | 'EXPORT_ERROR'
  | 'INTERNAL'

const STATUS: Record<ErrorCode, number> = {
  BAD_GOAL: 400,
  BAD_BODY: 400,
  BAD_PARAM: 400,
  BAD_ID: 400,
  NOT_FOUND: 404,
  NO_REPORT: 404,
  BUSY: 409,
  BAD_STATE: 409,
  NOT_READY: 409,
  SESSION_ERROR: 500,
  CLI_ERROR: 500,
  EXPORT_ERROR: 500,
  INTERNAL: 500,
}

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  /** 人类可读的修复动作（Fail-fast + 人类可读原则） */
  readonly action?: string

  constructor(code: ErrorCode, message: string, action?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = STATUS[code]
    this.action = action
  }

  static badGoal(message: string): ApiError {
    return new ApiError('BAD_GOAL', message, '请检查研究目标输入（去空格后非空、长度不超过上限）。')
  }
  static badBody(message: string): ApiError {
    return new ApiError('BAD_BODY', message, '请检查请求体 JSON 结构。')
  }
  static badId(id: string): ApiError {
    return new ApiError('BAD_ID', `非法标识：${id}`, 'task_id 应形如 run-YYYYMMDD-HHMMSS-xxxxxx（仅字母数字下划线连字符）。')
  }
  static notFound(what: string): ApiError {
    return new ApiError('NOT_FOUND', `${what} 不存在`, '请先通过 GET /api/v1/tasks 核对标识。')
  }
  static busy(): ApiError {
    return new ApiError('BUSY', '该任务已有步骤在执行', '请等待当前执行完成（订阅 /events 获取 done 事件）后再触发。')
  }
  static sessionError(reason: string): ApiError {
    return new ApiError(
      'SESSION_ERROR',
      `AGH 会话操作失败：${reason}`,
      '请确认 AGH daemon 已启动（node packages/cli/dist/local/agnes.mjs serve）且本机可连接；可运行 pnpm doctor 自检。',
    )
  }
}

/** Fastify 统一错误响应体 */
export function errorBody(err: ApiError): { error: string; code: string } {
  // action 说明并入 error 文本（人类可读），保持响应体字段恰好两个（契约不变）
  const text = err.action ? `${err.message}（${err.action}）` : err.message
  return { error: text, code: err.code }
}
