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
│   │   └── routes/              # health + /api/v1/tasks
│   ├── types/                   # AGH 最小类型声明（见 §6 说明）
│   ├── test/                    # 单测 + 契约测试（15 个）
│   └── scripts/                 # 集成诊断脚本（spike-*）
├── plugin/sciret/               # AGH 插件（sciret_* 工具薄壳）
├── kernel/sciret_kernel/        # Python 确定性内核（标准库）
├── scripts/doctor.mjs           # 环境自检（--json / --quiet，退出码 0/2/1）
├── runs/                        # 运行产物（git 忽略）
├── data/task-index.json         # 任务索引（git 忽略）
└── agnes-api-key.txt            # 密钥（git 忽略，绝不入库）
```

---

## 3. 快速开始

```bash
# 0) 依赖（Node ≥ 24.10）
corepack pnpm install

# 1) 环境自检（诊断 + 人类可读修复指引）
node scripts/doctor.mjs
node scripts/doctor.mjs --json     # 供启动器消费

# 2) 启动 AGH daemon（AGH 是执行底座）
node "D:/agnes-harness-main/packages/cli/dist/local/agnes.mjs" daemon start

# 3) 启动 BFF
pnpm dev:bff                        # http://127.0.0.1:8787

# 4) 冒烟
curl -s http://127.0.0.1:8787/api/health
curl -s -X POST http://127.0.0.1:8787/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -d '{"goal":"检索并综述固态电解质界面阻抗的表征方法","workflow":"research","lit_source":"local"}'
```

> Windows 下 curl 若被系统代理劫持，加 `--noproxy '*'`。

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
| 5–8 | POST | `run-all` / `step` / `resume` / `stop` | ⏳ M3 |
| 9 | GET | `/events`（SSE） | ⏳ M4 |
| 10–11 | GET | `/report` / `/report.md` | ⏳ M6 |
| 12–13 | GET | `/evidence` / `/cite` | ⏳ M6 |
| 14 | POST | `/messages` | ⏳ M8 |
| 15 | GET | `/export` | ⏳ M7 |

错误码全集已实现（`{error, code}` 统一体、状态码映射、人类可读修复指引并入 `error` 文本）：
`BAD_GOAL / BAD_BODY / BAD_PARAM / BAD_ID / NOT_FOUND / NO_REPORT / BUSY / BAD_STATE / NOT_READY / SESSION_ERROR / CLI_ERROR / EXPORT_ERROR`。

---

## 6. AGH 集成要点（实测结论，避免重踩）

| 结论 | 说明 |
|---|---|
| **连接方式** | Windows 走**命名管道**（`\\.\pipe\agnes-*`）：`resolveDaemonScope` → `readDaemonDiscovery` → `unixTransport({path, resolveServerIdentity})` + `auth:{kind:'local'}`。与 AGH CLI 同一路径。 |
| **管道必须带可信身份** | 创建 unix transport 时若不提供 `resolveServerIdentity`，Windows 下**构造即抛错**（`Windows pipe requires a verified server identity`）。每次连接尝试都重新读取发现文件，不缓存过期 pid。 |
| **工作区必须先注册** | `session.new` / `session.load` 传入的 `cwd` **必须先 `workspace.add(cwd)`**，否则返回 `SEMANTIC_REJECTED (-32011)`。 |
| **会话 cwd 决定会话键** | 会话 id 形如 `agnes:local:<profile>:cli:workspace:<hash>`，hash 由 cwd 派生。**reattach 必须传同一个 cwd**（本项目为 `runs/<task_id>`），否则同样 `SEMANTIC_REJECTED`。 |
| **事件词汇** | AGH 账本事件类型为 `session/start`、`turn/start`、`step/start`、`assistant/message`、`step/end`、`turn/end` 等；M4 的 Event Relay 负责映射到本项目 9 类事件。 |
| **导出复用 AGH 原生** | `agnes export <session_id> --format agnes -o x.jsonl` 实测可用（已产出事件 JSONL）。 |
| **⚠️ 已知问题** | `agnes sessions`（列表/`--json`）在当前 home 上返回 `INTERNAL_ERROR RESULT_INVALID`——**AGH 侧投影问题，非本项目缺陷**（会话本身已正常写入 `sessions.db`，且 `export`/`load` 均可用）。红线要求不得改 AGH 源码，故记录在案并通过 `session.load` + 本任务索引 + `export` 作为"可核对/可导出"证据路径。 |
| **遗留包** | 用户 AGH home 中存在 v1.0 遗留包 `paper-agent-tools`（`ext:paper-agent/tools`，7 个 hot-tools）。本项目新插件 id 为 `ext:paper-agent/sciret`，**不冲突**；启用前请确认未与旧包工具重名。 |

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
- `npx vitest run` → **15/15 通过**（校验/错误模型单测 + AGH 接口契约测试）；
- `npx tsc -p apps/bff/tsconfig.check.json` → **零错误**；
- `node scripts/doctor.mjs` → 逐项状态 + 修复指引（`--json` / `--quiet`，退出码 0/2/1）。

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

---

## 9. 里程碑进度

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M0 | BFF 骨架（配置/日志/错误模型/校验/CORS/版本前缀）+ health + doctor | ✅ |
| M1 | AGH 会话网关（连接/发现/管道身份/工作区注册）+ 任务服务 + Task↔Session 1:1 映射 + preflight | ✅ |
| M2 | sciret 插件工具集 + Python 内核（状态机/证据账本/流水线/报告装配） | 🟡 主体完成（内核 + 9 个工具 + 真实语料 + 报告门禁已实测；AGH 内真实调用待 S4 专项） |
| M3–M4 | 执行编排（run-all/step/resume/stop、互斥、终态收敛）+ Event Relay（SSE、快照、Last-Event-ID） | ⏳ |
| M5 | 降级治理（L0/L1/L2、覆盖策略、重试/超时/受控并发） | ⏳ |
| M6–M7 | 报告聚合 + 证据只读/cite + 导出三件套 | ⏳ |
| M8–M9 | 多轮消息 + DTO 收口 + 一键启动器 + doctor 完整版 | ⏳ |
| M10 | 单测/集成/契约/E2E + DoD 验收 | ⏳ |

---

## 10. 诊断脚本

```bash
cd apps/bff
npx tsx scripts/spike-gateway.ts                       # 全链路：发现→握手→建会话→订阅→prompt
npx tsx scripts/spike-load.ts "<session_id>" "<cwd>"   # reattach：load + 历史事件读取
```

> 注意：本项目沙箱每次调用为独立进程组，**后台进程不跨调用存活**。集成验证需在**同一次调用内**完成 `daemon start` → BFF → 断言。
