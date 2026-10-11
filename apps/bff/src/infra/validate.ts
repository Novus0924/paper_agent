import { ApiError } from './errors.js'

/**
 * 输入校验（BE-01 / §11 安全）：
 * - goal 严格校验（去空格非空、长度上限 8192）；
 * - 标识白名单防目录穿越；
 * - 枚举非法回退默认并显式告知（不悄悄改变用户意图）。
 */

export const GOAL_MAX_LENGTH = 8192

export function validateGoal(raw: unknown): string {
  if (typeof raw !== 'string') throw ApiError.badGoal('goal 必须是字符串。')
  const goal = raw.trim()
  if (goal.length === 0) throw ApiError.badGoal('goal 不能为空。')
  if (goal.length > GOAL_MAX_LENGTH) {
    throw ApiError.badGoal(`goal 长度超限：${goal.length} > ${GOAL_MAX_LENGTH}。`)
  }
  return goal
}

/** task_id 白名单：^run-[0-9A-Za-z_-]+$，拒绝路径分隔符与 ..（防目录穿越） */
const TASK_ID_RE = /^run-[0-9A-Za-z_-]+$/

export function validateTaskId(raw: unknown): string {
  if (typeof raw !== 'string' || !TASK_ID_RE.test(raw) || raw.includes('..')) {
    throw ApiError.badId(String(raw))
  }
  return raw
}

/**
 * turn_id 白名单：M8 多轮消息的回合标识，格式 `turn-<n>`。
 * 刻意**不复用** validateTaskId —— turn_id 不是 task_id，用任务白名单校验属于
 * 「恰好通过」而非「正确校验」：一旦 turn 格式变化或与 task_id 混淆，白名单就形同虚设。
 */
const TURN_ID_RE = /^turn-[0-9]{1,9}$/

export function validateTurnId(raw: unknown): string {
  if (typeof raw !== 'string' || !TURN_ID_RE.test(raw)) {
    throw new ApiError('BAD_PARAM', `非法回合标识：${String(raw)}`, 'turn_id 形如 turn-1（turn- + 数字）。')
  }
  return raw
}

/** 校验结果：值 + 是否回退（非法回退默认并显式告知） */
export type ValidatedEnum<T extends string> = { value: T; fellBack: boolean; reason?: string }

export function validateEnum<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  fallback: T,
  label: string,
): ValidatedEnum<T> {
  if (raw === undefined || raw === null || raw === '') return { value: fallback, fellBack: false }
  if (typeof raw === 'string' && (allowed as readonly string[]).includes(raw)) {
    return { value: raw as T, fellBack: false }
  }
  return {
    value: fallback,
    fellBack: true,
    reason: `${label} 非法：${JSON.stringify(raw)}，已回退默认 ${fallback}（允许：${allowed.join(' | ')}）`,
  }
}

// ⚠️ 诊断信息必须能显示"用户到底传了什么"。
// `String(item)` 对对象/数组会产出 '[object Object]'，让这条提示彻底失去诊断价值
// （用户看到"已丢弃 [object Object]"根本不知道该改什么）。
// 故这里显式区分类型。
const describe = (v: unknown): string =>
  typeof v === 'string' ? v : `${typeof v}:${JSON.stringify(v)?.slice(0, 40) ?? String(v)}`

/** sources[] 数组校验：去重、保序、剔除非法项并告知 */
export function validateSources(raw: unknown, allowed: readonly string[]): { value: string[]; dropped: string[] } {
  if (raw === undefined || raw === null) return { value: [], dropped: [] }
  if (!Array.isArray(raw)) return { value: [], dropped: [describe(raw)] }
  const seen = new Set<string>()
  const value: string[] = []
  const dropped: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string' || !allowed.includes(item)) {
      dropped.push(describe(item))
      continue
    }
    if (seen.has(item)) continue
    seen.add(item)
    value.push(item)
  }
  return { value, dropped }
}
