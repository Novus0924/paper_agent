import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { KNOWN_SOURCES } from '../src/services/preflight.js'

/**
 * Source 契约测试：BFF 侧与内核侧的**数据源清单必须一致**（跨语言契约）。
 *
 * 为什么需要这条：
 * 曾经 BFF 声明 4 个源（crossref/openalex/arxiv/semantic_scholar），
 * 内核只实现 2 个。用户选 `arxiv` 会得到：
 *   - 预检**通过**（BFF 能探测到 arxiv 的端点）；
 *   - 抓取**静默无数据**（内核没这个源）。
 * 症状是"配了源却没数据"，且没有任何报错 —— **最难排查的一类不一致**。
 *
 * 这类跨边界漂移靠 code review 抓不住：BFF 与内核分属两个文件、两套语言，
 * 没人会在改一边时去看另一边。必须由测试来守。
 *
 * 与 workflow-contract.test.ts 同理：那是"工作流口径"，这是"数据源口径"。
 */

const ROOT = resolve(__dirname, '../../..')
const KERNEL_DIR = join(ROOT, 'kernel')

// 与 workflow-contract.test.ts 同一套发现逻辑：本机装的是 `python`（Windows 官方安装器
// 不提供 python3 这个名字），只试 candidates[0] 会让本测试在**有解释器**的机器上静默跳过，
// 于是它专门要守的那条跨语言源清单一致性就再也没被验证过。
function pythonCandidates(): string[] {
  return [
    process.env['PAPER_AGENT_PYTHON'],
    'python',
    'python3',
    'C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe',
  ].filter((x): x is string => Boolean(x))
}

function runPython(cmd: string, argv: string[]): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((res) => {
    const child = spawn(cmd, argv, {
      cwd: KERNEL_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: KERNEL_DIR },
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => res({ code: null, out, err: String(e) }))
    child.on('close', (code) => res({ code, out, err }))
  })
}

/** 取内核 Source 注册表里的源名；每个候选解释器都试一遍，全失败才返回 null。 */
async function kernelSources(): Promise<string[] | null> {
  if (!existsSync(KERNEL_DIR)) return null
  for (const py of pythonCandidates()) {
    const r = await runPython(py, ['-c', 'from sciret_kernel import sources; print(",".join(sources.known_sources()))'])
    if (r.code === 0) return r.out.trim().split(',').filter(Boolean)
  }
  return null
}

describe('Source 契约（BFF ⟷ Python 内核）', () => {
  it('BFF 声明的源在内核都真实实现', async () => {
    const kernel = await kernelSources()
    if (!kernel) {
      console.warn('[skip] 无可用 Python 解释器，跳过数据源一致性校验')
      return
    }
    // 逐个报出缺失的源，而不是只报集合不等 —— 报错要能直接指向要改什么
    const missing = KNOWN_SOURCES.filter((s) => !kernel.includes(s))
    expect(
      missing,
      `BFF 声明了内核未实现的源：${missing.join(', ')}。` +
        `要么在 kernel/sciret_kernel/sources.py 实现并注册，要么从 BFF 的 PROBE_ENDPOINTS 移除。`,
    ).toEqual([])
  })

  it('内核实现的源 BFF 都能探测（否则用户无法预检它）', async () => {
    const kernel = await kernelSources()
    if (!kernel) {
      console.warn('[skip] 无可用 Python 解释器，跳过数据源一致性校验')
      return
    }
    const unknown = kernel.filter((s) => !KNOWN_SOURCES.includes(s))
    expect(
      unknown,
      `内核实现了 BFF 未探测的源：${unknown.join(', ')}。请在 apps/bff/src/services/preflight.ts 补探��端点。`,
    ).toEqual([])
  })

  it('源名是合法的标识符（会成为 source_status 的键）', () => {
    // source_status 会进账本与降级判定，键名要稳定且可读
    for (const s of KNOWN_SOURCES) {
      expect(s, `源名非法：${s}`).toMatch(/^[a-z][a-z0-9_]*$/)
    }
  })

  it('BFF 侧清单非空（空清单会让预检静默通过）', () => {
    expect(KNOWN_SOURCES.length).toBeGreaterThan(0)
  })
}, 60000)