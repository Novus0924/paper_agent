/**
 * 读取并**校验** AGH home 及其凭据目录链的 ACL（Node 版，可回传结果）。
 *
 * 为什么需要这个脚本：PowerShell 工具在本机不回传 stdout（只给退出码），
 * 无法用它确认 ACL 是否真的改成功。icacls 的表格输出又随系统语言变化，
 * 故这里统一走 `icacls /save` 的 DACL 序列化 + BOM/UTF-16 兼容解码，
 * 并直接按 AGH 的判据（每级只允许 SY=System + 当前用户）给出 PASS/FAIL。
 *
 * 判据来源：AGH `packages/host/src/adapters/credential-files.ts`
 *   - checkCredentialParents(): 逐级检查 <root> / <root>/secrets / <root>/secrets/<provider>
 *   - requireEnforcement(): level必须为 'full'（即 windowsPrivateFilesAvailable()）
 *   - validateWindowsPermissions(): hasPrivateDaclSync() 必须为 true
 * 任一级出现**第三个** ACE 主体 → 判定 mode 不安全 → 上层吞成 "credential store unavailable"。
 *
 * 用法：tsx acl-audit.mts [aghHome]
 * 退出码：0 = ACL 合规；1 = 存在多余主体（附修复命令）
 */
import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'

const run = promisify(execFile)
const home = process.argv[2] ?? join(process.env['USERPROFILE'] ?? '', '.agh')

/** SID：NT AUTHORITY\SYSTEM 的固定 SID。 */
const SYSTEM_SID = 'S-1-5-18'

/**
 * ACE 里写的是**别名**（如 SYSTEM 的 `SY`），而 Windows 判定按**真实 SID**。
 * 故比较前统一把已知名��归一化为 SID，否则会把 SYSTEM 误判成"多余主体"。
 * 只需覆盖常见几个；未覆盖的别名会原样保留（仍是误报，方向安全）。
 */
const SID_ALIASES: Record<string, string> = {
  SY: SYSTEM_SID,
  BA: 'S-1-5-32-544',// Builtin\Administrators
  BU: 'S-1-5-32-545',// Builtin\Users
  WD: 'S-1-1-0',    // Everyone
  AU: 'S-1-5-18',    // Authenticated Users（与 SYSTEM 同 SID）
}

function normalizeSid(raw: string): string {
  return SID_ALIASES[raw.trim().toUpperCase()] ?? raw.trim()
}

/** 取当前用户的 SID（用于判断"是否只有我 + SYSTEM"）。 */
async function currentUserSid(): Promise<string> {
  // 两种写法都试：`GetCurrent()` 显式取当前身份；退回到无参构造。
  // 只用其中一种在本机会偶发取空 → 后面会把 SYSTEM 和当前用户都误判为"多余"。
  const scripts = [
    '(New-Object System.Security.Principal.WindowsIdentity([System.Security.Principal.WindowsIdentity]::GetCurrent())).User.Value',
    '(New-Object System.Security.Principal.WindowsIdentity()).User.Value',
    '[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value',
  ]
  for (const s of scripts) {
    try {
      const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', s], {
        encoding: 'utf8',
        timeout: 20_000,
      })
      const v = String(stdout).trim()
      if (/^S-1-/.test(v)) return v
    } catch {
      // 试下一种
    }
  }
  return ''
}

/**
 * 读某路径的 DACL 串。
 *
 * ⚠️ 编码坑（本机实测）：`icacls /save` 写出的是 **UTF-16LE 且不带 BOM**，
 *所以"看 BOM 判断 UTF-16"的做法会失效 → 按 UTF-8 解码得到乱码 →
 * `indexOf('D:')` 返回 -1 → 误判为"0 个 ACE、合规"（假通过，最危险）。
 * 正确做法：**按内容特征嗅探**（有大量 NUL 字节即 UTF-16LE），再按需解码。
 *
 * icacls /save 的格式： "<路径>\r\nD:(A;OICI;FA;;;SY)..."，路径可能含空格，
 * 故按 "D:" 的位置切，而不是整行正则。
 */
async function daclOf(path: string): Promise<string> {
  const tmp = join(tmpdir(), `acl-${randomUUID()}.txt`)
  try {
    await run('icacls.exe', [path, '/save', tmp], { encoding: 'utf8', timeout: 20_000 })
    const buf = readFileSync(tmp)
    // 嗅探 UTF-16LE：ASCII 文本在 UTF-16LE 下奇数字节为 0
    const isUtf16 = buf.length > 2 && buf[0] !== 0 && buf[1] === 0
    let text = isUtf16 ? buf.toString('utf16le') : buf.toString('utf8')
    text = text.replace(/^﻿/, '')
    const i = text.indexOf('D:')
    return i >= 0 ? text.slice(i).split(/\r?\n/)[0]!.trim() : text.trim().slice(0, 200)
  } catch (e) {
    return `<icacls /save 失败: ${e instanceof Error ? e.message : String(e)}>`
  }
}

/** 取出 DACL 里所有 ACE 的主体 SID。 */
function aceSids(dacl: string): string[] {
  const i = dacl.indexOf('(')
  const j = dacl.lastIndexOf(')')
  if (i < 0 || j <= i) return []
  const body = dacl.slice(i, j + 1)
  return [...body.matchAll(/\([^()]*;;;([^)]+)\)/g)].map((m) => m[1] as string).filter(Boolean)
}

/** SID → 可读名（失败则返回 SID 本身）。 */
async function nameOf(sid: string): Promise<string> {
  try {
    const { stdout } = await run(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command',
        `(New-Object System.Security.Principal.SecurityIdentifier('${sid}')).Translate([System.Security.Principal.NTAccount]).Value`],
      { encoding: 'utf8', timeout: 20_000 },
    )
    return String(stdout).trim() || sid
  } catch {
    return sid
  }
}

const me = await currentUserSid()
console.log('AGH home       =', home)
console.log('current user SID=', me || '(取不到)')
console.log('')

let failed = 0
for (const p of [home, join(home, 'secrets'), join(home, 'secrets', 'agnes-ai')]) {
  if (!existsSync(p)) {
    console.log(`[SKIP] 不存在: ${p}`)
    continue
  }
  const dacl = await daclOf(p)
  const sids = aceSids(dacl).map(normalizeSid)
  // 解析不出 ACE 时**必须报错**，绝不能当成"合规"——
  // 曾因解码错误导致 0 个 ACE 而假通过（假通过比假失败危险得多）。
  if (sids.length === 0) {
    failed += 1
    console.log(`[FAIL] ${p}   ← 解析不出任何 ACE（解码或格式异常），无法判定`)
    console.log(`       原始输出：${JSON.stringify(dacl)}`)
    console.log('       这是工具自身的问题，不是 ACL 合规。请勿据此认为可以放行。')
    continue
  }
  // AGH 允许的主体：SYSTEM 与当前用户（其余一律多余）
  const extras = sids.filter((s) => s !== SYSTEM_SID && s !== me)
  if (extras.length === 0) {
    console.log(`[PASS] ${p}`)
    console.log(`       ACE 主体 ${sids.length} 个：仅 SYSTEM + 当前用户`)
  } else {
    failed += 1
    console.log(`[FAIL] ${p}   ← 存在多余主体，AGH 会判定 mode 不安全`)
    for (const s of sids) {
      const ok = s === SYSTEM_SID || s === me
      console.log(`       ${ok ? '允许' : '多余'}  ${await nameOf(s)}  (${s})`)
    }
    console.log(`       修复： icacls "${p}" /remove "<上面标为多余的组名>"`)
  }
}

console.log('')
if (failed === 0) {
  console.log('ACL 链合规：AGH 应能正常读取凭据。')
} else {
  console.log(`${failed} 个目录 ACL 不合规。`)
  console.log('回滚：可用 SDDL 备份还原，例如')
  console.log(`  icacls "${home}" /restore "data\\_acl_backup\\agh-root.acl"`)
}
process.exitCode = failed === 0 ? 0 : 1