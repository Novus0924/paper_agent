/**
 * Node 侧脚本（start.mjs / doctor.mjs）的机器无关路径发现。
 *
 * 为什么单独成模块：这两个脚本原先把 AGH 根写死成 `D:/agnes-harness-main`，
 * 而 AGH 是**另一个仓库**，每台机器位置都不同；内核 Python 也写死过某个用户的
 * WorkBuddy 安装路径。BFF 自己有一份等价逻辑（apps/bff/src/config.ts 的
 * DEFAULT_AGH_CANDIDATES + detectAghRoot），但那是 TS，本模块是 .mjs，
 * 两者不共享运行时 —— 改动候选顺序时**必须同步另一侧**（口径不一致会让
 * doctor 说"AGH 就绪"而 BFF 起不来，或反过来）。
 */
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** AGH 仓库根的判据：CLI 构建产物存在即认为该目录可用 */
export const AGH_MARKER = join('packages', 'cli', 'dist', 'local', 'agnes.mjs')

/** 与 config.ts 同口径 + 整合布局（AGH 与 backend 仓库同级或同上级） */
export function aghRootCandidates(projectRoot) {
  return [
    resolve(projectRoot, '..', '..', 'agnes-harness-main'),
    resolve(projectRoot, '..', '..', 'agnes-harness'),
    resolve(projectRoot, '..', 'agnes-harness-main'),
    resolve(projectRoot, '..', 'agnes-harness'),
    'D:/agnes-harness-main',
    'D:/agnes-harness',
    'C:/agnes-harness-main',
  ]
}

/**
 * 解析 AGH 仓库根；探测不到返回 null（调用方负责给出人类可读指引）。
 * `PAPER_AGENT_AGH_ROOT` 显式指定时**只用它**：指错了要暴露，不能静默换到别的目录。
 */
export function resolveAghRoot(projectRoot, env = process.env) {
  const override = env['PAPER_AGENT_AGH_ROOT']
  if (override) return existsSync(join(override, AGH_MARKER)) ? override : null
  return aghRootCandidates(projectRoot).find((dir) => existsSync(join(dir, AGH_MARKER))) ?? null
}

/**
 * WorkBuddy 托管的 Python（形如 C:/Users/<任意用户>/.workbuddy/binaries/python/versions/<版本>/python.exe）。
 * 用目录列举代替写死的某个用户名：换机/换账号都能命中，且不会把别人家的路径当默认值。
 */
export function workbuddyPythonPaths(usersDir = 'C:/Users') {
  const out = []
  let users
  try {
    users = readdirSync(usersDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  } catch {
    return out
  }
  for (const user of users) {
    const versionsDir = join(usersDir, user, '.workbuddy', 'binaries', 'python', 'versions')
    let versions
    try {
      versions = readdirSync(versionsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    } catch {
      continue
    }
    for (const v of versions.sort().reverse()) {
      const exe = join(versionsDir, v, 'python.exe')
      if (existsSync(exe)) out.push(exe)
    }
  }
  return out
}
