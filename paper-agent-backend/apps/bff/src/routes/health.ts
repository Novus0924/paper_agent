import type { FastifyInstance } from 'fastify'
import type { AppConfig } from '../config.js'
import type { AgnesGateway } from '../agh/gateway.js'
import type { TaskIndex } from '../store/task-index.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * GET /api/health（BE-02）：
 * 版本、根、运行目录、任务数、会话/插件状态。
 * 健康探针不抛错——用字段表达状态（启动器与前端首屏据此引导）。
 */

export function registerHealthRoute(app: FastifyInstance, cfg: AppConfig, gateway: AgnesGateway, index: TaskIndex): void {
  app.get('/api/health', async () => {
    const gw = gateway.status()
    let taskCount = 0
    let runStatus = { ok: true, error: undefined as string | undefined }
    try {
      taskCount = index.count()
    } catch (e) {
      runStatus = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
    return {
      status: gw.connected && runStatus.ok ? 'ok' : 'degraded',
      service: 'paper-agent-bff',
      version: readVersion(cfg.root),
      root: cfg.root,
      runs_dir: cfg.runsDir,
      tasks: taskCount,
      agh: {
        connected: gw.connected,
        agnes_version: gw.agnesVersion,
        socket: gw.socketPath,
        sessions_open: gw.sessionsOpen,
        error: gw.error,
      },
      runs_dir_ok: runStatus.ok,
      runs_dir_error: runStatus.error,
    }
  })
}

function readVersion(root: string): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version?: string }
    return pkg.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}
