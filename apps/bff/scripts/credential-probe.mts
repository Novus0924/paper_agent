/**
 * 诊断 AGH 凭据存储为何不可读（Windows 私有 ACL 校验）。
 *
 * 背景：`CONFIG_CREDENTIAL_STORE / The credential store is unavailable.`
 * 这个报错信息极不具体——AGH 把底层原因都吞掉了（见 configuration.ts 的
 * `catch { throw new ConfigurationError('CONFIG_CREDENTIAL_STORE') }`）。
 * 本探针按 AGH 的真实校验顺序逐项复现，定位到底哪一步失败：
 *   1. windowsPrivateFilesAvailable()  —— 原生模块是否可用
 *   2. hasPrivateDaclSync(<secrets 目录>)  —— 父目录 ACL 是否"私有"
 *   3. hasPrivateDaclSync(<凭据文件>)       —— 文件 ACL 是否"私有"
 *
 * 依据：packages/host/src/adapters/credential-files.ts
 *   - resolveCredentialFile(): root/secrets/<provider>/<name>
 *   - requireEnforcement(): level 必须为 'full'（即 windowsPrivateFilesAvailable() 为 true）
 *   - validateWindowsPermissions(): hasPrivateDaclSync(path) 必须为 true
 *
 * 用法：tsx credential-probe.mts [aghHome]
 */
import * as sn from '@agnes/system-node'
import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const home = process.argv[2] ?? join(homedir(), '.agh')

console.log('agh home          =', home)
console.log('native available  =', sn.windowsPrivateFilesAvailable())

const secretsDir = join(home, 'secrets')
console.log('secrets dir exists=', existsSync(secretsDir))

function dacl(p: string): void {
  try {
    const ok = (sn as unknown as { hasPrivateDaclSync(x: string): boolean }).hasPrivateDaclSync(p)
    console.log(`  hasPrivateDacl(${p.replace(home, '<home>')}) = ${ok}`)
  } catch (e) {
    console.log(`  hasPrivateDacl(${p.replace(home, '<home>')}) THREW: ${e instanceof Error ? e.message : String(e)}`)
  }
}

if (existsSync(secretsDir)) {
  dacl(secretsDir)
  for (const provider of readdirSync(secretsDir)) {
    const pdir = join(secretsDir, provider)
    console.log(` provider=${provider} isDir=${lstatSync(pdir).isDirectory()}`)
    dacl(pdir)
    if (lstatSync(pdir).isDirectory()) {
      for (const f of readdirSync(pdir)) dacl(join(pdir, f))
    }
  }
}

console.log('')
console.log('若 native available=false → enforcement level=unavailable → requireEnforcement 直接抛，')
console.log('   与文件是否存在无关；此时应检查 Node 版本是否为 ≥24.10（原生模块按Node 24 libuv ABI 构建）。')
console.log('若 hasPrivateDacl 返回 false → 需把该目录/文件的 ACL 收紧为仅当前用户（勿删文件，可重设 ACL）。')
