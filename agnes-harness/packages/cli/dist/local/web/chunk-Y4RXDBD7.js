import {
  ADMIN_CONFIRMATION_LOCALE_NAMESPACE,
  ADMIN_DETAIL_LOCALE_NAMESPACE,
  ADMIN_DIALOGS_LOCALE_NAMESPACE,
  ADMIN_LIST_LOCALE_NAMESPACE,
  ADMIN_LOCALE_NAMESPACE,
  ConfirmDialogContent,
  DetailContent,
  OrphanPins,
  PluginList,
  PreviewConfirmationFacts,
  RollbackActivationFacts,
  SourceDialogContent,
  TrustConfirmationFacts,
  UiLocaleProvider,
  UpdateActivationFacts,
  adminConfirmationLocaleCatalog,
  adminDetailLocaleCatalog,
  adminDialogsLocaleCatalog,
  adminListLocaleCatalog,
  adminLocaleCatalog,
  blockerText,
  contributionText,
  createCatalogTranslator,
  createDocumentLocaleSource,
  createUiTranslator,
  hasPermission,
  integrityLabel,
  operationLabel,
  renderRegion,
  sourceLabel,
  terminal,
  unmountRegion,
  validatePackageAdminCall,
  validatePackageAdminData
} from "./chunk-Q3P2MODL.js";

// src/admin/plugins/api.ts
var ADMIN_API_ROOT = "/admin/plugins/api";
var METHOD_BY_PATH = {
  "catalog/list": "_agnes/v1/packages.catalog.list",
  "catalog/get": "_agnes/v1/packages.catalog.get",
  list: "_agnes/v1/packages.list",
  inspect: "_agnes/v1/packages.inspect",
  install: "_agnes/v1/packages.install",
  trust: "_agnes/v1/packages.trust",
  untrust: "_agnes/v1/packages.untrust",
  enable: "_agnes/v1/packages.enable",
  disable: "_agnes/v1/packages.disable",
  update: "_agnes/v1/packages.update",
  rollback: "_agnes/v1/packages.rollback",
  remove: "_agnes/v1/packages.remove",
  "operation/get": "_agnes/v1/packages.operation.get",
  "operation/cancel": "_agnes/v1/packages.operation.cancel",
  "pins/inspect": "_agnes/v1/packages.pins.inspect",
  "pins/release": "_agnes/v1/packages.pins.release",
  "trust-workspace": "_agnes/v1/packages.trustWorkspace",
  "tree/get": "_agnes/v1/plugins.tree.get",
  "tree/list": "_agnes/v1/plugins.tree.list",
  "tree/apply": "_agnes/v1/plugins.tree.apply",
  "tree/rollback": "_agnes/v1/plugins.tree.rollback"
};
var AdminApiError = class extends Error {
  details;
  constructor(details) {
    super(details.message);
    this.name = "AdminApiError";
    this.details = details;
  }
};
function safeError(value, fallback = "The admin backend is temporarily unavailable. Try again later.") {
  if (!value || typeof value !== "object") return { code: "ADMIN_UNAVAILABLE", message: fallback };
  const error = value;
  const code = typeof error.error?.code === "string" ? error.error.code : "ADMIN_UNAVAILABLE";
  const message = typeof error.error?.message === "string" ? error.error.message : fallback;
  return { code, message };
}
function commandId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return `web-${crypto.randomUUID()}`;
  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function intentFingerprint(value) {
  let first = 2166136261;
  let second = 2654435769;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 2246822507);
  }
  return `${value.length.toString(16)}-${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}
var PluginAdminApi = class {
  #fetch;
  #context;
  constructor(context, fetcher = fetch) {
    this.#context = context;
    this.#fetch = fetcher;
  }
  static async context(fetcher = fetch) {
    const response = await fetcher(`${ADMIN_API_ROOT}/context`, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
    const body = await json(response);
    if (!response.ok)
      throw new AdminApiError(
        safeError(body, response.status === 403 ? "You do not have plugin admin permission." : void 0)
      );
    if (!isContext(body))
      throw new AdminApiError({
        code: "ADMIN_CONTEXT_INVALID",
        message: "The admin context is invalid; reopen the page."
      });
    return body;
  }
  async list() {
    return this.#post("list", { profile: this.#context.profile });
  }
  async treeGet() {
    return this.#post("tree/get", { profile: this.#context.profile });
  }
  async treeList() {
    return this.#post("tree/list", { profile: this.#context.profile });
  }
  async treeApply(artifact) {
    return this.#effect("tree/apply", { artifact });
  }
  async treeRollback() {
    return this.#effect("tree/rollback", {});
  }
  async surfaceLinks() {
    const fetcher = this.#fetch;
    const response = await fetcher(`${ADMIN_API_ROOT}/surfaces`, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
    const result = await json(response);
    if (!response.ok) throw new AdminApiError(safeError(result));
    if (!isSurfaceLinksResult(result))
      throw new AdminApiError({
        code: "ADMIN_RESPONSE_INVALID",
        message: "The backend returned data that cannot be verified."
      });
    return result;
  }
  async catalog(query, cursor) {
    return this.#post("catalog/list", {
      profile: this.#context.profile,
      ...query ? { query } : {},
      ...cursor ? { cursor } : {},
      limit: 50
    });
  }
  async catalogGet(id, version) {
    return this.#post("catalog/get", {
      profile: this.#context.profile,
      id,
      ...version ? { version } : {}
    });
  }
  async inspect(source) {
    return this.#effect("inspect", { source });
  }
  async install(source, expectedIntegrity) {
    return this.#effect("install", { source, expectedIntegrity });
  }
  async trust(id, expectedIntegrity, capabilityHash) {
    return this.#effect("trust", { id, expectedIntegrity, capabilityHash });
  }
  async untrust(id, expectedIntegrity, capabilityHash) {
    return this.#effect("untrust", { id, expectedIntegrity, capabilityHash });
  }
  async enable(id) {
    return this.#effect("enable", { id });
  }
  async enableChecked(id, expectedInstalledIntegrity, expectedActiveIntegrity) {
    return this.#effect("enable", {
      id,
      expectedInstalledIntegrity,
      expectedActiveIntegrity
    });
  }
  async disable(id) {
    return this.#effect("disable", { id });
  }
  async update(id, source, expectedIntegrity, activation) {
    return this.#effect("update", {
      id,
      source,
      expectedIntegrity,
      ...activation ? { activation } : {}
    });
  }
  async rollback(id, expectedTargetIntegrity, activation) {
    return this.#effect("rollback", {
      id,
      ...expectedTargetIntegrity ? { expectedTargetIntegrity } : {},
      ...activation ? { activation } : {}
    });
  }
  async remove(id) {
    return this.#effect("remove", { id });
  }
  async operation(operationId) {
    return this.#post("operation/get", {
      profile: this.#context.profile,
      operationId
    });
  }
  async cancel(operationId) {
    return this.#effect("operation/cancel", { operationId });
  }
  async pinsInspect() {
    return this.#post("pins/inspect", { profile: this.#context.profile });
  }
  async pinsRelease(pinIds) {
    return this.#effect("pins/release", { pinIds });
  }
  async #effect(path, params) {
    const payload = {
      profile: this.#context.profile,
      clientId: this.#context.clientId,
      ...params
    };
    const storageKey = this.#intentStorageKey(path, payload);
    const storage = typeof sessionStorage === "undefined" ? void 0 : sessionStorage;
    const stableCommandId = storageKey ? storage?.getItem(storageKey) || commandId() : commandId();
    if (storageKey) storage?.setItem(storageKey, stableCommandId);
    const result = await this.#post(path, {
      ...payload,
      commandId: stableCommandId
    });
    if (storageKey) storage?.removeItem(storageKey);
    return result;
  }
  #intentStorageKey(path, payload) {
    if (!this.#context.authScope) return void 0;
    return `agnes-plugin-intent:${this.#context.authScope}:${this.#context.profile}:${path}:${intentFingerprint(JSON.stringify(payload))}`;
  }
  async #post(path, body) {
    const method = METHOD_BY_PATH[path];
    if (!validatePackageAdminCall(method, "params", body).ok)
      throw new AdminApiError({
        code: "ADMIN_REQUEST_INVALID",
        message: "The admin request arguments are invalid."
      });
    const fetcher = this.#fetch;
    const response = await fetcher(`${ADMIN_API_ROOT}/${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const result = await json(response);
    if (!response.ok)
      throw new AdminApiError(
        safeError(
          result,
          response.status === 403 ? "You do not have permission to perform this action." : void 0
        )
      );
    if (!validatePackageAdminCall(method, "result", result).ok)
      throw new AdminApiError({
        code: "ADMIN_RESPONSE_INVALID",
        message: "The backend returned data that cannot be verified."
      });
    return result;
  }
};
async function json(response) {
  try {
    return await response.json();
  } catch {
    return void 0;
  }
}
function isContext(value) {
  return validatePackageAdminData("PackageAdminContext", value).ok;
}
function isSurfaceLinksResult(value) {
  if (!value || typeof value !== "object" || !("surfaces" in value)) return false;
  const surfaces = value.surfaces;
  if (!Array.isArray(surfaces) || surfaces.length > 256) return false;
  return surfaces.every(
    (surface) => !!surface && typeof surface === "object" && Object.keys(surface).length === 3 && typeof surface.packageId === "string" && typeof surface.surfaceId === "string" && typeof surface.mount === "string" && /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)?)$/.test(
      surface.packageId
    ) && surface.packageId.length <= 256 && /^[a-z][a-z0-9-]{0,63}$/.test(surface.surfaceId) && /^\/(?!_agnes(?:\/|$))[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(surface.mount) && surface.mount.length <= 256
  );
}

// src/admin/plugins/locales/shell.ts
var pluginAdminShellLocaleCatalog = {
  en: {
    "search.installed": "Filter installed plugins",
    "search.discover": "Search the plugin catalog",
    "shell.skip": "Skip to plugin list",
    "shell.return": "Return to workbench",
    "shell.eyebrow": "Settings",
    "shell.heading": "Plugin management",
    "shell.embedded.heading": "Plugins",
    "shell.embedded.description": "Install, enable, and inspect local Agnes plugins.",
    "shell.document-title": "Plugin management · Agnes",
    "shell.install": "Install from source",
    "shell.recovery.aria": "Recovery mode",
    "shell.recovery.title": "Read-only recovery mode",
    "shell.recovery.description": "The admin page can show security status. Checks and changes are disabled until recovery is complete.",
    "shell.orphan.aria": "Orphan runtime pins",
    "shell.orphan.title": "Orphan runtime pins need to be released",
    "shell.orphan.release-all": "Release all",
    "shell.tabs.aria": "Plugin views",
    "shell.tab.installed": "Installed",
    "shell.tab.discover": "Discover",
    "shell.search.aria": "Search plugins",
    "shell.detail.aria": "Plugin details",
    "shell.source.kicker": "Pre-install check",
    "shell.source.heading": "Check a plugin source",
    "shell.source.intro": "Checking does not install or enable a plugin. Review the integrity summary before continuing.",
    "shell.source.type": "Source type",
    "shell.source.file": "Local path",
    "shell.source.workspace": "Workspace extension",
    "shell.source.git": "Pinned Git commit",
    "shell.source.reference": "Source reference",
    "shell.source.hint": "The host strictly validates source formats. Do not paste credentials here.",
    "shell.source.submit": "Check source",
    "shell.cancel": "Cancel",
    "shell.confirm.kicker": "Confirmation required",
    "shell.confirm.heading": "Confirm action",
    "shell.confirm.action": "Confirm"
  },
  "zh-CN": {
    "search.installed": "筛选当前已安装列表",
    "search.discover": "搜索目录中的插件",
    "shell.skip": "跳至插件列表",
    "shell.return": "返回工作台",
    "shell.eyebrow": "系统设置",
    "shell.heading": "插件管理",
    "shell.embedded.heading": "插件",
    "shell.embedded.description": "安装、启用和检查 Agnes 的本地插件。",
    "shell.document-title": "插件管理 · Agnes",
    "shell.install": "从来源安装",
    "shell.recovery.aria": "恢复模式",
    "shell.recovery.title": "只读恢复模式",
    "shell.recovery.description": "管理页仍可显示安全状态；恢复完成前，所有检查和变更操作均已停用。",
    "shell.orphan.aria": "孤儿运行时 pin",
    "shell.orphan.title": "存在未释放的孤儿运行时 pin",
    "shell.orphan.release-all": "全部释放",
    "shell.tabs.aria": "插件视图",
    "shell.tab.installed": "已安装",
    "shell.tab.discover": "发现",
    "shell.search.aria": "搜索插件",
    "shell.detail.aria": "插件详情",
    "shell.source.kicker": "安装前检查",
    "shell.source.heading": "从来源检查插件",
    "shell.source.intro": "检查不会安装或启用插件。确认预览中的完整性摘要后，才能继续安装。",
    "shell.source.type": "来源类型",
    "shell.source.file": "本地相对路径",
    "shell.source.workspace": "工作区扩展",
    "shell.source.git": "固定 Git 提交",
    "shell.source.reference": "来源引用",
    "shell.source.hint": "来源格式由后台严格校验；不要在这里粘贴凭据。",
    "shell.source.submit": "检查内容",
    "shell.cancel": "取消",
    "shell.confirm.kicker": "需要确认",
    "shell.confirm.heading": "确认操作",
    "shell.confirm.action": "确认"
  }
};

// src/admin/plugins/locales/admin.ts
var PLUGIN_ADMIN_LOCALE_NAMESPACE = "@agnes/web/plugin-admin";
var pluginAdminLocaleCatalog = {
  en: {
    ...pluginAdminShellLocaleCatalog.en,
    "error.connection": "Could not connect to the plugin admin service. The current page content has been kept.",
    "error.context-invalid": "The admin context is invalid. Reopen the page.",
    "error.response-invalid": "The admin response could not be verified.",
    "pin.active": "Currently running",
    "pin.candidate": "Install candidate",
    "pin.recovery": "Recovery retention",
    "pin.rollback": "Rollback target",
    "pin.turn": "In-progress call",
    "notice.source-unavailable": "Could not check the source right now.",
    "notice.inspecting-source": "Checking the source, integrity, and permission changes.",
    "notice.inspect-failed": "Source check failed.",
    "notice.installing": "Installing. You can inspect the contents and enable the package when this finishes.",
    "notice.updating": "Updating. The host will confirm the actual runtime state.",
    "source.title.inspect": "Check a plugin source",
    "source.title.update": "Update {id} from a new source",
    "source.intro.update": "Enter an explicit new source. The check will not reuse the installed source or change the running version before confirmation.",
    "source.intro.install": "Checking does not install or enable a plugin. Review the integrity summary before continuing.",
    "source.error.incomplete": "Enter a complete reference in the selected source format.",
    "source.placeholder.npm": "npm:scope/package@1.2.3",
    "preview.title.install": "Install preview",
    "preview.title.update": "Update preview",
    "preview.description.install": "Review the integrity, capabilities, dependencies, and blockers reported by the host. The package stays disabled after installation and can be enabled after inspection.",
    "preview.description.update-combined": "The update and secure activation will run atomically against the current installed and runtime summaries.",
    "preview.description.update-compatible": "The package will be updated in the disabled state. The host has not declared combined hot-update support, or the required summaries are incomplete.",
    "preview.action.install": "Confirm installation",
    "preview.action.update-activate": "Confirm update and enable",
    "preview.action.update": "Confirm update (keep disabled)",
    "error.session": "The admin session is not ready.",
    "error.read-only": "Plugin operations are unavailable in read-only recovery mode.",
    "error.restoring": "The admin service has not recovered; plugin operations are unavailable.",
    "error.forbidden": "Your account does not have permission to perform this operation.",
    "error.busy": "An operation for this plugin is already being submitted or processed.",
    "connection.loading": "Connecting to the admin service…",
    "connection.offline": "Connection interrupted. Content is preserved while reconnecting.",
    "connection.forbidden": "You do not have plugin admin permission.",
    "notice.operation-refreshed": "{operation}. Latest state loaded.",
    "notice.operation-error": "{operation}: {message}",
    "tree.error": "Could not refresh plugin resources. Try again; if the issue continues, check the host logs.",
    "tree.loading": "Updating plugin resources…",
    "detail.heading.operations": "Plugin operations",
    "detail.heading.plugin": "Plugin details",
    "detail.intro.operations": "The host is processing these operations. Only states reported by the host are shown here.",
    "detail.intro.plugin": "Select a plugin to review its source, permissions, and runtime state.",
    "detail.retry-allowed": "retry available from the host",
    "blocker.current": "Current blockers",
    "blocker.operation": "Blockers for this operation",
    "fact.source": "Source",
    "fact.integrity": "Integrity",
    "fact.contribution": "Contributions",
    "fact.license": "License",
    "fact.browser-slots": "Browser slots registered in this session",
    "fact.no-browser-slots": "No browser slots are registered",
    "fact.failure": "Failure reason",
    "fact.cleanup": "Old resource cleanup",
    "fact.cleanup-pending": "Pending; the host will retry",
    "fact.cleanup-none": "Nothing to clean up",
    "fact.rollback-target": "Verified rollback target",
    "fact.unavailable": "Not provided by the host",
    version: "Version {version}",
    compatibility: "Compatibility: {value}",
    "surface.open": "Open page · {mount}",
    "surface.open-aria": "Open {surface} page {mount} for {id}",
    "surface.open-named": "{surface} · {mount}",
    "action.update-catalog": "Choose an update from the catalog",
    "action.update-source": "Update from a new source",
    "action.rollback": "Roll back to {version}",
    "action.rollback-unknown": "Roll back (target unknown)",
    "action.rollback-ready": "Bind the verified target and atomically roll back and activate it.",
    "action.rollback-unavailable": "The host has not declared combined rollback support, or a target, runtime summary, or required permission is missing.",
    "action.remove": "Uninstall plugin",
    "action.check-update": "Check for updates",
    "action.check-install-content": "Inspect installation",
    "action.unsupported": "Unsupported",
    "action.check-install": "Check installation",
    "action.retry-ui": "Retry UI",
    "action.disable": "Request disable",
    "action.enable": "Request enable",
    "action.runtime-unconfirmed": "Runtime state unconfirmed",
    "error.runtime-unconfirmed": "The actual runtime summary has not been confirmed, so this plugin cannot be safely enabled.",
    "error.capability-unconfirmed": "The capability summary has not been confirmed, so this version cannot be safely enabled.",
    "confirm.enable.title": "Enable {id}",
    "confirm.enable.trusted": "This requests activation. The plugin is shown as running only after the host and browser UI confirm its state.",
    "confirm.enable.verify": "The current version and capability scope will be checked before activation. A failed check will leave the plugin disabled.",
    "confirm.enable.action": "Confirm enable",
    "confirm.enable.facts": "The integrity and capability summary hashes will be bound and the current version and capability scope checked before enabling.",
    "error.state-changed": "The plugin version or capability scope has changed. Review the latest details before enabling it again.",
    "confirm.disable.title": "Request disable for {id}",
    "confirm.disable.description": "Disabling removes the plugin UI contributions while keeping the Agnes interface available. The host drains and revokes them at a safe boundary.",
    "confirm.disable.action": "Request disable",
    "confirm.remove.title": "Uninstall {id}",
    "confirm.remove.description": "The host checks dependencies, runtime generations, and deployment references before uninstalling. Blockers cannot be bypassed.",
    "confirm.remove.action": "Confirm uninstall",
    "confirm.rollback.title": "Roll back {id} to {version}",
    "confirm.rollback.description": "The host rechecks the target summary and atomically rolls back and activates it.",
    "confirm.rollback.action": "Confirm rollback and enable",
    "confirm.release.one": "Release pin {id}",
    "confirm.release.all": "Release all orphan pins ({count})",
    "confirm.release.description": "Releasing a pin immediately frees its runtime snapshot. If a pin is no longer orphaned at confirmation time, the host skips it and reports why.",
    "confirm.release.action": "Confirm release",
    "error.pin-release": "Release failed for an unknown reason.",
    "notice.pin-skipped": "{count} pin(s) are no longer orphaned and did not need to be released.",
    "notice.runtime-pending": "The host completed the operation, but the browser UI state is not confirmed yet.",
    "notice.runtime-retry": "The browser UI state is not confirmed. You can retry later.",
    "source.validation.missing": "Enter a source reference.",
    "source.validation.type": "Select a source type.",
    "source.validation.prefix": "This source reference must start with “{prefix}”, for example {example}."
  },
  "zh-CN": {
    ...pluginAdminShellLocaleCatalog["zh-CN"],
    "error.connection": "无法连接插件管理后台。已保留当前页面内容。",
    "error.context-invalid": "管理上下文无效，请重新打开页面。",
    "error.response-invalid": "后台返回的数据无法确认。",
    "pin.active": "当前运行",
    "pin.candidate": "安装候选",
    "pin.recovery": "恢复保留",
    "pin.rollback": "回滚目标",
    "pin.turn": "进行中的调用",
    "notice.source-unavailable": "暂时无法检查来源。",
    "notice.inspecting-source": "正在检查来源、完整性与权限变化。",
    "notice.inspect-failed": "检查来源失败。",
    "notice.installing": "正在安装。完成后可检查内容并直接启用。",
    "notice.updating": "正在更新，实际运行状态将由后台确认。",
    "source.title.inspect": "从来源检查插件",
    "source.title.update": "从新来源更新 {id}",
    "source.intro.update": "请输入明确的新来源。检查不会复用当前已安装来源，也不会在确认前改变运行版本。",
    "source.intro.install": "检查不会安装或启用插件。确认预览中的完整性摘要后，才能继续安装。",
    "source.error.incomplete": "请输入符合所选来源格式的完整引用。",
    "source.placeholder.npm": "npm:scope/package@1.2.3",
    "preview.title.install": "安装预览",
    "preview.title.update": "更新预览",
    "preview.description.install": "请先审阅下方后台返回的完整性、能力、依赖和阻断信息。安装后会保持停用，检查后可直接启用。",
    "preview.description.update-combined": "将原子执行更新与安全激活，并绑定当前安装与运行摘要。",
    "preview.description.update-compatible": "将按兼容模式更新为停用状态；后台未声明组合热更新能力，或当前摘要条件不完整。",
    "preview.action.install": "确认安装",
    "preview.action.update-activate": "确认更新并激活",
    "preview.action.update": "确认更新（保持停用）",
    "error.session": "管理会话尚未就绪。",
    "error.read-only": "当前处于只读恢复模式，无法执行插件操作。",
    "error.restoring": "管理后台尚未恢复，无法执行插件操作。",
    "error.forbidden": "当前账户没有执行此操作的权限。",
    "error.busy": "此插件已有操作正在提交或执行。",
    "connection.loading": "正在连接管理后台…",
    "connection.offline": "连接中断，内容保留，等待重新连接。",
    "connection.forbidden": "没有插件管理权限。",
    "notice.operation-refreshed": "{operation}。已读取最新状态。",
    "notice.operation-error": "{operation}：{message}",
    "tree.error": "插件资源更新失败，请重试；若问题持续，请查看后台日志。",
    "tree.loading": "插件资源正在更新，请稍候。",
    "detail.heading.operations": "插件操作",
    "detail.heading.plugin": "插件详情",
    "detail.intro.operations": "后台正在处理以下操作；此处仅显示后台已报告的状态。",
    "detail.intro.plugin": "选择一项插件，查看来源、权限和运行状态。",
    "detail.retry-allowed": "后台允许重试",
    "blocker.current": "当前阻断项",
    "blocker.operation": "此操作的阻断项",
    "fact.source": "来源",
    "fact.integrity": "完整性",
    "fact.contribution": "贡献",
    "fact.license": "许可证",
    "fact.browser-slots": "本浏览器会话实际注册槽位",
    "fact.no-browser-slots": "当前没有已注册的浏览器槽位",
    "fact.failure": "失败原因",
    "fact.cleanup": "旧资源清理",
    "fact.cleanup-pending": "尚未完成，后台会继续重试",
    "fact.cleanup-none": "无待清理状态",
    "fact.rollback-target": "已核验回滚目标",
    "fact.unavailable": "后台未提供",
    version: "版本 {version}",
    compatibility: "兼容性：{value}",
    "surface.open": "打开页面 · {mount}",
    "surface.open-aria": "打开 {id} 的 {surface} 页面 {mount}",
    "surface.open-named": "{surface} · {mount}",
    "action.update-catalog": "从目录选择更新版本",
    "action.update-source": "从新来源更新",
    "action.rollback": "回滚到 {version}",
    "action.rollback-unknown": "回滚（目标未知）",
    "action.rollback-ready": "将绑定已核验目标并原子执行回滚与安全激活。",
    "action.rollback-unavailable": "后台未声明组合回滚能力，或缺少目标、运行摘要及必要权限。",
    "action.remove": "卸载插件",
    "action.check-update": "检查更新",
    "action.check-install-content": "检查安装内容",
    "action.unsupported": "不支持",
    "action.check-install": "检查安装",
    "action.retry-ui": "重试 UI",
    "action.disable": "请求停用",
    "action.enable": "请求启用",
    "action.runtime-unconfirmed": "运行状态待确认",
    "error.runtime-unconfirmed": "实际运行摘要尚未确认，不能安全启用。",
    "error.capability-unconfirmed": "缺少已确认的能力摘要，不能安全启用此版本。",
    "confirm.enable.title": "启用 {id}",
    "confirm.enable.trusted": "确认后将请求启用；后台和浏览器 UI 状态确认后才显示已运行。",
    "confirm.enable.verify": "确认后将校验当前版本及能力范围，通过后继续启用；校验失败时不会启用。",
    "confirm.enable.action": "确认启用",
    "confirm.enable.facts": "启用前会绑定下列完整性摘要与能力摘要哈希，并校验当前版本及能力范围。",
    "error.state-changed": "插件版本或能力范围已经变化，请确认最新内容后再次启用。",
    "confirm.disable.title": "请求停用 {id}",
    "confirm.disable.description": "停用后插件 UI 贡献将移除，Agnes 原界面保持可用；后台会在安全边界完成排干与撤销。",
    "confirm.disable.action": "请求停用",
    "confirm.remove.title": "卸载 {id}",
    "confirm.remove.description": "卸载会由后台检查依赖、运行代际和部署引用。出现阻断项时不会绕过检查。",
    "confirm.remove.action": "确认卸载",
    "confirm.rollback.title": "回滚 {id} 到 {version}",
    "confirm.rollback.description": "后台会重新核验目标摘要，并原子执行回滚与安全激活。",
    "confirm.rollback.action": "确认回滚并激活",
    "confirm.release.one": "释放 pin {id}",
    "confirm.release.all": "释放全部孤儿 pin（共 {count} 个）",
    "confirm.release.description": "释放会立即解除对应运行时快照的占用。若某个 pin 在确认前已不再孤儿，后台会跳过并说明原因。",
    "confirm.release.action": "确认释放",
    "error.pin-release": "释放失败，原因未知。",
    "notice.pin-skipped": "{count} 个 pin 已不再是孤儿，无需释放。",
    "notice.runtime-pending": "后台已完成，浏览器 UI 状态待确认。",
    "notice.runtime-retry": "浏览器 UI 状态待确认，可稍后重试。",
    "source.validation.missing": "请输入来源引用。",
    "source.validation.type": "请选择来源类型。",
    "source.validation.prefix": "此类型的引用必须以“{prefix}”开头，例如 {example}"
  }
};

// src/admin/plugins/source-form.ts
var sourceText = createCatalogTranslator(pluginAdminLocaleCatalog, "en");
function sourceFromForm(type, ref) {
  if (!ref) return void 0;
  if (type === "npm" || type === "file" || type === "workspace" || type === "git") return { type, ref };
  return void 0;
}
var SOURCE_FORMATS = Object.freeze({
  npm: { prefix: "npm:", example: "npm:scope/package@1.2.3" },
  file: {
    prefix: "file:./",
    example: "file:./examples/packages/hot-service/v1"
  },
  workspace: {
    prefix: "workspace:extensions/",
    example: "workspace:extensions/my-extension"
  },
  git: {
    prefix: "git:",
    example: "git:https://example.com/org/repo.git#<40-character commit hash>"
  }
});
function sourceProblem(type, ref, t = sourceText) {
  if (!ref) return t("source.validation.missing");
  const format = type in SOURCE_FORMATS ? SOURCE_FORMATS[type] : void 0;
  if (!format) return t("source.validation.type");
  if (!ref.startsWith(format.prefix))
    return t("source.validation.prefix", { prefix: format.prefix, example: format.example });
  return void 0;
}

// src/admin/plugins/types.ts
var ADMIN_FEATURES = Object.freeze({
  compositeActivation: "packages.composite-activation.v1",
  runtimeIdentity: "packages.runtime-identity.v1",
  rollbackTarget: "packages.rollback-target.v1",
  operationControl: "packages.operation-control.v1"
});
function hasFeature(context, feature) {
  return !!context?.features?.includes(feature);
}

// src/admin/plugins/admin.tsx
import { jsx } from "react/jsx-runtime";
var OPERATION_STORAGE_PREFIX = "agnes-plugin-operation-ids:";
var ACTIVE_REFRESH_MS = 1200;
var RECONNECT_REFRESH_MS = 3e3;
var PIN_RELEASE_BATCH_SIZE = 64;
var pluginAdminCatalogs = {
  [PLUGIN_ADMIN_LOCALE_NAMESPACE]: pluginAdminLocaleCatalog,
  [ADMIN_CONFIRMATION_LOCALE_NAMESPACE]: adminConfirmationLocaleCatalog,
  [ADMIN_DETAIL_LOCALE_NAMESPACE]: adminDetailLocaleCatalog,
  [ADMIN_DIALOGS_LOCALE_NAMESPACE]: adminDialogsLocaleCatalog,
  [ADMIN_LIST_LOCALE_NAMESPACE]: adminListLocaleCatalog,
  [ADMIN_LOCALE_NAMESPACE]: adminLocaleCatalog
};
var SOURCE_TYPE_OPTIONS = Object.keys(SOURCE_FORMATS).map((type) => ({
  value: type,
  label: type
}));
function element(id, tag) {
  const found = document.getElementById(id);
  if (!found || found.tagName.toLowerCase() !== tag) throw new Error(`missing ${tag}#${id}`);
  return found;
}
function button(id) {
  return element(id, "button");
}
function setDialog(dialog, open, focus) {
  if (open) {
    for (const other of document.querySelectorAll("dialog[open]")) {
      if (other === dialog) continue;
      if (other.id === "config") continue;
      try {
        if (other instanceof HTMLDialogElement && other.open) other.close();
        else other.removeAttribute("open");
      } catch {
        other.removeAttribute("open");
      }
    }
  }
  if (open && !dialog.open) {
    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute("open", "");
    }
  }
  if (!open && dialog.open) {
    try {
      dialog.close();
    } catch {
      dialog.removeAttribute("open");
    }
  }
  if (open) focus?.focus();
}
function safeMessage(error) {
  if (error instanceof AdminApiError) return error.details;
  return {
    code: "ADMIN_UNAVAILABLE",
    message: "Could not connect to the plugin admin service. The current page content has been kept."
  };
}
function hasClientContribution(item) {
  return item.contributions.some(
    (contribution) => contribution.kind === "client" && "client" in contribution || contribution.kind === "extension" && contribution.client !== void 0
  );
}
function isClientOnly(item) {
  return item.contributions.length > 0 && item.contributions.every(
    (contribution) => contribution.kind === "extension" && contribution.client !== void 0 && Object.keys(contribution.capabilities ?? {}).every((capability) => capability === "ui")
  );
}
function sourceForCatalog(item) {
  return item.source;
}
function pinPurposeLabel(purpose, t) {
  const key = {
    active: "pin.active",
    candidate: "pin.candidate",
    recovery: "pin.recovery",
    rollback: "pin.rollback",
    turn: "pin.turn"
  };
  return t(key[purpose]);
}
function asRuntimeView(state) {
  return state;
}
var PluginAdminPage = class {
  #runtime;
  #runtimeStop;
  #locale;
  #localeStop;
  #localeCleanup;
  #t;
  #adminT;
  actualSlots;
  constructor(options = {}) {
    this.actualSlots = options.actualSlots;
    this.#runtime = options.runtime;
    if (options.locale) {
      this.#locale = options.locale;
      this.#localeStop = options.locale.subscribe(() => this.render());
    } else {
      const locale = createDocumentLocaleSource(pluginAdminCatalogs);
      this.#locale = locale.source;
      this.#localeCleanup = locale.dispose;
      this.#localeStop = locale.source.subscribe(() => this.render());
    }
    this.#t = createUiTranslator(this.#locale, PLUGIN_ADMIN_LOCALE_NAMESPACE, pluginAdminLocaleCatalog);
    this.#adminT = createUiTranslator(this.#locale, ADMIN_LOCALE_NAMESPACE, adminLocaleCatalog);
  }
  #state = {
    installed: [],
    surfaceLinks: [],
    catalog: [],
    nextCursor: null,
    operations: /* @__PURE__ */ new Map(),
    runtime: /* @__PURE__ */ new Map(),
    inventoryAuthoritative: false,
    loading: true,
    connection: "loading"
  };
  #api;
  #tab = "installed";
  #query = "";
  #queryRaw = "";
  #generation = 0;
  #pendingConfirm;
  #confirmActionDisabled = false;
  #confirmTrigger;
  #detailTrigger;
  #detailDismissed = false;
  #operationModes = /* @__PURE__ */ new Map();
  #operationPackages = /* @__PURE__ */ new Map();
  #operationTimers = /* @__PURE__ */ new Map();
  #operationCompletions = /* @__PURE__ */ new Map();
  #submittingPackages = /* @__PURE__ */ new Set();
  #sourceMode = "install";
  #sourcePackageId;
  #sourceTrigger;
  #sourceBusy = false;
  #sourceTypeValue = "npm";
  #sourceRefValue = "";
  #sourceError;
  #sourceProblem;
  #noticeState = {
    message: "",
    kind: ""
  };
  #orphanPinList = [];
  #orphanPinErrors = /* @__PURE__ */ new Map();
  #orphanPinNotice;
  // Distinct from #orphanPinNotice (which reports a per-pin "no longer orphaned" outcome after a
  // release): this reports pinsInspect() itself failing during refresh(), so the section stays
  // visible with a clear message instead of silently keeping a now-unverified stale list.
  #orphanPinFetchError;
  #orphanPinsHost = element("orphan-pins", "section");
  #notice = element("admin-notice", "p");
  #treeStatus = element("plugin-tree-status", "p");
  #recovery = element("recovery-notice", "section");
  #tabs = {
    installed: button("installed-tab"),
    discover: button("discover-tab")
  };
  #search = element("plugin-search", "input");
  #layout = element("plugin-layout", "div");
  #listHost = element("plugin-list", "section");
  #detail = element("plugin-detail", "dialog");
  #sourceDialog = element("source-dialog", "dialog");
  #confirmDialog = element("plugin-confirm", "dialog");
  async start() {
    if (this.#runtime) {
      this.#state = { ...this.#state, runtime: this.#runtime.snapshot() };
      this.#runtimeStop = this.#runtime.subscribe(() => {
        if (!this.#runtime) return;
        this.#state = { ...this.#state, runtime: this.#runtime.snapshot() };
        this.render();
      });
    }
    await this.refresh();
  }
  bind() {
    this.#detail.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.closeDetail();
    });
    this.#detail.addEventListener("click", (event) => {
      if (event.target === this.#detail) this.closeDetail();
    });
    button("install-source").addEventListener("click", () => this.openSourceDialog("install"));
    for (const name of ["installed", "discover"]) {
      this.#tabs[name].addEventListener("click", () => void this.selectTab(name));
    }
    this.#tabs.installed.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "Home") {
        event.preventDefault();
        void this.selectTab("discover");
        this.#tabs.discover.focus();
      }
    });
    this.#tabs.discover.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "End") {
        event.preventDefault();
        void this.selectTab("installed");
        this.#tabs.installed.focus();
      }
    });
    this.#search.addEventListener("input", () => {
      this.#queryRaw = this.#search.value;
      this.#query = this.#search.value.trim();
      if (this.#tab === "installed") this.render();
      else void this.loadCatalog();
    });
    this.#sourceDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.closeSourceDialog();
    });
    this.#confirmDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.closeConfirm();
    });
  }
  /** 页签选中态：aria-selected 与 roving tabIndex 同步（同组只保留一个 tabindex=0）。 */
  syncTabs() {
    for (const name of ["installed", "discover"]) {
      const selected = this.#tab === name;
      const tab = this.#tabs[name];
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
  }
  async refresh(options = {}) {
    const generation = ++this.#generation;
    this.#state = {
      ...this.#state,
      loading: true,
      ...options.preserveError ? {} : { error: void 0 }
    };
    this.render();
    let resolvedContext;
    try {
      const context = await PluginAdminApi.context();
      if (generation !== this.#generation) return;
      resolvedContext = context;
      this.#api = new PluginAdminApi(context);
      this.#state = { ...this.#state, context };
      const list = await this.#api.list();
      if (generation !== this.#generation) return;
      let surfaceLinks = [];
      try {
        surfaceLinks = (await this.#api.surfaceLinks()).surfaces;
      } catch {
      }
      if (generation !== this.#generation) return;
      let tree;
      try {
        tree = await this.#api.treeList();
      } catch {
      }
      if (generation !== this.#generation) return;
      this.#state = {
        ...this.#state,
        context,
        installed: list.packages,
        surfaceLinks,
        tree,
        inventoryAuthoritative: true,
        loading: false,
        connection: "connected"
      };
      this.scheduleTreePoll();
      try {
        const { orphans } = await this.#api.pinsInspect();
        if (generation !== this.#generation) return;
        this.#orphanPinList = [...orphans];
        this.#orphanPinErrors = /* @__PURE__ */ new Map();
        this.#orphanPinNotice = void 0;
        this.#orphanPinFetchError = void 0;
      } catch (error) {
        if (generation !== this.#generation) return;
        this.#orphanPinList = [];
        this.#orphanPinErrors = /* @__PURE__ */ new Map();
        this.#orphanPinFetchError = {
          detail: safeMessage(error),
          localize: !(error instanceof AdminApiError)
        };
      }
      this.restoreOperations(context);
      if (this.#tab === "discover") await this.loadCatalog();
    } catch (error) {
      if (generation !== this.#generation) return;
      const detail = safeMessage(error);
      this.#state = {
        ...this.#state,
        ...resolvedContext ? { context: resolvedContext } : {},
        inventoryAuthoritative: false,
        loading: false,
        error: options.preserveError && this.#state.error ? this.#state.error : detail,
        connection: detail.code === "FORBIDDEN" || detail.code === "ADMIN_FORBIDDEN" ? "forbidden" : "offline"
      };
    }
    this.render();
  }
  async selectTab(tab) {
    if (this.#tab === tab) return;
    this.#tab = tab;
    this.#query = "";
    this.#queryRaw = "";
    this.#state = {
      ...this.#state,
      selectedCatalog: void 0,
      preview: void 0
    };
    this.render();
    if (tab === "discover") await this.loadCatalog();
  }
  async loadCatalog(cursor) {
    if (!this.#api || !this.can("packages.read")) return;
    const generation = ++this.#generation;
    this.#state = { ...this.#state, loading: true, error: void 0 };
    this.render();
    try {
      const page = await this.#api.catalog(this.#query, cursor);
      if (generation !== this.#generation || this.#tab !== "discover") return;
      this.#state = {
        ...this.#state,
        catalog: cursor ? [...this.#state.catalog, ...page.items] : page.items,
        nextCursor: page.nextCursor,
        loading: false,
        connection: "connected"
      };
    } catch (error) {
      if (generation !== this.#generation) return;
      this.#state = {
        ...this.#state,
        loading: false,
        error: safeMessage(error),
        connection: "offline"
      };
    }
    this.render();
  }
  async inspect(source, mode, trigger, packageId) {
    const api = this.effectApi("packages.install");
    if (!api) return { ok: false, error: this.#state.error ?? { code: "ADMIN_UNAVAILABLE", message: "" } };
    try {
      const receipt = packageId ? await this.submitPackage(packageId, () => api.inspect(source)) : await api.inspect(source);
      this.track(receipt.operationId, {
        mode,
        ...packageId ? { packageId } : {}
      });
      this.#confirmTrigger = trigger;
      this.setNoticeKey("notice.inspecting-source", "state");
      return { ok: true };
    } catch (error) {
      this.showError(error);
      return { ok: false, error: safeMessage(error) };
    }
  }
  async confirmPreview() {
    const preview = this.#state.preview;
    if (!preview) return;
    const mode = this.#state.previewMode ?? "install";
    const api = this.effectApi("packages.install");
    if (!api) return;
    const installed = this.#state.installed.find((item) => item.id === preview.id);
    const activeIntegrity = installed ? this.activeIntegrity(installed) : void 0;
    const combined = mode === "update" && !!installed && activeIntegrity !== void 0 && !!preview.capabilityHash && this.supportsCompositeActivation() && this.can("packages.install") && this.can("packages.trust") && this.can("packages.activate");
    const receipt = await this.submitPackage(
      preview.id,
      () => mode === "install" ? api.install(preview.source, preview.integrity) : api.update(
        preview.id,
        preview.source,
        preview.integrity,
        combined && installed && preview.capabilityHash ? {
          expectedInstalledIntegrity: installed.integrity,
          expectedActiveIntegrity: activeIntegrity,
          trust: {
            integrity: preview.integrity,
            capabilityHash: preview.capabilityHash
          }
        } : void 0
      )
    );
    this.track(receipt.operationId, { packageId: preview.id });
    this.#state = {
      ...this.#state,
      preview: void 0,
      previewMode: void 0
    };
    this.setNoticeKey(mode === "install" ? "notice.installing" : "notice.updating", "state");
    this.render();
  }
  setNotice(message, kind) {
    this.#noticeState = { message, kind };
    this.render();
  }
  setNoticeKey(key, kind, vars) {
    this.#noticeState = { message: "", key, ...vars ? { vars } : {}, kind };
    this.render();
  }
  noticeText() {
    return this.#noticeState.key ? this.#t(this.#noticeState.key, this.#noticeState.vars) : this.#noticeState.message;
  }
  openSourceDialog(mode, item, trigger) {
    if (!this.effectApi("packages.install")) return;
    if (item && this.packageBusy(item.id)) return;
    this.#sourceMode = mode;
    this.#sourcePackageId = item?.id;
    this.#sourceTrigger = trigger ?? button("install-source");
    this.#sourceError = void 0;
    this.#sourceProblem = void 0;
    this.#sourceRefValue = "";
    this.syncSourceHint();
    setDialog(this.#sourceDialog, true, this.#sourceDialogFocusTarget());
    this.render();
  }
  sourceTitle() {
    return this.#sourceMode === "update" && this.#sourcePackageId ? this.#t("source.title.update", { id: this.#sourcePackageId }) : this.#t("source.title.inspect");
  }
  sourceIntro() {
    return this.#sourceMode === "update" ? this.#t("source.intro.update") : this.#t("source.intro.install");
  }
  /** React 渲染后 input 由组件持有，首焦点交给表单第一个可交互元素。 */
  #sourceDialogFocusTarget() {
    return this.#sourceDialog.querySelector("select, input, button") ?? void 0;
  }
  /** The field's example follows the selected source type, and a stale complaint about the old one goes. */
  syncSourceHint() {
    const type = this.#sourceTypeValue;
    const format = type in SOURCE_FORMATS ? SOURCE_FORMATS[type] : void 0;
    this.#sourcePlaceholder = format?.example ?? this.#t("source.placeholder.npm");
    this.#sourceError = void 0;
    this.#sourceProblem = void 0;
  }
  #sourcePlaceholder = "npm:scope/package@1.2.3";
  closeSourceDialog() {
    setDialog(this.#sourceDialog, false);
    this.#sourceTrigger?.focus({ preventScroll: true });
  }
  submitSource() {
    if (this.#sourceBusy) return;
    const ref = this.#sourceRefValue.trim();
    const problem = sourceProblem(this.#sourceTypeValue, ref, this.#t);
    const source = problem ? void 0 : sourceFromForm(this.#sourceTypeValue, ref);
    if (!source) {
      this.#sourceProblem = { type: this.#sourceTypeValue, ref };
      this.render();
      return;
    }
    this.#sourceProblem = void 0;
    const mode = this.#sourceMode;
    const packageId = this.#sourcePackageId;
    const trigger = this.#sourceTrigger ?? button("install-source");
    this.#sourceError = void 0;
    this.#sourceBusy = true;
    void this.inspect(source, mode, trigger, packageId).then((result) => {
      if (result.ok) this.closeSourceDialog();
      else this.#sourceError = result.error;
    }).finally(() => {
      this.#sourceBusy = false;
    }).then(() => this.render());
  }
  async operationUpdated(operation) {
    if (!terminal(operation)) return;
    const completion = this.#operationCompletions.get(operation.operationId);
    this.#operationCompletions.delete(operation.operationId);
    const previewMode = this.#operationModes.get(operation.operationId);
    const packageId = operation.packageId ?? this.#operationPackages.get(operation.operationId);
    this.forgetOperation(operation.operationId);
    if (operation.operation === "inspect") {
      if (operation.state === "completed" && operation.preview && previewMode) {
        this.#state = {
          ...this.#state,
          preview: operation.preview,
          previewMode,
          error: void 0
        };
        this.render();
        this.openPreview(operation.preview, previewMode);
        return;
      }
    }
    if (operation.state === "failed") {
      this.#state = {
        ...this.#state,
        lastOperation: operation,
        error: {
          code: operation.error?.code ?? "E_PACKAGE_STATE",
          message: operation.error?.safeMessage ?? "The operation could not be completed.",
          blockers: operation.error?.blockers
        }
      };
    } else if (operation.state === "cancelled") {
      this.#state = {
        ...this.#state,
        lastOperation: operation,
        error: void 0
      };
    } else {
      this.#state = {
        ...this.#state,
        lastOperation: operation,
        error: void 0
      };
    }
    await this.refresh({ preserveError: operation.state === "failed" });
    window.dispatchEvent(new CustomEvent("agnes:packages-changed"));
    if (operation.state === "completed" && packageId) {
      const installed = operation.installed ?? this.#state.installed.find((candidate) => candidate.id === packageId);
      await this.reconcileRuntimeAfterOperation(
        operation,
        packageId,
        installed?.integrity,
        installed === void 0 || hasClientContribution(installed)
      );
    }
    if (operation.state === "completed" && completion) {
      try {
        await completion(operation);
      } catch (error) {
        this.showError(error);
      }
    }
  }
  openPreview(preview, mode) {
    this.#confirmTrigger = this.#sourceTrigger ?? button("install-source");
    const installed = mode === "update" ? this.#state.installed.find((item) => item.id === preview.id) : void 0;
    const combined = !!installed && this.canCombineUpdate(installed, preview);
    this.configureConfirm({
      title: () => `${this.#t(mode === "install" ? "preview.title.install" : "preview.title.update")} · ${preview.id}`,
      description: () => this.#t(
        mode === "install" ? "preview.description.install" : combined ? "preview.description.update-combined" : "preview.description.update-compatible"
      ),
      label: () => this.#t(
        mode === "install" ? "preview.action.install" : combined ? "preview.action.update-activate" : "preview.action.update"
      ),
      facts: combined ? /* @__PURE__ */ jsx(UpdateActivationFacts, { installed, preview }) : /* @__PURE__ */ jsx(PreviewConfirmationFacts, { preview }),
      run: () => this.confirmPreview()
    });
  }
  configureConfirm(pending) {
    this.#pendingConfirm = pending;
    this.#confirmActionDisabled = false;
    this.renderConfirm();
    setDialog(
      this.#confirmDialog,
      true,
      this.#confirmDialog.querySelector("button.primary-button") ?? void 0
    );
  }
  closeConfirm() {
    this.#pendingConfirm = void 0;
    this.renderConfirm();
    setDialog(this.#confirmDialog, false);
    this.#confirmTrigger?.focus({ preventScroll: true });
    this.#confirmTrigger = void 0;
  }
  effectApi(permission) {
    if (!this.#api || !this.#state.context) {
      this.showError({
        code: "ADMIN_UNAVAILABLE",
        message: this.#t("error.session")
      });
      return void 0;
    }
    if (this.#state.context.readOnly) {
      this.showError({
        code: "RECOVERY_READ_ONLY",
        message: this.#t("error.read-only")
      });
      return void 0;
    }
    if (this.#state.loading || this.#state.connection !== "connected") {
      this.showError({
        code: "ADMIN_UNAVAILABLE",
        message: this.#t("error.restoring")
      });
      return void 0;
    }
    if (!this.can(permission)) {
      this.showError({
        code: "ADMIN_FORBIDDEN",
        message: this.#t("error.forbidden")
      });
      return void 0;
    }
    return this.#api;
  }
  can(permission) {
    return !!this.#state.context && hasPermission(this.#state.context.permissions, permission);
  }
  canEffect(permission) {
    return !!this.#state.context && !this.#state.context.readOnly && !this.#state.loading && this.#state.connection === "connected" && this.can(permission);
  }
  supportsCompositeActivation() {
    return hasFeature(this.#state.context, ADMIN_FEATURES.compositeActivation);
  }
  activeIntegrity(item) {
    if (!hasFeature(this.#state.context, ADMIN_FEATURES.runtimeIdentity)) return void 0;
    if (item.actualIntegrity) return item.actualIntegrity;
    if (item.actual === "not-running") return null;
    const runtime = this.runtimeState(item.id);
    if (item.actual === "starting" && isClientOnly(item) && this.actualSlots?.(item.id).length === 0 && (runtime === void 0 || runtime.phase === "idle"))
      return null;
    return void 0;
  }
  canCombineUpdate(item, preview) {
    return this.supportsCompositeActivation() && this.activeIntegrity(item) !== void 0 && !!preview.capabilityHash && this.can("packages.install") && this.can("packages.trust") && this.can("packages.activate");
  }
  packageBusy(packageId) {
    if (this.#submittingPackages.has(packageId)) return true;
    return [...this.#state.operations.values()].some(
      (operation) => !terminal(operation) && (operation.packageId === packageId || this.#operationPackages.get(operation.operationId) === packageId)
    );
  }
  async submitPackage(packageId, submit) {
    if (this.packageBusy(packageId))
      throw new AdminApiError({
        code: "PACKAGE_BUSY",
        message: this.#t("error.busy")
      });
    this.#submittingPackages.add(packageId);
    this.render();
    try {
      return await submit();
    } catch (error) {
      this.#submittingPackages.delete(packageId);
      this.render();
      throw error;
    }
  }
  showError(error) {
    const detail = error && typeof error === "object" && "message" in error ? error : safeMessage(error);
    this.#state = { ...this.#state, error: detail };
    this.render();
  }
  errorMessage(error) {
    const keyByCode = {
      ADMIN_UNAVAILABLE: "error.connection",
      RECOVERY_READ_ONLY: "error.read-only",
      ADMIN_FORBIDDEN: "error.forbidden",
      FORBIDDEN: "error.forbidden",
      PACKAGE_BUSY: "error.busy",
      ADMIN_CONTEXT_INVALID: "error.context-invalid",
      ADMIN_RESPONSE_INVALID: "error.response-invalid",
      RUNTIME_NOT_CONFIRMED: "notice.runtime-pending",
      RUNTIME_IDENTITY_UNKNOWN: "error.runtime-unconfirmed",
      E_PACKAGE_TRUST: "error.capability-unconfirmed",
      E_PACKAGE_STATE: "error.state-changed"
    };
    const key = keyByCode[error.code];
    return key ? this.#t(key) : error.message;
  }
  track(operationId, metadata = {}, completion) {
    const context = this.#state.context;
    if (!context) return;
    if (metadata.mode) this.#operationModes.set(operationId, metadata.mode);
    if (metadata.packageId) this.#operationPackages.set(operationId, metadata.packageId);
    if (completion) this.#operationCompletions.set(operationId, completion);
    this.#detailDismissed = false;
    this.#state = {
      ...this.#state,
      lastOperation: void 0,
      error: void 0
    };
    const records = new Map(this.operationRecords(context).map((entry) => [entry.operationId, entry]));
    records.set(operationId, { operationId, ...metadata });
    sessionStorage.setItem(this.operationStorageKey(context), JSON.stringify([...records.values()]));
    void this.poll(operationId);
  }
  restoreOperations(context) {
    for (const record of this.operationRecords(context)) {
      if (record.mode) this.#operationModes.set(record.operationId, record.mode);
      if (record.packageId) {
        this.#operationPackages.set(record.operationId, record.packageId);
        this.#submittingPackages.add(record.packageId);
      }
      void this.poll(record.operationId);
    }
  }
  async poll(operationId) {
    const api = this.#api;
    if (!api || this.#operationTimers.has(operationId)) return;
    this.#operationTimers.set(operationId, -1);
    try {
      const operation = await api.operation(operationId);
      const packageId = operation.packageId ?? this.#operationPackages.get(operationId);
      if (packageId) this.#submittingPackages.delete(packageId);
      const operations = new Map(this.#state.operations);
      operations.set(operationId, operation);
      this.#state = {
        ...this.#state,
        operations,
        connection: "connected",
        error: void 0
      };
      this.render();
      if (terminal(operation)) {
        await this.operationUpdated(operation);
        return;
      }
      const timer = window.setTimeout(() => {
        this.#operationTimers.delete(operationId);
        void this.poll(operationId);
      }, ACTIVE_REFRESH_MS);
      this.#operationTimers.set(operationId, timer);
    } catch (error) {
      this.#operationTimers.delete(operationId);
      const detail = safeMessage(error);
      this.#state = { ...this.#state, connection: "offline", error: detail };
      this.render();
      if (!["E_ADMIN_AUTH", "E_ADMIN_SCOPE", "E_ADMIN_ORIGIN", "ADMIN_FORBIDDEN", "FORBIDDEN"].includes(
        detail.code
      )) {
        const timer = window.setTimeout(() => {
          this.#operationTimers.delete(operationId);
          void this.poll(operationId);
        }, RECONNECT_REFRESH_MS);
        this.#operationTimers.set(operationId, timer);
      }
    }
  }
  forgetOperation(operationId) {
    const timer = this.#operationTimers.get(operationId);
    if (timer !== void 0 && timer !== -1) clearTimeout(timer);
    this.#operationTimers.delete(operationId);
    const operations = new Map(this.#state.operations);
    operations.delete(operationId);
    this.#state = { ...this.#state, operations };
    const context = this.#state.context;
    if (!context) return;
    this.#operationModes.delete(operationId);
    this.#operationPackages.delete(operationId);
    const next = this.operationRecords(context).filter((value) => value.operationId !== operationId);
    if (next.length) sessionStorage.setItem(this.operationStorageKey(context), JSON.stringify(next));
    else sessionStorage.removeItem(this.operationStorageKey(context));
  }
  operationStorageKey(context) {
    return `${OPERATION_STORAGE_PREFIX}${context.authScope ?? `legacy.${context.clientId}`}:${context.profile}`;
  }
  operationRecords(context) {
    try {
      const stored = JSON.parse(sessionStorage.getItem(this.operationStorageKey(context)) ?? "[]");
      if (!Array.isArray(stored)) return [];
      return stored.flatMap((value) => {
        if (typeof value === "string") return [{ operationId: value }];
        if (!value || typeof value !== "object") return [];
        const record = value;
        if (typeof record.operationId !== "string") return [];
        return [
          {
            operationId: record.operationId,
            ...record.mode === "install" || record.mode === "update" ? { mode: record.mode } : {},
            ...typeof record.packageId === "string" ? { packageId: record.packageId } : {}
          }
        ];
      });
    } catch {
      return [];
    }
  }
  render() {
    const { context, connection, error, loading, tree } = this.#state;
    this.#tabs.installed.disabled = this.#tabs.discover.disabled = !context || !this.can("packages.read");
    this.syncTabs();
    this.#search.placeholder = this.#tab === "installed" ? this.#t("search.installed") : this.#t("search.discover");
    this.#search.setAttribute("aria-label", this.#search.placeholder);
    this.#search.disabled = !context || !this.can("packages.read");
    button("install-source").disabled = !this.canEffect("packages.install");
    this.#recovery.hidden = !context?.readOnly;
    this.#layout.dataset.detail = String(this.hasDetail());
    const connectionNotice = connection === "loading" ? this.#t("connection.loading") : connection === "offline" ? this.#t("connection.offline") : connection === "forbidden" ? this.#t("connection.forbidden") : "";
    const noticeMessage = error ? this.#state.lastOperation ? this.#t("notice.operation-error", {
      operation: operationLabel(this.#state.lastOperation, this.#adminT),
      message: this.errorMessage(error)
    }) : this.errorMessage(error) : this.#state.lastOperation ? this.#t("notice.operation-refreshed", {
      operation: operationLabel(this.#state.lastOperation, this.#adminT)
    }) : this.noticeText() || connectionNotice;
    const noticeKind = error ? "error" : connection === "connected" ? this.#noticeState.kind : "state";
    this.#notice.textContent = noticeMessage;
    this.#notice.dataset.kind = noticeKind;
    const treeText = tree?.desiredDigest && !tree.actual ? tree.failurePhase && !tree.pending ? this.#t("tree.error") : this.#t("tree.loading") : "";
    this.#treeStatus.textContent = treeText;
    this.#treeStatus.hidden = !treeText;
    this.#orphanPinsHost.hidden = this.#orphanPinList.length === 0 && !this.#orphanPinFetchError;
    renderRegion(
      this.#orphanPinsHost,
      /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale, children: /* @__PURE__ */ jsx(
        OrphanPins,
        {
          pins: this.#orphanPinList.map((pin) => ({
            pinId: pin.pinId,
            packageId: pin.packageId,
            version: pin.version,
            purpose: pinPurposeLabel(pin.purpose, this.#t),
            snapshotId: integrityLabel(pin.snapshotId)
          })),
          errors: this.#orphanPinErrors,
          notice: this.#orphanPinNotice === void 0 ? void 0 : this.#t("notice.pin-skipped", { count: this.#orphanPinNotice }),
          fetchError: this.#orphanPinFetchError ? this.#orphanPinFetchError.localize ? this.errorMessage(this.#orphanPinFetchError.detail) : this.#orphanPinFetchError.detail.message : void 0,
          canRelease: this.canEffect("packages.remove") && this.#orphanPinList.length > 0,
          onRelease: (pinIds, trigger) => this.confirmReleasePins(pinIds, trigger)
        }
      ) })
    );
    renderRegion(
      this.#listHost,
      /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale, children: /* @__PURE__ */ jsx(
        PluginList,
        {
          tab: this.#tab,
          rows: this.#tab === "installed" ? this.filteredInstalled() : this.#state.catalog,
          loading,
          inventoryAuthoritative: this.#state.inventoryAuthoritative,
          query: this.#query,
          nextCursor: this.#state.nextCursor,
          surfaceLinksOf: (packageId) => this.surfaceLinks(packageId),
          runtimeOf: (packageId) => asRuntimeView(this.runtimeState(packageId)),
          primaryActionOf: (item) => this.primaryAction(item),
          switchDisabledOf: (installed) => !this.canEffect("packages.activate") || !installed.trusted && (!this.can("packages.trust") || !installed.capabilityHash) || this.packageBusy(installed.id),
          onOpen: (item) => this.selectItem(item),
          onToggleDesired: (item, next) => void (next ? this.confirmEnable(item) : this.confirmDisable(item)),
          onLoadMore: () => void this.loadCatalog(this.#state.nextCursor ?? void 0)
        }
      ) })
    );
    this.#layout.dataset.detail = String(this.hasDetail());
    this.renderDetail();
    this.renderConfirm();
    this.renderSource();
  }
  /** React 键控行会复用 DOM：键盘焦点跟随 data-plugin-id 保留，无需手工恢复。 */
  renderDetail() {
    const item = this.#tab === "installed" ? this.#state.installed.find((candidate) => candidate.id === this.#state.selectedId) : this.#state.selectedCatalog;
    if (!item) {
      if (!this.hasDetail()) {
        setDialog(this.#detail, false);
        renderRegion(this.#detail, /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale }));
        return;
      }
      setDialog(this.#detail, true);
      renderRegion(
        this.#detail,
        /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale, children: /* @__PURE__ */ jsx(
          DetailContent,
          {
            heading: this.#state.operations.size ? this.#t("detail.heading.operations") : this.#t("detail.heading.plugin"),
            intro: this.#state.operations.size ? this.#t("detail.intro.operations") : this.#t("detail.intro.plugin"),
            version: void 0,
            stateText: void 0,
            facts: [],
            blockerSections: [
              {
                title: this.#t("blocker.operation"),
                items: (this.#state.error?.blockers ?? []).map(
                  (blocker) => blockerText(blocker, this.#adminT)
                )
              }
            ],
            operations: this.detailOperations(),
            lastOperationLabel: this.#state.lastOperation ? `${operationLabel(this.#state.lastOperation, this.#adminT)}${this.#state.lastOperation.retryable ? ` · ${this.#t("detail.retry-allowed")}` : ""}` : void 0,
            actions: [],
            onClose: () => this.closeDetail(),
            onCancelOperation: (operationId, trigger) => void this.cancelOperation(operationId, trigger)
          }
        ) })
      );
      return;
    }
    setDialog(this.#detail, true);
    const facts = [
      [this.#t("fact.source"), sourceLabel(item.source, this.#adminT)],
      [this.#t("fact.integrity"), integrityLabel(item.integrity)],
      [this.#t("fact.contribution"), contributionText(item, this.#adminT)]
    ];
    if ("license" in item) facts.push([this.#t("fact.license"), item.license]);
    if ("desired" in item) {
      const actualSlotList = this.actualSlots?.(item.id) ?? [];
      facts.push([
        this.#t("fact.browser-slots"),
        actualSlotList.length ? actualSlotList.join(this.#locale.getSnapshot() === "en" ? ", " : "、") : this.#t("fact.no-browser-slots")
      ]);
      const runtime = this.runtimeState(item.id);
      const failureReason = runtime?.error?.message ?? (item.actual === "running" ? void 0 : item.actualReason);
      if (failureReason) facts.push([this.#t("fact.failure"), failureReason]);
      facts.push([
        this.#t("fact.cleanup"),
        item.cleanupPending ? this.#t("fact.cleanup-pending") : this.#t("fact.cleanup-none")
      ]);
      facts.push([
        this.#t("fact.rollback-target"),
        item.rollbackTarget ? `${item.rollbackTarget.version} · ${integrityLabel(item.rollbackTarget.integrity)}` : this.#t("fact.unavailable")
      ]);
    }
    renderRegion(
      this.#detail,
      /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale, children: /* @__PURE__ */ jsx(
        DetailContent,
        {
          heading: item.id,
          intro: "",
          version: this.#t("version", { version: item.version }),
          stateText: "trusted" in item ? void 0 : this.#t("compatibility", { value: item.compatibility }),
          facts,
          blockerSections: [
            {
              title: this.#t("blocker.current"),
              items: ("blockers" in item ? item.blockers : []).map(
                (blocker) => blockerText(blocker, this.#adminT)
              )
            },
            {
              title: this.#t("blocker.operation"),
              items: (this.#state.error?.blockers ?? []).map((blocker) => blockerText(blocker, this.#adminT))
            }
          ],
          operations: this.detailOperations(item.id),
          lastOperationLabel: void 0,
          actions: this.detailActions(item),
          onClose: () => this.closeDetail(),
          onCancelOperation: (operationId, trigger) => void this.cancelOperation(operationId, trigger)
        }
      ) })
    );
  }
  detailOperations(id) {
    return [...this.#state.operations.values()].filter(
      (operation) => id === void 0 ? true : operation.packageId === id || this.#operationPackages.get(operation.operationId) === id || operation.installed?.id === id || operation.preview?.id === id
    ).map((operation) => ({
      operation,
      canCancel: !terminal(operation) && operation.cancellable === true && hasFeature(this.#state.context, ADMIN_FEATURES.operationControl) && this.canEffect("packages.activate")
    }));
  }
  detailActions(item) {
    const specs = [];
    const busy = this.packageBusy(item.id);
    if ("desired" in item) {
      const installed2 = item;
      const links = this.surfaceLinks(item.id);
      for (const link of links) {
        specs.push({
          label: links.length === 1 ? this.#t("surface.open", { mount: link.mount }) : this.#t("surface.open-named", { surface: link.surfaceId, mount: link.mount }),
          className: "secondary-button compact plugin-surface-link",
          href: link.mount,
          ariaLabel: this.#t("surface.open-aria", {
            id: item.id,
            surface: link.surfaceId,
            mount: link.mount
          }),
          onClick: () => {
          }
        });
      }
      specs.push({
        label: this.#t("action.update-catalog"),
        className: "secondary-button",
        disabled: !this.canEffect("packages.install") || busy,
        onClick: () => void this.chooseUpdateVersion(installed2)
      });
      specs.push({
        label: this.#t("action.update-source"),
        className: "secondary-button",
        disabled: !this.canEffect("packages.install") || busy,
        onClick: () => this.openSourceDialog("update", installed2)
      });
      const target = installed2.rollbackTarget;
      const rollbackReady = !!target && hasFeature(this.#state.context, ADMIN_FEATURES.rollbackTarget) && this.supportsCompositeActivation() && this.activeIntegrity(installed2) !== void 0 && this.canEffect("packages.remove") && this.can("packages.trust") && this.can("packages.activate") && !busy;
      specs.push({
        label: target ? this.#t("action.rollback", { version: target.version }) : this.#t("action.rollback-unknown"),
        className: "secondary-button",
        disabled: !rollbackReady,
        title: rollbackReady ? this.#t("action.rollback-ready") : this.#t("action.rollback-unavailable"),
        onClick: () => this.confirmRollback(installed2)
      });
      specs.push({
        label: this.#t("action.remove"),
        className: "danger-button",
        disabled: !this.canEffect("packages.remove") || installed2.blockers.length > 0 || busy,
        onClick: () => this.confirmRemove(installed2)
      });
      return specs;
    }
    const catalog = item;
    const installed = this.#state.installed.some((candidate) => candidate.id === catalog.id);
    specs.push({
      label: installed ? this.#t("action.check-update") : this.#t("action.check-install-content"),
      className: "primary-button",
      disabled: catalog.compatibility === "unsupported" || !this.canEffect("packages.install") || installed && this.packageBusy(catalog.id),
      onClick: () => void this.inspect(
        catalog.source,
        installed ? "update" : "install",
        button("install-source"),
        installed ? catalog.id : void 0
      )
    });
    return specs;
  }
  filteredInstalled() {
    const query = this.#query.toLocaleLowerCase();
    if (!query) return this.#state.installed;
    return this.#state.installed.filter(
      (item) => `${item.id} ${item.version} ${contributionText(item, this.#adminT)}`.toLocaleLowerCase().includes(query)
    );
  }
  surfaceLinks(packageId) {
    return this.#state.surfaceLinks.filter((surface) => surface.packageId === packageId);
  }
  runtimeState(packageId) {
    const states = [...this.#state.runtime.values()].filter((state) => state.packageId === packageId);
    return states.find((state) => state.phase === "failed") ?? states.at(-1);
  }
  async reconcileRuntimeAfterOperation(operation, packageId, expectedRevision, hasBrowserUi) {
    if (!this.#runtime || !["enable", "disable", "update"].includes(operation.operation)) return;
    if (!hasBrowserUi) return;
    if (!expectedRevision) {
      this.#state = {
        ...this.#state,
        error: {
          code: "RUNTIME_NOT_CONFIRMED",
          message: "The host completed the operation, but the browser UI state is not confirmed yet."
        }
      };
      this.render();
      return;
    }
    try {
      await this.#runtime.invalidate();
    } catch {
      this.#state = {
        ...this.#state,
        error: {
          code: "RUNTIME_NOT_CONFIRMED",
          message: "The host completed the operation, but the browser UI state is not confirmed yet."
        }
      };
      this.render();
      return;
    }
    const deadline = Date.now() + 4e3;
    while (Date.now() < deadline) {
      const states = [...this.#state.runtime.values()].filter((state) => state.packageId === packageId);
      const hasWrongActiveRevision = states.some(
        (state) => state.phase === "active" && state.revision !== expectedRevision
      );
      const matching = states.filter((state) => state.revision === expectedRevision);
      const matchingFailed = matching.some((state) => state.phase === "failed");
      if (matchingFailed) break;
      if (matching.length > 0 && !hasWrongActiveRevision && matching.every(
        (state) => operation.operation === "disable" ? state.phase === "idle" : state.phase === "active"
      ))
        return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    this.#state = {
      ...this.#state,
      error: {
        code: "RUNTIME_NOT_CONFIRMED",
        message: "The host completed the operation, but the browser UI state is not confirmed yet."
      }
    };
    this.render();
  }
  scheduleTreePoll() {
    if (this.#treeTimer !== void 0) window.clearTimeout(this.#treeTimer);
    this.#treeTimer = window.setTimeout(() => {
      this.#treeTimer = void 0;
      void this.pollTree();
    }, ACTIVE_REFRESH_MS);
  }
  #treeTimer;
  async pollTree() {
    const api = this.#api;
    if (!api || this.#state.connection !== "connected") return;
    try {
      const tree = await api.treeList();
      this.#state = { ...this.#state, tree };
      this.render();
    } catch {
    }
    this.scheduleTreePoll();
  }
  primaryAction(item) {
    if (this.#tab === "discover") {
      const catalog = item;
      const installed2 = this.#state.installed.some((candidate) => candidate.id === catalog.id);
      return {
        label: catalog.compatibility === "unsupported" ? this.#t("action.unsupported") : installed2 ? this.#t("action.check-update") : this.#t("action.check-install"),
        disabled: !this.canEffect("packages.install") || catalog.compatibility === "unsupported" || installed2 && this.packageBusy(catalog.id),
        // A catalog entry has no dialog to keep open: a failure already reaches the page notice.
        run: async () => {
          await this.inspect(
            sourceForCatalog(catalog),
            installed2 ? "update" : "install",
            button("install-source"),
            installed2 ? catalog.id : void 0
          );
        }
      };
    }
    const installed = item;
    if (installed.trusted && this.runtimeState(installed.id)?.phase === "failed") {
      return {
        label: this.#t("action.retry-ui"),
        disabled: this.packageBusy(installed.id),
        run: async () => {
          if (!this.#runtime) return;
          try {
            await this.#runtime.invalidate();
          } catch {
            this.#state = {
              ...this.#state,
              error: {
                code: "RUNTIME_NOT_CONFIRMED",
                message: "The browser UI state is not confirmed. You can retry later."
              }
            };
            this.render();
          }
        }
      };
    }
    return installed.actual === "running" ? {
      label: this.#t("action.disable"),
      disabled: !this.canEffect("packages.activate") || this.packageBusy(installed.id),
      run: () => this.confirmDisable(installed)
    } : {
      label: hasFeature(this.#state.context, ADMIN_FEATURES.runtimeIdentity) && this.activeIntegrity(installed) === void 0 ? this.#t("action.runtime-unconfirmed") : this.#t("action.enable"),
      disabled: !this.canEffect("packages.activate") || !installed.trusted && (!this.can("packages.trust") || !installed.capabilityHash) || this.packageBusy(installed.id) || hasFeature(this.#state.context, ADMIN_FEATURES.runtimeIdentity) && this.activeIntegrity(installed) === void 0,
      run: () => this.confirmEnable(installed)
    };
  }
  selectItem(item) {
    this.#detailTrigger = this.#listHost.querySelector(`.plugin-row[data-plugin-id="${CSS.escape(item.id)}"]`) ?? void 0;
    this.#detailDismissed = false;
    if (this.#tab === "installed") {
      this.#state = {
        ...this.#state,
        selectedId: item.id,
        selectedCatalog: void 0
      };
    } else {
      this.#state = {
        ...this.#state,
        selectedCatalog: item,
        selectedId: void 0
      };
    }
    this.render();
  }
  hasDetail() {
    return !!this.#state.selectedId || !!this.#state.selectedCatalog || !this.#detailDismissed && (this.#state.operations.size > 0 || !!this.#state.lastOperation || !!this.#state.error?.blockers?.length);
  }
  closeDetail() {
    const targetId = this.#detailTrigger?.dataset.pluginId;
    this.#detailDismissed = true;
    this.#state = {
      ...this.#state,
      selectedId: void 0,
      selectedCatalog: void 0
    };
    this.#detailTrigger = void 0;
    this.render();
    if (!targetId) return;
    for (const row of this.#listHost.querySelectorAll(".plugin-row")) {
      if (row.dataset.pluginId === targetId) {
        row.focus({ preventScroll: true });
        return;
      }
    }
  }
  async chooseUpdateVersion(item) {
    this.#tab = "discover";
    this.#query = item.id;
    this.#queryRaw = item.id;
    this.#state = {
      ...this.#state,
      selectedCatalog: void 0,
      selectedId: void 0
    };
    this.render();
    await this.loadCatalog();
  }
  confirmEnable(item) {
    if (hasFeature(this.#state.context, ADMIN_FEATURES.runtimeIdentity) && this.activeIntegrity(item) === void 0) {
      this.showError({
        code: "RUNTIME_IDENTITY_UNKNOWN",
        message: "The actual runtime summary has not been confirmed, so this plugin cannot be safely enabled."
      });
      return Promise.resolve();
    }
    const capabilityHash = item.capabilityHash;
    if (!item.trusted && !capabilityHash) {
      this.showError({
        code: "E_PACKAGE_TRUST",
        message: "The capability summary has not been confirmed, so this version cannot be safely enabled."
      });
      return Promise.resolve();
    }
    this.configureConfirm({
      title: () => this.#t("confirm.enable.title", { id: item.id }),
      description: () => this.#t(item.trusted ? "confirm.enable.trusted" : "confirm.enable.verify"),
      label: () => this.#t("confirm.enable.action"),
      facts: !item.trusted ? /* @__PURE__ */ jsx(TrustConfirmationFacts, { item, leadKey: "lead.trust-enable" }) : void 0,
      run: async () => {
        if (item.trusted) {
          await this.#submitEnable(item);
          return;
        }
        const api = this.effectApi("packages.trust");
        if (!api || !this.canEffect("packages.activate") || !capabilityHash) return;
        const receipt = await this.submitPackage(
          item.id,
          () => api.trust(item.id, item.integrity, capabilityHash)
        );
        this.track(receipt.operationId, { packageId: item.id }, async () => {
          const current = this.#state.installed.find((candidate) => candidate.id === item.id);
          if (!current || current.integrity !== item.integrity || current.capabilityHash !== capabilityHash) {
            this.showError({
              code: "E_PACKAGE_STATE",
              message: "The plugin version or capability scope has changed. Review the latest details before enabling it again."
            });
            return;
          }
          await this.#submitEnable(current);
        });
      }
    });
    return Promise.resolve();
  }
  async #submitEnable(item) {
    const api = this.effectApi("packages.activate");
    if (!api) return;
    const activeIntegrity = this.activeIntegrity(item);
    if (hasFeature(this.#state.context, ADMIN_FEATURES.runtimeIdentity) && activeIntegrity === void 0) {
      this.showError({
        code: "RUNTIME_IDENTITY_UNKNOWN",
        message: "The actual runtime summary has not been confirmed, so this plugin cannot be safely enabled."
      });
      return;
    }
    const receipt = await this.submitPackage(
      item.id,
      () => activeIntegrity === void 0 ? api.enable(item.id) : api.enableChecked(item.id, item.integrity, activeIntegrity)
    );
    this.track(receipt.operationId, { packageId: item.id });
  }
  confirmDisable(item) {
    this.configureConfirm({
      title: () => this.#t("confirm.disable.title", { id: item.id }),
      description: () => this.#t("confirm.disable.description"),
      label: () => this.#t("confirm.disable.action"),
      run: async () => {
        const api = this.effectApi("packages.activate");
        if (!api) return;
        const receipt = await this.submitPackage(item.id, () => api.disable(item.id));
        this.track(receipt.operationId, { packageId: item.id });
      }
    });
    return Promise.resolve();
  }
  confirmRemove(item) {
    this.configureConfirm({
      title: () => this.#t("confirm.remove.title", { id: item.id }),
      description: () => this.#t("confirm.remove.description"),
      label: () => this.#t("confirm.remove.action"),
      run: async () => {
        const api = this.effectApi("packages.remove");
        if (!api) return;
        const receipt = await this.submitPackage(item.id, () => api.remove(item.id));
        this.track(receipt.operationId, { packageId: item.id });
      }
    });
  }
  confirmRollback(item) {
    const target = item.rollbackTarget;
    const activeIntegrity = this.activeIntegrity(item);
    if (!target || activeIntegrity === void 0 || !this.supportsCompositeActivation()) return;
    this.configureConfirm({
      title: () => this.#t("confirm.rollback.title", { id: item.id, version: target.version }),
      description: () => this.#t("confirm.rollback.description"),
      label: () => this.#t("confirm.rollback.action"),
      facts: /* @__PURE__ */ jsx(RollbackActivationFacts, { installed: item }),
      run: async () => {
        const api = this.effectApi("packages.remove");
        if (!api || !this.can("packages.trust") || !this.can("packages.activate")) return;
        const receipt = await this.submitPackage(
          item.id,
          () => api.rollback(item.id, target.integrity, {
            expectedInstalledIntegrity: item.integrity,
            expectedActiveIntegrity: activeIntegrity,
            trust: {
              integrity: target.integrity,
              capabilityHash: target.capabilityHash
            }
          })
        );
        this.track(receipt.operationId, { packageId: item.id });
      }
    });
  }
  confirmReleasePins(pinIds, trigger) {
    if (!pinIds.length) return;
    this.#confirmTrigger = trigger;
    this.configureConfirm({
      title: () => pinIds.length === 1 ? this.#t("confirm.release.one", { id: pinIds[0] }) : this.#t("confirm.release.all", { count: pinIds.length }),
      description: () => this.#t("confirm.release.description"),
      label: () => this.#t("confirm.release.action"),
      run: async () => {
        const api = this.effectApi("packages.remove");
        if (!api) return;
        let skipped = 0;
        for (let offset = 0; offset < pinIds.length; offset += PIN_RELEASE_BATCH_SIZE) {
          const chunk = pinIds.slice(offset, offset + PIN_RELEASE_BATCH_SIZE);
          const response = await api.pinsRelease(chunk);
          skipped = this.applyPinReleaseResults(response.results, skipped);
        }
      }
    });
  }
  applyPinReleaseResults(results, skippedSoFar = 0) {
    let skipped = skippedSoFar;
    for (const result of results) {
      if (result.outcome === "failed") {
        this.#orphanPinErrors.set(result.pinId, result.error?.safeMessage ?? this.#t("error.pin-release"));
        continue;
      }
      if (result.outcome === "skipped-no-longer-orphaned") skipped++;
      this.#orphanPinErrors.delete(result.pinId);
      this.#orphanPinList = this.#orphanPinList.filter((pin) => pin.pinId !== result.pinId);
    }
    this.#orphanPinNotice = skipped > 0 ? skipped : void 0;
    this.render();
    return skipped;
  }
  async cancelOperation(operationId, trigger) {
    const api = this.effectApi("packages.activate");
    if (!api) return;
    trigger.disabled = true;
    try {
      const receipt = await api.cancel(operationId);
      this.track(receipt.operationId);
    } catch (error) {
      this.showError(error);
    } finally {
      trigger.disabled = false;
    }
  }
  renderConfirm() {
    const pending = this.#pendingConfirm;
    if (!pending) {
      renderRegion(this.#confirmDialog, /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale }));
      return;
    }
    renderRegion(
      this.#confirmDialog,
      /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale, children: /* @__PURE__ */ jsx(
        ConfirmDialogContent,
        {
          title: typeof pending.title === "function" ? pending.title() : pending.title,
          description: typeof pending.description === "function" ? pending.description() : pending.description,
          facts: pending.facts,
          actionLabel: typeof pending.label === "function" ? pending.label() : pending.label,
          actionDisabled: this.#confirmActionDisabled,
          onAction: () => {
            if (!this.#pendingConfirm) return;
            this.#confirmActionDisabled = true;
            this.renderConfirm();
            void this.#pendingConfirm.run().then(() => this.closeConfirm()).catch((error) => this.showError(error)).finally(() => {
              this.#confirmActionDisabled = false;
              this.renderConfirm();
            });
          },
          onCancel: () => this.closeConfirm()
        }
      ) })
    );
  }
  renderSource() {
    renderRegion(
      this.#sourceDialog,
      /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale, children: /* @__PURE__ */ jsx(
        SourceDialogContent,
        {
          title: this.sourceTitle(),
          intro: this.sourceIntro(),
          typeOptions: SOURCE_TYPE_OPTIONS.map(({ value }) => ({
            value,
            label: this.#adminT(`source.${value}`)
          })),
          type: this.#sourceTypeValue,
          ref_: this.#sourceRefValue,
          placeholder: this.#sourcePlaceholder,
          error: this.#sourceProblem ? sourceProblem(this.#sourceProblem.type, this.#sourceProblem.ref, this.#t) ?? this.#t("source.error.incomplete") : this.#sourceError ? this.errorMessage(this.#sourceError) : "",
          busy: this.#sourceBusy,
          onTypeChange: (type) => {
            this.#sourceTypeValue = type;
            this.syncSourceHint();
            this.render();
          },
          onRefChange: (ref) => {
            this.#sourceRefValue = ref;
          },
          onSubmit: () => this.submitSource(),
          onCancel: () => this.closeSourceDialog()
        }
      ) })
    );
  }
  dispose() {
    this.#runtimeStop?.();
    this.#runtimeStop = void 0;
    this.#localeStop();
    this.#localeCleanup?.();
    if (this.#treeTimer !== void 0) window.clearTimeout(this.#treeTimer);
    for (const timer of this.#operationTimers.values()) {
      if (timer >= 0) window.clearTimeout(timer);
    }
    this.#operationTimers.clear();
    this.#operationCompletions.clear();
    unmountRegion(this.#orphanPinsHost);
    unmountRegion(this.#listHost);
    unmountRegion(this.#detail);
    unmountRegion(this.#sourceDialog);
    unmountRegion(this.#confirmDialog);
  }
};
function mountPluginAdmin(options = {}) {
  const page = new PluginAdminPage(options);
  page.bind();
  const ready = page.start();
  return { ready, reload: () => page.refresh(), dispose: () => page.dispose() };
}

export {
  mountPluginAdmin
};
