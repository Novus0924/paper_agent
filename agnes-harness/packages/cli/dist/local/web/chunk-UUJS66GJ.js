import {
  McpDetailContent,
  RESOURCE_CONTROL_METHODS,
  RESOURCE_DETAIL_LOCALE_NAMESPACE,
  RESOURCE_LIST_LOCALE_NAMESPACE,
  ResourceListContent,
  SkillDetailContent,
  UiLocaleProvider,
  createCatalogTranslator,
  createConfirmController,
  createDocumentLocaleSource,
  createSelectPicker,
  createUiTranslator,
  renderRegion,
  resourceDesiredEnabled,
  resourceDetailLocaleCatalog,
  resourceListLocaleCatalog,
  unmountRegion
} from "./chunk-Q3P2MODL.js";

// ../resource-control-web/src/api.ts
var RESOURCE_ADMIN_API_ROOT = "/admin/resources/api";
var ResourceAdminApiError = class extends Error {
  details;
  constructor(details) {
    super(details.message);
    this.name = "ResourceAdminApiError";
    this.details = details;
  }
};
function safeError(value, fallback = "The resource admin service is temporarily unavailable. Try again later.") {
  if (!value || typeof value !== "object") return { code: "RESOURCE_ADMIN_UNAVAILABLE", message: fallback };
  const error = value;
  return {
    code: typeof error.error?.code === "string" ? error.error.code : "RESOURCE_ADMIN_UNAVAILABLE",
    message: typeof error.error?.message === "string" ? error.error.message : fallback
  };
}
function commandId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return `web-resource-${crypto.randomUUID()}`;
  return `web-resource-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
async function json(response) {
  try {
    return await response.json();
  } catch {
    return void 0;
  }
}
function isContext(value) {
  if (!value || typeof value !== "object") return false;
  const context = value;
  return typeof context.profile === "string" && typeof context.clientId === "string" && Array.isArray(context.permissions) && typeof context.readOnly === "boolean";
}
var ResourceAdminApi = class {
  #fetch;
  #context;
  #workspaceId;
  constructor(context, fetcher = fetch, workspaceId) {
    this.#context = context;
    this.#fetch = fetcher;
    if (workspaceId) this.#workspaceId = workspaceId;
  }
  static async context(fetcher = fetch) {
    const response = await fetcher(`${RESOURCE_ADMIN_API_ROOT}/context`, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
    const body = await json(response);
    if (!response.ok)
      throw new ResourceAdminApiError(
        safeError(body, response.status === 403 ? "You do not have resource admin permission." : void 0)
      );
    if (!isContext(body))
      throw new ResourceAdminApiError({
        code: "RESOURCE_ADMIN_CONTEXT_INVALID",
        message: "The resource admin context is invalid. Reopen the page."
      });
    return body;
  }
  async skills(cursor) {
    return this.#post("skills/list", {
      profile: this.#context.profile,
      kind: "skill",
      ...cursor ? { cursor } : {},
      ...this.#workspaceId ? { workspaceId: this.#workspaceId } : {}
    });
  }
  async skill(resourceId) {
    return this.#post("skills/get", {
      profile: this.#context.profile,
      resourceId
    });
  }
  async refresh(rootKey) {
    return this.#effect("skills/refresh", {
      ...rootKey ? { rootKey } : {},
      ...this.#workspaceId ? { workspaceId: this.#workspaceId } : {}
    });
  }
  async skillRemove(resourceId, expectedRevision) {
    return this.#effect("skills/remove", { resourceId, expectedRevision });
  }
  async skillPriority(resourceId, expectedRevision, expectedPriority, priority) {
    return this.#effect("skills/priority", {
      resourceId,
      expectedRevision,
      expectedPriority,
      priority
    });
  }
  async skillTrust(resourceId, expectedRevision, trust) {
    return this.#effect("skills/trust", {
      resourceId,
      expectedRevision,
      trust
    });
  }
  async skillDesired(resourceId, expectedRevision, state) {
    return this.#effect("skills/desired", {
      resourceId,
      expectedRevision,
      state,
      config: { kind: "none" }
    });
  }
  async operation(operationId) {
    return this.#post("operations/get", {
      profile: this.#context.profile,
      operationId
    });
  }
  async cancel(operationId) {
    return this.#effect("operations/cancel", { operationId });
  }
  async mcp(cursor) {
    return this.#post("mcp/list", {
      profile: this.#context.profile,
      ...cursor ? { cursor } : {}
    });
  }
  async mcpGet(serverId) {
    return this.#post("mcp/get", { profile: this.#context.profile, serverId });
  }
  async mcpStatus(serverId) {
    return this.#post("mcp/status", {
      profile: this.#context.profile,
      serverId
    });
  }
  async mcpTools(serverId, cursor) {
    return this.#post("mcp/tools", {
      profile: this.#context.profile,
      serverId,
      ...cursor ? { cursor } : {}
    });
  }
  async mcpCreate(definition) {
    return this.#effect("mcp/create", { definition });
  }
  async mcpUpdate(serverId, expectedRevision, definition) {
    return this.#effect("mcp/update", {
      serverId,
      expectedRevision,
      definition
    });
  }
  async mcpRemove(serverId, expectedRevision) {
    return this.#effect("mcp/remove", { serverId, expectedRevision });
  }
  async mcpTrust(serverId, expectedRevision, trust) {
    return this.#effect("mcp/trust", { serverId, expectedRevision, trust });
  }
  async mcpTest(serverId, expectedRevision) {
    return this.#effect("mcp/test", { serverId, expectedRevision });
  }
  async mcpEnable(serverId, expectedRevision) {
    return this.#effect("mcp/enable", { serverId, expectedRevision });
  }
  async mcpDisable(serverId, expectedRevision) {
    return this.#effect("mcp/disable", { serverId, expectedRevision });
  }
  async mcpReconnect(serverId, expectedRevision) {
    return this.#effect("mcp/reconnect", { serverId, expectedRevision });
  }
  async #effect(path, params) {
    return this.#post(path, {
      profile: this.#context.profile,
      clientId: this.#context.clientId,
      commandId: commandId(),
      ...params
    });
  }
  async #post(path, body) {
    const fetcher = this.#fetch;
    const response = await fetcher(`${RESOURCE_ADMIN_API_ROOT}/${path}`, {
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
      throw new ResourceAdminApiError(
        safeError(
          result,
          response.status === 403 ? "You do not have permission to perform this operation." : void 0
        )
      );
    return result;
  }
};

// ../resource-control-web/src/locales/shell.ts
var resourceAdminShellLocaleCatalog = {
  en: {
    "confirmation.title": "Confirm action",
    "confirmation.cancel": "Cancel",
    "confirmation.confirm": "Confirm",
    "tab.skills": "Skills",
    "tab.mcp": "MCP",
    "button.refresh": "Refresh Skill catalog",
    "button.create": "Add MCP service",
    "button.return": "Return to workbench",
    "shell.skip": "Skip to resource list",
    "shell.return": "Return to workbench",
    "shell.eyebrow": "Settings",
    "shell.heading": "Skills and MCP",
    "shell.embedded.description": "Review source, trust, and runtime state. Credentials are stored only as SecretRef references.",
    "shell.embedded.add-description": "Want to add MCP? In chat, ask Agnes to connect it and provide the service address or connection details.",
    "shell.document-title": "Skills and MCP · Agnes",
    "shell.tabs.aria": "Resource type",
    "shell.list.aria": "Resource catalog",
    "shell.detail.aria": "Resource details",
    "shell.confirm.kicker": "Confirmation required",
    "shell.dialog.kicker": "Managed connection",
    "shell.dialog.description": "Only managed transports and existing secret:// references are accepted. Secret values are never sent to this page.",
    "shell.form.server-id": "Service ID",
    "shell.form.display-name": "Display name",
    "shell.form.transport": "Transport",
    "shell.form.transport.stdio": "Local stdio",
    "shell.form.transport.http": "HTTPS / local HTTP",
    "shell.form.transport.sse": "SSE (remote, legacy protocol)",
    "shell.form.executable": "Executable",
    "shell.form.args": "Arguments (one per line)",
    "shell.form.url": "HTTPS or local loopback address",
    "shell.form.secret-kind": "Credential method",
    "shell.form.secret-none": "No credentials",
    "shell.form.secret-stdio": "stdio environment variables",
    "shell.form.secret-bearer": "HTTP Bearer",
    "shell.form.secret-header": "HTTP API Key",
    "shell.form.header-name": "HTTP Header",
    "shell.form.secret": "SecretRef / environment mapping",
    "shell.form.tools": "Allowed tools (one per line, optional)",
    "shell.form.cancel": "Cancel",
    "shell.form.submit": "Create and wait for confirmation",
    "shell.form.id-placeholder": "github",
    "shell.form.name-placeholder": "GitHub",
    "shell.form.executable-placeholder": "mcp-github",
    "shell.form.url-placeholder": "https://example.com/mcp",
    "shell.form.secret-placeholder": "secret://namespace/name or TOKEN=secret://namespace/name"
  },
  "zh-CN": {
    "confirmation.title": "确认操作",
    "confirmation.cancel": "取消",
    "confirmation.confirm": "确认",
    "tab.skills": "技能",
    "tab.mcp": "MCP",
    "button.refresh": "刷新 Skill 目录",
    "button.create": "添加 MCP 服务",
    "button.return": "返回工作台",
    "shell.skip": "跳至资源列表",
    "shell.return": "返回工作台",
    "shell.eyebrow": "系统设置",
    "shell.heading": "技能与 MCP",
    "shell.embedded.description": "查看来源、信任和运行状态；凭据只以 SecretRef 引用保存。",
    "shell.embedded.add-description": "想添加 MCP？在聊天中说“帮我接入这个 MCP”，并提供服务地址或连接信息。",
    "shell.document-title": "技能与 MCP · Agnes",
    "shell.tabs.aria": "资源类型",
    "shell.list.aria": "资源目录",
    "shell.detail.aria": "资源详情",
    "shell.confirm.kicker": "需要确认",
    "shell.dialog.kicker": "受控连接",
    "shell.dialog.description": "只可填写受控 transport 和已有 secret:// 引用。密钥值不会进入本页。",
    "shell.form.server-id": "服务 ID",
    "shell.form.display-name": "显示名称",
    "shell.form.transport": "传输",
    "shell.form.transport.stdio": "本地 stdio",
    "shell.form.transport.http": "HTTPS / 本地 HTTP",
    "shell.form.transport.sse": "SSE（远程，旧版协议）",
    "shell.form.executable": "可执行文件",
    "shell.form.args": "参数（每行一个）",
    "shell.form.url": "HTTPS 或本地 loopback 地址",
    "shell.form.secret-kind": "凭据方式",
    "shell.form.secret-none": "无凭据",
    "shell.form.secret-stdio": "stdio 环境变量",
    "shell.form.secret-bearer": "HTTP Bearer",
    "shell.form.secret-header": "HTTP API Key",
    "shell.form.header-name": "HTTP Header",
    "shell.form.secret": "SecretRef / 环境变量映射",
    "shell.form.tools": "允许工具（每行一个，可留空）",
    "shell.form.cancel": "取消",
    "shell.form.submit": "创建并等待确认",
    "shell.form.id-placeholder": "github",
    "shell.form.name-placeholder": "GitHub",
    "shell.form.executable-placeholder": "mcp-github",
    "shell.form.url-placeholder": "https://example.com/mcp",
    "shell.form.secret-placeholder": "secret://namespace/name 或 TOKEN=secret://namespace/name"
  }
};

// ../resource-control-web/src/locales/admin.ts
var RESOURCE_ADMIN_LOCALE_NAMESPACE = "@agnes/resource-control-web/admin";
var resourceAdminLocaleCatalog = {
  en: {
    ...resourceAdminShellLocaleCatalog.en,
    "error.unavailable": "The resource admin service is temporarily unavailable. Try again later.",
    "error.not-connected": "Resource admin is not connected.",
    "error.invalid-transport": "Unrecognized transport: {value}. Refresh the page and try again.",
    "confirmation.description": "{summary}\n\nThe request will be sent to the local host, which checks it against the current version and security policy.",
    "notice.loading": "Reading the local resource catalog…",
    "notice.read-only": "The host is in read-only recovery mode. You can review status, but cannot change resources.",
    "notice.load-more-failed": "Could not read more resources. Try again.",
    "notice.submitted": "Operation submitted. Waiting for the host to confirm…",
    "notice.succeeded": "The control plane has been updated. Idle sessions will use the new snapshot on their next request. Active turns switch after they finish; a successful refresh does not mean every session has switched.",
    "notice.failed": "The operation did not complete. Review the security status.",
    "notice.running": "The operation is still running on the host. Refresh the status later.",
    "notice.changed": "The resource version has changed. Review the latest details before enabling it again.",
    "notice.created": "MCP “{name}” was created but is not available yet. Review its configuration, then enable it.",
    "empty.mcp.title": "No MCP services found",
    "empty.mcp.description": "Add an MCP service to review its connection and enabled state here.",
    "empty.skills.title": "No Skills found",
    "empty.skills.description": "Add a SKILL.md file at one of these template paths and refresh. Only direct child directories are scanned; nested directories and ordinary skills/ folders are not read.",
    "progress.waiting": "Waiting for the host…",
    "progress.running": "Running · {progress}%",
    "progress.delete-uncancellable": "Deletion cannot be cancelled after it starts",
    "progress.cancel-summary": "Cancel resource operation {id}",
    "fact.connection": "Connection",
    "fact.tools": "Tools",
    "fact.observed-revision": "Observed revision",
    "fact.catalog-revision": "Catalog revision",
    "fact.none": "None",
    "fact.updated-at": "Last updated",
    "fact.safe-error": "Security error",
    "action.enable": "Enable",
    "action.disable": "Disable",
    "action.request": "Request {action} {kind} “{name}”\nVersion: {revision}",
    "action.remove-skill.label": "Delete permanently",
    "action.remove-skill.summary": "Permanently delete Skill “{name}” and all its files. This cannot be undone. Another source with the same name may take precedence. Skills in the user directory may also be used by other applications.",
    "action.test-mcp": "Test connection",
    "action.test-mcp-summary": "Test MCP “{name}”\n{revision}\nTesting does not enable the service or call tools.",
    "action.reconnect": "Reconnect",
    "action.reconnect-summary": "Reconnect MCP “{name}”\n{revision}\nIf it fails, the existing active connection is kept.",
    "action.remove-mcp": "Remove",
    "action.remove-mcp-summary": "Remove MCP “{name}”\n{revision}\nThe host blocks removal while the definition is in use or has not been safely retired.",
    "action.refresh-skills": "Refresh the Skill catalog\nThe host rescans controlled roots and keeps the last safe catalog until the new result passes validation.",
    "action.edit-mcp": "Edit {name}",
    "action.create-mcp": "Add MCP service",
    "action.update-mcp-summary": "Update MCP “{name}”\nVersion: {revision}\nThe service must be enabled again after updating.",
    "action.create-mcp-summary": "Create MCP “{name}”\nIt will be saved disabled and can be enabled after review.",
    "action.adjust-priority": "Change the same-name Skill “{name}” priority from {current} to {next}. The enabled state will not change.",
    "error.form.identity": "Enter a service ID and display name.",
    "error.form.executable": "Enter an executable allowed by local policy.",
    "error.form.env-format": "Use TOKEN=secret://namespace/name, with each environment variable listed once.",
    "error.form.env-empty": "Enter at least one environment-variable SecretRef.",
    "error.form.url": "Enter an HTTPS address or a loopback HTTP address allowed by local policy.",
    "error.form.secret": "Enter an existing SecretRef.",
    "validation.url-format": "Enter a complete URL.",
    "validation.url-no-credentials": "The address cannot include a username, password, or #fragment. Use a SecretRef for credentials.",
    "validation.url-no-secret-query": "URL query parameters cannot contain token, secret, password, api-key, or credential. Use a SecretRef for credentials.",
    "validation.url-secure": "Use an https:// URL or a loopback http:// URL without spaces.",
    "validation.executable": "The executable cannot be a shell (sh/bash/zsh/fish/cmd/powershell/pwsh); a bare name cannot contain spaces.",
    "validation.args-limit": "Use at most {count} arguments, one per line.",
    "validation.arg-invalid": "Argument {index} is invalid: it cannot be -c or /c, and cannot be empty.",
    "validation.env-name": "Environment variable {index} needs a valid uppercase name; reserved names such as PATH and HOME are not allowed.",
    "validation.env-ref": "Environment variable {index} must use the form TOKEN=secret://namespace/name.",
    "validation.secret-ref": "Use a SecretRef in the form secret://namespace/name.",
    "validation.tools-limit": "Allow at most {count} tools.",
    "validation.tool-name": "Tool name {index} is invalid. It must start with a letter and contain only letters, numbers, underscores, dots, or hyphens.",
    "validation.tool-duplicate": "The allowed tools contain a duplicate: {name}.",
    "validation.server-id-required": "Enter a service ID.",
    "validation.server-id-format": "Use a service ID that starts with a lowercase letter and contains only lowercase letters, numbers, dots, underscores, or hyphens.",
    "validation.executable-required": "Enter an executable.",
    "validation.url-required": "Enter an HTTPS address or a loopback HTTP address allowed by local policy.",
    "placeholder.env": "TOKEN=secret://namespace/name (one per line)",
    "select.transport": "Transport",
    "select.secret": "Credential method",
    "select.header": "HTTP Header",
    "form.title.create": "Add MCP service",
    "form.title.edit": "Edit {name}",
    "form.action.create": "Create service",
    "form.action.update": "Save changes",
    "tab.label": "Resource type"
  },
  "zh-CN": {
    ...resourceAdminShellLocaleCatalog["zh-CN"],
    "error.unavailable": "资源管理后台暂时不可用，请稍后重试。",
    "error.not-connected": "资源管理尚未连接。",
    "error.invalid-transport": "未识别的传输方式：{value}，请刷新页面后重试。",
    "confirmation.description": "{summary}\n\n确认后将提交到本地后台，并按当前版本和策略完成安全校验。",
    "notice.loading": "正在读取本地资源目录…",
    "notice.read-only": "后台处于只读恢复模式；可以查看状态，不能更改资源。",
    "notice.load-more-failed": "读取更多资源失败，可重试。",
    "notice.submitted": "操作已提交，正在等待后台确认…",
    "notice.succeeded": "控制面已更新。空闲会话的下一次请求会使用新快照；正在进行的回合会等到本回合结束后再切换，刷新成功不等于所有会话已经切换。",
    "notice.failed": "操作未完成，请查看安全状态。",
    "notice.running": "操作仍在后台运行；可稍后刷新状态。",
    "notice.changed": "资源版本已经变化，请确认最新内容后再次启用。",
    "notice.created": "MCP「{name}」已创建，但尚未可用：请检查配置后点击「启用」。",
    "empty.mcp.title": "还没有 MCP 服务",
    "empty.mcp.description": "添加一个 MCP 服务后，可以在这里查看连接和启用状态。",
    "empty.skills.title": "还没有发现 Skill",
    "empty.skills.description": "把 SKILL.md 放到下列模板路径后刷新。只扫描这些根的直属子目录，不会递归，也不会读取普通 skills/ 文件夹。",
    "progress.waiting": "正在等待后台…",
    "progress.running": "正在执行 {progress}%",
    "progress.delete-uncancellable": "永久删除开始后不能取消",
    "progress.cancel-summary": "取消正在执行的资源操作 {id}",
    "fact.connection": "连接",
    "fact.tools": "工具数",
    "fact.observed-revision": "观察版本",
    "fact.catalog-revision": "目录版本",
    "fact.none": "暂无",
    "fact.updated-at": "更新时间",
    "fact.safe-error": "安全错误",
    "action.enable": "启用",
    "action.disable": "停用",
    "action.request": "请求{action} {kind}「{name}」\n版本：{revision}",
    "action.remove-skill.label": "永久删除",
    "action.remove-skill.summary": "永久删除 Skill「{name}」及目录中的全部文件。不可恢复；同名的其他来源可能接替生效。用户目录中的 Skill 可能也被其他应用使用。",
    "action.test-mcp": "测试连接",
    "action.test-mcp-summary": "测试 MCP「{name}」\n{revision}\n测试不会启用服务或调用工具。",
    "action.reconnect": "重连",
    "action.reconnect-summary": "重连 MCP「{name}」\n{revision}\n失败会保留已生效的旧连接。",
    "action.remove-mcp": "移除",
    "action.remove-mcp-summary": "移除 MCP「{name}」\n{revision}\n后台会阻断仍被使用或尚未安全退役的定义。",
    "action.refresh-skills": "刷新 Skill 目录\n后台将重新扫描受控根目录，并保留最近一次安全目录直到新结果通过校验。",
    "action.edit-mcp": "编辑 {name}",
    "action.create-mcp": "添加 MCP 服务",
    "action.update-mcp-summary": "更新 MCP「{name}」\n版本：{revision}\n更新后需要重新启用。",
    "action.create-mcp-summary": "创建 MCP「{name}」\n它将以停用状态保存，可在检查后直接启用。",
    "action.adjust-priority": "调整同名 Skill「{name}」的覆盖优先级：{current} → {next}。不会改变启用状态。",
    "error.form.identity": "请填写服务 ID 和显示名称。",
    "error.form.executable": "请填写受允许的可执行文件。",
    "error.form.env-format": "环境变量格式为 TOKEN=secret://namespace/name，每项只能出现一次。",
    "error.form.env-empty": "请填写至少一个环境变量 SecretRef。",
    "error.form.url": "请填写 HTTPS 地址，或获本地策略允许的 loopback HTTP 地址。",
    "error.form.secret": "请填写已有的 SecretRef。",
    "validation.url-format": "地址格式不正确，请填写完整 URL。",
    "validation.url-no-credentials": "地址不能携带用户名、密码或 #fragment（凭据请用 SecretRef）。",
    "validation.url-no-secret-query": "地址查询参数不能包含 token / secret / password / api-key / credential（凭据请用 SecretRef）。",
    "validation.url-secure": "地址需为 https:// 或 loopback 的 http:// URL，且不含空格。",
    "validation.executable": "可执行文件不能是 shell（sh/bash/zsh/fish/cmd/powershell/pwsh），裸名称不能含空格。",
    "validation.args-limit": "参数最多 {count} 个，每行一个。",
    "validation.arg-invalid": "第 {index} 个参数不合法：不能是 -c 或 /c，也不能为空。",
    "validation.env-name": "第 {index} 项环境变量名不合法：需大写字母开头（不能是 PATH/HOME 等保留名）。",
    "validation.env-ref": "第 {index} 项需形如 TOKEN=secret://namespace/name。",
    "validation.secret-ref": "SecretRef 需形如 secret://namespace/name。",
    "validation.tools-limit": "允许工具最多 {count} 个。",
    "validation.tool-name": "第 {index} 个工具名不合法：需以字母开头，只能含字母、数字、下划线、点、连字符。",
    "validation.tool-duplicate": "允许工具中有重复项：「{name}」。",
    "validation.server-id-required": "请填写服务 ID。",
    "validation.server-id-format": "服务 ID 需以小写字母开头，只能含小写字母、数字、点、下划线、连字符。",
    "validation.executable-required": "请填写可执行文件。",
    "validation.url-required": "请填写 HTTPS 地址，或本地策略允许的 loopback HTTP 地址。",
    "placeholder.env": "TOKEN=secret://namespace/name（每行一个）",
    "select.transport": "传输",
    "select.secret": "凭据方式",
    "select.header": "HTTP Header",
    "form.title.create": "添加 MCP 服务",
    "form.title.edit": "编辑 {name}",
    "form.action.create": "创建服务",
    "form.action.update": "保存修改",
    "tab.label": "资源类型"
  }
};

// ../resource-control-web/src/mcp-form-validation.ts
var englishText = createCatalogTranslator(resourceAdminLocaleCatalog, "en");
var CREATE_PARAMS = RESOURCE_CONTROL_METHODS["_agnes/v1/mcp.servers.create"].params;
function schemaNode(path) {
  let node = CREATE_PARAMS;
  for (const key of path.split(".")) {
    node = node?.$defs?.[key] ?? node?.properties?.[key] ?? (key === "items" ? node?.items : void 0);
    if (!node) throw new Error(`MCP form schema node missing: ${path}`);
  }
  return node;
}
function schemaPattern(path) {
  const source = schemaNode(path).pattern;
  if (!source) throw new Error(`MCP form schema pattern missing: ${path}`);
  return new RegExp(source);
}
function schemaNumber(path, limit) {
  const value = schemaNode(path)[limit];
  if (value === void 0) throw new Error(`MCP form schema limit missing: ${path}.${limit}`);
  return value;
}
var MCP_FORM_PATTERNS = {
  serverId: schemaPattern("ServerId"),
  executable: schemaPattern("McpStdioTransport.executable"),
  arg: schemaPattern("McpStdioTransport.args.items"),
  toolName: schemaPattern("McpToolPolicy.allow.items"),
  secretRef: schemaPattern("SecretRef"),
  envName: schemaPattern("McpEnvName"),
  url: schemaPattern("McpHttpTransport.url")
};
var MCP_FORM_LIMITS = {
  argMaxLength: schemaNumber("McpStdioTransport.args.items", "maxLength"),
  argsMaxItems: schemaNumber("McpStdioTransport.args", "maxItems"),
  toolMaxLength: schemaNumber("McpToolPolicy.allow.items", "maxLength"),
  toolsMaxItems: schemaNumber("McpToolPolicy.allow", "maxItems"),
  urlMaxLength: schemaNumber("McpHttpTransport.url", "maxLength")
};
var URL_CREDENTIAL_QUERY = /(?:token|secret|password|api[_-]?key|credential)/i;
var lines = (value) => value.split("\n").map((line) => line.trim()).filter(Boolean);
function urlIssues(url, t) {
  if (!url) return [];
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return [{ field: "mcp-url", message: t("validation.url-format") }];
  }
  if (parsed.username || parsed.password || parsed.hash)
    return [
      {
        field: "mcp-url",
        message: t("validation.url-no-credentials")
      }
    ];
  if ([...parsed.searchParams.keys()].some((name) => URL_CREDENTIAL_QUERY.test(name)))
    return [
      {
        field: "mcp-url",
        message: t("validation.url-no-secret-query")
      }
    ];
  if (url.length > MCP_FORM_LIMITS.urlMaxLength || !MCP_FORM_PATTERNS.url.test(url))
    return [
      {
        field: "mcp-url",
        message: t("validation.url-secure")
      }
    ];
  return [];
}
function stdioIssues(executable, argsText, t) {
  const issues = [];
  if (executable && !MCP_FORM_PATTERNS.executable.test(executable))
    issues.push({
      field: "mcp-executable",
      message: t("validation.executable")
    });
  const args = lines(argsText);
  if (args.length > MCP_FORM_LIMITS.argsMaxItems)
    issues.push({
      field: "mcp-args",
      message: t("validation.args-limit", { count: MCP_FORM_LIMITS.argsMaxItems })
    });
  const badIndex = args.findIndex(
    (arg) => arg.length > MCP_FORM_LIMITS.argMaxLength || !MCP_FORM_PATTERNS.arg.test(arg)
  );
  if (badIndex >= 0)
    issues.push({
      field: "mcp-args",
      message: t("validation.arg-invalid", { index: badIndex + 1 })
    });
  return issues;
}
function secretIssues(secretKind, secretText, t) {
  if (secretKind === "none") return [];
  if (secretKind === "stdio-env") {
    for (const [index, line] of lines(secretText).entries()) {
      const at = line.indexOf("=");
      const name = at < 1 ? "" : line.slice(0, at);
      const reference = line.slice(at + 1);
      if (!name || !MCP_FORM_PATTERNS.envName.test(name))
        return [
          {
            field: "mcp-secret",
            message: t("validation.env-name", { index: index + 1 })
          }
        ];
      if (!MCP_FORM_PATTERNS.secretRef.test(reference))
        return [
          {
            field: "mcp-secret",
            message: t("validation.env-ref", { index: index + 1 })
          }
        ];
    }
    return [];
  }
  if (secretText && !MCP_FORM_PATTERNS.secretRef.test(secretText))
    return [
      {
        field: "mcp-secret",
        message: t("validation.secret-ref")
      }
    ];
  return [];
}
function toolIssues(toolsText, t) {
  const tools = lines(toolsText);
  if (tools.length > MCP_FORM_LIMITS.toolsMaxItems)
    return [
      {
        field: "mcp-tools",
        message: t("validation.tools-limit", { count: MCP_FORM_LIMITS.toolsMaxItems })
      }
    ];
  const badIndex = tools.findIndex(
    (tool) => tool.length > MCP_FORM_LIMITS.toolMaxLength || !MCP_FORM_PATTERNS.toolName.test(tool)
  );
  if (badIndex >= 0)
    return [
      {
        field: "mcp-tools",
        message: t("validation.tool-name", { index: badIndex + 1 })
      }
    ];
  const duplicated = tools.find((tool, index) => tools.indexOf(tool) !== index);
  if (duplicated)
    return [
      {
        field: "mcp-tools",
        message: t("validation.tool-duplicate", { name: duplicated })
      }
    ];
  return [];
}
function mcpFormIssues(snapshot, options, t = englishText) {
  const issues = [];
  if (!snapshot.serverId) {
    if (options.requireFilled) issues.push({ field: "mcp-id", message: t("validation.server-id-required") });
  } else if (!MCP_FORM_PATTERNS.serverId.test(snapshot.serverId)) {
    issues.push({
      field: "mcp-id",
      message: t("validation.server-id-format")
    });
  }
  if (snapshot.transport === "stdio") {
    if (!snapshot.executable) {
      if (options.requireFilled)
        issues.push({ field: "mcp-executable", message: t("validation.executable-required") });
    }
    issues.push(...stdioIssues(snapshot.executable, snapshot.argsText, t));
  } else if (snapshot.transport === "http" || snapshot.transport === "sse") {
    if (!snapshot.url) {
      if (options.requireFilled)
        issues.push({
          field: "mcp-url",
          message: t("validation.url-required")
        });
    } else issues.push(...urlIssues(snapshot.url, t));
  }
  if (!snapshot.secretText && snapshot.secretKind !== "none" && options.requireFilled)
    issues.push({ field: "mcp-secret", message: t("error.form.secret") });
  else issues.push(...secretIssues(snapshot.secretKind, snapshot.secretText, t));
  issues.push(...toolIssues(snapshot.toolsText, t));
  return issues;
}

// ../resource-control-web/src/mcp-refresh.ts
function watchMcpPanel(options) {
  let timer;
  let active = false;
  let remaining = 0;
  let disposed = false;
  let busy = false;
  const schedule = () => {
    if (disposed || !active || busy || timer || remaining <= 0) return;
    timer = setTimeout(async () => {
      timer = void 0;
      if (disposed || !options.visible() || document.hidden) {
        update();
        return;
      }
      remaining--;
      busy = true;
      try {
        await options.refresh();
      } catch {
      } finally {
        busy = false;
        schedule();
      }
    }, 2e3);
  };
  const update = () => {
    const next = !disposed && options.root.isConnected && !document.hidden && options.visible();
    if (next && !active) remaining = 60;
    active = next;
    if (!active) {
      clearTimeout(timer);
      timer = void 0;
    } else schedule();
  };
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, {
    attributes: true,
    subtree: true,
    attributeFilter: ["hidden", "aria-selected"]
  });
  document.addEventListener("visibilitychange", update);
  const dispose = () => {
    disposed = true;
    clearTimeout(timer);
    observer.disconnect();
    document.removeEventListener("visibilitychange", update);
    window.removeEventListener("pagehide", dispose);
  };
  window.addEventListener("pagehide", dispose);
  update();
  return dispose;
}

// ../resource-control-web/src/skill-copy.ts
var SKILL_LOCATION_HINTS = [
  "<current-workspace>/.agh/skills/<name>/SKILL.md",
  "~/.agh/skills/<name>/SKILL.md",
  "~/.agents/skills/<name>/SKILL.md",
  "~/.claude/skills/<name>/SKILL.md",
  "~/.codex/skills/<name>/SKILL.md"
];
var SKILL_EMPTY_TITLE = "No Skills found";
var SKILL_EMPTY_DESCRIPTION = "Add a SKILL.md file at one of these template paths and refresh. Only direct child directories are scanned; nested directories and ordinary skills/ folders are not read.";
var SKILL_EMPTY_COPY = `${SKILL_EMPTY_TITLE}。${SKILL_EMPTY_DESCRIPTION}
${SKILL_LOCATION_HINTS.join("\n")}`;

// ../resource-control-web/src/admin.tsx
import { jsx } from "react/jsx-runtime";
var $ = (id, tag) => {
  const item = document.getElementById(id);
  if (!item || item.tagName.toLowerCase() !== tag) throw new Error(`missing ${tag}#${id}`);
  return item;
};
var list;
var detail;
var notice;
var dialog;
var form;
var mcpTransport;
var mcpSecretKind;
var mcpPickers = [];
var stopMcpRefresh;
var terminal = /* @__PURE__ */ new Set(["succeeded", "failed", "cancelled"]);
function normalizeWorkspaceId(workspaceId) {
  return workspaceId && /^[a-f0-9]{64}$/.test(workspaceId) ? workspaceId : void 0;
}
var errorOf = (error) => error instanceof ResourceAdminApiError ? error.details : {
  code: "RESOURCE_ADMIN_UNAVAILABLE",
  message: "The resource admin service is temporarily unavailable. Try again later."
};
var McpFormValidationError = class extends Error {
};
var resourceAdminCatalogs = {
  [RESOURCE_ADMIN_LOCALE_NAMESPACE]: resourceAdminLocaleCatalog,
  [RESOURCE_LIST_LOCALE_NAMESPACE]: resourceListLocaleCatalog,
  [RESOURCE_DETAIL_LOCALE_NAMESPACE]: resourceDetailLocaleCatalog
};
var activeResourceText = createUiTranslator(
  void 0,
  RESOURCE_ADMIN_LOCALE_NAMESPACE,
  resourceAdminLocaleCatalog
);
var confirmController;
async function confirmEffect(summary, t = activeResourceText) {
  confirmController ??= createConfirmController();
  return confirmController.ask({
    title: t("confirmation.title"),
    description: t("confirmation.description", { summary }),
    confirmLabel: t("confirmation.confirm")
  });
}
var ResourceAdminPage = class {
  #locale;
  #localeStop;
  #localeCleanup;
  #t;
  #detailT;
  #api;
  #context;
  #tab = "skills";
  #items = [];
  #skillRoots = [];
  #selected;
  #detailTrigger;
  #generation = 0;
  #operations = /* @__PURE__ */ new Map();
  #activeOperation;
  #nextCursor;
  #workspaceId;
  #loadState = "idle";
  #reloadPromise;
  #loadMorePromise;
  #loadedTab;
  #loadedWorkspace;
  #notice = { raw: "", kind: "" };
  constructor(workspaceId, tab = "skills", locale) {
    this.#workspaceId = normalizeWorkspaceId(workspaceId);
    this.#tab = tab;
    if (locale) this.#locale = locale;
    else {
      const documentLocale = createDocumentLocaleSource(resourceAdminCatalogs);
      this.#locale = documentLocale.source;
      this.#localeCleanup = documentLocale.dispose;
    }
    this.#t = createUiTranslator(this.#locale, RESOURCE_ADMIN_LOCALE_NAMESPACE, resourceAdminLocaleCatalog);
    this.#detailT = createUiTranslator(
      this.#locale,
      RESOURCE_DETAIL_LOCALE_NAMESPACE,
      resourceDetailLocaleCatalog
    );
    activeResourceText = this.#t;
    this.#localeStop = this.#locale.subscribe(() => {
      activeResourceText = this.#t;
      syncResourcePickers(this.#t);
      syncTransport(this.#t);
      if (dialog?.open)
        $("mcp-dialog-title", "h2").textContent = editing ? this.#t("form.title.edit", { name: editing.displayName }) : this.#t("form.title.create");
      this.render();
    });
  }
  confirm(summary) {
    return confirmEffect(summary, this.#t);
  }
  showError(error) {
    const value = errorOf(error);
    if (error instanceof ResourceAdminApiError && value.code !== "ADMIN_UNAVAILABLE" && value.code !== "RESOURCE_ADMIN_UNAVAILABLE") {
      this.setRawNotice(value.message, "error");
      return;
    }
    this.setNotice("error.unavailable", "error");
  }
  setNotice(key, kind = "", vars) {
    this.#notice = key ? { key, ...vars ? { vars } : {}, kind } : { raw: "", kind };
    this.render();
  }
  setRawNotice(raw, kind = "") {
    this.#notice = { raw, kind };
    this.render();
  }
  /** Re-scopes to the workbench's current workspace (or clears the scope) and reloads. */
  async setWorkspace(workspaceId) {
    this.#workspaceId = normalizeWorkspaceId(workspaceId);
    await this.#ensureLoaded();
  }
  async sync(scope, options = {}) {
    const nextWorkspace = normalizeWorkspaceId(scope.workspaceId);
    const tabChanged = this.#tab !== scope.tab;
    const workspaceChanged = this.#workspaceId !== nextWorkspace;
    this.#tab = scope.tab;
    this.#workspaceId = nextWorkspace;
    this.#selected = void 0;
    if (tabChanged || workspaceChanged) await this.#ensureLoaded();
    else if (options.refresh) await this.reload();
  }
  async refreshMcpIfChanged() {
    if (this.#tab !== "mcp" || !this.#api || this.#reloadPromise || this.#nextCursor || detail.open || dialog.open)
      return;
    const page = await this.#api.mcp();
    if (this.#tab === "mcp" && !detail.open && !dialog.open && JSON.stringify(page.items) !== JSON.stringify(this.#items))
      await this.reload(true);
  }
  async start() {
    await this.#ensureLoaded();
  }
  async #ensureLoaded() {
    if (this.#loadedTab !== this.#tab || this.#loadedWorkspace !== this.#workspaceId) {
      this.#loadedTab = void 0;
      this.#loadedWorkspace = void 0;
      this.#items = [];
      this.#skillRoots = [];
      this.#nextCursor = void 0;
      this.#loadState = "loading";
      this.render();
    }
    await this.reload();
    if (this.#loadedTab !== this.#tab || this.#loadedWorkspace !== this.#workspaceId) await this.reload();
  }
  async reload(preserveNotice = false) {
    if (this.#reloadPromise) return this.#reloadPromise;
    this.#reloadPromise = this.#reload(preserveNotice).finally(() => {
      this.#reloadPromise = void 0;
      this.render();
    });
    return this.#reloadPromise;
  }
  async #reload(preserveNotice) {
    const generation = ++this.#generation;
    const requestTab = this.#tab;
    const requestWorkspace = this.#workspaceId;
    this.#loadState = "loading";
    this.render();
    if (!preserveNotice) {
      this.setNotice("notice.loading");
    }
    try {
      const context = this.#context ?? await ResourceAdminApi.context();
      this.#context = context;
      this.#api = new ResourceAdminApi(context, fetch, requestWorkspace);
      const result = requestTab === "skills" ? await this.#api.skills() : await this.#api.mcp();
      if (generation !== this.#generation) return;
      if (requestTab !== this.#tab || requestWorkspace !== this.#workspaceId) return;
      this.#items = result.items;
      this.#skillRoots = requestTab === "skills" && "skillRoots" in result ? result.skillRoots ?? [] : [];
      this.#nextCursor = result.nextCursor;
      this.#loadedTab = this.#tab;
      this.#loadedWorkspace = this.#workspaceId;
      this.#loadState = this.#items.length ? "ready" : "empty";
      if (this.#selected !== void 0 && !this.#items.some((item) => item.resourceId === this.#selected))
        this.#selected = void 0;
      if (!preserveNotice) {
        this.setNotice(context.readOnly ? "notice.read-only" : void 0, context.readOnly ? "warning" : "");
      }
      this.render();
    } catch (error) {
      if (generation === this.#generation) {
        this.#loadState = "error";
        this.showError(error);
        this.render();
      }
    }
  }
  api() {
    if (!this.#api) throw new Error(this.#t("error.not-connected"));
    return this.#api;
  }
  writable() {
    return !!this.#context && !this.#context.readOnly;
  }
  select(resourceId, trigger) {
    this.#selected = resourceId;
    this.#detailTrigger = trigger;
    this.render();
  }
  /** 详情是模态框：打开一次即可，重复 render 不能反复 showModal（会抛 InvalidStateError）。 */
  openDetail(label) {
    detail.setAttribute("aria-label", label);
    if (detail.open) return;
    try {
      detail.showModal();
    } catch {
      detail.setAttribute("open", "");
    }
  }
  #closeDetailDialog() {
    if (!detail.open) return;
    try {
      detail.close();
    } catch {
      detail.removeAttribute("open");
    }
  }
  /**
   * 关闭详情并把焦点还给当初打开它的那一行。
   *
   * 不能用当初点击的那个行元素：`render()` 会 `replaceChildren()` 重建整个列表，那个引用
   * 在调用点已经脱离文档（`isConnected === false`），焦点只会落回 body。与插件页一致，
   * 按 `data-resource-id` 在**新**列表里找回对应的行。
   */
  closeDetail() {
    const targetId = this.#detailTrigger?.dataset.resourceId;
    this.#closeDetailDialog();
    this.#selected = void 0;
    this.#detailTrigger = void 0;
    this.render();
    if (!targetId) return;
    for (const row of list.querySelectorAll(".resource-row")) {
      if (row.dataset.resourceId !== targetId) continue;
      row.focus({ preventScroll: true });
      return;
    }
  }
  setTab(tab) {
    if (this.#tab === tab) return;
    this.#tab = tab;
    this.#selected = void 0;
    void this.#ensureLoaded();
  }
  async loadMore() {
    if (!this.#nextCursor || this.#loadMorePromise || this.#reloadPromise) return;
    const cursor = this.#nextCursor;
    const requestTab = this.#tab;
    const requestWorkspace = this.#workspaceId;
    const requestGeneration = this.#generation;
    this.#loadMorePromise = (async () => {
      try {
        const result = requestTab === "skills" ? await this.api().skills(cursor) : await this.api().mcp(cursor);
        if (requestGeneration !== this.#generation || requestTab !== this.#tab || requestWorkspace !== this.#workspaceId)
          return;
        const known = new Set(this.#items.map((item) => item.resourceId));
        this.#items = [...this.#items, ...result.items.filter((item) => !known.has(item.resourceId))];
        this.#nextCursor = result.nextCursor;
        this.#loadState = this.#items.length ? "ready" : "empty";
      } catch (error) {
        this.setNotice("notice.load-more-failed", "error");
        this.showError(error);
      } finally {
        this.#loadMorePromise = void 0;
        this.render();
      }
    })();
    await this.#loadMorePromise;
  }
  async track(receipt) {
    const api = this.api();
    this.#activeOperation = receipt.operationId;
    this.setNotice("notice.submitted");
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const op = await api.operation(receipt.operationId);
      this.#operations.set(op.operationId, op);
      this.render();
      if (terminal.has(op.state)) {
        this.#activeOperation = void 0;
        if (op.state === "succeeded") this.setNotice("notice.succeeded", "success");
        else if (op.lastSafeError?.message) this.setRawNotice(op.lastSafeError.message, "error");
        else this.setNotice("notice.failed", "error");
        await this.reload(true);
        if (this.#loadState === "error") return false;
        return op.state === "succeeded";
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    this.#activeOperation = void 0;
    this.setNotice("notice.running", "warning");
    return false;
  }
  render() {
    notice.textContent = this.#notice.key ? this.#t(this.#notice.key, this.#notice.vars) : this.#notice.raw ?? "";
    notice.dataset.kind = this.#notice.kind;
    const skillTab = $("skills-tab", "button");
    const mcpTab = $("mcp-tab", "button");
    skillTab.setAttribute("aria-selected", String(this.#tab === "skills"));
    mcpTab.setAttribute("aria-selected", String(this.#tab === "mcp"));
    skillTab.tabIndex = this.#tab === "skills" ? 0 : -1;
    mcpTab.tabIndex = this.#tab === "mcp" ? 0 : -1;
    $("skill-refresh", "button").hidden = this.#tab !== "skills";
    const busy = this.#reloadPromise !== void 0 || this.#loadMorePromise !== void 0;
    $("skill-refresh", "button").disabled = !this.writable() || busy;
    $("mcp-create", "button").hidden = true;
    $("mcp-create", "button").disabled = !this.writable() || busy;
    list.dataset.state = this.#loadState;
    list.setAttribute("aria-busy", String(this.#loadState === "loading"));
    renderRegion(
      list,
      /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale, children: /* @__PURE__ */ jsx(
        ResourceListContent,
        {
          tab: this.#tab,
          loadState: this.#loadState,
          items: this.#items,
          skillRoots: this.#skillRoots,
          selectedId: this.#selected,
          nextCursor: this.#nextCursor,
          loadingMore: this.#loadMorePromise !== void 0,
          emptyTitle: this.#t(this.#tab === "skills" ? "empty.skills.title" : "empty.mcp.title"),
          emptyDescription: this.#tab === "skills" ? this.#t("empty.skills.description") : this.#t("empty.mcp.description"),
          emptyHints: this.#tab === "skills" ? SKILL_LOCATION_HINTS : void 0,
          switchDisabled: !this.writable() || this.#activeOperation !== void 0,
          itemNameOf: (item) => this.#itemName(item),
          onOpen: (item) => this.select(item.resourceId, this.#rowOf(item.resourceId)),
          onToggleDesired: (item, next) => void this.toggleDesired(item, next),
          onLoadMore: () => void this.loadMore(),
          onRetry: () => void this.reload()
        }
      ) })
    );
    const selected = this.#items.find((item) => item.resourceId === this.#selected);
    if (!selected) {
      this.#closeDetailDialog();
      renderRegion(detail, /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale }));
      return;
    }
    const operationId = this.#activeOperation;
    let progress;
    if (operationId) {
      const current = this.#operations.get(operationId);
      progress = {
        text: current?.progress === void 0 ? this.#t("progress.waiting") : this.#t("progress.running", { progress: current.progress }),
        canCancel: this.writable() && current?.kind !== "_agnes/v1/skills.remove",
        cancelTitle: current?.kind === "_agnes/v1/skills.remove" ? this.#t("progress.delete-uncancellable") : void 0,
        onCancel: () => void (async () => {
          if (await this.confirm(this.#t("progress.cancel-summary", { id: operationId })))
            await this.track(await this.api().cancel(operationId));
        })().catch((error) => this.showError(error))
      };
    }
    if (selected.kind === "skill") {
      renderRegion(
        detail,
        /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale, children: /* @__PURE__ */ jsx(
          SkillDetailContent,
          {
            skill: selected,
            disabled: !this.writable() || this.#activeOperation !== void 0,
            actions: this.#detailActions(selected),
            progress,
            onAction: (action) => void this.#runAction(action),
            onPrioritySave: (next) => void this.#savePriority(selected, next),
            onClose: () => this.closeDetail()
          }
        ) })
      );
    } else {
      renderRegion(
        detail,
        /* @__PURE__ */ jsx(UiLocaleProvider, { source: this.#locale, children: /* @__PURE__ */ jsx(
          McpDetailContent,
          {
            server: selected,
            disabled: !this.writable(),
            actions: this.#detailActions(selected),
            progress,
            onAction: (action) => void this.#runAction(action),
            onStatus: async () => {
              const value = await this.api().mcpStatus(selected.serverId);
              const panel = [
                [this.#t("fact.connection"), value.connectionState],
                [this.#t("fact.tools"), String(value.toolCount)],
                [this.#t("fact.observed-revision"), value.observedRevision ?? this.#t("fact.none")],
                [this.#t("fact.catalog-revision"), value.catalogRevision ?? this.#t("fact.none")],
                [
                  this.#t("fact.updated-at"),
                  new Date(value.observedAt).toLocaleString(this.#locale.getSnapshot())
                ]
              ];
              if (value.lastSafeError)
                panel.push([
                  this.#t("fact.safe-error"),
                  this.#detailT("safe-error", {
                    code: value.lastSafeError.code,
                    message: value.lastSafeError.message
                  })
                ]);
              return panel;
            },
            onTools: async (cursor) => {
              const result = await this.api().mcpTools(selected.serverId, cursor);
              return {
                names: result.items.map(
                  (tool) => tool.description ? `${tool.name} — ${tool.description}` : tool.name
                ),
                nextCursor: result.nextCursor
              };
            },
            onEdit: () => openMcpDialog(selected),
            onClose: () => this.closeDetail()
          }
        ) })
      );
    }
    this.openDetail(this.#itemName(selected));
  }
  /** 在**新**列表里找回资源行（React 键控行复用 DOM，焦点可精确归还）。 */
  #rowOf(resourceId) {
    return list.querySelector(`.resource-row[data-resource-id="${CSS.escape(resourceId)}"]`) ?? void 0;
  }
  #itemName(item) {
    return item.kind === "skill" ? item.name : item.displayName;
  }
  async toggleDesired(item, next) {
    const kind = item.kind === "skill" ? "Skill" : "MCP";
    const summary = this.#t("action.request", {
      action: this.#t(next ? "action.enable" : "action.disable"),
      kind,
      name: this.#itemName(item),
      revision: `${item.revision.slice(0, 12)}…`
    });
    if (!await this.confirm(summary)) return;
    try {
      await this.#setDesired(item, next);
    } catch (error) {
      this.showError(error);
      this.render();
    }
  }
  async #setDesired(item, next) {
    if (next && item.trust !== "trusted") {
      const trusted = await this.track(
        item.kind === "skill" ? await this.api().skillTrust(item.resourceId, item.revision, "trusted") : await this.api().mcpTrust(item.serverId, item.revision, "trusted")
      );
      if (!trusted) return;
      const current = this.#items.find((candidate) => candidate.resourceId === item.resourceId);
      if (!current || current.revision !== item.revision || current.trust !== "trusted") {
        this.setNotice("notice.changed", "warning");
        return;
      }
      item = current;
    }
    await this.track(
      item.kind === "skill" ? await this.api().skillDesired(item.resourceId, item.revision, next ? "enabled" : "disabled") : next ? await this.api().mcpEnable(item.serverId, item.revision) : await this.api().mcpDisable(item.serverId, item.revision)
    );
  }
  /** 动作规格统一走壳的确认链：确认框 → 提交 → track 轮询。 */
  #detailActions(item) {
    const disabled = !this.writable() || this.#activeOperation !== void 0;
    const specs = [];
    if (item.kind === "skill") {
      const skill = item;
      const removing = skill.lastSafeError?.code === "SKILL_REMOVAL_PENDING";
      const add2 = (label, summary, run, extra) => {
        specs.push({
          label,
          summary,
          run,
          disabled: disabled || removing && label !== this.#t("action.remove-skill.label"),
          ...extra
        });
      };
      add2(
        this.#t(resourceDesiredEnabled(skill) ? "action.disable" : "action.enable"),
        this.#t("action.request", {
          action: this.#t(resourceDesiredEnabled(skill) ? "action.disable" : "action.enable"),
          kind: "Skill",
          name: skill.name,
          revision: `${skill.revision.slice(0, 12)}…`
        }),
        async () => {
          await this.#setDesired(skill, !resourceDesiredEnabled(skill));
          return void 0;
        }
      );
      if (skill.sourceIdentity.scope === "workspace" || skill.sourceIdentity.scope === "user") {
        add2(
          this.#t("action.remove-skill.label"),
          this.#t("action.remove-skill.summary", { name: skill.name }),
          () => this.api().skillRemove(skill.resourceId, skill.revision),
          { className: "danger-button compact" }
        );
      }
      return specs;
    }
    const server = item;
    const revision = `${server.revision.slice(0, 12)}…`;
    const add = (label, summary, run, extra) => {
      specs.push({ label, summary, run, disabled, ...extra });
    };
    add(
      this.#t("action.test-mcp"),
      this.#t("action.test-mcp-summary", { name: server.displayName, revision }),
      () => this.api().mcpTest(server.serverId, server.revision)
    );
    add(
      this.#t(resourceDesiredEnabled(server) ? "action.disable" : "action.enable"),
      this.#t("action.request", {
        action: this.#t(resourceDesiredEnabled(server) ? "action.disable" : "action.enable"),
        kind: "MCP",
        name: server.displayName,
        revision
      }),
      async () => {
        await this.#setDesired(server, !resourceDesiredEnabled(server));
        return void 0;
      }
    );
    add(
      this.#t("action.reconnect"),
      this.#t("action.reconnect-summary", { name: server.displayName, revision }),
      () => this.api().mcpReconnect(server.serverId, server.revision)
    );
    add(
      this.#t("action.remove-mcp"),
      this.#t("action.remove-mcp-summary", { name: server.displayName, revision }),
      () => this.api().mcpRemove(server.serverId, server.revision),
      { className: "danger-button compact" }
    );
    return specs;
  }
  async #runAction(action) {
    try {
      if (await this.confirm(action.summary)) {
        const receipt = await action.run();
        if (receipt) await this.track(receipt);
      }
    } catch (error) {
      this.showError(error);
      this.render();
    }
  }
  async #savePriority(skill, next) {
    if (await this.confirm(
      this.#t("action.adjust-priority", {
        name: skill.name,
        current: skill.priority,
        next
      })
    ))
      await this.track(await this.api().skillPriority(skill.resourceId, skill.revision, skill.priority, next));
  }
  dispose() {
    this.#localeStop();
    this.#localeCleanup?.();
    stopMcpRefresh?.();
    stopMcpRefresh = void 0;
    for (const picker of mcpPickers) picker.destroy();
    mcpPickers = [];
    unmountRegion(list);
    unmountRegion(detail);
  }
};
var editing;
function writeDefinition(definition) {
  $("mcp-id", "input").value = definition.serverId;
  $("mcp-name", "input").value = definition.displayName;
  mcpTransport.value = definition.transport.kind;
  $("mcp-executable", "input").value = definition.transport.kind === "stdio" ? definition.transport.executable : "";
  $("mcp-args", "textarea").value = definition.transport.kind === "stdio" ? definition.transport.args.join("\n") : "";
  $("mcp-url", "input").value = definition.transport.kind === "http" || definition.transport.kind === "sse" ? definition.transport.url : "";
  mcpSecretKind.value = definition.secretBinding.kind;
  $("mcp-secret", "textarea").value = definition.secretBinding.kind === "stdio-env" ? Object.entries(definition.secretBinding.env).map(([name, reference]) => `${name}=${reference}`).join("\n") : definition.secretBinding.kind === "none" ? "" : definition.secretBinding.kind === "oauth" ? definition.secretBinding.staticClientId ?? "" : definition.secretBinding.credentialRef;
  if (definition.secretBinding.kind === "http-header")
    $("mcp-header-name", "select").value = definition.secretBinding.headerName;
  $("mcp-tools", "textarea").value = definition.toolPolicy?.allow?.join("\n") ?? "";
}
function openMcpDialog(server, t = activeResourceText) {
  editing = server;
  form.reset();
  if (server) writeDefinition(server.definition);
  syncTransport(t);
  $("mcp-dialog-title", "h2").textContent = server ? t("form.title.edit", { name: server.displayName }) : t("form.title.create");
  $("mcp-id", "input").disabled = !!server;
  $("mcp-error", "p").textContent = "";
  dialog.showModal();
  $("mcp-name", "input").focus();
}
function syncResourcePickers(t = activeResourceText) {
  for (const picker of mcpPickers) picker.destroy();
  mcpPickers = [
    createSelectPicker(mcpTransport, { label: t("select.transport") }),
    createSelectPicker(mcpSecretKind, { label: t("select.secret") }),
    createSelectPicker($("mcp-header-name", "select"), { label: t("select.header") })
  ];
}
function syncTransport(t = activeResourceText) {
  const stdio = mcpTransport.value === "stdio";
  $("mcp-executable-row", "label").hidden = !stdio;
  $("mcp-args-row", "label").hidden = !stdio;
  $("mcp-url-row", "label").hidden = stdio;
  const allowed = stdio ? ["none", "stdio-env"] : ["none", "http-bearer", "http-header"];
  for (const option of mcpSecretKind.options) option.hidden = !allowed.includes(option.value);
  if (!allowed.includes(mcpSecretKind.value)) mcpSecretKind.value = "none";
  $("mcp-secret-row", "label").hidden = mcpSecretKind.value === "none";
  $("mcp-header-row", "label").hidden = mcpSecretKind.value !== "http-header";
  $("mcp-secret", "textarea").placeholder = mcpSecretKind.value === "stdio-env" ? t("placeholder.env") : "secret://namespace/name";
  for (const picker of mcpPickers) picker.sync();
  syncMcpFieldFeedback();
}
var MCP_FIELD_CONTROLS = [
  ["mcp-id", "input"],
  ["mcp-executable", "input"],
  ["mcp-args", "textarea"],
  ["mcp-url", "input"],
  ["mcp-secret", "textarea"],
  ["mcp-tools", "textarea"]
];
function mcpFormSnapshot() {
  return {
    transport: mcpTransport.value,
    secretKind: mcpSecretKind.value,
    serverId: $("mcp-id", "input").value.trim(),
    executable: $("mcp-executable", "input").value.trim(),
    argsText: $("mcp-args", "textarea").value,
    url: $("mcp-url", "input").value.trim(),
    secretText: $("mcp-secret", "textarea").value.trim(),
    toolsText: $("mcp-tools", "textarea").value
  };
}
function syncMcpFieldFeedback(requireFilled = false, t = activeResourceText) {
  const issues = mcpFormIssues(mcpFormSnapshot(), { requireFilled }, t);
  for (const [id, tag] of MCP_FIELD_CONTROLS) $(id, tag).removeAttribute("aria-invalid");
  for (const issue of issues) {
    const control = MCP_FIELD_CONTROLS.find(([fieldId]) => fieldId === issue.field);
    if (control) $(control[0], control[1]).setAttribute("aria-invalid", "true");
  }
  $("mcp-error", "p").textContent = issues[0]?.message ?? "";
  return issues;
}
function definitionFromForm(t = activeResourceText) {
  const serverId = $("mcp-id", "input").value.trim();
  const displayName = $("mcp-name", "input").value.trim();
  const args = $("mcp-args", "textarea").value.split("\n").map((value) => value.trim()).filter(Boolean);
  const allow = $("mcp-tools", "textarea").value.split("\n").map((value) => value.trim()).filter(Boolean);
  const secretKind = mcpSecretKind.value;
  const secret = $("mcp-secret", "textarea").value.trim();
  if (!serverId || !displayName) throw new McpFormValidationError(t("error.form.identity"));
  if (mcpTransport.value === "stdio") {
    const executable = $("mcp-executable", "input").value.trim();
    if (!executable) throw new McpFormValidationError(t("error.form.executable"));
    const secretBinding2 = secretKind === "none" ? { kind: "none" } : (() => {
      const env = {};
      for (const line of secret.split("\n").map((value) => value.trim()).filter(Boolean)) {
        const at = line.indexOf("=");
        const name = line.slice(0, at);
        const reference = line.slice(at + 1);
        if (at < 1 || !reference || Object.hasOwn(env, name))
          throw new McpFormValidationError(t("error.form.env-format"));
        env[name] = reference;
      }
      if (!Object.keys(env).length) throw new McpFormValidationError(t("error.form.env-empty"));
      return { kind: "stdio-env", env };
    })();
    return {
      serverId,
      displayName,
      transport: { kind: "stdio", executable, args },
      secretBinding: secretBinding2,
      ...allow.length ? { toolPolicy: { allow } } : {}
    };
  }
  const url = $("mcp-url", "input").value.trim();
  if (!url) throw new McpFormValidationError(t("error.form.url"));
  if (secretKind !== "none" && !secret) throw new McpFormValidationError(t("error.form.secret"));
  const secretBinding = secretKind === "none" ? { kind: "none" } : secretKind === "http-bearer" ? { kind: "http-bearer", credentialRef: secret } : {
    kind: "http-header",
    headerName: $("mcp-header-name", "select").value,
    credentialRef: secret
  };
  if (mcpTransport.value === "http") {
    return {
      serverId,
      displayName,
      transport: { kind: "http", url },
      secretBinding,
      ...allow.length ? { toolPolicy: { allow } } : {}
    };
  }
  if (mcpTransport.value === "sse") {
    return {
      serverId,
      displayName,
      transport: { kind: "sse", url },
      secretBinding,
      ...allow.length ? { toolPolicy: { allow } } : {}
    };
  }
  throw new Error(t("error.invalid-transport", { value: mcpTransport.value }));
}
function mountResourceAdmin(options = {}) {
  list = $("resource-list", "section");
  detail = $("resource-detail", "dialog");
  notice = $("resource-notice", "p");
  dialog = $("mcp-dialog", "dialog");
  form = $("mcp-form", "form");
  mcpTransport = $("mcp-transport", "select");
  mcpSecretKind = $("mcp-secret-kind", "select");
  const page = new ResourceAdminPage(options.workspaceId, options.tab, options.locale);
  syncResourcePickers(activeResourceText);
  detail.addEventListener("cancel", (event) => {
    event.preventDefault();
    page.closeDetail();
  });
  detail.addEventListener("click", (event) => {
    if (event.target === detail) page.closeDetail();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  if (!options.embedded) {
    $("skills-tab", "button").addEventListener("click", () => page.setTab("skills"));
    $("mcp-tab", "button").addEventListener("click", () => page.setTab("mcp"));
    for (const [tab, id] of [
      ["skills", "skills-tab"],
      ["mcp", "mcp-tab"]
    ]) {
      $(id, "button").addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = tab === "skills" ? "mcp" : "skills";
        if (event.key === "ArrowRight" || event.key === "ArrowDown")
          next = tab === "skills" ? "mcp" : "skills";
        if (event.key === "Home") next = "skills";
        if (event.key === "End") next = "mcp";
        if (!next) return;
        event.preventDefault();
        page.setTab(next);
        $(next === "skills" ? "skills-tab" : "mcp-tab", "button").focus();
      });
    }
  }
  $("skill-refresh", "button").addEventListener(
    "click",
    () => void (async () => {
      if (await page.confirm(activeResourceText("action.refresh-skills")))
        await page.track(await page.api().refresh());
    })().catch((error) => page.showError(error))
  );
  $("mcp-create", "button").addEventListener("click", () => openMcpDialog(void 0, activeResourceText));
  $("mcp-cancel", "button").addEventListener("click", () => dialog.close());
  mcpTransport.addEventListener("change", () => syncTransport(activeResourceText));
  mcpSecretKind.addEventListener("change", () => syncTransport(activeResourceText));
  form.addEventListener("input", () => syncMcpFieldFeedback());
  form.addEventListener("change", () => syncMcpFieldFeedback());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const error = $("mcp-error", "p");
    error.textContent = "";
    void (async () => {
      if (syncMcpFieldFeedback(true, activeResourceText).length) return;
      const definition = definitionFromForm(activeResourceText);
      const creating = !editing;
      const summary = editing ? activeResourceText("action.update-mcp-summary", {
        name: editing.displayName,
        revision: `${editing.revision.slice(0, 12)}…`
      }) : activeResourceText("action.create-mcp-summary", { name: definition.displayName });
      if (!await page.confirm(summary)) return;
      const receipt = editing ? await page.api().mcpUpdate(editing.serverId, editing.revision, definition) : await page.api().mcpCreate(definition);
      dialog.close();
      editing = void 0;
      await page.track(receipt);
      if (creating && notice.dataset.kind === "success")
        page.setNotice("notice.created", "success", { name: definition.displayName });
    })().catch((cause) => {
      if (dialog.open)
        error.textContent = cause instanceof McpFormValidationError ? cause.message : cause instanceof ResourceAdminApiError && ["ADMIN_UNAVAILABLE", "RESOURCE_ADMIN_UNAVAILABLE"].includes(cause.details.code) ? activeResourceText("error.unavailable") : errorOf(cause).message;
      else page.showError(cause);
    });
  });
  syncTransport(activeResourceText);
  stopMcpRefresh?.();
  stopMcpRefresh = watchMcpPanel({
    root: list,
    visible: () => !list.closest("[hidden]") && document.getElementById("mcp-tab")?.getAttribute("aria-selected") === "true",
    refresh: () => page.refreshMcpIfChanged()
  });
  const ready = page.start();
  return {
    ready,
    reload: () => page.reload(),
    dispose: () => page.dispose(),
    setWorkspace: (id) => page.setWorkspace(id),
    setTab: (tab) => page.setTab(tab),
    sync: (scope, options2) => page.sync(scope, options2)
  };
}

export {
  mountResourceAdmin
};
