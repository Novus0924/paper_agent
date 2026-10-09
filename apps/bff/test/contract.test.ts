import { describe, expect, it } from 'vitest'
import * as sdk from '@agnes/sdk'
import * as daemon from '@agnes/daemon'

/**
 * 契约测试（需求 §15）：运行期校验我们依赖的 AGH 接口真实存在。
 * 本项目的类型来自本地声明（types/*.d.ts），因此必须用运行期实测兜住"AGH 升级导致接口漂移"。
 * 不依赖 daemon 运行；仅校验 API 表面与关键方法。
 */
describe('@agnes/sdk 契约（Session Gateway 依赖面）', () => {
  it('导出 createClient / memoryJournal / unixTransport', () => {
    expect(typeof sdk.createClient).toBe('function')
    expect(typeof sdk.memoryJournal).toBe('function')
    expect(typeof sdk.unixTransport).toBe('function')
  })

  it('Client 具备 initialize/close/call/session/workspace/journal', () => {
    // Windows 管道约束（实测）：transport 工厂必须提供可信身份解析，否则构造即抛。
    // 我们的网关（src/agh/gateway.ts）始终通过 resolveServerIdentity 提供，这里同样提供以免误报。
    const client = sdk.createClient({
      transport: { kind: 'unix', path: '\\\\.\\pipe\\contract-probe-not-connected' },
      auth: { kind: 'local' },
      journal: sdk.memoryJournal(),
      transportFactories: {
        unix: () =>
          sdk.unixTransport({
            path: '\\\\.\\pipe\\contract-probe-not-connected',
            resolveServerIdentity: async () => ({ pid: 1, processStartId: 'win32:1:0' }),
          }),
      },
    })
    const c = client as unknown as Record<string, unknown>
    for (const m of ['initialize', 'close', 'call']) expect(typeof c[m], `Client.${m}`).toBe('function')
    const session = c['session'] as Record<string, unknown>
    for (const m of ['new', 'load', 'attach', 'list']) expect(typeof session[m], `client.session.${m}`).toBe('function')
    const workspace = c['workspace'] as Record<string, unknown>
    for (const m of ['add', 'list']) expect(typeof workspace[m], `client.workspace.${m}`).toBe('function')
    expect(typeof (c['journal'] as Record<string, unknown>)['cursor']).toBe('function')
    // 懒连接：仅创建客户端不应建立连接
    expect(c['connectionState']).toBeDefined()
  })
})

describe('@agnes/daemon 契约（daemon 发现依赖面）', () => {
  it('导出 resolveDaemonScope / readDaemonDiscovery', () => {
    expect(typeof daemon.resolveDaemonScope).toBe('function')
    expect(typeof daemon.readDaemonDiscovery).toBe('function')
  })

  it('scope 解析返回 daemon 发现所需的全部路径字段', async () => {
    const scope = await daemon.resolveDaemonScope({ env: {}, cwd: process.cwd() })
    for (const k of ['home', 'profile', 'dataDir', 'discoveryPath', 'ownerPath', 'scopeID'] as const) {
      expect(typeof scope[k], `scope.${k}`).toBe('string')
    }
    expect(scope.discoveryPath.startsWith(scope.dataDir)).toBe(true)
  })
})
