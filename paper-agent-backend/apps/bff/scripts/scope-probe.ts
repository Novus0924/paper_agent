/**
 * resolveDaemonScope 诊断脚本：打印完整错误链（name/code/facts/cause/stack）。
 * 用途：定位 credential store / profile 解析类故障（本机曾用于诊断
 * CONFIG_CREDENTIAL_STORE —— 根因是 @agnes/system-node 原生模块未构建）。
 *
 * 用法：npx tsx apps/bff/scripts/scope-probe.ts
 */
import { resolveDaemonScope } from '@agnes/daemon'

/** 错误对象上可能挂载的非标准字段（ConfigurationError.facts、Node cause 链等） */
type ErrorLike = Error & { code?: unknown; facts?: unknown; cause?: unknown }

/** strict 模式下 catch 变量为 unknown：递归收窄并结构化序列化错误链 */
function describeError(error: unknown, depth = 0): Record<string, unknown> {
  if (depth > 4) return { truncated: true }
  if (error instanceof Error) {
    const like = error as ErrorLike
    const out: Record<string, unknown> = {
      name: like.name,
      message: like.message,
    }
    if (like.code !== undefined) out['code'] = like.code
    if (like.facts !== undefined) out['facts'] = like.facts
    if (like.cause !== undefined) out['cause'] = describeError(like.cause, depth + 1)
    if (like.stack !== undefined) out['stack'] = like.stack
    return out
  }
  return { value: String(error) }
}

try {
  const scope = await resolveDaemonScope({ env: process.env, cwd: process.cwd() })
  console.log(
    'OK',
    JSON.stringify({ home: scope.home, profile: scope.profile, workspace: scope.workspace }, null, 2),
  )
} catch (error) {
  console.log('ERROR', JSON.stringify(describeError(error), null, 2))
}
