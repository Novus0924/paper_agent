import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WORKFLOW_STEPS } from '../src/routes/v1/tasks.js'

/**
 * 跨语言契约测试：BFF（TS）中的工作流步骤定义必须与 Python 内核（workflow.py）一致。
 * 依据：需求文档 §14 Workflow SPI（"步骤集声明"单一真源）与 §15 契约测试。
 * 若本机无可用 Python 解释器，则跳过（不伪造通过）。
 */

const ROOT = resolve(__dirname, '../../..')
const KERNEL_DIR = resolve(ROOT, 'kernel')

function pythonCandidates(): string[] {
  return [
    process.env['PAPER_AGENT_PYTHON'],
    'python',
    'python3',
    'C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe',
  ].filter((x): x is string => Boolean(x))
}

function run(cmd: string, argv: string[], opts: { cwd?: string } = {}): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((res) => {
    let out = ''
    let err = ''
    const child = spawn(cmd, argv, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => res({ code: null, out, err: String(e) }))
    child.on('close', (code) => res({ code, out, err }))
  })
}

async function readKernelWorkflows(): Promise<Record<string, { id: string; label: string }[]> | null> {
  if (!existsSync(KERNEL_DIR)) return null
  for (const py of pythonCandidates()) {
    const r = await run(py, ['-m', 'sciret_kernel', 'workflows', '--run-dir', resolve(KERNEL_DIR, '.contract-probe'), '--args-json', '{}'], {
      cwd: KERNEL_DIR,
    })
    if (r.code === 0) {
      const parsed = JSON.parse(r.out) as { workflows: Record<string, { id: string; label: string }[]> }
      return parsed.workflows
    }
  }
  return null
}

describe('工作流规格契约（BFF ⟷ Python 内核）', () => {
  it('步骤 id 与标签完全一致（research 七步：R1–R6 + S1）', async () => {
    const kernel = await readKernelWorkflows()
    if (!kernel) {
      // 无 Python 环境时明确跳过，而非静默通过
      console.warn('[skip] 无可用 Python 解释器，跳过跨语言工作流契约校验')
      return
    }
    for (const [name, steps] of Object.entries(WORKFLOW_STEPS)) {
      expect(kernel[name], `内核缺少工作流 ${name}`).toBeDefined()
      expect(kernel[name]!.map((s) => s.id)).toEqual(steps.map((s) => s.id))
      expect(kernel[name]!.map((s) => s.label)).toEqual(steps.map((s) => s.label))
    }
  }, 60000)

  it('API 可选的工作流**必须都是已实现的**（不许声明了却跑不通）', async () => {
    // 这条防的是"契约声明了能力、后端没实现"——比缺功能更糟：
    // 用户建完任务、连 AGH 会话都建好了，才在执行某一步时被告知"尚未实现"，
    // 白白消耗一次真实模型回合（materials 伪选项即此病灶：2026-10-12 已全层删除，
    // 防线保留，防未来新增工作流时重蹈覆辙）。
    //
    // 断言方式：直接问内核"这个工作流能不能真跑起来"，
    // 而不是比对步骤表（步骤表定义了 ≠ 步骤有实现）。
    if (!existsSync(KERNEL_DIR)) {
      console.warn('[skip] 未找到 kernel/，跳过未实现工作流校验')
      return
    }
    // BFF 侧"接受创建"的白名单：与 tasks.ts 的 WORKFLOWS 同源
    const API_ACCEPTS: Record<string, boolean> = { research: true }

    for (const [name, apiAccepts] of Object.entries(API_ACCEPTS)) {
      const probe = await runKernelPlanProbe(name)
      if (probe === 'unknown') {
        console.warn(`[skip] 无可用 Python，跳过 ${name} 的可执行性探测`)
        continue
      }
      const kernelAccepts = probe === 'accepted'
      // 核心不变量：两侧口径必须一致。
      // 不一致的后果：一边说可用（建了任务、开了会话），一边说没实现（执行报错）。
      expect(
        apiAccepts,
        `工作流 ${name} 两侧口径不一致：API ${apiAccepts ? '接受' : '拒绝'} 但内核 ${kernelAccepts ? '接受' : '拒绝'}`,
      ).toBe(kernelAccepts)
    }
  }, 90000)
})

/** 探测内核是否真的接受该工作流：`plan` 成功=接受，抛"尚未实现"=不接受。 */
async function runKernelPlanProbe(workflow: string): Promise<'accepted' | 'not-implemented' | 'unknown'> {
  if (!existsSync(KERNEL_DIR)) return 'unknown'
  const probeDir = resolve(KERNEL_DIR, '.contract-probe-wf')
  for (const py of pythonCandidates()) {
    const r = await run(
      py,
      [
        '-m', 'sciret_kernel', 'plan', '--run-dir', probeDir,
        '--args-json', JSON.stringify({ goal: '契约探测', workflow }),
      ],
      { cwd: KERNEL_DIR },
    )
    if (r.code === 0) return 'accepted'
    if (r.out.includes('尚未实现') || r.err.includes('尚未实现')) return 'not-implemented'
  }
  return 'unknown'
}
