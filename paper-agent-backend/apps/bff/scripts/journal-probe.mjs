/**
 * AGH 包操作账本诊断探针（外部只读诊断，**不修改 AGH 源码**）。
 *
 * 用途：daemon 启动报 E_PACKAGE_INTEGRITY（runtime snapshot store requires recovery）时，
 * 区分两种根因：
 *   a) 账本文件缺失/损坏（→ 需要隔离该文件让 AGH 重建）
 *   b) 其它初始化失败（本探针无法覆盖，需看 daemon 完整日志）
 *
 * 判据与 AGH 源码 `FilePackageOperationStore.load()` 的分支一致：
 *   - 文件不存在（ENOENT）→ 正常初始化，不应报错
 *   - 文件存在但 JSON/结构非法 → 抛 'package operation journal is unavailable'
 */
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('用法：journal-probe.mjs <package-operations 目录>')
  process.exit(2)
}

const file = join(dir, 'operations.json')
console.log(`目录: ${dir}`)
console.log(`目录存在: ${existsSync(dir)}`)

if (!existsSync(dir)) {
  console.log('→ 目录不存在。AGH 会 mkdir 后按 ENOENT 分支初始化空账本，故此处不应是根因。')
  process.exit(0)
}
const st = statSync(dir)
console.log(`目录权限 mode: ${(st.mode & 0o777).toString(8)}  （AGH 以 0o700 创建）`)

if (!existsSync(file)) {
  console.log('→ operations.json 不存在：AGH 应走 ENOENT 分支初始化空账本。')
  console.log('   若 daemon 仍报 E_PACKAGE_INTEGRITY，则根因不在账本文件本身。')
  process.exit(0)
}

try {
  const text = readFileSync(file, 'utf8')
  const parsed = JSON.parse(text)
  const ops = parsed.operations
  console.log(`→ operations.json 可解析，operations 条数: ${Array.isArray(ops) ? ops.length : '非数组'}`)
  if (Array.isArray(ops) && ops.length > 0) {
    for (const o of ops.slice(0, 5)) {
      const op = o.operation ?? {}
      console.log(`   - ${op.operationId} state=${op.state} kind=${op.kind}`)
    }
  }
  console.log('→ 账本本身可读且合法。若 daemon 仍失败，请看 daemon 完整日志的其他异常。')
  process.exit(0)
} catch (e) {
  console.log(`→ operations.json 解析失败: ${e instanceof Error ? e.message : String(e)}`)
  console.log('   这正是 AGH 抛 "package operation journal is unavailable" 的条件。')
  process.log('   处置：把该文件**改名隔离**（可逆，勿删），让 AGH 重建空账本。')
  process.exit(1)
}
