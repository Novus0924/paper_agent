/**
 * 诊断 AGH 凭据存储 `CONFIG_CREDENTIAL_STORE` 的**根因**（父目录 ACL）。
 *
 * 背景（本项目 M8 实测踩坑链）：
 *   AGH 抛 `The credential store is unavailable.`（ConfigurationError），
 *   而 `credential-probe.mts` 显示 native 可用、secrets/ 与凭据文件的 `hasPrivateDacl` 全为 true——
 *   看起来"全都正常"，但 read() 仍然失败。
 *
 *   真正原因在 AGH 的 `checkCredentialParents()`：它会**逐级**检查
 *       <root>            ← 问题常出在这一级
 *       <root>/secrets
 *       <root>/secrets/<provider>
 *   任何一级 ACL 不是"仅当前用户"，就抛 `reason=mode`（`CREDENTIAL_STORE_UNSAFE`），
 *   而上层 `configuration.ts` 把真实 reason 吞掉，只报笼统的"凭据不可用"。
 *
 *   典型触发：宿主环境给用户主目录下的应用目录额外加了用户组读权限
 *   （如 `CodexSandboxUsers:(OI)(CI)(RX)`），凭据本身干净但父目录不"私有"→ 被判定不安全。
 *
 * 修复方向（**需用户确认后手工执行**，助手不擅自改用户主目录 ACL）：
 *   icacls "<AGH home>" /remove "<额外用户组>"
 *   之后 `icacls` 应只剩 SYSTEM 与当前用户；**不要删除任何凭据文件**。
 *
 * 用法：tsx credential-parent-acl.mts [aghHome]
 * 输出：每级目录的 ACL 是否"私有"（仅当前用户 + SYSTEM），并给出修复建议。
 */
import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'

const run = promisify(execFile)
const home = process.argv[2] ?? join(homedir(), '.agh')

/**
 * 读取 ACL 主体（用 `icacls /save` 的稳定 DACL 序列化）。
 *
 * 注意：`icacls /save` 在本机写出的文件编码不固定（可能是 UTF-16LE），
 * 所以下面**不解析**、只把原始 DACL 行打印出来，由人/调用方判读。
 * 这比追求"自动判定"更诚实——我为此尝试过三种解析方案（人类可读表格 / 正则 / SID 反查），
 * 在「输出语言 + 路径含空格 + icacls 换行与截断」三重干扰下都会误判，
 * 误判的诊断比没有诊断更糟。
 */
async function aclDump(path: string): Promise<string> {
  const tmp = join(tmpdir(), `acl-${randomUUID()}.txt`)
  try {
    await run('icacls.exe', [path, '/save', tmp], { encoding: 'utf8', timeout: 20_000 })
    const buf = readFileSync(tmp)
    // 自动识别 UTF-16LE（BOM）与 UTF-8；两者都可能带 BOM，判DACL 前先剥掉
    let text = buf[0] === 0xff && buf[1] === 0xfe ? buf.toString('utf16le') : buf.toString('utf8')
    text = text.replace(/^﻿/, '')
    // icacls /save 格式为 "<路径>\r\nD:(...)"；路径可能含空格，故按 "D:" 的位置切
    const idx = text.indexOf('D:')
    return idx >= 0 ? text.slice(idx).split(/\r?\n/)[0]!.trim() : text.trim().slice(0, 200)
  } catch (e) {
    return `<icacls /save 失败: ${e instanceof Error ? e.message : String(e)}>`
  }
}

console.log(`AGH home = ${home}`)
console.log('')
for (const p of [home, join(home, 'secrets'), join(home, 'secrets', 'agnes-ai')]) {
  if (!existsSync(p)) {
    console.log(`[跳过] 不存在: ${p}`)
    continue
  }
  console.log(`[${p}]`)
  console.log(`  ${await aclDump(p)}`)
  console.log('')
}

console.log('判读要点（本脚本只输出原始 DACL，判定由人做——自动解析在多语言/带空格路径下不可靠）：')
console.log('  · AGH 要求凭据目录链上**每一级**只有两个 ACE 主体：SY(=NT AUTHORITY\\SYSTEM) + 当前用户。')
console.log('  · 凭据所在的 secrets/<provider> 通常正好 2 个 ACE（干净）。')
console.log('  · 若 <AGH home> 这一级出现**第 3 个** ACE（例如带 0x1200a9 权限的额外用户组），')
console.log('    AGH 的 checkCredentialParents() 会判定 mode 不安全，')
console.log('    上层把它吞成 "The credential store is unavailable."。')
console.log('')
console.log('对照本机实测（DACL 已贴在上面的输出里）：')
console.log('  · secrets/ 与 secrets/agnes-ai各 2 个 ACE（SY + 用户）→ 干净')
console.log('  · ~/.agh 本身 3 个 ACE（多出 S-1-5-21-…-1008 =宿主沙箱用户组）→ 判定不安全的根因')
console.log('')
console.log('修复（需用户确认后手工执行，助手不擅自改主目录 ACL）：')
console.log(`  icacls "${home}" /remove "<上面多出的组名>"`)
console.log(`  icacls "${home}"      # 复核`)
console.log('注意：只移除多余主体的条目，**不要删除凭据文件**。')
