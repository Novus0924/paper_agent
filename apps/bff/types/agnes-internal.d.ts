/**
 * AGH **内部**模块的最小 ambient 声明（仅诊断脚本使用）。
 *
 * 为什么单独成文件：带顶层 `export` 的 `.d.ts` 是 *module*，其中的
 * `declare module 'x'` 只有在文件被 **include 进 program** 时才生效——
 * 靠 `paths` 按需解析是加载不到的（我第一次就踩了：声明写了但 tsc 仍报
 * "Cannot find module '@agnes/system-node'"）。
 *
 * 背景：credential-probe / credential-read-probe 是排查 AGH 凭据读取失败的
 * 关键工具——它们直接调用 AGH 原生能力，把被吞掉的原始异常打出来。
 * 脚本此前不在 tsconfig 检查范围内（做 ESLint 时才纳入），这些 import
 * 从未被类型检查过。
 *
 * 形状刻意**最小**：只声明脚本实际用到的成员。
 * AGH 升级改了签名时这里会报错——那是**好事**（比运行期才发现强）。
 */

// ── @agnes/system-node：Windows 原生能力（ACL/凭据底层）──
declare module '@agnes/system-node' {
  /**
   * Windows 私有文件（ACL 凭据）是否可用。
   *
   * 为 false 时 AGH 的凭据策略会拒绝读取，表现为 `CONFIG_CREDENTIAL_STORE`
   * ——但根因常常是**Node ABI 不匹配**（AGH 原生模块只按 Node 24 构建），
   * 而不是真的权限问题（README §8 第 9 条）。
   */
  export function windowsPrivateFilesAvailable(): boolean
}

// ── @agnes/host：凭据仓库 ──
declare module '@agnes/host' {
  export function createCredentialStore(opts: { root: string }): {
    /** 读取凭据；失败时抛出被AGH 上层吞掉前的**原始**异常（诊断关键） */
    read(ref: string): Promise<{ value?: unknown }>
  }
}