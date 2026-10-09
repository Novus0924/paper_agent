# sciret 插件（paper-agent 领域能力，AGH 薄壳）

把 `sciret_*` 工具注册进 Agnes Harness（AGH），业务逻辑全部在 Python 确定性内核
（`kernel/sciret_kernel`，零第三方依赖、可复现）。本包只做：参数声明 + 转发内核 + 结构化返回。

## 工具

| 工具 | 用途 |
|---|---|
| `sciret_ping` | 内核连通性检查（版本/语料快照/工作流清单） |
| `sciret_plan` | 初始化任务：状态机 + 证据账本（`workflow=research\|materials`，`lit_source=local\|arxiv\|auto`） |
| `sciret_run_step` | 执行单个流水线步骤（不传 `step` 则自动取下一个待办） |
| `sciret_run_all` | 顺序跑完剩余步骤（已完成/已跳过复用） |
| `sciret_status` | 任务状态与账本统计 |
| `sciret_verify` | 账本校验（重算哈希链 + 结论证据绑定） |
| `sciret_report` | 装配报告（结构化 JSON + Markdown，含门禁：哈希链/绑定/判断批次） |
| `sciret_cite` | 证据引用回查（`EV-0001` → DOI/作者/年份或产物哈希） |
| `sciret_resume` | 断点续跑（列出待续跑步骤；`execute=true` 立即续跑） |

## 运行期环境变量（必须由 daemon 注入）

AGH 会把本插件**拷贝**到自己的 home 运行，因此插件**不能**靠相对路径找内核；
必须在**启动 daemon 时**注入：

- `PAPER_AGENT_PYTHON`：Python 解释器绝对路径
- `PAPER_AGENT_KERNEL_ROOT`：内核根（含 `sciret_kernel/` 包的目录）
- `PAPER_AGENT_RUNS_DIR`：运行产物白名单根（内核据此拒绝越界 `run_dir`）

缺失时插件会返回**可执行的修复指引**（不会静默退化）。已在运行的 daemon 无法注入，需 `daemon stop` 后重启；
新能力只在**新会话**生效。

## 安装

```bash
bash scripts/install-plugin.sh check      # 只读预检
bash agh.sh install file:./plugin/sciret  # 真实终端人工确认（AGH 强制）
bash scripts/install-plugin.sh finish     # 自动 trust + enable + 终验
```

> `license` 字段是硬要求：AGH 信任门 `package-manager/src/trust-gate.ts` 只允许
> MIT / Apache-2.0 / BSD-2/3-Clause / ISC / 0BSD / MPL-2.0 / Unlicense，缺失或不在清单内会被拒
> （`E_PACKAGE_QUARANTINED` → "does not meet the required trust policy"）。

## 隐私与安全

- 子进程环境白名单（仅 PATH/PYTHONIOENCODING/PAPER_AGENT_RUNS_DIR/(HTTP(S)_PROXY)）；
- 工具仅访问本机 run 目录与公开文献元数据 API，不接触模型密钥、不抓取论文全文；
- 插件不含任何密钥。
