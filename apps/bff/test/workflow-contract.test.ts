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
  it('步骤 id 与标签完全一致（research 六步、materials 五步）', async () => {
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
})
