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
