// paper-agent 领域插件：sciret_* 工具集（AGH 插件**薄壳**）
//
// 设计（需求文档 §3.2 领域层、§14 Tool SPI）：
//   - 插件只做两件事：① 声明工具参数与元数据；② 把调用转发给 Python 确定性内核；
//   - 全部业务逻辑在内核（零第三方依赖、可复现）；插件不含领域算法；
//   - 环境契约：PAPER_AGENT_PYTHON（合法名，可在常规 shell 导出；替代旧版带连字符的脆弱变量）、
//     PAPER_AGENT_KERNEL_ROOT（内核根，默认按约定探测）；
//   - 子进程环境白名单（§11：不整包透传宿主 env）。
//
// 工具集（与内核 TOOLS 一一对应）：plan / run_step / run_all / status / verify / report / cite / resume / ping
// 注意：本机可能存在 v1.0 遗留包 paper-agent-tools（同名工具），启用本插件前请先停用旧包。

const Kind = Symbol.for('TypeBox.Kind')

function obj(properties, required = []) {
  return { [Kind]: 'Object', type: 'object', properties, required, additionalProperties: false }
}
function str(maxLength = 8192) {
  return { [Kind]: 'String', type: 'string', maxLength }
}
function strArray(maxItems = 8) {
  return { [Kind]: 'Array', type: 'array', items: str(64), maxItems }
}
function bool() {
  return { [Kind]: 'Boolean', type: 'boolean' }
}

// 工具元数据：本组工具会**写产物文件**并可能**访问外部元数据源**（经内核的冻结语料/预检），
// 因此如实声明为非只读、开放世界、非并发安全（并发由 BFF 的 per-Task 互斥保证）、可条件重放。
const baseMeta = {
  isReadOnly: false,
  isDestructive: false,
  isConcurrencySafe: false,
  isOpenWorld: true,
  replay: 'conditional',
  costHint: { kind: 'compute' },
  deferLoading: false,
  requiresApproval: 'never', // 仅操作本机 run 目录与公开元数据；路径白名单由内核强制
}

const readOnlyMeta = { ...baseMeta, isReadOnly: true, isConcurrencySafe: true, replay: 'safe', costHint: undefined }

const RUN_DIR_PROP = str(1024)

function kernelRoot() {
  return process.env['PAPER_AGENT_KERNEL_ROOT'] || 'D:/workBubbyStore/paper-agent-2/kernel'
}

async function runKernel(tool, runDir, args) {
  const { spawn } = await import('node:child_process')
  const python = process.env['PAPER_AGENT_PYTHON'] || 'python'
  const cwd = kernelRoot()

  return new Promise((resolve, reject) => {
    const child = spawn(python, ['-m', 'sciret_kernel', tool, '--run-dir', runDir, '--args-json', JSON.stringify(args)], {
      cwd,
      env: {
        // 环境白名单：只透传内核运行必需项（§11 子进程环境裁剪）
        PATH: process.env['PATH'] ?? '',
        PYTHONIOENCODING: 'utf-8',
        ...(process.env['PAPER_AGENT_RUNS_DIR'] ? { PAPER_AGENT_RUNS_DIR: process.env['PAPER_AGENT_RUNS_DIR'] } : {}),
        ...(process.env['HTTP_PROXY'] ? { HTTP_PROXY: process.env['HTTP_PROXY'] } : {}),
        ...(process.env['HTTPS_PROXY'] ? { HTTPS_PROXY: process.env['HTTPS_PROXY'] } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => reject(new Error(`内核启动失败（PAPER_AGENT_PYTHON=${python}）：${e.message}`)))
    child.on('close', (code) => {
      let structured
      try {
        structured = JSON.parse(out.trim())
      } catch {
        reject(new Error(`内核输出不是合法 JSON（退出码 ${code}）：${(err || out).slice(0, 1000)}`))
        return
      }
      resolve({ code, structured, stderr: err })
    })
  })
}

/** 统一包装：内核返回 ok=false 时抛出可读错误（让会话/模型看到失败原因，而非静默） */
async function call(tool, runDir, args) {
  const { structured, code } = await runKernel(tool, runDir, args)
  if (!structured || structured.ok !== true) {
    const error = new Error(`[sciret_${tool}] ${structured?.error ?? `内核退出码 ${code}`}`)
    error.structured = structured
    throw error
  }
  return structured
}

function toolResult(structured, extraText) {
  const text = extraText || structured.human_summary || `[sciret] ${structured.tool ?? 'ok'}`
  return { content: [{ type: 'text', text }], structured }
}

export const sciret = {
  inject: ['extension'],
  apply(ctx) {
    const agnes = ctx.extension()
    const register = (name, description, properties, required, meta, exec) => {
      agnes.registerTool({ name, description, parameters: obj(properties, required), meta, execute: exec })
    }

    register(
      'sciret_ping',
      'paper-agent 内核连通性检查：返回内核版本、可用语料快照与工作流清单。用于确认插件与 Python 内核可用。',
      { run_dir: RUN_DIR_PROP },
      ['run_dir'],
      { ...readOnlyMeta, isOpenWorld: false },
      async ({ run_dir }) => toolResult(await call('ping', run_dir, {})),
    )

    register(
      'sciret_plan',
      '初始化科研任务：创建运行状态（状态机）与证据账本。支持 workflow=research|materials，lit_source=local|arxiv|auto。',
      { run_dir: RUN_DIR_PROP, goal: str(), workflow: str(32), lit_source: str(16), sources: strArray(), task_id: str(128) },
      ['run_dir', 'goal'],
      baseMeta,
      async ({ run_dir, ...rest }) => toolResult(await call('plan', run_dir, rest)),
    )

    register(
      'sciret_run_step',
      '执行单个流水线步骤（经状态机推进并写入证据）。不传 step 则自动执行下一个待办步骤。',
      { run_dir: RUN_DIR_PROP, step: str(16) },
      ['run_dir'],
      baseMeta,
      async ({ run_dir, step }) => toolResult(await call('run_step', run_dir, step ? { step } : {})),
    )

    register(
      'sciret_run_all',
      '顺序跑完剩余步骤（断点续跑：已完成/已跳过步骤复用，仅执行待办与失败步骤）。',
      { run_dir: RUN_DIR_PROP },
      ['run_dir'],
      baseMeta,
      async ({ run_dir }) => toolResult(await call('run_all', run_dir, {})),
    )

    register(
      'sciret_status',
      '查询任务状态：步骤状态、账本记录数、证据/结论数、剩余步骤。',
      { run_dir: RUN_DIR_PROP },
      ['run_dir'],
      readOnlyMeta,
      async ({ run_dir }) => toolResult(await call('status', run_dir, {})),
    )

    register(
      'sciret_verify',
      '校验证据账本：重算哈希链、检查结论证据绑定完整性，返回问题清单。',
      { run_dir: RUN_DIR_PROP },
      ['run_dir'],
      readOnlyMeta,
      async ({ run_dir }) => toolResult(await call('verify', run_dir, {})),
    )

    register(
      'sciret_report',
      '装配最终报告（结构化 JSON + Markdown）。生成前执行门禁：哈希链完整、结论 100% 绑定 fact 级证据、判断批次齐全；不通过则拒绝并给出原因。',
      { run_dir: RUN_DIR_PROP, allow_gate_bypass: bool() },
      ['run_dir'],
      baseMeta,
      async ({ run_dir, allow_gate_bypass }) => {
        const r = await call('report', run_dir, allow_gate_bypass ? { allow_gate_bypass: true } : {})
        return toolResult(r, `报告已生成：${r.path}`)
      },
    )

    register(
      'sciret_cite',
      '证据引用回查：按证据编号（如 EV-0001）返回文献 DOI/作者/年份或产物哈希。',
      { run_dir: RUN_DIR_PROP, ev: str(32) },
      ['run_dir', 'ev'],
      readOnlyMeta,
      async ({ run_dir, ev }) => toolResult(await call('cite', run_dir, { ev })),
    )

    register(
      'sciret_resume',
      '断点续跑：列出待续跑步骤；execute=true 时立即续跑剩余步骤。',
      { run_dir: RUN_DIR_PROP, execute: bool() },
      ['run_dir'],
      baseMeta,
      async ({ run_dir, execute }) => toolResult(await call('resume', run_dir, execute ? { execute: true } : {})),
    )

    agnes.on('session_start', () => {
      agnes.ctx.log.info('sciret_* 工具集已加载（paper-agent 领域内核）')
    })
  },
}
