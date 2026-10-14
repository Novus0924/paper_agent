import * as __agnesSharedReact from 'react'; var require = (id) => { if (id === 'react') return __agnesSharedReact; throw Error('Unexpected external require: ' + id) };
import {
  Service
} from "./chunk-AY36XEMZ.js";
import "./chunk-PQXTPSN4.js";

// ../web-slots/src/index.ts
var WEB_ROW_PREFIX = "web:";
function isWebRowId(id) {
  return id.startsWith(WEB_ROW_PREFIX) && id.length > WEB_ROW_PREFIX.length;
}
function webRowId(packageId) {
  if (!packageId || packageId.includes(":")) {
    throw new Error(`invalid package id for web row: ${packageId}`);
  }
  return `${WEB_ROW_PREFIX}${packageId}`;
}
function packageIdFromWebRowId(id) {
  return isWebRowId(id) ? id.slice(WEB_ROW_PREFIX.length) : void 0;
}
function defineStore(spec) {
  if (spec.create) return { create: spec.create };
  return {
    create() {
      let state = spec.initial;
      const listeners = /* @__PURE__ */ new Set();
      const set = (next) => {
        state = typeof next === "function" ? next(state) : next;
        for (const listener of [...listeners]) listener();
      };
      const get = () => state;
      const actions = spec.actions?.(set, get) ?? {};
      return {
        getSnapshot: get,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        actions,
        destroy() {
          listeners.clear();
        }
      };
    }
  };
}
var NO_ENTRIES = Object.freeze([]);
var SlotCore = class {
  sequence = 0;
  records = /* @__PURE__ */ new Map();
  mutateListeners = /* @__PURE__ */ new Set();
  entryErrorListeners = /* @__PURE__ */ new Set();
  storeScopes = /* @__PURE__ */ new Map();
  storeInstances = /* @__PURE__ */ new Map();
  abdicated = /* @__PURE__ */ new WeakSet();
  dirty = /* @__PURE__ */ new Set();
  flushScheduled = false;
  declare(name, spec, declaredBy, parent) {
    const record = this.record(name);
    if (record.spec) {
      throw new Error(`slot "${name}" is already declared (by ${record.declaredBy ?? "an unknown entry"})`);
    }
    record.spec = { ...spec };
    record.declaredBy = declaredBy;
    record.parent = parent;
    record.declarationEpoch += 1;
    this.markDirty(name, record);
    this.notifyDeclaration(record);
  }
  register(options, component) {
    const record = this.records.get(options.name);
    if (!record?.spec) {
      throw new Error(
        `slot "${options.name}" is not declared (a parent entry's children table must declare it)`
      );
    }
    const spec = record.spec;
    const priority = options.priority ?? 0;
    this.validateKind(options, spec, record.entries, priority);
    if (options.children) {
      for (const childName of Object.keys(options.children)) {
        const child = this.records.get(childName);
        if (child?.spec) {
          throw new Error(
            `slot "${childName}" is already declared (by ${child.declaredBy ?? "an unknown entry"})`
          );
        }
      }
    }
    this.pinStore(options.store, spec.scope);
    const sequence = ++this.sequence;
    const entry = {
      key: `${options.name}#${sequence}`,
      name: options.name,
      component,
      ...options.id === void 0 ? {} : { id: options.id },
      order: options.order ?? sequence,
      ...options.label === void 0 ? {} : { label: options.label },
      priority,
      options: {
        ...options.key === void 0 ? {} : { key: options.key },
        ...options.id === void 0 ? {} : { id: options.id },
        ...options.order === void 0 ? {} : { order: options.order },
        ...options.label === void 0 ? {} : { label: options.label },
        ...options.priority === void 0 ? {} : { priority: options.priority }
      },
      ...options.select === void 0 ? {} : { select: options.select },
      ...options.inject === void 0 ? {} : { inject: options.inject },
      ...options.children === void 0 ? {} : { children: options.children },
      ...options.store === void 0 ? {} : { store: options.store },
      ...options.locale === void 0 ? {} : { locale: options.locale },
      ...options.registrant === void 0 ? {} : { registrant: options.registrant },
      ...options.owner === void 0 ? {} : { owner: options.owner }
    };
    const next = [...record.entries, entry];
    next.sort((left, right) => {
      const byPriority = (left.options.priority ?? 0) - (right.options.priority ?? 0);
      if (byPriority !== 0) return byPriority;
      if (spec.kind === "list") return (left.options.order ?? 0) - (right.options.order ?? 0);
      return 0;
    });
    record.entries = next;
    this.markDirty(options.name, record);
    if (options.children) {
      const children = Object.entries(options.children);
      for (const [childName, childSpec] of children) {
        const child = this.record(childName);
        child.spec = { ...childSpec };
        child.declaredBy = `an entry in "${options.name}"${options.registrant ? ` (${options.registrant})` : ""}`;
        child.parent = options.name;
        child.declarationEpoch += 1;
      }
      for (const [childName] of children) {
        const child = this.record(childName);
        this.markDirty(childName, child);
        this.notifyDeclaration(child);
      }
    }
    let live = true;
    return () => {
      if (!live) return;
      live = false;
      if (!record.entries.includes(entry)) return;
      record.entries = record.entries.filter((candidate) => candidate !== entry);
      this.markDirty(options.name, record);
      this.releaseStore(options.store);
      this.releaseEntryStores(entry);
      this.collapseChildren(entry);
    };
  }
  entries(name) {
    return this.records.get(name)?.entries ?? NO_ENTRIES;
  }
  /** Returns the currently renderable entry per cell (or every chain entry). */
  entriesOfSlot(name) {
    const record = this.records.get(name);
    if (!record?.spec) return NO_ENTRIES;
    if (record.spec.kind === "chain") {
      return record.entries.filter((entry) => !this.abdicated.has(entry));
    }
    const selected = [];
    const cells = /* @__PURE__ */ new Set();
    for (const entry of record.entries) {
      if (this.abdicated.has(entry)) continue;
      const cell = record.spec.kind === "keyed" ? entry.options.key : record.spec.kind === "list" ? entry.options.id : void 0;
      if (cells.has(cell)) continue;
      cells.add(cell);
      selected.push(entry);
    }
    return selected;
  }
  /**
   * Runtime truth for diagnostics: all currently live registrations owned by
   * one package, including the slot name they actually reached.  This is not a
   * manifest projection, so a declared-but-never-registered slot is absent.
   */
  entriesByOwner(owner) {
    const entries = [];
    for (const record of this.records.values()) {
      for (const entry of record.entries) if (entry.owner === owner) entries.push(entry);
    }
    return entries;
  }
  /**
   * Elect one chain entry.  Selectors are tried in the already stable priority
   * order; nullish results decline, while selector failures are isolated and
   * treated as a decline.  The failed selector is intentionally not abdicated:
   * abdication is a render-error decision made by the outlet.
   */
  selectChain(name, owner, onError) {
    const record = this.records.get(name);
    if (record?.spec?.kind !== "chain") return void 0;
    for (const entry of record.entries) {
      if (this.abdicated.has(entry) || !entry.select) continue;
      try {
        const value = entry.select(owner);
        if (value !== null && value !== void 0) return { entry, value };
      } catch (error) {
        onError?.(entry, error);
        console.warn(`[web-slots] chain selector declined ${name}:`, error);
      }
    }
    return void 0;
  }
  isAbdicated(entry) {
    return this.abdicated.has(entry);
  }
  spec(name) {
    return this.records.get(name)?.spec;
  }
  declarationEpoch(name) {
    return this.records.get(name)?.declarationEpoch ?? 0;
  }
  getVersion(name) {
    return this.records.get(name)?.version ?? 0;
  }
  isLive(entry) {
    for (const record of this.records.values()) {
      if (record.entries.includes(entry)) return true;
    }
    return false;
  }
  /** Remove every contribution owned by a package during roster withdrawal. */
  removeOwner(owner) {
    for (const [name, record] of this.records) {
      const doomed = record.entries.filter((entry) => entry.owner === owner);
      if (doomed.length === 0) continue;
      record.entries = record.entries.filter((entry) => entry.owner !== owner);
      this.markDirty(name, record);
      for (const entry of doomed) {
        this.releaseStore(entry.store);
        this.releaseEntryStores(entry);
        this.collapseChildren(entry);
      }
    }
  }
  /** Remove one registration by its opaque key; retained for legacy callers. */
  remove(key) {
    for (const [name, record] of this.records) {
      const entry = record.entries.find((candidate) => candidate.key === key);
      if (!entry) continue;
      record.entries = record.entries.filter((candidate) => candidate !== entry);
      this.markDirty(name, record);
      this.releaseStore(entry.store);
      this.releaseEntryStores(entry);
      this.collapseChildren(entry);
      return;
    }
  }
  subscribe(name, listener) {
    const record = this.record(name);
    record.listeners.add(listener);
    return () => record.listeners.delete(listener);
  }
  subscribeDeclaration(name, listener) {
    const record = this.record(name);
    record.declarationListeners.add(listener);
    return () => record.declarationListeners.delete(listener);
  }
  /** Register a declaration-aware contribution before the slot exists. */
  inject(name, factory) {
    let cleanup;
    let active = true;
    const run = () => {
      if (!active || !this.spec(name)) return;
      try {
        cleanup = normalizeDisposer(factory());
      } catch (error) {
        this.reportInjectionError(name, error);
      }
    };
    const stop = this.subscribeDeclaration(name, () => {
      if (!this.spec(name)) {
        cleanup?.();
        cleanup = void 0;
      } else {
        cleanup?.();
        run();
      }
    });
    if (this.spec(name)) run();
    return () => {
      active = false;
      stop();
      cleanup?.();
      cleanup = void 0;
    };
  }
  reportEntryError(name, entry, error, info = { abdicate: true }) {
    if (info.abdicate) {
      if (this.abdicated.has(entry)) return;
      this.abdicated.add(entry);
      const record = this.records.get(name);
      if (record) this.markDirty(name, record);
    }
    for (const listener of [...this.entryErrorListeners]) {
      listener(name, entry, error, { abdicated: info.abdicate });
    }
  }
  onEntryError(listener) {
    this.entryErrorListeners.add(listener);
    return () => this.entryErrorListeners.delete(listener);
  }
  onMutate(listener) {
    this.mutateListeners.add(listener);
    return () => this.mutateListeners.delete(listener);
  }
  /** Lazily materialize a registered store seat for one scope identity. */
  acquireStore(entry, scopeKey = "root") {
    const declaration = entry.store;
    if (!declaration || !this.isLive(entry)) return void 0;
    let instances = this.storeInstances.get(entry);
    if (!instances) {
      instances = /* @__PURE__ */ new Map();
      this.storeInstances.set(entry, instances);
    }
    const current = instances.get(scopeKey);
    if (current) return current;
    const instance = typeof declaration === "function" ? declaration(scopeKey) : declaration.create(scopeKey);
    instances.set(scopeKey, instance);
    return instance;
  }
  /** Drop all per-session store seats for an unloaded scope. */
  pruneStoreScope(scopeKey) {
    for (const [entry, instances] of this.storeInstances) {
      const instance = instances.get(scopeKey);
      if (!instance) continue;
      instance.destroy?.();
      instances.delete(scopeKey);
      if (instances.size === 0 || !this.isLive(entry)) this.storeInstances.delete(entry);
    }
  }
  /** Drop only session-aware seats; root-scoped stores survive a session switch. */
  pruneSessionScope(scopeKey) {
    for (const [entry, instances] of this.storeInstances) {
      if (this.records.get(entry.name)?.spec?.scope === "root") continue;
      const instance = instances.get(scopeKey);
      if (!instance) continue;
      instance.destroy?.();
      instances.delete(scopeKey);
      if (instances.size === 0 || !this.isLive(entry)) this.storeInstances.delete(entry);
    }
  }
  snapshot(root) {
    const build = (name, seen) => {
      const record = this.records.get(name);
      if (!record?.spec || seen.has(name)) return void 0;
      const branch = new Set(seen);
      branch.add(name);
      const active = new Set(this.entriesOfSlot(name));
      const children = [...this.records].filter(([, child]) => child.spec && child.parent === name).flatMap(([childName]) => {
        const node = build(childName, branch);
        return node ? [node] : [];
      });
      return {
        name,
        kind: record.spec.kind,
        scope: record.spec.scope,
        ...record.declaredBy === void 0 ? {} : { declaredBy: record.declaredBy },
        occupants: record.entries.map((entry) => ({
          ...entry.registrant === void 0 ? {} : { registrant: entry.registrant },
          ...entry.options.key === void 0 ? {} : { key: entry.options.key },
          ...entry.options.id === void 0 ? {} : { id: entry.options.id },
          ...entry.options.order === void 0 ? {} : { order: entry.options.order },
          priority: entry.options.priority ?? 0,
          active: active.has(entry)
        })),
        children
      };
    };
    if (root !== void 0) {
      const node = build(root, /* @__PURE__ */ new Set());
      return node ? [node] : [];
    }
    return [...this.records].filter(
      ([, record]) => record.spec && (record.parent === void 0 || !this.records.get(record.parent)?.spec)
    ).flatMap(([name]) => {
      const node = build(name, /* @__PURE__ */ new Set());
      return node ? [node] : [];
    });
  }
  validateKind(options, spec, entries, priority) {
    if (spec.kind === "keyed" && options.key === void 0) {
      throw new Error(`keyed slot "${options.name}" requires options.key`);
    }
    if (spec.kind === "list" && options.id === void 0) {
      throw new Error(`list slot "${options.name}" requires options.id`);
    }
    if (spec.kind === "chain" && options.select === void 0) {
      throw new Error(`chain slot "${options.name}" requires options.select`);
    }
    if (spec.kind === "chain") return;
    const same = entries.find((entry) => {
      if ((entry.options.priority ?? 0) !== priority) return false;
      if (spec.kind === "single") return true;
      return spec.kind === "keyed" ? entry.options.key === options.key : entry.options.id === options.id;
    });
    if (!same) return;
    const cell = spec.kind === "single" ? "" : ` for ${spec.kind === "keyed" ? `key "${options.key}"` : `id "${options.id}"`}`;
    throw new Error(`${spec.kind} slot "${options.name}" already has an entry${cell} at priority ${priority}`);
  }
  collapseChildren(entry) {
    for (const childName of Object.keys(entry.children ?? {})) {
      const child = this.records.get(childName);
      if (!child?.spec) continue;
      const doomed = child.entries;
      child.spec = void 0;
      child.declaredBy = void 0;
      child.parent = void 0;
      child.entries = NO_ENTRIES;
      child.declarationEpoch += 1;
      this.markDirty(childName, child);
      this.notifyDeclaration(child);
      for (const dead of doomed) {
        this.releaseStore(dead.store);
        this.releaseEntryStores(dead);
        this.collapseChildren(dead);
      }
    }
  }
  pinStore(store, scope) {
    if (store === void 0) return;
    const key = store;
    const current = this.storeScopes.get(key);
    if (current && current.scope !== scope) {
      throw new Error(
        `store handle mounted under scope "${current.scope}" cannot mount under scope "${scope}" (one handle, one scope)`
      );
    }
    if (current) current.count += 1;
    else this.storeScopes.set(key, { scope, count: 1 });
  }
  releaseStore(store) {
    if (store === void 0) return;
    const key = store;
    const current = this.storeScopes.get(key);
    if (!current) return;
    current.count -= 1;
    if (current.count <= 0) this.storeScopes.delete(key);
  }
  releaseEntryStores(entry) {
    const instances = this.storeInstances.get(entry);
    if (!instances) return;
    for (const instance of instances.values()) instance.destroy?.();
    this.storeInstances.delete(entry);
  }
  reportInjectionError(name, error) {
    console.warn(`[web-slots] injection failed for ${name}:`, error);
  }
  record(name) {
    let record = this.records.get(name);
    if (!record) {
      record = {
        spec: void 0,
        declaredBy: void 0,
        parent: void 0,
        declarationEpoch: 0,
        entries: NO_ENTRIES,
        version: 0,
        listeners: /* @__PURE__ */ new Set(),
        declarationListeners: /* @__PURE__ */ new Set()
      };
      this.records.set(name, record);
    }
    return record;
  }
  markDirty(name, record) {
    record.version += 1;
    for (const listener of [...this.mutateListeners]) listener(name);
    this.dirty.add(record);
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    queueMicrotask(() => this.flush());
  }
  notifyDeclaration(record) {
    for (const listener of [...record.declarationListeners]) listener();
  }
  flush() {
    this.flushScheduled = false;
    const dirty = [...this.dirty];
    this.dirty.clear();
    for (const record of dirty) {
      for (const listener of [...record.listeners]) listener();
    }
  }
};
function normalizeDisposer(value) {
  if (typeof value === "function") return value;
  if (value && typeof value[Symbol.iterator] === "function") {
    const disposers = [...value].filter(
      (item) => typeof item === "function"
    );
    return () => {
      for (const dispose of disposers.reverse()) dispose();
    };
  }
  return void 0;
}

// ../web-client/src/dsh-slot-catalog.ts
var DSH_SLOT_CATALOG_VERSION = "dsh-client-slots/v1";
var definition = (key, kind, scope, parent, owner, fallback = kind === "chain" ? "chain" : "empty") => ({
  key,
  kind,
  scope,
  parent,
  public: key !== "root",
  hostOnly: key === "root",
  owner,
  fallback
});
var DSH_SLOT_CATALOG = Object.freeze([
  definition(
    "conversation.approval.detail",
    "single",
    "session",
    "conversation.composer",
    "conversation.composer"
  ),
  definition(
    "conversation.chat.assistant-actions",
    "list",
    "session",
    "conversation.chat.node",
    "conversation.chat.node"
  ),
  definition(
    "conversation.chat.commandview",
    "keyed",
    "session",
    "conversation.chat.node",
    "conversation.chat.node"
  ),
  definition("conversation.chat.node", "keyed", "session", "conversation.view", "conversation.view"),
  definition(
    "conversation.chat.turnTail",
    "chain",
    "session",
    "conversation.chat.node",
    "conversation.chat.node"
  ),
  definition("conversation.composer", "chain", "session", "main.conversation", "main.conversation"),
  definition(
    "conversation.composer.bar",
    "single",
    "session-maybe",
    "main.conversation",
    "main.conversation"
  ),
  definition(
    "conversation.composer.dock",
    "list",
    "session",
    "conversation.composer.bar",
    "conversation.composer.bar"
  ),
  definition("conversation.hero.agentPreset", "single", "root", "main.conversation", "main.conversation"),
  definition("conversation.hero.brand.mark", "single", "root", "main.conversation", "main.conversation"),
  definition("conversation.hero.workspace", "single", "root", "main.conversation", "main.conversation"),
  definition(
    "conversation.hero.workspace.directoryFlow",
    "single",
    "root",
    "conversation.hero.workspace",
    "conversation.hero.workspace"
  ),
  definition(
    "conversation.input.attachments",
    "single",
    "session-maybe",
    "conversation.composer.bar",
    "conversation.composer.bar"
  ),
  definition("conversation.input.dock", "list", "session", "main.conversation", "main.conversation"),
  definition(
    "conversation.input.left",
    "list",
    "session",
    "conversation.composer.bar",
    "conversation.composer.bar"
  ),
  definition(
    "conversation.input.model",
    "single",
    "session",
    "conversation.composer.bar",
    "conversation.composer.bar"
  ),
  definition(
    "conversation.input.overlay",
    "list",
    "session",
    "conversation.composer.bar",
    "conversation.composer.bar"
  ),
  definition(
    "conversation.input.permission",
    "single",
    "session",
    "conversation.composer.bar",
    "conversation.composer.bar"
  ),
  definition(
    "conversation.input.plan",
    "single",
    "session",
    "conversation.composer.bar",
    "conversation.composer.bar"
  ),
  definition(
    "conversation.input.right",
    "list",
    "session",
    "conversation.composer.bar",
    "conversation.composer.bar"
  ),
  definition("conversation.message.images", "single", "session", "conversation.view", "conversation.view"),
  definition("conversation.session", "single", "session", "main.conversation", "main.conversation"),
  definition("conversation.session.header", "single", "session", "main.conversation", "main.conversation"),
  definition(
    "conversation.session.header.actions",
    "list",
    "session",
    "conversation.session.header",
    "conversation.session.header"
  ),
  definition(
    "conversation.session.header.corner",
    "single",
    "session",
    "conversation.session.header",
    "conversation.session.header"
  ),
  definition(
    "conversation.session.header.lineage",
    "single",
    "session",
    "conversation.session.header",
    "conversation.session.header"
  ),
  definition(
    "conversation.session.header.utilities",
    "list",
    "session",
    "conversation.session.header",
    "conversation.session.header"
  ),
  definition("conversation.trajectory.images", "single", "session", "conversation.view", "conversation.view"),
  definition("conversation.view", "list", "session", "conversation.session", "conversation.session"),
  definition("main", "keyed", "root", "root", "root"),
  definition("main.conversation", "single", "session-maybe", "main", "main"),
  definition("rightbar", "single", "root", "root", "root"),
  definition("rightbar.session", "single", "session", "rightbar", "rightbar"),
  definition("root", "single", "root", void 0, "runtime", "host"),
  definition("settings.action", "list", "root", "sidebar.settings", "sidebar.settings"),
  definition("settings.close", "single", "root", "sidebar.settings", "sidebar.settings"),
  definition("settings.general.item", "list", "root", "settings.section", "settings.section"),
  definition("settings.header", "single", "root", "sidebar.settings", "sidebar.settings"),
  definition("settings.models.footer", "list", "root", "settings.section", "settings.section"),
  definition("settings.models.provider-card", "keyed", "root", "settings.section", "settings.section"),
  definition("settings.onboarding", "list", "root", "sidebar.settings", "sidebar.settings"),
  definition("settings.plugin.item", "keyed", "root", "settings.plugins.tab", "settings.plugins.tab"),
  definition("settings.plugins.tab", "list", "root", "settings.section", "settings.section"),
  definition("settings.section", "list", "root", "sidebar.settings", "sidebar.settings"),
  definition("settings.trigger", "single", "root", "sidebar.settings", "sidebar.settings"),
  definition("shell.overlay", "list", "root", "root", "root"),
  definition("sidebar", "single", "root", "root", "root"),
  definition("sidebar.brand.mark", "single", "root", "sidebar", "sidebar"),
  definition("sidebar.brand.name", "single", "root", "sidebar", "sidebar"),
  definition("sidebar.footer.action", "list", "root", "sidebar", "sidebar"),
  definition("sidebar.panellist", "list", "root", "sidebar", "sidebar"),
  definition("sidebar.right.pane.tab", "keyed", "session", "rightbar.session", "rightbar.session"),
  definition("sidebar.right.pane.tab.title", "keyed", "session", "rightbar.session", "rightbar.session"),
  definition(
    "sidebar.right.tab.document",
    "keyed",
    "session",
    "sidebar.right.pane.tab",
    "sidebar.right.pane.tab"
  ),
  definition(
    "sidebar.right.tab.guide",
    "chain",
    "session",
    "sidebar.right.pane.tab",
    "sidebar.right.pane.tab"
  ),
  definition(
    "sidebar.right.tab.guide.entry",
    "keyed",
    "session",
    "sidebar.right.pane.tab",
    "sidebar.right.pane.tab"
  ),
  definition("sidebar.right.tab.menu.item", "list", "session", "rightbar.session", "rightbar.session"),
  definition("sidebar.settings", "single", "root", "sidebar", "sidebar"),
  definition("sidebar.workspaces", "single", "root", "sidebar", "sidebar"),
  definition(
    "sidebar.workspaces.directoryFlow",
    "single",
    "root",
    "sidebar.workspaces",
    "sidebar.workspaces"
  ),
  definition("tool.call.images", "single", "session", "tool.call.toolview", "tool.call.toolview"),
  definition("tool.call.toolview", "keyed", "session", "conversation.chat.node", "conversation.chat.node"),
  definition("tool.view.cordis", "keyed", "session", "tool.call.toolview", "tool.call.toolview")
]);
var DSH_SLOT_NAMES = Object.freeze(
  DSH_SLOT_CATALOG.map((slot) => slot.key)
);
var DSH_PUBLIC_SLOT_NAMES = Object.freeze(
  DSH_SLOT_CATALOG.filter((slot) => slot.public).map((slot) => slot.key)
);
var DSH_RUNTIME_SUPPORTED_SLOT_NAMES = Object.freeze([
  "conversation.approval.detail",
  "conversation.chat.assistant-actions",
  "conversation.chat.node",
  "conversation.chat.commandview",
  "conversation.chat.turnTail",
  "conversation.composer.dock",
  "conversation.composer",
  "conversation.composer.bar",
  "conversation.hero.agentPreset",
  "conversation.hero.brand.mark",
  "conversation.hero.workspace",
  "conversation.hero.workspace.directoryFlow",
  "conversation.input.attachments",
  "conversation.input.dock",
  "conversation.input.left",
  "conversation.input.model",
  "conversation.input.overlay",
  "conversation.input.permission",
  "conversation.input.plan",
  "conversation.input.right",
  "conversation.session",
  "conversation.session.header",
  "conversation.session.header.actions",
  "conversation.session.header.corner",
  "conversation.session.header.lineage",
  "conversation.session.header.utilities",
  "conversation.view",
  "conversation.message.images",
  "conversation.trajectory.images",
  "settings.action",
  "settings.close",
  "settings.general.item",
  "settings.header",
  "settings.models.footer",
  "settings.models.provider-card",
  "settings.onboarding",
  "settings.plugin.item",
  "settings.plugins.tab",
  "settings.section",
  "settings.trigger",
  "rightbar",
  "rightbar.session",
  "sidebar.right.pane.tab",
  "sidebar.right.pane.tab.title",
  "sidebar.right.tab.document",
  "sidebar.right.tab.guide",
  "sidebar.right.tab.guide.entry",
  "sidebar.right.tab.menu.item",
  "sidebar",
  "sidebar.brand.mark",
  "sidebar.brand.name",
  "sidebar.footer.action",
  "sidebar.panellist",
  "sidebar.settings",
  "sidebar.workspaces",
  "sidebar.workspaces.directoryFlow",
  "main",
  "main.conversation",
  "shell.overlay",
  "tool.call.toolview",
  "tool.call.images",
  "tool.view.cordis"
]);
var catalogByName = new Map(DSH_SLOT_CATALOG.map((slot) => [slot.key, slot]));
function getDshSlotDefinition(name) {
  return catalogByName.get(name);
}
function isKnownDshSlot(name) {
  return catalogByName.has(name);
}
function isPublicDshSlot(name) {
  return catalogByName.get(name)?.public === true;
}
function isRuntimeSupportedDshSlot(name) {
  return DSH_RUNTIME_SUPPORTED_SLOT_NAMES.includes(name);
}
function dshSlotSpec(name) {
  const slot = catalogByName.get(name);
  return slot === void 0 ? void 0 : { kind: slot.kind, scope: slot.scope };
}
var DSH_SLOT_COUNTS = Object.freeze({
  total: DSH_SLOT_CATALOG.length,
  public: DSH_PUBLIC_SLOT_NAMES.length,
  hostOnly: DSH_SLOT_CATALOG.filter((slot) => slot.hostOnly).length,
  single: DSH_SLOT_CATALOG.filter((slot) => slot.kind === "single").length,
  list: DSH_SLOT_CATALOG.filter((slot) => slot.kind === "list").length,
  keyed: DSH_SLOT_CATALOG.filter((slot) => slot.kind === "keyed").length,
  chain: DSH_SLOT_CATALOG.filter((slot) => slot.kind === "chain").length,
  root: DSH_SLOT_CATALOG.filter((slot) => slot.scope === "root").length,
  session: DSH_SLOT_CATALOG.filter((slot) => slot.scope === "session").length,
  sessionMaybe: DSH_SLOT_CATALOG.filter((slot) => slot.scope === "session-maybe").length
});

// ../web-client/src/slots.ts
var SLOT_TABLE = {
  "tool.card.inline": { kind: "list", scope: "root" },
  "client.card": { kind: "list", scope: "root" },
  "workbench.panel": { kind: "list", scope: "session-maybe" }
};
function asSlotEntry(entry) {
  return entry;
}

// ../web-client/src/registry.ts
var SlotRegistry = class extends Service {
  core;
  legacyId = 0;
  currentSessionId;
  sessionListeners = /* @__PURE__ */ new Set();
  boundSessionSource;
  boundSessionStop;
  boundSessionRefs = 0;
  localeSource;
  localeStop;
  localeVersion = 0;
  localeListeners = /* @__PURE__ */ new Set();
  constructor(ctx) {
    super(ctx, "slots");
    this.core = new SlotCore();
    for (const [name, spec] of Object.entries(SLOT_TABLE)) {
      this.core.declare(name, spec, "(built-in)");
    }
  }
  /** Declare a child or host-owned outlet. Repeated declarations fail closed. */
  declare(name, spec, declaredBy, parent) {
    this.core.declare(name, spec, declaredBy, parent);
  }
  register(nameOrOptions, component, options) {
    const registration = typeof nameOrOptions === "string" ? {
      name: nameOrOptions,
      ...options,
      ...this.core.spec(nameOrOptions)?.kind === "list" && options?.id === void 0 ? { id: `legacy-${++this.legacyId}` } : {}
    } : nameOrOptions;
    if (this.core.spec(registration.name)?.kind === "list" && registration.id === void 0) {
      registration.id = `legacy-${++this.legacyId}`;
    }
    if (!this.core.spec(registration.name) && typeof nameOrOptions === "string") {
      throw new Error(`unknown slot: ${registration.name}`);
    }
    return this.core.register(registration, component);
  }
  entries(name) {
    return this.core.entries(name).map(asSlotEntry);
  }
  entriesOfSlot(name) {
    return this.core.entriesOfSlot(name).map(asSlotEntry);
  }
  /** Actual runtime registrations for a package, for diagnostics and policy checks. */
  entriesByOwner(owner) {
    return this.core.entriesByOwner(owner).map(asSlotEntry);
  }
  spec(name) {
    return this.core.spec(name);
  }
  declarationEpoch(name) {
    return this.core.declarationEpoch(name);
  }
  getVersion(name) {
    return this.core.getVersion(name);
  }
  isLive(entry) {
    return this.core.isLive(entry);
  }
  remove(key) {
    this.core.remove(key);
  }
  removeOwner(owner) {
    this.core.removeOwner(owner);
  }
  acquireStore(entry, scopeKey = "root") {
    return this.core.acquireStore(entry, scopeKey);
  }
  pruneStoreScope(scopeKey) {
    this.core.pruneStoreScope(scopeKey);
  }
  /** Current scope identity used by session-scoped slot stores and outlets. */
  get sessionId() {
    return this.currentSessionId;
  }
  /**
   * Reattach all session-aware consumers to a new scope.  The old store seats
   * are destroyed before observers are notified, so a render cannot observe a
   * half-old/half-new session.  Reattaching to the same id is a no-op.
   */
  setSession(sessionId) {
    if (sessionId === this.currentSessionId) return;
    const previous = this.currentSessionId;
    this.currentSessionId = sessionId;
    this.core.pruneSessionScope(previous ?? "empty");
    for (const listener of [...this.sessionListeners]) listener();
  }
  /** Bind a SessionService-like source without making the kernel depend on it. */
  bindSession(source) {
    if (this.boundSessionSource === source) {
      this.boundSessionRefs += 1;
      return () => this.releaseSessionBinding(source);
    }
    this.boundSessionStop?.();
    this.boundSessionSource = source;
    this.boundSessionRefs = 1;
    const update = () => this.setSession(source.getSnapshot());
    update();
    this.boundSessionStop = source.subscribe(update);
    return () => this.releaseSessionBinding(source);
  }
  releaseSessionBinding(source) {
    if (this.boundSessionSource !== source) return;
    this.boundSessionRefs -= 1;
    if (this.boundSessionRefs > 0) return;
    this.boundSessionStop?.();
    this.boundSessionStop = void 0;
    this.boundSessionSource = void 0;
    this.setSession(void 0);
  }
  subscribeSession(listener) {
    this.sessionListeners.add(listener);
    return () => this.sessionListeners.delete(listener);
  }
  /** Bind the host locale service for outlets mounted below this registry. */
  setLocaleSource(source) {
    if (source === this.localeSource) return;
    this.localeStop?.();
    this.localeStop = void 0;
    this.localeSource = source;
    this.localeStop = source?.subscribe?.(() => {
      this.localeVersion += 1;
      for (const listener of [...this.localeListeners]) listener();
    });
  }
  getLocaleSource() {
    return this.localeSource;
  }
  getLocaleVersion() {
    return this.localeVersion;
  }
  subscribeLocale(listener) {
    this.localeListeners.add(listener);
    return () => this.localeListeners.delete(listener);
  }
  scopeAvailable(name, sessionId = this.currentSessionId) {
    const scope = this.core.spec(name)?.scope;
    return scope !== "session" || sessionId !== void 0;
  }
  selectChain(name, owner, onError) {
    return this.core.selectChain(name, owner, onError);
  }
  subscribe(nameOrListener, maybeListener) {
    const name = typeof nameOrListener === "string" ? nameOrListener : void 0;
    const listener = typeof nameOrListener === "function" ? nameOrListener : maybeListener;
    if (!listener) throw new TypeError("SlotRegistry.subscribe requires a listener");
    return this.core.onMutate((changed) => {
      if (name === void 0 || changed === name) listener();
    });
  }
  subscribeBatched(name, listener) {
    return this.core.subscribe(name, listener);
  }
  subscribeDeclaration(name, listener) {
    return this.core.subscribeDeclaration(name, listener);
  }
  inject(name, factory) {
    return this.core.inject(name, factory);
  }
  reportEntryError(name, entry, error, info) {
    this.core.reportEntryError(name, entry, error, info);
  }
  onEntryError(listener) {
    return this.core.onEntryError(listener);
  }
  snapshot(root) {
    return this.core.snapshot(root);
  }
};

// ../web-client/src/services.ts
var AgnesClientService = class extends Service {
  constructor(ctx, client, serviceCaller, effectCaller) {
    super(ctx, "agnes");
    this.client = client;
    this.serviceCaller = serviceCaller;
    this.effectCaller = effectCaller;
  }
  client;
  serviceCaller;
  effectCaller;
};
var CommandService = class extends Service {
  constructor(ctx, authorize = async () => false) {
    super(ctx, "commands");
    this.authorize = authorize;
  }
  authorize;
  entries = /* @__PURE__ */ new Map();
  register(owner, command) {
    if (typeof command.id !== "string" || !/^[a-z][a-z0-9.-]{0,127}$/.test(command.id))
      throw new TypeError("client command id must be a stable lowercase identifier");
    if (typeof command.execute !== "function")
      throw new TypeError("client command execute must be a function");
    const current = this.entries.get(command.id);
    if (current) throw new Error(`client command already registered: ${command.id}`);
    const entry = Object.freeze({ owner, command: Object.freeze({ ...command }) });
    this.entries.set(command.id, entry);
    return () => {
      if (this.entries.get(command.id) === entry) this.entries.delete(command.id);
    };
  }
  list() {
    return [...this.entries.values()].map(({ owner, command }) => ({
      owner,
      id: command.id,
      ...command.title ? { title: command.title } : {}
    })).sort((left, right) => left.id.localeCompare(right.id));
  }
  async execute(id, input) {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`client command is not registered: ${id}`);
    if (!await this.authorize({ owner: entry.owner, command: entry.command, input }))
      throw new Error(`client command is not authorized: ${id}`);
    return await entry.command.execute(input);
  }
  async executeOwned(owner, id, input) {
    const entry = this.entries.get(id);
    if (!entry || entry.owner !== owner) throw new Error(`client command is not registered: ${id}`);
    return await this.execute(id, input);
  }
};
var SessionService = class extends Service {
  currentSessionId;
  client;
  listeners = /* @__PURE__ */ new Set();
  projectionListeners = /* @__PURE__ */ new Set();
  currentHandle;
  currentHandleListener;
  constructor(ctx, initial, client) {
    super(ctx, "session");
    this.currentSessionId = initial;
    this.client = client;
    this.reattachHandle();
  }
  get sessionId() {
    return this.currentSessionId;
  }
  /** 仅宿主调用。 */
  setSession(sessionId) {
    if (sessionId === this.currentSessionId) return;
    this.detachHandle();
    this.currentSessionId = sessionId;
    this.reattachHandle();
    for (const listener of [...this.listeners]) listener();
  }
  /** Alias for hosts that model a session switch as a scope reattachment. */
  reattach(sessionId) {
    this.setSession(sessionId);
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.currentSessionId;
  get handle() {
    return this.currentHandle;
  }
  /** Session-scoped UI projection bound to the current SDK session. */
  projection = {
    read: async (name = "session.ui") => {
      const handle = this.currentHandle;
      if (!handle)
        return {
          status: "unavailable",
          name,
          error: { code: "E_PROJECTION_STATE", safeMessage: "session unavailable" }
        };
      const value = await handle.projectUI();
      return { status: "available", name, asOfSeq: 0, stateVersion: 1, value };
    },
    subscribe: (listener) => {
      this.projectionListeners.add(listener);
      return () => this.projectionListeners.delete(listener);
    }
  };
  /** Commands are bound to the current SDK session; the host remains the authority. */
  commands = {
    prompt: (input) => this.requireHandle().prompt(input),
    steer: (input) => this.requireHandle().steer(input),
    followUp: (input) => this.requireHandle().followUp(input),
    compact: (instructions) => this.requireHandle().compact(instructions),
    cancel: () => this.requireHandle().cancel()
  };
  requireHandle() {
    if (!this.currentHandle) throw new Error("session unavailable");
    return this.currentHandle;
  }
  detachHandle() {
    if (this.currentHandle && this.currentHandleListener)
      this.currentHandle.listeners.delete(this.currentHandleListener);
    this.currentHandle = void 0;
    this.currentHandleListener = void 0;
  }
  reattachHandle() {
    if (!this.client || !this.currentSessionId) return;
    const sessions = this.client.sessions;
    const handle = sessions?.get?.(this.currentSessionId);
    if (!handle) return;
    const listener = (() => {
      for (const item of [...this.projectionListeners]) item();
    });
    this.currentHandle = handle;
    this.currentHandleListener = listener;
    handle.listeners.add(listener);
  }
};
var IMAGE_MIMES = /* @__PURE__ */ new Set(["image/png", "image/jpeg"]);
var SHA256 = /^[0-9a-f]{64}$/;
function isImageArtifact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const artifact = value;
  return typeof artifact.sha256 === "string" && SHA256.test(artifact.sha256) && typeof artifact.size === "number" && Number.isSafeInteger(artifact.size) && artifact.size >= 0 && artifact.size <= 1024 * 1024 && typeof artifact.mime === "string" && IMAGE_MIMES.has(artifact.mime);
}
function isArtifact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const artifact = value;
  return typeof artifact.sha256 === "string" && SHA256.test(artifact.sha256) && typeof artifact.size === "number" && Number.isSafeInteger(artifact.size) && artifact.size >= 0 && artifact.size <= 1024 * 1024 && typeof artifact.mime === "string" && artifact.mime.length > 0 && artifact.mime.length <= 128;
}
function acceptsDocumentMime(kind, mime) {
  if (kind === "image") return IMAGE_MIMES.has(mime);
  if (kind === "pdf") return mime === "application/pdf";
  if (kind === "html") return mime === "text/html";
  if (kind === "markdown") return mime === "text/markdown" || mime === "text/plain";
  return mime.startsWith("text/") || mime === "application/json" || mime === "application/javascript";
}
function isBoundedText(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 512 && ![...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 31 || code === 127;
  });
}
function sameImageArtifact(left, right) {
  return left.sha256 === right.sha256 && left.size === right.size && left.mime === right.mime;
}
function decodeBase64(value) {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}
var ClientResourceReclaimedError = class extends Error {
  constructor() {
    super("document resource was reclaimed by retention");
    this.name = "ClientResourceReclaimedError";
  }
};
var ClientResourceService = class extends Service {
  constructor(ctx, client, session) {
    super(ctx, "resources");
    this.client = client;
    this.session = session;
    ctx.effect(() => this.releaseAll.bind(this));
  }
  client;
  session;
  objectUrls = /* @__PURE__ */ new Set();
  images = Object.freeze({
    load: (input) => this.loadImage(input)
  });
  documents = Object.freeze({
    load: (input) => this.loadDocument(input)
  });
  async loadImage(input) {
    const sessionId = this.session.sessionId;
    if (!sessionId) throw new Error("image resource requires an active session");
    if (!isBoundedText(input.laneId) || !isImageArtifact(input.artifact))
      throw new TypeError("image resource reference is invalid");
    const resource = await this.loadDocument({ ...input, kind: "image" });
    if (!resource.url) throw new Error("image resource URL is unavailable");
    return Object.freeze({ artifact: resource.artifact, url: resource.url, release: resource.release });
  }
  async loadDocument(input) {
    const sessionId = this.session.sessionId;
    if (!sessionId) throw new Error("document resource requires an active session");
    if (!isBoundedText(input.laneId) || !isArtifact(input.artifact) || !acceptsDocumentMime(input.kind, input.artifact.mime))
      throw new TypeError("document resource reference is invalid");
    const result = await this.client.call("_agnes/v1/artifact.read", {
      sessionId,
      laneId: input.laneId,
      artifact: input.artifact
    });
    if (this.session.sessionId !== sessionId) throw new Error("document resource session changed");
    if (!result.ok && result.status === 410 && result.code === "artifact_reclaimed")
      throw new ClientResourceReclaimedError();
    if (!result.ok) throw new Error(`document resource is unavailable: ${result.code}`);
    if (!sameImageArtifact(result.artifact, input.artifact) || result.contentLength !== input.artifact.size)
      throw new Error("document resource identity mismatch");
    const bytes = decodeBase64(result.base64);
    if (bytes.byteLength !== result.contentLength) throw new Error("document resource length mismatch");
    const needsUrl = input.kind === "image" || input.kind === "pdf";
    const url = needsUrl ? this.createObjectUrl(bytes, result.artifact.mime) : void 0;
    const content = needsUrl ? void 0 : new TextDecoder().decode(bytes);
    let released = false;
    return Object.freeze({
      artifact: result.artifact,
      kind: input.kind,
      ...content === void 0 ? {} : { content },
      ...url === void 0 ? {} : { url },
      release: () => {
        if (released) return;
        released = true;
        if (url !== void 0) {
          this.objectUrls.delete(url);
          globalThis.URL.revokeObjectURL(url);
        }
      }
    });
  }
  createObjectUrl(bytes, mime) {
    const createObjectUrl = globalThis.URL?.createObjectURL;
    if (!createObjectUrl) throw new Error("document resource URLs are unavailable");
    const url = createObjectUrl(new Blob([bytes], { type: mime }));
    this.objectUrls.add(url);
    return url;
  }
  releaseAll() {
    for (const url of this.objectUrls) globalThis.URL.revokeObjectURL(url);
    this.objectUrls.clear();
  }
};
var ThemeService = class extends Service {
  resolved;
  listeners = /* @__PURE__ */ new Set();
  constructor(ctx, initial) {
    super(ctx, "theme");
    this.resolved = initial;
  }
  get theme() {
    return this.resolved;
  }
  /** 仅宿主调用。 */
  setTheme(theme) {
    if (theme === this.resolved) return;
    this.resolved = theme;
    for (const listener of [...this.listeners]) listener();
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.resolved;
};
var UI_LOCALES = ["en", "zh-CN"];
function resolveUiLocale(value) {
  return UI_LOCALES.includes(value ?? "") ? value : "en";
}
function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(
    /\{(\w+)\}/g,
    (match, name) => Object.hasOwn(vars, name) ? String(vars[name]) : match
  );
}
var LocaleService = class extends Service {
  currentLocale;
  catalogs = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  constructor(ctx, initial) {
    super(ctx, "locale");
    this.currentLocale = resolveUiLocale(initial);
  }
  get locale() {
    return this.currentLocale;
  }
  /** 注册目录（命名空间 = 包 id）。撤销时自动移除；插件侧经 effect 绑定 fiber。 */
  register(namespace, catalog) {
    this.catalogs.delete(namespace);
    this.catalogs.set(namespace, catalog);
    for (const listener of [...this.listeners]) listener();
    return () => {
      if (this.catalogs.get(namespace) !== catalog) return;
      this.catalogs.delete(namespace);
      for (const listener of [...this.listeners]) listener();
    };
  }
  /**
   * 查目录：后注册者覆盖先注册者。
   * 当前语言没有该 key 时回落英文，英文也没有则回落 key 本身。
   */
  t(key, vars) {
    const direct = this.lookup(this.currentLocale, key);
    const hit = direct ?? (this.currentLocale === "en" ? void 0 : this.lookup("en", key));
    return interpolate(hit ?? key, vars);
  }
  /** Bind a namespace for slot entries that declare `locale`. */
  bind(namespace) {
    return (key, vars) => {
      const catalog = this.catalogs.get(namespace);
      const direct = catalog?.[this.currentLocale]?.[key];
      if (direct !== void 0) return interpolate(direct, vars);
      if (this.currentLocale !== "en") {
        const english = catalog?.en?.[key];
        if (english !== void 0) return interpolate(english, vars);
      }
      return this.t(key, vars);
    };
  }
  /** 仅宿主调用。未知语言回落英文。 */
  setLocale(locale) {
    const next = resolveUiLocale(locale);
    if (next === this.currentLocale) return;
    this.currentLocale = next;
    for (const listener of [...this.listeners]) listener();
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.currentLocale;
  lookup(locale, key) {
    const catalogs = [...this.catalogs.values()];
    for (let index = catalogs.length - 1; index >= 0; index -= 1) {
      const hit = catalogs[index]?.[locale]?.[key];
      if (hit !== void 0) return hit;
    }
    return void 0;
  }
};

// ../web-client/src/client-module.ts
function clientModule(mod) {
  return {
    // `ctx.agnes` is a host-owned, already-authenticated browser SDK.  Make
    // it an explicit Cordis dependency so client modules never race a partial
    // context and never manufacture a second client.
    inject: [.../* @__PURE__ */ new Set([...mod.inject ?? [], "slots", "agnes", "commands", "session", "theme", "locale"])],
    apply(ctx, config) {
      const registry = ctx.slots;
      if (!(registry instanceof SlotRegistry)) {
        throw new Error("clientModule requires the host-provided slots service");
      }
      const bound = createFiberBoundRegistry(
        registry,
        ctx,
        config.rowId ?? config.packageId,
        config.allowedSlots,
        config.slotCatalogVersion
      );
      const getService = ctx.get;
      const agnes = getService?.("agnes", false);
      if (!(agnes instanceof AgnesClientService)) {
        throw new Error("clientModule requires the host-provided agnes service");
      }
      const commands = getService?.("commands", false);
      if (!(commands instanceof CommandService)) {
        throw new Error("clientModule requires the host-provided commands service");
      }
      const session = getService?.("session", false);
      if (!(session instanceof SessionService)) {
        throw new Error("clientModule requires the host-provided session service");
      }
      const resources = getService?.("resources", false) instanceof ClientResourceService ? getService?.("resources", false) : new ClientResourceService(ctx, agnes.client, session);
      const serviceApi = Object.freeze({
        call: async (name, input) => {
          if (!agnes.serviceCaller || !config.services?.includes(name))
            throw new Error(`client service is unavailable: ${name}`);
          const sessionId = session.sessionId;
          if (!sessionId) throw new Error("client service requires an active session");
          return await agnes.serviceCaller(config, sessionId, name, input);
        }
      });
      const moduleAgnes = Object.freeze(
        Object.assign(Object.create(agnes.client), {
          services: serviceApi
        })
      );
      Object.defineProperty(ctx, "agnes", { value: moduleAgnes, configurable: true });
      const theme = getService?.("theme", false);
      if (!(theme instanceof ThemeService)) {
        throw new Error("clientModule requires the host-provided theme service");
      }
      const locale = getService?.("locale", false);
      if (!(locale instanceof LocaleService)) {
        throw new Error("clientModule requires the host-provided locale service");
      }
      const boundCommands = {
        register(command) {
          const off = commands.register(config.rowId ?? config.packageId, command);
          ctx.effect(() => off);
          return off;
        },
        registerEffect(command) {
          if (!agnes.effectCaller || !config.services?.includes(command.service))
            throw new Error(`client effect service is unavailable: ${command.service}`);
          return this.register({
            id: command.id,
            ...command.title ? { title: command.title } : {},
            effectService: command.service,
            execute: async (input) => {
              if (!input || typeof input !== "object" || Array.isArray(input))
                throw new TypeError("client effect input must be an object");
              const sessionId = session.sessionId;
              if (!sessionId) throw new Error("client effect requires an active session");
              return await agnes.effectCaller(
                config,
                sessionId,
                command.service,
                crypto.randomUUID(),
                input
              );
            }
          });
        },
        execute(id, input) {
          return commands.executeOwned(config.rowId ?? config.packageId, id, input);
        }
      };
      const stop = registry.bindSession(session);
      ctx.effect(() => stop);
      registry.setLocaleSource(locale);
      Object.defineProperty(ctx, "slots", { value: bound, configurable: true });
      Object.defineProperty(ctx, "module", { value: config, configurable: true });
      Object.defineProperty(ctx, "commands", { value: boundCommands, configurable: true });
      Object.defineProperty(ctx, "session", { value: session, configurable: true });
      Object.defineProperty(ctx, "resources", { value: resources, configurable: true });
      Object.defineProperty(ctx, "theme", { value: theme, configurable: true });
      Object.defineProperty(ctx, "locale", { value: locale, configurable: true });
      return mod.apply(ctx, config);
    }
  };
}
function createFiberBoundRegistry(registry, fiberCtx, owner, allowedSlots, configCatalogVersion) {
  const bound = Object.create(registry);
  bound.register = ((nameOrOptions, component, options) => {
    const requestedName = typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name;
    const registration = typeof nameOrOptions === "string" ? { name: nameOrOptions, ...options ?? {}, owner } : { ...nameOrOptions, owner };
    const dshDefinition = getDshSlotDefinition(requestedName);
    if (dshDefinition !== void 0) {
      if (!isPublicDshSlot(requestedName))
        throw new Error(`client module ${owner} cannot register host-only slot ${requestedName}`);
      if (configCatalogVersion !== DSH_SLOT_CATALOG_VERSION)
        throw new Error(`client module ${owner} uses unsupported slot catalog version`);
      if (!isRuntimeSupportedDshSlot(requestedName))
        throw new Error(`client module ${owner} registered an unmounted slot ${requestedName}`);
    }
    if (allowedSlots !== void 0 && !allowedSlots.includes(requestedName))
      throw new Error(`client module ${owner} registered undeclared slot ${String(requestedName)}`);
    const off = registry.register(registration, component);
    fiberCtx.effect(() => off);
    return off;
  });
  bound.inject = ((name, factory) => {
    const off = registry.inject(name, factory);
    fiberCtx.effect(() => off);
    return off;
  });
  return bound;
}

// ../web-client/src/externals.ts
var externals = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@agnes/cordis",
  "@agnes/web-client"
];
var BUILDER_VERSION = 1;

// ../web-client/src/outlet.tsx
import {
  Component,
  createContext,
  createElement,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore
} from "react";
var SlotsContext = createContext(void 0);
var SlotRuntimeContext = createContext({
  session: void 0,
  locale: void 0,
  resources: void 0
});
var noSubscribe = () => () => void 0;
var noSnapshot = () => void 0;
function SlotsProvider({
  registry,
  children,
  session,
  locale,
  resources
}) {
  useEffect(() => {
    if (!session) return;
    return registry.bindSession(session);
  }, [registry, session]);
  const runtimeValue = { session, locale, resources };
  return createElement(
    SlotsContext.Provider,
    { value: registry },
    createElement(SlotRuntimeContext.Provider, { value: runtimeValue }, children)
  );
}
function SlotOutlet(outletProps) {
  const registry = useContext(SlotsContext);
  const runtime = useContext(SlotRuntimeContext);
  if (!registry) throw new Error("SlotOutlet requires <SlotsProvider registry={...}>");
  const version = useSyncExternalStore(
    (listener) => registry.subscribeBatched(outletProps.name, listener),
    () => registry.getVersion(outletProps.name)
  );
  const sessionId = runtime.session?.getSnapshot() ?? registry.sessionId;
  const sessionSubscribe = runtime.session ? runtime.session.subscribe : (listener) => registry.subscribeSession(listener);
  const sessionSnapshot = runtime.session ? runtime.session.getSnapshot : () => registry.sessionId;
  const sessionVersion = useSyncExternalStore(sessionSubscribe, sessionSnapshot);
  const localeVersion = useSyncExternalStore(
    runtime.locale ? runtime.locale.subscribe : registry.subscribeLocale.bind(registry),
    runtime.locale ? runtime.locale.getSnapshot : () => String(registry.getLocaleVersion())
  );
  void version;
  void sessionVersion;
  void localeVersion;
  const spec = registry.spec(outletProps.name);
  const scopeKey = spec?.scope === "session" ? sessionId ?? "root" : spec?.scope === "session-maybe" ? sessionId ?? "empty" : "root";
  const unavailable = spec?.scope === "session" && sessionId === void 0;
  const maybeIncarnation = useRef({
    sessionId,
    value: 0
  });
  if (spec?.scope === "session-maybe") {
    const previous = maybeIncarnation.current.sessionId;
    const changedBetweenConcreteSessions = previous !== void 0 && sessionId !== void 0 && previous !== sessionId;
    const returnedFromConcreteSession = previous !== void 0 && sessionId === void 0;
    if (changedBetweenConcreteSessions || returnedFromConcreteSession) maybeIncarnation.current.value += 1;
    maybeIncarnation.current.sessionId = sessionId;
  }
  const componentScopeKey = spec?.scope === "session-maybe" ? `${outletProps.name}:maybe:${maybeIncarnation.current.value}` : `${outletProps.name}:${scopeKey}`;
  const chainOverlay = outletProps.overlay ?? outletProps.chain?.overlay ?? false;
  const chainOwner = outletProps.owner ?? outletProps.chain?.owner;
  const fallback = outletProps.fallback ?? outletProps.chain?.fallback ?? createElement(
    "div",
    { "data-slot-placeholder": "1" },
    runtime.locale?.t("slot.notReady") ?? "Plugin for this slot is not ready"
  );
  if (spec?.kind === "chain") {
    const selected = !unavailable || chainOverlay ? registry.selectChain(outletProps.name, chainOwner ?? outletProps.props ?? null) : void 0;
    const winner = selected && safeFilter(outletProps.filterEntry, selected.entry) ? { ...selected, entry: selected.entry } : void 0;
    if (!winner && outletProps.hideWhenEmpty) {
      return createElement("div", {
        "data-slot": outletProps.name,
        "data-slot-state": "empty",
        hidden: true
      });
    }
    const fallbackNode = createElement(
      "div",
      {
        "data-slot-fallback": outletProps.name,
        ...winner && chainOverlay ? { style: { display: "none" } } : {}
      },
      fallback
    );
    const nodes = [];
    if (winner) {
      nodes.push(
        createElement(SlotEntryBoundary, {
          key: `${winner.entry.key}:${componentScopeKey}`,
          scopeKey,
          entry: winner.entry,
          entryProps: outletProps.props,
          selectedValue: winner.value,
          registry,
          name: outletProps.name,
          sessionId,
          locale: runtime.locale,
          resources: runtime.resources,
          abdicate: outletProps.abdicateOnError ?? true
        })
      );
    }
    if (!winner || chainOverlay) nodes.push(fallbackNode);
    return createElement(
      "div",
      { "data-slot": outletProps.name, "data-slot-state": winner ? "ready" : "empty" },
      ...nodes
    );
  }
  const all = unavailable ? [] : registry.entriesOfSlot(outletProps.name);
  const keyedEntries = spec?.kind === "keyed" && outletProps.entryKey !== void 0 ? all.filter((entry) => entry.options.key === outletProps.entryKey) : all;
  const entries = outletProps.filterEntry ? keyedEntries.filter((entry) => safeFilter(outletProps.filterEntry, entry)) : keyedEntries;
  if (entries.length === 0) {
    if (outletProps.hideWhenEmpty) {
      return createElement("div", {
        "data-slot": outletProps.name,
        "data-slot-state": "empty",
        hidden: true
      });
    }
    return createElement("div", { "data-slot": outletProps.name, "data-slot-state": "empty" }, fallback);
  }
  return createElement(
    "div",
    { "data-slot": outletProps.name, "data-slot-state": "ready" },
    ...entries.map(
      (entry) => createElement(SlotEntryBoundary, {
        key: `${entry.key}:${componentScopeKey}`,
        scopeKey,
        entry,
        entryProps: outletProps.props,
        registry,
        name: outletProps.name,
        sessionId,
        locale: runtime.locale,
        resources: runtime.resources,
        abdicate: outletProps.abdicateOnError ?? (spec?.kind === "single" || spec?.kind === "keyed")
      })
    )
  );
}
var SlotEntryBoundary = class extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    this.props.registry.reportEntryError(this.props.name, this.props.entry, error, {
      abdicate: this.props.abdicate
    });
    console.warn("[web-client] slot entry failed");
  }
  render() {
    if (this.state.failed) {
      return createElement(
        "div",
        { "data-slot-entry": this.props.entry.key, "data-slot-entry-state": "failed" },
        this.props.locale?.t("slot.entryFailed") ?? "Plugin render failed"
      );
    }
    const store = this.props.registry.acquireStore(this.props.entry, this.props.scopeKey);
    return createElement(
      "div",
      { "data-slot-entry": this.props.entry.key, "data-slot-entry-state": "ready" },
      createElement(EntryView, { ...this.props, store })
    );
  }
};
function EntryView(props) {
  const storeVersion = useSyncExternalStore(
    props.store?.subscribe ?? noSubscribe,
    props.store?.getSnapshot ?? noSnapshot
  );
  void storeVersion;
  const Comp = props.entry.component;
  const spec = props.registry.spec(props.name);
  const locale = props.locale ?? props.registry.getLocaleSource();
  const translate = props.entry.locale ? locale?.bind(props.entry.locale) : locale?.t.bind(locale);
  const baseProps = {
    ...spec?.inject ?? {},
    ...props.entryProps ?? {},
    ...props.selectedValue === void 0 ? {} : {
      selected: props.selectedValue,
      value: props.selectedValue,
      ...spec?.kind === "chain" ? { matched: props.selectedValue } : {}
    },
    ...props.store === void 0 ? {} : { store: props.store },
    ...props.store?.actions === void 0 ? {} : { actions: props.store.actions },
    ...spec?.scope === "root" ? {} : { sessionId: props.sessionId },
    ...translate === void 0 ? {} : { locale: translate },
    ...translate === void 0 ? {} : { t: translate },
    ...props.resources === void 0 ? {} : { resources: props.resources }
  };
  const injected = props.entry.inject ? Reflect.apply(props.entry.inject, void 0, injectArgs(spec?.scope, props.sessionId, props.store)) ?? {} : {};
  return createElement(Comp, { ...baseProps, ...injected });
}
function injectArgs(scope, sessionId, store) {
  if (scope === "root") return store === void 0 ? [] : [store.actions];
  if (scope === "session-maybe") {
    return [sessionId, sessionId === void 0 ? void 0 : store?.actions];
  }
  return store === void 0 ? [sessionId] : [sessionId, store.actions];
}
function safeFilter(filter, entry) {
  if (!filter) return true;
  try {
    return filter(entry);
  } catch {
    console.warn("[web-client] slot filter failed");
    return false;
  }
}
export {
  AgnesClientService,
  BUILDER_VERSION,
  ClientResourceReclaimedError,
  ClientResourceService,
  CommandService,
  DSH_PUBLIC_SLOT_NAMES,
  DSH_RUNTIME_SUPPORTED_SLOT_NAMES,
  DSH_SLOT_CATALOG,
  DSH_SLOT_CATALOG_VERSION,
  DSH_SLOT_COUNTS,
  DSH_SLOT_NAMES,
  LocaleService,
  SLOT_TABLE,
  SessionService,
  SlotCore,
  SlotOutlet,
  SlotRegistry,
  SlotsProvider,
  ThemeService,
  UI_LOCALES,
  WEB_ROW_PREFIX,
  clientModule,
  defineStore,
  dshSlotSpec,
  externals,
  getDshSlotDefinition,
  isKnownDshSlot,
  isPublicDshSlot,
  isRuntimeSupportedDshSlot,
  isWebRowId,
  packageIdFromWebRowId,
  resolveUiLocale,
  webRowId
};
