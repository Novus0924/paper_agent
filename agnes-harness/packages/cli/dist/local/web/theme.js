"use strict";
(() => {
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

  // src/locale-preference.ts
  var UI_LOCALES = ["en", "zh-CN"];
  var LOCALE_STORAGE_KEY = "agnes-locale";
  function isUiLocale(value) {
    return typeof value === "string" && UI_LOCALES.includes(value);
  }
  function readLocalePreference(storage2) {
    try {
      const raw = storage2.getItem(LOCALE_STORAGE_KEY);
      return isUiLocale(raw) ? raw : "en";
    } catch {
      return "en";
    }
  }
  function applyDocumentLocale(root, locale) {
    root.lang = locale;
  }
  function applyLocaleText(root, translate) {
    for (const node of root.querySelectorAll("[data-i18n]")) {
      const key = node.getAttribute("data-i18n");
      if (!key) continue;
      const value = translate(key);
      if (value !== key) node.textContent = value;
    }
    for (const [marker, attribute] of [
      ["data-i18n-aria", "aria-label"],
      ["data-i18n-placeholder", "placeholder"],
      ["data-i18n-title", "title"]
    ]) {
      for (const node of root.querySelectorAll(`[${marker}]`)) {
        const key = node.getAttribute(marker);
        if (!key) continue;
        const value = translate(key);
        if (value !== key) node.setAttribute(attribute, value);
      }
    }
  }

  // src/locales/index-shell.ts
  var indexShellLocaleCatalog = {
    en: {
      "index-shell.skip": "Skip to main content",
      "index-shell.closeNav": "Close navigation",
      "index-shell.sessionsNav": "Session navigation",
      "index-shell.tabsView": "Session views",
      "index-shell.tabChat": "Conversation",
      "index-shell.tabTrace": "Trace",
      "index-shell.reportProblem": "Report a problem",
      "index-shell.tracePanel": "Run trace",
      "index-shell.rightbarPanel": "Extension panels",
      "index-shell.newSessionKicker": "New session",
      "index-shell.pickWorkspaceTitle": "Choose a workspace",
      "index-shell.pickWorkspaceIntro": "Pick the directory Agnes works in. Existing files are never moved or copied.",
      "index-shell.recentLegend": "Recent workspaces",
      "index-shell.pickFolder": "Choose a folder…",
      "index-shell.checkingPicker": "Checking the system directory picker…",
      "index-shell.manualPath": "Enter a path manually",
      "index-shell.cwdLabel": "Directory path",
      "index-shell.cwdHint": "Enter an absolute path reachable from the machine that runs agnes serve.",
      "index-shell.cancel": "Cancel",
      "index-shell.useWorkspace": "Use this workspace",
      "index-shell.pluginDetailAria": "Plugin details",
      "index-shell.resourceDetailAria": "Resource details",
      "index-shell.sourceKicker": "Pre-install check",
      "index-shell.sourceHeading": "Inspect a plugin from a source",
      "index-shell.sourceIntro": "Inspecting never installs or enables a plugin. Continue with the install only after the integrity summary looks right.",
      "index-shell.sourceTypeLabel": "Source type",
      "index-shell.sourceTypeFile": "Local relative path",
      "index-shell.sourceTypeWorkspace": "Workspace extension",
      "index-shell.sourceTypeGit": "Pinned Git commit",
      "index-shell.sourceRefLabel": "Source reference",
      "index-shell.sourceRefHint": "The source format is validated strictly by the backend; never paste credentials here.",
      "index-shell.sourceSubmit": "Inspect contents",
      "index-shell.confirmKicker": "Confirmation required",
      "index-shell.confirmHeading": "Confirm the action",
      "index-shell.confirmSubmit": "Confirm",
      "index-shell.mcpKicker": "Managed connection",
      "index-shell.mcpHeading": "Add an MCP server",
      "index-shell.mcpIntro": "Only managed transports and existing <code>secret://</code> references are accepted. Secret values never enter this page.",
      "index-shell.mcpIdLabel": "Server ID",
      "index-shell.mcpNameLabel": "Display name",
      "index-shell.mcpTransportLabel": "Transport",
      "index-shell.mcpTransportStdio": "Local stdio",
      "index-shell.mcpTransportHttp": "HTTPS / local HTTP",
      "index-shell.mcpExecutableLabel": "Executable",
      "index-shell.mcpArgsLabel": "Arguments (one per line)",
      "index-shell.mcpUrlLabel": "HTTPS or local loopback address",
      "index-shell.mcpSecretKindLabel": "Credential method",
      "index-shell.mcpSecretNone": "No credentials",
      "index-shell.mcpSecretStdioEnv": "stdio environment variable",
      "index-shell.mcpSecretHttpBearer": "HTTP Bearer",
      "index-shell.mcpSecretHttpHeader": "HTTP API Key",
      "index-shell.mcpSecretMappingLabel": "SecretRef / environment variable mapping",
      "index-shell.mcpToolsLabel": "Allowed tools (one per line, optional)",
      "index-shell.mcpSubmit": "Create and await confirmation"
    },
    "zh-CN": {
      "index-shell.skip": "跳至主要内容",
      "index-shell.closeNav": "关闭导航",
      "index-shell.sessionsNav": "会话导航",
      "index-shell.tabsView": "会话视图",
      "index-shell.tabChat": "对话",
      "index-shell.tabTrace": "轨迹",
      "index-shell.reportProblem": "报告问题",
      "index-shell.tracePanel": "运行轨迹",
      "index-shell.rightbarPanel": "扩展面板",
      "index-shell.newSessionKicker": "新会话",
      "index-shell.pickWorkspaceTitle": "选择工作区",
      "index-shell.pickWorkspaceIntro": "选择 Agnes 执行任务的目录。已有文件不会被移动或复制。",
      "index-shell.recentLegend": "最近工作区",
      "index-shell.pickFolder": "选择文件夹…",
      "index-shell.checkingPicker": "正在检查系统目录选择器…",
      "index-shell.manualPath": "手动输入路径",
      "index-shell.cwdLabel": "目录路径",
      "index-shell.cwdHint": "请输入运行 agnes serve 的机器可访问的绝对目录路径。",
      "index-shell.cancel": "取消",
      "index-shell.useWorkspace": "使用此工作区",
      "index-shell.pluginDetailAria": "插件详情",
      "index-shell.resourceDetailAria": "资源详情",
      "index-shell.sourceKicker": "安装前检查",
      "index-shell.sourceHeading": "从来源检查插件",
      "index-shell.sourceIntro": "检查不会安装或启用插件。确认预览中的完整性摘要后，才能继续安装。",
      "index-shell.sourceTypeLabel": "来源类型",
      "index-shell.sourceTypeFile": "本地相对路径",
      "index-shell.sourceTypeWorkspace": "工作区扩展",
      "index-shell.sourceTypeGit": "固定 Git 提交",
      "index-shell.sourceRefLabel": "来源引用",
      "index-shell.sourceRefHint": "来源格式由后台严格校验；不要在这里粘贴凭据。",
      "index-shell.sourceSubmit": "检查内容",
      "index-shell.confirmKicker": "需要确认",
      "index-shell.confirmHeading": "确认操作",
      "index-shell.confirmSubmit": "确认",
      "index-shell.mcpKicker": "受控连接",
      "index-shell.mcpHeading": "添加 MCP 服务",
      "index-shell.mcpIntro": "只可填写受控 transport 和已有 <code>secret://</code> 引用。密钥值不会进入本页。",
      "index-shell.mcpIdLabel": "服务 ID",
      "index-shell.mcpNameLabel": "显示名称",
      "index-shell.mcpTransportLabel": "传输",
      "index-shell.mcpTransportStdio": "本地 stdio",
      "index-shell.mcpTransportHttp": "HTTPS / 本地 HTTP",
      "index-shell.mcpExecutableLabel": "可执行文件",
      "index-shell.mcpArgsLabel": "参数（每行一个）",
      "index-shell.mcpUrlLabel": "HTTPS 或本地 loopback 地址",
      "index-shell.mcpSecretKindLabel": "凭据方式",
      "index-shell.mcpSecretNone": "无凭据",
      "index-shell.mcpSecretStdioEnv": "stdio 环境变量",
      "index-shell.mcpSecretHttpBearer": "HTTP Bearer",
      "index-shell.mcpSecretHttpHeader": "HTTP API Key",
      "index-shell.mcpSecretMappingLabel": "SecretRef / 环境变量映射",
      "index-shell.mcpToolsLabel": "允许工具（每行一个，可留空）",
      "index-shell.mcpSubmit": "创建并等待确认"
    }
  };

  // src/skin.ts
  var SKIN_STORAGE_KEY = "agnes-skin";
  var SKIN_CACHE_VERSION = 1;
  var SKIN_NONE = "none";
  var SKIN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  function readTokens(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const tokens = {};
    for (const [name, modes] of Object.entries(value)) {
      if (typeof modes !== "object" || modes === null || Array.isArray(modes)) return null;
      const { light, dark } = modes;
      if (typeof light !== "string" || light === "" || typeof dark !== "string" || dark === "") return null;
      tokens[name] = { light, dark };
    }
    return tokens;
  }
  function readSkinCache(storage2) {
    try {
      const raw = storage2.getItem(SKIN_STORAGE_KEY);
      if (raw === null) return null;
      const value = JSON.parse(raw);
      if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
      const record = value;
      if (record.version !== SKIN_CACHE_VERSION) return null;
      if (typeof record.id !== "string" || !SKIN_ID.test(record.id)) return null;
      if (typeof record.revision !== "string" || typeof record.css !== "string") return null;
      const tokens = readTokens(record.tokens);
      if (tokens === null) return null;
      return { version: SKIN_CACHE_VERSION, id: record.id, revision: record.revision, css: record.css, tokens };
    } catch {
      return null;
    }
  }
  function skinOverride(search) {
    let value;
    try {
      value = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("skin");
    } catch {
      return null;
    }
    if (value === null) return null;
    const trimmed = value.trim();
    if (trimmed === SKIN_NONE) return SKIN_NONE;
    return SKIN_ID.test(trimmed) ? trimmed : null;
  }
  function selectedSkin(cache, override2) {
    if (override2 === null) return cache;
    if (override2 === SKIN_NONE) return null;
    return cache !== null && cache.id === override2 ? cache : null;
  }
  function applySkinTokens(root, cache, mode, applied) {
    const wanted = /* @__PURE__ */ new Map();
    if (cache !== null)
      for (const [name, modes] of Object.entries(cache.tokens)) {
        const value = mode === "dark" ? modes.dark : modes.light;
        if (value !== "") wanted.set(name, value);
      }
    for (const name of applied) if (!wanted.has(name)) root.style.removeProperty(name);
    for (const [name, value] of wanted) root.style.setProperty(name, value);
    return new Set(wanted.keys());
  }
  function syncSkinSheet(host, state, css, createSheet) {
    if (css === state.css) return state;
    if (css === "") {
      if (state.sheet !== void 0)
        host.adoptedStyleSheets = host.adoptedStyleSheets.filter((sheet2) => sheet2 !== state.sheet);
      return { sheet: void 0, css: "" };
    }
    const sheet = createSheet();
    sheet.replaceSync(css);
    const kept = state.sheet === void 0 ? [...host.adoptedStyleSheets] : host.adoptedStyleSheets.filter((existing) => existing !== state.sheet);
    host.adoptedStyleSheets = [...kept, sheet];
    return { sheet, css };
  }

  // src/theme.ts
  var THEME_STORAGE_KEY = "agnes-theme";
  var PREFERENCES = ["system", "light", "dark"];
  function isThemePreference(value) {
    return typeof value === "string" && PREFERENCES.includes(value);
  }
  function readThemePreference(storage2) {
    try {
      const raw = storage2.getItem(THEME_STORAGE_KEY);
      return isThemePreference(raw) ? raw : "system";
    } catch {
      return "system";
    }
  }
  function safeThemeStorage(source = globalThis) {
    try {
      const value = source.localStorage;
      const candidate = value;
      const get = candidate?.getItem;
      const set = candidate?.setItem;
      const remove = candidate?.removeItem;
      if (typeof get === "function" && typeof set === "function")
        return {
          getItem: (key) => get.call(candidate, key),
          setItem: (key, value2) => set.call(candidate, key, value2),
          removeItem: typeof remove === "function" ? (key) => remove.call(candidate, key) : () => void 0
        };
    } catch {
    }
    return { getItem: () => null, setItem: () => void 0, removeItem: () => void 0 };
  }
  function resolveTheme(preference, prefersDark) {
    if (preference === "system") return prefersDark ? "dark" : "light";
    return preference;
  }
  var FONT_SCALE_STORAGE_KEY = "agnes-font-scale";
  var FONT_SCALES = ["small", "normal", "large"];
  var FONT_SCALE_PERCENT = {
    small: "87.5%",
    normal: "100%",
    large: "112.5%"
  };
  function isFontScale(value) {
    return typeof value === "string" && FONT_SCALES.includes(value);
  }
  function readFontScale(storage2) {
    try {
      const raw = storage2.getItem(FONT_SCALE_STORAGE_KEY);
      return isFontScale(raw) ? raw : "normal";
    } catch {
      return "normal";
    }
  }
  function applyFontScale(root, scale) {
    root.style.fontSize = FONT_SCALE_PERCENT[scale];
  }
  function applyTheme(root, theme) {
    root.classList.toggle("dark", theme === "dark");
  }
  function systemPrefersDark(target = globalThis) {
    if (typeof target.matchMedia !== "function") return false;
    const query = target.matchMedia("(prefers-color-scheme: dark)");
    return query.matches;
  }
  function watchSystemTheme(target, onChange) {
    if (typeof target.matchMedia !== "function") return () => void 0;
    const query = target.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => onChange();
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }

  // src/theme-boot.ts
  var storage = safeThemeStorage(window);
  var currentLocale = readLocalePreference(storage);
  var override = skinOverride(window.location.search);
  var writtenSkinTokens = /* @__PURE__ */ new Set();
  var skinSheet = { sheet: void 0, css: void 0 };
  var shellLocaleBootScheduled = false;
  function staticShellCatalog() {
    if (document.body?.id === "plugin-admin-page") return pluginAdminShellLocaleCatalog;
    if (document.body?.id === "resource-admin-page") return resourceAdminShellLocaleCatalog;
    if (document.documentElement.dataset.agnesShell === "workbench") return indexShellLocaleCatalog;
    return void 0;
  }
  function paintStaticShell(locale) {
    if (!document.body) {
      if (shellLocaleBootScheduled) return;
      shellLocaleBootScheduled = true;
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          shellLocaleBootScheduled = false;
          paintStaticShell(currentLocale);
        },
        { once: true }
      );
      return;
    }
    const catalog = staticShellCatalog();
    if (!catalog) return;
    applyLocaleText(document, (key) => catalog[locale]?.[key] ?? catalog.en?.[key] ?? key);
  }
  var paintSkin = (mode) => {
    const skin = selectedSkin(readSkinCache(storage), override);
    writtenSkinTokens = applySkinTokens(document.documentElement, skin, mode, writtenSkinTokens);
    if (typeof CSSStyleSheet !== "function" || !("adoptedStyleSheets" in document)) return;
    try {
      skinSheet = syncSkinSheet(document, skinSheet, skin?.css ?? "", () => new CSSStyleSheet());
    } catch {
    }
  };
  var paintLocale = () => {
    applyDocumentLocale(document.documentElement, currentLocale);
    paintStaticShell(currentLocale);
  };
  var paint = () => {
    const mode = resolveTheme(readThemePreference(storage), systemPrefersDark(window));
    applyTheme(document.documentElement, mode);
    applyFontScale(document.documentElement, readFontScale(storage));
    paintLocale();
    paintSkin(mode);
  };
  paint();
  watchSystemTheme(window, paint);
  window.addEventListener("storage", (event) => {
    if (event.key === LOCALE_STORAGE_KEY) {
      currentLocale = readLocalePreference(storage);
      paintLocale();
      return;
    }
    if (event.key !== THEME_STORAGE_KEY && event.key !== SKIN_STORAGE_KEY) return;
    paint();
  });
  window.addEventListener("agnes:theme-changed", paint);
  window.addEventListener("agnes:locale-changed", (event) => {
    const next = event.detail;
    if (!isUiLocale(next)) return;
    currentLocale = next;
    paintLocale();
  });
})();
