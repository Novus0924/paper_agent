# paper_agent

Paper Agent 2.0 —— 后端 + 前端整合仓库。

## 目录结构

```
paper_agent/
├── paper-agent-backend/   # 后端（pnpm monorepo：apps / kernel / plugin）
└── paper-agent-frontend/  # 前端（React 18 + TypeScript + Vite）
```

`agnes-harness/`（AGH 运行 harness）是独立仓库，在本仓库之外作为同级目录使用，不纳入本仓库。

## 快速上手

### 一键启动（AGH + AGH Web + 后端 + 前端）

仓库根目录提供唯一启动脚本 `start.bat`，封装官方启动器 `paper-agent-backend/scripts/start.mjs`（编排：AGH 产物探测 → daemon serve → AGH Web serve → BFF → 前端 → 健康等待 → 开唯一 URL）：

```
# Windows（资源管理器双击 start.bat，或 CMD 运行）
start.bat                      # 全栈：AGH daemon + AGH Web + BFF + 前端
start.bat --no-browser --json  # 不开浏览器 + 机器可读步骤报告
start.bat --bff-only           # 只起 BFF（跳过 daemon、AGH Web 与前端）
```

启动器会同步拉起 **AGH Web**（默认 `http://127.0.0.1:4177`），可在浏览器中直接观察 AGH 的真实调用与会话轨迹；端口被占用或 Web 启动失败仅提示、不阻断主链路，可用环境变量 `AGH_WEB_PORT` 改端口。

脚本会自动选择本机合规的 Node（**硬约束 ≥ 24.10**：AGH 原生模块按 Node 24 libuv ABI 构建，Node 22 会以误导性错误失败）。停止：在启动窗口按 `Ctrl+C`（一并停止所有子进程）。

### 后端

```
cd paper-agent-backend
pnpm install
pnpm -w build
pnpm test
```

入口脚本、启动器、doctor 自检等见 `paper-agent-backend/README.md`。

### 前端

```
cd paper-agent-frontend
npm install
npm run dev
npm run build
npm run test:e2e
```

需求、验收、契约探测等见 `paper-agent-frontend/README.md`。

## 分支说明

- `main`：本文件所在的整合分支。
- `backend`：后端独立开发分支。
- `frontend`：前端独立开发分支（备份分支，历史可能与 main 分叉）。
