import type { MsgKey } from '@/i18n';

/** 后端错误码 → i18n 文案键（每个错误都有人类可读说明与下一步，铁律 5） */
const CODE_KEYS: Record<string, MsgKey> = {
  BAD_GOAL: 'errors.BAD_GOAL',
  BAD_BODY: 'errors.BAD_BODY',
  BAD_PARAM: 'errors.BAD_PARAM',
  BAD_ID: 'errors.BAD_ID',
  NOT_FOUND: 'errors.NOT_FOUND',
  NO_REPORT: 'errors.NO_REPORT',
  BUSY: 'errors.BUSY',
  BAD_STATE: 'errors.BAD_STATE',
  NOT_READY: 'errors.NOT_READY',
  SESSION_ERROR: 'errors.SESSION_ERROR',
  CLI_ERROR: 'errors.CLI_ERROR',
  EXPORT_ERROR: 'errors.EXPORT_ERROR',
};

export class ApiError extends Error {
  readonly code: string;
  /** 该错误是否值得重试（瞬时错误） */
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: string,
    message?: string,
    options?: { retryable?: boolean; status?: number },
  ) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = options?.retryable ?? (code === 'NETWORK' || code === 'TIMEOUT');
    this.status = options?.status;
  }

  get messageKey(): MsgKey {
    return CODE_KEYS[this.code] ?? 'errors.UNKNOWN';
  }
}

export function toApiError(cause: unknown): ApiError {
  if (cause instanceof ApiError) return cause;
  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return new ApiError('TIMEOUT', undefined, { retryable: true });
  }
  if (cause instanceof TypeError) {
    // fetch 在网络层失败时抛 TypeError（服务未启动 / 跨域 / 断网）
    return new ApiError('NETWORK', cause.message, { retryable: true });
  }
  return new ApiError('UNKNOWN', cause instanceof Error ? cause.message : String(cause));
}

/** 从后端统一错误体 { error, code } 解析 */
export async function parseErrorBody(res: Response): Promise<ApiError> {
  let code = 'UNKNOWN';
  let message: string | undefined;
  try {
    const body = (await res.json()) as { error?: string; code?: string };
    code = body.code ?? code;
    message = body.error;
  } catch {
    /* 非 JSON 错误体：保留状态码语义 */
  }
  if (res.status === 404 && code === 'UNKNOWN') code = 'NOT_FOUND';
  if (res.status === 409 && code === 'UNKNOWN') code = 'BUSY';
  return new ApiError(code, message, {
    status: res.status,
    retryable: res.status >= 500 || res.status === 409,
  });
}
