/**
 * 结构化日志（BE-01）：JSON 行，级别统一，字段稳定。
 * 不引入 pino 等重依赖，保持 BFF 轻量可控。
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const
export type LogLevel = keyof typeof LEVELS

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void
  info(msg: string, fields?: Record<string, unknown>): void
  warn(msg: string, fields?: Record<string, unknown>): void
  error(msg: string, fields?: Record<string, unknown>): void
  child(bound: Record<string, unknown>): Logger
}

export function createLogger(level: LogLevel, base: Record<string, unknown> = {}): Logger {
  const threshold = LEVELS[level]
  const emit = (lvl: LogLevel, msg: string, fields?: Record<string, unknown>) => {
    if (LEVELS[lvl] < threshold) return
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level: lvl,
      msg,
      ...base,
      ...fields,
    })
    if (LEVELS[lvl] >= LEVELS['error']) process.stderr.write(`${line}\n`)
    else process.stdout.write(`${line}\n`)
  }
  const make = (bound: Record<string, unknown>): Logger => ({
    debug: (m, f) => emit('debug', m, f),
    info: (m, f) => emit('info', m, f),
    warn: (m, f) => emit('warn', m, f),
    error: (m, f) => emit('error', m, f),
    child: (extra) => make({ ...bound, ...extra }),
  })
  return make(base)
}

/** 脱敏：不落日志的敏感键（密钥绝不入库/回显） */
export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = /key|token|secret|password|authorization/i.test(k) ? '[redacted]' : v
  }
  return out
}
