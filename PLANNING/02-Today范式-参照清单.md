# Today 范式参照清单

> 目的：把 Today 身上**可迁移的工程范式**抽出来，而不是描述它有什么功能。
> 每条都标明「可迁移点」与「照搬的代价」。全部结论均可在仓库中核验。

---

## 一、产品形态的四个关键设计（最值得学的部分）

### 1. 全局单时间线，主动砍掉多话题

`recovered/fragments/desktop/packages/realtime-contract/src/chat/threads.ts` 的注释直接留了改版痕迹：

> Single-timeline rewrite (PR-2): …chat-v2 **no longer renders a thread sidebar nor calls `GET /agent/threads`**（matches macOS, which has no thread list either）

**曾经有多话题侧边栏，PR-2 删了，理由是对齐 macOS。** 所以这是产品决策，不是能力缺失。

**可迁移点**：多入口是负债。少一个入口就少一整套「会话切换时上下文怎么带过去」的问题。
**照搬代价**：用户失去「按主题归档对话」的能力，需要用搜索 + 记忆来补偿。

### 2. 任务与对话是同级运行时对象

事件命名空间三分：`thread.*`（一次对话运行）/ `task.*`（一次任务运行：`plan.created` → `step.*` → `completed` / `output.ready`）/ `task.run.*`（工具调用）。中继层按前缀注入 `threadId` 或 `taskId`。

会话 ID 的分流靠一行枢纽逻辑：

```
conversationId = typeof req.conversationId === 'string'
  ? req.conversationId      // 显式指定 → 独立会话
  : mainConversationId      // 缺省 → 主会话
```

**一套机制同时实现了「单主时间线」和「任务另开会话」**，不需要两套消息通路。

任务模型还含：`taskType: background | automation | build_up_memory`；状态机含 **`pending_user_answer`（任务能中途停下来问人）**；`TaskDetail` 带 `steps[].dependsOn`（**步骤 DAG**）、`metadata.trace{llmCalls, toolCalls, iterations}`、`outcome{success | partial | degraded | failed}`。

**可迁移点**：把长任务当一等公民设计，而不是「聊天里的一次慢回复」。任务的中间过程留在任务自己的会话里，不污染主对话。
**照搬代价**：需要重做任务调度与状态回传，YoBot 现有 `scheduler/` 已有部分基础，但模型粒度不同。

### 3. 上下文不脏靠结构性隔离，不是靠用户手动切话题

四道机制（证据：`realtime-contract/src/chat/` + 前端 chunk）：

| 机制 | 做法 |
|---|---|
| **引用式回复** | 回复今日卡片只带 `widgetId + kind + summary`，回复日程只带 `eventId + quote`。上下文里是**指针，不是文档**，服务端拿 id 取全量。共 8 类可回复对象（含 `external_resource` 网页） |
| **任务另开会话** | 建任务走 `target: {type:'new_task', surface:'task_panel'}`，响应返回独立 conversationId，另有 `GET /v3/tasks/{id}/chat-context` |
| **内部消息过滤** | `excludeInternal` 开关；消息模型三层：`isFinal`（可见）/ `intermediates[]`（思考与工具调用）/ `thread.token`（逐 token，不落库） |
| **记忆外置** | 记忆不是对话上下文的一部分，是外部文件系统，按 token 预算压缩注入 |

消息还带 `messageBizType` 标签：`asst_response | task | task_onboarding | automation | asst_proactive | system`——**一条时间线里跑着六股流，靠标签分流渲染**。

**可迁移点**：单入口的可行前提是「隔离做在结构里」。这四条是单对话框能成立的技术底座，缺一条就会脏。

### 4. 主动动作体系 + 「时机」反馈

六种形态：automation（cron / once）、task_recommendations（可一键 apply）、asst_proactive、live widgets（Agent 可主动编辑）、brief（晨报 / 晚报 / 健康周报）、day_in_progress（今日进展，可被回复）。

**最值得抄的一条**：主动消息的反馈是三维的 —— `helpfulness / factualAccuracy / **timing**`。**把「打扰」单列成一个可优化的错误类型**，这是主动型产品与通知系统最本质的区别。

**可迁移点**：主动能力不是「定时发消息」，而是「有反馈闭环的干预」。没有 timing 维度的主动能力会变成打扰。

## 二、前端工程范式

| 层 | Today 的做法 | 可迁移性 |
|---|---|---|
| **设计 token** | 自研 `@todayai-labs/opal-tokens`，基于 Tailwind v4 的 CSS 变量体系（`--color-*` 全套原子色板 + 语义变量 `--color-background` / `--color-foreground` / `--color-border`）。同系列还有 `opal-ui`、`opal-icons` | **高**。这是「设计统一」的真正抓手——token 层统一了，Vue 还是 React 都能长得一样 |
| **无头组件** | Radix UI 全家桶（dialog / select / popover / tooltip / scroll-area / switch…）+ `@base-ui/react` + CVA 变体管理 | 中。Vue 侧有 reka-ui 等对应物，思路可直接搬 |
| **长列表** | `react-virtuoso` | 高。单时间线必然遇到长列表性能问题 |
| **状态层** | `zustand` + `@tanstack/react-query`（含 persist）+ `zod` 校验 | 中。Vue 侧对应 Pinia + vue-query |
| **动效** | `motion`（framer-motion 后继）+ `gsap` + `tw-animate-css` | 高 |
| **端上能力** | `three` / `@react-three/fiber` / `ogl` / `lenis` / `shadergradient` | 低。属于品牌视觉，不必跟 |
| **质量工程** | Storybook（组件）+ Playwright（视觉回归 + E2E，分 smoke / full / canonical 三套配置）+ vitest + MSW（本地 mock）| **高**。这是「前端统一」能长期维持的前提 |
| **i18n** | `i18next` + `react-i18next` + 自研 `@todayai-labs/i18n`，并有 `i18n:verify` 脚本做键值一致性校验 | **高**。YoBot 已有白标多品牌，i18n 是必需项 |
| **微前端** | `@vercel/microfrontends` | 低。规模化后再说 |

## 三、契约包体系（最能体现工程水准的部分）

Today 把内部能力拆成一组**版本化的包**，而不是一个大 bundle：

```
platform-interface   ← 147 条跨进程 IPC 契约；构建期从 TS 类型生成 wireName + JSON Schema
realtime-contract    ← 实时事件契约（thread.* / task.* / task.run.*）
socket               ← 事件通道
api-client           ← 从 OpenAPI 生成（351 个端点 + 上千个 zod schema）
tck / tck-bundle-format / tck-host  ← 自研 Widget 打包格式（ZIP + 内容哈希寻址）
today-client-cards / today-widget-runtime  ← 卡片与组件运行时
webview-bridge / web-extend-adapter ← WebView 桥接
```

**最值得借鉴的是 `platform-interface` 的能力协商模式**：

- 接口在**构建期**从 TypeScript 类型生成 `wireName` + 参数/返回值的 JSON Schema，随包发布 —— 等于**协议文档是编译产物**，不会和代码脱节
- 运行时先做**能力协商**（模块按语义化版本演进，如 `account v0.7.0`），再对参数与返回值**双向校验**
- 因此「新版网页配旧版宿主」能**优雅降级**，不会崩

三层接口 `wei` / `cpi` / `nei` 共 147 条契约，全量可在 `recovered/fragments/*/packages/platform-interface/generated/bridge/utils/consts.ts.fragment.js` 中读到。

**可迁移点（高价值）**：YoBot 现在是裸 HTTP + WebSocket。把「前端 ↔ 引擎」的接口也做成**生成式契约 + 能力协商**，收益是：前端可以独立演进、白标不同版本可共存、老客户端不会因为新引擎而崩。这正是「服务与功能有机结合」的技术落点。

## 四、记忆与知识

| 维度 | Today | 备注 |
|---|---|---|
| 存储 | **Markdown 虚拟文件系统**，`MemoryActivity{file{path, version}, snapshot{version, content}}` 带版本与快照 → 可审计、可回滚 | 真实路径形如 `/memories/audio-notes` |
| 提炼 | **本身是一种任务**（`taskType: 'build_up_memory'`），节奏写在文案里：`memory.nextReflectTonightAround3Am` = "Next reflect: tonight around 3 am." | **定时批处理，不是实时写** |
| 注入 | 三档：`fullContent / plainContent / compactFiles` | 说明**按 token 预算取压缩版**，上下文是组装的 |
| 权限 | `memory.createdByTodayContentNotEditable` = **「Agent 写的记忆，用户只能读不能改」** | 用户只能导入、归类、pin |
| 界面 | 一整套文件管理器（建文件夹 / 导入 / 重命名 / 排序 / pin 目录 / Highlights） | 记忆被当作**可浏览的资产**，不是设置项 |

**对比 YoBot**：YoBot 的记忆更偏**检索式**（向量召回 + LLM 判决 + 注入闸门 + 配额），Today 更偏**资产式**（可版本化的文件 + 可视化浏览）。**两者是互补的，不是替代关系** —— 这一点对「有机结合」很关键。

## 五、本地 Agent 与 GUI 自动化

Today 的 `Today AEX Client`（Bun 打包的 79 MB 单文件二进制）内置 **106 个 macOS 工具**，支持 MCP 协议与 OpenAI function calling：

- `mail` 13、`fs` 16、`reminders` 8、`calendar` 7、`contacts` 7、`imessage` 6、`notes` 6、`system` 6
- **`ghost*` 29 个 —— 一套完整的 GUI Agent 层**：截图 / 屏幕解析 / 元素定位 → 点击 / 输入 / 拖拽 / 热键，还有 `learnStart` + `recipeSave` / `GhostRun`，**能把人工操作学成配方再自动重放**

原生侧用 ScreenCaptureKit 抓屏、AXUIElement 读界面元素、CGEvent tap 监听输入。

**与 YoBot 的关系**：YoBot 的微信 RPA 本质上也是「GUI 自动化 + 元素定位」，但**垂直、专用、只针对微信**。Today 的做法是**通用 GUI Agent 平台**。
**可迁移点**：YoBot 可以把「微信 RPA」抽象成 GUI Agent 能力域下的一个专用配方集，从而复用一套通用底座（权限管理、元素定位、操作录制回放、失败重试），而不是为微信单独维护一套。
**注意**：通用 GUI Agent 的失败率远高于垂直专用实现。这个抽象必须先做原型验证，不要直接承诺。

## 六、其他值得记的两处

- **区域双轨**：`global` / `cn` 两套运行时环境决定云端点、深链 scheme、用户数据目录，海外版还通过编译期开关关掉录音（`FEATURE_ENABLE_RECORDING=false`）。**同一份代码产出不同区域的产品**，这是 YoBot 白标可以借鉴的更高一层的做法（YoBot 是运行时品牌配置，Today 是编译期区域构建）。
- **自研 Widget 格式 TCK**：`.tckb` 是 ZIP 信封，以 SHA-384 内容哈希命名分发，**天然免缓存失效**。YoBot 若要做「卡片/组件生态」，这套内容寻址思路可直接用。

## 七、照搬要付的代价（必须写进计划）

| Today 的做法 | 照搬到 YoBot 的代价 |
|---|---|
| Next.js 全栈内嵌（utilityProcess + 随机端口 + Server Guard 加固） | 需要重做构建与发布链路；YoBot 现在是静态 SPA，简单但能力弱。**这是「统一前端」最重的一个决策** |
| 云端账号体系 + 云端编排 | 与 YoBot 的本地 License 模式冲突，涉及商业模式改动 |
| 自研设计系统三件套（tokens / ui / icons） | 一次性投入大，但不做就永远统一不了。**建议至少做 token 层** |
| 通用 GUI Agent | 失败率高，需要大量真实场景回归数据 |
| 单时间线 | 需要先补齐四道隔离机制，否则会脏 |
