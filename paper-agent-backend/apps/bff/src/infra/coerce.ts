/**
 * 安全取文本 —— 从 `unknown`（如账本记录的 `data`）提取字符串。
 *
 * 为什么需要它：`String(x ?? '')` 在 `x` 是对象时会静默产出 `'[object Object]'`，
 * 不抛错、不报警，只在**输出里**变成垃圾。对本项目尤其致命：
 * 账本记录是 `Record<string, unknown>`，字段类型完全由写入方决定；
 * 一旦某个 `ev_id` 被写成对象，报告里就会出现 `EV-[object Object]`，
 * 而**门禁和自评审都发现不了**（它们只看证据 ID 是否存在，不看是否像 ID）。
 *
 * 语义（确定性、可测试）：
 * - `string` → 原样返回；
 * - `number` / `boolean` / `bigint` → `String(x)`（这类转字符串是无损且可预期的）；
 * - `null` / `undefined` → `fallback`；
 * - **其他对象/数组/函数/符号** → `fallback`（**绝不**产 `[object Object]`）。
 *
 * 为什么不给对象做 JSON 序列化：那会把一个结构化字段悄悄摊平成一串文本，
 * 让下游误以为它是原子值。若确实要展示结构，应在调用点显式 `JSON.stringify`，
 * 让"这是结构"这件事在代码里看得见。
 */
export function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return fallback
}

/**
 * 同`asText`，但用于**对象型字段**（如证据 `ref`）：允许展开一层结构，
 * 但绝不静默 `[object Object]`。
 *
 * 存在的意义：账本里 `ref` 这类字段是「小结构」，
 * 读模型需要展示它的若干标量字段。与 `asText` 分开是为了**逼调用方表态**——
 * 该用 `asText`（要原子值）还是 `asRecord`（要结构）不能靠猜。
 */
export function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/** 数组型字段：非数组一律给空数组（`asText` 的数组版，但保留元素）。 */
export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** 可选数字：NaN/Infinity 一律回退（避免把无效数字写进产物）。 */
export function asNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}