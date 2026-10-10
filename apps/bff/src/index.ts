import { loadConfig } from './config.js'
import { createLogger } from './infra/logger.js'
import { AgnesGateway } from './agh/gateway.js'
import { TaskIndex } from './store/task-index.js'
import { ExecutionService } from './services/execution.js'
import { ReportService } from './services/report.js'
import { EventRelay } from './events/relay.js'
import { buildApp } from './app.js'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * BFF 入口（BE-01）：
 * - 仅绑定 127.0.0.1（安全红线，硬编码）；
 * - 启动时加载配置（fail-fast：配置缺失/AGH 不可用给人类可读原因并退出）；
 * - AGH daemon 未运行不阻断 BFF 启动（health 显示 degraded，创建任务时再连）。
 */

async function main(): Promise<void> {
  const cfg = loadConfig()
  const log = createLogger(cfg.logLevel, { service: 'paper-agent-bff' })

  // 运行目录
  mkdirSync(cfg.runsDir, { recursive: true })

  // 任务索引（磁盘 → 内存；损坏则 fail-fast）
  const index = new TaskIndex(cfg.dataDir, log)

  // AGH 会话网关（唯一执行出口）
  const gateway = new AgnesGateway(log, { runsDir: cfg.runsDir })
  // 启动时尽力连接一次（daemon 未起不视为致命：doctor/health 会给指引）
  await gateway.connect().catch((e: unknown) => {
    log.warn('启动时未能连接 AGH daemon（将在首个任务创建时重试）', {
      reason: e instanceof Error ? e.message : String(e),
    })
  })

  // 执行编排器（run-all/step/resume/stop 经会话下发；per-Task 互斥）
  const exec = new ExecutionService(gateway, index, cfg.runsDir, log)

  // 事件中继（AGH 会话事件 → 归一事件 → SSE，§5）
  const relay = new EventRelay(gateway, index, cfg.runsDir, log)
  // 终态保证（§5.2）：执行 settle 时必发 done（仅终态发；非终态不误发）
  exec.setSettledListener((taskId, runStatus) => {
    if (runStatus === 'DONE' || runStatus === 'FAILED') relay.emitDone(taskId, runStatus)
  })
  // 执行前确保事件泵在跑（否则 SSE 建连前的工具事件会漏）
  exec.onBeforeExecute = (taskId: string) => relay.ensure(taskId)

  // 启动即恢复：凭映射同步各任务的内核状态（BFF 重启后可恢复，§9.2）
  for (const task of index.allWithSessions()) {
    exec.syncFromKernel(task)
    // 仅对"运行中"的任务续接事件流（历史任务在 SSE 建连时惰性附加，避免启动风暴）
    if (task.run_status === 'RUNNING') {
      relay.start(task.task_id, task.session_id, resolve(cfg.runsDir, task.task_id))
    }
  }

  // 报告与证据只读服务（BE-08/09：只读内核产物，不 spawn 内核）
  const reports = new ReportService(cfg.runsDir, index, log)

  const app = buildApp({ cfg, log, gateway, index, exec, relay, reports })

  // 仅回环监听
  await app.listen({ host: cfg.host, port: cfg.port })
  log.info('BFF 已启动', {
    url: `http://${cfg.host}:${cfg.port}`,
    api: `http://${cfg.host}:${cfg.port}/api/v1`,
    health: `http://${cfg.host}:${cfg.port}/api/health`,
    agh_root: cfg.aghRoot,
  })

  const shutdown = async (signal: string) => {
    log.info('收到退出信号，正在优雅关闭', { signal })
    await app.close().catch(() => undefined)
    await gateway.close().catch(() => undefined)
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((e: unknown) => {
  // fail-fast + 人类可读（P-07）
  const msg = e instanceof Error ? e.message : String(e)
  const hint = e instanceof Error && 'hint' in e ? String((e as { hint?: string }).hint) : undefined
  process.stderr.write(`[启动失败] ${msg}\n${hint ? `修复指引：${hint}\n` : ''}`)
  process.exit(1)
})
