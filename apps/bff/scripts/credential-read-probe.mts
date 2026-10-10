/**
 * 复现 AGH 凭据读取的真实异常（探针 credential-probe 只查了 ACL，全绿但read 仍失败）。
 *
 * 这里直接调用 AGH 自己的 `createCredentialStore().read(ref)`，把被吞掉的原始异常打出来。
 * 判据来自 packages/host/src/configuration.ts:689 —— 那里 `catch { throw CONFIG_CREDENTIAL_STORE }`
 * 把真实原因（可能是解析失败、JSON 非法、envelope 校验不过…）全部丢弃。
 *
 * 用法：tsx credential-read-probe.mts [ref]
 */
import { createCredentialStore } from '@agnes/host'
import { homedir } from 'node:os'
import { join } from 'node:path'

const home = process.env['AGH_HOME'] ?? join(homedir(), '.agh')
const ref = process.argv[2] ?? 'secret://agnes-ai/account-2c17ccb7725dee4ed245e5fb-r1'

const store = createCredentialStore({ root: home } as never)
console.log('root  =', home)
console.log('ref   =', ref)
console.log('enforcement =', JSON.stringify((store as unknown as { enforcement: unknown }).enforcement))

try {
  const cred = await store.read(ref)
  if (cred === null) {
    console.log('read() 返回 null → 文件不存在或两种kind 都没读到（检查 kind 与文件名）')
  } else {
    const v = (cred as { value?: unknown }).value
    console.log('read() 成功，value 前缀 =', typeof v === 'string' ? String(v).slice(0, 6) + '…' : typeof v)
  }
} catch (e) {
  const err = e as { code?: string; ref?: string; reason?: string; message?: string; name?: string }
  console.log('read() 抛出：')
  console.log('  name   =', err?.name)
  console.log('  code   =', err?.code)
  console.log('  reason =', err?.reason, '   ← AGH 原本要吞掉的关键信息')
  console.log('  ref    =', err?.ref)
  console.log('  message=', err?.message)
}
