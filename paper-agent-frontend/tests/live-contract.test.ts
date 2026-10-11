import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveApiClient } from '@/api/httpClient';
import { applyEnvelope, emptyRuntime } from '@/api/normalize';
import type { SseEnvelope } from '@/api/types';
import { snapshot } from './helpers';

/* ==========================================================================
   Live 契约回归：锁定真机联调（BFF + AGH，2026-10-11）实测到的形状翻译。
   每条断言对应一个"后端真实返回 vs 前端类型声明"的差异；mock 用例覆盖不到这些，
   因为 mock 一开始就是按前端类型写的。 fixtures 全部取自实测响应，不做美化。
   ========================================================================== */

const BASE = 'http://127.0.0.1:8787';
const TASK = 'run-20261011-124613-to8fge';

interface ResSpec {
  status?: number;
  json?: unknown;
  body?: string;
  mime?: string;
  headers?: Record<string, string>;
}

interface Call {
  url: string;
  init?: RequestInit;
}

function toResponse(spec: ResSpec): Response {
  const status = spec.status ?? 200;
  const headers = new Map(
    Object.entries(spec.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const body = spec.body ?? JSON.stringify(spec.json ?? {});
  const mime = spec.mime ?? 'application/octet-stream';
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    json: async () => spec.json,
    text: async () => body,
    // 界面只用到 blob.type / blob.text()，jsdom 的 Blob 没有 text()
    blob: async () => ({ type: mime, text: async () => body }) as unknown as Blob,
  } as unknown as Response;
}

/** 按 URL 路由的 fetch 桩；同时记录调用顺序、方法与请求头 */
function stubFetch(route: (url: string, init?: RequestInit) => ResSpec): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input);
      calls.push({ url, init });
      return toResponse(route(url, init));
    }),
  );
  return calls;
}

function headerOf(init: RequestInit | undefined, name: string): string | undefined {
  const raw = init?.headers as Record<string, string> | undefined;
  if (!raw) return undefined;
  const key = Object.keys(raw).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? raw[key] : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ---------------------------------------------------------------- 任务列表 */

describe('Live：任务列表信封', () => {
  it('GET /tasks 返回 { tasks, total } 而不是裸数组', async () => {
    const calls = stubFetch(() => ({
      json: { tasks: [snapshot({ task_id: TASK })], total: 1 },
    }));
    const client = new LiveApiClient(BASE);
    const list = await client.listTasks();

    expect(calls[0]?.url).toBe(`${BASE}/api/v1/tasks`);
    expect(list).toHaveLength(1);
    expect(list[0]?.task_id).toBe(TASK);
  });

  it('preflight() 不发请求、不编造 ok：界面据此显示"未检测"', async () => {
    const calls = stubFetch(() => ({ json: {} }));
    const client = new LiveApiClient(BASE);

    // live 没有独立预检接口（§8.1），入参被忽略、结果只随 createTask 的 preflight 回填
    expect(await client.preflight()).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});

/* ------------------------------------------------------------ 空体 POST */

describe('Live：空体 POST 的 Content-Type', () => {
  it('run-all 无请求体时必须省略 Content-Type，否则 Fastify 400 BAD_BODY', async () => {
    const calls = stubFetch(() => ({ status: 202, json: { accepted: true } }));
    await new LiveApiClient(BASE).runAll(TASK);

    const call = calls[0];
    expect(call?.url).toBe(`${BASE}/api/v1/tasks/${TASK}/run-all`);
    expect(call?.init?.method).toBe('POST');
    expect(call?.init?.body).toBeUndefined();
    expect(headerOf(call?.init, 'Content-Type')).toBeUndefined();
  });

  it('createTask 有请求体时带 application/json，并按契约给四个字段', async () => {
    const calls = stubFetch(() => ({ status: 201, json: { task_id: TASK } }));
    await new LiveApiClient(BASE).createTask({
      goal: '固态电解质界面阻抗的主要表征方法有哪些？',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv', 'crossref'],
    });

    const call = calls[0];
    expect(headerOf(call?.init, 'Content-Type')).toBe('application/json');
    expect(JSON.parse(String(call?.init?.body))).toEqual({
      goal: '固态电解质界面阻抗的主要表征方法有哪些？',
      workflow: 'research',
      lit_source: 'auto',
      sources: ['arxiv', 'crossref'],
    });
  });
});

/* ---------------------------------------------------------------- health */

describe('Live：健康探针', () => {
  it('按 /api/health 真实字段推导；无 model / issues 字段也不猜', async () => {
    const calls = stubFetch((url) =>
      url.endsWith('/api/health')
        ? {
            json: {
              status: 'ok',
              service: 'paper-agent-bff',
              version: '0.1.0',
              tasks: 3,
              runs_dir_ok: true,
              agh: { connected: true, agnes_version: '1.2.3', sessions_open: 1 },
            },
          }
        : { status: 404, json: { error: 'nope', code: 'NOT_FOUND' } },
    );

    const info = await new LiveApiClient(BASE).health();

    // 健康探针在 /api/v1 前缀之外
    expect(calls[0]?.url).toBe(`${BASE}/api/health`);
    expect(info).toMatchObject({
      status: 'ok',
      mode: 'live',
      version: '0.1.0',
      task_count: 3,
      session_ready: true,
      bff_reachable: true,
    });
    expect(info.model).toBeUndefined();
    expect(info.issues).toEqual([]);
  });

  it('AGH 未连接时给出阻塞项并转述后端原因', async () => {
    stubFetch(() => ({
      json: {
        status: 'ok',
        tasks: 0,
        runs_dir_ok: true,
        agh: { connected: false, error: 'socket ENOENT' },
      },
    }));

    const info = await new LiveApiClient(BASE).health();

    expect(info.session_ready).toBe(false);
    expect(info.issues).toHaveLength(1);
    expect(info.issues[0]).toMatchObject({ id: 'agh-disconnected', blocking: true });
    expect(info.issues[0]?.guidance).toContain('socket ENOENT');
  });
});

/* --------------------------------------------------------------- 证据视图 */

/** 实测响应节选（GET /tasks/{id}/evidence?view=audit） */
const EVIDENCE_RAW = {
  task_id: TASK,
  view: 'audit',
  run_status: 'DONE',
  counts: { evidence: 4, conclusions: 0, judgments: 1, notes: 1, records: 6 },
  evidence: [
    {
      ev_id: 'EV-0001',
      tier: 'fact',
      kind: 'literature',
      title: '酶底物法测定水中粪大肠菌群的方法验证及与其他主要方法的对比',
      producer_step: 'R1',
      doi: '10.37155/2717-5251-0509-85',
      authors: ['王恩霞', '谭海廷', '邢峰杰'],
      year: 2023,
      venue: '水利电力技术与应用',
      source: 'crossref',
      sha256: 'eb43b024226d810b93dc43eccc4c88356cf57f128d4a3a9e8df618ecf870ae0f',
      at: '2026-10-11T04:46:29Z',
      chain_hash: '57400302d6eafff3963cf365d694119f93bcb07c1e20ad423def2dcbcb6d1651',
    },
    {
      // 内联产物：没有 DOI，也没有作者与年份
      ev_id: 'EV-0015',
      tier: 'artifact',
      kind: 'draft',
      title: '综述草稿（Markdown）',
      producer_step: 'R5',
      doi: null,
      authors: [],
      year: null,
      venue: '',
      source: '',
      sha256: 'c881a5329b6a52ad4d273d4a42b22baa56fa6ad56591e320e45bf82152a0b6d8',
      at: '2026-10-11T04:46:29Z',
      chain_hash: '3fc97b87e2292f3053afc3564ce744d337ba7baf734a1c9b15128583a34b79c9',
    },
    {
      // 数据集类证据：只有 source 名，无 DOI
      ev_id: 'EV-0016',
      tier: 'artifact',
      kind: 'review',
      title: '自评审结果',
      producer_step: 'R6',
      doi: null,
      source: 'runs/audit',
      at: '2026-10-11T04:46:29Z',
    },
    {
      // 内核词表之外的 kind/tier：不能把没译文的值透传给界面
      ev_id: 'EV-0017',
      tier: 'belief',
      kind: 'web_scrape',
      title: '未知类型样本',
      producer_step: 'R2',
      doi: '',
      source: 'local',
      at: '2026-10-11T04:46:29Z',
    },
  ],
  conclusions: [],
  judgments: [
    {
      seq: 15,
      at: '2026-10-11T04:46:29Z',
      summary: '交叉印证判断',
      data: { verdict: false },
    },
  ],
  notes: [{ seq: 16, at: '2026-10-11T05:46:29Z', text: '备注：待核主题词 87 个' }],
  chain_head: 'edcc9c01bba946cd1bd688a73c71c3dbfa6ebe4adff95e51ac51f97693568ab6',
};

describe('Live：证据归一化', () => {
  it('请求 view=audit（单条 chain_hash 只在审计视图下发）', async () => {
    const calls = stubFetch(() => ({ json: EVIDENCE_RAW }));
    await new LiveApiClient(BASE).getEvidence(TASK);

    expect(calls[0]?.url).toBe(`${BASE}/api/v1/tasks/${TASK}/evidence?view=audit`);
  });

  it('doi/source/authors[]/year:number 翻译成前端的 ref/authors:string/year:string', async () => {
    stubFetch(() => ({ json: EVIDENCE_RAW }));
    const bundle = await new LiveApiClient(BASE).getEvidence(TASK);

    expect(bundle.task_id).toBe(TASK);
    const [lit, draft, withSource, odd] = bundle.evidence;

    expect(lit?.ref).toBe('10.37155/2717-5251-0509-85');
    expect(lit?.year).toBe('2023');
    expect(lit?.authors).toBe('王恩霞、谭海廷、邢峰杰');
    expect(lit?.chain_hash).toBe(
      '57400302d6eafff3963cf365d694119f93bcb07c1e20ad423def2dcbcb6d1651',
    );

    // 缺字段一律不填：空 ref 让卡片留空，而不是显示 "null" 或伪造占位
    expect(draft?.ref).toBe('');
    expect(draft?.year).toBeUndefined();
    expect(draft?.authors).toBeUndefined();
    expect(draft?.tier).toBe('artifact');
    expect(withSource?.ref).toBe('runs/audit');
    expect(withSource?.sha256).toBeUndefined();

    // 词表外的值归入已知值，界面标签不会变空白
    expect(odd?.tier).toBe('fact');
    expect(odd?.kind).toBe('note');
    expect(odd?.ref).toBe('local');
  });

  it('trace 只用响应里真实存在的记录（证据/判断/备注）按时间拼，不拿假事件填面板', async () => {
    stubFetch(() => ({ json: EVIDENCE_RAW }));
    const { trace } = await new LiveApiClient(BASE).getEvidence(TASK);

    expect(trace.map((e) => e.type)).toEqual([
      'evidence',
      'evidence',
      'evidence',
      'evidence',
      'judgment',
      'note',
    ]);
    expect(trace[0]?.label).toBe('EV-0001 酶底物法测定水中粪大肠菌群的方法验证及与其他主要方法的对比');
    expect(trace[0]?.detail).toBe('R1');
    expect(trace[4]).toMatchObject({ id: 'judge-15', type: 'judgment', seq: 15 });
    expect(trace[5]).toMatchObject({ id: 'note-16', type: 'note', seq: 16 });
    // 备注时间戳晚于其余记录，排序只能靠 at（证据条目不带 seq）
    expect(trace.at(-1)?.ts).toBe('2026-10-11T05:46:29Z');
  });
});

describe('Live：回查 citation', () => {
  it('字段在 citation 里，不在顶层；ref 优先 DOI', async () => {
    const calls = stubFetch(() => ({
      json: {
        task_id: TASK,
        view: 'view',
        found: true,
        citation: {
          ev_id: 'EV-0001',
          title: '酶底物法测定水中粪大肠菌群的方法验证及与其他主要方法的对比',
          doi: '10.37155/2717-5251-0509-85',
          authors: ['王恩霞', '谭海廷'],
          year: 2023,
          venue: '水利电力技术与应用',
          source: 'crossref',
        },
      },
    }));

    const res = await new LiveApiClient(BASE).cite(TASK, 'EV-0001');

    expect(calls[0]?.url).toBe(`${BASE}/api/v1/tasks/${TASK}/cite?ev=EV-0001`);
    expect(res.ev_id).toBe('EV-0001');
    expect(res.ref).toBe('10.37155/2717-5251-0509-85');
    expect(res.detail).toBe(
      '酶底物法测定水中粪大肠菌群的方法验证及与其他主要方法的对比 · 王恩霞、谭海廷 · 水利电力技术与应用 · 2023',
    );
  });

  it('found=false 时转述后端 reason，不显示成"查到了但为空"', async () => {
    stubFetch(() => ({
      json: {
        task_id: TASK,
        found: false,
        reason: '证据 EV-9999 不在本任务账本中',
        available: ['EV-0001'],
      },
    }));

    const res = await new LiveApiClient(BASE).cite(TASK, 'EV-9999');

    expect(res.ev_id).toBe('EV-9999');
    expect(res.ref).toBe('—');
    expect(res.detail).toContain('不在本任务账本中');
  });
});

/* ------------------------------------------------------------------- SSE */

/** jsdom 不实现 EventSource：用最小桩替代，只覆盖 subscribe() 用到的接口 */
class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readonly withCredentials: boolean;
  readyState = FakeEventSource.OPEN;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  private readonly listeners = new Map<string, ((raw: unknown) => void)[]>();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, cb: (raw: unknown) => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), cb]);
  }

  hasListener(name: string): boolean {
    return (this.listeners.get(name)?.length ?? 0) > 0;
  }

  close(): void {
    this.closed = true;
  }

  /** 模拟后端 frame：`id: <seq>` 供 lastEventId，`data:` 为 RelayEvent JSON */
  emit(name: string, data: Record<string, unknown>, seq: number): void {
    this.rawEmit(name, JSON.stringify({ ...data, seq, ts: '2026-10-11T05:00:47.187Z' }), seq);
  }

  /** 坏帧（data 不是合法 JSON）：适配器必须忽略而不是抛错 */
  rawEmitBroken(name: string, data: string, seq: number): void {
    this.rawEmit(name, data, seq);
  }

  private rawEmit(name: string, data: string, seq: number): void {
    for (const cb of this.listeners.get(name) ?? []) {
      cb({ data, lastEventId: String(seq) });
    }
  }

  static instances: FakeEventSource[] = [];
}

/** 把 subscribe() 收到的信封喂进与实时/重建共用的 reducer；latest() 读当前状态 */
function collect(client: LiveApiClient, taskId = TASK) {
  let state = emptyRuntime(snapshot({ task_id: taskId }));
  const envelopes: SseEnvelope[] = [];
  const unsubscribe = client.subscribe(taskId, {
    onEvent: (evt) => {
      envelopes.push(evt);
      state = applyEnvelope(state, evt);
    },
  });
  const source = FakeEventSource.instances.at(-1);
  if (!(source instanceof FakeEventSource)) throw new Error('EventSource 未构造');
  return { source, envelopes, unsubscribe, latest: () => state };
}

describe('Live：SSE 事件形状翻译', () => {
  it('订阅 /tasks/{id}/events 并监听 §5.1 全部事件名', () => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    const { source, unsubscribe } = collect(new LiveApiClient(BASE));

    expect(source.url).toBe(`${BASE}/api/v1/tasks/${TASK}/events`);
    expect(source.withCredentials).toBe(false);
    for (const name of ['step', 'activity', 'tool', 'degraded', 'conclusion', 'message', 'report', 'done']) {
      expect(source.hasListener(name)).toBe(true);
    }

    unsubscribe();
    expect(source.closed).toBe(true);
  });

  it('tool/call 与 tool/result 靠 toolUseId 合成一张卡；对象入参与出参转成文本', () => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    const { source, latest } = collect(new LiveApiClient(BASE));

    // AGH 原生 tool/call：step 未知（'-'）、args 是对象
    source.emit(
      'tool',
      {
        type: 'tool',
        id: 'toolu_01',
        step: '-',
        tool: 'sciret_plan',
        status: 'running',
        input: { goal: '固态电解质界面阻抗表征方法', sources: ['arxiv'] },
      },
      7,
    );
    expect(latest().tools).toHaveLength(1);
    expect(latest().tools[0]).toMatchObject({
      id: 'tool-toolu_01',
      status: 'running',
      step: '-',
      // live 帧不带 label：卡片只显示 tool 名，不能被拼成 "sciret_plansciret_plan"
      label: '',
    });
    expect(latest().tools[0]?.input).toContain('"goal": "固态电解质界面阻抗表征方法"');

    // tool/result：带真实 step 与 structured 出参，必须合并而不是新增一张
    source.emit(
      'tool',
      {
        type: 'tool',
        id: 'toolu_01',
        step: 'R1',
        tool: 'sciret_plan',
        status: 'ok',
        output: { ok: true, tool: 'plan', state: 'RUNNING', human_summary: '已完成规划' },
        sources_status: { crossref: 'ok', arxiv: 'unavailable' },
      },
      9,
    );

    const tool = latest().tools[0];
    if (!tool) throw new Error('工具卡片应已合并');
    expect(latest().tools).toHaveLength(1);
    expect(tool.status).toBe('done');
    expect(tool.step).toBe('R1');
    expect(tool.output).toContain('已完成规划');
    expect(tool.input).toContain('arxiv'); // 终态帧不带入参，沿用先到的
    expect(tool.sources_status).toEqual([
      { source: 'crossref', status: 'ok' },
      { source: 'arxiv', status: 'unavailable' },
    ]);
  });

  it('无 toolUseId 时回落到 step+tool 作幂等键；未知状态归入 warn 而不是谎报', () => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    const { source, latest } = collect(new LiveApiClient(BASE));

    source.emit('tool', { type: 'tool', step: 'R2', tool: 'x', status: 'running' }, 1);
    source.emit('tool', { type: 'tool', step: 'R2', tool: 'x', status: 'canceled' }, 2);

    expect(latest().tools).toHaveLength(1);
    expect(latest().tools[0]?.id).toBe('tool-R2-x');
    expect(latest().tools[0]?.status).toBe('warn');
  });

  it('message 帧：后端词表 assistant|user + running|done → 前端 agent|user + streaming|done', () => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    const { source, latest } = collect(new LiveApiClient(BASE));

    source.emit('message', { type: 'message', id: 'turn-1', turn_id: 'turn-1', role: 'assistant', status: 'running', delta: '固态电解' }, 3);
    source.emit('message', { type: 'message', id: 'turn-1', turn_id: 'turn-1', role: 'assistant', status: 'running', delta: '质' }, 4);
    source.emit('message', { type: 'message', id: 'turn-1', turn_id: 'turn-1', role: 'assistant', status: 'done', text: '固态电解质' }, 5);

    expect(latest().messages).toHaveLength(1);
    expect(latest().messages[0]).toMatchObject({ role: 'agent', status: 'done', text: '固态电解质' });
  });

  it('activity 的 detail 是对象（{tool, turn_id}）时转成文本，<pre> 不会再抛错', () => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    const { source, latest } = collect(new LiveApiClient(BASE));

    source.emit(
      'activity',
      { type: 'activity', step: 'R1', human_message: '追问已发送（第 1 条）', detail: { turn_id: 'turn-1', role: 'user' } },
      6,
    );

    expect(latest().activities[0]?.human_message).toBe('追问已发送（第 1 条）');
    expect(latest().activities[0]?.detail).toContain('"turn_id": "turn-1"');
  });

  it('step / done 帧按 §5.1 词表推进快照，done 收敛终态与报告就绪', () => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    const { source, latest } = collect(new LiveApiClient(BASE));

    source.emit('step', { type: 'step', step: 'R3', status: 'RUNNING' }, 11);
    expect(latest().snapshot?.steps.find((s) => s.id === 'R3')).toMatchObject({
      status: 'RUNNING',
      is_current: true,
    });
    expect(latest().snapshot?.steps.find((s) => s.id === 'R2')?.is_current).toBe(false);

    source.emit('done', { type: 'done', run_status: 'DONE', report_ready: true }, 12);
    expect(latest().snapshot?.run_status).toBe('DONE');
    expect(latest().reportStatus).toBe('ready');
    expect(latest().done?.report_ready).toBe(true);
  });

  it('重复/回退 seq 的帧被丢弃（§5.2 幂等），lastEventId 才是序号来源', () => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    const { source, envelopes, latest } = collect(new LiveApiClient(BASE));

    source.emit('report', { type: 'report', task_id: TASK, status: 'ready' }, 43);
    source.emit('report', { type: 'report', task_id: TASK, status: 'generating' }, 42);

    expect(envelopes).toHaveLength(2);
    expect(envelopes[0]?.seq).toBe(43);
    // 补发/重连时后端仍会带旧 seq 的帧，状态不得回退
    expect(latest().reportStatus).toBe('ready');
  });

  it('data 非 JSON 时忽略该帧，不影响后续事件', () => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    const { source, envelopes, latest } = collect(new LiveApiClient(BASE));

    source.emit('step', { type: 'step', step: 'R2', status: 'RUNNING' }, 2);
    source.rawEmitBroken('step', '{不是 JSON', 3);
    source.emit('step', { type: 'step', step: 'R3', status: 'DONE' }, 4);

    expect(envelopes).toHaveLength(2);
    expect(latest().lastSeq).toBe(4);
  });
});

/* ------------------------------------------------------- 停止执行（v2.1） */

describe('Live：停止执行', () => {
  it('POST /tasks/{id}/stop，空体不带 Content-Type，返回 StopResult 契约形状', async () => {
    const calls = stubFetch(() => ({
      json: {
        task_id: TASK,
        run_status: 'FAILED',
        stopped_at: '2026-10-11T05:00:00.000Z',
        final_state: 'CANCELLED',
      },
    }));

    const res = await new LiveApiClient(BASE).stopTask(TASK);

    const call = calls[0];
    expect(call?.url).toBe(`${BASE}/api/v1/tasks/${TASK}/stop`);
    expect(call?.init?.method).toBe('POST');
    expect(headerOf(call?.init, 'Content-Type')).toBeUndefined();
    expect(res).toEqual({
      task_id: TASK,
      run_status: 'FAILED',
      stopped_at: '2026-10-11T05:00:00.000Z',
      final_state: 'CANCELLED',
    });
  });
});

/* ---------------------------------------------- 归档与列表过滤（v2.1） */

describe('Live：归档与列表过滤', () => {
  it('POST /tasks/{id}/archive：布尔体 {archived}，返回 {task_id, archived, archived_at}', async () => {
    const calls = stubFetch(() => ({
      json: { task_id: TASK, archived: true, archived_at: '2026-10-11T05:00:00.000Z' },
    }));

    const res = await new LiveApiClient(BASE).archiveTask(TASK, true);

    const call = calls[0];
    expect(call?.url).toBe(`${BASE}/api/v1/tasks/${TASK}/archive`);
    expect(call?.init?.method).toBe('POST');
    expect(headerOf(call?.init, 'Content-Type')).toBe('application/json');
    expect(JSON.parse(String(call?.init?.body))).toEqual({ archived: true });
    expect(res).toEqual({
      task_id: TASK,
      archived: true,
      archived_at: '2026-10-11T05:00:00.000Z',
    });
  });

  it('恢复归档时 archived=false，archived_at 置 null', async () => {
    const calls = stubFetch(() => ({
      json: { task_id: TASK, archived: false, archived_at: null },
    }));

    const res = await new LiveApiClient(BASE).archiveTask(TASK, false);

    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ archived: false });
    expect(res.archived_at).toBeNull();
  });

  it('listTasks 把 status/archived 编码进查询串；不带参数时不加查询串', async () => {
    const calls = stubFetch(() => ({ json: { tasks: [], total: 0 } }));
    const client = new LiveApiClient(BASE);

    await client.listTasks();
    await client.listTasks({ status: 'RUNNING', archived: 'all' });
    await client.listTasks({ archived: 'true' });
    await client.listTasks({ status: 'DONE' });

    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/api/v1/tasks`,
      `${BASE}/api/v1/tasks?status=RUNNING&archived=all`,
      `${BASE}/api/v1/tasks?archived=true`,
      `${BASE}/api/v1/tasks?status=DONE`,
    ]);
  });
});

/* ------------------------------------------ 消息队列查询（v2.1，BE-11） */

describe('Live：消息队列查询', () => {
  it('GET /tasks/{id}/messages 返回 {task_id, busy, pending, active, history} 信封，原样转发', async () => {
    const envelope = {
      task_id: TASK,
      busy: true,
      pending: [
        {
          turn_id: 'turn-1',
          task_id: TASK,
          action: 'ask',
          text: '请补充近两年的进展',
          order: 1,
          queued_at: '2026-10-11T05:00:00.000Z',
          status: 'queued',
        },
      ],
      active: null,
      history: [
        {
          turn_id: 'turn-0',
          task_id: TASK,
          action: 'revise',
          text: '把结论 3 拆成两段',
          order: 1,
          queued_at: '2026-10-11T04:55:00.000Z',
          status: 'done',
        },
      ],
    };
    const calls = stubFetch(() => ({ json: envelope }));

    const res = await new LiveApiClient(BASE).listMessages(TASK);

    expect(calls[0]?.url).toBe(`${BASE}/api/v1/tasks/${TASK}/messages`);
    expect(res).toEqual(envelope);
  });
});

/* ------------------------------------------ 报告 Markdown 直下（v2.1） */

describe('Live：报告 Markdown 直下', () => {
  it('GET /tasks/{id}/report.md：blob 下载，文件名为 {task_id}.md', async () => {
    const calls = stubFetch(() => ({
      body: '# 报告正文',
      mime: 'text/markdown',
    }));

    const res = await new LiveApiClient(BASE).downloadReportMd(TASK);

    expect(calls[0]?.url).toBe(`${BASE}/api/v1/tasks/${TASK}/report.md`);
    expect(res.ok).toBe(true);
    expect(res.filename).toBe(`${TASK}.md`);
    expect(res.mime).toBe('text/markdown');
    expect(typeof res.blobUrl).toBe('string');
  });

  it('报告未生成（404）转成 ok=false + 错误码，不抛给界面', async () => {
    stubFetch(() => ({
      status: 404,
      json: { error: '没有报告', code: 'NOT_FOUND' },
    }));

    const res = await new LiveApiClient(BASE).downloadReportMd(TASK);

    expect(res).toMatchObject({ ok: false, kind: 'report', code: 'NOT_FOUND' });
  });
});

/* ---------------------------------------------------------------- 导出流 */

describe('Live：导出文件流', () => {
  it('文件名与清单都取自响应头：Content-Disposition + X-Export-Contents', async () => {
    stubFetch(() => ({
      body: 'PK\x03\x04 假 zip 内容',
      mime: 'application/zip',
      headers: {
        'Content-Disposition': "attachment; filename*=UTF-8''run-20261011-audit.zip",
        'X-Export-Contents': 'run/report.md, run/ledger.jsonl, verify.py, run/unknown.bin',
      },
    }));

    const res = await new LiveApiClient(BASE).exportArtifact(TASK, 'audit');

    expect(res).toMatchObject({ ok: true, kind: 'audit' });
    expect(res.filename).toBe('run-20261011-audit.zip');
    expect(res.mime).toBe('application/zip');
    expect(typeof res.blobUrl).toBe('string');
    // 清单只列后端实际打进包里的产物；未知名字不假装认识
    expect(res.manifest).toEqual([
      { name: 'run/report.md', kind: '报告', verified: true },
      { name: 'run/ledger.jsonl', kind: '证据账本', verified: true },
      { name: 'verify.py', kind: '校验脚本', verified: true },
      { name: 'run/unknown.bin', kind: '产物', verified: true },
    ]);
  });

  it('报告导出给文本内容供预览，二进制导出只给 blobUrl', async () => {
    stubFetch((url) =>
      url.includes('kind=report')
        ? { body: '# 报告正文', mime: 'text/markdown', headers: { 'X-Export-Contents': 'report.md' } }
        : { body: 'binary', mime: 'application/zip' },
    );
    const client = new LiveApiClient(BASE);

    expect((await client.exportArtifact(TASK, 'report')).content).toBe('# 报告正文');
    expect((await client.exportArtifact(TASK, 'audit')).content).toBeUndefined();
  });

  it('后端错误体 { error, code } 转成 ok=false，不抛给界面', async () => {
    stubFetch(() => ({
      status: 409,
      json: { error: '任务尚未进入终态', code: 'BAD_STATE' },
    }));

    const res = await new LiveApiClient(BASE).exportArtifact(TASK, 'audit');

    expect(res).toMatchObject({ ok: false, kind: 'audit', code: 'BAD_STATE' });
    expect(res.error).toBe('任务尚未进入终态');
  });
});
