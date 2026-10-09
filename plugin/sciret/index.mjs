// paper-agent 领域插件：sciret_* 工具（AGH 插件薄壳，M2 雏形）
// 设计：插件只做"参数声明 + 调用 Python 确定性内核 + 结构化返回"，
// 业务逻辑全部在 kernel/（Python 标准库、零第三方依赖、可复现）。
// 无外部 import：安装快照不需要依赖（与 AGH hot-tool-plugin 示例同形态）。
const Kind = Symbol.for('TypeBox.Kind')

function obj(properties, required) {
  return {
    [Kind]: 'Object',
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  }
}

function str(maxLength = 8192) {
  return { [Kind]: 'String', type: 'string', maxLength }
}

// 工具元数据：sciret_* 工具写产物到 run 目录（经内核），
// 声明为非只读但非破坏性、并发不安全（per-Task 互斥由 BFF 保证）、需审批可重放。
const meta = {
  isReadOnly: false,
  isDestructive: false,
  isConcurrencySafe: false,
  isOpenWorld: true, // 在线检索会访问外部数据源
  replay: 'conditional',
  costHint: { kind: 'network' },
  deferLoading: false,
  requiresApproval: 'never', // MVP：本机回环+本仓库内核，工具自身白名单校验路径
}

async function runKernel(tool, args, runDir) {
  // 经 PAPER_AGENT_PYTHON（或默认 python）执行内核 CLI：
  //   python -m sciret_kernel <tool> --run-dir <dir> --args-json <json>
  // 内核返回 JSON 到 stdout（结构化）；非 0 退出码 = 工具失败。
  const { spawn } = await import('node:child_process')
  const python = process.env['PAPER_AGENT_PYTHON'] || 'python'
  const kernelRoot = process.env['PAPER_AGENT_KERNEL_ROOT']
  const argsJson = JSON.stringify(args)
  return new Promise((resolve, reject) => {
    const child = spawn(python, ['-m', 'sciret_kernel', tool, '--run-dir', runDir, '--args-json', argsJson], {
      cwd: kernelRoot || process.cwd(),
      env: {
        // 子进程环境白名单（§11：不整包透传宿主 env，防提示注入诱导泄露）
        PATH: process.env['PATH'] ?? '',
        PYTHONIOENCODING: 'utf-8',
        ...(process.env['HTTP_PROXY'] ? { HTTP_PROXY: process.env['HTTP_PROXY'] } : {}),
        ...(process.env['HTTPS_PROXY'] ? { HTTPS_PROXY: process.env['HTTPS_PROXY'] } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(out))
        } catch (e) {
          reject(new Error(`内核输出不是合法 JSON：${e instanceof Error ? e.message : String(e)}`))
        }
      } else {
        reject(new Error(`内核退出码 ${code}：${err.slice(0, 2000)}`))
      }
    })
    child.on('error', reject)
  })
}

export const sciret = {
  inject: ['extension'],
  apply(ctx) {
    const agnes = ctx.extension()

    // M0/M1 验证用：最小工具，确认插件安装→信任→启用→会话调用全链路
    agnes.registerTool({
      name: 'sciret_ping',
      description:
        'paper-agent 领域内核连通性检查。返回内核版本与运行目录可写状态。用于验证插件安装与 Python 内核可用。',
      parameters: obj(
        {
          run_dir: str(1024),
        },
        ['run_dir'],
      ),
      meta: {
        ...meta,
        isReadOnly: true,
        isOpenWorld: false,
        replay: 'safe',
        costHint: undefined,
      },
      async execute({ run_dir }) {
        const structured = await runKernel('ping', { run_dir }, run_dir)
        return { content: [{ type: 'text', text: JSON.stringify(structured) }], structured }
      },
    })
  },
}
