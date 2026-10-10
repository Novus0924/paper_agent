/**
 * 列出与 AGH / node 相关的进程（诊断 daemon "state lock timeout" 用）。
 *
 * 为什么用异步 spawn：本机沙箱内 `spawnSync` 一律 EBUSY（同步 spawn 被拦截），
 * 同步版 tasklist 调用会直接失败。同理不能用 `tasklist` 黑名单路径以外的探测方式。
 *
 * 用法：node list-node-processes.mjs
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

try {
  const { stdout } = await run('tasklist.exe', ['/FO', 'CSV', '/NH'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  const rows = stdout
    .split(/\r?\n/)
    .filter((l) => /node|agnes/i.test(l))
  if (rows.length === 0) {
    console.log('（无node / agnes 相关进程）')
  }
  for (const line of rows) {
    // /FO CSV /NH 实际输出形如 "node.exe","1234","Console","1","12,345 K"
    // 但 tasklist 在部分区域设置下首字段不带引号，故用正则一次性提取更稳：
    //   第一个逗号前的段=镜像名，之后第一段纯数字=pid
    const firstComma = line.indexOf(',')
    if (firstComma < 0) continue
    const name = line.slice(0, firstComma).replace(/"/g, '').trim()
    const rest = line.slice(firstComma + 1)
    const m = rest.match(/"?(\d+)"?/)
    if (!m) continue
    console.log(`${name}  pid=${m[1]}`)
  }
} catch (e) {
  console.log('查询进程失败:', e instanceof Error ? e.message : String(e))
  process.exit(1)
}
