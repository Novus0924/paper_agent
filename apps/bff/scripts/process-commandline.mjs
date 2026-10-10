/**
 * 读取指定 pid 的命令行（Windows）。用于确认残留 node 进程是否为 AGH daemon。
 *
 * 为什么需要：daemon 报 "state lock timeout" 而锁文件里的 pid 已死，
 * 说明**有进程仍持有 SQLite 锁句柄**——但那个 pid 不在锁文件里（锁文件记录的是上次 owner）。
 * 只能靠「逐个 pid 查命令行」定位真正的持有者。
 *
 * 用法：node process-commandline.mjs 23476 2720 ...
 * 注意：WMIC 在新 Windows 已移除，故用 PowerShell Get-CimInstance。
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const pids = process.argv.slice(2)

if (pids.length === 0) {
  console.log('用法：node process-commandline.mjs <pid...>')
  process.exit(2)
}

for (const pid of pids) {
  try {
    const { stdout } = await run(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" -ErrorAction SilentlyContinue).CommandLine`,
      ],
      { encoding: 'utf8', timeout: 30_000 },
    )
    const line = String(stdout).trim()
    console.log(`pid=${pid}  ${line || '(进程已不存在或无权限读取)'}`)
  } catch (e) {
    console.log(`pid=${pid}  查询失败：${e instanceof Error ? e.message : String(e)}`)
  }
}
