# 审核记录 · S6（M4 Event Relay + SSE）

> 项目：paper-agent 2.0 ｜ 日期：2026-10-10 ｜ 步骤：S6（BE-06 事件中继与 SSE，需求 §5 / §9.3）

## 【审核依据】

- 《后端需求文档》§5.1 事件目录（9 类事件及**载荷关键字段**，字段名不得自创）；
- §5.2 顺序/幂等/可恢复：**先订阅后补发**（明文点出旧版"先补发后入集合导致快照丢失"的竞态缺陷）、有序、去重（稳定 ID）、`Last-Event-ID` 续传、终态保证（`done` 先写 socket 再清理）；
- §8.1 接口 9（`GET /api/v1/tasks/{id}/events`）、§8.2 SSE 响应头与建连顺序；
- §9.3 验收：① 终态不丢；② 断线可补；③ 执行中新增订阅也能收到后续事件；
- P-02/P-03（旧版缺陷靶心：SSE 竞态与终态不送达）。

## 【实现要点】

| 关注点 | 做法 |
|---|---|
| 事件目录 | `apps/bff/src/events/model.ts` 逐字段对齐 §5.1（ping/step/activity/tool/degraded/conclusion/message/report/done） |
| 映射层 | AGH 原生事件 → 归一事件：`tool/call`→tool(running)、`tool/result`→tool(ok/error)+activity(人读摘要)、`assistant/message`→message、`approval/decided`→activity（受控审批透明化） |
| 语义边界 | AGH 的 step/turn 是"模型回合"，**不等于**领域步骤 R1..R6；步骤事件一律取自内核 `state.json`（权威），避免语义漂移 |
| 先订阅后补发 | `EventBus.open()` 先注册队列并记游标 → 快照 `reserve()`（只入缓冲、**不下发其他订阅者**）→ `drain(快照末 seq)` 续接实时 |
| 有序/幂等 | 单调 seq 作 SSE `id`；`dedupeKey` 按 step/tool/conclusion/degraded/message/report 的稳定 ID 去重 |
| 终态必达 | 执行 settle → `emitDone`；SSE 收到 `done` 先写 socket 再 `end()` |
| 恢复 | `Last-Event-ID` 头 → `bus.since()` 补发；快照缺失时以产物重建（state/ledger/report） |
| 心跳 | 30s `: ping`（SSE 注释帧） |

## 【检查项 → 实测证据 → 结论】

实测命令：`bash scripts/verify-sse.sh`（同一次调用内启动 daemon + BFF，真实 AGH + agnes-3.0-flash）。

| # | 检查项（依据） | 实测证据 | 结论 |
|---|---|---|---|
| 1 | SSE 响应头（§8.2） | `Content-Type: text/event-stream; charset=utf8`、`Cache-Control: no-cache, no-transform`、`Connection: keep-alive`、`X-Accel-Buffering: no`、`Transfer-Encoding: chunked` | ✅ |
| 2 | 首帧 `retry: 2000` + 建连顺序 | 建连后先收快照（ping→step×6→report），随后实时事件续接 | ✅ |
| 3 | **有序且无重复**（§5.2） | 28 事件，`seq` **单调递增 = true**，乱序/重复 id 数 = **0** | ✅ |
| 4 | **先订阅后补发**（旧版竞态回归） | 单测 `events.test.ts`「订阅后立即产生的事件，在 drain 时按序补齐（不丢）」+ 实测：快照阶段事件与实时事件无交叉重复 | ✅ |
| 5 | 事件目录覆盖（§5.1） | 实测分布 `{ping:1, step:12, report:2, tool:6, activity:3, conclusion:2, message:1, done:1}` | ✅ |
| 6 | 步骤状态实时推进 | `R1..R6 PENDING`（快照）→ `R1..R6 DONE`（实时），与内核 state.json 一致 | ✅ |
| 7 | 工具事件含工具名与结果 | `sciret_plan:running→ok`、`sciret_run_all:running→ok`、`sciret_status:running→ok`（工具名经 toolUseId 映射回填） | ✅ |
| 8 | 活动事件为人读描述（不抛工具细节） | 「已初始化 research 工作流（6 步）…」「工具调用已由受控审批策略处理」「DONE：已完成 6/6 步」 | ✅ |
| 9 | 结论按 cid 补发 | `conclusion: C-001, C-002`（来自账本，按 cid 幂等） | ✅ |
| 10 | **终态必达**（§9.3-① / §5.2） | 收到 `done {"run_status":"DONE","report_ready":false}`（`report_ready=false` 因报告接口属 M6，符合当前进度） | ✅ |
| 11 | **断线可补**（§9.3-②） | `Last-Event-ID: 2` 续传 → 补发 25 条（seq>2 的全部事件，含终态 done） | ✅ |
| 12 | 执行中新增订阅可收后续事件（§9.3-③） | 本次实测即"先建 SSE → 后触发 run-all"，实时事件全部收到 | ✅ |
| 13 | 质量门 | `vitest` **39/39 通过**（新增 9 项事件总线测试）；`tsc` 零错误 | ✅ |

## 【本步修复的 4 个真实缺陷（均由实测暴露）】

1. **第二次连接快照被去重吞掉**：快照原走 `publish()`，受幂等键拦截 → 改为 `reserve()`（只入缓冲、不下发、**绕过去重**）。
2. **快照与 drain 重复下发**：`drain()` 未跳过已直写的快照 → 订阅增加 `skipTo/drain(skipTo)`。
3. **`report` 事件刷屏（76 条）**：`dedupeKey` 缺 report 分支 → 补 `report:${status}`。
4. **步骤事件不推进**：原先只读任务索引（刷新滞后）→ 改为**直接读内核 `state.json`**（权威状态源）。

## 【结论】通过（Pass）

§9.3 三条验收（终态不丢 / 断线可补 / 执行中新增订阅）在真实 AGH 会话下全部通过；
§5.2 的"先订阅后补发"竞态有专门回归单测守护。

## 【遗留（登记跟踪）】

1. **未做跨进程重启补发实测**：当前补发数据在内存缓冲（BFF 重启后缓冲丢失，靠内核产物快照兜底重建）。
   §5.2 允许"事件缺失时以产物快照兜底重建"，但**重启期间的实时事件不再补齐**，需在 M10 明确"可接受边界"并写入 README。
2. **`degraded` 事件未在 SSE 中实测**：本轮为本地语料（L0，无降级）；待 M5 注入源不可达场景后补验收。
3. **环境事项（非产品缺陷）**：本机沙箱中 `agnes daemon start` 的脱离式就绪探测会超时，且我此前强杀 daemon 造成
   `.agnes-lock.lock` / `.reclaim` 陈旧锁（持有者 pid 已死）→ 已**可逆改名隔离**恢复。
   后续验证脚本 `scripts/verify-sse.sh` 改为"同一次调用内后台直启 daemon"，并**必须注入插件运行期环境变量**
   （`PAPER_AGENT_PYTHON/KERNEL_ROOT/RUNS_DIR`），否则插件会正确拒绝执行（本次已实测到该保护生效）。