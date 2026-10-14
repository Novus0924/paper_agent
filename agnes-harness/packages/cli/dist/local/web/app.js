import {
  AGNES_ERRORS,
  AttachmentValidationError,
  Button,
  Cursor,
  DiagnosticsDialogView,
  Field,
  JSONRPC_ERRORS,
  MAX_FRAME_BYTES,
  META_KEY,
  METHODS,
  NotificationHost,
  SafeImageError,
  SessionCompactParams,
  SessionForkParams,
  SessionRemoveQueuedParams,
  SessionSendNowParams,
  SessionSteerParams,
  SettingsAccountDialog,
  SettingsAccounts,
  SettingsComputerUse,
  SettingsModelPane,
  ToolCall,
  ToolResult,
  Tooltip,
  UI_HISTORY_DEFAULT_LIMIT,
  UI_OPENING_DEFAULT_MAX_NODES,
  UI_PROJECTION_DEFAULT_MAX_BYTES,
  UI_PROJECTION_MAX_BYTES,
  USER_MESSAGE_ATTACHMENT_LIMITS,
  USER_MESSAGE_IMAGE_LIMITS,
  WEB_UI_LOCALE_NAMESPACE,
  bindListboxKeys,
  contextBudgetLabel,
  contextBudgetPresets,
  createAntdRoot,
  createRegionHost,
  createSelectPicker,
  decodeAttachmentData,
  decodeSafeImageBytes,
  decodeSafeImages,
  describeValidationErrors,
  getHarnessMeta,
  jcs,
  minimumContextBudget,
  modelImageInputError,
  modelThinkingOptions,
  mountRegion,
  parseContextBudget,
  positionPopover,
  positionSubmenu,
  projectClientModuleRows,
  readSessionTitle,
  renderRegion,
  rpcError,
  setSettingsSelectOptions,
  toAcpOptionKind,
  toAcpPrompt,
  toAcpStopReason,
  unmountRegion,
  userImagePolicy,
  validateAgainst,
  validateEvent,
  validateMethod,
  validateUserAttachments,
  webUiLocaleCatalog
} from "./chunk-Q3P2MODL.js";

// ../resource-control-client-node/src/resource-control.ts
var isResourceControlMethod = (method) => method.startsWith("_agnes/v1/resources.") || method.startsWith("_agnes/v1/skills.") || method.startsWith("_agnes/v1/mcp.servers.");

// ../sdk/src/auth.ts
function localAuth() {
  return {
    kind: "local",
    async build() {
      return { kind: "local" };
    }
  };
}
function validToken(token) {
  return typeof token === "string" && token.length > 0;
}
function jwtAuth(token) {
  return {
    kind: "jwt",
    async build() {
      try {
        const value = typeof token === "function" ? await token() : token;
        if (!validToken(value)) throw new Error();
        return { kind: "jwt", token: value };
      } catch {
        throw new Error("jwt credential unavailable");
      }
    }
  };
}
function portalIdentityAuth(token) {
  return {
    kind: "portal-identity",
    async build() {
      if (!validToken(token)) throw new Error("portal credential unavailable");
      return { kind: "portal-identity", token };
    }
  };
}

// ../sdk/src/branding.ts
var DEFAULT_BRANDING = Object.freeze({
  accent: "#5E57FE",
  mark: "agnes",
  selfLabel: "Agnes AI"
});
var DEFAULT_OPTIONS = {
  refreshMs: 3e4,
  retryMs: 5e3,
  firstRenderWaitMs: 1500
};
var BrandingCache = class {
  constructor(fetcher, opts = DEFAULT_OPTIONS) {
    this.fetcher = fetcher;
    this.opts = opts;
  }
  fetcher;
  opts;
  value = DEFAULT_BRANDING;
  first = null;
  timer = null;
  stopped = false;
  current() {
    return this.value;
  }
  async refreshNow() {
    try {
      const branding = await this.fetcher();
      if (!this.stopped && branding !== void 0) this.value = Object.freeze({ ...branding });
      this.schedule(this.opts.refreshMs);
    } catch {
      this.schedule(this.opts.retryMs);
    }
    return this.value;
  }
  forRender() {
    this.first ??= this.refreshNow();
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(this.value), this.opts.firstRenderWaitMs);
      void this.first?.then(() => {
        clearTimeout(timer);
        resolve(this.value);
      });
    });
  }
  stop() {
    this.stopped = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
  schedule(ms) {
    if (this.stopped) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.refreshNow(), ms);
  }
};

// ../sdk/src/errors.ts
var SdkError = class extends Error {
  kind;
  constructor(kind, message2) {
    super(message2);
    this.kind = kind;
    this.name = "SdkError";
  }
};
var JsonRpcError = class extends SdkError {
  code;
  data;
  // The wire error kept verbatim: `message` has the `(code)` suffix appended into it, and
  // answering a server-to-client request with a locally thrown JsonRpcError needs a lossless
  // source. The alternative is stripping the suffix with a regex, which strips the wrong
  // thing the moment a server message ends in " (-32602)" of its own.
  rpc;
  constructor(err) {
    super("json-rpc", `${err.message} (${err.code})`);
    this.name = "JsonRpcError";
    this.code = err.code;
    this.data = err.data;
    this.rpc = err;
  }
};
var TransportClosed = class extends SdkError {
  info;
  constructor(info) {
    const exit = info.exitCode != null ? ` exit=${info.exitCode}` : "";
    super("transport-closed", `transport closed: ${info.reason}${exit}`);
    this.name = "TransportClosed";
    this.info = info;
  }
};
var RequestTimeout = class extends SdkError {
  method;
  timeoutMs;
  constructor(method, timeoutMs) {
    super("request-timeout", `${method} timed out after ${timeoutMs} ms`);
    this.name = "RequestTimeout";
    this.method = method;
    this.timeoutMs = timeoutMs;
  }
};
var ProtocolViolation = class extends SdkError {
  constructor(detail, violationKind = "schema") {
    super("protocol-violation", detail);
    this.violationKind = violationKind;
    this.name = "ProtocolViolation";
    this.detail = detail;
  }
  violationKind;
  detail;
};
var Unsupported = class extends SdkError {
  what;
  constructor(what) {
    super("unsupported", `${what} is not available in this build`);
    this.name = "Unsupported";
    this.what = what;
  }
};
var ClaimDenied = class extends SdkError {
  reason;
  constructor(reason) {
    super("claim-denied", reason);
    this.name = "ClaimDenied";
    this.reason = reason;
  }
};

// ../sdk/src/claim.ts
function makeClaim(client2, strict) {
  const run2 = async (params) => {
    try {
      const result2 = await client2.call("_agnes/v1/auth.claim", params, {
        timeoutMs: client2.timeouts.claim
      });
      if (result2.granted === true) return true;
      if (strict) throw new ClaimDenied("not granted");
    } catch (error) {
      if (error instanceof ClaimDenied) throw error;
      if (strict) throw new ClaimDenied(error instanceof Error ? error.message : String(error));
    }
    return false;
  };
  return {
    once: (kind, value, expiresAtMs) => run2({ kind, value, ...expiresAtMs === void 0 ? {} : { expiresAtMs } }),
    withinRateLimit: (kind, value, limit, windowMs) => run2({ kind, value, limit, windowMs })
  };
}

// ../sdk/src/events.ts
var Emitter = class {
  handlers = /* @__PURE__ */ new Map();
  on(event, h) {
    const set = this.handlers.get(event) ?? /* @__PURE__ */ new Set();
    set.add(h);
    this.handlers.set(event, set);
    return () => {
      set.delete(h);
    };
  }
  // Iterate a snapshot: a handler that unsubscribes itself, or subscribes another
  // handler, must not change who receives the event already being delivered.
  emit(event, payload) {
    for (const h of [...this.handlers.get(event) ?? []]) h(payload);
  }
};

// ../sdk/src/initialize-wait.ts
function untilAborted(start, signal) {
  return new Promise((resolve, reject) => {
    const pending = Promise.resolve().then(() => {
      if (signal.aborted) throw signal.reason;
      return start();
    });
    const cleanup = () => signal.removeEventListener("abort", abort);
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };
    pending.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

// ../sdk/src/journal-command-id.ts
async function journalCommandId(clientId, sessionId, counter) {
  const plain = `${clientId}:${sessionId}:${counter}`;
  if (Array.from(plain).length <= 128) return plain;
  const encoded = new TextEncoder().encode(JSON.stringify([clientId, sessionId]));
  const hash = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", encoded));
  const hex = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256-${hex}-${counter}`;
}

// ../sdk/src/journal.ts
function snapshotPending(value) {
  try {
    const copy = JSON.parse(jcs(value));
    if (copy === null || typeof copy !== "object" || Array.isArray(copy) || !("commandId" in copy) || typeof copy.commandId !== "string" || !copy.commandId || !("method" in copy) || typeof copy.method !== "string" || !copy.method || !Object.hasOwn(copy, "params"))
      throw new Error("invalid journal state");
    return copy;
  } catch {
    throw new Error("invalid journal state");
  }
}
function randomId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function memoryJournal(clientId = randomId()) {
  const counters = /* @__PURE__ */ new Map();
  const cursors = /* @__PURE__ */ new Map();
  const pending = /* @__PURE__ */ new Map();
  return {
    async clientId() {
      return clientId;
    },
    async nextCommandId(sessionId) {
      const n = (counters.get(sessionId) ?? 0) + 1;
      if (!Number.isSafeInteger(n)) throw new Error("invalid journal state");
      counters.set(sessionId, n);
      return journalCommandId(clientId, sessionId, n);
    },
    async cursor(sessionId) {
      return structuredClone(cursors.get(sessionId) ?? null);
    },
    async setCursor(sessionId, c) {
      cursors.set(sessionId, structuredClone(c));
    },
    // A copy, not the live array: a caller iterating pending while the client clears
    // acknowledged commands would otherwise skip entries.
    async pending(sessionId) {
      return structuredClone(pending.get(sessionId) ?? []);
    },
    async markPending(sessionId, cmd) {
      pending.set(sessionId, [...pending.get(sessionId) ?? [], snapshotPending(cmd)]);
    },
    async clearPending(sessionId, commandId) {
      pending.set(
        sessionId,
        (pending.get(sessionId) ?? []).filter((c) => c.commandId !== commandId)
      );
    }
  };
}

// ../sdk/src/permission.ts
var cancelled = () => ({ outcome: { outcome: "cancelled" } });
function rejectPermission(request) {
  if (new Set(request.options.map((o) => o.optionId)).size !== request.options.length)
    return { outcome: { outcome: "cancelled" } };
  const reject = request.options.find((option2) => option2.kind === "reject_once");
  return reject ? { outcome: { outcome: "selected", optionId: reject.optionId } } : { outcome: { outcome: "cancelled" } };
}
var PermissionGate = class {
  current;
  closed = false;
  register(handler) {
    this.current?.ac.abort();
    if (this.closed) return () => {
    };
    const entry = { handler, ac: new AbortController() };
    this.current = entry;
    return () => {
      entry.ac.abort();
      if (this.current === entry) this.current = void 0;
    };
  }
  close() {
    this.closed = true;
    this.current?.ac.abort();
    this.current = void 0;
  }
  async answer(request) {
    const original = structuredClone(request);
    const fallback = rejectPermission(original);
    const entry = this.current;
    if (this.closed || !entry) return fallback;
    if (new Set(original.options.map((o) => o.optionId)).size !== original.options.length) return cancelled();
    const requestAbort = new AbortController();
    let timer;
    let abort;
    const interrupted = /* @__PURE__ */ Symbol("permission-interrupted");
    const stopped = new Promise((resolve) => {
      abort = () => {
        requestAbort.abort();
        resolve(interrupted);
      };
      entry.ac.signal.addEventListener("abort", abort, { once: true });
      if (original.deadlineMs !== void 0) {
        const deadline = original.deadlineMs;
        const arm = () => {
          const left = deadline - Date.now();
          if (!Number.isFinite(left) || left <= 0) abort();
          else timer = setTimeout(arm, Math.min(left, 2147483647));
        };
        arm();
      }
    });
    try {
      if (original.deadlineMs !== void 0 && original.deadlineMs <= Date.now()) return cancelled();
      const out = await Promise.race([
        Promise.resolve().then(
          () => entry.ac.signal.aborted ? null : entry.handler(structuredClone(original), { signal: requestAbort.signal })
        ),
        stopped
      ]);
      if (this.closed || entry.ac.signal.aborted || out === interrupted || original.deadlineMs !== void 0 && original.deadlineMs <= Date.now())
        return cancelled();
      if (!out || typeof out !== "object") return fallback;
      let option2;
      if ("optionId" in out) option2 = original.options.find((o) => o.optionId === out.optionId);
      else if (out.verdict === "allowed-once" || out.verdict === "allowed-session" || out.verdict === "rejected") {
        const kind = toAcpOptionKind(out.verdict);
        option2 = original.options.find((o) => o.kind === kind);
      }
      return option2 ? { outcome: { outcome: "selected", optionId: option2.optionId } } : fallback;
    } catch {
      return fallback;
    } finally {
      requestAbort.abort();
      if (timer !== void 0) clearTimeout(timer);
      entry.ac.signal.removeEventListener("abort", abort);
    }
  }
};

// ../sdk/src/reattach.ts
function jittered(delay, factor) {
  if (factor <= 0) return delay;
  return Math.max(0, delay + delay * factor * (Math.random() * 2 - 1));
}
function overloadRetryAfter(e) {
  if (!(e instanceof JsonRpcError) || e.code !== AGNES_ERRORS.OVERLOADED) return null;
  const v = e.data.retryAfterMs;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}
var Reconnector = class {
  constructor(client2, opts = {}) {
    this.client = client2;
    this.base = opts.baseMs ?? 100;
    this.max = opts.maxMs ?? 5e3;
    this.jitter = opts.jitter ?? 0.2;
    this.rawSleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }
  client;
  base;
  max;
  jitter;
  rawSleep;
  // The loop's own lifetime: present exactly while a retry sequence is in flight, so a
  // second unexpected close while one is already running is not a second loop racing the
  // first, and stop() has a signal to abort.
  abort = null;
  loopPromise = null;
  // Non-user close ⇒ start (or, if one is already running, leave it alone - the same
  // failure reported twice is not two things to retry).
  onClosed(_info) {
    if (this.loopPromise) return;
    const abort = new AbortController();
    this.abort = abort;
    this.loopPromise = this.loop(abort.signal).finally(() => {
      if (this.abort === abort) this.abort = null;
      this.loopPromise = null;
    });
  }
  // Cancels a wait in progress and lets a step already running finish without starting
  // another retry. Idempotent, and safe to call whether or not a loop is running at all.
  stop() {
    this.abort?.abort(new Error("reconnect stopped"));
  }
  waitBackoff(ms, signal) {
    if (signal.aborted) return Promise.reject(signal.reason);
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      this.rawSleep(ms).then(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, reject);
    });
  }
  async loop(signal) {
    let delay = this.base;
    let exact = false;
    let attempts = 0;
    while (!signal.aborted) {
      attempts++;
      try {
        await this.waitBackoff(exact ? delay : jittered(delay, this.jitter), signal);
      } catch {
        return;
      }
      if (signal.aborted) return;
      try {
        await this.client.initialize();
        for (const session of this.client.sessions.values()) {
          if (signal.aborted) return;
          if (session.attached) await session.recover();
        }
        this.client.emit("reconnected", { attempts });
        return;
      } catch (e) {
        if (signal.aborted) return;
        const retryAfter = overloadRetryAfter(e);
        if (retryAfter !== null) {
          delay = retryAfter;
          exact = true;
        } else {
          delay = Math.min(this.max, delay * 2);
          exact = false;
        }
      }
    }
  }
};

// ../sdk/src/transport/types.ts
function classify(msg) {
  const hasId = "id" in msg && msg.id !== void 0;
  const hasMethod = "method" in msg && typeof msg.method === "string";
  if (hasId && hasMethod) return "request";
  if (hasId) return "response";
  return "notification";
}

// ../sdk/src/rpc.ts
var RpcConnection = class {
  constructor(factory, opts) {
    this.factory = factory;
    this.opts = opts;
  }
  factory;
  opts;
  transport = null;
  open = false;
  // Terminal, and deliberately separate from `open`: a transport that dropped can be
  // brought back (Task 15), a connection the owner closed cannot. Without this latch a
  // request after close() walks straight back into doConnect() and builds a second
  // transport - which for stdio means respawning a child the owner believed was killed.
  closed = false;
  // The close is memoised rather than guarded by a flag: a second close() has to wait
  // for the first one's teardown, not report success while it is still running.
  closingPromise = null;
  // The in-flight connect. Two concurrent connect() calls that each see `open === false`
  // build a transport each; the first is overwritten without being closed or unsubscribed
  // and keeps pouring messages into the same connection. Sharing one promise is what makes
  // connect idempotent.
  connecting = null;
  // Monotonic, and never reset - not even across a reconnect (Task 15): a late response
  // carries the old connection's id, and a reset would let it collide with a request of the
  // same number on the new one.
  nextId = 1;
  generation = 0;
  pending = /* @__PURE__ */ new Map();
  notificationHandlers = /* @__PURE__ */ new Set();
  serverRequestHandler = null;
  get connected() {
    return this.open;
  }
  async connect() {
    if (this.closed) throw new TransportClosed({ reason: "closed" });
    if (this.open) return;
    this.connecting ??= this.doConnect().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }
  async doConnect() {
    const generation = ++this.generation;
    const previous = this.transport;
    if (previous) {
      await previous.close();
      this.transport = null;
      if (this.closed) throw new TransportClosed({ reason: "closed" });
    }
    const early = [];
    const earlyClose = [];
    let ready = false;
    let ended = false;
    const transport = await this.factory({
      onMessage: (msg) => {
        if (generation !== this.generation || ended || this.closed) return;
        if (ready) this.dispatch(msg, generation);
        else early.push(msg);
      },
      onClose: (info) => {
        if (generation !== this.generation || ended) return;
        ended = true;
        if (ready) this.handleClose(info);
        else earlyClose.push(info);
      }
    });
    this.transport = transport;
    this.open = true;
    for (let i = 0; i < early.length; i++) {
      const m = early[i];
      if (m && !this.closed) this.dispatch(m, generation);
    }
    ready = true;
    const first = earlyClose[0];
    if (first) this.handleClose(first);
  }
  async request(method, params, opts = {}) {
    if (this.closed || !this.transport || !this.open) throw new TransportClosed({ reason: "closed" });
    const transport = this.transport;
    const signal = opts.signal;
    if (signal?.aborted) throw signal.reason;
    const id = this.nextId++;
    const msg = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      let timer;
      const onAbort = () => this.takePending(id)?.reject(signal?.reason);
      const cleanup = () => {
        if (timer !== void 0) clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };
      this.pending.set(id, {
        method,
        resolve: (value) => {
          cleanup();
          resolve(value);
        },
        reject: (error) => {
          cleanup();
          reject(error);
        }
      });
      const timeoutMs = opts.timeoutMs === void 0 ? this.opts.requestTimeoutMs : opts.timeoutMs;
      if (timeoutMs !== null)
        timer = setTimeout(() => {
          this.takePending(id)?.reject(new RequestTimeout(method, timeoutMs));
        }, timeoutMs);
      signal?.addEventListener("abort", onAbort, { once: true });
      transport.send(msg).catch((error) => {
        this.takePending(id)?.reject(error);
      });
    });
  }
  async notify(method, params) {
    if (this.closed || !this.transport || !this.open) throw new TransportClosed({ reason: "closed" });
    await this.transport.send({ jsonrpc: "2.0", method, params });
  }
  onNotification(h) {
    this.notificationHandlers.add(h);
    return () => {
      this.notificationHandlers.delete(h);
    };
  }
  // A single handler, last registration wins: the only server-to-client requests today are
  // the session/request_permission family, and the client fans those out to the sessions.
  // This layer does not multiplex.
  onServerRequest(h) {
    this.serverRequestHandler = h;
    return () => {
      if (this.serverRequestHandler === h) this.serverRequestHandler = null;
    };
  }
  close() {
    this.closed = true;
    this.closingPromise ??= this.doClose();
    return this.closingPromise;
  }
  async doClose() {
    if (this.connecting) await this.connecting.catch(() => void 0);
    const transport = this.transport;
    this.transport = null;
    if (!transport) return;
    try {
      await transport.close();
    } finally {
      if (this.open) this.handleClose({ reason: "closed" });
    }
  }
  takePending(id) {
    const p = this.pending.get(id);
    if (p) this.pending.delete(id);
    return p;
  }
  dispatch(msg, generation) {
    if (generation !== this.generation || this.closed) return;
    switch (classify(msg)) {
      case "response": {
        const r = msg;
        const p = this.takePending(r.id);
        if (!p) return;
        if (r.error) p.reject(new JsonRpcError(r.error));
        else p.resolve(r.result);
        return;
      }
      case "notification": {
        const n = msg;
        for (const h of this.notificationHandlers) h(n.method, n.params);
        return;
      }
      case "request": {
        const req = msg;
        const transport = this.transport;
        const reply = (body) => {
          if (!this.open || this.closed || generation !== this.generation || transport !== this.transport)
            return;
          transport?.send({ jsonrpc: "2.0", id: req.id, ...body }).catch(() => void 0);
        };
        const handler = this.serverRequestHandler;
        if (!handler) {
          reply({ error: rpcError("METHOD_NOT_FOUND") });
          return;
        }
        handler(req.method, req.params).then(
          (result2) => reply({ result: result2 }),
          (e) => reply({
            // A JsonRpcError from the handler goes back as it is (e.rpc is the lossless
            // wire shape); anything else becomes INTERNAL_ERROR, so no internal message
            // or stack leaks to the peer.
            error: e instanceof JsonRpcError ? e.rpc : {
              code: JSONRPC_ERRORS.INTERNAL_ERROR,
              message: "INTERNAL_ERROR",
              data: { code: "INTERNAL_ERROR" }
            }
          })
        );
      }
    }
  }
  handleClose(info) {
    if (!this.open) return;
    this.open = false;
    for (const id of [...this.pending.keys()]) this.takePending(id)?.reject(new TransportClosed(info));
    this.opts.onClose?.(info);
  }
};

// ../sdk/src/submit.ts
var invalid = () => new ProtocolViolation("invalid pending submit command");
function validated(command2, clientId, sessionId) {
  const copy = snapshotPending(command2);
  if (copy.method !== "_agnes/v1/submit" || !validateMethod(copy.method, "params", copy.params).ok)
    throw invalid();
  const params = copy.params;
  if (params.clientId !== clientId || params.commandId !== copy.commandId || params.payload?.sessionId !== sessionId || (params.kind === "fork" ? typeof params.payload.childKey !== "string" || !validateAgainst(SessionForkParams, params.payload).ok : params.kind === "compact" ? !validateAgainst(SessionCompactParams, { ...params.payload, commandId: params.commandId }).ok : params.kind === "sendNow" || params.kind === "removeQueued" ? !validateAgainst(params.kind === "sendNow" ? SessionSendNowParams : SessionRemoveQueuedParams, {
    ...params.payload,
    commandId: params.commandId
  }).ok : !["steer", "followUp"].includes(params.kind) || !validateAgainst(SessionSteerParams, { ...params.payload, commandId: params.commandId }).ok))
    throw invalid();
  return copy;
}
function result(ack, commandId) {
  if (ack.seq !== void 0) return ack.seq;
  if (ack.status === "uncertain")
    throw new JsonRpcError({ code: -32603, message: "UNCERTAIN", data: { code: "UNCERTAIN", commandId } });
  throw new ProtocolViolation("submit acknowledgement has no sequence");
}
function compactOutcome(ack) {
  const value = ack.compact;
  if (!value || typeof value !== "object" || Array.isArray(value)) return { state: "unknown" };
  const compact = value;
  if ((compact.state === "completed" || compact.state === "failed") && Number.isSafeInteger(compact.endSeq) && compact.endSeq >= 1)
    return { state: compact.state, endSeq: compact.endSeq };
  return compact.state === "unknown" ? { state: "unknown" } : { state: "unknown" };
}
function forkResult(ack, commandId) {
  const sessionId = ack.result?.sessionId;
  if (typeof sessionId === "string") return sessionId;
  if (ack.status === "uncertain")
    throw new JsonRpcError({ code: -32603, message: "UNCERTAIN", data: { code: "UNCERTAIN", commandId } });
  throw new ProtocolViolation("fork acknowledgement has no session id");
}
async function acknowledge(client2, clientId, sessionId, commandId) {
  try {
    await client2.call("_agnes/v1/submit.ack", { clientId, sessionId, commandId });
  } catch {
  }
}
async function submitCommand(client2, sessionId, kind, payload, commandId) {
  return (await submitCompactAware(client2, sessionId, kind, payload, commandId)).seq;
}
async function submitCompactAware(client2, sessionId, kind, payload, commandId) {
  let owned;
  try {
    owned = JSON.parse(jcs(payload));
  } catch {
    throw invalid();
  }
  const clientId = await client2.clientId();
  const id = commandId ?? await client2.journal.nextCommandId(sessionId);
  const command2 = validated(
    { commandId: id, method: "_agnes/v1/submit", params: { clientId, commandId: id, kind, payload: owned } },
    clientId,
    sessionId
  );
  await client2.journal.markPending(sessionId, structuredClone(command2));
  const ack = await client2.call(command2.method, command2.params).catch(async (error) => {
    if ((kind === "sendNow" || kind === "removeQueued") && error instanceof JsonRpcError && error.data.code === "QUEUED_INPUT_GONE")
      await client2.journal.clearPending(sessionId, command2.commandId);
    throw error;
  });
  if (ack.seq === void 0 && ack.status !== "uncertain")
    throw new ProtocolViolation("submit acknowledgement has no sequence");
  await client2.journal.clearPending(sessionId, command2.commandId);
  if (ack.status !== "uncertain") await acknowledge(client2, clientId, sessionId, command2.commandId);
  return { seq: result(ack, command2.commandId), compact: compactOutcome(ack) };
}
async function submitForkCommand(client2, sessionId, at, commandId) {
  const clientId = await client2.clientId();
  const id = commandId ?? await client2.journal.nextCommandId(sessionId);
  const childKey = `agnes:fork:${encodeURIComponent(clientId)}:${encodeURIComponent(id)}`;
  const command2 = validated(
    {
      commandId: id,
      method: "_agnes/v1/submit",
      params: {
        clientId,
        commandId: id,
        kind: "fork",
        payload: { sessionId, at, childKey }
      }
    },
    clientId,
    sessionId
  );
  await client2.journal.markPending(sessionId, structuredClone(command2));
  const ack = await client2.call(command2.method, command2.params);
  const forked = forkResult(ack, command2.commandId);
  await client2.journal.clearPending(sessionId, command2.commandId);
  await acknowledge(client2, clientId, sessionId, command2.commandId);
  return forked;
}
async function resendPending(client2, sessionId) {
  const clientId = await client2.clientId();
  const commands = (await client2.journal.pending(sessionId)).map(
    (command2) => validated(command2, clientId, sessionId)
  );
  for (const command2 of commands) {
    const params = command2.params;
    const ack = await client2.call(command2.method, command2.params).catch(async (error) => {
      if ((params.kind === "sendNow" || params.kind === "removeQueued") && error instanceof JsonRpcError && error.data.code === "QUEUED_INPUT_GONE") {
        await client2.journal.clearPending(sessionId, command2.commandId);
        return void 0;
      }
      throw error;
    });
    if (!ack) continue;
    if (params.kind === "fork") forkResult(ack, command2.commandId);
    else result(ack, command2.commandId);
    await client2.journal.clearPending(sessionId, command2.commandId);
    if (ack.status !== "uncertain") await acknowledge(client2, clientId, sessionId, command2.commandId);
  }
}

// ../sdk/src/session.ts
var REASON_FROM_STOP = {
  end_turn: "completed",
  max_turn_requests: "max_steps",
  cancelled: "aborted",
  refusal: "budget",
  max_tokens: "completed"
};
var EVENT_METHOD = "_agnes/v1/session.event";
var PREVIEW_METHOD = "_agnes/v1/session.preview";
var CURSOR_EVERY = 50;
var CURSOR_INTERVAL_MS = 2e3;
function sameFilter(a, b) {
  return a.acpUpdates === b.acpUpdates && a.preview === b.preview && sameList(a.types, b.types) && sameList(a.lanes, b.lanes);
}
function sameList(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}
function eventSeq(params) {
  const event = params.event;
  return typeof event?.seq === "number" ? event.seq : null;
}
function toContentBlocks(input) {
  return typeof input === "string" ? [{ type: "text", text: input }] : input;
}
function resultFromTurnEnd(end) {
  return {
    stopReason: end.reason === "error" ? "end_turn" : toAcpStopReason(end.reason),
    reason: end.reason,
    lastSeq: end.seq,
    ...end.credits ? { credits: end.credits } : {}
  };
}
function invalidUIProjection(detail) {
  throw new ProtocolViolation(`invalid UI projection response: ${detail}`);
}
function encodedBytes(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
function checkOpeningResult(sessionId, result2, maxNodes = UI_OPENING_DEFAULT_MAX_NODES, maxBytes = UI_PROJECTION_DEFAULT_MAX_BYTES) {
  const { timeline, history: history2 } = result2;
  if (timeline.sessionId !== sessionId) invalidUIProjection("opening session mismatch");
  if (timeline.nodes.length > maxNodes) invalidUIProjection("opening node limit exceeded");
  if (encodedBytes(result2) > maxBytes) invalidUIProjection("opening byte limit exceeded");
  if (history2.startIndex + timeline.nodes.length !== history2.totalNodes)
    invalidUIProjection("opening window coordinates mismatch");
  if (history2.hasEarlier !== history2.startIndex > 0) invalidUIProjection("opening continuation mismatch");
}
function checkHistoryPage(sessionId, page, limit = UI_HISTORY_DEFAULT_LIMIT, maxBytes = UI_PROJECTION_DEFAULT_MAX_BYTES) {
  if (page.sessionId !== sessionId) invalidUIProjection("history session mismatch");
  if (page.nodes.length > limit) invalidUIProjection("history node limit exceeded");
  if (encodedBytes(page) > maxBytes) invalidUIProjection("history byte limit exceeded");
  if (page.startIndex + page.nodes.length > page.totalNodes)
    invalidUIProjection("history page coordinates mismatch");
  if (page.hasEarlier !== page.startIndex > 0) invalidUIProjection("history continuation mismatch");
}
var Session = class {
  constructor(client2, id, cwd) {
    this.client = client2;
    this.id = id;
    this.workspace = cwd || null;
  }
  client;
  id;
  // Position and subscription state are readable but not writable: `attach()` and
  // `events()` are how they change. A consumer that sets `attached = false` by hand gets
  // a second subscription racing the first, and one that edits `filter` gets a stream
  // that no longer matches what it says it is.
  seq = 0;
  gen = 0;
  serverSeq = 0;
  isAttached = false;
  currentFilter = { acpUpdates: false };
  attaching = null;
  streamRecoveryTimer = null;
  streamRecoveryEpoch = 0;
  streamRecoveryAttempts = 0;
  lastTurnEnd = null;
  // The promptTurnId off the most recent notification carrying harness meta, regardless of
  // phase. A prompt() that loses its transport uses this to recognise the terminal
  // notification for *its own* turn once the connection comes back - never just the next
  // terminalQuiescence to come along, which could belong to a turn started after it.
  lastPromptTurnId = null;
  // One entry per prompt() parked waiting for that terminal notification, settled the
  // moment the session closes for good - a wait nothing will ever answer otherwise, once
  // reconnection itself has been given up on.
  quiescenceWaiters = /* @__PURE__ */ new Set();
  // Two watermarks, deliberately separate. `lastAdmitted` is the highest row let
  // through to the iterators, and is what makes a replayed prefix cheap to ignore.
  // `lastApplied` is the highest row a consumer actually took, and is the only honest
  // thing to persist as a cursor - anything still sitting in a buffer is not read yet.
  // Both are session-wide, which is exactly right for the delivery gate and a known
  // limit of the persisted cursor: with two iterators reading at different speeds,
  // `lastApplied` tracks the leading one, so a restart resumes past rows the lagging
  // one had buffered but never took. One consumer per session is the shape we ship.
  lastAdmitted = 0;
  lastApplied = 0;
  overflowed = false;
  cursorDirty = 0;
  cursorTimer = null;
  isClosed = false;
  // A runtime worker may be reclaimed while this client transport stays connected. Reopening the
  // durable session is only safe with the workspace supplied by session.new/load; never infer one
  // from process.cwd() in a browser-capable SDK.
  workspace;
  restoring = null;
  permission = new PermissionGate();
  onPermissionRequest(handler) {
    return this.permission.register(handler);
  }
  answerPermission(request) {
    return this.permission.answer(request);
  }
  listeners = /* @__PURE__ */ new Set();
  // One entry per live iterator, called when the connection goes away: a reader
  // parked in `next()` is waiting on a stream that will never produce again.
  enders = /* @__PURE__ */ new Set();
  /** Called when a later explicit load supplies information an older cached handle lacked. */
  rememberWorkspace(cwd) {
    if (cwd) this.workspace = cwd;
  }
  get lastSeq() {
    return this.seq;
  }
  get generation() {
    return this.gen;
  }
  /** What the server reported as its own last row at the most recent attach. */
  get lastServerSeq() {
    return this.serverSeq;
  }
  get attached() {
    return this.isAttached;
  }
  get closed() {
    return this.isClosed;
  }
  /** A copy: the filter in force is a fact about the subscription, not a handle on it. */
  get filter() {
    return { ...this.currentFilter };
  }
  cursor() {
    return { fromSeq: this.seq, generation: this.gen };
  }
  /** Entry point for everything the client routes to this session id. */
  onNotification(method, params) {
    if (method === EVENT_METHOD) {
      const seq = eventSeq(params);
      if (seq === null || seq <= this.lastAdmitted) return;
      const row = validateEvent(params.event);
      if (!row.ok) {
        this.client.notice({ kind: "invalid-event", sessionId: this.id, seq, errors: row.errors });
        return;
      }
      this.streamRecoveryAttempts = 0;
      this.lastAdmitted = seq;
    }
    const meta = getHarnessMeta(params);
    if (meta) {
      this.lastPromptTurnId = meta.promptTurnId;
      if (meta.eventSequence > this.seq) this.seq = meta.eventSequence;
      if (meta.generation > this.gen) this.gen = meta.generation;
      if (meta.turnEnd)
        this.lastTurnEnd = {
          reason: meta.turnEnd.reason,
          seq: meta.eventSequence,
          ...meta.credits ? { credits: meta.credits } : {}
        };
    }
    for (const l of [...this.listeners]) l(method, params, meta);
  }
  // The in-flight attach is registered before the first await inside, so anything that
  // asks for one in the same tick waits for it instead of racing it: two attaches in
  // flight together settle `generation` and `filter` in whichever order they land.
  attach(opts = {}) {
    const p = this.doAttach(opts).finally(() => {
      if (this.attaching === p) this.attaching = null;
    });
    this.attaching = p;
    return p;
  }
  // Waits behind an attach already in flight, then attaches only if the subscription is
  // not already the one being asked for. Without the filter check an events(opts) call on
  // an already-attached session sends nothing at all, and the caller silently gets the
  // unfiltered stream it did not ask for.
  async ensureAttached(filter, initialCursor) {
    while (this.attaching) await this.attaching.catch(() => void 0);
    if (this.isClosed || this.overflowed) return;
    if (this.isAttached && sameFilter(this.currentFilter, filter)) return;
    await this.attach({
      filter,
      // Re-subscribing, not starting: resume from where this session already is.
      ...this.isAttached ? { cursor: { fromSeq: this.lastApplied, generation: this.gen } } : initialCursor ? { cursor: initialCursor } : {}
    });
  }
  async doAttach(opts = {}) {
    const stored = opts.cursor ?? await this.client.journal.cursor(this.id);
    const cursor = stored && stored.generation >= 1 ? stored : null;
    this.currentFilter = { acpUpdates: false, ...opts.filter ?? {} };
    const params = {
      sessionId: this.id,
      ...cursor ? { cursor } : {},
      filter: this.currentFilter
    };
    const r = await this.client.call("_agnes/v1/session.attach", params);
    this.gen = r.generation;
    this.serverSeq = r.lastSeq;
    if (cursor) {
      this.seq = Math.max(this.seq, cursor.fromSeq);
      this.lastAdmitted = Math.max(this.lastAdmitted, cursor.fromSeq);
      this.lastApplied = Math.max(this.lastApplied, cursor.fromSeq);
    }
    this.isAttached = true;
  }
  /** Recover only the dropped event subscription; never resend mutations or move approvals. */
  onStreamOverloaded() {
    if (!this.isAttached && !this.attaching || this.isClosed || this.overflowed || this.streamRecoveryTimer)
      return;
    if (++this.streamRecoveryAttempts > 3) {
      this.isAttached = false;
      this.client.notice({ kind: "stream-recovery-failed", sessionId: this.id });
      return;
    }
    const epoch = this.streamRecoveryEpoch;
    this.streamRecoveryTimer = setTimeout(() => {
      this.streamRecoveryTimer = null;
      void (async () => {
        while (this.attaching) await this.attaching.catch(() => void 0);
        if (epoch !== this.streamRecoveryEpoch || this.isClosed || !this.isAttached) return;
        try {
          await this.attachForRecovery({ fromSeq: this.lastApplied, generation: this.gen });
        } catch {
          this.isAttached = false;
          this.client.notice({ kind: "stream-recovery-failed", sessionId: this.id });
        }
      })();
    }, 500);
  }
  cancelStreamRecovery() {
    this.streamRecoveryEpoch++;
    if (this.streamRecoveryTimer) clearTimeout(this.streamRecoveryTimer);
    this.streamRecoveryTimer = null;
  }
  async detach() {
    this.cancelStreamRecovery();
    this.overflowed = false;
    while (this.attaching) await this.attaching.catch(() => void 0);
    await this.client.call("_agnes/v1/session.detach", { sessionId: this.id });
    this.isAttached = false;
    await this.flushCursor();
  }
  // Called by the reconnect loop (Reconnector, in reattach.ts) for every session that was
  // still `attached` when the transport dropped - `isAttached` itself is left alone by a
  // mere drop, so it is exactly the caller's own intent, independent of whatever the
  // connection is doing. Resends this session's pending writes before touching attach at
  // all: a steer sitting in the journal from before the drop must reach the server before
  // the event stream resumes, never after.
  async recover() {
    await this.client.resendPending(this.id);
    const cursor = { fromSeq: this.lastApplied, generation: this.gen };
    try {
      await this.attachForRecovery(cursor);
    } catch (e) {
      if (!this.isSessionNotFound(e) || !this.workspace) throw e;
      await this.restoreAfterReclaim();
    }
  }
  /** Applies the two cursor repairs shared by transport reconnect and idle-worker restoration. */
  async attachForRecovery(cursor) {
    try {
      await this.attach({ cursor, filter: this.currentFilter });
    } catch (e) {
      if (!(e instanceof JsonRpcError)) throw e;
      if (e.code === AGNES_ERRORS.GENERATION_STALE) {
        const generation = Number(e.data.generation);
        this.gen = generation;
        this.client.emit("generationChanged", { sessionId: this.id, generation });
        await this.attach({ cursor: { fromSeq: cursor.fromSeq, generation }, filter: this.currentFilter });
        return;
      }
      if (e.code === AGNES_ERRORS.CURSOR_OUT_OF_RANGE) {
        const earliestSeq = Number(e.data.earliestSeq);
        this.client.emit("gap", { sessionId: this.id, earliestSeq });
        this.lastApplied = Math.max(0, earliestSeq - 1);
        await this.attach({
          cursor: { fromSeq: this.lastApplied, generation: this.gen },
          filter: this.currentFilter
        });
        return;
      }
      throw e;
    }
  }
  isSessionNotFound(error) {
    return error instanceof JsonRpcError && error.code === AGNES_ERRORS.SESSION_NOT_FOUND;
  }
  /** One load/attach sequence per handle, even if several callers observe the reclaimed worker. */
  restoreAfterReclaim() {
    if (this.restoring) return this.restoring;
    const cwd = this.workspace;
    if (!cwd) return Promise.reject(new Error("session workspace unavailable"));
    const wasAttached = this.isAttached;
    const restoring = (async () => {
      await this.client.restoreSession(this.id, cwd);
      if (wasAttached) {
        await this.attachForRecovery({ fromSeq: this.lastApplied, generation: this.gen });
      }
    })().finally(() => {
      if (this.restoring === restoring) this.restoring = null;
    });
    this.restoring = restoring;
    return restoring;
  }
  budget() {
    return this.client.call("_agnes/v1/session.budget", { sessionId: this.id });
  }
  setPreset(preset) {
    return this.client.call("_agnes/v1/session.setPreset", {
      sessionId: this.id,
      preset
    });
  }
  setModel(sel) {
    return this.client.call("_agnes/v1/session.setModel", { sessionId: this.id, ...sel });
  }
  setYolo(enabled) {
    return this.client.call("_agnes/v1/session.setYolo", {
      sessionId: this.id,
      enabled
    });
  }
  projectUI(upto, opts = {}) {
    return this.client.call("_agnes/v1/session.projectUI", {
      sessionId: this.id,
      ...upto !== void 0 ? { upto } : {},
      ...opts.surface !== void 0 ? { surface: opts.surface } : {}
    });
  }
  projectUIPatch(after, upto, opts = {}) {
    return this.client.call("_agnes/v1/session.projectUIPatch", {
      sessionId: this.id,
      after,
      ...upto !== void 0 ? { upto } : {},
      ...opts.surface !== void 0 ? { surface: opts.surface } : {}
    });
  }
  /**
   * Reads a bounded tail window at one stable ledger cut. The returned opaque history cursor is
   * only for projectUIHistory(); it is deliberately unrelated to the live event attach cursor.
   */
  async projectUIOpening(opts = {}) {
    const result2 = await this.client.call("_agnes/v1/session.projectUIOpening", {
      sessionId: this.id,
      ...opts.surface !== void 0 ? { surface: opts.surface } : {},
      ...opts.maxNodes !== void 0 ? { maxNodes: opts.maxNodes } : {},
      ...opts.maxBytes !== void 0 ? { maxBytes: opts.maxBytes } : {}
    });
    checkOpeningResult(this.id, result2, opts.maxNodes, opts.maxBytes);
    return result2;
  }
  /** Reads the next older page without moving the live event/projection watermark. */
  async projectUIHistory(cursor, opts = {}) {
    const result2 = await this.client.call("_agnes/v1/session.projectUIHistory", {
      sessionId: this.id,
      cursor,
      ...opts.limit !== void 0 ? { limit: opts.limit } : {},
      ...opts.maxBytes !== void 0 ? { maxBytes: opts.maxBytes } : {}
    });
    checkHistoryPage(this.id, result2, opts.limit, opts.maxBytes);
    return result2;
  }
  /** Reads one durable tool call and its optional result without changing the live attach cursor. */
  async readToolDetail(callSeq, resultSeq, opts = {}) {
    let complete;
    let offset = 0;
    let totalBytes;
    for (; ; ) {
      opts.signal?.throwIfAborted();
      const page = await this.client.call("_agnes/v1/session.readToolDetail", {
        sessionId: this.id,
        callSeq,
        ...resultSeq === void 0 ? {} : { resultSeq },
        offset
      });
      opts.signal?.throwIfAborted();
      if (page.sessionId !== this.id || page.callSeq !== callSeq || page.resultSeq !== resultSeq || page.offset !== offset || totalBytes !== void 0 && page.totalBytes !== totalBytes)
        throw new ProtocolViolation("invalid tool detail response: coordinates mismatch");
      if (!Number.isSafeInteger(page.totalBytes) || page.totalBytes > 64 * 1024 * 1024)
        throw new ProtocolViolation("invalid tool detail response: total byte limit");
      totalBytes = page.totalBytes;
      complete ??= new Uint8Array(totalBytes);
      let binary;
      try {
        binary = atob(page.data);
      } catch {
        throw new ProtocolViolation("invalid tool detail response: base64");
      }
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      if (bytes.byteLength > 256 * 1024 || offset + bytes.byteLength > totalBytes || page.nextOffset !== (offset + bytes.byteLength < totalBytes ? offset + bytes.byteLength : null) || page.nextOffset !== null && bytes.byteLength === 0)
        throw new ProtocolViolation("invalid tool detail response: page bounds");
      complete.set(bytes, offset);
      if (page.nextOffset === null) break;
      offset = page.nextOffset;
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(complete));
    } catch {
      throw new ProtocolViolation("invalid tool detail response: JSON");
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      throw new ProtocolViolation("invalid tool detail response: shape");
    const detail = parsed;
    const keys = Object.keys(detail).sort().join(",");
    if (keys !== (resultSeq === void 0 ? "call" : "call,result"))
      throw new ProtocolViolation("invalid tool detail response: fields");
    if (!validateAgainst(ToolCall, detail.call).ok || resultSeq !== void 0 && !validateAgainst(ToolResult, detail.result).ok)
      throw new ProtocolViolation("invalid tool detail response: event data");
    const call = detail.call;
    const result2 = detail.result;
    if (result2 && result2.toolUseId !== call.toolUseId)
      throw new ProtocolViolation("invalid tool detail response: tool identity");
    return { call, ...result2 ? { result: result2 } : {} };
  }
  async prompt(input, opts = {}) {
    const before = this.lastTurnEnd;
    const onAbort = () => {
      this.cancel().catch(() => void 0);
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    try {
      return await this.requestPrompt(input, before, false, opts.titleLocale);
    } finally {
      opts.signal?.removeEventListener("abort", onAbort);
    }
  }
  async requestPrompt(input, before, restored = false, titleLocale) {
    try {
      const r = await this.client.call(
        "session/prompt",
        {
          sessionId: this.id,
          prompt: toAcpPrompt(toContentBlocks(input)),
          ...titleLocale ? { _meta: { "ai.agnes.harness": { titleLocale } } } : {}
        },
        { timeoutMs: null }
      );
      const end = this.lastTurnEnd !== before && this.lastTurnEnd && this.lastTurnEnd.reason !== "error" && toAcpStopReason(this.lastTurnEnd.reason) === r.stopReason ? this.lastTurnEnd : null;
      return {
        stopReason: r.stopReason,
        reason: end?.reason ?? REASON_FROM_STOP[r.stopReason],
        lastSeq: end?.seq ?? this.seq,
        ...end?.credits ? { credits: end.credits } : {}
      };
    } catch (e) {
      if (!restored && this.workspace && this.isSessionNotFound(e)) {
        await this.restoreAfterReclaim();
        return this.requestPrompt(input, before, true, titleLocale);
      }
      if (e instanceof TransportClosed && !this.client.shuttingDown && !this.client.isClosed) {
        if (this.lastTurnEnd !== before && this.lastTurnEnd) return resultFromTurnEnd(this.lastTurnEnd);
        return this.waitForQuiescence(this.lastPromptTurnId);
      }
      throw e;
    }
  }
  // Parked until the notification for *this* turn's end reaches this session, or the
  // session closes for good without ever delivering one. `turnId` pins which turn: without
  // it, a `terminalQuiescence` belonging to whatever prompt happens to run next would be
  // mistaken for this one's answer.
  waitForQuiescence(turnId) {
    return new Promise((resolve, reject) => {
      const listener = (_method, _params, meta) => {
        if (!meta || meta.phase !== "terminalQuiescence" && meta.phase !== "parked") return;
        if (turnId !== null && meta.promptTurnId !== turnId) return;
        cleanup();
        resolve(
          resultFromTurnEnd({
            reason: meta.turnEnd?.reason ?? "completed",
            seq: meta.eventSequence,
            ...meta.credits ? { credits: meta.credits } : {}
          })
        );
      };
      const onClose = (err) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        this.listeners.delete(listener);
        this.quiescenceWaiters.delete(onClose);
      };
      this.listeners.add(listener);
      this.quiescenceWaiters.add(onClose);
    });
  }
  steer(input, opts = {}) {
    return this.write("steer", input, opts);
  }
  followUp(input, opts = {}) {
    return this.write("followUp", input, opts);
  }
  /** Stop the current turn and run this existing inbox item first, without re-enqueuing its content. */
  sendNow(itemId, opts = {}) {
    return submitCommand(this.client, this.id, "sendNow", { sessionId: this.id, itemId }, opts.commandId);
  }
  /** Remove an existing pending input without stopping the current turn or starting another one. */
  removeQueued(itemId, opts = {}) {
    return submitCommand(this.client, this.id, "removeQueued", { sessionId: this.id, itemId }, opts.commandId);
  }
  compact(instructions, opts = {}) {
    return submitCommand(
      this.client,
      this.id,
      "compact",
      { sessionId: this.id, ...instructions ? { instructions } : {} },
      opts.commandId
    );
  }
  compactDetailed(instructions, opts = {}) {
    return submitCompactAware(
      this.client,
      this.id,
      "compact",
      { sessionId: this.id, ...instructions ? { instructions } : {} },
      opts.commandId
    ).then(({ compact }) => compact);
  }
  write(kind, input, opts) {
    return submitCommand(
      this.client,
      this.id,
      kind,
      { sessionId: this.id, content: toContentBlocks(input) },
      opts.commandId
    );
  }
  // A notification, not a request: cancellation is reported through the turn's own
  // stop reason, so there is nothing to wait for here.
  async cancel() {
    await this.client.notify("session/cancel", { sessionId: this.id });
  }
  // Stopping the stream is better than growing without bound: the daemon keeps the
  // ledger, so a client that cannot keep up drops the subscription and comes back for
  // the part it missed rather than holding an ever larger backlog in memory.
  async detachForOverflow() {
    if (this.overflowed) return;
    this.overflowed = true;
    this.isAttached = false;
    await this.client.call("_agnes/v1/session.detach", { sessionId: this.id }).catch(() => void 0);
  }
  reattachAfterDrain() {
    if (!this.overflowed || this.isClosed) return;
    this.overflowed = false;
    this.attach({
      cursor: { fromSeq: this.lastApplied, generation: this.gen },
      filter: this.currentFilter
    }).catch(() => {
      this.overflowed = true;
    });
  }
  noteApplied(seq) {
    if (seq > this.lastApplied) this.lastApplied = seq;
    this.cursorDirty++;
    if (this.cursorDirty >= CURSOR_EVERY) {
      this.flushCursor().catch(() => void 0);
      return;
    }
    this.cursorTimer ??= setTimeout(() => {
      this.cursorTimer = null;
      this.flushCursor().catch(() => void 0);
    }, CURSOR_INTERVAL_MS);
  }
  flushCursor() {
    if (this.cursorTimer) {
      clearTimeout(this.cursorTimer);
      this.cursorTimer = null;
    }
    this.cursorDirty = 0;
    if (this.gen < 1) return Promise.resolve();
    return this.client.journal.setCursor(this.id, {
      fromSeq: this.lastApplied,
      generation: this.gen
    });
  }
  // Called by the client when the connection is gone for good. The returned promise is
  // the cursor write this session owes: close() waits for it, so the position a resume
  // reads is the position the consumer actually reached.
  onClosed() {
    this.cancelStreamRecovery();
    if (this.isClosed) return Promise.resolve();
    this.isClosed = true;
    this.permission.close();
    this.isAttached = false;
    const ends = [...this.enders];
    this.enders.clear();
    for (const end of ends) end();
    const waiters = [...this.quiescenceWaiters];
    this.quiescenceWaiters.clear();
    for (const reject of waiters) reject(new TransportClosed({ reason: "closed" }));
    return this.flushCursor().catch(() => void 0);
  }
  /**
   * Streamed model text for this session, as it arrives. It is not a ledger row: it has no seq, may
   * be lost or repeated, and is replaced by the committed answer; merge it with `PreviewMerger`.
   * Delivered only while this session is attached with `preview: true`.
   */
  onPreview(fn) {
    const listener = (method, params) => {
      if (method !== PREVIEW_METHOD) return;
      if (!validateMethod(PREVIEW_METHOD, "params", params).ok) return;
      fn(params);
    };
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  events(opts = {}) {
    const session = this;
    const { cursor: initialCursor, ...requestedFilter } = opts;
    const limit = this.client.bufferLimit;
    const drainMark = Math.floor(limit / 2);
    return {
      [Symbol.asyncIterator]() {
        const queue = [];
        const waiters = [];
        let done = false;
        const wakeAll = () => {
          for (const w of waiters.splice(0)) w();
        };
        let ended = false;
        const listener = (method, params, meta) => {
          if (method !== EVENT_METHOD || !meta) return;
          queue.push({ ...params.event, _meta: meta });
          if (queue.length > limit) void session.detachForOverflow();
          wakeAll();
        };
        const end = () => {
          ended = true;
          session.listeners.delete(listener);
          wakeAll();
        };
        session.listeners.add(listener);
        session.enders.add(end);
        if (session.isClosed) end();
        const ensure = session.ensureAttached({ ...requestedFilter, acpUpdates: false }, initialCursor);
        const finish = async () => {
          done = true;
          session.listeners.delete(listener);
          session.enders.delete(end);
          wakeAll();
          await session.flushCursor().catch(() => void 0);
          return { value: void 0, done: true };
        };
        return {
          async next() {
            await ensure;
            while (!done) {
              const e = queue.shift();
              if (e) {
                session.noteApplied(e.seq);
                if (queue.length <= drainMark) session.reattachAfterDrain();
                return { value: e, done: false };
              }
              if (ended) break;
              await new Promise((r) => {
                waiters.push(r);
              });
            }
            return { value: void 0, done: true };
          },
          return: finish,
          async throw(e) {
            await finish();
            throw e;
          }
        };
      }
    };
  }
};

// ../sdk/src/text.ts
var TEXT = {
  en: {
    blocked: "This request was blocked by the safety screen.",
    unavailable: "Approval is unavailable right now, so the action was not performed."
  },
  "zh-CN": {
    blocked: "该请求已被安全筛拦截。",
    unavailable: "当前无法完成审批，操作未执行。"
  }
};
function textFor(locale) {
  return TEXT[locale] ?? TEXT.en;
}

// ../sdk/src/transport/inproc.ts
function inprocTransport(endpoint) {
  return async (handlers) => {
    let open3 = true;
    void (async () => {
      try {
        for await (const m of endpoint.notifications) {
          if (!open3) break;
          handlers.onMessage(m);
        }
      } catch (error) {
        if (open3) {
          open3 = false;
          handlers.onClose({ reason: "error", error });
        }
        return;
      }
      if (open3) {
        open3 = false;
        handlers.onClose({ reason: "eof" });
      }
    })();
    const transport = {
      kind: "inproc",
      async send(msg) {
        const reply = await endpoint.handle(msg);
        if (reply) queueMicrotask(() => handlers.onMessage(reply));
      },
      async close() {
        const wasOpen = open3;
        open3 = false;
        await endpoint.close();
        if (wasOpen) handlers.onClose({ reason: "closed" });
      }
    };
    return transport;
  };
}

// ../sdk/src/client.ts
function knownMethod(method) {
  return Object.hasOwn(METHODS, method);
}
var UNLISTED = {};
var Client = class {
  // Connection/options stay private so consumers cannot bypass client bookkeeping or expose auth.
  conn;
  journal;
  timeouts;
  locale;
  bufferLimit;
  claim;
  text = {
    blocked: () => textFor(this.locale).blocked,
    unavailable: () => textFor(this.locale).unavailable
  };
  emitter = new Emitter();
  state = "idle";
  auth;
  initPromise = null;
  initAbort;
  closing = false;
  closePromise = null;
  closedPromise = null;
  clientIdCache = null;
  sessionTable = /* @__PURE__ */ new Map();
  reconnector;
  brandingCache = null;
  // Latched by a `daemon.notice{kind:'shutting_down'}`: the next transport close is the
  // daemon going away on purpose, not a drop to retry through.
  shuttingDown = false;
  constructor(opts) {
    const providers = {
      local: () => localAuth(),
      jwt: (o) => {
        if (o.kind !== "jwt") throw new Unsupported("jwt option");
        return jwtAuth(o.token);
      },
      "portal-identity": (o) => {
        if (o.kind !== "portal-identity") throw new Unsupported("portal option");
        return portalIdentityAuth(o.token);
      },
      ...opts.authProviders ?? {}
    };
    const authOpt = opts.auth ?? { kind: "local" };
    const makeAuth = providers[authOpt.kind];
    if (!makeAuth) throw new Unsupported(`auth kind ${authOpt.kind}`);
    this.auth = makeAuth(authOpt);
    this.journal = opts.journal ?? memoryJournal(opts.clientId);
    this.timeouts = {
      request: opts.timeouts?.request ?? 3e4,
      initialize: opts.timeouts?.initialize ?? 1e4,
      claim: opts.timeouts?.claim ?? 4e3
    };
    if (!Number.isInteger(this.timeouts.initialize) || this.timeouts.initialize < 0 || this.timeouts.initialize > 2147483647)
      throw new TypeError("invalid initialize timeout");
    this.locale = opts.locale ?? "en";
    this.bufferLimit = opts.bufferLimit ?? 1e3;
    const factories = {
      inproc: (o) => inprocTransport(o.endpoint),
      ...opts.transportFactories ?? {}
    };
    const factory = factories[opts.transport.kind];
    if (!factory) throw new Unsupported(`transport ${opts.transport.kind}`);
    this.conn = new RpcConnection(factory(opts.transport), {
      requestTimeoutMs: this.timeouts.request,
      onClose: (info) => this.onTransportClose(info)
    });
    this.reconnector = new Reconnector(this, opts.reconnect);
    this.conn.onNotification((method, params) => this.dispatchNotification(method, params));
    this.conn.onServerRequest(async (method, params) => {
      if (method !== "session/request_permission") throw new JsonRpcError(rpcError("METHOD_NOT_FOUND"));
      if (!validateMethod("session/request_permission", "params", params).ok)
        throw new JsonRpcError(rpcError("INVALID_PARAMS"));
      const request = params;
      const deadline = request._meta?.[META_KEY]?.deadline;
      const clean = {
        sessionId: request.sessionId,
        toolCall: request.toolCall,
        options: request.options,
        ...deadline !== void 0 ? { deadlineMs: Date.parse(deadline) } : {}
      };
      if (clean.deadlineMs !== void 0 && !Number.isFinite(clean.deadlineMs)) return rejectPermission(clean);
      return this.sessionTable.get(clean.sessionId)?.answerPermission(clean) ?? rejectPermission(clean);
    });
    this.claim = makeClaim(this, opts.claimStrict ?? false);
  }
  // The reconnect loop's view of what to recover, and the browser build's own inspection
  // surface: neither needs (or gets) a way to add or remove an entry directly.
  get sessions() {
    return this.sessionTable;
  }
  // True once close() has been called, OR the daemon has announced it is shutting down
  // (`shuttingDown`, latched by dispatchNotification): either way the client is done for
  // good, not merely between reconnect attempts. A call in flight fails fast instead of
  // quietly reconnecting on the caller's behalf - this is the single check every entry
  // point below guards on, so a consumer that only knows about the explicit close() path
  // (or none at all) still gets refused rather than silently handed a second real
  // connection behind a `closed` event that already told every listener there would not
  // be one. Session uses it to tell "the transport died, wait for the reconnect to settle
  // this turn" from "the client is going away for good."
  get isClosed() {
    return this.closing || this.shuttingDown;
  }
  /** Connected means the handshake and any attached-session recovery have both completed. */
  get connectionState() {
    return this.state;
  }
  setConnectionState(next) {
    if (this.state === next || this.state === "closed") return;
    this.state = next;
    this.emitter.emit("connectionStateChanged", next);
  }
  /** Shared deployment configuration. Secrets are submitted only, never returned or journaled. */
  config = {
    oauth: (input) => this.call(
      "_agnes/v1/config.oauth",
      input,
      input.action === "commit" ? { timeoutMs: Math.max(this.timeouts.request, 9e4) } : {}
    ),
    account: (input) => this.call("_agnes/v1/config.account", input),
    get: () => this.call("_agnes/v1/config.get", {}),
    providers: () => this.call("_agnes/v1/config.providers", {}),
    test: (input) => this.call(
      "_agnes/v1/config.test",
      input,
      ["anthropic", "github-copilot", "kimi-coding", "openai-codex", "xai"].includes(input.providerId) ? { timeoutMs: Math.max(this.timeouts.request, 9e4) } : {}
    ),
    save: (input) => this.call(
      "_agnes/v1/config.save",
      input,
      ["anthropic", "github-copilot", "kimi-coding", "openai-codex", "xai"].includes(input.providerId) ? { timeoutMs: Math.max(this.timeouts.request, 9e4) } : {}
    )
  };
  workspace = {
    list: () => this.call("_agnes/v1/workspace.list", {}),
    add: (path) => this.call("_agnes/v1/workspace.add", { path })
  };
  /**
   * The current Surface mount->endpoint table. This is how the CLI/Web OS process (`agnes serve`,
   * a separate process from `agnesd`) learns where each mounted Surface's loopback listener is, to
   * build `createMountProxy`'s lookup() across that process boundary (packages/cli/launch/web-command.ts).
   */
  surfaces = {
    mounts: () => this.call("_agnes/v1/surfaces.mounts", {})
  };
  /**
   * Skins contributed by installed packages. The caller supplies its own profile — the daemon scope
   * accepts exactly that one — and `cssUrl` is same-origin, so the client fetches it directly.
   */
  skins = {
    list: (profile) => this.call("_agnes/v1/skins.list", { profile }),
    /**
     * Bytes for one `/skins/...` path. The launcher's asset proxy needs the file contents, and the
     * path never leaves the URL space: the daemon resolves it against its own roster (design §22).
     */
    read: (profile, path) => this.call("_agnes/v1/skins.read", { profile, path })
  };
  /**
   * Web client modules contributed by installed packages (design WC2/WC3). The page calls `list`
   * directly; `read` is for the launcher's asset proxy — the path stays in the `/plugins/` URL
   * space and the daemon answers only from its immutable snapshots.
   */
  clientModules = {
    /**
     * Returns the row-level browser projection. Older daemons may only send the compatibility
     * modules/statuses fields; normalize that response locally so callers get the same `rows`
     * contract without ever exposing config, credentials, or raw runtime artifacts.
     */
    list: async (profile) => projectClientModuleRows(
      await this.call("_agnes/v1/clientModules.list", { profile })
    ),
    read: (profile, path) => this.call("_agnes/v1/clientModules.read", { profile, path }),
    /** Private launcher BFF only; it is not exposed by the browser SDK surface. */
    callService: (input) => this.call("_agnes/v1/clientModules.callService", input),
    /** Private launcher BFF only; browser builds reject this method. */
    callEffect: (input) => this.call("_agnes/v1/clientModules.callEffect", input)
  };
  session = {
    new: async (o) => {
      const meta = {};
      if (o.preset) meta.preset = o.preset;
      if (o.sessionKey) meta.sessionKey = o.sessionKey;
      const r = await this.call("session/new", {
        cwd: o.cwd,
        mcpServers: [],
        _meta: { [META_KEY]: meta }
      });
      return this.sessionHandle(r.sessionId, o.cwd);
    },
    // The vendored request shape makes cwd and mcpServers mandatory. An omitted cwd means the
    // daemon must recover an existing session's immutable durable workspace or reject an unknown
    // id. A supplied cwd is only a lookup hint. The daemon must match it to an already registered
    // workspace and must never treat session.load as workspace.add.
    load: async (id, o = {}) => {
      const session = this.sessionHandle(id);
      const offPermission2 = o.onPermissionRequest ? session.onPermissionRequest(o.onPermissionRequest) : void 0;
      if (offPermission2) {
        try {
          o.onPermissionRequestRegistered?.(offPermission2);
        } catch (error) {
          offPermission2();
          throw error;
        }
      }
      try {
        await this.call("session/load", { sessionId: id, cwd: o.cwd ?? "", mcpServers: [] });
        if (o.cwd) session.rememberWorkspace(o.cwd);
        return session;
      } catch (error) {
        offPermission2?.();
        throw error;
      }
    },
    attach: async (id, o = {}) => {
      const s = this.sessionHandle(id);
      await s.attach(o);
      return s;
    },
    list: (o = {}) => this.call("_agnes/v1/session.list", o),
    rename: (sessionId, title) => this.call("_agnes/v1/session.rename", { sessionId, title }),
    archive: (sessionId, archived) => this.call("_agnes/v1/session.archive", { sessionId, archived }),
    fork: async (id, at) => {
      const childId = await submitForkCommand(this, id, at);
      return this.sessionHandle(childId);
    }
  };
  /** A parked approval is resumed by an opaque ticket and an approver credential. The server,
   *  never this client, resolves that credential to the Actor written to the ledger. */
  approval = {
    decide: (ticket, verdict, approverCredential) => this.call("_agnes/v1/approval.decide", {
      ticket,
      verdict,
      approverCredential
    }),
    listGrants: (sessionId, binding) => this.call("_agnes/v1/approvalGrants.list", { sessionId, ...binding }),
    revokeGrant: (sessionId, binding, grantId) => this.call("_agnes/v1/approvalGrants.revoke", { sessionId, ...binding, grantId })
  };
  /**
   * Re-establishes daemon runtime state for a durable session whose worker was reclaimed while the
   * client transport stayed open. Session owns the retry/cursor policy; Client keeps the validated
   * wire call in the same place as an explicit session.load.
   */
  restoreSession(id, cwd) {
    return this.call("session/load", { sessionId: id, cwd, mcpServers: [] });
  }
  sessionHandle(id, cwd) {
    let s = this.sessionTable.get(id);
    if (!s) {
      s = new Session(this, id, cwd);
      this.sessionTable.set(id, s);
    } else if (cwd) s.rememberWorkspace(cwd);
    return s;
  }
  // Session-scoped notifications are routed by the sessionId they carry; anything
  // addressed to nobody in particular is a client-level event.
  dispatchNotification(method, params) {
    const p = params ?? {};
    if (method === "_agnes/v1/daemon.notice") {
      if (p.kind === "shutting_down") {
        this.shuttingDown = true;
        this.reconnector.stop();
        this.setConnectionState("closed");
      }
      if (p.kind === "overloaded" && typeof p.sessionId === "string")
        this.sessionTable.get(p.sessionId)?.onStreamOverloaded();
      this.emit("notice", p);
      return;
    }
    const sessionId = typeof p.sessionId === "string" ? p.sessionId : null;
    if (sessionId) this.sessionTable.get(sessionId)?.onNotification(method, p);
  }
  async clientId() {
    this.clientIdCache ??= await this.journal.clientId();
    return this.clientIdCache;
  }
  // Memoised, and only while it succeeds: a rejected handshake drops the memo so the
  // next caller gets a real retry rather than the old failure forever.
  initialize() {
    if (this.isClosed) return Promise.reject(new TransportClosed({ reason: "closed" }));
    if (this.initPromise === null) {
      if (this.state === "idle") this.setConnectionState("connecting");
      this.initPromise = this.doInitialize().then(
        (info) => {
          if (this.state === "connecting") this.setConnectionState("connected");
          return info;
        },
        (error) => {
          this.initPromise = null;
          if (this.state === "connecting") this.setConnectionState("idle");
          throw error;
        }
      );
    }
    return this.initPromise;
  }
  async doInitialize() {
    const abort = new AbortController();
    this.initAbort = abort;
    const start = Date.now();
    const timer = setTimeout(
      () => abort.abort(new RequestTimeout("initialize", this.timeouts.initialize)),
      this.timeouts.initialize
    );
    try {
      await untilAborted(() => this.conn.connect(), abort.signal);
      const clientId = await untilAborted(() => this.clientId(), abort.signal);
      const params = {
        protocolVersion: 1,
        clientCapabilities: {
          fs: { readTextFile: false, writeTextFile: false },
          _meta: { [META_KEY]: { capabilities: { permission: true } } }
        }
      };
      const metadata = { clientId };
      params._meta = { [META_KEY]: metadata };
      const auth = await untilAborted(
        () => this.auth.build({ clientId, initializeParams: structuredClone(params), signal: abort.signal }),
        abort.signal
      );
      if (auth !== void 0) metadata.auth = structuredClone(auth);
      const r = await untilAborted(
        () => this.call("initialize", params, {
          timeoutMs: Math.max(0, this.timeouts.initialize - (Date.now() - start)),
          skipInit: true
        }),
        abort.signal
      );
      if (r.protocolVersion !== 1) throw new ProtocolViolation("unsupported negotiated protocol version");
      return {
        agnesVersion: r._meta?.agnes?.agnesVersion ?? "unknown",
        capabilities: r.agentCapabilities ?? {}
      };
    } finally {
      clearTimeout(timer);
      if (this.initAbort === abort) this.initAbort = void 0;
    }
  }
  async call(method, params, o = {}) {
    if (this.isClosed) throw new TransportClosed({ reason: "closed" });
    if (!o.skipInit) await this.initialize();
    this.checkParams(method, params);
    const result2 = await this.conn.request(method, params, {
      // Omitted, not undefined: leaving the key off is what lets the connection apply
      // its own default deadline, while an explicit null means "no deadline".
      ...o.timeoutMs !== void 0 ? { timeoutMs: o.timeoutMs } : {}
    });
    this.checkResult(method, result2);
    return result2;
  }
  async notify(method, params) {
    if (this.isClosed) throw new TransportClosed({ reason: "closed" });
    await this.initialize();
    this.checkParams(method, params);
    await this.conn.notify(method, params);
  }
  // Params are checked before the frame leaves: a malformed request should fail here,
  // where the stack points at the caller, not as a server error round-trip later.
  checkParams(method, params) {
    const fallback = UNLISTED[method]?.params;
    const v = knownMethod(method) ? validateMethod(method, "params", params) : fallback ? validateAgainst(fallback, params) : null;
    if (v && !v.ok) throw new ProtocolViolation(`${method} params: ${describeValidationErrors(v.errors)}`);
  }
  checkResult(method, result2) {
    const fallback = UNLISTED[method]?.result;
    const v = knownMethod(method) ? METHODS[method].result ? validateMethod(method, "result", result2) : null : fallback ? validateAgainst(fallback, result2) : null;
    if (v && !v.ok) throw new ProtocolViolation(`${method} result: ${describeValidationErrors(v.errors)}`);
  }
  async resendPending(sessionId) {
    await resendPending(this, sessionId);
  }
  async apis() {
    return this.call("_agnes/v1/apis.list", {});
  }
  branding() {
    this.brandingCache ??= new BrandingCache(async () => (await this.apis()).profile.branding);
    return this.brandingCache;
  }
  on(event, h) {
    return this.emitter.on(event, h);
  }
  // The way in for anything that has to reach a consumer without a session of its own to
  // travel on - notices, and now the reconnect loop's own `reconnected` /
  // `generationChanged` / `gap`. `on(...)` is the surface; the emitter itself is not, or a
  // consumer could fake a terminal `closed` for every other consumer.
  emit(event, payload) {
    if (event === "reconnected" && this.state === "reconnecting" && !this.isClosed)
      this.setConnectionState("connected");
    this.emitter.emit(event, payload);
  }
  notice(payload) {
    this.emit("notice", payload);
  }
  // Memoised rather than flagged: a second close() has to wait for the first one's
  // teardown. Returning early while the transport is still going down tells a signal
  // handler it may exit, in the middle of the cursor write it was waiting for.
  close() {
    this.closePromise ??= this.doClose();
    return this.closePromise;
  }
  async doClose() {
    this.closing = true;
    this.setConnectionState("closed");
    this.brandingCache?.stop();
    this.reconnector.stop();
    this.initAbort?.abort(new TransportClosed({ reason: "closed" }));
    try {
      await this.conn.close();
    } finally {
      await this.emitClosed({ reason: "closed" });
    }
  }
  // The transport's own report that it is gone. Three outcomes, in order of how final the
  // loss is: the caller already asked to close, or the daemon already said it is shutting
  // down - either way this is the end, so tear down for good; otherwise it is a fault
  // nobody chose, and the reconnect loop takes it from here. Sessions are deliberately left
  // alone on that third path: `attached` stays true, `onClosed()` is never called, and a
  // consumer mid-`for await` on `events()` simply stalls until recover() lets it resume -
  // it must not be handed a stream that looks like it ended for good.
  onTransportClose(info) {
    this.initAbort?.abort(new TransportClosed(info));
    this.initPromise = null;
    if (this.isClosed) {
      this.reconnector.stop();
      this.setConnectionState("closed");
      void this.emitClosed(info);
      return;
    }
    this.setConnectionState("reconnecting");
    this.emitter.emit("reconnecting", { reason: info.reason });
    this.reconnector.onClosed(info);
  }
  // Memoised, so it is both the fire-once latch and the thing close() waits on: the
  // transport usually reports its own close from inside conn.close(), and a plain flag
  // would let close() return while the writes that callback started are still in flight.
  // Because a drop that can be retried never reaches here (onTransportClose hands it to
  // the reconnect loop instead), this now genuinely fires once, for real, at the end of
  // the client's life - never once per drop.
  emitClosed(info) {
    this.closedPromise ??= this.doEmitClosed(info);
    return this.closedPromise;
  }
  // Resolves once every session has finished the cursor write it owes, so an awaited
  // close() is the point after which a resume reads a position that is actually on disk.
  async doEmitClosed(info) {
    const flushes = [...this.sessionTable.values()].map((s) => s.onClosed());
    this.emitter.emit("closed", info);
    await Promise.allSettled(flushes);
  }
};

// ../sdk/src/journal-state.ts
var invalidJournal = () => new Error("invalid journal state");
var record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var own = (map, key) => Object.hasOwn(map, key) ? map[key] : void 0;
var put = (map, key, value) => {
  Object.defineProperty(map, key, { value, writable: true, enumerable: true, configurable: true });
};
var command = (value) => record(value) && typeof value.commandId === "string" && !!value.commandId && typeof value.method === "string" && !!value.method && Object.hasOwn(value, "params");
function freshJournal(clientId = randomId()) {
  if (typeof clientId !== "string" || !clientId) throw invalidJournal();
  return { clientId, counters: {}, cursors: {}, pending: {} };
}
function decodeJournal(raw) {
  try {
    const state = JSON.parse(raw);
    if (!record(state) || typeof state.clientId !== "string" || !state.clientId || !record(state.counters) || !record(state.cursors) || !record(state.pending))
      throw invalidJournal();
    if (!Object.values(state.counters).every(
      (n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0
    ) || !Object.values(state.cursors).every((cursor) => validateAgainst(Cursor, cursor).ok) || !Object.values(state.pending).every((commands) => Array.isArray(commands) && commands.every(command)))
      throw invalidJournal();
    return state;
  } catch {
    throw invalidJournal();
  }
}
function storedJournal(transact) {
  return {
    async clientId() {
      return transact((s) => s.clientId, false);
    },
    async nextCommandId(sessionId) {
      const next = transact((s) => {
        const n = (own(s.counters, sessionId) ?? 0) + 1;
        if (!Number.isSafeInteger(n)) throw invalidJournal();
        put(s.counters, sessionId, n);
        return { clientId: s.clientId, counter: n };
      }, true);
      return journalCommandId(next.clientId, sessionId, next.counter);
    },
    async cursor(sessionId) {
      return transact((s) => structuredClone(own(s.cursors, sessionId) ?? null), false);
    },
    async setCursor(sessionId, cursor) {
      if (!validateAgainst(Cursor, cursor).ok) throw invalidJournal();
      transact((s) => put(s.cursors, sessionId, structuredClone(cursor)), true);
    },
    async pending(sessionId) {
      return transact((s) => structuredClone(own(s.pending, sessionId) ?? []), false);
    },
    async markPending(sessionId, pending) {
      const saved = snapshotPending(pending);
      transact((s) => put(s.pending, sessionId, [...own(s.pending, sessionId) ?? [], saved]), true);
    },
    async clearPending(sessionId, commandId) {
      transact(
        (s) => put(
          s.pending,
          sessionId,
          (own(s.pending, sessionId) ?? []).filter((c) => c.commandId !== commandId)
        ),
        true
      );
    }
  };
}

// ../sdk/src/journal-local-storage.ts
function localStorageJournal(storage, key = "agnes-sdk-journal", initialClientId) {
  let available;
  try {
    available = storage ?? globalThis.localStorage;
  } catch {
  }
  let state;
  return storedJournal((change, write) => {
    let needsSave = write;
    if (available) {
      let raw = null;
      try {
        raw = available.getItem(key);
      } catch {
        available = void 0;
      }
      if (available && raw !== null) {
        try {
          const decoded = decodeJournal(raw);
          state = decoded;
        } catch {
          if (initialClientId !== void 0) throw new Error("invalid journal state");
          state = freshJournal(initialClientId);
          needsSave = true;
        }
      } else if (available) needsSave = true;
    }
    if (!state) {
      state = freshJournal(initialClientId);
      needsSave = true;
    }
    if (initialClientId !== void 0 && state.clientId !== initialClientId)
      throw new Error("journal identity mismatch");
    const next = structuredClone(state);
    const result2 = change(next);
    if (available && needsSave) {
      try {
        available.setItem(key, JSON.stringify(next));
      } catch {
        available = void 0;
      }
    }
    state = next;
    return result2;
  });
}

// ../sdk/src/transport/jsonl.ts
var enc = new TextEncoder();
var dec = new TextDecoder("utf-8", { fatal: true });
function parseMessage(text3) {
  let parsed;
  try {
    parsed = JSON.parse(text3);
  } catch {
    throw new ProtocolViolation("invalid json frame", "invalid-json");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.jsonrpc !== "2.0")
    throw new ProtocolViolation("frame is not JSON-RPC 2.0", "invalid-envelope");
  const m = parsed;
  const has = (key) => Object.hasOwn(m, key);
  const validId = typeof m.id === "string" || typeof m.id === "number" && Number.isFinite(m.id);
  const validError = m.error !== null && typeof m.error === "object" && typeof m.error.code === "number" && typeof m.error.message === "string";
  const valid = has("method") ? typeof m.method === "string" && (!has("id") || validId) && !has("result") && !has("error") : has("id") && (validId || m.id === null) && has("result") !== has("error") && (!has("error") || validError);
  if (!valid) throw new ProtocolViolation("invalid JSON-RPC envelope", "invalid-envelope");
  return parsed;
}

// ../sdk/src/transport/ws.ts
var encoder = new TextEncoder();
var timeout = (value) => {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)
    throw new TypeError("invalid WebSocket timeout");
  return value;
};
function browserSocket(url, options) {
  const { protocols, ...nodeOnly } = options;
  if (Object.keys(nodeOnly).length) throw new Unsupported("browser WebSocket headers/TLS options");
  if (typeof globalThis.WebSocket !== "function") throw new Unsupported("WebSocket");
  return new globalThis.WebSocket(url, protocols);
}
function wsTransport(options) {
  let url;
  try {
    url = new URL(options.url);
  } catch {
    throw new TypeError("invalid WebSocket URL");
  }
  if (!["ws:", "wss:"].includes(url.protocol) || url.username || url.password || url.hash)
    throw new TypeError("invalid WebSocket URL");
  const address = url.href;
  const pingInterval = timeout(options.pingIntervalMs ?? 3e4);
  const connectTimeout = timeout(options.connectTimeoutMs ?? 3e3);
  const socketOptions = {
    ...options.tls,
    ...options.headers ? { headers: { ...options.headers } } : {},
    ...options.protocols ? { protocols: [...options.protocols] } : {}
  };
  const factory = options.socketFactory ?? browserSocket;
  return async (handlers) => {
    let socket;
    try {
      socket = factory(address, socketOptions);
    } catch (error) {
      if (factory === browserSocket && error instanceof Unsupported) throw error;
      throw new TransportClosed({ reason: "error", error: new Error("WebSocket connection failed") });
    }
    let closed = false;
    let opened = false;
    let pingTimer;
    let connectTimer;
    let forceTimer;
    let missed = 0;
    let resolveReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    const pong = () => {
      missed = 0;
    };
    const removeListeners = () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("error", onError);
      socket.off?.("pong", pong);
      if (forceTimer) clearTimeout(forceTimer);
    };
    const finish = (info, peerClosed = false) => {
      if (closed) return;
      closed = true;
      if (connectTimer) clearTimeout(connectTimer);
      if (pingTimer) clearInterval(pingTimer);
      if (!opened) rejectReady(new TransportClosed(info));
      if (peerClosed) removeListeners();
      else {
        try {
          socket.close(info.reason === "closed" ? 1e3 : 1002, "SDK transport closed");
        } catch {
          socket.terminate?.();
        }
        if (socket.readyState === 3) removeListeners();
        else if (socket.terminate) forceTimer = setTimeout(() => socket.terminate?.(), 1e3);
      }
      handlers.onClose(info);
    };
    const onOpen = () => {
      if (closed || opened) return;
      opened = true;
      if (connectTimer) clearTimeout(connectTimer);
      if (socket.ping && socket.on) {
        socket.on("pong", pong);
        pingTimer = setInterval(() => {
          if (missed >= 2) {
            finish({ reason: "error", error: new Error("WebSocket ping timeout") });
            return;
          }
          missed++;
          try {
            socket.ping?.();
          } catch {
            finish({ reason: "error", error: new Error("WebSocket ping failed") });
          }
        }, pingInterval);
      }
      resolveReady();
    };
    const onMessage = (event) => {
      if (closed) return;
      try {
        if (typeof event.data !== "string")
          throw new ProtocolViolation("WebSocket requires text messages", "invalid-envelope");
        if (encoder.encode(event.data).byteLength > MAX_FRAME_BYTES)
          throw new ProtocolViolation("inbound WebSocket frame exceeds limit", "frame-too-large");
        handlers.onMessage(parseMessage(event.data));
      } catch (error) {
        finish({
          reason: "error",
          error: error instanceof ProtocolViolation ? error : new Error("WebSocket message failed")
        });
      }
    };
    const onClose = () => {
      if (closed) removeListeners();
      else finish({ reason: "eof" }, true);
    };
    const onError = () => finish({ reason: "error", error: new Error("WebSocket connection failed") });
    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMessage);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onError);
    connectTimer = setTimeout(
      () => finish({ reason: "error", error: new Error("WebSocket connection timeout") }),
      connectTimeout
    );
    if (socket.readyState === 1) onOpen();
    else if (socket.readyState >= 2) onClose();
    await ready;
    const transport = {
      kind: "ws",
      async send(message2) {
        if (closed) throw new TransportClosed({ reason: "closed" });
        let text3;
        try {
          text3 = JSON.stringify(message2);
        } catch {
          throw new ProtocolViolation("invalid outbound WebSocket message", "invalid-json");
        }
        if (typeof text3 !== "string")
          throw new ProtocolViolation("invalid outbound WebSocket message", "invalid-json");
        const bytes = encoder.encode(text3).byteLength;
        if (bytes > MAX_FRAME_BYTES || socket.bufferedAmount + bytes > MAX_FRAME_BYTES)
          throw new ProtocolViolation("outbound WebSocket frame or queue exceeds limit", "frame-too-large");
        try {
          socket.send(text3);
        } catch {
          const info = { reason: "error", error: new Error("WebSocket send failed") };
          finish(info);
          throw new TransportClosed(info);
        }
      },
      async close() {
        finish({ reason: "closed" });
      }
    };
    return transport;
  };
}

// ../sdk/src/oauth.ts
async function loginSubscription(client2, input, interaction) {
  let id;
  let active;
  let promptError;
  const seen = /* @__PURE__ */ new Set();
  interaction.signal.throwIfAborted();
  let onAbort = () => {
  };
  const cancelled2 = new Promise((_resolve, reject) => {
    const abort = () => reject(new Error("CONFIG_AUTH_CANCELLED"));
    onAbort = abort;
    if (interaction.signal.aborted) abort();
    else interaction.signal.addEventListener("abort", abort, { once: true });
  });
  const call = (request) => Promise.race([client2.oauth(request), cancelled2]);
  try {
    interaction.signal.throwIfAborted();
    const started = client2.oauth(input).then((result3) => {
      id = result3.operationId;
      if (interaction.signal.aborted) void client2.oauth({ action: "cancel", operationId: id }).catch(() => {
      });
      else interaction.operation?.(id);
      return result3;
    });
    let result2 = await Promise.race([started, cancelled2]);
    for (; ; ) {
      interaction.signal.throwIfAborted();
      for (const notice2 of result2.notices ?? []) {
        const key = JSON.stringify(notice2);
        if (!seen.has(key)) {
          seen.add(key);
          interaction.notice(notice2);
        }
      }
      if (result2.state === "ready") return result2;
      if (result2.state !== "running") throw new Error(result2.error ?? "CONFIG_AUTH_FAILED");
      if (promptError) {
        if (result2.prompt?.id === promptError.id) throw promptError.error;
        promptError = void 0;
      }
      if (active && active.id !== result2.prompt?.id) {
        active.controller.abort();
        active = void 0;
      }
      if (result2.prompt && !active) {
        const prompt = result2.prompt;
        const controller = new AbortController();
        active = { id: prompt.id, controller };
        const signal = AbortSignal.any([interaction.signal, controller.signal]);
        void interaction.prompt(prompt, signal).then(async (answer) => {
          if (!signal.aborted)
            await call({ action: "answer", operationId: id, promptId: prompt.id, answer });
        }).catch((error) => {
          if (!signal.aborted) promptError = { id: prompt.id, error };
        });
      }
      await Promise.race([new Promise((resolve) => setTimeout(resolve, 250)), cancelled2]);
      result2 = await call({ action: "poll", operationId: id });
    }
  } catch (error) {
    if (id) void client2.oauth({ action: "cancel", operationId: id }).catch(() => {
    });
    throw error;
  } finally {
    active?.controller.abort();
    interaction.signal.removeEventListener("abort", onAbort);
  }
}

// ../sdk/src/preview-merger.ts
var PREVIEW_MAX_CHARS = 8 * 1024 * 1024;
var OUT_OF_ORDER_MAX = 64;
var OUT_OF_ORDER_MAX_CHARS = 256 * 1024;
var FINISHED_MAX = 64;
var PreviewMerger = class {
  streams = /* @__PURE__ */ new Map();
  finished = [];
  /** Takes one preview; true when the text of its inference changed. */
  add(p) {
    if (this.finished.includes(p.effectId)) return false;
    let s = this.streams.get(p.effectId);
    if (!s) {
      s = { text: "", thinking: "", capped: false, early: [], earlyChars: 0 };
      this.streams.set(p.effectId, s);
    }
    if (s.capped) return false;
    const changed = this.merge(s, p);
    if (!changed) return false;
    for (let progress = true; progress && s.early.length > 0; ) {
      progress = false;
      for (const [i, early] of s.early.entries()) {
        if (early.offset > s[early.stream].length) continue;
        s.early.splice(i, 1);
        s.earlyChars -= early.delta.length;
        this.merge(s, early);
        progress = true;
        break;
      }
    }
    return true;
  }
  text(effectId) {
    const s = this.streams.get(effectId);
    return s ? { text: s.text, thinking: s.thinking, capped: s.capped } : void 0;
  }
  /**
   * Lays the streamed text over an authoritative timeline, whose streaming nodes are always empty,
   * and forgets every inference the timeline shows as finished.
   */
  apply(timeline) {
    let nodes;
    for (const [i, node] of timeline.nodes.entries()) {
      if (node.kind !== "assistant" || node.effectId === void 0) continue;
      if (!node.streaming) {
        this.finish(node.effectId);
        continue;
      }
      const s = this.streams.get(node.effectId);
      if (!s) continue;
      nodes ??= [...timeline.nodes];
      nodes[i] = { ...node, text: s.text, ...s.thinking ? { thinking: s.thinking } : {} };
    }
    return nodes ? { ...timeline, nodes } : timeline;
  }
  /** The inference ended; later previews for it are stale and dropped. */
  finish(effectId) {
    this.streams.delete(effectId);
    if (this.finished.includes(effectId)) return;
    this.finished.push(effectId);
    if (this.finished.length > FINISHED_MAX) this.finished.shift();
  }
  /** A new worker generation or a lost connection: everything held may be stale. */
  reset() {
    this.streams.clear();
  }
  merge(s, p) {
    const before = s[p.stream];
    if (p.offset > before.length) {
      s.early.push(p);
      s.earlyChars += p.delta.length;
      while (s.early.length > OUT_OF_ORDER_MAX || s.earlyChars > OUT_OF_ORDER_MAX_CHARS) {
        const dropped2 = s.early.shift();
        s.earlyChars -= dropped2?.delta.length ?? 0;
      }
      return false;
    }
    const piece = p.delta.slice(before.length - p.offset);
    if (!piece) return false;
    if (s.text.length + s.thinking.length + piece.length > PREVIEW_MAX_CHARS) {
      s.capped = true;
      s.early = [];
      s.earlyChars = 0;
      return true;
    }
    s[p.stream] = before + piece;
    return true;
  }
};

// ../sdk/src/ui-projection-sync.ts
var REPROJECT_DEBOUNCE_MS = 50;
var OPENING_RETRY_MS = 500;
var MAX_DEFERRED_UI_OVERLAYS = 512;
var applyWindowedTurnChanges = (current2, changes, nodes) => {
  const turns = new Map(current2.map((turn) => [turn.id, turn]));
  if (turns.size !== current2.length) throw new Error("UI_PROJECTION_DUPLICATE_TURN");
  const changedIds = /* @__PURE__ */ new Set();
  for (const change of changes) {
    const id = change.op === "remove" ? change.id : change.turn.id;
    if (changedIds.has(id)) throw new Error("UI_PROJECTION_DUPLICATE_TURN_CHANGE");
    changedIds.add(id);
    if (change.op === "remove") turns.delete(id);
    else turns.set(id, change.turn);
  }
  const retainedNodeIds = new Set(nodes.map((node) => node.id));
  return [...turns.values()].filter(
    (turn) => turn.nodeIds.some((id) => retainedNodeIds.has(id)) || turn.status === "running" || turn.status === "waiting"
  ).sort((a, b) => a.startSeq - b.startSeq);
};
function applyWindowedUITimelinePatch(current2, coordinates, patch) {
  if (patch.sessionId !== current2.sessionId || patch.generation !== current2.generation || patch.from !== current2.upto || patch.upto < patch.from || patch.totalNodes === void 0 || !Number.isSafeInteger(patch.totalNodes) || patch.totalNodes < 0 || coordinates.startIndex < 0 || coordinates.startIndex + current2.nodes.length !== coordinates.totalNodes)
    throw new Error("UI_PROJECTION_CURSOR_MISMATCH");
  const ids = new Set(current2.nodes.map((node) => node.id));
  if (ids.size !== current2.nodes.length) throw new Error("UI_PROJECTION_DUPLICATE_NODE");
  const changed = /* @__PURE__ */ new Set();
  const unseen = [];
  for (const change of patch.changes) {
    const id = change.op === "remove" ? change.id : change.node.id;
    if (changed.has(id)) throw new Error("UI_PROJECTION_DUPLICATE_CHANGE");
    changed.add(id);
    if (!ids.has(id))
      unseen.push(change.op === "remove" ? { id } : { id, index: change.index, node: change.node });
  }
  const replaced = new Set(
    patch.changes.filter((change) => change.op === "upsert").map((change) => change.node.id)
  );
  const removed = new Set(patch.changes.filter((change) => change.op === "remove").map((change) => change.id));
  const survivors = current2.nodes.filter((node) => !removed.has(node.id) && !replaced.has(node.id));
  const upserts = patch.changes.filter(
    (change) => change.op === "upsert"
  ).sort((a, b) => a.index - b.index);
  if (upserts.some((change) => change.index >= patch.totalNodes))
    throw new Error("UI_PROJECTION_INDEX_OUT_OF_RANGE");
  let startIndex = Math.min(coordinates.startIndex, patch.totalNodes);
  let included = [];
  for (let pass = 0; pass <= upserts.length + 1; pass++) {
    included = upserts.filter((change) => change.index >= startIndex);
    const next = patch.totalNodes - survivors.length - included.length;
    if (next < 0) throw new Error("UI_PROJECTION_WINDOW_OVERFLOW");
    if (next === startIndex) break;
    startIndex = next;
    if (pass === upserts.length + 1) throw new Error("UI_PROJECTION_WINDOW_UNSTABLE");
  }
  const slots = Array.from({ length: patch.totalNodes - startIndex });
  for (const change of included) {
    const local = change.index - startIndex;
    if (local < 0 || local >= slots.length || slots[local])
      throw new Error("UI_PROJECTION_INDEX_OUT_OF_RANGE");
    slots[local] = change.node;
  }
  let survivor = 0;
  for (let index = 0; index < slots.length; index++) {
    if (slots[index]) continue;
    const node = survivors[survivor++];
    if (!node) throw new Error("UI_PROJECTION_WINDOW_GAP");
    slots[index] = node;
  }
  if (survivor !== survivors.length || slots.some((node) => node === void 0))
    throw new Error("UI_PROJECTION_WINDOW_GAP");
  const nodes = slots;
  if (new Set(nodes.map((node) => node.id)).size !== nodes.length)
    throw new Error("UI_PROJECTION_DUPLICATE_NODE");
  return {
    timeline: {
      sessionId: patch.sessionId,
      generation: patch.generation,
      upto: patch.upto,
      opState: patch.opState,
      nodes,
      turns: applyWindowedTurnChanges(current2.turns, patch.turnChanges, nodes),
      ...(patch.pendingInputs ?? current2.pendingInputs) === void 0 ? {} : { pendingInputs: patch.pendingInputs ?? current2.pendingInputs },
      ...(patch.yolo ?? current2.yolo) === void 0 ? {} : { yolo: patch.yolo ?? current2.yolo },
      ...patch.budget === void 0 ? current2.budget === void 0 ? {} : { budget: current2.budget } : { budget: patch.budget },
      ...patch.usage === void 0 ? current2.usage === void 0 ? {} : { usage: current2.usage } : { usage: patch.usage }
    },
    coordinates: { startIndex, totalNodes: patch.totalNodes },
    unseen
  };
}
var UIProjectionSync = class {
  constructor(session, sink, options = {}) {
    this.session = session;
    this.sink = sink;
    this.options = options;
  }
  session;
  sink;
  options;
  stopped = false;
  started = false;
  iterator;
  timer;
  openingRetry;
  pendingUpto;
  forced = false;
  // Patch, history and opening requests run one at a time, in order; this counts queued and running ones.
  jobs = 0;
  // Set while an opening or patch request is out; a prompt only skips the debounce when it is not.
  projecting = false;
  tail = Promise.resolve();
  lastProjectAt = 0;
  appliedUpto = 0;
  lastEventSeq = 0;
  baselineValid = false;
  current;
  window;
  history;
  historyLoading;
  historyEpoch = 0;
  deferred = /* @__PURE__ */ new Map();
  gated = false;
  connectionEpoch = 0;
  connectionWaiters = [];
  disposers = [];
  previewOff;
  starting = false;
  patchRetry;
  get surface() {
    return this.options.surface ?? "tui";
  }
  async start() {
    if (this.started || this.stopped) throw new Error("projection already started or stopped");
    this.started = true;
    this.watchConnection();
    this.starting = true;
    try {
      for (; ; ) {
        if (this.gated) await new Promise((resolve) => this.connectionWaiters.push(resolve));
        if (this.stopped) return;
        const opened = await this.exclusive(() => this.open());
        if (opened.ok) {
          this.subscribe();
          return;
        }
        if (this.stopped) return;
        if (!("error" in opened)) continue;
        if (this.options.openingFailure === "reject") throw opened.error;
        this.sink.error(opened.error);
        this.scheduleOpeningRetry();
        return;
      }
    } finally {
      this.starting = false;
    }
  }
  /** Asks for one patch; requests made while one is in flight fold into at most one more. */
  refresh() {
    if (this.stopped) return;
    this.forced = true;
    this.schedule();
  }
  watchConnection() {
    const connection = this.options.connection;
    if (!connection) return;
    this.gated = connection.connectionState !== "connected";
    const follow = () => {
      if (connection.connectionState === "connected") this.ungate();
      else this.gate();
    };
    for (const event of ["connectionStateChanged", "reconnecting", "reconnected"])
      this.disposers.push(connection.on(event, follow));
  }
  gate() {
    if (this.gated || this.stopped) return;
    this.gated = true;
    this.connectionEpoch += 1;
    this.clearTimers();
    this.invalidateBaseline();
    this.forced = true;
  }
  ungate() {
    if (!this.gated || this.stopped) return;
    this.gated = false;
    for (const resolve of this.connectionWaiters.splice(0)) resolve();
    if (this.starting) return;
    void this.exclusive(() => this.reopen()).then((opened) => {
      if (opened && !this.iterator) this.subscribe();
    });
  }
  exclusive(job) {
    const idle = this.jobs === 0;
    this.jobs += 1;
    const execute = async () => {
      try {
        return await job();
      } finally {
        this.jobs -= 1;
        this.schedule();
      }
    };
    const run2 = idle ? execute() : this.tail.then(execute);
    this.tail = run2.then(
      () => void 0,
      () => void 0
    );
    return run2;
  }
  subscribe() {
    if (this.stopped || this.iterator || !this.current || !this.baselineValid) return;
    if (this.openingRetry) clearTimeout(this.openingRetry);
    this.openingRetry = void 0;
    this.lastEventSeq = Math.max(this.lastEventSeq, this.current.upto);
    if (!this.previewOff && this.sink.preview && this.session.onPreview) {
      const sink = this.sink.preview.bind(this.sink);
      this.previewOff = this.session.onPreview((p) => {
        if (!this.stopped) sink(p);
      });
      this.disposers.push(this.previewOff);
    }
    this.iterator = this.session.events({
      ...this.previewOff ? { preview: true } : {},
      cursor: { fromSeq: this.current.upto, generation: this.current.generation }
    })[Symbol.asyncIterator]();
    void this.consume();
  }
  scheduleOpeningRetry() {
    if (this.stopped || this.gated || this.baselineValid || this.openingRetry) return;
    this.openingRetry = setTimeout(() => {
      this.openingRetry = void 0;
      void this.exclusive(() => this.open()).then((opened) => {
        if (opened.ok) this.subscribe();
        else this.scheduleOpeningRetry();
      });
    }, OPENING_RETRY_MS);
  }
  handle(event) {
    if (event.seq > this.lastEventSeq) {
      this.lastEventSeq = event.seq;
      this.sink.event?.(event);
    }
    if (event.seq <= this.appliedUpto) return;
    this.pendingUpto = Math.max(this.pendingUpto ?? 0, event.seq);
    if (event.type === "user/message" && !this.projecting && !this.gated) {
      this.fireNow();
      return;
    }
    this.schedule();
  }
  clearTimers() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = void 0;
    if (this.openingRetry) clearTimeout(this.openingRetry);
    this.openingRetry = void 0;
    if (this.patchRetry) clearTimeout(this.patchRetry);
    this.patchRetry = void 0;
  }
  fireNow() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = void 0;
    }
    this.firePatch();
  }
  firePatch() {
    this.pendingUpto = void 0;
    this.forced = false;
    void this.exclusive(() => this.project());
  }
  async consume() {
    try {
      while (!this.stopped) {
        const next = await this.iterator?.next();
        if (!next || next.done || this.stopped) break;
        this.handle(next.value);
      }
    } catch (error) {
      if (!this.stopped) this.sink.error(error);
    }
  }
  schedule() {
    if (this.stopped || this.gated || this.jobs > 0 || this.timer) return;
    if (this.pendingUpto === void 0 && !this.forced) return;
    if (!this.baselineValid) {
      this.scheduleOpeningRetry();
      return;
    }
    const remaining = REPROJECT_DEBOUNCE_MS - (Date.now() - this.lastProjectAt);
    if (remaining <= 0) {
      this.firePatch();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = void 0;
      this.firePatch();
    }, remaining);
  }
  install(timeline, reason) {
    this.current = this.options.isolate === "share" ? timeline : structuredClone(timeline);
    this.appliedUpto = timeline.upto;
    if (this.pendingUpto !== void 0 && this.pendingUpto <= timeline.upto) this.pendingUpto = void 0;
    const window2 = this.window;
    if (!window2) throw new Error("UI_PROJECTION_WINDOW_MISSING");
    this.sink.timeline(timeline, {
      ...window2,
      hasEarlier: this.history?.cursor !== void 0,
      reason
    });
  }
  rememberDeferred(id, node) {
    if (!this.deferred.has(id) && this.deferred.size >= MAX_DEFERRED_UI_OVERLAYS)
      throw new Error("UI_PROJECTION_DEFERRED_OVERFLOW");
    this.deferred.delete(id);
    this.deferred.set(id, node === null ? null : structuredClone(node));
  }
  installOpening(result2) {
    const { timeline, history: history2 } = result2;
    if (history2.startIndex + timeline.nodes.length !== history2.totalNodes || history2.hasEarlier !== history2.startIndex > 0)
      throw new Error("UI_PROJECTION_OPENING_COORDINATES");
    this.historyEpoch += 1;
    this.baselineValid = true;
    this.deferred.clear();
    this.window = { startIndex: history2.startIndex, totalNodes: history2.totalNodes };
    this.history = {
      generation: timeline.generation,
      cut: timeline.upto,
      totalNodes: history2.totalNodes,
      beforeIndex: history2.startIndex,
      ...history2.hasEarlier ? { cursor: history2.cursor } : {}
    };
    this.install(timeline, "opening");
  }
  async open() {
    const epoch = this.connectionEpoch;
    this.lastProjectAt = Date.now();
    this.forced = false;
    const bounds = this.options.opening ?? {};
    this.projecting = true;
    try {
      const result2 = await this.session.projectUIOpening({
        surface: this.surface,
        ...bounds.maxNodes === void 0 ? {} : { maxNodes: bounds.maxNodes },
        ...bounds.maxBytes === void 0 ? {} : { maxBytes: bounds.maxBytes }
      });
      if (this.stopped || epoch !== this.connectionEpoch) return { ok: false };
      this.installOpening(result2);
      return { ok: true };
    } catch (error) {
      if (this.stopped || epoch !== this.connectionEpoch) return { ok: false };
      return { ok: false, error };
    } finally {
      this.projecting = false;
    }
  }
  invalidateBaseline() {
    if (!this.baselineValid) return;
    this.baselineValid = false;
    this.historyEpoch += 1;
    this.history = void 0;
    this.deferred.clear();
  }
  async reopen() {
    this.invalidateBaseline();
    const opened = await this.open();
    if (!opened.ok) this.scheduleOpeningRetry();
    return opened.ok;
  }
  async project() {
    if (!this.current || !this.window || !this.baselineValid) {
      this.scheduleOpeningRetry();
      return;
    }
    const epoch = this.connectionEpoch;
    this.lastProjectAt = Date.now();
    this.projecting = true;
    try {
      const update = await this.session.projectUIPatch(this.current.upto, void 0, {
        surface: this.surface
      });
      if (this.stopped || epoch !== this.connectionEpoch) return;
      if (update.kind === "replace") {
        await this.reopen();
      } else {
        try {
          const applied = applyWindowedUITimelinePatch(this.current, this.window, update.patch);
          this.window = applied.coordinates;
          for (const change of applied.unseen) {
            if (!change.node) {
              this.rememberDeferred(change.id, null);
              continue;
            }
            const loaded = applied.timeline.nodes.some((node) => node.id === change.id);
            const existedAtCut = change.node.seq === void 0 || change.node.seq <= (this.history?.cut ?? -1);
            if (!loaded && !existedAtCut) throw new Error("UI_PROJECTION_NEW_PREFIX_NODE");
            if (existedAtCut) this.rememberDeferred(change.id, change.node);
          }
          this.install(applied.timeline, "live");
        } catch {
          await this.reopen();
        }
      }
    } catch (error) {
      if (this.stopped || epoch !== this.connectionEpoch) return;
      if (error?.data?.code === "UI_PROJECTION_RESYNC_REQUIRED")
        await this.reopen();
      else {
        this.sink.error(error);
        if (!this.patchRetry)
          this.patchRetry = setTimeout(() => {
            this.patchRetry = void 0;
            this.refresh();
          }, OPENING_RETRY_MS);
      }
    } finally {
      this.projecting = false;
    }
  }
  /** Loads one fixed-cut page. It never reads or mutates the live event attach cursor. */
  loadEarlier() {
    if (this.historyLoading) return this.historyLoading;
    if (this.stopped || !this.baselineValid || !this.current || !this.window || !this.history?.cursor)
      return Promise.resolve(false);
    const loading = this.exclusive(() => this.loadHistory()).finally(() => {
      if (this.historyLoading === loading) this.historyLoading = void 0;
    });
    this.historyLoading = loading;
    return loading;
  }
  async loadHistory() {
    const history2 = this.history;
    if (this.stopped || !this.baselineValid || !this.current || !this.window || !history2?.cursor) return false;
    const epoch = this.historyEpoch;
    const expectedBefore = history2.beforeIndex;
    try {
      const page = await this.session.projectUIHistory(history2.cursor, {
        limit: this.options.historyLimit ?? 100,
        ...this.options.opening?.maxBytes === void 0 ? {} : { maxBytes: this.options.opening.maxBytes }
      });
      if (this.stopped || epoch !== this.historyEpoch) return false;
      this.validateHistoryPage(page, history2, expectedBefore);
      const current2 = this.current;
      if (!current2) return false;
      const currentIds = new Set(current2.nodes.map((node) => node.id));
      const pageIds = /* @__PURE__ */ new Set();
      const older = [];
      for (const raw of page.nodes) {
        if (pageIds.has(raw.id)) throw new Error("UI_HISTORY_DUPLICATE_NODE");
        pageIds.add(raw.id);
        const hasOverlay = this.deferred.has(raw.id);
        const overlay = this.deferred.get(raw.id);
        if (currentIds.has(raw.id)) {
          if (!hasOverlay) throw new Error("UI_HISTORY_OVERLAPS_WINDOW");
          this.deferred.delete(raw.id);
          continue;
        }
        this.deferred.delete(raw.id);
        if (hasOverlay && overlay === null) continue;
        older.push(hasOverlay && overlay ? overlay : raw);
      }
      const nodes = [...older, ...current2.nodes];
      if (new Set(nodes.map((node) => node.id)).size !== nodes.length)
        throw new Error("UI_HISTORY_DUPLICATE_NODE");
      if (new Set(page.turns.map((turn) => turn.id)).size !== page.turns.length)
        throw new Error("UI_HISTORY_DUPLICATE_TURN");
      const turns = new Map(page.turns.map((turn) => [turn.id, turn]));
      for (const turn of current2.turns) turns.set(turn.id, turn);
      const nextHistory = {
        generation: history2.generation,
        cut: history2.cut,
        totalNodes: history2.totalNodes,
        beforeIndex: page.startIndex,
        ...page.hasEarlier ? { cursor: page.cursor } : {}
      };
      this.history = nextHistory;
      const liveWindow = this.window;
      if (!liveWindow) return false;
      this.window = {
        startIndex: liveWindow.totalNodes - nodes.length,
        totalNodes: liveWindow.totalNodes
      };
      if (this.window.startIndex < 0) throw new Error("UI_HISTORY_WINDOW_OVERFLOW");
      this.install(
        { ...current2, nodes, turns: [...turns.values()].sort((a, b) => a.startSeq - b.startSeq) },
        "history"
      );
      return true;
    } catch {
      if (!this.stopped && epoch === this.historyEpoch) await this.reopen();
      return false;
    }
  }
  validateHistoryPage(page, history2, expectedBefore) {
    if (!this.current || page.sessionId !== this.current.sessionId || page.generation !== history2.generation || page.generation !== this.current.generation || page.cut !== history2.cut || page.totalNodes !== history2.totalNodes || page.startIndex + page.nodes.length !== expectedBefore || page.startIndex >= expectedBefore || page.hasEarlier !== page.startIndex > 0)
      throw new Error("UI_HISTORY_CURSOR_MISMATCH");
  }
  /** Re-establishes both the local baseline and daemon connection cache after a gap/reconnect. */
  async resync() {
    if (this.stopped) return;
    if (this.gated) {
      this.invalidateBaseline();
      return;
    }
    const opened = await this.exclusive(() => this.reopen());
    if (opened && !this.iterator) this.subscribe();
  }
  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.clearTimers();
    this.historyEpoch += 1;
    for (const dispose of this.disposers.splice(0)) dispose();
    for (const resolve of this.connectionWaiters.splice(0)) resolve();
    await this.iterator?.return?.();
  }
};

// ../sdk/src/index.browser.ts
function normalizeBrowserOptions(opts) {
  const unchecked = opts;
  if (unchecked.transport.kind !== "ws") throw new TypeError("browser client requires ws transport");
  if (unchecked.auth && !["local", "jwt", "portal-identity"].includes(unchecked.auth.kind))
    throw new TypeError("browser client auth kind unsupported");
  return {
    ...unchecked,
    journal: unchecked.journal ?? localStorageJournal(
      void 0,
      unchecked.clientId === void 0 ? "agnes-sdk-journal" : `agnes-sdk-journal:${unchecked.clientId}`,
      unchecked.clientId
    ),
    // Ignore an untyped caller's injected provider/factory tables too.
    authProviders: {},
    transportFactories: {
      ws: (option2) => {
        if (option2.kind !== "ws") throw new TypeError("ws factory requires a ws option");
        return wsTransport(option2);
      }
    }
  };
}
function browserControlPlaneMethod(method) {
  return method.startsWith("_agnes/v1/packages.") || method.startsWith("_agnes/v1/extension.") || method === "_agnes/v1/clientModules.callService" || method === "_agnes/v1/clientModules.callEffect" || isResourceControlMethod(method);
}
var Client2 = class extends Client {
  constructor(opts) {
    super(normalizeBrowserOptions(opts));
  }
  call(method, params, options) {
    if (browserControlPlaneMethod(method))
      return Promise.reject(new Unsupported("Node-only control-plane method"));
    return super.call(method, params, options);
  }
  notify(method, params) {
    if (browserControlPlaneMethod(method))
      return Promise.reject(new Unsupported("Node-only control-plane method"));
    return super.notify(method, params);
  }
};
function createClient(opts) {
  return new Client2(opts);
}

// ../web-admin-frame/src/binding.ts
function bindDismissibleDialog(options) {
  const dismiss = () => {
    if (!options.canClose()) return;
    options.close();
    options.restoreFocus();
  };
  options.cancel.addEventListener("click", dismiss);
  for (const control of options.additional) control.addEventListener("click", dismiss);
  options.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismiss();
  });
  options.dialog.addEventListener("click", (event) => {
    if (event.target === options.dialog) dismiss();
  });
}

// ../web-slots/src/index.ts
var WEB_ROW_PREFIX = "web:";
function webRowId(packageId) {
  if (!packageId || packageId.includes(":")) {
    throw new Error(`invalid package id for web row: ${packageId}`);
  }
  return `${WEB_ROW_PREFIX}${packageId}`;
}
var NO_ENTRIES = Object.freeze([]);

// ../web-units/src/approval.ts
import {
  createElement,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from "react";
var Approval = forwardRef(function Approval2({ initialView, detail }, ref) {
  const [view, setView] = useState(initialView);
  const content = useRef(null);
  const focusedAction = useRef(void 0);
  const actionButtons = useRef(/* @__PURE__ */ new Map());
  useImperativeHandle(
    ref,
    () => ({
      render(next) {
        const active = document.activeElement;
        if (next === void 0) {
          focusedAction.current = void 0;
        } else if (active instanceof HTMLButtonElement && content.current?.contains(active)) {
          focusedAction.current = active.dataset.approvalAction;
        }
        setView(next);
      }
    }),
    []
  );
  useLayoutEffect(() => {
    const actionId = focusedAction.current;
    if (!actionId || !view || view.disabled) return;
    const button2 = actionButtons.current.get(actionId);
    if (!button2 || button2.disabled) return;
    button2.focus();
    focusedAction.current = void 0;
  }, [view]);
  return createElement(
    "div",
    {
      ref: content,
      id: "approval-content",
      style: { display: "contents" },
      "data-agnes-region-owner": "builtin",
      "data-agnes-region-unit": "approval"
    },
    view ? createElement(
      "div",
      { key: view.key, "data-approval-key": view.key },
      createElement("h2", null, view.title),
      createElement("p", null, view.summary),
      createElement("p", { className: "approval-impact" }, view.impact),
      detail,
      ...view.warning === void 0 ? [] : [createElement("p", { key: "warning", className: "approval-warning" }, view.warning)],
      ...view.preview === void 0 ? [] : [createElement("pre", { key: "preview", tabIndex: 0 }, view.preview)],
      createElement(
        "div",
        { className: "approval-actions" },
        ...view.actions.map(
          (action) => createElement(
            "button",
            {
              key: action.id,
              type: "button",
              "data-approval-action": action.id,
              disabled: view.disabled,
              onClick: action.onSelect,
              ref: (button2) => {
                if (button2) actionButtons.current.set(action.id, button2);
                else actionButtons.current.delete(action.id);
              }
            },
            action.label
          )
        )
      )
    ) : void 0
  );
});

// ../web-units/src/composer.ts
import {
  createElement as createElement2,
  Fragment,
  forwardRef as forwardRef2,
  useCallback,
  useImperativeHandle as useImperativeHandle2,
  useLayoutEffect as useLayoutEffect2,
  useRef as useRef2,
  useState as useState2
} from "react";
import { flushSync } from "react-dom";

// ../web-units/src/composer-errors.ts
function attachmentErrorNotice(error) {
  if (error instanceof AttachmentValidationError) {
    switch (error.code) {
      case "ATTACHMENT_COUNT":
        return {
          key: "composer.attachment.tooMany",
          vars: { count: USER_MESSAGE_ATTACHMENT_LIMITS.maxCount }
        };
      case "ATTACHMENT_BYTES":
        return { key: "composer.attachment.tooLarge" };
      case "ATTACHMENT_DATA":
        return { key: "composer.attachment.dataInvalid" };
      case "ATTACHMENT_NAME":
        return { key: "composer.attachment.nameInvalid" };
    }
  }
  if (error instanceof SafeImageError) {
    if (error.code === "PIXEL_LIMIT") return { key: "composer.image.tooLargePixels" };
    if (error.code === "BYTE_LIMIT") return { key: "composer.image.tooLarge" };
    return { key: "composer.image.invalid" };
  }
  return void 0;
}

// ../web-units/src/composer.ts
function pickerState(view) {
  const settings2 = view.modelSettings;
  if (!settings2) return view.model;
  return {
    ...view.model,
    settings: {
      ...settings2.settings.thinking ? { thinking: settings2.settings.thinking } : {},
      ...settings2.settings.contextWindow === void 0 ? {} : { contextWindow: settings2.settings.contextWindow },
      capacity: settings2.contextWindow,
      ...settings2.thinkingLevelMap ? { thinkingLevelMap: settings2.thinkingLevelMap } : {}
    }
  };
}
var INITIAL_VIEW = {
  cancel: { disabled: true, hidden: true, label: "Stop" },
  connected: false,
  configured: false,
  hasSession: false,
  hint: { kind: "state", text: "Connect to the backend to start" },
  input: { disabled: true, placeholder: "Describe what you want to do…" },
  loading: false,
  model: {
    accessibleName: "Select the model for this session",
    disabled: true,
    label: "Select model",
    options: [],
    pending: false
  },
  permission: { disabled: true, pending: false, selected: "workspace" },
  sending: false,
  send: { disabled: true, label: "Send", mode: "idle", title: "Send (Enter)" },
  stopping: false,
  usage: void 0,
  workspace: { disabled: true, label: "Select workspace", title: "Select workspace" }
};
var MAX_IMAGE_BYTES = USER_MESSAGE_IMAGE_LIMITS.maxBytesPerImage;
var MAX_TOTAL_IMAGE_BYTES = USER_MESSAGE_IMAGE_LIMITS.maxAggregateBytes;
var IMAGE_PREVIEW_LIMITS = USER_MESSAGE_IMAGE_LIMITS;
var MAX_SOURCE_IMAGE_BYTES = USER_MESSAGE_ATTACHMENT_LIMITS.maxAggregateBytes;
var IMAGE_MAX_EDGE = 1456;
async function downscaleImageFile(file, policy = userImagePolicy(void 0)) {
  if (typeof createImageBitmap !== "function") return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const ratio = Math.min(
      1,
      IMAGE_MAX_EDGE / longest,
      policy.maxWidth / bitmap.width,
      policy.maxHeight / bitmap.height
    );
    const encodedSize = 4 * Math.ceil(file.size / 3);
    if (ratio === 1 && encodedSize <= (policy.maxBase64Bytes ?? Infinity)) {
      if (file.type !== "image/jpeg") return file;
      try {
        decodeSafeImageBytes(
          { bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type },
          IMAGE_PREVIEW_LIMITS
        );
        return file;
      } catch {
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(
      (resolve) => canvas.toBlob(resolve, file.type, (policy.jpegQuality ?? 92) / 100)
    );
    if (!blob) return file;
    return new File([blob], file.name, { type: file.type });
  } finally {
    bitmap.close();
  }
}
async function readImage(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return { data: btoa(binary), bytes };
}
function blobBytes(bytes) {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}
var nativeImageFile = (file) => file.type === "image/png" || file.type === "image/jpeg" || !file.type && /\.(png|jpe?g)$/iu.test(file.name);
var Composer = forwardRef2(function Composer2({
  initialDraft = "",
  initialView = INITIAL_VIEW,
  dependencies,
  onCancel,
  onAttachmentsChange,
  onDraftChange,
  onError,
  onModelSelect,
  onModelSettingsChange,
  onPermissionSelect,
  onSubmit,
  onSendNow,
  onRemoveQueued,
  onWorkspace,
  slots
}, ref) {
  const [view, setView] = useState2(initialView);
  const [attachments, setAttachments] = useState2([]);
  const [pendingCount, setPendingCount] = useState2(0);
  const fileInput = useRef2(null);
  const policy = view.imagePolicy ?? userImagePolicy(void 0);
  const currentView = useRef2(view);
  currentView.current = view;
  const imageDisabled = view.input.disabled || view.sending || view.model.pending;
  const imageHint = dependencies.translate("composer.attachment.hint");
  const form = useRef2(null);
  const prompt = useRef2(null);
  const model = useRef2(null);
  const permission = useRef2(null);
  const usage = useRef2(null);
  const modelPicker = useRef2();
  const permissionPicker = useRef2();
  const renderUsage = useRef2();
  const attachmentsRef = useRef2([]);
  const generation = useRef2(0);
  const nextAttachmentId = useRef2(0);
  const pendingCountRef = useRef2(0);
  const pendingImageCountRef = useRef2(0);
  const publishAttachments = useCallback(
    (next) => {
      attachmentsRef.current = next;
      setAttachments(next);
      onAttachmentsChange?.();
    },
    [onAttachmentsChange]
  );
  const clearImageBlocks = useCallback(() => {
    generation.current += 1;
    pendingCountRef.current = 0;
    pendingImageCountRef.current = 0;
    setPendingCount(0);
    for (const attachment of attachmentsRef.current)
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    publishAttachments([]);
  }, [publishAttachments]);
  const restoreAttachmentBlocks = useCallback(
    (blocks) => {
      let decoded;
      try {
        validateUserAttachments(blocks);
        decoded = decodeSafeImages(
          blocks.filter((block) => block.type === "image"),
          IMAGE_PREVIEW_LIMITS
        );
      } catch {
        return;
      }
      const restored = [];
      try {
        let imageIndex = 0;
        for (const image of blocks) {
          if (image.type === "file") {
            restored.push({
              ...image,
              id: `restored-${++nextAttachmentId.current}`,
              size: decodeAttachmentData(image.data, MAX_TOTAL_IMAGE_BYTES).byteLength,
              pixels: 0
            });
            continue;
          }
          const imageData = decoded[imageIndex++];
          if (!imageData) throw new Error("validated image bytes are unavailable");
          const bytes = imageData.bytes;
          const blob = new Blob([blobBytes(bytes)], { type: image.mimeType });
          restored.push({
            ...image,
            id: `restored-${++nextAttachmentId.current}`,
            previewUrl: URL.createObjectURL(blob),
            size: bytes.byteLength,
            pixels: imageData.pixels
          });
        }
      } catch {
        for (const attachment of restored)
          if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        return;
      }
      clearImageBlocks();
      publishAttachments(restored);
    },
    [clearImageBlocks, publishAttachments]
  );
  const addFiles = async (files) => {
    const t2 = dependencies.translate;
    if (imageDisabled) {
      onError(new Error(t2("composer.attachment.unavailable")));
      return;
    }
    const invalidImage = t2("composer.image.invalid");
    const tooLargeMessage = t2("composer.image.tooLarge");
    const accepted = [];
    let acceptedImages = 0;
    for (const file of files) {
      const visual = policy.supported && nativeImageFile(file);
      if (file.size > (visual ? MAX_SOURCE_IMAGE_BYTES : MAX_TOTAL_IMAGE_BYTES)) {
        onError(new Error(tooLargeMessage));
        continue;
      }
      if (attachmentsRef.current.length + pendingCountRef.current + accepted.length >= USER_MESSAGE_ATTACHMENT_LIMITS.maxCount) {
        onError(
          new Error(t2("composer.attachment.tooMany", { count: USER_MESSAGE_ATTACHMENT_LIMITS.maxCount }))
        );
        continue;
      }
      if (visual && attachmentsRef.current.filter((block) => block.type === "image").length + pendingImageCountRef.current + acceptedImages >= policy.maxCount) {
        onError(new Error(t2("composer.image.tooMany", { count: policy.maxCount })));
        continue;
      }
      accepted.push(file);
      if (visual) acceptedImages++;
    }
    if (accepted.length === 0) return;
    const readGeneration = generation.current;
    pendingCountRef.current += accepted.length;
    pendingImageCountRef.current += acceptedImages;
    setPendingCount(pendingCountRef.current);
    onAttachmentsChange?.();
    for (const file of accepted) {
      if (readGeneration !== generation.current) break;
      const visual = policy.supported && nativeImageFile(file);
      await (async () => {
        try {
          const candidate = !file.type && /\.(png|jpe?g)$/iu.test(file.name) ? new File([file], file.name, { type: /\.png$/iu.test(file.name) ? "image/png" : "image/jpeg" }) : file;
          const scaled = visual && dependencies.downscaleImage ? await dependencies.downscaleImage(candidate, policy) : candidate;
          const { data, bytes } = await readImage(scaled);
          if (readGeneration !== generation.current) return;
          if (visual && (JSON.stringify(currentView.current.imagePolicy) !== JSON.stringify(view.imagePolicy) || !currentView.current.imagePolicy?.supported)) {
            onError(new Error(t2("composer.image.modelChanged")));
            return;
          }
          const current2 = attachmentsRef.current;
          const total = current2.reduce((sum2, image) => sum2 + image.size, 0);
          if (scaled.size > MAX_IMAGE_BYTES || total + scaled.size > MAX_TOTAL_IMAGE_BYTES) {
            onError(new Error(tooLargeMessage));
            return;
          }
          if (!visual || scaled.type !== "image/png" && scaled.type !== "image/jpeg") {
            const block = {
              type: "file",
              data,
              mimeType: scaled.type.split(";")[0]?.trim() || "application/octet-stream",
              name: file.name
            };
            validateUserAttachments([block]);
            publishAttachments([
              ...current2,
              { ...block, id: `file-${++nextAttachmentId.current}`, size: bytes.byteLength, pixels: 0 }
            ]);
            return;
          }
          if (data.length > (policy.maxBase64Bytes ?? Infinity)) {
            onError(new Error(t2("composer.image.modelLimit")));
            return;
          }
          if (current2.filter((block) => block.type === "image").length >= policy.maxCount) {
            onError(new Error(t2("composer.image.tooMany", { count: policy.maxCount })));
            return;
          }
          let pixels;
          try {
            const decoded = decodeSafeImageBytes({ bytes, mimeType: scaled.type }, IMAGE_PREVIEW_LIMITS);
            pixels = decoded.pixels;
            if (current2.reduce((sum2, image) => sum2 + image.pixels, pixels) > IMAGE_PREVIEW_LIMITS.maxAggregatePixels) {
              onError(new Error(t2("composer.image.tooManyPixels")));
              return;
            }
            if (decoded.width > policy.maxWidth || decoded.height > policy.maxHeight) {
              onError(new Error(t2("composer.image.modelLimit")));
              return;
            }
          } catch (error) {
            const notice2 = attachmentErrorNotice(error);
            onError(new Error(notice2 ? t2(notice2.key, notice2.vars) : invalidImage));
            return;
          }
          const attachment = {
            type: "image",
            data,
            mimeType: scaled.type,
            id: `image-${++nextAttachmentId.current}`,
            previewUrl: URL.createObjectURL(scaled),
            size: scaled.size,
            pixels
          };
          publishAttachments([...current2, attachment]);
        } catch (error) {
          if (readGeneration === generation.current) {
            const refusal = attachmentErrorNotice(error);
            onError(new Error(refusal ? t2(refusal.key, refusal.vars) : t2("composer.image.readFailed")));
          }
        } finally {
          if (readGeneration === generation.current) {
            pendingCountRef.current -= 1;
            if (visual) pendingImageCountRef.current -= 1;
            setPendingCount(pendingCountRef.current);
            onAttachmentsChange?.();
          }
        }
      })();
    }
  };
  const removeImage = (id) => {
    const removed = attachmentsRef.current.find((attachment) => attachment.id === id);
    if (!removed) return;
    if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    publishAttachments(attachmentsRef.current.filter((attachment) => attachment.id !== id));
  };
  const handlePaste = (event) => {
    const clipboard = event.clipboardData;
    const itemFiles = [];
    for (const item of Array.from(clipboard.items)) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file) itemFiles.push(file);
    }
    const files = itemFiles.length > 0 ? itemFiles : Array.from(clipboard.files);
    if (files.length === 0) return;
    event.preventDefault();
    const text3 = clipboard.getData("text/plain");
    if (text3) {
      const textarea = event.currentTarget;
      textarea.setRangeText(text3, textarea.selectionStart, textarea.selectionEnd, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    void addFiles(files);
  };
  const handleDrop = (event) => {
    if (event.dataTransfer.files.length === 0) return;
    event.preventDefault();
    void addFiles(Array.from(event.dataTransfer.files));
  };
  useLayoutEffect2(
    () => () => {
      generation.current += 1;
      for (const attachment of attachmentsRef.current)
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      attachmentsRef.current = [];
    },
    []
  );
  useImperativeHandle2(
    ref,
    () => ({
      clearImageBlocks,
      focus() {
        prompt.current?.focus();
      },
      getDraft() {
        return prompt.current?.value ?? "";
      },
      getImageBlocks() {
        return attachmentsRef.current.filter((block) => block.type === "image").map(({ type, data, mimeType }) => ({ type, data, mimeType }));
      },
      getAttachmentBlocks() {
        return attachmentsRef.current.map(
          (block) => block.type === "file" ? { type: block.type, data: block.data, mimeType: block.mimeType, name: block.name } : { type: block.type, data: block.data, mimeType: block.mimeType }
        );
      },
      restoreAttachmentBlocks,
      hasPendingImages() {
        return pendingCountRef.current > 0;
      },
      render(next) {
        flushSync(() => setView(next));
      },
      restoreImageBlocks: restoreAttachmentBlocks,
      resize() {
        if (prompt.current) dependencies.resize(prompt.current);
      },
      setDraft(value) {
        if (!prompt.current || prompt.current.value === value) return;
        prompt.current.value = value;
        dependencies.resize(prompt.current);
      }
    }),
    [dependencies.resize, clearImageBlocks, restoreAttachmentBlocks]
  );
  useLayoutEffect2(() => {
    if (!model.current || !permission.current || !usage.current) return;
    modelPicker.current = dependencies.createModelPicker({
      trigger: model.current,
      onError,
      onSelect: onModelSelect,
      ...onModelSettingsChange ? { onSettingsChange: onModelSettingsChange } : {}
    });
    permissionPicker.current = dependencies.createPermissionPicker({
      trigger: permission.current,
      onError,
      onSelect: onPermissionSelect
    });
    if (!dependencies.UsagePanel)
      renderUsage.current = dependencies.createUsagePanel(usage.current, dependencies.translate);
    return () => {
      modelPicker.current?.destroy();
      permissionPicker.current?.destroy();
      modelPicker.current = void 0;
      permissionPicker.current = void 0;
      renderUsage.current?.dispose?.();
      renderUsage.current = void 0;
    };
  }, [dependencies, onError, onModelSelect, onModelSettingsChange, onPermissionSelect]);
  useLayoutEffect2(() => {
    modelPicker.current?.render(pickerState(view));
    permissionPicker.current?.render(view.permission);
    renderUsage.current?.(view.usage, view.connected);
  }, [view, dependencies, onError, onModelSelect, onPermissionSelect]);
  const queueSection = view.queue && (view.queue.items.length > 0 || view.queue.error) ? createElement2(
    "section",
    { className: "composer-queue", "aria-label": dependencies.translate("composer.queue.label") },
    createElement2(
      "p",
      { className: "composer-queue-count", "aria-live": "polite" },
      dependencies.translate("composer.queue.count", { count: view.queue.items.length })
    ),
    createElement2(
      "ol",
      null,
      view.queue.items.map(
        (item, index) => createElement2(
          "li",
          { key: item.itemId, "data-queue-item": item.itemId },
          createElement2(
            "div",
            { className: "composer-queue-row" },
            createElement2(
              "span",
              { className: "composer-queue-preview", title: item.preview },
              item.preview || dependencies.translate("composer.queue.attachment")
            ),
            createElement2(
              "button",
              {
                className: "composer-queue-send",
                type: "button",
                disabled: view.queue?.disabled || !onSendNow,
                "aria-label": dependencies.translate("composer.queue.sendAccessible", {
                  index: index + 1
                }),
                title: dependencies.translate("composer.queue.sendTitle"),
                "aria-busy": view.queue?.sending === item.itemId,
                onClick: () => {
                  onSendNow?.(item.itemId);
                  prompt.current?.focus();
                }
              },
              dependencies.translate(
                view.queue?.sending === item.itemId ? "composer.queue.sending" : "composer.queue.send"
              )
            ),
            onRemoveQueued ? createElement2(
              "button",
              {
                type: "button",
                className: "composer-queue-remove",
                disabled: view.queue?.removeDisabled ?? view.queue?.disabled,
                "aria-label": dependencies.translate("composer.queue.removeAccessible", {
                  index: index + 1
                }),
                title: dependencies.translate("composer.queue.removeTitle"),
                "aria-busy": view.queue?.removing === item.itemId,
                onClick: () => {
                  onRemoveQueued(item.itemId);
                  prompt.current?.focus();
                }
              },
              dependencies.translate(
                view.queue?.removing === item.itemId ? "composer.queue.removing" : "composer.queue.remove"
              )
            ) : null
          )
        )
      )
    ),
    view.queue.error ? createElement2("p", { className: "composer-queue-error", role: "alert" }, view.queue.error) : null
  ) : null;
  return createElement2(
    Fragment,
    null,
    queueSection,
    createElement2(
      "form",
      {
        ref: form,
        id: "composer",
        "data-agnes-region": "composer",
        "data-agnes-region-owner": "builtin",
        "data-agnes-region-unit": "composer",
        onDragOver: (event) => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault();
        },
        onDrop: handleDrop,
        onSubmit: (event) => {
          event.preventDefault();
          onSubmit();
        }
      },
      slots?.overlay,
      // 待发图片排在输入文字上方：文字行数增长时图片不会被顶出视野。空态由 CSS 收掉
      // （style.css 的 :has 规则），这里不额外做条件渲染。
      createElement2(
        "div",
        { className: "composer-image-attachments" },
        createElement2(
          "div",
          {
            className: "composer-image-preview-list",
            "aria-label": imageHint,
            "aria-live": "polite"
          },
          ...attachments.map(
            (attachment, index) => createElement2(
              "figure",
              {
                className: attachment.type === "image" ? "composer-image-preview" : "composer-file-preview",
                key: attachment.id
              },
              attachment.type === "image" ? createElement2("img", {
                src: attachment.previewUrl,
                alt: dependencies.translate("composer.image.alt", { index: index + 1 })
              }) : createElement2("span", { title: attachment.name }, attachment.name),
              attachment.type === "file" ? createElement2("small", null, `${(attachment.size / 1024).toFixed(1)} KiB`) : null,
              createElement2(
                "button",
                {
                  type: "button",
                  "data-remove-image": true,
                  "aria-label": dependencies.translate("composer.attachment.remove", { index: index + 1 }),
                  disabled: view.sending,
                  onClick: () => removeImage(attachment.id)
                },
                "×"
              )
            )
          ),
          pendingCount > 0 ? createElement2(
            "span",
            { className: "composer-image-pending", role: "status" },
            dependencies.translate("composer.image.reading")
          ) : void 0
        )
      ),
      createElement2(
        "div",
        { className: "composer-writing" },
        createElement2(
          "label",
          { className: "visually-hidden", htmlFor: "prompt" },
          dependencies.translate("composer.input.label")
        ),
        createElement2("textarea", {
          ref: prompt,
          id: "prompt",
          "data-agnes-region": "composer-input",
          rows: 1,
          "aria-describedby": "composer-hint",
          disabled: view.input.disabled,
          placeholder: view.input.placeholder,
          defaultValue: initialDraft,
          onKeyDown: (event) => {
            if (!dependencies.isSubmitShortcut({
              key: event.key,
              shiftKey: event.shiftKey,
              isComposing: event.nativeEvent.isComposing,
              keyCode: event.keyCode,
              metaKey: event.metaKey,
              ctrlKey: event.ctrlKey
            }))
              return;
            event.preventDefault();
            form.current?.requestSubmit();
          },
          onInput: (event) => onDraftChange(event.currentTarget.value),
          onPaste: handlePaste
        }),
        createElement2("p", { id: "composer-hint", "data-kind": view.hint.kind }, view.hint.text),
        slots?.attachments
      ),
      createElement2(
        "div",
        { className: "composer-controls" },
        slots?.left,
        createElement2(
          "button",
          {
            id: "composer-workspace",
            className: "composer-workspace",
            type: "button",
            "aria-haspopup": "dialog",
            title: view.workspace.title,
            disabled: view.workspace.disabled,
            onClick: onWorkspace
          },
          createElement2(
            "svg",
            {
              className: "icon icon-folder",
              "data-agnes-region": "icon",
              viewBox: "0 0 16 16",
              "aria-hidden": true
            },
            createElement2("path", {
              d: "M5.37012 2.8418C5.52719 2.84178 5.68146 2.88387 5.81641 2.96289C5.95148 3.04201 6.06232 3.15581 6.13672 3.29199L6.74414 4.40137H12.7383C13.2166 4.40139 13.6084 4.78249 13.6084 5.25391V12.6631C13.6082 13.1343 13.2165 13.5146 12.7383 13.5146H2.7627C2.28458 13.5146 1.89277 13.1343 1.89258 12.6631V3.69434C1.89258 3.22297 2.28447 2.84189 2.7627 2.8418H5.37012ZM2.83496 11.4932V12.5908H12.667V11.5645H12.666V8.00488L2.84961 7.99121L2.83496 11.4932ZM2.83496 7.06738H12.666V5.32617H6.18066L6.16016 5.28809L5.32715 3.76562H2.83496V7.06738Z"
            })
          ),
          createElement2("span", { "data-workspace-label": true }, view.workspace.label),
          createElement2(
            "svg",
            {
              className: "icon model-chevron",
              "data-agnes-region": "icon",
              viewBox: "0 0 24 24",
              "aria-hidden": true
            },
            createElement2("path", { d: "m6 9 6 6 6-6" })
          )
        ),
        slots?.permission,
        createElement2(
          "button",
          {
            ref: permission,
            id: "composer-permission",
            className: "composer-permission",
            type: "button",
            "aria-haspopup": "listbox",
            "aria-expanded": false,
            "aria-label": dependencies.translate("composer.permission.accessible"),
            title: dependencies.translate("composer.permission.workspace"),
            disabled: view.permission.disabled
          },
          createElement2(
            "svg",
            { className: "icon", "data-agnes-region": "icon", viewBox: "0 0 24 24", "aria-hidden": true },
            createElement2("path", {
              d: "M12 3 5 6.5v5.2c0 4.4 2.9 8.4 7 9.8 4.1-1.4 7-5.4 7-9.8V6.5L12 3zm0 2.1 5 2.5v4.1c0 3.4-2.2 6.5-5 7.7-2.8-1.2-5-4.3-5-7.7V7.6l5-2.5z"
            })
          ),
          createElement2(
            "span",
            { "data-permission-label": true },
            dependencies.translate("composer.permission.workspace")
          ),
          createElement2(
            "svg",
            {
              className: "icon model-chevron",
              "data-agnes-region": "icon",
              viewBox: "0 0 24 24",
              "aria-hidden": true
            },
            createElement2("path", { d: "m6 9 6 6 6-6" })
          )
        ),
        slots?.model,
        slots?.right,
        slots?.plan,
        createElement2(
          "div",
          { className: "model-field" },
          createElement2(
            "button",
            {
              ref: model,
              id: "model",
              type: "button",
              "aria-haspopup": "listbox",
              "aria-expanded": false,
              "aria-label": view.model.accessibleName
            },
            createElement2("span", { "data-model-label": true }, view.model.label),
            createElement2(
              "svg",
              {
                className: "icon model-chevron",
                "data-agnes-region": "icon",
                viewBox: "0 0 24 24",
                "aria-hidden": true
              },
              createElement2("path", { d: "m6 9 6 6 6-6" })
            )
          )
        ),
        createElement2(
          "section",
          {
            ref: usage,
            id: "session-usage",
            "aria-label": dependencies.translate("composer.usage.label"),
            hidden: dependencies.UsagePanel ? !view.usage : true
          },
          dependencies.UsagePanel ? createElement2(dependencies.UsagePanel, {
            usage: view.usage,
            connected: view.connected,
            t: dependencies.translate
          }) : void 0
        ),
        createElement2(
          "button",
          {
            id: "cancel",
            className: "secondary-button compact",
            type: "button",
            hidden: view.cancel.hidden,
            disabled: view.cancel.disabled,
            onClick: onCancel
          },
          view.cancel.label
        ),
        createElement2("input", {
          ref: fileInput,
          type: "file",
          hidden: true,
          multiple: true,
          "aria-label": dependencies.translate("composer.attachment.add"),
          onChange: (event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            void addFiles(files);
          }
        }),
        createElement2("span", { id: "composer-image-hint", className: "visually-hidden" }, imageHint),
        // 悬停说明走 antd Tooltip：原生 title 的气泡样式、延迟和位置都不可控，和界面其它浮层也不一致。
        // 无障碍说明仍由按钮自己的 aria-describedby 指向下面那个 visually-hidden 的 #composer-image-hint，
        // 所以去掉 title 不丢信息。
        createElement2(
          Tooltip,
          { title: imageHint },
          createElement2(
            "button",
            {
              id: "composer-attach",
              type: "button",
              className: "secondary-button compact",
              "aria-label": dependencies.translate("composer.attachment.add"),
              "aria-describedby": "composer-image-hint",
              "aria-disabled": imageDisabled || attachments.length + pendingCount >= USER_MESSAGE_ATTACHMENT_LIMITS.maxCount,
              onClick: () => {
                if (imageDisabled) {
                  if (!policy.supported)
                    onError(new Error(dependencies.translate("composer.image.unsupported")));
                  return;
                }
                if (attachments.length + pendingCount >= USER_MESSAGE_ATTACHMENT_LIMITS.maxCount) {
                  onError(
                    new Error(
                      dependencies.translate("composer.attachment.tooMany", {
                        count: USER_MESSAGE_ATTACHMENT_LIMITS.maxCount
                      })
                    )
                  );
                  return;
                }
                fileInput.current?.click();
              }
            },
            createElement2(
              "svg",
              { className: "icon", viewBox: "0 0 24 24", "aria-hidden": true },
              createElement2("path", {
                d: "m16 6l-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"
              })
            )
          )
        ),
        createElement2(
          "button",
          {
            id: "send",
            className: "primary-button",
            type: "submit",
            disabled: view.send.disabled,
            "data-mode": view.send.mode,
            "aria-label": view.send.label,
            title: view.send.title
          },
          createElement2("span", null, view.send.label),
          createElement2(
            "svg",
            { className: "icon", "data-agnes-region": "icon", viewBox: "0 0 24 24", "aria-hidden": true },
            createElement2("path", { d: "M12 19V5M6.5 10.5 12 5l5.5 5.5" })
          )
        ),
        slots?.dock
      )
    )
  );
});

// ../web-units/src/conversation/message-actions.ts
import { ConversationTurnActions } from "@agnes/web-ui/assistant-ui";
import { createElement as createElement3 } from "react";
import { flushSync as flushSync2 } from "react-dom";
import { createRoot } from "react-dom/client";
var initialTurn = {
  id: "",
  turn: 0,
  startSeq: 0,
  startedAt: "",
  status: "running",
  nodeIds: [],
  usage: {
    totals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
    reasoningComplete: true,
    billingComplete: true,
    calls: []
  },
  inherited: false,
  forkable: false
};
function createConversationMessageActions(options = {}) {
  const element3 = document.createElement("div");
  element3.style.display = "contents";
  const root = createRoot(element3);
  const feedbackRef = { current: null };
  let disposed = false;
  let stopDismiss;
  const bindAutoDismiss = (details) => {
    if (options.bindAutoDismiss) return options.bindAutoDismiss(details);
    const doc = details.ownerDocument;
    const dismiss = (event) => {
      if (details.isConnected && details.open && !event.composedPath().includes(details)) details.open = false;
    };
    doc.addEventListener("click", dismiss);
    stopDismiss = () => doc.removeEventListener("click", dismiss);
  };
  const render3 = ({ turn, finalText, settled, localeTag }) => flushSync2(
    () => root.render(
      createElement3(ConversationTurnActions, {
        turn,
        finalText,
        settled,
        ...options.t ? { t: options.t } : {},
        ...localeTag ? { localeTag } : {},
        ...options.onFork ? { onFork: options.onFork } : {},
        bindAutoDismiss,
        feedbackRef
      })
    )
  );
  render3({ turn: initialTurn, finalText: "", settled: false });
  const feedbackElement = element3.querySelector(".turn-feedback");
  if (!feedbackElement) throw new Error("missing React turn feedback");
  const clearFeedback = () => {
    if (!disposed) flushSync2(() => feedbackRef.current?.clear());
  };
  const feedback = {
    element: feedbackElement,
    clear: clearFeedback,
    report(message2, durationMs) {
      if (!disposed) flushSync2(() => feedbackRef.current?.report(message2, durationMs));
    },
    dispose: clearFeedback
  };
  return {
    element: element3,
    feedback,
    update(state) {
      if (!disposed) render3(state);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopDismiss?.();
      stopDismiss = void 0;
      feedbackRef.current?.clear();
      queueMicrotask(() => {
        flushSync2(() => feedbackRef.current?.clear());
        root.unmount();
      });
    }
  };
}

// ../web-units/src/conversation/tool-card.ts
import { ConversationToolCard as ReactToolCard, toolOutcome } from "@agnes/web-ui/assistant-ui";
import { createElement as createElement4 } from "react";
import { flushSync as flushSync3 } from "react-dom";
import { createRoot as createRoot2 } from "react-dom/client";
function reactIcon(element3) {
  const properties = {};
  for (const attribute of element3.attributes) {
    if (/^on/i.test(attribute.name) || /^(?:style|href|xlink:href)$/i.test(attribute.name)) continue;
    const name = attribute.name === "class" ? "className" : attribute.name;
    properties[name] = attribute.value;
  }
  const children = Array.from(element3.childNodes, (child) => {
    if (child.nodeType === 3) return child.textContent;
    if (child.nodeType === 1) return reactIcon(child);
    return null;
  });
  return createElement4(element3.localName, properties, ...children);
}
function createConversationToolCard(element3, node, options) {
  const host = element3.ownerDocument.createElement("div");
  host.style.display = "contents";
  element3.append(host);
  const root = createRoot2(host);
  let disposed = false;
  let iconName = node.name;
  let icon3 = reactIcon(options.icon(iconName));
  const render3 = (next) => {
    if (next.name !== iconName) {
      iconName = next.name;
      icon3 = reactIcon(options.icon(iconName));
    }
    element3.dataset.status = next.status;
    element3.setAttribute(
      "aria-label",
      options.translate("tool.card.aria", {
        name: next.name,
        status: toolOutcome(next, options.translate).label
      })
    );
    flushSync3(
      () => root.render(
        createElement4(ReactToolCard, {
          node: next,
          icon: icon3,
          t: options.translate,
          onExpandedChange: (expanded) => {
            element3.dataset.expanded = String(expanded);
          }
        })
      )
    );
  };
  render3(node);
  return {
    update(next) {
      if (!disposed) render3(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      queueMicrotask(() => {
        root.unmount();
        host.remove();
      });
    }
  };
}

// ../web-units/src/conversation.ts
import {
  createElement as createElement5,
  forwardRef as forwardRef3,
  useImperativeHandle as useImperativeHandle3,
  useLayoutEffect as useLayoutEffect3,
  useRef as useRef3
} from "react";
var NEW_CONTENT_ICON_PATH = "M12 5v13M7 13l5 5 5-5";
function nearBottom(element3) {
  return element3.scrollHeight - element3.scrollTop - element3.clientHeight <= 80;
}
var Conversation = forwardRef3(function Conversation2({ onMount, onUnmount, translate, slots }, ref) {
  const t2 = translate ?? ((key) => key);
  const transcript = useRef3(null);
  const emptyState = useRef3(null);
  const newContentButton = useRef3(null);
  const messageActions = useRef3(null);
  const attachments = useRef3(null);
  const toolCard = useRef3(null);
  const feedback = useRef3(null);
  useImperativeHandle3(
    ref,
    () => ({
      setEmptyStateVisible(visible) {
        if (emptyState.current) emptyState.current.hidden = !visible;
      },
      isTranscriptNearBottom() {
        return transcript.current ? nearBottom(transcript.current) : false;
      }
    }),
    []
  );
  useLayoutEffect3(() => {
    const transcriptElement = transcript.current;
    const emptyStateElement = emptyState.current;
    const newContentElement = newContentButton.current;
    if (!transcriptElement || !emptyStateElement || !newContentElement || !messageActions.current || !attachments.current || !toolCard.current || !feedback.current)
      return;
    onMount?.({
      transcript: transcriptElement,
      emptyState: emptyStateElement,
      newContentButton: newContentElement,
      messageActions: messageActions.current,
      attachments: attachments.current,
      toolCard: toolCard.current,
      feedback: feedback.current
    });
    return onUnmount;
  }, [onMount, onUnmount]);
  return createElement5(
    "div",
    {
      className: "conversation-region-root",
      "data-agnes-region-owner": "builtin",
      "data-agnes-region-unit": "conversation"
    },
    createElement5(
      "div",
      { style: { display: "contents" }, "data-agnes-conversation-dsh": "session" },
      slots?.sessionHeader,
      slots?.session
    ),
    createElement5("section", {
      ref: transcript,
      id: "transcript",
      "data-agnes-region": "transcript",
      "aria-label": t2("conversation.transcriptAria"),
      tabIndex: -1
    }),
    createElement5("section", {
      ref: emptyState,
      id: "empty-state",
      "data-agnes-region": "empty-state",
      "aria-labelledby": "empty-state-title",
      hidden: true
    }),
    createElement5(
      "button",
      { ref: newContentButton, id: "new-content", className: "new-content", type: "button", hidden: true },
      createElement5(
        "svg",
        { className: "icon", "data-agnes-region": "icon", viewBox: "0 0 24 24", "aria-hidden": true },
        createElement5("path", { d: NEW_CONTENT_ICON_PATH })
      ),
      createElement5("span", null, t2("conversation.newContent"))
    ),
    // These outlet hosts are intentionally display-contents: card renderers own the existing
    // timeline layout, while independently replaceable units get stable child mount points.
    createElement5("div", {
      ref: messageActions,
      style: { display: "contents" },
      "data-agnes-conversation-slot": "message-actions"
    }),
    createElement5("div", {
      ref: attachments,
      style: { display: "contents" },
      "data-agnes-conversation-slot": "attachments"
    }),
    createElement5("div", {
      ref: toolCard,
      style: { display: "contents" },
      "data-agnes-conversation-slot": "tool-card"
    }),
    createElement5("div", {
      ref: feedback,
      style: { display: "contents" },
      "data-agnes-conversation-slot": "feedback"
    })
  );
});

// ../web-units/src/diagnostics-locale.ts
var en = {
  "diagnostics.title.menu": "Report a problem",
  "diagnostics.title.share": "Choose what to include",
  "diagnostics.title.ready": "Diagnostics package is ready",
  "diagnostics.title.saved": "Diagnostics file saved",
  "diagnostics.intro": "Create a diagnostics ZIP you can share with support. It can include this session’s conversation and trace, logs, and system information.",
  "diagnostics.redaction": "Secrets are redacted before sharing.",
  "diagnostics.cancel": "Cancel",
  "diagnostics.share": "Share diagnostics",
  "diagnostics.include.conversation": "Conversation and trace",
  "diagnostics.include.logs": "Logs",
  "diagnostics.include.system": "System information",
  "diagnostics.back": "Back",
  "diagnostics.generate": "Generate package",
  "diagnostics.generating": "Generating…",
  "diagnostics.warning": "Some diagnostics were unavailable or over the export limit. See diagnostic-export-warnings.json in the package.",
  "diagnostics.save": "Save ZIP",
  "diagnostics.savedIntro": "Share this ZIP with support or engineering. Unzip it and open index.html.",
  "diagnostics.close": "Close",
  "diagnostics.error.generate": "Could not generate the diagnostics package: {detail}",
  "diagnostics.error.save": "Could not save the diagnostics package: {detail}",
  "diagnostics.savedPartial": "The package was exported, but some material is incomplete",
  "diagnostics.viewer.title": "agh diagnostics package",
  "diagnostics.viewer.fallbackTitle": "Application scope",
  "diagnostics.viewer.meta": "Version {version} · exported {createdAt}",
  "diagnostics.viewer.tab.overview": "Overview",
  "diagnostics.viewer.tab.conversation": "Conversation",
  "diagnostics.viewer.tab.trace": "Trace",
  "diagnostics.viewer.tab.logs": "Logs",
  "diagnostics.viewer.tab.system": "System",
  "diagnostics.viewer.tab.artifacts": "Artifacts",
  "diagnostics.viewer.notIncluded": "Not included",
  "diagnostics.viewer.included": "Included",
  "diagnostics.viewer.excluded": "Not included",
  "diagnostics.viewer.events": "The full event ledger is events.jsonl ({count} records, through seq {seq})",
  "diagnostics.viewer.duration.running": "In progress",
  "diagnostics.viewer.duration.ms": "{n} ms",
  "diagnostics.viewer.duration.seconds": "{n} s",
  "diagnostics.viewer.duration.minutes": "{minutes} min {seconds} s",
  "diagnostics.viewer.status.running": "In progress",
  "diagnostics.viewer.status.waiting": "Waiting",
  "diagnostics.viewer.status.completed": "Completed",
  "diagnostics.viewer.status.failed": "Failed",
  "diagnostics.viewer.status.cancelled": "Cancelled",
  "diagnostics.viewer.reason.unavailable": "Unavailable",
  "diagnostics.viewer.reason.truncated": "Truncated",
  "diagnostics.viewer.reason.limit": "Over the limit",
  "diagnostics.viewer.reason.timeout": "Timed out",
  "diagnostics.viewer.reason.failed": "Failed",
  "diagnostics.viewer.reason.imported": "Imported",
  "diagnostics.viewer.error": "Error: {message}",
  "diagnostics.viewer.turn": "Turn {turn}",
  "diagnostics.viewer.truncated": "…(truncated)",
  "diagnostics.viewer.warning": "{source}: {reason}",
  "diagnostics.viewer.warningDetail": "{source}: {reason} ({detail})",
  "diagnostics.viewer.toolSummary": "{name}: {summary}",
  "diagnostics.trace.window": "Only the {n} most recently loaded nodes are included. Earlier history is not included."
};
var zh = {
  "diagnostics.title.menu": "报告问题",
  "diagnostics.title.share": "选择要包含的内容",
  "diagnostics.title.ready": "诊断包已生成",
  "diagnostics.title.saved": "诊断文件已保存",
  "diagnostics.intro": "创建一个可分享给支持人员的诊断 ZIP 包，可以包含当前会话的对话与轨迹、日志和系统信息。",
  "diagnostics.redaction": "分享前会先对密钥脱敏。",
  "diagnostics.cancel": "取消",
  "diagnostics.share": "分享诊断",
  "diagnostics.include.conversation": "对话与轨迹",
  "diagnostics.include.logs": "日志",
  "diagnostics.include.system": "系统信息",
  "diagnostics.back": "返回",
  "diagnostics.generate": "生成诊断包",
  "diagnostics.generating": "正在生成…",
  "diagnostics.warning": "部分诊断资料不可用或超出导出上限，详见包内 diagnostic-export-warnings.json。",
  "diagnostics.save": "保存 ZIP 包",
  "diagnostics.savedIntro": "把这个 ZIP 包分享给支持或研发人员。解压后打开 index.html 查看。",
  "diagnostics.close": "关闭",
  "diagnostics.error.generate": "生成诊断包失败：{detail}",
  "diagnostics.error.save": "保存诊断包失败：{detail}",
  "diagnostics.savedPartial": "诊断包已导出，部分资料不完整",
  "diagnostics.viewer.title": "agh 诊断包",
  "diagnostics.viewer.fallbackTitle": "应用范围",
  "diagnostics.viewer.meta": "版本 {version} · 导出于 {createdAt}",
  "diagnostics.viewer.tab.overview": "概览",
  "diagnostics.viewer.tab.conversation": "对话",
  "diagnostics.viewer.tab.trace": "轨迹",
  "diagnostics.viewer.tab.logs": "日志",
  "diagnostics.viewer.tab.system": "系统",
  "diagnostics.viewer.tab.artifacts": "产物",
  "diagnostics.viewer.notIncluded": "未包含",
  "diagnostics.viewer.included": "已包含",
  "diagnostics.viewer.excluded": "未包含",
  "diagnostics.viewer.events": "完整事件账本见 events.jsonl（{count} 条，截至 seq {seq}）",
  "diagnostics.viewer.duration.running": "进行中",
  "diagnostics.viewer.duration.ms": "{n} 毫秒",
  "diagnostics.viewer.duration.seconds": "{n} 秒",
  "diagnostics.viewer.duration.minutes": "{minutes} 分 {seconds} 秒",
  "diagnostics.viewer.status.running": "进行中",
  "diagnostics.viewer.status.waiting": "等待中",
  "diagnostics.viewer.status.completed": "已完成",
  "diagnostics.viewer.status.failed": "失败",
  "diagnostics.viewer.status.cancelled": "已取消",
  "diagnostics.viewer.reason.unavailable": "不可用",
  "diagnostics.viewer.reason.truncated": "已截断",
  "diagnostics.viewer.reason.limit": "超出上限",
  "diagnostics.viewer.reason.timeout": "超时",
  "diagnostics.viewer.reason.failed": "失败",
  "diagnostics.viewer.reason.imported": "导入",
  "diagnostics.viewer.error": "错误：{message}",
  "diagnostics.viewer.turn": "第 {turn} 轮",
  "diagnostics.viewer.truncated": "…（已截断）",
  "diagnostics.viewer.warning": "{source}：{reason}",
  "diagnostics.viewer.warningDetail": "{source}：{reason}（{detail}）",
  "diagnostics.viewer.toolSummary": "{name}：{summary}",
  "diagnostics.trace.window": "仅含已加载的最近 {n} 个节点，更早的历史未包含"
};
var diagnosticsCatalog = { en: { ...en }, "zh-CN": { ...zh } };
function diagnosticsLocale() {
  if (typeof document !== "undefined" && document.documentElement?.lang === "zh-CN") return "zh-CN";
  return "en";
}
function diagnosticsText(key, vars, locale = diagnosticsLocale()) {
  const template = diagnosticsCatalog[locale][key] ?? diagnosticsCatalog.en[key];
  if (!vars) return template;
  return template.replace(
    /\{(\w+)\}/g,
    (match, name) => Object.hasOwn(vars, name) ? String(vars[name]) : match
  );
}
function diagnosticsViewerLabels(locale = diagnosticsLocale()) {
  const text3 = (key, vars) => diagnosticsText(key, vars, locale);
  return {
    notIncluded: text3("diagnostics.viewer.notIncluded"),
    included: text3("diagnostics.viewer.included"),
    excluded: text3("diagnostics.viewer.excluded"),
    durationRunning: text3("diagnostics.viewer.duration.running"),
    durationMs: text3("diagnostics.viewer.duration.ms"),
    durationSeconds: text3("diagnostics.viewer.duration.seconds"),
    durationMinutes: text3("diagnostics.viewer.duration.minutes"),
    status: {
      running: text3("diagnostics.viewer.status.running"),
      waiting: text3("diagnostics.viewer.status.waiting"),
      completed: text3("diagnostics.viewer.status.completed"),
      failed: text3("diagnostics.viewer.status.failed"),
      cancelled: text3("diagnostics.viewer.status.cancelled")
    },
    reason: {
      unavailable: text3("diagnostics.viewer.reason.unavailable"),
      truncated: text3("diagnostics.viewer.reason.truncated"),
      limit: text3("diagnostics.viewer.reason.limit"),
      timeout: text3("diagnostics.viewer.reason.timeout"),
      failed: text3("diagnostics.viewer.reason.failed"),
      imported: text3("diagnostics.viewer.reason.imported")
    },
    include: {
      conversation: text3("diagnostics.include.conversation"),
      logs: text3("diagnostics.include.logs"),
      system: text3("diagnostics.include.system")
    },
    error: text3("diagnostics.viewer.error"),
    turn: text3("diagnostics.viewer.turn"),
    events: text3("diagnostics.viewer.events"),
    truncated: text3("diagnostics.viewer.truncated"),
    warning: text3("diagnostics.viewer.warning"),
    warningDetail: text3("diagnostics.viewer.warningDetail"),
    toolSummary: text3("diagnostics.viewer.toolSummary")
  };
}

// ../web-units/src/diagnostics-viewer.ts
function escapeBundleJson(bundle) {
  return JSON.stringify(bundle).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
var TAB_IDS = ["overview", "conversation", "trace", "logs", "system", "artifacts"];
var STYLE = `
:root { color-scheme: light dark; --agh-bg:#fff; --agh-fg:#1a1a1a; --agh-muted:#666; --agh-border:#ddd; --agh-accent:#2563eb; }
@media (prefers-color-scheme: dark) {
  :root { --agh-bg:#111318; --agh-fg:#e6e6e6; --agh-muted:#9aa0a6; --agh-border:#333; --agh-accent:#7aa2f7; }
}
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--agh-bg); color: var(--agh-fg); }
header { padding: 16px 20px; border-bottom: 1px solid var(--agh-border); }
header h1 { margin: 0 0 4px; font-size: 18px; }
header p { margin: 2px 0; color: var(--agh-muted); font-size: 13px; }
nav { display: flex; gap: 4px; padding: 8px 20px; border-bottom: 1px solid var(--agh-border); flex-wrap: wrap; }
nav button { border: 1px solid var(--agh-border); background: transparent; color: var(--agh-fg); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
nav button[aria-selected="true"] { background: var(--agh-accent); color: #fff; border-color: var(--agh-accent); }
main { padding: 16px 20px; }
main section { max-width: 960px; }
pre { white-space: pre-wrap; word-break: break-word; background: rgba(127, 127, 127, 0.08); padding: 8px; border-radius: 6px; font-size: 12px; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--agh-border); }
.agh-node, .agh-span { padding: 4px 0; border-bottom: 1px solid var(--agh-border); }
.agh-node-kind { font-weight: 600; margin-right: 6px; }
.agh-empty { color: var(--agh-muted); }
`;
var RUNTIME_SCRIPT = `
(function () {
  'use strict';
  var dataEl = document.getElementById('agh-bundle');
  var bundle = JSON.parse(dataEl ? dataEl.textContent : 'null');

  function el(tag, text, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function fill(template, vars) {
    return String(template).replace(/\\{(\\w+)\\}/g, function (_match, name) {
      return vars[name] == null ? '{' + name + '}' : String(vars[name]);
    });
  }
  function notIncluded(target) {
    target.appendChild(el('p', L.notIncluded, 'agh-empty'));
  }
  function fmtDuration(ms) {
    if (ms === undefined || ms === null) return L.durationRunning;
    if (ms < 1000) return fill(L.durationMs, { n: ms });
    if (ms < 60000) return fill(L.durationSeconds, { n: (ms / 1000).toFixed(ms < 10000 ? 1 : 0) });
    return fill(L.durationMinutes, { minutes: Math.floor(ms / 60000), seconds: Math.round((ms % 60000) / 1000) });
  }

  var STATUS_LABEL = L.status;
  var REASON_LABEL = L.reason;
  var INCLUDE_LABEL = L.include;

  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('#agh-tabs button'));
  var tabSections = Array.prototype.slice.call(document.querySelectorAll('main > section'));
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-tab');
      tabButtons.forEach(function (b) { b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
      tabSections.forEach(function (section) { section.hidden = section.id !== 'tab-' + name; });
    });
  });

  function renderOverview() {
    var root = document.getElementById('tab-overview');
    var list = el('ul', undefined, 'agh-include');
    Object.keys(INCLUDE_LABEL).forEach(function (key) {
      var included = bundle.include && bundle.include[key];
      list.appendChild(el('li', INCLUDE_LABEL[key] + ': ' + (included ? L.included : L.excluded)));
    });
    root.appendChild(list);
    if (bundle.warnings && bundle.warnings.length > 0) {
      var warnings = el('ul', undefined, 'agh-warnings');
      bundle.warnings.forEach(function (warning) {
        var reason = REASON_LABEL[warning.reason] || warning.reason;
        var text = warning.detail
          ? fill(L.warningDetail, { source: warning.source, reason: reason, detail: warning.detail })
          : fill(L.warning, { source: warning.source, reason: reason });
        warnings.appendChild(el('li', text));
      });
      root.appendChild(warnings);
    }
    if (bundle.events) {
      var summary = fill(L.events, { count: bundle.events.count, seq: bundle.events.lastSeq });
      root.appendChild(el('p', summary));
    }
  }

  function nodeText(node) {
    if (node.kind === 'user') return (node.content || []).map(function (b) { return (b && b.text) || ''; }).join(' ');
    if (node.kind === 'assistant') return node.text || node.thinking || '';
    if (node.kind === 'tool') return node.summary ? fill(L.toolSummary, { name: node.name, summary: node.summary }) : node.name;
    if (node.kind === 'approval') return node.summary || '';
    if (node.kind === 'compaction') return node.summary || '';
    if (node.kind === 'cost') return node.model || node.purpose || '';
    if (node.kind === 'artifact') return node.name || '';
    if (node.kind === 'context') return node.text || '';
    return '';
  }

  function renderConversation() {
    var root = document.getElementById('tab-conversation');
    var nodes = bundle.trace && bundle.trace.nodes;
    if (!nodes || nodes.length === 0) { notIncluded(root); return; }
    nodes.forEach(function (node) {
      var item = el('div', undefined, 'agh-node');
      item.appendChild(el('span', node.kind, 'agh-node-kind'));
      item.appendChild(el('span', nodeText(node)));
      item.appendChild(el('pre', JSON.stringify(node, null, 2)));
      root.appendChild(item);
    });
  }

  function renderSpan(span, depth, container) {
    var row = el('div', undefined, 'agh-span');
    row.style.paddingLeft = (depth * 16) + 'px';
    var parts = [span.kind, span.name, STATUS_LABEL[span.status] || span.status, fmtDuration(span.durationMs)];
    if (span.model) parts.push(span.model);
    if (span.error && span.error.message) parts.push(fill(L.error, { message: span.error.message }));
    row.textContent = parts.join(' · ');
    container.appendChild(row);
    (span.children || []).forEach(function (child) { renderSpan(child, depth + 1, container); });
  }

  function renderTrace() {
    var root = document.getElementById('tab-trace');
    var turns = (bundle.trace && bundle.trace.turns) || [];
    var withTrace = turns.filter(function (t) { return t.trace; });
    if (withTrace.length === 0) { notIncluded(root); return; }
    withTrace.forEach(function (turn) {
      root.appendChild(el('h3', fill(L.turn, { turn: turn.turn })));
      renderSpan(turn.trace, 0, root);
    });
  }

  function renderLogs() {
    var root = document.getElementById('tab-logs');
    if (!bundle.logs) { notIncluded(root); return; }
    ['daemon', 'host', 'browser'].forEach(function (key) {
      var value = bundle.logs[key];
      if (!value) return;
      root.appendChild(el('h3', key));
      if (key === 'browser') {
        var lines = (value.entries || []).map(function (entry) {
          return '[' + entry.ts + '] ' + entry.level + ' ' + entry.text;
        });
        root.appendChild(el('pre', lines.join('\\n')));
      } else {
        root.appendChild(el('pre', value.text + (value.truncated ? '\\n' + L.truncated : '')));
      }
    });
  }

  function renderSystem() {
    var root = document.getElementById('tab-system');
    if (!bundle.system) { notIncluded(root); return; }
    root.appendChild(el('pre', JSON.stringify(bundle.system, null, 2)));
  }

  function renderArtifacts() {
    var root = document.getElementById('tab-artifacts');
    if (!bundle.artifacts || bundle.artifacts.length === 0) { notIncluded(root); return; }
    var table = document.createElement('table');
    var head = document.createElement('tr');
    ['sha256', 'mime', 'lane', 'seq', 'source'].forEach(function (label) { head.appendChild(el('th', label)); });
    table.appendChild(head);
    bundle.artifacts.forEach(function (artifact) {
      var row = document.createElement('tr');
      row.appendChild(el('td', String(artifact.sha256).slice(0, 12)));
      row.appendChild(el('td', artifact.mime));
      row.appendChild(el('td', artifact.lane));
      row.appendChild(el('td', String(artifact.seq)));
      row.appendChild(el('td', artifact.source));
      table.appendChild(row);
    });
    root.appendChild(table);
  }

  renderOverview();
  renderConversation();
  renderTrace();
  renderLogs();
  renderSystem();
  renderArtifacts();
})();
`;
function renderDiagnosticsViewer(bundle, locale = diagnosticsLocale()) {
  const headerTitle = escapeHtml(
    bundle.sessionTitle ?? bundle.sessionId ?? diagnosticsText("diagnostics.viewer.fallbackTitle", void 0, locale)
  );
  const tabKey = {
    overview: "diagnostics.viewer.tab.overview",
    conversation: "diagnostics.viewer.tab.conversation",
    trace: "diagnostics.viewer.tab.trace",
    logs: "diagnostics.viewer.tab.logs",
    system: "diagnostics.viewer.tab.system",
    artifacts: "diagnostics.viewer.tab.artifacts"
  };
  const nav = TAB_IDS.map(
    (id, index) => `<button type="button" data-tab="${id}" aria-selected="${index === 0 ? "true" : "false"}">${escapeHtml(diagnosticsText(tabKey[id], void 0, locale))}</button>`
  ).join("");
  const sections = TAB_IDS.map(
    (id, index) => `<section id="tab-${id}"${index === 0 ? "" : " hidden"}></section>`
  ).join("");
  const labels = JSON.stringify(diagnosticsViewerLabels(locale)).replace(/</g, "\\u003c");
  const title = diagnosticsText("diagnostics.viewer.title", void 0, locale);
  const meta = diagnosticsText(
    "diagnostics.viewer.meta",
    { version: bundle.version, createdAt: bundle.createdAt },
    locale
  );
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<header>
<h1>${escapeHtml(title)}</h1>
<p id="agh-session-title">${headerTitle}</p>
<p id="agh-meta">${escapeHtml(meta)}</p>
</header>
<nav id="agh-tabs">${nav}</nav>
<main>${sections}</main>
<script type="application/json" id="agh-bundle">${escapeBundleJson(bundle)}<\/script>
<script>var L = ${labels};
${RUNTIME_SCRIPT}<\/script>
</body>
</html>
`;
}

// ../web-units/src/diagnostics-zip.ts
var CRC_TABLE = (() => {
  const t2 = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    t2[n] = c >>> 0;
  }
  return t2;
})();
function crc32(data) {
  let c = 4294967295;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}
async function deflateRaw(data) {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const stream = new Blob([buffer]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function checkPath(path) {
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((s) => s === ".." || s === ""))
    throw new Error(`unsafe zip path: ${JSON.stringify(path)}`);
}
function dosTime(d) {
  return {
    time: d.getHours() << 11 | d.getMinutes() << 5 | Math.floor(d.getSeconds() / 2),
    date: d.getFullYear() - 1980 << 9 | d.getMonth() + 1 << 5 | d.getDate()
  };
}
var LOCAL_HEADER_SIZE = 30;
var CENTRAL_HEADER_SIZE = 46;
var EOCD_SIZE = 22;
var FLAG_UTF8_NAME = 2048;
var VERSION = 20;
async function buildZip(entries2, now = /* @__PURE__ */ new Date()) {
  const seen = /* @__PURE__ */ new Set();
  for (const entry of entries2) {
    checkPath(entry.path);
    if (seen.has(entry.path)) throw new Error(`duplicate zip path: ${JSON.stringify(entry.path)}`);
    seen.add(entry.path);
  }
  const { time, date } = dosTime(now);
  const encoder3 = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const entry of entries2) {
    const name = encoder3.encode(entry.path);
    const compressed = await deflateRaw(entry.data);
    const store = compressed.length >= entry.data.length;
    const method = store ? 0 : 8;
    const payload = store ? entry.data : compressed;
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(LOCAL_HEADER_SIZE));
    local.setUint32(0, 67324752, true);
    local.setUint16(4, VERSION, true);
    local.setUint16(6, FLAG_UTF8_NAME, true);
    local.setUint16(8, method, true);
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, payload.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    central.push({ name, method, time, date, crc, csize: payload.length, usize: entry.data.length, offset });
    chunks.push(new Uint8Array(local.buffer), name, payload);
    offset += LOCAL_HEADER_SIZE + name.length + payload.length;
  }
  const cdOffset = offset;
  for (const record2 of central) {
    const header = new DataView(new ArrayBuffer(CENTRAL_HEADER_SIZE));
    header.setUint32(0, 33639248, true);
    header.setUint16(4, VERSION, true);
    header.setUint16(6, VERSION, true);
    header.setUint16(8, FLAG_UTF8_NAME, true);
    header.setUint16(10, record2.method, true);
    header.setUint16(12, record2.time, true);
    header.setUint16(14, record2.date, true);
    header.setUint32(16, record2.crc, true);
    header.setUint32(20, record2.csize, true);
    header.setUint32(24, record2.usize, true);
    header.setUint16(28, record2.name.length, true);
    header.setUint16(30, 0, true);
    header.setUint16(32, 0, true);
    header.setUint16(34, 0, true);
    header.setUint16(36, 0, true);
    header.setUint32(38, 0, true);
    header.setUint32(42, record2.offset, true);
    chunks.push(new Uint8Array(header.buffer), record2.name);
    offset += CENTRAL_HEADER_SIZE + record2.name.length;
  }
  const cdSize = offset - cdOffset;
  const eocd = new DataView(new ArrayBuffer(EOCD_SIZE));
  eocd.setUint32(0, 101010256, true);
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, central.length, true);
  eocd.setUint16(10, central.length, true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, cdOffset, true);
  eocd.setUint16(20, 0, true);
  chunks.push(new Uint8Array(eocd.buffer));
  const total = chunks.reduce((sum2, chunk) => sum2 + chunk.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

// ../web-units/src/locales/composer.ts
var composerLocaleCatalog = {
  en: {
    "composer.attachment.add": "Add attachments",
    "composer.attachment.dataInvalid": "The attachment data is not valid Base64.",
    "composer.attachment.hint": "All file types; up to 50 attachments and 100 MiB total after image processing. Images follow model limits. Some formats may be unreadable.",
    "composer.attachment.nameInvalid": "The attachment name or file type is invalid.",
    "composer.attachment.remove": "Remove attachment {index}",
    "composer.attachment.tooLarge": "Attachments in one message must total no more than 100 MiB.",
    "composer.attachment.tooMany": "A message can hold at most {count} attachments.",
    "composer.attachment.unavailable": "Attachments cannot be added right now.",
    "composer.input.label": "Task content",
    "composer.permission.accessible": "Choose permission for this session",
    "composer.permission.workspace": "Changes apply within the workspace",
    "composer.usage.label": "Context usage",
    "composer.queue.label": "Queued messages",
    "composer.queue.count": "Queued · {count}",
    "composer.queue.attachment": "Message with attachments",
    "composer.queue.send": "Send now",
    "composer.queue.sending": "Stopping and sending…",
    "composer.queue.sendAccessible": "Send queued message {index} now",
    "composer.queue.sendTitle": "Stop the current turn and run this message first",
    "composer.queue.remove": "Delete",
    "composer.queue.removing": "Deleting…",
    "composer.queue.removeAccessible": "Delete queued message {index}",
    "composer.queue.removeTitle": "Remove this message from the queue",
    "composer.image.limit": "PNG and JPEG, up to {count} images and 100 MiB in total after processing; model limits may be lower.",
    "composer.image.modelLimit": "The processed image exceeds this model’s size or dimension limits. Use a smaller image.",
    "composer.image.limitUnspecified": "PNG and JPEG, up to 100 MiB total after processing. Image count follows the model’s declared limits.",
    "composer.image.tooManyPixels": "Images in one message must total no more than 8 million pixels. Remove or resize an image.",
    "composer.image.add": "Add images",
    "composer.image.unsupported": "Select a model with image input to add images.",
    "composer.image.modelChanged": "The image limits changed. Add the image again.",
    "composer.image.reading": "Reading attachment…",
    "composer.image.invalid": "The file is not a valid PNG or JPEG image.",
    "composer.image.invalidType": "Only PNG and JPEG images are supported.",
    "composer.image.readFailed": "The attachment could not be read.",
    "composer.image.alt": "Attached image {index}",
    "composer.image.remove": "Remove image {index}",
    "composer.image.tooMany": "A message can hold at most {count} images.",
    "composer.image.tooLarge": "Attachments in one message must total no more than 100 MiB.",
    "composer.image.tooLargePixels": "The image has too many pixels to attach. Crop or scale it down and try again."
  },
  "zh-CN": {
    "composer.attachment.add": "添加附件",
    "composer.attachment.dataInvalid": "附件数据不是有效的 Base64。",
    "composer.attachment.hint": "可上传各类文件，最多 50 个，图片处理后附件合计不超过 100 MiB。图片按模型限制；部分格式可能无法解析。",
    "composer.attachment.nameInvalid": "附件名称或文件类型无效。",
    "composer.attachment.remove": "移除附件 {index}",
    "composer.attachment.tooLarge": "单条消息中的附件合计不能超过 100 MiB。",
    "composer.attachment.tooMany": "一条消息最多添加 {count} 个附件。",
    "composer.attachment.unavailable": "当前无法添加附件。",
    "composer.input.label": "任务内容",
    "composer.permission.accessible": "选择本会话权限",
    "composer.permission.workspace": "工作区内修改",
    "composer.usage.label": "上下文用量",
    "composer.queue.label": "待执行消息",
    "composer.queue.count": "待执行 · {count}",
    "composer.queue.attachment": "含附件的消息",
    "composer.queue.send": "立即发送",
    "composer.queue.sending": "正在停止并发送…",
    "composer.queue.sendAccessible": "立即发送第 {index} 条待执行消息",
    "composer.queue.sendTitle": "停止当前轮，优先执行这条消息",
    "composer.queue.remove": "删除",
    "composer.queue.removing": "正在删除…",
    "composer.queue.removeAccessible": "删除第 {index} 条待执行消息",
    "composer.queue.removeTitle": "从待执行队列中删除这条消息",
    "composer.image.limit": "支持 PNG 和 JPEG，最多 {count} 张，处理后合计不超过 100 MiB；模型限制可能更低。",
    "composer.image.modelLimit": "处理后的图片仍超过当前模型的大小或尺寸限制，请使用更小的图片。",
    "composer.image.limitUnspecified": "支持 PNG 和 JPEG，处理后合计不超过 100 MiB；数量按模型声明的限制执行。",
    "composer.image.tooManyPixels": "单条消息中的图片合计不能超过 800 万像素，请减少图片或缩小尺寸。",
    "composer.image.add": "添加图片",
    "composer.image.unsupported": "请先选择支持图片输入的模型。",
    "composer.image.modelChanged": "图片限制发生变化，请重新添加图片。",
    "composer.image.reading": "正在读取附件…",
    "composer.image.invalid": "文件内容不是有效的 PNG 或 JPEG 图片。",
    "composer.image.invalidType": "目前只支持 PNG 和 JPEG 图片。",
    "composer.image.readFailed": "无法读取附件文件。",
    "composer.image.alt": "附件图片 {index}",
    "composer.image.remove": "移除图片 {index}",
    "composer.image.tooMany": "一条消息最多添加 {count} 张图片。",
    "composer.image.tooLarge": "单条消息中的附件合计不能超过 100 MiB。",
    "composer.image.tooLargePixels": "图片像素过多，无法添加。请裁剪或缩小后重试。"
  }
};

// ../web-units/src/locales/conversation.ts
var conversationLocaleCatalog = {
  en: {
    "conversation.transcriptAria": "Conversation",
    "conversation.newContent": "New content"
  },
  "zh-CN": {
    "conversation.transcriptAria": "对话",
    "conversation.newContent": "有新内容"
  }
};

// ../web-units/src/locales/settings-shell.ts
var settingsShellLocaleCatalog = {
  en: {
    "settings-shell.railAria": "Settings categories",
    "settings-shell.railTitle": "Settings",
    "settings-shell.close": "Close settings",
    "settings-shell.basicLabel": "General",
    "settings-shell.modelNav": "Models & accounts",
    "settings-shell.pluginNav": "Plugin management",
    "settings-shell.resourceTabsAria": "Resource types",
    "settings-shell.skillsNav": "Skills",
    "settings-shell.archivedNav": "Archived sessions",
    "settings-shell.appearanceNav": "General",
    "settings-shell.modelKicker": "Connection settings",
    "settings-shell.modelTitle": "Model accounts",
    "settings-shell.modelIntro": "Manage provider connections and the default model. New tasks use the updated configuration after saving.",
    "settings-shell.accountsAria": "Saved model accounts",
    "settings-shell.accountsTitle": "My accounts",
    "settings-shell.accountsIntro": "Each account stores its own address, key and model.",
    "settings-shell.addAccount": "Add account",
    "settings-shell.accountsNote": "Sessions can switch between models offered by enabled accounts.",
    "settings-shell.archivedTitle": "Archived sessions",
    "settings-shell.archivedIntro": "View sessions parked for later and restore them to the workspace when needed.",
    "settings-shell.refreshList": "Refresh list",
    "settings-shell.searchLabel": "Search by name or workspace",
    "settings-shell.searchPlaceholder": "Search archived sessions",
    "settings-shell.appearanceTitle": "General",
    "settings-shell.appearanceIntro": "Adjust interface language, palette and font size. Settings stay in this browser.",
    "settings-shell.palette": "Palette",
    "settings-shell.paletteSystem": "Follow system",
    "settings-shell.paletteSystemHint": "Switch with the operating system light/dark setting",
    "settings-shell.paletteLight": "Light",
    "settings-shell.paletteLightHint": "Always use the light interface",
    "settings-shell.paletteDark": "Dark",
    "settings-shell.paletteDarkHint": "Always use the dark interface",
    "settings-shell.skin": "Skin",
    "settings-shell.fontScale": "Font size",
    "settings-shell.fontSmall": "Small",
    "settings-shell.fontSmallHint": "Shrink the interface one step",
    "settings-shell.fontNormal": "Standard",
    "settings-shell.fontNormalHint": "Default font size",
    "settings-shell.fontLarge": "Large",
    "settings-shell.fontLargeHint": "Grow the interface one step",
    "settings-shell.accountKicker": "Account configuration",
    "settings-shell.accountTitle": "Account details",
    "settings-shell.accountContext": "Edit the connection and default model",
    "settings-shell.connectionLegend": "Connection",
    "settings-shell.accountNameLabel": "Account name",
    "settings-shell.accountNamePlaceholder": "e.g. work account, local model",
    "settings-shell.providerLabel": "Provider",
    "settings-shell.baseUrlLabel": "Base URL",
    "settings-shell.apiKeyLabel": "API Key",
    "settings-shell.keyPlaceholder": "Enter a new key or keep the current one",
    "settings-shell.validationLegend": "Validation & default model",
    "settings-shell.authMethodLabel": "Auth method",
    "settings-shell.defaultModelLabel": "Default model",
    "settings-shell.defaultThinkingLabel": "Default thinking level",
    "settings-shell.contextBudgetLabel": "Default context budget (tokens)",
    "settings-shell.contextBudgetPlaceholder": "Automatic (model catalog default)",
    "settings-shell.modelSettingsHint": "K and M suffixes are supported; 100K means 100,000 tokens. New sessions inherit these defaults; existing sessions keep their settings.",
    "settings-shell.testConnection": "Test connection",
    "settings-shell.retryRead": "Retry reading the configuration",
    "settings-shell.accountGuard": "The default account cannot be disabled or deleted; set another enabled account as default first.",
    "settings-shell.saveAccount": "Save account"
  },
  "zh-CN": {
    "settings-shell.railAria": "设置分类",
    "settings-shell.railTitle": "设置",
    "settings-shell.close": "关闭设置",
    "settings-shell.basicLabel": "基础设置",
    "settings-shell.modelNav": "模型与账户",
    "settings-shell.pluginNav": "插件管理",
    "settings-shell.resourceTabsAria": "资源类型",
    "settings-shell.skillsNav": "技能",
    "settings-shell.archivedNav": "已归档会话",
    "settings-shell.appearanceNav": "通用",
    "settings-shell.modelKicker": "连接设置",
    "settings-shell.modelTitle": "模型账户",
    "settings-shell.modelIntro": "管理 Provider 连接和默认模型。保存后，新建任务会使用更新后的配置。",
    "settings-shell.accountsAria": "已保存的模型账户",
    "settings-shell.accountsTitle": "我的账户",
    "settings-shell.accountsIntro": "每个账户独立保存地址、密钥和模型。",
    "settings-shell.addAccount": "添加账户",
    "settings-shell.accountsNote": "会话可在已启用账户提供的模型之间切换。",
    "settings-shell.archivedTitle": "已归档会话",
    "settings-shell.archivedIntro": "查看已暂时收起的会话，需要时可以恢复到工作区。",
    "settings-shell.refreshList": "刷新列表",
    "settings-shell.searchLabel": "搜索名称或工作区",
    "settings-shell.searchPlaceholder": "搜索已归档会话",
    "settings-shell.appearanceTitle": "通用设置",
    "settings-shell.appearanceIntro": "调整界面语言、配色与字号。设置只保存在本机浏览器中。",
    "settings-shell.palette": "配色",
    "settings-shell.paletteSystem": "跟随系统",
    "settings-shell.paletteSystemHint": "随操作系统的深浅色设置自动切换",
    "settings-shell.paletteLight": "浅色",
    "settings-shell.paletteLightHint": "始终使用浅色界面",
    "settings-shell.paletteDark": "深色",
    "settings-shell.paletteDarkHint": "始终使用深色界面",
    "settings-shell.skin": "皮肤",
    "settings-shell.fontScale": "字号",
    "settings-shell.fontSmall": "小",
    "settings-shell.fontSmallHint": "界面整体缩小一档",
    "settings-shell.fontNormal": "标准",
    "settings-shell.fontNormalHint": "默认字号",
    "settings-shell.fontLarge": "大",
    "settings-shell.fontLargeHint": "界面整体放大一档",
    "settings-shell.accountKicker": "账户配置",
    "settings-shell.accountTitle": "账户详情",
    "settings-shell.accountContext": "编辑连接与默认模型",
    "settings-shell.connectionLegend": "连接信息",
    "settings-shell.accountNameLabel": "账户名称",
    "settings-shell.accountNamePlaceholder": "例如：工作账户、本地模型",
    "settings-shell.providerLabel": "Provider",
    "settings-shell.baseUrlLabel": "服务地址",
    "settings-shell.apiKeyLabel": "API Key",
    "settings-shell.keyPlaceholder": "输入新密钥或保留当前密钥",
    "settings-shell.validationLegend": "验证与默认模型",
    "settings-shell.authMethodLabel": "认证方式",
    "settings-shell.defaultModelLabel": "默认模型",
    "settings-shell.defaultThinkingLabel": "默认思考强度",
    "settings-shell.contextBudgetLabel": "默认上下文预算（Token）",
    "settings-shell.contextBudgetPlaceholder": "自动（模型目录默认值）",
    "settings-shell.modelSettingsHint": "支持 K/M 单位，如 100K 表示 100,000 Token。新会话继承这些默认值；已有会话保留自己的配置。",
    "settings-shell.testConnection": "测试连接",
    "settings-shell.retryRead": "重试读取配置",
    "settings-shell.accountGuard": "默认账户不可停用或删除；如需调整，请先将其他已启用账户设为默认。",
    "settings-shell.saveAccount": "保存账户"
  }
};

// ../web-units/src/locales/sidebar.ts
var sidebarLocaleCatalog = {
  en: {
    "sidebar.closeNav": "Close navigation",
    "sidebar.newSession": "New session",
    "sidebar.sectionHeading": "Workspaces and sessions",
    "sidebar.addWorkspace": "Add workspace",
    "sidebar.sessionsNav": "Task list",
    "sidebar.settings": "Settings",
    "sidebar.openNav": "Open navigation"
  },
  "zh-CN": {
    "sidebar.closeNav": "关闭导航",
    "sidebar.newSession": "新会话",
    "sidebar.sectionHeading": "工作区与会话",
    "sidebar.addWorkspace": "添加工作区",
    "sidebar.sessionsNav": "任务列表",
    "sidebar.settings": "设置",
    "sidebar.openNav": "打开导航"
  }
};

// ../web-units/src/locales/tool.ts
var toolLocaleCatalog = {
  en: {
    "tool.status.planned": "Planned",
    "tool.status.awaitingApproval": "Awaiting approval",
    "tool.status.running": "Running",
    "tool.status.completed": "Completed",
    "tool.status.failed": "Failed",
    "tool.status.cancelled": "Cancelled",
    "tool.card.aria": "Tool {name}: {status}"
  },
  "zh-CN": {
    "tool.status.planned": "等待执行",
    "tool.status.awaitingApproval": "等待审批",
    "tool.status.running": "正在执行",
    "tool.status.completed": "执行完成",
    "tool.status.failed": "执行失败",
    "tool.status.cancelled": "已取消",
    "tool.card.aria": "工具 {name}：{status}"
  }
};

// ../web-units/src/locales/topbar.ts
var topbarLocaleCatalog = {
  en: {
    "topbar.connection.connecting": "Connecting to the backend",
    "topbar.connection.connected": "Local backend connected",
    "topbar.connection.reconnecting": "Connection lost, reconnecting",
    "topbar.connection.closed": "Backend connection closed",
    "topbar.defaultTitle": "New session",
    "topbar.defaultStatus": "Ready"
  },
  "zh-CN": {
    "topbar.connection.connecting": "正在连接后台",
    "topbar.connection.connected": "本地后台已连接",
    "topbar.connection.reconnecting": "连接中断，正在重连",
    "topbar.connection.closed": "后台连接已关闭",
    "topbar.defaultTitle": "新会话",
    "topbar.defaultStatus": "准备任务"
  }
};

// ../web-units/src/locales/index.ts
var WEB_UNITS_LOCALE_NAMESPACE = "@agnes/web-units";
var DICTS = [
  composerLocaleCatalog,
  conversationLocaleCatalog,
  settingsShellLocaleCatalog,
  sidebarLocaleCatalog,
  toolLocaleCatalog,
  topbarLocaleCatalog
];
var webUnitsLocaleCatalog = {
  en: Object.fromEntries(DICTS.flatMap((dict) => Object.entries(dict.en))),
  "zh-CN": Object.fromEntries(DICTS.flatMap((dict) => Object.entries(dict["zh-CN"])))
};

// ../web-units/src/settings.ts
import {
  createElement as createElement6,
  forwardRef as forwardRef4,
  useCallback as useCallback2,
  useImperativeHandle as useImperativeHandle4,
  useLayoutEffect as useLayoutEffect4,
  useRef as useRef4
} from "react";
var SETTINGS_MARKUP = `<form id="config-form">
<aside class="settings-rail" aria-label="设置分类" data-i18n-aria="settings-shell.railAria"><div class="settings-rail-heading"><div><p class="eyebrow">Agnes Workbench</p><p class="settings-rail-title" data-i18n="settings-shell.railTitle">设置</p></div><button id="config-close" class="icon-button" type="button" aria-label="关闭设置" data-i18n-aria="settings-shell.close"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div><div class="settings-nav-group"><p class="settings-nav-label" data-i18n="settings-shell.basicLabel">基础设置</p>
<button id="model-settings" class="settings-nav-item active" type="button" aria-current="page"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10M7 12h10M7 16h6" /><rect x="3.5" y="4" width="17" height="16" rx="3" /></svg><span data-i18n="settings-shell.modelNav">模型与账户</span></button>
<button id="plugin-management" class="settings-nav-item" type="button"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v4M16 3v4M5 7h14v4a7 7 0 0 1-14 0V7ZM9 18v3M15 18v3" /></svg><span data-i18n="settings-shell.pluginNav">插件管理</span></button>
<div class="settings-nav-tabs" role="tablist" aria-orientation="vertical" aria-label="资源类型" data-i18n-aria="settings-shell.resourceTabsAria"><button id="skills-tab" class="settings-nav-item" type="button" role="tab" aria-selected="true" aria-controls="resource-list"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 5.6L20 10.8l-5.8 2.2L12 19l-2.2-6L4 10.8l5.8-2.2Z" /></svg><span data-i18n="settings-shell.skillsNav">技能</span></button><button id="mcp-tab" class="settings-nav-item" type="button" role="tab" aria-selected="false" aria-controls="resource-list" tabindex="-1"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v4h4v6h-4v8H9v-8H5V7h4Z" /></svg><span>MCP</span></button></div>
<button id="archived-settings" class="settings-nav-item" type="button"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16M6 7.5v11h12v-11M9 11h6M4 7.5l1.5-3h13l1.5 3" /></svg><span data-i18n="settings-shell.archivedNav">已归档会话</span></button><button id="computer-use-management" class="settings-nav-item" type="button"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg><span>Computer Use</span></button><button id="appearance-settings" class="settings-nav-item" type="button"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16Z" /></svg><span data-i18n="settings-shell.appearanceNav">通用</span></button></div></aside>
<section id="model-settings-pane" class="settings-content" data-agnes-region="settings-pane"><header class="config-heading"><div><p class="eyebrow" data-i18n="settings-shell.modelKicker">连接设置</p><h2 id="config-title" data-i18n="settings-shell.modelTitle">模型账户</h2><p data-i18n="settings-shell.modelIntro">管理 Provider 连接和默认模型。保存后，新建任务会使用更新后的配置。</p></div></header><div class="config-workspace"><section class="config-accounts-section config-card" aria-label="已保存的模型账户" data-i18n-aria="settings-shell.accountsAria"><div class="config-accounts-heading"><div><h3 data-i18n="settings-shell.accountsTitle">我的账户</h3><p data-i18n="settings-shell.accountsIntro">每个账户独立保存地址、密钥和模型。</p></div><button id="config-add-account" class="secondary-button compact" type="button"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span data-i18n="settings-shell.addAccount">添加账户</span></button></div><div id="config-accounts"></div><p class="config-list-note" data-i18n="settings-shell.accountsNote">会话可在已启用账户提供的模型之间切换。</p></section></div></section>
<section id="plugin-settings-pane" class="settings-content admin-pane" data-agnes-region="settings-pane" hidden><header class="config-heading"><div><h2 data-i18n="shell.embedded.heading">插件</h2><p data-i18n="shell.embedded.description">安装、启用和检查 Agnes 的本地插件。</p></div></header><div class="admin-pane-body"><section id="recovery-notice" class="recovery-notice" hidden aria-label="恢复模式" data-i18n-aria="shell.recovery.aria"><strong data-i18n="shell.recovery.title">只读恢复模式</strong><p data-i18n="shell.recovery.description">管理页仍可显示安全状态；恢复完成前，所有检查和变更操作均已停用。</p></section><section id="orphan-pins" class="orphan-pins" hidden aria-label="孤儿运行时 pin" data-i18n-aria="shell.orphan.aria"><div class="orphan-pins-heading"><strong data-i18n="shell.orphan.title">存在未释放的孤儿运行时 pin</strong><button id="orphan-pins-release-all" class="secondary-button compact" type="button" data-i18n="shell.orphan.release-all">全部释放</button></div><p id="orphan-pins-status" class="orphan-pins-status" hidden></p><ul id="orphan-pins-list" class="orphan-pins-list"></ul></section><p id="admin-notice" class="admin-notice" role="status" aria-live="polite"></p><p id="plugin-tree-status" class="plugin-tree-status" role="status" aria-live="polite"></p><div class="plugin-toolbar"><div class="plugin-tabs" role="tablist" aria-label="插件视图" data-i18n-aria="shell.tabs.aria"><button id="installed-tab" type="button" role="tab" aria-selected="true" aria-controls="plugin-list" data-i18n="shell.tab.installed">已安装</button><button id="discover-tab" type="button" role="tab" aria-selected="false" aria-controls="plugin-list" data-i18n="shell.tab.discover">发现</button></div><div class="admin-toolbar-actions"><label class="plugin-search-field" for="plugin-search"><span class="visually-hidden" data-i18n="shell.search.aria">搜索插件</span><input id="plugin-search" type="search" autocomplete="off" placeholder="筛选当前已安装列表" / data-i18n-placeholder="search.installed"></label><button id="install-source" class="primary-button compact" type="button" data-i18n="shell.install">从来源安装</button></div></div><div id="plugin-layout" class="plugin-layout"><section id="plugin-list" class="plugin-list" role="tabpanel" aria-live="polite"></section></div></div></section>
<section id="resource-settings-pane" class="settings-content admin-pane" data-agnes-region="settings-pane" hidden><header class="config-heading"><div><h2 data-i18n="shell.heading">技能与 MCP</h2><p data-i18n="shell.embedded.description">查看来源、信任和运行状态；凭据只以 SecretRef 引用保存。</p><p data-i18n="shell.embedded.add-description">想添加 MCP？在聊天中说“帮我接入这个 MCP”，并提供服务地址或连接信息。</p></div></header><div class="admin-pane-body"><p id="resource-notice" class="admin-notice" role="status" aria-live="polite"></p><div class="resource-toolbar"><div class="resource-toolbar-actions"><button id="skill-refresh" class="secondary-button compact" type="button" data-i18n="button.refresh">刷新技能目录</button><button id="mcp-create" class="primary-button compact" type="button" hidden data-i18n="button.create">添加 MCP</button></div></div><div id="resource-layout" class="plugin-layout resource-layout"><section id="resource-list" class="plugin-list" aria-live="polite" aria-label="资源目录" data-i18n-aria="shell.list.aria"></section></div></div></section>
<section id="archived-settings-pane" class="settings-content" data-agnes-region="settings-pane" hidden><header class="config-heading archived-heading"><div><h2 data-i18n="settings-shell.archivedTitle">已归档会话</h2><p data-i18n="settings-shell.archivedIntro">查看已暂时收起的会话，需要时可以恢复到工作区。</p></div><button id="archived-refresh" class="secondary-button compact" type="button" data-i18n="settings-shell.refreshList">刷新列表</button></header><div class="archived-pane-body"><div class="archived-toolbar"><label class="archived-search-field" for="archived-search"><span data-i18n="settings-shell.searchLabel">搜索名称或工作区</span><input id="archived-search" type="search" data-i18n-placeholder="settings-shell.searchPlaceholder" placeholder="搜索已归档会话" /></label></div><p id="archived-message" class="archived-message" role="alert"></p><div class="archived-list-shell"><p id="archived-empty" class="archived-empty" role="status"></p><ul id="archived-list" class="archived-sessions"></ul></div></div></section>
<section id="computer-use-settings-pane" class="settings-content" data-agnes-region="settings-pane" hidden><header class="config-heading"><div><h2>Computer Use</h2><p data-i18n="computerUse.intro">让 Agnes 查看屏幕并操作应用。需要使用支持图片的模型。</p></div><button id="computer-use-refresh" class="secondary-button compact" type="button"><span data-i18n="computerUse.action.refresh">刷新状态</span></button></header><div class="config-workspace"><section class="config-card" aria-labelledby="computer-use-state"><p class="eyebrow" data-i18n="computerUse.status.eyebrow">使用状态</p><strong id="computer-use-state" role="status">等待检查</strong><p id="computer-use-summary">正在等待连接本地后台。</p><p id="computer-use-runtime"></p><ul id="computer-use-blockers"></ul></section><section class="config-card" aria-labelledby="computer-use-permission-state"><p class="eyebrow" data-i18n="computerUse.permissions.eyebrow">系统权限</p><strong id="computer-use-permission-state">等待检查</strong><p id="computer-use-permission-summary">驱动就绪后显示当前系统所需的权限。</p><button id="computer-use-permission-grant" class="primary-button compact" type="button" hidden><span data-i18n="computerUse.permissions.grant">打开 macOS 授权</span></button></section><section class="config-card" aria-labelledby="computer-use-doctor-state"><p class="eyebrow" data-i18n="computerUse.doctor.eyebrow">驱动诊断</p><strong id="computer-use-doctor-state">等待检查</strong><p id="computer-use-doctor-summary">检查本机驱动是否正常。</p><button id="computer-use-doctor-run" class="secondary-button compact" type="button"><span data-i18n="computerUse.doctor.run">运行诊断</span></button></section><section class="config-card" aria-labelledby="computer-use-operation-state"><p class="eyebrow" data-i18n="computerUse.operation.eyebrow">安装与维护</p><strong id="computer-use-operation-state">没有记录</strong><p id="computer-use-operation-summary">首次使用会自动准备驱动；已有安装会先验证并复用。</p><div class="config-actions"><button id="computer-use-install" class="secondary-button compact" type="button"><span data-i18n="computerUse.action.install">准备驱动</span></button><button id="computer-use-update" class="secondary-button compact" type="button"><span data-i18n="computerUse.action.update">更新驱动</span></button><button id="computer-use-restart" class="secondary-button compact" type="button"><span data-i18n="computerUse.action.restart">重启驱动</span></button><button id="computer-use-operation-refresh" class="secondary-button compact" type="button"><span data-i18n="computerUse.action.operationRefresh">刷新进度</span></button><button id="computer-use-operation-cancel" class="secondary-button compact" type="button" hidden><span data-i18n="computerUse.action.cancel">取消操作</span></button></div></section></div></section>
<section id="appearance-settings-pane" class="settings-content" data-agnes-region="settings-pane" hidden><header class="config-heading"><div><h2 data-i18n="settings-shell.appearanceTitle">通用设置</h2><p data-i18n="settings-shell.appearanceIntro">调整界面配色与字号。设置只保存在本机浏览器中。</p></div></header><div class="config-workspace"><section class="config-card appearance-card" aria-label="配色" data-i18n-aria="settings-shell.palette"><fieldset class="appearance-options"><legend data-i18n="settings-shell.palette">配色</legend><label class="appearance-option"><input type="radio" name="agnes-theme" value="system" /><span class="appearance-option-copy"><span class="appearance-option-name" data-i18n="settings-shell.paletteSystem">跟随系统</span><span class="appearance-option-hint" data-i18n="settings-shell.paletteSystemHint">随操作系统的深浅色设置自动切换</span></span></label><label class="appearance-option"><input type="radio" name="agnes-theme" value="light" /><span class="appearance-option-copy"><span class="appearance-option-name" data-i18n="settings-shell.paletteLight">浅色</span><span class="appearance-option-hint" data-i18n="settings-shell.paletteLightHint">始终使用浅色界面</span></span></label><label class="appearance-option"><input type="radio" name="agnes-theme" value="dark" /><span class="appearance-option-copy"><span class="appearance-option-name" data-i18n="settings-shell.paletteDark">深色</span><span class="appearance-option-hint" data-i18n="settings-shell.paletteDarkHint">始终使用深色界面</span></span></label></fieldset></section><section class="config-card appearance-card" aria-label="皮肤" data-i18n-aria="settings-shell.skin"><fieldset class="appearance-options"><legend data-i18n="settings-shell.skin">皮肤</legend><div id="skin-option-items"></div></fieldset></section><section class="config-card appearance-card" aria-label="字号" data-i18n-aria="settings-shell.fontScale"><fieldset class="appearance-options"><legend data-i18n="settings-shell.fontScale">字号</legend><label class="appearance-option"><input type="radio" name="agnes-font-scale" value="small" /><span class="appearance-option-copy"><span class="appearance-option-name" data-i18n="settings-shell.fontSmall">小</span><span class="appearance-option-hint" data-i18n="settings-shell.fontSmallHint">界面整体缩小一档</span></span></label><label class="appearance-option"><input type="radio" name="agnes-font-scale" value="normal" /><span class="appearance-option-copy"><span class="appearance-option-name" data-i18n="settings-shell.fontNormal">标准</span><span class="appearance-option-hint" data-i18n="settings-shell.fontNormalHint">默认字号</span></span></label><label class="appearance-option"><input type="radio" name="agnes-font-scale" value="large" /><span class="appearance-option-copy"><span class="appearance-option-name" data-i18n="settings-shell.fontLarge">大</span><span class="appearance-option-hint" data-i18n="settings-shell.fontLargeHint">界面整体放大一档</span></span></label></fieldset></section><section class="config-card appearance-card" data-i18n-aria="settings.appearance.language" aria-label="语言"><fieldset class="appearance-options"><legend data-i18n="settings.appearance.language">语言</legend><label class="appearance-option"><input type="radio" name="agnes-locale" value="en" checked /><span class="appearance-option-copy"><span class="appearance-option-name" data-i18n="settings.appearance.language.en">English</span><span class="appearance-option-hint" data-i18n="settings.appearance.language.en.hint">使用英文界面</span></span></label><label class="appearance-option"><input type="radio" name="agnes-locale" value="zh-CN" /><span class="appearance-option-copy"><span class="appearance-option-name" data-i18n="settings.appearance.language.zh-CN">简体中文</span><span class="appearance-option-hint" data-i18n="settings.appearance.language.zh-CN.hint">使用简体中文界面</span></span></label></fieldset></section></div></section></form>
<dialog data-agnes-region="dialog" id="account-dialog" aria-labelledby="config-detail-title"><button id="account-dialog-close" class="icon-button account-dialog-close" type="button" aria-label="关闭账户详情" data-i18n-aria="settings-shell.close"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button><section class="account-dialog-body" aria-labelledby="config-detail-title"><div class="config-detail-heading"><div><p class="eyebrow" data-i18n="settings-shell.accountKicker">账户配置</p><h3 id="config-detail-title" data-i18n="settings-shell.accountTitle">账户详情</h3></div><p id="config-account-context" data-i18n="settings-shell.accountContext">编辑连接与默认模型</p></div><div class="config-detail-grid"><fieldset class="config-section"><legend data-i18n="settings-shell.connectionLegend">连接信息</legend><label class="form-field"><span data-i18n="settings-shell.accountNameLabel">账户名称</span><input id="config-account-name" maxlength="128" autocomplete="off" placeholder="例如：工作账户、本地模型" data-i18n-placeholder="settings-shell.accountNamePlaceholder" /></label><label class="form-field"><span data-i18n="settings-shell.providerLabel">Provider</span><select id="config-provider"></select></label><label class="form-field form-field-wide" id="config-auth-method-field"><span data-i18n="settings-shell.authMethodLabel">认证方式</span><select id="config-auth-method"></select></label><label class="form-field form-field-wide"><span data-i18n="settings-shell.baseUrlLabel">Base URL</span><input id="config-base-url" autocomplete="url" /></label><label class="form-field form-field-wide"><span data-i18n="settings-shell.apiKeyLabel">API Key</span><input id="config-api-key" type="password" autocomplete="new-password" placeholder="输入新密钥或保留当前密钥" data-i18n-placeholder="settings-shell.keyPlaceholder" aria-describedby="config-key-hint" /></label><p id="config-key-hint" class="field-hint form-field-wide"></p><div id="config-oauth-controls" class="form-field-wide"></div></fieldset><fieldset class="config-section config-validation-section"><legend data-i18n="settings-shell.validationLegend">验证与默认模型</legend><div class="config-validation-controls"><label class="form-field"><span data-i18n="settings-shell.defaultModelLabel">默认模型</span><select id="config-model"></select></label><button id="config-test" class="secondary-button" type="button"><svg class="icon" data-agnes-region="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg><span data-i18n="settings-shell.testConnection">测试连接</span></button></div><label class="form-field"><span data-i18n="settings-shell.defaultThinkingLabel">默认思考强度</span><select id="config-thinking"></select></label><label class="form-field"><span data-i18n="settings-shell.contextBudgetLabel">默认上下文预算（Token）</span><input id="config-context-window" type="text" maxlength="32" placeholder="自动（模型目录默认值）" data-i18n-placeholder="settings-shell.contextBudgetPlaceholder" aria-describedby="config-model-settings-hint config-error" /></label><p id="config-model-settings-hint" class="field-hint" data-i18n="settings-shell.modelSettingsHint">支持 K/M 单位，如 100K 表示 100,000 Token。新会话继承这些默认值；已有会话保留自己的配置。</p><p id="config-state" aria-live="polite"></p><button id="config-retry" class="secondary-button compact" type="button" hidden data-i18n="settings-shell.retryRead">重试读取配置</button><p id="config-error" role="alert"></p></fieldset></div><div class="config-detail-footer"><p id="config-account-guard" data-i18n="settings-shell.accountGuard">默认账户不可停用或删除；如需调整，请先将其他已启用账户设为默认。</p><button id="config-save" class="primary-button" type="submit" form="config-form" disabled data-i18n="settings-shell.saveAccount">保存账户</button></div></section></dialog>`;
var PANE_IDS = {
  model: "model-settings-pane",
  plugin: "plugin-settings-pane",
  resources: "resource-settings-pane",
  archived: "archived-settings-pane",
  "computer-use": "computer-use-settings-pane",
  appearance: "appearance-settings-pane"
};
var SETTINGS_DSH_SLOT_NAMES = Object.freeze([
  "settings.trigger",
  "settings.header",
  "settings.action",
  "settings.close",
  "settings.onboarding",
  "settings.section",
  "settings.general.item",
  "settings.models.provider-card",
  "settings.models.footer",
  "settings.plugins.tab",
  "settings.plugin.item"
]);
var settingsDshSlotHostId = (name) => `settings-dsh-slot-${name.replaceAll(".", "-")}`;
var NAV_IDS = {
  model: ["model-settings"],
  plugin: ["plugin-management"],
  resources: ["skills-tab", "mcp-tab"],
  archived: ["archived-settings"],
  "computer-use": ["computer-use-management"],
  appearance: ["appearance-settings"]
};
var settingsPaneSlotHostId = (pane) => `settings-pane-slot-${pane}`;
function templateFromSettingsMarkup() {
  const template = document.createElement("template");
  template.innerHTML = SETTINGS_MARKUP;
  return template;
}
function applySettingsLocale(root, translate) {
  for (const node of root.querySelectorAll("[data-i18n]")) {
    const key = node.getAttribute("data-i18n");
    if (key) {
      const value = translate(key);
      if (value !== key) node.textContent = value;
    }
  }
  for (const [marker, attribute] of [
    ["data-i18n-aria", "aria-label"],
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-title", "title"]
  ]) {
    for (const node of root.querySelectorAll(`[${marker}]`)) {
      const key = node.getAttribute(marker);
      if (key) {
        const value = translate(key);
        if (value !== key) node.setAttribute(attribute, value);
      }
    }
  }
}
function createSettingsDshSlotHost(name) {
  const host = document.createElement("div");
  host.id = settingsDshSlotHostId(name);
  host.dataset.agnesDshSlot = name;
  return host;
}
function settingsShellMarkup(translate) {
  const template = templateFromSettingsMarkup();
  const form = template.content.querySelector("#config-form");
  if (!form) throw new Error("settings markup is missing #config-form");
  const railHeading = form.querySelector(".settings-rail-heading");
  railHeading?.appendChild(createSettingsDshSlotHost("settings.close"));
  const navGroup = form.querySelector(".settings-nav-group");
  if (navGroup) {
    const navLabel = navGroup.querySelector(".settings-nav-label");
    navLabel?.after(
      createSettingsDshSlotHost("settings.trigger"),
      createSettingsDshSlotHost("settings.onboarding"),
      createSettingsDshSlotHost("settings.action")
    );
  }
  for (const section of form.querySelectorAll('section[data-agnes-region="settings-pane"]')) section.remove();
  const dshShellSlots = document.createElement("div");
  dshShellSlots.id = "settings-dsh-shell-slots";
  dshShellSlots.append(
    createSettingsDshSlotHost("settings.header"),
    createSettingsDshSlotHost("settings.section")
  );
  const host = document.createElement("div");
  host.id = "settings-pane-slots";
  for (const pane of Object.keys(PANE_IDS)) {
    const slot = document.createElement("div");
    slot.id = settingsPaneSlotHostId(pane);
    slot.dataset.agnesSettingsPaneSlot = pane;
    host.appendChild(slot);
  }
  const content = document.createElement("div");
  content.id = "settings-content-slots";
  content.append(dshShellSlots, host);
  form.appendChild(content);
  if (translate) applySettingsLocale(form, translate);
  return form.outerHTML;
}
function settingsPaneMarkup(pane, translate) {
  const template = templateFromSettingsMarkup();
  const section = template.content.getElementById(PANE_IDS[pane]);
  if (!section) throw new Error(`settings markup is missing ${PANE_IDS[pane]}`);
  if (pane === "model") {
    const workspace = section.querySelector(".config-workspace");
    const accounts = section.querySelector(".config-accounts-section");
    if (workspace && accounts) {
      workspace.insertBefore(createSettingsDshSlotHost("settings.models.provider-card"), accounts);
      accounts.after(createSettingsDshSlotHost("settings.models.footer"));
    }
  }
  if (pane === "plugin") {
    section.querySelector(".plugin-tabs")?.appendChild(createSettingsDshSlotHost("settings.plugins.tab"));
    section.querySelector("#plugin-list")?.appendChild(createSettingsDshSlotHost("settings.plugin.item"));
  }
  if (pane === "appearance") {
    section.querySelector(".config-workspace")?.prepend(createSettingsDshSlotHost("settings.general.item"));
  }
  if (translate) applySettingsLocale(section, translate);
  return section.outerHTML;
}
function SettingsBuiltinImpl({ options }, ref) {
  const host = useRef4(null);
  const activePane = useRef4("model");
  const form = useCallback2(() => host.current?.querySelector("#config-form") ?? null, []);
  const open3 = useCallback2((pane) => {
    activePane.current = pane;
    const root = host.current;
    if (!root) return;
    for (const id of Object.values(PANE_IDS))
      root.querySelector(`#${id}`)?.toggleAttribute("hidden", id !== PANE_IDS[pane]);
    for (const [name, ids] of Object.entries(NAV_IDS))
      for (const id of ids) {
        const item = root.querySelector(`#${id}`);
        if (!item) continue;
        const active = name === pane && (pane !== "resources" || item.getAttribute("aria-selected") === "true");
        item.classList.toggle("active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      }
    if (pane === "resources") {
      const list2 = root.querySelector("#resource-list");
      const selected = root.querySelector('.settings-nav-tabs [aria-selected="true"]');
      list2?.setAttribute("role", "tabpanel");
      if (selected) list2?.setAttribute("aria-labelledby", selected.id);
    }
  }, []);
  useImperativeHandle4(
    ref,
    () => ({ open: open3, pane: (pane) => host.current?.querySelector(`#${PANE_IDS[pane]}`) ?? null, form }),
    [form, open3]
  );
  useLayoutEffect4(() => {
    const root = host.current;
    if (!root) return;
    open3("model");
    const listeners = [];
    let computerUsePane = root.querySelector("#computer-use-settings-pane");
    const observer = new MutationObserver(() => {
      const next = root.querySelector("#computer-use-settings-pane");
      if (next === computerUsePane) return;
      computerUsePane = next;
      open3(activePane.current);
    });
    observer.observe(root, { childList: true, subtree: true });
    listeners.push(() => observer.disconnect());
    const bind = (id, change) => {
      const button2 = root.querySelector(`#${id}`);
      if (!button2) return;
      const listener = () => {
        open3(change.pane);
        options.onChange?.(change);
      };
      button2.addEventListener("click", listener);
      listeners.push(() => button2.removeEventListener("click", listener));
      if (change.tab) {
        const onKeydown = (event) => {
          let next;
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
            next = change.tab === "skills" ? "mcp" : "skills";
          if (event.key === "Home") next = "skills";
          if (event.key === "End") next = "mcp";
          if (!next) return;
          const target = root.querySelector(`#${next}-tab`);
          if (!target || target.disabled) return;
          event.preventDefault();
          target.focus({ preventScroll: true });
          if (next !== change.tab) target.click();
        };
        button2.addEventListener("keydown", onKeydown);
        listeners.push(() => button2.removeEventListener("keydown", onKeydown));
      }
    };
    bind("model-settings", { pane: "model" });
    bind("plugin-management", { pane: "plugin" });
    bind("skills-tab", { pane: "resources", tab: "skills" });
    bind("mcp-tab", { pane: "resources", tab: "mcp" });
    bind("archived-settings", { pane: "archived" });
    bind("computer-use-management", { pane: "computer-use" });
    bind("appearance-settings", { pane: "appearance" });
    const close = root.querySelector("#config-close");
    if (close) {
      const listener = () => options.onClose?.();
      close.addEventListener("click", listener);
      listeners.push(() => close.removeEventListener("click", listener));
    }
    return () => {
      for (const dispose of listeners) dispose();
    };
  }, [open3, options]);
  return createElement6(
    "div",
    { ref: host },
    createElement6("div", {
      // biome-ignore lint/security/noDangerouslySetInnerHtml: this is the fixed in-module template that creates row mount points.
      dangerouslySetInnerHTML: { __html: settingsShellMarkup(options.translate) }
    }),
    createElement6(SettingsAccountDialog, options.translate ? { t: options.translate } : {})
  );
}
var SettingsBuiltin = forwardRef4(SettingsBuiltinImpl);
function SettingsPaneBuiltin({
  pane,
  computerUse,
  translate
}) {
  if (pane === "computer-use" && computerUse)
    return createElement6(
      "div",
      {
        "data-agnes-region-owner": "builtin",
        "data-agnes-region-unit": "settings-computer-use"
      },
      computerUse
    );
  if (pane === "model")
    return createElement6(
      "div",
      { "data-agnes-region-owner": "builtin", "data-agnes-region-unit": "settings-model" },
      createElement6(SettingsModelPane, {
        ...translate ? { t: translate } : {},
        beforeAccounts: createElement6("div", {
          id: settingsDshSlotHostId("settings.models.provider-card"),
          "data-agnes-dsh-slot": "settings.models.provider-card"
        }),
        afterAccounts: createElement6("div", {
          id: settingsDshSlotHostId("settings.models.footer"),
          "data-agnes-dsh-slot": "settings.models.footer"
        })
      })
    );
  return createElement6("div", {
    "data-agnes-region-owner": "builtin",
    "data-agnes-region-unit": `settings-${pane}`,
    // biome-ignore lint/security/noDangerouslySetInnerHtml: this selects a fixed in-module pane template by closed union key.
    dangerouslySetInnerHTML: { __html: settingsPaneMarkup(pane, translate) }
  });
}

// ../web-units/src/sidebar.ts
import {
  createElement as createElement7,
  forwardRef as forwardRef5,
  useCallback as useCallback3,
  useImperativeHandle as useImperativeHandle5,
  useLayoutEffect as useLayoutEffect5,
  useRef as useRef5
} from "react";
var EMPTY_SIDEBAR_STATE = {
  sessions: [],
  workspaces: [],
  labels: /* @__PURE__ */ new Map(),
  sessionPending: false,
  newDisabled: true
};
var noop = () => {
};
var EMPTY_ACTIONS = {
  newSession: noop,
  addWorkspace: noop,
  openSettings: noop,
  openSession: noop,
  sessionAction: noop,
  loadMore: noop
};
function navigationSignature(state) {
  const labels = [];
  for (const [id, label2] of state.labels) labels.push([id, label2]);
  labels.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return JSON.stringify([
    state.sessions.map((session) => {
      const row = session;
      return [row.sessionId, row.title, row.cwd ?? "", row.archived ?? false];
    }),
    state.workspaces.map((workspace) => [workspace.path, workspace.name, workspace.available]),
    labels,
    state.locale ?? null,
    state.currentId ?? null,
    state.next ?? null,
    state.sessionPending,
    state.newDisabled
  ]);
}
var CLOSE_ICON = [
  "M16.4516 4.58065C16.4516 4.45594 16.3361 4.35484 16.1935 4.35484H3.80645C3.66393 4.35484 3.54839 4.45594 3.54839 4.58065V15.4194C3.54839 15.5441 3.66393 15.6452 3.80645 15.6452H16.1935C16.3361 15.6452 16.4516 15.5441 16.4516 15.4194V4.58065ZM18 15.4194C18 16.2923 17.1912 17 16.1935 17H3.80645C2.80878 17 2 16.2923 2 15.4194V4.58065C2 3.70768 2.80878 3 3.80645 3H16.1935C17.1912 3 18 3.70768 18 4.58065V15.4194Z",
  "M8.45161 16.3226H6.90322L6.90323 3.67742H8.45161L8.45161 16.3226Z"
];
var NEW_ICON = [
  "M12.3028 8.66267C12.3541 8.66267 12.4032 8.68528 12.4394 8.72554C12.4757 8.7658 12.496 8.8204 12.496 8.87733V11.1892H14.5766C14.6222 11.1894 14.6663 11.2075 14.701 11.2403C14.7358 11.2731 14.759 11.3184 14.7665 11.3684L14.769 11.4039V12.2597C14.7688 12.3163 14.7484 12.3706 14.7124 12.4106C14.6764 12.4506 14.6276 12.4732 14.5766 12.4735H12.4952V14.7863C12.495 14.8368 12.4789 14.8856 12.4495 14.9242C12.4202 14.9628 12.3795 14.9886 12.3347 14.9972L12.3028 15H11.5325C11.4813 15 11.4322 14.9774 11.3959 14.9371C11.3597 14.8969 11.3394 14.8423 11.3394 14.7853V12.4735H9.25871C9.21313 12.4733 9.16907 12.4552 9.13433 12.4224C9.09959 12.3896 9.07641 12.3442 9.06888 12.2943L9.06552 12.2597V11.4039C9.06552 11.3469 9.08587 11.2923 9.1221 11.2521C9.15833 11.2118 9.20748 11.1892 9.25871 11.1892H11.3394V8.87733C11.3394 8.82639 11.3557 8.7771 11.3854 8.73829C11.4151 8.69947 11.4562 8.67366 11.5015 8.66547L11.5325 8.66267H12.3028ZM7.99958 1C11.851 1 14.9988 4.06674 15 7.89055C15 7.89171 14.9991 7.89267 14.9979 7.89267C14.9967 7.89267 14.9958 7.89361 14.9958 7.89477V8.02147C14.9958 8.09251 14.9704 8.16064 14.9252 8.21088C14.88 8.26111 14.8187 8.28933 14.7547 8.28933L14.0743 8.28467C14.0108 8.28417 13.9501 8.25586 13.9053 8.20588C13.8604 8.1559 13.8352 8.08829 13.8349 8.01773V7.85673C13.8349 7.85441 13.8368 7.85253 13.8391 7.85253C13.8415 7.85253 13.8433 7.85065 13.8433 7.84833V7.77973C13.7803 4.74267 11.2024 2.26747 7.99958 2.26747C4.75809 2.26747 2.15582 4.80427 2.15582 7.89267C2.15582 8.994 2.48509 10.0459 3.09408 10.9493L3.17892 11.0725C3.48551 11.5019 3.44771 11.794 3.13692 12.6536L2.96976 13.1109L2.91096 13.2827L3.06888 13.2593C3.21504 13.236 3.40487 13.2033 3.63167 13.1567L4.03906 13.0717C4.90256 12.8907 5.20496 12.8617 5.54179 12.998L5.57959 13.0148C6.34481 13.348 7.1596 13.5188 7.98194 13.5188L8.13398 13.516C8.26753 13.516 8.37505 13.6355 8.37505 13.7839V14.5193C8.37505 14.5904 8.34965 14.6585 8.30444 14.7087C8.25923 14.759 8.19791 14.7872 8.13398 14.7872H7.9811L7.80134 14.7825C6.89359 14.76 5.9965 14.5601 5.1512 14.1917C5.10164 14.1693 4.86476 14.1955 4.38681 14.2907L3.67871 14.4381C2.73624 14.6285 2.38429 14.6267 2.01722 14.3215C1.68711 14.0452 1.63923 13.6541 1.73163 13.2033L1.75346 13.1025C1.79378 12.9345 1.84838 12.7712 1.95674 12.4772L2.08778 12.1151C2.12308 12.0193 2.15365 11.9215 2.17934 11.822L2.18774 11.7893C2.19362 11.7613 2.19614 11.7539 2.20958 11.7707L2.26333 11.8453L2.0987 11.6036C1.38639 10.5069 1 9.22827 1 7.89267C1 4.06787 4.14826 1 7.99958 1Z"
];
var ADD_ICON = [
  "M6 1.16797C6.26487 1.16807 6.48024 1.38262 6.48047 1.64746V5.64062H10.4736C10.7383 5.64111 10.9531 5.8563 10.9531 6.12109C10.953 6.38576 10.7382 6.60108 10.4736 6.60156H6.48047V10.5938C6.48046 10.8588 6.265 11.0741 6 11.0742C5.73491 11.0742 5.51954 10.8588 5.51953 10.5938V6.60156H1.52734C1.26235 6.60156 1.04704 6.38605 1.04688 6.12109C1.04688 5.856 1.26225 5.64062 1.52734 5.64062H5.51953V1.64746C5.51976 1.38256 5.73504 1.16797 6 1.16797Z"
];
var SETTINGS_ICON = [
  "M7.25098 2.19971H8.75879C8.8493 2.19971 8.93968 2.25922 8.97363 2.36182V2.36377L9.39844 3.63721L9.39941 3.64014C9.47672 3.86852 9.63853 4.0561 9.85254 4.16553C10.0864 4.28501 10.3441 4.28724 10.5645 4.20947V4.21045L10.5693 4.2085L11.8057 3.75928C11.8691 3.73619 11.9415 3.74412 12.001 3.78467L12.0557 3.83545L12.9902 5.0415V5.04053C13.057 5.127 13.0622 5.24839 13.0049 5.33936L12.3018 6.45557C12.1678 6.66517 12.127 6.91401 12.1797 7.1499C12.2322 7.38516 12.3738 7.59233 12.583 7.7251L13.6865 8.42529C13.7695 8.47777 13.8177 8.58636 13.793 8.69482V8.69678L13.4541 10.1978C13.4422 10.2502 13.4143 10.2959 13.3779 10.3286C13.3417 10.3611 13.2982 10.3797 13.2539 10.3843H13.2529L11.957 10.519H11.9561C11.7135 10.5447 11.4901 10.6666 11.3369 10.8638C11.2079 11.0285 11.1368 11.2337 11.1406 11.4468L11.1475 11.5386L11.3008 12.855C11.3139 12.9682 11.2535 13.0694 11.167 13.1118L9.80762 13.7778H9.80664C9.7756 13.7931 9.74459 13.8002 9.71289 13.8003C9.6568 13.8003 9.59828 13.7774 9.55273 13.73L8.6416 12.7798C8.47198 12.6029 8.23877 12.4995 7.9873 12.4995C7.74164 12.4996 7.50653 12.5995 7.33594 12.7769L6.4248 13.7222C6.35395 13.7951 6.25379 13.8091 6.17285 13.769L6.1709 13.7681L4.81445 13.0981H4.81543C4.72745 13.0543 4.66835 12.9526 4.68164 12.8413L4.83984 11.519V11.5181C4.86443 11.3099 4.81854 11.0981 4.70508 10.9185L4.65137 10.8433C4.49826 10.6463 4.27557 10.5242 4.0332 10.4985H4.03418L2.74316 10.3599C2.65171 10.35 2.56747 10.2803 2.54395 10.1733L2.54297 10.1704L2.20605 8.66748C2.18203 8.55837 2.22971 8.45059 2.31348 8.39697L3.42383 7.69873L3.4248 7.69775C3.63321 7.56572 3.77503 7.3592 3.82812 7.12549L3.8291 7.12354C3.88165 6.8881 3.84057 6.64225 3.71289 6.43604L3.71191 6.43408L3.0127 5.31494L3.01172 5.31396C2.95435 5.22192 2.96131 5.10054 3.02637 5.01709L3.9668 3.81396H3.96777C4.03098 3.73316 4.13022 3.70741 4.21582 3.73877L4.2168 3.73975L5.44336 4.18994V4.18896C5.67325 4.27374 5.92778 4.26269 6.15234 4.15088L6.15332 4.15186C6.15476 4.15115 6.15579 4.14964 6.15723 4.14893C6.15839 4.14834 6.15997 4.14854 6.16113 4.14795L6.16016 4.14697C6.37759 4.03755 6.5399 3.84796 6.61621 3.62256L6.61719 3.61963L7.03613 2.36377C7.07173 2.25797 7.16219 2.19975 7.25098 2.19971Z",
  "M8 6.19971C8.92947 6.19991 9.69745 6.90947 9.79004 7.81592L9.7998 8.00049C9.79801 8.99391 8.99055 9.80008 8 9.80029C7.00837 9.80029 6.19943 8.99315 6.19922 8.00049C6.19922 7.00873 7.00716 6.19971 8 6.19971Z"
];
function icon(paths, viewBox, className) {
  return createElement7(
    "svg",
    { className, viewBox, "data-agnes-region": "icon", "aria-hidden": true },
    ...paths.map((path) => createElement7("path", { key: path, d: path }))
  );
}
var SidebarBuiltin = forwardRef5(function SidebarBuiltin2({
  state,
  actions,
  dependencies,
  slots
}, ref) {
  const nav = useRef5(null);
  const newButton = useRef5(null);
  const workspaceAdd = useRef5(null);
  const settingsButton = useRef5(null);
  const shell = useRef5(void 0);
  const stateRef = useRef5(state);
  const t2 = dependencies?.translate ?? ((key) => key);
  const renderedSignature = useRef5(void 0);
  const renderNavigation = useCallback3(
    (next) => {
      const navElement = nav.current;
      if (!navElement || !dependencies) return false;
      const focused = navElement.contains(document.activeElement) && document.activeElement instanceof HTMLElement ? document.activeElement : void 0;
      const active = focused?.dataset.session;
      const activeWorkspace = focused?.dataset.workspaceNewSession;
      dependencies.renderNavigation({
        nav: navElement,
        sessions: next.sessions,
        workspaces: next.workspaces,
        labels: next.labels,
        ...next.currentId ? { currentId: next.currentId } : {},
        ...active ? { activeId: active } : {},
        ...activeWorkspace ? { activeWorkspace } : {},
        disabled: next.sessionPending,
        newDisabled: next.newDisabled,
        ...next.next ? { next: next.next } : {},
        loadMore: actions.loadMore,
        action: actions.sessionAction,
        newSession: actions.newSession,
        open: actions.openSession
      });
      return true;
    },
    [actions, dependencies]
  );
  useImperativeHandle5(
    ref,
    () => ({
      update: (next) => {
        stateRef.current = next;
        if (newButton.current) newButton.current.disabled = next.newDisabled;
        const signature = navigationSignature(next);
        if (signature === renderedSignature.current) return;
        if (renderNavigation(next)) renderedSignature.current = signature;
      },
      close: () => shell.current?.close(),
      dismiss: () => shell.current?.dismiss(),
      focusNew: () => newButton.current?.focus()
    }),
    [renderNavigation]
  );
  useLayoutEffect5(() => {
    if (renderNavigation(stateRef.current)) {
      renderedSignature.current = navigationSignature(stateRef.current);
    }
  }, [renderNavigation]);
  useLayoutEffect5(() => {
    const newElement = newButton.current;
    const workspaceElement = workspaceAdd.current;
    const settingsElement = settingsButton.current;
    if (!newElement || !workspaceElement || !settingsElement) return;
    newElement.onclick = () => actions.newSession();
    workspaceElement.onclick = actions.addWorkspace;
    settingsElement.onclick = actions.openSettings;
    return () => {
      newElement.onclick = null;
      workspaceElement.onclick = null;
      settingsElement.onclick = null;
    };
  }, [actions]);
  useLayoutEffect5(() => {
    if (!dependencies) return;
    const toggle = document.getElementById("sidebar-toggle");
    const close = document.getElementById("sidebar-close");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (!(toggle instanceof HTMLButtonElement) || !(close instanceof HTMLButtonElement) || !(backdrop instanceof HTMLButtonElement))
      return;
    const controller = dependencies.bindSidebar(window.matchMedia("(max-width: 900px)"));
    shell.current = controller;
    return () => {
      controller.dispose();
      shell.current = void 0;
    };
  }, [dependencies]);
  return createElement7(
    "div",
    {
      style: { display: "contents" },
      "data-agnes-region-owner": "builtin",
      "data-agnes-region-unit": "sidebar"
    },
    createElement7(
      "div",
      { className: "sidebar-head" },
      createElement7(
        "div",
        { className: "brand-lockup" },
        createElement7("span", { className: "agnes-mark brand-mark-image", "aria-hidden": true }),
        createElement7("span", { className: "brand-wordmark-text" }, "Agnes Harness"),
        slots?.brandMark,
        slots?.brandName
      ),
      createElement7(
        "button",
        {
          id: "sidebar-close",
          className: "icon-button sidebar-close",
          type: "button",
          "aria-label": t2("sidebar.closeNav")
        },
        icon(CLOSE_ICON, "0 0 20 20", "icon icon-fill")
      )
    ),
    createElement7(
      "div",
      { className: "sidebar-actions" },
      createElement7(
        "button",
        {
          id: "new",
          ref: newButton,
          className: "primary-button",
          type: "button",
          disabled: state.newDisabled
        },
        icon(NEW_ICON, "0 0 16 16", "icon icon-fill"),
        createElement7("span", null, t2("sidebar.newSession"))
      )
    ),
    createElement7(
      "div",
      { className: "sidebar-section-heading" },
      createElement7("p", { className: "section-label" }, t2("sidebar.sectionHeading")),
      createElement7(
        "button",
        {
          id: "workspace-add",
          ref: workspaceAdd,
          className: "icon-button subtle",
          type: "button",
          "aria-label": t2("sidebar.addWorkspace"),
          title: t2("sidebar.addWorkspace")
        },
        icon(ADD_ICON, "0 0 12 12", "icon icon-fill")
      ),
      slots?.workspaces
    ),
    createElement7("nav", { id: "sessions", "aria-label": t2("sidebar.sessionsNav"), ref: nav }),
    slots?.panellist,
    createElement7(
      "div",
      { className: "sidebar-footer" },
      slots?.footerAction,
      createElement7(
        "button",
        { id: "settings", ref: settingsButton, className: "secondary-button", type: "button" },
        icon(SETTINGS_ICON, "0 0 16 16", "icon icon-settings"),
        createElement7("span", null, t2("sidebar.settings"))
      ),
      slots?.settings
    )
  );
});
var Sidebar = forwardRef5(function Sidebar2(props, ref) {
  return createElement7(SidebarBuiltin, {
    ref,
    state: props.state,
    actions: { ...EMPTY_ACTIONS, ...props.actions },
    ...props.dependencies ? { dependencies: props.dependencies } : {},
    ...props.slots ? { slots: props.slots } : {}
  });
});

// ../web-units/src/topbar.ts
import { createElement as createElement8, forwardRef as forwardRef6, useImperativeHandle as useImperativeHandle6, useRef as useRef6 } from "react";
var CONNECTION_LABEL_KEYS = {
  connecting: "topbar.connection.connecting",
  connected: "topbar.connection.connected",
  reconnecting: "topbar.connection.reconnecting",
  closed: "topbar.connection.closed"
};
var SIDEBAR_TOGGLE_ICON_PATHS = [
  "M16.4516 4.58065C16.4516 4.45594 16.3361 4.35484 16.1935 4.35484H3.80645C3.66393 4.35484 3.54839 4.45594 3.54839 4.58065V15.4194C3.54839 15.5441 3.66393 15.6452 3.80645 15.6452H16.1935C16.3361 15.6452 16.4516 15.5441 16.4516 15.4194V4.58065ZM18 15.4194C18 16.2923 17.1912 17 16.1935 17H3.80645C2.80878 17 2 16.2923 2 15.4194V4.58065C2 3.70768 2.80878 3 3.80645 3H16.1935C17.1912 3 18 3.70768 18 4.58065V15.4194Z",
  "M8.45161 16.3226H6.90322L6.90323 3.67742H8.45161L8.45161 16.3226Z"
];
var Topbar = forwardRef6(function Topbar2({ translate: t2 }, ref) {
  const taskTitle = useRef6(null);
  const status = useRef6(null);
  const connection = useRef6(null);
  useImperativeHandle6(
    ref,
    () => ({
      setTaskTitle(title) {
        if (taskTitle.current) taskTitle.current.textContent = title;
      },
      setStatus(text3, state) {
        if (!status.current) return;
        status.current.textContent = text3;
        if (state !== void 0) status.current.dataset.state = state;
      },
      setConnectionState(value) {
        if (!connection.current) return;
        connection.current.dataset.state = value;
        connection.current.textContent = t2(CONNECTION_LABEL_KEYS[value]);
      }
    }),
    [t2]
  );
  return createElement8(
    "div",
    {
      style: { display: "contents" },
      "data-agnes-region-owner": "builtin",
      "data-agnes-region-unit": "topbar"
    },
    createElement8(
      "button",
      {
        id: "sidebar-toggle",
        className: "icon-button sidebar-toggle",
        type: "button",
        "aria-label": t2("sidebar.openNav"),
        "aria-expanded": "false"
      },
      createElement8(
        "svg",
        {
          className: "icon icon-fill",
          "data-agnes-region": "icon",
          viewBox: "0 0 20 20",
          "aria-hidden": true
        },
        ...SIDEBAR_TOGGLE_ICON_PATHS.map((path) => createElement8("path", { key: path, d: path }))
      )
    ),
    createElement8(
      "div",
      { className: "task-heading" },
      createElement8("h1", { ref: taskTitle, id: "task-title" }, t2("topbar.defaultTitle")),
      createElement8(
        "span",
        { ref: status, id: "status", role: "status", "aria-live": "polite", "data-state": "idle" },
        t2("topbar.defaultStatus")
      )
    ),
    createElement8(
      "div",
      { className: "connection-group" },
      createElement8(
        "span",
        {
          ref: connection,
          id: "connection",
          role: "status",
          "aria-live": "polite",
          "data-state": "connecting"
        },
        t2(CONNECTION_LABEL_KEYS.connecting)
      )
    )
  );
});

// ../web-units/src/trace.ts
import {
  createElement as createElement9,
  forwardRef as forwardRef7,
  useEffect,
  useImperativeHandle as useImperativeHandle7,
  useLayoutEffect as useLayoutEffect6,
  useMemo,
  useRef as useRef7,
  useState as useState3,
  useSyncExternalStore
} from "react";
import { flushSync as flushSync4 } from "react-dom";

// ../web-units/src/trace-hierarchy.ts
function buildTraceToolHierarchy(nodes) {
  const firstNodeById = /* @__PURE__ */ new Map();
  for (const node of nodes) if (!firstNodeById.has(node.id)) firstNodeById.set(node.id, node);
  const tools = [...firstNodeById.values()].filter((node) => node.kind === "tool");
  const toolById = new Map(tools.map((node) => [node.id, node]));
  const parentById = /* @__PURE__ */ new Map();
  const childrenById = /* @__PURE__ */ new Map();
  for (const parent of tools) {
    for (const childId of parent.children ?? []) {
      if (childId === parent.id || !toolById.has(childId) || parentById.has(childId)) continue;
      let closesCycle = false;
      for (let ancestor = parent.id; ancestor !== void 0; ancestor = parentById.get(ancestor)) {
        if (ancestor === childId) {
          closesCycle = true;
          break;
        }
      }
      if (closesCycle) continue;
      parentById.set(childId, parent.id);
      const children = childrenById.get(parent.id) ?? [];
      children.push(childId);
      childrenById.set(parent.id, children);
    }
  }
  const depthById = /* @__PURE__ */ new Map();
  for (const tool of tools) {
    if (tool.depth !== void 0 && Number.isSafeInteger(tool.depth) && tool.depth >= 0) {
      depthById.set(tool.id, tool.depth);
    } else {
      depthById.set(tool.id, traceToolAncestors({ parentById, childrenById, depthById }, tool.id).length);
    }
  }
  return { parentById, childrenById, depthById };
}
function traceToolAncestors(hierarchy, id) {
  const ancestors = [];
  const seen = /* @__PURE__ */ new Set([id]);
  for (let parent = hierarchy.parentById.get(id); parent !== void 0 && !seen.has(parent); parent = hierarchy.parentById.get(parent)) {
    ancestors.push(parent);
    seen.add(parent);
  }
  return ancestors;
}
function isTraceRowHiddenByTool(hierarchy, id, collapsedToolIds) {
  return traceToolAncestors(hierarchy, id).some((parentId) => collapsedToolIds.has(parentId));
}

// ../web-units/src/trace-locale.ts
var en2 = {
  "trace.badge.user": "User",
  "trace.badge.context": "Context",
  "trace.badge.assistant": "Assistant",
  "trace.badge.tool": "Tool",
  "trace.badge.approval": "Approval",
  "trace.badge.compaction": "Compaction",
  "trace.badge.cost": "Cost",
  "trace.status.running": "In progress",
  "trace.status.waiting": "Waiting",
  "trace.status.completed": "Completed",
  "trace.status.failed": "Failed",
  "trace.status.cancelled": "Cancelled",
  "trace.status.planned": "Waiting to run",
  "trace.status.awaiting_approval": "Waiting for approval",
  "trace.duration.running": "In progress",
  "trace.duration.ms": "{n} ms",
  "trace.duration.seconds": "{n} s",
  "trace.duration.minutes": "{minutes} min {seconds} s",
  "trace.duration.unknown": "Duration unknown",
  "trace.search": "Search",
  "trace.searchLabel": "Search the trace",
  "trace.expandTurns": "Expand turns",
  "trace.collapseTurns": "Collapse turns",
  "trace.expandTurnsLabel": "Expand all turns",
  "trace.collapseTurnsLabel": "Collapse all turns",
  "trace.partial": "Partially loaded",
  "trace.emptyPreview": "(no preview)",
  "trace.emptyRaw": "(no raw content)",
  "trace.turnHeader": "Turn {turn} · {count} records{folded}",
  "trace.turnFolded": " (collapsed)",
  "trace.pane.overview": "Overview",
  "trace.pane.preview": "Preview",
  "trace.pane.raw": "Projected content",
  "trace.pane.source": "Source",
  "trace.field.source": "Source",
  "trace.field.status": "Status",
  "trace.field.errorCode": "Error code",
  "trace.field.attachments": "Attachments",
  "trace.field.step": "Step",
  "trace.field.duration": "Duration",
  "trace.field.model": "Model",
  "trace.field.result": "Result",
  "trace.field.startedAt": "Started",
  "trace.result.failed": "Failed",
  "trace.result.completed": "Completed",
  "trace.closeDetail": "Close details",
  "trace.note.tool": "Tool arguments and results come from a length-limited session projection and may be truncated.",
  "trace.note.attachments": "Attachments show a summary only. Open the conversation to see the content.",
  "trace.source.user": "User",
  "trace.source.userActor": "User · {actor}",
  "trace.source.model": "Model",
  "trace.source.tool": "Tool · {name}",
  "trace.source.context": "Runtime context",
  "trace.source.approval": "Approval",
  "trace.source.compaction": "Context compaction",
  "trace.token.line": "Input {input} · Output {output} · Cache read {cacheRead} · Cache write {cacheWrite} · Reasoning {reasoning}",
  "trace.token.unavailable": "Not provided",
  "trace.metric.earlierUnloaded": "Earlier history is not loaded",
  "trace.metric.unverifiable": "Could not verify",
  "trace.metric.unrecorded": "Not recorded",
  "trace.preview.image": "{n} image",
  "trace.preview.images": "{n} images",
  "trace.preview.resource": "{n} resource link",
  "trace.preview.resources": "{n} resource links",
  "trace.raw.tool": "Tool: {name}",
  "trace.attachment.image": "Image · {mime}",
  "trace.attachment.resource": "Resource link · {name}",
  "trace.attachment.unnamed": "Unnamed resource",
  "trace.truncated.one": "{n} child step omitted",
  "trace.truncated": "{n} child steps omitted",
  "trace.truncated.some": "some",
  "trace.gantt.turnInput": "Turn {turn} input · anchored at the turn start",
  "trace.gantt.anchored": "{kind} · anchored at the turn start",
  "trace.stat.duration": "Duration",
  "trace.stat.turns": "Turns",
  "trace.stat.calls": "Calls",
  "trace.pane.input": "Full input",
  "trace.pane.output": "Full output",
  "trace.pane.timing": "Timing",
  "trace.detail.readFailed": "Could not read the details: {message}",
  "trace.detail.loading": "Reading the full record…",
  "trace.detail.empty": "No details to read",
  "trace.detail.copyInput": "Copy input JSON",
  "trace.detail.copyResult": "Copy result JSON",
  "trace.detail.resultMissing": "The tool result is not recorded yet.",
  "trace.detail.structured": "Structured result",
  "trace.image.viewResult": "View result image {n}",
  "trace.image.resultAlt": "Tool result image {n}",
  "trace.image.mime": "Image · {mime}",
  "trace.image.viewInput": "View input image {n}",
  "trace.image.inputAlt": "Input image {n}",
  "trace.resource.link": "Resource link · {name}",
  "trace.inspector.message": "Message",
  "trace.inspector.turn": "Turn {turn}",
  "trace.field.ttft": "First token",
  "trace.field.ttftDuration": "Time to first token",
  "trace.field.turnUsage": "Turn usage",
  "trace.field.callUsage": "This call",
  "trace.field.requestOrder": "Request order",
  "trace.field.ledgerOrder": "Ledger order",
  "trace.field.cumulativeUsage": "Cumulative billed usage",
  "trace.field.callDuration": "This call duration",
  "trace.field.cumulativeDuration": "Cumulative call duration",
  "trace.field.generationAfter": "Generation after the first token",
  "trace.join.list": "; ",
  "trace.timeline.label": "Timeline",
  "trace.timeline.mode": "Timeline mode",
  "trace.timeline.sequence": "Record order",
  "trace.timeline.duration": "Duration · compress idle",
  "trace.timeline.time": "Recorded time",
  "trace.timeline.actual": "Actual duration",
  "trace.timeline.noteSequence": "Equal width, in record order",
  "trace.timeline.noteDuration": "Long idle gaps are compressed; input is anchored at the turn start",
  "trace.timeline.noteTime": "Shown by recorded time; input is anchored at the turn start",
  "trace.timeline.clear": "Clear range",
  "trace.timeline.clearLabel": "Clear the time range",
  "trace.lane.input": "Input",
  "trace.lane.model": "Model",
  "trace.lane.tool": "Tool",
  "trace.lane.aria": "{lane} timeline: drag to filter, scroll to zoom, right-drag to pan",
  "trace.cluster": "{n} records · click to jump to the nearest one",
  "trace.gantt.label": "Trace timeline",
  "trace.loadEarlier": "Load earlier records",
  "trace.requestPrefix": "Request #{n} · ",
  "trace.tool.expand": "Expand child calls of {source}",
  "trace.tool.collapse": "Collapse child calls of {source}",
  "trace.noResults": "No matching records.",
  "trace.omittedNote": "Turn {turn} · {label}",
  "trace.lightbox.close": "Close image preview",
  "trace.empty": "Send a task to see timing for each step."
};
var zh2 = {
  "trace.badge.user": "用户",
  "trace.badge.context": "上下文",
  "trace.badge.assistant": "助手",
  "trace.badge.tool": "工具",
  "trace.badge.approval": "审批",
  "trace.badge.compaction": "整理",
  "trace.badge.cost": "费用",
  "trace.status.running": "进行中",
  "trace.status.waiting": "等待中",
  "trace.status.completed": "已完成",
  "trace.status.failed": "失败",
  "trace.status.cancelled": "已取消",
  "trace.status.planned": "等待执行",
  "trace.status.awaiting_approval": "等待审批",
  "trace.duration.running": "进行中",
  "trace.duration.ms": "{n} 毫秒",
  "trace.duration.seconds": "{n} 秒",
  "trace.duration.minutes": "{minutes} 分 {seconds} 秒",
  "trace.duration.unknown": "时长未知",
  "trace.search": "搜索",
  "trace.searchLabel": "搜索轨迹",
  "trace.expandTurns": "展开轮次",
  "trace.collapseTurns": "折叠轮次",
  "trace.expandTurnsLabel": "展开所有轮次",
  "trace.collapseTurnsLabel": "折叠所有轮次",
  "trace.partial": "已加载部分",
  "trace.emptyPreview": "（无预览）",
  "trace.emptyRaw": "（无原始内容）",
  "trace.turnHeader": "第 {turn} 轮 · {count} 条记录{folded}",
  "trace.turnFolded": "（已折叠）",
  "trace.pane.overview": "概述",
  "trace.pane.preview": "预览",
  "trace.pane.raw": "投影内容",
  "trace.pane.source": "来源",
  "trace.field.source": "来源",
  "trace.field.status": "状态",
  "trace.field.errorCode": "错误码",
  "trace.field.attachments": "附件",
  "trace.field.step": "步骤",
  "trace.field.duration": "时长",
  "trace.field.model": "模型",
  "trace.field.result": "结果",
  "trace.field.startedAt": "开始时间",
  "trace.result.failed": "失败",
  "trace.result.completed": "完成",
  "trace.closeDetail": "关闭详情",
  "trace.note.tool": "工具参数与结果来自有长度限制的会话投影，可能已截断。",
  "trace.note.attachments": "附件只显示摘要；内容请在对话中查看。",
  "trace.source.user": "用户",
  "trace.source.userActor": "用户 · {actor}",
  "trace.source.model": "模型",
  "trace.source.tool": "工具 · {name}",
  "trace.source.context": "运行时上下文",
  "trace.source.approval": "审批",
  "trace.source.compaction": "上下文整理",
  "trace.token.line": "输入 {input} · 输出 {output} · 缓存读取 {cacheRead} · 缓存写入 {cacheWrite} · 推理 {reasoning}",
  "trace.token.unavailable": "未提供",
  "trace.metric.earlierUnloaded": "更早历史未加载",
  "trace.metric.unverifiable": "无法核对",
  "trace.metric.unrecorded": "未记录",
  "trace.preview.image": "{n} 张图片",
  "trace.preview.images": "{n} 张图片",
  "trace.preview.resource": "{n} 个资源链接",
  "trace.preview.resources": "{n} 个资源链接",
  "trace.raw.tool": "工具：{name}",
  "trace.attachment.image": "图片 · {mime}",
  "trace.attachment.resource": "资源链接 · {name}",
  "trace.attachment.unnamed": "未命名资源",
  "trace.truncated.one": "已省略 {n} 个子步骤",
  "trace.truncated": "已省略 {n} 个子步骤",
  "trace.truncated.some": "若干",
  "trace.gantt.turnInput": "第 {turn} 轮输入 · 按轮次起点定位",
  "trace.gantt.anchored": "{kind} · 按轮次起点定位",
  "trace.stat.duration": "时长",
  "trace.stat.turns": "轮次",
  "trace.stat.calls": "调用",
  "trace.pane.input": "完整输入",
  "trace.pane.output": "完整输出",
  "trace.pane.timing": "时间",
  "trace.detail.readFailed": "读取详情失败：{message}",
  "trace.detail.loading": "正在读取完整记录…",
  "trace.detail.empty": "尚无可读取的详情",
  "trace.detail.copyInput": "复制输入 JSON",
  "trace.detail.copyResult": "复制结果 JSON",
  "trace.detail.resultMissing": "工具结果尚未记录。",
  "trace.detail.structured": "结构化结果",
  "trace.image.viewResult": "查看结果图片 {n}",
  "trace.image.resultAlt": "工具结果图片 {n}",
  "trace.image.mime": "图片 · {mime}",
  "trace.image.viewInput": "查看输入图片 {n}",
  "trace.image.inputAlt": "输入图片 {n}",
  "trace.resource.link": "资源链接 · {name}",
  "trace.inspector.message": "消息",
  "trace.inspector.turn": "第 {turn} 轮",
  "trace.field.ttft": "首字",
  "trace.field.ttftDuration": "首字耗时",
  "trace.field.turnUsage": "本轮用量",
  "trace.field.callUsage": "当前调用",
  "trace.field.requestOrder": "请求顺序",
  "trace.field.ledgerOrder": "入账顺序",
  "trace.field.cumulativeUsage": "累计入账用量",
  "trace.field.callDuration": "当次耗时",
  "trace.field.cumulativeDuration": "累计调用耗时",
  "trace.field.generationAfter": "后续生成",
  "trace.join.list": "；",
  "trace.timeline.label": "时间轴",
  "trace.timeline.mode": "时间轴模式",
  "trace.timeline.sequence": "记录顺序",
  "trace.timeline.duration": "耗时 · 压缩空闲",
  "trace.timeline.time": "记录时间",
  "trace.timeline.actual": "实际耗时",
  "trace.timeline.noteSequence": "按记录顺序等宽展示",
  "trace.timeline.noteDuration": "长空闲间隔已压缩；输入按轮次起点定位",
  "trace.timeline.noteTime": "按记录时间展示；输入按轮次起点定位",
  "trace.timeline.clear": "清除范围",
  "trace.timeline.clearLabel": "清除时间范围",
  "trace.lane.input": "输入",
  "trace.lane.model": "模型",
  "trace.lane.tool": "工具",
  "trace.lane.aria": "{lane}时间轴：拖动筛选，滚轮缩放，右键拖动平移",
  "trace.cluster": "{n} 条记录 · 点击定位最近记录",
  "trace.gantt.label": "轨迹时间图",
  "trace.loadEarlier": "加载更早的记录",
  "trace.requestPrefix": "请求 #{n} · ",
  "trace.tool.expand": "展开 {source} 的子调用",
  "trace.tool.collapse": "折叠 {source} 的子调用",
  "trace.noResults": "没有匹配的记录",
  "trace.omittedNote": "第 {turn} 轮 · {label}",
  "trace.lightbox.close": "关闭图片预览",
  "trace.empty": "发送一条任务后，这里会按步骤显示耗时。"
};
var traceCatalog = { en: { ...en2 }, "zh-CN": { ...zh2 } };
function traceLocale() {
  if (typeof document !== "undefined" && document.documentElement?.lang === "zh-CN") return "zh-CN";
  return "en";
}
function traceText(key, vars, locale = traceLocale()) {
  const template = traceCatalog[locale][key] ?? traceCatalog.en[key];
  if (!vars) return template;
  return template.replace(
    /\{(\w+)\}/g,
    (match, name) => Object.hasOwn(vars, name) ? String(vars[name]) : match
  );
}

// ../web-units/src/trace-request-metrics.ts
var known = (value) => ({ state: "known", value });
var unknown = (reason) => ({
  state: "unknown",
  reason
});
var tokenMetrics = (call) => {
  const tokens = call.tokens;
  if (!tokens) {
    const missing = unknown("tokens-unreported");
    return { input: missing, output: missing, cacheRead: missing, cacheWrite: missing, reasoning: missing };
  }
  return {
    input: known(tokens.input),
    output: known(tokens.output),
    cacheRead: known(tokens.cacheRead),
    cacheWrite: known(tokens.cacheWrite),
    reasoning: tokens.reasoning === void 0 ? unknown("tokens-unreported") : known(tokens.reasoning)
  };
};
var sum = (left, right) => {
  if (left.state === "unknown") return left;
  if (right.state === "unknown") return right;
  return known(left.value + right.value);
};
var addTokens = (left, right) => ({
  input: sum(left.input, right.input),
  output: sum(left.output, right.output),
  cacheRead: sum(left.cacheRead, right.cacheRead),
  cacheWrite: sum(left.cacheWrite, right.cacheWrite),
  reasoning: sum(left.reasoning, right.reasoning)
});
var initialTokens = (hasEarlier) => {
  const value = hasEarlier ? unknown("earlier-history-unloaded") : known(0);
  return { input: value, output: value, cacheRead: value, cacheWrite: value, reasoning: value };
};
function linkedSpan(spans, placement) {
  const { call, turnId } = placement;
  const matches = spans.get(call.seq) ?? [];
  const match = matches.length === 1 ? matches[0] : void 0;
  const span = match?.turnId === turnId ? match.span : void 0;
  if (!span || span.startSeq >= call.seq) return void 0;
  if (span.effectId !== void 0 && span.effectId !== call.id) return void 0;
  if (span.purpose !== void 0 && span.purpose !== call.purpose) return void 0;
  return span;
}
function indexSpans(turns) {
  const byCallSeq = /* @__PURE__ */ new Map();
  const visit = (turnId, span) => {
    if (span.callSeq !== void 0) {
      const matches = byCallSeq.get(span.callSeq) ?? [];
      matches.push({ turnId, span });
      byCallSeq.set(span.callSeq, matches);
    }
    for (const child of span.children) visit(turnId, child);
  };
  for (const turn of turns) if (turn.trace) visit(turn.id, turn.trace);
  return byCallSeq;
}
function buildTraceRequestMetrics(turns, options) {
  const calls = turns.flatMap(
    (turn) => turn.usage.calls.filter((call) => !call.adjustment).map((call) => ({ turnId: turn.id, call }))
  );
  calls.sort((left, right) => left.call.seq - right.call.seq);
  const uniqueCallSeqs = new Set(calls.map(({ call }) => call.seq));
  if (uniqueCallSeqs.size !== calls.length) return /* @__PURE__ */ new Map();
  const spans = indexSpans(turns);
  const starts = /* @__PURE__ */ new Map();
  for (const placement of calls) {
    const span = linkedSpan(spans, placement);
    if (span) starts.set(placement.call.seq, span.startSeq);
  }
  const uniqueStarts = new Set(starts.values());
  const requestOrderKnown = !options.hasEarlier && starts.size === calls.length && uniqueStarts.size === calls.length;
  const requestNumberBySeq = /* @__PURE__ */ new Map();
  if (requestOrderKnown) {
    const ordered = [...starts.entries()].sort((left, right) => left[1] - right[1]);
    for (const [index, [callSeq]] of ordered.entries()) requestNumberBySeq.set(callSeq, index + 1);
  }
  let cumulativeTokens = initialTokens(options.hasEarlier);
  let cumulativeDuration = options.hasEarlier ? unknown("earlier-history-unloaded") : known(0);
  const byCallSeq = /* @__PURE__ */ new Map();
  for (const [index, placement] of calls.entries()) {
    const { call } = placement;
    const span = linkedSpan(spans, placement);
    const durationSource = call.timing?.durationMs !== void 0 ? "ledger" : span?.durationMs !== void 0 ? "trace" : "unknown";
    const ttftSource = call.timing?.ttftMs !== void 0 ? "ledger" : span?.ttftMs !== void 0 ? "trace" : "unknown";
    const durationMs = call.timing?.durationMs ?? span?.durationMs;
    const ttftMs = call.timing?.ttftMs ?? span?.ttftMs;
    const tokens = tokenMetrics(call);
    const duration = durationMs === void 0 ? unknown("duration-unreported") : known(durationMs);
    cumulativeTokens = addTokens(cumulativeTokens, tokens);
    cumulativeDuration = sum(cumulativeDuration, duration);
    const requestNumber = requestNumberBySeq.get(call.seq);
    byCallSeq.set(call.seq, {
      callSeq: call.seq,
      purpose: call.purpose,
      model: call.model,
      requestNumber: requestOrderKnown && requestNumber !== void 0 ? known(requestNumber) : unknown(options.hasEarlier ? "earlier-history-unloaded" : "request-order-unverifiable"),
      ledgerNumber: options.hasEarlier ? unknown("earlier-history-unloaded") : known(index + 1),
      tokens,
      cumulativeTokens,
      durationMs: duration,
      cumulativeCallDurationMs: cumulativeDuration,
      ttftMs: ttftMs === void 0 ? unknown("ttft-unreported") : known(ttftMs),
      durationSource,
      ttftSource
    });
  }
  return byCallSeq;
}

// ../web-units/src/trace-timeline-density.ts
function unit(members, lane, key) {
  let domainStart = Number.POSITIVE_INFINITY;
  let domainEnd = Number.NEGATIVE_INFINITY;
  for (const bar of members) {
    domainStart = Math.min(domainStart, bar.domainStart);
    domainEnd = Math.max(domainEnd, bar.domainEnd);
  }
  return {
    kind: members.length === 1 ? "bar" : "cluster",
    key,
    lane,
    domainStart,
    domainEnd,
    count: members.length,
    members
  };
}
function single(bar) {
  return unit([bar], bar.lane, `bar:${encodeURIComponent(bar.key)}`);
}
function buildTraceTimelineDensity(bars, options = {}) {
  const maxUnits = options.maxUnits ?? 600;
  if (!Number.isSafeInteger(maxUnits) || maxUnits < 1)
    throw new RangeError("maxUnits must be a positive integer");
  const keys = /* @__PURE__ */ new Set();
  let domainStart = Number.POSITIVE_INFINITY;
  let domainEnd = Number.NEGATIVE_INFINITY;
  for (const bar of bars) {
    if (keys.has(bar.key)) throw new Error(`duplicate timeline bar key: ${bar.key}`);
    keys.add(bar.key);
    if (!Number.isFinite(bar.domainStart) || !Number.isFinite(bar.domainEnd) || bar.domainEnd < bar.domainStart)
      throw new RangeError(`invalid timeline domain for ${bar.key}`);
    domainStart = Math.min(domainStart, bar.domainStart);
    domainEnd = Math.max(domainEnd, bar.domainEnd);
  }
  if (bars.length <= maxUnits) return bars.map(single);
  const selectedIndex = options.selectedKey === void 0 ? -1 : bars.findIndex((bar) => bar.key === options.selectedKey);
  const selected = selectedIndex < 0 ? void 0 : bars[selectedIndex];
  const byLane = /* @__PURE__ */ new Map();
  for (const [index, bar] of bars.entries()) {
    if (index === selectedIndex) continue;
    let lane = byLane.get(bar.lane);
    if (!lane) {
      lane = { name: bar.lane, bars: [], quota: 1 };
      byLane.set(bar.lane, lane);
    }
    lane.bars.push({ bar, index });
  }
  const lanes = [...byLane.values()];
  const available = maxUnits - (selected ? 1 : 0);
  if (lanes.length > available)
    throw new RangeError("maxUnits must allow each lane and the selected bar to remain visible");
  for (let spare = available - lanes.length; spare > 0; spare--) {
    let fullest;
    for (const lane of lanes) {
      if (lane.quota >= lane.bars.length) continue;
      if (!fullest || lane.bars.length / lane.quota > fullest.bars.length / fullest.quota) fullest = lane;
    }
    if (!fullest) break;
    fullest.quota++;
  }
  const positioned = [];
  if (selected) positioned.push({ firstIndex: selectedIndex, unit: single(selected) });
  for (const lane of lanes) {
    const buckets = /* @__PURE__ */ new Map();
    for (const entry of lane.bars) {
      const midpoint = entry.bar.domainStart + (entry.bar.domainEnd - entry.bar.domainStart) / 2;
      const fraction = domainEnd === domainStart ? 0 : (midpoint - domainStart) / (domainEnd - domainStart);
      const bucket = Math.min(lane.quota - 1, Math.max(0, Math.floor(fraction * lane.quota)));
      const members = buckets.get(bucket) ?? [];
      members.push(entry);
      buckets.set(bucket, members);
    }
    for (const [bucket, entries2] of buckets) {
      const first = entries2[0];
      if (!first) continue;
      const members = entries2.map(({ bar }) => bar);
      const key = members.length === 1 ? `bar:${encodeURIComponent(first.bar.key)}` : `cluster:${encodeURIComponent(lane.name)}:${bucket}`;
      positioned.push({
        firstIndex: first.index,
        unit: unit(members, lane.name, key)
      });
    }
  }
  return positioned.sort((a, b) => a.firstIndex - b.firstIndex).map(({ unit: item }) => item);
}
function pickTraceTimelineDensityMember(item, domainPosition) {
  if (!Number.isFinite(domainPosition)) throw new RangeError("domainPosition must be finite");
  const first = item.members[0];
  if (!first) throw new RangeError("timeline density unit has no members");
  let nearest = first;
  let nearestIntervalDistance = Number.POSITIVE_INFINITY;
  let nearestCenterDistance = Number.POSITIVE_INFINITY;
  for (const bar of item.members) {
    const intervalDistance = domainPosition < bar.domainStart ? bar.domainStart - domainPosition : domainPosition > bar.domainEnd ? domainPosition - bar.domainEnd : 0;
    const midpoint = bar.domainStart + (bar.domainEnd - bar.domainStart) / 2;
    const centerDistance = Math.abs(domainPosition - midpoint);
    if (intervalDistance < nearestIntervalDistance || intervalDistance === nearestIntervalDistance && centerDistance < nearestCenterDistance) {
      nearest = bar;
      nearestIntervalDistance = intervalDistance;
      nearestCenterDistance = centerDistance;
    }
  }
  return nearest;
}

// ../web-units/src/trace-virtual-window.ts
function requireFiniteNonnegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and nonnegative`);
}
function clamp(value, lower, upper) {
  return Math.max(lower, Math.min(value, upper));
}
function buildTraceVirtualLayout(entries2, heights) {
  for (const [name, height] of Object.entries(heights)) {
    if (!Number.isFinite(height) || height <= 0) throw new RangeError(`${name} height must be positive`);
  }
  const offsets = [0];
  const indexByKey = /* @__PURE__ */ new Map();
  for (const [index, entry] of entries2.entries()) {
    if (indexByKey.has(entry.key)) throw new Error(`duplicate trace key: ${entry.key}`);
    indexByKey.set(entry.key, index);
    offsets.push((offsets[index] ?? 0) + heights[entry.kind]);
  }
  return { entries: entries2, offsets, indexByKey, totalHeight: offsets[offsets.length - 1] ?? 0 };
}
function indexAtOffset(layout, offset) {
  let low = 0;
  let high = layout.entries.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((layout.offsets[middle + 1] ?? 0) <= offset) low = middle + 1;
    else high = middle;
  }
  return low;
}
function indexStartingAtOrAfter(layout, offset) {
  let low = 0;
  let high = layout.entries.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((layout.offsets[middle] ?? 0) < offset) low = middle + 1;
    else high = middle;
  }
  return low;
}
function getTraceVirtualWindow(layout, scrollTop, viewportHeight, overscanPx = 0) {
  requireFiniteNonnegative(viewportHeight, "viewportHeight");
  requireFiniteNonnegative(overscanPx, "overscanPx");
  const count = layout.entries.length;
  if (count === 0) return { start: 0, end: 0, topPadding: 0, bottomPadding: 0, totalHeight: 0 };
  const top = clamp(
    Number.isFinite(scrollTop) ? scrollTop : 0,
    0,
    Math.max(0, layout.totalHeight - viewportHeight)
  );
  const start = Math.min(count - 1, indexAtOffset(layout, Math.max(0, top - overscanPx)));
  const end = Math.max(
    start + 1,
    indexStartingAtOrAfter(layout, Math.min(layout.totalHeight, top + viewportHeight + overscanPx))
  );
  return {
    start,
    end: Math.min(count, end),
    topPadding: layout.offsets[start] ?? 0,
    bottomPadding: layout.totalHeight - (layout.offsets[Math.min(count, end)] ?? layout.totalHeight),
    totalHeight: layout.totalHeight
  };
}
function captureTraceVirtualAnchor(layout, scrollTop) {
  if (layout.entries.length === 0) return void 0;
  const top = clamp(Number.isFinite(scrollTop) ? scrollTop : 0, 0, layout.totalHeight);
  const index = Math.min(layout.entries.length - 1, indexAtOffset(layout, top));
  const entry = layout.entries[index];
  return entry ? { key: entry.key, offsetWithinEntry: top - (layout.offsets[index] ?? 0) } : void 0;
}
function restoreTraceVirtualAnchor(layout, anchor, fallbackScrollTop = 0, viewportHeight = 0) {
  requireFiniteNonnegative(viewportHeight, "viewportHeight");
  const index = anchor ? layout.indexByKey.get(anchor.key) : void 0;
  const target = index === void 0 || anchor === void 0 ? fallbackScrollTop : (layout.offsets[index] ?? 0) + anchor.offsetWithinEntry;
  return clamp(Number.isFinite(target) ? target : 0, 0, Math.max(0, layout.totalHeight - viewportHeight));
}
function getTraceVirtualScrollTopForKey(layout, key, scrollTop, viewportHeight) {
  requireFiniteNonnegative(viewportHeight, "viewportHeight");
  const index = layout.indexByKey.get(key);
  if (index === void 0) return void 0;
  const top = clamp(
    Number.isFinite(scrollTop) ? scrollTop : 0,
    0,
    Math.max(0, layout.totalHeight - viewportHeight)
  );
  const entryTop = layout.offsets[index] ?? 0;
  const entryBottom = layout.offsets[index + 1] ?? entryTop;
  if (entryBottom - entryTop > viewportHeight) return entryTop;
  if (entryTop < top) return entryTop;
  if (entryBottom > top + viewportHeight)
    return clamp(entryBottom - viewportHeight, 0, Math.max(0, layout.totalHeight - viewportHeight));
  return top;
}

// ../web-units/src/trace.ts
var TRACE_PANEL_STORAGE_KEY = "agnes.web.tracePanel";
var BADGE_KEY = {
  user: "trace.badge.user",
  context: "trace.badge.context",
  assistant: "trace.badge.assistant",
  tool: "trace.badge.tool",
  approval: "trace.badge.approval",
  compaction: "trace.badge.compaction",
  cost: "trace.badge.cost"
};
var STATUS_KEY = {
  running: "trace.status.running",
  waiting: "trace.status.waiting",
  completed: "trace.status.completed",
  failed: "trace.status.failed",
  cancelled: "trace.status.cancelled",
  planned: "trace.status.planned",
  awaiting_approval: "trace.status.awaiting_approval"
};
var TRACE_ROW_HEIGHT = 32;
var TRACE_HEADER_HEIGHT = 33;
var TRACE_VIRTUAL_THRESHOLD = 100;
var clip = (value, max) => value.length <= max ? value : `${value.slice(0, max).trimEnd()}…`;
var durationLabel = (duration) => {
  if (duration === void 0) return traceText("trace.duration.running");
  if (duration < 1e3) return traceText("trace.duration.ms", { n: duration });
  if (duration < 6e4)
    return traceText("trace.duration.seconds", { n: (duration / 1e3).toFixed(duration < 1e4 ? 1 : 0) });
  return traceText("trace.duration.minutes", {
    minutes: Math.floor(duration / 6e4),
    seconds: Math.round(duration % 6e4 / 1e3)
  });
};
var tokenLabel = (tokens, reasoningKnown) => traceText("trace.token.line", {
  input: tokens.input,
  output: tokens.output,
  cacheRead: tokens.cacheRead,
  cacheWrite: tokens.cacheWrite,
  reasoning: reasoningKnown ? tokens.reasoning ?? "" : traceText("trace.token.unavailable")
});
var metricLabel = (metric) => metric.state === "known" ? String(metric.value) : metric.reason === "earlier-history-unloaded" ? traceText("trace.metric.earlierUnloaded") : metric.reason === "request-order-unverifiable" ? traceText("trace.metric.unverifiable") : traceText("trace.metric.unrecorded");
var metricTokensLabel = (tokens) => traceText("trace.token.line", {
  input: metricLabel(tokens.input),
  output: metricLabel(tokens.output),
  cacheRead: metricLabel(tokens.cacheRead),
  cacheWrite: metricLabel(tokens.cacheWrite),
  reasoning: metricLabel(tokens.reasoning)
});
var walkSpans = (span, visit) => {
  visit(span);
  for (const child of span.children) walkSpans(child, visit);
};
var nodePreview = (node) => {
  if (node.kind === "user") {
    const message2 = node.content.filter(
      (block) => block.type === "text"
    ).map((block) => block.text).join("\n");
    const images = node.content.filter((block) => block.type === "image").length;
    const resources = node.content.filter((block) => block.type === "resource_link").length;
    return [
      message2,
      images ? traceText(images === 1 ? "trace.preview.image" : "trace.preview.images", { n: images }) : "",
      resources ? traceText(resources === 1 ? "trace.preview.resource" : "trace.preview.resources", { n: resources }) : ""
    ].filter(Boolean).join(" · ");
  }
  if (node.kind === "assistant") return node.text || node.thinking || "";
  if (node.kind === "context") return node.text;
  if (node.kind === "tool") {
    const summary = node.summary && node.summary !== node.name ? ` · ${node.summary}` : "";
    const args = node.argsPreview ? ` ${node.argsPreview}` : "";
    const result2 = node.resultPreview ? ` → ${node.resultPreview}` : "";
    return `${node.name}${summary}${args}${result2}`;
  }
  if (node.kind === "approval") return node.summary;
  if (node.kind === "compaction") return node.summary ?? "";
  if (node.kind === "cost") return node.model ?? node.purpose ?? "";
  if (node.kind === "artifact") return node.name;
  return "";
};
var nodeRaw = (node) => {
  if (node.kind === "assistant") return [node.thinking, node.text].filter(Boolean).join("\n\n");
  if (node.kind === "tool")
    return [traceText("trace.raw.tool", { name: node.name }), node.argsPreview, node.resultPreview].filter(Boolean).join("\n\n");
  return nodePreview(node);
};
var userAttachments = (node) => {
  if (node.kind !== "user") return [];
  return node.content.flatMap((block) => {
    if (block.type === "image") return [traceText("trace.attachment.image", { mime: block.mimeType })];
    if (block.type === "resource_link") {
      const name = `${block.name ?? traceText("trace.attachment.unnamed")}${block.mimeType ? ` · ${block.mimeType}` : ""}`;
      return [traceText("trace.attachment.resource", { name })];
    }
    return [];
  });
};
var nodeSource = (node) => {
  if (node.kind === "user")
    return node.actorLabel ? traceText("trace.source.userActor", { actor: node.actorLabel }) : traceText("trace.source.user");
  if (node.kind === "assistant") return traceText("trace.source.model");
  if (node.kind === "tool") return traceText("trace.source.tool", { name: node.name });
  if (node.kind === "context") return traceText("trace.source.context");
  if (node.kind === "approval") return traceText("trace.source.approval");
  if (node.kind === "compaction") return traceText("trace.source.compaction");
  return node.kind;
};
var LIST_KINDS = /* @__PURE__ */ new Set(["user", "context", "assistant", "tool", "approval", "compaction"]);
var isTruncation = (span) => span.error?.code === "TRACE_TRUNCATED";
var truncationLabel = (span) => {
  const n = span.error?.message ?? traceText("trace.truncated.some");
  return traceText(n === "1" ? "trace.truncated.one" : "trace.truncated", { n });
};
function indexTrace(turns) {
  const turnByNode = /* @__PURE__ */ new Map();
  const spanByNode = /* @__PURE__ */ new Map();
  const spanByToolUse = /* @__PURE__ */ new Map();
  let order = 0;
  for (const turn of turns) {
    for (const id of turn.nodeIds) if (!turnByNode.has(id)) turnByNode.set(id, turn);
    if (!turn.trace) continue;
    const visit = (span, step) => {
      const currentStep = span.kind === "step" ? span.name : step;
      const placed = { span, order: order++, step: currentStep };
      for (const id of span.nodeIds ?? []) if (!spanByNode.has(id)) spanByNode.set(id, placed);
      if (span.toolUseId && !spanByToolUse.has(span.toolUseId)) spanByToolUse.set(span.toolUseId, placed);
      for (const child of span.children) visit(child, currentStep);
    };
    visit(turn.trace);
  }
  return {
    turnFor(node) {
      return turnByNode.get(node.id) ?? turns.find(
        (turn) => node.seq >= turn.startSeq && (turn.endSeq === void 0 || node.seq <= turn.endSeq)
      );
    },
    spanFor(node) {
      const byId = spanByNode.get(node.id);
      const byTool = node.kind === "tool" ? spanByToolUse.get(node.toolUseId) : void 0;
      if (!byTool) return byId;
      return !byId || byTool.order < byId.order ? byTool : byId;
    }
  };
}
var rowCache = /* @__PURE__ */ new WeakMap();
function buildTraceRows(nodes, turns) {
  const index = indexTrace(turns);
  const rows = [];
  for (const node of nodes) {
    if (node.kind === "slot" || !LIST_KINDS.has(node.kind)) continue;
    const turn = index.turnFor(node);
    const placed = index.spanFor(node);
    const span = placed?.span;
    const preview = nodePreview(node).replace(/\s+/g, " ").trim();
    const raw = nodeRaw(node);
    const attachments = userAttachments(node);
    const statusCode = node.kind === "tool" ? node.status : span?.status ?? "completed";
    const status = traceText(STATUS_KEY[statusCode] ?? "trace.status.completed");
    const errorCode = span && !isTruncation(span) ? span.error?.code : void 0;
    const usage = turn?.usage?.calls.length ? turn.usage : void 0;
    const callUsage = span?.callSeq === void 0 ? void 0 : turn?.usage?.calls.find((call) => call.seq === span.callSeq && !call.adjustment);
    const locale = traceLocale();
    const cached = rowCache.get(node);
    if (cached && cached.locale === locale && cached.turn === turn && cached.span === span && cached.row.step === placed?.step && cached.row.preview === preview && cached.row.raw === raw && (cached.row.attachments ?? []).join("\0") === attachments.join("\0") && cached.row.status === status && cached.row.startedAt === span?.startedAt && cached.row.durationMs === span?.durationMs && cached.row.ttftMs === span?.ttftMs && cached.row.errorCode === errorCode && cached.row.usage === usage && cached.row.callUsage === callUsage) {
      rows.push(cached.row);
      continue;
    }
    const row = {
      id: node.id,
      seq: node.seq,
      turn: turn?.turn,
      step: placed?.step,
      kind: node.kind,
      badge: traceText(BADGE_KEY[node.kind] ?? "trace.badge.assistant"),
      preview,
      raw,
      ...node.kind === "tool" ? { rawNote: traceText("trace.note.tool") } : {},
      ...attachments.length ? { attachments, rawNote: traceText("trace.note.attachments") } : {},
      source: nodeSource(node),
      status,
      statusCode,
      startedAt: span?.startedAt,
      durationMs: span?.durationMs,
      ttftMs: span?.ttftMs,
      model: span?.model,
      errorCode,
      usage,
      callUsage
    };
    rowCache.set(node, { locale, turn, span, row });
    rows.push(row);
  }
  return rows;
}
var traceRowBuilder = { build: buildTraceRows };
var IDLE_GAP_MS = 120;
function projectTimedEvents(events, mode) {
  if (events.length === 0) return { bars: [], start: 0, end: 1 };
  const ordered = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const origin = ordered[0]?.start ?? 0;
  let coveredUntil = origin;
  let removedIdle = 0;
  const placed = [];
  for (const event of ordered) {
    const gap = event.start - coveredUntil;
    if (mode === "duration" && gap > IDLE_GAP_MS) removedIdle += gap - 48;
    const compactStart = event.start - origin - removedIdle;
    const compactEnd = (mode === "time" ? event.start : Math.max(event.end, event.start)) - origin - removedIdle;
    placed.push({ ...event, compactStart, compactEnd });
    coveredUntil = Math.max(coveredUntil, event.end, event.start);
  }
  let total = 1;
  for (const event of placed) total = Math.max(total, event.compactEnd);
  return {
    start: 0,
    end: total,
    bars: placed.map((event) => ({
      key: event.key,
      ...event.truncated ? { truncated: event.truncated } : {},
      ...event.targetId ? { targetId: event.targetId } : {},
      ...event.compactEnd <= event.compactStart ? { marker: true } : {},
      lane: event.lane,
      ...event.tone ? { tone: event.tone } : {},
      left: event.compactStart / total * 100,
      width: event.compactEnd <= event.compactStart ? 0 : Math.max(1.8, (event.compactEnd - event.compactStart) / total * 100),
      end: event.compactEnd / total * 100,
      domainStart: event.compactStart,
      domainEnd: event.compactEnd,
      title: event.title
    }))
  };
}
function buildGantt(turns, nodes = [], rows = [], mode = "duration") {
  if (mode === "sequence") {
    return {
      start: 0,
      end: Math.max(1, rows.length),
      bars: rows.map((row, index) => ({
        key: `row:${row.id}`,
        targetId: row.id,
        lane: row.kind === "user" || row.kind === "context" ? "input" : row.kind === "tool" ? "tool" : "model",
        ...row.kind === "user" ? { tone: "user" } : {},
        ...row.kind === "context" ? { tone: "context" } : {},
        left: index / rows.length * 100,
        end: (index + 1) / rows.length * 100,
        width: 100 / rows.length,
        domainStart: index,
        domainEnd: index + 1,
        title: `${row.source} · ${clip(row.preview, 120)}`
      }))
    };
  }
  const events = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const rowNodeIds = new Set(nodes.filter((node) => LIST_KINDS.has(node.kind)).map((node) => node.id));
  const toolByUseId = new Map(
    nodes.flatMap((node) => node.kind === "tool" ? [[node.toolUseId, node.id]] : [])
  );
  const inputNodes = nodes.filter((node) => node.kind === "user" || node.kind === "context").sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const firstAtOrAfter = (seq) => {
    let low = 0;
    let high = inputNodes.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if ((inputNodes[middle]?.seq ?? 0) < seq) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  for (const turn of turns) {
    if (!turn.trace) continue;
    const origin = Date.parse(turn.trace.startedAt);
    if (!Number.isFinite(origin)) continue;
    const selected = /* @__PURE__ */ new Set();
    const turnInputs = [];
    for (const id of turn.nodeIds) {
      const node = nodeById.get(id);
      if (node && (node.kind === "user" || node.kind === "context") && !selected.has(node.id)) {
        selected.add(node.id);
        turnInputs.push(node);
      }
    }
    const start = firstAtOrAfter(turn.startSeq);
    const end = firstAtOrAfter((turn.endSeq ?? Number.POSITIVE_INFINITY) + 1);
    for (const node of inputNodes.slice(start, end)) {
      if (selected.has(node.id)) continue;
      selected.add(node.id);
      turnInputs.push(node);
    }
    turnInputs.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    if (turnInputs.length === 0) {
      events.push({
        key: `input:${turn.id}`,
        lane: "input",
        start: origin,
        end: origin,
        title: traceText("trace.gantt.turnInput", { turn: turn.turn })
      });
    } else {
      turnInputs.forEach((node) => {
        events.push({
          key: `input:${turn.id}:${node.id}`,
          lane: "input",
          tone: node.kind === "user" ? "user" : "context",
          start: origin,
          end: origin,
          targetId: node.id,
          title: traceText("trace.gantt.anchored", {
            kind: traceText(node.kind === "user" ? "trace.badge.user" : "trace.badge.context")
          })
        });
      });
    }
    walkSpans(turn.trace, (span) => {
      const at = Date.parse(span.startedAt);
      if (!Number.isFinite(at)) return;
      const duration = span.durationMs ?? 0;
      const targetId = span.nodeIds?.find((id) => rowNodeIds.has(id)) ?? (span.toolUseId ? toolByUseId.get(span.toolUseId) : void 0);
      if (span.kind === "generation")
        events.push({
          key: span.id,
          lane: "model",
          start: at,
          end: at + duration,
          ...targetId ? { targetId } : {},
          title: `${span.model ?? span.name} · ${span.durationMs === void 0 && span.status !== "running" ? traceText("trace.duration.unknown") : durationLabel(span.durationMs)}`
        });
      if (span.kind === "tool")
        events.push({
          key: span.id,
          lane: "tool",
          start: at,
          end: at + duration,
          ...targetId ? { targetId } : {},
          title: `${span.name} · ${span.durationMs === void 0 && span.status !== "running" ? traceText("trace.duration.unknown") : durationLabel(span.durationMs)}`
        });
      if (isTruncation(span)) {
        const label2 = truncationLabel(span);
        events.push({ key: span.id, truncated: label2, lane: "tool", start: at, end: at, title: label2 });
      }
    });
  }
  const seen = /* @__PURE__ */ new Map();
  for (const event of events) {
    const count = seen.get(event.key) ?? 0;
    seen.set(event.key, count + 1);
    if (count > 0) event.key = `${event.key}#${count}`;
  }
  return projectTimedEvents(events, mode);
}
var truncations = (turns) => {
  const found = [];
  for (const turn of turns)
    if (turn.trace)
      walkSpans(turn.trace, (span) => {
        if (isTruncation(span)) found.push({ key: span.id, turn: turn.turn, label: truncationLabel(span) });
      });
  return found;
};
var traceStats = (turns) => {
  let calls = 0;
  let duration = 0;
  for (const turn of turns) {
    duration += turn.durationMs ?? turn.trace?.durationMs ?? 0;
    if (turn.trace)
      walkSpans(turn.trace, (span) => {
        if (span.kind === "generation" || span.kind === "tool") calls += 1;
      });
  }
  return [
    [traceText("trace.stat.duration"), durationLabel(duration)],
    [traceText("trace.stat.turns"), String(turns.length)],
    [traceText("trace.stat.calls"), String(calls)]
  ];
};
var INSPECTOR_PANE_IDS = ["overview", "preview", "raw", "source"];
var PANE_KEY = {
  overview: "trace.pane.overview",
  preview: "trace.pane.preview",
  raw: "trace.pane.raw",
  source: "trace.pane.source",
  input: "trace.pane.input",
  output: "trace.pane.output",
  timing: "trace.pane.timing"
};
var laneName = (lane) => traceText(lane === "input" ? "trace.lane.input" : lane === "model" ? "trace.lane.model" : "trace.lane.tool");
var clampPercent = (value) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
var orderedRange = (a, b) => a <= b ? { start: a, end: b } : { start: b, end: a };
var barIntersectsRange = (bar, range) => bar.marker ? bar.domainStart >= range.start && bar.domainStart <= range.end : bar.domainStart < range.end && bar.domainEnd > range.start;
var Trace = forwardRef7(function Trace2({ root, options }, ref) {
  const store = options.store ?? sessionStorage;
  const open3 = useRef7(store.getItem(TRACE_PANEL_STORAGE_KEY) === "open");
  const [snapshot, setSnapshot] = useState3({ nodes: [], turns: [] });
  const latest = useRef7(void 0);
  const [query, setQuery] = useState3("");
  const [selected, setSelected] = useState3(void 0);
  const [pane, setPane] = useState3("overview");
  const [toolDetail, setToolDetail] = useState3(void 0);
  const [lightbox, setLightbox] = useState3(null);
  useEffect(() => {
    if (!lightbox) return;
    const previousFocus = document.activeElement;
    root.querySelector(".trace-lightbox-close")?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [lightbox, root]);
  const [collapsedTurns, setCollapsedTurns] = useState3(/* @__PURE__ */ new Set());
  const [collapsedTools, setCollapsedTools] = useState3(/* @__PURE__ */ new Set());
  const [timelineMode, setTimelineMode] = useState3("duration");
  const [timelineRange, setTimelineRange] = useState3(null);
  const [timelineDraft, setTimelineDraft] = useState3(null);
  const [timelineViewport, setTimelineViewport] = useState3(null);
  const [listScrollTop, setListScrollTop] = useState3(0);
  const [listViewportHeight, setListViewportHeight] = useState3(480);
  const listViewportHeightRef = useRef7(listViewportHeight);
  listViewportHeightRef.current = listViewportHeight;
  const listRef = useRef7(null);
  const layoutRef = useRef7(null);
  const pendingListPosition = useRef7(
    null
  );
  const earlierPosition = useRef7(null);
  const renderedSessionId = useRef7(void 0);
  const timelineRef = useRef7(null);
  const timelineTrackRef = useRef7(null);
  const timelineGesture = useRef7(null);
  const locale = useSyncExternalStore((listener) => {
    window.addEventListener("agnes:locale-changed", listener);
    return () => window.removeEventListener("agnes:locale-changed", listener);
  }, traceLocale);
  const rows = useMemo(
    () => traceRowBuilder.build(snapshot.nodes, snapshot.turns),
    [snapshot.nodes, snapshot.turns, locale]
  );
  const toolHierarchy = useMemo(() => buildTraceToolHierarchy(snapshot.nodes), [snapshot.nodes]);
  const selectedRow = selected ? rows.find((row) => row.id === selected) : void 0;
  const requestMetrics = useMemo(
    () => buildTraceRequestMetrics(snapshot.turns, { hasEarlier: Boolean(snapshot.meta?.hasEarlier) }),
    [snapshot.turns, snapshot.meta?.hasEarlier]
  );
  const selectedRequest = selectedRow?.callUsage ? requestMetrics.get(selectedRow.callUsage.seq) : void 0;
  const selectedUserNode = selected ? snapshot.nodes.find((node) => node.id === selected && node.kind === "user") : void 0;
  const selectedToolNode = selected ? snapshot.nodes.find((node) => node.id === selected && node.kind === "tool") : void 0;
  const selectedToolCallSeq = selectedToolNode?.seq;
  const selectedToolResultSeq = selectedToolNode?.kind === "tool" ? selectedToolNode.resultSeq : void 0;
  const selectedToolKey = selectedToolNode && options.readToolDetail && snapshot.meta?.sessionId ? `${snapshot.meta?.sessionId ?? ""}:${selectedToolNode.id}:${selectedToolCallSeq}:${selectedToolResultSeq ?? ""}` : void 0;
  const activeToolDetail = toolDetail?.key === selectedToolKey ? toolDetail : void 0;
  const wantsToolDetail = pane === "input" || pane === "output";
  useEffect(() => {
    const sessionId = snapshot.meta?.sessionId;
    if (!wantsToolDetail || selectedToolKey === void 0 || selectedToolCallSeq === void 0 || !sessionId || !options.readToolDetail)
      return;
    let active = true;
    const controller = new AbortController();
    setToolDetail({ key: selectedToolKey, status: "loading" });
    void options.readToolDetail(sessionId, selectedToolCallSeq, selectedToolResultSeq, controller.signal).then(
      (value) => {
        if (active) setToolDetail({ key: selectedToolKey, status: "ready", value });
      },
      (error) => {
        if (active)
          setToolDetail({
            key: selectedToolKey,
            status: "error",
            message: error instanceof Error ? error.message : String(error)
          });
      }
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    options.readToolDetail,
    selectedToolKey,
    selectedToolCallSeq,
    selectedToolResultSeq,
    snapshot.meta?.sessionId,
    wantsToolDetail
  ]);
  const numberedTurns = [...new Set(rows.flatMap((row) => row.turn === void 0 ? [] : [row.turn]))];
  const allTurnsCollapsed = numberedTurns.length > 0 && numberedTurns.every((turn) => collapsedTurns.has(turn));
  const applyOpen = (next, persist) => {
    open3.current = next;
    const pending = latest.current;
    if (next && pending) {
      latest.current = void 0;
      pendingListPosition.current = { anchor: void 0, followTail: true };
      flushSync4(() => {
        if (renderedSessionId.current !== pending.meta?.sessionId) {
          renderedSessionId.current = pending.meta?.sessionId;
          setSelected(void 0);
          setLightbox(null);
          setQuery("");
          setTimelineRange(null);
          setTimelineViewport(null);
          setCollapsedTurns(/* @__PURE__ */ new Set());
          setCollapsedTools(/* @__PURE__ */ new Set());
        }
        setSnapshot(pending);
      });
    }
    root.hidden = !next;
    document.body.classList.toggle("trace-open", next);
    options.toggle.setAttribute("aria-pressed", next ? "true" : "false");
    options.toggle.setAttribute("aria-selected", next ? "true" : "false");
    if (options.chatToggle) {
      options.chatToggle.setAttribute("aria-selected", next ? "false" : "true");
      options.chatToggle.setAttribute("aria-pressed", next ? "false" : "true");
    }
    if (options.conversation) options.conversation.hidden = next;
    if (persist) store.setItem(TRACE_PANEL_STORAGE_KEY, next ? "open" : "closed");
  };
  const applyOpenRef = useRef7(applyOpen);
  applyOpenRef.current = applyOpen;
  useLayoutEffect6(() => {
    const openTrace = () => applyOpenRef.current(true, true);
    const openChat = () => applyOpenRef.current(false, true);
    options.toggle.addEventListener("click", openTrace);
    options.chatToggle?.addEventListener("click", openChat);
    applyOpenRef.current(open3.current, false);
    return () => {
      options.toggle.removeEventListener("click", openTrace);
      options.chatToggle?.removeEventListener("click", openChat);
      document.body.classList.remove("trace-open");
    };
  }, [options.chatToggle, options.toggle]);
  useImperativeHandle7(
    ref,
    () => ({
      render(nodes, turns = [], meta2) {
        if (!open3.current) {
          latest.current = { nodes, turns, meta: meta2 };
          return;
        }
        const list2 = listRef.current;
        const layout = layoutRef.current;
        const switchingSession = renderedSessionId.current !== meta2?.sessionId;
        const earlier = earlierPosition.current;
        const olderLoaded = earlier && earlier.sessionId === meta2?.sessionId && earlier.firstNodeId !== nodes[0]?.id;
        if (switchingSession) {
          earlierPosition.current = null;
          pendingListPosition.current = { anchor: void 0, followTail: true };
        } else if (olderLoaded) {
          earlierPosition.current = null;
          pendingListPosition.current = { anchor: earlier.anchor, followTail: false };
        } else if (list2 && layout) {
          const viewportHeight = list2.clientHeight || listViewportHeightRef.current;
          pendingListPosition.current = {
            anchor: captureTraceVirtualAnchor(layout, list2.scrollTop),
            followTail: layout.entries.length === 0 || list2.scrollTop + viewportHeight >= layout.totalHeight - 48
          };
        }
        flushSync4(() => {
          if (renderedSessionId.current !== meta2?.sessionId) {
            renderedSessionId.current = meta2?.sessionId;
            setSelected(void 0);
            setLightbox(null);
            setQuery("");
            setTimelineRange(null);
            setTimelineViewport(null);
            setCollapsedTurns(/* @__PURE__ */ new Set());
            setCollapsedTools(/* @__PURE__ */ new Set());
          }
          if (olderLoaded) {
            setTimelineRange(null);
            setTimelineViewport(null);
          }
          setSnapshot({ nodes, turns, meta: meta2 });
          if (nodes.length === 0) {
            setCollapsedTurns(/* @__PURE__ */ new Set());
            setCollapsedTools(/* @__PURE__ */ new Set());
          }
          setSelected(
            (current2) => current2 && nodes.some((node) => node.id === current2) ? current2 : void 0
          );
        });
      },
      setOpen(next) {
        applyOpenRef.current(next, true);
      },
      isOpen() {
        return open3.current;
      }
    }),
    []
  );
  const timelineModel = useMemo(
    () => buildGantt(snapshot.turns, snapshot.nodes, rows, timelineMode),
    [snapshot.turns, snapshot.nodes, rows, timelineMode]
  );
  const bars = timelineModel.bars;
  const fullTimelineWidth = timelineModel.end - timelineModel.start;
  const viewportWidth = Math.min(
    fullTimelineWidth,
    timelineViewport ? timelineViewport.end - timelineViewport.start : fullTimelineWidth
  );
  const viewportStart = timelineViewport ? Math.max(timelineModel.start, Math.min(timelineModel.end - viewportWidth, timelineViewport.start)) : timelineModel.start;
  const viewportEnd = viewportStart + viewportWidth;
  const selectedBarKey = useMemo(() => bars.find((bar) => bar.targetId === selected)?.key, [bars, selected]);
  const visibleTimelineBars = useMemo(
    () => bars.filter((bar) => bar.domainStart <= viewportEnd && bar.domainEnd >= viewportStart),
    [bars, viewportStart, viewportEnd]
  );
  const timelineUnits = useMemo(
    () => buildTraceTimelineDensity(visibleTimelineBars, selectedBarKey ? { selectedKey: selectedBarKey } : {}),
    [visibleTimelineBars, selectedBarKey]
  );
  const rangeIds = useMemo(
    () => timelineRange && !(timelineRange.start <= timelineModel.start && timelineRange.end >= timelineModel.end) ? new Set(
      bars.filter((bar) => bar.targetId && barIntersectsRange(bar, timelineRange)).map((bar) => bar.targetId)
    ) : null,
    [bars, timelineRange, timelineModel.start, timelineModel.end]
  );
  const visibleRows = useMemo(
    () => rows.filter((row) => {
      if (rangeIds && !rangeIds.has(row.id)) return false;
      if (!query && !timelineRange && isTraceRowHiddenByTool(toolHierarchy, row.id, collapsedTools))
        return false;
      if (!query) return true;
      const hay = `${row.badge} ${row.step ?? ""} ${row.preview} ${row.raw} ${row.source} ${row.errorCode ?? ""}`.toLowerCase();
      return hay.includes(query);
    }),
    [rows, rangeIds, query, timelineRange, toolHierarchy, collapsedTools]
  );
  const groups = useMemo(() => {
    const result2 = [];
    for (const row of visibleRows) {
      const previous = result2[result2.length - 1];
      if (previous && previous.turn === row.turn) previous.rows.push(row);
      else result2.push({ turn: row.turn, rows: [row] });
    }
    return result2;
  }, [visibleRows]);
  const focusActive = Boolean(query || timelineRange);
  const listItems = useMemo(() => {
    const items = [];
    if (snapshot.meta?.hasEarlier && snapshot.meta.loadEarlier)
      items.push({ key: "load-earlier", kind: "header", loadEarlier: snapshot.meta.loadEarlier });
    for (const group of groups) {
      if (group.turn !== void 0)
        items.push({
          key: `turn:${group.rows[0]?.id}`,
          kind: "header",
          turn: group.turn,
          count: group.rows.length,
          collapsed: collapsedTurns.has(group.turn) && !focusActive
        });
      if (group.turn !== void 0 && collapsedTurns.has(group.turn) && !focusActive) continue;
      for (const [index, row] of group.rows.entries())
        items.push({
          key: `row:${row.id}`,
          kind: "row",
          row,
          showStep: row.step !== void 0 && (index === 0 || group.rows[index - 1]?.step !== row.step)
        });
    }
    return items;
  }, [groups, collapsedTurns, focusActive, snapshot.meta]);
  const listLayout = useMemo(
    () => buildTraceVirtualLayout(listItems, { header: TRACE_HEADER_HEIGHT, row: TRACE_ROW_HEIGHT }),
    [listItems]
  );
  layoutRef.current = listLayout;
  const virtualized = listItems.length > TRACE_VIRTUAL_THRESHOLD;
  const listWindow = virtualized ? getTraceVirtualWindow(listLayout, listScrollTop, listViewportHeight, 256) : { start: 0, end: listItems.length, topPadding: 0, bottomPadding: 0 };
  useLayoutEffect6(() => {
    const list2 = listRef.current;
    if (!list2) return;
    const pending = pendingListPosition.current;
    pendingListPosition.current = null;
    if (pending) {
      list2.scrollTop = pending.followTail ? Math.max(0, listLayout.totalHeight - (list2.clientHeight || listViewportHeightRef.current)) : restoreTraceVirtualAnchor(
        listLayout,
        pending.anchor,
        list2.scrollTop,
        list2.clientHeight || listViewportHeightRef.current
      );
    }
    setListScrollTop(list2.scrollTop);
  }, [listLayout]);
  useEffect(() => {
    const list2 = listRef.current;
    if (!list2) return;
    const measure = () => setListViewportHeight(list2.clientHeight || 480);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(list2);
    return () => observer.disconnect();
  }, []);
  const omitted = useMemo(() => truncations(snapshot.turns), [snapshot.turns, locale]);
  const meta = snapshot.meta;
  const selectRow = (id) => {
    const bar = timelineViewport ? bars.find((item) => item.targetId === id) : void 0;
    const revealBar = bar && (bar.domainStart > viewportEnd || bar.domainEnd < viewportStart);
    flushSync4(() => {
      if (!visibleRows.some((row) => row.id === id)) {
        setQuery("");
        setTimelineRange(null);
      }
      const turn = rows.find((row) => row.id === id)?.turn;
      if (turn !== void 0 && collapsedTurns.has(turn)) {
        setCollapsedTurns((current2) => new Set([...current2].filter((value) => value !== turn)));
      }
      const ancestors = traceToolAncestors(toolHierarchy, id);
      if (ancestors.some((ancestor) => collapsedTools.has(ancestor)))
        setCollapsedTools((current2) => new Set([...current2].filter((value) => !ancestors.includes(value))));
      setSelected(id);
      if (revealBar) {
        const start = Math.max(
          timelineModel.start,
          Math.min(timelineModel.end - viewportWidth, bar.domainStart - viewportWidth / 2)
        );
        setTimelineViewport({ start, end: start + viewportWidth });
      }
      setLightbox(null);
      setPane("overview");
    });
    const list2 = listRef.current;
    const layout = layoutRef.current;
    if (list2 && layout && layout.entries.length > TRACE_VIRTUAL_THRESHOLD) {
      const position = getTraceVirtualScrollTopForKey(
        layout,
        `row:${id}`,
        list2.scrollTop,
        list2.clientHeight || listViewportHeight
      );
      if (position !== void 0) {
        list2.scrollTop = position;
        flushSync4(() => setListScrollTop(position));
      }
    }
    const target = [...root.querySelectorAll(".trace-row")].find(
      (row) => row.dataset.traceRowId === id
    );
    target?.scrollIntoView?.({ block: "nearest" });
  };
  const closeInspector = () => flushSync4(() => {
    setSelected(void 0);
    setLightbox(null);
  });
  const selectPane = (next) => flushSync4(() => setPane(next));
  const toggleTurn = (turn) => flushSync4(
    () => setCollapsedTurns((current2) => {
      const next = new Set(current2);
      if (next.has(turn)) next.delete(turn);
      else next.add(turn);
      return next;
    })
  );
  const toggleTool = (id) => flushSync4(
    () => setCollapsedTools((current2) => {
      const next = new Set(current2);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    })
  );
  const toggleAllTurns = () => flushSync4(() => setCollapsedTurns(allTurnsCollapsed ? /* @__PURE__ */ new Set() : new Set(numberedTurns)));
  const updateQuery = (event) => flushSync4(() => setQuery(event.currentTarget.value.trim().toLowerCase()));
  const changeTimelineMode = (event) => {
    setTimelineMode(event.currentTarget.value);
    setTimelineRange(null);
    setTimelineDraft(null);
    setTimelineViewport(null);
  };
  const timelinePoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = clampPercent((event.clientX - rect.left) / Math.max(1, rect.width) * 100);
    return viewportStart + fraction / 100 * viewportWidth;
  };
  const timelinePointerDown = (event) => {
    if (event.button !== 0 && event.button !== 2) return;
    if (event.button === 0 && event.target.closest("button")) return;
    const anchor = timelinePoint(event);
    timelineGesture.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      anchor,
      pan: event.button === 2,
      viewportStart
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (event.button === 0) setTimelineDraft({ start: anchor, end: anchor });
  };
  const timelinePointerMove = (event) => {
    const gesture = timelineGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.pan) {
      const rect = event.currentTarget.getBoundingClientRect();
      const width = viewportWidth;
      const shift = (event.clientX - gesture.clientX) / Math.max(1, rect.width) * width;
      const start = Math.max(
        timelineModel.start,
        Math.min(timelineModel.end - width, gesture.viewportStart - shift)
      );
      setTimelineViewport({ start, end: start + width });
      return;
    }
    setTimelineDraft(orderedRange(gesture.anchor, timelinePoint(event)));
  };
  const timelinePointerUp = (event) => {
    const gesture = timelineGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    timelineGesture.current = null;
    setTimelineDraft(null);
    const distance = Math.abs(event.clientX - gesture.clientX);
    if (gesture.pan) {
      if (distance < 3) setTimelineRange(null);
      return;
    }
    const point = timelinePoint(event);
    const selectedRange = orderedRange(gesture.anchor, point);
    const minimum = Math.min(
      viewportWidth,
      Math.max(fullTimelineWidth * 5e-3, fullTimelineWidth / Math.max(1, bars.length))
    );
    if (selectedRange.end - selectedRange.start < minimum) {
      const center = distance < 3 ? selectedRange.start : (selectedRange.start + selectedRange.end) / 2;
      const start = Math.max(timelineModel.start, Math.min(timelineModel.end - minimum, center - minimum / 2));
      selectedRange.start = start;
      selectedRange.end = start + minimum;
    }
    if (distance < 3 && bars.length) {
      const nearest = bars.reduce((best, bar) => {
        const gap = (candidate) => point < candidate.domainStart ? candidate.domainStart - point : point > candidate.domainEnd ? point - candidate.domainEnd : 0;
        return gap(bar) < gap(best) ? bar : best;
      });
      if (nearest.targetId) {
        selectRow(nearest.targetId);
        if (!barIntersectsRange(nearest, selectedRange)) {
          const center = (nearest.domainStart + nearest.domainEnd) / 2;
          const start = Math.max(
            timelineModel.start,
            Math.min(timelineModel.end - minimum, center - minimum / 2)
          );
          selectedRange.start = start;
          selectedRange.end = start + minimum;
        }
      }
    }
    setTimelineRange(selectedRange);
  };
  const timelinePointerCancel = () => {
    timelineGesture.current = null;
    setTimelineDraft(null);
  };
  useEffect(() => {
    const element3 = timelineRef.current;
    if (!element3) return;
    const onWheel = (event) => {
      const track = timelineTrackRef.current;
      if (!track || bars.length === 0) return;
      event.preventDefault();
      const rect = track.getBoundingClientRect();
      const fraction = clampPercent((event.clientX - rect.left) / Math.max(1, rect.width) * 100) / 100;
      setTimelineViewport((current2) => {
        const width = current2 ? current2.end - current2.start : fullTimelineWidth;
        const oldStart = current2?.start ?? timelineModel.start;
        const minimum = Math.min(fullTimelineWidth, fullTimelineWidth / Math.max(2, bars.length));
        const nextWidth = Math.max(
          minimum,
          Math.min(fullTimelineWidth, width * Math.exp(event.deltaY * 15e-4))
        );
        if (nextWidth >= fullTimelineWidth * 0.999) return null;
        const anchor = oldStart + fraction * width;
        const start = Math.max(
          timelineModel.start,
          Math.min(timelineModel.end - nextWidth, anchor - fraction * nextWidth)
        );
        return { start, end: start + nextWidth };
      });
    };
    element3.addEventListener("wheel", onWheel, { passive: false });
    return () => element3.removeEventListener("wheel", onWheel);
  }, [bars.length, fullTimelineWidth, timelineModel.start, timelineModel.end]);
  const activeTimelineRange = timelineDraft ?? timelineRange;
  const projectedPosition = (value) => (value - viewportStart) / viewportWidth * 100;
  const paneField = (label2, value) => createElement9(
    "div",
    { className: "trace-field", key: label2 },
    createElement9("div", { className: "trace-field-label" }, label2),
    createElement9("div", { className: "trace-field-value" }, value)
  );
  const inspectorPaneIds = selectedToolKey ? [...INSPECTOR_PANE_IDS, "input", "output", "timing"] : [...INSPECTOR_PANE_IDS];
  const detailValue = activeToolDetail?.status === "ready" ? activeToolDetail.value : void 0;
  const detailNotice = () => activeToolDetail?.status === "error" ? createElement9(
    "p",
    { className: "trace-detail-status", role: "alert" },
    traceText("trace.detail.readFailed", { message: activeToolDetail.message })
  ) : createElement9(
    "p",
    { className: "trace-detail-status", role: "status" },
    activeToolDetail?.status === "loading" ? traceText("trace.detail.loading") : traceText("trace.detail.empty")
  );
  const copyDetail = (label2, value) => createElement9(
    "button",
    {
      type: "button",
      className: "trace-detail-copy",
      disabled: !navigator.clipboard?.writeText,
      onClick: () => void navigator.clipboard.writeText(value)
    },
    label2
  );
  const toolResultBlocks = (result2) => result2.content.map((block, index) => {
    if (block.type === "text")
      return createElement9(
        "pre",
        { className: "trace-pre trace-detail-content", key: `text:${index}` },
        block.text
      );
    if (block.type === "image") {
      const supported = /^image\/(png|jpeg|webp|gif)$/.test(block.mimeType);
      const src = supported ? `data:${block.mimeType};base64,${block.data}` : void 0;
      return createElement9(
        "div",
        { className: "trace-detail-media", key: `image:${index}` },
        src ? createElement9(
          "button",
          {
            type: "button",
            className: "trace-image-thumb",
            "aria-label": traceText("trace.image.viewResult", { n: index + 1 }),
            onClick: () => setLightbox({ src, alt: traceText("trace.image.resultAlt", { n: index + 1 }) })
          },
          createElement9("img", { src, alt: traceText("trace.image.resultAlt", { n: index + 1 }) })
        ) : traceText("trace.image.mime", { mime: block.mimeType })
      );
    }
    return createElement9(
      "p",
      { className: "trace-detail-resource", key: `resource:${index}` },
      traceText("trace.resource.link", {
        name: `${block.name ?? (block.type === "resource_link" ? block.uri : "")}${block.mimeType ? ` · ${block.mimeType}` : ""}`
      })
    );
  });
  const inspector = selectedRow ? createElement9(
    "aside",
    { className: "trace-inspector" },
    createElement9(
      "header",
      { className: "trace-inspector-head" },
      createElement9("span", { className: `trace-badge kind-${selectedRow.kind}` }, selectedRow.badge),
      createElement9(
        "h2",
        { className: "trace-inspector-title" },
        [
          selectedRow.turn ? traceText("trace.inspector.turn", { turn: selectedRow.turn }) : void 0,
          selectedRow.step,
          traceText("trace.inspector.message")
        ].filter(Boolean).join(" · ")
      ),
      createElement9(
        "button",
        {
          className: "trace-inspector-close",
          type: "button",
          "aria-label": traceText("trace.closeDetail"),
          onClick: closeInspector
        },
        "×"
      )
    ),
    createElement9(
      "div",
      { className: "trace-inspector-tabs" },
      ...inspectorPaneIds.map(
        (id) => createElement9(
          "button",
          {
            key: id,
            className: "trace-tab",
            type: "button",
            "data-pane": id,
            "aria-selected": pane === id ? "true" : "false",
            onClick: () => selectPane(id)
          },
          traceText(PANE_KEY[id])
        )
      )
    ),
    createElement9(
      "div",
      { className: "trace-inspector-pane", hidden: pane !== "overview" },
      paneField(traceText("trace.field.source"), selectedRow.source),
      paneField(traceText("trace.field.status"), selectedRow.status),
      ...selectedRow.errorCode ? [paneField(traceText("trace.field.errorCode"), selectedRow.errorCode)] : [],
      ...selectedRow.attachments?.length ? [
        paneField(
          traceText("trace.field.attachments"),
          selectedRow.attachments.join(traceText("trace.join.list"))
        )
      ] : [],
      ...selectedUserNode?.kind === "user" ? selectedUserNode.content.flatMap((block, index) => {
        if (block.type !== "image" || !/^image\/(png|jpeg|webp|gif)$/.test(block.mimeType)) return [];
        const src = `data:${block.mimeType};base64,${block.data}`;
        return [
          createElement9(
            "button",
            {
              key: `user-image:${index}`,
              className: "trace-image-thumb",
              type: "button",
              "aria-label": traceText("trace.image.viewInput", { n: index + 1 }),
              onClick: () => setLightbox({ src, alt: traceText("trace.image.inputAlt", { n: index + 1 }) })
            },
            createElement9("img", { src, alt: traceText("trace.image.inputAlt", { n: index + 1 }) })
          )
        ];
      }) : [],
      ...selectedRow.step ? [paneField(traceText("trace.field.step"), selectedRow.step)] : [],
      ...selectedRow.durationMs !== void 0 || selectedRow.statusCode === "running" ? [paneField(traceText("trace.field.duration"), durationLabel(selectedRow.durationMs))] : [],
      ...selectedRow.ttftMs === void 0 ? [] : [paneField(traceText("trace.field.ttft"), durationLabel(selectedRow.ttftMs))],
      ...selectedRow.model === void 0 ? [] : [paneField(traceText("trace.field.model"), selectedRow.model)],
      ...selectedRow.usage === void 0 ? [] : [
        paneField(
          traceText("trace.field.turnUsage"),
          tokenLabel(selectedRow.usage.totals, selectedRow.usage.reasoningComplete)
        )
      ],
      ...selectedRow.callUsage?.tokens ? [
        paneField(
          traceText("trace.field.callUsage"),
          tokenLabel(
            selectedRow.callUsage.tokens,
            selectedRow.callUsage.tokens.reasoning !== void 0
          )
        )
      ] : [],
      ...selectedRequest ? [
        paneField(traceText("trace.field.requestOrder"), metricLabel(selectedRequest.requestNumber)),
        paneField(traceText("trace.field.ledgerOrder"), metricLabel(selectedRequest.ledgerNumber)),
        paneField(
          traceText("trace.field.cumulativeUsage"),
          metricTokensLabel(selectedRequest.cumulativeTokens)
        ),
        paneField(
          traceText("trace.field.callDuration"),
          selectedRequest.durationMs.state === "known" ? durationLabel(selectedRequest.durationMs.value) : metricLabel(selectedRequest.durationMs)
        ),
        paneField(
          traceText("trace.field.cumulativeDuration"),
          selectedRequest.cumulativeCallDurationMs.state === "known" ? durationLabel(selectedRequest.cumulativeCallDurationMs.value) : metricLabel(selectedRequest.cumulativeCallDurationMs)
        )
      ] : []
    ),
    createElement9(
      "div",
      { className: "trace-inspector-pane", hidden: pane !== "preview" },
      createElement9(
        "pre",
        { className: "trace-pre" },
        selectedRow.preview || traceText("trace.emptyPreview")
      )
    ),
    createElement9(
      "div",
      { className: "trace-inspector-pane", hidden: pane !== "raw" },
      ...selectedRow.rawNote ? [createElement9("p", { className: "trace-raw-note" }, selectedRow.rawNote)] : [],
      createElement9("pre", { className: "trace-pre" }, selectedRow.raw || traceText("trace.emptyRaw"))
    ),
    createElement9(
      "div",
      { className: "trace-inspector-pane", hidden: pane !== "source" },
      paneField(traceText("trace.field.source"), selectedRow.source)
    ),
    ...selectedToolKey ? [
      createElement9(
        "div",
        { className: "trace-inspector-pane", hidden: pane !== "input" },
        ...pane !== "input" ? [] : detailValue ? [
          copyDetail(
            traceText("trace.detail.copyInput"),
            JSON.stringify(detailValue.call.args)
          ),
          createElement9(
            "pre",
            { className: "trace-pre trace-detail-content" },
            JSON.stringify(detailValue.call.args, null, 2)
          )
        ] : [detailNotice()]
      ),
      createElement9(
        "div",
        { className: "trace-inspector-pane", hidden: pane !== "output" },
        ...pane !== "output" ? [] : !detailValue ? [detailNotice()] : !detailValue.result ? [
          createElement9(
            "p",
            { className: "trace-detail-status" },
            traceText("trace.detail.resultMissing")
          )
        ] : [
          paneField(
            traceText("trace.field.result"),
            detailValue.result.isError ? traceText("trace.result.failed") : traceText("trace.result.completed")
          ),
          ...detailValue.result.code ? [paneField(traceText("trace.field.errorCode"), detailValue.result.code)] : [],
          copyDetail(
            traceText("trace.detail.copyResult"),
            JSON.stringify(detailValue.result)
          ),
          ...toolResultBlocks(detailValue.result),
          ...detailValue.result.structured === void 0 ? [] : [
            createElement9(
              "h3",
              { className: "trace-detail-heading" },
              traceText("trace.detail.structured")
            ),
            createElement9(
              "pre",
              { className: "trace-pre trace-detail-content" },
              JSON.stringify(detailValue.result.structured, null, 2)
            )
          ]
        ]
      ),
      createElement9(
        "div",
        { className: "trace-inspector-pane", hidden: pane !== "timing" },
        ...selectedRow.startedAt ? [paneField(traceText("trace.field.startedAt"), selectedRow.startedAt)] : [],
        paneField(
          traceText("trace.field.duration"),
          selectedRow.durationMs === void 0 && selectedRow.statusCode !== "running" ? traceText("trace.duration.unknown") : durationLabel(selectedRow.durationMs)
        ),
        ...selectedRow.ttftMs === void 0 ? [] : [paneField(traceText("trace.field.ttftDuration"), durationLabel(selectedRow.ttftMs))],
        ...selectedRow.ttftMs === void 0 || selectedRow.durationMs === void 0 ? [] : [
          paneField(
            traceText("trace.field.generationAfter"),
            durationLabel(Math.max(0, selectedRow.durationMs - selectedRow.ttftMs))
          )
        ]
      )
    ] : []
  ) : createElement9("aside", { className: "trace-inspector", hidden: true });
  return createElement9(
    "div",
    {
      id: "trace-content",
      style: { display: "contents" },
      "data-agnes-region-owner": "builtin",
      "data-agnes-region-unit": "trace"
    },
    createElement9(
      "div",
      { className: "trace-toolbar", hidden: rows.length === 0 },
      createElement9(
        "div",
        { className: "trace-stats" },
        ...traceStats(snapshot.turns).map(
          ([label2, value]) => createElement9("span", { className: "trace-stat", key: label2 }, `${label2} ${value}`)
        ),
        ...meta?.hasEarlier ? [
          createElement9(
            "span",
            { className: "trace-stat trace-partial", key: "partial" },
            traceText("trace.partial")
          )
        ] : []
      ),
      createElement9(
        "button",
        {
          className: "trace-fold-all",
          type: "button",
          disabled: focusActive || numberedTurns.length === 0,
          "aria-label": allTurnsCollapsed ? traceText("trace.expandTurnsLabel") : traceText("trace.collapseTurnsLabel"),
          onClick: toggleAllTurns
        },
        allTurnsCollapsed ? traceText("trace.expandTurns") : traceText("trace.collapseTurns")
      ),
      createElement9("input", {
        className: "trace-search",
        type: "search",
        placeholder: traceText("trace.search"),
        "aria-label": traceText("trace.searchLabel"),
        value: query,
        onInput: updateQuery
      })
    ),
    createElement9(
      "div",
      {
        className: "trace-gantt",
        role: "group",
        "aria-label": traceText("trace.gantt.label"),
        hidden: rows.length === 0,
        ref: timelineRef
      },
      createElement9(
        "div",
        { className: "trace-gantt-controls" },
        createElement9("label", { htmlFor: "trace-timeline-mode" }, traceText("trace.timeline.label")),
        createElement9(
          "select",
          {
            id: "trace-timeline-mode",
            value: timelineMode,
            onChange: changeTimelineMode,
            "aria-label": traceText("trace.timeline.mode")
          },
          createElement9("option", { value: "sequence" }, traceText("trace.timeline.sequence")),
          createElement9("option", { value: "duration" }, traceText("trace.timeline.duration")),
          createElement9("option", { value: "time" }, traceText("trace.timeline.time")),
          createElement9("option", { value: "actual" }, traceText("trace.timeline.actual"))
        ),
        createElement9(
          "span",
          { className: "trace-gantt-note" },
          timelineMode === "sequence" ? traceText("trace.timeline.noteSequence") : timelineMode === "duration" ? traceText("trace.timeline.noteDuration") : traceText("trace.timeline.noteTime")
        ),
        ...timelineRange ? [
          createElement9(
            "button",
            {
              className: "trace-gantt-clear",
              type: "button",
              onClick: () => setTimelineRange(null),
              "aria-label": traceText("trace.timeline.clearLabel")
            },
            traceText("trace.timeline.clear")
          )
        ] : []
      ),
      ...["input", "model", "tool"].map(
        (lane) => createElement9(
          "div",
          { className: "trace-gantt-row", key: lane },
          createElement9("span", { className: "trace-gantt-label" }, laneName(lane)),
          createElement9(
            "div",
            {
              className: "trace-gantt-track",
              ref: lane === "input" ? timelineTrackRef : void 0,
              tabIndex: lane === "input" ? 0 : -1,
              role: "presentation",
              onPointerDown: timelinePointerDown,
              onPointerMove: timelinePointerMove,
              onPointerUp: timelinePointerUp,
              onPointerCancel: timelinePointerCancel,
              onContextMenu: (event) => event.preventDefault(),
              onDoubleClick: () => setTimelineRange(null),
              onKeyDown: (event) => {
                if (event.key === "Escape" && timelineRange) {
                  event.preventDefault();
                  setTimelineRange(null);
                }
              },
              "aria-label": traceText("trace.lane.aria", { lane: laneName(lane) })
            },
            ...activeTimelineRange ? [
              createElement9("span", {
                key: "selection",
                className: "trace-gantt-selection",
                "aria-hidden": true,
                style: {
                  left: `${projectedPosition(activeTimelineRange.start)}%`,
                  width: `${(activeTimelineRange.end - activeTimelineRange.start) / viewportWidth * 100}%`
                }
              })
            ] : [],
            ...timelineUnits.filter((unit3) => unit3.lane === lane).map((unit3) => {
              const bar = unit3.members[0];
              if (!bar) return null;
              const cluster = unit3.kind === "cluster";
              const marker = cluster ? unit3.domainEnd <= unit3.domainStart : bar.marker;
              const targets = unit3.members.filter((member) => member.targetId);
              const title = cluster ? traceText("trace.cluster", { n: unit3.count }) : bar.title;
              return createElement9(targets.length ? "button" : "span", {
                className: `trace-gantt-bar lane-${lane}${!cluster && bar.tone ? ` tone-${bar.tone}` : ""}${!cluster && bar.truncated ? " truncated" : ""}${marker ? " marker" : ""}${cluster ? " cluster" : ""}`,
                key: unit3.key,
                ...targets.length ? {
                  type: "button",
                  "aria-label": title,
                  "aria-pressed": unit3.members.some((member) => member.targetId === selected) ? "true" : "false",
                  ...cluster ? { "data-count": unit3.count } : { "data-target-id": bar.targetId },
                  "data-in-range": timelineRange ? unit3.members.some((member) => barIntersectsRange(member, timelineRange)) : void 0,
                  onClick: (event) => {
                    const track = event.currentTarget.parentElement;
                    const rect = track?.getBoundingClientRect();
                    const fraction = rect ? clampPercent((event.clientX - rect.left) / Math.max(1, rect.width) * 100) / 100 : 0.5;
                    const point = viewportStart + fraction * viewportWidth;
                    const chosen = cluster ? pickTraceTimelineDensityMember({ ...unit3, members: targets }, point) : bar;
                    if (chosen.targetId) selectRow(chosen.targetId);
                  }
                } : { "aria-hidden": true },
                style: {
                  left: marker ? `min(${projectedPosition(unit3.domainStart)}%, calc(100% - 6px))` : `${projectedPosition(unit3.domainStart)}%`,
                  width: cluster ? `${(unit3.domainEnd - unit3.domainStart) / viewportWidth * 100}%` : `${bar.width * fullTimelineWidth / viewportWidth}%`
                },
                title
              });
            })
          )
        )
      )
    ),
    createElement9(
      "div",
      { className: "trace-body", hidden: rows.length === 0 },
      createElement9(
        "div",
        {
          className: "trace-list",
          role: "list",
          ref: listRef,
          onScroll: (event) => {
            if (!virtualized) return;
            const next = getTraceVirtualWindow(
              listLayout,
              event.currentTarget.scrollTop,
              listViewportHeight,
              256
            );
            if (next.start !== listWindow.start || next.end !== listWindow.end)
              setListScrollTop(event.currentTarget.scrollTop);
          }
        },
        ...virtualized && listWindow.topPadding ? [
          createElement9("div", {
            key: "top-spacer",
            className: "trace-list-spacer",
            "aria-hidden": true,
            style: { height: `${listWindow.topPadding}px` }
          })
        ] : [],
        ...listItems.slice(listWindow.start, listWindow.end).map((item) => {
          if (item.kind === "header" && "loadEarlier" in item)
            return createElement9(
              "button",
              {
                key: item.key,
                className: "trace-load-earlier",
                type: "button",
                onClick: () => {
                  const list2 = listRef.current;
                  earlierPosition.current = {
                    sessionId: snapshot.meta?.sessionId,
                    firstNodeId: snapshot.nodes[0]?.id,
                    anchor: list2 ? captureTraceVirtualAnchor(listLayout, list2.scrollTop) : void 0
                  };
                  item.loadEarlier();
                }
              },
              traceText("trace.loadEarlier")
            );
          if (item.kind === "header")
            return createElement9(
              "div",
              { className: "trace-turn-header", role: "listitem", key: item.key },
              createElement9(
                "button",
                {
                  className: "trace-turn-toggle",
                  type: "button",
                  disabled: focusActive,
                  "aria-expanded": !item.collapsed,
                  onClick: () => toggleTurn(item.turn)
                },
                `${item.collapsed ? "▸" : "▾"} ${traceText("trace.turnHeader", {
                  turn: item.turn,
                  count: item.count,
                  folded: item.collapsed ? traceText("trace.turnFolded") : ""
                })}`
              )
            );
          const row = item.row;
          const request = row.callUsage ? requestMetrics.get(row.callUsage.seq) : void 0;
          const requestPrefix = request?.requestNumber.state === "known" ? traceText("trace.requestPrefix", { n: request.requestNumber.value }) : "";
          const children = toolHierarchy.childrenById.get(row.id) ?? [];
          const toolDepth = row.kind === "tool" ? Math.min(8, toolHierarchy.depthById.get(row.id) ?? 0) : 0;
          const nested = row.kind === "tool" && (children.length > 0 || toolDepth > 0);
          const rowButton = createElement9(
            "button",
            {
              className: "trace-row",
              type: "button",
              role: nested ? void 0 : "listitem",
              "data-trace-row-id": row.id,
              "aria-current": row.id === selected ? "true" : void 0,
              onClick: () => selectRow(row.id),
              ...nested ? { style: { paddingLeft: `${24 + toolDepth * 16}px` } } : {}
            },
            createElement9("span", { className: "trace-step-mark" }, item.showStep ? row.step : void 0),
            createElement9("span", { className: `trace-badge kind-${row.kind}` }, row.badge),
            createElement9(
              "span",
              { className: "trace-row-preview" },
              `${requestPrefix}${clip(row.preview, 160) || traceText("trace.emptyPreview")}${row.statusCode === "completed" ? "" : ` · ${row.status}`}${row.errorCode ? ` · ${row.errorCode}` : ""}`
            )
          );
          if (!nested) return createElement9("div", { key: item.key, className: "trace-row-entry" }, rowButton);
          return createElement9(
            "div",
            { key: item.key, className: "trace-tool-entry", role: "listitem" },
            ...children.length ? [
              createElement9(
                "button",
                {
                  type: "button",
                  className: "trace-tool-toggle",
                  style: { left: `${4 + toolDepth * 16}px` },
                  "aria-label": collapsedTools.has(row.id) ? traceText("trace.tool.expand", { source: row.source }) : traceText("trace.tool.collapse", { source: row.source }),
                  "aria-expanded": focusActive || !collapsedTools.has(row.id),
                  disabled: focusActive,
                  onClick: () => toggleTool(row.id)
                },
                collapsedTools.has(row.id) && !focusActive ? "▸" : "▾"
              )
            ] : [],
            rowButton
          );
        }),
        ...virtualized && listWindow.bottomPadding ? [
          createElement9("div", {
            key: "bottom-spacer",
            className: "trace-list-spacer",
            "aria-hidden": true,
            style: { height: `${listWindow.bottomPadding}px` }
          })
        ] : [],
        ...rows.length > 0 && visibleRows.length === 0 ? [
          createElement9(
            "p",
            { key: "no-results", className: "trace-no-results", role: "status" },
            traceText("trace.noResults")
          )
        ] : []
      ),
      ...omitted.map(
        (note) => createElement9(
          "p",
          { key: `omitted:${note.key}`, className: "trace-truncated", role: "note" },
          traceText("trace.omittedNote", { turn: note.turn, label: note.label })
        )
      ),
      inspector
    ),
    ...lightbox ? [
      createElement9(
        "div",
        {
          className: "trace-lightbox",
          role: "dialog",
          "aria-modal": true,
          "aria-label": lightbox.alt,
          onKeyDown: (event) => {
            if (event.key === "Escape") setLightbox(null);
            if (event.key === "Tab") {
              event.preventDefault();
              root.querySelector(".trace-lightbox-close")?.focus();
            }
          }
        },
        createElement9(
          "button",
          {
            type: "button",
            className: "trace-lightbox-close",
            "aria-label": traceText("trace.lightbox.close"),
            onClick: () => setLightbox(null)
          },
          "×"
        ),
        createElement9("img", { src: lightbox.src, alt: lightbox.alt })
      )
    ] : [],
    createElement9("p", { className: "trace-empty", hidden: rows.length > 0 }, traceText("trace.empty"))
  );
});

// ../web-units/src/transcript.ts
import {
  createElement as createElement10,
  forwardRef as forwardRef8,
  useImperativeHandle as useImperativeHandle8,
  useLayoutEffect as useLayoutEffect7,
  useRef as useRef8
} from "react";
var Transcript = forwardRef8(function Transcript2({ newContentButton, onFork, dependencies }, ref) {
  const content = useRef8(null);
  const renderer2 = useRef8(void 0);
  useImperativeHandle8(
    ref,
    () => ({
      render(nodes, turns, meta) {
        renderer2.current?.render(nodes, turns, meta);
      },
      reset() {
        renderer2.current?.reset();
      },
      pinToBottom() {
        renderer2.current?.pinToBottom();
      }
    }),
    []
  );
  useLayoutEffect7(() => {
    const element3 = content.current;
    const scrollContainer = element3?.closest("#transcript") ?? element3?.parentElement;
    if (!element3 || !scrollContainer || !newContentButton) return;
    if (!dependencies) return;
    const nextRenderer = dependencies.createRenderer({
      transcript: element3,
      scrollContainer,
      newContentButton,
      ...onFork ? { onFork } : {}
    });
    renderer2.current = nextRenderer;
    const stopObserving = dependencies.observeCards(element3);
    return () => {
      stopObserving();
      nextRenderer.reset();
      nextRenderer.dispose?.();
      if (renderer2.current === nextRenderer) renderer2.current = void 0;
    };
  }, [dependencies, newContentButton, onFork]);
  return createElement10(
    "div",
    {
      style: { display: "contents" },
      "data-agnes-region-owner": "builtin",
      "data-agnes-region-unit": "transcript"
    },
    createElement10("div", { ref: content, id: "transcript-content" })
  );
});

// ../web-units/src/index.ts
var unit2 = (packageId, entry, slots, scope, dependencies = []) => ({
  packageId,
  rowId: webRowId(packageId),
  moduleName: packageId,
  entry,
  contributes: {
    entry,
    styles: [],
    slots,
    services: [],
    projections: []
  },
  scope,
  kind: "single",
  priority: 0,
  dependencies
});
var BUILTIN_WEB_UNITS = Object.freeze([
  unit2("@agnes/web-sidebar", "./sidebar.js", ["ui:sidebar"], "root"),
  unit2("@agnes/web-transcript", "./transcript.js", ["ui:transcript"], "session-maybe"),
  unit2("@agnes/web-conversation", "./conversation.js", ["ui:conversation"], "session-maybe"),
  unit2("@agnes/web-topbar", "./topbar.js", ["ui:topbar"], "root"),
  unit2("@agnes/web-approval", "./approval.js", ["ui:approval"], "session-maybe"),
  unit2("@agnes/web-composer", "./composer.js", ["ui:composer"], "session-maybe"),
  unit2("@agnes/web-trace", "./trace.js", ["ui:trace"], "session-maybe"),
  unit2("@agnes/web-rightbar", "./rightbar.js", ["rightbar"], "root"),
  unit2("@agnes/web-empty-state", "./empty-state.js", ["ui:empty-state"], "root"),
  unit2("@agnes/web-settings-model", "./settings/model.js", ["ui:settings-pane.model"], "root"),
  unit2("@agnes/web-settings-plugins", "./settings/plugins.js", ["ui:settings-pane.plugins"], "root"),
  unit2("@agnes/web-settings-resources", "./settings/resources.js", ["ui:settings-pane.resources"], "root"),
  unit2(
    "@agnes/web-settings-computer-use",
    "./settings/computer-use.js",
    ["ui:settings-pane.computer-use"],
    "root"
  ),
  unit2("@agnes/web-settings-archived", "./settings/archived.js", ["ui:settings-pane.archived"], "root"),
  unit2("@agnes/web-settings-appearance", "./settings/appearance.js", ["ui:settings-pane.appearance"], "root"),
  unit2(
    "@agnes/web-conversation-message-actions",
    "./conversation/message-actions.js",
    ["conversation.message.actions"],
    "session-maybe",
    ["@agnes/web-conversation"]
  ),
  unit2(
    "@agnes/web-conversation-attachments",
    "./conversation/attachments.js",
    ["conversation.attachments"],
    "session-maybe",
    ["@agnes/web-conversation"]
  ),
  unit2(
    "@agnes/web-conversation-tool-card",
    "./conversation/tool-card.js",
    ["conversation.tool-card"],
    "session-maybe",
    ["@agnes/web-conversation"]
  ),
  unit2(
    "@agnes/web-conversation-feedback",
    "./conversation/feedback.js",
    ["conversation.feedback"],
    "session-maybe",
    ["@agnes/web-conversation"]
  )
]);
var byPackageId = new Map(BUILTIN_WEB_UNITS.map((definition) => [definition.packageId, definition]));
function getBuiltinWebUnit(packageId) {
  return byPackageId.get(packageId);
}
var BuiltinWebUnitRegistry = class {
  mounted = /* @__PURE__ */ new Map();
  mount(packageId, dispose) {
    const definition = getBuiltinWebUnit(packageId);
    if (!definition) throw new Error(`unknown built-in web unit: ${packageId}`);
    if (this.mounted.has(packageId)) throw new Error(`web unit already mounted: ${packageId}`);
    for (const dependency of definition.dependencies) {
      if (!this.mounted.has(dependency)) {
        throw new Error(`web unit ${packageId} requires mounted dependency ${dependency}`);
      }
    }
    let live2 = true;
    const mounted = {
      definition,
      dispose: () => {
        if (!live2) return;
        live2 = false;
        dispose();
      }
    };
    this.mounted.set(packageId, mounted);
    return () => this.unmount(packageId);
  }
  unmount(packageId) {
    for (const [candidateId, candidate] of [...this.mounted]) {
      if (candidate.definition.dependencies.includes(packageId)) this.unmount(candidateId);
    }
    const mounted = this.mounted.get(packageId);
    if (!mounted) return;
    this.mounted.delete(packageId);
    mounted.dispose();
  }
  get(packageId) {
    return this.mounted.get(packageId);
  }
  snapshot() {
    return [...this.mounted.values()].map(({ definition }) => ({
      rowId: definition.rowId,
      moduleName: definition.moduleName,
      enabled: true,
      phase: "ready",
      entryUrl: definition.entry,
      styleUrls: [...definition.contributes.styles],
      slots: [...definition.contributes.slots],
      extIds: []
    }));
  }
  dispose() {
    for (const mounted of [...this.mounted.values()].reverse()) mounted.dispose();
  }
};
function assertBuiltinWebUnitContract(definition) {
  if (definition.rowId !== webRowId(definition.packageId)) {
    throw new Error(`web unit ${definition.packageId} has an unstable row id`);
  }
  if (definition.contributes.entry !== definition.entry) {
    throw new Error(`web unit ${definition.packageId} has mismatched entry metadata`);
  }
  if (definition.contributes.slots.length === 0) {
    throw new Error(`web unit ${definition.packageId} must declare at least one slot`);
  }
  const dependencies = new Set(definition.dependencies);
  if (dependencies.has(definition.packageId)) {
    throw new Error(`web unit ${definition.packageId} cannot depend on itself`);
  }
}
for (const definition of BUILTIN_WEB_UNITS) assertBuiltinWebUnitContract(definition);

// src/app.ts
import { createElement as createElement25 } from "react";
import { flushSync as flushSync10 } from "react-dom";

// src/admin-pane-coordinator.ts
function createPendingCoordinator() {
  const pending = /* @__PURE__ */ new Map();
  return {
    run(key, operation) {
      const existing = pending.get(key);
      if (existing) return existing;
      let current2;
      current2 = Promise.resolve().then(operation).finally(() => {
        if (pending.get(key) === current2) pending.delete(key);
      });
      pending.set(key, current2);
      return current2;
    },
    has: (key) => pending.has(key)
  };
}

// src/appearance.ts
import { createElement as createElement11 } from "react";

// src/locale-bridge.ts
var translator = (key) => key;
function setLocaleTranslator(next) {
  translator = next;
}
function tr(key, vars) {
  return translator(key, vars);
}

// src/locale-preference.ts
var UI_LOCALES = ["en", "zh-CN"];
var LOCALE_STORAGE_KEY = "agnes-locale";
function isUiLocale(value) {
  return typeof value === "string" && UI_LOCALES.includes(value);
}
function readLocalePreference(storage) {
  try {
    const raw = storage.getItem(LOCALE_STORAGE_KEY);
    return isUiLocale(raw) ? raw : "en";
  } catch {
    return "en";
  }
}
function writeLocalePreference(storage, value) {
  try {
    storage.setItem(LOCALE_STORAGE_KEY, value);
  } catch {
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
function syncLocaleRadios(root, locale) {
  for (const input of root.querySelectorAll('input[name="agnes-locale"]')) {
    const checked = input.value === locale;
    if (input.checked !== checked) input.checked = checked;
  }
}

// src/skin.ts
var SKIN_STORAGE_KEY = "agnes-skin";
var SKIN_CACHE_VERSION = 1;
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
function readSkinCache(storage) {
  try {
    const raw = storage.getItem(SKIN_STORAGE_KEY);
    if (raw === null) return null;
    const value = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const record2 = value;
    if (record2.version !== SKIN_CACHE_VERSION) return null;
    if (typeof record2.id !== "string" || !SKIN_ID.test(record2.id)) return null;
    if (typeof record2.revision !== "string" || typeof record2.css !== "string") return null;
    const tokens = readTokens(record2.tokens);
    if (tokens === null) return null;
    return { version: SKIN_CACHE_VERSION, id: record2.id, revision: record2.revision, css: record2.css, tokens };
  } catch {
    return null;
  }
}
function writeSkinCache(storage, cache) {
  try {
    storage.setItem(SKIN_STORAGE_KEY, JSON.stringify(cache));
  } catch {
  }
}
function clearSkinCache(storage) {
  try {
    storage.removeItem(SKIN_STORAGE_KEY);
  } catch {
  }
}
function planSkinReconcile(cached, entries2) {
  if (cached === null) return { kind: "keep" };
  const entry = entries2.find((candidate) => candidate.id === cached.id);
  if (entry === void 0) return { kind: "clear" };
  return cached.revision === entry.revision ? { kind: "keep" } : { kind: "refresh", entry };
}
async function fetchSkinCss(cssUrl, options) {
  const url = new URL(cssUrl, options.origin);
  if (url.origin !== options.origin || !url.pathname.startsWith("/skins/"))
    throw new Error("skin stylesheet reference is out of scope");
  const response = await options.fetcher(url.pathname);
  if (!response.ok) throw new Error("skin stylesheet is unavailable");
  const css = await response.text();
  if (css === "") throw new Error("skin stylesheet is empty");
  return css;
}
async function cacheSkinEntry(storage, entry, options) {
  const css = entry.css ?? await fetchSkinCss(entry.cssUrl, options);
  const cached = {
    version: SKIN_CACHE_VERSION,
    id: entry.id,
    revision: entry.revision,
    css,
    tokens: entry.tokens
  };
  writeSkinCache(storage, cached);
  return cached;
}

// src/theme.ts
var THEME_STORAGE_KEY = "agnes-theme";
var PREFERENCES = ["system", "light", "dark"];
function isThemePreference(value) {
  return typeof value === "string" && PREFERENCES.includes(value);
}
function readThemePreference(storage) {
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}
function writeThemePreference(storage, value) {
  try {
    storage.setItem(THEME_STORAGE_KEY, value);
  } catch {
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
function readFontScale(storage) {
  try {
    const raw = storage.getItem(FONT_SCALE_STORAGE_KEY);
    return isFontScale(raw) ? raw : "normal";
  } catch {
    return "normal";
  }
}
function writeFontScale(storage, value) {
  try {
    storage.setItem(FONT_SCALE_STORAGE_KEY, value);
  } catch {
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

// src/appearance.ts
var THEME_INPUT = 'input[name="agnes-theme"]';
var FONT_SCALE_INPUT = 'input[name="agnes-font-scale"]';
var LOCALE_INPUT = 'input[name="agnes-locale"]';
function bindAppearance(options) {
  const prefersDark = options.prefersDark ?? (() => systemPrefersDark(globalThis));
  const themeInputs = [...options.scope.querySelectorAll(THEME_INPUT)];
  const fontScaleInputs = [...options.scope.querySelectorAll(FONT_SCALE_INPUT)];
  const localeInputs = [...options.scope.querySelectorAll(LOCALE_INPUT)];
  const sync = () => {
    const theme = readThemePreference(options.storage);
    for (const input of themeInputs) input.checked = input.value === theme;
    const scale = readFontScale(options.storage);
    for (const input of fontScaleInputs) input.checked = input.value === scale;
    if (options.locale) {
      syncLocaleRadios(options.scope, options.locale.current());
      applyLocaleText(options.scope, options.locale.text);
    }
  };
  for (const input of themeInputs) {
    input.addEventListener("change", () => {
      if (!input.checked || !isThemePreference(input.value)) return;
      writeThemePreference(options.storage, input.value);
      applyTheme(options.root, resolveTheme(input.value, prefersDark()));
      window.dispatchEvent(new CustomEvent("agnes:theme-changed"));
    });
  }
  for (const input of fontScaleInputs) {
    input.addEventListener("change", () => {
      if (!input.checked || !isFontScale(input.value)) return;
      writeFontScale(options.storage, input.value);
      applyFontScale(options.root, input.value);
    });
  }
  for (const input of localeInputs) {
    input.addEventListener("change", () => {
      if (!input.checked || !isUiLocale(input.value) || !options.locale) return;
      options.locale.select(input.value);
      applyLocaleText(options.scope, options.locale.text);
    });
  }
  sync();
  return { sync };
}
var NO_SKIN = "";
function skinOption(value, name, hint, props) {
  return createElement11(
    "label",
    { className: "appearance-option" },
    createElement11("input", {
      type: "radio",
      name: "agnes-skin",
      value,
      checked: value === props.selected,
      onChange: () => props.onChoose(value)
    }),
    createElement11(
      "span",
      { className: "appearance-option-copy" },
      createElement11("span", { className: "appearance-option-name" }, name),
      hint === "" ? null : createElement11("span", { className: "appearance-option-hint" }, hint)
    )
  );
}
function skinOptions(props) {
  if (props.failed)
    return createElement11(
      "p",
      { className: "appearance-option-hint" },
      tr("settings.appearance.skinListFailed"),
      createElement11("button", { type: "button", onClick: props.onRetry }, tr("settings.appearance.retry"))
    );
  return createElement11(
    "div",
    null,
    skinOption(
      NO_SKIN,
      tr("settings.appearance.followTheme"),
      tr("settings.appearance.followThemeHint"),
      props
    ),
    ...props.skins.map(
      (skin) => skinOption(
        skin.id,
        skin.name,
        tr("settings.appearance.fromPackage", { package: skin.packageName }),
        props
      )
    ),
    createElement11("p", { className: "appearance-option-hint", hidden: props.status === null }, props.status)
  );
}
function bindSkinGroup(options) {
  const container = options.scope.querySelector("#skin-option-items");
  if (container === null) throw new Error("skin options container is missing");
  let selected = readSkinCache(options.storage)?.id ?? NO_SKIN;
  let skins = [];
  let status = null;
  let failed = false;
  const render3 = () => {
    renderRegion(
      container,
      createElement11(skinOptions, {
        skins,
        selected,
        status,
        failed,
        onChoose: choose,
        onRetry: () => void refresh()
      })
    );
  };
  const sync = () => render3();
  const refresh = async () => {
    try {
      skins = await options.list();
      selected = readSkinCache(options.storage)?.id ?? NO_SKIN;
      status = null;
      failed = false;
      render3();
    } catch {
      status = null;
      failed = true;
      render3();
    }
  };
  const choose = (value) => {
    const previous = selected;
    selected = value;
    render3();
    void Promise.resolve(options.select(selected === NO_SKIN ? null : selected)).then(() => {
      status = null;
      render3();
    }).catch(() => {
      selected = previous;
      status = tr("settings.appearance.skinNotApplied");
      render3();
    });
  };
  return { sync, refresh };
}

// src/approval-card.ts
var PREVIEW_LIMIT = 32 * 1024;
var LEADING = ["path", "file_path", "command", "url", "pattern", "query"];
var isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function toolOf(toolCall) {
  const meta = toolCall._meta;
  const harness = isRecord(meta) ? meta["ai.agnes.harness"] : void 0;
  const tool = isRecord(harness) ? harness.tool : void 0;
  return typeof tool === "string" && tool !== "" ? tool : void 0;
}
function leadingFirst(input) {
  if (!isRecord(input)) return input;
  const keys = Object.keys(input);
  const first = LEADING.filter((k) => keys.includes(k));
  return Object.fromEntries([...first, ...keys.filter((k) => !first.includes(k))].map((k) => [k, input[k]]));
}
function impactOf(tool, kind, input, t2) {
  const field = (name) => {
    const v = isRecord(input) ? input[name] : void 0;
    return typeof v === "string" && v !== "" ? v : void 0;
  };
  const path = field("path") ?? field("file_path");
  const target = (value) => value ? ` ${value}` : "";
  if (tool === "write") return t2("app.approval.impact.write", { target: target(path) });
  if (kind === "edit") return t2("app.approval.impact.edit", { target: target(path) });
  if (kind === "execute") return t2("app.approval.impact.execute");
  if (kind === "fetch") return t2("app.approval.impact.fetch", { target: target(field("url")) });
  if (kind === "read")
    return path ? t2("app.approval.impact.read", { target: target(path) }) : t2("app.approval.impact.readContent");
  return t2("app.approval.impact.default");
}
function liveApprovalCard(toolCall, t2) {
  const tool = toolOf(toolCall);
  const input = toolCall.rawInput;
  const impact = impactOf(tool, toolCall.kind, input, t2);
  const sessionLabel = tool ? t2("app.approval.session.all", { tool }) : t2("app.approval.session.tool");
  if (input === void 0) return { impact, sessionLabel };
  const text3 = JSON.stringify(leadingFirst(input), null, 2) ?? String(input);
  if (text3.length <= PREVIEW_LIMIT) return { impact, preview: text3, sessionLabel };
  let shown = PREVIEW_LIMIT;
  const last = text3.charCodeAt(shown - 1);
  if (last >= 55296 && last <= 56319) shown -= 1;
  const count = t2("app.approval.truncatedCount", { shown, total: text3.length });
  return {
    impact,
    preview: `${text3.slice(0, shown)}
…[${count}]`,
    warning: t2("app.approval.truncatedWarning", { count })
  };
}

// ../base/extensions/privacy/src/redact.ts
var SIMPLE_SECRETS = [
  ["aws", /AKIA[0-9A-Z]{16}/g],
  ["github", /gh[pousr]_[A-Za-z0-9]{36,}/g],
  ["jwt", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g],
  ["sk", /sk-[A-Za-z0-9_-]{16,}/g]
];
var PII = [
  ["email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ["phone", /(?<!\d)1[3-9]\d{9}(?!\d)/g],
  ["id", /(?<!\d)\d{17}[\dXx](?!\d)/g]
];
var JSON_SECRET_DOUBLE = /("secret:\/\/[^"\s]+"\s*:\s*")([^"]+)(")/g;
var JSON_SECRET_SINGLE = /('secret:\/\/[^'\s]+'\s*:\s*')([^']+)(')/g;
var ASSIGNED_SECRET = /(secret:\/\/[^\s"'=:]+\s*=\s*)("[^"]+"|'[^']+'|[^\s,;}]+)/g;
var escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function addHits(hits, kind, count) {
  if (count > 0) hits[kind] = (hits[kind] ?? 0) + count;
}
function replaceCount(text3, pattern, replacement) {
  let count = 0;
  pattern.lastIndex = 0;
  const result2 = text3.replace(pattern, (...args) => {
    count++;
    const captures = args.slice(0, -2);
    return replacement(...captures);
  });
  return { text: result2, count };
}
function redactSecretReferences(text3) {
  let out = text3;
  let count = 0;
  for (const pattern of [JSON_SECRET_DOUBLE, JSON_SECRET_SINGLE]) {
    const result2 = replaceCount(out, pattern, (_whole, before, _value, after) => {
      return `${before}[REDACTED:secret]${after}`;
    });
    out = result2.text;
    count += result2.count;
  }
  const assigned = replaceCount(out, ASSIGNED_SECRET, (_whole, before, value) => {
    const quote = value[0] === '"' || value[0] === "'" ? value[0] : "";
    return `${before}${quote}[REDACTED:secret]${quote}`;
  });
  return { text: assigned.text, count: count + assigned.count };
}
function replaceLiteralPath(text3, value, replacement) {
  const windows = /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\");
  const normalized = value.length > 1 ? value.replace(windows ? /[\\/]+$/ : /\/+$/, "") : value;
  if (!normalized || normalized === "/") return { text: text3, count: 0 };
  const source = windows ? normalized.split(/[\\/]/).map(escapeRegExp).join("(?:\\\\\\\\|\\\\|/)") : escapeRegExp(normalized);
  const boundary = windows ? `(?=$|[\\\\/\\s"',;:)])` : "(?=$|/)";
  return replaceCount(text3, new RegExp(`${source}${boundary}`, windows ? "gi" : "g"), () => replacement);
}
function redactText(text3, rules) {
  const hits = {};
  let out = text3;
  if (rules.secrets) {
    const references = redactSecretReferences(out);
    out = references.text;
    addHits(hits, "secret", references.count);
    for (const [kind, pattern] of SIMPLE_SECRETS) {
      const result2 = replaceCount(out, pattern, () => `[REDACTED:${kind}]`);
      out = result2.text;
      addHits(hits, kind, result2.count);
    }
  }
  if (rules.paths) {
    const paths = rules.paths;
    if (paths.workspaceRoot) {
      const result2 = replaceLiteralPath(out, paths.workspaceRoot, "<workspace>");
      out = result2.text;
      addHits(hits, "path:workspace", result2.count);
    }
    if (paths.home) {
      const result2 = replaceLiteralPath(out, paths.home, "~");
      out = result2.text;
      addHits(hits, "path:home", result2.count);
    }
    if (paths.username) {
      const pattern = new RegExp(`/(?:Users|home)/${escapeRegExp(paths.username)}(?=$|/)`, "g");
      const result2 = replaceCount(out, pattern, () => "~");
      out = result2.text;
      addHits(hits, "path:username", result2.count);
    }
  }
  if (rules.pii) {
    for (const [kind, pattern] of PII) {
      const result2 = replaceCount(out, pattern, () => `[REDACTED:${kind}]`);
      out = result2.text;
      addHits(hits, kind, result2.count);
    }
  }
  for (const custom of rules.custom) {
    const flags = custom.flags?.includes("g") ? custom.flags : `${custom.flags ?? ""}g`;
    const pattern = new RegExp(custom.pattern, flags);
    const result2 = replaceCount(out, pattern, () => custom.replace);
    out = result2.text;
    addHits(hits, `custom:${custom.pattern}`, result2.count);
  }
  return { text: out, hits };
}
function redact(value, rules) {
  if (typeof value === "string") return redactText(value, rules).text;
  if (Array.isArray(value)) return value.map((item) => redact(item, rules));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redact(item, rules)])
    );
  }
  return value;
}

// src/diagnostics-redact.ts
var REDACTED = "***REDACTED***";
var SECRET_KEY = /^(authorization|proxy-authorization|bearer|cookie|set-cookie)$|token$|credentials?$|api[_-]?key|secret|password|passwd|private[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret/i;
var URL_KEY = /^(baseUrl|url|endpoint)$/i;
var BARE_REF = /^secret:\/\/[a-z0-9-]+\/[a-z0-9._-]+$/i;
var NAMES = "api[_-]?key|token|secret|password|passwd|pwd|passphrase|credentials?|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|secret[_-]?(?:access[_-]?)?key|cookie|[_-]key";
var PREFIX = "[A-Za-z0-9_-]{0,40}";
var PEM_BEGIN = "-----BEGIN [A-Z ]*PRIVATE KEY-----";
var PEM_END = "-----END [A-Z ]*PRIVATE KEY-----";
var EXTRA = [
  {
    pattern: String.raw`(?<=\bAuthorization\s{0,16}:\s{0,16}(?:Bearer|Basic)\s{1,16})[^\s"'<>]+`,
    flags: "i"
  },
  { pattern: String.raw`\bxox[baprs]-[A-Za-z0-9-]{12,}` },
  { pattern: String.raw`\bAIza[0-9A-Za-z_-]{20,}` },
  { pattern: `${PEM_BEGIN}[\\s\\S]*?${PEM_END}` },
  // A (Set-)Cookie header's whole `;`-joined value, not just the first pair the next rule stops at.
  { pattern: String.raw`(?<=\bcookie\s{0,16}:\s{0,16})[^\s"'<>][^\r\n"'<>]*`, flags: "i" },
  { pattern: String.raw`(?<=\b${PREFIX}(?:${NAMES})\s{0,16}[:=]\s{0,16}["']?)[^"'\s,;}]+`, flags: "i" },
  { pattern: String.raw`(?<="${PREFIX}(?:${NAMES})"\s{0,16}:\s{0,16}")(?:\\.|[^"\\])+`, flags: "i" },
  // The password of any `scheme://user:password@` URL in free text (`postgres://admin:pw@db`,
  // `redis://:pw@cache`), keeping scheme, user and host. Structured baseUrl/url/endpoint values
  // additionally lose their whole userinfo and query in stripUrl below.
  {
    pattern: String.raw`(?<=\b[a-z][a-z0-9+.-]{1,20}:\/\/[^\s\/:@"'<>]{0,128}:)[^\s\/@"'<>]{1,256}(?=@)`,
    flags: "i"
  }
].map((rule) => ({ ...rule, replace: REDACTED }));
var RULES = { secrets: true, paths: false, pii: false, custom: EXTRA };
var URL_RUN = /(?:https?|wss?):\/\/[^\s"'<>]+/gi;
var redactQueryPair = (pair) => pair.includes("=") ? `${pair.slice(0, pair.indexOf("=") + 1)}${REDACTED}` : pair && REDACTED;
function stripUrlSecrets(match) {
  const hashIndex = match.indexOf("#");
  const url = hashIndex < 0 ? match : match.slice(0, hashIndex);
  const queryIndex = url.indexOf("?");
  const [path, query] = queryIndex < 0 ? [url] : [url.slice(0, queryIndex), url.slice(queryIndex + 1)];
  const kept = query === void 0 ? path : `${path}?${query.split("&").map(redactQueryPair).join("&")}`;
  return hashIndex < 0 ? kept : `${kept}#${REDACTED}`;
}
function redactDiagnosticText(text3) {
  try {
    return redact(text3, RULES).replace(URL_RUN, stripUrlSecrets);
  } catch {
    return REDACTED;
  }
}
function stripUrl(raw) {
  try {
    const parsed = new URL(raw);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return raw;
  }
}
function redactSecretField(value) {
  if (typeof value === "string") return BARE_REF.test(value) ? value : REDACTED;
  if (value !== null && typeof value === "object") return REDACTED;
  return value;
}
function redactValue(value, seen) {
  if (typeof value === "string") return BARE_REF.test(value) ? value : redactDiagnosticText(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return REDACTED;
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => redactValue(item, seen));
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) out[key] = redactSecretField(item);
      else if (URL_KEY.test(key) && typeof item === "string") out[key] = redactDiagnosticText(stripUrl(item));
      else out[key] = redactValue(item, seen);
    }
    return out;
  } finally {
    seen.delete(value);
  }
}
function redactDiagnostic(value) {
  return redactValue(value, /* @__PURE__ */ new WeakSet());
}

// src/browser-log.ts
var MAX_ENTRIES = 1e3;
var MAX_ENTRY_LENGTH = 8e3;
var CONSOLE_LEVELS = ["log", "info", "warn", "error", "debug"];
var installed = false;
var dropped = 0;
var entries = [];
function stringifyValue(value) {
  if (typeof value === "string") return value;
  if (value instanceof Error) {
    const { name, message: message2, stack } = value;
    return stack?.includes(message2) ? stack : `${name}: ${message2}
${stack ?? ""}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function appendEntry(level, args) {
  try {
    const rawText = args.map(stringifyValue).join(" ");
    const text3 = redactDiagnosticText(rawText).slice(0, MAX_ENTRY_LENGTH);
    entries.push({ ts: (/* @__PURE__ */ new Date()).toISOString(), level, text: text3 });
    while (entries.length > MAX_ENTRIES) {
      entries.shift();
      dropped += 1;
    }
  } catch {
  }
}
function defaultTarget() {
  if (typeof window === "undefined" || typeof console === "undefined") return void 0;
  return { console, window };
}
function installBrowserLogCapture(target = defaultTarget()) {
  if (installed || !target) return;
  installed = true;
  const { console: targetConsole, window: targetWindow } = target;
  for (const level of CONSOLE_LEVELS) {
    const original = targetConsole[level].bind(targetConsole);
    targetConsole[level] = ((...args) => {
      appendEntry(level, args);
      original(...args);
    });
  }
  targetWindow.addEventListener("error", (event) => {
    appendEntry("error", [
      event.message,
      event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : "",
      event.error
    ]);
  });
  targetWindow.addEventListener("unhandledrejection", (event) => {
    appendEntry("error", ["Unhandled promise rejection", event.reason]);
  });
}
function getBrowserLog() {
  return { collectedAt: (/* @__PURE__ */ new Date()).toISOString(), entries: [...entries], dropped, limit: MAX_ENTRIES };
}

// src/client-modules/boot.ts
import { Context } from "@agnes/cordis";
import {
  AgnesClientService,
  ClientResourceService,
  CommandService,
  LocaleService,
  SessionService,
  SlotOutlet as SlotOutlet5,
  SlotRegistry,
  SlotsProvider as SlotsProvider5,
  ThemeService
} from "@agnes/web-client";
import { createElement as createElement20 } from "react";

// src/locales/app.ts
var appLocaleCatalog = {
  en: {
    "app.reconnect.waiting": "Waiting for the backend to recover; the page reloads automatically. If only the backend restarted, re-run the Web start command as well.",
    "app.reconnect.reloading": "Backend recovered; reloading the page…",
    "app.reconnect.retry": "Retry connection",
    "app.reconnect.stalled": "The backend has not recovered. Confirm both the backend and the Web start command have been re-run, then retry. ",
    "app.plugin.serviceUnavailable": "The plugin backend service is currently unavailable.",
    "app.plugin.serviceInvalid": "The plugin backend service returned an invalid result.",
    "app.plugin.effectUnavailable": "The plugin command is currently unavailable or its result is unknown.",
    "app.plugin.effectInvalid": "The plugin command returned an invalid result.",
    "app.plugin.authorize": "Allow plugin {owner} to run the command “{command}”{service}?",
    "app.plugin.authorizeService": " (service: {service})",
    "app.trace.noSession": "No active session; cannot read tool details",
    "app.trace.sessionSwitched": "The session switched; wait for the trace to update",
    "app.watch.stopTimeout": "Timed out closing the previous session event stream",
    "app.error.fallback": "The operation failed. Try again.",
    "app.recovery.profileMissing": "The saved profile for this older task is missing, so it cannot be opened yet. The record is kept; the active profile is unchanged.",
    "app.recovery.openFailed": "Opening the task failed. {detail}",
    "app.recovery.retry": "Retry open",
    "app.recovery.create": "New task",
    "app.recovery.hint": "{message} You can retry, pick another task in the sidebar, or create a new one. ",
    "app.status.newTask": "New task",
    "app.status.stoppingWait": "Requesting stop; waiting for the backend to confirm",
    "app.status.awaitingApproval": "Awaiting approval",
    "app.approval.searching": "Searching for the pending approval…",
    "app.approval.parkedTitle": "An approval is waiting",
    "app.approval.parkedSummary": "This approval sits in earlier records; it expires at {expiresAt}.",
    "app.approval.searchingImpact": "Loading earlier records.",
    "app.approval.locateImpact": "Locate it to see its full content and actions.",
    "app.approval.locate": "Locate approval",
    "app.approval.defaultSummary": "Allow this action?",
    "app.risk.destructive": "May modify or delete content",
    "app.risk.always": "This action requires explicit confirmation",
    "app.risk.budget": "Involves budget usage",
    "app.risk.unknown": "The impact needs confirmation",
    "app.approval.executeImpact": "A command will run in this task’s working directory. Review it before deciding.",
    "app.approval.toolImpact": "Review the tool and its arguments before deciding whether to continue.",
    "app.approval.allowOnce": "Allow once",
    "app.approval.allowAlways": "Allow for this session",
    "app.approval.rejectOnce": "Reject",
    "app.approval.rejectAlways": "Always reject",
    "app.approval.title": "Needs your confirmation",
    "app.notice.oldSessionClosing": "The previous session is still closing; the new session is already being prepared.",
    "app.fork.waitIdle": "Wait for the session to finish running before forking.",
    "app.fork.noForkableTurn": "This session has no completed turn to fork yet.",
    "app.fork.refreshFailed": "The new session was created, but refreshing the page failed. Find it after reloading: {id}",
    "app.fork.renameFailed": "The new session was created, but saving its name failed; rename it from the new session menu.",
    "app.fork.notIdle": "Only a finished turn on an idle session can be forked.",
    "app.fork.created": "A new chat was created from the selected turn. The original chat is unchanged.",
    "app.newSession.verifying": "Verifying…",
    "app.newSession.useWorkspace": "Use this workspace",
    "app.newSession.opening": "Opening…",
    "app.newSession.pickFolder": "Choose a folder…",
    "app.newSession.pickSystemHint": "Choose the workspace in the system window.",
    "app.newSession.checkingPicker": "Checking the system directory picker…",
    "app.newSession.pickMachine": "Pick a directory from this machine.",
    "app.newSession.noPicker": "This environment cannot open a directory picker; type the path instead.",
    "app.newSession.pickerFailed": "Could not open the system directory picker; type the workspace path instead.",
    "app.newSession.defaultTitle": "New session",
    "app.session.selectionChanged": "The session selection changed.",
    "app.session.createFailed": "Session creation failed.",
    "app.permission.draftNotice": "The new session will use “{mode}”.",
    "app.permission.fullNotice": "Remaining approvals are skipped for this session.",
    "app.permission.sessionNotice": "Session permission set to “{mode}”.",
    "app.model.draftNotice": "The new session will use the selected model.",
    "app.model.updatedNotice": "Model updated; later requests use the selected model.",
    "app.model.noAccounts": "No enabled model accounts yet. Add or enable one in Settings.",
    "app.model.savedNotEffective": "Configuration saved but not yet effective; the current effective model stays. Retry saving in Settings.",
    "app.model.savedNotice": "Model configuration updated. New sessions reuse the last used model; first-timers use the new default.",
    "app.admin.openFailed": "Opening the admin pane failed. Try again.",
    "app.connection.closedIntentional": "The connection closed; whether the task finished follows the backend state. Re-run the Web start command and open its address to resume viewing.",
    "app.connection.lost": "The backend connection was lost; whether the task finished follows the backend state.",
    "app.gap.partial": "Some history events are no longer replayable; reading the backend’s current projection.",
    "app.ws.unavailable": "The WebSocket address is unavailable.",
    "app.firstRun.configure": "Configure a model first to start the first task.",
    "app.workspaceList.unreadable": "Could not read the workspace list. Try again later or add a working directory directly.",
    "app.session.notFound": "This task was not found in the backend. Pick one from the sidebar or create a new task.",
    "runtime.import": "The plugin UI entry failed to load; retry allowed",
    "runtime.styles": "The plugin UI styles failed to load; retry allowed",
    "runtime.unsupportedSlot": "The plugin UI uses a slot this host does not implement",
    "runtime.moduleShape": "The plugin UI module shape is invalid; retry allowed",
    "runtime.apply": "Starting the plugin UI failed; retry allowed",
    "runtime.render": "Rendering the plugin UI failed; retry allowed",
    "runtime.dispose": "Unloading the plugin UI failed; the backend is cleaning up; retry allowed",
    "runtime.timeout": "The plugin UI operation timed out; the backend is cleaning up; retry allowed",
    "runtime.rowAlias": "The plugin UI row identity moved ambiguously; activation stopped",
    "runtime.reconcile": "The plugin UI roster is temporarily unavailable; retry allowed",
    "app.emptyState.tagline": "Let every model become an agent that gets things done.",
    "app.doc.previewTitle": "Document preview",
    "app.doc.reclaimed": "The screenshot was cleared by the retention policy",
    "app.doc.unavailable": "The document resource is temporarily unavailable",
    "app.guide.empty": "No guides yet",
    "app.doc.fallbackTitle": "Document",
    "app.guide.title": "Guides",
    "app.rightbarTabs": "Extension panels",
    "app.permission.notice.full": "This session now has full permission and can read and write files inside and outside the workspace.",
    "app.permission.notice.mode": "Session permission is set to “{mode}”.",
    "app.notice.newSessionModel": "The new session will use the selected model and configuration.",
    "app.notice.modelSaved": "Model configuration saved; later requests use the new reasoning strength and context window.",
    "app.error.sessionChanged": "The session selection changed.",
    "app.error.connectionChanged": "The connection changed. Wait for permissions to sync, then send again.",
    "app.error.permissionRequired": "Choose this session's permission before sending.",
    "app.error.messageTooLarge": "This message exceeds the 144 MiB WebSocket limit. Shorten the text or remove an attachment.",
    "app.approval.impact.write": "Will create or overwrite the file{target}. Check the request before deciding.",
    "app.approval.impact.edit": "Will modify the file{target}. Check the request before deciding.",
    "app.approval.impact.execute": "Will run a command in this task working directory. Check the command before deciding.",
    "app.approval.impact.fetch": "Will open the URL{target}. Check the request before deciding.",
    "app.approval.impact.read": "Will read{target}. Check the request before deciding.",
    "app.approval.impact.readContent": "Will read the content. Check the request before deciding.",
    "app.approval.impact.default": "Check the tool and its arguments before deciding whether to continue.",
    "app.approval.session.all": "Allow all {tool} calls in this session",
    "app.approval.session.tool": "Allow all calls to this tool in this session",
    "app.approval.truncatedCount": "Showing {shown} of {total} characters",
    "app.approval.truncatedWarning": "The content is not shown in full ({count}). The hidden part takes effect with the call too, so this approval offers no “allow for the session”; only “allow once” or “reject”."
  },
  "zh-CN": {
    "app.reconnect.waiting": "正在等待后台恢复，恢复后页面会自动重新载入。只重启了后台时，请同时重新运行 Web 启动命令。",
    "app.reconnect.reloading": "后台已恢复，正在重新载入页面…",
    "app.reconnect.retry": "重试连接",
    "app.reconnect.stalled": "后台暂未恢复。确认后台和 Web 启动命令都已重新运行后，可以重试连接。 ",
    "app.plugin.serviceUnavailable": "插件后端服务当前不可用。",
    "app.plugin.serviceInvalid": "插件后端服务返回无效结果。",
    "app.plugin.effectUnavailable": "插件命令当前不可用或结果未知。",
    "app.plugin.effectInvalid": "插件命令返回无效结果。",
    "app.plugin.authorize": "是否允许插件 {owner} 执行命令“{command}”{service}？",
    "app.plugin.authorizeService": "（服务：{service}）",
    "app.trace.noSession": "没有当前会话，无法读取工具详情",
    "app.trace.sessionSwitched": "会话已切换，请等待轨迹更新",
    "app.watch.stopTimeout": "旧会话事件流关闭超时",
    "app.error.fallback": "操作失败，请重试。",
    "app.recovery.profileMissing": "这个历史任务的旧配置文件已缺失，暂时无法打开。记录仍保留，未切换为当前配置。",
    "app.recovery.openFailed": "历史任务打开失败。{detail}",
    "app.recovery.retry": "重试打开",
    "app.recovery.create": "新建任务",
    "app.recovery.hint": "{message} 可以重试、选择侧栏其他任务，或新建任务。 ",
    "app.status.newTask": "新任务",
    "app.status.stoppingWait": "正在请求停止，等待后台确认",
    "app.status.awaitingApproval": "等待审批",
    "app.approval.searching": "正在查找待处理的审批…",
    "app.approval.parkedTitle": "有一项审批等待处理",
    "app.approval.parkedSummary": "这项审批在较早的记录里，过期时间 {expiresAt}。",
    "app.approval.searchingImpact": "正在加载更早的记录。",
    "app.approval.locateImpact": "定位后可以看到它的完整内容和可选操作。",
    "app.approval.locate": "定位审批",
    "app.approval.defaultSummary": "允许执行此操作？",
    "app.risk.destructive": "可能修改或删除内容",
    "app.risk.always": "此操作需要明确确认",
    "app.risk.budget": "涉及预算使用",
    "app.risk.unknown": "影响范围需要确认",
    "app.approval.executeImpact": "将在此任务的工作目录执行命令。请核对命令后决定。",
    "app.approval.toolImpact": "请核对工具及参数后决定是否继续。",
    "app.approval.allowOnce": "仅允许这次",
    "app.approval.allowAlways": "本会话允许",
    "app.approval.rejectOnce": "拒绝",
    "app.approval.rejectAlways": "始终拒绝",
    "app.approval.title": "需要你的确认",
    "app.notice.oldSessionClosing": "旧会话仍在关闭，新会话已继续准备。",
    "app.fork.waitIdle": "请等待会话运行结束后再分叉。",
    "app.fork.noForkableTurn": "此会话还没有可分叉的已完成回合。",
    "app.fork.refreshFailed": "新会话已创建，但页面刷新失败。请刷新页面查找会话：{id}",
    "app.fork.renameFailed": "新会话已创建，但名称保存失败；请在新会话菜单中重命名。",
    "app.fork.notIdle": "只有已完成且当前空闲的回合可以分支。",
    "app.fork.created": "已从所选回合创建新聊天。原聊天保持不变。",
    "app.newSession.verifying": "正在验证…",
    "app.newSession.useWorkspace": "使用此工作区",
    "app.newSession.opening": "正在打开…",
    "app.newSession.pickFolder": "选择文件夹…",
    "app.newSession.pickSystemHint": "请在系统窗口中选择工作区。",
    "app.newSession.checkingPicker": "正在检查系统目录选择器…",
    "app.newSession.pickMachine": "从这台机器选择一个目录。",
    "app.newSession.noPicker": "当前环境无法打开目录选择器，请手动输入路径。",
    "app.newSession.pickerFailed": "无法打开系统目录选择器，请手动输入工作区路径。",
    "app.newSession.defaultTitle": "新会话",
    "app.session.selectionChanged": "会话选择已改变。",
    "app.session.createFailed": "会话创建失败。",
    "app.permission.draftNotice": "新会话将使用「{mode}」。",
    "app.permission.fullNotice": "本会话已跳过其余审批。",
    "app.permission.sessionNotice": "本会话权限已设为「{mode}」。",
    "app.model.draftNotice": "新会话将使用所选模型。",
    "app.model.updatedNotice": "模型已更新，后续请求将使用所选模型。",
    "app.model.noAccounts": "尚无启用的模型账户。请在设置中添加或启用账户。",
    "app.model.savedNotEffective": "配置已保存，但尚未生效；当前继续使用已生效的模型。请在设置中重试保存。",
    "app.model.savedNotice": "模型配置已更新。新会话沿用上次使用的模型；尚未选过时使用新的默认模型。",
    "app.admin.openFailed": "打开管理面板失败，请重试。",
    "app.connection.closedIntentional": "连接已关闭；任务是否结束请以后台状态为准。重新运行 Web 启动命令并打开其地址即可恢复查看。",
    "app.connection.lost": "与后台的连接已断开；任务是否结束请以后台状态为准。",
    "app.gap.partial": "部分历史事件已不可回放，正在读取后台现有投影。",
    "app.ws.unavailable": "WebSocket 连接地址不可用。",
    "app.firstRun.configure": "先配置模型，即可开始第一个任务。",
    "app.workspaceList.unreadable": "无法读取工作区列表，请稍后重试或直接添加工作目录。",
    "app.session.notFound": "当前后台中找不到这个任务。请从侧栏选择，或新建任务。",
    "runtime.import": "插件 UI 入口加载失败，可重试",
    "runtime.styles": "插件 UI 样式加载失败，可重试",
    "runtime.unsupportedSlot": "插件 UI 使用了当前宿主未实现的槽位",
    "runtime.moduleShape": "插件 UI 模块格式无效，可重试",
    "runtime.apply": "插件 UI 启动失败，可重试",
    "runtime.render": "插件 UI 渲染失败，可重试",
    "runtime.dispose": "插件 UI 卸载失败，后台清理中，可重试",
    "runtime.timeout": "插件 UI 操作超时，后台清理中，可重试",
    "runtime.rowAlias": "插件 UI 行身份迁移不明确，已停止激活",
    "runtime.reconcile": "插件 UI 名册暂不可用，可重试",
    "app.emptyState.tagline": "让每一个模型，都能成为会做事的智能体。",
    "app.doc.previewTitle": "文档预览",
    "app.doc.reclaimed": "截图已按保留策略清理",
    "app.doc.unavailable": "文档资源暂不可用",
    "app.guide.empty": "暂无指南",
    "app.doc.fallbackTitle": "文档",
    "app.guide.title": "指南",
    "app.rightbarTabs": "扩展面板",
    "app.permission.notice.full": "本会话已开启完全权限，可读写工作区内外文件。",
    "app.permission.notice.mode": "本会话权限已设为「{mode}」。",
    "app.notice.newSessionModel": "新会话将使用所选模型与配置。",
    "app.notice.modelSaved": "模型配置已保存，后续请求将使用新的思考强度和上下文窗口。",
    "app.error.sessionChanged": "会话选择已改变。",
    "app.error.connectionChanged": "连接已变化，请等待权限同步后重新发送。",
    "app.error.permissionRequired": "请先选择本会话权限，确认后再发送。",
    "app.error.messageTooLarge": "消息超过 WebSocket 的 144 MiB 限制，请缩短文字或移除附件。",
    "app.approval.impact.write": "将创建或覆盖文件{target}。请核对后决定。",
    "app.approval.impact.edit": "将修改文件{target}。请核对后决定。",
    "app.approval.impact.execute": "将在此任务的工作目录执行命令。请核对命令后决定。",
    "app.approval.impact.fetch": "将访问网址{target}。请核对后决定。",
    "app.approval.impact.read": "将读取{target}。请核对后决定。",
    "app.approval.impact.readContent": "将读取内容。请核对后决定。",
    "app.approval.impact.default": "请核对工具及参数后决定是否继续。",
    "app.approval.session.all": "本会话内允许所有 {tool} 调用",
    "app.approval.session.tool": "本会话内允许此工具的所有调用",
    "app.approval.truncatedCount": "已显示 {shown} / 共 {total} 字符",
    "app.approval.truncatedWarning": "内容未完整显示（{count}）。未显示的部分同样会随调用生效，所以这项审批没有“本会话允许”，只能“仅允许这次”或“拒绝”。"
  }
};

// src/locales/composer.ts
var composerLocaleCatalog2 = {
  en: {
    "composer.hint.disconnected": "Connect to the backend to start",
    "composer.hint.unconfigured": "Configure a model to start",
    "composer.hint.preparing": "Preparing…",
    "composer.hint.newTask": "Ready for a new task",
    "composer.hint.stopping": "Requesting stop…",
    "composer.hint.busy": "You can add the next round",
    "composer.hint.shortcut": "Enter to send, Shift+Enter for a new line",
    "composer.hint.modelUnavailable": "The current model is no longer available; pick another model",
    "composer.hint.imageUnsupported": "The selected model does not accept images. Switch to a model with image input, or remove the images",
    "composer.hint.permissionSyncing": "Session permissions are syncing; try sending again shortly",
    "composer.hint.permissionRequired": "Choose the permissions for this session before sending",
    "composer.action.preparing": "Preparing session…",
    "composer.action.submitting": "Submitting…",
    "composer.action.append": "Add to next round",
    "composer.action.send": "Send",
    "composer.queue.gone": "This message has already started or is no longer queued. The list will refresh.",
    "composer.action.title": "{label} (Enter)",
    "composer.cancel.stop": "Stop",
    "composer.cancel.stopping": "Requesting stop…",
    "composer.placeholder.idle": "Describe what you want to do…",
    "composer.placeholder.busy": "Add what to do in the next round…",
    "composer.model.select": "Select model",
    "composer.model.accessible.fallback": "Select the model for this session",
    "composer.model.accessible.current": "Current session model: {id}",
    "composer.workspace.select": "Select workspace",
    "composer.workspace.current": "Current workspace",
    "composer.workspace.currentTitle": "Current session workspace",
    "cost.callDetailsAria": "View the cost breakdown for this call",
    "session.error.legacyLedger": "This session was created by an older build and cannot be opened in this version. Start a new session.",
    "session.error.authFailed": "Model credentials have expired or were rejected by the provider. Reconfigure or sign in again in Settings.",
    "session.error.outputLimit": "The model reply reached its output allowance and this turn stopped. Ask for step-by-step output, or raise the output allowance.",
    "session.error.rateLimit": "The model service returned a rate limit (HTTP 429). Retry later; if it persists, check the account quota or contact the model provider.",
    "session.error.internal": "The backend could not complete the request. Try again later.",
    "session.error.diagnosticId": " Diagnostic ID: {id}",
    "session.error.diagnosticUnavailable": " Diagnostic records could not be saved.",
    "workspace.error.notFound": "The working directory does not exist. Check the path and retry.",
    "workspace.error.notDirectory": "The selected path is not a directory. Choose a folder.",
    "workspace.error.notAccessible": "This working directory is not accessible. Check permissions and retry.",
    "workspace.error.notAbsolute": "Enter an absolute path for the working directory.",
    "workspace.error.fallback": "This working directory is unavailable. Check that the path exists and is accessible.",
    "topbar.preparing": "Preparing session"
  },
  "zh-CN": {
    "composer.hint.disconnected": "连接后台后开始",
    "composer.hint.unconfigured": "配置模型后开始",
    "composer.hint.preparing": "正在准备…",
    "composer.hint.newTask": "准备新任务",
    "composer.hint.stopping": "正在请求停止…",
    "composer.hint.busy": "可补充下一轮",
    "composer.hint.shortcut": "Enter 发送，Shift+Enter 换行",
    "composer.hint.modelUnavailable": "当前模型已不可用，请重新选择模型",
    "composer.hint.imageUnsupported": "当前模型不支持图片输入，请切换到支持图片的模型，或移除图片",
    "composer.hint.permissionSyncing": "正在同步会话权限，请稍后发送",
    "composer.hint.permissionRequired": "请先选择本会话权限，确认后再发送",
    "composer.action.preparing": "正在准备会话…",
    "composer.action.submitting": "正在提交…",
    "composer.action.append": "加入下一轮",
    "composer.action.send": "发送",
    "composer.queue.gone": "这条消息已开始执行或已不在队列中，列表会刷新。",
    "composer.action.title": "{label}（Enter）",
    "composer.cancel.stop": "停止",
    "composer.cancel.stopping": "正在请求停止…",
    "composer.placeholder.idle": "描述你想完成的事…",
    "composer.placeholder.busy": "补充下一轮要做的事…",
    "composer.model.select": "选择模型",
    "composer.model.accessible.fallback": "选择当前会话模型",
    "composer.model.accessible.current": "当前会话模型：{id}",
    "composer.workspace.select": "选择工作区",
    "composer.workspace.current": "当前工作区",
    "composer.workspace.currentTitle": "当前会话工作区",
    "cost.callDetailsAria": "查看本次调用用量明细",
    "session.error.legacyLedger": "该会话由旧版本创建，当前版本无法打开，请新建会话。",
    "session.error.authFailed": "模型凭据已失效或被上游拒绝，请在设置中重新配置或登录该模型账号。",
    "session.error.outputLimit": "模型回复达到输出额度，本轮已停止。请要求分步生成，或调整请求输出额度后继续。",
    "session.error.rateLimit": "模型服务返回限流错误（HTTP 429）。请稍后重试；若持续出现，请检查该账号的服务额度或联系模型服务方。",
    "session.error.internal": "后台未能完成请求，请稍后重试。",
    "session.error.diagnosticId": " 诊断编号：{id}",
    "session.error.diagnosticUnavailable": " 诊断记录未能保存。",
    "workspace.error.notFound": "工作目录不存在，请检查路径后重试。",
    "workspace.error.notDirectory": "所选路径不是目录，请选择一个文件夹。",
    "workspace.error.notAccessible": "无法访问此工作目录，请检查权限后重试。",
    "workspace.error.notAbsolute": "请输入工作目录的绝对路径。",
    "workspace.error.fallback": "无法使用此工作目录，请检查路径是否存在及访问权限。",
    "topbar.preparing": "正在准备会话"
  }
};

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

// src/locales/session.ts
var sessionLocaleCatalog = {
  en: {
    "nav.noWorkspaceTitle": "History sessions without a workspace",
    "nav.sessionFallback": "Session {id}",
    "nav.loadMore": "Load more tasks",
    "nav.fallbackName": "New session",
    "nav.newSessionInWorkspace": "New session in “{name}”",
    "session.uncategorized": "Unassigned",
    "session.menu.rename": "Rename",
    "session.menu.fork": "Fork session",
    "session.menu.archive": "Archive session",
    "session.menu.triggerAria": "Session actions for {name}",
    "session.menu.label": "Session actions",
    "session.rename.heading": "Rename session",
    "session.rename.nameLabel": "Session name",
    "session.rename.cancel": "Cancel",
    "session.rename.submit": "Rename",
    "session.rename.defaultError": "The operation failed. Try again.",
    "session.rename.invalidName": "Enter a single-line name of 1–80 characters.",
    "session.rename.savedRefreshFailed": "Name saved, but refreshing the list failed: {detail}",
    "session.rename.retryRefresh": "Retry refresh",
    "session.archived.unnamed": "Untitled session",
    "session.archived.restore": "Unarchive",
    "session.archived.restoring": "Unarchiving…",
    "session.archived.restoreAria": "Unarchive {title}",
    "session.archived.refreshFailedPrefix": "Unarchived, but refreshing the list failed: ",
    "session.archived.empty.noMatch": "No matching archived sessions.",
    "session.archived.empty.fallback": "No archived sessions yet.",
    "session.archived.paginationStalled": "Session list pagination did not advance. Try again.",
    "session.refreshFailed": "Refreshing the list failed: {detail}",
    "session.archiveRefreshFailedNotice": "Archived, but the list failed to refresh; reload the page: {detail}"
  },
  "zh-CN": {
    "nav.noWorkspaceTitle": "没有工作区归属的历史会话",
    "nav.sessionFallback": "会话 {id}",
    "nav.loadMore": "加载更多任务",
    "nav.fallbackName": "新会话",
    "nav.newSessionInWorkspace": "在“{name}”中新建会话",
    "session.uncategorized": "未分类",
    "session.menu.rename": "重命名",
    "session.menu.fork": "分叉会话",
    "session.menu.archive": "归档会话",
    "session.menu.triggerAria": "会话操作 {name}",
    "session.menu.label": "会话操作",
    "session.rename.heading": "重命名会话",
    "session.rename.nameLabel": "会话名称",
    "session.rename.cancel": "取消",
    "session.rename.submit": "重命名",
    "session.rename.defaultError": "操作失败，请重试。",
    "session.rename.invalidName": "请输入 1–80 个字符的单行名称。",
    "session.rename.savedRefreshFailed": "名称已保存，但列表刷新失败：{detail}",
    "session.rename.retryRefresh": "重试刷新",
    "session.archived.unnamed": "未命名会话",
    "session.archived.restore": "取消归档",
    "session.archived.restoring": "正在恢复…",
    "session.archived.restoreAria": "取消归档 {title}",
    "session.archived.refreshFailedPrefix": "已取消归档，但列表刷新失败：",
    "session.archived.empty.noMatch": "没有匹配的已归档会话。",
    "session.archived.empty.fallback": "暂无已归档会话。",
    "session.archived.paginationStalled": "会话列表分页未推进，请重试。",
    "session.refreshFailed": "列表刷新失败：{detail}",
    "session.archiveRefreshFailedNotice": "已归档，但列表刷新失败，请刷新页面：{detail}"
  }
};

// src/locales/settings.ts
var settingsLocaleCatalog = {
  en: {
    "settings.config.authFailed": "Sign-in did not finish. Retry or use device-code sign-in.",
    "settings.config.authExpired": "The sign-in attempt expired. Sign in again.",
    "settings.config.authBusy": "A sign-in is already in progress. Try again shortly.",
    "settings.config.invalidInput": "Invalid configuration input. Check the provider, base URL, key and model.",
    "settings.config.unknownProvider": "The selected provider is unavailable. Choose another one.",
    "settings.config.endpointUnsupported": "This provider does not support a custom base URL; restore the default address.",
    "settings.config.credentialRequired": "An API key is required. Enter the key and retry.",
    "settings.config.credentialPermissions": "Credential storage permissions are invalid. Ensure AGH_HOME and its secrets/auth directories belong to the current user, with directories 0700 and files 0600. Check data/audit/configuration.jsonl for the affected path.",
    "settings.config.credentialPermissionsDetail": "{target} has mode {actual}; it must be {expected}.",
    "settings.config.credentialTarget.home": "AGH_HOME",
    "settings.config.credentialTarget.secrets": "AGH_HOME/secrets",
    "settings.config.credentialTarget.auth": "AGH_HOME/auth",
    "settings.config.credentialTarget.locks": "AGH_HOME/locks",
    "settings.config.credentialTarget.provider": "A provider directory under AGH_HOME/secrets or AGH_HOME/auth",
    "settings.config.credentialTarget.file": "A credential file under AGH_HOME",
    "settings.config.credentialNoSpace": "Credential storage has no free space. Free disk space in AGH_HOME and retry.",
    "settings.config.credentialReadOnly": "Credential storage is on a read-only filesystem. Move AGH_HOME to a writable local directory and restart.",
    "settings.config.credentialInvalid": "Credential storage contains an unsafe path or invalid data. Check data/audit/configuration.jsonl and restore a private, regular store.",
    "settings.config.credentialStore": "The local credential store is unavailable. Check filesystem access and native build support; see data/audit/configuration.jsonl for the path and error code.",
    "settings.config.providerUnavailable": "The provider model catalog is unavailable. Check the network or base URL.",
    "settings.config.testFailed": "The provider connection test failed. Check the address and key.",
    "settings.config.subscriptionAuth": "The upstream rejected the subscription authorization or access. Re-authorize and verify the signed-in account.",
    "settings.config.subscriptionQuota": "The upstream reports insufficient quota or balance. Check your subscription usage.",
    "settings.config.subscriptionRateLimit": "The upstream is rate limiting. Try again later.",
    "settings.config.subscriptionTimeout": "The model test timed out. Check the network and retry.",
    "settings.config.subscriptionModel": "The upstream could not find the selected model. Choose another one and retry.",
    "settings.config.subscriptionFailed": "Authorization completed, but the reasoning test for the selected model failed. Retry or pick a different model. The account was not saved.",
    "settings.config.modelUnavailable": "The selected model is unavailable. Test again and choose a model that is offered.",
    "settings.config.revisionConflict": "The configuration was changed by another client. Reopen Settings and retry.",
    "settings.config.persistFailed": "Saving the configuration failed. Try again later.",
    "settings.config.invalidState": "The local configuration state is invalid. Check the configuration file.",
    "settings.config.requestFailed": "The configuration request failed",
    "settings.account.notLoaded": "Account details have not finished loading",
    "settings.account.nameRequired": "Enter an account name",
    "settings.account.editingHint": "Editing an account. Name or default-model changes save directly; connection changes need a new test.",
    "settings.account.addingHint": "Add a model account; each account stores its own address and key.",
    "settings.account.detailsTitle": "Account details",
    "settings.account.addTitle": "Add account",
    "settings.account.editContext": "Edit the connection and default model",
    "settings.account.addContext": "Fill in the connection, test it and save",
    "settings.state.reading": "Reading the configuration…",
    "settings.state.readFailed": "Reading the configuration failed. Retry.",
    "settings.state.connectionChanged": "Connection details changed. Test the provider again; the previous model list is stale.",
    "settings.state.offline": "The backend is not connected",
    "settings.state.disconnected": "The backend connection was lost.",
    "settings.step.loadedSaved": "The saved provider and default model are loaded. Test the connection to update the default model; the current session model is not changed here.",
    "settings.step.first": "Step 1: choose a provider and test the connection; the default model unlocks after validation.",
    "settings.step.testingModel": "Testing the selected subscription model…",
    "settings.step.modelVerified": "The selected model passed the test; the account can be saved.",
    "settings.step.second": "Step 2: testing the provider…",
    "settings.step.third": "Step 3: connected, {count} models found. Confirm or choose the default model and save; the current session model is unchanged.",
    "settings.step.saving": "Saving the default configuration…",
    "settings.key.oauthHint": "This provider uses subscription authorization; no API key needed.",
    "settings.key.savedHint": "API key saved. Leave it empty to keep using it; enter a new value to replace it. The page never shows the stored key.",
    "settings.key.inputHint": "Enter the API key to test and save. Closing Settings clears this input.",
    "settings.key.offlineCleared": "The backend is offline and this input has been cleared.",
    "settings.model.chooseSaved": "Choose the default model to save",
    "settings.model.testFirst": "Test the provider first, then choose a default model",
    "settings.model.default": "Default model",
    "settings.model.thinkingUnsupported": "The model does not support the selected reasoning level. Choose another.",
    "settings.model.contextRange": "The context budget must be a positive integer of at least {min} tokens and within the model capacity. K/M units are accepted.",
    "settings.model.savedThinkingUnavailable": "The saved level is currently unavailable: {value}",
    "settings.model.capacity": "Model capacity: {tokens} tokens.",
    "settings.model.budgetHint": "Enter 100K (100,000 tokens) or the full number; leave empty to restore the automatic value. Only new sessions inherit it; existing sessions keep their own configuration.",
    "settings.oauth.authorizedVerify": "Authorized; choose a model and save. The selected model is verified before saving.",
    "settings.oauth.awaitingAuth": "Waiting for subscription authorization.",
    "settings.oauth.cancelled": "Sign-in cancelled.",
    "settings.oauth.saveIncomplete": "Sign-in save did not complete",
    "settings.provider.subscriptionLogin": "Subscription sign-in",
    "settings.provider.subscriptionLoginSuffix": " · subscription sign-in",
    "settings.provider.choose": "Choose a provider",
    "settings.provider.none": "No provider available",
    "settings.provider.required": "Choose a provider",
    "settings.provider.switchKeyRequired": "Switching from subscription sign-in to an API key requires entering a new key",
    "settings.provider.noCatalog": "The provider returned no verifiable model catalog",
    "settings.saved.restartRequired": "Default configuration saved; the backend must restart before it takes effect. The current session model is unchanged.",
    "settings.saved.newSessionsOnly": "Default configuration saved; only new sessions use the new default. The current session model is unchanged.",
    "settings.saved.restartNeeded": "Saved; the backend must restart before it takes effect.",
    "settings.saved.newSessions": "Saved; new sessions pick it up and existing sessions keep their configuration.",
    "settings.provider.subscriptionSuffix": " · subscription login",
    "settings.oauth.methodLabel": "Auth method",
    "settings.provider.label": "Provider",
    "settings.model.thinkingLabel": "Default thinking level",
    "settings.modelPicker.default": "Default model",
    "settings.appearance.skinListFailed": "Reading the skin list failed.",
    "settings.appearance.retry": "Retry",
    "settings.appearance.followTheme": "Follow the theme (default)",
    "settings.appearance.followThemeHint": "Use only the built-in palette; no skin is loaded",
    "settings.appearance.fromPackage": "From {package}",
    "settings.appearance.skinNotApplied": "That skin did not apply; the previous choice was kept.",
    "settings.oauth.prompt": "Authorization code or callback URL",
    "settings.oauth.panelAria": "Subscription sign-in",
    "settings.oauth.browserLogin": "Browser sign-in",
    "settings.oauth.deviceLogin": "Device-code sign-in",
    "settings.oauth.cancelLogin": "Cancel sign-in",
    "settings.oauth.submitCode": "Submit authorization code",
    "settings.oauth.methodUnsupported": "The current provider does not support this sign-in method",
    "settings.oauth.awaiting": "Waiting for authorization. Closing the account window cancels this sign-in.",
    "settings.oauth.openLoginPage": "Open the {provider} sign-in page",
    "settings.oauth.continue": "Continue",
    "settings.oauth.submit": "Submit authorization code",
    "settings.oauth.completed": "Authorization complete. Choose a model and save; a test request is sent before saving.",
    "settings.oauth.failedRetry": "Sign-in failed. Retry, or pick another sign-in method this provider supports.",
    "settings.oauth.failedNetwork": "Sign-in failed. Check the network connection and retry.",
    "settings.picker.view": "View only",
    "settings.picker.viewDescription": "Command approvals surfaced in this session are always rejected",
    "settings.picker.workspace": "Changes within the workspace",
    "settings.picker.workspaceDescription": "Reads and writes stay inside the workspace; going outside needs full permission or a chosen directory",
    "settings.picker.full": "Full permission",
    "settings.picker.fullDescription": "Read and write files inside and outside the workspace; approvals are skipped, safety prohibitions and system permissions are kept",
    "settings.picker.choosePermission": "Choose permission",
    "settings.picker.aria": "Choose permission for this session",
    "settings.picker.listAria": "Permission for this session",
    "settings.modelPicker.configuredAccount": "Configured account",
    "settings.modelPicker.select": "Select model",
    "settings.modelPicker.help": "Choose the model this task uses",
    "settings.modelPicker.aria": "Select the model for this session",
    "settings.modelPicker.listAria": "Available models",
    "settings.workspacePicker.ambiguous": "The system directory picker returned an ambiguous result.",
    "shell.collapseNav": "Collapse navigation",
    "shell.openNav": "Open navigation",
    "sessionTitle.fallback": "New task",
    "settings.selectPicker.fallback": "Select {label}",
    "settings.selectPicker.ariaJoin": "{label}: {value}",
    "settings.confirm.default": "Confirm"
  },
  "zh-CN": {
    "settings.config.authFailed": "登录未完成，请重试或使用设备码登录。",
    "settings.config.authExpired": "登录操作已过期，请重新登录。",
    "settings.config.authBusy": "正在处理登录，请稍后重试。",
    "settings.config.invalidInput": "配置输入无效，请检查 Provider、Base URL、密钥和模型。",
    "settings.config.unknownProvider": "所选 Provider 不可用，请重新选择。",
    "settings.config.endpointUnsupported": "该 Provider 不支持自定义 Base URL，请恢复默认地址。",
    "settings.config.credentialRequired": "需要 API key，请输入密钥后重试。",
    "settings.config.credentialPermissions": "凭据存储权限不符合要求。请确认 AGH_HOME 及 secrets/auth 目录属于当前用户，目录权限为 0700、文件权限为 0600；具体路径见 data/audit/configuration.jsonl。",
    "settings.config.credentialPermissionsDetail": "{target} 当前权限为 {actual}，需要为 {expected}。",
    "settings.config.credentialTarget.home": "AGH_HOME",
    "settings.config.credentialTarget.secrets": "AGH_HOME/secrets",
    "settings.config.credentialTarget.auth": "AGH_HOME/auth",
    "settings.config.credentialTarget.locks": "AGH_HOME/locks",
    "settings.config.credentialTarget.provider": "AGH_HOME/secrets 或 AGH_HOME/auth 下的 Provider 目录",
    "settings.config.credentialTarget.file": "AGH_HOME 下的凭据文件",
    "settings.config.credentialNoSpace": "凭据存储所在磁盘空间不足。请释放 AGH_HOME 所在磁盘的空间后重试。",
    "settings.config.credentialReadOnly": "凭据存储位于只读文件系统。请将 AGH_HOME 移至可写的本地目录并重启。",
    "settings.config.credentialInvalid": "凭据存储存在不安全路径或无效数据。请检查 data/audit/configuration.jsonl，恢复私有的普通目录和文件。",
    "settings.config.credentialStore": "本地凭据存储不可用。请检查文件系统访问权限和本机构建支持；具体路径及错误码见 data/audit/configuration.jsonl。",
    "settings.config.providerUnavailable": "Provider 模型目录不可用，请检查网络或 Base URL。",
    "settings.config.testFailed": "Provider 连接测试未通过，请检查地址和密钥。",
    "settings.config.subscriptionAuth": "上游拒绝了订阅授权或访问权限，请重新授权并核对登录账号。",
    "settings.config.subscriptionQuota": "上游报告额度或余额不足，请检查订阅用量。",
    "settings.config.subscriptionRateLimit": "上游请求限流，请稍后重试。",
    "settings.config.subscriptionTimeout": "模型测试超时，请检查网络后重试。",
    "settings.config.subscriptionModel": "上游未找到所选模型，请选择其他模型重试。",
    "settings.config.subscriptionFailed": "授权已完成，但所选模型的推理测试失败；请重试或改选模型。账户尚未保存。",
    "settings.config.modelUnavailable": "所选模型不可用，请重新测试并选择返回的模型。",
    "settings.config.revisionConflict": "配置已被其他客户端修改，请重新打开设置后再试。",
    "settings.config.persistFailed": "配置保存失败，请稍后重试。",
    "settings.config.invalidState": "本地配置状态无效，请检查配置文件。",
    "settings.config.requestFailed": "配置请求失败",
    "settings.account.notLoaded": "账户信息尚未加载完成",
    "settings.account.nameRequired": "请填写账户名称",
    "settings.account.editingHint": "正在编辑账户。只修改账户名称或默认模型可直接保存；连接信息有变更时需重新测试。",
    "settings.account.addingHint": "添加模型账户；每个账户单独保存地址与密钥。",
    "settings.account.detailsTitle": "账户详情",
    "settings.account.addTitle": "添加账户",
    "settings.account.editContext": "编辑连接与默认模型",
    "settings.account.addContext": "填写连接信息后测试并保存",
    "settings.state.reading": "正在读取配置…",
    "settings.state.readFailed": "配置读取失败，请重试。",
    "settings.state.connectionChanged": "连接信息已变更。请重新测试 Provider；此前的模型列表已失效。",
    "settings.state.offline": "后台未连接",
    "settings.state.disconnected": "后台连接已断开。",
    "settings.step.loadedSaved": "已加载保存的 Provider 与默认模型。测试连接后可更新默认模型；当前会话模型不会在此更改。",
    "settings.step.first": "第 1 步：选择 Provider 并测试连接；验证后才能选择默认模型。",
    "settings.step.testingModel": "正在测试所选订阅模型…",
    "settings.step.modelVerified": "所选模型测试通过，可以保存账户。",
    "settings.step.second": "第 2 步：正在测试 Provider…",
    "settings.step.third": "第 3 步：连接成功，发现 {count} 个模型。确认或选择默认模型后保存；当前会话模型不会改变。",
    "settings.step.saving": "正在保存默认配置…",
    "settings.key.oauthHint": "使用当前 Provider 的订阅授权，无需 API key。",
    "settings.key.savedHint": "已保存 API key。留空会继续使用它；输入新值可替换。页面不会显示已保存的密钥。",
    "settings.key.inputHint": "请输入 API key 进行测试和保存。关闭设置会清除本次输入。",
    "settings.key.offlineCleared": "后台未连接，页面已清除本次输入。",
    "settings.model.chooseSaved": "选择要保存的默认模型",
    "settings.model.testFirst": "先测试 Provider，再选择默认模型",
    "settings.model.default": "默认模型",
    "settings.model.thinkingUnsupported": "该模型当前不支持所选思考强度，请重新选择",
    "settings.model.contextRange": "上下文预算须为 {min} Token 以上、模型容量以内的正整数，可使用 K/M 单位",
    "settings.model.savedThinkingUnavailable": "已保存的档位当前不可用：{value}",
    "settings.model.capacity": "模型容量：{tokens} tokens。",
    "settings.model.budgetHint": "可输入 100K（100,000 Token）或完整数量，留空恢复自动；仅新会话继承，已有会话保留自己的配置。",
    "settings.oauth.authorizedVerify": "授权完成；选择模型并保存，保存前会验证所选模型。",
    "settings.oauth.awaitingAuth": "正在等待订阅授权。",
    "settings.oauth.cancelled": "登录已取消。",
    "settings.oauth.saveIncomplete": "登录保存未完成",
    "settings.provider.subscriptionLogin": "订阅登录",
    "settings.provider.subscriptionLoginSuffix": " · 订阅登录",
    "settings.provider.choose": "选择 Provider",
    "settings.provider.none": "无可用 Provider",
    "settings.provider.required": "请选择 Provider",
    "settings.provider.switchKeyRequired": "从订阅登录切换为 API Key 时，请输入新的 API key",
    "settings.provider.noCatalog": "Provider 未返回可验证的模型目录",
    "settings.saved.restartRequired": "默认配置已保存；当前后台需要重启后生效。当前会话模型不会改变。",
    "settings.saved.newSessionsOnly": "默认配置已保存；仅新建任务会使用新的默认模型，当前会话模型不会改变。",
    "settings.saved.restartNeeded": "已保存；需要重启后台后生效。",
    "settings.saved.newSessions": "已保存；对新会话生效，已有会话保持原配置。",
    "settings.provider.subscriptionSuffix": " · 订阅登录",
    "settings.oauth.methodLabel": "认证方式",
    "settings.provider.label": "Provider",
    "settings.model.thinkingLabel": "默认思考强度",
    "settings.modelPicker.default": "默认模型",
    "settings.appearance.skinListFailed": "皮肤清单读取失败。",
    "settings.appearance.retry": "重试",
    "settings.appearance.followTheme": "跟随主题（默认）",
    "settings.appearance.followThemeHint": "只使用内置配色，不加载任何皮肤",
    "settings.appearance.fromPackage": "来自 {package}",
    "settings.appearance.skinNotApplied": "这份皮肤没有生效，已保留原选择。",
    "settings.oauth.prompt": "授权码或回调地址",
    "settings.oauth.panelAria": "订阅登录",
    "settings.oauth.browserLogin": "浏览器登录",
    "settings.oauth.deviceLogin": "设备码登录",
    "settings.oauth.cancelLogin": "取消登录",
    "settings.oauth.submitCode": "提交授权码",
    "settings.oauth.methodUnsupported": "当前 Provider 不支持该登录方式",
    "settings.oauth.awaiting": "等待授权。关闭账户窗口会取消本次登录。",
    "settings.oauth.openLoginPage": "打开 {provider} 登录页面",
    "settings.oauth.continue": "继续",
    "settings.oauth.submit": "提交授权码",
    "settings.oauth.completed": "授权完成。选择模型并保存；保存前会发送一条测试请求。",
    "settings.oauth.failedRetry": "登录失败，请重试；也可选择该 Provider 支持的其他登录方式。",
    "settings.oauth.failedNetwork": "登录失败，请检查网络连接后重试。",
    "settings.picker.view": "仅可查看",
    "settings.picker.viewDescription": "本会话弹出的命令审批一律拒绝",
    "settings.picker.workspace": "工作区内修改",
    "settings.picker.workspaceDescription": "仅工作区内读写；越界需切换完全权限或选择目录",
    "settings.picker.full": "完全权限",
    "settings.picker.fullDescription": "工作区内外文件读写；跳过审批，保留安全禁令和系统权限",
    "settings.picker.choosePermission": "请选择权限",
    "settings.picker.aria": "选择本会话权限",
    "settings.picker.listAria": "本会话权限",
    "settings.modelPicker.configuredAccount": "已配置账户",
    "settings.modelPicker.select": "选择模型",
    "settings.modelPicker.help": "选择此任务使用的模型",
    "settings.modelPicker.aria": "选择当前会话模型",
    "settings.modelPicker.listAria": "可用模型",
    "settings.workspacePicker.ambiguous": "系统目录选择器返回了无法确认的结果。",
    "shell.collapseNav": "收起导航",
    "shell.openNav": "打开导航",
    "sessionTitle.fallback": "新任务",
    "settings.selectPicker.fallback": "选择{label}",
    "settings.selectPicker.ariaJoin": "{label}：{value}",
    "settings.confirm.default": "确认"
  }
};

// src/locales/timeline.ts
var timelineLocaleCatalog = {
  en: {
    "timeline.userLabel": "You",
    "timeline.imageUnavailable": "Image preview unavailable in this view",
    "timeline.thinkingSummary": "Deep thinking",
    "timeline.lostOutput": "_Output interrupted; at least {count} characters were not saved_",
    "timeline.approvalLabel": "Approval: {status}",
    "timeline.approvalTitle": "Approval",
    "timeline.approval.pending": "Needs your confirmation",
    "timeline.approval.decided": "Approval processed",
    "timeline.approval.expired": "Approval expired",
    "timeline.decision.allowedOnce": "Allowed once",
    "timeline.decision.allowedSession": "Allowed for this session",
    "timeline.decision.allowedPermanent": "Always allowed for this profile",
    "timeline.decision.rejected": "Rejected",
    "timeline.decision.cancelled": "Cancelled",
    "timeline.reason.userRejected": "Rejected",
    "timeline.reason.timeout": "Timed out, not run",
    "timeline.reason.noApprover": "No one to approve, not run",
    "timeline.reason.stopped": "Stopped",
    "timeline.reason.policyDenied": "Blocked by command policy",
    "timeline.reason.subagentScope": "Refused automatically: outside the sub-agent scope",
    "timeline.decision.rejectOnce": "Reject",
    "timeline.artifactLabel": "Artifact",
    "timeline.compactionLabel": "Context compaction",
    "timeline.compactionFallback": "Context compacted (range: {range})",
    "timeline.unsupportedLabel": "Unsupported content",
    "timeline.conflictLabel": "Context configuration conflict",
    "timeline.conflictJoiner": ": ",
    "timeline.conflictOpsJoiner": ", ",
    "timeline.loadEarlier": "Load earlier records",
    "timeline.terminal.completed": "Completed",
    "timeline.terminal.aborted": "Cancelled",
    "timeline.terminal.interrupted": "Interrupted",
    "timeline.terminal.error": "Failed",
    "timeline.terminal.parked": "Waiting",
    "timeline.terminal.blocked": "Blocked",
    "timeline.terminal.budget": "Budget exhausted",
    "timeline.terminal.maxSteps": "Step limit reached",
    "timeline.phase.inference": "Generating a reply",
    "timeline.phase.tools": "Running tools",
    "timeline.phase.checkpoint": "Checking the next step",
    "timeline.phase.compaction": "Compacting context",
    "timeline.phase.deferred": "Waiting for external results",
    "timeline.phase.cancelRequested": "Handling the stop request",
    "timeline.phase.failureDrain": "Handling the failure",
    "timeline.status.awaitingApproval": "Awaiting approval",
    "timeline.status.runningPhase": "Running · {phase}",
    "timeline.status.running": "Running",
    "timeline.status.ready": "Ready",
    "turn.status.running": "Running",
    "turn.status.waiting": "Waiting",
    "turn.status.completed": "Completed",
    "turn.status.failed": "Failed",
    "turn.status.cancelled": "Cancelled",
    "turn.status.awaitingApproval": "Awaiting approval",
    "turn.status.runningTool": "Running a tool",
    "turn.status.replying": "Replying",
    "turn.status.thinking": "Thinking",
    "turn.status.preparing": "Preparing a reply",
    "turn.duration.ms": "{n} ms",
    "turn.duration.s": "{n} s",
    "turn.duration.minSec": "{min} min {sec} s",
    "turn.elapsedSuffix": " · took {duration}",
    "turn.error.codeJoin": "{code}: {message}",
    "turn.error.unknownReason": "unknown reason",
    "turn.error.noDetail": "The run did not finish ({reason}); no error details were received."
  },
  "zh-CN": {
    "timeline.userLabel": "你",
    "timeline.imageUnavailable": "图片附件暂不可预览",
    "timeline.thinkingSummary": "深度思考",
    "timeline.lostOutput": "_输出中断，至少 {count} 字未保存_",
    "timeline.approvalLabel": "审批：{status}",
    "timeline.approvalTitle": "审批",
    "timeline.approval.pending": "需要你确认",
    "timeline.approval.decided": "审批已处理",
    "timeline.approval.expired": "审批已过期",
    "timeline.decision.allowedOnce": "仅允许这次",
    "timeline.decision.allowedSession": "本会话允许",
    "timeline.decision.allowedPermanent": "对此配置始终允许",
    "timeline.decision.rejected": "已拒绝",
    "timeline.decision.cancelled": "已取消",
    "timeline.reason.userRejected": "已拒绝",
    "timeline.reason.timeout": "等待超时，未执行",
    "timeline.reason.noApprover": "无人审批，未执行",
    "timeline.reason.stopped": "已停止",
    "timeline.reason.policyDenied": "被命令策略拦截",
    "timeline.reason.subagentScope": "子代理权限范围内，已自动拒绝",
    "timeline.decision.rejectOnce": "拒绝",
    "timeline.artifactLabel": "产物",
    "timeline.compactionLabel": "上下文整理",
    "timeline.compactionFallback": "已整理上下文（范围：{range}）",
    "timeline.unsupportedLabel": "暂不支持的内容",
    "timeline.conflictLabel": "上下文配置冲突",
    "timeline.conflictJoiner": "：",
    "timeline.conflictOpsJoiner": "、",
    "timeline.loadEarlier": "加载更早的记录",
    "timeline.terminal.completed": "已完成",
    "timeline.terminal.aborted": "已取消",
    "timeline.terminal.interrupted": "已中断",
    "timeline.terminal.error": "执行失败",
    "timeline.terminal.parked": "等待处理",
    "timeline.terminal.blocked": "执行受阻",
    "timeline.terminal.budget": "预算已用尽",
    "timeline.terminal.maxSteps": "已达到执行步数上限",
    "timeline.phase.inference": "生成回复",
    "timeline.phase.tools": "执行工具",
    "timeline.phase.checkpoint": "检查下一步",
    "timeline.phase.compaction": "整理上下文",
    "timeline.phase.deferred": "等待外部结果",
    "timeline.phase.cancelRequested": "处理停止请求",
    "timeline.phase.failureDrain": "处理执行失败",
    "timeline.status.awaitingApproval": "等待审批",
    "timeline.status.runningPhase": "正在执行 · {phase}",
    "timeline.status.running": "正在执行",
    "timeline.status.ready": "准备就绪",
    "turn.status.running": "正在执行",
    "turn.status.waiting": "等待处理",
    "turn.status.completed": "已完成",
    "turn.status.failed": "执行失败",
    "turn.status.cancelled": "已取消",
    "turn.status.awaitingApproval": "等待审批",
    "turn.status.runningTool": "正在执行工具",
    "turn.status.replying": "正在回复",
    "turn.status.thinking": "正在思考",
    "turn.status.preparing": "正在准备回复",
    "turn.duration.ms": "{n} 毫秒",
    "turn.duration.s": "{n} 秒",
    "turn.duration.minSec": "{min} 分 {sec} 秒",
    "turn.elapsedSuffix": " · 用时 {duration}",
    "turn.error.codeJoin": "{code}：{message}",
    "turn.error.unknownReason": "未知原因",
    "turn.error.noDetail": "本次执行未完成（{reason}），暂未收到具体错误信息。"
  }
};

// src/locale-catalog.ts
var WEB_LOCALE_NAMESPACE = "@agnes/web";
var WEB_DICTS = [
  appLocaleCatalog,
  composerLocaleCatalog2,
  indexShellLocaleCatalog,
  sessionLocaleCatalog,
  settingsLocaleCatalog,
  timelineLocaleCatalog
];
var mergeLocale = (locale) => Object.fromEntries(WEB_DICTS.flatMap((dict) => Object.entries(dict[locale] ?? {})));
var webLocaleCatalog = {
  en: {
    "settings.appearance.language": "Language",
    "settings.appearance.language.en": "English",
    "settings.appearance.language.en.hint": "Show the workbench in English",
    "settings.appearance.language.zh-CN": "简体中文",
    "settings.appearance.language.zh-CN.hint": "Show the workbench in Simplified Chinese",
    ...mergeLocale("en")
  },
  "zh-CN": {
    "settings.appearance.language": "语言",
    "settings.appearance.language.en": "English",
    "settings.appearance.language.en.hint": "使用英文界面",
    "settings.appearance.language.zh-CN": "简体中文",
    "settings.appearance.language.zh-CN.hint": "使用简体中文界面",
    ...mergeLocale("zh-CN")
  }
};

// src/locales/computer-use.ts
var COMPUTER_USE_LOCALE_NAMESPACE = "@agnes/web-computer-use";
var en3 = {
  "computerUse.intro": "Let Agnes see the screen and operate apps. This needs a model that accepts images.",
  "computerUse.action.refresh": "Refresh status",
  "computerUse.status.eyebrow": "Status",
  "computerUse.permissions.eyebrow": "System permissions",
  "computerUse.permissions.grant": "Open macOS authorization",
  "computerUse.doctor.eyebrow": "Driver diagnostics",
  "computerUse.doctor.run": "Run diagnostics",
  "computerUse.operation.eyebrow": "Install and maintenance",
  "computerUse.action.install": "Prepare driver",
  "computerUse.action.update": "Update driver",
  "computerUse.action.restart": "Restart driver",
  "computerUse.action.operationRefresh": "Refresh progress",
  "computerUse.action.cancel": "Cancel operation",
  "computerUse.status.pending": "Waiting for a check",
  "computerUse.status.pendingSummary": "The pane reads this computer's status when it opens.",
  "computerUse.status.checking": "Checking",
  "computerUse.status.checkingSummary": "Reading the local Computer Use safety gate.",
  "computerUse.status.running": "Running",
  "computerUse.status.available": "Available",
  "computerUse.status.readySummary": "{platform} driver {version} is ready. Use a model that accepts images in the conversation to operate the computer.",
  "computerUse.runtime.active": "Runtime: {count} active sessions",
  "computerUse.runtime.idle": "Runtime: idle now, started before",
  "computerUse.runtime.ready": "Runtime: ready, no session started yet",
  "computerUse.status.closed": "Turned off",
  "computerUse.status.unsupported": "Not supported on this system",
  "computerUse.status.preparing": "Preparing",
  "computerUse.status.prepareFailed": "Preparation failed",
  "computerUse.status.firstPrepare": "Prepares automatically on first use",
  "computerUse.status.refreshRetry": "Refresh the status and try again.",
  "computerUse.runtime.imageModel": "Operating the computer needs a model that accepts images. Ordinary chat is unaffected.",
  "computerUse.status.blocked": "Blocked",
  "computerUse.status.blockedSummary": "Production driver admission stays closed on this platform.",
  "computerUse.runtime.notStarted": "Runtime: not started, and start was not attempted",
  "computerUse.status.unreadable": "Could not read status",
  "computerUse.status.unreadableSummary": "Computer Use status could not be read. No driver operation was started.",
  "computerUse.permissions.pending": "Waiting for a check",
  "computerUse.permissions.pendingSummary": "Required system permissions appear after the driver is ready.",
  "computerUse.permissions.waitingDriver": "Waiting for the driver",
  "computerUse.permissions.notRequired": "No system authorization required",
  "computerUse.permissions.linuxSummary": "Linux does not use the macOS Accessibility and screen recording grants. The driver health check covers the desktop session.",
  "computerUse.permissions.windowsSummary": "Windows does not need a separate screen recording or accessibility grant.",
  "computerUse.permissions.granted": "Authorized",
  "computerUse.permissions.grantedSummary": "Accessibility and screen recording are both authorized.",
  "computerUse.permissions.required": "Authorization required",
  "computerUse.permissions.requiredSummary": "macOS still needs: {missing}. Continuing opens the system settings window.",
  "computerUse.permissions.accessibility": "Accessibility",
  "computerUse.permissions.screenRecording": "Screen Recording",
  "computerUse.permissions.unknown": "Could not confirm",
  "computerUse.permissions.unknownSummary": "macOS permissions could not be read from the verified driver. Refresh and try again.",
  "computerUse.permissions.unavailable": "Unavailable",
  "computerUse.permissions.unavailableSummary": "The production driver has not passed admission, so system permissions were not checked.",
  "computerUse.permissions.unreadable": "Could not read permissions",
  "computerUse.permissions.unreadableSummary": "System permissions could not be read. Authorization was not requested.",
  "computerUse.permissions.granting": "Waiting for system authorization",
  "computerUse.permissions.grantingSummary": "Finish Accessibility and screen recording authorization in the macOS system UI.",
  "computerUse.permissions.grantFailed": "Authorization incomplete",
  "computerUse.permissions.grantFailedSummary": "System authorization did not finish or could not be verified. Check system settings and refresh.",
  "computerUse.doctor.pending": "Waiting for a check",
  "computerUse.doctor.pendingSummary": "Checks whether the local driver is healthy.",
  "computerUse.doctor.checking": "Checking",
  "computerUse.doctor.checkingSummary": "Verifying driver health and signature identity.",
  "computerUse.doctor.passed": "Check passed",
  "computerUse.doctor.macosSummary": "The macOS driver health and signature identity are verified.",
  "computerUse.doctor.linuxSummary": "The Linux driver health, source identity, and desktop session are verified.",
  "computerUse.doctor.windowsSummary": "The Windows driver health and signature identity are verified.",
  "computerUse.doctor.failed": "Check failed",
  "computerUse.doctor.failedSummary": "Driver health or signature identity changed. Repair or reinstall, then try again.",
  "computerUse.doctor.failedTemporary": "Check failed",
  "computerUse.doctor.failedTemporarySummary": "The health check could not finish. The driver was not started or repaired.",
  "computerUse.doctor.unreachable": "Could not connect",
  "computerUse.doctor.unreachableSummary": "The live driver diagnostics entry is unavailable. Restart or repair the driver.",
  "computerUse.doctor.skipped": "Not run",
  "computerUse.doctor.skippedSummary": "The production driver has not passed admission, so the health check cannot run.",
  "computerUse.operation.none": "No record",
  "computerUse.operation.noneSummary": "The first use prepares the driver automatically. An existing install is verified and reused.",
  "computerUse.operation.emptySummary": "This computer has no driver operation to show.",
  "computerUse.operation.queued": "Waiting to run",
  "computerUse.operation.queuedSummary": "The driver operation is in the local queue.",
  "computerUse.operation.installing": "Installing",
  "computerUse.operation.restarting": "Restarting",
  "computerUse.operation.runningSummary": "Checking the installed driver. A missing driver is downloaded and verified. A slow network can take a while; you can cancel and retry.",
  "computerUse.operation.cancelling": "Cancelling",
  "computerUse.operation.cancellingSummary": "Cancellation was requested. Waiting for the current safe step to finish.",
  "computerUse.operation.cancelRequestSummary": "Asking the local host to stop the driver operation.",
  "computerUse.operation.done": "Operation finished",
  "computerUse.operation.installed": "The driver is installed and verified.",
  "computerUse.operation.alreadyCurrent": "The driver is already the pinned version.",
  "computerUse.operation.repaired": "The driver was repaired and verified.",
  "computerUse.operation.restarted": "The driver restarted safely.",
  "computerUse.operation.lkgRestored": "The new driver did not pass verification. The previous working version was restored.",
  "computerUse.operation.doneSummary": "The driver operation has finished.",
  "computerUse.operation.cancelled": "Cancelled",
  "computerUse.operation.cancelledSummary": "The driver operation was cancelled before later steps ran.",
  "computerUse.operation.failed": "Operation failed",
  "computerUse.operation.failedSummary": "Driver preparation or maintenance did not finish. Check the network or install environment and try again.",
  "computerUse.operation.progressUnreadable": "Could not read progress",
  "computerUse.operation.progressUnreadableSummary": "The driver operation may still be running in the background. Refresh progress later.",
  "computerUse.operation.stillRunning": "Still running",
  "computerUse.operation.stillRunningSummary": "This is taking a while. The driver operation may still be running. Refresh progress later.",
  "computerUse.operation.submitting": "Submitting",
  "computerUse.operation.submittingSummary": "Submitting the driver operation to the local host.",
  "computerUse.operation.startUnknown": "Could not confirm the start",
  "computerUse.operation.startUnknownSummary": "The submit result could not be confirmed. The operation may already have started. Refresh progress and try again.",
  "computerUse.operation.reading": "Reading",
  "computerUse.operation.readingSummary": "Reading the latest driver operation.",
  "computerUse.operation.readFailed": "Could not read the operation",
  "computerUse.operation.readFailedPendingSummary": "Progress could not be read. The operation may still be running in the background.",
  "computerUse.operation.readFailedSummary": "Driver operation progress could not be read.",
  "computerUse.operation.cancelFailed": "Cancel failed",
  "computerUse.operation.cancelFailedSummary": "The cancel result could not be confirmed. Refresh progress and try again.",
  "computerUse.blocker.releaseProvenance": "The driver release source and integrity evidence are not locked yet.",
  "computerUse.blocker.compatibility": "Compatibility evidence for the pinned version is not finished.",
  "computerUse.blocker.platformAcceptance": "On-device platform acceptance is not finished.",
  "computerUse.blocker.featureDisabled": "Computer operation is turned off in the local configuration. Check computerUse.enabled.",
  "computerUse.blocker.platformUnsupported": "This operating system or processor cannot operate the computer yet.",
  "computerUse.blocker.driverNotPrepared": "The first use prepares the driver automatically. You can also choose Prepare driver.",
  "computerUse.blocker.driverPreparing": "The driver is being prepared. Wait a moment.",
  "computerUse.blocker.driverPrepareFailed": "Driver preparation did not finish. Check the network or install environment, then choose Prepare driver."
};
var zh3 = {
  "computerUse.intro": "让 Agnes 查看屏幕并操作应用。需要使用支持图片的模型。",
  "computerUse.action.refresh": "刷新状态",
  "computerUse.status.eyebrow": "使用状态",
  "computerUse.permissions.eyebrow": "系统权限",
  "computerUse.permissions.grant": "打开 macOS 授权",
  "computerUse.doctor.eyebrow": "驱动诊断",
  "computerUse.doctor.run": "运行诊断",
  "computerUse.operation.eyebrow": "安装与维护",
  "computerUse.action.install": "准备驱动",
  "computerUse.action.update": "更新驱动",
  "computerUse.action.restart": "重启驱动",
  "computerUse.action.operationRefresh": "刷新进度",
  "computerUse.action.cancel": "取消操作",
  "computerUse.status.pending": "等待检查",
  "computerUse.status.pendingSummary": "打开面板后读取本机状态。",
  "computerUse.status.checking": "正在检查",
  "computerUse.status.checkingSummary": "正在读取本机 Computer Use 安全门状态。",
  "computerUse.status.running": "运行中",
  "computerUse.status.available": "可用",
  "computerUse.status.readySummary": "{platform} 驱动 {version} 已就绪。请在对话中使用支持图片的模型操作电脑。",
  "computerUse.runtime.active": "运行时：{count} 个活动会话",
  "computerUse.runtime.idle": "运行时：当前空闲，之前已启动过",
  "computerUse.runtime.ready": "运行时：已就绪，尚未启动会话",
  "computerUse.status.closed": "已关闭",
  "computerUse.status.unsupported": "暂不支持",
  "computerUse.status.preparing": "准备中",
  "computerUse.status.prepareFailed": "准备失败",
  "computerUse.status.firstPrepare": "首次使用自动准备",
  "computerUse.status.refreshRetry": "请刷新状态后重试。",
  "computerUse.runtime.imageModel": "电脑操作需要支持图片的模型；普通聊天不受影响。",
  "computerUse.status.blocked": "已阻止",
  "computerUse.status.blockedSummary": "当前平台的生产驱动准入保持关闭。",
  "computerUse.runtime.notStarted": "运行时：未启动，且未尝试启动",
  "computerUse.status.unreadable": "无法读取",
  "computerUse.status.unreadableSummary": "暂时无法读取 Computer Use 状态；未执行任何驱动操作。",
  "computerUse.permissions.pending": "等待检查",
  "computerUse.permissions.pendingSummary": "驱动就绪后显示当前系统所需的权限。",
  "computerUse.permissions.waitingDriver": "等待驱动就绪",
  "computerUse.permissions.notRequired": "无需系统授权",
  "computerUse.permissions.linuxSummary": "Linux 不使用 macOS 的辅助功能和屏幕录制授权；桌面会话能力由驱动健康检查验证。",
  "computerUse.permissions.windowsSummary": "Windows 无需额外的屏幕录制或辅助功能授权。",
  "computerUse.permissions.granted": "已授权",
  "computerUse.permissions.grantedSummary": "辅助功能和屏幕录制均已授权。",
  "computerUse.permissions.required": "需要授权",
  "computerUse.permissions.requiredSummary": "macOS 仍需授权：{missing}。点击后由系统设置窗口完成。",
  "computerUse.permissions.accessibility": "辅助功能",
  "computerUse.permissions.screenRecording": "屏幕录制",
  "computerUse.permissions.unknown": "无法确认",
  "computerUse.permissions.unknownSummary": "无法从已验签驱动读取 macOS 权限，请刷新后重试。",
  "computerUse.permissions.unavailable": "不可用",
  "computerUse.permissions.unavailableSummary": "生产驱动尚未通过准入，未检查系统权限。",
  "computerUse.permissions.unreadable": "无法读取",
  "computerUse.permissions.unreadableSummary": "暂时无法读取系统权限；没有发起授权。",
  "computerUse.permissions.granting": "等待系统授权",
  "computerUse.permissions.grantingSummary": "请在 macOS 系统界面完成辅助功能和屏幕录制授权。",
  "computerUse.permissions.grantFailed": "授权未完成",
  "computerUse.permissions.grantFailedSummary": "系统授权未完成或无法验证，请检查系统设置后刷新。",
  "computerUse.doctor.pending": "等待检查",
  "computerUse.doctor.pendingSummary": "检查本机驱动是否正常。",
  "computerUse.doctor.checking": "正在检查",
  "computerUse.doctor.checkingSummary": "正在验证驱动健康状态和签名身份。",
  "computerUse.doctor.passed": "检查通过",
  "computerUse.doctor.macosSummary": "macOS 驱动健康状态和签名身份均已验证。",
  "computerUse.doctor.linuxSummary": "Linux 驱动健康状态、来源身份和桌面会话均已验证。",
  "computerUse.doctor.windowsSummary": "Windows 驱动健康状态和签名身份均已验证。",
  "computerUse.doctor.failed": "检查失败",
  "computerUse.doctor.failedSummary": "驱动健康状态或签名身份已经变化，请修复或重新安装后再试。",
  "computerUse.doctor.failedTemporary": "检查失败",
  "computerUse.doctor.failedTemporarySummary": "暂时无法完成健康检查；没有启动或修复驱动。",
  "computerUse.doctor.unreachable": "无法连接",
  "computerUse.doctor.unreachableSummary": "实时驱动诊断入口不可用，请重新启动或修复驱动。",
  "computerUse.doctor.skipped": "未执行",
  "computerUse.doctor.skippedSummary": "生产驱动尚未通过准入，无法执行健康检查。",
  "computerUse.operation.none": "没有记录",
  "computerUse.operation.noneSummary": "首次使用会自动准备驱动；已有安装会先验证并复用。",
  "computerUse.operation.emptySummary": "本机没有可显示的驱动操作。",
  "computerUse.operation.queued": "等待执行",
  "computerUse.operation.queuedSummary": "驱动操作已进入本机队列。",
  "computerUse.operation.installing": "正在安装",
  "computerUse.operation.restarting": "正在重启",
  "computerUse.operation.runningSummary": "正在检查已有驱动；缺失时会下载并验证。网络较慢时需要等待，可取消后重试。",
  "computerUse.operation.cancelling": "正在取消",
  "computerUse.operation.cancellingSummary": "已请求取消；正在等待当前安全步骤结束。",
  "computerUse.operation.cancelRequestSummary": "正在请求本机 Host 停止驱动操作。",
  "computerUse.operation.done": "操作完成",
  "computerUse.operation.installed": "驱动已经安装并通过验证。",
  "computerUse.operation.alreadyCurrent": "当前驱动已经是锁定版本。",
  "computerUse.operation.repaired": "驱动已经修复并通过验证。",
  "computerUse.operation.restarted": "驱动已经安全重启。",
  "computerUse.operation.lkgRestored": "新驱动未通过验证，已恢复上一可用版本。",
  "computerUse.operation.doneSummary": "驱动操作已经完成。",
  "computerUse.operation.cancelled": "已取消",
  "computerUse.operation.cancelledSummary": "驱动操作已取消，未继续执行后续步骤。",
  "computerUse.operation.failed": "操作失败",
  "computerUse.operation.failedSummary": "驱动准备或维护未完成。请检查网络或安装环境后重试。",
  "computerUse.operation.progressUnreadable": "无法读取进度",
  "computerUse.operation.progressUnreadableSummary": "驱动操作可能仍在后台执行，请稍后刷新进度。",
  "computerUse.operation.stillRunning": "仍在执行",
  "computerUse.operation.stillRunningSummary": "等待时间较长，驱动操作仍可能在后台执行，请稍后刷新进度。",
  "computerUse.operation.submitting": "正在提交",
  "computerUse.operation.submittingSummary": "正在向本机 Host 提交驱动操作。",
  "computerUse.operation.startUnknown": "无法确认是否开始",
  "computerUse.operation.startUnknownSummary": "无法确认提交结果；操作可能已在后台开始，请刷新进度后再试。",
  "computerUse.operation.reading": "正在读取",
  "computerUse.operation.readingSummary": "正在读取最近一次驱动操作。",
  "computerUse.operation.readFailed": "无法读取",
  "computerUse.operation.readFailedPendingSummary": "暂时无法读取进度；操作可能仍在后台执行。",
  "computerUse.operation.readFailedSummary": "暂时无法读取驱动操作进度。",
  "computerUse.operation.cancelFailed": "取消失败",
  "computerUse.operation.cancelFailedSummary": "无法确认取消结果，请刷新进度后再试。",
  "computerUse.blocker.releaseProvenance": "驱动发布来源与完整性证据尚未锁定",
  "computerUse.blocker.compatibility": "锁定版本兼容性证据尚未完成",
  "computerUse.blocker.platformAcceptance": "平台实机验收尚未完成",
  "computerUse.blocker.featureDisabled": "当前配置已关闭电脑操作，请检查本地配置中的 computerUse.enabled。",
  "computerUse.blocker.platformUnsupported": "当前系统或处理器暂不支持电脑操作。",
  "computerUse.blocker.driverNotPrepared": "首次使用时会自动准备驱动，也可以点击“准备驱动”。",
  "computerUse.blocker.driverPreparing": "正在准备驱动，请稍候。",
  "computerUse.blocker.driverPrepareFailed": "驱动准备未完成。请检查网络或安装环境，然后点击“准备驱动”重试。"
};
var computerUseCatalog = { en: { ...en3 }, "zh-CN": { ...zh3 } };
function computerUseLocale() {
  if (typeof document !== "undefined" && document.documentElement?.lang === "zh-CN") return "zh-CN";
  return "en";
}
function computerUseText(key, vars, locale = computerUseLocale()) {
  const template = computerUseCatalog[locale]?.[key] ?? computerUseCatalog.en?.[key] ?? key;
  if (!vars) return template;
  return template.replace(
    /\{(\w+)\}/g,
    (match, name) => Object.hasOwn(vars, name) ? String(vars[name]) : match
  );
}
function computerUsePhrase(phrase2, locale) {
  return computerUseText(phrase2.key, phrase2.vars, locale);
}

// src/locales/server-errors.ts
var SERVER_ERROR_LOCALE_NAMESPACE = "@agnes/web-errors";
var en4 = {
  "error.E_ADMIN_ORIGIN": "The admin request origin is not valid.",
  "error.E_ADMIN_RESPONSE": "The backend response could not be confirmed.",
  "error.E_ADMIN_BACKEND": "The operation was not confirmed. Check its status or reconnect to the backend.",
  "error.E_ADMIN_ROUTE": "The admin operation does not exist.",
  "error.E_ADMIN_REQUEST": "The admin parameters are not valid.",
  "error.E_ADMIN_SCOPE": "The admin request does not belong to this profile.",
  "error.E_ADMIN_READ_ONLY": "The admin surface is in read-only recovery mode.",
  "error.E_RESOURCE_ADMIN_ORIGIN": "The resource admin request origin is not valid.",
  "error.E_RESOURCE_ADMIN_ROUTE": "The resource admin operation does not exist.",
  "error.E_RESOURCE_ADMIN_REQUEST": "The resource admin parameters are not valid.",
  "error.E_RESOURCE_ADMIN_SCOPE": "The resource admin request does not belong to this profile.",
  "error.E_RESOURCE_ADMIN_READ_ONLY": "The resource admin surface is in read-only recovery mode.",
  "error.E_RESOURCE_ADMIN_RESPONSE": "The backend response could not be confirmed.",
  "error.E_RESOURCE_ADMIN_BODY_TOO_LARGE": "The resource admin request body is too large.",
  "error.E_RESOURCE_UNSUPPORTED": "This backend version does not support that resource admin capability.",
  "error.E_RESOURCE_ADMIN_BACKEND": "The operation was not confirmed. Check its status or reconnect to the backend.",
  "error.SKILL_SOURCE_MANAGED": "This skill is provided by a plugin. Remove it from plugin management.",
  "error.SKILL_DELETE_PREFLIGHT_FAILED": "The delete preflight failed, so the skill was not changed. Check the path, version, and local delete support. Windows network-share paths are not supported yet.",
  "error.SKILL_STALE": "The skill source has not refreshed successfully. Refresh it and try again.",
  "error.SKILL_REMOVED": "This skill is being permanently deleted and cannot be enabled again.",
  "error.RESOURCE_BUSY": "This skill is already handling another operation. Wait for it to finish.",
  "error.SKILL_DELETE_NOT_CANCELLABLE": "A permanent delete cannot be cancelled after it starts.",
  "error.REVISION_CONFLICT": "Another operation updated this resource. Refresh and check the latest version.",
  "error.MCP_NOT_FOUND": "The MCP definition does not exist or has been removed.",
  "error.RESOURCE_OPERATION_UNAVAILABLE": "The operation does not exist, or this account cannot view it.",
  "error.RESOURCE_OPERATION_OWNER_REQUIRED": "You can only cancel resource operations that you started.",
  "error.RESOURCE_RECONCILE_FAILED": "The backend could not apply the resource state safely. Check the latest status.",
  "error.SKILL_REMOVAL_PENDING": "Permanent deletion has not finished. Re-enabling is blocked. Clear any file lock and retry the delete.",
  "error.HELPER_MANAGEMENT_FAILED": "The AGH extension operation did not finish. Check its status or policy in Settings.",
  "error.SESSION_TITLE_INVALID": "A title must be 1–80 characters on one visible line."
};
var zh4 = {
  "error.E_ADMIN_ORIGIN": "管理请求来源无效。",
  "error.E_ADMIN_RESPONSE": "后台返回的数据无法确认。",
  "error.E_ADMIN_BACKEND": "操作未确认，请查询状态或重新连接后台。",
  "error.E_ADMIN_ROUTE": "管理操作不存在。",
  "error.E_ADMIN_REQUEST": "管理参数无效。",
  "error.E_ADMIN_SCOPE": "管理请求不属于当前配置。",
  "error.E_ADMIN_READ_ONLY": "当前为只读恢复模式。",
  "error.E_RESOURCE_ADMIN_ORIGIN": "资源管理请求来源无效。",
  "error.E_RESOURCE_ADMIN_ROUTE": "资源管理操作不存在。",
  "error.E_RESOURCE_ADMIN_REQUEST": "资源管理参数无效。",
  "error.E_RESOURCE_ADMIN_SCOPE": "资源管理请求不属于当前配置。",
  "error.E_RESOURCE_ADMIN_READ_ONLY": "当前为只读恢复模式。",
  "error.E_RESOURCE_ADMIN_RESPONSE": "后台返回的数据无法确认。",
  "error.E_RESOURCE_ADMIN_BODY_TOO_LARGE": "资源管理请求体超过大小限制。",
  "error.E_RESOURCE_UNSUPPORTED": "当前后台版本不支持此资源管理能力。",
  "error.E_RESOURCE_ADMIN_BACKEND": "操作未确认，请查询状态或重新连接后台。",
  "error.SKILL_SOURCE_MANAGED": "此 Skill 由插件提供，请通过插件管理移除。",
  "error.SKILL_DELETE_PREFLIGHT_FAILED": "删除预检未通过，未更改 Skill 状态。请检查路径、版本和本机删除能力；Windows 网络共享路径暂不支持。",
  "error.SKILL_STALE": "Skill 来源尚未成功刷新，请先刷新后重试。",
  "error.SKILL_REMOVED": "此 Skill 已进入永久删除流程，不能重新启用。",
  "error.RESOURCE_BUSY": "此 Skill 正在处理另一项操作，请等待完成。",
  "error.SKILL_DELETE_NOT_CANCELLABLE": "永久删除开始后不能取消。",
  "error.REVISION_CONFLICT": "资源已被另一项操作更新，请刷新后核对最新版本。",
  "error.MCP_NOT_FOUND": "MCP 定义不存在或已被移除。",
  "error.RESOURCE_OPERATION_UNAVAILABLE": "操作不存在，或当前账户无权查看该操作。",
  "error.RESOURCE_OPERATION_OWNER_REQUIRED": "只能取消自己发起的资源操作。",
  "error.RESOURCE_RECONCILE_FAILED": "后台未能安全应用资源状态，请查看最新状态。",
  "error.SKILL_REMOVAL_PENDING": "永久删除尚未完成；已阻止重新启用，可排除文件占用后重试删除。",
  "error.HELPER_MANAGEMENT_FAILED": "AGH 扩展操作未完成，请检查设置中的状态或策略。",
  "error.SESSION_TITLE_INVALID": "标题需为 1–80 个字符的单行可见文本。"
};
var serverErrorCatalog = { en: { ...en4 }, "zh-CN": { ...zh4 } };

// src/region-slots.ts
import {
  ClientResourceReclaimedError,
  dshSlotSpec,
  SlotOutlet as SlotOutlet4,
  SlotsProvider as SlotsProvider4
} from "@agnes/web-client";
import { ConversationUsage as ConversationUsage2, DocumentPreview } from "@agnes/web-ui/assistant-ui";
import { createElement as createElement19, useLayoutEffect as useLayoutEffect10, useMemo as useMemo2, useState as useState5 } from "react";
import { flushSync as flushSync8 } from "react-dom";

// src/client-modules/timeline-slot.ts
import {
  SlotOutlet,
  SlotsProvider
} from "@agnes/web-client";
import { createElement as createElement12 } from "react";
var cardContext;
function bindSlotCardContext(context) {
  cardContext = context;
}
function getSlotCardContext() {
  return cardContext;
}
var roots = /* @__PURE__ */ new WeakMap();
function releaseSlotCard(element3) {
  const entry = roots.get(element3);
  if (!entry) return;
  roots.delete(element3);
  queueMicrotask(() => entry.root.unmount());
}
function mountSlotCard(options) {
  const element3 = document.createElement("div");
  element3.setAttribute("data-slot-node", options.node.fill.slot);
  element3.setAttribute("data-agnes-region", "slot-card");
  const context = options.context;
  if (!context) {
    element3.setAttribute("data-slot-state", "empty");
    element3.textContent = cardContext?.locale?.t("slot.notReady") ?? "Plugin for this card is not ready";
    return {
      element: element3,
      update(next) {
        element3.setAttribute("data-slot-node", next.fill.slot);
      },
      dispose() {
      }
    };
  }
  const root = createAntdRoot(element3);
  roots.set(element3, { root, node: options.node });
  render(root, context, options.node);
  return {
    element: element3,
    update(next) {
      const entry = roots.get(element3);
      if (!entry) return;
      entry.node = next;
      render(root, context, next);
    },
    dispose() {
      releaseSlotCard(element3);
    }
  };
}
function render(root, context, node) {
  const outletProps = {
    name: "tool.card.inline",
    props: { fill: { slot: node.fill.slot, extId: node.fill.extId, payload: node.fill.payload } },
    filterEntry: (entry) => context.claim(entry, node.fill.extId)
  };
  root.render(
    createElement12(
      SlotsProvider,
      { registry: context.registry },
      createElement12(
        SlotOutlet,
        outletProps
      )
    )
  );
}
function observeSlotCards(container) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const removed of mutation.removedNodes) {
        if (removed instanceof HTMLElement && roots.has(removed)) releaseSlotCard(removed);
        if (removed instanceof HTMLElement) {
          removed.querySelectorAll("[data-slot-node]").forEach((child) => {
            releaseSlotCard(child);
          });
        }
      }
    }
  });
  observer.observe(container, { childList: true, subtree: true });
  return () => observer.disconnect();
}

// src/model-picker.ts
import { createElement as createElement13 } from "react";
var viewportPadding = 12;
var listWidth = 320;
var listHeight = 416;
var submenuWidth = 280;
var hoverCloseDelay = 240;
function sameOption(left, right) {
  return left?.route === right?.route && left?.id === right?.id;
}
function sameOptions(left, right) {
  return left.length === right.length && left.every((option2, index) => sameOption(option2, right[index]) && option2.label === right[index]?.label);
}
function sameLevelMap(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}
function sameSettings(left, right) {
  return left?.thinking === right?.thinking && left?.contextWindow === right?.contextWindow && left?.capacity === right?.capacity && sameLevelMap(left?.thinkingLevelMap, right?.thinkingLevelMap);
}
function sameState(left, right) {
  return left.accessibleName === right.accessibleName && left.disabled === right.disabled && left.label === right.label && left.pending === right.pending && sameOption(left.selected, right.selected) && sameOptions(left.options, right.options) && sameSettings(left.settings, right.settings);
}
function modelOption(option2, index, state, activeIndex, openedIndex, selecting, onSelect, onHover) {
  return createElement13(
    "div",
    {
      id: `model-picker-option-${index}`,
      key: `${option2.route}:${option2.id}`,
      className: "model-picker-option",
      role: "option",
      "aria-selected": sameOption(option2, state.selected),
      "aria-disabled": state.pending || selecting,
      // 详情子菜单开着的那一行保持高亮，一眼能看出右边那块是从哪来的。
      "data-active": index === activeIndex,
      "data-open": index === openedIndex,
      onClick: () => onSelect(index),
      // 悬停即展开这一行的会话设置；点选仍然是切换模型。
      onMouseEnter: () => onHover(index)
    },
    createElement13("span", { className: "model-picker-model" }, option2.id),
    createElement13(
      "span",
      { className: "model-picker-route" },
      option2.label ?? tr("settings.modelPicker.configuredAccount")
    )
  );
}
function modelOptions(state, activeIndex, openedIndex, selecting, onSelect, onHover) {
  return state.options.map(
    (option2, index) => modelOption(option2, index, state, activeIndex, openedIndex, selecting, onSelect, onHover)
  );
}
function detailRow(options) {
  const { id, label: label2, value, active, nested, onOpen, onHover } = options;
  return createElement13(
    "div",
    {
      id,
      key: id,
      className: "model-picker-detail-row",
      role: nested ? "button" : void 0,
      tabIndex: nested ? -1 : void 0,
      "aria-haspopup": nested ? "listbox" : void 0,
      "data-active": active,
      "data-nested": nested,
      onClick: onOpen,
      onMouseEnter: onHover
    },
    createElement13("span", { className: "model-picker-detail-label" }, label2),
    createElement13("span", { className: "model-picker-detail-value" }, value),
    nested ? createElement13(
      "svg",
      {
        className: "icon model-picker-chevron",
        "data-agnes-region": "icon",
        viewBox: "0 0 24 24",
        "aria-hidden": true
      },
      createElement13("path", { d: "m9 6 6 6-6 6" })
    ) : void 0
  );
}
function levelOption(option2, index, active, selected, busy, onSelect) {
  return createElement13(
    "div",
    {
      id: `model-level-option-${index}`,
      key: option2.value || "auto",
      className: "model-picker-level",
      role: "option",
      "aria-selected": selected,
      "aria-disabled": busy,
      "data-active": active,
      onClick: onSelect
    },
    option2.label
  );
}
function createModelPicker(options) {
  const { trigger } = options;
  let state = {
    accessibleName: "",
    disabled: true,
    label: tr("settings.modelPicker.select"),
    options: [],
    pending: false
  };
  let activeIndex = 0;
  let detailActive = 0;
  let leafActive = 0;
  let openedIndex;
  let leafKind;
  let budgetDraft = "";
  let committedBudget = "";
  let interaction = 0;
  let selecting = false;
  let selectingFromPointer = false;
  let popover;
  let help;
  let listbox;
  let detailPanel;
  let leafPanel;
  let budgetInput;
  let hoverCloseTimer;
  function isUnavailable() {
    return state.disabled || state.pending || selecting || state.options.length === 0;
  }
  function busy() {
    return state.pending || selecting;
  }
  function detailValues() {
    const option2 = openedIndex === void 0 ? void 0 : state.options[openedIndex];
    if (!option2) return void 0;
    if (sameOption(option2, state.selected) && state.settings) {
      const settings2 = state.settings;
      return {
        option: option2,
        current: true,
        capacity: settings2.capacity,
        ...settings2.contextWindow === void 0 ? {} : { contextWindow: settings2.contextWindow },
        ...settings2.thinking ? { thinking: settings2.thinking } : {},
        ...settings2.thinkingLevelMap ? { thinkingLevelMap: settings2.thinkingLevelMap } : {}
      };
    }
    if (option2.contextWindow === void 0) return void 0;
    const defaults = option2.defaultSettings;
    return {
      option: option2,
      current: false,
      capacity: option2.contextWindow,
      contextWindow: defaults?.contextWindow ?? option2.contextWindow,
      ...defaults?.thinking ? { thinking: defaults.thinking } : {},
      ...option2.thinkingLevelMap ? { thinkingLevelMap: option2.thinkingLevelMap } : {}
    };
  }
  function canShowDetail(index) {
    if (options.onSettingsChange === void 0) return false;
    const option2 = state.options[index];
    if (!option2) return false;
    if (sameOption(option2, state.selected) && state.settings) return true;
    return option2.contextWindow !== void 0;
  }
  function settingsAvailable() {
    return detailValues() !== void 0;
  }
  function setTrigger() {
    trigger.disabled = isUnavailable();
    trigger.setAttribute("aria-expanded", String(popover !== void 0));
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-label", state.accessibleName);
    trigger.title = state.accessibleName;
    trigger.setAttribute("aria-busy", String(busy()));
    const label2 = trigger.querySelector("[data-model-label]");
    if (label2) label2.textContent = state.label;
    else trigger.textContent = state.label;
  }
  function levels() {
    const map = detailValues()?.thinkingLevelMap;
    return map ? modelThinkingOptions(map, tr) : [];
  }
  function hasThinkingRow() {
    return settingsAvailable() && levels().length > 1;
  }
  function unavailableThinking() {
    const saved = detailValues()?.thinking;
    if (!saved) return void 0;
    return levels().some((option2) => option2.value === saved) ? void 0 : saved;
  }
  function selectedThinking() {
    return unavailableThinking() ? void 0 : detailValues()?.thinking ?? "";
  }
  function thinkingLabel() {
    const option2 = levels().find((entry) => entry.value === selectedThinking());
    return option2?.value ? option2.label.replace(/ · .*$/, "") : tr("modelSettings.presetAuto");
  }
  function budgetLabel() {
    const saved = detailValues()?.contextWindow;
    return saved === void 0 ? tr("modelSettings.presetAuto") : contextBudgetLabel(saved);
  }
  function selectedIndex() {
    const selected = state.options.findIndex((option2) => sameOption(option2, state.selected));
    return selected >= 0 ? selected : 0;
  }
  function activeOptionId() {
    return `model-picker-option-${activeIndex}`;
  }
  function renderList() {
    if (!listbox) return;
    activeIndex = Math.min(Math.max(activeIndex, 0), Math.max(state.options.length - 1, 0));
    listbox.setAttribute("aria-busy", String(busy()));
    if (state.options.length) listbox.setAttribute("aria-activedescendant", activeOptionId());
    else listbox.removeAttribute("aria-activedescendant");
    if (help) {
      help.hidden = state.selected !== void 0;
      help.textContent = tr("settings.modelPicker.help");
    }
    renderRegion(
      listbox,
      modelOptions(
        state,
        activeIndex,
        openedIndex,
        selecting,
        (index) => {
          selectingFromPointer = true;
          void select(index);
          queueMicrotask(() => {
            selectingFromPointer = false;
          });
        },
        (index) => {
          if (isUnavailable() || openedIndex === index) return;
          if (canShowDetail(index)) openDetail(index, { focus: false });
          else closeDetail();
        }
      )
    );
  }
  function detailRows() {
    const rows = [];
    if (hasThinkingRow()) rows.push({ id: "model-detail-thinking", kind: "thinking" });
    if (settingsAvailable()) rows.push({ id: "model-detail-budget", kind: "budget" });
    return rows;
  }
  function renderDetail() {
    const values = detailValues();
    if (!detailPanel || !values) return;
    const rows = detailRows();
    detailActive = Math.min(Math.max(detailActive, 0), Math.max(rows.length - 1, 0));
    const saved = unavailableThinking();
    renderRegion(detailPanel, [
      createElement13("p", { key: "title", className: "model-picker-detail-title" }, values.option.id),
      // 模型容量只读，对应参考里「消耗速度 0.89x倍率」那一行的位置。
      detailRow({
        id: "model-detail-capacity",
        label: tr("modelSettings.capacityLabel"),
        value: contextBudgetLabel(values.capacity),
        active: false,
        nested: false,
        // 移到只读行上说明不在挑参数了，收起第三级。
        onHover: () => closeLeaf()
      }),
      ...rows.map(
        (row, index) => detailRow({
          id: row.id,
          label: row.kind === "thinking" ? tr("modelSettings.thinkingLabel") : tr("modelSettings.windowLabel"),
          value: row.kind === "thinking" ? thinkingLabel() : budgetLabel(),
          active: index === detailActive,
          nested: true,
          onOpen: () => openLeaf(row.kind),
          // 悬停同样展开这一项的候选项，鼠标在两行之间移动时直接换第三级。
          onHover: () => openLeaf(row.kind, { focus: false })
        })
      ),
      createElement13(
        "p",
        {
          key: "notice",
          className: "model-picker-notice",
          hidden: saved === void 0
        },
        saved === void 0 ? "" : tr("modelSettings.savedThinkingUnavailable", { value: saved })
      )
    ]);
  }
  function budgetCheck() {
    const values = detailValues();
    if (!values) return { valid: true, message: "" };
    const raw = budgetDraft.trim();
    if (raw === "") return { valid: true, message: "" };
    const tokens = parseContextBudget(raw);
    const minimum = minimumContextBudget(values.capacity);
    if (tokens === void 0 || tokens < minimum || tokens > values.capacity)
      return {
        valid: false,
        message: tr("modelSettings.windowRange", {
          min: minimum.toLocaleString("en-US"),
          max: values.capacity.toLocaleString("en-US")
        })
      };
    return { tokens, valid: true, message: "" };
  }
  function renderLeaf() {
    const values = detailValues();
    if (!leafPanel || !values || !leafKind) return;
    const busyNow = busy();
    const capacity = values.capacity.toLocaleString("en-US");
    budgetInput = void 0;
    if (leafKind === "thinking") {
      const list2 = levels();
      const selected2 = selectedThinking();
      leafActive = Math.min(Math.max(leafActive, 0), Math.max(list2.length - 1, 0));
      renderRegion(leafPanel, [
        createElement13(
          "div",
          {
            key: "levels",
            id: "session-model-thinking",
            className: "model-picker-list",
            role: "listbox",
            tabIndex: -1,
            "aria-label": tr("modelSettings.thinkingLabel"),
            "aria-activedescendant": `model-level-option-${leafActive}`
          },
          list2.map(
            (option2, index) => levelOption(
              option2,
              index,
              index === leafActive,
              selected2 !== void 0 && option2.value === selected2,
              busyNow,
              () => void applyThinking(option2.value)
            )
          )
        )
      ]);
      return;
    }
    const presets = [
      { label: tr("modelSettings.presetAuto"), value: "" },
      ...contextBudgetPresets(values.capacity).map((preset) => ({
        label: contextBudgetLabel(preset),
        value: String(preset)
      }))
    ];
    const check = budgetCheck();
    const selected = budgetDraft.trim() === "" ? "" : check.valid ? String(check.tokens) : void 0;
    leafActive = Math.min(Math.max(leafActive, 0), Math.max(presets.length - 1, 0));
    renderRegion(leafPanel, [
      createElement13(
        "div",
        {
          key: "presets",
          id: "session-model-budget",
          className: "model-picker-list",
          role: "listbox",
          tabIndex: -1,
          "aria-label": tr("modelSettings.windowLabel"),
          "aria-activedescendant": `model-level-option-${leafActive}`
        },
        presets.map(
          (option2, index) => levelOption(
            option2,
            index,
            index === leafActive,
            selected !== void 0 && option2.value === selected,
            busyNow,
            () => void applyBudget(option2.value)
          )
        )
      ),
      createElement13("input", {
        key: "custom",
        id: "session-model-window",
        className: "model-picker-budget",
        type: "text",
        maxLength: 32,
        autoComplete: "off",
        value: budgetDraft,
        disabled: state.disabled || busyNow,
        placeholder: tr("modelSettings.windowPlaceholder", { tokens: capacity }),
        "aria-label": tr("modelSettings.customAria"),
        "aria-invalid": String(!check.valid),
        "aria-describedby": "session-model-window-hint session-model-settings-error",
        // 逐字符提交会让每次按键都发一次 setModel；回车或离开输入框才算一次确定输入。
        onChange: (event) => {
          budgetDraft = event.currentTarget.value;
          renderLeaf();
        },
        onBlur: (event) => {
          const focusTarget = event.relatedTarget;
          if (leafPanel?.contains(focusTarget) || detailPanel?.contains(focusTarget)) return;
          void applyBudget(budgetDraft);
        }
      }),
      createElement13(
        "p",
        { key: "hint", id: "session-model-window-hint", className: "model-picker-hint" },
        tr("modelSettings.windowHint", { tokens: capacity })
      ),
      createElement13(
        "p",
        {
          key: "error",
          id: "session-model-settings-error",
          className: "model-picker-error",
          role: "alert"
        },
        check.valid ? "" : check.message
      )
    ]);
    budgetInput = leafPanel.querySelector("#session-model-window") ?? void 0;
  }
  function renderPanels() {
    renderList();
    renderDetail();
    renderLeaf();
  }
  function resetBudgetDraft() {
    const saved = detailValues()?.contextWindow;
    budgetDraft = saved === void 0 ? "" : String(saved);
    committedBudget = budgetDraft.trim();
  }
  function position() {
    if (!popover) return;
    positionPopover(trigger, popover, {
      preferredWidth: listWidth,
      preferredHeight: listHeight,
      viewportPadding,
      width: "content"
    });
    const anchor = openedIndex === void 0 ? void 0 : listbox?.querySelector(`#model-picker-option-${openedIndex}`);
    if (detailPanel && anchor)
      positionSubmenu(anchor, popover, detailPanel, {
        preferredWidth: submenuWidth,
        preferredHeight: window.innerHeight,
        viewportPadding
      });
    const rowId = leafKind === "thinking" ? "model-detail-thinking" : "model-detail-budget";
    const rowAnchor = detailPanel?.querySelector(`#${rowId}`);
    if (leafPanel && detailPanel && rowAnchor)
      positionSubmenu(rowAnchor, detailPanel, leafPanel, {
        preferredWidth: submenuWidth,
        preferredHeight: window.innerHeight,
        viewportPadding
      });
  }
  function openDetail(index, options2 = {}) {
    cancelDetailClose();
    if (!popover || !canShowDetail(index)) return;
    if (detailPanel && openedIndex === index) return;
    closeLeaf();
    openedIndex = index;
    detailActive = 0;
    resetBudgetDraft();
    if (!detailPanel) {
      detailPanel = createRegionHost(document.body, "section", "model-picker");
      detailPanel.id = "model-settings-popover";
      detailPanel.setAttribute("aria-label", tr("modelSettings.detailAria"));
      detailPanel.addEventListener("keydown", detailKeydown);
      detailPanel.addEventListener("mouseenter", cancelDetailClose);
      detailPanel.addEventListener("mouseleave", scheduleDetailClose);
    }
    renderList();
    renderDetail();
    position();
    if (options2.focus !== false) focusDetail();
  }
  function scheduleDetailClose() {
    if (hoverCloseTimer !== void 0 || !detailPanel) return;
    hoverCloseTimer = window.setTimeout(() => {
      hoverCloseTimer = void 0;
      closeLeaf(false);
      closeDetail();
    }, hoverCloseDelay);
  }
  function cancelDetailClose() {
    if (hoverCloseTimer === void 0) return;
    window.clearTimeout(hoverCloseTimer);
    hoverCloseTimer = void 0;
  }
  function openLeaf(kind, options2 = {}) {
    if (!detailPanel) return;
    cancelDetailClose();
    if (leafPanel && leafKind === kind) return;
    leafKind = kind;
    leafActive = kind === "thinking" ? Math.max(
      0,
      levels().findIndex((o) => o.value === selectedThinking())
    ) : 0;
    if (kind === "budget") {
      resetBudgetDraft();
      leafActive = Math.max(
        0,
        [""].concat(contextBudgetPresets(detailValues()?.capacity ?? 0).map(String)).indexOf(budgetDraft.trim())
      );
    }
    if (!leafPanel) {
      leafPanel = createRegionHost(document.body, "section", "model-picker model-picker-submenu");
      leafPanel.id = "model-settings-options-popover";
      leafPanel.addEventListener("keydown", leafKeydown);
      leafPanel.addEventListener("mouseenter", cancelDetailClose);
      leafPanel.addEventListener("mouseleave", scheduleDetailClose);
    }
    leafPanel.setAttribute(
      "aria-label",
      kind === "thinking" ? tr("modelSettings.thinkingLabel") : tr("modelSettings.windowLabel")
    );
    renderLeaf();
    position();
    requestAnimationFrame(position);
    if (options2.focus !== false) focusLeaf();
  }
  function closeLeaf(reposition = true) {
    if (!leafPanel) return;
    leafPanel.remove();
    leafPanel = void 0;
    leafKind = void 0;
    budgetInput = void 0;
    if (reposition) position();
  }
  function closeDetail() {
    closeLeaf(false);
    if (!detailPanel) return;
    detailPanel.remove();
    detailPanel = void 0;
    openedIndex = void 0;
    renderList();
  }
  function backToDetail() {
    if (leafPanel) {
      closeLeaf();
      focusDetail();
      return;
    }
    closeDetail();
    listbox?.focus({ preventScroll: true });
  }
  function close(closeOptions = {}) {
    interaction += 1;
    selecting = false;
    cancelDetailClose();
    const wasOpen = popover !== void 0;
    closeLeaf(false);
    closeDetail();
    if (help) unmountRegion(help);
    if (listbox) unmountRegion(listbox);
    popover?.remove();
    popover = void 0;
    help = void 0;
    listbox = void 0;
    budgetDraft = "";
    committedBudget = "";
    trigger.removeAttribute("aria-controls");
    setTrigger();
    if (wasOpen && closeOptions.returnFocus) trigger.focus({ preventScroll: true });
  }
  function focusDetail() {
    renderDetail();
    const row = detailRows()[detailActive];
    if (row) detailPanel?.querySelector(`#${row.id}`)?.focus({ preventScroll: true });
  }
  function focusLeaf() {
    renderLeaf();
    leafPanel?.querySelector('[role="listbox"]')?.focus({ preventScroll: true });
  }
  function setActive(index) {
    if (!listbox || !state.options.length) return;
    activeIndex = (index + state.options.length) % state.options.length;
    listbox.setAttribute("aria-activedescendant", activeOptionId());
    renderList();
    listbox.querySelector(`#${activeOptionId()}`)?.scrollIntoView({ block: "nearest" });
    if (!detailPanel) return;
    if (canShowDetail(activeIndex)) openDetail(activeIndex, { focus: false });
    else closeDetail();
  }
  function setDetailActive(index) {
    const rows = detailRows();
    if (!rows.length) return;
    detailActive = (index + rows.length) % rows.length;
    focusDetail();
  }
  function setLeafActive(index) {
    const count = leafKind === "thinking" ? levels().length : 1 + contextBudgetPresets(detailValues()?.capacity ?? 0).length;
    if (!count) return;
    leafActive = (index + count) % count;
    const list2 = leafPanel?.querySelector('[role="listbox"]');
    list2?.setAttribute("aria-activedescendant", `model-level-option-${leafActive}`);
    renderLeaf();
    list2?.querySelector(`#model-level-option-${leafActive}`)?.scrollIntoView({ block: "nearest" });
  }
  function draftSettings(thinking) {
    if (!detailValues() || !budgetCheck().valid) return void 0;
    const tokens = budgetDraft.trim() === "" ? void 0 : parseContextBudget(budgetDraft);
    return {
      ...thinking ? { thinking } : {},
      ...tokens === void 0 ? {} : { contextWindow: tokens }
    };
  }
  async function commitSettings(next) {
    const values = detailValues();
    if (!values) return false;
    if (!values.current && !await select(state.options.indexOf(values.option))) return false;
    return applySettings(next);
  }
  async function applySettings(next) {
    const change = options.onSettingsChange;
    if (!change || state.disabled || busy()) return false;
    const request = ++interaction;
    selecting = true;
    setTrigger();
    renderPanels();
    try {
      return await change(next);
    } catch (error) {
      if (request === interaction) options.onError(error);
      return false;
    } finally {
      if (request === interaction && popover) {
        selecting = false;
        setTrigger();
        renderPanels();
      }
    }
  }
  async function applyThinking(value) {
    if (value === selectedThinking() && budgetDraft.trim() === committedBudget && detailValues()?.current === true) {
      close({ returnFocus: true });
      return;
    }
    const next = draftSettings(value);
    if (!next) {
      renderLeaf();
      return;
    }
    if (await commitSettings(next)) close({ returnFocus: true });
  }
  async function applyBudget(raw) {
    if (raw.trim() === committedBudget && detailValues()?.current === true) {
      close({ returnFocus: true });
      return;
    }
    budgetDraft = raw;
    const next = draftSettings(selectedThinking() ?? "");
    if (!next) {
      renderLeaf();
      return;
    }
    if (await commitSettings(next)) {
      committedBudget = raw.trim();
      close({ returnFocus: true });
    }
  }
  async function select(index) {
    if (isUnavailable()) return false;
    const option2 = state.options[index];
    if (!option2) return false;
    if (sameOption(option2, state.selected) && settingsAvailable()) {
      openDetail(index);
      return true;
    }
    const request = ++interaction;
    selecting = true;
    setTrigger();
    renderPanels();
    try {
      const accepted = await options.onSelect(option2);
      if (request !== interaction) return false;
      if (accepted) {
        if (canShowDetail(index)) openDetail(index);
        else close({ returnFocus: true });
      }
      return accepted;
    } catch (error) {
      if (request === interaction) options.onError(error);
      return false;
    } finally {
      if (request === interaction && popover) {
        selecting = false;
        setTrigger();
        renderPanels();
      }
    }
  }
  function dismissOrBack(event, back) {
    if (event.key === "Escape") {
      event.preventDefault();
      close({ returnFocus: true });
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      back();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      close({ returnFocus: true });
    }
  }
  function listKeydown(event) {
    if (event.defaultPrevented) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : state.options.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
      event.preventDefault();
      void select(activeIndex);
      return;
    }
    dismissOrBack(event, () => {
    });
  }
  function detailKeydown(event) {
    if (event.defaultPrevented) return;
    const rows = detailRows();
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setDetailActive(detailActive + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
      const row = rows[detailActive];
      if (!row) return;
      event.preventDefault();
      openLeaf(row.kind);
      return;
    }
    dismissOrBack(event, backToDetail);
  }
  function leafKeydown(event) {
    if (event.defaultPrevented) return;
    if (event.target === budgetInput) {
      if (event.key === "Enter") {
        event.preventDefault();
        void applyBudget(budgetInput?.value ?? "");
      } else if (event.key === "Escape") {
        event.preventDefault();
        close({ returnFocus: true });
      } else if (event.key === "Tab") {
        event.preventDefault();
        leafPanel?.querySelector('[role="listbox"]')?.focus({ preventScroll: true });
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setLeafActive(leafActive + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (leafKind === "thinking") void applyThinking(levels()[leafActive]?.value ?? "");
      else
        void applyBudget(
          leafActive === 0 ? "" : String(contextBudgetPresets(state.settings?.capacity ?? 0)[leafActive - 1] ?? "")
        );
      return;
    }
    if (event.key === "Tab" && leafKind === "budget") {
      event.preventDefault();
      budgetInput?.focus({ preventScroll: true });
      return;
    }
    dismissOrBack(event, backToDetail);
  }
  function open3(initialIndex = selectedIndex()) {
    if (popover || isUnavailable()) return;
    interaction += 1;
    activeIndex = Math.min(Math.max(initialIndex, 0), Math.max(state.options.length - 1, 0));
    openedIndex = void 0;
    resetBudgetDraft();
    popover = createRegionHost(document.body, "section", "model-picker");
    popover.id = "model-picker-popover";
    popover.setAttribute("aria-label", tr("settings.modelPicker.aria"));
    help = createRegionHost(popover, "p", "model-picker-help");
    help.dataset.modelPickerHelp = "";
    listbox = createRegionHost(popover, "div", "model-picker-list model-picker-models");
    listbox.id = "model-listbox";
    listbox.setAttribute("role", "listbox");
    listbox.setAttribute("aria-label", tr("settings.modelPicker.listAria"));
    listbox.tabIndex = -1;
    listbox.addEventListener("keydown", listKeydown);
    popover.addEventListener("mouseenter", cancelDetailClose);
    popover.addEventListener("mouseleave", scheduleDetailClose);
    trigger.setAttribute("aria-controls", listbox.id);
    setTrigger();
    renderList();
    setActive(activeIndex);
    position();
    requestAnimationFrame(position);
    listbox.focus({ preventScroll: true });
  }
  function toggle() {
    if (popover) close();
    else open3();
  }
  function triggerKeydown(event) {
    if (isUnavailable()) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      open3(selectedIndex());
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      open3(state.options.length - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      open3(0);
    } else if (event.key === "End") {
      event.preventDefault();
      open3(state.options.length - 1);
    }
  }
  function closeOutside(event) {
    if (!popover || selectingFromPointer) return;
    const path = event.composedPath();
    if (path.includes(popover) || path.includes(trigger)) return;
    if (detailPanel && path.includes(detailPanel)) return;
    if (leafPanel && path.includes(leafPanel)) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (popover.contains(target) || trigger.contains(target)) return;
    if (detailPanel?.contains(target) || leafPanel?.contains(target)) return;
    close();
  }
  trigger.addEventListener("click", toggle);
  trigger.addEventListener("keydown", triggerKeydown);
  document.addEventListener("click", closeOutside);
  window.addEventListener("resize", position);
  document.addEventListener("scroll", position, true);
  return {
    close,
    destroy: () => {
      close();
      trigger.removeEventListener("click", toggle);
      trigger.removeEventListener("keydown", triggerKeydown);
      document.removeEventListener("click", closeOutside);
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
    },
    render: (nextState) => {
      const normalized = { ...nextState, options: [...nextState.options] };
      const changed = !sameState(state, normalized);
      const settingsChanged = !sameSettings(state.settings, normalized.settings);
      state = normalized;
      if (state.disabled && popover) close();
      else if (popover) {
        setTrigger();
        if (settingsChanged) resetBudgetDraft();
        if (openedIndex !== void 0 && !settingsAvailable()) closeDetail();
        if ((changed || settingsChanged) && popover) {
          renderPanels();
          position();
        }
      } else setTrigger();
    }
  };
}

// src/session-menu.ts
var ITEMS = [
  [
    "rename",
    "session.menu.rename",
    [
      "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      "m15 5 4 4"
    ]
  ],
  ["fork", "session.menu.fork", ["M6 3v5a4 4 0 0 0 4 4h8", "m14 8 4 4-4 4", "M6 21v-5a4 4 0 0 1 4-4"]],
  [
    "archive",
    "session.menu.archive",
    ["M3 4h18v4H3z", "M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8", "M10 12h4"]
  ]
];
function icon2(paths) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const data of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", data);
    svg.append(path);
  }
  return svg;
}
var open;
function closeSessionMenu(returnFocus = false) {
  const current2 = open;
  if (!current2) return;
  open = void 0;
  current2.stop();
  current2.panel.remove();
  current2.row?.removeAttribute("data-menu-open");
  current2.trigger.setAttribute("aria-expanded", "false");
  if (returnFocus && current2.trigger.isConnected) current2.trigger.focus({ preventScroll: true });
}
function createSessionMenuTrigger(id, name, t2) {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "session-menu-trigger";
  trigger.dataset.sessionActionId = id;
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", t2("session.menu.triggerAria", { name }));
  trigger.append(icon2(["M5 12h.01", "M12 12h.01", "M19 12h.01"]));
  return trigger;
}
function attachSessionMenu(trigger, select, t2) {
  trigger.addEventListener("click", () => {
    if (open?.trigger === trigger) closeSessionMenu(true);
    else show(trigger, select, t2);
  });
}
function show(trigger, select, t2) {
  closeSessionMenu();
  const label2 = trigger.getAttribute("aria-label") ?? t2("session.menu.label");
  const panel = document.createElement("div");
  panel.className = "session-menu-actions";
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", label2);
  for (const [action, key, paths] of ITEMS) {
    const item = document.createElement("button");
    item.type = "button";
    item.setAttribute("role", "menuitem");
    const caption = document.createElement("span");
    caption.textContent = t2(key);
    item.append(icon2(paths), caption);
    item.addEventListener("click", () => {
      closeSessionMenu(true);
      select(action);
    });
    panel.append(item);
  }
  document.body.append(panel);
  const place = () => positionPopover(trigger, panel, { preferredWidth: 218, preferredHeight: 128, gap: 4 });
  const dismiss = (event) => {
    const target = event.target;
    if (!(target instanceof Node) || panel.contains(target) || trigger.contains(target)) return;
    closeSessionMenu();
  };
  const keydown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeSessionMenu(true);
  };
  const focusout = (event) => {
    if (!(event.relatedTarget instanceof Node) || !panel.contains(event.relatedTarget)) closeSessionMenu();
  };
  document.addEventListener("pointerdown", dismiss);
  document.addEventListener("keydown", keydown);
  document.addEventListener("scroll", place, true);
  window.addEventListener("resize", place);
  panel.addEventListener("focusout", focusout);
  trigger.setAttribute("aria-expanded", "true");
  const row = trigger.closest(".session-row");
  row?.setAttribute("data-menu-open", "true");
  open = {
    panel,
    trigger,
    row,
    stop: () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      panel.removeEventListener("focusout", focusout);
    }
  };
  place();
  panel.querySelector("[role=menuitem]")?.focus({ preventScroll: true });
}

// src/navigation.ts
var FOLDER_CLOSED = "M5.37012 2.8418C5.52719 2.84178 5.68146 2.88387 5.81641 2.96289C5.95148 3.04201 6.06232 3.15581 6.13672 3.29199L6.74414 4.40137H12.7383C13.2166 4.40139 13.6084 4.78249 13.6084 5.25391V12.6631C13.6082 13.1343 13.2165 13.5146 12.7383 13.5146H2.7627C2.28458 13.5146 1.89277 13.1343 1.89258 12.6631V3.69434C1.89258 3.22297 2.28447 2.84189 2.7627 2.8418H5.37012ZM2.83496 11.4932V12.5908H12.667V11.5645H12.666V8.00488L2.84961 7.99121L2.83496 11.4932ZM2.83496 7.06738H12.666V5.32617H6.18066L6.16016 5.28809L5.32715 3.76562H2.83496V7.06738Z";
var FOLDER_OPEN = "M14.8882 7.43937C14.7797 7.27754 14.6048 7.18094 14.4203 7.18094H13.0118V5.05978C13.0118 4.71287 12.7519 4.43062 12.4324 4.43062H7.94002L6.90381 3.20368C6.79449 3.07423 6.63884 3 6.47679 3H2.57931C2.25988 3 2 3.28223 2 3.62914V13.5309C2 13.784 2.19469 13.9892 2.43501 13.9894L12.5436 14C12.7867 14 13.0064 13.8332 13.0902 13.5849L14.9642 8.03053C15.0313 7.83148 15.003 7.61049 14.8882 7.43937ZM2.86667 12.1904V3.91258H6.34273L7.37891 5.1395C7.48823 5.26896 7.64389 5.3432 7.80597 5.3432H12.1451V7.18094H5.33423C5.1065 7.18094 4.89848 7.32662 4.80427 7.5521L2.86667 12.1904V12.1904ZM12.3382 13.0874H3.43876L5.52489 8.0935H14.0232L12.3382 13.0874V13.0874Z";
var PLUS = "M6 1.16797C6.26487 1.16807 6.48024 1.38262 6.48047 1.64746V5.64062H10.4736C10.7383 5.64111 10.9531 5.8563 10.9531 6.12109C10.953 6.38576 10.7382 6.60108 10.4736 6.60156H6.48047V10.5938C6.48046 10.8588 6.265 11.0741 6 11.0742C5.73491 11.0742 5.51954 10.8588 5.51953 10.5938V6.60156H1.52734C1.26235 6.60156 1.04704 6.38605 1.04688 6.12109C1.04688 5.856 1.26225 5.64062 1.52734 5.64062H5.51953V1.64746C5.51976 1.38256 5.73504 1.16797 6 1.16797Z";
function svgIcon(shape, className, viewBox = "0 0 16 16") {
  const icon3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon3.setAttribute("class", className);
  icon3.setAttribute("viewBox", viewBox);
  icon3.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", shape);
  icon3.append(path);
  return icon3;
}
function plusSvg() {
  return svgIcon(PLUS, "icon icon-fill", "0 0 12 12");
}
var folderIcon = () => svgIcon(FOLDER_CLOSED, "icon icon-folder");
function folderPair() {
  return [
    svgIcon(FOLDER_CLOSED, "icon icon-folder icon-folder-closed"),
    svgIcon(FOLDER_OPEN, "icon icon-folder icon-folder-open")
  ];
}
var collapsedGroups = /* @__PURE__ */ new Set();
function renderWorkspaceOptions(container, workspaces, select) {
  container.replaceChildren(
    ...workspaces.map((workspace) => {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.className = "workspace-option";
      choice.dataset.available = String(workspace.available);
      choice.disabled = !workspace.available;
      const copy = document.createElement("span");
      copy.className = "workspace-option-copy";
      const name = document.createElement("span");
      name.className = "workspace-option-name";
      name.textContent = workspace.name;
      const path = document.createElement("span");
      path.className = "workspace-option-path";
      path.textContent = workspace.path;
      copy.append(name, path);
      choice.append(folderIcon(), copy);
      choice.addEventListener("click", () => select(workspace));
      return choice;
    })
  );
}
function renderSessionNavigation(options, t2) {
  const groups = /* @__PURE__ */ new Map();
  for (const workspace of options.workspaces) groups.set(workspace.path, []);
  groups.set("", []);
  for (const session of options.sessions) {
    if (session.archived) continue;
    const row = session;
    (groups.get(row.cwd ?? "") ?? groups.get(""))?.push(row);
  }
  const fragments = [];
  for (const [path, sessions] of groups) {
    if (!sessions.length && !path) continue;
    const group = document.createElement("section");
    group.className = "workspace-group";
    const workspace = options.workspaces.find((entry) => entry.path === path);
    const collapsed = collapsedGroups.has(path);
    const heading2 = document.createElement("button");
    heading2.type = "button";
    heading2.className = "workspace-heading";
    heading2.setAttribute("aria-expanded", String(!collapsed));
    heading2.title = workspace?.path ?? t2("nav.noWorkspaceTitle");
    const name = document.createElement("span");
    name.className = "workspace-name";
    name.textContent = workspace?.name ?? t2("session.uncategorized");
    heading2.append(...folderPair(), name);
    const headingRow = document.createElement("div");
    headingRow.className = "workspace-heading-row";
    headingRow.append(heading2);
    if (workspace) {
      const create = document.createElement("button");
      create.type = "button";
      create.className = "icon-button workspace-new-session";
      create.dataset.workspaceNewSession = workspace.path;
      create.disabled = (options.newDisabled ?? false) || !workspace.available;
      create.setAttribute("aria-label", t2("nav.newSessionInWorkspace", { name: workspace.name }));
      create.title = t2("nav.newSessionInWorkspace", { name: workspace.name });
      create.append(plusSvg());
      create.addEventListener("click", () => options.newSession(workspace));
      if (workspace.path === options.activeWorkspace && !create.disabled)
        queueMicrotask(() => create.focus({ preventScroll: true }));
      headingRow.append(create);
    }
    const children = document.createElement("div");
    children.className = "workspace-sessions";
    children.hidden = collapsed;
    for (const row of sessions) {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.className = row.sessionId === options.currentId ? "session active" : "session";
      choice.disabled = options.disabled ?? false;
      choice.dataset.session = row.sessionId;
      if (row.sessionId === options.currentId) choice.setAttribute("aria-current", "page");
      const title = document.createElement("span");
      title.className = "session-title";
      title.textContent = row.title || options.labels.get(row.sessionId) || t2("nav.sessionFallback", { id: row.sessionId.slice(-8) });
      choice.title = title.textContent;
      choice.append(title);
      choice.addEventListener("click", () => options.open(row.sessionId));
      const item = document.createElement("div");
      item.className = "session-row";
      item.dataset.active = String(row.sessionId === options.currentId);
      item.append(choice);
      if (options.action) {
        const menu = document.createElement("div");
        menu.className = "session-menu";
        const trigger = createSessionMenuTrigger(row.sessionId, title.textContent ?? t2("nav.fallbackName"), t2);
        trigger.disabled = options.disabled ?? false;
        attachSessionMenu(
          trigger,
          (action) => options.action?.(action, row.sessionId, title.textContent ?? t2("nav.fallbackName"), trigger),
          t2
        );
        menu.append(trigger);
        item.append(menu);
      }
      children.append(item);
      if (row.sessionId === options.activeId) queueMicrotask(() => choice.focus({ preventScroll: true }));
    }
    heading2.addEventListener("click", () => {
      const expanded = heading2.getAttribute("aria-expanded") === "true";
      heading2.setAttribute("aria-expanded", String(!expanded));
      children.hidden = expanded;
      if (expanded) collapsedGroups.add(path);
      else collapsedGroups.delete(path);
    });
    group.append(headingRow, children);
    fragments.push(group);
  }
  closeSessionMenu();
  options.nav.replaceChildren(...fragments);
  if (options.next && options.loadMore) {
    const next = options.next;
    const more = document.createElement("button");
    more.type = "button";
    more.textContent = t2("nav.loadMore");
    more.disabled = options.disabled ?? false;
    more.addEventListener("click", () => options.loadMore?.(next));
    options.nav.append(more);
  }
}

// src/permission-picker.ts
import { createElement as createElement14 } from "react";
var PERMISSION_OPTION_LABEL_KEYS = {
  view: "settings.picker.view",
  workspace: "settings.picker.workspace",
  full: "settings.picker.full"
};
var PERMISSION_OPTION_DESCRIPTION_KEYS = {
  view: "settings.picker.viewDescription",
  workspace: "settings.picker.workspaceDescription",
  full: "settings.picker.fullDescription"
};
var PERMISSION_OPTIONS = [
  {
    id: "view",
    label: PERMISSION_OPTION_LABEL_KEYS.view,
    description: PERMISSION_OPTION_DESCRIPTION_KEYS.view
  },
  {
    id: "workspace",
    label: PERMISSION_OPTION_LABEL_KEYS.workspace,
    description: PERMISSION_OPTION_DESCRIPTION_KEYS.workspace
  },
  {
    id: "full",
    label: PERMISSION_OPTION_LABEL_KEYS.full,
    description: PERMISSION_OPTION_DESCRIPTION_KEYS.full
  }
];
function permissionLabel(mode) {
  if (mode === null) return tr("settings.picker.choosePermission");
  return tr(PERMISSION_OPTION_LABEL_KEYS[mode] ?? PERMISSION_OPTION_LABEL_KEYS.workspace);
}
function yoloEnabled(mode) {
  return mode === "full";
}
var viewportPadding2 = 12;
function permissionOption(option2, index, state, activeIndex, onSelect) {
  return createElement14(
    "div",
    {
      id: `permission-picker-option-${index}`,
      key: option2.id,
      className: "permission-picker-option",
      role: "option",
      "aria-selected": option2.id === state.selected,
      "aria-disabled": state.pending,
      "data-active": index === activeIndex,
      onClick: () => onSelect(index)
    },
    createElement14("span", { className: "permission-picker-check" }, option2.id === state.selected ? "✓" : ""),
    createElement14(
      "span",
      { className: "permission-picker-copy" },
      createElement14("span", { className: "permission-picker-label" }, option2.label),
      createElement14("span", { className: "permission-picker-hint" }, option2.description)
    )
  );
}
function permissionOptions(state, activeIndex, onSelect) {
  return PERMISSION_OPTIONS.map(
    (option2, index) => permissionOption(
      {
        ...option2,
        label: tr(PERMISSION_OPTION_LABEL_KEYS[option2.id]),
        description: tr(PERMISSION_OPTION_DESCRIPTION_KEYS[option2.id])
      },
      index,
      state,
      activeIndex,
      onSelect
    )
  );
}
function createPermissionPicker(options) {
  const { trigger } = options;
  let state = { disabled: true, pending: false, selected: "workspace" };
  let activeIndex = 1;
  let interaction = 0;
  let selecting = false;
  let selectingFromPointer = false;
  let popover;
  let listbox;
  function selectedIndex() {
    const index = PERMISSION_OPTIONS.findIndex((option2) => option2.id === state.selected);
    return index >= 0 ? index : 1;
  }
  function setTrigger() {
    trigger.disabled = state.disabled || state.pending || selecting;
    trigger.setAttribute("aria-expanded", String(popover !== void 0));
    trigger.setAttribute("aria-busy", String(state.pending || selecting));
    trigger.title = permissionLabel(state.selected);
    const label2 = trigger.querySelector("[data-permission-label]");
    if (label2) label2.textContent = permissionLabel(state.selected);
  }
  function renderOptions() {
    if (!listbox) return;
    listbox.setAttribute("aria-activedescendant", `permission-picker-option-${activeIndex}`);
    listbox.setAttribute("aria-busy", String(state.pending || selecting));
    renderRegion(
      listbox,
      permissionOptions(state, activeIndex, (index) => {
        selectingFromPointer = true;
        void select(index);
        queueMicrotask(() => {
          selectingFromPointer = false;
        });
      })
    );
  }
  function position() {
    if (!popover) return;
    positionPopover(trigger, popover, { preferredWidth: 360, preferredHeight: 220, viewportPadding: viewportPadding2 });
  }
  function close(closeOptions = {}) {
    interaction += 1;
    selecting = false;
    const wasOpen = popover !== void 0;
    if (listbox) unmountRegion(listbox);
    popover?.remove();
    popover = void 0;
    listbox = void 0;
    trigger.removeAttribute("aria-controls");
    setTrigger();
    if (wasOpen && closeOptions.returnFocus) trigger.focus({ preventScroll: true });
  }
  function setActive(index) {
    if (!listbox) return;
    activeIndex = (index + PERMISSION_OPTIONS.length) % PERMISSION_OPTIONS.length;
    listbox.setAttribute("aria-activedescendant", `permission-picker-option-${activeIndex}`);
    renderOptions();
  }
  async function select(index) {
    if (state.disabled || state.pending || selecting) return;
    const option2 = PERMISSION_OPTIONS[index];
    if (!option2) return;
    const request = ++interaction;
    selecting = true;
    setTrigger();
    renderOptions();
    try {
      const accepted = await options.onSelect(option2.id);
      if (request !== interaction) return;
      if (accepted) close({ returnFocus: document.activeElement === listbox });
    } catch (error) {
      if (request === interaction) options.onError(error);
    } finally {
      if (request === interaction && popover) {
        selecting = false;
        setTrigger();
        renderOptions();
      }
    }
  }
  function open3() {
    if (popover || state.disabled || state.pending || selecting) return;
    interaction += 1;
    activeIndex = selectedIndex();
    popover = createRegionHost(document.body, "section", "permission-picker");
    popover.id = "permission-picker-popover";
    popover.setAttribute("aria-label", tr("settings.picker.aria"));
    listbox = createRegionHost(popover, "div", "permission-picker-list");
    listbox.id = "permission-listbox";
    listbox.setAttribute("role", "listbox");
    listbox.setAttribute("aria-label", tr("settings.picker.listAria"));
    listbox.tabIndex = -1;
    bindListboxKeys(listbox, (intent) => {
      if (intent.kind === "move") setActive(activeIndex + intent.delta);
      else if (intent.kind === "first") setActive(0);
      else if (intent.kind === "last") setActive(PERMISSION_OPTIONS.length - 1);
      else if (intent.kind === "activate") void select(activeIndex);
      else close({ returnFocus: intent.returnFocus });
    });
    trigger.setAttribute("aria-controls", listbox.id);
    setTrigger();
    renderOptions();
    position();
    requestAnimationFrame(position);
    listbox.focus({ preventScroll: true });
  }
  function closeOutside(event) {
    if (!popover || selectingFromPointer) return;
    const path = event.composedPath();
    if (path.includes(popover) || path.includes(trigger)) return;
    close();
  }
  function triggerKeydown(event) {
    if (state.disabled || state.pending) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open3();
    }
  }
  const toggle = () => {
    if (popover) close();
    else open3();
  };
  trigger.addEventListener("click", toggle);
  trigger.addEventListener("keydown", triggerKeydown);
  document.addEventListener("click", closeOutside);
  window.addEventListener("resize", position);
  return {
    close,
    destroy: () => {
      close();
      trigger.removeEventListener("click", toggle);
      trigger.removeEventListener("keydown", triggerKeydown);
      document.removeEventListener("click", closeOutside);
      window.removeEventListener("resize", position);
    },
    render(next) {
      state = next;
      setTrigger();
      if (popover) renderOptions();
    }
  };
}

// src/conversation-visibility.ts
function isConversationNode(node) {
  if (!node || typeof node !== "object") return true;
  const value = node;
  if (value.kind === "context" || value.kind === "context-sections") return false;
  if (value.kind === "assistant")
    return Boolean(value.text?.trim() || value.thinking?.trim() || value.lostChars !== void 0);
  return true;
}
function shouldShowEmptyState(content) {
  if (!content) return true;
  if ("nodes" in content) return !content.turns?.length && !content.nodes.some(isConversationNode);
  return !content.some(isConversationNode);
}

// src/presentation.ts
function resizeComposer(composer, maxHeight = 180) {
  composer.style.height = "auto";
  const height = Math.min(composer.scrollHeight, maxHeight);
  composer.style.height = `${height}px`;
  composer.style.overflowY = composer.scrollHeight > maxHeight ? "auto" : "hidden";
}
function isComposerSubmitShortcut(event) {
  return event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229;
}
function setButtonLabel(button2, value) {
  const label2 = button2.querySelector(".button-label, span");
  if (label2) label2.textContent = value;
  else button2.textContent = value;
}
function composerHintPresentation(state, t2) {
  if (!state.connected) return { kind: "state", text: t2("composer.hint.disconnected") };
  if (!state.configured) return { kind: "state", text: t2("composer.hint.unconfigured") };
  if (state.loading) return { kind: "state", text: t2("composer.hint.preparing") };
  if (!state.hasSession) return { kind: "state", text: t2("composer.hint.newTask") };
  if (state.stopping) return { kind: "state", text: t2("composer.hint.stopping") };
  return state.busy ? { kind: "state", text: t2("composer.hint.busy") } : { kind: "shortcut", text: t2("composer.hint.shortcut") };
}
function composerActionPresentation(state, t2) {
  const mode = state.loading || state.sending ? "pending" : state.busy ? "busy" : "idle";
  const label2 = mode === "pending" ? state.loading ? t2("composer.action.preparing") : t2("composer.action.submitting") : mode === "busy" ? t2("composer.action.append") : t2("composer.action.send");
  return {
    mode,
    label: label2,
    title: mode === "pending" ? label2 : t2("composer.action.title", { label: label2 })
  };
}
function canSubmitComposer(state) {
  return state.connected && state.hasSession && !state.sending && !state.stopping && !state.loading;
}
function thinkingLevelLabel(level) {
  return level.charAt(0).toUpperCase() + level.slice(1);
}
function modelSelectLabel(model, t2) {
  if (!model) return t2("composer.model.select");
  return model.thinking ? `${model.id} ${thinkingLevelLabel(model.thinking)}` : model.id;
}
function modelSelectAccessibleName(model, t2) {
  return model ? t2("composer.model.accessible.current", { id: model.id }) : t2("composer.model.accessible.fallback");
}
function errorNotice(message2, diagnosticId, diagnosticUnavailable, turnErrorCode, reason, t2 = (key) => key) {
  if (reason === "legacy-ledger-format") return t2("session.error.legacyLedger");
  if (message2 === "INTERNAL_ERROR (-32603)" && turnErrorCode === "AUTH") return t2("session.error.authFailed");
  if (message2 === "INTERNAL_ERROR (-32603)" && turnErrorCode === "OUTPUT_LIMIT")
    return t2("session.error.outputLimit");
  if (message2 === "INTERNAL_ERROR (-32603)" && turnErrorCode === "RATE_LIMIT")
    return t2("session.error.rateLimit");
  if (message2 !== "INTERNAL_ERROR (-32603)") return message2;
  const id = typeof diagnosticId === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(diagnosticId) ? t2("session.error.diagnosticId", { id: diagnosticId }) : "";
  return `${t2("session.error.internal")}${diagnosticUnavailable === true ? t2("session.error.diagnosticUnavailable") : id}`;
}
function workspaceErrorNotice(error, t2 = (key) => key) {
  const data = typeof error === "object" && error !== null ? error.data : void 0;
  if (data?.reason === "not-found") return t2("workspace.error.notFound");
  if (data?.reason === "not-directory") return t2("workspace.error.notDirectory");
  if (data?.reason === "not-accessible") return t2("workspace.error.notAccessible");
  if (data?.reason === "not-absolute") return t2("workspace.error.notAbsolute");
  return t2("workspace.error.fallback");
}

// src/shell.ts
var getButton = (id) => {
  const value = document.getElementById(id);
  if (!(value instanceof HTMLButtonElement)) throw new Error(`missing button#${id}`);
  return value;
};
function bindSidebar(narrow) {
  let readingTop;
  const transcript = () => {
    const value = document.getElementById("transcript");
    return value instanceof HTMLElement ? value : void 0;
  };
  const sync = () => {
    const visible = narrow.matches ? document.body.classList.contains("sidebar-open") : !document.body.classList.contains("sidebar-collapsed");
    const toggle2 = getButton("sidebar-toggle");
    toggle2.setAttribute("aria-expanded", String(visible));
    toggle2.setAttribute("aria-label", visible ? tr("shell.collapseNav") : tr("shell.openNav"));
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.inert = narrow.matches && !visible;
    const main = document.querySelector("main");
    if (main) main.inert = narrow.matches && visible;
  };
  const hide = () => {
    document.body.classList.remove("sidebar-open");
    sync();
  };
  const close = () => {
    hide();
    readingTop = void 0;
  };
  const dismiss = () => {
    hide();
    getButton("sidebar-toggle").focus({ preventScroll: true });
    if (readingTop !== void 0) {
      const value = transcript();
      if (value) value.scrollTop = readingTop;
      readingTop = void 0;
    }
  };
  const toggle = getButton("sidebar-toggle");
  const closeButton = getButton("sidebar-close");
  const backdrop = getButton("sidebar-backdrop");
  const onToggle = () => {
    if (narrow.matches && !document.body.classList.contains("sidebar-open"))
      readingTop = transcript()?.scrollTop;
    document.body.classList.toggle(narrow.matches ? "sidebar-open" : "sidebar-collapsed");
    sync();
    if (narrow.matches && document.body.classList.contains("sidebar-open"))
      getButton("sidebar-close").focus({ preventScroll: true });
  };
  const onDismiss = () => dismiss();
  const onMediaChange = () => sync();
  const onKeydown = (event) => {
    if (!event.defaultPrevented && !document.querySelector("dialog[open]") && event.key === "Escape" && document.body.classList.contains("sidebar-open")) {
      dismiss();
    }
  };
  toggle.addEventListener("click", onToggle);
  narrow.addEventListener("change", onMediaChange);
  closeButton.addEventListener("click", onDismiss);
  backdrop.addEventListener("click", onDismiss);
  document.addEventListener("keydown", onKeydown);
  sync();
  return {
    close,
    dismiss,
    dispose() {
      toggle.removeEventListener("click", onToggle);
      narrow.removeEventListener("change", onMediaChange);
      closeButton.removeEventListener("click", onDismiss);
      backdrop.removeEventListener("click", onDismiss);
      document.removeEventListener("keydown", onKeydown);
    }
  };
}

// src/timeline.ts
import {
  SlotOutlet as SlotOutlet2,
  SlotsProvider as SlotsProvider2
} from "@agnes/web-client";
import { createElement as createElement18, useLayoutEffect as useLayoutEffect8, useSyncExternalStore as useSyncExternalStore2 } from "react";

// src/markdown.ts
import { ConversationMarkdown } from "@agnes/web-ui/assistant-ui";
import { createElement as createElement15 } from "react";
import { flushSync as flushSync5 } from "react-dom";
import { createRoot as createRoot3 } from "react-dom/client";
function createMarkdownRenderer(element3, initial = "", options = {}) {
  element3.classList.add("markdown");
  const root = createRoot3(element3);
  let disposed = false;
  let streaming = options.streaming ?? false;
  const render3 = (source) => flushSync5(
    () => root.render(
      createElement15(ConversationMarkdown, {
        ...options,
        source,
        part: options.part ?? "body",
        streaming,
        onRelease: flushSync5,
        syntax: "immediate"
      })
    )
  );
  render3(initial);
  return {
    update(source, state) {
      if (disposed) return;
      streaming = state?.streaming ?? streaming;
      render3(source);
    },
    dispose(options2) {
      if (disposed) return;
      disposed = true;
      options2?.defer ? queueMicrotask(() => flushSync5(() => root.unmount())) : flushSync5(() => root.unmount());
    }
  };
}

// src/tool-icon.ts
import { createElement as createElement16 } from "react";
var SEARCH = [
  ["path", 'd="m21 21-4.34-4.34"'],
  ["circle", 'cx="11" cy="11" r="8" x="11" y="11"']
];
var TERMINAL = [
  ["path", 'd="M12 19h8"'],
  ["path", 'd="m4 17 6-6-6-6"']
];
var EYE = [
  [
    "path",
    'd="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"'
  ],
  ["circle", 'cx="12" cy="12" r="3" x="12" y="12"']
];
var FILE_PEN = [
  [
    "path",
    'd="M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34"'
  ],
  ["path", 'd="M14 2v5a1 1 0 0 0 1 1h5"'],
  [
    "path",
    'd="M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z"'
  ]
];
var GLOBE = [
  ["circle", 'cx="12" cy="12" r="10" x="12" y="12"'],
  ["path", 'd="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"'],
  ["path", 'd="M2 12h20"']
];
var FOLDER = [
  [
    "path",
    'd="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"'
  ]
];
var WRENCH = [
  [
    "path",
    'd="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"'
  ]
];
var MATCHERS = [
  [/(search|grep|find|query|lookup)/i, SEARCH],
  [/(shell|bash|exec|run|command|terminal)/i, TERMINAL],
  [/(read|cat|view|load|open_file|fetch_file)/i, EYE],
  [/(write|edit|create|update|patch|replace|apply)/i, FILE_PEN],
  [/(web|http|url|fetch|browse|scrape|download)/i, GLOBE],
  [/(ls|dir|list|glob|walk|tree)/i, FOLDER]
];
var FALLBACK = WRENCH;
function glyphFor(name) {
  for (const [pattern, glyph] of MATCHERS) if (pattern.test(name)) return glyph;
  return FALLBACK;
}
function toolIconReact(name) {
  return createElement16(
    "svg",
    { className: "icon tool-icon", viewBox: "0 0 24 24", "aria-hidden": "true" },
    ...glyphFor(name).map(([tag, attrs], index) => {
      const properties = { key: index };
      for (const [, attribute, value] of attrs.matchAll(/([a-z-]+)="([^"]*)"/g)) {
        if (attribute && value !== void 0) properties[attribute] = value;
      }
      return createElement16(tag, properties);
    })
  );
}
function toolIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon tool-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const [tag, attrs] of glyphFor(name)) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [, attribute, value] of attrs.matchAll(/([a-z-]+)="([^"]*)"/g)) {
      if (attribute === void 0 || value === void 0) continue;
      node.setAttribute(attribute, value);
    }
    svg.append(node);
  }
  return svg;
}

// src/turns.ts
var TURN_STATUS_KEYS = {
  running: "turn.status.running",
  waiting: "turn.status.waiting",
  completed: "turn.status.completed",
  failed: "turn.status.failed",
  cancelled: "turn.status.cancelled"
};
var durationLabel2 = (duration, t2) => {
  if (duration === void 0) return void 0;
  if (duration < 1e3) return t2("turn.duration.ms", { n: duration });
  if (duration < 6e4)
    return t2("turn.duration.s", { n: (duration / 1e3).toFixed(duration < 1e4 ? 1 : 0) });
  return t2("turn.duration.minSec", {
    min: Math.floor(duration / 6e4),
    sec: Math.round(duration % 6e4 / 1e3)
  });
};
function processChevron() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon process-chevron");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "m6 9 6 6 6-6");
  svg.append(path);
  return svg;
}
function makeTurnEntry(onFork, t2) {
  const element3 = document.createElement("section");
  element3.className = "conversation-turn";
  const user = document.createElement("div");
  user.className = "turn-user";
  const response = document.createElement("div");
  response.className = "turn-response";
  const process = document.createElement("details");
  process.className = "turn-process";
  const processSummary = document.createElement("summary");
  const identity = document.createElement("span");
  identity.className = "process-identity";
  const avatar = document.createElement("span");
  avatar.className = "process-avatar";
  const avatarMark = document.createElement("span");
  avatarMark.className = "agnes-mark process-avatar-mark";
  avatarMark.setAttribute("aria-hidden", "true");
  avatar.append(avatarMark);
  const name = document.createElement("span");
  name.className = "process-name";
  name.textContent = "Agnes Harness";
  identity.append(avatar, name);
  const status = document.createElement("p");
  status.className = "turn-status";
  status.setAttribute("data-agnes-dynamic", "turn-process");
  const row = document.createElement("span");
  row.className = "process-row";
  const processLabel = document.createElement("span");
  processLabel.className = "process-label";
  processLabel.setAttribute("data-agnes-dynamic", "turn-process");
  const chevron = processChevron();
  row.append(processLabel, chevron);
  processSummary.append(row);
  const processBody = document.createElement("div");
  processBody.className = "turn-process-body";
  process.append(processSummary, processBody);
  const error = document.createElement("p");
  error.className = "turn-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  const attention = document.createElement("div");
  attention.className = "turn-attention";
  const final = document.createElement("div");
  final.className = "turn-final";
  const actions = createConversationMessageActions({
    ...onFork ? { onFork } : {},
    t: t2
  });
  response.append(identity, status, process, error, attention, final, actions.element);
  element3.append(user, response);
  const entry = {
    element: element3,
    user,
    status,
    error,
    process,
    processSummary,
    processLabel,
    processBody,
    attention,
    final,
    actions
  };
  processSummary.addEventListener("click", () => {
    entry.processPreference = !process.open;
  });
  return entry;
}
function createTurnProjector(options) {
  const t2 = options.translate;
  const turnEntries = /* @__PURE__ */ new Map();
  const ticking = /* @__PURE__ */ new Set();
  let clock;
  const stopClock = () => {
    if (clock !== void 0) clearInterval(clock);
    clock = void 0;
  };
  const orphan = document.createElement("section");
  orphan.className = "timeline-unassigned";
  const place = (parent, children) => {
    for (const [index, child] of children.entries())
      if (parent.children[index] !== child) parent.insertBefore(child, parent.children[index] ?? null);
  };
  const trim = (parent, children) => {
    while (parent.children.length > children.length) parent.lastElementChild?.remove();
  };
  return {
    render(nodes, turns, resolve) {
      ticking.clear();
      if (!turns?.length) {
        stopClock();
        for (const shell of turnEntries.values()) {
          shell.actions.dispose();
          shell.element.remove();
        }
        turnEntries.clear();
        orphan.remove();
        return false;
      }
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      const turnIds = new Set(turns.map((turn) => turn.id));
      const assigned = new Set(turns.flatMap((turn) => turn.nodeIds));
      let changed = false;
      for (const [index, turn] of turns.entries()) {
        let shell = turnEntries.get(turn.id);
        if (!shell) {
          shell = makeTurnEntry(options.onFork, t2);
          shell.element.dataset.turnId = turn.id;
          turnEntries.set(turn.id, shell);
          changed = true;
        }
        const userNodes = [];
        const processNodes = [];
        const attentionNodes = [];
        const finalNodes = [];
        let finalText = "";
        let processCount = 0;
        let pendingApproval = false;
        let awaitingToolApproval = false;
        let runningTool = false;
        let latestStreaming;
        for (const id of turn.nodeIds) {
          const node = nodeMap.get(id);
          const rendered = resolve(id);
          if (!node || !rendered) continue;
          const { element: element3, thinking } = rendered;
          if (node.kind === "approval" && node.state === "pending") pendingApproval = true;
          if (node.kind === "tool") {
            if (node.status === "awaiting_approval") awaitingToolApproval = true;
            if (node.status === "running") runningTool = true;
          }
          if (node.kind === "assistant" && node.streaming && (!latestStreaming || node.seq >= latestStreaming.seq))
            latestStreaming = node;
          if (node.kind === "user") userNodes.push(element3);
          else if (id === turn.finalAssistantId) {
            if (node.kind === "assistant" && node.thinking?.trim() && thinking) {
              processNodes.push(thinking);
              processCount++;
            }
            finalNodes.push(element3);
            if (node.kind === "assistant") finalText = node.text;
          } else if (node.kind === "approval" && node.state === "pending") attentionNodes.push(element3);
          else {
            processNodes.push(element3);
            processCount++;
          }
        }
        const destinations = [
          [shell.user, userNodes],
          [shell.processBody, processNodes],
          [shell.attention, attentionNodes],
          [shell.final, finalNodes]
        ];
        for (const [parent, children] of destinations) place(parent, children);
        for (const [parent, children] of destinations) trim(parent, children);
        let status = t2(TURN_STATUS_KEYS[turn.status]);
        if (turn.status === "running" || turn.status === "waiting") {
          if (pendingApproval || awaitingToolApproval) status = t2("turn.status.awaitingApproval");
          else if (turn.status === "waiting") status = t2(TURN_STATUS_KEYS.waiting);
          else if (runningTool) status = t2("turn.status.runningTool");
          else if (latestStreaming?.text.trim()) status = t2("turn.status.replying");
          else if (latestStreaming?.thinking?.trim()) status = t2("turn.status.thinking");
          else status = t2("turn.status.preparing");
        }
        const entry = shell;
        const active = !turn.endedAt && (turn.status === "running" || turn.status === "waiting");
        const startedAt = Date.parse(turn.startedAt);
        entry.refreshStatus = () => {
          const duration = active && Number.isFinite(startedAt) ? t2("turn.duration.s", { n: Math.floor(Math.max(0, Date.now() - startedAt) / 1e3) }) : durationLabel2(turn.durationMs, t2);
          const statusText = duration ? `${status}${t2("turn.elapsedSuffix", { duration })}` : status;
          if (entry.status.textContent !== statusText) entry.status.textContent = statusText;
          if (entry.processLabel.textContent !== statusText) entry.processLabel.textContent = statusText;
        };
        entry.refreshStatus();
        entry.error.hidden = turn.status !== "failed";
        const errorText2 = turn.status !== "failed" ? "" : turn.error ? t2("turn.error.codeJoin", { code: turn.error.code, message: turn.error.message }) : t2("turn.error.noDetail", { reason: turn.reason ?? t2("turn.error.unknownReason") });
        if (entry.error.textContent !== errorText2) entry.error.textContent = errorText2;
        if (active) ticking.add(entry);
        else delete entry.refreshStatus;
        shell.status.hidden = processCount > 0;
        shell.process.hidden = processCount === 0;
        const processActive = turn.status === "running" || turn.status === "waiting";
        if (shell.processWasActive && !processActive) shell.processPreference = false;
        shell.processWasActive = processActive;
        shell.process.open = shell.processPreference ?? processActive;
        shell.attention.hidden = shell.attention.childElementCount === 0;
        const settled = turn.status !== "running" && turn.status !== "waiting" && Boolean(turn.finalAssistantId);
        shell.actions.update({ turn, finalText, settled, localeTag: options.localeTag?.() ?? "en-US" });
        shell.element.dataset.status = turn.status;
        shell.element.dataset.inherited = String(turn.inherited);
        const child = options.transcript.children[index];
        if (child !== shell.element) {
          options.transcript.insertBefore(shell.element, child ?? null);
          changed = true;
        }
      }
      for (const [id, shell] of turnEntries) {
        if (turnIds.has(id)) continue;
        shell.actions.dispose();
        shell.element.remove();
        turnEntries.delete(id);
        changed = true;
      }
      if (ticking.size > 0) {
        if (clock === void 0)
          clock = setInterval(() => {
            if (options.transcript.ownerDocument.visibilityState === "hidden") return;
            for (const shell of ticking) shell.refreshStatus?.();
          }, 1e3);
      } else stopClock();
      const orphanNodes = nodes.filter((node) => !assigned.has(node.id)).map((node) => resolve(node.id)?.element).filter((node) => Boolean(node));
      place(orphan, orphanNodes);
      trim(orphan, orphanNodes);
      orphan.hidden = orphanNodes.length === 0;
      if (options.transcript.lastElementChild !== orphan) {
        options.transcript.append(orphan);
        changed = true;
      }
      return changed;
    },
    reset() {
      stopClock();
      ticking.clear();
      for (const shell of turnEntries.values()) shell.actions.dispose();
      turnEntries.clear();
      orphan.remove();
    }
  };
}

// src/usage.ts
import { ConversationUsage, costDetails, costSummary } from "@agnes/web-ui/assistant-ui";
import { createElement as createElement17 } from "react";
import { flushSync as flushSync6 } from "react-dom";
import { createRoot as createRoot4 } from "react-dom/client";
import { costDetails as costDetails2, costSummary as costSummary2 } from "@agnes/web-ui/assistant-ui";
function fillRows(list2, rows) {
  list2.replaceChildren(
    ...rows.flatMap(([name, value]) => {
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = name;
      detail.textContent = value;
      return [term, detail];
    })
  );
}
function createCostDetails(parent, t2) {
  const details = document.createElement("details");
  details.className = "usage-disclosure call-usage";
  const summary = document.createElement("summary");
  summary.setAttribute("aria-label", t2("cost.callDetailsAria"));
  const list2 = document.createElement("dl");
  list2.className = "usage-grid";
  details.append(summary, list2);
  parent.append(details);
  return (node) => {
    summary.textContent = costSummary(node, t2);
    fillRows(list2, costDetails(node, t2));
  };
}
function createUsagePanel(parent, t2) {
  const root = createRoot4(parent);
  let disposed = false;
  const update = ((usage, connected2) => {
    if (disposed) return;
    parent.hidden = !usage;
    flushSync6(() => root.render(createElement17(ConversationUsage, { usage, connected: connected2, ...t2 ? { t: t2 } : {} })));
  });
  update.dispose = () => {
    if (disposed) return;
    disposed = true;
    flushSync6(() => root.unmount());
    parent.hidden = true;
  };
  update(void 0, false);
  return update;
}

// src/timeline.ts
var APPROVAL_LABEL_KEYS = {
  pending: "timeline.approval.pending",
  decided: "timeline.approval.decided",
  expired: "timeline.approval.expired"
};
var APPROVAL_DECISION_KEYS = /* @__PURE__ */ new Map([
  ["allowed-once", "timeline.decision.allowedOnce"],
  ["allowed-session", "timeline.decision.allowedSession"],
  ["allowed-permanent", "timeline.decision.allowedPermanent"],
  ["rejected", "timeline.decision.rejected"],
  ["cancelled", "timeline.decision.cancelled"]
]);
var APPROVAL_REASON_KEYS = /* @__PURE__ */ new Map([
  ["user_rejected", "timeline.reason.userRejected"],
  ["timeout", "timeline.reason.timeout"],
  ["no_approver", "timeline.reason.noApprover"],
  ["stopped", "timeline.reason.stopped"],
  ["policy_denied", "timeline.reason.policyDenied"],
  ["subagent_scope", "timeline.reason.subagentScope"]
]);
var textContent = (node) => node.content.filter(
  (block) => block.type === "text"
).map((block) => block.text).join("\n");
function legacyUserContent(node, t2) {
  const images = node.content.filter((block) => block.type === "image");
  return [textContent(node), ...images.map(() => t2("timeline.imageUnavailable"))].filter(Boolean).join("\n");
}
function assistantText(node, t2) {
  if (node.lostChars === void 0 || node.text !== "") return node.text;
  return t2("timeline.lostOutput", { count: node.lostChars });
}
var FINGERPRINT_TAIL = 64;
var sampledPart = (value) => `${(value ?? "").length}:${value ? value.slice(-FINGERPRINT_TAIL) : ""}`;
function fingerprint(node) {
  switch (node.kind) {
    case "user": {
      const body = textContent(node);
      const images = node.content.filter((block) => block.type === "image").map(
        (block) => `${block.mimeType}:${block.data.length}:${block.data.slice(0, 16)}:${block.data.slice(-16)}`
      ).join("|");
      return `${node.kind}:${node.id}:${sampledPart(body)}:${images}`;
    }
    case "assistant":
      return `${node.kind}:${node.id}:${sampledPart(node.thinking)}:${sampledPart(node.text)}:${node.streaming === true}:${node.lostChars ?? ""}`;
    case "tool":
      return `${node.kind}:${node.id}:${node.name}:${node.status}:${node.summary}:${sampledPart(
        node.argsPreview
      )}:${sampledPart(node.resultPreview)}`;
    case "approval":
      return `${node.kind}:${node.id}:${node.state}:${node.summary}:${node.decision?.verdict ?? ""}:${node.decision?.reason ?? ""}`;
    case "contribute-conflict":
      return `${node.kind}:${node.id}:${node.key}:${JSON.stringify(node.ops)}`;
    case "compaction":
      return `${node.kind}:${node.id}:${node.summary ?? ""}:${node.range.join("-")}`;
    case "cost":
      return `${node.kind}:${node.id}:${JSON.stringify(node)}`;
    case "artifact":
      return `${node.kind}:${node.id}:${node.name}`;
    case "slot":
      return `${node.kind}:${node.id}:${node.fill.extId}`;
  }
  return "";
}
function updateText(ref, value) {
  if (ref.value === value) return;
  if (value.startsWith(ref.value)) ref.node.appendData(value.slice(ref.value.length));
  else ref.node.replaceData(0, ref.node.length, value);
  ref.value = value;
}
function text(parent, className, value = "") {
  const element3 = document.createElement("div");
  element3.className = className;
  const node = document.createTextNode(value);
  element3.append(node);
  parent.append(element3);
  return { element: element3, node, value };
}
function label(parent, className, value) {
  const element3 = document.createElement("span");
  element3.className = className;
  const node = document.createTextNode(value);
  element3.append(node);
  parent.append(element3);
  return { element: element3, node, value };
}
function heading(parent, className, value) {
  const element3 = document.createElement("p");
  element3.className = className;
  const node = document.createTextNode(value);
  element3.append(node);
  parent.append(element3);
  return { element: element3, node, value };
}
function article(node) {
  const element3 = document.createElement("article");
  element3.className = `timeline-node ${node.kind}`;
  element3.dataset.nodeId = node.id;
  element3.dataset.nodeKind = node.kind;
  return element3;
}
var approvalStatus = (node, t2) => (node.state === "decided" && node.decision ? (() => {
  const key = APPROVAL_REASON_KEYS.get(node.decision.reason ?? "") ?? APPROVAL_DECISION_KEYS.get(node.decision.verdict);
  return key === void 0 ? void 0 : t2(key);
})() : void 0) ?? t2(APPROVAL_LABEL_KEYS[node.state]);
function approvalLabel(node, t2) {
  return t2("timeline.approvalLabel", { status: approvalStatus(node, t2) });
}
function compactionSummary(node, t2) {
  return node.summary ?? t2("timeline.compactionFallback", { range: node.range.join("–") });
}
function createEntry(node, t2, entryFingerprint) {
  const element3 = article(node);
  if (node.kind === "user") {
    const title2 = heading(element3, "node-label", t2("timeline.userLabel"));
    const body2 = text(element3, "node-body", legacyUserContent(node, t2));
    return {
      kind: node.kind,
      element: element3,
      fingerprint: entryFingerprint,
      update(next) {
        if (next.kind !== "user") return;
        updateText(title2, t2("timeline.userLabel"));
        updateText(body2, legacyUserContent(next, t2));
      }
    };
  }
  if (node.kind === "assistant") {
    const title2 = heading(element3, "node-label", "Agnes");
    const thinking = document.createElement("details");
    thinking.className = "thinking";
    thinking.hidden = !node.thinking?.trim();
    const thinkingActive = (next) => Boolean(next.thinking?.trim()) && next.streaming === true && next.text.trim() === "";
    let thinkingPreference;
    let thinkingWasActive = thinkingActive(node);
    thinking.open = thinkingWasActive;
    const thinkingSummary = document.createElement("summary");
    thinkingSummary.textContent = t2("timeline.thinkingSummary");
    thinkingSummary.addEventListener("click", () => {
      thinkingPreference = !thinking.open;
    });
    const thinkingContent = document.createElement("div");
    thinkingContent.className = "thinking-content markdown";
    thinking.append(thinkingSummary, thinkingContent);
    element3.append(thinking);
    const thinkingRenderer = createMarkdownRenderer(thinkingContent, node.thinking ?? "", {
      part: "thinking",
      streaming: node.streaming === true
    });
    const body2 = document.createElement("div");
    body2.className = "node-body markdown";
    element3.append(body2);
    const bodyRenderer = createMarkdownRenderer(body2, assistantText(node, t2), {
      streaming: node.streaming === true
    });
    element3.dataset.streaming = String(node.streaming === true);
    return {
      kind: node.kind,
      element: element3,
      thinking,
      fingerprint: entryFingerprint,
      // 思考块固定排在 `.node-body` 之前（标题之后）。归属容器取 `body` 的实际父节点：
      // DSH 宿主会把原生内容整体搬进 `[data-agnes-timeline-native]`，写死 `element` 会让
      // 插入参照物不在同一父节点上而抛错。
      rehome() {
        const home = body2.parentElement;
        if (home === null) return;
        if (thinking.parentElement === home && thinking.nextElementSibling === body2) return;
        home.insertBefore(thinking, body2);
      },
      update(next) {
        if (next.kind !== "assistant") return;
        element3.dataset.streaming = String(next.streaming === true);
        updateText(title2, "Agnes");
        thinkingSummary.textContent = t2("timeline.thinkingSummary");
        thinking.hidden = !next.thinking?.trim();
        const active = thinkingActive(next);
        if (thinkingWasActive && !active) thinkingPreference = false;
        thinkingWasActive = active;
        thinking.open = thinkingPreference ?? active;
        if (next.thinking !== void 0)
          thinkingRenderer.update(next.thinking, { streaming: next.streaming === true });
        bodyRenderer.update(assistantText(next, t2), { streaming: next.streaming === true });
      },
      dispose() {
        thinkingRenderer.dispose({ defer: true });
        bodyRenderer.dispose({ defer: true });
      }
    };
  }
  if (node.kind === "tool") {
    const card = createConversationToolCard(element3, node, { icon: toolIcon, translate: t2 });
    return {
      kind: node.kind,
      element: element3,
      fingerprint: entryFingerprint,
      update(next) {
        if (next.kind !== "tool") return;
        card.update(next);
      },
      dispose() {
        card.dispose();
      }
    };
  }
  if (node.kind === "approval") {
    const head = document.createElement("div");
    head.className = "approval-head";
    const title2 = label(head, "node-label", t2("timeline.approvalTitle"));
    const status = label(head, "tool-status", approvalStatus(node, t2));
    const summary = text(element3, "approval-summary", node.summary);
    element3.prepend(head);
    element3.setAttribute("aria-label", approvalLabel(node, t2));
    return {
      kind: node.kind,
      element: element3,
      fingerprint: entryFingerprint,
      update(next) {
        if (next.kind !== "approval") return;
        updateText(title2, t2("timeline.approvalTitle"));
        updateText(status, approvalStatus(next, t2));
        updateText(summary, next.summary);
        element3.setAttribute("aria-label", approvalLabel(next, t2));
        element3.dataset.state = next.state;
      }
    };
  }
  if (node.kind === "cost") {
    const update2 = createCostDetails(element3, t2);
    update2(node);
    return {
      kind: node.kind,
      element: element3,
      fingerprint: entryFingerprint,
      update(next) {
        if (next.kind === "cost") update2(next);
      }
    };
  }
  if (node.kind === "artifact") {
    const title2 = heading(element3, "node-label", t2("timeline.artifactLabel"));
    const body2 = text(element3, "node-body", node.name);
    return {
      kind: node.kind,
      element: element3,
      fingerprint: entryFingerprint,
      update(next) {
        if (next.kind !== "artifact") return;
        updateText(title2, t2("timeline.artifactLabel"));
        updateText(body2, next.name);
      }
    };
  }
  if (node.kind === "compaction") {
    const title2 = heading(element3, "node-label", t2("timeline.compactionLabel"));
    const body2 = text(element3, "node-body", compactionSummary(node, t2));
    return {
      kind: node.kind,
      element: element3,
      fingerprint: entryFingerprint,
      update(next) {
        if (next.kind !== "compaction") return;
        updateText(title2, t2("timeline.compactionLabel"));
        updateText(body2, compactionSummary(next, t2));
      }
    };
  }
  if (node.kind === "slot") {
    const mount = mountSlotCard({ node, context: getSlotCardContext() });
    element3.append(mount.element);
    return {
      kind: node.kind,
      element: element3,
      fingerprint: entryFingerprint,
      update(next) {
        if (next.kind !== "slot") return;
        mount.update(next);
      },
      dispose() {
        mount.dispose();
      }
    };
  }
  const title = heading(element3, "node-label", t2("timeline.unsupportedLabel"));
  const body = text(element3, "node-body", "");
  const update = (next) => {
    if (next.kind !== "contribute-conflict") return;
    updateText(title, t2("timeline.conflictLabel"));
    updateText(
      body,
      `${next.key}${t2("timeline.conflictJoiner")}${next.ops.join(t2("timeline.conflictOpsJoiner"))}`
    );
    element3.setAttribute("role", "note");
  };
  update(node);
  return {
    kind: node.kind,
    element: element3,
    fingerprint: entryFingerprint,
    update
  };
}
var dshChildSlotNames = (slotName, kind) => slotName === "tool.call.toolview" ? ["tool.call.images", "tool.view.cordis"] : [
  ...kind === "assistant" ? ["conversation.chat.assistant-actions"] : [],
  "conversation.chat.commandview",
  "conversation.chat.turnTail",
  "conversation.message.images",
  "conversation.trajectory.images"
];
function mountDshNode(entry, node, options) {
  const registry = options.registry;
  const projection2 = dshProjection(node);
  if (!registry || !projection2 || !registry.spec(projection2.slotName)) return void 0;
  const native = document.createElement("div");
  native.dataset.agnesTimelineNative = "1";
  while (entry.element.firstChild) native.append(entry.element.firstChild);
  entry.element.append(native);
  const host = document.createElement("div");
  host.dataset.agnesDshSlot = projection2.slotName;
  entry.element.append(host);
  const childHost = document.createElement("div");
  childHost.dataset.agnesDshChildren = projection2.slotName;
  native.append(childHost);
  const root = createAntdRoot(host);
  const childRoot = createAntdRoot(childHost);
  let latest = node;
  const isClaimed = (next) => {
    const nextProjection = dshProjection(next);
    if (!nextProjection) return false;
    if (registry.entriesOfSlot(nextProjection.slotName).some((item) => item.options.key === nextProjection.entryKey))
      return true;
    return dshChildSlotNames(nextProjection.slotName, next.kind).some(
      (name) => registry.entriesOfSlot(name).length > 0
    );
  };
  let claimed = isClaimed(node);
  const render3 = (next) => {
    const nextProjection = dshProjection(next);
    if (!nextProjection) return;
    host.dataset.agnesDshSlot = nextProjection.slotName;
    childHost.dataset.agnesDshChildren = nextProjection.slotName;
    childRoot.render(
      createElement18(
        SlotsProvider2,
        {
          registry,
          ...options.session ? { session: options.session } : {},
          ...options.locale ? { locale: options.locale } : {},
          ...options.resources ? { resources: options.resources } : {}
        },
        createElement18(NativeDshChildren, {
          projection: nextProjection
        })
      )
    );
    root.render(
      createElement18(
        SlotsProvider2,
        {
          registry,
          ...options.session ? { session: options.session } : {},
          ...options.locale ? { locale: options.locale } : {},
          ...options.resources ? { resources: options.resources } : {}
        },
        createElement18(ChatNodeOutlet, {
          registry,
          slotName: nextProjection.slotName,
          entryKey: nextProjection.entryKey,
          props: nextProjection.props,
          onActive(active) {
            native.hidden = active;
            host.hidden = !active;
          }
        })
      )
    );
  };
  const sync = () => {
    const active = isClaimed(latest);
    if (active || claimed) render3(latest);
    if (active !== claimed) {
      native.hidden = active;
      host.hidden = !active;
    }
    claimed = active;
  };
  const stops = [projection2.slotName, ...dshChildSlotNames(projection2.slotName, node.kind)].map(
    (name) => registry.subscribeBatched(name, sync)
  );
  if (!claimed) {
    native.hidden = false;
    host.hidden = true;
  } else render3(node);
  return {
    update(next) {
      latest = next;
      if (claimed) render3(next);
    },
    dispose() {
      for (const stop of stops) stop();
      for (const nested of [root, childRoot]) queueMicrotask(() => nested.unmount());
      host.remove();
      native.remove();
    }
  };
}
function NativeDshChildren({
  projection: projection2
}) {
  if (!projection2) return createElement18("div");
  const props = projection2.props;
  const owner = props.owner;
  const isAssistant = typeof owner === "object" && owner !== null && "kind" in owner && owner.kind === "assistant";
  const slots = projection2.slotName === "tool.call.toolview" ? [
    { name: "tool.call.images" },
    { name: "tool.view.cordis", entryKey: projection2.entryKey }
  ] : [
    ...isAssistant ? [{ name: "conversation.chat.assistant-actions" }] : [],
    { name: "conversation.chat.commandview", entryKey: projection2.entryKey },
    { name: "conversation.chat.turnTail" },
    { name: "conversation.message.images" },
    { name: "conversation.trajectory.images" }
  ];
  return createElement18(
    "div",
    { "data-agnes-dsh-child-outlets": projection2.slotName },
    ...slots.map(
      (slot) => createElement18(SlotOutlet2, {
        key: slot.name,
        name: slot.name,
        ...slot.entryKey === void 0 ? {} : { entryKey: slot.entryKey },
        props,
        hideWhenEmpty: true
      })
    )
  );
}
function dshProjection(node) {
  if (node.kind === "tool") {
    return {
      slotName: "tool.call.toolview",
      entryKey: node.name,
      props: {
        owner: {
          callId: node.toolUseId,
          toolName: node.name,
          block: node
        }
      }
    };
  }
  return {
    slotName: "conversation.chat.node",
    entryKey: node.kind,
    props: { owner: { node, nodeId: node.id, kind: node.kind } }
  };
}
function ChatNodeOutlet({
  registry,
  slotName,
  entryKey,
  props,
  onActive
}) {
  const version = useSyncExternalStore2(
    (listener) => registry.subscribeBatched(slotName, listener),
    () => registry.getVersion(slotName)
  );
  void version;
  const active = registry.entriesOfSlot(slotName).some((entry) => entry.options.key === entryKey);
  useLayoutEffect8(() => {
    onActive(active);
  }, [active, onActive]);
  return createElement18(SlotOutlet2, {
    name: slotName,
    entryKey,
    props,
    hideWhenEmpty: true
  });
}
function nearBottom2(element3) {
  return element3.scrollHeight - element3.scrollTop - element3.clientHeight <= 80;
}
function saveTranscriptSelection(transcript) {
  const selection2 = globalThis.getSelection?.();
  if (!selection2 || selection2.isCollapsed || !selection2.rangeCount) return void 0;
  const ranges = Array.from({ length: selection2.rangeCount }, (_, index) => selection2.getRangeAt(index));
  if (!ranges.every(
    (range) => transcript.contains(range.startContainer) && transcript.contains(range.endContainer)
  ))
    return void 0;
  return {
    text: selection2.toString(),
    ranges: ranges.map((range) => ({
      start: range.startContainer,
      startOffset: range.startOffset,
      end: range.endContainer,
      endOffset: range.endOffset
    }))
  };
}
function restoreTranscriptSelection(transcript, saved) {
  const selection2 = globalThis.getSelection?.();
  if (!saved || !selection2 || selection2.toString() === saved.text) return;
  if (!saved.ranges.every((range) => transcript.contains(range.start) && transcript.contains(range.end)))
    return;
  try {
    selection2.removeAllRanges();
    for (const savedRange of saved.ranges) {
      const range = document.createRange();
      range.setStart(savedRange.start, savedRange.startOffset);
      range.setEnd(savedRange.end, savedRange.endOffset);
      selection2.addRange(range);
    }
  } catch {
  }
}
function createTimelineRenderer(options) {
  const scrollContainer = options.scrollContainer ?? options.transcript;
  const locale = options.locale;
  const t2 = locale ? (key, vars) => locale.t(key, vars) : (key) => key;
  const localeVersion = locale ? () => locale.getSnapshot() : () => "en";
  const entries2 = /* @__PURE__ */ new Map();
  const turnProjector = createTurnProjector({
    transcript: options.transcript,
    ...options.onFork ? { onFork: options.onFork } : {},
    translate: t2,
    localeTag: () => options.locale?.getSnapshot() === "zh-CN" ? "zh-CN" : "en-US"
  });
  let follow = true;
  let expectedTop = scrollContainer.scrollTop;
  const jumpTo = (top) => {
    const previousBehavior = scrollContainer.style.scrollBehavior;
    scrollContainer.style.scrollBehavior = "auto";
    scrollContainer.scrollTop = top;
    scrollContainer.style.scrollBehavior = previousBehavior;
    expectedTop = scrollContainer.scrollTop;
  };
  const scrollToBottom = () => {
    jumpTo(scrollContainer.scrollHeight);
    options.newContentButton.hidden = true;
  };
  const fingerprints = /* @__PURE__ */ new WeakMap();
  const fingerprintOf = (node) => {
    const locale2 = localeVersion();
    const cached = fingerprints.get(node);
    if (cached?.locale === locale2) return cached.value;
    const value = `${locale2}|${fingerprint(node)}`;
    fingerprints.set(node, { locale: locale2, value });
    return value;
  };
  const earlier = document.createElement("div");
  earlier.className = "transcript-earlier";
  earlier.hidden = true;
  const earlierButton = document.createElement("button");
  earlierButton.type = "button";
  earlierButton.textContent = t2("timeline.loadEarlier");
  earlier.append(earlierButton);
  if (options.transcript.parentElement && scrollContainer !== options.transcript)
    options.transcript.before(earlier);
  let meta;
  let loadingEarlier = false;
  let firstShown;
  const loadEarlier = () => {
    if (loadingEarlier || !meta?.hasEarlier || !meta.loadEarlier) return;
    loadingEarlier = true;
    meta.loadEarlier();
  };
  earlierButton.addEventListener("click", loadEarlier);
  const sentinel = typeof IntersectionObserver === "function" ? new IntersectionObserver((seen) => {
    if (seen.some((item) => item.isIntersecting)) loadEarlier();
  }) : void 0;
  sentinel?.observe(earlier);
  const render3 = (nodes, turns, nextMeta, opts) => {
    meta = nextMeta;
    loadingEarlier = false;
    earlier.hidden = !nextMeta?.hasEarlier;
    earlierButton.textContent = t2("timeline.loadEarlier");
    const visibleNodes = nodes.filter(isConversationNode);
    const savedSelection = saveTranscriptSelection(options.transcript);
    const previousFirst = firstShown;
    firstShown = visibleNodes[0]?.id;
    const prepended = previousFirst !== void 0 && firstShown !== previousFirst && visibleNodes.some((node) => node.id === previousFirst);
    const fromBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop;
    const nextIds = /* @__PURE__ */ new Set();
    let changed = visibleNodes.length !== entries2.size;
    for (const node of visibleNodes) {
      nextIds.add(node.id);
      const old = entries2.get(node.id);
      const nextFingerprint = fingerprintOf(node);
      let entry = old;
      if (!entry || entry.kind !== node.kind) {
        old?.dispose?.();
        old?.dshNode?.dispose();
        old?.element.remove();
        entry = createEntry(node, t2, nextFingerprint);
        entry.dshNode = mountDshNode(entry, node, options);
        entries2.set(node.id, entry);
        changed = true;
      } else if (entry.fingerprint !== nextFingerprint) {
        entry.update(node);
        entry.dshNode?.update(node);
        entry.fingerprint = nextFingerprint;
        changed = true;
      }
      entry.element.dataset.nodeId = node.id;
    }
    for (const [id, entry] of entries2) {
      if (nextIds.has(id)) continue;
      entry.dispose?.();
      entry.dshNode?.dispose();
      entry.element.remove();
      entries2.delete(id);
      changed = true;
    }
    for (const entry of entries2.values()) entry.rehome?.();
    if (turns?.length) {
      changed = turnProjector.render(visibleNodes, turns, (id) => entries2.get(id)) || changed;
    } else {
      turnProjector.render(visibleNodes, void 0, () => void 0);
      let index = 0;
      for (const node of visibleNodes) {
        const entry = entries2.get(node.id);
        if (!entry) continue;
        const child = options.transcript.children[index];
        if (child !== entry.element) options.transcript.insertBefore(entry.element, child ?? null);
        index++;
      }
    }
    if (changed) {
      if (opts?.preserveScroll) jumpTo(scrollContainer.scrollHeight - fromBottom);
      else if (follow) scrollToBottom();
      else if (prepended) jumpTo(scrollContainer.scrollHeight - fromBottom);
      else options.newContentButton.hidden = nearBottom2(scrollContainer);
    }
    restoreTranscriptSelection(options.transcript, savedSelection);
    if (sentinel && nextMeta?.hasEarlier && prepended) {
      sentinel.unobserve(earlier);
      sentinel.observe(earlier);
    }
  };
  let lastRender;
  const renderAndRemember = (nodes, turns, nextMeta) => {
    lastRender = {
      nodes,
      ...turns === void 0 ? {} : { turns },
      ...nextMeta === void 0 ? {} : { meta: nextMeta }
    };
    render3(nodes, turns, nextMeta);
  };
  const unsubscribeLocale = options.locale?.subscribe(() => {
    const last = lastRender;
    if (last) render3(last.nodes, last.turns, last.meta, { preserveScroll: true });
  });
  const onScroll = () => {
    const top = scrollContainer.scrollTop;
    if (Math.abs(top - expectedTop) <= 1) return;
    follow = nearBottom2(scrollContainer);
    options.newContentButton.hidden = follow;
  };
  scrollContainer.addEventListener("scroll", onScroll);
  options.newContentButton.addEventListener("click", () => {
    follow = true;
    scrollToBottom();
    scrollContainer.focus({ preventScroll: true });
  });
  const reset = () => {
    for (const entry of entries2.values()) {
      entry.dispose?.();
      entry.dshNode?.dispose();
    }
    options.transcript.replaceChildren();
    entries2.clear();
    firstShown = void 0;
    turnProjector.reset();
    follow = true;
    expectedTop = scrollContainer.scrollTop;
    options.newContentButton.hidden = true;
  };
  return {
    render: renderAndRemember,
    reset,
    dispose() {
      reset();
      unsubscribeLocale?.();
      scrollContainer.removeEventListener("scroll", onScroll);
      sentinel?.disconnect();
      earlier.remove();
    },
    pinToBottom: scrollToBottom
  };
}

// src/timeline-node-host.tsx
import {
  AssistantRuntimeProvider,
  createConversationProjectionStore,
  useConversationRuntime
} from "@agnes/web-ui/assistant-ui";
import {
  forwardRef as forwardRef9,
  useCallback as useCallback4,
  useImperativeHandle as useImperativeHandle9,
  useLayoutEffect as useLayoutEffect9,
  useRef as useRef9,
  useState as useState4,
  useSyncExternalStore as useSyncExternalStore4
} from "react";
import { flushSync as flushSync7 } from "react-dom";

// src/conversation-message-adapter.tsx
import {
  SlotOutlet as SlotOutlet3,
  SlotsProvider as SlotsProvider3
} from "@agnes/web-client";
import {
  ConversationMarkdown as ConversationMarkdown2,
  ConversationMessages,
  ConversationToolCard,
  ConversationTurnActions as ConversationTurnActions2
} from "@agnes/web-ui/assistant-ui";
import { useSyncExternalStore as useSyncExternalStore3 } from "react";
import { Fragment as Fragment2, jsx, jsxs } from "react/jsx-runtime";
var noSessionSubscription = () => () => void 0;
function SlotLeaf({
  node,
  registry,
  claim,
  t: t2
}) {
  const fallback = /* @__PURE__ */ jsx("span", { children: t2("slot.notReady") });
  return /* @__PURE__ */ jsx("div", { "data-slot-node": node.fill.slot, "data-agnes-region": "slot-card", children: registry && claim ? /* @__PURE__ */ jsx(
    SlotOutlet3,
    {
      name: "tool.card.inline",
      props: { fill: node.fill },
      filterEntry: (entry) => claim(entry, node.fill.extId),
      fallback
    }
  ) : /* @__PURE__ */ jsx("div", { "data-slot-state": "empty", children: fallback }) });
}
function DshNodeLeaf({
  node,
  native,
  registry
}) {
  const name = node.kind === "tool" ? "tool.call.toolview" : "conversation.chat.node";
  const entryKey = node.kind === "tool" ? node.name : node.kind;
  const childNames = node.kind === "tool" ? ["tool.call.images", "tool.view.cordis"] : [
    ...node.kind === "assistant" ? ["conversation.chat.assistant-actions"] : [],
    "conversation.chat.commandview",
    "conversation.chat.turnTail",
    "conversation.message.images",
    "conversation.trajectory.images"
  ];
  const observedNames = [name, ...childNames];
  useSyncExternalStore3(
    (listener) => {
      const stops = observedNames.map((slotName) => registry.subscribeBatched(slotName, listener));
      return () => {
        for (const stop of stops) stop();
      };
    },
    () => observedNames.map((slotName) => registry.getVersion(slotName)).join(":")
  );
  const claimed = registry.entriesOfSlot(name).some((entry) => entry.options.key === entryKey);
  const props = node.kind === "tool" ? { owner: { callId: node.toolUseId, toolName: node.name, block: node } } : { owner: { node, nodeId: node.id, kind: node.kind } };
  return /* @__PURE__ */ jsxs(Fragment2, { children: [
    /* @__PURE__ */ jsx("div", { "data-agnes-timeline-native": "1", hidden: claimed, children: native }),
    /* @__PURE__ */ jsx("div", { "data-agnes-dsh-slot": name, hidden: !claimed, children: /* @__PURE__ */ jsx(SlotOutlet3, { name, entryKey, props, hideWhenEmpty: true }) }),
    /* @__PURE__ */ jsx("div", { "data-agnes-dsh-children": name, children: childNames.map(
      (childName) => registry.spec(childName) ? /* @__PURE__ */ jsx(
        SlotOutlet3,
        {
          name: childName,
          ...childName === "tool.view.cordis" || childName === "conversation.chat.commandview" ? { entryKey } : {},
          props,
          hideWhenEmpty: true
        },
        childName
      ) : null
    ) })
  ] });
}
function WebConversationMessages({
  registry,
  claim,
  session,
  locale,
  resources,
  turns,
  visibleNodeIds,
  onFork
}) {
  const sessionScope = useSyncExternalStore3(
    registry ? registry.subscribeSession.bind(registry) : noSessionSubscription,
    () => registry?.sessionId
  );
  const props = {
    t: (key, vars) => locale?.t(key, vars) ?? key,
    ...turns ? { turns } : {},
    ...visibleNodeIds ? { visibleNodeIds } : {},
    renderTurnActions: (turn, finalText, settled) => /* @__PURE__ */ jsx(
      ConversationTurnActions2,
      {
        turn,
        finalText,
        settled,
        t: (key, vars) => locale?.t(key, vars) ?? key,
        ...locale ? { localeTag: locale.locale } : {},
        ...onFork ? { onFork } : {}
      },
      turn.id
    ),
    renderMarkdown: (text3, part, state) => /* @__PURE__ */ jsx(
      ConversationMarkdown2,
      {
        source: text3,
        part,
        streaming: state?.streaming ?? false,
        t: (key, vars) => locale?.t(key, vars) ?? key
      },
      `${state?.nodeId ?? ""}:${part}`
    ),
    renderTool: (node) => /* @__PURE__ */ jsx(
      ConversationToolCard,
      {
        node,
        icon: toolIconReact(node.name),
        t: (key, vars) => locale?.t(key, vars) ?? key
      },
      node.id
    ),
    renderSlot: (node) => /* @__PURE__ */ jsx(
      SlotLeaf,
      {
        node,
        registry,
        claim,
        t: (key) => locale?.t(key) ?? key
      },
      node.id
    ),
    renderNode: (node, native) => registry ? /* @__PURE__ */ jsx(DshNodeLeaf, { node, native, registry }, node.id) : native
  };
  const messages = /* @__PURE__ */ jsx(ConversationMessages, { ...props }, sessionScope ?? "");
  return registry ? /* @__PURE__ */ jsx(
    SlotsProvider3,
    {
      registry,
      ...session ? { session } : {},
      ...locale ? { locale } : {},
      ...resources ? { resources } : {},
      children: messages
    }
  ) : messages;
}

// src/timeline-node-host.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var nearBottom3 = (element3) => element3.scrollHeight - element3.scrollTop - element3.clientHeight <= 80;
var TimelineNodeHost = forwardRef9(function TimelineNodeHost2({ registry, claim, newContentButton, session, locale, resources, onFork, markdownRenderer }, ref) {
  const content = useRef9(null);
  const earlier = useRef9(null);
  const metaRef = useRef9(void 0);
  const scroll = useRef9({
    follow: true,
    expectedTop: 0,
    firstShown: void 0,
    loadingEarlier: false,
    awaitingRender: false,
    loadEpoch: 0
  });
  const [store] = useState4(
    () => createConversationProjectionStore({ sessionId: registry.sessionId ?? "", nodes: [] })
  );
  const runtime = useConversationRuntime(store, locale?.t.bind(locale));
  const projection2 = useSyncExternalStore4(store.subscribe, store.getSnapshot, store.getSnapshot);
  const viewport = useCallback4(
    () => content.current?.closest("#transcript") ?? content.current,
    []
  );
  const scrollToBottom = useCallback4(() => {
    const element3 = viewport();
    if (!element3) return;
    const previousBehavior = element3.style.scrollBehavior;
    element3.style.scrollBehavior = "auto";
    element3.scrollTop = element3.scrollHeight;
    element3.style.scrollBehavior = previousBehavior;
    scroll.current.expectedTop = element3.scrollTop;
    if (newContentButton) newContentButton.hidden = true;
  }, [viewport, newContentButton]);
  const loadEarlier = useCallback4(() => {
    const state = scroll.current;
    const meta = metaRef.current;
    if (state.loadingEarlier || !meta?.hasEarlier || !meta.loadEarlier) return;
    state.loadingEarlier = true;
    const epoch = ++state.loadEpoch;
    const release = () => {
      if (state.loadEpoch === epoch) state.loadingEarlier = false;
    };
    try {
      const result2 = meta.loadEarlier();
      if (result2 === void 0) {
        state.awaitingRender = true;
        return;
      }
      void Promise.resolve(result2).then(release, release);
    } catch (error) {
      release();
      throw error;
    }
  }, []);
  useLayoutEffect9(() => {
    const element3 = viewport();
    if (!element3) return;
    scroll.current.expectedTop = element3.scrollTop;
    const onScroll = () => {
      const state = scroll.current;
      if (Math.abs(element3.scrollTop - state.expectedTop) <= 1) return;
      state.expectedTop = element3.scrollTop;
      state.follow = nearBottom3(element3);
      if (newContentButton) newContentButton.hidden = state.follow;
    };
    const onNewContent = () => {
      scroll.current.follow = true;
      scrollToBottom();
      element3.focus({ preventScroll: true });
    };
    element3.addEventListener("scroll", onScroll);
    newContentButton?.addEventListener("click", onNewContent);
    const sentinel = typeof IntersectionObserver === "function" ? new IntersectionObserver((seen) => {
      if (seen.some((item) => item.isIntersecting)) loadEarlier();
    }) : void 0;
    if (earlier.current) sentinel?.observe(earlier.current);
    return () => {
      element3.removeEventListener("scroll", onScroll);
      newContentButton?.removeEventListener("click", onNewContent);
      sentinel?.disconnect();
      scroll.current.loadEpoch++;
      scroll.current.loadingEarlier = false;
      scroll.current.awaitingRender = false;
      if (newContentButton) newContentButton.hidden = true;
    };
  }, [newContentButton, viewport, scrollToBottom, loadEarlier]);
  useImperativeHandle9(
    ref,
    () => ({
      render(nodes, turns, meta) {
        const element3 = viewport();
        const state = scroll.current;
        if (state.awaitingRender) {
          state.loadingEarlier = false;
          state.awaitingRender = false;
        }
        const firstShown = nodes.find(isConversationNode)?.id;
        const prepended = state.firstShown !== void 0 && firstShown !== state.firstShown && nodes.some((node) => node.id === state.firstShown);
        const fromBottom = element3 ? element3.scrollHeight - element3.scrollTop : 0;
        state.firstShown = firstShown;
        metaRef.current = meta;
        flushSync7(
          () => store.update({
            sessionId: registry.sessionId ?? "",
            nodes,
            ...turns ? { turns } : {},
            ...meta ? { meta } : {}
          })
        );
        if (element3 && state.follow) scrollToBottom();
        else if (element3 && prepended) {
          element3.scrollTop = element3.scrollHeight - fromBottom;
          state.expectedTop = element3.scrollTop;
        } else if (element3 && newContentButton) newContentButton.hidden = nearBottom3(element3);
      },
      reset() {
        metaRef.current = void 0;
        scroll.current.firstShown = void 0;
        scroll.current.loadEpoch++;
        scroll.current.loadingEarlier = false;
        scroll.current.awaitingRender = false;
        scroll.current.follow = true;
        flushSync7(() => store.update({ sessionId: registry.sessionId ?? "", nodes: [] }));
        scroll.current.expectedTop = viewport()?.scrollTop ?? 0;
        if (newContentButton) newContentButton.hidden = true;
      },
      pinToBottom() {
        scroll.current.follow = true;
        scrollToBottom();
      }
    }),
    [registry, store, newContentButton, viewport, scrollToBottom]
  );
  return /* @__PURE__ */ jsxs2(
    "div",
    {
      style: { display: "contents" },
      "data-agnes-region-owner": "builtin",
      "data-agnes-region-unit": "transcript",
      children: [
        /* @__PURE__ */ jsx2("div", { ref: earlier, className: "transcript-earlier", hidden: !projection2.meta?.hasEarlier, children: /* @__PURE__ */ jsx2("button", { type: "button", onClick: loadEarlier, children: locale ? locale.t("timeline.loadEarlier") : "Load earlier records" }) }),
        /* @__PURE__ */ jsx2("div", { id: "transcript-content", ref: content, children: /* @__PURE__ */ jsx2(AssistantRuntimeProvider, { runtime, children: /* @__PURE__ */ jsx2(
          WebConversationMessages,
          {
            registry,
            ...markdownRenderer ? { markdownRenderer } : {},
            ...projection2.turns ? { turns: projection2.turns } : {},
            visibleNodeIds: projection2.nodes.map((node) => node.id),
            ...onFork ? { onFork } : {},
            ...claim ? { claim } : {},
            ...session ? { session } : {},
            ...locale ? { locale } : {},
            ...resources ? { resources } : {}
          }
        ) }) })
      ]
    }
  );
});

// src/region-slots.ts
var SIDEBAR_DEPENDENCIES_BASE = {
  bindSidebar
};
var TRANSCRIPT_DEPENDENCIES = {
  createRenderer: createTimelineRenderer,
  observeCards: observeSlotCards
};
var COMPOSER_DEPENDENCIES = {
  createModelPicker,
  createPermissionPicker,
  createUsagePanel,
  downscaleImage: downscaleImageFile,
  UsagePanel: ConversationUsage2,
  isSubmitShortcut: isComposerSubmitShortcut,
  resize: resizeComposer
};
var COMPOSER_DSH_CHILDREN = Object.freeze({
  "conversation.input.attachments": { kind: "single", scope: "session-maybe" },
  "conversation.input.dock": { kind: "list", scope: "session" },
  "conversation.input.left": { kind: "list", scope: "session" },
  "conversation.input.model": { kind: "single", scope: "session" },
  "conversation.input.overlay": { kind: "list", scope: "session" },
  "conversation.input.permission": { kind: "single", scope: "session" },
  "conversation.input.plan": { kind: "single", scope: "session" },
  "conversation.input.right": { kind: "list", scope: "session" }
});
var COMPOSER_BAR_DSH_CHILDREN = Object.freeze({
  "conversation.composer.dock": { kind: "list", scope: "session" },
  ...COMPOSER_DSH_CHILDREN
});
var DSH_ROOT_CHILDREN = Object.freeze({
  main: { kind: "keyed", scope: "root" },
  rightbar: { kind: "single", scope: "root" },
  sidebar: { kind: "single", scope: "root" },
  "shell.overlay": { kind: "list", scope: "root" }
});
var DSH_MAIN_CONVERSATION_CHILDREN = Object.freeze({
  "conversation.composer": { kind: "chain", scope: "session" },
  "conversation.composer.bar": { kind: "single", scope: "session-maybe" },
  "conversation.session": { kind: "single", scope: "session" }
});
var DSH_CONVERSATION_SESSION_CHILDREN = Object.freeze({
  "conversation.session.header": { kind: "single", scope: "session" },
  "conversation.view": { kind: "list", scope: "session" }
});
var RIGHTBAR_SESSION_CHILDREN = Object.freeze({
  "sidebar.right.pane.tab": { kind: "keyed", scope: "session" },
  "sidebar.right.pane.tab.title": { kind: "keyed", scope: "session" },
  "sidebar.right.tab.menu.item": { kind: "list", scope: "session" }
});
var RIGHTBAR_DOCUMENT_CHILDREN = Object.freeze({
  "sidebar.right.tab.document": { kind: "keyed", scope: "session" }
});
var RIGHTBAR_GUIDE_CHILDREN = Object.freeze({
  "sidebar.right.tab.guide": { kind: "chain", scope: "session" },
  "sidebar.right.tab.guide.entry": { kind: "keyed", scope: "session" }
});
var EMPTY_STATE_SLOT = "ui:empty-state";
var SIDEBAR_SLOT = "ui:sidebar";
var TRANSCRIPT_SLOT = "ui:transcript";
var CONVERSATION_SLOT = "ui:conversation";
var CONVERSATION_CHILD_SLOTS = Object.freeze({
  messageActions: "conversation.message.actions",
  attachments: "conversation.attachments",
  toolCard: "conversation.tool-card",
  feedback: "conversation.feedback"
});
var TRANSCRIPT_CHILD_SLOTS = [
  ["conversation.chat.node", { kind: "keyed", scope: "session" }, TRANSCRIPT_SLOT],
  ["tool.call.toolview", { kind: "keyed", scope: "session" }, TRANSCRIPT_SLOT],
  ["conversation.chat.assistant-actions", { kind: "list", scope: "session" }, "conversation.chat.node"],
  ["conversation.chat.commandview", { kind: "keyed", scope: "session" }, "conversation.chat.node"],
  ["conversation.chat.turnTail", { kind: "chain", scope: "session" }, "conversation.chat.node"],
  ["conversation.message.images", { kind: "single", scope: "session" }, "conversation.chat.node"],
  ["conversation.trajectory.images", { kind: "single", scope: "session" }, "conversation.chat.node"],
  ["tool.call.images", { kind: "single", scope: "session" }, "tool.call.toolview"],
  ["tool.view.cordis", { kind: "keyed", scope: "session" }, "tool.call.toolview"]
];
var CONVERSATION_DSH_CHILDREN = Object.freeze({
  ...DSH_MAIN_CONVERSATION_CHILDREN
});
var CONVERSATION_HEADER_DSH_CHILDREN = Object.freeze({
  "conversation.session.header.actions": { kind: "list", scope: "session" },
  "conversation.session.header.corner": { kind: "single", scope: "session" },
  "conversation.session.header.lineage": { kind: "single", scope: "session" },
  "conversation.session.header.utilities": { kind: "list", scope: "session" }
});
var EMPTY_STATE_CHILD_SLOTS = [
  ["conversation.hero.agentPreset", { kind: "single", scope: "root" }],
  ["conversation.hero.brand.mark", { kind: "single", scope: "root" }],
  ["conversation.hero.workspace", { kind: "single", scope: "root" }],
  ["conversation.hero.workspace.directoryFlow", { kind: "single", scope: "root" }]
];
var TOPBAR_SLOT = "ui:topbar";
var APPROVAL_SLOT = "ui:approval";
var COMPOSER_SLOT = "ui:composer";
var TRACE_SLOT = "ui:trace";
var settingsPaneSlot = (pane) => `ui:settings-pane.${pane}`;
var SETTINGS_UNIT_OWNER = {
  model: "@agnes/web-settings-model",
  plugin: "@agnes/web-settings-plugins",
  resources: "@agnes/web-settings-resources",
  archived: "@agnes/web-settings-archived",
  "computer-use": "@agnes/web-settings-computer-use",
  appearance: "@agnes/web-settings-appearance"
};
var SETTINGS_DSH_GLOBAL_SLOT_NAMES = /* @__PURE__ */ new Set([
  "settings.trigger",
  "settings.header",
  "settings.action",
  "settings.close",
  "settings.onboarding",
  "settings.section"
]);
function EmptyStateBuiltin({
  t: t2 = (key) => key
}) {
  return createElement19(
    "div",
    { "data-agnes-region-owner": "builtin", "data-agnes-region-unit": "empty-state" },
    createElement19(
      "div",
      { className: "conversation-hero-dsh", "data-agnes-conversation-hero": true },
      createElement19(SlotOutlet4, {
        name: "conversation.hero.brand.mark",
        props: { owner: { surface: "conversation.hero" } },
        hideWhenEmpty: true
      }),
      createElement19(SlotOutlet4, {
        name: "conversation.hero.workspace",
        props: { owner: { surface: "conversation.hero" } },
        hideWhenEmpty: true
      }),
      createElement19(SlotOutlet4, {
        name: "conversation.hero.workspace.directoryFlow",
        props: { owner: { surface: "conversation.hero.workspace" } },
        hideWhenEmpty: true
      }),
      createElement19(SlotOutlet4, {
        name: "conversation.hero.agentPreset",
        props: { owner: { surface: "conversation.hero" } },
        hideWhenEmpty: true
      })
    ),
    createElement19("span", { className: "agnes-mark empty-brand-mark", "aria-hidden": "true" }),
    createElement19("h2", { id: "empty-state-title", className: "empty-state-heading" }, "Agnes Harness"),
    createElement19("p", { className: "empty-state-copy" }, t2("app.emptyState.tagline"))
  );
}
function rootStableRegistry(registry) {
  const stable = Object.create(registry);
  Object.defineProperty(stable, "sessionId", { configurable: true, get: () => void 0 });
  Object.defineProperty(stable, "subscribeSession", { configurable: true, value: () => () => void 0 });
  return stable;
}
function mountDshShellRegion(registry) {
  if (registry.spec("root")) throw new Error("DSH shell root is already mounted");
  registry.declare("root", { kind: "single", scope: "root" }, "web-shell");
  const removeRoot = registry.register(
    {
      name: "root",
      id: "builtin-dsh-root",
      owner: "@agnes/web-shell",
      priority: 0,
      children: DSH_ROOT_CHILDREN
    },
    () => null
  );
  const removeMain = registry.register(
    {
      name: "main",
      key: "default",
      id: "builtin-dsh-main",
      owner: "@agnes/web-shell",
      priority: 1,
      children: { "main.conversation": { kind: "single", scope: "session-maybe" } }
    },
    () => createElement19(SlotOutlet4, {
      name: "main.conversation",
      hideWhenEmpty: true
    })
  );
  const overlayHost = document.createElement("div");
  overlayHost.dataset.agnesDshShellOverlay = "true";
  document.body.append(overlayHost);
  const overlayRoot = createAntdRoot(overlayHost);
  flushSync8(() => {
    overlayRoot.render(
      createElement19(
        SlotsProvider4,
        { registry },
        createElement19(SlotOutlet4, { name: "shell.overlay", hideWhenEmpty: true })
      )
    );
  });
  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      overlayRoot.unmount();
      overlayHost.remove();
      removeMain();
      removeRoot();
    }
  };
}
var DSH_SIDEBAR_CHILDREN = Object.freeze({
  "sidebar.brand.mark": { kind: "single", scope: "root" },
  "sidebar.brand.name": { kind: "single", scope: "root" },
  "sidebar.footer.action": { kind: "list", scope: "root" },
  "sidebar.panellist": { kind: "list", scope: "root" },
  "sidebar.settings": { kind: "single", scope: "root" },
  "sidebar.workspaces": { kind: "single", scope: "root" },
  "sidebar.workspaces.directoryFlow": { kind: "single", scope: "root" }
});
function SidebarDshFrame({
  handle,
  state,
  actions,
  dependencies
}) {
  const outlet = (name) => createElement19(SlotOutlet4, { name, hideWhenEmpty: true });
  return createElement19(Sidebar, {
    ref: handle,
    state,
    actions,
    dependencies,
    slots: {
      brandMark: outlet("sidebar.brand.mark"),
      brandName: outlet("sidebar.brand.name"),
      panellist: outlet("sidebar.panellist"),
      footerAction: outlet("sidebar.footer.action"),
      settings: outlet("sidebar.settings"),
      workspaces: createElement19(
        "span",
        { style: { display: "contents" } },
        outlet("sidebar.workspaces"),
        outlet("sidebar.workspaces.directoryFlow")
      )
    }
  });
}
function mountSettingsPaneRegion(registry, container, options = {}, locale) {
  for (const pane of Object.keys(PANE_IDS))
    registry.declare(settingsPaneSlot(pane), { kind: "single", scope: "root" }, "web-shell");
  for (const name of SETTINGS_DSH_SLOT_NAMES) {
    const spec = dshSlotSpec(name);
    if (!spec) throw new Error(`settings DSH slot is missing from the catalog: ${name}`);
    registry.declare(name, spec, "web-shell");
  }
  const handle = { current: null };
  const root = createAntdRoot(container);
  const renderSettingsShell = () => {
    flushSync8(() => {
      root.render(
        createElement19(SettingsBuiltin, {
          ref: handle,
          options: locale ? { ...options, translate: (key) => locale.t(key) } : options
        })
      );
    });
  };
  renderSettingsShell();
  const dshRoots = /* @__PURE__ */ new Map();
  const dshPaneSlots = /* @__PURE__ */ new Map();
  const mountDshOutlet = (name, host, pane) => {
    if (dshRoots.has(name)) throw new Error(`settings DSH slot is mounted twice: ${name}`);
    const dshRoot = createAntdRoot(host);
    dshRoots.set(name, dshRoot);
    if (pane) dshPaneSlots.set(pane, [...dshPaneSlots.get(pane) ?? [], name]);
    flushSync8(() => {
      dshRoot.render(
        createElement19(
          SlotsProvider4,
          { registry },
          createElement19(SlotOutlet4, { name, hideWhenEmpty: true })
        )
      );
    });
  };
  for (const name of SETTINGS_DSH_GLOBAL_SLOT_NAMES) {
    const host = container.querySelector(`#${settingsDshSlotHostId(name)}`);
    if (!host) throw new Error(`settings shell is missing ${name}`);
    mountDshOutlet(name, host);
  }
  const paneRoots = /* @__PURE__ */ new Map();
  const removeBuiltin = /* @__PURE__ */ new Map();
  for (const pane of Object.keys(PANE_IDS)) {
    const slotHost = container.querySelector(`#${settingsPaneSlotHostId(pane)}`);
    if (!slotHost) throw new Error(`settings shell is missing ${settingsPaneSlotHostId(pane)}`);
    const paneRoot = createAntdRoot(slotHost);
    paneRoots.set(pane, paneRoot);
    const remove = registry.register(
      {
        name: settingsPaneSlot(pane),
        id: `builtin-settings-${pane}`,
        owner: SETTINGS_UNIT_OWNER[pane],
        priority: 0
      },
      () => createElement19(SettingsPaneBuiltin, {
        pane,
        computerUse: options.computerUse,
        ...locale ? { translate: (key) => locale.t(key) } : {}
      })
    );
    removeBuiltin.set(pane, remove);
    flushSync8(() => {
      paneRoot.render(
        createElement19(
          SlotsProvider4,
          { registry },
          createElement19(SlotOutlet4, { name: settingsPaneSlot(pane) })
        )
      );
    });
    for (const name of SETTINGS_DSH_SLOT_NAMES) {
      if (SETTINGS_DSH_GLOBAL_SLOT_NAMES.has(name)) continue;
      const dshHost = slotHost.querySelector(`#${settingsDshSlotHostId(name)}`);
      if (!dshHost) continue;
      mountDshOutlet(name, dshHost, pane);
    }
  }
  const translateSettingsMarkup = () => {
    if (locale) applyLocaleText(container, (key) => locale.t(key));
  };
  translateSettingsMarkup();
  const stopLocaleUpdates = locale?.subscribe(() => {
    translateSettingsMarkup();
    const modelRoot = paneRoots.get("model");
    if (!modelRoot) return;
    flushSync8(() => {
      modelRoot.render(
        createElement19(
          SlotsProvider4,
          { registry },
          createElement19(SlotOutlet4, { name: settingsPaneSlot("model") })
        )
      );
    });
  });
  let disposed = false;
  return {
    open(pane) {
      handle.current?.open(pane);
    },
    pane(pane) {
      return handle.current?.pane(pane) ?? null;
    },
    form() {
      return handle.current?.form() ?? null;
    },
    unmountPane(pane) {
      for (const name of dshPaneSlots.get(pane) ?? []) {
        dshRoots.get(name)?.unmount();
        dshRoots.delete(name);
      }
      dshPaneSlots.delete(pane);
      removeBuiltin.get(pane)?.();
      removeBuiltin.delete(pane);
      paneRoots.get(pane)?.unmount();
      paneRoots.delete(pane);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const pane of Object.keys(PANE_IDS)) this.unmountPane(pane);
      for (const [name, dshRoot] of dshRoots) {
        dshRoot.unmount();
        dshRoots.delete(name);
      }
      stopLocaleUpdates?.();
      root.unmount();
    }
  };
}
function ComposerDshFrame({
  registry,
  setHandle,
  options,
  dependencies
}) {
  const outlet = (name) => createElement19(SlotOutlet4, { name, hideWhenEmpty: true });
  return createElement19(
    SlotsProvider4,
    { registry },
    createElement19(
      "div",
      { "data-agnes-composer-dsh": true },
      createElement19(SlotOutlet4, {
        name: "conversation.composer",
        props: { owner: { composerId: "composer" } },
        owner: { composerId: "composer" },
        hideWhenEmpty: true
      }),
      createElement19(Composer, {
        ref: setHandle,
        dependencies,
        ...options,
        slots: {
          attachments: outlet("conversation.input.attachments"),
          dock: createElement19(
            "span",
            { style: { display: "contents" }, "data-agnes-composer-dock": true },
            createElement19(SlotOutlet4, {
              name: "conversation.composer.dock",
              props: { owner: { composerId: "composer" } },
              hideWhenEmpty: true
            }),
            outlet("conversation.input.dock")
          ),
          left: outlet("conversation.input.left"),
          model: outlet("conversation.input.model"),
          overlay: outlet("conversation.input.overlay"),
          permission: outlet("conversation.input.permission"),
          plan: outlet("conversation.input.plan"),
          right: outlet("conversation.input.right")
        }
      })
    )
  );
}
function mountComposerRegion(registry, container, options, locale) {
  const composerDependencies = {
    ...COMPOSER_DEPENDENCIES,
    translate: (key, vars) => locale.t(key, vars),
    // Wrap the usage panel so the shared React component renders with the current locale.
    UsagePanel: (props) => createElement19(ConversationUsage2, {
      ...props,
      t: (key, vars) => locale.t(key, vars)
    }),
    createUsagePanel: (parent) => createUsagePanel(parent, (key, vars) => locale.t(key, vars))
  };
  const ownedShell = registry.spec("root") ? void 0 : mountDshShellRegion(registry);
  if (!registry.spec("conversation.composer"))
    registry.declare(
      "conversation.composer",
      { kind: "chain", scope: "session" },
      "web-shell",
      "main.conversation"
    );
  if (!registry.spec("conversation.composer.bar"))
    registry.declare(
      "conversation.composer.bar",
      { kind: "single", scope: "session-maybe" },
      "web-shell",
      "main.conversation"
    );
  const handle = { current: null };
  let view;
  let draft = options.initialDraft ?? "";
  const setHandle = (value) => {
    handle.current = value;
    if (!value) return;
    value.setDraft(draft);
    const next = view;
    if (next)
      queueMicrotask(() => {
        if (handle.current === value) value.render(next);
      });
  };
  const composerOptions = {
    ...options,
    onDraftChange: (value) => {
      draft = value;
      options.onDraftChange(value);
    }
  };
  registry.declare(COMPOSER_SLOT, { kind: "single", scope: "session-maybe" }, "web-shell");
  const removeDshBarBuiltin = registry.register(
    {
      name: "conversation.composer.bar",
      id: "builtin-conversation-composer-bar",
      owner: "@agnes/web-composer",
      priority: 1,
      children: COMPOSER_BAR_DSH_CHILDREN
    },
    () => ComposerDshFrame({
      registry,
      setHandle,
      options: composerOptions,
      dependencies: composerDependencies
    })
  );
  const removeBuiltin = registry.register(
    {
      name: COMPOSER_SLOT,
      id: "builtin-composer",
      owner: "@agnes/web-composer",
      priority: 0
    },
    () => createElement19(SlotOutlet4, { name: "conversation.composer.bar" })
  );
  const removeSessionListener = registry.subscribeSession(() => handle.current?.clearImageBlocks());
  const root = createAntdRoot(container);
  flushSync8(() => {
    root.render(
      createElement19(
        SlotsProvider4,
        { registry: rootStableRegistry(registry) },
        createElement19(SlotOutlet4, { name: COMPOSER_SLOT })
      )
    );
  });
  let disposed = false;
  return {
    focus() {
      handle.current?.focus();
    },
    getDraft() {
      return handle.current?.getDraft() ?? draft;
    },
    getImageBlocks() {
      return handle.current?.getImageBlocks() ?? [];
    },
    getAttachmentBlocks() {
      return handle.current?.getAttachmentBlocks() ?? [];
    },
    hasPendingImages() {
      return handle.current?.hasPendingImages() ?? false;
    },
    render(next) {
      view = next;
      handle.current?.render(next);
    },
    clearImageBlocks() {
      handle.current?.clearImageBlocks();
    },
    restoreImageBlocks(images) {
      handle.current?.restoreImageBlocks(images);
    },
    restoreAttachmentBlocks(attachments) {
      handle.current?.restoreAttachmentBlocks(attachments);
    },
    resize() {
      handle.current?.resize();
    },
    setDraft(value) {
      draft = value;
      handle.current?.setDraft(value);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      removeSessionListener();
      removeBuiltin();
      removeDshBarBuiltin();
      ownedShell?.dispose();
    }
  };
}
function documentPreviewInput(document2, t2 = (key) => key) {
  return {
    kind: document2?.kind ?? "text",
    title: document2?.title ?? t2("app.doc.previewTitle"),
    content: document2?.content ?? "",
    ...document2?.resourceUrl === void 0 ? {} : { resourceUrl: document2.resourceUrl }
  };
}
function DocumentPreviewBuiltin({
  document: document2,
  resources,
  t: t2 = (key) => key
}) {
  const artifact = document2?.artifact;
  const laneId = document2?.laneId;
  const kind = document2?.kind ?? "text";
  const request = useMemo2(
    () => artifact && laneId ? { artifact, laneId, kind } : void 0,
    [artifact, laneId, kind]
  );
  const [loaded, setLoaded] = useState5();
  useLayoutEffect10(() => {
    setLoaded(void 0);
    if (!request || !resources) return;
    let active = true;
    let resource;
    void resources.documents.load(request).then((value) => {
      if (!active) {
        value.release();
        return;
      }
      resource = value;
      setLoaded({
        request,
        resources,
        input: {
          kind: request.kind,
          ...value.content === void 0 ? {} : { content: value.content },
          ...value.url === void 0 ? {} : { resourceUrl: value.url }
        }
      });
    }).catch((error) => {
      if (!active) return;
      setLoaded({
        request,
        resources,
        input: {
          kind: "text",
          content: error instanceof ClientResourceReclaimedError ? t2("app.doc.reclaimed") : t2("app.doc.unavailable")
        }
      });
    });
    return () => {
      active = false;
      resource?.release();
    };
  }, [request, resources, t2]);
  const input = loaded && loaded.request === request && loaded.resources === resources ? { ...documentPreviewInput(document2, t2), ...loaded.input } : documentPreviewInput(document2, t2);
  return createElement19(
    "div",
    {
      className: "rightbar-document-preview",
      "data-rightbar-document-preview": document2?.id ?? "empty"
    },
    createElement19(DocumentPreview, input)
  );
}
function RightbarDocumentTab({
  document: document2,
  resources,
  t: t2 = (key) => key
}) {
  const kind = document2?.kind ?? "text";
  return createElement19(
    "section",
    { className: "rightbar-tab-content", "data-rightbar-tab": "document" },
    createElement19(SlotOutlet4, {
      name: "sidebar.right.tab.document",
      entryKey: kind,
      props: { owner: document2 },
      fallback: createElement19(DocumentPreviewBuiltin, {
        document: document2,
        ...resources === void 0 ? {} : { resources },
        t: t2
      })
    })
  );
}
function RightbarGuideTab({
  t: t2 = (key) => key
}) {
  return createElement19(
    "section",
    { className: "rightbar-tab-content", "data-rightbar-tab": "guide" },
    createElement19(SlotOutlet4, {
      name: "sidebar.right.tab.guide",
      owner: { tabId: "guide" },
      fallback: t2("app.guide.empty")
    }),
    createElement19(SlotOutlet4, {
      name: "sidebar.right.tab.guide.entry",
      entryKey: "default",
      props: { owner: { entryId: "default", tabId: "guide" } },
      hideWhenEmpty: true
    })
  );
}
function RightbarTabBuiltin({
  tab,
  document: document2,
  resources,
  t: t2 = (key) => key
}) {
  return tab === "document" ? createElement19(RightbarDocumentTab, {
    document: document2,
    ...resources === void 0 ? {} : { resources }
  }) : createElement19(RightbarGuideTab, { t: t2 });
}
function RightbarSessionBuiltin({
  document: document2,
  t: t2 = (key) => key
}) {
  const activeTab = document2 === void 0 ? "guide" : "document";
  const owner = (tabId) => ({
    tabId,
    title: tabId === "document" ? document2?.title ?? t2("app.doc.fallbackTitle") : t2("app.guide.title"),
    active: activeTab === tabId
  });
  return createElement19(
    "div",
    { id: "rightbar-session", "data-agnes-rightbar-session": true },
    createElement19(
      "nav",
      { className: "rightbar-tabs", "aria-label": t2("app.rightbarTabs") },
      createElement19(SlotOutlet4, {
        name: "sidebar.right.pane.tab",
        entryKey: "document",
        props: { owner: owner("document") },
        hideWhenEmpty: true
      }),
      createElement19(SlotOutlet4, {
        name: "sidebar.right.pane.tab",
        entryKey: "guide",
        props: { owner: owner("guide") },
        hideWhenEmpty: true
      }),
      createElement19(SlotOutlet4, {
        name: "sidebar.right.pane.tab.title",
        entryKey: activeTab,
        props: { owner: owner(activeTab) },
        fallback: owner(activeTab).title,
        hideWhenEmpty: true
      }),
      createElement19(SlotOutlet4, {
        name: "sidebar.right.tab.menu.item",
        props: { owner: { activeTab } },
        hideWhenEmpty: true
      })
    )
  );
}
function RightbarBuiltin() {
  return createElement19(
    "div",
    { id: "rightbar-content", "data-agnes-region-unit": "rightbar" },
    createElement19(SlotOutlet4, { name: "rightbar.session", hideWhenEmpty: true })
  );
}
function mountRightbarRegion(registry, container, options = {}, locale) {
  const t2 = locale ? (key) => locale.t(key) : void 0;
  const rootSpec = dshSlotSpec("rightbar");
  const sessionSpec = dshSlotSpec("rightbar.session");
  if (!rootSpec || !sessionSpec) throw new Error("rightbar DSH slots are missing from the catalog");
  if (!registry.spec("rightbar")) registry.declare("rightbar", rootSpec, "web-shell");
  const removeBuiltin = registry.register(
    {
      name: "rightbar",
      id: "builtin-rightbar",
      owner: "@agnes/web-rightbar",
      priority: 0,
      children: { "rightbar.session": sessionSpec }
    },
    () => createElement19(RightbarBuiltin)
  );
  const removeSessionBuiltin = registry.register(
    {
      name: "rightbar.session",
      id: "builtin-rightbar-session",
      owner: "@agnes/web-rightbar",
      priority: 1,
      children: RIGHTBAR_SESSION_CHILDREN
    },
    () => createElement19(RightbarSessionBuiltin, {
      document: options.document,
      ...t2 ? { t: t2 } : {}
    })
  );
  const removeDocumentTab = registry.register(
    {
      name: "sidebar.right.pane.tab",
      key: "document",
      id: "builtin-rightbar-document-tab",
      owner: "@agnes/web-rightbar",
      priority: 1,
      children: RIGHTBAR_DOCUMENT_CHILDREN
    },
    () => createElement19(RightbarTabBuiltin, {
      tab: "document",
      document: options.document,
      ...options.resources === void 0 ? {} : { resources: options.resources }
    })
  );
  const removeGuideTab = registry.register(
    {
      name: "sidebar.right.pane.tab",
      key: "guide",
      id: "builtin-rightbar-guide-tab",
      owner: "@agnes/web-rightbar",
      priority: 1,
      children: RIGHTBAR_GUIDE_CHILDREN
    },
    () => createElement19(RightbarTabBuiltin, {
      tab: "guide",
      document: options.document,
      ...options.resources === void 0 ? {} : { resources: options.resources }
    })
  );
  const documentRenderers = [];
  for (const kind of ["text", "markdown", "html", "image", "pdf", "code"]) {
    documentRenderers.push(
      registry.register(
        {
          name: "sidebar.right.tab.document",
          key: kind,
          id: `builtin-rightbar-document-${kind}`,
          owner: "@agnes/web-rightbar",
          priority: 1
        },
        ({ owner }) => createElement19(DocumentPreviewBuiltin, {
          document: owner ?? options.document,
          ...options.resources === void 0 ? {} : { resources: options.resources },
          ...t2 ? { t: t2 } : {}
        })
      )
    );
  }
  const root = createAntdRoot(container);
  const watchedSlots = [
    "rightbar",
    "rightbar.session",
    "sidebar.right.pane.tab",
    "sidebar.right.pane.tab.title",
    "sidebar.right.tab.document",
    "sidebar.right.tab.guide",
    "sidebar.right.tab.guide.entry",
    "sidebar.right.tab.menu.item"
  ];
  const hasCustomRightbarEntry = () => options.document !== void 0 || watchedSlots.some((name) => registry.entries(name).some((entry) => entry.owner !== "@agnes/web-rightbar"));
  const syncVisibility = () => {
    container.hidden = !hasCustomRightbarEntry();
  };
  const stops = watchedSlots.map((name) => registry.subscribeBatched(name, syncVisibility));
  flushSync8(() => {
    root.render(
      createElement19(
        SlotsProvider4,
        { registry, ...options.session ? { session: options.session } : {} },
        createElement19(SlotOutlet4, { name: "rightbar" })
      )
    );
  });
  syncVisibility();
  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const stop of stops) stop();
      root.unmount();
      for (const remove of documentRenderers) remove();
      removeGuideTab();
      removeDocumentTab();
      removeSessionBuiltin();
      removeBuiltin();
      container.hidden = true;
    }
  };
}
function mountTraceRegion(registry, container, options) {
  registry.declare(TRACE_SLOT, { kind: "single", scope: "session-maybe" }, "web-shell");
  const handle = { current: null };
  const removeBuiltin = registry.register(
    { name: TRACE_SLOT, id: "builtin-trace", owner: "@agnes/web-trace", priority: 0 },
    () => createElement19(Trace, { ref: handle, root: container, options })
  );
  const root = createAntdRoot(container);
  flushSync8(() => {
    root.render(createElement19(SlotsProvider4, { registry }, createElement19(SlotOutlet4, { name: TRACE_SLOT })));
  });
  let disposed = false;
  return {
    render(nodes, turns, meta) {
      handle.current?.render(nodes, turns, meta);
    },
    setOpen(open3) {
      handle.current?.setOpen(open3);
    },
    isOpen() {
      return handle.current?.isOpen() ?? false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      removeBuiltin();
    }
  };
}
function mountTopbarRegion(registry, container, locale) {
  const handle = { current: null };
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  let taskTitle;
  let status;
  let connectionState;
  const setHandle = (value) => {
    handle.current = value;
    if (!value) return;
    resolveReady();
    if (taskTitle !== void 0) value.setTaskTitle(taskTitle);
    if (status !== void 0) value.setStatus(status.text, status.state);
    if (connectionState !== void 0) value.setConnectionState(connectionState);
  };
  registry.declare(TOPBAR_SLOT, { kind: "single", scope: "root" }, "web-shell");
  const removeBuiltin = registry.register(
    { name: TOPBAR_SLOT, id: "builtin-topbar", owner: "@agnes/web-topbar", priority: 0 },
    () => createElement19(Topbar, {
      ref: setHandle,
      translate: (key, vars) => locale.t(key, vars)
    })
  );
  container.replaceChildren();
  const root = createAntdRoot(container);
  flushSync8(() => {
    root.render(
      createElement19(
        SlotsProvider4,
        { registry: rootStableRegistry(registry) },
        createElement19(SlotOutlet4, { name: TOPBAR_SLOT })
      )
    );
  });
  let disposed = false;
  return {
    ready,
    setTaskTitle(title) {
      taskTitle = title;
      handle.current?.setTaskTitle(title);
    },
    setStatus(text3, state) {
      status = { text: text3, ...state === void 0 ? {} : { state } };
      handle.current?.setStatus(text3, state);
    },
    setConnectionState(value) {
      connectionState = value;
      handle.current?.setConnectionState(value);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      removeBuiltin();
    }
  };
}
var APPROVAL_DSH_CHILDREN = Object.freeze({
  "conversation.approval.detail": { kind: "single", scope: "session" }
});
function ApprovalDshFrame({
  setHandle
}) {
  return createElement19(Approval, {
    ref: setHandle,
    detail: createElement19(SlotOutlet4, { name: "conversation.approval.detail", hideWhenEmpty: true })
  });
}
function mountApprovalRegion(registry, container) {
  const handle = { current: null };
  let view;
  const setHandle = (value) => {
    handle.current = value;
    if (value) value.render(view);
  };
  registry.declare(APPROVAL_SLOT, { kind: "single", scope: "session-maybe" }, "web-shell");
  const removeBuiltin = registry.register(
    {
      name: APPROVAL_SLOT,
      id: "builtin-approval",
      owner: "@agnes/web-approval",
      priority: 0,
      children: APPROVAL_DSH_CHILDREN
    },
    () => ApprovalDshFrame({ setHandle })
  );
  container.replaceChildren();
  const root = createAntdRoot(container);
  flushSync8(() => {
    root.render(
      createElement19(SlotsProvider4, { registry }, createElement19(SlotOutlet4, { name: APPROVAL_SLOT }))
    );
  });
  let disposed = false;
  return {
    render(next) {
      view = next;
      container.hidden = next === void 0;
      if (next) container.dataset.key = next.key;
      else container.removeAttribute("data-key");
      handle.current?.render(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      removeBuiltin();
    }
  };
}
function ConversationSessionHeaderBuiltin({
  sessionId
}) {
  const owner = { sessionId: sessionId ?? "" };
  return createElement19(
    "header",
    { className: "conversation-session-header", "data-agnes-conversation-header": true },
    createElement19(SlotOutlet4, {
      name: "conversation.session.header.lineage",
      props: { owner },
      hideWhenEmpty: true
    }),
    createElement19(SlotOutlet4, {
      name: "conversation.session.header.actions",
      props: { owner },
      hideWhenEmpty: true
    }),
    createElement19(SlotOutlet4, {
      name: "conversation.session.header.utilities",
      props: { owner },
      hideWhenEmpty: true
    }),
    createElement19(SlotOutlet4, {
      name: "conversation.session.header.corner",
      props: { owner },
      hideWhenEmpty: true
    })
  );
}
function ConversationSessionBuiltin() {
  return createElement19("span", {
    hidden: true,
    "data-agnes-conversation-session": true
  });
}
function mountConversationRegion(registry, container, options = {}) {
  const ownedShell = registry.spec("root") ? void 0 : mountDshShellRegion(registry);
  registry.declare(CONVERSATION_SLOT, { kind: "single", scope: "session-maybe" }, "web-shell");
  const handle = { current: null };
  const removeMainConversationBuiltin = registry.register(
    {
      name: "main.conversation",
      id: "builtin-dsh-main-conversation",
      owner: "@agnes/web-conversation",
      priority: 1,
      children: CONVERSATION_DSH_CHILDREN
    },
    () => createElement19(Conversation, {
      ref: handle,
      ...options.onMount ? { onMount: options.onMount } : {},
      ...options.onUnmount ? { onUnmount: options.onUnmount } : {},
      ...options.locale ? {
        translate: (key, vars) => options.locale?.t(key, vars) ?? key
      } : {},
      slots: {
        session: createElement19(SlotOutlet4, { name: "conversation.session", hideWhenEmpty: true }),
        sessionHeader: createElement19(SlotOutlet4, {
          name: "conversation.session.header",
          hideWhenEmpty: true
        })
      }
    })
  );
  const removeSessionBuiltin = registry.register(
    {
      name: "conversation.session",
      id: "builtin-conversation-session",
      owner: "@agnes/web-conversation",
      priority: 1,
      children: DSH_CONVERSATION_SESSION_CHILDREN
    },
    () => createElement19(ConversationSessionBuiltin)
  );
  const removeBuiltin = registry.register(
    {
      name: CONVERSATION_SLOT,
      id: "builtin-conversation",
      owner: "@agnes/web-conversation",
      priority: 0,
      children: {
        [CONVERSATION_CHILD_SLOTS.messageActions]: { kind: "list", scope: "session-maybe" },
        [CONVERSATION_CHILD_SLOTS.attachments]: { kind: "list", scope: "session-maybe" },
        [CONVERSATION_CHILD_SLOTS.toolCard]: { kind: "list", scope: "session-maybe" },
        [CONVERSATION_CHILD_SLOTS.feedback]: { kind: "list", scope: "session-maybe" }
      }
    },
    () => createElement19(SlotOutlet4, { name: "main", entryKey: "default", hideWhenEmpty: true })
  );
  const removeHeaderBuiltin = registry.register(
    {
      name: "conversation.session.header",
      id: "builtin-conversation-session-header",
      owner: "@agnes/web-conversation",
      priority: 1,
      children: CONVERSATION_HEADER_DSH_CHILDREN
    },
    ({ sessionId }) => createElement19(ConversationSessionHeaderBuiltin, {
      ...sessionId === void 0 ? {} : { sessionId }
    })
  );
  container.replaceChildren();
  const root = createAntdRoot(container);
  flushSync8(() => {
    root.render(
      createElement19(
        SlotsProvider4,
        { registry, ...options.session ? { session: options.session } : {} },
        createElement19(SlotOutlet4, { name: CONVERSATION_SLOT })
      )
    );
  });
  let disposed = false;
  return {
    setEmptyStateVisible(visible) {
      handle.current?.setEmptyStateVisible(visible);
    },
    isTranscriptNearBottom() {
      return handle.current?.isTranscriptNearBottom() ?? false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      removeHeaderBuiltin();
      removeSessionBuiltin();
      removeMainConversationBuiltin();
      removeBuiltin();
      ownedShell?.dispose();
    }
  };
}
function mountSidebarRegion(registry, container, options = {}, locale) {
  const sidebarDependencies = {
    ...SIDEBAR_DEPENDENCIES_BASE,
    translate: (key, vars) => locale.t(key, vars),
    renderNavigation: (options2) => renderSessionNavigation(options2, (key, vars) => locale.t(key, vars))
  };
  registry.declare(SIDEBAR_SLOT, { kind: "single", scope: "root" }, "web-shell");
  if (!registry.spec("sidebar")) registry.declare("sidebar", { kind: "single", scope: "root" }, "web-shell");
  const handle = { current: null };
  const removeDshBuiltin = registry.register(
    {
      name: "sidebar",
      id: "builtin-sidebar-dsh",
      owner: "@agnes/web-sidebar",
      priority: 0,
      children: DSH_SIDEBAR_CHILDREN
    },
    () => SidebarDshFrame({
      handle,
      state: options.state ?? EMPTY_SIDEBAR_STATE,
      ...options.actions === void 0 ? {} : { actions: options.actions },
      dependencies: sidebarDependencies
    })
  );
  const removeBuiltin = registry.register(
    { name: SIDEBAR_SLOT, id: "builtin-sidebar", owner: "@agnes/web-sidebar", priority: 0 },
    () => createElement19(SlotsProvider4, { registry }, createElement19(SlotOutlet4, { name: "sidebar" }))
  );
  const root = createAntdRoot(container);
  flushSync8(() => {
    root.render(
      createElement19(
        SlotsProvider4,
        { registry: rootStableRegistry(registry) },
        createElement19(SlotOutlet4, { name: SIDEBAR_SLOT })
      )
    );
  });
  let disposed = false;
  return {
    update(state) {
      flushSync8(() => handle.current?.update(state));
    },
    close() {
      handle.current?.close();
    },
    dismiss() {
      handle.current?.dismiss();
    },
    focusNew() {
      handle.current?.focusNew();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      removeBuiltin();
      removeDshBuiltin();
    }
  };
}
function mountTranscriptRegion(registry, container, options = {}) {
  if (!registry.spec("conversation.view"))
    registry.declare(
      "conversation.view",
      { kind: "list", scope: "session" },
      "web-shell",
      "conversation.session"
    );
  if (!registry.spec(TRANSCRIPT_SLOT))
    registry.declare(TRANSCRIPT_SLOT, { kind: "single", scope: "session-maybe" }, "web-shell");
  for (const [name, spec, parent] of TRANSCRIPT_CHILD_SLOTS)
    if (!registry.spec(name)) registry.declare(name, spec, "web-shell", parent);
  const handle = { current: null };
  const removeBuiltin = registry.register(
    {
      name: TRANSCRIPT_SLOT,
      id: "builtin-transcript",
      owner: "@agnes/web-transcript",
      priority: 0
    },
    () => options.nodeHost === "react" ? createElement19(TimelineNodeHost, {
      ref: handle,
      registry,
      ...options.markdownRenderer ? { markdownRenderer: options.markdownRenderer } : {},
      ...options.claim ? { claim: options.claim } : {},
      ...options.newContentButton ? { newContentButton: options.newContentButton } : {},
      ...options.onFork ? { onFork: options.onFork } : {},
      ...options.session ? { session: options.session } : {},
      ...options.locale ? { locale: options.locale } : {},
      ...options.resources ? { resources: options.resources } : {}
    }) : createElement19(Transcript, {
      ref: handle,
      dependencies: {
        ...TRANSCRIPT_DEPENDENCIES,
        createRenderer(rendererOptions) {
          return createTimelineRenderer({
            ...rendererOptions,
            registry,
            ...options.session ? { session: options.session } : {},
            ...options.locale ? { locale: options.locale } : {},
            ...options.resources ? { resources: options.resources } : {}
          });
        }
      },
      ...options
    })
  );
  const removeViewBuiltin = registry.register(
    {
      name: "conversation.view",
      id: "builtin-conversation-view",
      owner: "@agnes/web-transcript",
      priority: 0
    },
    () => createElement19(SlotOutlet4, { name: TRANSCRIPT_SLOT })
  );
  container.replaceChildren();
  const root = createAntdRoot(container);
  flushSync8(() => {
    root.render(
      createElement19(
        SlotsProvider4,
        {
          registry,
          ...options.session ? { session: options.session } : {},
          ...options.locale ? { locale: options.locale } : {},
          ...options.resources ? { resources: options.resources } : {}
        },
        createElement19(SlotOutlet4, {
          name: "conversation.view",
          fallback: createElement19(SlotOutlet4, { name: TRANSCRIPT_SLOT })
        })
      )
    );
  });
  let disposed = false;
  return {
    render(nodes, turns, meta) {
      handle.current?.render(nodes, turns, meta);
    },
    reset() {
      handle.current?.reset();
    },
    pinToBottom() {
      handle.current?.pinToBottom();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      removeViewBuiltin();
      removeBuiltin();
    }
  };
}
function mountEmptyStateRegion(registry, container, services = {}) {
  if (!registry.spec(EMPTY_STATE_SLOT))
    registry.declare(EMPTY_STATE_SLOT, { kind: "single", scope: "root" }, "web-shell");
  for (const [name, spec] of EMPTY_STATE_CHILD_SLOTS)
    if (!registry.spec(name)) registry.declare(name, spec, "web-shell", EMPTY_STATE_SLOT);
  const translate = services.locale ? (key) => services.locale?.t(key) ?? key : void 0;
  const removeBuiltin = registry.register(
    {
      name: EMPTY_STATE_SLOT,
      id: "builtin-empty-state",
      owner: "@agnes/web-empty-state",
      priority: 0
    },
    () => createElement19(EmptyStateBuiltin, translate ? { t: translate } : {})
  );
  container.replaceChildren();
  const root = createAntdRoot(container);
  const providerProps = {
    registry,
    ...services.session ? { session: services.session } : {},
    ...services.locale ? { locale: services.locale } : {}
  };
  root.render(
    createElement19(SlotsProvider4, providerProps, createElement19(SlotOutlet4, { name: EMPTY_STATE_SLOT }))
  );
  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      removeBuiltin();
    }
  };
}

// src/client-modules/reconcile.ts
import { FiberState } from "@agnes/cordis";
import {
  clientModule,
  DSH_SLOT_CATALOG_VERSION,
  getDshSlotDefinition,
  isPublicDshSlot,
  isRuntimeSupportedDshSlot
} from "@agnes/web-client";

// src/client-modules/runtime-status.ts
var ERROR_KEYS = {
  import: "runtime.import",
  styles: "runtime.styles",
  "unsupported-slot": "runtime.unsupportedSlot",
  "module-shape": "runtime.moduleShape",
  apply: "runtime.apply",
  render: "runtime.render",
  dispose: "runtime.dispose",
  timeout: "runtime.timeout",
  "row-alias": "runtime.rowAlias",
  reconcile: "runtime.reconcile"
};
var ERROR_CODES = {
  import: "CLIENT_MODULE_IMPORT_FAILED",
  styles: "CLIENT_MODULE_STYLES_FAILED",
  "unsupported-slot": "CLIENT_MODULE_SLOT_UNSUPPORTED",
  "module-shape": "CLIENT_MODULE_SHAPE_INVALID",
  apply: "CLIENT_MODULE_APPLY_FAILED",
  render: "CLIENT_MODULE_RENDER_FAILED",
  dispose: "CLIENT_MODULE_DISPOSE_FAILED",
  timeout: "CLIENT_MODULE_TIMEOUT",
  "row-alias": "CLIENT_MODULE_ROW_ALIAS_INVALID",
  reconcile: "CLIENT_MODULE_RECONCILE_FAILED"
};
function normalizeRuntimeError(stage, _error, t2 = (key) => key) {
  return { code: ERROR_CODES[stage], message: t2(ERROR_KEYS[stage]) };
}
function copyState(state) {
  return {
    packageId: state.packageId,
    revision: state.revision,
    phase: state.phase,
    ...state.error === void 0 ? {} : { error: { ...state.error } }
  };
}
var RuntimeStatusStore = class {
  #states = /* @__PURE__ */ new Map();
  #listeners = /* @__PURE__ */ new Set();
  set(state, key = state.packageId) {
    const next = copyState(state);
    this.#states.set(key, next);
    for (const listener of [...this.#listeners]) listener(copyState(next));
  }
  delete(key) {
    this.#states.delete(key);
  }
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  snapshot() {
    return new Map([...this.#states].map(([key, state]) => [key, copyState(state)]));
  }
};

// src/client-modules/reconcile.ts
function rowKey(module) {
  return module.rowId ?? module.packageId;
}
function validateCatalogContract(target) {
  const dshSlots = target.slots.filter((slot) => getDshSlotDefinition(slot) !== void 0);
  if (dshSlots.length === 0) return void 0;
  if (target.slotCatalogVersion !== DSH_SLOT_CATALOG_VERSION)
    return `slot catalog version is not supported: ${target.slotCatalogVersion ?? "missing"}`;
  const hostOnly = dshSlots.find((slot) => !isPublicDshSlot(slot));
  if (hostOnly !== void 0) return `host-only slot cannot be contributed: ${hostOnly}`;
  const unsupported = dshSlots.find((slot) => !isRuntimeSupportedDshSlot(slot));
  if (unsupported !== void 0) return `slot is not mounted by the current host: ${unsupported}`;
  return void 0;
}
var DEFAULT_TIMEOUTS = { import: 15e3, styles: 15e3, apply: 15e3, dispose: 5e3 };
function withTimeout(promise, ms, label2) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label2} timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
async function prepareDocumentStyles(target, timeoutMs) {
  if (target.styleUrls.length === 0) return { activate() {
  }, dispose() {
  } };
  const links = target.styleUrls.map((href) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.media = "not all";
    link.dataset.plugin = target.packageId;
    return link;
  });
  let timer;
  try {
    const loaded = Promise.all(
      links.map(
        (link) => new Promise((resolve, reject) => {
          link.addEventListener("load", () => resolve(), { once: true });
          link.addEventListener("error", () => reject(new Error(`stylesheet failed: ${link.href}`)), {
            once: true
          });
          document.head.append(link);
        })
      )
    );
    await Promise.race([
      loaded,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`styles ${target.packageId} timeout after ${timeoutMs}ms`)),
          timeoutMs
        );
      })
    ]);
  } catch (error) {
    for (const link of links) link.remove();
    throw error;
  } finally {
    if (timer !== void 0) clearTimeout(timer);
  }
  let disposed = false;
  return {
    activate() {
      if (!disposed) for (const link of links) link.media = "all";
    },
    dispose() {
      disposed = true;
      for (const link of links) link.remove();
    }
  };
}
function createReconciler(options) {
  const { ctx, source, locale } = options;
  const removeOwner = options.removeOwner ?? ((packageId) => {
    const registry2 = ctx.slots;
    registry2?.removeOwner(packageId);
  });
  let importGeneration = 0;
  const importer = options.importer ?? ((url) => {
    const separator = url.includes("?") ? "&" : "?";
    return import(
      /* @vite-ignore */
      `${url}${separator}agnes_hmr=${++importGeneration}`
    );
  });
  const prepareStyles = options.prepareStyles ?? prepareDocumentStyles;
  const moduleCache = options.moduleCache ?? { delete: () => void 0 };
  const timeouts = { ...DEFAULT_TIMEOUTS, ...options.timeouts };
  const packages = /* @__PURE__ */ new Map();
  const statuses = new RuntimeStatusStore();
  async function lifecycle(step, packageId) {
    await options.onLifecycleStep?.(step, packageId);
  }
  function stateOf(packageId) {
    let state = packages.get(packageId);
    if (!state) {
      state = {
        packageId,
        revision: void 0,
        phase: "idle",
        epoch: 0,
        target: void 0,
        active: void 0,
        ownerRowId: void 0,
        fiber: void 0,
        styles: void 0,
        draining: void 0,
        rosterPresent: false,
        cleanup: { fiber: void 0, styles: void 0 },
        cleanupPending: false,
        cleanupQueued: false,
        failure: void 0,
        chain: Promise.resolve()
      };
      packages.set(packageId, state);
    }
    return state;
  }
  function setPhase(rowId, state, phase, failure) {
    state.phase = phase;
    state.failure = failure;
    statuses.set(
      {
        packageId: state.packageId,
        revision: state.revision,
        phase,
        ...failure === void 0 ? {} : { error: failure }
      },
      rowId
    );
  }
  function fail(rowId, state, stage) {
    setPhase(
      rowId,
      state,
      "failed",
      normalizeRuntimeError(stage, void 0, (key) => locale?.t(key) ?? key)
    );
  }
  function registrationOwner(rowId, state) {
    return state.ownerRowId ?? rowId;
  }
  const registry = ctx.slots;
  registry?.onEntryError?.((_name, entry) => {
    if (!entry.owner) return;
    const state = packages.get(entry.owner);
    if (state?.phase !== "active") return;
    fail(entry.owner, state, "render");
  });
  async function discardUncommitted(fiber, rowId) {
    if (!fiber) return;
    try {
      await withTimeout(Promise.resolve(fiber.dispose()), timeouts.dispose, `dispose ${rowId}`);
    } catch {
      console.warn("[client-modules] 回收未提交的 fiber 失败");
    } finally {
      try {
        removeOwner(rowId);
      } catch {
        console.warn("[client-modules] 回收模块注册项失败");
      }
    }
  }
  async function drainFiber(state, fiber, rowId) {
    const drain = Promise.resolve().then(() => fiber.dispose());
    let settled;
    settled = drain.then(
      () => void 0,
      (error) => Promise.reject(error)
    ).finally(() => {
      if (state.draining === settled) state.draining = void 0;
    });
    state.draining = settled;
    await withTimeout(settled, timeouts.dispose, `dispose ${rowId}`);
  }
  async function disposeCleanup(rowId, state) {
    if (!state.cleanupPending) return true;
    let fiber = state.cleanup.fiber;
    let styles = state.cleanup.styles;
    if (fiber) {
      try {
        await drainFiber(state, fiber, rowId);
        fiber = void 0;
      } catch {
      }
    }
    if (styles) {
      try {
        styles.dispose();
        styles = void 0;
      } catch {
      }
    }
    if (fiber || styles) {
      state.cleanup = { fiber, styles };
      state.cleanupPending = true;
      return false;
    }
    state.cleanup = { fiber: void 0, styles: void 0 };
    state.cleanupPending = false;
    const ownerRowId = registrationOwner(rowId, state);
    state.ownerRowId = void 0;
    try {
      removeOwner(ownerRowId);
    } catch {
      console.warn("[client-modules] 名册撤回后回收模块注册项失败");
    }
    return true;
  }
  function applyTarget(rowId, state, target) {
    const epoch = ++state.epoch;
    state.packageId = target.packageId;
    state.target = target;
    setPhase(rowId, state, "loading");
    const run2 = async () => {
      let mod;
      let stagedStyles;
      try {
        if (state.cleanupPending && !await disposeCleanup(rowId, state)) {
          if (epoch === state.epoch) fail(rowId, state, "dispose");
          return;
        }
        await state.draining?.catch(() => void 0);
        const catalogError = validateCatalogContract(target);
        const unsupportedSlot = target.slots.find((slot) => registry?.spec && !registry.spec(slot));
        if (catalogError !== void 0 || unsupportedSlot !== void 0) {
          if (epoch === state.epoch) fail(rowId, state, "unsupported-slot");
          return;
        }
        await lifecycle("invalidate", rowId);
        await lifecycle("prefetch", rowId);
        mod = await withTimeout(importer(target.entryUrl), timeouts.import, `import ${rowId}`);
      } catch (error) {
        if (epoch === state.epoch)
          fail(
            rowId,
            state,
            error instanceof Error && error.message.includes("timeout") ? "timeout" : "import"
          );
        return;
      }
      try {
        stagedStyles = await prepareStyles(target, timeouts.styles);
      } catch (error) {
        stagedStyles?.dispose();
        if (epoch === state.epoch)
          fail(
            rowId,
            state,
            error instanceof Error && error.message.includes("timeout") ? "timeout" : "styles"
          );
        return;
      }
      try {
        if (typeof mod !== "object" || mod === null || typeof mod.apply !== "function") {
          if (epoch === state.epoch) fail(rowId, state, "module-shape");
          stagedStyles.dispose();
          return;
        }
        if (epoch !== state.epoch) {
          stagedStyles.dispose();
          return;
        }
        const old = state.fiber;
        const oldStyles = state.styles;
        const oldEntryUrl = state.active?.entryUrl ?? target.entryUrl;
        await lifecycle("cache-registry-delete", rowId);
        if (old || oldStyles || state.active) await moduleCache.delete(oldEntryUrl);
        const oldOwnerRowId = registrationOwner(rowId, state);
        try {
          removeOwner(oldOwnerRowId);
        } catch {
          console.warn("[client-modules] 旧模块注册项回收失败");
        }
        state.fiber = void 0;
        state.styles = void 0;
        state.active = void 0;
        if (old) {
          try {
            await lifecycle("drain", rowId);
            await drainFiber(state, old, rowId);
          } catch (error) {
            stagedStyles.dispose();
            state.cleanup = { fiber: old, styles: oldStyles };
            state.cleanupPending = Boolean(old || oldStyles);
            if (epoch === state.epoch)
              fail(
                rowId,
                state,
                error instanceof Error && error.message.includes("timeout") ? "timeout" : "dispose"
              );
            return;
          }
        }
        await lifecycle("remove-styles", rowId);
        oldStyles?.dispose();
        state.ownerRowId = void 0;
        if (epoch !== state.epoch) {
          stagedStyles.dispose();
          try {
            removeOwner(oldOwnerRowId);
          } catch {
            console.warn("[client-modules] 过期模块注册项回收失败");
          }
          return;
        }
        let fiber;
        try {
          await lifecycle("refresh", rowId);
          stagedStyles.activate();
          const created = ctx.plugin(clientModule(mod), {
            rowId,
            packageId: target.packageId,
            revision: target.revision,
            allowedSlots: target.slots,
            ...target.slotCatalogVersion === void 0 ? {} : { slotCatalogVersion: target.slotCatalogVersion },
            ...target.contentDigest === void 0 ? {} : { contentDigest: target.contentDigest },
            ...target.services === void 0 ? {} : { services: target.services },
            ...target.publicConfig === void 0 ? {} : { publicConfig: target.publicConfig }
          });
          fiber = created;
          await lifecycle("await", rowId);
          const settled = await withTimeout(Promise.resolve(created), timeouts.apply, `apply ${rowId}`);
          const fiberState = settled.state;
          if (fiberState !== void 0 && fiberState !== FiberState.ACTIVE)
            throw new Error(`client module ${rowId} did not activate`);
        } catch {
          await discardUncommitted(fiber, rowId);
          stagedStyles.dispose();
          if (epoch === state.epoch) fail(rowId, state, "apply");
          return;
        }
        if (epoch !== state.epoch) {
          await discardUncommitted(fiber, rowId);
          stagedStyles.dispose();
          return;
        }
        state.fiber = fiber;
        state.styles = stagedStyles;
        state.active = target;
        state.ownerRowId = rowId;
        state.revision = target.revision;
        setPhase(rowId, state, "active");
      } catch (error) {
        stagedStyles?.dispose();
        if (epoch === state.epoch)
          fail(
            rowId,
            state,
            error instanceof Error && error.message.includes("timeout") ? "timeout" : "reconcile"
          );
      }
    };
    state.chain = state.chain.then(run2, run2);
    return state.chain;
  }
  function migrateRosterAliases(rawAliases, wanted) {
    const isWebRowId = (value) => value.startsWith("web:") && value.length >= 5 && value.length <= 256 && !value.includes("\0");
    const blocked = /* @__PURE__ */ new Set();
    const raw = new Map(Object.entries(rawAliases ?? {}));
    const resolved = /* @__PURE__ */ new Map();
    const resolving = /* @__PURE__ */ new Set();
    const resolve = (source2) => {
      const cached = resolved.get(source2);
      if (cached !== void 0) return cached;
      if (resolving.has(source2)) return void 0;
      resolving.add(source2);
      const target = raw.get(source2);
      const value = target === void 0 ? source2 : resolve(target);
      resolving.delete(source2);
      if (value !== void 0) resolved.set(source2, value);
      return value;
    };
    const sourcesByTarget = /* @__PURE__ */ new Map();
    for (const [oldRowId, rawTarget] of raw) {
      if (!isWebRowId(oldRowId) || !isWebRowId(rawTarget) || oldRowId === rawTarget) {
        if (wanted.has(rawTarget)) blocked.add(rawTarget);
        continue;
      }
      const target = resolve(oldRowId);
      if (target === void 0) {
        blocked.add(oldRowId);
        if (wanted.has(rawTarget)) blocked.add(rawTarget);
        continue;
      }
      if (!wanted.has(target)) continue;
      const sources = sourcesByTarget.get(target) ?? [];
      sources.push(oldRowId);
      sourcesByTarget.set(target, sources);
    }
    for (const [target, sources] of sourcesByTarget) {
      const liveSources = sources.filter(
        (source2) => packages.has(source2) || wanted.has(source2) || source2.startsWith("web:") && packages.has(source2.slice("web:".length))
      );
      if (liveSources.length > 1) {
        blocked.add(target);
        for (const source2 of liveSources) blocked.add(source2);
      }
    }
    for (const oldRowId of raw.keys()) {
      const target = resolve(oldRowId);
      if (target === void 0 || !wanted.has(target) || blocked.has(oldRowId) || blocked.has(target))
        continue;
      if (wanted.has(oldRowId)) {
        blocked.add(oldRowId);
        blocked.add(target);
        continue;
      }
      const lifecycleSource = packages.has(oldRowId) ? oldRowId : oldRowId.startsWith("web:") && packages.has(oldRowId.slice("web:".length)) ? oldRowId.slice("web:".length) : oldRowId;
      const state = packages.get(lifecycleSource);
      if (state === void 0) continue;
      if (packages.has(target)) {
        blocked.add(lifecycleSource);
        blocked.add(target);
        continue;
      }
      packages.delete(lifecycleSource);
      packages.set(target, state);
      state.ownerRowId ??= lifecycleSource;
      const rewrite = (module) => module === void 0 ? void 0 : { ...module, rowId: target };
      state.target = rewrite(state.target);
      state.active = rewrite(state.active);
      statuses.delete(lifecycleSource);
    }
    return blocked;
  }
  function plan(roster) {
    const wanted = new Map(roster.modules.map((mod) => [rowKey(mod), mod]));
    const blockedRows = migrateRosterAliases(roster.rowAliases, wanted);
    const waits = [];
    for (const [rowId, state] of packages) {
      if ((!wanted.has(rowId) || blockedRows.has(rowId)) && (state.rosterPresent || state.cleanupPending) && !state.cleanupQueued) {
        state.rosterPresent = false;
        const removalEpoch = ++state.epoch;
        state.target = void 0;
        state.cleanup = {
          fiber: state.cleanup.fiber ?? state.fiber,
          styles: state.cleanup.styles ?? state.styles
        };
        state.cleanupPending = Boolean(state.cleanup.fiber || state.cleanup.styles);
        state.fiber = void 0;
        state.styles = void 0;
        state.active = void 0;
        setPhase(rowId, state, "stopping");
        try {
          const ownerRowId = registrationOwner(rowId, state);
          removeOwner(ownerRowId);
        } catch {
          console.warn("[client-modules] 名册撤回时回收模块注册项失败");
        }
        if (!state.cleanupPending) {
          setPhase(rowId, state, "idle");
          continue;
        }
        state.cleanupQueued = true;
        state.chain = state.chain.then(async () => {
          state.cleanupQueued = false;
          const cleaned = await disposeCleanup(rowId, state);
          if (state.epoch !== removalEpoch) return;
          if (cleaned)
            blockedRows.has(rowId) ? fail(rowId, state, "row-alias") : setPhase(rowId, state, "idle");
          else fail(rowId, state, "dispose");
        });
        waits.push(state.chain);
      }
    }
    for (const rowId of blockedRows) {
      if (packages.has(rowId)) continue;
      const state = stateOf(rowId);
      state.rosterPresent = false;
      fail(rowId, state, "row-alias");
    }
    for (const [rowId, mod] of wanted) {
      if (blockedRows.has(rowId)) continue;
      const state = stateOf(rowId);
      state.rosterPresent = true;
      const unchanged = state.active?.revision === mod.revision && state.phase === "active";
      const pending = state.target?.revision === mod.revision && (state.phase === "loading" || state.phase === "active");
      if (unchanged || pending) continue;
      waits.push(applyTarget(rowId, state, mod));
    }
    return waits;
  }
  let planning = Promise.resolve();
  function runDiff() {
    const planned = planning.then(async () => {
      try {
        return plan(await source.list());
      } catch {
        return [];
      }
    });
    planning = planned.then(
      () => void 0,
      () => void 0
    );
    return planned.then(async (waits) => {
      await Promise.allSettled(waits);
    });
  }
  return {
    reconcileNow: () => runDiff(),
    invalidate: () => runDiff(),
    async reload(packageId, revision) {
      const roster = await source.list();
      const targets = roster.modules.filter(
        (module) => module.packageId === packageId && module.revision === revision
      );
      if (targets.length === 0) {
        await runDiff();
        return;
      }
      const pending = [];
      for (const target of targets) {
        const key = rowKey(target);
        const state = stateOf(key);
        state.rosterPresent = true;
        pending.push(applyTarget(key, state, target));
      }
      await Promise.all(pending);
    },
    snapshot() {
      return statuses.snapshot();
    },
    subscribe: (listener) => statuses.subscribe(listener)
  };
}

// src/client-modules/boot.ts
async function startClientModules(options) {
  const ctx = new Context();
  await ctx.plugin(SlotRegistry);
  const builtinUnits = new BuiltinWebUnitRegistry();
  const pref = readThemePreference(safeThemeStorage());
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  new AgnesClientService(ctx, options.agnes, options.clientServiceCaller, options.clientEffectCaller);
  const theme = new ThemeService(ctx, resolveTheme(pref, prefersDark.matches));
  const session = new SessionService(ctx, void 0, options.agnes);
  const resources = new ClientResourceService(ctx, options.agnes, session);
  const storedLocale = readLocalePreference(safeThemeStorage());
  applyDocumentLocale(document.documentElement, storedLocale);
  const locale = new LocaleService(ctx, storedLocale);
  locale.register(WEB_LOCALE_NAMESPACE, webLocaleCatalog);
  locale.register(WEB_UNITS_LOCALE_NAMESPACE, webUnitsLocaleCatalog);
  locale.register(WEB_UI_LOCALE_NAMESPACE, webUiLocaleCatalog);
  locale.register(COMPUTER_USE_LOCALE_NAMESPACE, computerUseCatalog);
  locale.register("@agnes/web-diagnostics", diagnosticsCatalog);
  locale.register("@agnes/web-trace", traceCatalog);
  locale.register(SERVER_ERROR_LOCALE_NAMESPACE, serverErrorCatalog);
  const commands = new CommandService(ctx, options.authorizeCommand);
  const registry = ctx.slots;
  const dshShell = mountDshShellRegion(registry);
  prefersDark.addEventListener("change", () => {
    theme.setTheme(resolveTheme(readThemePreference(safeThemeStorage()), prefersDark.matches));
  });
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY) {
      theme.setTheme(resolveTheme(readThemePreference(safeThemeStorage()), prefersDark.matches));
    }
  });
  window.addEventListener("agnes:theme-changed", () => {
    theme.setTheme(resolveTheme(readThemePreference(safeThemeStorage()), prefersDark.matches));
  });
  const applyLocale = (next) => {
    applyDocumentLocale(document.documentElement, next);
    locale.setLocale(next);
    syncLocaleRadios(document, next);
    applyLocaleText(document, (key) => locale.t(key));
  };
  window.addEventListener("storage", (event) => {
    if (event.key === LOCALE_STORAGE_KEY) applyLocale(readLocalePreference(safeThemeStorage()));
  });
  window.addEventListener("agnes:locale-changed", (event) => {
    const next = event.detail;
    if (isUiLocale(next)) applyLocale(next);
  });
  const panelRoots = [];
  const panelContainer = options.panelContainer;
  if (panelContainer) {
    const host = document.createElement("div");
    host.setAttribute("data-agnes-slot-mount", "workbench.panel");
    panelContainer.appendChild(host);
    const root = createAntdRoot(host);
    panelRoots.push(root);
    root.render(
      createElement20(
        SlotsProvider5,
        { registry, session, locale, resources },
        createElement20(SlotOutlet5, { name: "workbench.panel", hideWhenEmpty: true })
      )
    );
  }
  const transcriptDelegate = { current: null };
  let conversationChildrenGeneration = 0;
  const unmountConversationChildUnits = () => {
    for (const packageId of [
      "@agnes/web-conversation-message-actions",
      "@agnes/web-conversation-attachments",
      "@agnes/web-conversation-tool-card",
      "@agnes/web-conversation-feedback"
    ])
      builtinUnits.unmount(packageId);
  };
  const mountConversationChildren = (children) => {
    const generation = ++conversationChildrenGeneration;
    queueMicrotask(() => {
      if (generation !== conversationChildrenGeneration) return;
      unmountConversationChildUnits();
      builtinUnits.unmount("@agnes/web-transcript");
      builtinUnits.unmount("@agnes/web-empty-state");
      transcriptDelegate.current = null;
      const emptyState2 = mountEmptyStateRegion(registry, children.emptyState, { session, locale });
      const transcript2 = mountTranscriptRegion(registry, children.transcript, {
        ...options.transcript,
        ...options.claim ? { claim: options.claim } : {},
        newContentButton: children.newContentButton,
        session,
        locale,
        resources
      });
      builtinUnits.mount("@agnes/web-empty-state", () => emptyState2.dispose());
      builtinUnits.mount("@agnes/web-transcript", () => transcript2.dispose());
      const childUnits = [
        [
          "@agnes/web-conversation-message-actions",
          CONVERSATION_CHILD_SLOTS.messageActions,
          children.messageActions
        ],
        ["@agnes/web-conversation-attachments", CONVERSATION_CHILD_SLOTS.attachments, children.attachments],
        ["@agnes/web-conversation-tool-card", CONVERSATION_CHILD_SLOTS.toolCard, children.toolCard],
        ["@agnes/web-conversation-feedback", CONVERSATION_CHILD_SLOTS.feedback, children.feedback]
      ];
      for (const [packageId, slot, container] of childUnits) {
        const root = createAntdRoot(container);
        root.render(
          createElement20(
            SlotsProvider5,
            { registry, session, locale, resources },
            createElement20(SlotOutlet5, { name: slot, hideWhenEmpty: true })
          )
        );
        builtinUnits.mount(packageId, () => root.unmount());
      }
      transcriptDelegate.current = transcript2;
    });
  };
  const unmountConversationChildren = () => {
    conversationChildrenGeneration++;
    transcriptDelegate.current = null;
    queueMicrotask(() => {
      builtinUnits.unmount("@agnes/web-transcript");
      builtinUnits.unmount("@agnes/web-empty-state");
      unmountConversationChildUnits();
    });
  };
  const conversation2 = options.conversationContainer ? mountConversationRegion(registry, options.conversationContainer, {
    session,
    locale,
    onMount: mountConversationChildren,
    onUnmount: unmountConversationChildren
  }) : void 0;
  if (conversation2) builtinUnits.mount("@agnes/web-conversation", () => conversation2.dispose());
  const topbar = options.topbarContainer ? mountTopbarRegion(registry, options.topbarContainer, locale) : void 0;
  if (topbar) builtinUnits.mount("@agnes/web-topbar", () => topbar.dispose());
  const approval = options.approvalContainer ? mountApprovalRegion(registry, options.approvalContainer) : void 0;
  if (approval) builtinUnits.mount("@agnes/web-approval", () => approval.dispose());
  const composer = options.composerContainer ? mountComposerRegion(
    registry,
    options.composerContainer,
    options.composer ?? {
      onCancel: () => void 0,
      onDraftChange: () => void 0,
      onError: () => void 0,
      onModelSelect: async () => false,
      onPermissionSelect: async () => false,
      onSubmit: () => void 0,
      onWorkspace: () => void 0
    },
    locale
  ) : void 0;
  if (composer) builtinUnits.mount("@agnes/web-composer", () => composer.dispose());
  const trace = options.traceContainer && options.trace ? mountTraceRegion(registry, options.traceContainer, options.trace) : void 0;
  if (trace) builtinUnits.mount("@agnes/web-trace", () => trace.dispose());
  const rightbar = options.rightbarContainer ? mountRightbarRegion(registry, options.rightbarContainer, { session, resources }, locale) : void 0;
  if (rightbar) builtinUnits.mount("@agnes/web-rightbar", () => rightbar.dispose());
  const settingsPane = options.settingsPaneContainer ? mountSettingsPaneRegion(registry, options.settingsPaneContainer, options.settings, locale) : void 0;
  if (settingsPane) {
    const settingsUnits = [
      ["model", "@agnes/web-settings-model"],
      ["plugin", "@agnes/web-settings-plugins"],
      ["resources", "@agnes/web-settings-resources"],
      ["archived", "@agnes/web-settings-archived"],
      ["computer-use", "@agnes/web-settings-computer-use"],
      ["appearance", "@agnes/web-settings-appearance"]
    ];
    for (const [pane, packageId] of settingsUnits)
      builtinUnits.mount(packageId, () => settingsPane.unmountPane(pane));
  }
  const emptyState = !conversation2 && options.emptyStateContainer ? mountEmptyStateRegion(registry, options.emptyStateContainer, { session, locale }) : void 0;
  if (emptyState) builtinUnits.mount("@agnes/web-empty-state", () => emptyState.dispose());
  if (topbar) await topbar.ready;
  const sidebar = options.sidebarContainer ? mountSidebarRegion(registry, options.sidebarContainer, options.sidebar, locale) : void 0;
  if (sidebar) builtinUnits.mount("@agnes/web-sidebar", () => sidebar.dispose());
  const transcript = !conversation2 && options.transcriptContainer ? mountTranscriptRegion(registry, options.transcriptContainer, {
    ...options.transcript,
    ...options.claim ? { claim: options.claim } : {},
    session,
    locale,
    resources
  }) : void 0;
  if (transcript) builtinUnits.mount("@agnes/web-transcript", () => transcript.dispose());
  const transcriptRuntime = conversation2 ? {
    render(nodes, turns, meta) {
      transcriptDelegate.current?.render(nodes, turns, meta);
    },
    reset() {
      transcriptDelegate.current?.reset();
    },
    pinToBottom() {
      transcriptDelegate.current?.pinToBottom();
    },
    dispose() {
      transcriptDelegate.current?.dispose();
      transcriptDelegate.current = null;
    }
  } : transcript;
  const reconciler = createReconciler({
    ctx,
    locale,
    source: options.rosterSource ?? { list: async () => ({ revision: "", modules: [], statuses: [] }) },
    removeOwner: (packageId) => registry.removeOwner(packageId)
  });
  return {
    ctx,
    registry,
    session,
    resources,
    theme,
    locale,
    commands,
    reconciler,
    builtinUnits,
    actualSlots(packageId) {
      return [...new Set(registry.entriesByOwner(packageId).map((entry) => entry.name))];
    },
    ...sidebar ? { sidebar } : {},
    ...conversation2 ? { conversation: conversation2 } : {},
    ...approval ? { approval } : {},
    ...composer ? { composer } : {},
    ...topbar ? { topbar } : {},
    ...transcriptRuntime ? { transcript: transcriptRuntime } : {},
    ...trace ? { trace } : {},
    ...rightbar ? { rightbar } : {},
    ...settingsPane ? { settings: settingsPane } : {},
    dispose: async () => {
      for (const root of panelRoots) root.unmount();
      builtinUnits.dispose();
      dshShell.dispose();
      settingsPane?.dispose();
      await ctx.fiber.dispose();
    }
  };
}

// src/client-modules/hot-reload.ts
function rebuilt(value) {
  if (value === null || typeof value !== "object") return void 0;
  const event = value;
  return event.type === "rebuilt" && typeof event.id === "string" && typeof event.rev === "string" ? { id: event.id, rev: event.rev } : void 0;
}
function startPluginHotReload(options) {
  const EventSourceImpl = options.EventSource ?? window.EventSource;
  if (!EventSourceImpl) return () => void 0;
  const source = new EventSourceImpl(options.url ?? "/plugins/events");
  let queue = Promise.resolve();
  const onRebuilt = (message2) => {
    let event;
    try {
      event = rebuilt(JSON.parse(message2.data));
    } catch {
      return;
    }
    if (!event) return;
    queue = queue.then(() => options.reconciler.reload(event.id, event.rev)).catch((error) => options.onError?.(error) ?? console.warn("[client-modules] 热替换失败", error));
  };
  const onGraph = () => void 0;
  source.addEventListener("rebuilt", onRebuilt);
  source.addEventListener("graph", onGraph);
  return () => {
    source.removeEventListener("rebuilt", onRebuilt);
    source.removeEventListener("graph", onGraph);
    source.close();
  };
}

// ../sdk/src/composer-selection.ts
var PERMISSIONS = /* @__PURE__ */ new Set(["view", "workspace", "full"]);
var THINKING = /* @__PURE__ */ new Set(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
function text2(value, max) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return void 0;
  return trimmed;
}
function modelRef(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const record2 = value;
  const route = text2(record2.route, 64);
  const id = text2(record2.id, 256);
  if (!route || !id) return void 0;
  const thinking = THINKING.has(record2.thinking) ? record2.thinking : void 0;
  return { route, id, ...thinking ? { thinking } : {} };
}
function parseComposerMemory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const record2 = value;
  const model = modelRef(record2.model);
  const permission = PERMISSIONS.has(record2.permission) ? record2.permission : void 0;
  if (!model && !permission) return void 0;
  return { ...model ? { model } : {}, ...permission ? { permission } : {} };
}
function mergeComposerMemory(previous, update) {
  const model = update.model ?? previous?.model;
  const permission = update.permission ?? previous?.permission;
  return { ...model ? { model } : {}, ...permission ? { permission } : {} };
}
function listedModel(models, model) {
  if (!model) return void 0;
  const listed = models.find((item) => item.route === model.route && item.id === model.id);
  return listed && model.thinking ? { ...listed, thinking: model.thinking } : listed;
}
function accountDefaultModel(models, provider) {
  const id = provider?.model;
  const route = provider?.route ?? provider?.id;
  if (!id || !route) return void 0;
  return listedModel(models, { route, id });
}
function resolveNewSessionSelection(input) {
  const model = listedModel(input.models, input.remembered?.model) ?? listedModel(input.models, input.accountDefault);
  return { ...model ? { model } : {}, permission: input.remembered?.permission ?? "workspace" };
}

// src/composer-memory.ts
var WEB_COMPOSER_MEMORY_KEY = "agnes-web-composer-selection";
function readWebComposerMemory() {
  try {
    const raw = localStorage.getItem(WEB_COMPOSER_MEMORY_KEY);
    if (!raw) return void 0;
    return parseComposerMemory(JSON.parse(raw));
  } catch {
    return void 0;
  }
}
function rememberWebComposer(update) {
  const next = mergeComposerMemory(readWebComposerMemory(), {
    ...update,
    ...update.model ? { model: { route: update.model.route, id: update.model.id } } : {}
  });
  try {
    localStorage.setItem(WEB_COMPOSER_MEMORY_KEY, JSON.stringify(next));
  } catch {
  }
}
function selectionFromMemory(models, provider) {
  const accountDefault = accountDefaultModel(models, provider);
  return resolveNewSessionSelection({
    remembered: readWebComposerMemory(),
    models,
    ...accountDefault ? { accountDefault } : {}
  });
}

// src/computer-use-pane.tsx
import { createElement as createElement21, useLayoutEffect as useLayoutEffect11, useSyncExternalStore as useSyncExternalStore5 } from "react";

// src/computer-use-state.ts
var BLOCKER_KEYS = {
  "release-provenance-incomplete": "computerUse.blocker.releaseProvenance",
  "compatibility-evidence-incomplete": "computerUse.blocker.compatibility",
  "platform-acceptance-incomplete": "computerUse.blocker.platformAcceptance",
  "feature-disabled": "computerUse.blocker.featureDisabled",
  "platform-unsupported": "computerUse.blocker.platformUnsupported",
  "driver-not-prepared": "computerUse.blocker.driverNotPrepared",
  "driver-preparing": "computerUse.blocker.driverPreparing",
  "driver-prepare-failed": "computerUse.blocker.driverPrepareFailed"
};
var phrase = (key, vars) => vars === void 0 ? { key } : { key, vars };
function createComputerUseState(client2, polling = {}) {
  let disposed = false;
  const listeners = /* @__PURE__ */ new Set();
  const view = {
    statusLabel: phrase("computerUse.status.pending"),
    statusSummary: phrase("computerUse.status.pendingSummary"),
    runtime: void 0,
    blockers: [],
    permissionLabel: phrase("computerUse.permissions.pending"),
    permissionSummary: phrase("computerUse.permissions.pendingSummary"),
    grantHidden: true,
    doctorLabel: phrase("computerUse.doctor.pending"),
    doctorSummary: phrase("computerUse.doctor.pendingSummary"),
    operationLabel: phrase("computerUse.operation.none"),
    operationSummary: phrase("computerUse.operation.noneSummary"),
    permissionMissing: []
  };
  let snapshot;
  let operationRecord;
  let doctorPending = false;
  let operationMutationPending = false;
  let operationReadPending = false;
  let generation = 0;
  let permissionGeneration = 0;
  let doctorGeneration = 0;
  let grantGeneration = 0;
  let operationGeneration = 0;
  let statusPending = false;
  let grantPending = false;
  let operationPending = false;
  let driverReady = false;
  let driverPreparing = false;
  let canPrepare = false;
  let activeOperationId;
  let cancelWait;
  const operationWait = (delayMs) => new Promise((resolve, reject) => {
    const abort = new AbortController();
    let timer;
    const finish = (error) => {
      if (timer !== void 0) globalThis.clearTimeout(timer);
      if (cancelWait === cancel) cancelWait = void 0;
      if (error === void 0) resolve();
      else reject(error);
    };
    const cancel = () => {
      abort.abort();
      finish();
    };
    cancelWait = cancel;
    if (polling.wait) {
      try {
        polling.wait(delayMs, abort.signal).then(() => finish(), finish);
      } catch (error) {
        finish(error);
      }
    } else timer = globalThis.setTimeout(() => finish(), delayMs);
  });
  const operationIntervalMs = Math.max(0, polling.intervalMs ?? 500);
  const operationMaxAttempts = Math.max(1, polling.maxAttempts ?? 240);
  const publish = () => {
    if (disposed) return;
    snapshot = Object.freeze({
      status: Object.freeze({
        label: computerUsePhrase(view.statusLabel),
        summary: computerUsePhrase(view.statusSummary),
        runtime: view.runtime === void 0 ? "" : computerUsePhrase(view.runtime),
        blockers: Object.freeze(view.blockers.map((item) => computerUsePhrase(item)))
      }),
      permissions: Object.freeze({
        label: computerUsePhrase(view.permissionLabel),
        summary: computerUsePhrase(
          view.permissionSummary.key === "computerUse.permissions.requiredSummary" ? phrase("computerUse.permissions.requiredSummary", {
            missing: view.permissionMissing.map((key) => computerUseText(key)).join(computerUseLocale() === "zh-CN" ? "、" : ", ")
          }) : view.permissionSummary
        ),
        grantHidden: view.grantHidden
      }),
      doctor: Object.freeze({
        label: computerUsePhrase(view.doctorLabel),
        summary: computerUsePhrase(view.doctorSummary)
      }),
      operation: Object.freeze({
        label: computerUsePhrase(view.operationLabel),
        summary: computerUsePhrase(view.operationSummary),
        record: operationRecord
      }),
      controls: Object.freeze({
        refreshDisabled: statusPending || grantPending || operationPending,
        grantDisabled: grantPending,
        installDisabled: operationPending || statusPending || operationReadPending || !driverReady && !canPrepare,
        updateDisabled: operationPending || statusPending || operationReadPending || !driverReady,
        restartDisabled: operationPending || statusPending || operationReadPending || !driverReady,
        doctorDisabled: doctorPending || !driverReady,
        operationRefreshDisabled: operationReadPending || operationMutationPending,
        cancelDisabled: !operationPending || !activeOperationId || operationMutationPending,
        cancelHidden: !operationPending
      })
    });
    for (const listener of listeners) listener();
  };
  const applyOperation = (report) => {
    operationRecord = report.status === "found" ? Object.freeze({
      operationId: report.operationId,
      kind: report.kind,
      state: report.state,
      phase: report.phase
    }) : void 0;
    if (report.status === "not-found") {
      activeOperationId = void 0;
      operationPending = false;
      view.operationLabel = phrase("computerUse.operation.none");
      view.operationSummary = phrase("computerUse.operation.emptySummary");
      publish();
      return true;
    }
    const terminal = report.state === "succeeded" || report.state === "failed" || report.state === "cancelled";
    activeOperationId = terminal ? void 0 : report.operationId;
    operationPending = !terminal;
    if (report.state === "queued") {
      view.operationLabel = phrase("computerUse.operation.queued");
      view.operationSummary = phrase("computerUse.operation.queuedSummary");
    } else if (report.state === "running") {
      view.operationLabel = phrase(
        report.phase === "restarting" ? "computerUse.operation.restarting" : "computerUse.operation.installing"
      );
      view.operationSummary = phrase("computerUse.operation.runningSummary");
    } else if (report.state === "cancelling") {
      view.operationLabel = phrase("computerUse.operation.cancelling");
      view.operationSummary = phrase("computerUse.operation.cancellingSummary");
    } else if (report.state === "succeeded") {
      view.operationLabel = phrase("computerUse.operation.done");
      const outcomes = {
        installed: "computerUse.operation.installed",
        "already-current": "computerUse.operation.alreadyCurrent",
        repaired: "computerUse.operation.repaired",
        restarted: "computerUse.operation.restarted",
        "lkg-restored": "computerUse.operation.lkgRestored"
      };
      view.operationSummary = phrase(
        report.outcome ? outcomes[report.outcome] : "computerUse.operation.doneSummary"
      );
    } else if (report.state === "cancelled") {
      view.operationLabel = phrase("computerUse.operation.cancelled");
      view.operationSummary = phrase("computerUse.operation.cancelledSummary");
    } else {
      view.operationLabel = phrase("computerUse.operation.failed");
      view.operationSummary = phrase("computerUse.operation.failedSummary");
    }
    publish();
    return terminal;
  };
  const monitorOperation = async (operationId, current2) => {
    for (let attempt = 0; attempt < operationMaxAttempts; attempt += 1) {
      if (current2 !== operationGeneration) return;
      try {
        await operationWait(operationIntervalMs);
        if (current2 !== operationGeneration) return;
        const report = await client2.call(
          "_agnes/v1/computerUse.operation.status",
          operationId ? { operationId } : {}
        );
        if (current2 !== operationGeneration) return;
        if (applyOperation(report)) {
          if (current2 !== operationGeneration) return;
          await load(false);
          if (current2 !== operationGeneration || !driverPreparing) return;
          operationId = void 0;
        } else if (report.status === "found") {
          operationId = report.operationId;
        }
      } catch {
        if (current2 !== operationGeneration) return;
        view.operationLabel = phrase("computerUse.operation.progressUnreadable");
        view.operationSummary = phrase("computerUse.operation.progressUnreadableSummary");
        publish();
        return;
      }
    }
    if (current2 !== operationGeneration) return;
    view.operationLabel = phrase("computerUse.operation.stillRunning");
    view.operationSummary = phrase("computerUse.operation.stillRunningSummary");
    publish();
  };
  const startOperation = async (kind) => {
    if (disposed || operationPending || statusPending || operationReadPending || !driverReady && !(kind === "install" && canPrepare))
      return;
    cancelWait?.();
    const current2 = ++operationGeneration;
    operationMutationPending = true;
    operationReadPending = false;
    operationPending = true;
    activeOperationId = void 0;
    operationRecord = void 0;
    view.operationLabel = phrase("computerUse.operation.submitting");
    view.operationSummary = phrase("computerUse.operation.submittingSummary");
    publish();
    if (current2 !== operationGeneration) return;
    try {
      const report = await client2.call("_agnes/v1/computerUse.operation.start", {
        kind
      });
      if (current2 !== operationGeneration) return;
      operationMutationPending = false;
      if (applyOperation(report)) {
        if (current2 !== operationGeneration) return;
        await load(false);
        if (current2 === operationGeneration && driverPreparing) await monitorOperation(void 0, current2);
      } else if (report.status === "found") await monitorOperation(report.operationId, current2);
    } catch {
      if (current2 !== operationGeneration) return;
      operationMutationPending = false;
      view.operationLabel = phrase("computerUse.operation.startUnknown");
      view.operationSummary = phrase("computerUse.operation.startUnknownSummary");
      publish();
    }
  };
  const refreshOperation = async () => {
    if (disposed || operationMutationPending || operationReadPending) return;
    cancelWait?.();
    const current2 = ++operationGeneration;
    operationReadPending = true;
    view.operationLabel = phrase("computerUse.operation.reading");
    view.operationSummary = phrase("computerUse.operation.readingSummary");
    publish();
    if (current2 !== operationGeneration) return;
    try {
      const report = await client2.call(
        "_agnes/v1/computerUse.operation.status",
        activeOperationId ? { operationId: activeOperationId } : {}
      );
      if (current2 !== operationGeneration) return;
      operationReadPending = false;
      const terminal = applyOperation(report);
      if (current2 !== operationGeneration) return;
      if (!terminal && report.status === "found") await monitorOperation(report.operationId, current2);
      else {
        if (current2 !== operationGeneration) return;
        await load(false);
        if (current2 === operationGeneration && driverPreparing) await monitorOperation(void 0, current2);
      }
    } catch {
      if (current2 !== operationGeneration) return;
      view.operationLabel = phrase("computerUse.operation.readFailed");
      view.operationSummary = phrase(
        operationPending ? "computerUse.operation.readFailedPendingSummary" : "computerUse.operation.readFailedSummary"
      );
      publish();
    } finally {
      if (current2 === operationGeneration) {
        operationReadPending = false;
        publish();
      }
    }
  };
  const cancelOperation = async () => {
    if (disposed || operationMutationPending || !operationPending || !activeOperationId) return;
    cancelWait?.();
    const operationId = activeOperationId;
    const current2 = ++operationGeneration;
    operationReadPending = false;
    view.operationLabel = phrase("computerUse.operation.cancelling");
    view.operationSummary = phrase("computerUse.operation.cancelRequestSummary");
    operationMutationPending = true;
    publish();
    if (current2 !== operationGeneration) return;
    try {
      const report = await client2.call("_agnes/v1/computerUse.operation.cancel", {
        operationId
      });
      if (current2 !== operationGeneration) return;
      operationMutationPending = false;
      if (!applyOperation(report) && report.status === "found")
        await monitorOperation(report.operationId, current2);
      else {
        if (current2 !== operationGeneration) return;
        await load(false);
        if (current2 === operationGeneration && driverPreparing) await monitorOperation(void 0, current2);
      }
    } catch {
      if (current2 !== operationGeneration) return;
      operationMutationPending = false;
      view.operationLabel = phrase("computerUse.operation.cancelFailed");
      view.operationSummary = phrase("computerUse.operation.cancelFailedSummary");
      publish();
    }
  };
  const applyPermissions = (report) => {
    view.grantHidden = true;
    view.permissionMissing = [];
    if (report.status === "not-required") {
      view.permissionLabel = phrase("computerUse.permissions.notRequired");
      view.permissionSummary = phrase(
        report.admission.reason === "linux-verified-driver" ? "computerUse.permissions.linuxSummary" : "computerUse.permissions.windowsSummary"
      );
      return;
    }
    if (report.status === "granted") {
      view.permissionLabel = phrase("computerUse.permissions.granted");
      view.permissionSummary = phrase("computerUse.permissions.grantedSummary");
      return;
    }
    if (report.status === "required") {
      view.permissionLabel = phrase("computerUse.permissions.required");
      view.permissionMissing = [
        report.probe.accessibility ? void 0 : "computerUse.permissions.accessibility",
        report.probe.screenRecording ? void 0 : "computerUse.permissions.screenRecording"
      ].filter((value) => value !== void 0);
      view.permissionSummary = phrase("computerUse.permissions.requiredSummary");
      view.grantHidden = false;
      return;
    }
    if (report.status === "unknown") {
      view.permissionLabel = phrase("computerUse.permissions.unknown");
      view.permissionSummary = phrase("computerUse.permissions.unknownSummary");
      return;
    }
    view.permissionLabel = phrase("computerUse.permissions.unavailable");
    view.permissionSummary = phrase("computerUse.permissions.unavailableSummary");
  };
  const unavailablePermissions = () => {
    view.permissionLabel = phrase("computerUse.permissions.unreadable");
    view.permissionSummary = phrase("computerUse.permissions.unreadableSummary");
    view.grantHidden = true;
    publish();
  };
  const load = async (discoverOperation = true) => {
    if (disposed) return;
    const current2 = ++generation;
    const permissionCurrent = grantPending ? void 0 : ++permissionGeneration;
    statusPending = true;
    view.statusLabel = phrase("computerUse.status.checking");
    view.statusSummary = phrase("computerUse.status.checkingSummary");
    view.runtime = void 0;
    view.blockers = [];
    publish();
    if (current2 !== generation) return;
    try {
      const report = await client2.call("_agnes/v1/computerUse.status", {});
      if (current2 !== generation) return;
      driverPreparing = report.status === "blocked" && report.blockers.includes("driver-preparing");
      if (report.status === "ready") {
        driverReady = true;
        view.statusLabel = phrase(
          report.runtime.state === "running" ? "computerUse.status.running" : "computerUse.status.available"
        );
        const platform = report.driver.platform === "darwin" ? "macOS" : report.driver.platform === "linux" ? "Linux" : "Windows";
        view.statusSummary = phrase("computerUse.status.readySummary", {
          platform,
          version: report.driver.version
        });
        view.runtime = report.runtime.state === "running" ? phrase("computerUse.runtime.active", { count: report.runtime.activeSessions }) : phrase(report.runtime.startAttempted ? "computerUse.runtime.idle" : "computerUse.runtime.ready");
        view.blockers = [];
        publish();
        if (current2 !== generation || permissionCurrent === void 0) return;
        try {
          const permissions = await client2.call(
            "_agnes/v1/computerUse.permissions.status",
            {}
          );
          if (current2 !== generation || permissionCurrent !== permissionGeneration) return;
          applyPermissions(permissions);
        } catch {
          if (current2 !== generation || permissionCurrent !== permissionGeneration) return;
          unavailablePermissions();
        }
        return;
      }
      driverReady = false;
      canPrepare = report.blockers.includes("driver-not-prepared") || report.blockers.includes("driver-prepare-failed");
      if (report.admission.reason === "runtime-unavailable") {
        const reason = report.blockers[0];
        view.statusLabel = phrase(
          reason === "feature-disabled" ? "computerUse.status.closed" : reason === "platform-unsupported" ? "computerUse.status.unsupported" : reason === "driver-preparing" ? "computerUse.status.preparing" : reason === "driver-prepare-failed" ? "computerUse.status.prepareFailed" : "computerUse.status.firstPrepare"
        );
        view.statusSummary = phrase(reason ? BLOCKER_KEYS[reason] : "computerUse.status.refreshRetry");
        view.runtime = phrase("computerUse.runtime.imageModel");
        if (permissionCurrent === permissionGeneration) {
          view.permissionLabel = phrase("computerUse.permissions.waitingDriver");
          view.permissionSummary = phrase("computerUse.permissions.pendingSummary");
          view.grantHidden = true;
        }
        if (driverPreparing && discoverOperation && !operationPending) void refreshOperation();
        return;
      }
      view.statusLabel = phrase("computerUse.status.blocked");
      view.statusSummary = phrase("computerUse.status.blockedSummary");
      view.runtime = phrase("computerUse.runtime.notStarted");
      view.blockers = report.blockers.map((blocker) => phrase(BLOCKER_KEYS[blocker]));
      if (permissionCurrent === permissionGeneration)
        applyPermissions({
          schemaVersion: 1,
          status: "unavailable",
          admission: { state: "blocked", reason: "p0-evidence-incomplete" },
          probe: { state: "not-run", reason: "production-driver-admission-disabled" }
        });
    } catch {
      if (current2 !== generation) return;
      driverReady = false;
      driverPreparing = false;
      canPrepare = false;
      view.statusLabel = phrase("computerUse.status.unreadable");
      view.statusSummary = phrase("computerUse.status.unreadableSummary");
      view.runtime = void 0;
      view.blockers = [];
      if (permissionCurrent === permissionGeneration) unavailablePermissions();
    } finally {
      if (current2 === generation) {
        statusPending = false;
        publish();
      }
    }
  };
  const grantPermissions = async () => {
    if (disposed || grantPending) return;
    const current2 = ++permissionGeneration;
    const grantCurrent = ++grantGeneration;
    grantPending = true;
    view.permissionLabel = phrase("computerUse.permissions.granting");
    view.permissionSummary = phrase("computerUse.permissions.grantingSummary");
    publish();
    if (current2 !== permissionGeneration) return;
    try {
      const report = await client2.call(
        "_agnes/v1/computerUse.permissions.grant",
        {}
      );
      if (current2 !== permissionGeneration) return;
      applyPermissions(report);
    } catch {
      if (current2 !== permissionGeneration) return;
      view.permissionLabel = phrase("computerUse.permissions.grantFailed");
      view.permissionSummary = phrase("computerUse.permissions.grantFailedSummary");
      view.grantHidden = false;
    } finally {
      if (grantCurrent === grantGeneration) {
        grantPending = false;
        publish();
      }
    }
  };
  const doctor = async () => {
    if (disposed || doctorPending) return;
    const current2 = ++doctorGeneration;
    doctorPending = true;
    view.doctorLabel = phrase("computerUse.doctor.checking");
    view.doctorSummary = phrase("computerUse.doctor.checkingSummary");
    publish();
    if (current2 !== doctorGeneration) return;
    try {
      const report = await client2.call("_agnes/v1/computerUse.doctor", {});
      if (current2 !== doctorGeneration) return;
      if (report.status === "ready") {
        view.doctorLabel = phrase("computerUse.doctor.passed");
        view.doctorSummary = phrase(
          report.admission.reason === "macos-verified-driver" ? "computerUse.doctor.macosSummary" : report.admission.reason === "linux-verified-driver" ? "computerUse.doctor.linuxSummary" : "computerUse.doctor.windowsSummary"
        );
        return;
      }
      if (report.status === "failed") {
        view.doctorLabel = phrase("computerUse.doctor.failed");
        view.doctorSummary = phrase("computerUse.doctor.failedSummary");
        return;
      }
      if (report.status === "unreachable") {
        view.doctorLabel = phrase("computerUse.doctor.unreachable");
        view.doctorSummary = phrase("computerUse.doctor.unreachableSummary");
        return;
      }
      view.doctorLabel = phrase("computerUse.doctor.skipped");
      view.doctorSummary = phrase("computerUse.doctor.skippedSummary");
    } catch {
      if (current2 !== doctorGeneration) return;
      view.doctorLabel = phrase("computerUse.doctor.failedTemporary");
      view.doctorSummary = phrase("computerUse.doctor.failedTemporarySummary");
    } finally {
      if (current2 === doctorGeneration) {
        doctorPending = false;
        publish();
      }
    }
  };
  const onLocale = () => publish();
  if (typeof window !== "undefined") window.addEventListener("agnes:locale-changed", onLocale);
  publish();
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      if (typeof window !== "undefined") window.removeEventListener("agnes:locale-changed", onLocale);
      cancelWait?.();
      generation += 1;
      permissionGeneration += 1;
      doctorGeneration += 1;
      grantGeneration += 1;
      operationGeneration += 1;
    },
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) return () => void 0;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh: load,
    grantPermissions,
    doctor,
    install: () => startOperation("install"),
    update: () => startOperation("update"),
    restart: () => startOperation("restart"),
    refreshOperation,
    cancelOperation
  };
}

// src/computer-use-pane.tsx
function createComputerUsePaneController(client2, polling = {}) {
  const initial = createComputerUseState(client2, polling);
  const initialSnapshot = initial.getSnapshot();
  initial.dispose();
  let snapshot = initialSnapshot;
  let state;
  let disposed = false;
  const listeners = /* @__PURE__ */ new Set();
  const publish = () => {
    for (const listener of [...listeners]) listener();
  };
  const subscribe = (listener) => {
    if (disposed) return () => void 0;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const getSnapshot = () => snapshot;
  const invoke = (action) => state?.[action]() ?? Promise.resolve();
  const controller = {
    refresh: () => invoke("refresh"),
    grantPermissions: () => invoke("grantPermissions"),
    doctor: () => invoke("doctor"),
    install: () => invoke("install"),
    update: () => invoke("update"),
    restart: () => invoke("restart"),
    refreshOperation: () => invoke("refreshOperation"),
    cancelOperation: () => invoke("cancelOperation"),
    dispose() {
      if (disposed) return;
      disposed = true;
      retire?.();
      listeners.clear();
    }
  };
  let retire;
  const mount = () => {
    if (disposed) return;
    retire?.();
    const model = createComputerUseState(client2, polling);
    state = model;
    const update = () => {
      if (disposed || state !== model) return;
      snapshot = model.getSnapshot();
      publish();
    };
    const unsubscribe = model.subscribe(update);
    const cleanup = () => {
      unsubscribe();
      model.dispose();
      if (state === model) state = void 0;
      if (retire === cleanup) retire = void 0;
    };
    retire = cleanup;
    update();
    void model.refresh().then(() => {
      if (state === model && !model.getSnapshot().operation.record) void model.refreshOperation();
    });
    return cleanup;
  };
  function ComputerUsePane() {
    const view = useSyncExternalStore5(subscribe, getSnapshot);
    const locale = useSyncExternalStore5((listener) => {
      window.addEventListener("agnes:locale-changed", listener);
      return () => window.removeEventListener("agnes:locale-changed", listener);
    }, computerUseLocale);
    useLayoutEffect11(mount, []);
    return createElement21(SettingsComputerUse, {
      view,
      actions: controller,
      text: (key) => computerUseText(key, void 0, locale)
    });
  }
  return { ...controller, render: () => createElement21(ComputerUsePane) };
}

// src/diagnostics-dialog.ts
import { createElement as createElement22 } from "react";
import { flushSync as flushSync9 } from "react-dom";

// src/diagnostics-bundle.ts
var DIAGNOSTICS_LIMITS = {
  zipBytes: 64 * 1024 * 1024,
  entries: 1e3,
  ledgerBytes: 32 * 1024 * 1024,
  pageBytes: 1024 * 1024,
  rpcMs: 15e3,
  totalMs: 6e4
};
var PREFIX2 = "_agnes/v1/";
var UNAVAILABLE = /* @__PURE__ */ new Set([
  -32601,
  -32003,
  "METHOD_NOT_FOUND",
  "SESSION_NOT_FOUND",
  "NOT_REGISTERED"
]);
var ARTIFACT_URI = /^artifact:\/\/([0-9a-f]{64})$/;
var IMPORT_SOURCES = /* @__PURE__ */ new Set(["claude-code", "codex", "pi", "agnes"]);
var encoder2 = new TextEncoder();
var abortError = () => new DOMException("Aborted", "AbortError");
function omitInlineMedia(value) {
  if (value instanceof Uint8Array) return `[OMITTED:binary:${value.byteLength} bytes]`;
  if (Array.isArray(value)) return value.map(omitInlineMedia);
  if (value === null || typeof value !== "object") return value;
  const record2 = value;
  if ((record2.type === "image" || record2.type === "audio") && typeof record2.data === "string")
    return { ...record2, data: `[OMITTED:${record2.type}:base64]` };
  if (record2.type === "base64" && typeof record2.data === "string")
    return { ...record2, data: "[OMITTED:binary:base64]" };
  return Object.fromEntries(Object.entries(record2).map(([key, child]) => [key, omitInlineMedia(child)]));
}
function diagnosticsFileName(sessionId, now) {
  const tail = sessionId?.split(":").at(-1) ?? "";
  const id = tail.replace(/[^A-Za-z0-9]/g, "").slice(0, 8) || "application";
  const stamp = now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
  return `agh-diagnostics-${id}-${stamp}.zip`;
}
function withTimeout2(promise, ms, signal) {
  const either = AbortSignal.any([signal, AbortSignal.timeout(ms)]);
  return new Promise((resolve, reject) => {
    const stop = () => reject(signal.aborted ? abortError() : new DOMException(`timed out after ${ms} ms`, "TimeoutError"));
    if (either.aborted) return stop();
    either.addEventListener("abort", stop, { once: true });
    promise.then(resolve, reject).finally(() => either.removeEventListener("abort", stop));
  });
}
function warnFor(source, error) {
  const e = error ?? {};
  if (e.name === "TimeoutError" || e.name === "RequestTimeout") return { source, reason: "timeout" };
  if (UNAVAILABLE.has(e.code) || UNAVAILABLE.has(e.data?.code)) return { source, reason: "unavailable" };
  const detail = redactDiagnosticText(String(e.message ?? error)).slice(0, 500);
  return { source, reason: "failed", detail };
}
function collectArtifacts(event, found) {
  const add = (item) => {
    const lane = event.lane ?? "main";
    const key = `${lane}|${item.sha256}`;
    if (!found.has(key)) found.set(key, { ...item, lane, seq: event.seq });
  };
  const data = event.data;
  if (event.type === "request/header" && Array.isArray(data?.media?.manifest)) {
    for (const entry of data.media.manifest) {
      if (typeof entry?.sha256 !== "string" || typeof entry.mime !== "string") continue;
      add({
        sha256: entry.sha256,
        mime: entry.mime,
        source: "request-media",
        ...typeof entry.artifactUri === "string" ? { uri: entry.artifactUri } : {}
      });
    }
  }
  if (event.type === "tool/result" && Array.isArray(data?.content)) {
    for (const block of data.content) {
      const match = block?.type === "resource_link" && typeof block.uri === "string" && ARTIFACT_URI.exec(block.uri);
      if (!match) continue;
      const mime = typeof block.mimeType === "string" ? block.mimeType : "";
      add({ sha256: match[1], mime, source: "tool-result", uri: block.uri });
    }
  }
}
async function collectDiagnostics(input, include, signal, overrides = {}) {
  const limits = { ...DIAGNOSTICS_LIMITS, ...overrides };
  if (signal.aborted) throw abortError();
  const total = AbortSignal.timeout(limits.totalMs);
  const combined = AbortSignal.any([signal, total]);
  const warnings = [];
  let expired = false;
  const rpc = async (method, params, quiet = false) => {
    if (expired) return void 0;
    try {
      return await withTimeout2(
        input.call(PREFIX2 + method, params, { signal: combined }),
        limits.rpcMs,
        combined
      );
    } catch (error) {
      if (signal.aborted) throw abortError();
      if (total.aborted) expired = true;
      else if (!quiet) warnings.push(warnFor(method, error));
      return void 0;
    }
  };
  const sessionId = input.sessionId;
  const projection2 = input.projection?.sessionId === sessionId ? input.projection : void 0;
  const effective = { ...include, conversation: include.conversation && sessionId !== null };
  const [collected, apis, config] = await Promise.all([
    // Always read for bundle.version, but a failure only matters when logs or system were selected.
    rpc("diagnostics.collect", {}, !(effective.logs || effective.system)),
    effective.system ? rpc("apis.list", {}) : void 0,
    effective.system ? rpc("config.get", {}) : void 0
  ]);
  const lines = [];
  const artifacts = /* @__PURE__ */ new Map();
  let ledger;
  if (effective.conversation && sessionId !== null) {
    let afterSeq = 0;
    let bytes = 0;
    let truncated = false;
    let read = false;
    for (; ; ) {
      const from = afterSeq;
      const page = await rpc("diagnostics.events", {
        sessionId,
        afterSeq,
        limit: 500,
        maxBytes: limits.pageBytes
      });
      if (!page) {
        truncated = read;
        break;
      }
      read = true;
      for (const event of page.events) {
        const start = event.seq === 1 && event.type === "session/start" ? event.data : void 0;
        const imported = start?.imported;
        if (imported && typeof imported === "object" && !Array.isArray(imported)) {
          const { source } = imported;
          const named = IMPORT_SOURCES.has(source) ? source : "unknown";
          warnings.push({ source: "session", reason: "imported", detail: `imported from ${named}` });
        }
        const line = JSON.stringify(redactDiagnostic(event));
        bytes += encoder2.encode(line).byteLength + 1;
        if (bytes > limits.ledgerBytes) {
          truncated = true;
          break;
        }
        lines.push(line);
        collectArtifacts(event, artifacts);
        afterSeq = event.seq;
      }
      if (page.nextAfterSeq !== null && page.nextAfterSeq <= from) truncated = true;
      if (truncated) {
        warnings.push({ source: "diagnostics.events", reason: "truncated" });
        break;
      }
      afterSeq = page.nextAfterSeq ?? page.lastSeq;
      if (page.nextAfterSeq === null) break;
    }
    if (read) ledger = { file: "events.jsonl", count: lines.length, lastSeq: afterSeq, truncated };
  }
  if (effective.conversation) {
    if (!projection2) warnings.push({ source: "trace", reason: "unavailable" });
    else if (input.projectionHasEarlier) {
      const detail = diagnosticsText("diagnostics.trace.window", { n: projection2.nodes.length });
      warnings.push({ source: "trace", reason: "truncated", detail });
    }
  }
  if (expired) warnings.push({ source: "collect", reason: "timeout" });
  if (signal.aborted) throw abortError();
  const tailOf = (name) => {
    const log = collected?.logs.find((l) => l.name === name);
    return log && { size: log.size, text: log.text, truncated: log.truncated, missing: log.missing };
  };
  const daemonLog = tailOf("daemon.jsonl");
  const hostLog = tailOf("host.jsonl");
  const missingLogs = [daemonLog?.missing && "daemon.jsonl", hostLog?.missing && "host.jsonl"].filter(Boolean);
  if (effective.logs && missingLogs.length)
    warnings.push({ source: "logs", reason: "unavailable", detail: missingLogs.join(", ") });
  const bundle = redactDiagnostic({
    bundleVersion: 1,
    createdAt: input.now.toISOString(),
    product: "agh",
    version: collected?.agh.version ?? "unknown",
    sessionId,
    sessionTitle: input.sessionTitle,
    include: effective,
    ...effective.conversation && projection2 ? { trace: omitInlineMedia(projection2) } : {},
    ...ledger ? { events: ledger } : {},
    artifacts: [...artifacts.values()],
    ...effective.logs ? {
      logs: {
        ...daemonLog ? { daemon: daemonLog } : {},
        ...hostLog ? { host: hostLog } : {},
        browser: input.browserLog
      }
    } : {},
    ...effective.system ? {
      system: {
        agh: collected?.agh,
        runtime: collected?.runtime,
        profile: apis?.profile,
        config,
        browser: input.browser
      }
    } : {},
    warnings
  });
  const entries2 = [];
  let size = 0;
  const add = (path, text3) => {
    const data = encoder2.encode(text3);
    if (entries2.length + 3 > limits.entries || size + data.byteLength > limits.zipBytes) {
      bundle.warnings.push({ source: path, reason: "limit" });
      return;
    }
    size += data.byteLength;
    entries2.push({ path, data });
  };
  const json = (value) => JSON.stringify(value, null, 2);
  if (bundle.system) add("system.json", json(bundle.system));
  if (bundle.trace) add("trace.json", json(bundle.trace));
  if (bundle.logs?.daemon && !bundle.logs.daemon.missing) add("logs/daemon.jsonl", bundle.logs.daemon.text);
  if (bundle.logs?.host && !bundle.logs.host.missing) add("logs/host.jsonl", bundle.logs.host.text);
  if (bundle.logs) add("logs/browser.json", json(bundle.logs.browser));
  if (ledger) add("events.jsonl", lines.length ? `${lines.join("\n")}
` : "");
  let index = encoder2.encode(renderDiagnosticsViewer(bundle));
  if (size + index.byteLength > limits.zipBytes) {
    bundle.warnings.push({ source: "index.html", reason: "limit" });
    const { trace: _trace, logs: _logs, ...slim } = bundle;
    index = encoder2.encode(renderDiagnosticsViewer(slim));
  }
  entries2.unshift({ path: "index.html", data: index });
  if (bundle.warnings.length)
    entries2.push({ path: "diagnostic-export-warnings.json", data: encoder2.encode(json(bundle.warnings)) });
  const zip = await buildZip(entries2, input.now);
  if (signal.aborted) throw abortError();
  return { bundle, fileName: diagnosticsFileName(sessionId, input.now), zip };
}

// src/diagnostics-dialog.ts
var TITLE_KEY = {
  menu: "diagnostics.title.menu",
  share: "diagnostics.title.share",
  ready: "diagnostics.title.ready",
  saved: "diagnostics.title.saved"
};
var titleFor = (step) => diagnosticsText(TITLE_KEY[step]);
var message = (failure) => failure instanceof Error ? failure.message : String(failure);
var formatSize = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
var browserInfo = () => ({
  userAgent: navigator.userAgent,
  language: navigator.language,
  platform: navigator.platform,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  screen: { width: screen.width, height: screen.height, dpr: devicePixelRatio },
  origin: location.origin
});
async function saveZip(zip, fileName, win = window) {
  const blob = new Blob([zip], { type: "application/zip" });
  const picker = win.showSaveFilePicker;
  if (!picker) {
    const url = URL.createObjectURL(blob);
    const a = win.document.createElement("a");
    a.href = url;
    a.download = fileName;
    win.document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 6e4);
    return "saved";
  }
  let handle;
  try {
    handle = await picker.call(win, {
      suggestedName: fileName,
      types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }]
    });
  } catch (error) {
    if (error?.name === "AbortError") return "canceled";
    throw error;
  }
  const writable = await handle.createWritable();
  try {
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => void 0);
    throw error;
  }
  return "saved";
}
function createDiagnosticsDialog(deps) {
  const collect = deps.collect ?? collectDiagnostics;
  const save = deps.save ?? saveZip;
  const dialog = document.createElement("dialog");
  dialog.className = "diagnostics-dialog";
  dialog.setAttribute("aria-labelledby", "diagnostics-heading");
  dialog.dataset.agnesRegion = "dialog";
  document.body.append(dialog);
  const root = createAntdRoot(dialog);
  let snapshot = {
    step: "menu",
    title: titleFor("menu"),
    hasSession: false,
    include: { conversation: false, logs: true, system: true },
    generating: false,
    saving: false,
    summary: "",
    hasWarnings: false,
    savedName: "",
    error: ""
  };
  let controller;
  let result2;
  let trigger;
  let generation = 0;
  let disposed = false;
  const render3 = () => {
    const locale = diagnosticsLocale();
    flushSync9(
      () => root.render(
        createElement22(DiagnosticsDialogView, {
          snapshot,
          actions,
          text: (key) => diagnosticsText(key, void 0, locale)
        })
      )
    );
  };
  const focusStep = () => {
    dialog.querySelector(`[data-step="${snapshot.step}"] :is(button, input):not(:disabled)`)?.focus();
  };
  const show2 = (step, title = titleFor(step)) => {
    snapshot = { ...snapshot, step, title, error: "" };
    render3();
    focusStep();
  };
  const retire = () => {
    generation++;
    controller?.abort();
    controller = void 0;
    result2 = void 0;
    snapshot = {
      ...snapshot,
      step: "menu",
      title: titleFor("menu"),
      generating: false,
      saving: false,
      summary: "",
      hasWarnings: false,
      savedName: "",
      error: ""
    };
  };
  const dismiss = () => {
    if (disposed) return;
    retire();
    render3();
    dialog.close();
    trigger?.focus();
  };
  const actions = {
    close: dismiss,
    share: () => show2("share"),
    back: (step) => show2(step),
    setInclude: (name, checked) => {
      snapshot = { ...snapshot, include: { ...snapshot.include, [name]: checked } };
      render3();
    },
    generate: () => {
      if (disposed || controller || snapshot.step !== "share") return;
      const mine = new AbortController();
      const currentGeneration = ++generation;
      controller = mine;
      snapshot = { ...snapshot, generating: true, error: "" };
      render3();
      const input = {
        call: deps.call,
        ...deps.context(),
        browserLog: getBrowserLog(),
        browser: browserInfo(),
        now: /* @__PURE__ */ new Date()
      };
      void collect(input, snapshot.include, mine.signal).then(
        (value) => {
          if (disposed || generation !== currentGeneration || controller !== mine) return;
          controller = void 0;
          result2 = value;
          snapshot = {
            ...snapshot,
            generating: false,
            summary: `${value.fileName}（${formatSize(value.zip.byteLength)}）`,
            hasWarnings: value.bundle.warnings.length > 0
          };
          show2("ready");
        },
        (failure) => {
          if (disposed || generation !== currentGeneration || controller !== mine) return;
          controller = void 0;
          snapshot = {
            ...snapshot,
            generating: false,
            error: diagnosticsText("diagnostics.error.generate", { detail: message(failure) })
          };
          render3();
        }
      );
    },
    save: () => {
      const current2 = result2;
      if (disposed || !current2 || snapshot.saving || snapshot.step !== "ready") return;
      const currentGeneration = generation;
      snapshot = { ...snapshot, saving: true, error: "" };
      const pending = save(current2.zip, current2.fileName);
      render3();
      void pending.then(
        (outcome) => {
          if (disposed || generation !== currentGeneration || result2 !== current2) return;
          if (outcome !== "saved") return;
          snapshot = { ...snapshot, savedName: current2.fileName };
          show2(
            "saved",
            current2.bundle.warnings.length ? diagnosticsText("diagnostics.savedPartial") : titleFor("saved")
          );
        },
        (failure) => {
          if (disposed || generation !== currentGeneration || result2 !== current2) return;
          snapshot = {
            ...snapshot,
            error: diagnosticsText("diagnostics.error.save", { detail: message(failure) })
          };
          render3();
        }
      ).finally(() => {
        if (disposed || generation !== currentGeneration || result2 !== current2) return;
        snapshot = { ...snapshot, saving: false };
        render3();
      });
    }
  };
  render3();
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismiss();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dismiss();
  });
  const dispose = () => {
    if (disposed) return;
    retire();
    disposed = true;
    window.removeEventListener("agnes:locale-changed", onLocale);
    window.removeEventListener("pagehide", dispose);
    root.unmount();
    dialog.remove();
  };
  const onLocale = () => {
    if (disposed) return;
    snapshot = { ...snapshot, title: titleFor(snapshot.step) };
    render3();
  };
  window.addEventListener("agnes:locale-changed", onLocale);
  window.addEventListener("pagehide", dispose, { once: true });
  return {
    open(from) {
      if (disposed) return;
      trigger = from;
      retire();
      const hasSession = deps.context().sessionId !== null;
      snapshot = {
        ...snapshot,
        hasSession,
        include: { conversation: hasSession, logs: true, system: true }
      };
      render3();
      if (!dialog.open) dialog.showModal();
      focusStep();
    },
    dispose
  };
}

// src/live-projection.ts
var WEB_OPENING = { maxNodes: 500, maxBytes: UI_PROJECTION_MAX_BYTES };
var WEB_HISTORY_LIMIT = 100;
var APPROVAL_SEARCH_PAGES = 3;
function createLiveProjection(session, connection, sink) {
  const merger = new PreviewMerger();
  let authoritative;
  let shown;
  let window2;
  const continuity = /* @__PURE__ */ new Map();
  const display = (value) => {
    const projected = merger.apply(value);
    if (continuity.size === 0) {
      shown = projected;
      return projected;
    }
    let nodes;
    const retained = /* @__PURE__ */ new Set();
    for (const [index, node] of projected.nodes.entries()) {
      if (node.kind !== "assistant" || !node.streaming || !node.effectId) continue;
      const previous = continuity.get(node.effectId);
      if (!previous) continue;
      if (node.text || node.thinking) continue;
      retained.add(node.effectId);
      nodes ??= [...projected.nodes];
      nodes[index] = {
        ...node,
        text: previous.text,
        ...previous.thinking ? { thinking: previous.thinking } : {}
      };
    }
    for (const effectId of continuity.keys()) if (!retained.has(effectId)) continuity.delete(effectId);
    shown = nodes ? { ...projected, nodes } : projected;
    return shown;
  };
  const sync = new UIProjectionSync(
    session,
    {
      timeline(value, at) {
        window2 = at;
        authoritative = value;
        sink.timeline(display(value), at);
      },
      preview(p) {
        if (!merger.add(p) || !authoritative) return;
        continuity.delete(p.effectId);
        if (!authoritative.nodes.some((node) => node.kind === "assistant" && node.effectId === p.effectId))
          return;
        sink.stream(display(authoritative));
      },
      event: (event) => sink.event(event),
      error: (error) => sink.error(error)
    },
    {
      surface: "web",
      opening: WEB_OPENING,
      historyLimit: WEB_HISTORY_LIMIT,
      isolate: "share",
      openingFailure: "reject",
      connection
    }
  );
  const offReconnected = connection.on("reconnected", () => {
    continuity.clear();
    for (const node of shown?.nodes ?? []) {
      if (node.kind !== "assistant" || !node.streaming || !node.effectId) continue;
      if (node.text || node.thinking)
        continuity.set(node.effectId, {
          text: node.text,
          ...node.thinking ? { thinking: node.thinking } : {}
        });
    }
    merger.reset();
  });
  return {
    start: () => sync.start(),
    stop: () => {
      offReconnected();
      continuity.clear();
      shown = void 0;
      return sync.stop();
    },
    refresh: () => sync.refresh(),
    resync: () => sync.resync(),
    loadEarlier: () => sync.loadEarlier(),
    hasEarlier: () => window2?.hasEarlier === true,
    atStart: () => window2?.startIndex === 0
  };
}
function approvalOutsideWindow(value) {
  if (!value.opState?.parked) return false;
  return !value.nodes.some((node) => node.kind === "approval" && node.state === "pending");
}
async function findApproval(live2, current2, limit = Number.POSITIVE_INFINITY) {
  for (let page = 0; page < limit; page++) {
    const value2 = current2();
    if (!value2 || !approvalOutsideWindow(value2)) return value2 !== void 0;
    if (!live2.hasEarlier() || !await live2.loadEarlier()) return false;
  }
  const value = current2();
  return value !== void 0 && !approvalOutsideWindow(value);
}

// src/reconnect.ts
var delays = [500, 1e3, 2e3, 3e3];
var PROBE_TIMEOUT_MS = 3e3;
var RECONNECT_WINDOW_MS = 6e4;
function createReconnectController(options) {
  const now = options.now ?? (() => Date.now());
  let phase = "idle";
  let timer;
  let inFlight;
  let cancelled2 = false;
  let attempt = 0;
  let startedAt = 0;
  let manual = false;
  const enter = (next) => {
    if (phase === next) return;
    phase = next;
    options.onPhase?.(next);
  };
  const stop = () => {
    if (timer) clearTimeout(timer);
    timer = void 0;
    inFlight?.abort();
    inFlight = void 0;
  };
  const schedule = (delay) => {
    timer = setTimeout(() => {
      timer = void 0;
      void probeOnce();
    }, delay);
  };
  const probeOnce = async () => {
    const abort = new AbortController();
    inFlight = abort;
    const deadline = setTimeout(() => abort.abort(new Error("probe timed out")), PROBE_TIMEOUT_MS);
    const byUser = manual;
    manual = false;
    let up = false;
    try {
      up = await options.probe(abort.signal, byUser);
    } catch {
      up = false;
    }
    clearTimeout(deadline);
    if (inFlight !== abort || cancelled2 || phase !== "waiting") return;
    inFlight = void 0;
    if (up) {
      enter("recovering");
      options.reload();
      return;
    }
    attempt += 1;
    if (now() - startedAt >= RECONNECT_WINDOW_MS) enter("stalled");
    else schedule(delays[Math.min(attempt, delays.length - 1)] ?? 0);
  };
  const begin = (firstDelay, byUser) => {
    stop();
    manual = byUser;
    attempt = 0;
    startedAt = now();
    enter("waiting");
    if (firstDelay > 0) schedule(firstDelay);
    else void probeOnce();
  };
  return {
    start() {
      if (cancelled2 || phase !== "idle") return;
      begin(delays[0] ?? 0, false);
    },
    retry() {
      if (cancelled2 || phase === "recovering" || inFlight) return;
      begin(0, true);
    },
    resume() {
      if (!cancelled2 && phase === "stalled") begin(0, false);
    },
    cancel() {
      cancelled2 = true;
      stop();
    },
    reset() {
      stop();
      cancelled2 = false;
      enter("idle");
    },
    phase: () => phase
  };
}
async function probeBootstrap(fetcher, signal) {
  try {
    const response = await fetcher("/", { cache: "no-store", credentials: "same-origin", signal });
    if (!response.ok) return void 0;
    const page = new DOMParser().parseFromString(await response.text(), "text/html");
    return page.getElementById("agnes-config")?.dataset.ws || void 0;
  } catch {
    return void 0;
  }
}
function bootstrapProbe(fetcher, currentWs) {
  return async (signal, manual) => {
    const served = await probeBootstrap(fetcher, signal);
    return served !== void 0 && (manual || served !== currentWs);
  };
}

// src/session-actions.ts
function forkTitle(title) {
  const match = /^(.*) \((\d+)\)$/.exec(title);
  const count = match ? Number(match[2]) + 1 : 1;
  const suffix = ` (${Number.isSafeInteger(count) ? count : 1})`;
  return Array.from(match?.[1] ?? title).slice(0, 80 - suffix.length).join("") + suffix;
}
function createSessionActions(options) {
  const t2 = options.translate;
  const dialog = document.createElement("dialog");
  dialog.className = "session-rename-dialog";
  dialog.setAttribute("aria-labelledby", "session-rename-heading");
  dialog.dataset.agnesRegion = "dialog";
  dialog.innerHTML = `<form>
    <div class="dialog-heading"><h2 id="session-rename-heading"></h2></div>
    <label class="form-field" for="session-rename-input">
      <span id="session-rename-label"></span>
      <input id="session-rename-input" required autocomplete="off" aria-describedby="session-rename-error" />
    </label>
    <p id="session-rename-error" class="session-rename-error" role="alert"></p>
    <div class="dialog-actions"><button class="secondary-button" type="button"></button><button class="primary-button" type="submit"></button></div></form>`;
  document.body.append(dialog);
  const heading2 = dialog.querySelector("h2");
  const nameLabel = dialog.querySelector("#session-rename-label");
  const form = dialog.querySelector("form");
  const input = dialog.querySelector("input");
  const error = dialog.querySelector("p");
  const cancel = dialog.querySelector("button");
  const submit = dialog.querySelector("[type=submit]");
  let target;
  let pending = false;
  let saved = false;
  let returnFocus;
  const applyStaticText = () => {
    heading2.textContent = t2("session.rename.heading");
    nameLabel.textContent = t2("session.rename.nameLabel");
    cancel.textContent = t2("session.rename.cancel");
    submit.textContent = saved ? t2("session.rename.retryRefresh") : t2("session.rename.submit");
  };
  const text3 = (failure) => failure instanceof Error ? failure.message : t2("session.rename.defaultError");
  const close = () => {
    if (!pending) dialog.close();
  };
  cancel.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    if (pending) event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    if (returnFocus?.isConnected) returnFocus.focus();
    else
      document.querySelector(`[data-session-action-id="${CSS.escape(target ?? "")}"]`)?.focus();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!target || pending) return;
    const title = input.value.trim();
    if (!title || Array.from(title).length > 80 || /[\p{Cc}\p{Zl}\p{Zp}\u202a-\u202e\u2066-\u2069]/u.test(title)) {
      error.textContent = t2("session.rename.invalidName");
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    const id = target;
    pending = submit.disabled = cancel.disabled = true;
    input.disabled = true;
    dialog.setAttribute("aria-busy", "true");
    error.textContent = "";
    input.removeAttribute("aria-invalid");
    void (async () => {
      try {
        if (!saved) {
          await options.client.session.rename(id, title);
          saved = true;
        }
        await options.changed();
        dialog.close();
      } catch (failure) {
        error.textContent = saved ? t2("session.rename.savedRefreshFailed", { detail: text3(failure) }) : text3(failure);
      } finally {
        pending = submit.disabled = cancel.disabled = false;
        input.disabled = saved;
        applyStaticText();
        dialog.removeAttribute("aria-busy");
        if (dialog.open) (saved ? submit : input).focus();
      }
    })();
  });
  let disposed = false;
  const archivedView = () => {
    if (disposed) return void 0;
    const pane = document.getElementById("archived-settings-pane");
    const search = pane?.querySelector("#archived-search");
    const rows = pane?.querySelector("#archived-list");
    const message2 = pane?.querySelector("#archived-message");
    const empty = pane?.querySelector("#archived-empty");
    if (pane && search && rows && message2 && empty) return { pane, search, rows, message: message2, empty };
    return void 0;
  };
  let archived = [];
  let epoch = 0;
  const restoring = /* @__PURE__ */ new Set();
  const renderArchived = () => {
    const view = archivedView();
    if (!view) return;
    const { search, rows, message: message2, empty } = view;
    const query = search.value.trim().toLocaleLowerCase();
    const visible = archived.filter(
      (row) => `${row.title ?? row.sessionId} ${row.cwd ?? ""}`.toLocaleLowerCase().includes(query)
    );
    rows.replaceChildren();
    for (const row of visible) {
      const item = document.createElement("li");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = row.title ?? t2("session.archived.unnamed");
      const location2 = document.createElement("p");
      location2.textContent = row.cwd ?? t2("session.uncategorized");
      copy.append(title, location2);
      const restore = document.createElement("button");
      restore.type = "button";
      const restoreLabel = t2("session.archived.restore");
      restore.textContent = restoring.has(row.sessionId) ? t2("session.archived.restoring") : restoreLabel;
      restore.setAttribute(
        "aria-label",
        t2("session.archived.restoreAria", { title: title.textContent ?? "" })
      );
      restore.disabled = restoring.has(row.sessionId);
      restore.addEventListener("click", () => {
        if (archivedView()?.rows !== rows || restoring.has(row.sessionId)) return;
        restoring.add(row.sessionId);
        message2.textContent = "";
        renderArchived();
        void (async () => {
          let restored = false;
          try {
            await options.client.session.archive(row.sessionId, false);
            restored = true;
            ++epoch;
            archivedView()?.pane.removeAttribute("aria-busy");
            archived = archived.filter((item2) => item2.sessionId !== row.sessionId);
            renderArchived();
            await options.changed();
            await loadArchived(t2("session.archived.refreshFailedPrefix"));
            if (archivedView()?.rows === rows) search.focus();
          } catch (failure) {
            const current2 = archivedView();
            if (current2)
              current2.message.textContent = restored ? t2("session.archived.refreshFailedPrefix") + text3(failure) : text3(failure);
          } finally {
            restoring.delete(row.sessionId);
            renderArchived();
          }
        })();
      });
      item.append(copy, restore);
      rows.append(item);
    }
    empty.textContent = visible.length ? "" : archived.length ? t2("session.archived.empty.noMatch") : t2("session.archived.empty.fallback");
  };
  const loadArchived = async (failurePrefix = "") => {
    const view = archivedView();
    if (!view) return;
    const { pane, message: message2 } = view;
    const version = ++epoch;
    const current2 = () => version === epoch && archivedView()?.rows === view.rows;
    pane.setAttribute("aria-busy", "true");
    message2.textContent = "";
    try {
      const all = [];
      let cursor;
      do {
        const page = await options.client.session.list({ limit: 500, ...cursor ? { cursor } : {} });
        if (!current2()) return;
        all.push(...page.items.filter((row) => row.archived));
        if (page.next === cursor && page.next !== void 0)
          throw new Error(t2("session.archived.paginationStalled"));
        cursor = page.next;
      } while (cursor !== void 0);
      archived = all;
      renderArchived();
    } catch (failure) {
      if (current2()) message2.textContent = failurePrefix + text3(failure);
    } finally {
      if (current2()) pane.removeAttribute("aria-busy");
    }
  };
  const onSearch = (event) => {
    if (event.target === archivedView()?.search) renderArchived();
  };
  const onRefresh = (event) => {
    const view = archivedView();
    if (!view || !(event.target instanceof Element)) return;
    const button2 = event.target.closest("button");
    if (!button2 || button2.disabled || button2 !== view.pane.querySelector("#archived-refresh")) return;
    void (async () => {
      try {
        await options.changed();
        if (archivedView()?.rows === view.rows) await loadArchived();
      } catch (failure) {
        if (archivedView()?.rows === view.rows)
          view.message.textContent = t2("session.refreshFailed", { detail: text3(failure) });
      }
    })();
  };
  document.addEventListener("input", onSearch, true);
  document.addEventListener("click", onRefresh);
  let observedRows = archivedView()?.rows;
  const observer = new MutationObserver(() => {
    const rows = archivedView()?.rows;
    if (rows === observedRows) return;
    observedRows = rows;
    ++epoch;
    if (rows) void loadArchived();
  });
  observer.observe(document.getElementById("config") ?? document.body, { childList: true, subtree: true });
  const dispose = () => {
    disposed = true;
    ++epoch;
    observer.disconnect();
    document.removeEventListener("input", onSearch, true);
    document.removeEventListener("click", onRefresh);
    window.removeEventListener("pagehide", dispose);
    dialog.remove();
  };
  window.addEventListener("pagehide", dispose, { once: true });
  const busy = /* @__PURE__ */ new Set();
  return {
    dispose,
    loadArchived,
    async act(action, id, title, trigger) {
      if (disposed) return;
      if (action === "rename") {
        if (dialog.open) return;
        target = id;
        returnFocus = trigger;
        saved = false;
        input.disabled = false;
        applyStaticText();
        input.value = title;
        error.textContent = "";
        input.removeAttribute("aria-invalid");
        dialog.showModal();
        input.focus();
        input.select();
        return;
      }
      if (busy.has(id)) return;
      busy.add(id);
      trigger.setAttribute("aria-busy", "true");
      let archivedSuccessfully = false;
      try {
        if (action === "fork") await options.fork(id, title);
        else {
          await options.client.session.archive(id, true);
          archivedSuccessfully = true;
          await options.changed();
          document.querySelector("#sessions button")?.focus();
        }
      } catch (failure) {
        options.error(
          archivedSuccessfully ? new Error(t2("session.archiveRefreshFailedNotice", { detail: text3(failure) })) : failure
        );
      } finally {
        busy.delete(id);
        trigger.removeAttribute("aria-busy");
      }
    }
  };
}

// src/session-binding.ts
async function loadWebSession(load, id, permission) {
  let offPermission2;
  const session = await load(id, {
    onPermissionRequest: permission,
    onPermissionRequestRegistered: (off) => {
      offPermission2 = off;
    }
  });
  return offPermission2 ? { session, offPermission: offPermission2 } : { session };
}
function bindWebSession(session, permission) {
  return { session, offPermission: session.onPermissionRequest(permission) };
}

// src/session-title.ts
function sessionTitle(saved, prompt) {
  return saved || (prompt ? Array.from(prompt).slice(0, 56).join("") : tr("sessionTitle.fallback"));
}
function createTitleRefresh(refresh, options = {}) {
  const pending = /* @__PURE__ */ new Map();
  const attempted = /* @__PURE__ */ new Set();
  const stop = (id) => {
    const timer = pending.get(id);
    if (timer !== void 0) clearTimeout(timer);
    pending.delete(id);
  };
  return {
    start(id) {
      if (pending.has(id) || attempted.has(id)) return;
      attempted.add(id);
      pending.set(id, void 0);
      let left = options.attempts ?? 20;
      const poll = async () => {
        if (!pending.has(id)) return;
        let done = false;
        try {
          done = await refresh(id);
        } catch {
        }
        if (!pending.has(id)) return;
        if (done || --left <= 0) {
          stop(id);
          return;
        }
        pending.set(
          id,
          setTimeout(() => {
            void poll();
          }, options.intervalMs ?? 2e3)
        );
      };
      void poll();
    },
    stop,
    close() {
      for (const id of pending.keys()) stop(id);
    }
  };
}

// src/settings.ts
import { createElement as createElement24 } from "react";

// src/oauth-controls.ts
import { createElement as createElement23 } from "react";
function uiButton(parent, text3, className) {
  if (typeof window !== "undefined" && typeof document.querySelector === "function") {
    const host = createRegionHost(parent, "span", "agnes-ui-button-host");
    const props = className === void 0 ? { type: "default" } : { className, type: "default" };
    const dispose = mountRegion(host, createElement23(Button, props, text3));
    const button3 = host.querySelector("button");
    if (button3) return { button: button3, host, dispose };
    dispose();
    host.remove();
  }
  const button2 = createRegionHost(parent, "button");
  button2.type = "button";
  button2.textContent = text3;
  if (className) button2.className = className;
  return { button: button2, host: button2 };
}
function uiField(parent) {
  if (typeof window !== "undefined" && typeof document.querySelector === "function") {
    const host = createRegionHost(parent, "span", "agnes-ui-field-host");
    const dispose = mountRegion(
      host,
      createElement23(
        Field,
        { className: "form-field oauth-prompt", hidden: true, label: tr("settings.oauth.prompt") },
        createElement23("input", { autoComplete: "off", type: "password" })
      )
    );
    const field2 = host.querySelector("label");
    const input2 = host.querySelector("input");
    if (field2 && input2) return { field: field2, input: input2, host, dispose };
    dispose();
    host.remove();
  }
  const field = createRegionHost(parent, "label");
  field.className = "form-field oauth-prompt";
  field.textContent = tr("settings.oauth.prompt");
  const input = createRegionHost(field, "input");
  input.type = "password";
  input.autocomplete = "off";
  field.append(input);
  return { field, input, host: field };
}
function oauthControls(parent, client2, callbacks) {
  const panel = createRegionHost(parent, "section");
  panel.className = "oauth-controls";
  panel.setAttribute("aria-label", tr("settings.oauth.panelAria"));
  panel.hidden = true;
  const status = createRegionHost(panel, "p", "oauth-status");
  status.setAttribute("role", "status");
  const links = createRegionHost(panel, "div", "oauth-links");
  const promptView = uiField(panel);
  const prompt = promptView.field;
  const answer = promptView.input;
  prompt.hidden = true;
  const actions = createRegionHost(panel, "div", "oauth-actions");
  const browserView = uiButton(actions, tr("settings.oauth.browserLogin"));
  const deviceView = uiButton(actions, tr("settings.oauth.deviceLogin"));
  const cancelView = uiButton(actions, tr("settings.oauth.cancelLogin"));
  const submitView = uiButton(actions, tr("settings.oauth.submitCode"), "secondary-button");
  const browser = browserView.button;
  const device = deviceView.button;
  const cancel = cancelView.button;
  const submit = submitView.button;
  actions.append(browserView.host, deviceView.host, cancelView.host);
  submit.hidden = true;
  cancel.hidden = true;
  panel.append(actions, status, links, promptView.host, submitView.host);
  parent.append(panel);
  let controller;
  let operationId;
  let allowedHosts = /* @__PURE__ */ new Set();
  const providerHosts = {
    "openai-codex": ["auth.openai.com"],
    anthropic: ["claude.ai"],
    "github-copilot": ["github.com"],
    "kimi-coding": ["auth.kimi.com", "www.kimi.com"],
    xai: ["auth.x.ai", "accounts.x.ai"]
  };
  const clear = () => {
    controller?.abort();
    controller = void 0;
    if (operationId) void client2.oauth({ action: "cancel", operationId }).catch(() => {
    });
    operationId = void 0;
    answer.value = "";
    prompt.hidden = true;
    submit.hidden = true;
    cancel.hidden = true;
    links.replaceChildren();
    status.textContent = "";
    status.removeAttribute("aria-busy");
    callbacks.pending(false);
  };
  const start = async (loginMethod) => {
    clear();
    const own2 = new AbortController();
    controller = own2;
    let input;
    let provider;
    try {
      input = callbacks.input();
      provider = callbacks.provider();
      if (!provider?.loginMethods?.includes(loginMethod))
        throw new Error(tr("settings.oauth.methodUnsupported"));
    } catch (error) {
      if (controller === own2) {
        clear();
        callbacks.error(error);
      }
      return;
    }
    try {
      allowedHosts = new Set(providerHosts[provider.id] ?? []);
      callbacks.pending(true);
      callbacks.ready([]);
      browser.disabled = true;
      device.disabled = true;
      cancel.hidden = false;
      status.textContent = tr("settings.oauth.awaiting");
      status.setAttribute("aria-busy", "true");
      const result2 = await loginSubscription(
        client2,
        { ...input, action: "start", providerId: provider.id, loginMethod },
        {
          signal: own2.signal,
          operation: (id) => {
            operationId = id;
          },
          notice: (notice2) => {
            status.textContent = notice2.message;
            if (!notice2.url) return;
            const url = new URL(notice2.url);
            if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || url.username || url.password)
              return;
            const link = createRegionHost(links, "a");
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = tr("settings.oauth.openLoginPage", { provider: provider.label });
          },
          prompt: (value, signal) => new Promise((resolve, reject) => {
            const promptLabel = prompt.querySelector(".agnes-ui-field-label");
            if (promptLabel) promptLabel.textContent = value.message;
            else if (prompt.firstChild) prompt.firstChild.textContent = value.message;
            answer.type = value.type === "secret" ? "password" : "text";
            answer.placeholder = value.placeholder ?? "";
            submit.textContent = value.type === "text" ? tr("settings.oauth.continue") : tr("settings.oauth.submit");
            prompt.hidden = false;
            submit.hidden = false;
            answer.value = "";
            answer.focus();
            const cleanup = () => {
              submit.removeEventListener("click", send);
              signal.removeEventListener("abort", abort);
              answer.value = "";
              prompt.hidden = true;
              submit.hidden = true;
            };
            const send = () => {
              if (!answer.value.trim() && value.type !== "text") return;
              const answerValue = answer.value.trim();
              if (provider.id === "github-copilot" && answerValue) {
                try {
                  allowedHosts.add(
                    new URL(answerValue.includes("://") ? answerValue : `https://${answerValue}`).hostname
                  );
                } catch {
                  return;
                }
              }
              cleanup();
              resolve(answerValue);
            };
            const abort = () => {
              cleanup();
              reject(new Error("cancelled"));
            };
            submit.addEventListener("click", send);
            signal.addEventListener("abort", abort, { once: true });
            if (signal.aborted) abort();
          })
        }
      );
      if (controller !== own2 || own2.signal.aborted) return;
      status.textContent = tr("settings.oauth.completed");
      status.removeAttribute("aria-busy");
      links.replaceChildren();
      callbacks.ready(result2.models ?? []);
    } catch {
      if (controller === own2 && !own2.signal.aborted) {
        clear();
        callbacks.pending(false);
        callbacks.error(
          new Error(
            provider.loginMethods && provider.loginMethods.length > 1 ? tr("settings.oauth.failedRetry") : tr("settings.oauth.failedNetwork")
          )
        );
      }
    } finally {
      if (controller === own2) {
        callbacks.pending(false);
        browser.disabled = false;
        device.disabled = false;
      }
    }
  };
  browser.addEventListener("click", () => void start("browser"));
  device.addEventListener("click", () => void start("device_code"));
  cancel.addEventListener("click", () => {
    clear();
    callbacks.pending(false);
    callbacks.ready([]);
    (browser.hidden ? device : browser).focus();
  });
  answer.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit.click();
    }
  });
  return {
    clear,
    operation: () => operationId,
    visible(value) {
      panel.hidden = !value;
      const provider = callbacks.provider();
      const methods = provider?.loginMethods ?? (provider?.authType === "oauth" ? ["browser", "device_code"] : []);
      browser.hidden = !methods.includes("browser");
      device.hidden = !methods.includes("device_code");
    },
    disabled(value) {
      browser.disabled = value;
      device.disabled = value;
    }
  };
}

// src/provider-picker.ts
function createProviderPicker(select) {
  return createSelectPicker(select, {
    label: tr("settings.provider.label"),
    includeEmpty: false,
    formatOption: (label2) => label2.replace(tr("settings.provider.subscriptionLoginSuffix"), "")
  });
}
function createAccountPickers(ui) {
  const pickers = [
    createProviderPicker(ui.provider),
    createSelectPicker(ui.authMethod, { label: tr("settings.oauth.methodLabel") }),
    createSelectPicker(ui.models, { label: tr("accounts.defaultModelLabel") }),
    ...ui.thinking ? [createSelectPicker(ui.thinking, { label: tr("settings.model.thinkingLabel") })] : []
  ];
  return {
    sync: () => {
      for (const picker of pickers) picker.sync();
    },
    close: () => {
      for (const picker of pickers) picker.close();
    }
  };
}

// src/settings.ts
var CONFIGURATION_REASON_KEYS = {
  CONFIG_AUTH_FAILED: "settings.config.authFailed",
  CONFIG_AUTH_EXPIRED: "settings.config.authExpired",
  CONFIG_AUTH_BUSY: "settings.config.authBusy",
  CONFIG_INVALID_INPUT: "settings.config.invalidInput",
  CONFIG_UNKNOWN_PROVIDER: "settings.config.unknownProvider",
  CONFIG_ENDPOINT_OVERRIDE_UNSUPPORTED: "settings.config.endpointUnsupported",
  CONFIG_CREDENTIAL_REQUIRED: "settings.config.credentialRequired",
  CONFIG_CREDENTIAL_PERMISSIONS: "settings.config.credentialPermissions",
  CONFIG_CREDENTIAL_NO_SPACE: "settings.config.credentialNoSpace",
  CONFIG_CREDENTIAL_READ_ONLY: "settings.config.credentialReadOnly",
  CONFIG_CREDENTIAL_INVALID: "settings.config.credentialInvalid",
  CONFIG_CREDENTIAL_STORE: "settings.config.credentialStore",
  CONFIG_PROVIDER_UNAVAILABLE: "settings.config.providerUnavailable",
  CONFIG_TEST_FAILED: "settings.config.testFailed",
  CONFIG_SUBSCRIPTION_AUTH: "settings.config.subscriptionAuth",
  CONFIG_SUBSCRIPTION_QUOTA: "settings.config.subscriptionQuota",
  CONFIG_SUBSCRIPTION_RATE_LIMIT: "settings.config.subscriptionRateLimit",
  CONFIG_SUBSCRIPTION_TIMEOUT: "settings.config.subscriptionTimeout",
  CONFIG_SUBSCRIPTION_MODEL: "settings.config.subscriptionModel",
  CONFIG_SUBSCRIPTION_FAILED: "settings.config.subscriptionFailed",
  CONFIG_MODEL_UNAVAILABLE: "settings.config.modelUnavailable",
  CONFIG_REVISION_CONFLICT: "settings.config.revisionConflict",
  CONFIG_PERSIST_FAILED: "settings.config.persistFailed",
  CONFIG_INVALID_STATE: "settings.config.invalidState"
};
var PERMISSION_TARGET_KEYS = {
  home: "settings.config.credentialTarget.home",
  secrets: "settings.config.credentialTarget.secrets",
  auth: "settings.config.credentialTarget.auth",
  locks: "settings.config.credentialTarget.locks",
  provider: "settings.config.credentialTarget.provider",
  file: "settings.config.credentialTarget.file"
};
function permissionDetail(data, t2) {
  const detail = "detail" in data && data.detail !== null && typeof data.detail === "object" ? data.detail : void 0;
  if (!detail) return void 0;
  const { target, actualMode, expectedMode } = detail;
  const targetKey = typeof target === "string" ? PERMISSION_TARGET_KEYS[target] : void 0;
  if (targetKey === void 0 || typeof actualMode !== "string" || typeof expectedMode !== "string" || !/^[0-7]{4}$/.test(actualMode) || !/^[0-7]{4}$/.test(expectedMode))
    return void 0;
  return t2("settings.config.credentialPermissionsDetail").replace("{target}", t2(targetKey)).replace("{actual}", actualMode).replace("{expected}", expectedMode);
}
function configurationReason(error, t2 = tr) {
  if (error === null || typeof error !== "object") return void 0;
  const data = "data" in error && error.data !== null && typeof error.data === "object" ? error.data : void 0;
  const reason = data && "reason" in data && typeof data.reason === "string" ? data.reason : void 0;
  const key = reason === void 0 ? void 0 : CONFIGURATION_REASON_KEYS[reason];
  if (key === void 0) return void 0;
  const text3 = t2(key);
  const detail = reason === "CONFIG_CREDENTIAL_PERMISSIONS" && data ? permissionDetail(data, t2) : void 0;
  return detail ? `${detail} ${text3}` : text3;
}
function element(id, tag) {
  const found = document.getElementById(id);
  if (!found || found.tagName.toLowerCase() !== tag) throw new Error(`missing ${tag}#${id}`);
  return found;
}
function optionalElement(id, tag) {
  const found = document.getElementById(id);
  return found?.tagName.toLowerCase() === tag ? found : void 0;
}
function readElements() {
  return {
    dialog: element("config", "dialog"),
    form: element("config-form", "form"),
    provider: element("config-provider", "select"),
    authMethod: element("config-auth-method", "select"),
    authMethodField: element("config-auth-method-field", "label"),
    oauthMount: element("config-oauth-controls", "div"),
    baseUrl: element("config-base-url", "input"),
    apiKey: element("config-api-key", "input"),
    test: element("config-test", "button"),
    models: element("config-model", "select"),
    thinking: optionalElement("config-thinking", "select"),
    contextWindow: optionalElement("config-context-window", "input"),
    modelSettingsHint: optionalElement("config-model-settings-hint", "p"),
    save: element("config-save", "button"),
    error: element("config-error", "p"),
    state: element("config-state", "p"),
    keyHint: optionalElement("config-key-hint", "p"),
    retry: optionalElement("config-retry", "button"),
    close: element("config-close", "button")
  };
}
var option = (label2, value) => ({ label: label2, value });
function errorText(error, secret, t2) {
  const message2 = configurationReason(error, t2) ?? (error instanceof Error ? error.message : t2("settings.config.requestFailed"));
  return secret ? message2.split(secret).join("[redacted]") : message2;
}
function focusable(value) {
  return value !== null && typeof value.focus === "function";
}
function createSettingsController(options) {
  const ui = readElements();
  const providerPicker = createAccountPickers(ui);
  let connected2 = true;
  let configuration;
  const accountList = () => optionalElement("config-accounts", "div");
  let renderedAccountList;
  const addAccount = () => optionalElement("config-add-account", "button");
  const accountDialog = optionalElement("account-dialog", "dialog");
  const accountDialogTitle = optionalElement("config-detail-title", "h3");
  const accountDialogContext = optionalElement("config-account-context", "p");
  const accountName = optionalElement("config-account-name", "input");
  let editingId;
  let removingId;
  const selectedAccount = () => configuration?.accounts?.find((row) => row.accountId === editingId);
  const savedProvider = () => {
    const row = selectedAccount();
    return configuration?.accounts !== void 0 ? row ? {
      id: row.providerId,
      model: row.model,
      baseUrl: row.baseUrl,
      credentialConfigured: row.credentialConfigured,
      authType: row.authType
    } : void 0 : configuration?.provider;
  };
  let providers = [];
  const modelDrafts = /* @__PURE__ */ new Map();
  let tested;
  let testPending = false;
  let savePending = false;
  let loadPhase = "idle";
  let testGeneration = 0;
  let revision = 0;
  let lifecycle = 0;
  let opening;
  let focusReturn = null;
  let suggestedAccountLabel;
  const providerId = () => ui.provider.value.split(":")[0] ?? "";
  const canUseSavedModels = () => {
    const account = selectedAccount();
    return !!account && !!tested?.models.length && account.providerId === providerId() && account.authType === ui.authMethod.value && account.baseUrl.replace(/\/$/, "") === ui.baseUrl.value.trim().replace(/\/$/, "") && !ui.apiKey.value;
  };
  const authMethods = (provider) => provider.authMethods ?? [provider.authType ?? "api-key"];
  const providerValue = (provider, auth) => auth === "oauth" && authMethods(provider).includes("api-key") ? `${provider.id}:oauth` : provider.id;
  const isOAuth = () => ui.authMethod.value === "oauth";
  const hasUnverifiedSavedChanges = () => {
    const account = selectedAccount();
    if (!account || !canUseSavedModels()) return false;
    const name = accountName?.value.trim();
    return ui.models.value !== account.model || !!name && name !== account.label;
  };
  const oauth = oauthControls(ui.oauthMount, options.client.config, {
    input: () => {
      const provider = providers.find((row) => row.id === providerId());
      if (!configuration || !editingId || !accountName || !provider)
        throw new Error(tr("settings.account.notLoaded"));
      const label2 = accountName.value.trim() || provider.label;
      if (!accountName.value.trim()) suggestedAccountLabel = label2;
      accountName.value = label2;
      return {
        action: "start",
        providerId: provider.id,
        accountId: editingId,
        label: label2,
        expectedRevision: configuration.revision
      };
    },
    provider: () => providers.find((provider) => provider.id === providerId()),
    pending: (value) => {
      testGeneration += 1;
      testPending = value;
      if (value) ui.error.textContent = "";
      updateButtons();
    },
    ready: (models) => {
      tested = models.length ? { models, verified: true } : void 0;
      ui.state.textContent = models.length ? tr("settings.oauth.authorizedVerify") : testPending ? tr("settings.oauth.awaitingAuth") : tr("settings.oauth.cancelled");
      renderModels();
      if (models.length) ui.models.focus();
    },
    error: (error) => setError(error)
  });
  const modelReadyForSave = () => !!tested?.verified || isOAuth() && oauth.operation() !== void 0 && ui.models.value !== "" || hasUnverifiedSavedChanges();
  const current2 = (token, inputRevision) => token === lifecycle && ui.dialog.open && (inputRevision === void 0 || inputRevision === revision);
  const setError = (error) => {
    const secret = ui.apiKey.value;
    const translated = configurationReason(error, tr);
    const message2 = translated ?? errorText(error, secret, tr);
    ui.error.textContent = message2;
    ui.state.textContent = "";
    try {
      options.onError(secret || translated ? new Error(message2) : error);
    } catch {
    }
  };
  const setLoadPhase = (phase) => {
    loadPhase = phase;
    const currentAccountList = accountList();
    if (currentAccountList) currentAccountList.dataset.state = phase;
    if (ui.retry) ui.retry.hidden = phase !== "error";
    if (phase === "loading") ui.state.textContent = tr("settings.state.reading");
    if (phase === "error") ui.state.textContent = tr("settings.state.readFailed");
    updateButtons();
  };
  const updateButtons = () => {
    const busy = loadPhase === "loading" || testPending || savePending;
    const oauthSelected = isOAuth();
    oauth.visible(oauthSelected);
    oauth.disabled(!connected2 || busy);
    if (ui.apiKey.closest("label")) ui.apiKey.closest("label").hidden = oauthSelected;
    ui.provider.disabled = !connected2 || busy || oauth.operation() !== void 0 || selectedAccount() !== void 0;
    ui.authMethod.disabled = !connected2 || busy || oauth.operation() !== void 0;
    if (accountName) accountName.disabled = !connected2 || busy || oauth.operation() !== void 0;
    const currentAddAccount = addAccount();
    if (currentAddAccount) currentAddAccount.disabled = !connected2 || busy;
    renderAccounts();
    ui.baseUrl.disabled = !connected2 || busy || oauthSelected;
    ui.apiKey.disabled = !connected2 || busy || oauthSelected;
    ui.test.disabled = !connected2 || busy || oauthSelected && (oauth.operation() ? !tested?.models.length || !ui.models.value : !selectedAccount());
    ui.models.disabled = !connected2 || busy || !tested?.models.length || !oauthSelected && !tested.verified;
    if (ui.thinking) ui.thinking.disabled = ui.models.disabled;
    if (ui.contextWindow) ui.contextWindow.disabled = ui.models.disabled;
    ui.save.disabled = !connected2 || busy || !modelReadyForSave() || !tested?.models.length || ui.models.value === "";
    providerPicker.sync();
  };
  const renderModels = (models = tested?.models ?? []) => {
    const previousModel = ui.models.value;
    setSettingsSelectOptions(ui.models, [
      option(models.length ? tr("settings.model.chooseSaved") : tr("settings.model.testFirst"), ""),
      ...models.map((model) => option(`${model.name} · ${model.id}`, model.id))
    ]);
    const savedModel = models.some((model) => model.id === previousModel) ? previousModel : savedProvider()?.model ?? (models.length === 1 ? models[0]?.id : void 0);
    ui.models.value = savedModel && models.some((model) => model.id === savedModel) ? savedModel : "";
    renderModelSettings();
    updateButtons();
  };
  const readModelSettings = () => {
    const model = tested?.models.find((entry) => entry.id === ui.models.value);
    const thinking = ui.thinking?.value ?? model?.defaultSettings?.thinking;
    const window2 = ui.contextWindow?.value.trim() ?? String(model?.defaultSettings?.contextWindow ?? "");
    const tokens = parseContextBudget(window2);
    if (thinking && !modelThinkingOptions(model?.thinkingLevelMap, tr).some((option2) => option2.value === thinking)) {
      ui.thinking?.setAttribute("aria-invalid", "true");
      throw new Error(tr("settings.model.thinkingUnsupported"));
    }
    ui.thinking?.setAttribute("aria-invalid", "false");
    if (window2 && (tokens === void 0 || tokens < minimumContextBudget(model?.contextWindow) || model?.contextWindow !== void 0 && tokens > model.contextWindow)) {
      ui.contextWindow?.setAttribute("aria-invalid", "true");
      throw new Error(
        tr("settings.model.contextRange", {
          min: minimumContextBudget(model?.contextWindow).toLocaleString()
        })
      );
    }
    ui.contextWindow?.setAttribute("aria-invalid", "false");
    return {
      ...thinking ? { thinking } : {},
      ...tokens === void 0 ? {} : { contextWindow: tokens }
    };
  };
  const renderModelSettings = () => {
    const model = tested?.models.find((entry) => entry.id === ui.models.value);
    const defaults = modelDrafts.get(ui.models.value) ?? selectedAccount()?.models.find((entry) => entry.id === ui.models.value)?.defaultSettings ?? model?.defaultSettings ?? {};
    if (ui.thinking) {
      const options2 = modelThinkingOptions(model?.thinkingLevelMap, tr);
      if (defaults.thinking && !options2.some((option2) => option2.value === defaults.thinking))
        options2.push({
          value: defaults.thinking,
          label: tr("settings.model.savedThinkingUnavailable", { value: defaults.thinking })
        });
      setSettingsSelectOptions(ui.thinking, options2);
      ui.thinking.value = defaults.thinking ?? "";
    }
    if (ui.contextWindow) {
      ui.contextWindow.value = String(defaults.contextWindow ?? "");
      if (model?.contextWindow) ui.contextWindow.max = String(model.contextWindow);
      else ui.contextWindow.removeAttribute("max");
      ui.contextWindow.setAttribute("aria-invalid", "false");
    }
    if (ui.modelSettingsHint)
      ui.modelSettingsHint.textContent = (model?.contextWindow ? `${tr("settings.model.capacity", { tokens: model.contextWindow.toLocaleString() })} ` : "") + tr("settings.model.budgetHint");
  };
  const renderKeyHint = () => {
    if (!ui.keyHint) return;
    const reusesSavedKey = connected2 && savedProvider()?.id === providerId() && savedProvider()?.credentialConfigured;
    if (isOAuth()) {
      ui.keyHint.textContent = tr("settings.key.oauthHint");
      return;
    }
    ui.keyHint.textContent = reusesSavedKey ? tr("settings.key.savedHint") : connected2 ? tr("settings.key.inputHint") : tr("settings.key.offlineCleared");
  };
  const renderProviders = () => {
    const savedProviderId = savedProvider()?.id;
    const groups = ["api-key", "oauth"].map((method) => ({
      label: method === "oauth" ? tr("settings.provider.subscriptionLogin") : "API Key",
      options: providers.filter((provider) => authMethods(provider).includes(method)).map(
        (provider) => option(
          method === "oauth" ? `${provider.label.replace(/\s*subscription$/i, "")}${tr("settings.provider.subscriptionLoginSuffix")}` : provider.label,
          providerValue(provider, method)
        )
      )
    }));
    setSettingsSelectOptions(
      ui.provider,
      [option(providers.length ? tr("settings.provider.choose") : tr("settings.provider.none"), "")],
      groups
    );
    if (savedProviderId && providers.some((provider) => provider.id === savedProviderId))
      ui.provider.value = savedProviderId;
    else if (providers[0]) ui.provider.value = providers[0].id;
    const selected = providers.find((provider) => provider.id === providerId());
    const methods = selected?.authMethods ?? [selected?.authType ?? "api-key"];
    setSettingsSelectOptions(
      ui.authMethod,
      methods.map(
        (method) => option(method === "oauth" ? tr("settings.provider.subscriptionLogin") : "API Key", method)
      )
    );
    const saved = savedProvider();
    const savedAuth = saved && "authType" in saved ? saved.authType : void 0;
    ui.authMethod.value = savedAuth && methods.includes(savedAuth) ? savedAuth : methods[0] ?? "api-key";
    if (selected) ui.provider.value = providerValue(selected, ui.authMethod.value);
    ui.authMethodField.hidden = methods.length < 2;
    ui.baseUrl.value = savedProvider()?.baseUrl ?? selected?.baseUrl ?? "";
    ui.apiKey.value = "";
    renderKeyHint();
  };
  const resetTest = (clearError = true) => {
    revision += 1;
    testGeneration += 1;
    testPending = false;
    const saved = selectedAccount();
    tested = saved?.models.length ? { models: saved.models, verified: false } : void 0;
    ui.models.value = "";
    renderModels();
    if (clearError) ui.error.textContent = "";
    ui.state.textContent = tr("settings.state.connectionChanged");
  };
  const input = () => {
    const selectedId = providerId();
    const selected = providers.find((provider) => provider.id === selectedId);
    if (!selectedId || !selected) throw new Error(tr("settings.provider.required"));
    const baseUrl = ui.baseUrl.value.trim();
    const apiKey = ui.apiKey.value;
    if (!isOAuth() && selectedAccount()?.authType === "oauth" && !apiKey)
      throw new Error(tr("settings.provider.switchKeyRequired"));
    return {
      providerId: selectedId,
      ...editingId ? { accountId: editingId } : {},
      // An explicit provider default must survive the client boundary so Host can reset a saved
      // custom endpoint. An empty field remains an omitted override per Config*Input semantics.
      ...baseUrl ? { baseUrl } : {},
      ...apiKey ? { apiKey } : {}
    };
  };
  const show2 = () => {
    if (ui.dialog.open) return;
    try {
      ui.dialog.showModal();
    } catch {
      ui.dialog.setAttribute("open", "");
    }
  };
  const closeDialog = () => {
    if (ui.dialog.open) {
      try {
        ui.dialog.close();
      } catch {
        ui.dialog.removeAttribute("open");
      }
    }
  };
  const close = () => {
    oauth.clear();
    testPending = false;
    closeAccountDialog();
    lifecycle += 1;
    revision += 1;
    opening = void 0;
    tested = void 0;
    loadPhase = "idle";
    const currentAccountList = accountList();
    if (currentAccountList) currentAccountList.dataset.state = "idle";
    if (ui.retry) ui.retry.hidden = true;
    renderModels();
    ui.apiKey.value = "";
    closeDialog();
    updateButtons();
    const target = focusReturn;
    focusReturn = null;
    if (focusable(target) && target.isConnected !== false) target.focus();
  };
  const load = async (token) => {
    if (current2(token)) setLoadPhase("loading");
    try {
      const [snapshot, result2] = await Promise.all([
        options.client.config.get(),
        options.client.config.providers()
      ]);
      if (!current2(token)) return;
      configuration = snapshot;
      editingId = snapshot.defaultAccountId ?? snapshot.accounts?.[0]?.accountId;
      if (snapshot.accounts && !editingId) editingId = `acct-${crypto.randomUUID()}`;
      if (accountName) accountName.value = selectedAccount()?.label ?? "";
      removingId = void 0;
      renderAccounts();
      providers = [...result2.providers].sort((a, b) => +(b.id === "agnes-ai") - +(a.id === "agnes-ai"));
      tested = void 0;
      ui.error.textContent = "";
      ui.state.textContent = snapshot.configured ? tr("settings.step.loadedSaved") : tr("settings.step.first");
      renderProviders();
      renderModels();
      setLoadPhase(snapshot.accounts?.length ? "ready" : "empty");
    } catch (error) {
      if (current2(token)) {
        setError(error);
        setLoadPhase("error");
      }
    }
  };
  const test = async () => {
    if (!connected2 || testPending || savePending) return;
    const token = lifecycle;
    const inputRevision = revision;
    const generation = ++testGeneration;
    const ownsTest = () => current2(token, inputRevision) && generation === testGeneration;
    const oauthId = isOAuth() ? oauth.operation() : void 0;
    if (oauthId) {
      const model = ui.models.value;
      if (!model) return;
      testPending = true;
      ui.error.textContent = "";
      ui.state.textContent = tr("settings.step.testingModel");
      updateButtons();
      try {
        await options.client.config.oauth({ action: "test", operationId: oauthId, model });
        if (ownsTest()) {
          if (tested) tested = { ...tested, verified: true };
          ui.state.textContent = tr("settings.step.modelVerified");
        }
      } catch (error) {
        if (ownsTest()) setError(error);
      } finally {
        if (ownsTest()) {
          testPending = false;
          updateButtons();
        }
      }
      return;
    }
    let request;
    try {
      request = input();
    } catch (error) {
      setError(error);
      return;
    }
    testPending = true;
    ui.error.textContent = "";
    ui.state.textContent = tr("settings.step.second");
    updateButtons();
    try {
      const result2 = await options.client.config.test({
        ...request,
        ...isOAuth() && ui.models.value ? { model: ui.models.value } : {}
      });
      if (!ownsTest()) return;
      if (isOAuth()) tested = result2;
      if (!result2.verified || result2.models.length === 0) throw new Error(tr("settings.provider.noCatalog"));
      tested = result2;
      ui.state.textContent = tr("settings.step.third", { count: result2.models.length });
      ui.error.textContent = "";
      renderModels(result2.models);
    } catch (error) {
      if (!ownsTest()) return;
      tested = isOAuth() && tested ? { ...tested, verified: false } : void 0;
      renderModels();
      setError(error);
    } finally {
      if (ownsTest()) {
        testPending = false;
        updateButtons();
      }
    }
  };
  const save = async () => {
    if (!connected2 || testPending || savePending || !tested?.models.length || !modelReadyForSave() || !ui.models.value)
      return;
    const token = lifecycle;
    const inputRevision = revision;
    const modelId = ui.models.value;
    let request;
    let defaultSettings;
    try {
      request = input();
      defaultSettings = ui.thinking || ui.contextWindow ? readModelSettings() : void 0;
      if (accountName && editingId && !accountName.value.trim())
        throw new Error(tr("settings.account.nameRequired"));
    } catch (error) {
      setError(error);
      return;
    }
    savePending = true;
    ui.error.textContent = "";
    ui.state.textContent = tr("settings.step.saving");
    updateButtons();
    try {
      const oauthId = oauth.operation();
      const oauthResult = oauthId ? await options.client.config.oauth({
        action: "commit",
        operationId: oauthId,
        model: modelId,
        ...defaultSettings === void 0 ? {} : { defaultSettings }
      }) : void 0;
      if (oauthId && !oauthResult?.snapshot) throw new Error(tr("settings.oauth.saveIncomplete"));
      const saved = oauthResult?.snapshot ?? await options.client.config.save({
        ...request,
        ...accountName && editingId ? { label: accountName.value.trim() } : {},
        model: modelId,
        ...defaultSettings === void 0 ? {} : { defaultSettings },
        ...configuration ? { expectedRevision: configuration.revision } : {}
      });
      if (!current2(token, inputRevision)) {
        try {
          await options.onSaved(saved);
        } catch (error) {
          try {
            options.onError(error);
          } catch {
          }
        }
        return;
      }
      oauth.clear();
      configuration = saved;
      tested = void 0;
      ui.state.textContent = saved.effect === "restart-required" ? tr("settings.saved.restartRequired") : tr("settings.saved.newSessionsOnly");
      try {
        await options.onSaved(saved);
      } catch (error) {
        setError(error);
        return;
      }
      if (current2(token)) {
        closeAccountDialog();
        renderAccounts();
      }
    } catch (error) {
      if (current2(token, inputRevision)) setError(error);
    } finally {
      ui.apiKey.value = "";
      savePending = false;
      if (current2(token)) updateButtons();
    }
  };
  const editAccount = (id) => {
    if (savePending || testPending) return;
    modelDrafts.clear();
    editingId = id ?? `acct-${crypto.randomUUID()}`;
    suggestedAccountLabel = void 0;
    removingId = void 0;
    if (accountName) accountName.value = selectedAccount()?.label ?? "";
    renderProviders();
    resetTest();
    renderAccounts();
    ui.state.textContent = id ? tr("settings.account.editingHint") : tr("settings.account.addingHint");
    if (accountDialogTitle)
      accountDialogTitle.textContent = id ? tr("settings.account.detailsTitle") : tr("settings.account.addTitle");
    if (accountDialogContext)
      accountDialogContext.textContent = id ? tr("settings.account.editContext") : tr("settings.account.addContext");
    openAccountDialog();
  };
  const openAccountDialog = () => {
    if (!accountDialog) return;
    try {
      accountDialog.showModal();
    } catch {
      accountDialog.setAttribute("open", "");
    }
    accountName?.focus();
  };
  const closeAccountDialog = () => {
    providerPicker.close();
    if (oauth.operation() || testPending && isOAuth()) {
      oauth.clear();
      testPending = false;
      resetTest();
      updateButtons();
    }
    if (!accountDialog?.open) return;
    try {
      accountDialog.close();
    } catch {
      accountDialog.removeAttribute("open");
    }
  };
  const accountAction = async (row, action) => {
    if (!connected2 || savePending || testPending || !configuration) return;
    if (action === "remove" && removingId !== row.accountId) {
      removingId = row.accountId;
      renderAccounts();
      return;
    }
    const token = lifecycle;
    savePending = true;
    ui.apiKey.value = "";
    updateButtons();
    try {
      const saved = await options.client.config.account({
        accountId: row.accountId,
        action,
        expectedRevision: configuration.revision
      });
      await options.onSaved(saved);
      if (!current2(token)) return;
      configuration = saved;
      removingId = void 0;
      if (!selectedAccount()) editingId = saved.defaultAccountId ?? saved.accounts?.[0]?.accountId;
      if (!editingId) editingId = `acct-${crypto.randomUUID()}`;
      if (accountName) accountName.value = selectedAccount()?.label ?? "";
      renderProviders();
      resetTest();
      renderAccounts();
      ui.state.textContent = saved.effect === "restart-required" ? tr("settings.saved.restartNeeded") : tr("settings.saved.newSessions");
    } catch (error) {
      if (current2(token)) setError(error);
    } finally {
      savePending = false;
      if (current2(token)) updateButtons();
    }
  };
  const renderAccounts = () => {
    const currentAccountList = accountList();
    if (renderedAccountList && renderedAccountList !== currentAccountList) {
      unmountRegion(renderedAccountList);
      renderedAccountList = void 0;
    }
    if (!currentAccountList) return;
    renderedAccountList = currentAccountList;
    renderRegion(
      currentAccountList,
      createElement24(SettingsAccounts, {
        accounts: configuration?.accounts ?? [],
        defaultAccountId: configuration?.defaultAccountId,
        disabled: !connected2 || loadPhase === "loading" || testPending || savePending,
        editingId,
        removingId,
        t: tr,
        onEdit: editAccount,
        onAction: (row, action) => void accountAction(row, action),
        onCancelRemove: () => {
          removingId = void 0;
          renderAccounts();
        }
      })
    );
  };
  optionalElement("account-dialog-close", "button")?.addEventListener("click", () => {
    closeAccountDialog();
    renderAccounts();
  });
  accountDialog?.addEventListener("click", (event) => {
    if (event.target === accountDialog) {
      closeAccountDialog();
      renderAccounts();
    }
  });
  accountDialog?.addEventListener("cancel", () => {
    oauth.clear();
    testPending = false;
    resetTest();
    updateButtons();
  });
  ui.provider.addEventListener("change", () => {
    oauth.clear();
    const selected = providers.find((provider) => provider.id === providerId());
    if (accountName && suggestedAccountLabel && accountName.value === suggestedAccountLabel) {
      accountName.value = selected?.label ?? "";
      suggestedAccountLabel = accountName.value;
    }
    ui.baseUrl.value = selected?.baseUrl ?? "";
    ui.apiKey.value = "";
    const methods = selected?.authMethods ?? [selected?.authType ?? "api-key"];
    setSettingsSelectOptions(
      ui.authMethod,
      methods.map(
        (method) => option(method === "oauth" ? tr("settings.provider.subscriptionLogin") : "API Key", method)
      )
    );
    ui.authMethod.value = ui.provider.value.endsWith(":oauth") ? "oauth" : methods[0] ?? "api-key";
    ui.authMethodField.hidden = methods.length < 2;
    renderKeyHint();
    resetTest();
    updateButtons();
  });
  ui.authMethod.addEventListener("change", () => {
    oauth.clear();
    const selected = providers.find((provider) => provider.id === providerId());
    if (selected) ui.provider.value = providerValue(selected, ui.authMethod.value);
    if (selected && isOAuth()) ui.baseUrl.value = selected.baseUrl;
    ui.apiKey.value = "";
    renderKeyHint();
    resetTest();
    updateButtons();
  });
  ui.baseUrl.addEventListener("input", () => resetTest());
  ui.apiKey.addEventListener("input", () => resetTest());
  for (const control of [ui.thinking, ui.contextWindow])
    control?.addEventListener("change", () => {
      try {
        modelDrafts.set(ui.models.value, readModelSettings());
        ui.error.textContent = "";
      } catch (error) {
        setError(error);
      }
    });
  ui.models.addEventListener("change", () => {
    renderModelSettings();
    if (isOAuth() && !oauth.operation() && tested) tested = { ...tested, verified: false };
    updateButtons();
  });
  ui.test.addEventListener("click", () => void test());
  ui.form.addEventListener("submit", (event) => {
    event.preventDefault();
    void save();
  });
  ui.close.addEventListener("click", () => close());
  ui.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  ui.dialog.addEventListener("click", (event) => {
    const target = event.target;
    if (target?.closest?.("#config-add-account")) {
      editAccount();
      return;
    }
    if (event.target === ui.dialog) close();
  });
  ui.retry?.addEventListener("click", () => {
    if (!ui.dialog.open || opening || !connected2) return;
    const token = ++lifecycle;
    const pending = load(token).finally(() => {
      if (opening === pending) opening = void 0;
    });
    opening = pending;
  });
  updateButtons();
  const open3 = () => {
    if (opening) return opening;
    if (!ui.dialog.open) {
      const active = document.activeElement;
      focusReturn = focusable(active) ? active : null;
    }
    const token = ++lifecycle;
    tested = void 0;
    renderModels();
    show2();
    setLoadPhase("loading");
    const work = connected2 ? load(token) : Promise.resolve().then(() => {
      if (current2(token)) {
        setError(new Error(tr("settings.state.offline")));
        setLoadPhase("error");
      }
    });
    const pending = work.finally(() => {
      if (opening === pending) opening = void 0;
    });
    opening = pending;
    return pending;
  };
  const setConnected = (value) => {
    if (connected2 === value) {
      updateButtons();
      return;
    }
    connected2 = value;
    if (!value) {
      oauth.clear();
      testPending = false;
    }
    lifecycle += 1;
    resetTest(false);
    if (!connected2) {
      opening = void 0;
      ui.apiKey.value = "";
      ui.state.textContent = tr("settings.state.disconnected");
      setLoadPhase("error");
    }
    renderKeyHint();
    updateButtons();
    if (connected2 && ui.dialog.open && !opening) void open3();
  };
  return { open: open3, close, refreshLocale: renderAccounts, setConnected };
}

// src/view.ts
var DURABLE_APPROVAL_KEYS = {
  allow_once: "timeline.decision.allowedOnce",
  allow_always: "timeline.decision.allowedSession",
  allow_permanent: "timeline.decision.allowedPermanent",
  reject_once: "timeline.decision.rejectOnce"
};
function durableApprovalActions(node, t2) {
  return node.options.map((option2) => ({
    option: option2,
    label: t2(DURABLE_APPROVAL_KEYS[option2]),
    verdict: DURABLE_APPROVAL_VERDICTS[option2]
  }));
}
var DURABLE_APPROVAL_VERDICTS = {
  allow_once: "allowed-once",
  allow_always: "allowed-session",
  allow_permanent: "allowed-permanent",
  reject_once: "rejected"
};
function recordRunEvent(previous, event) {
  const next = previous ?? { startSeq: 0, endSeq: 0 };
  if (event.type === "turn/start" && event.seq > next.startSeq) return { ...next, startSeq: event.seq };
  if (event.type === "turn/end" && event.seq > next.endSeq) {
    const data = event.data;
    return { ...next, endSeq: event.seq, reason: data.reason };
  }
  return next;
}
function receiptFromTurns(turns) {
  const last = turns.at(-1);
  if (!last) return void 0;
  return {
    startSeq: last.startSeq,
    endSeq: last.endSeq ?? 0,
    ...last.reason ? { reason: last.reason } : {}
  };
}
var TERMINAL_KEYS = {
  completed: "timeline.terminal.completed",
  aborted: "timeline.terminal.aborted",
  interrupted: "timeline.terminal.interrupted",
  error: "timeline.terminal.error",
  parked: "timeline.terminal.parked",
  blocked: "timeline.terminal.blocked",
  budget: "timeline.terminal.budget",
  max_steps: "timeline.terminal.maxSteps"
};
var PHASE_KEYS = {
  inference: "timeline.phase.inference",
  tools: "timeline.phase.tools",
  checkpoint: "timeline.phase.checkpoint",
  compaction: "timeline.phase.compaction",
  deferred: "timeline.phase.deferred",
  cancel_requested: "timeline.phase.cancelRequested",
  failure_drain: "timeline.phase.failureDrain"
};
function webView(timeline, receipt, t2 = (key) => key) {
  const approval = timeline.nodes.find(
    (node) => node.kind === "approval" && node.state === "pending" && typeof node.ticket === "string"
  );
  const phase = timeline.opState?.phase;
  const phaseKey = phase === void 0 ? void 0 : PHASE_KEYS[phase];
  return {
    busy: timeline.opState !== null,
    ...approval ? { approval } : {},
    // WC9：slot 节点不再被丢弃；时间线为它保留稳定容器，认领未命中时显示占位。
    nodes: timeline.nodes,
    status: approval ? t2("timeline.status.awaitingApproval") : phase ? phaseKey ? t2("timeline.status.runningPhase", { phase: t2(phaseKey) }) : t2("timeline.status.running") : receipt?.reason && receipt.endSeq >= receipt.startSeq ? t2(TERMINAL_KEYS[receipt.reason]) : t2("timeline.status.ready")
  };
}
function nodeText(node) {
  if (node.kind === "user")
    return node.content.filter(
      (block) => block.type === "text"
    ).map((block) => block.text).join("\n");
  if (node.kind === "assistant") return [node.thinking, node.text].filter(Boolean).join("\n");
  if (node.kind === "tool")
    return [node.summary, node.argsPreview, node.resultPreview].filter(Boolean).join("\n\n");
  if (node.kind === "approval") return node.summary;
  if (node.kind === "cost") return node.credits === void 0 ? node.source : `${node.credits} credits`;
  if (node.kind === "artifact") return node.name;
  if (node.kind === "compaction") return node.summary ?? `Compacted ${node.range.join("–")}`;
  return "";
}

// src/workspace-picker.ts
async function workspacePickerAvailable(fetcher = fetch) {
  try {
    const response = await fetcher("/api/workspace-picker", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body.available === true;
  } catch {
    return false;
  }
}
async function requestWorkspacePicker(fetcher = fetch) {
  const response = await fetcher("/api/workspace-picker", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin"
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(tr("settings.workspacePicker.ambiguous"));
  }
  if (body.status === "cancelled") return { status: "cancelled" };
  if (body.status === "unavailable") return { status: "unavailable" };
  if (response.ok && body.status === "selected" && typeof body.path === "string" && body.path.length > 0 && body.path.length <= 4096 && !body.path.includes("\0"))
    return { status: "selected", path: body.path };
  throw new Error(tr("settings.workspacePicker.ambiguous"));
}

// src/app.ts
installBrowserLogCapture();
function element2(id, tag) {
  const found = document.getElementById(id);
  if (!found || found.tagName.toLowerCase() !== tag) throw new Error(`missing ${tag}#${id}`);
  return found;
}
var button = (id) => element2(id, "button");
var composerDraftKey = "agnes-web-composer-draft";
var savedComposerDraft = sessionStorage.getItem(composerDraftKey);
var notice = element2("notice", "p");
var FIRST_RUN_NOTICE_KIND = "first-run-configure";
var conversation = element2("conversation-shell", "div");
var newSessionDialog = element2("new-session", "dialog");
var newSessionForm = element2("new-session-form", "form");
var newSessionCwd = element2("new-session-cwd", "input");
var newSessionCancel = button("new-session-cancel");
var newSessionCreate = button("new-session-create");
var workspacePick = button("workspace-pick");
var workspacePickerState = element2("workspace-picker-state", "p");
var workspaceManual = element2("workspace-manual", "details");
var wsUrl = element2("agnes-config", "meta").dataset.ws;
var client = createClient({
  transport: { kind: "ws", url: wsUrl ?? "", protocols: ["agnes-v1"] },
  auth: { kind: "local" },
  journal: memoryJournal()
});
var intentionalClose = false;
var reconnectNotice = document.createElement("p");
reconnectNotice.id = "reconnect-notice";
reconnectNotice.setAttribute("role", "status");
reconnectNotice.hidden = true;
notice.after(reconnectNotice);
var reconnect = createReconnectController({
  probe: bootstrapProbe((input, init) => fetch(input, init), wsUrl ?? ""),
  reload: () => location.reload(),
  onPhase: renderReconnect
});
var notificationHost = document.createElement("div");
notificationHost.dataset.agnesNotifications = "true";
document.body.append(notificationHost);
var notificationRoot = createAntdRoot(notificationHost);
var notifier;
flushSync10(
  () => notificationRoot.render(
    createElement25(NotificationHost, {
      onReady(ready) {
        notifier = ready;
      }
    })
  )
);
function noticeHoldsPersistentContent() {
  return sessionRecovery !== void 0 || notice.dataset.kind === FIRST_RUN_NOTICE_KIND;
}
function notify(input) {
  if (!notifier) {
    if (noticeHoldsPersistentContent()) return;
    notice.textContent = input.text;
    notice.dataset.kind = input.kind ?? "";
    return;
  }
  notifier.notify(input);
}
function renderReconnect(phase) {
  reconnectNotice.hidden = phase === "idle";
  if (phase === "idle") {
    reconnectNotice.replaceChildren();
    return;
  }
  if (phase !== "stalled") {
    setConnection("reconnecting");
    reconnectNotice.textContent = phase === "waiting" ? t("app.reconnect.waiting") : t("app.reconnect.reloading");
    return;
  }
  setConnection("closed");
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = t("app.reconnect.retry");
  retry.addEventListener("click", () => reconnect.retry());
  reconnectNotice.replaceChildren(t("app.reconnect.stalled"), retry);
}
var moduleExtIds = /* @__PURE__ */ new Map();
var rosterSource = {
  async list() {
    if (!profileName) return { revision: "", modules: [], statuses: [] };
    const roster = await client.clientModules.list(profileName);
    const modules = roster.rows.flatMap((row) => {
      if (!row.enabled || row.phase !== "ready" || row.packageId === void 0 || row.revision === void 0 || row.entryUrl === void 0 || row.styleUrls === void 0 || row.slots === void 0 || row.extIds === void 0)
        return [];
      return [
        {
          rowId: row.rowId,
          packageId: row.packageId,
          revision: row.revision,
          entryUrl: row.entryUrl,
          styleUrls: row.styleUrls,
          slots: row.slots,
          ...row.slotCatalogVersion === void 0 ? {} : { slotCatalogVersion: row.slotCatalogVersion },
          ...row.contentDigest === void 0 ? {} : { contentDigest: row.contentDigest },
          extIds: row.extIds,
          services: row.services ?? [],
          ...row.publicConfig ? { publicConfig: row.publicConfig } : {}
        }
      ];
    });
    moduleExtIds.clear();
    for (const mod of modules) moduleExtIds.set(mod.rowId ?? mod.packageId, mod.extIds);
    return {
      revision: roster.revision,
      modules,
      statuses: roster.statuses,
      ...roster.rowAliases === void 0 ? {} : { rowAliases: roster.rowAliases }
    };
  }
};
var claimSlotCard = (entry, extId) => entry.owner !== void 0 && (moduleExtIds.get(entry.owner)?.includes(extId) ?? false);
var computerUseStatus = createComputerUsePaneController(client);
addEventListener("pagehide", (event) => {
  if (!event.persisted) computerUseStatus.dispose();
});
var clientModules = await startClientModules({
  agnes: client,
  claim: claimSlotCard,
  clientServiceCaller: async (module, sessionId, service, input) => {
    const response = await fetch("/api/client-modules/service", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ rowId: module.rowId ?? module.packageId, sessionId, service, input })
    });
    if (!response.ok) throw new Error(t("app.plugin.serviceUnavailable"));
    const body = await response.json().catch(() => void 0);
    if (!body || typeof body !== "object" || !("output" in body))
      throw new Error(t("app.plugin.serviceInvalid"));
    return body.output;
  },
  clientEffectCaller: async (module, sessionId, service, commandId, input) => {
    const response = await fetch("/api/client-modules/effect", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        rowId: module.rowId ?? module.packageId,
        sessionId,
        service,
        commandId,
        input
      })
    });
    if (!response.ok) throw new Error(t("app.plugin.effectUnavailable"));
    const body = await response.json().catch(() => void 0);
    if (!body || typeof body !== "object" || !("output" in body))
      throw new Error(t("app.plugin.effectInvalid"));
    return body.output;
  },
  authorizeCommand: ({ owner, command: command2 }) => window.confirm(
    t("app.plugin.authorize", {
      owner,
      command: command2.title ?? command2.id,
      service: command2.effectService ? t("app.plugin.authorizeService", { service: command2.effectService }) : ""
    })
  ),
  panelContainer: document.getElementById("main-content") ?? void 0,
  sidebarContainer: document.querySelector("aside.sidebar") ?? void 0,
  sidebar: {
    actions: {
      newSession: (workspace) => run(() => beginNewDraft(workspace === void 0, workspace)),
      addWorkspace: () => run(async () => {
        if (!draftingNew) await beginNewDraft();
        openNewSessionDialog();
      }),
      openSettings: () => {
        settingsRegion.open("model");
        run(() => settings.open());
      },
      openSession: (id) => run(async () => {
        if (sessionPending) return;
        await open2(id);
        clientModules.sidebar?.close();
      }),
      sessionAction: (action, id, title, trigger) => {
        void sessionActions.act(action, id, title, trigger);
      },
      loadMore: (cursor) => run(async () => {
        await list(cursor);
      })
    }
  },
  transcript: { nodeHost: "react", onFork: forkTurn },
  conversationContainer: conversation,
  topbarContainer: document.querySelector("header.topbar") ?? void 0,
  approvalContainer: document.getElementById("approval") ?? void 0,
  composerContainer: document.getElementById("composer-mount") ?? void 0,
  composer: {
    initialDraft: savedComposerDraft ?? "",
    onAttachmentsChange: renderControls,
    onCancel: handleComposerCancel,
    onDraftChange: handleComposerDraftChange,
    onError: showError,
    onModelSelect: selectModel,
    onModelSettingsChange: selectModelSettings,
    onPermissionSelect: selectPermission,
    onSubmit: submitComposer,
    onSendNow: (itemId) => handleQueuedAction(itemId, "sendNow"),
    onRemoveQueued: (itemId) => handleQueuedAction(itemId, "removeQueued"),
    onWorkspace: handleComposerWorkspace
  },
  traceContainer: document.getElementById("trace-panel") ?? void 0,
  trace: {
    toggle: button("view-trace"),
    chatToggle: button("view-chat"),
    conversation,
    readToolDetail: async (sessionId, callSeq, resultSeq, signal) => {
      const session = current;
      if (!session) throw new Error(t("app.trace.noSession"));
      if (session.id !== sessionId) throw new Error(t("app.trace.sessionSwitched"));
      return session.readToolDetail(callSeq, resultSeq, signal ? { signal } : void 0);
    }
  },
  rightbarContainer: document.getElementById("rightbar-panel") ?? void 0,
  settingsPaneContainer: document.getElementById("config") ?? void 0,
  settings: {
    computerUse: computerUseStatus.render(),
    onChange: ({ pane, tab }) => {
      if (pane === "model") void settings.open();
      else if (pane === "plugin") void openAdminPane("plugin");
      else if (pane === "resources") void openAdminPane("resources", tab ?? "skills");
      else if (pane === "archived") void sessionActions.loadArchived();
      else if (pane === "computer-use") void computerUseStatus.refresh();
      else {
        appearance.sync();
        void skinGroup.refresh();
      }
    }
  },
  rosterSource
});
var tracePanel = clientModules.trace;
if (!tracePanel) throw new Error("missing trace region");
var settingsRegion = clientModules.settings;
if (!settingsRegion) throw new Error("missing settings region");
var topbarRuntime = clientModules.topbar;
if (!topbarRuntime) throw new Error("missing topbar region");
var approvalRuntime = clientModules.approval;
if (!approvalRuntime) throw new Error("missing approval region");
var composerRuntime = clientModules.composer;
if (!composerRuntime) throw new Error("missing composer region");
var conversationRuntime = clientModules.conversation;
if (!conversationRuntime) throw new Error("missing conversation region");
var renderer = clientModules.transcript;
if (!renderer) throw new Error("missing transcript region");
bindSlotCardContext({ registry: clientModules.registry, claim: claimSlotCard, locale: clientModules.locale });
var t = (key, vars) => clientModules.locale.t(key, vars);
setLocaleTranslator(t);
clientModules.locale.subscribe(() => renderControls());
function scheduleClientRosterRead(initial = false) {
  void (initial ? clientModules.reconciler.reconcileNow() : clientModules.reconciler.invalidate()).catch(
    (error) => console.warn("[client-modules] 名册重读失败", error)
  );
}
scheduleClientRosterRead(true);
var stopPluginHotReload = startPluginHotReload({
  reconciler: clientModules.reconciler,
  onError: (error) => console.warn("[client-modules] SSE 热替换失败", error)
});
addEventListener("pagehide", (event) => {
  if (!event.persisted) stopPluginHotReload();
});
var connected = false;
var configured = false;
var current;
var projection;
var selection = 0;
var listGeneration = 0;
var live;
var windowAtStart = true;
var approvalSearch = "idle";
var approvalSearchTicket;
var streamFrame;
var stopEvents;
var offPermission;
var sending = false;
var awaitingPromptStart = false;
var stopping = false;
var queueAction;
var sessionPending = false;
var newSessionCreating = false;
var workspacePickerReady;
var workspacePickerBusy = false;
var stopAfterSeq = 0;
var approvalBusy = false;
var runtimeModels = [];
var accountLabels = /* @__PURE__ */ new Map();
var accountProvider = null;
var knownSessionModel;
var initialModelPending;
var modelChangePending = false;
var modelSelectionSeq = 0;
var draftModelSettingsEdited = false;
var permissionMode = "workspace";
var initialPermissionPending;
var permissionChangePending = false;
var permissionRefreshPending = false;
var permissionConnectionEpoch = 0;
var sessionYoloEnabled;
var permissionSelectionSeq = 0;
var submissionGeneration = 0;
var profileName = "";
var receipts = /* @__PURE__ */ new Map();
var sessionLabels = /* @__PURE__ */ new Map();
var sessionTitles = /* @__PURE__ */ new Map();
var titleRefresh = createTitleRefresh(async (id) => {
  const version = listGeneration;
  const page = await client.session.list({ q: { prefix: id }, limit: 100 });
  if (version !== listGeneration) return false;
  const row = page.items.find((item) => item.sessionId === id);
  if (!row?.title) return false;
  sessionTitles.set(id, row.title);
  const index = sessionRows.findIndex((item) => item.sessionId === id);
  if (index >= 0) sessionRows[index] = row;
  updateTitle(id, row.title);
  return true;
});
function updateTitle(id, title) {
  sessionLabels.set(id, title);
  if (current?.id === id) topbarRuntime.setTaskTitle(title);
  updateSidebar();
}
var sessionRows = [];
var workspaceRows = [];
var sessionNext;
var selectedWorkspace;
var draftingNew = false;
var pendingSessionKey;
var liveApproval;
function updateSidebar() {
  clientModules.sidebar?.update({
    sessions: sessionRows,
    workspaces: workspaceRows,
    labels: sessionLabels,
    locale: clientModules.locale.getSnapshot(),
    ...current ? { currentId: current.id } : {},
    ...sessionNext ? { next: sessionNext } : {},
    sessionPending,
    newDisabled: !connected || sending || sessionPending || newSessionCreating
  });
}
var SESSION_WATCH_STOP_TIMEOUT_MS = 3e3;
async function stopWithTimeout(stop) {
  if (!stop) return true;
  let timer;
  try {
    await Promise.race([
      stop(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(t("app.watch.stopTimeout"))), SESSION_WATCH_STOP_TIMEOUT_MS);
      })
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
var settings = createSettingsController({ client, onSaved: savedConfiguration, onError: showError });
clientModules.locale.subscribe(() => settings.refreshLocale());
var sessionActions = createSessionActions({
  client,
  changed: () => list(),
  fork: forkSidebar,
  error: (error) => {
    if (document.body.classList.contains("sidebar-open")) clientModules.sidebar?.dismiss();
    showError(error);
  },
  translate: t
});
var sessionRecovery;
function errorMessage(error) {
  const attachment = attachmentErrorNotice(error);
  if (attachment) return t(attachment.key, attachment.vars);
  const message2 = error instanceof Error ? error.message : t("app.error.fallback");
  const diagnostic = error instanceof Error && "data" in error && error.data && typeof error.data === "object" ? error.data : void 0;
  return errorNotice(
    message2,
    diagnostic?.diagnosticId,
    diagnostic?.diagnosticUnavailable,
    diagnostic?.code === "TURN_ERROR" ? diagnostic.error?.code : void 0,
    diagnostic?.reason,
    t
  );
}
function showError(error) {
  const message2 = errorMessage(error);
  if (sessionRecovery) {
    renderSessionRecovery(message2);
    notice.dataset.kind = "error";
  } else notify({ text: message2, kind: "error" });
  if (newSessionDialog.open) element2("new-session-error", "p").textContent = message2;
}
function run(op) {
  element2("new-session-error", "p").textContent = "";
  if (sessionRecovery) renderSessionRecovery();
  else if (!noticeHoldsPersistentContent()) {
    notice.textContent = "";
    notice.dataset.kind = "";
  }
  void op().catch(showError);
}
function showSessionRecovery(error, id) {
  const data = error && typeof error === "object" && "data" in error ? error.data : void 0;
  sessionRecovery = {
    id,
    message: data && typeof data === "object" && "code" in data && data.code === "SESSION_PROFILE_MISSING" ? t("app.recovery.profileMissing") : data && typeof data === "object" && "reason" in data && data.reason === "legacy-ledger-format" ? errorMessage(error) : t("app.recovery.openFailed", { detail: errorMessage(error) })
  };
  renderSessionRecovery();
}
function recoveryDisabled() {
  return !connected || sending || sessionPending || newSessionCreating;
}
function renderSessionRecovery(message2 = "") {
  if (!sessionRecovery) return;
  if (!notice.querySelector("[data-recovery-message]")) {
    notice.textContent = "";
    const description2 = document.createElement("span");
    description2.dataset.recoveryMessage = "";
    const retry = document.createElement("button");
    retry.dataset.recoveryAction = "retry";
    retry.type = "button";
    retry.textContent = t("app.recovery.retry");
    retry.addEventListener("click", () => {
      if (recoveryDisabled() || !sessionRecovery) return;
      const id = sessionRecovery.id;
      run(() => open2(id));
    });
    const create = document.createElement("button");
    create.dataset.recoveryAction = "create";
    create.type = "button";
    create.textContent = t("app.recovery.create");
    create.addEventListener("click", () => {
      if (recoveryDisabled()) return;
      run(() => beginNewDraft());
    });
    const secondary2 = document.createElement("span");
    secondary2.dataset.recoveryError = "";
    notice.append(description2, retry, document.createTextNode(" "), create, secondary2);
  }
  notice.dataset.kind = "session-recovery";
  const description = notice.querySelector("[data-recovery-message]");
  const secondary = notice.querySelector("[data-recovery-error]");
  if (description) description.textContent = t("app.recovery.hint", { message: sessionRecovery.message });
  if (secondary) secondary.textContent = message2 ? ` ${message2}` : "";
  for (const control of notice.querySelectorAll("[data-recovery-action]"))
    control.disabled = recoveryDisabled();
}
function clearSessionRecovery() {
  if (!sessionRecovery) return;
  sessionRecovery = void 0;
  notice.textContent = "";
  notice.dataset.kind = "";
}
function setConnection(value) {
  connected = value === "connected";
  if (!connected) {
    permissionConnectionEpoch++;
    if (current) {
      permissionRefreshPending = true;
      sessionYoloEnabled = void 0;
      initialPermissionPending = void 0;
    }
  }
  topbarRuntime.setConnectionState(value);
  settings.setConnected(connected);
  renderControls();
}
function renderControls() {
  document.body.classList.toggle("session-switching", sessionPending);
  const available = connected;
  const busy = projection ? webView(projection, void 0, t).busy : false;
  const images = composerRuntime.getAttachmentBlocks();
  const hasInput = composerRuntime.getDraft().trim().length > 0 || images.length > 0;
  const initialSubmissionPending = sending && pendingSessionKey !== void 0;
  const action = composerActionPresentation({ busy, loading: sessionPending, sending }, t);
  for (const control of notice.querySelectorAll("[data-recovery-action]"))
    control.disabled = recoveryDisabled();
  const canStartDraft = draftingNew && selectedWorkspace?.available === true;
  const permissionUnknown = current !== void 0 && (permissionRefreshPending || sessionYoloEnabled === void 0);
  const selectedRecord = runtimeModels.find(
    (m) => m.route === knownSessionModel?.route && m.id === knownSessionModel?.id
  );
  const imageUnsupported = images.some((block) => block.type === "image") && !userImagePolicy(selectedRecord).supported;
  const composerView = {
    imagePolicy: userImagePolicy(selectedRecord),
    cancel: {
      disabled: !connected || !busy || stopping || sessionPending || queueAction?.sessionId === current?.id && queueAction?.selection === selection && queueAction.kind === "sendNow" && queueAction.pending,
      hidden: !busy && !stopping,
      label: stopping ? t("composer.cancel.stopping") : t("composer.cancel.stop")
    },
    connected,
    configured,
    hasSession: current !== void 0 || draftingNew,
    hint: permissionUnknown ? {
      kind: "state",
      text: permissionRefreshPending ? t("composer.hint.permissionSyncing") : t("composer.hint.permissionRequired")
    } : knownSessionModel && !selectedModelAvailable() ? { kind: "state", text: t("composer.hint.modelUnavailable") } : imageUnsupported ? { kind: "state", text: t("composer.hint.imageUnsupported") } : composerHintPresentation(
      {
        connected,
        configured,
        hasSession: current !== void 0 || draftingNew,
        busy,
        stopping,
        loading: sessionPending
      },
      t
    ),
    input: {
      disabled: !available || !current && !draftingNew || stopping || sessionPending || initialSubmissionPending,
      placeholder: busy ? t("composer.placeholder.busy") : t("composer.placeholder.idle")
    },
    loading: sessionPending,
    model: {
      accessibleName: modelSelectAccessibleName(knownSessionModel, t),
      disabled: !available || !current && !draftingNew || busy || sessionPending || initialSubmissionPending || !runtimeModels.length,
      label: modelSelectLabel(knownSessionModel, t),
      options: runtimeModels,
      pending: modelChangePending,
      ...knownSessionModel ? { selected: knownSessionModel } : {}
    },
    ...knownSessionModel && selectedRecord?.contextWindow ? {
      modelSettings: {
        settings: knownSessionModel.settings ?? modelDefaults(knownSessionModel).settings ?? {},
        contextWindow: selectedRecord.contextWindow,
        thinkingLevelMap: selectedRecord.thinkingLevelMap
      }
    } : {},
    permission: {
      disabled: !available || !current && !draftingNew || busy || sessionPending || initialSubmissionPending || permissionRefreshPending,
      pending: permissionChangePending || permissionRefreshPending,
      selected: permissionUnknown ? null : permissionMode
    },
    queue: {
      items: current && projection?.sessionId === current.id ? projection.pendingInputs ?? [] : [],
      removeDisabled: !available || !current || sessionPending || stopping || queueAction?.sessionId === current?.id && queueAction.selection === selection && queueAction.pending,
      disabled: !available || !configured || !selectedModelAvailable() || !current || sessionPending || stopping || permissionChangePending || permissionUnknown || queueAction?.sessionId === current?.id && queueAction.selection === selection && queueAction.pending,
      ...queueAction?.sessionId === current?.id && queueAction?.selection === selection ? {
        ...queueAction.pending ? queueAction.kind === "sendNow" ? { sending: queueAction.itemId } : { removing: queueAction.itemId } : {},
        ...queueAction.error ? { error: queueAction.error } : {}
      } : {}
    },
    sending,
    send: {
      disabled: !available || !configured || !selectedModelAvailable() || !current && !canStartDraft || !hasInput || composerRuntime.hasPendingImages() || Boolean(imageUnsupported) || sending || stopping || sessionPending || permissionChangePending || permissionUnknown,
      label: action.label,
      mode: action.mode,
      title: action.title
    },
    stopping,
    usage: projection?.usage,
    workspace: {
      disabled: !available || sending || sessionPending,
      label: selectedWorkspace?.name ?? (current ? t("composer.workspace.current") : t("composer.workspace.select")),
      title: selectedWorkspace?.path ?? (current ? t("composer.workspace.currentTitle") : t("composer.workspace.select"))
    }
  };
  composerRuntime.render(composerView);
  updateSidebar();
  if (sessionPending) {
    topbarRuntime.setStatus(t("topbar.preparing"), "loading");
  }
  conversationRuntime.setEmptyStateVisible(shouldShowEmptyState(projection));
  renderNewSessionControls();
}
var TRACE_THROTTLE_MS = 500;
var tracePaintedAt = 0;
var traceTrailing;
var tracePending;
function paintTrace() {
  const pending = tracePending;
  tracePending = void 0;
  if (!pending || !current || pending.sessionId !== current.id) return;
  tracePaintedAt = Date.now();
  tracePanel.render(pending.view.nodes, pending.turns, pending.meta);
}
function renderTrace(view, turns, meta) {
  if (!current) return;
  tracePending = { sessionId: current.id, view, turns, meta };
  const immediate = !view.busy || Date.now() - tracePaintedAt >= TRACE_THROTTLE_MS;
  if (immediate) {
    if (traceTrailing !== void 0) clearTimeout(traceTrailing);
    traceTrailing = void 0;
    paintTrace();
    return;
  }
  if (traceTrailing === void 0)
    traceTrailing = setTimeout(() => {
      traceTrailing = void 0;
      paintTrace();
    }, TRACE_THROTTLE_MS);
}
function render2() {
  if (!projection) {
    topbarRuntime.setStatus(t("app.status.newTask"));
    tracePanel.render([], []);
    renderControls();
    return;
  }
  if (!current || projection.sessionId !== current.id) return;
  if (typeof projection.yolo === "boolean" && !permissionChangePending && !permissionRefreshPending && projection.upto >= permissionSelectionSeq) {
    sessionYoloEnabled = projection.yolo;
    if (initialPermissionPending === void 0)
      permissionMode = projection.yolo ? "full" : permissionMode === "view" ? "view" : "workspace";
  }
  if (projection.usage?.model && !modelChangePending && !initialModelPending && projection.upto >= modelSelectionSeq) {
    knownSessionModel = {
      route: projection.usage.model.route,
      id: projection.usage.model.id,
      settings: projection.usage.model.settings ?? {
        contextWindow: projection.usage.context.window,
        thinking: projection.usage.model.thinking
      }
    };
    rememberWebComposer({ model: knownSessionModel });
  }
  const receipt = current ? receipts.get(current.id) : void 0;
  const view = webView(projection, receipt, t);
  if (!view.busy && receipt?.reason && liveApproval && receipt.endSeq > liveApproval.afterSeq) {
    liveApproval.finish({ verdict: "rejected" });
    return;
  }
  const firstInput = windowAtStart ? view.nodes.find((node) => node.kind === "user") : void 0;
  const selectedId = current?.id;
  const title = sessionTitle(
    selectedId ? sessionTitles.get(selectedId) ?? sessionRows.find((row) => row.sessionId === selectedId)?.title : void 0,
    firstInput ? nodeText(firstInput) : void 0
  );
  topbarRuntime.setTaskTitle(title);
  if (firstInput && current) {
    updateTitle(current.id, title);
  }
  if (awaitingPromptStart && view.busy) {
    awaitingPromptStart = false;
    sending = false;
  }
  if (!view.busy && receipt?.reason && receipt.endSeq > stopAfterSeq) stopping = false;
  topbarRuntime.setStatus(
    stopping ? t("app.status.stoppingWait") : liveApproval ? t("app.status.awaitingApproval") : view.status,
    view.busy ? "running" : receipt?.reason ?? "idle"
  );
  const meta = transcriptMeta();
  renderer.render(view.nodes, projection.turns, meta);
  renderTrace(view, projection.turns, meta);
  if (approvalOutsideWindow(projection)) {
    const ticket = projection.opState?.parked?.ticket;
    if (ticket !== approvalSearchTicket && approvalSearch !== "searching") approvalSearch = "idle";
    approvalSearchTicket = ticket;
    searchApproval(APPROVAL_SEARCH_PAGES);
  } else approvalSearch = "idle";
  renderApproval();
  renderControls();
}
function renderApproval() {
  const durable = projection ? webView(projection, void 0, t).approval : void 0;
  const parked = !liveApproval && !durable && projection ? projection.opState?.parked : void 0;
  if (parked && approvalSearch !== "idle") {
    const stick2 = conversationRuntime.isTranscriptNearBottom();
    const searching = approvalSearch === "searching";
    approvalRuntime.render({
      key: `parked:${parked.ticket}`,
      title: searching ? t("app.approval.searching") : t("app.approval.parkedTitle"),
      summary: t("app.approval.parkedSummary", { expiresAt: parked.expiresAt }),
      impact: searching ? t("app.approval.searchingImpact") : t("app.approval.locateImpact"),
      actions: searching ? [] : [{ id: "locate", label: t("app.approval.locate"), onSelect: () => searchApproval() }],
      disabled: !connected
    });
    if (stick2) renderer.pinToBottom();
    return;
  }
  const key = liveApproval ? `live:${liveApproval.request.toolCall.toolCallId}` : durable?.ticket ?? "";
  const stick = conversationRuntime.isTranscriptNearBottom();
  if (!key) {
    approvalRuntime.render(void 0);
    if (stick) renderer.pinToBottom();
    return;
  }
  const liveTitle = liveApproval?.request.toolCall.title;
  const summary = typeof liveTitle === "string" ? liveTitle : durable?.summary ?? t("app.approval.defaultSummary");
  const risks = {
    destructive: t("app.risk.destructive"),
    always: t("app.risk.always"),
    budget: t("app.risk.budget"),
    unknown: t("app.risk.unknown")
  };
  const card = liveApproval ? liveApprovalCard(liveApproval.request.toolCall, t) : void 0;
  const impact = durable ? risks[durable.risk] : card?.impact ?? t("app.approval.toolImpact");
  const actions = [];
  const decide = (id, label2, action) => {
    actions.push({
      id,
      label: label2,
      onSelect: () => run(async () => {
        if (approvalBusy || stopping) return;
        approvalBusy = true;
        renderApproval();
        try {
          await action();
        } finally {
          approvalBusy = false;
          live?.refresh();
          renderApproval();
        }
      })
    });
  };
  if (liveApproval) {
    const request = liveApproval;
    const labels = {
      allow_once: t("app.approval.allowOnce"),
      reject_once: t("app.approval.rejectOnce"),
      reject_always: t("app.approval.rejectAlways"),
      // Absent when the card cannot show the whole call: that choice would also cover later calls.
      ...card?.sessionLabel === void 0 ? {} : { allow_always: card.sessionLabel }
    };
    for (const option2 of request.request.options) {
      if (option2.name === "allow_always" && labels.allow_always === void 0) continue;
      decide(
        `live:${option2.name}`,
        labels[option2.name] ?? option2.name,
        async () => request.finish({ optionId: option2.optionId })
      );
    }
  } else if (durable?.ticket) {
    const ticket = durable.ticket;
    for (const { label: label2, verdict } of durableApprovalActions(durable, t))
      decide(
        `durable:${verdict}`,
        label2,
        async () => void await client.approval.decide(ticket, verdict, { kind: "local" })
      );
  }
  approvalRuntime.render({
    key,
    title: t("app.approval.title"),
    summary,
    impact,
    ...card?.warning === void 0 ? {} : { warning: card.warning },
    ...card?.preview === void 0 ? {} : { preview: card.preview },
    actions,
    disabled: approvalBusy || stopping || !connected
  });
  if (stick) renderer.pinToBottom();
}
function transcriptMeta() {
  const session = live;
  const identity = current ? { sessionId: current.id } : {};
  if (!session?.hasEarlier()) return { hasEarlier: false, ...identity };
  return { hasEarlier: true, ...identity, loadEarlier: () => void session.loadEarlier().catch(showError) };
}
function searchApproval(limit) {
  const session = live;
  if (!session || approvalSearch === "searching" || limit !== void 0 && approvalSearch !== "idle") return;
  approvalSearch = "searching";
  renderApproval();
  void findApproval(session, () => projection, limit).then((found) => {
    if (live !== session) return;
    approvalSearch = found ? "idle" : "not-found";
    renderApproval();
  }).catch(showError);
}
async function followEvent(session, event) {
  const title = readSessionTitle(event);
  if (title?.status === "generated") {
    await list().catch(showError);
    titleRefresh.stop(session.id);
  } else if (title?.status === "failed") titleRefresh.stop(session.id);
  if (event.type === "user/message") void list().catch(showError);
  if (event.type === "turn/end" && event.data.reason === "completed" && !sessionTitles.has(session.id))
    titleRefresh.start(session.id);
  receipts.set(session.id, recordRunEvent(receipts.get(session.id), event));
}
async function list(cursor) {
  const epoch = ++listGeneration;
  const page = await client.session.list({ limit: 100, ...cursor ? { cursor } : {} });
  if (epoch !== listGeneration) return page;
  const rows = new Map((cursor ? sessionRows : []).map((row) => [row.sessionId, row]));
  for (const row of page.items) {
    if (row.title) sessionTitles.set(row.sessionId, row.title);
    rows.set(row.sessionId, {
      ...row,
      ...sessionTitles.has(row.sessionId) ? { title: sessionTitles.get(row.sessionId) } : {}
    });
  }
  if (current && !rows.has(current.id)) {
    const selected = await client.session.list({ q: { prefix: current.id }, limit: 100 });
    if (epoch !== listGeneration) return page;
    const match = selected.items.find((row) => row.sessionId === current?.id);
    if (match) {
      if (match.title) sessionTitles.set(match.sessionId, match.title);
      rows.set(match.sessionId, match);
    }
  }
  sessionRows = [...rows.values()];
  sessionNext = page.next;
  updateSidebar();
  const selectedRow = sessionRows.find((row) => row.sessionId === current?.id);
  if (selectedRow?.title || selectedRow && !projection?.nodes.some((node) => node.kind === "user"))
    topbarRuntime.setTaskTitle(selectedRow.title ?? t("app.status.newTask"));
  return page;
}
async function open2(id, options = {}) {
  const epoch = ++selection;
  if (!options.preserveSending) submissionGeneration++;
  let selectionReady = false;
  sessionPending = true;
  draftingNew = false;
  renderControls();
  const previous = current;
  current = void 0;
  clientModules.session.setSession(void 0);
  sessionYoloEnabled = options.created ? false : void 0;
  permissionRefreshPending = false;
  initialPermissionPending = options.created ? permissionMode : void 0;
  permissionSelectionSeq = 0;
  permissionChangePending = false;
  stopping = false;
  if (!options.preserveSending) {
    sending = false;
    awaitingPromptStart = false;
  }
  knownSessionModel = void 0;
  initialModelPending = options.initialModel;
  modelSelectionSeq = 0;
  selectedWorkspace = void 0;
  modelChangePending = false;
  renderControls();
  offPermission?.();
  offPermission = void 0;
  liveApproval?.finish({ verdict: "rejected" });
  liveApproval = void 0;
  try {
    const stopped = await stopWithTimeout(stopEvents);
    stopEvents = void 0;
    live = void 0;
    if (!stopped) {
      notify({ text: t("app.notice.oldSessionClosing"), kind: "warning" });
    }
    await previous?.detach();
    if (epoch !== selection) return;
    const permission = (request, context) => new Promise((resolve) => {
      const pending = {
        request,
        afterSeq: Math.max(projection?.upto ?? 0, receipts.get(id)?.endSeq ?? 0),
        finish: (answer) => {
          context.signal.removeEventListener("abort", reject);
          if (liveApproval === pending) liveApproval = void 0;
          render2();
          resolve(context.signal.aborted ? { verdict: "rejected" } : answer);
        }
      };
      const reject = () => pending.finish({ verdict: "rejected" });
      if (context.signal.aborted || epoch !== selection || permissionMode === "view") {
        resolve({ verdict: "rejected" });
        return;
      }
      liveApproval = pending;
      context.signal.addEventListener("abort", reject, { once: true });
      render2();
    });
    const binding = options.created ? bindWebSession(options.created, permission) : await loadWebSession((sessionId, options2) => client.session.load(sessionId, options2), id, permission);
    if (epoch !== selection) {
      binding.offPermission?.();
      return;
    }
    const loaded = binding.session;
    current = loaded;
    clientModules.session.setSession(loaded.id);
    if (!options.created) permissionMode = "workspace";
    const metadata = sessionRows.find((row) => row.sessionId === id);
    const workspacePath = metadata?.cwd ?? options.workspace?.path;
    if (workspacePath)
      selectedWorkspace = workspaceRows.find((entry) => entry.path === workspacePath) ?? (options.workspace?.path === workspacePath ? options.workspace : void 0);
    const url = new URL(location.href);
    url.searchParams.set("session", id);
    history.replaceState(null, "", `${url.pathname}${url.search}`);
    offPermission = binding.offPermission;
    let opened = false;
    const selected = () => current === loaded && epoch === selection;
    const liveProjection = createLiveProjection(loaded, client, {
      timeline(value, window2) {
        if (!selected()) return;
        if (connected && window2.reason !== "history" && value.upto >= permissionSelectionSeq)
          permissionRefreshPending = false;
        if (window2.reason === "opening" && value.yolo === void 0 && initialPermissionPending === void 0 && !permissionChangePending && value.upto >= permissionSelectionSeq)
          sessionYoloEnabled = void 0;
        windowAtStart = window2.startIndex === 0;
        if (window2.reason === "opening" && approvalSearch !== "searching") approvalSearch = "idle";
        if (!opened) {
          opened = true;
          renderer.reset();
          approvalSearch = "idle";
          const seeded = receiptFromTurns(value.turns);
          if (seeded) {
            receipts.set(loaded.id, seeded);
            if (seeded.reason === "completed" && !sessionTitles.has(loaded.id)) titleRefresh.start(loaded.id);
          }
        }
        projection = value;
        render2();
      },
      stream(value) {
        if (!selected()) return;
        projection = value;
        if (streamFrame !== void 0) return;
        streamFrame = requestAnimationFrame(() => {
          streamFrame = void 0;
          if (projection && selected())
            renderer.render(webView(projection, void 0, t).nodes, projection.turns, transcriptMeta());
        });
      },
      event(event) {
        if (selected()) void followEvent(loaded, event).catch(showError);
      },
      error(error) {
        if (selected()) showError(error);
      }
    });
    live = liveProjection;
    stopEvents = () => liveProjection.stop();
    await liveProjection.start();
    if (epoch !== selection) return;
    selectionReady = true;
    sessionPending = false;
    clearSessionRecovery();
    render2();
    void list().catch((error) => {
      if (epoch === selection) showError(error);
    });
  } catch (error) {
    if (epoch !== selection) return;
    if (!selectionReady) {
      const failed = current;
      current = void 0;
      clientModules.session.setSession(void 0);
      projection = void 0;
      knownSessionModel = void 0;
      modelChangePending = false;
      offPermission?.();
      offPermission = void 0;
      try {
        await stopWithTimeout(stopEvents);
      } catch {
      }
      stopEvents = void 0;
      live = void 0;
      try {
        await failed?.detach();
      } catch {
      }
      renderer.reset();
      if (options.preserveSending) {
        draftingNew = true;
        selectedWorkspace = options.workspace;
        knownSessionModel = options.initialModel;
        initialModelPending = void 0;
      }
      sessionPending = false;
      render2();
      if (!options.created && !options.preserveSending) {
        showSessionRecovery(error, id);
        return;
      }
    }
    throw error;
  }
}
async function forkSidebar(id, title) {
  const epoch = selection;
  const row = sessionRows.find((item) => item.sessionId === id);
  const source = await client.session.load(id, row?.cwd ? { cwd: row.cwd } : {});
  const timeline = await source.projectUI(void 0, { surface: "web" });
  if (timeline.opState !== null) throw new Error(t("app.fork.waitIdle"));
  const turn = timeline.turns.findLast((item) => item.forkable && item.endSeq !== void 0);
  if (turn?.endSeq === void 0) throw new Error(t("app.fork.noForkableTurn"));
  const child = await client.session.fork(id, turn.endSeq);
  let namingError;
  try {
    await client.session.rename(child.id, forkTitle(title));
  } catch (error) {
    namingError = error;
  }
  let refreshError;
  try {
    await list();
  } catch (error) {
    refreshError = error;
  }
  try {
    if (epoch === selection) await open2(child.id, { created: child });
  } catch (error) {
    refreshError = error;
  }
  if (refreshError) throw new Error(t("app.fork.refreshFailed", { id: child.id }));
  if (namingError) throw new Error(t("app.fork.renameFailed"));
}
async function forkTurn(turn) {
  const parent = current;
  if (!parent || !turn.forkable || turn.endSeq === void 0 || projection?.opState !== null)
    throw new Error(t("app.fork.notIdle"));
  const forked = await client.session.fork(parent.id, turn.endSeq);
  await open2(forked.id, { created: forked });
  notify({ text: t("app.fork.created"), kind: "info" });
  composerRuntime.focus();
}
function renderNewSessionControls() {
  newSessionCreate.disabled = !connected || sessionPending || newSessionCreating || workspacePickerBusy || !newSessionCwd.value.trim();
  setButtonLabel(
    newSessionCreate,
    newSessionCreating ? t("app.newSession.verifying") : t("app.newSession.useWorkspace")
  );
  workspacePick.disabled = !connected || sessionPending || newSessionCreating || workspacePickerBusy || !workspacePickerReady;
  workspacePick.hidden = workspacePickerReady === false;
  setButtonLabel(
    workspacePick,
    workspacePickerBusy ? t("app.newSession.opening") : t("app.newSession.pickFolder")
  );
  workspacePickerState.textContent = workspacePickerBusy ? t("app.newSession.pickSystemHint") : workspacePickerReady === void 0 ? t("app.newSession.checkingPicker") : workspacePickerReady ? t("app.newSession.pickMachine") : t("app.newSession.noPicker");
  if (workspacePickerReady === false) workspaceManual.open = true;
  newSessionCwd.disabled = workspacePickerBusy;
  newSessionCancel.disabled = newSessionCreating || workspacePickerBusy;
  for (const control of newSessionDialog.querySelectorAll("[data-new-session-cancel]"))
    control.disabled = newSessionCreating || workspacePickerBusy;
}
function openNewSessionDialog() {
  if (!connected || sessionPending || newSessionCreating) return;
  if (!newSessionDialog.open) {
    try {
      newSessionDialog.showModal();
    } catch {
      newSessionDialog.setAttribute("open", "");
    }
  }
  if (workspacePickerReady) workspacePick.focus();
  else newSessionCwd.focus();
}
function closeNewSessionDialog() {
  if (!newSessionDialog.open) return;
  try {
    newSessionDialog.close();
  } catch {
    newSessionDialog.removeAttribute("open");
  }
}
function updateWorkspaceOptions() {
  renderWorkspaceOptions(element2("workspace-option-items", "div"), workspaceRows, (workspace) => {
    selectedWorkspace = workspace;
    closeNewSessionDialog();
    renderControls();
    composerRuntime.focus();
  });
}
async function registerWorkspace(cwd) {
  if (!connected || sessionPending || newSessionCreating) return;
  if (!cwd) return;
  newSessionCreating = true;
  renderControls();
  try {
    const result2 = await client.workspace.add(cwd);
    selectedWorkspace = result2.workspace;
    workspaceRows = [result2.workspace, ...workspaceRows.filter((row) => row.path !== result2.workspace.path)];
    updateWorkspaceOptions();
    await list();
    closeNewSessionDialog();
    composerRuntime.focus();
  } catch (error) {
    const failure = new Error(workspaceErrorNotice(error, t), { cause: error });
    element2("new-session-error", "p").textContent = failure.message;
    throw failure;
  } finally {
    newSessionCreating = false;
    renderControls();
  }
}
async function chooseWorkspace() {
  await registerWorkspace(newSessionCwd.value.trim());
}
async function pickWorkspace() {
  if (!workspacePickerReady || workspacePickerBusy || newSessionCreating) return;
  workspacePickerBusy = true;
  renderNewSessionControls();
  try {
    const result2 = await requestWorkspacePicker().catch(() => void 0);
    if (!result2) {
      workspacePickerReady = false;
      workspaceManual.open = true;
      element2("new-session-error", "p").textContent = t("app.newSession.pickerFailed");
      return;
    }
    if (result2.status === "cancelled") return;
    if (result2.status === "unavailable") {
      workspacePickerReady = false;
      workspaceManual.open = true;
      return;
    }
    newSessionCwd.value = result2.path;
    await registerWorkspace(result2.path);
  } finally {
    workspacePickerBusy = false;
    renderNewSessionControls();
  }
}
async function beginNewDraft(showWorkspacePicker = true, workspace) {
  if (sessionPending || sending) return;
  if (workspace) selectedWorkspace = workspace;
  clearSessionRecovery();
  const epoch = ++selection;
  const previous = current;
  if (previous && knownSessionModel) rememberWebComposer({ model: knownSessionModel });
  const inherited = selectionFromMemory(runtimeModels, accountProvider);
  const stop = stopEvents;
  current = void 0;
  clientModules.session.setSession(void 0);
  projection = void 0;
  draftingNew = true;
  draftModelSettingsEdited = false;
  pendingSessionKey = crypto.randomUUID();
  knownSessionModel = inherited.model ? modelDefaults(inherited.model) : void 0;
  permissionMode = inherited.permission;
  permissionRefreshPending = false;
  initialPermissionPending = void 0;
  initialModelPending = void 0;
  submissionGeneration++;
  offPermission?.();
  offPermission = void 0;
  liveApproval?.finish({ verdict: "rejected" });
  liveApproval = void 0;
  stopEvents = void 0;
  live = void 0;
  renderer.reset();
  const url = new URL(location.href);
  url.searchParams.delete("session");
  history.replaceState(null, "", `${url.pathname}${url.search}`);
  topbarRuntime.setTaskTitle(t("app.newSession.defaultTitle"));
  render2();
  if (!selectedWorkspace?.available && showWorkspacePicker) openNewSessionDialog();
  else composerRuntime.focus();
  sessionPending = true;
  renderControls();
  let cleanupError;
  try {
    const stopped = await stopWithTimeout(stop);
    if (!stopped) {
      notify({ text: t("app.notice.oldSessionClosing"), kind: "warning" });
    }
  } catch (error) {
    cleanupError = error;
  }
  try {
    await previous?.detach();
  } catch (error) {
    cleanupError ??= error;
  } finally {
    if (selection === epoch) {
      sessionPending = false;
      render2();
    }
  }
  if (cleanupError) throw cleanupError;
}
async function refreshWorkspaces() {
  const page = await client.workspace.list();
  workspaceRows = page.items;
  if (selectedWorkspace) selectedWorkspace = workspaceRows.find((row) => row.path === selectedWorkspace?.path);
  updateWorkspaceOptions();
}
async function refreshWorkspacePicker() {
  workspacePickerReady = await workspacePickerAvailable();
  renderNewSessionControls();
}
var modelReadGeneration = 0;
var modelAppliedGeneration = 0;
function selectedModelAvailable() {
  const selected = knownSessionModel;
  return !selected || runtimeModels.some((model) => model.route === selected.route && model.id === selected.id);
}
async function refreshModels() {
  const generation = ++modelReadGeneration;
  const apis = await client.apis();
  const models = (apis.profile.models ?? []).map((model) => ({
    ...model,
    ...accountLabels.has(model.route) ? { label: accountLabels.get(model.route) } : {}
  }));
  if (generation > modelAppliedGeneration) {
    modelAppliedGeneration = generation;
    runtimeModels = models;
    configured = runtimeModels.length > 0;
    if (draftingNew && !draftModelSettingsEdited && !modelChangePending && !permissionChangePending) {
      const next = selectionFromMemory(runtimeModels, accountProvider);
      knownSessionModel = next.model ? modelDefaults(next.model) : void 0;
      permissionMode = next.permission;
    }
    renderControls();
  }
  return models;
}
async function selectPermission(mode) {
  if (!connected || sessionPending || permissionChangePending || permissionRefreshPending) return false;
  if (!current && draftingNew) {
    permissionMode = mode;
    rememberWebComposer({ permission: mode });
    notify({ text: t("app.permission.draftNotice", { mode: permissionLabel(mode) }), kind: "info" });
    renderControls();
    return true;
  }
  if (!current) return false;
  const session = current;
  const epoch = selection;
  const connectionEpoch = permissionConnectionEpoch;
  const requestedYolo = yoloEnabled(mode);
  permissionChangePending = true;
  renderControls();
  try {
    const applied = await session.setYolo(requestedYolo);
    if (current !== session || selection !== epoch || sessionPending || connectionEpoch !== permissionConnectionEpoch)
      return false;
    permissionSelectionSeq = applied.effectiveFromSeq;
    initialPermissionPending = void 0;
    sessionYoloEnabled = requestedYolo;
    permissionMode = mode;
    rememberWebComposer({ permission: mode });
    notify({
      text: mode === "full" ? t("app.permission.notice.full") : t("app.permission.notice.mode", { mode: permissionLabel(mode) }),
      kind: "info"
    });
    return true;
  } catch (error) {
    if (current === session && selection === epoch && !sessionPending) showError(error);
    return false;
  } finally {
    if (current === session && selection === epoch && !sessionPending) {
      permissionChangePending = false;
      render2();
    }
  }
}
function modelDefaults(option2) {
  const record2 = runtimeModels.find((m) => m.route === option2.route && m.id === option2.id);
  return {
    route: option2.route,
    id: option2.id,
    settings: {
      ...record2?.defaultSettings,
      ...record2?.contextWindow ? { contextWindow: record2.defaultSettings?.contextWindow ?? record2.contextWindow } : {}
    }
  };
}
async function selectModelSettings(settings2) {
  if (!knownSessionModel) return false;
  return selectModel(knownSessionModel, settings2);
}
async function selectModel(option2, settings2) {
  const sameModel = knownSessionModel?.route === option2.route && knownSessionModel.id === option2.id;
  const window2 = settings2?.contextWindow ?? runtimeModels.find((m) => m.route === option2.route && m.id === option2.id)?.contextWindow;
  const selected = settings2 === void 0 ? sameModel && knownSessionModel ? knownSessionModel : modelDefaults(option2) : {
    route: option2.route,
    id: option2.id,
    settings: { ...settings2, ...window2 === void 0 ? {} : { contextWindow: window2 } }
  };
  const session = current;
  if (sessionPending || modelChangePending) return false;
  if (!session && draftingNew) {
    if (settings2 !== void 0) draftModelSettingsEdited = true;
    else if (!sameModel) draftModelSettingsEdited = false;
    knownSessionModel = selected;
    rememberWebComposer({ model: knownSessionModel });
    notify({ text: t("app.notice.newSessionModel"), kind: "info" });
    renderControls();
    return true;
  }
  if (!session) return false;
  const epoch = selection;
  modelChangePending = true;
  renderControls();
  try {
    const applied = await session.setModel({
      slot: "primary",
      route: option2.route,
      model: option2.id,
      thinking: selected.settings?.thinking ?? null,
      contextWindow: selected.settings?.contextWindow ?? null
    });
    if (current !== session || selection !== epoch || sessionPending) return false;
    modelSelectionSeq = applied.effectiveFromSeq;
    knownSessionModel = selected;
    rememberWebComposer({ model: knownSessionModel });
    initialModelPending = void 0;
    notify({ text: t("app.notice.modelSaved"), kind: "info" });
    live?.refresh();
    return true;
  } catch (error) {
    if (current === session && selection === epoch && !sessionPending) showError(error);
    return false;
  } finally {
    if (current === session && selection === epoch && !sessionPending) {
      modelChangePending = false;
      renderControls();
    }
  }
}
function clearFirstRunNotice() {
  if (sessionRecovery || notice.dataset.kind !== FIRST_RUN_NOTICE_KIND) return;
  notice.textContent = "";
  notice.dataset.kind = "";
}
async function savedConfiguration(saved) {
  clearFirstRunNotice();
  accountProvider = saved.provider;
  accountLabels = new Map(
    (saved.accounts ?? []).map((row) => [row.route, `${row.label} · ${row.providerId}`])
  );
  const savedModels = await refreshModels();
  const published = savedModels.some(
    (entry) => entry.route === (saved.provider?.route ?? saved.provider?.id) && entry.id === saved.provider?.model
  );
  if (!saved.configured && !savedModels.length) {
    notify({ text: t("app.model.noAccounts"), kind: "info" });
    return;
  }
  if (saved.effect === "restart-required" || !published) {
    notify({ text: t("app.model.savedNotEffective"), kind: "info" });
    return;
  }
  notify({ text: t("app.model.savedNotice"), kind: "info" });
}
newSessionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  run(chooseWorkspace);
});
newSessionCwd.addEventListener("input", renderNewSessionControls);
workspacePick.addEventListener("click", () => run(pickWorkspace));
bindDismissibleDialog({
  dialog: newSessionDialog,
  cancel: newSessionCancel,
  additional: newSessionDialog.querySelectorAll("[data-new-session-cancel]"),
  canClose: () => !newSessionCreating && !workspacePickerBusy,
  close: closeNewSessionDialog,
  restoreFocus: () => clientModules.sidebar?.focusNew()
});
addEventListener("focus", () => {
  if (connected)
    run(async () => {
      await list();
      if (!element2("archived-settings-pane", "section").hidden) await sessionActions.loadArchived();
    });
});
var appearanceStorage = safeThemeStorage(window);
var appearance = bindAppearance({
  scope: document,
  root: document.documentElement,
  storage: appearanceStorage,
  locale: {
    current: () => readLocalePreference(appearanceStorage),
    select: (value) => {
      writeLocalePreference(appearanceStorage, value);
      applyDocumentLocale(document.documentElement, value);
      clientModules.locale.setLocale(value);
      window.dispatchEvent(new CustomEvent("agnes:locale-changed", { detail: value }));
    },
    text: (key) => clientModules.locale.t(key)
  }
});
var skinRoster = [];
var skinCssOptions = { fetcher: (input) => fetch(input), origin: location.origin };
var skinSelection = 0;
function skinChanged() {
  window.dispatchEvent(new StorageEvent("storage", { key: SKIN_STORAGE_KEY }));
}
async function reconcileSkin(entries2) {
  const plan = planSkinReconcile(readSkinCache(appearanceStorage), entries2);
  if (plan.kind === "keep") return;
  const version = skinSelection;
  if (plan.kind === "clear") {
    clearSkinCache(appearanceStorage);
    skinChanged();
    return;
  }
  if (plan.entry.css !== void 0) {
    await cacheSkinEntry(appearanceStorage, plan.entry, skinCssOptions);
    skinChanged();
    return;
  }
  clearSkinCache(appearanceStorage);
  skinChanged();
  try {
    const css = await fetchSkinCss(plan.entry.cssUrl, skinCssOptions);
    if (version !== skinSelection) return;
    await cacheSkinEntry(appearanceStorage, { ...plan.entry, css }, skinCssOptions);
    skinChanged();
  } catch {
  }
}
var skinGroup = bindSkinGroup({
  scope: document,
  storage: appearanceStorage,
  list: async () => {
    if (profileName === "") return [];
    const roster = await client.skins.list(profileName);
    skinRoster = roster.skins.map((skin) => ({
      id: skin.id,
      name: skin.name,
      packageName: skin.packageName,
      revision: roster.revision,
      cssUrl: skin.cssUrl,
      ...skin.css === void 0 ? {} : { css: skin.css },
      tokens: skin.tokens ?? {}
    }));
    await reconcileSkin(skinRoster);
    return skinRoster;
  },
  select: async (id) => {
    skinSelection += 1;
    if (id === null) clearSkinCache(appearanceStorage);
    else {
      const chosen = skinRoster.find((skin) => skin.id === id);
      if (chosen === void 0) throw new Error(`skin ${id} is not in the current roster`);
      await cacheSkinEntry(appearanceStorage, chosen, skinCssOptions);
    }
    skinChanged();
  }
});
window.addEventListener("agnes:packages-changed", () => void skinGroup.refresh());
window.addEventListener("focus", () => void skinGroup.refresh());
var mountedAdminPanes = /* @__PURE__ */ new Map();
var pendingAdminPanes = createPendingCoordinator();
var resourcePaneRequest = 0;
function paneWorkspaceId() {
  const id = selectedWorkspace?.workspaceId;
  return id && /^[a-f0-9]{64}$/.test(id) ? id : void 0;
}
async function openAdminPane(pane, tab = "skills") {
  const request = pane === "resources" ? ++resourcePaneRequest : void 0;
  const isCurrentRequest = () => pane !== "resources" || request === resourcePaneRequest;
  const paneNotice = element2(pane === "plugin" ? "admin-notice" : "resource-notice", "p");
  const entry = button(pane === "plugin" ? "plugin-management" : tab === "skills" ? "skills-tab" : "mcp-tab");
  const resourceList = pane === "resources" ? element2("resource-list", "section") : void 0;
  const resourceToolbar = resourceList?.closest(".admin-pane-body")?.querySelector(".resource-toolbar");
  const controls = pane === "resources" ? [button("skills-tab"), button("mcp-tab")] : [entry];
  const selectResourceTab = () => {
    if (pane !== "resources") return;
    for (const control of controls) {
      const selected = control.id === `${tab}-tab`;
      control.setAttribute("aria-selected", String(selected));
      control.tabIndex = selected ? 0 : -1;
    }
  };
  let resourceReady = false;
  entry.disabled = pane === "plugin";
  entry.setAttribute("aria-busy", "true");
  if (resourceList) resourceList.hidden = true;
  if (resourceToolbar) resourceToolbar.hidden = true;
  selectResourceTab();
  settingsRegion.open(pane);
  try {
    if (pane === "resources" && pendingAdminPanes.has(pane)) {
      await pendingAdminPanes.run(pane, () => {
      }).catch(() => void 0);
      if (!isCurrentRequest() || settingsRegion.pane(pane)?.hidden !== false) return;
    }
    await pendingAdminPanes.run(pane, async () => {
      if (!isCurrentRequest()) return;
      paneNotice.textContent = "";
      paneNotice.dataset.kind = "";
      const mounted = mountedAdminPanes.get(pane);
      if (mounted) {
        if (pane === "resources" && mounted.sync) {
          const scope = { tab };
          const workspaceId = paneWorkspaceId();
          if (workspaceId) scope.workspaceId = workspaceId;
          await mounted.sync(scope, { refresh: true });
          resourceReady = true;
        } else await mounted.reload();
        return;
      }
      if (pane === "plugin") {
        const { mountPluginAdmin } = await import("./admin.js");
        mountedAdminPanes.set(pane, {
          ...mountPluginAdmin({
            actualSlots: clientModules.actualSlots,
            runtime: clientModules.reconciler
          })
        });
      } else {
        const { mountResourceAdmin } = await import("./resources.js");
        const workspaceId = paneWorkspaceId();
        const mountedResource = mountResourceAdmin({
          ...workspaceId ? { workspaceId } : {},
          tab,
          embedded: true
        });
        mountedAdminPanes.set(pane, mountedResource);
        await mountedResource.ready;
        resourceReady = true;
      }
    });
  } catch (error) {
    if (!isCurrentRequest()) return;
    const message2 = error instanceof Error ? error.message : t("app.admin.openFailed");
    paneNotice.textContent = errorNotice(message2, void 0, void 0, void 0, void 0, t);
    paneNotice.dataset.kind = "error";
    resourceList?.replaceChildren();
  } finally {
    if (isCurrentRequest()) {
      for (const control of controls) {
        control.disabled = false;
        control.removeAttribute("aria-busy");
      }
      selectResourceTab();
      if (resourceList) resourceList.hidden = !resourceReady;
      if (resourceToolbar) resourceToolbar.hidden = !resourceReady;
      if (settingsRegion.pane(pane)?.hidden === false) settingsRegion.open(pane);
    }
  }
}
function handleComposerWorkspace() {
  run(async () => {
    if (!draftingNew) await beginNewDraft();
    openNewSessionDialog();
  });
}
function handleComposerCancel() {
  run(async () => {
    const session = current;
    if (!session || sessionPending || stopping || !projection?.opState) return;
    const epoch = selection;
    stopping = true;
    stopAfterSeq = projection.upto;
    render2();
    try {
      await session.cancel();
    } catch (error) {
      if (current !== session || selection !== epoch || sessionPending) return;
      stopping = false;
      render2();
      throw error;
    }
  });
}
function handleQueuedAction(itemId, kind) {
  const session = current;
  if (!session || !connected || kind === "sendNow" && (!configured || !selectedModelAvailable()) || sessionPending || stopping || kind === "sendNow" && (permissionChangePending || permissionRefreshPending || sessionYoloEnabled === void 0) || queueAction?.pending && queueAction.sessionId === session.id && queueAction.selection === selection || projection?.sessionId !== session.id || !projection.pendingInputs?.some((item) => item.itemId === itemId))
    return;
  const action = { sessionId: session.id, selection, itemId, kind, pending: true };
  queueAction = action;
  renderControls();
  void session[kind](itemId).then(() => {
    if (current === session && selection === action.selection) live?.refresh();
  }).catch((error) => {
    const failure = error;
    action.error = failure?.data?.code === "QUEUED_INPUT_GONE" ? t("composer.queue.gone") : error instanceof Error ? error.message : String(error);
    if (current === session && selection === action.selection) live?.refresh();
  }).finally(() => {
    action.pending = false;
    if (current === session && selection === action.selection) renderControls();
  });
}
function handleComposerDraftChange(value) {
  sessionStorage.setItem(composerDraftKey, value);
  composerRuntime.resize();
  renderControls();
}
function imageSubmissionFrameBytes(sessionId, content, followUp) {
  const params = followUp ? {
    clientId: "c".repeat(128),
    commandId: "c".repeat(128),
    kind: "followUp",
    payload: { sessionId, content }
  } : { sessionId, prompt: toAcpPrompt(content) };
  return new TextEncoder().encode(
    JSON.stringify({
      jsonrpc: "2.0",
      id: Number.MAX_SAFE_INTEGER,
      method: followUp ? "_agnes/v1/submit" : "session/prompt",
      params
    })
  ).byteLength;
}
function submitComposer() {
  const originalDraft = composerRuntime.getDraft();
  const input = originalDraft.trim();
  const attachments = composerRuntime.getAttachmentBlocks();
  const images = attachments.filter((block) => block.type === "image");
  let session = current;
  if (!input && attachments.length === 0 || composerRuntime.hasPendingImages() || !configured || !selectedModelAvailable() || permissionChangePending || permissionRefreshPending || session && sessionYoloEnabled === void 0 || !session && (!draftingNew || !selectedWorkspace?.available) || !canSubmitComposer({ connected, hasSession: true, sending, stopping, loading: sessionPending }))
    return;
  const selectedRecord = runtimeModels.find(
    (model) => model.route === knownSessionModel?.route && model.id === knownSessionModel?.id
  );
  try {
    validateUserAttachments(attachments);
    decodeSafeImages(images, USER_MESSAGE_IMAGE_LIMITS);
  } catch (error) {
    showError(error);
    return;
  }
  const imageError = modelImageInputError(selectedRecord, [{ content: images }]);
  if (imageError) {
    showError(new Error(imageError));
    return;
  }
  const content = [...input ? [{ type: "text", text: input }] : [], ...attachments];
  const busy = projection?.opState !== null && projection?.opState !== void 0;
  if (attachments.length > 0 && imageSubmissionFrameBytes(session?.id ?? "s".repeat(512), content, busy) > MAX_FRAME_BYTES) {
    showError(new Error(t("app.error.messageTooLarge")));
    return;
  }
  if (!noticeHoldsPersistentContent()) {
    notice.textContent = "";
    notice.dataset.kind = "";
  }
  const submission = ++submissionGeneration;
  const connectionEpoch = permissionConnectionEpoch;
  let ownedSelection = selection;
  sending = true;
  awaitingPromptStart = !busy;
  composerRuntime.setDraft("");
  composerRuntime.clearImageBlocks();
  sessionStorage.removeItem(composerDraftKey);
  composerRuntime.resize();
  renderer.pinToBottom();
  renderControls();
  const work = (async () => {
    if (!session) {
      const key = pendingSessionKey ?? crypto.randomUUID();
      const draftModel = knownSessionModel;
      const workspace = selectedWorkspace;
      pendingSessionKey = key;
      const created = await client.session.new({ cwd: workspace?.path ?? "", sessionKey: key });
      try {
        await open2(created.id, {
          created,
          preserveSending: true,
          ...workspace ? { workspace } : {},
          ...draftModel ? { initialModel: draftModel } : {}
        });
      } finally {
        ownedSelection = selection;
      }
      if (current !== created) throw new Error(t("app.session.selectionChanged"));
      session = current;
    }
    if (!session) throw new Error(t("app.session.createFailed"));
    if (initialModelPending) {
      const selectedModel = initialModelPending;
      const applied = await session.setModel({
        slot: "primary",
        route: selectedModel.route,
        model: selectedModel.id,
        thinking: selectedModel.settings?.thinking ?? null,
        contextWindow: selectedModel.settings?.contextWindow ?? null
      });
      if (current !== session || selection !== ownedSelection) throw new Error(t("app.error.sessionChanged"));
      modelSelectionSeq = applied.effectiveFromSeq;
      knownSessionModel = selectedModel;
      initialModelPending = void 0;
      renderControls();
    }
    if (!connected || connectionEpoch !== permissionConnectionEpoch || permissionRefreshPending)
      throw new Error(t("app.error.connectionChanged"));
    if (initialPermissionPending !== void 0) {
      const selectedPermission = initialPermissionPending;
      const enabled = yoloEnabled(selectedPermission);
      const applied = await session.setYolo(enabled);
      if (current !== session || selection !== ownedSelection) throw new Error(t("app.error.sessionChanged"));
      if (connectionEpoch !== permissionConnectionEpoch) throw new Error(t("app.error.connectionChanged"));
      permissionSelectionSeq = applied.effectiveFromSeq;
      sessionYoloEnabled = enabled;
      permissionMode = selectedPermission;
      initialPermissionPending = void 0;
    }
    if (!connected || connectionEpoch !== permissionConnectionEpoch || permissionRefreshPending)
      throw new Error(t("app.error.connectionChanged"));
    if (current !== session || selection !== ownedSelection) throw new Error(t("app.error.sessionChanged"));
    if (sessionYoloEnabled === void 0) throw new Error(t("app.error.permissionRequired"));
    const result2 = await (busy ? session.followUp(content) : session.prompt(content, {
      titleLocale: clientModules.locale.getSnapshot() === "zh-CN" ? "zh-CN" : "en"
    }));
    const submittedId = session.id;
    if (typeof result2 === "object" && result2.reason === "completed" && !sessionTitles.has(submittedId))
      titleRefresh.start(submittedId);
    pendingSessionKey = void 0;
    if (busy && current === session && selection === ownedSelection) live?.refresh();
  })();
  void work.catch((error) => {
    if (submission === submissionGeneration && ownedSelection === selection) {
      if (connectionEpoch !== permissionConnectionEpoch) {
        initialPermissionPending = void 0;
        sessionYoloEnabled = void 0;
        render2();
      }
      if (!intentionalClose) {
        const laterDraft = composerRuntime.getDraft();
        if (originalDraft) {
          const restoredDraft = laterDraft ? `${originalDraft}
${laterDraft}` : originalDraft;
          composerRuntime.setDraft(restoredDraft);
          sessionStorage.setItem(composerDraftKey, restoredDraft);
        }
        if (!composerRuntime.getAttachmentBlocks().length && !composerRuntime.hasPendingImages())
          composerRuntime.restoreAttachmentBlocks(attachments);
        composerRuntime.resize();
      }
      showError(error);
    }
  }).finally(() => {
    if (submission === submissionGeneration && ownedSelection === selection) {
      sending = false;
      awaitingPromptStart = false;
      renderControls();
      live?.refresh();
    }
  });
}
var diagnostics = createDiagnosticsDialog({
  call: (method, params) => client.call(method, params),
  context: () => ({
    sessionId: current?.id ?? null,
    sessionTitle: sessionTitles.get(current?.id ?? "") ?? null,
    projection,
    projectionHasEarlier: live?.hasEarlier() ?? false
  })
});
var reportProblem = button("report-problem");
reportProblem.addEventListener("click", () => diagnostics.open(reportProblem));
client.on("reconnecting", () => setConnection("reconnecting"));
client.on("reconnected", () => {
  reconnect.reset();
  setConnection("connected");
  run(async () => {
    await refreshModelConfiguration();
    await list();
    scheduleClientRosterRead();
  });
});
client.on("closed", () => {
  titleRefresh.close();
  setConnection("closed");
  const message2 = intentionalClose ? t("app.connection.closedIntentional") : t("app.connection.lost");
  if (sessionRecovery) renderSessionRecovery(message2);
  else notify({ text: message2, kind: "error" });
  if (!intentionalClose) reconnect.start();
});
var forCurrent = (payload) => current !== void 0 && payload?.sessionId === current.id;
client.on("gap", (payload) => {
  if (!forCurrent(payload)) return;
  const message2 = t("app.gap.partial");
  if (sessionRecovery) renderSessionRecovery(message2);
  else notify({ text: message2 });
  void live?.resync().catch(showError);
});
client.on("generationChanged", (payload) => {
  if (!forCurrent(payload)) return;
  void live?.resync().catch(showError);
});
client.on("notice", (payload) => {
  const incoming = payload;
  if (incoming.kind !== "packages_changed" && incoming.kind !== "tree_changed") return;
  const detail = typeof incoming.detail === "object" && incoming.detail !== null ? incoming.detail : void 0;
  if (profileName && detail?.profile === profileName) scheduleClientRosterRead();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    reconnect.resume();
    void list().catch(showError);
    void refreshModelConfiguration().catch(showError);
    scheduleClientRosterRead();
  }
});
for (const [index, tab] of [button("view-chat"), button("view-trace")].entries()) {
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : event.key === "ArrowLeft" ? 0 : 1;
    const target = next === 0 ? button("view-chat") : button("view-trace");
    target.focus();
    tracePanel.setOpen(next === 1);
  });
  tab.setAttribute("aria-posinset", String(index + 1));
  tab.setAttribute("aria-setsize", "2");
}
addEventListener("popstate", () => {
  const id = new URL(location.href).searchParams.get("session");
  run(async () => {
    if (id) {
      if (current?.id !== id) await open2(id);
      return;
    }
    if (current || !draftingNew) await beginNewDraft();
  });
});
async function refreshModelConfiguration() {
  const snapshot = await client.config.get();
  accountProvider = snapshot.provider;
  accountLabels = new Map(
    (snapshot.accounts ?? []).map((row) => [row.route, `${row.label} · ${row.providerId}`])
  );
  await refreshModels();
}
var modelRefreshPending = false;
var modelRefreshTimer = setInterval(() => {
  if (!connected || document.visibilityState !== "visible" || modelRefreshPending) return;
  modelRefreshPending = true;
  void refreshModelConfiguration().catch(() => void 0).finally(() => {
    modelRefreshPending = false;
  });
}, 2e3);
window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  clearInterval(modelRefreshTimer);
  intentionalClose = true;
  reconnect.cancel();
  titleRefresh.close();
  notificationRoot.unmount();
  notifier = void 0;
  void (stopEvents?.() ?? Promise.resolve()).finally(() => client.close());
});
composerRuntime.resize();
run(async () => {
  setConnection("connecting");
  if (!wsUrl) throw new Error(t("app.ws.unavailable"));
  try {
    await client.initialize();
  } catch (error) {
    if (!intentionalClose) reconnect.start();
    throw error;
  }
  setConnection("connected");
  reconnect.reset();
  void refreshWorkspacePicker();
  const snapshot = await client.config.get();
  accountProvider = snapshot.provider;
  profileName = snapshot.profile;
  void skinGroup.refresh();
  scheduleClientRosterRead(true);
  accountLabels = new Map(
    (snapshot.accounts ?? []).map((row) => [row.route, `${row.label} · ${row.providerId}`])
  );
  await refreshModels();
  if (!configured) {
    renderControls();
    notice.textContent = t("app.firstRun.configure");
    notice.dataset.kind = FIRST_RUN_NOTICE_KIND;
    await settings.open();
  }
  try {
    await refreshWorkspaces();
  } catch (error) {
    showError(new Error(t("app.workspaceList.unreadable"), { cause: error }));
  }
  const page = await list();
  const selected = new URL(location.href).searchParams.get("session");
  if (selected) {
    const candidates = page.items.some((item) => item.sessionId === selected) ? page : await client.session.list({ q: { prefix: selected }, limit: 100 });
    if (candidates.items.some((item) => item.sessionId === selected)) await open2(selected);
    else {
      notice.textContent = t("app.session.notFound");
      notice.dataset.kind = "";
      renderControls();
    }
  } else {
    const first = page.items.find((item) => !item.archived);
    if (first) await open2(first.sessionId);
    else await beginNewDraft(configured);
  }
});
