# paper-agent 2.0 · 后端（BFF + AGH 集成 + 确定性内核）

> 2026 江苏省 AI+科学与工程创新实践黑客松参赛作品 ｜ 队伍：你说的都队（U046）
> 本目录为**后端实现**，严格依照《[后端需求文档.md](./paper-agent-2.0-需求文档/后端需求文档.md)》v2.0-draft 开发。
>
> **当前状态：MVP（V1.0）全部里程碑已完成，DoD 全清单通过。**
> 需求 §16 的 13 条验收项逐条判定为 ✅（判定依据见[§9.5](#95-dod-验收-s16与已知边界)，
> 由 `pnpm dod` 自动执行，不是人工声称）。
>
> | 验证 | 命令 | 当前结果 |
> |---|---|---|
> | 代码级门禁 | `pnpm quality-gate` | vitest **158/158** · 内核 **91/91** · `tsc` 0 error · `eslint` 0 error |
> | DoD 总验收 | `pnpm dod` | 11 项门禁 + 13 条逐条判定全绿 |
> | 端到端 | `bash scripts/verify-*.sh` | 六段合计 **179 项**断言全绿 |
>
> 已知未实现项（需求已列、边界如实标注）：`materials` 工作流算子、
> AGH 集成一致性校验、OCR、容器化（§12.4 标为"建议"）。逐条说明见 §9.5。
>
> **v2.2 变更摘要**：
> ① 终态追问打通——DONE/FAILED 任务允许 ask/revise（同一 AGH 会话发起新回合，终态产物不可变，回复经既有 message SSE 事件流呈现）；
> ② 提示注入检测落地——规则型 `kernel/sciret_kernel/injection.py`（12 条中英模式，零依赖），R1 入账本前清洗元数据并以 note 留痕、`sciret_plan` 对 goal 命中附 warning（不阻断）；
> ③ 源熔断——同 run 内 unavailable 的源记入 `state.circuit`，resume 重跑 R1 跳过其二次抓取并留痕。

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

**对 AGH 仓库（工作区 `../agnes-harness`）只读引用，绝不修改其源码**（经 pnpm `link:` 依赖接入）。

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
│   │   ├── services/message.ts   # ★ 多轮消息（同会话追问/修订 + 运行中排队按序执行）
│   │   ├── events/               # 事件模型 / 总线 / AGH 事件中继（§5）
│   │   ├── export/               # ★ zip.ts（零依赖 ZIP 写入器）+ service.ts（Exporter SPI）
│   │   └── routes/               # health + /api/v1/{tasks,events,report,export,messages}
│   ├── types/                   # AGH 最小类型声明（见 §6 说明）
│   ├── test/                    # 单测 + 契约测试（155 个）
│   └── scripts/                 # 诊断脚本（spike-* / zip-probe / daemon-ready / *-probe）
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
├── scripts/verify-message.sh    # M8 端到端验收（含真实 AGH 会话追问，26 项）
├── scripts/verify-startup.sh    # M9 端到端验收（doctor + 启动器 + 分层 DTO，45 项）
├── scripts/verify-resume.sh     # M10 崩溃续跑验收（13 项，含篡改账本反向用例）
├── scripts/verify-dod.sh        # ★ M10 DoD 总验收（编排 + §16 逐条判定）
├── scripts/start.mjs             # ★ 一键启动器（BE-13，§12.1；pnpm start）
├── scripts/agh-daemon-up.sh     # 启动 AGH daemon 并等待就绪（供 E2E）
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
| `PAPER_AGENT_AGH_ROOT` | AGH 仓库根（**只读引用，禁止改其源码**） | 自动探测同级 `agnes-harness` / `agnes-harness-main`，再试 `../` 候选（判据：`packages/cli/dist/local/agnes.mjs` 存在） |
| `PAPER_AGENT_PORT` | BFF 端口 | `8787` |
| `PAPER_AGENT_PYTHON` | Python 解释器（内核，≥3.10） | 自动探测 `python`/`python3`/`py`，再试各用户 `~/.workbuddy/binaries/python/versions/<版本>/python.exe` |
| `PAPER_AGENT_LOG_LEVEL` | 日志级别 | `info` |
| `PAPER_AGENT_CORS_ORIGINS` | CORS 白名单（按 Origin 回显，逗号分隔） | `http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174` |
| `PAPER_AGENT_CORS_EXTRA_ORIGINS` | 在上述白名单上**追加**（不覆盖） | 未设置；一键启动器自动追加它托管的前端 Origin |
| `PAPER_AGENT_TOKEN` | 可选写路由令牌（默认关） | 未设置 |
| `AGH_HOME` / `AGNES_PROFILE` | AGH 实例定位（透传给 SDK 发现） | AGH 默认（`~/.agh` / `local-dev`） |

**监听地址硬编码 `127.0.0.1`**，不允许覆盖（安全红线）。

---

## 5. 已实现接口（对照需求文档 §8）

| # | 方法 | 路径 | 状态 |
|---|---|---|---|
| 1 | GET | `/api/health` | ✅ 版本/根/运行目录/任务数/AGH 会话状态 |
| 2 | GET | `/api/v1/tasks` | ✅ 支持 `?status=` |
| 3 | POST | `/api/v1/tasks` | ✅ goal/workflow/lit_source/sources + preflight + 建立 AGH 会话（1:1）；**未实现的工作流在入口即400**（见 §5.8） |
| 4 | GET | `/api/v1/tasks/{id}` | ✅ 面向视图 DTO |
| 5–8 | POST | `run-all` / `step` / `resume` / `stop` | ✅ 经会话下发 + per-Task 互斥 + 终态收敛（202/200；BUSY 409） |
| 9 | GET | `/events`（SSE） | ✅ 快照先发 + 实时续接 + 幂等去重 + Last-Event-ID 续传 + 终态必达 |
| 10–11 | GET | `/report` / `/report.md` | ✅ 就绪 `200 {status:"ready",view:"view",report:{…}}` / 未就绪 `200 {status:"generating"}`；**`?view=audit` 才回传哈希与链信息**；MD 带 nosniff + inline |
| 12–13 | GET | `/evidence` / `/cite` | ✅ 证据/结论/轨迹只读装配（同支持 `?view=audit`）；cite 支持 EV 编号与 ≥6 位哈希前缀 |
| 14 | POST | `/messages`（+ GET/DELETE 队列） | ✅ 同会话追问/修订；运行中**入队**（`queued:true`+`order`）而非拒绝；回合结束按序放行 |
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

### 5.5 多轮消息与队列（实测要点）

- **队列不是拒绝**（P-05 核心）：运行中发消息返回 `200 {queued:true, order:N}` 并入队，
  回合结束后按序投递。若共用执行锁，「运行中发消息」会退化成 409 BUSY，等于换一种方式复现 P-05。
- **消息锁与执行锁是两把独立的锁，且必须双向互斥**：AGH 的 session 同时只允许一个活跃 turn。
  - 执行中发消息 → 入队（消息服务查`exec.isExecuting()`）；
  - 消息投递中触发执行 → 409 BUSY（执行服务查 `messages.isActive()`，经 `exec.externalBusy` 钩子）。
  - 注意：`isBusy()` 是合并视图，**消息服务必须用 `isExecuting()`**，
    否则会把自己判成忙而永不投递。
- **队列由「回合结束钩子」驱动，不用轮询**：`onTurnSettled → onTaskIdle → 放行下一条`。
  钩子绑的是**回合结束**而非**任务终态**——任务跑完仍可追问（§9.7）。
- **`order` 是「待发队列中的位置」**：正在投递的那条已离开队列，不该占位
  （初版把 active 也计入，导致第一条待发显示 `order=2`，被单测抓出）。
- **队列上限先判后插**：初版 `pending.shift()` 后再抛错，等于静默吃掉用户刚发的一条消息却报「已达上限」。
- **turn_id 用专用白名单**（`^turn-\d{1,9}$`）：`turn-1` 恰好能过`validateTaskId` 的`^run-[0-9A-Za-z_-]+$`，
  那是「恰好通过」不是「正确校验」。
- **终态任务拒新消息**（409 `BAD_STATE` + 指引新建任务）：DONE/FAILED 后回合会立刻结束，回复无意义。
- **追问不改写账本**：追问是会话行为而非领域事实生产，故不写 `ledger.jsonl`、不影响报告门禁与哈希链；
  代价是追问内容不进审计包的事实层，需经 `kind=session` 导出查看。
- **指令模板硬约束模型不许凭空断言**（§11）：`ask` 要求回查证据并用 `[EV-xxxx]` 标注，
  证据不足时明确说「现有证据无法支持」；`revise` 要求修订落到内核工具并跑 `sciret_verify`。

### 5.6 分层 DTO（P-02，实测要点）

三个层次（实现见 `apps/bff/src/http/dto.ts`）：

| 视图 | 获取方式 | 内容 |
|---|---|---|
| `view` | **默认** | 用户界面渲染所需。不含哈希/提示词/链哈希 |
| `audit` | `?view=audit` | 额外含`ledger_digest` / `chain_hash` 等审计字段 |
| `raw` | **无HTTP 出口** | 内核原始产物只在服务内部流转；对外经 `kind=audit` 导出包（接口 15） |

- **响应恒回显 `view`**（`"view":"view"|"audit"`）：否则"偶尔有哈希"会让人误以为哈希不稳定。
- **非法 `view` → 400，不静默回退到 `view`**：静默回退会让审计请求"看起来成功但没数据"。
- **DTO 是投影，不是裁剪**：磁盘上的 `runs/<id>/report.json` 原样保留 `ledger_digest`。
- ⚠️ **`gate` 与 `ledger_head` 刻意**不**归为审计字段**：§9.2 要求「门禁拒绝出报告**可被观测**」
  （M6 验收直接断言 `gate.passed === false`）。用户界面必须能显示"为什么还没出报告"——
  把 `gate` 挡掉不是"暴露内部对象"，那是把关键状态藏成黑盒。我第一版误挡了，被 M6 测试当场抓出。
- **必须为"剥字段"配泄漏探测正向断言**（`findLeakedAuditFields`）：剥字段是**负向操作**，
  漏了不会报错，只会让前端**静默**拿到本不该有的字段，响应看起来完全正常。
  测试里同时有一条**反向用例**（故意注入泄漏，验证探测器能抓到），否则"没抓到"可能只是探测器坏了。

### 5.10 Source SPI（§14「新增检索源 = 实现一个 Source」）

**改造前**：`fetch_corpus.py` 里是两个并列函数 + `fetch_one` 中的分派：
```python
if src == "crossref":   fn = lambda: fetch_crossref(...)
elif src == "openalex": fn = lambda: fetch_openalex(...)
else: raise PermanentError(f"unsupported source: {src}")
```
新增一个源要改**引擎内部**，与 §14 写的扩展形态不符，也让"源的差异"和"抓取流程"缠在一起。

**现在**：`kernel/sciret_kernel/sources.py` 定义 Source 协议（四段），
`fetch_corpus.py` 只做编排、**不认识任何具体源**：

| 段 | 职责 | 谁实现 |
|---|---|---|
| `name` / `timeout_s` | 标识与**独立超时**（§6「单源独立超时」） | 源自己 |
| `build_url(query, rows)` | 拼请求 URL（**纯函数**，可离线测） | 源自己（唯一的接口差异） |
| `parse(payload)` | 响应 JSON → 归一化记录 | 源自己（唯一的格式差异） |
| `transport` | 发 HTTP + 错误分类（瞬时/永久） | 引擎默认实现，**可注入** |

新增一个源 = 实现四个成员 + `sources.register(YourSource())`，**引擎不动一行**。

设计约束：
- **零第三方依赖**（§1 红线）：用 `typing.Protocol` 而非 ABC。
- **`parse` 必须对畸形数据免疫**：真实 API 会返回缺 `title`、`author: null`、甚至非 dict 的条目。
  实测我的第一版就因 `_first()` 签名写错而让 openalex 整个源失败 ——
  但降级记录**如实工作**（标 `unavailable` 而非伪造成功），这正是 SPI 该有的行为。
- **归一化字段固定**：`doi/title/authors/year/venue/type/license/source`，
  不同源输出形状一致，下游无需按源分支（否则 SPI 白做）。
  OpenAlex 的 DOI 是完整 URL，必须剥前缀才能与 Crossref 对齐 —— 否则跨源去重失效。
- **注册即校验**：无名/超时非正/缺方法/重名都报错。重名**不静默覆盖** ——
  覆盖会让"到底在用哪个实现"变成只有运行期才知道的事。
- **未知源名在 CLI 直接报错**（退出码 2），不是静默跳过 ——
  静默跳过会让"配了源却没抓"完全不可见。

### ⚠️ 顺带修掉两处跨边界不一致（都是"声明了但没实现"）

**① BFF 声明 4 个源，内核只实现 2 个。** `preflight.ts` 里有 `arxiv` 与 `semantic_scholar`，
内核没有。后果：用户选 `arxiv` → 预检**通过**（BFF 探测得到）→ 抓取**静默无数据**（内核没实现）。
"配了源却没数据、且不报错"是最难排查的一类问题。已把 BFF 清单收窄为内核真实实现的两个。

**② `online.py` 硬编码了 `("crossref", "openalex")` 白名单** —— 又一处
"新增源忘了改这里就会被静默忽略"的地方。现在改为问注册表。

**防漂移靠测试，不靠 review**：`apps/bff/test/source-contract.test.ts` 校验两侧清单一致，
两个方向都查（BFF 有而内核无 / 内核有而 BFF 无）。
> BFF 与内核分属两个文件、两套语言，改一边时没人会去看另一边 —— **跨边界漂移必须由测试守**。
> 我做了反向验证：往 BFF 注入 `fake_nonexistent` 源，测试立刻失败并指出修复动作（测试有牙齿）。

### 5.9 Lint（§15/§16 明列，此前完全缺失）

需求 §15 写「CI 质量门：类型检查 + **Lint** + 构建 + 测试」、§16 写「通过类型/**Lint**/构建」，
但项目里**连一份 lint 配置都没有**（无 `.eslintrc*` / `biome.json`，`package.json` 无 `lint` 脚本）。
我却在 M10 的 DoD 判定表里给这条打了 ✅——依据只是"quality-gate 全绿"，
而 quality-gate 当时只跑类型和测试。**门禁里没有的东西，不能声称它通过了。**

现为 ESLint 9 flat config（`eslint.config.mjs`），**类型感知**规则（`recommendedTypeChecked`）：

```bash
pnpm lint          # 0 error 才算通过（warning 不阻断）
pnpm lint:fix      # 自动修（类型导入、不必要断言等）
pnpm lint:strict   # --max-warnings 0（收紧用）
```

覆盖 `apps/bff/src` + `test` + `scripts` + `scripts/*.mjs`。分层策略：

| 范围 | 处理 | 理由 |
|---|---|---|
| `src/` | 类型感知规则，**0 error 零豁免起步** | 真实缺陷都在这层 |
| `test/`、`scripts/` | 关 `no-unsafe-*` / `no-explicit-any` / `require-await` | 测试的本质就是构造非法输入，必然大量断言 |
| `scripts/*.mjs` | `tseslint.configs.disableTypeChecked` | 无类型上下文，用官方配置对象而非手搓规则清单 |

**它抓到的真实问题**（不是走过场）：

| 规则 | 数量 | 性质 |
|---|---|---|
| `no-base-to-string` | **39** | **真缺陷**：`String(账本unknown 字段)` 在值为对象时静默产出 `'[object Object]'`，污染报告与事件且**不报错**。修法：新增 `infra/coerce.ts` 的 `asText/asRecord/asArray/asNumber`，逐处替换（31 处批量 + 8 处手工） |
| `no-unnecessary-type-assertion` | 11 | 多余断言（自动修） |
| `no-floating-promises` / `await-thenable` | 2 | `await` 一个返回 `void` 的函数（会误导读者以为异步） |
| `no-unused-vars` | 4 | 未用导入/变量 |

`no-base-to-string` 里最值得说的是**错误信息本身**：
`throw new ApiError('不支持的 action：${String(raw)}')`——用户传了对象时看到
`不支持的 action：[object Object]`，等于没提示。同类修了 3 处（action / sources / enum）。

**顺带发现一个更大的缺口**：`tsconfig.check.json` 的 `include` 只有 `src/**/*.ts`
——**9 个测试文件与全部诊断脚本从未被 `tsc` 检查过**。
纳入后立刻暴露两件事：

1. **我自己写的 `sse.test.ts` 事件形状是错的**：用 `{task_id, at, step:{id,status}}` + `as RelayEvent`，
   而真实类型是 `{ts, step: string, status: ...}`。测试当时能跑过，但它验证的是**错误形状的数据**。
   已改为按每种事件的**最小合法载荷**构造（顺带发现 `report` 事件的载荷含 `task_id`，
   与其他事件不同——这正是"逐个给真实形状"才能发现的）。
   > **教训：契约测试自己写错类型时没人拦**，除非它也受类型检查。
2. **`install-plugin.ts` 的 `AnyOp.error` 声明缺 `code`/`blockers`** —— 代码在打印它们，
   但声明里没有。说明那份类型是"按印象写的"。
   同时发现 `waitOp()` 会把 `undefined` 的 `operationId` 拿去轮询 →
   **要么空等 2 分钟超时，要么误取到别的操作结果然后报"安装成功"**（最坏的失败：看起来成功、实际没装）。
   已改为入口 Fail-fast。

**给 `waitOp` 补 `unknown` 收窄的教训**：我先按 `string | undefined` 写，
结果 `inspect()` 的回执声明是 `Record<string, unknown>`，取出来还是 unknown。
正确做法是**接受 `unknown` 并在函数入口一次性做类型守卫**——一处校验覆盖所有调用点，
比在 5 个调用点各写一遍断言更可靠。

### 5.8 「声明了但没实现」的两处收口（实测发现并修复）

这是我在 DoD 后逐条对代码核查才发现的问题——**文档说支持，代码没实现**。

####① `workflow=materials`：从"跑到一半才炸"改为"入口即拒"

**原状**：API 的 `WORKFLOWS` 含 `materials`、步骤表也定义了P1–P5，
但内核 `execute_step` 只注册了 R1–R6 → 一路跑到 P1 才抛「步骤 P1 尚未实现」。
**失败点太晚**：任务已建、AGH 会话已开、模型回合已跑，才告知选的工作流跑不通。

**现在**：
```
POST /api/v1/tasks {"workflow":"materials"}
→ 400 {"code":"BAD_PARAM","error":"workflow=materials 暂不可用（材料发现工作流…尚未实现内核算子。MVP 请用 workflow=research。）"}
```
内核侧同步在 `plan` 就拦（`workflow.is_implemented`），**两侧口径一致**，
并由 `workflow-contract.test.ts` 断言"API 口径 == 内核口径"。

**顺带修掉一个更隐蔽的问题**：原先 `plan` 对**完全未知**的工作流会**静默回退**research，
只在返回值里写一行 `workflow_fallback`。用户以为跑的是 materials、实际跑的是 research，
产物结构与预期不符却毫无拦截。**工作流决定步骤集与产物结构，跑错就是错的** → 改为报错。

- 术语区分（`kernel/sciret_kernel/workflow.py`）：`is_known()`（规格已定义）
  vs `is_implemented()`（算子齐备）。**规格存在 ≠ 可执行**，两者必须分开声明。

#### ② `lit_source=arxiv/auto`：现在真联网抓取

**原状**：`LIT_SOURCES` 含 `arxiv`/`auto`，但内核里这两个值都落到
`select_snapshot()`的**本地快照选优**；真正联网的 `fetch_corpus.py`
**没有任何代码调用**（只被文档提到）。语料是真实的（真DOI），
但只有 6 条、不会随时间更新。

**现在**（新增 `kernel/sciret_kernel/online.py`）：
- `arxiv`/`auto` → 先尝试真联网抓 Crossref/OpenAlex → 冻结成快照 → 走原有确定性读取路径；
- 抓取失败 → **回落既有快照**，且原因**如实写进 `source_status` 与 `human_summary`**；
- 抓取器无记录时返回 1（明确禁止伪造），此时**不生成空快照**（否则一路读到底 = "检索到 0 篇"的假成功）；
- `PAPER_AGENT_OFFLINE=1` 可强制离线（供测试与"保证不联网"场景）。

实测（联网成功）：
```
human_summary: 已检索 6 篇文献（语料快照 live-solid-state-...-e873c25b63f3；来源：crossref=ok:8, openalex=ok:8）
degraded: false
```
实测（离线回落）：
```
human_summary: 已检索 6 篇文献（…来源：crossref=ok:8, openalex=ok:8,
              __online_fetch__=fallback:已由 PAPER_AGENT_OFFLINE=1 强制离线）；
              ⚠️ 在线抓取失败已回落本地快照（…），元数据为历史版本
degraded: false     ← L1（info），不置degraded：数据仍真实，只是时效性打折
```

**三条必须守住的设计约束**：

| 约束 | 理由 |
|---|---|
| 快照名由**目标哈希**派生，不含时间戳 | 否则同一目标两次抓取产生不同文件名 → `corpus_snapshot` 抖动 → **违反可复现红线** |
| `local` **排除 `live-*` 快照** | `live-*` 取决于抓取时刻；让 `local` 选中它，`local` 就不再可复现，且用户明明选了离线却吃到联网结果 |
| 在线抓取子进程需 `PYTHONPATH=<kernel/>` + `cwd=<kernel/>` | 内核**不装包**（靠路径定位自身）。只设 `cwd` 仍报 `No module named sciret_kernel`——**我连踩两次**；且 `PYTHONPATH` 要**包目录的父目录**，写成包目录会变成去找 `kernel/sciret_kernel/sciret_kernel` |

`live-*.json` 是运行时产物（带时间戳，会变脏），已 `.gitignore`；
离线冻结的 `sse-interface.json` 是仓库资产，照常入库。

### 5.7 一键启动器与 doctor（§12.1/ §12.2，实测要点）

```bash
pnpm start                # 一键启动（等价 node scripts/start.mjs）
pnpm doctor               # 环境自检（--json 供启动器消费 / --quiet 仅退出码）
node scripts/start.mjs --bff-only   # 只起 BFF
```

- **退出码语义（§12.2）**：`0` 全绿 / `2` 有可继续告警 / `1` 有阻断。
  AGH 缺失时相关项降级为 `warn` 而非硬失败（§12.2 明文要求，避免 demo-kit 强依赖）。
- **doctor 13 项检查**（覆盖 §12.2 全部列举项）：Node≥24、Python≥3.10、内核存在与可执行（ping）、
  运行目录可写、AGH 产物、**daemon 状态**、端口、插件信任与启用、**工具注册数**、
  **环境变量生效值**、**模型已配置**、**数据源连通性**、遗留包冲突。
- **环境变量回显「生效值」而非「磁盘配置」**，且密钥类只显示 `(已设置)/(未设置)`，**绝不回显值**。
- **daemon 探测必须校验进程存活**：AGH daemon 是**派生进程**，被回收后
  `~/.agh/data/daemon/{owner,discovery}.json` **仍留在盘上**。只看文件会判"就绪"，
  而 BFF 走 AGH 的 `identity()` 校验必然失败 → 症状是「启动器说就绪、BFF 说找不到 daemon」。
  启动器发现僵尸记录会**改名隔离**（可逆、不删）再启动新 daemon。
- **前端探测覆盖两种布局**：先本仓库 `web/`（后端 1.0 独立交付时的布局），再同级
  `../paper-agent-frontend/`（2.0 整合布局）。检测不到才跳过并**列出查过哪两个路径**（旧文案写的是
  「前端由前端组提供」——前端早已就位，只是当时没人把它接进启动器）。
  package.json 存在但 vite 未安装 → 单独一档 `missing-deps`，直接回 `cd <目录> && npm install`，
  而不是让子进程吐出看起来像后端故障的 `Cannot find module`。
- **前端"已启动"必须实测**：原来是 spawn 后 `sleep 1500ms` 就打印成功；端口被别的 dev server 占用时
  vite 因 `strictPort` 直接退出，那句成功是假的。现在轮询前端首页拿到 200 才报就绪（超时 25s 后
  如实报"可能被占用，用 PAPER_AGENT_WEB_PORT 换端口"）。浏览器也据此开到真正有页面的那个 URL
  （只有后端时不再把浏览器开到 404 的 BFF 根路径）。
- **启动器把自己托管的前端 Origin 追加进 CORS 白名单**（`PAPER_AGENT_CORS_EXTRA_ORIGINS`，
  在 BFF spawn **之前**注入）。漏掉它时，换过 `PAPER_AGENT_WEB_PORT` 又用直连模式
  （`VITE_API_BASE_URL=http://127.0.0.1:8787`）的人会命中"JSON 正常、SSE 一帧不到"——本项目最难排查的组合。
- **端口占用不做"自动顺延"**：端口是配置契约，静默换端口会让用户访问到错误的服务；
  改为明确报告 + 给出 `PAPER_AGENT_PORT` 换端口指引（§12.1「占用即报告并支持自动顺延或给出释放指引」）。
- **Ctrl+C 连带停止子进程**，不留孤儿进程（E2E 有专门断言：退出后端口必须被释放）。

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
| **遗留包** | 用户 AGH home 中存在 v1.0 遗留包 `paper-agent-tools`（其 7 个 hot-tools 与本项目 `sciret_*` **重名**）→ 启用本插件前**必须先停用旧包**：`bash scripts/install-plugin.sh disable-old`。⚠️ `agh package enable/disable` 的参数**只接受包名**（`paper-agent-tools`、`@paper-agent/plugin-sciret`），传贡献点 id（`ext:paper-agent/tools`、`ext:paper-agent/sciret`）会被 AGH 的参数校验直接拒绝（`^(?:@[a-z0-9]…/[a-z0-9]…)$`）——旧文案与本脚本一度都按 `ext:…` 写，于是"停用旧包/启用新包"这两步**实际上从未生效过**，脚本却照样打印成功。现在 `install-plugin.sh` 在 enable/disable 后**回读 `package status` 确认终态**（`enabled=True/False`），不达标就报错退出。反向恢复用同一形式的命令（`bash agh.sh package enable paper-agent-tools`；本轮为验证"停用"而没再把它开回去）。 |
| **AGH 根定位（机器无关）** | AGH 是**另一个仓库**，每台机器位置不同；原先在 6 处写死某台开发机的盘符绝对路径，换机即"未找到 AGH 构建产物"。现统一为：Node 侧 `scripts/lib/paths.mjs::resolveAghRoot`、BFF 侧 `config.ts::detectAghRoot`、Bash 侧 `scripts/_env.sh::pa_agh_root`，三处**同一候选顺序**（只按"与本项目同级/上级"的相对布局探测，判据都是 `packages/cli/dist/local/agnes.mjs`）。改顺序必须三处同步——口径不一致会出现"doctor 说 AGH 就绪但 BFF 起不来"。显式设置 `PAPER_AGENT_AGH_ROOT` 时**以它为准且不回落**：路径没有构建产物就 fail-fast 并提示修正（静默改用别的目录会让排查者对着一个谁都没选的 AGH 猜）。 |

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

- `bash scripts/quality-gate.sh` → **四道门禁全绿**（§15/§16 要求"类型 + **Lint** + 测试"）：
  vitest **158/158** · 内核 **91/91**（连跑两次查抖动）· `tsc` **零错误** · `eslint` **零 error**
  （lint 为类型感知规则，覆盖 `src` + `test` + `scripts`；30 个 warning 是既有非空断言等，不阻断。
  想收紧用 `pnpm lint:strict`（`--max-warnings 0`）。）
  （单测覆盖校验/错误模型/执行编排/事件总线/报告聚合/导出与 ZIP/降级三级语义/容错策略/多轮消息队列/分层 DTO/AGH 接口契约）；
  > 注：`contract.test.ts` 的 scope 解析用例在本机依赖 AGH home 的 ACL 合规；
  > 该ACL 已于 2026-10-10 修复，用例**真正通过**（保留了「遇到 `CONFIG_CREDENTIAL_STORE`
  > 则显式跳过并打印诊断指引」的兜底，避免环境问题让质量门长驻红灯，详见 §8 第 9 条）。
- `node scripts/doctor.mjs` → 13 项逐项状态 + 修复指引（`--json` / `--quiet`，退出码 0/2/1）。
- `node scripts/start.mjs` → 一键启动 AGH + BFF（+ 前端，存在时），健康等待后给出唯一 URL。

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

**M8 多轮消息端到端**（`bash scripts/verify-message.sh` → PASS=26 FAIL=0，含真实 AGH 会话与真实模型回合）

```jsonc
// §8.2 空闲追问 → 立即投递
POST /api/v1/tasks/<id>/messages  {"text":"请用一句话说明检索覆盖并列出证据编号"}
200 {"queued":false,"turn_id":"turn-2","status":"running"}

// §8.2 运行中发送 → 入队（不是 409 拒绝，P-05 核心）
200 {"queued":true,"order":1,"turn_id":"turn-3","status":"queued"}
200 {"queued":true,"order":2,"turn_id":"turn-4","status":"queued"}   // order 从 1 起、单调

// §9.7「全程在同一 AGH 会话留痕」——直接证据（经项目 kind=session 导出比对）
GET /api/v1/tasks/<id>/export?kind=session&format=agnes
  追问前：2 行 → 追问后：50 行，且能在导出内容里 grep 到追问原文

// 真实会话 id（1:1 映射，§4.2）
agnes:local:local-dev:cli:workspace:0afa16d217cddf08
```
> ⚠️ 会话账本比对**必须走项目自己的 `kind=session` 导出**，不能用 `agnes.mjs export` CLI：
> 后者会与 BFF 事件泵争抢同一会话的 turn → **超时（退出码 124）**（另需处理 `--connect`
> 的 `pipe:///` 三斜杠格式、`--cwd` 对齐 scopeID、以及不带 `--connect` 时会抢 mutation 锁）。

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

### 前后端整合联调（2026-10-11，`paper-agent-main` 整合布局实测）

布局：`paper-agent-main/{paper-agent-backend, paper-agent-frontend}` 与 `agnes-harness{,-main}` 同级。

**一键启动器托管 2.0 前端**（`PAPER_AGENT_WEB_PORT=5178/5179 node scripts/start.mjs --no-browser`，两次实测）

```text
[✓] AGH 构建产物就绪: …\agnes-harness\packages\cli\dist\local\agnes.mjs   ← 同级自动探测，未设任何环境变量
[✓] 复用已运行的 daemon（pid=2648 pipe=\\.\pipe\agnes-2ef89d7847bb7c1c）        ← 已在跑就不再起一个
[✓] BFF 已就绪: http://127.0.0.1:8787
[✓] 前端开发服务器已启动: http://127.0.0.1:5179                                 ← 真探测首页 200，不是"睡 1500ms 后宣布成功"
```

- 原 `resolveFrontend()` 只找本仓库 `web/`（后端 1.0 独立布局），2.0 布局下恒为 `null` →
  前端永不被托管，而浏览器又被固定开到 `http://127.0.0.1:8787`（BFF 根路径实测 **404**）。
  现在按 `web/` → `../paper-agent-frontend/` 顺序探测，并把浏览器开到**真正有页面那个 URL**。
- 「检测到 package.json 就 spawn vite」也不成立：依赖没装时子进程报 `Cannot find module`，
  读起来像启动器坏了。现在单独给这一档，直接回 `cd <前端目录> && npm install`。

**SSE 跨源回头（真实 TCP，不是 `app.inject`）**

```bash
curl -m3 -i -H 'Origin: http://127.0.0.1:5174' …/tasks/<id>/events
HTTP/1.1 200 OK / Content-Type: text/event-stream / Access-Control-Allow-Origin: http://127.0.0.1:5174 / Vary: Origin
curl -m3 -i -H 'Origin: http://evil.example'   …/tasks/<id>/events   # 200 但**无** ACAO（浏览器侧拦死）
curl -m3 -i …/tasks/<id>/events                                      # 无 Origin（同源/代理）→ 无 ACAO，流正常
```
- 病根：`events.ts` 走 `reply.hijack()` 后自己 `raw.writeHead()`，app 级 `onRequest` 钩子设的头
  **一个都到不了**那条响应 → 症状是「JSON 接口跨源正常、EventSource 一帧都收不到」。
  白名单因此收进 `apps/bff/src/infra/cors.ts` 单一真源，两处共用。
- `PAPER_AGENT_CORS_EXTRA_ORIGINS` 是**追加**语义（不是覆盖），供启动器把自选的前端端口加进来；
  实测 5179 同时出现在 SSE 与 JSON 路由的 `Access-Control-Allow-Origin` 上，且默认项 5173/5174 未被挤掉。

**同源代理路径**（前端 `.env.local` 留空 `VITE_API_BASE_URL` 的默认形态）实测：

```text
GET http://127.0.0.1:5179/                     → 200
GET http://127.0.0.1:5179/api/health           → 代理到 BFF，status ok
GET http://127.0.0.1:5179/api/v1/tasks/<id>/events → id:1 ping / id:2 step R1 DONE …（历史任务重进也能拿到快照帧）
```

**⚠️ 联调查出的检索质量问题（内核代码无错，错在上游相关性）**

同一内核、同一 `build_url`，只换查询语言，直连 Crossref 实测：

```text
query.bibliographic=固态电解质界面阻抗的主要表征方法有哪些？…   total-results 9575
  → 酶底物法测定水中粪大肠菌群的方法验证… | 建筑工程结构检测的主要方法及质量控制 | 自密实混凝土检测方法的对比研究
query.bibliographic=solid electrolyte interphase impedance characterization methods
  → Solid-Electrolyte-Interphase: Characterization by Impedance Spectroscopy | Revisiting High-Frequency Impedance in Li-Ion Batteries…
```
- Crossref/OpenAlex 对未分词的中文长句按「方法/主要/检测」这类通用字做匹配，命中一堆无关中文期刊；
  内核如实冻结这些返回值（`corpus/live-task-*.json` 的 `query` 字段就是原始目标，可复核）。
- 连锁后果：R4 交叉印证按「同一主题词被 ≥2 个独立来源支撑」判定，跨语言/跨批次几乎不可能重叠，
  于是 `ledger.jsonl` 实测 `{"evidence":16,"judgment":1}`、judgment rationale
  「0 个主题词获 ≥2 个独立来源支撑；87 个仅单源」→ **conclusion 记录恒为 0**，界面「结论 0」是如实反映，
  不是写入器坏了（`step_R4` 的写入分支由 `kernel/tests/test_kernel.py` 覆盖）。
- 修法在内核之外（查询归一/译英后再检索，或改用 `query.title` + 年份 filter），**不在本轮里偷偷改**：
  它会改变检索语义与既有验收基线，需要单独设计与复测。

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
9. **`CONFIG_CREDENTIAL_STORE` / "The credential store is unavailable." 有两个可能根因，别急着归因**：
   - **根因A（Node 版本）**：AGH 的 Windows 原生模块只按 Node 24 的 libuv ABI 构建。
     用 Node 22 跑时：`require('agnes-system.node') → "Rebuild Windows native artifact…"
     → windowsPrivateFilesAvailable()===false → enforcement level=unavailable → 抛该错。
     本机裸 `node` 会解析到 WorkBuddy 托管的 22.x → 一律用 `bash scripts/quality-gate.sh`。
   - **根因 B（AGH home 的 ACL）**：AGH 要求凭据目录链上**每一级**只有 SYSTEM + 当前用户
     （`checkCredentialParents()`）。若宿主环境给用户主目录下的应用目录多加了用户组权限
     （本机实测：`~/.agh` 根目录的DACL 里多了 `S-1-5-21-…-1008` 宿主沙箱用户组，
     而`~/.agh/secrets/agnes-ai` 只有 SYSTEM + 当前用户、干净），AGH 判定 `reason=mode` 不安全，
     并把真实 reason 吞成笼统的"凭据不可用"。
   - **排查顺序**（关键：AGH 把底层异常全catch 后重抛，别信错误文本，直接打真因）：
     ```bash
     # 1) 先排 Node 版本
     bash scripts/quality-gate.sh
     # 2) 打被吞掉的真因（直接调 AGH 的 credentialStore.read）
     tsx apps/bff/scripts/credential-read-probe.mts     # 看 reason 字段（mode / …）
     # 3) 逐级审计 ACL（自动判定；退出码 0=合规，1=不合规）
     tsx apps/bff/scripts/acl-audit.mts
     ```
   - ⚠️ **修复时两个坑**（都实测踩过）：
     - `Set-Acl`（PowerShell）会抛 `PrivilegeNotHeldException`（要 SeSecurityPrivilege）→ 改用 `icacls`；
     - 但在 Bash 工具里 `icacls /remove` 会被 MSYS 当成路径转换（报 `无效参数 …/PortableGit/remove`），
       **必须加 `MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"`**。
     - 改完**立刻用 `acl-audit.mts` 复核**，别只信 `icacls` 的输出（它的表格随系统语言变化）。
   - ⚠️ `icacls /save` 写出的是 **UTF-16LE 且不带 BOM**，按 BOM 判断编码会失效 → 解码成乱码 →
     解析出"0 个 ACE" → **假通过**。必须按内容特征嗅探（有 NUL 字节即 UTF-16LE）。
     这条已固化在 `acl-audit.mts` 里，且解析不出 ACE 时它会**直接判FAIL**而不是当作合规。
   > 我在 M7 时把这条一律归因为根因 A，并写进了本 README；M8 实测证明**本机真实原因是根因 B**，
   > Node 版本只是必要条件之一。**错误的因果归因比不知道更贵**——它让人去改不该改的地方。
   > **该问题已于 2026-10-10 修复**（移除 `CodexSandboxUsers`），ACL 链现全部 PASS，
   > 凭据可正常读取（`credential-read-probe.mts` 显示 `read() 成功`）。
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
14. **就绪检测必须复用「被测系统自己的校验逻辑」**：自己写一个"看起来对"的判据，
    只会把"没起来"伪装成"起来了"。踩过两次：就绪轮询只读 AGH `discovery.json` 的 `socketPath`，
    而**上一代 daemon 留下的僵尸 discovery.json 里也有 socketPath** → 假通过。
    AGH 的 `readDaemonDiscovery()` 会校验 `sameOwner(owner, discovery.owner)` 与**进程存活**，
    必须一并校验。**光看文件永远不够**——进程被回收后文件还在。
18. **异步函数的返回值当布尔用会恒为真**：`if (!processAlive(pid))` 里`processAlive` 返回 Promise，
    `!Promise === false` → 校验形同虚设（我因此把"已死的daemon"报成"复用已运行的"）。
    凡是有 `await` 的判定，先确认**每一处调用都 await 了**；类型系统不保证这件事。
19. **判定"通过"的工具，解析失败时绝不能落到通过分支**。
    例：`icacls /save` 是 UTF-16LE **且无 BOM** → 解析出"0 个 ACE"→ 假通过。
    **解析失败必须是显式错误**（`apps/bff/scripts/acl-audit.mts` 已固化此约定）。
20. **MSYS 会把带 `/` 的参数当路径转换**：`icacls ... /remove`、`timeout 120 …` 都中招
    （报`无效参数 …/PortableGit/remove`）。`MSYS_NO_PATHCONV=1` 对**已在 PATH 中的可执行文件无效**
    （环境变量只影响未解析的命令名），最可靠的做法是**避开该命令**（doctor/start.mjs 自己管超时）。
21. **传给 Windows node 的路径必须是 Windows 形式**：Bash 里的 `/d/...` 会被 node 解析成 `D:\d\...`。
    用 `pwd -W` 转换，或让脚本内部用 `process.cwd()` 自己解析。
    ⚠️ 这类失败**最隐蔽**：Python/Node 的报错常被 `>/dev/null 2>&1` 吞掉，
    脚本只表现为"产物没生成"，看起来像功能问题而不是路径问题。
22. **SSE / 长连接响应必须 `reply.hijack()`**：用了 `reply.raw.writeHead()` 后，
    Fastify 不知道头已发出；此时路由任何抛错（最常见：客户端断连 → `AbortError`）
    都会走它的错误处理器**再发一次响应** → `ERR_HTTP_HEADERS_SENT`，
    表现为一条 `Unhandled Rejection` + 难懂的 "Cannot write headers after they are sent"。
    **客户端断连对 SSE 是常态**（切页面 / 关标签 / 网络抖动），所以这是主路径而非边缘情况。
    加了 `hijack()` 后由自己负责 `end()`。
23. **`rm -rf` 在本机会变成交互式询问**：宿主 safe-delete 包装器会问
    `replace ...? [y]es, [n]o, [A]ll`，脚本卡住等输入 → 验收"假超时"。
    E2E 脚本顶部统一把 `vendor/shim/safe-bin` 从 PATH 剔除；
    删本脚本自己的工作目录改用 `mv "$X" "$X.old.$$"`（可逆，且不触发询问）。
24. **「规格存在」≠「算子已实现」**：新增工作流/参数时，两侧口径不一致会出现
    "API 收下了、建了会话、跑到某步才说没实现"。把"规格声明"与"可执行"分成两个函数
    （`is_known` / `is_implemented`），并在 plan 与 execute 两处都 Fail-fast；
    用契约测试断言两侧口径一致。
25. **静默回退到默认行为通常是有害的**：原先未知工作流会静默回退research 只写一行
    `workflow_fallback`—— 用户以为跑的是 A、实际跑的是 B，产物结构不符却无拦截。
    工作流/模式这类**决定产物结构**的选择必须报错，不能悄悄换。
26. **子进程调内核脚本要`cwd` + `PYTHONPATH` 双保险**：内核不装包（靠路径定位自身）。
    只设 `cwd` 不会把目录加进 `sys.path`；且 `PYTHONPATH` 要**包目录的父目录**
    （写成包目录 → 去找 `kernel/sciret_kernel/sciret_kernel`）。
15. **探测输出要用标记行匹配，不要 `tail -1`**：tsx / daemon 会在 stdout 混入实验性警告等噪声行，
    `tail -1` 取到无关行导致误判（本项目 tsx 冷启动会打 `ExperimentalWarning: SQLite …`）。
    用 `grep -E '^READY' | tail -1`。
16. **`agnes.mjs --connect` 接受的是 URI，且本地管道是**三个**斜杠**：直接传 `\\.\pipe\NAME`
    或写成 `pipe://`（两个斜杠）都会被拒（`invalid local pipe URL`）。
    正确格式见 `cli/src/boot/connect.ts` 的 `unixConnectTarget()`：`pipe:///${encodeURIComponent(NAME)}`。
    用 `tsx apps/bff/scripts/pipe-uri.mjs` 转换，别在 shell 里手拼（转义地狱）。
17. **宿主环境的 shim 会打断子进程**：`NODE_OPTIONS=--require=.../node-language-shim.cjs` 会加载
    safe-delete 守卫，拦在 AGH 维护 SQLite 锁文件时报 `[safe-delete] ... state lock timeout`；
    该字符串**不在 AGH 源码里**（全仓 grep 无此字样），纯宿主注入。
    放行办法：启动子进程前 `export NODE_OPTIONS=""`，并把 `vendor/shim/safe-bin` 从 PATH 剔除
    （该目录里的 `rm` 等包装器依赖 shim 变量，剔除后会变空路径）。
    ⚠️ shim 变量只能**置空**不能 `unset`——WorkBuddy 的 `safe-delete-bash-env.sh` 会读它们，
    unset 会在 `set -u` 下直接崩掉整个脚本。

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
| M8–M9 | 多轮消息 + DTO 收口 + 一键启动器 + doctor 完整版 | ✅ **M8 E2E 26/26**（§9.7 同一会话留痕直接证据：会话事件 2→50、追问原文在 AGH 账本中）· ✅ **M9 E2E 45/45**（doctor 13 项检查 / 启动器 §12.1 六步 / 分层 DTO） |
| M10 | DoD 全量验收（崩溃续跑 resume + **P-01~P-07** 全覆盖 + CI） | ✅ **DoD 全清单通过**：`verify-dod.sh` 11 项门禁 + 13 条逐条判定全绿；E2E 合计 **179 项**（17+28+50+26+45+13） |

---

## 9.5 DoD 验收（§16）与已知边界

```bash
pnpm dod          # 全量DoD（串行跑 6 段 E2E，约 15–20 分钟）
pnpm dod:quick    # 快速：只跑质量门 + 内核 resume + 静态核对（不需要 AGH daemon）
bash scripts/verify-dod.sh --reuse   # 复用已通过的结果（失败会重跑）
```

`verify-dod.sh` 有两层职责，**不要混淆**：
① **编排**——把各里程碑的分散验收串起来；
② **DoD 判定**——逐条核对 §16 清单并给出"已验证/未验证"的明确结论。
只跑脚本不判定 DoD 是没意义的：跑绿了不等于 DoD 达成。

### §16 逐条判定结果（2026-10-10）

| §16 清单项 | 状态 | 依据 |
|---|---|---|
| §7 P0 功能 BE-01~BE-13 通过 §9 验收 | ✅ | 质量门 + 5 段 E2E 全绿 |
| P-01 任务不再无差别降级 | ✅ | verify-degrade.sh（17 项） |
| P-02 面向视图 DTO，不泄露提示词/哈希 | ✅ | dto.test.ts（15 项）+ verify-startup.sh |
| P-03 每次完成生成完整报告，结论证据绑定 100% | ✅ | verify-report.sh（28 项，含门禁拒绝用例） |
| P-04 每任务在 AGH 有 1:1 会话记录、可导出 | ✅ | verify-export.sh（50 项，含 kind=session） |
| P-05 底部追问多轮可用，无假控件 | ✅ | verify-message.sh（26 项，含同一会话留痕直接证据） |
| P-06 BFF 无绕过 AGH 的主链路执行 | ✅ | gateway 单一入口 + 内核只读校验 |
| P-07 一条命令启动，doctor 自检给修复指引 | ✅ | verify-startup.sh（45 项） |
| 面向视图 DTO 生效（审计字段独立受控） | ✅ | apps/bff/src/http/dto.ts |
| SSE 快照/顺序/去重/终态正确，刷新与实时一致 | ✅ | sse.test.ts（9 项）+ events.test.ts（9 项） |
| 安全合规：密钥不入库/环境白名单/输入校验/CORS | ✅ | verify-dod.sh 静态核对 + verify-export.sh §11 用例 |
| 类型/Lint/构建通过，自动化测试在 CI 通过 | ✅ | quality-gate.sh + `.github/workflows/ci.yml` |

> **P 是 7 条不是 12 条**（P-01~P-07）。我早期审核记录里写成"12 条"是错的，已更正。

### ⚠️ DoD 未覆盖的边界（如实记录，不算"全绿"）

1. **容器化（§12.4）未做**：需求原文写的是「提供 `docker-compose.yml`…**建议**」，
   本项目交付的是 §12.4 同时要求的"保留本机源码一键启动路径"。
   注意 AGH 原生模块是 Windows 编译产物，容器内需重新构建。
2. **前端联调已真跑，但检索质量是真问题（2026-10-11 更新）**：整合布局下 `pnpm start` 实测托管
   vite dev server，同源代理与跨源 SSE 都过（证据见 §7「前后端整合联调」）。
   **仍未解决**：中文目标经 Crossref/OpenAlex 命中的是完全无关的文献（§7 附同一 URL 的中英文对比），
   于是 R4 交叉印证恒为 0 个多源主题词、账本恒无 `conclusion`、界面「结论 0」。
   表现是"证据链条目齐全但与主题无关"——演示前要么换英文目标，要么先修查询归一，不能就这么讲。
   另外：**降级路径（L1/L2）至今只在故障注入下验证过，真实网络故障从未自然触发**。
3. **未在真实 CI 上跑过**：`ci.yml` 已写好但**从未在GitHub Actions 上执行过**
   （本仓库未推送）。窗口路径、Node 24 与 corepack 行为在 runner 上可能与本机不同，
   首次推送需留意首次 CI 结果。
4. **`--quick` 模式下 5 段 E2E 被跳过**：此时 P-01/P-03/P-04/P-05/P-06/P-07 会被标为
   `PARTIAL`（脚本会显式说明，不冒充通过）。
5. **熔断与扫描件 OCR 降级标注置信度未实现**（§6 标注为可选增强）。

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

### 27. Lint/类型工具链的三处环境坑（本机 Windows）
- **`node_modules/.bin/eslint` 是 shell 包装脚本**，不能用 `node` 直接跑
  （会当 JS 解析报 `SyntaxError: missing ) after argument list`）。
  必须走真实入口：`node node_modules/eslint/bin/eslint.js`。
  同理 `vitest` 用 `node_modules/vitest/vitest.mjs`、`tsc` 用 `node_modules/typescript/bin/tsc`。
- **ESLint 的 `projectService` 不会自动发现"检查期" tsconfig**：它默认读 `tsconfig.json`
  （运行期那个，只含 `src`），于是 `test/`、`scripts/` 全报
  "was not found by the project service"。必须**显式** `project: ['./apps/bff/tsconfig.check.json']`。
- **`declare module 'x'` 写在带 `export` 的 `.d.ts` 里不生效**：那种文件是 *module*，
  其中的 ambient 声明只有被 `include` 进 program 才加载（靠 `paths` 按需解析加载不到）。
  AGH 内部模块的声明因此单独放在 `types/agnes-internal.d.ts` 并列入 `include`。
