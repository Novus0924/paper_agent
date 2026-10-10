# paper-agent 2.0 · 后端（BFF + AGH 集成 + 确定性内核）

> 2026 江苏省 AI+科学与工程创新实践黑客松参赛作品 ｜ 队伍：你说的都队（U046）
> 本目录为**后端实现**，严格依照《[后端需求文档.md](./paper-agent-2.0-需求文档/后端需求文档.md)》v2.0-draft 开发。
> 当前状态：**M0 + M1 已落地并通过真实验证**（详见"验证证据"章节）。

---

## 1. 一句话架构

```
前端工作台 → BFF（Node 24 + TS + Fastify，REST/SSE）
            → Session Gateway（@agnes/sdk，命名管道 + local 鉴权）
            → AGH daemon（会话/记忆/轨迹/导出底座）
            → sciret_* 插件工具 → Python 确定性内核（标准库、可复现）
            → runs/<task_id>/ 产物（原子写）
```

**三条红线（贯穿实现）**
1. 领域确定性内核：Python 标准库、零第三方依赖、可复现；
2. **执行不绕过 AGH**：BFF 不直接 spawn 领域进程跑主链路，全部经 AGH 会话（Task↔Session 1:1）；
3. BFF 与 AGH 同生态：Node ≥ 24.10 + TypeScript + 官方 `@agnes/sdk`。

**对 AGH 仓库（`D:\agnes-harness-main`）只读引用，绝不修改其源码**（经 pnpm `link:` 依赖接入）。

---

## 2. 目录结构

```
paper-agent-2/
├── apps/bff/                    # BFF（Fastify）
│   ├── src/
│   │   ├── config.ts            # 配置加载（env + 自动探测 + fail-fast）
│   │   ├── app.ts               # 应用装配（错误模型 / CORS / token 开关）
│   │   ├── index.ts             # 入口（仅绑 127.0.0.1）
│   │   ├── infra/               # logger / errors / validate
│   │   ├── agh/gateway.ts       # ★ Session Gateway（唯一执行出口）
│   │   ├── store/task-index.ts  # Task↔Session 1:1 映射 + 任务元数据（原子写）
│   │   ├── services/preflight.ts# 数据源连通性预检
│   │   ├── services/execution.ts# 执行编排（经会话下发 + per-Task 互斥）
│   │   ├── services/report.ts    # ★ 报告与证据只读装配（不 spawn 内核）
│   │   ├── events/               # 事件模型 / 总线 / AGH 事件中继（§5）
│   │   ├── export/               # ★ zip.ts（零依赖 ZIP 写入器）+ service.ts（Exporter SPI）
│   │   └── routes/               # health + /api/v1/{tasks,events,report,export}
│   ├── types/                   # AGH 最小类型声明（见 §6 说明）
│   ├── test/                    # 单测 + 契约测试（71 个）
│   └── scripts/                 # 诊断脚本（spike-* / zip-probe / scope-probe）
├── plugin/sciret/               # AGH 插件（sciret_* 工具薄壳）
├── kernel/sciret_kernel/        # Python 确定性内核（标准库）
│   ├── resilience.py            # ★ 容错原语（重试分类/指数退避+抖动/受控并发保序）
│   └── chaos.py                 # ★ 故障注入开关（默认关闭、Fail-closed、作用域隔离）
├── kernel/tools/fetch_corpus.py # 真实元数据抓取（重试/独立超时/受控并发）
├── scripts/doctor.mjs           # 环境自检（--json / --quiet，退出码 0/2/1）
├── scripts/quality-gate.sh      # ★ 全量质量门（自动挑选 Node ≥24.10 + vitest + 内核 + tsc）
├── scripts/verify-report.sh     # M6 端到端验收（28 项）
├── scripts/verify-export.sh     # M7 端到端验收（50 项）
├── scripts/verify-degrade.sh    # M5 端到端验收（17 项）
├── runs/                        # 运行产物（git 忽略）
├── data/task-index.json         # 任务索引（git 忽略）
└── agnes-api-key.txt            # 密钥（git 忽略，绝不入库）
```

---

## 3. 快速开始

```bash
# 0) 依赖（Node ≥ 24.10）
corepack pnpm install

# 1) 环境自检（诊断 + 人类可读修复指引；零副作用，不启动 daemon）
node scripts/doctor.mjs
node scripts/doctor.mjs --json     # 供启动器消费

# 2) 启动 AGH daemon（AGH 是执行底座）——统一走包装脚本（自动注入插件环境变量）
bash agh.sh daemon start
bash agh.sh daemon status

# 3) 安装 sciret 插件（唯一人工步骤：AGH 强制真实终端确认）
bash scripts/install-plugin.sh check            # 只读预检（含插件离线自检）
bash scripts/install-plugin.sh disable-old      # 停用 v1.0 遗留包（可逆，避免工具重名）
bash agh.sh install file:./plugin/sciret        # 在真实终端执行，提示 [y/N] 时输入 y
bash scripts/install-plugin.sh finish           # 自动 trust + enable + 终验 + 自检

# 4) 启动 BFF
pnpm dev:bff                        # http://127.0.0.1:8787

# 5) 冒烟
curl -s --noproxy '*' http://127.0.0.1:8787/api/health
curl -s --noproxy '*' -X POST http://127.0.0.1:8787/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -d '{"goal":"检索并综述固态电解质界面阻抗的表征方法","workflow":"research","lit_source":"local"}'
```

> Windows 下 curl 若被系统代理劫持，加 `--noproxy '*'`。
> **插件安装为何必须人工一次**：AGH 的 `confirmPackageInstall` 在非 TTY 环境直接判为取消
> （无 `--yes` 后门）——这是刻意的安全边界（安装=本机执行 JS）。助手不会绕过它。

---

## 4. 环境变量

| 变量 | 用途 | 默认 |
|---|---|---|
| `PAPER_AGENT_ROOT` | 项目根 | 自动探测（当前工作目录） |
| `PAPER_AGENT_AGH_ROOT` | AGH 仓库根（只读） | 自动探测 `D:/agnes-harness-main` 等候选 |
| `PAPER_AGENT_PORT` | BFF 端口 | `8787` |
| `PAPER_AGENT_PYTHON` | Python 解释器（内核） | 自动探测 `python`/`python3`/`py` |
| `PAPER_AGENT_LOG_LEVEL` | 日志级别 | `info` |
| `PAPER_AGENT_CORS_ORIGINS` | CORS 白名单（按 Origin 回显） | `http://127.0.0.1:5173,http://localhost:5173` |
| `PAPER_AGENT_TOKEN` | 可选写路由令牌（默认关） | 未设置 |
| `AGH_HOME` / `AGNES_PROFILE` | AGH 实例定位（透传给 SDK 发现） | AGH 默认（`~/.agh` / `local-dev`） |

**监听地址硬编码 `127.0.0.1`**，不允许覆盖（安全红线）。

---

## 5. 已实现接口（对照需求文档 §8）

| # | 方法 | 路径 | 状态 |
|---|---|---|---|
| 1 | GET | `/api/health` | ✅ 版本/根/运行目录/任务数/AGH 会话状态 |
| 2 | GET | `/api/v1/tasks` | ✅ 支持 `?status=` |
| 3 | POST | `/api/v1/tasks` | ✅ goal/workflow/lit_source/sources + preflight + 建立 AGH 会话（1:1） |
| 4 | GET | `/api/v1/tasks/{id}` | ✅ 面向视图 DTO |
| 5–8 | POST | `run-all` / `step` / `resume` / `stop` | ✅ 经会话下发 + per-Task 互斥 + 终态收敛（202/200；BUSY 409） |
| 9 | GET | `/events`（SSE） | ✅ 快照先发 + 实时续接 + 幂等去重 + Last-Event-ID 续传 + 终态必达 |
| 10–11 | GET | `/report` / `/report.md` | ✅ 就绪 `200 {status:"ready",report:{…}}` / 未就绪 `200 {status:"generating"}`；MD 带 nosniff + inline |
| 12–13 | GET | `/evidence` / `/cite` | ✅ 证据/结论/轨迹只读装配；cite 支持 EV 编号与 ≥6 位哈希前缀 |
| 14 | POST | `/messages` | ⏳ M8 |
| 15 | GET | `/export?kind=report｜audit｜session` | ✅ 报告 MD 文件流 / 审计包 ZIP（含校验脚本）/ AGH 原生会话轨迹；未就绪 409 NOT_READY |

> 另有辅助接口 `GET /api/v1/tasks/{id}/execution`（busy/步骤快照，供轮询与调试；SSE 到位后前端以 SSE 为主）。

### 5.1 执行编排与 AGH 授权层（实测要点）

- **执行必经 AGH**：run-all/step/resume 只组装指令 → `session.prompt()` 下发**既有会话**（§4.4 同生命周期）；
  BFF **不 spawn 内核**，状态同步只**只读** `runs/<task_id>/state.json`。
- **写文件类工具需审批应答**：AGH 对文件作用域工具发 `session/request_permission`；
  **客户端未注册处理器时默认拒绝**（实测 `sciret_run_all` → `APPROVAL_REJECTED`）。
  本项目在网关注册**受控审批策略**：仅放行「`sciret_*` 工具 + 路径全部落在本项目 `runs/` 内」，逐次放行，其余拒绝。
  ⚠️ 载荷是 ACP `ToolCallUpdate`：**没有 `name` 字段**——工具名在 `title`、参数在 `rawInput`、路径在 `locations[].path`。

### 5.2 报告聚合与门禁（实测要点）

- **报告由内核在终态产出**：`pipeline.run_all` 收敛到 `DONE` 后自动调用 `report.assemble`，
  BFF **只读装配**（不 spawn 内核）——「终态 DONE 且报告就绪」由此闭合。
- **门禁 Fail-closed**：哈希链完整 + 结论 100% 绑定 fact 级证据 + 判断批次齐全，三者任一不过即**拒绝出报告**，
  原因写入 `report_gate.json`；`/report` 如实反映为 `status:"generating"` + `gate`（不二次放行）。
- **篡改后残留报告会被作废**：门禁不过时 `report.json` / `report.md` 被**改名**为 `*.invalid`（可逆、不删数据）——
  否则「改账本后旧报告仍被 `/report` 采信」会成为绕过门禁的后门（§11 审计防篡改）。
- **幂等**：报告按 `ledger_digest` 复用（`reused=true`），重复请求不重写盘；恢复账本后可重建。
- **产物**：`report.json`（结构化）、`report.md`（含结论证据角标与降级声明）、`report_gate.json`（门禁结论）。
- 证据索引带**真实 DOI**（Crossref/OpenAlex 抓取后冻结，只取元数据不取全文），符合 §11 数据真实性要求。

错误码全集已实现（`{error, code}` 统一体、状态码映射、人类可读修复指引并入 `error` 文本）：
`BAD_GOAL / BAD_BODY / BAD_PARAM / BAD_ID / NOT_FOUND / NO_REPORT / BUSY / BAD_STATE / NOT_READY / SESSION_ERROR / CLI_ERROR / EXPORT_ERROR`。

### 5.3 导出三件套与 Exporter SPI（实测要点）

- **session 导出必须走 AGH 原生**：daemon 注册的 RPC 只有
  `authenticate / initialize / session/cancel / session/load / session/new / session/prompt`——**没有导出 RPC**。
  故 `kind=session` 调 AGH CLI（`--format agnes|sharegpt|claude-code`），子进程 env 按白名单裁剪
  （仅 `PATH` / `SystemRoot` / `TEMP` / `AGH_HOME` / `AGNES_PROFILE`）。
  实测：不存在的 session → 退出码 1 + `CAPABILITY_DENIED (-32006)` 且**不产文件** →失败路径天然可辨，不会伪装成功。
- **审计包内容**：`run/report.md`、`run/ledger.jsonl`、`run/state.json`、`run/report_gate.json`、
  `run/review.json`、`run/events.json`、`run/conclusions.json`、**`verify.py`**、`manifest.json`。
  未产出的文件**不进包**（不塞空文件充数），`X-Export-Contents` 头如实反映实际内容。
- **`verify.py` 必须能独立复核且 fail-closed**：只用 `hashlib/json/sys/pathlib`，**不 import 本项目任何模块**
  （改代码不能改结论）；独立重算哈希链 + 校验结论 fact 绑定 + 比对 `report.json.ledger_digest`。
  E2E 含**反向用例**：篡改包内账本后必须退出码 1——恒返回「通过」的校验脚本比没有校验脚本更危险。
- **ZIP 为零依赖自实现**（项目依赖里没有任何 ZIP 库）：local header `0x04034b50` + data +
  central directory `0x02014b50` + EOCD `0x06054b50`，CRC-32 多项式 `0xedb88320`，deflate(8)/store(0)，
  UTF-8 flag `0x0800`。**自写解析器自己校验自己不算数**，故：单测对 4 个 CRC-32 标准向量逐值比对，
  E2E 用系统 `unzip -t` 交叉验证 + 解压后用 Node 逐文件重算 sha256。固定 mod time/date ⇒ 同输入逐字节可复现。
- **Exporter SPI（§560）**：`Exporter` 接口（`available()` + `export()`）+ `EXPORTERS` 注册表，
  新增导出格式 = 实现一个导出器，**路由与参数解析零改动**。
- **未就绪语义**：409 `NOT_READY` 并列出当前实际可导出的格式；全不可用时明说「当前无可导出格式」。
- **不静默回退**：缺 `kind` → 400；非法 `kind` / `format` → 400 且列出全部允许值（§6枚举回退须显式告知）。

### 5.4 降级治理与容错策略（实测要点）

**三级语义（§2.2）**：L0 覆盖充足 → 无降级；L1 个别源不可用但覆盖充足 → 只记 `info`、**不置位**；
L2 路径实质改变 → `degraded=true` + 五要素（来源/原因/影响/可重试/步骤）。L0/L2 在报告中可区分
（「未发生实质降级」vs 具体降级声明）。

- **关键事实：冻结语料的 `source_status` 恒为 ok**，故 L1/L2 在正常跑批中**不可达**——
  要验证它们只能靠①可配置覆盖策略②chaos 注入开关，这正是 §2.2①⑤ 要求这两者存在的原因。
- **覆盖策略可配置**：`CoveragePolicy(min_ok_sources, min_hits, retrieval_limit)` 经 `args-json` 传入，
  默认 2 源 / 4 命中；**非法输入报错而非取默认**（否则"我配了 5 却按 2 跑"无法察觉），结果**回显生效策略**。
- **`MIN_CORROBORATING_SOURCES` 与 `min_ok_sources` 是两回事**：前者是 R4「一个主题词要被几个独立来源支撑」
  （证据层），后者是检索阶段「几个源成功才算覆盖充足」（覆盖层）。恰好都是 2 属巧合，共用常量会让
  调低覆盖阈值意外改变交叉印证强度。
- **chaos 开关 Fail-closed**：`PAPER_AGENT_CHAOS=1` + `PAPER_AGENT_CHAOS_SCOPE=<前缀>` + `PAPER_AGENT_CHAOS_SOURCES=<源名>`，
  三者缺一即**报错退出**。作用域前缀防跨任务泄漏；必须显式指定目标源是因为
  「单源不可用（L1）」与「全源不可用（L2）」是两种不同演练，默认"全挂"会把 L1 演练悄悄变成 L2 并得出错误结论。
  开关值只接受 `'1'`——写 `'true'` 直接报错，因为"以为开了实际没开"会得出"故障注入无效"的假阴性。
- **注入只改写「源可达性」，绝不伪造文献记录**：语料条数仍来自真实冻结快照，覆盖不足是真覆盖不足。
  注入事实写进 `source_status.chaos`，L2 的 `reason` 带「演练注入，非真实网络故障」，评审可一眼看出。
- **§6 容错三策略**（`kernel/sciret_kernel/resilience.py`，纯标准库）：
  - **重试**：429/5xx/连接/超时 → 瞬时（指数退避 1s/2s/4s + 25% 抖动，上限 3 次）；其余 4xx → **永久不重试**
    （单测断言只尝试 1 次，防止后有人给 `PermanentError` 也加重试）；
  - **超时**：每源独立（默认 20s），互不阻塞；
  - **并发**：`map_ordered` 基于 `ThreadPoolExecutor.map`，**按输入顺序产出** → 并发只压缩耗时，
    不影响输出顺序。这是 §6「结果按固定顺序归并（保确定性）」的实现，**不是性能优化**。
- ⚠️ **重抓语料必须保持 `--sources` 顺序一致**：并发归并按声明顺序，`source_status` 键序会变，
  而该字段参与 L1/L2 判定与产物哈希。

---

## 6. AGH 集成要点（实测结论，避免重踩）

| 结论 | 说明 |
|---|---|
| **连接方式** | Windows 走**命名管道**（`\\.\pipe\agnes-*`）：`resolveDaemonScope` → `readDaemonDiscovery` → `unixTransport({path, resolveServerIdentity})` + `auth:{kind:'local'}`。与 AGH CLI 同一路径。 |
| **管道必须带可信身份** | 创建 unix transport 时若不提供 `resolveServerIdentity`，Windows 下**构造即抛错**（`Windows pipe requires a verified server identity`）。每次连接尝试都重新读取发现文件，不缓存过期 pid。 |
| **工作区必须先注册** | `session.new` / `session.load` 传入的 `cwd` **必须先 `workspace.add(cwd)`**，否则返回 `SEMANTIC_REJECTED (-32011)`。 |
| **会话 cwd 决定会话键** | 会话 id 形如 `agnes:local:<profile>:cli:workspace:<hash>`，hash 由 cwd 派生。**reattach 必须传同一个 cwd**（本项目为 `runs/<task_id>`），否则同样 `SEMANTIC_REJECTED`。 |
| **事件词汇** | AGH 账本事件类型为 `session/start`、`turn/start`、`step/start`、`assistant/message`、`step/end`、`turn/end` 等；M4 的 Event Relay 负责映射到本项目 9 类事件。 |
| **导出复用 AGH 原生** | daemon **无导出 RPC**，故经 CLI：`agnes export <session_id> --format agnes -o x.jsonl` 实测可用（产出事件 JSONL）。M7 已把该路径封装为 `kind=session`，且与 CLI 直出**逐字节一致**。 |
| **⚠️ 已知问题** | `agnes sessions`（列表/`--json`）在当前 home 上返回 `INTERNAL_ERROR RESULT_INVALID`——**AGH 侧投影问题，非本项目缺陷**（会话本身已正常写入 `sessions.db`，且 `export`/`load` 均可用）。红线要求不得改 AGH 源码，故记录在案并通过 `session.load` + 本任务索引 + `export` 作为"可核对/可导出"证据路径。 |
| **遗留包** | 用户 AGH home 中存在 v1.0 遗留包 `paper-agent-tools`（`ext:paper-agent/tools`，`enabled=true`，7 个 hot-tools）。其工具名与本项目 `sciret_*` **重名 7 个** → 启用本插件前**必须先停用旧包**：`bash scripts/install-plugin.sh disable-old`（可逆：`bash agh.sh package enable ext:paper-agent/tools`）。本项目插件 id 为 `ext:paper-agent/sciret`。 |

### 6.1 插件安装与运行期环境变量（本机三大陷阱）

1. **`file:./` 包源按 daemon 启动目录解析**：daemon 必须**从项目根**启动，否则 `package inspect/add` 报
   `The package source could not be accepted.`。→ 统一用 `bash agh.sh <子命令>`（脚本内部 `cd` 项目根）。
2. **AGH 会“拷贝”插件到自己的 home 运行**（`~/.agh/data/profiles/<profile>/packages/<pkg>`）：
   插件因此**不能靠相对路径/`__dirname` 找 Python 内核**，必须在 **daemon 启动时注入环境变量**：
   `PAPER_AGENT_PYTHON`、`PAPER_AGENT_KERNEL_ROOT`、`PAPER_AGENT_RUNS_DIR`（`agh.sh` 已自动注入）。
   **已在运行的 daemon 无法注入**，必须 `daemon stop` 后重启；新能力只在**新会话**生效。
   → 插件对缺失变量**不静默退化**，而是返回可执行的修复步骤（避免"ModuleNotFoundError"式误诊）。
3. **`package status` 会自动拉起 daemon**（且不带这些环境变量）→ 诊断不要用它；本项目 `doctor.mjs`
   改为**直接读 AGH 锁文件**（零副作用）判断插件状态与旧包冲突。安装后的"终验三字段"（`desired=enabled`
   且 `actual=running` 且 `trusted=true`）由 `scripts/install-plugin.sh finish` 负责。
4. **`package.json` 必须有 `license` 字段**：AGH 信任门 `package-manager/src/trust-gate.ts` 只接受
   `MIT / Apache-2.0 / BSD-2|3-Clause / ISC / 0BSD / MPL-2.0 / Unlicense`，缺失或不在清单内 →
   `E_PACKAGE_TRUST`（"does not meet the required trust policy"）。
5. **工具 `meta` 的取值受 `extension-api/src/tool.ts: checkToolMeta` 约束**（易踩）：
   `replay ∈ {safe|never|idempotent}`（**没有** `conditional`）；`costHint` 仅 `{credits?:number, wallMs?:number}`
   （**不接受** `{kind:...}`）；`requiresApproval ∈ {never|destructive|always}`；八个键必须齐全。
   违反 → 注册期 `E_TOOLDEF_META`，表现为 `enable` 失败且 `actual=failed`。
   `plugin/sciret/verify-offline.mjs` 已按该规则做离线校验。
6. **失败的包操作会留下 `.agnes-fetch-*` 残留并导致 daemon 拒绝启动**（`E_PACKAGE_STATE: unfinished source
   acquisition requires recovery`）。AGH 刻意不自动清理；处置方式是**改名隔离**该目录（可逆），
   随后 daemon 会自动清理 `.stage-*`。定位办法：前台运行 `node <AGH>/packages/cli/dist/local/daemon.mjs
   --profile <p> --workspace <项目根> --data-dir <home>/data` 可直接看到该错误。

---

## 7. 验证证据（实测，非推断）

**集成验证（一次运行内完成 daemon + BFF + HTTP 调用）**

```jsonc
// GET /api/health
{"status":"ok","service":"paper-agent-bff","version":"2.0.0-mvp","tasks":1,
 "agh":{"connected":true,"agnes_version":"0.0.0","socket":"\\.\pipe\agnes-...","sessions_open":0}}

// POST /api/v1/tasks → 201
{"task_id":"run-20261009-204947-5fj9kj",
 "session_id":"agnes:local:local-dev:cli:workspace:f99d7e600c9539d3",
 "state":{"run_status":"PLANNED","steps":[R1..R6 PENDING],"degraded":false},
 "preflight":{"sources":{"arxiv":"ok","crossref":"ok"}}}

// 校验失败路径
POST goal="   "                → 400 {"code":"BAD_GOAL"}
GET  /tasks/../../etc/passwd   → 400 {"code":"BAD_ID"}   // 防目录穿越
```

**AGH 留痕与可导出**
- `sessions.db` 中存在本次会话：`agnes:local:local-dev:cli:workspace:f99d7e600c9539d3`（created 2026-10-09T12:49:47Z）；
- `session.load` 重新附加成功，历史事件可读（4 条）；
- `agnes export <session_id> --format agnes` 产出 JSONL（含 `session/start` 事件、可信 actor）。

**质量门**

> ⚠️ **必须用 Node ≥ 24.10 跑 BFF 测试**（`engines` 要求）。AGH 的 Windows 原生模块只按 Node 24 的 libuv ABI 构建，
> 用 Node 22 跑会报 `CONFIG_CREDENTIAL_STORE`，**看起来像「AGH 集成坏了」，实际只是运行时 ABI 不匹配**。
> 本机裸 `node` 可能解析到 WorkBuddy 托管的 22.x，故统一走 `bash scripts/quality-gate.sh`（自动挑选合规 Node，
> 找不到就 FATAL 退出而非静默跑出错结果）。详见 §8 第 9 条。

- `bash scripts/quality-gate.sh` → BFF **71/71 通过** + 内核 **37/37 通过**（连跑两次查抖动）+ `tsc` **零错误**
  （单测覆盖校验/错误模型/执行编排/事件总线/报告聚合/导出与 ZIP/降级三级语义/容错策略/AGH 接口契约）；
- `node scripts/doctor.mjs` → 逐项状态 + 修复指引（`--json` / `--quiet`，退出码 0/2/1）。

**M6 报告聚合端到端**（`bash scripts/verify-report.sh` → PASS=28 FAIL=0）

```jsonc
// GET /api/v1/tasks/{id}/report（就绪）
{"status":"ready","report":{"title":"研究报告：…","abstract":"…",
 "sections":[…],"conclusions":[{"cid":"C-001","evidence_ids":["EV-0014"],…}]}}

// 未就绪（不报错，§8.2）
{"status":"generating","gate":{"passed":false,"reasons":["账本校验失败[CHAIN_MISMATCH] …"]},"run_status":"RUNNING"}

// GET /report.md 响应头
Content-Type: text/markdown; charset=utf-8
X-Content-Type-Options: nosniff
Content-Disposition: inline

// GET /cite?ev=93e31bd3（哈希前缀）
{"task_id":"run-…","found":true,"citation":{"ev_id":"EV-0001","doi":"10.1007/s41918-019-00048-0",
 "year":2019,"matched_by":"sha256_prefix"}}

// 门禁 Fail-closed（篡改账本后）
report.json → report.json.invalid（可逆作废）；report_gate.json → {"passed":false,"reasons":["…CHAIN_MISMATCH…"]}
```

**M7 导出三件套端到端**（`bash scripts/verify-export.sh` → PASS=50 FAIL=0）

```jsonc
// GET /export?kind=report响应头
Content-Type: text/markdown; charset=utf-8
Content-Disposition: inline; filename="run-xxx-report.md"
X-Content-Type-Options: nosniff

// GET /export?kind=audit（响应头列出实际内容，便于评审核对）
Content-Type: application/zip
Content-Disposition: attachment; filename="run-xxx-audit.zip"
X-Export-Contents: run/report.md,run/ledger.jsonl,run/state.json,run/report_gate.json,\
run/review.json,run/events.json,run/conclusions.json,verify.py,manifest.json

// 未就绪（§386：说明可导出范围）
409 {"code":"NOT_READY","error":"任务 run-xxx 尚不可导出：报告尚未就绪…。当前可导出：session"}

// 审计包内清单（逐文件 bytes + sha256 + 门禁状态 + 校验方法）
manifest.json → {"task_id":…,"gate":{"passed":true,…},"counts":{…},
                 "files":[{"path":"run/ledger.jsonl","bytes":19812,"sha256":"…"}],
                 "how_to_verify":"python verify.py --run-dir run"}
```

**M5 降级治理端到端**（`bash scripts/verify-degrade.sh` → PASS=17 FAIL=0）

```jsonc
// L1：单源不可用但覆盖充足 → 只记 info，degraded 必须为 false（§2.2 验收①）
state.json → {"degraded": false,
  "degraded_reasons": [{"level":"info","source":"crossref",
    "reason":"部分数据源不可达，但覆盖充足（成功源 1、命中 6），结果路径未改变",
    "impact":"结果未受影响","resumable":true,"step":"R1"}],
  "source_status": {"crossref":"unavailable:chaos:…","openalex":"ok:8","chaos":"enabled:1"}}

// L2：覆盖不足 → degraded=true，五要素齐全（§2.2 验收②）
state.json → {"degraded": true,
  "degraded_reasons": [{"level":"degraded","source":"crossref,openalex",
    "reason":"覆盖不足触发路径实质改变：成功源 0（阈值 2）、命中 16（阈值 4），已回落本地冻结语料（本次源不可用由演练注入，非真实网络故障）",
    "impact":"检索覆盖范围收窄，结论基于有限语料，需人工复核覆盖面","resumable":true,"step":"R1"}]}

// 覆盖策略可配置（§2.2①）：同样只挂 crossref，阈值不同 → 判定不同
//   min_ok_sources=1,min_hits=1 → degraded=false；min_ok_sources=2,min_hits=4 → degraded=true
// 非法字段（min_ok_sorce 拼错）→ 直接报错，不静默取默认
```

---

## 8. 关键工程约定（易踩坑，务必遵守）

1. **运行期与检查期 tsconfig 分离**：`tsx` 在**运行期也会应用 tsconfig 的 `paths`**。因此：
   - `apps/bff/tsconfig.json`（运行期）**不含 paths** → 解析到真实 link 包；
   - `apps/bff/tsconfig.check.json`（`pnpm typecheck`）用 paths 指向 `types/*.d.ts`，避免把 AGH 整个 monorepo 拉进 tsc 产生噪声。
   > 若把 paths 写进运行期配置，脚本会因加载到 `.d.ts`（无运行时代码）报 `does not provide an export named ...`。
2. **AGH 类型走本地声明 + 运行期契约测试**：类型来自 `apps/bff/types/*.d.ts`，靠 `test/contract.test.ts` 在运行期校验接口真实存在（防 AGH 升级漂移）。
3. **所有产物原子写**：`tmp + rename`（任务索引、后续 state/report）。
4. **密钥只经环境注入**：`agnes-api-key.txt` 已在 `.gitignore`；日志对 `key|token|secret|password` 字段脱敏。
5. **子进程环境白名单**：插件调内核时只透传最小 env（防提示注入诱导泄露密钥）。
6. **沙箱/受限环境下避免 `spawnSync`**：会 `EBUSY`，一律用异步 `spawn`。
7. **可复现性的真实边界（勿"修"成假确定性）**：账本记录带**秒级墙钟时间戳 `at`，且它参与哈希链与 `ledger_digest`**。
   因此两次相同输入的执行，**若跨秒则摘要不同**。可承诺的是「除墙钟时间戳外完全确定」：
   语料检索排序、要素拆解、交叉印证判定均为纯函数，同输入必同输出（`test_kernel.py::TestDeterminism` 用
   `freeze_clock()` 注入固定时间戳来验证这一点，并另有一条用例**如实断言**"跨秒摘要不同"）。
   > 之所以保留 `at` 进链：审计要求记录真实发生时间。若将来要"整账本逐字节可复现"，
   > 正确做法是引入显式的 `SOURCE_DATE_EPOCH` 式冻结参数，而非把时间戳悄悄从链里剔除。
8. **测试目录名不可从时间戳切片推导**：`stamp[-9:-7]` 这类写法对同一秒内的两个值会切出**相同**目录名，
   第二次运行会复用已有账本文件，导致"摘要相同"的假象（我踩过，见 `test_digest_differs_when_wall_clock_crosses_second`）。
9. **BFF 测试必须用 Node ≥ 24.10，且不要信裸 `node`**：AGH 的 Windows 原生模块
   （`packages/system-node/dist/native/agnes-system.node`）只按 Node 24 的 libuv ABI 构建。
   用 Node 22 跑时的报错链是：
   ```
   require('agnes-system.node') → "Rebuild Windows native artifact for the current Node.js/libuv runtime"
     → windowsPrivateFilesAvailable() === false
     → credentialFileEnforcement() = {level:'unavailable'}
     → credentialStore.read() 抛 CONFIG_CREDENTIAL_STORE
     → contract.test.ts 的 resolveDaemonScope 用例失败
   ```
   报错指向「AGH 配置与凭据」，极易误判为集成坏了，**实际只是运行时 ABI 不匹配**。
   本机裸 `node` 会解析到 WorkBuddy 托管的 22.x → 一律用 `bash scripts/quality-gate.sh`（自动挑选合规 Node）。
   **遇到 AGH 侧看不懂的报错，先用不同 Node 版本各跑一次再下结论。**
10. **子进程"成功后再清理"顺序不能反**：把 `rmSync(tmp)` 放在 `finally` 里而**在 `finally` 之后**才读产物，
    会让所有导出 100% 报"未产出文件"（语法与类型检查都合法，只有真跑才暴露）。
    故导出类实现必须在 `try` 内就地读回内容，`finally` 只做清理。
11. **E2E 断言"某校验会拒绝执行"时，必须确认被验证的代码路径真的被走到**：
    `execute_step` 对**终态步骤直接复用返回**，会早于任何前置校验 → 测出"没报错"其实是"根本没跑"。
    我在 M5 chaos fail-closed 用例上连踩两次（setup 自身带chaos 把 R1 跑成 DONE）。
    修法：① setup 只 `plan` 不执行，保持 PENDING；② 加**负向对照**（断言 `"ok": true` 不出现），
    否则"没报错"和"没执行"在输出上无法区分。
12. **验证阈值可配置性，要先确认不同阈值落在判定边界两侧**：若把两档阈值都设在边界同侧
    （如两源全挂时任何正阈值都判降级），测出来的是"两个都不满足"，不是"策略可配置"。
13. **新写 Python 模块后立刻跑一次导入**：本项目内核"零第三方依赖 + 单测驱动"，
    任何语法错误（如 `from __future__ import annotations` 拼错）都会在质量门立刻暴露，成本极低。

---

## 9. 里程碑进度

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M0 | BFF 骨架（配置/日志/错误模型/校验/CORS/版本前缀）+ health + doctor | ✅ |
| M1 | AGH 会话网关（连接/发现/管道身份/工作区注册）+ 任务服务 + Task↔Session 1:1 映射 + preflight | ✅ |
| M2 | sciret 插件工具集 + Python 内核（状态机/证据账本/流水线/报告装配） | ✅ 内核 + 9 个工具 + 真实语料 + 报告门禁（含篡改作废）均实测 |
| M3–M4 | 执行编排（run-all/step/resume/stop、互斥、终态收敛）+ Event Relay（SSE、快照、Last-Event-ID） | ✅ M3/M4 均完成并通过 §9.2 / §9.3 验收 |
| M5 | 降级治理（L0/L1/L2、覆盖策略、重试/超时/受控并发） | ✅ 通过 §9.4 验收（E2E 17/17，内核新增 19 项单测；三级语义从"不可达分支"变为可复测行为） |
| M6 | 报告聚合（终态自动出报告 + 门禁 + 幂等 + 原子写）+ 证据只读 + cite | ✅ 通过 §9.5 / §9.6 验收（E2E 28/28） |
| M7 | 导出三件套（报告 MD / 审计包 ZIP / AGH 会话轨迹）+ Exporter SPI | ✅ 通过 §9.6 验收（E2E 50/50，单测 16 项；含 verify.py 反向篡改用例） |
| M8–M9 | 多轮消息 + DTO 收口 + 一键启动器 + doctor 完整版 | ⏳ |
| M10 | 单测/集成/契约/E2E + DoD 验收 | ⏳ |

---

## 10. 诊断脚本

```bash
# BFF / 会话网关
cd apps/bff
npx tsx scripts/spike-gateway.ts                       # 全链路：发现→握手→建会话→订阅→prompt
npx tsx scripts/spike-load.ts "<session_id>" "<cwd>"   # reattach：load + 历史事件读取

# AGH 包装与插件（项目根）
bash agh.sh daemon status                              # 调 AGH（自动 cd 项目根 + 注入插件环境变量 + 起飞自检）
bash scripts/install-plugin.sh check                   # 安装前只读预检（含插件离线自检）
node plugin/sciret/verify-offline.mjs                  # 插件本体离线自检（11 项：形态/meta/真实调用/越权拦截）
node scripts/doctor.mjs [--json|--quiet]               # 环境自检（退出码 0/2/1）
```

> 注意：本项目沙箱/受限环境下每次调用为独立进程组，**后台进程不跨调用存活**。
> 集成验证需在**同一次调用内**完成 `daemon start` → BFF → 断言。
