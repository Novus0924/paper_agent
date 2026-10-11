// paper-agent 领域插件：sciret_* 工具集（AGH 插件**薄壳**）
//
// 设计（需求文档 §3.2 领域层、§14 Tool SPI）：
//   - 插件只做两件事：① 声明工具参数与元数据；② 把调用转发给 Python 确定性内核；
//   - 全部业务逻辑在内核（零第三方依赖、可复现）；插件不含领域算法；
//   - 环境契约：PAPER_AGENT_PYTHON（合法名，可在常规 shell 导出；替代旧版带连字符的脆弱变量）、
//     PAPER_AGENT_KERNEL_ROOT（内核根，默认按约定探测）；
//   - 子进程环境白名单（§11：不整包透传宿主 env）。
//
// 工具集（与内核 TOOLS 一一对应）：plan / run_step / run_all / status / verify / report / cite / resume / synthesize / ping
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

// 工具元数据（AGH extension-api 的 checkToolMeta 是唯一权威门槛，八个键必须齐全且取值合法）：
//   - replay ∈ { safe | never | idempotent }（注意：**没有** 'conditional'）
//   - costHint 仅允许 { credits?: number; wallMs?: number }（**不接受** { kind: '...' }）
//   - requiresApproval ∈ { never | destructive | always }
// 本组工具会写产物文件并访问外部元数据源，因此如实声明：非只读、开放世界、非并发安全
// （并发由 BFF 的 per-Task 互斥保证）；只读工具才用 replay:'safe'。
const WRITE_META = {
  isReadOnly: false,
  isDestructive: false,
  isConcurrencySafe: false,
  isOpenWorld: true,
  replay: 'never', // 写产物：不可重放（重放会重复产生副作用）
  costHint: { wallMs: 10000 },
  deferLoading: false,
  requiresApproval: 'never', // 仅操作本机 run 目录与公开元数据；路径白名单由内核强制
}

const READ_META = {
  isReadOnly: true,
  isDestructive: false,
  isConcurrencySafe: true,
  isOpenWorld: false,
  replay: 'safe',
  costHint: undefined,
  deferLoading: false,
  requiresApproval: 'never',
}

const RUN_DIR_PROP = str(1024)

/** 规划检索查询（T5）：1-3 条英文关键词式查询，每条 ≤200 字符 */
function queryArray() {
  return { [Kind]: 'Array', type: 'array', items: str(200), maxItems: 3 }
}

const ENV_HINT = [
  '需在【启动 AGH daemon 的那个终端】先设好环境变量再启动 daemon：',
  '  1) daemon stop',
  '  2) export PAPER_AGENT_PYTHON="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"',
  '  3) export PAPER_AGENT_KERNEL_ROOT="D:/workBubbyStore/paper-agent-2/kernel"',
  '  4) export PAPER_AGENT_RUNS_DIR="D:/workBubbyStore/paper-agent-2/runs"',
  '  5) 在【项目根】执行 daemon start（AGH 会把插件拷贝到自己的 home，插件无法靠相对路径找内核）',
  '注意：已在运行的 daemon 无法注入环境变量，必须 stop 后重启；新能力需开新会话才生效。',
].join('\n')

/**
 * 运行期配置自检（关键：AGH 会把插件**拷贝**到自己的 home 运行，
 * 因此绝不能靠 __dirname 推断项目路径；缺失时给出可执行的修复指引，而非静默退化）。
 */
function resolveRuntime() {
  const python = process.env['PAPER_AGENT_PYTHON'] || ''
  const root = process.env['PAPER_AGENT_KERNEL_ROOT'] || ''
  const runsDir = process.env['PAPER_AGENT_RUNS_DIR'] || ''
  if (!python) return { ok: false, error: `PAPER_AGENT_PYTHON 未设置。\n${ENV_HINT}` }
  if (!root) return { ok: false, error: `PAPER_AGENT_KERNEL_ROOT 未设置（插件运行于 ${import.meta.dirname ?? '?'}）。\n${ENV_HINT}` }
  if (!runsDir) return { ok: false, error: `PAPER_AGENT_RUNS_DIR 未设置。\n${ENV_HINT}` }
  return { ok: true, python, root, runsDir }
}

async function runKernel(tool, runDir, args) {
  const cfg = resolveRuntime()
  if (!cfg.ok) {
    const error = new Error(`[sciret_${tool}] 运行期配置缺失：${cfg.error}`)
    error.structured = { ok: false, error: cfg.error, code: 'PLUGIN_ENV_MISSING' }
    throw error
  }

  const { spawn } = await import('node:child_process')
  const child = spawn(
    cfg.python,
    ['-m', 'sciret_kernel', tool, '--run-dir', runDir, '--args-json', JSON.stringify(args)],
    {
      cwd: cfg.root,
      env: {
        // 环境白名单：只透传内核运行必需项（§11 子进程环境裁剪）
        PATH: process.env['PATH'] ?? '',
        PYTHONIOENCODING: 'utf-8',
        PAPER_AGENT_RUNS_DIR: cfg.runsDir,
        ...(process.env['HTTP_PROXY'] ? { HTTP_PROXY: process.env['HTTP_PROXY'] } : {}),
        ...(process.env['HTTPS_PROXY'] ? { HTTPS_PROXY: process.env['HTTPS_PROXY'] } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  return new Promise((resolve, reject) => {
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => reject(new Error(`内核启动失败（PAPER_AGENT_PYTHON=${cfg.python}）：${e.message}`)))
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
      READ_META,
      async ({ run_dir }) => toolResult(await call('ping', run_dir, {})),
    )

    register(
      'sciret_plan',
      '初始化科研任务：创建运行状态（状态机）与证据账本。支持 workflow=research|materials，lit_source=local|arxiv|auto。'
        + '可选 queries：依据研究目标产出的 1-3 个面向 Crossref/OpenAlex 的英文关键词式检索查询（显著提升中文目标对英文文献库的检索质量；不传则回退用目标原文检索）。',
      { run_dir: RUN_DIR_PROP, goal: str(), workflow: str(32), lit_source: str(16), sources: strArray(), queries: queryArray(), task_id: str(128) },
      ['run_dir', 'goal'],
      WRITE_META,
      async ({ run_dir, ...rest }) => toolResult(await call('plan', run_dir, rest)),
    )

    register(
      'sciret_run_step',
      '执行单个流水线步骤（经状态机推进并写入证据）。不传 step 则自动执行下一个待办步骤。',
      { run_dir: RUN_DIR_PROP, step: str(16) },
      ['run_dir'],
      WRITE_META,
      async ({ run_dir, step }) => toolResult(await call('run_step', run_dir, step ? { step } : {})),
    )

    register(
      'sciret_run_all',
      '顺序跑完剩余步骤（断点续跑：已完成/已跳过步骤复用，仅执行待办与失败步骤）。',
      { run_dir: RUN_DIR_PROP },
      ['run_dir'],
      WRITE_META,
      async ({ run_dir }) => toolResult(await call('run_all', run_dir, {})),
    )

    register(
      'sciret_status',
      '查询任务状态：步骤状态、账本记录数、证据/结论数、剩余步骤。',
      { run_dir: RUN_DIR_PROP },
      ['run_dir'],
      READ_META,
      async ({ run_dir }) => toolResult(await call('status', run_dir, {})),
    )

    register(
      'sciret_verify',
      '校验证据账本：重算哈希链、检查结论证据绑定完整性，返回问题清单。',
      { run_dir: RUN_DIR_PROP },
      ['run_dir'],
      READ_META,
      async ({ run_dir }) => toolResult(await call('verify', run_dir, {})),
    )

    register(
      'sciret_report',
      '装配最终报告（结构化 JSON + Markdown）。生成前执行门禁：哈希链完整、结论 100% 绑定 fact 级证据、判断批次齐全；不通过则拒绝并给出原因。',
      { run_dir: RUN_DIR_PROP, allow_gate_bypass: bool() },
      ['run_dir'],
      WRITE_META,
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
      READ_META,
      async ({ run_dir, ev }) => toolResult(await call('cite', run_dir, { ev })),
    )

    register(
      'sciret_resume',
      '断点续跑：列出待续跑步骤；execute=true 时立即续跑剩余步骤。',
      { run_dir: RUN_DIR_PROP, execute: bool() },
      ['run_dir'],
      WRITE_META,
      async ({ run_dir, execute }) => toolResult(await call('resume', run_dir, execute ? { execute: true } : {})),
    )

    register(
      'sciret_synthesize',
      '受控模型综合回答落盘（S1 步骤）：把模型撰写的"对研究问题的直接回答"作为 artifact 写入证据账本并重装配报告。'
        + '约束：text 中事实性表述必须用 [EV-xxxx] 角标标注证据编号（只能使用账本中真实存在的编号，内核会校验并剔除无效角标）；'
        + '该内容为 artifact 级产物，不进入确定性结论、不影响门禁。仅在任务终态 DONE 后可用。',
      { run_dir: RUN_DIR_PROP, text: str(16384) },
      ['run_dir', 'text'],
      WRITE_META,
      async ({ run_dir, text }) => {
        // 内核 synthesize 以 --text-file 读取（契约：防超长文本走 argv/args-json）。
        // 文本文件必须落在 run_dir 内（内核有 text_file ⊆ run_dir 的越权校验）。
        const { writeFile } = await import('node:fs/promises')
        const { join } = await import('node:path')
        const textFile = join(run_dir, 'synthesis_input.txt')
        await writeFile(textFile, text, 'utf8')
        const r = await call('synthesize', run_dir, { text_file: textFile })
        return toolResult(r, `综合回答已入账本（${r.evidence_id ?? ''}），报告已重装配：${r.path ?? ''}`)
      },
    )

    agnes.on('session_start', () => {
      agnes.ctx.log.info('sciret_* 工具集已加载（paper-agent 领域内核）')
    })
  },
}
