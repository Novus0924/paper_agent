# paper_agent

Paper Agent 2.0 —— 后端 + 前端 + AGH 运行时整合仓库。

## 目录结构

```
paper_agent/
├── paper-agent-backend/   # 后端（pnpm monorepo：apps / kernel / plugin / scripts）
├── paper-agent-frontend/  # 前端（React 18 + TypeScript + Vite）
└── agnes-harness/         # AGH 运行 harness（上游 AgnesAI-Labs/agnes-harness 快照，Apache-2.0）
                           # 已含预构建产物 packages/cli/dist；其 node_modules 不入库
```

`agnes-harness/` 原为独立上游仓库，现以快照形式整合入本仓库（含运行所需的预构建产物，开箱即用）；如需从源码重建，见文末附录。

## 环境要求

- **Node.js ≥ 24.10**（硬约束：AGH 原生模块按 Node 24 libuv ABI 构建，低版本会以误导性错误失败）
- **pnpm 10.34.5**（后端与 AGH 使用；Node 自带 corepack，可 `corepack enable` 启用）；前端使用 npm
- **Python ≥ 3.10**（检索内核仅用标准库；启动器自动探测，亦可用 `PAPER_AGENT_PYTHON` 显式指定）
- （仅在需要从源码重建 AGH 时才需要）原生构建工具，Windows 为 VS Build Tools（含 C++ 工作负载）

## 一次性依赖安装

```
cd paper-agent-backend
pnpm install
cd ../paper-agent-frontend
npm install
```

> AGH 运行时已随仓库提供预构建产物，无需安装或构建。后端通过 `link:` 引用同级 `agnes-harness/packages/*`，请保持上述目录布局不变。

## 启动

### 方式一：脚本一键启动（推荐）

仓库根目录的 `start.bat` 封装官方启动器 `paper-agent-backend/scripts/start.mjs`，一次编排全部服务（AGH 产物探测 → daemon serve → AGH Web serve → BFF → 前端 → 健康等待 → 打开唯一 URL）：

```
start.bat                      # 全栈：AGH daemon + AGH Web + BFF + 前端
start.bat --no-browser --json  # 不开浏览器 + 机器可读步骤报告
start.bat --bff-only           # 只起 BFF（跳过 daemon、AGH Web 与前端）
```

- **AGH Web**（默认 `http://127.0.0.1:4177`）可观察 AGH 的真实调用与会话轨迹；端口占用或启动失败仅提示、不阻断主链路，可用环境变量 `AGH_WEB_PORT` 改端口。
- 脚本自动选择本机合规 Node（`D:\Node.js` → `C:\Program Files\nodejs` → PATH 回退），并在启动前预释放所需端口。
- 停止：在启动窗口按 `Ctrl+C`（一并停止所有子进程）。

### 方式二：手动分步启动（四个终端，命令为 CMD 形态）

> 首次使用前请先完成《一次性依赖安装》。若需执行研究任务，另需一次性安装项目插件（`paper-agent-backend/scripts/install-plugin.sh`，含旧版遗留包清理，详见后端 README）；仅验证启动可跳过。

建议先注入插件运行期环境（使任务执行时插件能定位 Python 内核；`python` 已在 PATH 时可省略第一行）：

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

> 模型步骤说明：S1 综合回答需要已配置的模型提供方（在 AGH Web 或 `agh config` 中配置）。

## 开发与自检（节选）

后端：

```
cd paper-agent-backend
pnpm test          # 全量测试
pnpm typecheck
bash scripts/quality-gate.sh
```

入口脚本、启动器、doctor 自检等见 `paper-agent-backend/README.md`。

前端：

```
cd paper-agent-frontend
npm run build
npm run test:e2e
```

需求、验收、契约探测等见 `paper-agent-frontend/README.md`。

## 附录：从源码重建 AGH（可选）

仓库内的 AGH 快照对应上游提交 `38232a95`（2026-10-11）。仅在需要升级或重建时执行：

```
cd agnes-harness
pnpm install --frozen-lockfile
pnpm --filter @agnes/cli build:local
# 就绪判据：packages/cli/dist/local/agnes.mjs 存在
```

## 分支说明

- `main`：本文件所在的整合分支。
- `backend`：后端独立开发分支。
- `frontend`：前端独立开发分支（备份分支，历史可能与 main 分叉）。
