# paper_agent

Paper Agent 2.0 —— 可审计、可复现、证据可溯源的科研智能体工作台。

> 2026 江苏省 AI+科学与工程创新实践黑客松参赛作品 ｜ 队伍：你说的都队（U046）
> 后端 + 前端整合仓库；AGH 作为**外部运行时依赖**引入，不纳入本仓库。

## 目录结构

```
paper_agent/
├── paper-agent-backend/   # 后端（pnpm monorepo：apps/bff + kernel + plugin/sciret）
├── paper-agent-frontend/  # 前端（React 18 + TypeScript + Vite）
├── start.bat              # 一键启动入口（Windows）
├── 后端需求文档.md         # 需求文档（§1–§16）
└── 前端需求文档.md
```

**AGH（Agnes Harness）是本仓库之外的独立上游项目**（Apache-2.0），作为运行时执行底座引入，**不纳入本仓库版本控制**（根 `.gitignore` 已忽略 `agnes-harness/`）。

## 环境要求

| 组件 | 版本 | 说明 |
|---|---|---|
| **Node.js** | **≥ 24.10** | 硬约束。AGH 原生模块按 Node 24 libuv ABI 构建，Node 22 会以误导性错误失败 |
| **pnpm** | **10.34.5** | 后端与 AGH 使用；Node 24 自带 corepack，可 `corepack enable` 启用 |
| **npm** | 任意近期版本 | 仅前端使用 |
| **Python** | **≥ 3.10** | 检索内核（`kernel/sciret_kernel/`）仅用标准库、零第三方依赖；启动器自动探测，亦可用 `PAPER_AGENT_PYTHON` 显式指定 |
| VS Build Tools（含 C++ 工作负载） | — | 仅当需要从源码构建 AGH 时（Windows） |

## 前置：准备 AGH 运行时（外部依赖）

AGH 不在本仓库内，需单独获取并构建一次。源码仓库：`https://github.com/AgnesAI-Labs/agnes-harness.git`（Apache-2.0）。

```
# 1) 克隆到本仓库根目录下（被 .gitignore 忽略，不入库）
git clone https://github.com/AgnesAI-Labs/agnes-harness.git
cd agnes-harness

# 2) 安装依赖并构建本地运行时
pnpm install --frozen-lockfile
pnpm --filter @agnes/cli build:local

# 3) 就绪判据：存在 packages/cli/dist/local/agnes.mjs
```

> - 后端 BFF 以 `link:` 引用 AGH 的 TypeScript 源码包（`@agnes/sdk`、`@agnes/daemon` 等），依赖 AGH 侧 `pnpm install` 生成的 workspace 链接——**AGH 依赖漏装时，BFF 会以 `ERR_MODULE_NOT_FOUND` 崩溃**（启动器已在启动前预检并给出提示）。
> - AGH 放在本仓库根目录 `agnes-harness/` 即可被自动探测；放别处请用环境变量 `PAPER_AGENT_AGH_ROOT` 显式指定（判据：`packages/cli/dist/local/agnes.mjs` 存在）。
> - Windows 从源码构建需先跑 `agnes-harness/.github/scripts/prepare-windows-native.ps1` 准备 Node 头文件（见 AGH 官方文档）。

## 一次性依赖安装

```
cd paper-agent-backend
pnpm install

cd ../paper-agent-frontend
npm install
```

## 启动

### 方式一：脚本一键启动（推荐）

仓库根目录的 `start.bat` 封装官方启动器 `paper-agent-backend/scripts/start.mjs`，一次编排全部服务（AGH 产物探测 → daemon serve → AGH Web serve → BFF → 前端 → 健康等待 → 打开唯一 URL）：

```
start.bat                      # 全栈：AGH daemon + AGH Web + BFF + 前端
start.bat --no-browser --json  # 不开浏览器 + 机器可读步骤报告
start.bat --bff-only           # 只起 BFF（跳过 daemon、AGH Web 与前端）
```

- **AGH Web**（默认 `http://127.0.0.1:4177`）可观察 AGH 的真实调用与会话轨迹；端口占用或启动失败仅提示、不阻断主链路，可用环境变量 `AGH_WEB_PORT` 改端口。
- 脚本自动选择本机合规 Node，并在启动前预释放所需端口。
- 停止：在启动窗口按 `Ctrl+C`（一并停止所有子进程）。

### 方式二：手动分步启动（四个终端，命令为 CMD 形态）

> 首次使用前先完成《前置：准备 AGH 运行时》与《一次性依赖安装》。若需执行研究任务，另需一次性安装项目插件（`paper-agent-backend/scripts/install-plugin.sh`，含旧版遗留包清理，详见后端 README）；仅验证启动可跳过。

建议先注入插件运行期环境（使任务执行时插件能定位 Python 内核；`python` 已在 PATH 时可省略）：

```
set PAPER_AGENT_PYTHON=<python.exe 的绝对路径>
set PAPER_AGENT_KERNEL_ROOT=<仓库路径>\paper-agent-backend\kernel
set PAPER_AGENT_RUNS_DIR=<仓库路径>\paper-agent-backend\runs
```

1) **AGH daemon**（终端 A）：

```
cd agnes-harness
node packages/cli/dist/local/agnes.mjs daemon start --profile local-dev --workspace ..\paper-agent-backend --data-dir %USERPROFILE%\.agh\data
```

2) **AGH Web**（终端 B，可选，用于观察 AGH 真实调用）：

```
cd agnes-harness
node packages/cli/dist/local/agnes.mjs serve --profile local-dev --cwd .. --data-dir %USERPROFILE%\.agh\data --port 4177
```

3) **后端 BFF**（终端 C）：

```
cd paper-agent-backend
pnpm start:bff
```

访问 `http://127.0.0.1:8787`。

4) **前端**（终端 D）：

```
cd paper-agent-frontend
npm run dev
```

访问 `http://127.0.0.1:5174`。

停止：各终端 `Ctrl+C`；daemon 亦可用 `node packages/cli/dist/local/agnes.mjs daemon stop --data-dir %USERPROFILE%\.agh\data` 停止。

## AGH 与模型提供方配置（首次运行任务前必读）

> **本仓库不含任何 API Key 或 AGH 配置。** 模型密钥只保存在本机 AGH 数据目录（`%USERPROFILE%\.agh`，位于仓库之外），不会随 Git 提交上传；仓库各级 `.gitignore` 已兜底忽略 `.agh/`、`.agnes/`、`.env.*` 等敏感路径。请在自己的电脑上完成一次下述配置即可，切勿把密钥写进仓库任何文件。

任务执行经 AGH 会话驱动：流水线的工具调用与 S1 综合回答都需要一个**已配置的模型提供方**。未配置时的行为是**明确拒绝**（错误码 `PROVIDER_UNCONFIGURED`，提示 `run 'agh config' to add one`），不是静默失败——界面浏览与健康检查不受影响，但创建任务会失败。配置入口二选一：

### 方式 A：AGH Web 观察台（推荐）

1. 按上文《启动》启动全栈（`start.bat`）；
2. 访问 AGH 观察台 `http://127.0.0.1:4177`（端口可用环境变量 `AGH_WEB_PORT` 修改）；
3. 在设置 / Accounts（首次使用会进入引导流程）中选择模型提供方、粘贴 API Key，并将其设为默认账号（账号就绪后状态显示 ready）。

支持的提供方（节选）：DeepSeek、Kimi（Moonshot）、GLM（Z.AI）、Qwen、GPT（OpenAI）、Claude（Anthropic）、Gemini（Google）、OpenRouter、MiniMax、xAI。

### 方式 B：AGH CLI 配置向导

在 daemon 已运行（`start.bat` 已启动）的前提下，另开一个终端执行交互式配置向导：

```
cd agnes-harness
node packages\cli\dist\local\agnes.mjs config
```

按提示选择提供方并粘贴 API Key（该命令连接与启动器同一个 daemon，配置即时生效）。

### 验证与自检

- 配置完成后回到 paper-agent 界面创建一个任务即可验证全链路；也可先在 AGH Web 中发一条消息确认模型连通。
- AGH 自检：`node packages\cli\dist\local\agnes.mjs doctor`——未配置提供方时该项会给出 `PROVIDER_UNCONFIGURED` 警告（warn），配置成功后该项应通过。

## 环境变量（节选，后端完整清单见 `paper-agent-backend/README.md` §4）

| 变量 | 用途 | 默认 |
|---|---|---|
| `PAPER_AGENT_ROOT` | 项目根（后端目录） | 自动探测（当前工作目录） |
| `PAPER_AGENT_AGH_ROOT` | AGH 仓库根（只读引用，禁止改其源码） | 自动探测 `agnes-harness/`（仓库内），再试上级候选 |
| `PAPER_AGENT_PYTHON` | Python 解释器（内核，≥3.10） | 自动探测 `python`/`python3`/`py` |
| `PAPER_AGENT_PORT` | BFF 端口 | `8787` |
| `AGH_WEB_PORT` | AGH Web 观察台端口 | `4177` |
| `PAPER_AGENT_TOKEN` | 可选写路由令牌（默认关） | 未设置 |

## 开发与自检

后端：

```
cd paper-agent-backend
pnpm test          # 全量测试
pnpm typecheck
bash scripts/quality-gate.sh
pnpm dod           # DoD 全量验收
```

前端：

```
cd paper-agent-frontend
npm run build
npm run test:e2e
```

入口脚本、启动器、doctor 自检等见 `paper-agent-backend/README.md`；需求、验收、契约探测等见 `paper-agent-frontend/README.md`。

## 分支说明

- `main`：本文件所在的整合分支。
- `backend`：后端独立开发分支。
- `frontend`：前端独立开发分支（备份分支，历史可能与 main 分叉）。
