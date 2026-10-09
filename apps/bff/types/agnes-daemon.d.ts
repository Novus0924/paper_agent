/**
 * @agnes/daemon 最小类型声明（运行期使用真实 link 包；理由见 types/agnes-sdk.d.ts）。
 */

export type DaemonScope = {
  readonly home: string
  readonly profile: string
  readonly workspace: string
  readonly dataDir: string
  readonly profileDir: string
  readonly daemonDir: string
  readonly profileFile: string
  readonly ownerPath: string
  readonly discoveryPath: string
  readonly webCredentialPath: string
  readonly scopeID: string
}

export type DaemonDiscovery = {
  readonly protocol: string
  readonly version: number
  readonly capabilities: string[]
  readonly scopeID: string
  readonly profile: string
  readonly socketPath: string
  readonly ready: boolean
  readonly web?: { url: string; origin: string }
  readonly owner: { pid: number; processStartId: string; generation: string; startedAt: string }
}

export function resolveDaemonScope(opts?: {
  env?: Record<string, string | undefined>
  cwd?: string
  profile?: string
  home?: string
  workspace?: string
  dataDir?: string
}): Promise<DaemonScope>

export function readDaemonDiscovery(
  scope: DaemonScope,
  options?: Record<string, unknown>,
): Promise<DaemonDiscovery | null>

export function publishDaemonDiscovery(scope: DaemonScope, input: unknown): Promise<unknown>
export function removeDaemonDiscovery(scope: DaemonScope, generation: string): Promise<void>
export function resolveDaemonProfile(scope: DaemonScope, options?: Record<string, unknown>): Promise<unknown>
export class DaemonDiscoveryError extends Error {}
export class DaemonScopeError extends Error {}
