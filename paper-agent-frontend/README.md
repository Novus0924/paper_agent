# paper-agent-frontend · 科研工作台前端

paper-agent 2.0 的前端部分：React 18 + TypeScript（strict）+ Vite 5 + React Router 6 + Zustand，
按《前端需求文档.md》实现 FE-01 ~ FE-15 全部条目，视觉与交互参照《前端Demo/index.html》（浅色令牌为唯一真源）。

默认由 **演示数据适配器**（`api/mock/`，业内叫 Mock）驱动，断网可完整走通「新建 → 监控 → 报告 → 证据 → 导出 → 追问」主旅程；
加 `?mode=live` 即切到真实 BFF/SSE，**视图代码一行不改**。
它不是产品意义上的「离线模式」：只是后端接入前的演示适配器，Live 跑通后整个 `api/mock/` 目录可以删掉
（用户第 1 点；文案口径与守门测试见 §3「Mock 不是产品里的离线模式」）。

---

## 1. 快速开始

```bash
npm ci
npm run dev          # http://127.0.0.1:5174（strictPort，与启动器约定一致；自动开浏览器并落在总览）
npm run build        # typecheck + 生产构建
npm run preview      # 预览构建产物
npm test             # vitest（jsdom）单元 + 旅程测试
npm run typecheck    # tsc -p tsconfig.json / tsconfig.node.json
npm run lint         # eslint 9 flat config
npm run test:e2e     # Playwright（驱动系统 Edge，见 §4「断点实测」）
node scripts/check-css-refs.mjs   # 校验 css-module 类名引用无悬空
```

环境开关（复制 `.env.example` 为 `.env` 后按需修改，不提交）：

| 变量                    | 作用                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `VITE_API_MODE`         | `mock`（默认）/ `live`；URL 上的 `?mode=` 优先级更高                 |
| `VITE_API_BASE_URL`     | Live 模式 BFF 根地址，默认 `http://127.0.0.1:8787`；**留空 = 同源**，走 dev server 的 `/api` 代理 |
| `VITE_AGH_SETTINGS_URL` | AGH 原生设置入口；留空时设置页给出可读说明而不是禁用死按钮           |
| `VITE_FLAG_DEMO_TOOLS`  | `off` 时隐藏监控页「模拟断线/重新演示/快进」验证控件（仅 mock 生效） |

本机真后端联调（2026-10-11 走过，取证见 §4）：后端按 `paper-agent-backend/README.md` 起 AGH daemon 与 BFF（`127.0.0.1:8787`），
前端只要一份 `.env.local`（gitignore，绝不提交）：

```bash
VITE_API_MODE=live
VITE_API_BASE_URL=          # 留空：请求发同源，由 vite 的 server.proxy['/api'] 转给 8787
```

默认留空走同源：生产形态本就是 BFF 托管构建产物，dev 用代理对齐，顺带不用管白名单。
直连（`VITE_API_BASE_URL=http://127.0.0.1:8787`）**现在也可用**：SSE 路由 `reply.hijack()` 后自己
`writeHead`、拿不到 app 级钩子设的响应头，这一条已在后端收口（白名单单一真源
`bff/src/infra/cors.ts`，钩子与 SSE 共用；默认含 5173/5174，其余端口用 `PAPER_AGENT_CORS_ORIGINS`
或启动器注入的 `PAPER_AGENT_CORS_EXTRA_ORIGINS`）。实测：`Origin: http://127.0.0.1:5174` 时 SSE 响应带
`Access-Control-Allow-Origin` 与 `Vary: Origin`；不在白名单的 Origin → 200 但**无** ACAO（浏览器拦死）。
> 历史的坑是"JSON 跨源能用、SSE 一帧不到"：同一个白名单写了两遍、漏了 hijack 那一处，
> 界面表现为"连上了但没有进度"。当初改用同源代理把它绕开了，所以没人发现它坏着。
临时演示想切回假数据不用改文件，`?mode=mock` 即可。

---

## 2. 目录结构

```
src/
  main.tsx            挂载 + 全局样式入口
  app/                App（路由表：总览是首页，`/overview` 别名归一到 `/`）、nav.ts（导航项 / 路由元信息 /
                      任务落点 / `NARROW_QUERY` 断点单一登记处）、useTaskGoneRedirect.ts（失效任务回总览）
  pages/              6 个路由页面：OverviewPage / NewTaskPage / MonitorPage /
                      ReportPage / EvidencePage / SettingsPage（+ NotFoundPage）
  components/
    layout/           AppShell（含 `main#main`，跳转链接的焦点落点）、Sidebar（220↔64 可折叠，全局项只有总览/设置）、
                      Topbar（56px 上下文栏：标题 + 任务标识复制徽章 + 状态徽章，不放全局动作；
                      ≤900px 侧栏隐藏后由它承接主导航，DR-13）
    ui/               Badge Button Card Collapse Feedback Fields Icon Markdown Overlay Pager
                      ToastStack
    business/         StepBar ActivityFeed ToolCard DegradedBanner ReportView EvBadge
                      EvidenceCard ExportPanel MessageList Composer
                      RunStats（机械统计）ArtifactList（产物梳理）
    common/           HealthBanner、HealthCard（首屏健康与自检）
  api/
    types.ts          后端文档 §5/附录 A 的 DTO 契约
    client.ts         双模适配器出口（按 env.apiMode 选 mock / live）
    httpClient.ts     Live：REST + SSE（Last-Event-ID 补发）
    normalize.ts      SSE 归一层：seq 单调去重、按实体合并、rebuildRuntime
    errors.ts         错误码 → 人类可读文案 + 下一步
    mock/             fixtures（脚本与种子）、runtime（localStorage 时间线）、mockClient
                      —— 演示数据适配器，与 Live 同接口同 DTO 形状；Live 跑通后整个目录删掉
  store/              taskStore / uiStore / healthStore / toastStore
  i18n/               zh-CN（全量）、en（部分，缺失自动回退）
  styles/             tokens.css（含 :root[data-theme='dark'] 预留块）、base.css、*.module.css
  lib/                utils / status（状态色语义）/ labels / paginate（长列表统一分页尺度）
                      / hooks（含 useMediaQuery，响应式走 JS 而非只靠媒体查询）/ errors
  config/             env.ts flags.ts meta.ts registry.ts（数据源与工作流登记表）
tests/                10 个用例文件（另含 harness 真路由渲染、helpers、setup 三个非用例文件）：
                      normalize、lib、components、shell、journey、
                      a11y（标题大纲 / 可访问名 / 焦点顺序全站扫描）、evidence-binding（结论↔证据不变量）、
                      mock-runtime、mock-script、tokens（令牌唯一真源与视觉标记的三组锁）
e2e/                  Playwright 真浏览器用例：breakpoints.spec（四档断点取证 / 降级横幅跟正文列对齐 / Toast 不遮控件）、
                      journey.spec（真旅程）、a11y.spec（大纲 / 跳转链接 / 折叠可达 / AA 文字对比度 / 状态点相对合成底达非文本 3:1 / 真 Enter 激活原生按钮 / 侧栏状态点带可读名）、
                      axe.spec（axe-core 整页审计六个视图，零违规档位）、
                      pages.spec（总览对齐与状态文案 / EV 徽章与跨页深链 / 证据分页换数据 / Composer 停靠区不透明）、
                      theme.spec（主题令牌随切换生效）、perf.spec（§10 首屏与路由切换取数）、
                      helpers（播种任务 id 现取、fast 档预置、可聚焦元素选择器、任务行取 id）
playwright.config.ts  5 个 project（1366/1280/1024/820 + journey），channel 用系统 Edge；
                      BASE_URL 可用 E2E_BASE_URL 覆盖（量生产构建预览用）
scripts/check-css-refs.mjs
```

数据流：`api.subscribe(taskId)` → `normalize.applyEnvelope` → `taskStore.byId[taskId]` → 页面选择器渲染。
刷新/重连走 `rebuildRuntime(snapshot, events)`，与实时路径同形（P-03 的一致性保证）。

---

## 3. 需求条目 → 代码落点

| 条目                              | 需求要点                                           | 实现位置                                                                                                                                                                                      | 关键交互                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FE-01** 外壳/导航/上下文栏/路由 | 文档 §4 结构 + Demo 视觉                           | `app/App.tsx`、`app/nav.ts`、`components/layout/*`                                                                                                                                            | 折叠后图标可点带 tooltip；`aria-current=page`；**与 §4.2「右侧全局动作」的偏差见下方「导航与动作的收敛」**——任务级入口挂在任务行与任务页内，不存在"没有当前任务却摆着禁用项"的全局按钮                                                                                                                                                                                                                                                       |
| **FE-02** 设计令牌与基础组件      | 全站颜色/间距/字体来自令牌                         | `styles/tokens.css`、`components/ui/*`、`tests/tokens.test.ts`                                                                                                                                  | `scripts/check-css-refs.mjs` 挡住悬空类名；状态色只在 `lib/status.ts` 定义；`tests/tokens.test.ts` 的锁挡住颜色字面量外泄、悬空 `var(--x)`、字面 `border-radius` 与不达 3:1 的状态标记（见 §3「令牌唯一真源的可执行化」）                                                                                                                                                                                                                                                              |
| **FE-03** 总览                    | 列表 + 状态徽章 + 相对时间 + 统计 + 快速新建       | `pages/OverviewPage.tsx`、`nav.ts#routeForTask`、`lib/paginate.ts`、`ui.module.css#tableCenter/cellTitle/cellStack/colStatus/colTime/colAction/tableScroll`、`lib/utils.ts#copyText`          | 按 `updated_at` 倒序；已完成→报告页，运行中/失败→监控页（失败要拿到重跑入口）；任务超过 10 条才出现分页条；状态列只放三字徽章（降级作为第二枚 warn 徽章归在状态列，不留在研究目标下），时间列定宽不换行，窄窗口由 `.tableScroll` 横向滚动承接；表头与单元格统一居中（`.tableCenter`），定宽标题块用 `margin-inline:auto` 参与居中；`run-…`/`sess-…` 不再铺在正文里，会话标识改由「AGH 已记录」复制徽章承载（`title` 同时给出任务与会话标识）。**这几条现在是断言而不是目测**：`e2e/pages.spec.ts` 在四档视口量整表 `text-align`、状态词长度、时间列 line box（见 §4） |
| **FE-04** 新建向导                | 目标 / 工作流 / 数据源 / 连通性预检 / 提交         | `pages/NewTaskPage.tsx`、`config/registry.ts`                                                                                                                                                 | 目标超 400 字与空目标给行内提示不弹窗；预检不可用的来源不默认勾选并说明影响；提交成功自动进监控页接续实时进度                                                                                                                                                                                                                                                                                                                                |
| **FE-05** 运行监控                | 人类可读步骤 + 当前活动 + SSE 实时                 | `pages/MonitorPage.tsx`、`business/StepBar.tsx`、`ActivityFeed.tsx`、`ToolCard.tsx`、`RunStats.tsx`、`ArtifactList.tsx`、`layout.module.css#pageAgent/agentGrid/agentCol`、`api/normalize.ts` | 左列人话进展、右列常驻 agent 面板（工具调用监控 / 运行统计 / 产物梳理），入参出参仍可在工具卡里展开核对；快照 + 补发让重进页面同形；见下方「科研 agent 视图」                                                                                                                                                                                                                                                                                |
| **FE-06** 降级提示                | 橙色「已降级 · 任务未中断」vs 灰色「部分源不可用」 | `business/DegradedBanner.tsx`、`lib/status.ts`、`api/normalize.ts`                                                                                                                            | 降级一律 `--warn` 不用红；附原因/影响/是否可续跑 + 重试、改源动作；**横幅挂在正文列内**（与「执行步骤」卡同左沿同宽，四档视口有几何断言，见 §4「画面级走查」）                                                                                                                                                                                                                                                                                                                                                                            |
| **FE-07** 报告中心                | 结构化报告、结论带证据链接、完成必达、刷新可看     | `pages/ReportPage.tsx`、`business/ReportView.tsx`、`Markdown.tsx`                                                                                                                             | 打开即取报告快照（不依赖是否收到过 `report` 事件）；未完成时如实说明缺什么，不给空转 spinner                                                                                                                                                                                                                                                                                                                                                 |
| **FE-08** 证据溯源                | 只读列表/轨迹、结论↔证据跳转、EV 高亮              | `pages/EvidencePage.tsx`、`EvidenceCard.tsx`、`EvBadge.tsx`、`lib/paginate.ts`                                                                                                                | `?ev=EV-0005` 深链定位并提示「已定位到 …」；目标在后一页时自动跳到那一页；哈希链只在「审计细节」里出现；证据分页、过程轨迹默认 20 条 + 「显示其余 N 条」                                                                                                                                                                                                                                                                                     |
| **FE-09** 导出                    | 报告 MD / 审计包 / 会话轨迹 + 清单 + 结果反馈      | `business/ExportPanel.tsx`、`store/taskStore.ts#exportArtifact`                                                                                                                               | 未完成任务只开放会话轨迹并解释原因；成功后 Toast + 内容清单与校验状态                                                                                                                                                                                                                                                                                                                                                                        |
| **FE-10** 底部 Composer           | 追问/修订真正可用、运行中排队可提前发送            | `business/Composer.tsx`、`MessageList.tsx`、`composer.module.css#box/ta/wrap`、`api/mock/fixtures.ts#buildFollowUpScript`                                                                          | Enter / Cmd(Ctrl)+Enter 发送；排队显示顺序，可「立即发送/删除」；监控页与报告页都留了问答落点；聚焦环只画在容器上（内部 textarea 不再叠第二层环）；演示数据回放文案明写「（演示数据回放）」且不伪造运行终态（详见 §4 本轮缺陷修复）；停靠区是不透明吸底层 + 顶部分隔线，正文不会从遮罩里露出半行字（见 §4「画面级走查」）                                                                                                                                                                                                              |
| **FE-11** 全局状态反馈            | Skeleton / EmptyState / 错误 + 下一步 / Toast      | `components/ui/Feedback.tsx`、`ToastStack.tsx`、`api/errors.ts`、`app/useTaskGoneRedirect.ts`                                                                                                 | 错误文案来自 `errors.*`，不渲染堆栈或原始 JSON；演示数据层的 404/参数错误同样走 `ApiError` 码，失效任务 URL 读得到人话而不是英文 id；任务确实不存在（NOT_FOUND）时三个任务页统一回到总览首页并给 warn Toast 说明是哪个任务（`toast.taskGone`），瞬时错误（超时/断线）留在原页可重试；已终态且不可重试的错误不再摆「重试」假按钮（见 §4 缺陷 3）；Toast 栈 4.2s 自动消失且**不吃可交互控件**——≤900px 顶栏装着唯一导航，故该档把栈改挂到顶栏下方靠左（四档视口有重叠面积断言，见 §4「画面级走查」）                                                                                                                                                                 |
| **FE-12** 演示数据适配器          | 未接后端时可完整重复演示，Live 跑通后可整体移除    | `api/mock/*`                                                                                                                                                                                  | localStorage `paper-agent-frontend.mock.v3` 存时间线（升到 v3 的原因写在 `runtime.ts`：演示脚本改为按任务所选来源生成，旧种子数据的来源集合与脚本不再自洽）；4 个种子（完成 / 已降级完成 / 失败 / 运行中）；失败任务可断点续跑到报告；与 Live 同接口同 DTO 形状，视图代码不含 `if (mock)` 分支                                                                                                                                                                 |
| **FE-13** 响应式与基础无障碍      | 笔记本分辨率、键盘可达                             | `styles/base.css`、`layout.module.css` 断点、`app/nav.ts#NARROW_QUERY`、`lib/hooks.ts#useMediaQuery`；`components/layout/NarrowNav.tsx`；`ui/Card.tsx`+`ui/Collapse.tsx`（`titleLevel`）、`Overlay.tsx`（焦点陷阱 + 焦点归还）；`tests/a11y.test.tsx`、`e2e/a11y.spec.ts`、`e2e/axe.spec.ts` | 折叠导航带 tooltip 且图标与文字列对齐；≤900px 侧栏隐藏后由顶栏「窄屏导航」承接主导航（DR-13，含最近任务下拉；`<option>` 只有文字，所以每项文案都带运行状态词「标题 · 执行中」）；表格有 caption 与 `scope`；状态徽章带文字不只靠颜色；侧栏「最近任务」那颗状态点另带 `aria-label` 与行 tooltip，运行状态不再只有颜色一个通道（见 §3「无障碍的设计决定」第 7 条）；每页第一个 Tab 停靠点是「跳到主内容」，对话框内 Tab/Shift+Tab 回环、Esc 关回触发器；标题层级、可访问名、正 tabindex、折叠区不可达、原生 `<button>` 的真 Enter 激活由测试守住，**地标与整页规则另由 axe-core 审计守住**（见 §4「无障碍这一轮」与「第三方无障碍审计」）                                                                                                                                                                 |
| **FE-14** 首屏健康提示            | 与 doctor 对接的可读指引                           | `components/common/HealthBanner.tsx`（根节点带 `layout.bannerSlot`，不自带整页容器）、`HealthCard.tsx`、`store/healthStore.ts`                                                                | Live 连不上时说明「先用一键启动器启动 AGH 与 BFF」，并给只看演示数据的退路（URL 加 `?mode=mock`）；无问题时返回 null，不在滚动区留占位节点                                                                                                                                                                                                                                                                                                                                      |
| **FE-15** 设置与 AGH 跳转         | 工作台自身偏好，模型/密钥交回 AGH                  | `pages/SettingsPage.tsx`、`store/uiStore.ts`                                                                                                                                                  | 模式 / 主题 / 语言 / 演示时间线 / 重置演示数据；「快进演示时间线」只压缩演示数据时间线的推进节奏并明写真实运行无法加速（见「导航与动作的收敛」第 3 条）；未配 `VITE_AGH_SETTINGS_URL` 时禁用跳转并说明怎么配                                                                                                                                                                                                                                     |

### 已知问题（P-01 ~ P-07）的前端复测点

| 问题                    | 前端处理                                                                           | 复测位置                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 总是降级           | 预检不默认勾选不可用源；灰/橙两级语义分开；降级橙色且永不红色                      | `tests/journey.test.tsx` FE-04/FE-06；浏览器实测降级横幅计算色为 `--warn` `#d97706`                                                                                                                  |
| P-02 暴露过多后端内容   | 渐进披露：默认人话（中文标签 + 一句话状态），原始入参/出参 JSON 与哈希仍要点开才见 | `ToolCard`（常驻但逐条可折叠）/ `RunStats` / 审计细节；`lib/labels.ts`；见 §3「科研 agent 视图」                                                                                                     |
| P-03 结果零散、刷新丢失 | 报告中心 + `rebuildRuntime` 同形重建 + 报告打开即取                                | `tests/normalize.test.ts`「实时路径与刷新重建同形」                                                                                                                                                  |
| P-04 无记录、无法导出   | 会话标识与「已记录」状态、历史可重开、三选导出与结果反馈                           | 总览「AGH 已记录」复制徽章（`title` 含任务与会话标识；`agh_recorded === false` 时显示「AGH 记录待确认」）、侧栏连接卡显示该会话标识、`ExportPanel`；`tests/shell.test.tsx`、`journey.test.tsx` FE-03 |
| P-05 对话框不起作用     | Composer 真发送、排队顺序、失败重试、内容保留                                      | `tests/components.test.tsx`、`journey.test.tsx` FE-10                                                                                                                                                |
| P-06 未真正继承 AGH     | 统一消费 BFF 会话化数据，轨迹视图呈现同一会话事件                                  | `api/httpClient.ts`、`EvidencePage` 轨迹区                                                                                                                                                           |
| P-07 启动麻烦           | 端口固定、`server.open` 启动即打开总览、Mock 默认可演示、首屏健康与可读修复指引    | `vite.config.ts`、`HealthBanner`                                                                                                                                                                     |

### 交互铁律（文档 §2.2）的实现位置

1. 状态色语义只在 `lib/status.ts` + `tokens.css`；2. 无假控件（不可用即禁用并说明，或隐藏）；
2. 原始 JSON/提示词/哈希只在点开才见的工具卡与审计细节内（默认视图是人话）；4. 报告必达（打开即取 + 刷新同形）；
3. 每个错误态带人话说明与下一步（`api/errors.ts` + `Feedback.tsx`）。

### 长列表与分页（文档 §10）

统一尺度在 `lib/paginate.ts`（`PAGE_SIZE = 10`），视图只声明数据量、不再各自写死条数：

- `Pager`（`components/ui/Pager.tsx`）只在真的超过一页时渲染，单页数据不摆假控件（铁律 2）；
  区间文案按 1 起算（`第 1–10 条 / 共 12 条`），空列表是 `0/0` 而不是 `1/0`。
- 页码越界一律 `clampPage` 夹回可用范围：筛选让列表变短时不会停在空白页；`EvidencePage` 还在筛选条件变化时回到第 1 页。
- 深链 `?ev=` 的证据可能在后一页，`pageOf` 先算出目标页再渲染，否则 `scrollIntoView` 落在当前页找不到卡片。
- 过程轨迹（`trace`）不是分页而是渐进披露：默认前 20 条 + 「显示其余 N 条」，与证据列表的翻页语义区分开。

### 导航与动作的收敛（对文档 §4.2 的偏差说明）

文档 §4.2 把侧栏写成「新建 + 总览 + 运行监控 + 报告 + 证据溯源 + 设置」，并把「新建、导出」放在顶栏右侧。
按需求文档建好第一版后经过用户评审，这些"全局位"在真实使用里会出现两类问题，因此与文档有一处有意偏差：

1. **任务级页面退出全局导航**（`app/nav.ts#NAV_ITEMS` 只剩总览 / 设置）。
   运行监控 / 报告 / 证据溯源都是"某个任务"的视图；放在全局要么在没有当前任务时摆禁用项，
   要么带着上一次的 taskId 跳错任务。改由两条路径进入：总览的任务行（已完成→查看报告，其余→查看运行监控），
   以及任务页自身 header 的兄弟页按钮（报告页↔运行监控↔证据溯源）。
   失败任务的 header 不受"报告已就绪"门禁，直接给证据溯源入口（`pages/MonitorPage.tsx`）。
2. **顶栏不放全局动作**（`components/layout/Topbar.tsx`）。原来的顶栏导出按钮其实只做路由跳转
   （真正的下载在报告页 `ExportPanel`），属于"看着能点、点了不办事"的假控件，已删除；
   「新建任务」入口从 4 个收敛为 2 个（侧栏主按钮 + 总览页头，空列表时 EmptyState 再给一个），
   与新建等效的「重新演示」从顶栏移除，仍作为演示数据适配器的验证控件留在监控页（`flags.demoTools && api.mode === 'mock'`）。
3. **演示速度控件诚实化**。真实 agent 的耗时来自 AGH 的深度思考与工具调用，前端无法加速，
   原先顶栏的「快进」只是把演示数据时间线的推进乘 20（`api/mock/runtime.ts#setSpeed`），
   摆在真实运行的入口里等于误导。现在它是设置页「演示数据（仅未接后端时可用）」分组下的
   「快进演示时间线」，并带说明「真实运行由 AGH 的深度思考与工具调用决定耗时，无法加速…不改变真实任务」；
   `store/uiStore.ts` 末尾补了一次 `api.demo?.setSpeed(20)`，修掉"刷新后开关显示快进、运行时仍是原速"的持久化不一致。
4. **机器标识退出正文**。总览原先把 `run-…` 直接铺在研究目标列、把 `sess-…` 写在操作列，
   是纯噪声却又是 P-04「可追溯」的证据。改为：行内只留「AGH 已记录」复制徽章，
   点击复制会话标识（`title`/`aria-label` 同时给出任务与会话标识），侧栏连接卡的「会话」字段显示真正的
   `session_id`（此前误显示为任务 id）。

### 科研 agent 视图（用户评审「工作台称不上是科研 agent」后新增）

用户对照豆包的工作模式提出三件事：工具调用监控、对话摘要、产物梳理，并问「AGH 的会话轨迹集成后端后能显示吗」。
落点分三块，全都在 `MonitorPage` 的右侧常驻栏（`layout.pageAgent` 1160px + `layout.agentGrid`，≥1280px 才分成
「主列 + 330px 栏」，窄于此视口整栏顺排，不横向裁切）：

1. **工具调用监控常驻**（`ToolCard` 列表 + `monitor.toolCount` 徽章）。原先藏在「过程细节」折叠区里，
   等于把 agent 最该被看见的东西收进二级页；现在不点任何按钮就能看到每次 `tool` 事件的工具名、状态与耗时，
   点开仍可核对入参、结果与数据源状态。**这是唯一的口径变化：折叠区取消，但技术细节没有被删**——
   入参出参仍在卡内展开，`lib/labels.ts` 的中文标签继续承担领域语言。
2. **运行统计＝机械统计，不是生成式摘要**（`business/RunStats.tsx`）。口径已与用户确认接受：
   数值只从 `snapshot.steps`、`tool` 事件、`entry.degraded/messages/conclusions` 与证据登记里数出来
   （步骤完成比、工具调用数、证据登记数、结论数、会话轨迹条数、对话轮次、按状态拆的行、步骤耗时合计），
   面板底部直接写明「生成式摘要要等后端给出摘要字段，这里不凭空生成」。
   后端 `GET /tasks/:id` 目前**没有**摘要字段，所以这里不做 AI 摘要——做了就是注水。
   某项数据源尚未加载时显示 `—`，不猜数。状态行只报异常态（成功数已在上方计数块里），
   因此「工具状态：有警告 1」是可以逐条核对的，而不是含糊的整体评价。
3. **产物梳理**（`business/ArtifactList.tsx`）。定义收敛到已有契约上：产物＝`evidence` 里 `tier === 'artifact'`
   的条目，按 `producer_step` 归到步骤下（快照里没有对应步骤的条目仍列出，归「其它」），
   每条深链到 `/evidence/:id?ev=EV-xxxx`，复用证据页既有定位与高亮，不新造后端字段。
   事实层（`tier === 'fact'`）不进这个面板：两个面板口径不同。

**集成后会显示吗**：会，且不需要新代码。Mock 与 Live 共用 `normalize.applyEnvelope`，
`tool` / `activity` / `conclusion` / `degraded` 事件一到，这三块与左列同时长出内容；
AGH 的会话轨迹本来就按后端 §5.1 的 `trace` 呈现（证据页轨迹区，默认 20 条 + 展开其余）。
唯一需要后端补的是「摘要字段」，届时把 `RunStats` 的机械统计保留、旁边加一节真摘要即可。

**追问 / 修订 / 不相关问题会怎样**（用户实测的问题，现在按行为回答）：
运行中发送进排队并显示顺序，可「立即发送 / 删除」；空闲或已完成时立即发送；
已完成任务上请求修订会并入报告附录（`revisionSection`）且任务状态保持已完成；
**对话轮次不再是运行终态**——演示数据回放不发 `done` 帧，也不声称「已绑定本任务证据」，
文案明写「（演示数据回放）…」并说明真实运行由 AGH 在同一会话中作答；
失败任务上追问只会得到同样的诚实回复，任务仍是「未完成」，也不会凭空长出「查看报告」入口
（`report` 帧只在报告本来就就绪时才补）。
问一个不相关的问题目前按普通追问回写（后端有真实意图分类后再接）——前端不假装能判断问题是否离题。

### Mock 不是产品里的「离线模式」（用户第 1 点的口径裁定）

用户原话：「如果离线模式指的是没有后端时的 mock，本项目不需要离线模式，等接入后端跑通后可以移除」。
据此把两类概念分开处理：

1. **`api/mock/` 是演示适配器，不是产品功能**。它存在的意义是"后端还没接上时也能把流程走通、能重复演示"，
   所以界面上统一叫「演示数据（未接后端）」（`settings.modeMock`）、「演示数据（仅未接后端时可用）」（分组标题）、
   侧栏健康状态「演示数据 · 全流程可重复演示」（`health.mockConnected`）。
   文案里不再出现「离线模式 / 演示数据是离线模式」这类听起来像产品功能的说法；
   `mockClient.ts` 顶部注释与 §2 目录树都写明"Live 跑通后整个目录可以删掉"。
2. **数据源的「本地 / 离线来源」是真的产品概念**，不在清理范围：`config/registry.ts` 里 `kind: '离线'`
   指该文献源本就不依赖联网抓取（本地语料），新建向导按所选来源决定 `lit_source`。
   相应地，主动只选离线来源时提示「你主动选择了本地/离线来源，系统按离线来源执行，不会判为降级」（`newTask.offlineChoice`），
   这是 FE-06 的降级语义修正，不是"离线模式"文案。
3. **口径由测试守住**，不靠人记住：`tests/shell.test.tsx` 有两条用例——
   递归收集 `zhCN` 全部字符串并断言不含 `/离线演示|离线模式|Mock 离线/`；
   渲染 `/` 与 `/settings` 两页后断言整页 `textContent` 读不到这些字样（侧栏的模型名与健康状态也在扫描范围内）。
   连接失败提示（`api/httpClient.ts`）改为说明真实修复路径：「请先用一键启动器启动 AGH 与 BFF…
   若只想看演示数据，可在 URL 后加 `?mode=mock`」。

### 无障碍的设计决定（用户第 4 点：无障碍由你设计并落实）

不是补几个 `aria-*`，而是把"读屏用户能不能按结构跳着读"当成设计约束，落点都在 `components/ui/`：

1. **卡片标题就是标题元素**（`ui/Card.tsx`）。`title` 现在渲染成 `<h3>`（默认）而不是 `<div>`，
   因为读屏用户按 H 键在页面分区之间跳是主要的导航方式；层级由页面结构决定，所以暴露 `titleLevel?: 2|3|4|5|6`
   而不是让组件自己猜。视觉不变：`.cardTitle { margin: 0; font: inherit; }`，排版继续由 `.cardHead` 决定，
   e2e 直接断言标题的计算 `fontSize`/`fontWeight` 与其父容器相同且 `margin-top` 为 0（见 §4）。
   当初 §5 记的「每个 `Card` 对读屏是无名 `section`」这条全站缺口就是它。
2. **折叠区标题是可选的**（`ui/Collapse.tsx`）。同样支持 `titleLevel`，但**默认不声明**：
   工具调用卡、证据审计行这类重复条目如果都进标题大纲，读屏按 H 键会被几十条同名标题刷满，反而是噪声。
   只有本身构成页面分区的折叠区才声明层级（目前只有证据页的「过程轨迹」用了 `titleLevel={3}`）。
3. **展开/收起用 disclosure 模式**：`<button aria-expanded aria-controls>` + 收起时给 body 加 `hidden` 属性，
   而不是只靠 CSS `display:none`。理由很实际：jsdom 里 CSS Modules 的类名解析不出来、媒体查询也不生效，
   纯 CSS 隐藏对单元测试不可观测，容易悄悄退化成"看着收起了但 Tab 还能进去"；`hidden` 同时被 jsdom +
   RTL 的角色查询和真实浏览器遵守，收起时读屏与键盘都真的进不来。因此 `ui.module.css` 里那条
   `.collapsed .collapseBody { display: none; }` 已删除（只剩一个机制）。
4. **跳转链接要能真的交出焦点**：`AppShell` 的 `<main>` 加了 `tabIndex={-1}`（`main` 默认可聚焦不了），
   `href="#main"` 才不是只改 URL 的假跳转；实测 Enter 后 `activeElement.id === 'main'`。
5. **外壳的地标结构：`banner` + `complementary` + `main`，中间层必须是 `div`**（`components/layout/AppShell.tsx`）。
   这条是 axe 扫出来的，不是设计时想到的：包裹顶栏与主区的那层原先写成无 `aria-label` 的 `<section>`，
   而按 HTML 定义 `<header>` 只在**不落在分节内容里**时才拿到 `banner` 角色，于是顶栏退化成 generic，
   其中的页面标题与状态徽章掉出所有地标（读屏的地标导航就少了整条顶栏）。
   改成 `<div>` 后 header 才是 `banner`。**别再把它改回 `section`**：要么用 `div`，要么给 `section` 补 `aria-label`，
   否则 `e2e/axe.spec.ts` 会在六个视图上重新报 `region`。
6. **没有做**「给全部 29 张卡加 `aria-labelledby`」：那会把每页变成十几个 landmark，读屏的地标导航反而更糟。
   命名靠标题元素 + 可访问名解析，`section` 保持普通分区语义。
7. **侧栏最近任务的状态点补了可读名字**（优化插件审查里唯一的真缺口，`ui/Badge.tsx` 的 `Dot` + `layout/Sidebar.tsx`）。
   `Dot` 原先渲染一个空 `<span>`：在步骤条、导出清单、健康横幅里它旁边都跟着文字，是冗余编码，没问题；
   但侧栏「最近任务」那一行只有 标题 + 6px 色点，**运行状态就只有颜色这一个通道** —— 读屏完全报不出来，
   色觉障碍也读不出「已完成 / 执行中」，违反需求文档 §10（WCAG 1.4.1 不得仅靠颜色传达信息）。
   修法是给 `Dot` 一个**可选** `label`：不传时仍是无名装饰点（避免旁边有文字时读屏念两遍），
   传了才 `role="img" + aria-label`；侧栏另外把状态词并进行 `title`（鼠标悬停看得到）。
   **点的颜色、尺寸、位置一个像素都没动**，与 Demo 的 `.hist-item .d` 保持一致。
   这条是 axe 测不出来的：色点没有文字，`color-contrast` 规则不把它当文本，`region`/`name` 规则也不认为一个装饰 span 需要名字。
   因此取证走自己的断言：`tests/a11y.test.tsx` 用 RTL 计算出的可访问名计数（4 行必须 4 行报出状态），
   `e2e/a11y.spec.ts` 在真浏览器里同一口径（≤900px 侧栏不存在，按档位 skip）。两处都做过变异反证：
   去掉传给 `Dot` 的 `label` 后单测报「4 行里只有 0 行把状态说出口」、e2e 报「4 行里有 4 行只靠颜色表达状态」。
8. **三条"归你定"的视觉决策已按批准落地**（用户：「这三条都可以改」），另补一条同批审查里发现的输入框命名缺陷：
   ① **状态灰阶与降级橙达到非文本 3:1**：`--idle` 由 `#9b9b96` 提到 `#888884`（浅色实心面上最差 3.15，与 `--ok` 的最差 3.16 同级），
   `--warn` 由 `#d97706` 提到 `#c2680a`（实心面最差 3.52；浏览器里那颗压在 `--warn-soft` tint 上的点由 2.83 → 3.53），
   `--warn-soft` 一起换成新色相的 10% tint，免得底与点不同色。**只有标记变深，文字一个没动**：
   `--idle`/`--warn` 全站不作为 `color:` 出现（`grep` 过，只有 `border-color` 与点），文字走 `--*-ink` 那三个 AA 档。
   ② **圆角收进六档令牌**：`--r-2xs 2 / --r-xs 5 / --r-sm 7 / --r 10 / --r-lg 14 / --r-pill 20`，
   原先 10 处一次性字面量全部取档（14 与 5 与 2 是原值不动，9→10、6→5、6→7、4→5、气泡 12/12/4/12→10/10/5/10、
   滚动条 8→`--r-pill`：9px 宽的滑块上浏览器把两者都夹到 4.5px，观感不变）。
   `tokens.css` 头部注释同时改成实话：**颜色、圆角、块级间距**是锁住的，`font-size` 的小数码（10.5/11.5/12.3/12.8px）
   与构件尺寸（图标直径、控件高度、1px 描边）是刻意保留的字面量——收进等比档位会改掉 Demo 的字距与信息密度。
   ③ **≤900px 的最近任务下拉把状态说进文案**：`NarrowNav.tsx` 的 option 由「标题」变成「标题 · 执行中」，
   状态词复用 `status.run.*`，与侧栏、徽章同一份文案真源。
   ④ **Composer 的输入框不再抄发送键的名字**（本轮写 ③ 时顺手发现的缺口）：`textarea` 原先 `aria-label={t('composer.send')}`，
   与旁边的按钮同为「发送」，读屏念不出自己站在输入区还是按钮上（WCAG 4.1.2 / 2.4.6）。新增 `composer.inputLabel`
   （「追问或修订内容」），按钮名不动；8 处按旧名定位输入框的测试断言一并改到新名字上——旧名字是被测试钉住的，
   不一起改就会假绿。
   这四条各自都有锁：① 由 `tests/tokens.test.ts` 的「状态色 × 浅色/深色实心面」两张矩阵 + `e2e/a11y.spec.ts`
   在真浏览器里逐颗点量合成底；② 由「除 `tokens.css` 外不许出现字面 `border-radius: …px`」+「声明的档位必须都被 `var()` 用到」两条；
   ③ 由 `e2e/breakpoints.spec.ts` 扫 `<option>` 文案；④ 由 `tests/a11y.test.tsx` 断言输入框与按钮的可访问名不重合。
   四条都做过变异反证（改回旧值/加一档没人用/暗色块漏改/去掉状态词，全部当场红）。

### 对比度的实测口径（哪些达标、哪些没测到）

`tokens.css` 的注释与 §4 都讲「AA」，这里把口径钉死，避免它被读成"整站色彩无障碍"：

- **已达标的是文字**。按相对亮度现算（脚本先用 21.00 / 4.54 / 4.48 三个已知值反证过实现）：
  浅色 `--ink-3`/`--raised` 4.74、`--ink-2`/`--raised` 6.61、`--ink`/`--surface` 17.40、`--link`/白 5.17，
  状态文字档 `--ok-ink` 落在 `--ok-soft` 合成底上 4.77、`--warn-ink` 4.86、`--fail-ink` 5.73，
  深色 `--ink-3`/`--surface` 5.30 —— 全部 ≥4.5。运行时那一路由 `e2e/a11y.spec.ts` 的 computed style 现算 + `e2e/axe.spec.ts` 的
  `color-contrast` 整页判定，两路独立。
- **状态圆点本身现在也达标**（原来是 3:1 都不到，见 §3 第 8 条）：`--idle` 由 2.79/2.47 提到最差 3.15，
  `--warn` 那颗由浏览器实测 2.83 提到 3.53，`--ok` 最差 3.16、`--fail` 4.27、`--run` 4.63。口径分两层，各管各的：
  ① `tests/tokens.test.ts` 量**令牌 × 实心面**的笛卡尔积（浅色与深色各一张表），结构上一定够得着，
  覆盖页面上不一定渲染出来的组合（种子态里没有 PLANNED 任务，`--idle` 那颗点在浏览器里量不到）；
  ② `e2e/a11y.spec.ts` 扫四个视口档位下五页里**真实渲染出来的每一颗点**，按祖先链把半透明 tint 逐层 alpha 合成后再量，
  所以"压在 `--warn-soft` 上的点"这一格由它负责。两层的算术都先过自检（21 / 21 / 1 / `#767676` 4.54 / 50% 黑压白 3.98），
  自检常数一开始被我写成 4.54，当场红了一次——它挡得住算错。
  信息层面本来就不依赖颜色：徽章带文字、侧栏那颗点带可读名（第 7 条）。
- **深色主题的状态点只在令牌层量过**：`e2e/a11y.spec.ts` 的扫描跑在浅色（`presetFastSpeed` 固定 `theme: 'light'`），
  深色下的真实合成底没有浏览器级取证；暗色块只覆盖颜色令牌，`--idle` 与 `--*-soft` 沿用浅色取值，这一条由 §4 的 theme 用例与令牌锁共同说明。

### 令牌唯一真源的可执行化（用户第 5 点「能补项也可以推进」的第 ② 项）

文档 §5.1 的原文是「令牌以 CSS Variables / TS 常量**双份同源**管理」。落地时没有照字面抄两份，理由是抄了就必然漂移，
而 TS 侧现在没有任何需要读色值的调用方（`grep` 过：组件里没有内联颜色，两个内联样式只有进度条宽度和骨架高度），
为一个假想消费者造一份要人工对齐的常量是本末倒置。改做两件事：

1. **把"同源"变成可执行的锁**（`tests/tokens.test.ts`，直接读 `src/styles/*.css` 文本）：
   ① 除 `tokens.css` 外不许出现颜色字面量（十六进制 / `rgb()` / `rgba()` / `hsl()` / 独立成词的颜色关键字，
   `white-space` 这类属性名不算）；② 每个 `var(--x)` 引用都能在 `:root` 找到声明；
   ③ 深色块只允许覆盖浅色已声明的令牌、不许新增（新增的话浅色主题下该令牌没有值，组件静默拿到空值）；
   ④ 五个状态色在浅色与深色两张「状态色 × 实心面」矩阵上都 ≥3:1（非文本，WCAG 1.4.11）；
   ⑤ 除 `tokens.css` 外不许出现字面 `border-radius: …px`（`0` 与百分比是刻意的抹平/正圆，放过）；
   ⑥ 声明出来的每一档圆角都必须真的被 `var()` 用到，不留空档。
   ⑤⑥ 的名字是通配的（`--r` 与任意 `--r-<后缀>`），所以"新加一档却没人用"会直接红——这条是变异验证过的：
   先写死档位清单时塞一个没人用的 `--r-mut` 照样全绿，改成通配后同一改动报「声明了却没人用的圆角档位：--r-mut」。
2. **锁一上来就抓到 3 处真实违规**，而且不是纯洁癖：`base.css` 的滚动条滑块与悬停、`ui.module.css` 的对话框遮罩
   都是写死的 `rgba(16, 16, 16, …)`，深色主题只覆盖令牌、覆盖不到字面量 —— 于是深色下滚动条滑块和底同为墨色，等于看不见。
   新增 `--scrim`、`--scroll-thumb`、`--scroll-thumb-hover` 三个令牌并给出深色档（遮罩加深、滑块换成浅色墨）后修掉。
   **浅色观感没有变**：这三个令牌的浅色取值与原先的字面量逐字相同，这一点由 `e2e/theme.spec.ts` 在真实浏览器里断言钉住（见 §4）。

---

## 4. 验证记录

已在项目内实际执行并通过：

- `npm test` → **156 passed / 10 个文件**（`normalize` 纯函数归一、`lib` 工具与 `paginate` 分页尺度、`components` 组件行为与对话框焦点陷阱、
  `shell` 外壳与 i18n（含文案口径守门）、`journey` 主旅程走真演示数据运行时 + localStorage 种子、
  `a11y` 标题大纲 / 可访问名 / 焦点顺序全站扫描、`evidence-binding` 结论↔证据不变量、`mock-runtime` 时间线持久化、`mock-script` 种子自洽、
  `tokens` 令牌锁：颜色外泄 / 悬空 `var()` / 深色不新增 / 状态色在浅深两张实心面矩阵上 ≥3:1 / 圆角只用档位且档位都不空（见 §3「令牌唯一真源的可执行化」与 §3 第 8 条）
- `npm run typecheck` → 0 error；`npm run lint` → 0 error / 1 warning（`i18n/index.tsx` 的 react-refresh only-export-components，该文件确实同时导出 Provider 与 `useI18n`，为保留单文件 API 而接受）
- `node scripts/check-css-refs.mjs` → 所有 css-module 引用可解析
- `npm run build` → 通过（475.22 KB JS / 45.95 KB CSS，gzip 156.98 KB / 9.00 KB；CSS 与上一轮差 ±0.14 KB 是圆角收档位与状态色取值，见 §3 第 8 条）
- `npx playwright test` → **101 passed / 5 skipped**，5 个 project：`desktop-1366x768` / `edge-1280x800` / `tablet-1024x800` /
  `narrow-820x900` 各跑断点取证 + 无障碍取证 + axe 整页审计 + 性能取数 + 任务级页面取证 + 主题令牌取证，`journey-1366x900` 跑真旅程。
  五条 skipped 都是"这一档确实没有那个东西"：收起态导航与侧栏状态点两条用例在 ≤900px 主动跳过（侧栏那一档整体隐藏，收起按钮与最近任务列表都不存在），
  新增的窄屏「最近任务下拉带状态词」用例反过来只在 ≤900px 跑、三个宽档跳过。细节见下面「断点实测（Playwright + 系统 Edge）」

浏览器真跑（外部 Chrome + `127.0.0.1:5174`，逐项在真实 DOM 上确认）：
总览状态与统计、新建向导空/超长目标提示与预检未勾选不可用源、创建后自动进监控并实时推进步骤、
模拟断线→横幅说明→重连恢复、失败任务落在监控页并可断点续跑（FAILED→RUNNING→推进）、
降级横幅强调色仍为 `--warn`（`rgb(217,119,6)`，非红）而正文改用 `--warn-ink`、报告正文/结论/参考文献/EV 徽章、
`?ev=EV-0005` 深链定位、三种导出各自下载 + Toast + 内容清单、报告页追问得到回复并留在会话区、
设置页主题切换（深色令牌生效并持久化）、语言切英文（部分翻译回退中文）、快进节奏持久化（该轮只验证了开关状态持久化，
运行时 `setSpeed` 的同步遗漏在收敛时发现并补上，见 §3「导航与动作的收敛」第 3 条）、重置演示数据回到 4 个种子、
`?mode=live` 真实切换并诚实报告「无法连接后端服务」、404 页、折叠导航 64px 跨刷新保持。

**首屏白屏缺陷（用户报告后定位并修复）**（外部 Chrome，1888×1031 真实视口量 `main#main` 子节点）：
现象是"打开后总览白屏，往下滑才有内容"。量到的事实：`main#main` 当时有两个子节点，第一个是 `AppShell` 给
`HealthBanner` 套的 `.page` 容器（带 `min-height:100%`）；Mock 自检 `issues: []` 时横幅返回 null，于是那里留下一个
`h=975`（正好等于滚动区高度）的空 div，真正的页面容器 `top=1031` 整块掉到第二屏（`scrollH 1950 / clientH 975`）。
修法是把容器职责还给横幅自己：`AppShell` 直接渲染 `<HealthBanner />`，`HealthBanner` 两个分支的根节点各自带
`.bannerSlot`（`max-width: var(--content-max)` + 上下 margin，不含 min-height），无问题时仍返回 null、不留节点。
修后实测：总览 `children=1`、`scrollH=clientH=931`、h2「总览」`top=88` 在首屏内、4 行任务 `top=358`；
`?mode=live` 断后端时 `children=2`（横幅 `top=72 h=80`、页面 `top=152 h=834`）且 `overflow=0`；
监控页长内容 `pageH=1416` 仍随内容增长、Composer 底边与滚动区底边 `gap=0`（吸底未坏）。
同轮把 `.page` 的 `min-height:100%` 换成 `flex:1 1 auto`——前者在有横幅时必然多撑出一屏滚动，后者只撑"剩余空间"。
回归测试两条（`journey.test.tsx` FE-14）：健康时 `main` 只有一个子节点、有问题时横幅是 `main` 的第一个子节点；
先跑出 2 failed 再改代码，改后 90 passed。
**验证口径的漏洞**：此前所有浏览器检查都在数 DOM 节点、读文案与计算色值，从没断言过"正文首屏可见"，
所以这个把内容整块推下第二屏的缺陷一路通过了分页与键盘走查。后续真跑必须带上 `getBoundingClientRect().top` 与
`scrollHeight/clientHeight` 这一对比值。

**总览表格列宽与状态文案（用户指出后调整）**：`status.run` 收敛为三字一档（待开始 / 执行中 / 已完成 / 未完成，
原 `已完成 · 报告已交付` 去掉长尾；`RunStatusBadge` 是全站共用的，Topbar 与监控页同步变短），
降级从「研究目标」单元格的圆点+文字改为「状态」列的第二枚 warn 徽章（`ui.cellStack` 纵排，仍不用红色）；
`ui.colStatus/colTime/colAction` 定宽 + 时间列 `white-space: nowrap`。
1888×987 真实视口实测：列宽 419 / 92 / 104 / 176，四行状态列文本依次是
`已完成`、`未完成`、`已完成已降级`（两枚徽章）、`已完成`，时间单元格 `14 小时前` 行数=1（改前会断成两行）。
顺带量出一个原有缺陷：表格 min-content 652px 而外壳 `.app{overflow:hidden}`，窄窗口会把「操作」列整列裁掉
（强制 530px 时单元格 right=897 > app right=530）。加 `.tableScroll`（`overflow-x:auto` + `role="region"` + `tabindex=0`）后
同一 530px 下 region right=496 未被裁、`scrollWidth/clientWidth=652/252`，滚到底时操作按钮 88/88px 完整可见；
真按 ArrowRight（非合成事件）使 `scrollLeft` 0→44 且焦点仍在 region，键盘可滚。焦点环走全局 `:focus-visible` 的 `--focus-ring`。
回归测试改在 `journey.test.tsx` FE-03：逐行断言状态列匹配 `^(待开始|执行中|已完成|未完成)(已降级)?$`、目标列不含「已降级」、
全站无 `报告已交付` 字样。

**总览与外壳收敛后复测**（用户 6 点评审后，外部 Chrome，1888 CSS px 真实视口，样式注入 `transition:none` 后量计算值）：

- 居中：`thead th` 与 `tbody td` 计算 `text-align` 全为 `center`；四列宽 419 / 92 / 104 / 176，`.tableScroll` 的
  `scrollWidth === clientWidth === 791`（无裁切）；176px 操作单元格里复制徽章 105px、开页按钮 88px 均左右居中，行高 84px。
- 去噪：表格 `textContent` 不含 `run-\d` 与 `sess-`；复制徽章可访问名为「复制 AGH 会话标识 sess-…」，
  `title` 为「任务 run-… · AGH 会话 sess-…」，徽章文案「AGH 已记录」。
  剪贴板用连接器的**真实点击**复测（合成 `.click()` 会因缺少用户激活而走到「复制失败」兜底分支，属通道限制不是缺陷）：
  出现 Toast「AGH 会话标识已复制」且行点击未被子按钮冒泡触发（仍停在总览）。
- 导航收敛：侧栏 `nav` 只有「总览 / 设置」两项；总览顶栏按钮集为空，任务页顶栏只有任务标识复制徽章；
  新建入口只剩侧栏「新建科研任务」+ 总览页头 2 个；设置页不再有「快进 / 正常速度 / 重新演示」等全局按钮，
  改为「演示数据（仅未接后端时可用）」下的「快进演示时间线」+ 无法加速的说明文案。
- 任务内可达：已完成行→报告页（header 给「运行监控」「证据溯源」，下方「导出与交付」列出三项各自的内容说明）；
  失败任务 `/monitor/run-20261006-234120-bpyjs4` header 按钮 = `["证据溯源"]` 且无报告入口（报告未就绪，不给假按钮）。
- 侧栏连接卡的「会话」字段显示 `session_id`（实测「会话 sess-vxc1sa」，无当前任务时为「会话 —」），此前误显示任务 id。
- 回归测试同步更新（`shell.test.tsx` FE-02 改写 + 3 条新用例、`journey.test.tsx` FE-03 新增机器标识用例、
  失败任务用例补证据溯源断言）；`rowOf` 改用 `data-task-id` 定位行，因原始 id 已退出 DOM。
  上述改动后重跑：typecheck 0 error、**92 passed**、lint 0 error / 1 既有 warning、css-refs OK、build 通过。
- 顺带清掉两处残留：`ui.hint` 改为 flex 行（全局 `svg{display:block}` 会让带图标的提示文案换行，
  总览表下方「AGH 会话…」那行一度出现图标独占一行的观感）；删除无任何引用的 `.pageWide`。

**分页真跑实测**（外部 Chrome，530 CSS px 视口下读真实 DOM）：证据页 12 条 → 首屏渲染 EV-0001…EV-0010，分页条文案「第 1–10 条 / 共 12 条 · 第 1/2 页」，上一页 disabled；点下一页 → 只剩 EV-0011/EV-0012、「第 11–12 条 / 共 12 条 · 第 2/2 页」、下一页 disabled；
再点上一页回到 EV-0001…EV-0010。在第 2 页把「按层级」筛成 artifact（4 条）→ 分页条整个消失且列表非空，没有停在空白页。
`?ev=EV-0012` 深链自动落到第 2 页，卡片带 `_evCardHi` 高亮类且 `getBoundingClientRect().top = 289` 在视口内。
降级任务的 8 条证据与 4 条任务的总览都不出现分页条（无假控件）；该任务的过程轨迹 20 条 + 「显示其余 4 条」点开到 24 条后按钮消失。
总览经向导真建 7 个占位任务凑到 11 条：第 1 页 10 行、「第 1–10 条 / 共 11 条」，第 2 页 1 行、「第 11–11 条 / 共 11 条」且下一页 disabled；
验证完点「重新演示」复位，回到 4 个种子且列表无占位任务残留。

**纯键盘走查实测**（真按键 Tab / Shift+Tab / Space / Enter / Escape / ArrowDown，非 jsdom）：
每页第一个停靠点都是「跳到主内容」，Enter 后 `location.hash = #main`、下一次 Tab 直接进 `main` 内的「返回报告」；
证据页 530px 视口下可见可聚焦控件 28 个、总览 9 个、新建 18 个、报告 31 个、设置 10 个——全部拿到焦点、全部 `:focus-visible` 且
有 outline/box-shadow 焦点环、全部有可读名字（新建/设置里 5+1 个 checkbox 的名字来自 `htmlFor` 关联，不是 `aria-label`）；
无正 tabindex、无 `cursor:pointer` 却没有等效键盘入口的鼠标专属控件（总览整行可点是鼠标快捷方式，每行都另有「查看报告 / 查看运行监控」按钮）。
原生 `<select>` 用 ArrowDown 改值即触发筛选（`all→fact` 后列表从 12 条变 8 条、分页条随之消失）；
Composer 用真 Enter 发送成功（输入框清空、消息与「已基于当前会话回答…」落在会话区）；Space 激活翻页按钮可用。

- 走查发现并已修复 3 个对话框可达性缺陷（`Overlay.tsx`，Modal 与 Drawer 之前共用同一 hook）：
  ① 只有 `aria-modal="true"` 却没有焦点陷阱——实测打开「这是什么」后连按 Tab，焦点会跑到背景的「过程细节」上；
  现在 Tab / Shift+Tab 在对话框首尾焦点之间回环，实测两次 Tab 都停在「关闭」按钮内；
  ② `role="dialog"` 没有可访问名字——现在 `aria-labelledby` 指向标题节点，实测解析出「这是什么」；
  ③ Esc 关闭后焦点丢失——现在归还给触发它的控件，实测关闭后 activeElement 回到「这是什么」。
  归还焦点依赖 `onClose` 引用稳定，故把回调放进 ref、effect 只跟 `open` 走（调用方传的都是行内箭头函数）。
- 同轮删掉了 `Drawer`：需求文档 §5.2 的「Modal / Drawer」是一个容器条目，全站只有 Modal 在用，抽屉形态实际由 `Collapse` 承担，
  留着是没人引用的死代码（连同 `.drawer / .drawerOverlay / .drawerBody` 三条样式）。
- 两个本轮无法证实的项（不写成"已通过"）：
  ① **Enter 激活原生 `<button>`** 在本连接器里不可复现——同一焦点下 Enter 只产生 keydown/keyup 而无 click，
  但页面上新插入一个裸 `<button type="button">` 也是同样结果，且 Space 一切正常，所以判定为通道的合成按键限制、不是应用缺陷；
  ② **≥900px 视口下的侧栏键盘遍历**：连接器标签页只有 530 CSS px，侧栏按 `@media (max-width:900px)` 设计被隐藏，
  于是改为注入 `display:flex` 强制显示后再测——9 个导航项 / 历史项 / 折叠按钮都取得焦点、有名字、有焦点环，当前项带 `aria-current`，
  历史项带 `title` tooltip；这是在改造后的布局上测的，宽视口真机复看仍待做（见 §5）。
  **注意该轮的"9 个导航项"已过期**：随后的导航收敛（见 §3「导航与动作的收敛」）把全局项减为「总览 / 设置」两项，
  折叠态 tooltip 与焦点遍历需要在宽视口下按 2 项 + 历史任务项重测。

**WCAG AA 文本对比度量化实测**（自写脚本按相对亮度计算，逐个带文字节点取生效前景/不透明背景，
正文阈值 4.5:1、大字 3:1；在外部 Chrome 真跑，非估算）：
总览 / 新建 / 监控（运行中·降级·失败）/ 报告 / 证据 / 设置 共 8 个页面态，浅色与 `data-theme='dark'` 各一轮、
每轮 484 个文本节点（该轮在后台标签页测得，侧栏被 0 宽视口隐藏，故又单独补测侧栏+顶栏 13 个节点），不达标 0；
另单独打开「降级说明」Modal（+54 节点）复测也是 0。

- 首轮实测确实发现 6 组不达标并已修复：`--ink-3` 由 `#9b9b96`（2.79:1）提到 `#6b6b66`（≥4.74:1）；
  状态色的**文字档**新增 `--ok-ink / --warn-ink / --fail-ink`（`tokens.css`），正文用深色档、
  圆点/描边/底色仍用原语义色，因此降级仍是橙色且文案「已降级 · 任务未中断」不变（实测 5.42:1，深色 7.25:1）。
- 取舍：为满足 AA，弱化文字比前端 Demo 略深，Demo 的"浅灰"观感有轻微损失；这是文档 §10 与 Demo 取色冲突时的选择。
- 测量注意（一）：连接器的标签页若未被拉到前台，`window.innerWidth` 会读到 0、动画时间线也不推进（`CSSTransition` 停在 `currentTime: 0`）。
  这会造成两类假象：`@media (max-width:900px)` 按"超窄屏"命中而使侧栏 `display:none`（看起来像"折叠后导航丢失"），
  以及主题切换读到过渡中间值（看起来像"深色令牌没生效"，本轮深色态 `新建任务` 按钮一度读到 `rgb(217,164,65)` 与前一帧 `rgb(186,141,58)`）。
  实测必须先拿到真实视口，并注入 `transition:none !important`；
  在 1888 CSS px 真实视口下复测：展开侧栏 220px / 折叠 64px（图标可见、`title` 提供 tooltip、偏好持久化），
  总览与监控页 `scrollWidth-clientWidth = 0` 无横向溢出，展开/折叠两态浅色与深色对比度同样 0 不达标。
- 测量注意（二）：合成背景时必须按 alpha 逐层叠加。早期版本"向上找第一个不透明背景"会在半透明徽章上出错——
  `已完成 · 报告已交付` 的 `--ok-soft` 被当成 `rgb(23,154,107)` 实底，算出 1.49:1 的假不达标。
  改成 alpha 合成后，含新 `Pager` 的证据页在浅色 156 节点 / 深色 156 节点上均为 0 不达标（分页条、区间文案、翻页按钮都直接吃 `--ink-2 / --ink-3` 令牌，未额外取色）。

**agent 视图这一轮（用户第 7 轮评审：聚焦态 + 三个缺陷 + 工作台升级）**

改动：`composer.module.css` 聚焦环只画在容器、`MonitorPage` 右列常驻三面板（`ToolCard` 列表 / `RunStats` / `ArtifactList`）、
Mock 层错误改走 `ApiError` 码、追问回放脚本去掉伪造的 `done`/`report` 帧与「已绑定证据」文案、
失败种子任务的脚本截在失败点之前。测试从 92 → **100 passed**（新增 `FE-05 agent 常驻面板` 3 条、
`FE-10 对话轮次不得伪造运行终态` 3 条、FE-11 的可读错误与「不摆假重试」断言、终态运行步骤自洽 1 条）。

真实浏览器（`127.0.0.1:5174`，先按 `layout.module.css` 的**服务源码**指纹确认改的就是跑着的那份）读渲染后的 DOM：

- 已完成任务 `/monitor/run-…-wawjnn` 右列三张卡依次是「工具调用监控 6 次调用 / 运行统计 / 产物梳理 4 件」，
  未点任何按钮即可看到 6 个工具名（`sciret_search_literature` 等），页面上已无「过程细节（工具调用与入参出参）」折叠按钮。
- 面板数字与 store 逐项对得上：`6/6` 步骤、`6` 工具调用（DOM 里正好 6 个工具卡）、`12` 证据登记、`4` 结论、`40` 会话轨迹、
  `0` 对话轮次；证据层级行读作「事实（fact） 8 · 产物（artifact） 4」，与产物面板的 4 条链接（EV-0007/0008/0009/0011）自洽。
- 产物深链实测：进 `/evidence/…?ev=EV-0008` 后页面出现「已定位到 EV-0008」。
- 失败任务上发一轮修订（选「修订」→ 输入 → Enter）：请求文本回显、右列工具监控多出「按请求修订报告」、
  回复文案是「（演示数据回放）已记录修订请求…」，`run_status` 仍是 `FAILED`、`report_ready` 仍 `false`，
  页面**没有**长出「报告已生成」条。
  **按键口径**：这次没有可见 surface，选模式/输入/Enter 都由脚本派发事件走 React 的 `onClick/onChange/onKeyDown`
  同一条处理路径（不是 jsdom），但不是真按键盘；真按键的 Composer 发送在上一轮 530px 视口里实测过（见上面「纯键盘走查实测」）。
- 该轮暴露出一个种子不自洽：失败任务步骤里留着 `R4: RUNNING`，新统计面板照实念成「进行中 1」，
  等于让早已停下的任务看起来还在跑。先加不变量测试跑红（`FAILED 任务 … 步骤 R4 仍是 RUNNING`），
  再把种子脚本截在失败点之前；重灌演示数据后实测读数为「步骤状态 待执行 3 · 未通过 1」，无「进行中」，
  且 `2/6 + 未通过 1 + 待执行 3 = 6` 逐条对得上。

**布局与聚焦态的宽视口复测**（用户让改用内嵌 Browser；它的标签页 `visibilityState` 仍是 `hidden`，
`take_screenshot` 因此报 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`——拿得到尺寸拿不到画面，所以**像素/画面级**结论仍然没有，
但几何与计算样式已能在真实视口 `724×772 CSS px` 上量，先注入 `transition:none !important` 再读）：

- 724px 命中"窄于一栏"分支，实测：`agentGrid` 计算 `grid-template-columns` 是单轨 `691.333px`，
  文档 `scrollWidth - clientWidth = 0`，三张卡 `scrollWidth === clientWidth`，右列顺排在主列之后。
- **≥1280px 的两栏分支当时仍然只能推算**（该口径限制已由本节末尾的 Playwright 断点实测解除）：连接器改不了标签页尺寸，媒体查询没法真的命中。为把这一分支的风险量干净，
  改用"把列钉到它在 ≥1280px 会拿到的宽度"实测内容会不会被裁：栅格 `gap` 量得 24px、`pageAgent` 的 `max-width` 量得 1160px，
  于是右列 330px、主列 `1160 - 24 - 330 = 806px`。
  - 右列钉 330px：三张卡横向溢出 0，`dl` 统计块 297/297 不溢出。
  - 主列钉 806px：「执行步骤」「当前进展」两卡横向溢出 0，步骤条实宽 773px 放得下，文档无横向溢出。
- **这一档量出一个真缺陷并已修**：330px 栏宽下产物条目的标题与路径被 `text-overflow: ellipsis` 裁掉
  （4 条标题里 2 条、4 条路径里 2 条 `scrollWidth > clientWidth`，如「方法—原理—…（v3）」需要 260px 而只给 204px），
  而这两行都没有 `title` 兜底，等于文字在页面上无处可看。`monitor.module.css` 的 `.artifactTitle/.artifactRef`
  改为 `overflow-wrap: anywhere`（去掉 `nowrap` + 省略号），复测 4/4 标题与 4/4 路径不再裁切
  （标题 21→43px 变两行、路径 18→36px，条目高 59~99px，卡片仍 0 横向溢出）。
- Composer 聚焦态用**真 Tab 键**复测（`press_key`，不是脚本 `focus()`）：焦点落在 `#composer-textarea`，
  `matches(':focus-visible')` 与容器 `matches(':focus-within')` 同时为 true；
  容器计算 `box-shadow` = `color(srgb .0667/.0667/.0667 / .18) 0 0 0 3px` + `rgba(16,16,16,.08) 0 6px 24px`
  （单层 accent 环 + `--shadow-md`）、边框 `rgb(17,17,17)`；textarea `box-shadow: none`、`border-radius: 0px`、
  `outline-style: none`——**无双环**；失焦后容器回到 `box-shadow: none` + 边框 `rgba(16,16,16,.15)`。
  上一轮 `ta.focus()` 那次读到的数值本轮由真键盘路径复现，口径限制已解除。
- 另发现一处既有无障碍缺口：`Card` 的标题不是标题元素也没有 `aria-*`，于是右列三张卡对读屏是无名 `section`
  （全站 `Card` 同形，非本轮引入），已记进 §5。

**断点实测（Playwright + 系统 Edge，零下载）**

上面「≥1280px 只能推算」的口径限制已由这套件解除。新增 `playwright.config.ts` + `e2e/breakpoints.spec.ts` +
`e2e/journey.spec.ts` + `e2e/helpers.ts`（`tsconfig.json` 的 `include` 加了 `e2e`，所以 `npm run typecheck` 会检查它们；
vitest 的 `include` 只收 `*.test.*`，不会重复跑这套件）。

- **浏览器口径**：`@playwright/test` 实装 1.64.0，它要的 chromium build 1248 不在本机缓存里（只有 1243），
  默认跑法要先下 ~170MB 二进制。因此配置里统一 `channel: 'msedge'`，直接用系统 Edge（Blink 内核，与用户实际浏览器同源），
  **没有下载任何浏览器**，也遵守 §4 的"先指纹确认服务的是哪份源码"口径（`webServer` 复用 5174 的 dev server，`strictPort` 保证不会串端口）。
  `reuseExistingServer: true` 复用当前已在跑的实例；`emulateMedia({ reducedMotion: 'reduce' })` 走 `base.css` 自带的
  `prefers-reduced-motion` 分支把过渡压到 0.01ms，读到的就是终态计算值，不是过渡中间态。
- **档位**：projects 按视口分 1366×768 / 1280×800 / 1024×800 / 820×900 四档跑同一组取证，1366×900 单档跑真旅程。
  Playwright 每个用例用全新 context，不会污染手工演示那三份 localStorage。
- **实测到的几何**（每档都过）：`@media (min-width: 1280px)` 的判定与视口宽度一致（1366/1280 命中、1024/820 不命中），
  命中时 `agentGrid` 的**计算** `grid-template-columns` 确实是两轨且右轨 `330px`，主轨 + 右轨 + `gap` 恰等于容器宽度（不留空洞），
  容器 `clientWidth ≤ 1160px`；未命中时单轨。四档文档 `scrollWidth ≤ clientWidth`（0 横向溢出）。
  产物梳理每条 `artifactTitle/artifactRef` 的 `scrollWidth` 不再大于 `clientWidth`——刚修的换行回绕在真两栏下成立。
- **聚焦态**：用真键盘 `Tab`（跳数上限按页面实际可聚焦元素数自缩放，见 `e2e/helpers.ts#FOCUSABLE`）走到 `#composer-textarea`，
  断言 `:focus-visible` 与容器 `:focus-within` 同时为真、textarea 自身 `box-shadow: none` + `outline-style: none`、
  容器环只有 2 层（3px accent 环 + `--shadow-md`）；边框与环都**轮询到终值**再断言（原因见下面「一次偶发失败的取证」）。
- **旅程**：新建任务→落到 `/monitor/run-…`→步骤条从全 `待执行` 真的走出 `已完成`（新任务快照初始全是 `PENDING`，
  所以这条断言证明的是时间线推进，不是装饰）；已交付任务的工具监控徽章不是「0 次调用」、产物链接带 `?ev=EV-…` 深链、
  证据页出现「已定位到 EV-…」与高亮卡；已交付任务追问后出现「（演示数据回放）已收到追问」且 URL 仍停在监控页（不伪造终态）。
- **这套件顺手抓到的两处口径错误**（都改的是测试而不是应用，说明断言本身有效）：
  任务 id 前缀实际是 `run-` 而非 `task-`，证据 id 是 `EV-` 大写——最初的断言按想象写死了小写 `task-/ev-`，跑红后改正；
  侧栏隐藏后其后代 `<nav>` 的 computed `display` 仍是 `block`（父级 `display:none` 不传导），
  所以"窄档没有可见导航"必须按 `offsetParent` 判定，第一版按后代 display 判定误报出 `nav[]` 与右列 `aside[过程、统计与产物面板]`。
- **CI 侧的诚实说明**：本机零下载是靠系统 Edge 拿到的。换到没有 Edge 的 CI 需要先 `npx playwright install chromium`
  （或装 Edge），否则 `channel: 'msedge'` 起不来。

**一次偶发失败的取证（reduced-motion ≠ 同一帧落到终值）**

全套件并行跑时，`[narrow-820x900] › Composer 真键盘聚焦` 会偶发跑红（单跑必过）。红的是**失焦后**那条断言：
期望 `box-shadow: none`，收到的却是聚焦环本身。

- **探针**（一次性 `e2e/_probe.spec.ts`，取证后已删除，连跑 3 次形状相同）：`blur()` 之后
  `box.matches(':focus-within')` 同步读已经是 `false`，但同一 tick 里 `getComputedStyle(box).boxShadow`
  仍是环的值；再等 120ms 才读到 `none`。
- **结论**：`prefers-reduced-motion` 把 `transition-duration` 压到 `0.01ms`，但过渡仍要跨一帧才结束——
  同步读计算样式读到的是上一帧。这正是 §4「测量注意（一）」记过的同类陷阱在 Playwright 侧复现。
  判定为**测试口径缺陷，不是应用缺陷**：真实用户看到的过渡是对的。
- **修法**（只改测试）：焦点/失焦两侧都改成轮询到终值（`expect(box).toHaveCSS('border-color', …)`、
  `expect.poll(…boxShadow…).toContain('0px 0px 0px 3px')`、失焦侧 `toHaveCSS('box-shadow','none')`），
  终值确认后才一次性取其余读数；Tab 跳数上限从魔数 60 改为按 `document.querySelectorAll(FOCUSABLE).length + 10` 自缩放，
  `FOCUSABLE` 提到 `e2e/helpers.ts` 与 `a11y.spec.ts` 共用（顺带消掉重复的选择器字面量）。
- **复跑证据**：改后 `breakpoints.spec.ts` 连跑 3 轮均 `23 passed / 1 skipped`；改前同一轮是 `22 passed / 1 failed / 1 skipped`。
  副作用是断言变强了：现在它证明的是"环最终出现并最终消失"，而不是"某一刻采样到某个中间值"。
- **顺手记一个自己踩的坑**：把 `FOCUSABLE` 提进 `a11y.spec.ts` 时直接写进了 `locator.evaluate` 的函数体里，
  而 Node 侧常量在页面上下文不可见 → 4 个 project 各红一条（`ReferenceError: FOCUSABLE is not defined`），
  改法是把它当参数传进 `evaluate((btn, sel) => …, FOCUSABLE)`。全套件跑第二遍才暴露，说明"只跑单个 spec"验证不够。

**无障碍这一轮（用户第 4 点：「无障碍也由你设计并落实」；设计决定见 §3「无障碍的设计决定」）**

改动是 `ui/Card.tsx`（标题改真标题元素 + `titleLevel`）、`ui/Collapse.tsx`（可选标题层级 + disclosure 用 `hidden`）、
`styles/ui.module.css`（`.cardTitle`/`.collapseHeadWrap`，并删掉 `.collapsed .collapseBody{display:none}`）、
`layout/AppShell.tsx`（`main` 加 `tabIndex={-1}`）、`pages/EvidencePage.tsx`（过程轨迹折叠区声明 `titleLevel={3}`）。

- **单元层（`tests/a11y.test.tsx`，21 条，先跑红再实现）**：三类断言——
  ① `FE-01 Card / Collapse 的标题语义`（4 条：默认三级、卡片套卡片由调用方降级、`Collapse` 不声明层级时不进大纲、声明了才进）；
  ② `全站标题大纲`（6 条：每页恰好一个 `h1`、`h2` 是页面标题、层级不跳级 `level > prev+1`、`main` 带 `tabindex="-1"`）；
  ③ `全站可访问名与焦点顺序`（10 条：6 个页面各扫一遍无名可聚焦元素、无正 tabindex、表格 caption、折叠区可达性、
  Composer 输入框的名字不与发送键重合）；④ `运行状态不只靠颜色`（1 条：侧栏每行的可访问名里带状态词）。
  扫描类用例最怕"测了个空"，所以每页设了**可聚焦控件数量地板**（总览/新建 8、监控/报告/证据 6、设置 8），
  低于地板直接失败；可访问名按真实解析顺序取（`aria-label` → `aria-labelledby` → `label` 关联 → 文本/值），
  失败信息会打印 offender 的标签 + 首个 CSS Module 类名 + 文本片段，便于定位而不是只知道"有一处无名"。
- **变异验证（证明这些断言不是摆设，本轮重跑）**：把 `Card` 的 `<Heading>` 换回 `<div>` → `2 failed | 17 passed`
  （红的正是 FE-01 两条语义用例）；把 `Collapse` body 的 `hidden={!expanded}` 去掉 → `1 failed | 31 passed`
  （红的是 disclosure 用例）；两处分别恢复后 `19 passed`，且 `diff` 与改动前**逐字节一致**。
- **RED 过程**：第一版 19 条里跑出 11 failed，其中 6 条是我自己的定位器错误——`findByRole`/`findByText` 命中多个元素时抛错
  （总览与设置页本来就有同名节点），改用 `findAllBy*` 后才是真实的语义失败；这不是"测试写错了"，
  而是提醒后续浏览器用例都必须按复数取。
- **浏览器层（`e2e/a11y.spec.ts`，8 条 × 4 个视口 project = 32 次调度、实跑 31 次，全绿）**：
  ① 总览 / 新建 / 运行监控 / 设置 四页的标题大纲无跳级，且 `document.documentElement.lang` 与当前语言一致；
  ② 卡片标题的计算 `fontSize`/`fontWeight` 与其父容器相同、`margin-top` 为 0（即变成 `h3` 没有改变排版）；
  ③ 第一次真 `Tab` 落在「跳到主内容」（文案与 `href="#main"` 都断言），回车后 `activeElement.id === 'main'`；
  ④ 收起的「审计细节」body：`hidden === true`、按 `aria-controls` 取到的内部可聚焦元素数为 0、
  程序 `focus()` 也落不上去；点开后 `hidden === false`、`height > 0`、焦点能进；
  ⑤ WCAG 2.1 对比度按**运行时 computed style** 现算（相对亮度公式，含 alpha 合成），
  取样 `h1` / 页面标题 / 卡片标题 / 单元格标题 / 统计标签 / 弱化文字 / 徽章，
  要求样本数 ≥5 且每条 ≥ 4.5:1；
  ⑥ **原生 `<button>` 上的真 Enter 激活**（补掉此前记在 §5 的最后一条具名键盘缺口）：
  在总览用真 `Tab` 一跳一跳走到行内「查看报告」（跳数上限按页面可聚焦元素数自缩放，不用 `focus()` 代走），
  先断 `activeElement.tagName === 'BUTTON'`，再按真 Enter，断 URL 变成 `/report/{该行的 data-task-id}` 且顶栏 h1 是「报告」。
  **变异取证做了两遍**：把 `ui/Button.tsx` 换成 `<div role="button" tabIndex={0}>`（鼠标照点、键盘废掉的那种典型回归）后，
  第一遍红在结构断言（`Expected: "BUTTON" Received: "DIV"`）；把结构断言临时中性化再跑一遍，
  行为断言**同样红**（`toHaveURL` 停在 `http://127.0.0.1:5174/`）——所以这条用例不是只在看标签名，它真的测得到"回车有没有激活"。
  恢复后 `npm run build` 的产物 hash 与变异前逐字相同（`index-Dg6Js51c.js` / `index-ZWF18UkT.css`），确认没留下半行改动。
  ⑦ **侧栏最近任务的状态点带可读名**（优化插件轮补的缺口，设计口径见 §3 第 7 条）：量 `a[class*="histItem"]` 的行数，
  再量可访问名命中 `已完成|执行中|待开始|未完成` 的链接数，两者必须相等；≤900px 侧栏不存在，按档位主动 skip。
  变异取证：去掉 `Dot` 的 `label` 后该档报 `4 行最近任务里有 4 行只靠颜色表达状态`，恢复后绿。
  单元测试 `tests/a11y.test.tsx` 同口径先红（4 行里 0 行报出状态）后绿，两侧一起做过同一次变异。
- **这一轮抓到并修掉的真实缺陷**：跳转链接此前只把 URL 变成 `#main`，焦点并没有进主内容——因为 `<main>` 默认可聚焦不了。
  该用例在 4 个 project 里先跑红 3 个，加 `tabIndex={-1}` 后 20/20 通过。
  另有一处是自家测试暴露的：文案口径用例在同一个文档里渲染了两份应用而没 `unmount`，
  新的 `h3` 让 `findByRole('heading')` 直接报多匹配——修正查询作用域并补 `unmount()`。
- **仍然没有的证据**：没跑过真实屏幕阅读器（NVDA / VoiceOver / 读屏 App），断言的是 DOM 语义、可访问名解析与焦点行为；
  键盘 Tab 链的**精确顺序**仍只断言"能走到目标控件"，没有逐站点比对序列。

**响应式、收起态与首页归属（用户第 2 / 3 / 6 点）**

- **≤900px 的替代导航（DR-13 关闭，不再需要用户定方案）**：侧栏在这一档仍整体隐藏，主导航改由顶栏的
  `components/layout/NarrowNav.tsx` 承担（`aria-label="窄屏导航"`，含新建 + 全局项 + 「最近任务」原生 `select` 跳转）。
  选原生 `select` 而不是自造浮层的理由写在组件注释里：焦点、滚动锁、Escape 交给浏览器，触屏上也是系统选择器。
  断点只在 `app/nav.ts#NARROW_QUERY` 登记一次，组件用 `lib/hooks.ts#useMediaQuery` 命中，
  CSS 与 JS 两处同值——必须 JS 驱动，是因为 jsdom 不执行媒体查询，纯 CSS 方案在单元测试里不可观测。
  e2e 取证（`breakpoints.spec.ts`「侧栏只在 >900px 可见；≤900px 由顶栏窄屏导航接管」）在四档视口断言：
  侧栏可见性与 `width > 900` 一致、窄档恰好 1 个「窄屏导航」landmark、总览/设置/新建链接逐个可见、
  `selectOption` 真选一个任务后落到它的页面。
- **收起态图标对齐（用户第 3 点）**：64px 轨道下 `.brand` / `.navItem` / `.collapseBtn` 统一
  `justify-content: center; padding-left: 0; padding-right: 0`，图标落在列中轴上；
  文字标签在收起时不进 DOM（条件渲染），所以键盘 Tab 不会扫到看不见的标签，读屏也不会念出被裁掉的文字。
- **总览是首页（用户第 6 点：「刷新页面会显示会话不存在」）**：
  ① `/` 渲染总览，`/overview` 保留为别名并 `<Navigate to="/" replace />` 归一（`nav.ts` 的 `routeMeta` 同步认这个语义名）；
  ② 任务确实不存在（`NOT_FOUND`）时，三个任务页统一由 `app/useTaskGoneRedirect.ts` 回总览 + warn Toast
  说明是哪个任务找不到（`toast.taskGone`），顶栏也不再挂那个失效 id；
  ③ **只有**"任务不存在"才回总览：超时/断线类瞬时错误留在原页并保留重试（有专门用例断言不回跳）；
  ④ 原症状的根因是落盘时机：演示数据运行时改为创建时同步 flush，并监听 `pagehide` 补写防抖中未落盘的变更
  （`api/mock/runtime.ts`），所以新建后立刻刷新仍停在同一个任务的监控页。
  这三条都有真浏览器用例（`journey.spec.ts`「总览是首页」：别名同页、失效地址回总览且刷新后仍是总览、
  新建后刷新 URL 不变），以及 `tests/journey.test.tsx` 的 4 条同名用例（含证据深链失效与瞬时错误不回跳）。

**性能取数（文档 §10，用户第 5 点「能补项也可以推进」的第 ① 项）**

新增 `e2e/perf.spec.ts`，两档口径都在真实浏览器里量，不推算：

- **首屏可交互**：从 `goto('/')` 起，在页面内用 `requestAnimationFrame` 轮询到「`h1` 文本是「总览」且总览表格首行的动作按钮已在 DOM 里」
  为止，取 `performance.now()` 作为 TTI；FCP 单独用一个 `buffered: true` 的 paint `PerformanceObserver` 取
  （paint 计时是缓冲条目，`addInitScript` 里挂 observer 才拿得到；FCP 比"内容可用"晚一帧落账，所以它不能当就绪条件，只单独轮询取数）。
- **路由切换**：起点是页面内**捕获阶段**的 click 时间戳（不用 CDP 往返时刻，否则把驱动开销算进用户延迟），
  终点是 rAF 轮询到目标页 `h1` 变成「设置」的那一帧；测前先各访问一次 `/settings`、`/new` 预热——
  dev server 按需编译模块，首次进某条路由的编译时间不属于用户感知的切换延迟。

实测数字（本机 Edge，`workers: 1`，四档视口各一轮，文档 §10 预算：首屏 ≤3000ms、切换 ≤300ms）：

| 取数环境 | 首屏 TTI | FCP | 路由切换 |
| --- | --- | --- | --- |
| dev server（`npm run dev`，5174） | 248–272ms | 296–384ms | 6.6–8.0ms |
| 生产构建预览（`npm run build` + `vite preview --port 5175 --strictPort`） | 158–167ms | 248–328ms | 4.2–4.9ms |

两档都在预算内，且生产构建明显更快（dev 那档慢是按模块加载的代价，不是产物本身的量级）。
复现命令：默认打 dev；要量生产构建就先起预览再指过去——`playwright.config.ts` 的 `BASE_URL` 现在读 `E2E_BASE_URL`，
就是为这一步留的口子，避免把 dev 的按模块加载当成"真实首屏"：

```bash
npm run build && npx vite preview --port 5175 --strictPort &
E2E_BASE_URL=http://127.0.0.1:5175 npx playwright test e2e/perf.spec.ts
```

用例把每次取数既打到 stdout（`PERF firstscreen tti=… fcp=…` / `PERF routeSwitch …ms`）也挂成 `perf` annotation 进报告，
所以"过了"和"量到多少"是同一份证据。**没有量到的一档**：文档 §10 第三项「SSE 事件到 UI」要真实后端的事件时间戳才能对齐口径，
演示数据回放里的时间线是自己推进的，量出来的数没有意义，所以套件里没有假装量过（见 §5）。


**令牌化与主题真实生效（第 ② 项）**

- `tests/tokens.test.ts` 先跑红：报出的正是那 3 处违规（`base.css:72 rgba(`、`base.css:78 rgba(`、`ui.module.css:426 rgba(`），
  另外两条锁（`var(--x)` 都有声明、深色块不新增令牌）第一次就是绿的，说明这两条本来就自洽，不是新加的理想国规则。
  改完令牌后 3 passed。**变异取证**：把 `ui.module.css` 的 `var(--scrim)` 换回原来的字面量 → `1 failed | 2 passed`
  且报的还是那一行；按备份恢复后 `3 passed`。
- `e2e/theme.spec.ts`（1 条 × 4 档视口 = 4 次真跑，全绿）走的是真路径：设置页的原生 `select` 选「深色」→
  `store/uiStore.ts#applyTheme` 写 `documentElement.dataset.theme` → `tokens.css` 的 `:root[data-theme='dark']` 覆盖，
  然后读**计算值**断言：浅色档 `--scrim` 仍是 `rgba(16, 16, 16, 0.28)`、`--scroll-thumb` `rgba(16, 16, 16, 0.16)`
  （这两个数字与令牌化之前的字面量逐字相同，所以"浅色观感没变"不是口头承诺）；
  深色档换成 `rgba(0, 0, 0, 0.55)` / `rgba(232, 232, 230, 0.16)`（滚动条滑块换成浅色墨，深底上才看得见），
  `body` 背景也随之改变；刷新后仍是深色档（偏好持久化）。
- **还没有的证据**：深色主题的实际观感（遮罩够不够沉、滚动条好不好看）没人眼看过，断言的是计算值；
  套件跑的是无头 Edge，见下面「像素/观感级」那条口径。

**任务级页面的四档取证（第 ③ 项：e2e 扩面）**

新增 `e2e/pages.spec.ts`，4 条 × 4 档视口 = **16 次真跑全绿**，把原先只在 530 CSS px 手工看过的分页与对齐搬进套件：

- **总览表格**：整表 `thead th / tbody td` 的计算 `text-align` 集合必须是 `['center']`（用户评审第 1 点）；
  状态列只允许 `{已完成, 未完成, 已降级, 待开始, 执行中}` 且每个词**正好三字**、堆叠不超过 2 项（用户评审第 1 点的"长度要统一"）；
  更新时间列用 `Range.getClientRects()` 数 line box，每行必须是 1（用户评审第 1 点的"不然分行很丑"）。
- **EV 徽章与跨页深链**：报告页结论上的徽章点进去，URL 带 `?ev=`、页面出现「已定位到 EV-xxxx」、
  高亮卡片（`[class*="evCardHi"]`）恰好 1 张、其 `id` 就是那条、且 `toBeInViewport()`；
  再直接访问 `/evidence/{taskId}?ev=EV-0012`（第 2 页的条目）断言自动跳到第 2 页并定位——
  结论只绑到 EV-0001…EV-0008，全在第 1 页，**光点徽章量不到跨页这条路径**，所以这一段是补上去的。
- **证据分页**：`第 1–10 条 / 共 12 条` → 下一页 → `第 11–12 条`，两页的 `ev_id` 集合无交集；
  首页的「上一页」禁用且 `title="已是第一页"`、末页同理（不做"点了没反应"的假按钮）；四档都断言 `scrollWidth - clientWidth ≤ 0`。
- **Composer 停靠区是不透明层**（这条是下面「画面级走查」查出来的缺陷回归锁）：断 `#composer-textarea` 的包裹层
  `position: sticky` + `bottom: 0px` + `background-image: none` + `background-color` 是不透明 `rgb(...)`。
  前两项原本就成立，后两项是本轮才成立的——所以这条用例锁的正是"别再把遮罩渐变加回来"。
- **变异取证（3 次，逐条恢复）**：`text-align: center → left` 让总览那条红（报 `出现非居中对齐：left,left,…`）；
  `PAGE_SIZE = 10 → 100` 让分页那条红（控件按设计不渲染，`toBeVisible` 失败）；
  删掉 `EvidencePage` 里 `setPage(pageOf(…))` 让深链那条红（跨页目标停在第 1 页）。三者恢复后全绿。
- **这一轮的用例形状纠正过两次**，都记在这里以免后来人误读证据：
  ① 最初按报告标题「固态电解质界面阻抗表征方法研究综述」去总览找行，`element(s) not found` ——
  总览行上渲染的是**研究目标的截断形式**（「固态电解质界面阻抗的主要表征方法有哪些…」），报告标题是另一个字符串。
  这不是测试的小毛病：页面上到底显示哪个字符串必须现量，不能从 fixture 的变量名推。
  ② 「EV 徽章点进证据页」这条在第一次变异（删掉跨页跳页）下**照样绿**，因为种子报告的结论只绑到 EV-0001…EV-0008，
  全在第 1 页，点徽章根本走不到跨页那条分支。补成"徽章路径 + 直接访问 `?ev=EV-0012`"两截之后，
  同一变异才把它打红（`toContainText('第 11–12 条')` 失败）。**一条不会红的用例等于没有用例。**

**第三方无障碍审计：axe-core（第 ④ 项，补掉「第三方审计没跑」这条）**

无障碍此前全靠自算脚本取证，这有一个说不清的风险：取样选择器是我自己挑的，就可能只挑到能过的样本。
所以新增 `e2e/axe.spec.ts`，用独立实现的规则集（`@axe-core/playwright` 4.13.0）整页扫描六个视图，
判什么由 axe 决定：**1 条 × 4 档视口 = 24 次视图扫描，全绿且零违规**（`serious/critical` 单列一档，其余档位也断言为空）。

- **先红后绿，红出两个真问题**：
  ① `region`（moderate）在六个视图上都报——根因是 `AppShell` 的包裹层用了**无 `aria-label` 的 `<section>`**，
  按 HTML 定义它是分节内容，于是里面的 `<header className={topbar}>` 从 `banner` 退化成 generic，
  顶栏标题与状态徽章整体掉出所有地标。改成 `<div>` 之后 header 才真的拿到 banner 角色；
  这一条是**红→改→绿**走完的（改动前后各跑一次，改前 6/6 视图报 region，改后 0）。
  ② `color-contrast`（serious）只在运行监控报，指向两条降级 toast 的文案 `span`。
- **第二个不是缺陷，而是测量方式错了，取证过程记在这里**：toast 的入场动画是 `opacity 0→1`（0.25s），
  在中间帧取样量到 `opacity=0.91`，axe 就把 `#1a1a1a on #fff`（实测 17.4:1）判成不达标。
  先用一次性探针复现（同一页面立刻扫 = 报 2 条，等 1s 再扫 = 0 条），再在扫之前等动画真的结束（`settle()`）。
  减少动效的用户本来就不吃这一帧，这一点也是量出来的而非读 CSS：`emulateMedia({ reducedMotion: 'reduce' })` 下
  toast 的计算 `animationDuration = 1e-05s`、首帧 `opacity = 1`；`no-preference` 下同一时刻是 `0.25s` / `opacity = 0`。
- **`settle()` 是承重的，不是装饰**：把它删掉重跑，`运行监控 serious color-contrast` 立刻回来（`total=1 blocking=1`），
  恢复后 4/4 视口重新全绿。**过程中踩到的坑**：状态圆点是 `infinite` 呼吸动画，
  `document.getAnimations().map(a => a.finished)` 会永远挂住并把用例拖到超时——必须先按 `iterations !== Infinity` 过滤，再留一个 2s 上限。
- **新增的依赖只有 `@axe-core/playwright`（devDependency，4.13.0）**：它把 axe 的 source 注入到已有页面里跑，
  不引运行时依赖、不下载浏览器二进制（仍走 `channel: 'msedge'` 的系统 Edge），所以它不进上面那行 build 产物体积。
- **仍然没有的证据**：Lighthouse 没跑（要 Chrome/Lighthouse CI，本机没装也不静默装依赖）；
  axe 只覆盖它规则集里的机器可判项，读屏实机播报、`H` 键地标跳转体验这些仍归 §5「无障碍：语义、焦点与第三方规则都已实测」那条缺口。

**画面级走查：真的看过一轮页面（补 §5「画面仍未看过」那条）**

几何断言能证明"两轨 806+330、零溢出"，证明不了"这页看起来对不对"。前台内嵌连接器的 `take_screenshot` 仍被
`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE` 拒绝，所以这一轮改用 Playwright + 系统 Edge 的 `page.screenshot()` 出图后逐张看图：
六个视图的浅色首屏各 1 张，深色 3 张（总览/监控/报告），收起侧栏 2 张，820px 窄档 3 张，共 16 张；
下面三个问题各自修完再补看（停靠区 3 张、横幅对齐 2 张、Toast 让位导航 1 张，含 1366 与 820 两档）。

- **看出一个真缺陷：Composer 停靠区的渐变遮罩把正文切成半行字。** 监控页向下滚到一半时，
  执行步骤卡的最后一行文字正好被停靠区上沿**从字高中间截断**——原先 `.wrap` 的背景是
  `linear-gradient(transparent, var(--bg) 40%)` 的"淡出遮罩"，40% 之前那段是**透明**的，
  于是文字的前半截直接从遮罩里露出来，读起来像渲染坏了。截图证据 + 计算值证据都在：
  修复前那条 e2e 用例红在 `停靠区还留着渐变遮罩：linear-gradient(rgba(0, 0, 0, 0), rgb(255, 255, 255) 40%)`。
- **修法（先红后绿走完）**：`src/styles/composer.module.css` 的 `.wrap` 换成**不透明层** —
  `background: var(--bg)` + `border-top: 1px solid var(--line)` + 一道向上投影，`position: sticky; bottom: 0` 不变。
  停靠区本来就是常驻控件，该像工具栏而不该像雾。回归锁是 `e2e/pages.spec.ts` 第 4 条（见上面那节），
  改后 4/4 视口绿；重截图确认卡片末端停在一条干净的细线上方，没有半行字。
- **顺带确认（不是新增证据，只是把已有断言和画面核对上）**：收起态侧栏的四个图标在画面上确实贴住同一中轴
  （用户第 3 点，几何由 `breakpoints.spec.ts` 的 ≤1px 断言守着）；深色主题三张图没有出现计算值断言抓不到的问题
  （遮罩深度、滚动条、表格斑马纹都在能读的范围内）；820px 档顶栏、降级横幅、执行步骤卡、Composer 四层不挤不叠。
- **第二处观感问题当场定案并改掉：降级横幅不再飘在两列正中。** 用户口径「怎么好看怎么来」，我选**跟正文列对齐**——
  它解释的就是下面的执行过程，属于正文。改动前的实测几何：横幅 `x=440 w=706`（内容撑出来的宽，左右各空 196），
  而正文卡 `x=244 w=744`，左沿差 196px。根因不是宽度写错，而是**外层容器挂错**：
  那一层同时用了 `.block`（`flex-direction: column`）与 `.rowBetween`（`align-items: center`），
  列向 flex 上的居中就把横幅收成内容宽摆在正中。
  修法是把横幅移进 `layout.agentCol`（正文列）作为第一个子节点，删掉那层 wrapper——
  **不写任何像素值**，宽度自动跟随列宽，两轨/单轨都不用维护第二份数字；右列面板因此上移到与横幅同顶，页面少一层 DOM。
  回归锁是 `e2e/breakpoints.spec.ts` 新增的一条：四档视口各量横幅与「执行步骤」卡的 `left`/`width`，差值 ≤1px。
  **先红后绿走完**：改前 4/4 档红（1366 报 `横幅左沿 440 与正文卡左沿 244 不齐（卡是 _card_…_block_…）`），改后 4/4 绿。
  截图复看两档（1366 与 820）确认左右沿与卡片成一条线，右列顶部不再空一块。
  **过程中一次自我纠正**：第一次读红字时我把多档并行的报错行串错了项目（把 1280 的 397 当成 1366 的卡片左沿），
  于是给断言消息加上"卡是谁"（`cardCls`）再单档复跑，数字才对得上——**失败消息必须自带身份，否则跨 project 并行时会读错证据**。
  旁边记一个更早的口径纠正：这条最初我按 CSS 里的 `--content-max: 840px` 推断它"居中在 840 阅读列"，
  实际量下来是 706/196 的内容宽居中——**布局结论必须现量，从令牌名推会推错**。
- **第三个只有画面能发现的问题（顺手量化并修掉）：Toast 在 ≤900px 盖住唯一的主导航。**
  看 820 截图时右上角那叠提示正好压在顶栏的「新建科研任务 / 总览 / 设置 / 跳转任务」上，于是现量重叠面积：
  栈 `x=523 w=279`，与「总览」重叠 43×25、与「设置」62×25（整颗盖住）、与「最近任务」166×29。
  这一档侧栏已隐藏，**顶栏那三个控件是用户离开当前页的唯一出路**，而 toast 活 4.2s（`toastStore.push` 的 `setTimeout(…, 4200)`）。
  修法：`ui.module.css` 给 ≤900 一档把栈改挂到**顶栏下方靠左**（`top: calc(var(--topbar-h) + var(--s3))` + `left: var(--s4)`，
  全是令牌，没有新数字）——那里只有页面标题文字；宽档右上角本来没有控件，保持原样不动。
  回归锁是 `e2e/breakpoints.spec.ts` 新增的「Toast 出现时不遮挡任何可交互控件」：量 toast 栈与页面上**除自身关闭按钮外**
  每个可交互元素的重叠面积，四档都要求为空。**先红后绿走完**：改前 narrow-820 红（消息里逐条列出被压住的控件与面积），
  三档宽的绿；改后 4/4 绿。
  **这条的诚实边界**：改后 toast 会压住监控页的 `h1`「运行监控」与目标 lead 一小片（静态文字，非控件，≤4.2s 自动消失，
  且每条都带「关闭」）。这是 toast 的常规代价，不是"零遮挡"——断言的是**不吃可交互元素**，没有声称不吃任何像素。
  **还有一个自己踩的坑**：第一版重叠计算漏了控件的高度（`n.y + undefined` → `NaN`，`NaN > 1` 恒 false），
  于是探针报"零遮挡"，与截图直接矛盾。差点把"没测到"当成"没问题"报上去——**测量脚本自己也要被反证一次**，
  这里靠的就是先拿截图做对照。
- **这一轮的证据边界，说清楚以免高估**：看图的是我（模型读 PNG），**不是人眼**；没有截图基线、没有像素 diff、
  没有接视觉回归工具，所以它补的是"这页被看过一次"，不是"画面从此不会退化"。真正的像素级防退化仍需 §5 那条列的基线方案。

**优化插件轮：简化、审查与一条真缺口（用户「开始使用优化插件优化项目」）**

三个插件按各自职责跑了一遍，产出是"5 处简化 + 1 条真缺陷修复 + 3 条留给你定的视觉决策"：

- **简化（code-simplifier 子代理，改动由我逐处复核而不是照抄它的报告）**。
  ① `OverviewPage.tsx:45` 把手写的 `run_status === 'RUNNING' || === 'PLANNED'` 换成 `lib/status.ts:28` 已有的 `isRunning()`
  （同一谓词，且 `tests/lib.test.ts` 已在测它）；② `OverviewPage.tsx:161-170` 合并行内两枚几乎相同的 `<Button>` 分支
  （只差图标与文案，都是 `stopPropagation()` + `open(task)`），渲染出的 DOM、可访问名「查看报告/查看运行监控」与行为不变；
  ③ `toastStore.ts` 抽出私有的 `show(toast, ttlMs)`，`push`/`pushError` 不再各写一遍 id 生成、入队与自动消失计时，
  4200/7000ms 两档时长保留；④ `Button.tsx` 把 `Button` 与 `LinkButton` 重复的 变体/尺寸→类名 映射抽成 `buttonClassName()`，
  原生 `<button>`、`type ?? 'button'` 默认值与 `disabled || loading` 一个字没动（那条真键盘 Enter 用例依赖它）；
  ⑤ 删掉 5 条零引用的 CSS 规则（`ui.module.css` 的 `.noteRun`/`.noteRun .noteIc`；`layout.module.css` 的
  `.monoText`/`.welcome`/`.welcomeLogo`）——**我自己又独立 `grep` 了一遍** `src`/`e2e`/`tests`/`index.html`/`scripts`
  含 `[class*="…"]` 的哈希子串选择器，0 引用；`check-css-refs.mjs` 与 `tokens.test.ts`（它扫的是值不是规则名）都不受影响。
  它还报告了三处**看到但故意没动**：`lib/status.ts:22 toneClass()` 没有生产调用方，但 `tests/lib.test.ts:40-51` 在测它，
  删它等于删覆盖；`Button.tsx` 的私有 `Spinner` 与 `Feedback.tsx` 的 `Spinner` 没合并（Feedback 反向 import Button，合了会成环，
  且无障碍属性不同）；e2e 里两处 Tab 遍历彼此重复，但 `helpers.ts` 并没有现成 helper 可换，换 `FOCUSABLE` 会改变元素集合而无从复跑证明等价。
- **UI 品味与设计债审查（ui-taste-guard + frontend-design）**。反模式扫描是干净的：全站只有一条渐变，
  是骨架屏的微光（`ui.module.css:366`），不是紫蓝 hero；`backdrop-filter`/玻璃拟态 0 处；令牌之外的颜色字面量 0 处（被
  `tokens.test.ts` 的锁挡着）；`border-radius: 50%` 只出现在状态点、加载环与脉冲光环上，其余圆角走 `--r/--r-sm/--r-pill`。
  四态覆盖逐页核过：`SkeletonList` / `ErrorState` 四个任务页都在，`EmptyState` 在总览、报告、证据三页（监控页没有空态是应该的——
  它的运行时要么落地要么走错误分支，不存在"渲染成功但什么都没有"那一态）；
  证据页的空态还区分「真没有」与「筛选没匹配上」两种文案，总览空态直接给「新建科研任务」动作。
  禁用态有 `.button:disabled`，焦点环由 `base.css:86` 的 `:focus-visible` 全局兜底，`prefers-reduced-motion` 在 `base.css:125`。
  文案没有模板腔：空态讲"接下来会怎样"并给动作，错误讲怎么修，没有 "Revolutionize your workflow" 那一套。
  **审查里唯一一条真缺陷**是侧栏最近任务的状态点只有颜色一个通道，修法与取证见 §3「无障碍的设计决定」第 7 条。
  另有 3 条属于视觉决策、与"配色/观感与 Demo 一致"这条硬约束直接冲突，**一律没动**，全文写在 §5 那条"三条视觉决策"里。
- **证据口径核对（evidence-guard）**。把散在注释与文档里的"AA"按实测收窄，新增 §3「对比度的实测口径」：
  文字档全部 ≥4.5（附现算数字与反证），状态圆点本身 `--idle` 2.79:1 不达非文本 3:1 —— 这条以前没说过。
  另外确认 README 关于英文资源"只覆盖部分、缺失自动回退"的说法与代码一致（`i18n/index.tsx:66` 的 `?? lookup(resources['zh-CN'])`），
  不是过度声称。
- **本轮没有新截图**，理由不是偷懒：改动面是 一条 `aria-label`、一条 `title` 文案、5 条零引用规则与几处等价重构，
  没有任何影响渲染像素的选择器或属性（已 `grep` 确认 CSS 不按 `role=`/`aria-label` 选样）。画面级取证仍归上一节那 16 张图。

**Live 真实链路联调（2026-10-11，本机 AGH + BFF；关掉 §5 那条"未联调"）**

栈是真实的：AGH daemon（命名管道 `\\.\pipe\agnes-…`，`/api/health` 报 `status:ok / agh.connected:true / sessions_open:3`）
+ BFF 绑 `127.0.0.1:8787` + 浏览器里的前端（vite dev `127.0.0.1:5174`，`server.proxy['/api']` 做同源转发。
当时选同源还因为 SSE 的 hijack 响应不带 `Access-Control-Allow-Origin`，跨源 `EventSource` 被浏览器拦死——
**这一条后端已修**，见下一轮取证）。
新建任务 → run-all → 监控 → 报告 → 证据 → 三件套导出全程在同一任务 `run-20261011-132648-zdwd45` 上走通，6 步 DONE。

- **抓出并修掉 6 处"前端形状 ≠ 后端契约"，全部只有真跑能发现**（mock 发现不了：mock 本来就是按前端类型写的）。
  1) 证据页整页空白：后端把来源标识拆成 `doi`/`source`、`authors` 是数组、`year` 是数字，`externalRef(undefined)` 直接抛；
  2) 监控页整棵 React 树被卸掉（`#root.children=0`）：`tool.input/output` 与 `activity.detail` 后端给的是对象，`<pre>{对象}</pre>` 崩；
  3) 一次工具调用裂成两张卡、入参卡永远停在 running：`tool/call` 帧的 `step` 还是 `-`，`step+tool` 不是稳定幂等键，得用 AGH 的 `toolUseId`；
  4) 卡片名重复成 `sciret_plansciret_plan`：`label` 缺失时不该拿 `tool` 名兜底；
  5) 导出"提示成功、磁盘上没有文件"：live 走 `blobUrl`，旧实现只 revoke 不触发保存；
  6) 终态任务追问必然 409 `BAD_STATE`：后端只在 PLANNED/RUNNING 收消息，前端却在 DONE 上留着可用的输入框。
  回归锁是新增的 `tests/live-contract.test.ts`（22 条，fixtures 逐字取自实测响应：`ev_audit.json` / `cite.json` / SSE 帧原文）；
  复跑结果 `typecheck` 干净、`lint` 0 error、`vitest` **178 passed / 11 files**。
- **真实产物核对**：三件套各落一份真文件（audit ZIP 10,646 B、session 轨迹 47,744 B、report Markdown），
  按磁盘存在性与魔术字节 `PK\x03\x04` 确认；界面清单直接取后端 `X-Export-Contents`，不另列一份想象的目录。
  证据页 16 条真实证据（分页首屏 10 条各带可点 DOI 外链）、`?view=audit` 的单条 `chain_hash` 与卡片显示一致；
  工具卡展开后是缩进 JSON 原文（`sciret_run_all` 的 `run_dir` 就是本机 runs 路径）；
  终态任务的 Composer 输入框与 追问/修订/发送 全部 `disabled=true`，占位符与页脚说明 409 语义。
- **过程中两次自我纠正，记下来以免后来人重踩**：
  `.env.local` 里的 `VITE_API_MODE=live` 会被 vitest 一并读走，那 73 条"红"不是回归而是本地环境泄漏——
  修法是把 test 模式固定在 `src/config/env.ts`（`metaEnv.MODE === 'test'`），给 vitest 塞 `test.env` 实测无效；
  另一条是 Composer 终态闸门最初不分 mock/live 一起禁用，打掉了 4 条 FE-10 旅程用例——409 是后端行为，演示数据没有，闸门必须 `isLive` 限定。

**整合布局第二轮联调（2026-10-11 下午，`paper-agent-main`：backend/ + frontend/ 与 agnes-harness 同级）**

- **又抓到一处「前端类型 ≠ 后端 DTO」**：`TaskSnapshot.goal` 原写必填，但后端面向视图的 `taskSnapshot()`
  只发 `title`（内容就是 `rec.goal` 全文），**不发 `goal`** → live 下 `snapshot.goal` 恒 `undefined`，
  监控页与报告页的页首副标题永远落在占位文案上。修法是类型改成诚实的 `goal?: string`，两处渲染走
  `goal ?? title`（mock 保留完整 `goal`，因为它的 `title` 是截断到 24 字的展示标题）。
  浏览器实测同一任务 `run-20261011-132648-zdwd45`：副标题已是
  「固态电解质界面阻抗的主要表征方法有哪些？请检索近五年文献，给出方法对比与结论。」
- **门禁在本轮改动之后复跑**：`typecheck` 0 error、`lint` 0 error（1 条既有 `react-refresh` 告警）、
  `vitest` **178 passed / 11 files**、`vite build` 通过（379 modules，479 KB JS / 158 KB gzip）。
- **跨源 SSE 真跑 TCP 取证**（后端修好 hijack 响应头之后）：`Origin: http://127.0.0.1:5174` → 带
  `Access-Control-Allow-Origin` + `Vary: Origin`；`Origin: http://evil.example` → 200 但无 ACAO；无 Origin → 无 ACAO、流正常。
  同源代理侧 `GET http://127.0.0.1:5179/api/v1/tasks/<id>/events` 实测返回 `ping`/`step` 快照帧，历史任务重进也有进展。
- **一键启动现在会托管本前端**（后端 `scripts/start.mjs`）：`PAPER_AGENT_WEB_PORT=5178/5179` 两次真跑，
  都是"探到前端首页 200 才报就绪"（旧实现 spawn 后睡 1500ms 就打印成功）；`/api/health` 经该 dev server 代理可达。
- **仍未解决、且不在前端这一侧**：中文目标经 Crossref/OpenAlex 命中的文献与主题无关
  （取证见 `paper-agent-backend/README.md` §7「前后端整合联调」：同一 `build_url` 下中英文返回天差地别），
  于是账本没有 `conclusion` 记录、监控页「结论 0」。这里**不做**任何"看起来像结论"的前端补白。
- **一处命名不准，留待定文案**：右列「会话轨迹」取的实际是**账本记录数**（`toTraceEntries` 用
  evidence+judgment+note 拼时间线，本例 17 = 16 证据 + 1 判断），与同卡片「证据登记 16」几乎重复；
  真正的 AGH 会话轨迹只在 SSE 与 `kind=session` 导出包里，后端没有 GET 接口。
  同理：重进已完成任务时「工具调用 0 次 / 暂无过程记录」只表示**本页会话**没收到 tool 帧，不代表这次运行没调过工具。

## 5. 尚未验证 / 已知边界（诚实清单）

- **Live 真实链路已联调**（原记「本机没有运行中的 AGH + BFF」的口径作废，取证见 §4「Live 真实链路联调」）。
  这一条现在只保留两件没证据的事：`HealthBanner` 每根问题的红/橙点在区分「阻塞 / 不阻塞」，
  但后端 `/api/health` 的真实响应里只有 `agh.connected` 与 `runs_dir_ok` 两个布尔，没有 doctor 文案可对照，
  所以**没有**给点补 `label`（补了可能读屏念两遍）；以及**降级路径仍未在真实运行里触发过**——
  两轮 live 运行都是 `degraded:false`、0 条 `degraded` 事件，L2 降级的界面表现只由 mock 剧本演示过。
- **agent 右列的两栏渲染：几何与画面都看过，缺的是人眼与基线**。Playwright 四档视口已直接量到 ≥1280px 命中媒体查询并解析出
  `806px + 330px` 两轨、窄档单轨、四档 0 横向溢出、产物条目不再裁字（见 §4「断点实测」），
  所以"浏览器真的把栅格分成两轨"不再是推算。原记的"画面仍未看过"本轮已补掉一半：
  16 张无头 Edge 截图逐张看过，并因此抓出并修掉一个只有画面能发现的缺陷（Composer 停靠区的渐变遮罩把正文切成半行字，见 §4「画面级走查」）。
  仍缺的两半：**看图的是模型不是人眼**，且前台内嵌 `take_screenshot` 那侧一直被 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE` 拒绝，
  1888 CSS px 真实窗口下的人眼观感没有；**没有截图基线与视觉回归**，所以画面退化不会被自动发现。
- **无障碍：语义、焦点与第三方规则都已实测，但没有读屏实机验证**：`Card` 标题缺口（原记于此，全站每个卡都是无名 `section`）
  本轮已按 §3 的方案修掉并由 `tests/a11y.test.tsx` + `e2e/a11y.spec.ts` 守住，
  第三方规则也补上了——`e2e/axe.spec.ts` 用 axe-core 整页扫描六个视图 × 四档视口，**零违规**，
  并且由此抓出并修掉一个自家脚本一直没发现的问题（顶栏 `<header>` 因外层无名 `<section>` 丢掉 `banner` 地标角色，见 §4「第三方无障碍审计」）。
  仍缺的是**人耳证据**：**没跑过真实屏幕阅读器**（NVDA / VoiceOver），断言的是 DOM 角色、可访问名解析、`hidden` 与焦点转移，
  读屏实际播报的措辞、地标列表与 H 键跳转体验仍需人耳确认；Lighthouse 也没跑（要额外装 Chrome/Lighthouse，不静默装依赖）。
  对比度这一维度现在是两路独立证据：§4 的自算脚本 + axe 自己的 color-contrast 规则。
- **上一轮"三条视觉决策归你定"已按批准全部落地**（用户：「这三条都可以改」，实现与取证见 §3 第 8 条）。
  仍然缺的是**像素级基线**：这几处是真改动（气泡 12→10、发送键 9→10、行内 code 4→5、降级橙与待执行灰点变深一档），
  本轮做的是**一次性人工看图**（Edge 1366×768 截图看总览/监控/报告/Composer 四处，观感与层级未破），
  不是可重跑的截图基线；换人改样式时不会有东西拦住"圆角又飘回字面量"以外的观感退化——圆角与颜色本身有锁，观感没有。
- **「本工作台导出 = AGH web 导出？」目前无法用真跑回答**（用户评审第 6 点）。只能给出契约层面的对应关系：
  后端文档 §8.3 的三种 kind 里，**只有 `kind=session` 标注为「AGH 会话轨迹（经原生导出）」**，
  对应 AGH `packages/cli/src/commands/export.ts`（格式 `agnes` JSONL 协议信封 / `html` / `sharegpt` / `claude-code`，默认脱敏、`--raw` 才出原文）；
  而 `report`（Markdown）与 `audit`（ZIP：报告 + 账本 + 事件 + 结论 + 校验脚本）是 **BFF 聚合产物，AGH web 并不产出这两样**，
  AGH 侧最接近的是 `packages/web/src/diagnostics-bundle.ts` 的 `agh-diagnostics-*.zip` 诊断包，内容清单与审计包不同；
  `packages/web/src/session-actions.ts` 的动作集只有 rename/fork/archive，没有导出。
  因此"两边导出一致"这一说法只在会话轨迹那一路成立、且**仍未与 AGH web 侧产物逐字节比对过**：
  本轮 live 联调证实的是**本工作台这一侧**（三种 kind 都落真文件、清单来自 `X-Export-Contents`），
  AGH web 的 `agh-diagnostics-*.zip` 没有取来对照，所以这条仍算未证实。
- **e2e 套件覆盖的是几何/文案/链路/语义/第三方规则，不是像素**：`npm run test:e2e` 现在会真跑（**96 passed / 2 skipped**，
  含 `a11y.spec.ts` 的 8 条无障碍取证、`axe.spec.ts` 的 axe 整页审计与 `pages.spec.ts` 的 4 条任务级页面取证，见 §4），
  但它断言的是 computed 样式、轨道宽度、溢出、文案存在性与标题语义；
  截图基线、视觉回归、Firefox/Safari 均未接入（画面级走查是**一次性人工看图**，见 §4「画面级走查」，不是可重跑的基线）。
  另需注意本机零下载依赖系统 Edge（`channel: 'msedge'`），CI 若无 Edge 要先装浏览器二进制。
- **审计包在演示数据模式下是单文件 JSON**（真实运行才由后端产出 ZIP）；导出清单已明确写出这一点，避免界面承诺做不到的事。
- **纯键盘主旅程**已按 §4 实测（跳过链接、Tab 序、焦点环、命名、select/Composer/翻页的键盘操作，以及对话框三个缺陷的修复与复测），
  连接器那轮的口径缺口现已部分补上：Playwright 在 1366/1280/1024/820 四档都用真 `Tab` 走进 Composer，
  所以宽视口（侧栏可见）下的 Tab 链能走通已是有断言的事实，不再是 530px 注入 `display:flex` 的代测。
  仍未拿到证据的是：Tab 链上各站点的**精确顺序**没有逐项断言（套件只验"能否走到目标控件"）。
  真 `Enter` 现在在三处验过生效：跳转链接（§4「无障碍这一轮」③，回车后焦点进 `main`）、Composer 输入框
  （`journey.spec.ts` 真按键发送追问成功），以及本轮补上的**原生 `<button>` 激活**
  （`a11y.spec.ts` ⑥：真 Tab 走到总览行内「查看报告」→ 真 Enter → 落到 `/report/{id}`，并用 `<div role="button">` 变异证明它真会红）。
  此前记"Enter 不可复现"的那条是内嵌连接器的合成按键限制，Playwright 走的是真按键通道，两者不要混。
  对比度这一维度现在是两路独立证据：§4 的自算脚本（挑样本）+ `axe.spec.ts` 的 color-contrast 规则（整页判，见 §4「第三方无障碍审计」）；
  Lighthouse 仍未跑，理由写在 §5 那条无障碍缺口里。
- **英文只覆盖部分文案**（应用名、导航、总览、监控、报告、证据、设置标题、导出、发送），
  其余按设计回退简体中文，设置页已注明。
- **性能已实测**（文档 §10，见 §4「性能取数」）：首屏可交互与路由切换两档都在真实浏览器里量过，dev 与生产构建各 8 次。
  长列表已按 §10 做分页（见 §3「长列表与分页」），但没有虚拟滚动——当前种子量级（十几条证据、几十条轨迹）用分页足够，
  真实后端返回上千条时仍需换虚拟列表。SSE「事件到 UI」那一档要等真实后端，套件里没有假装量过。
- **分页与深链的宽视口取证已补上**（原记「只在 530 CSS px 的窄视口里手工看过」）：`pages.spec.ts` 在 1366/1280/1024/820
  四档都断言了证据列表翻页换数据、边界页禁用并写明原因、跨页 `?ev=` 深链自动跳页并高亮到位、总览对齐与更新时间不折行，
  且每条都做过变异取证（见 §4「任务级页面的四档取证」）。仍没在宽视口里复看过的是**监控页轨迹展开**那一轮的布局文案
  （当时是在 530px 窄视口做的；§4「画面级走查」那 16 张截图看的是默认收起态，不含展开后的轨迹行），
  以及各页在 1888 CSS px 真实窗口下的人眼观感。
- **浏览器兼容只测了本机 Chromium/Edge**：Firefox 未测。本轮在前台真实视口（1888 CSS px）复测过展开/折叠导航与无溢出，
  当时连接器无法改标签页尺寸（`window.open` 被拦截、也没有 resize 工具）；1366×768 与 1280 断点现已由 §4 的
  Playwright 四档视口量过几何与样式，但 Firefox 路径仍没有任何证据。
- **CI 与提交钩子缺失**：文档 §13.2 建议的 Husky/lint-staged 与 CI 构建未配（本目录不在 git 仓库内，装钩子没有落点）。
- **AGH UI slots 适配层（§12「嵌入 / 被嵌入」）未实现**：预留了 `tool.card.inline` 等语义位（`ToolCard`），但没有独立适配层。
- **令牌的"双份同源"按不抄第二份的方式满足**（文档 §5.1 字面建议 CSS Variables + TS 常量两份）：
  现在只有 `tokens.css` 一份真源，另加 `tests/tokens.test.ts` 的锁来保证"字面量不外泄、引用都有声明、深色不新增、圆角只用档位、状态标记达非文本 3:1"。
  没做 TS 常量抄本的原因写在 §3「令牌唯一真源的可执行化」—— TS 侧当前没有读色值的调用方，抄一份只会制造需要人工对齐的副本；
  如果以后出现（例如要在 canvas 里画轨迹图），应当由构建脚本从 `tokens.css` 生成，而不是手写。
- **§5.2 组件清单里的部分条目没有拆成独立原语**（Avatar / Breadcrumb / Tabs / Divider / Switch / 具名 DataTable·
  SourcePicker·VerdictCard·ConclusionItem·SourceStatus）：这一条本轮**核对后决定不补**，理由是它们都是单点使用，
  拆出来只是给现有代码换名字、不给任何调用方减少重复（`VerdictCard`/`ConclusionItem` 在 `business/ReportView.tsx` 内，
  `SourcePicker`/源状态行在 `pages/NewTaskPage.tsx` 内，唯一的 `DataTable` 就是总览那张表）。
  行为与验收都齐（见 §3 各行），缺的只是清单上的名字；如果以后出现第二个调用方，再按 §5.2 的名字提出来。
- **附件入口按"无假控件"隐藏**（§8.8 附件为 P1）：因此 `composer.attach`、`evidence.attachment` 等 i18n 键当前未被引用。
- **技术栈与 §13.1 推荐项的偏差**（均为已确认取舍）：样式用 CSS Modules + 令牌（一致）；服务端状态用 Zustand +
  自写 SSE 归一层而非 TanStack Query；i18n 用自写 `src/i18n`（外置资源、可加语言）而非 i18next。
