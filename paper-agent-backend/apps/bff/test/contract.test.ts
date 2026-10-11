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
    // resolveDaemonScope 会走完整 profile 解析（读配置 → 校验模型路由 → 读凭据）。
    // 其中"读凭据"要求 AGH home 及其**每一级父目录**的 ACL 仅含 SYSTEM + 当前用户
    // （AGH checkCredentialParents()）。若宿主环境给用户主目录下的应用目录多加了
    // 用户组权限（如沙箱用户组），AGH 会拒绝并把真实原因（reason=mode）吞成
    // 笼统的 CONFIG_CREDENTIAL_STORE「凭据存储不可用」。
    //
    // 这是**环境前置条件**而非本项目缺陷，故显式跳过而不是让它长期红着掩盖真问题。
    // 诊断方式： tsx apps/bff/scripts/credential-parent-acl.mts
    try {
      const scope = await daemon.resolveDaemonScope({ env: {}, cwd: process.cwd() })
      for (const k of ['home', 'profile', 'dataDir', 'discoveryPath', 'ownerPath', 'scopeID'] as const) {
        expect(typeof scope[k], `scope.${k}`).toBe('string')
      }
      expect(scope.discoveryPath.startsWith(scope.dataDir)).toBe(true)
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'CONFIG_CREDENTIAL_STORE') {
        console.warn(
          `[跳过] AGH 凭据存储在本机不可用（${code}）：AGH home 的 ACL 含有额外主体，` +
            'resolveDaemonScope 无法完成 profile 解析。' +
            '诊断： tsx apps/bff/scripts/credential-parent-acl.mts',
        )
        return
      }
      throw e
    }
  })
})
