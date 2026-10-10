/**
 * 分层 DTO / 读模型（P-02，需求 §4.1 "BFF 路由、读模型装配"）。
 *
 * 病灶（P-02 原文）：「后端把原始内部对象（系统提示词、工具原始 JSON、哈希）直接作为响应，
 * 未提供面向视图的读模型」→ **前端暴露过多后端内容**。
 *
 * 目标（需求原文）：「区分『用户面向字段』与『审计字段』；默认响应**不含**原始提示词/哈希，
 * 审计字段经**独立授权接口或显式参数**获取」。
 *
 * 三个层次（名字即契约，改动需同步 README 与前端）：
 *   view    —— 默认。用户界面渲染所需。不含任何哈希/提示词/链信息。
 *   audit   —— 需显式 `?view=audit` 或带令牌走审计接口。含链信息与门禁细节。
 *   raw     —— **不提供 HTTP 出口**。内核原始产物只在服务内部流转（审计包 ZIP 走 §8.1 接口 15）。
 *
 * 为什么这样切：
 * - `ledger_digest` / `ledger_head` / `chain_hash` 这类值对**用户界面零价值**，
 *   却能让前端"顺手"把它们渲染到页面上（一旦渲染就成了对外承诺，且极易被误当作可变字段）；
 * - 提示词/指令原文属于**实现细节与审计对象**，不是产品功能；
 * - 但审计/复现场景**确实需要**它们 → 所以不藏死，而是走显式授权通道。
 *
 * 关键约束：**默认不返回 ≠ 删数据**。内核产物原样保存在 `runs/<id>/`，
 * DTO 只是读模型层的投影，不改写、不裁剪磁盘产物。
 */
import { ApiError } from '../infra/errors.js'

/**
 * 审计字段名（出现在内核产物里、但**不属于**用户面向字段的那些键）。
 *
 * ⚠️ `gate` **不在**此列，这是刻意判断：§9.2/§9.5 要求"门禁拒绝出报告**可被观测**"
 * （M6 验收用例直接断言 `body.gate.passed === false` 与拒绝原因）。
 * 用户界面**必须**能显示"为什么还没出报告"，否则就成了黑盒——
 * 那不是"暴露内部对象"，那是把关键状态藏起来。P-02 要挡的是哈希与提示词，不是状态。
 *
 * 同理 `chain_head` 也保留：它是账本链的**当前头**，用于把界面上的证据与账本对上号，
 * 属于可解释性的一部分；单条记录的 `chain_hash` 才是纯审计细节。
 */
export const AUDIT_ONLY_KEYS = [
  'ledger_digest',
  'chain_hash',
  'prev_hash',
  'entry_hash',
  'hash',
  'prompt',
  'system_prompt',
  'instruction',
  'raw',
  'tool_args',
] as const

/** 是否为审计字段（大小写与下划线不敏感，`-` 与 `_` 等价）。 */
export function isAuditKey(key: string): boolean {
  const norm = key.toLowerCase().replace(/-/g, '_')
  return (AUDIT_ONLY_KEYS as readonly string[]).some((k) => k.toLowerCase().replace(/-/g, '_') === norm)
}

export type ViewLevel = 'view' | 'audit'

/** 从查询串解析视图级别。默认 `view`；`audit` 必须显式请求。 */
export function parseViewLevel(raw: unknown): ViewLevel {
  if (typeof raw !== 'string' || raw.trim() === '') return 'view'
  const v = raw.trim().toLowerCase()
  if (v === 'audit') return 'audit'
  if (v === 'view') return 'view'
  // 用项目既有的 ApiError（统一错误体 {error, code}，§8.3），不另造一套
  throw new ApiError('BAD_PARAM', `不支持的 view：${JSON.stringify(raw)}`, '允许：view（默认）| audit（含哈希与门禁等审计字段）。')
}

/**
 * 剥掉审计字段，得到用户面向视图（**递归**）。
 *
 * 递归而非只剥一层：证据/结论里嵌套着哈希与出证据，若只处理顶层会漏。
 * 深度上限 12 层，防循环引用导致栈溢出（内核产物虽为 JSON，但防御性实现更稳）。
 */
export function stripAuditFields<T>(input: T, depth = 0): T {
  if (depth > 12) return input
  if (Array.isArray(input)) return input.map((v) => stripAuditFields(v, depth + 1)) as unknown as T
  if (input === null || typeof input !== 'object') return input
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (isAuditKey(k)) continue
    out[k] = stripAuditFields(v, depth + 1)
  }
  return out as unknown as T
}

/**
 * 组装带视图级别的响应。
 *
 * 契约：`{ task_id, view: "view"|"audit", ...payload }`
 * `view` 字段始终回显，让调用方**永远知道**自己拿到的是哪一层——
 * 否则"偶尔有哈希"会让人误以为哈希不稳定。
 */
export function respond<T extends Record<string, unknown>>(
  taskId: string,
  level: ViewLevel,
  payload: T,
): { task_id: string; view: ViewLevel } & (T | Record<string, unknown>) {
  if (level === 'audit') {
    return { task_id: taskId, view: 'audit', ...payload }
  }
  return { task_id: taskId, view: 'view', ...(stripAuditFields(payload) as Record<string, unknown>) }
}

/**
 * 审计字段**是否被真的挡住了**——给测试与 E2E 用的自检探针。
 *
 * 为什么需要它：剥字段是"负向操作"（删掉某些键），一旦实现有漏，
 * 前端就会**静默**拿到本不该有的字段，而响应看起来完全正常。
 * 与我在 ACL 审计上踩的坑同型：**判定"已挡住"必须有正向证据**。
 *
 * @returns 未被挡住的字段路径；空数组表示全部挡住。
 */
export function findLeakedAuditFields(value: unknown, path = '', depth = 0): string[] {
  if (depth > 12) return []
  const leaks: string[] = []
  if (Array.isArray(value)) {
    value.forEach((v, i) => leaks.push(...findLeakedAuditFields(v, `${path}[${i}]`, depth + 1)))
    return leaks
  }
  if (value === null || typeof value !== 'object') return []
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const here = path ? `${path}.${k}` : k
    if (isAuditKey(k)) leaks.push(here)
    leaks.push(...findLeakedAuditFields(v, here, depth + 1))
  }
  return leaks
}