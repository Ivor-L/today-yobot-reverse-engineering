# Today 范式与设计对标

> **Today 在这份计划里的角色**：**产品形态与工程范式的参照，不是技术路线**。
> 本文抽取的是**可迁移的范式**，不是功能清单。每条注明「可迁移点」与「照搬的代价」。
> 所有结论均可在 `01-Today/` 中核验。

---

## 一、先明确一条边界：不要照搬的

| Today 的做法 | 为什么不该照搬 |
|---|---|
| Next.js 全栈内嵌（`utilityProcess` + 随机端口 + Server Guard） | 需要重做构建与发布链路。YoBot 现在是静态 SPA + 独立服务子进程，**能力足够且更简单** |
| 云端账号体系 + 云端 Agent 编排 | 与 YoBot 的本地 License 冲突，且**微信数据不出本机是数字分身的合规底线** |
| 全套自研设计系统（tokens / ui / icons 三件套） | 一次性投入大。**至少做 token 层**，UI 库按需 |
| 通用 GUI Agent（`ghost*` 29 工具） | 失败率远高于垂直实现，见 §五 |
| `thD` / `ogl` 等品牌视觉技术栈 | 与数字分身的产品气质不符（它是克制的文档式界面） |

**要抄的是下面这五条。**

---

## 二、产品形态：四个关键设计

### 2.1 全局单时间线，主动砍掉多话题

证据：`recovered/fragments/desktop/packages/realtime-contract/src/chat/threads.ts` 的注释留了改版痕迹：

> Single-timeline rewrite (PR-2): …chat-v2 **no longer renders a thread sidebar nor calls `GET /agent/threads`**（matches macOS, which has no thread list either）

**曾经有多话题侧边栏，PR-2 删了，理由是对齐 macOS。** 这是产品决策，不是能力缺失。

- **对数字分身的价值**：★★☆ 中等。数字分身的入口是**六个页面**而非一条时间线，不要强行套用。
- **真正该抄的是它背后的判断**：**多入口是负债**。每多一个入口，就多一整套「切过去时上下文怎么带」的问题。所以数字分身的六页入口必须有清晰的职责边界（`03` §二已给出）。

### 2.2 任务与对话是同级运行时对象 ✅ **最该抄**

事件命名空间三分：`thread.*`（一次对话运行）/ `task.*`（任务运行：`plan.created` → `step.*` → `completed`）/ `task.run.*`（工具调用）。中继层按前缀注入 `threadId` 或 `taskId`。

会话 ID 的分流只靠一行枢纽逻辑：

```
conversationId = typeof req.conversationId === 'string'
  ? req.conversationId      // 显式指定 → 独立会话
  : mainConversationId      // 缺省 → 主会话
```

**一套机制同时实现「单主时间线」和「任务另开会话」。**

任务模型还含：`taskType: background | automation | build_up_memory`；状态机含 **`pending_user_answer`（任务能中途停下来问人）**；`TaskDetail` 带 `steps[].dependsOn`（**步骤 DAG**）、`metadata.trace{llmCalls, toolCalls, iterations}`、`outcome{success | partial | degraded | failed}`。

**对数字分身的价值**：★★★ 高。
- 数字分身的「事项」需要一个**状态机**，Today 这套（含「中途停下来问人」）比 `product_plan.md` §5.2 的六态更完整
- `outcome` 的 `partial / degraded` 两态，正好对应 `product_plan.md` §12「部分成功」的表达需求
- **`build_up_memory` 作为任务类型**这个设计，直接回答了「九维 Wiki 的候选更新怎么跑」（见 §四）

### 2.3 上下文不脏靠结构性隔离 ✅ **最该抄**

四道机制（证据：`realtime-contract/src/chat/` + 前端 chunk）：

| 机制 | 做法 |
|---|---|
| **引用式回复** | 回复卡片只带 `widgetId + kind + summary`。上下文里是**指针，不是文档**，服务端拿 id 取全量。共 8 类可回复对象 |
| **任务另开会话** | 建任务走 `target:{type:'new_task', surface:'task_panel'}`，返回独立 conversationId |
| **内部消息过滤** | `excludeInternal` 开关；消息三层：`isFinal`（可见）/ `intermediates[]`（思考与工具调用）/ `thread.token`（逐 token，不落库） |
| **记忆外置** | 记忆不是对话上下文的一部分，是外部文件系统，按 token 预算压缩注入 |

消息还带 `messageBizType` 标签：`asst_response | task | task_onboarding | automation | asst_proactive | system` —— **一条时间线里跑着六股流，靠标签分流渲染**。

**对数字分身的价值**：★★★ 高。这是「问分身」能保持干净的**唯一可行前提**。
- 数字分身的「问分身」会话里，引用一条 Wiki 条目 / 一张人物卡 / 一份证据时，上下文里应该放 `evidence_id`，而不是把整段原文塞进去
- YoBot 已有 `agent/context/pruner.js`，是这套机制的天然落点 —— **补「引用式」而不是重写裁剪器**

### 2.4 主动动作体系 + 「时机」反馈 ✅ **最该抄**

六种形态：`automation`（cron/once）、`task_recommendations`（可一键 apply）、`asst_proactive`、`live widgets`（Agent 可主动编辑）、`brief`（晨报/晚报）、`day_in_progress`（今日进展，可被回复）。

**最值得抄的一条**：主动消息的反馈是三维的 —— `helpfulness / factualAccuracy / **timing**`。

> **把「打扰」单列成一个可优化的错误类型**，这是主动型产品与通知系统最本质的区别。

**对数字分身的价值**：★★★ 高。
- `product_plan.md` §3.4 说「机器人只推送短摘要」—— 这正是主动动作，需要 Today 这套反馈闭环
- 数字分身的「今日」页有三个动作、紧急承诺、重要变化 —— 每一条都该带 timing 反馈
- **YoBot 已有 `scheduler/`（含 `execution_preset` / `mutation_intent` / `outcome`）**，机制在，缺的是产品化的主动动作形态与反馈维度

---

## 三、前端工程范式

| 层 | Today 的做法 | 对数字分身的可迁移性 |
|---|---|---|
| **设计 token** | 自研 `@todayai-labs/opal-tokens`，基于 Tailwind v4 的 CSS 变量（`--color-*` 原子色板 + 语义变量 `--color-background` / `--color-foreground` / `--color-border`） | **★高**。这是「设计统一」的真正抓手 —— token 层统一了，Vue 还是 React 都能长得一样。**且这是唯一能立即开始、不依赖任何大决策的工作** |
| **无头组件** | Radix UI 全家桶 + `@base-ui/react` + CVA 变体 | 中。Vue 侧有 `reka-ui` 对应物，思路可搬。但 Element Plus 是「外观固定」的成品组件，与自定义设计语言会持续打架 |
| **长列表** | `react-virtuoso` | **★高**。事件时间线、人物列表、证据列表都会遇到 |
| **状态层** | `zustand` + `@tanstack/react-query`（含 persist）+ `zod` | 中。Vue 侧对应 Pinia + vue-query |
| **动效** | `motion` + `gsap` + `tw-animate-css` | 中 |
| **质量工程** | Storybook + Playwright（视觉回归 + E2E，分 smoke/full/canonical 三套）+ vitest + MSW | **★高**。不做这块，「设计统一」无法长期维持 |
| **i18n** | `i18next` + 自研 `@todayai-labs/i18n` + `i18n:verify` 键值一致性校验脚本 | **★高**。YoBot 已有多品牌白标，i18n 是硬需求 |

### 3.1 与数字分身原型的视觉对标

数字分身原型（`DIGITAL-TWIN/digital_twin_prototype.html`）**已经有一套完整的设计语言**，而且与 Today 的 Opal **哲学一致**（克制、内容优先、token 驱动），但气质不同：

| | 数字分身原型 | Today (Opal) |
|---|---|---|
| 底 | 白底 | 白底 |
| 结构 | 居中内容 1040–1120px + 顶部文字导航 | 侧边栏 + 主区 |
| 选中态 | 黑色底线 / 黑底白字胶囊 | 类似 |
| 强调色 | 少量紫色链接 | 紫色系 |
| 边框 | 1px 浅灰、10–12px 圆角、**无重阴影** | 类似 |
| 气质 | **文档式**（像笔记/知识库） | **应用式**（像桌面客户端） |

**结论**：数字分身原型的方案 §10 已经给出了**接近 token 级别的规格**（尺寸、字号、圆角、颜色用途都写死了）。

> **这意味着「设计统一」的第一步已经有一半做完了** —— 把 `product_plan.md` §10.3 那张尺寸表 + 原型的实际 CSS 值，抽成一份 CSS 变量 token 层。这一步**不依赖任何技术栈决策**（Vue 和 React 都能消费），且能立刻验证「统一设计语言」长什么样。

---

## 四、记忆：资产式 vs 检索式（互补，不是替代）

| 维度 | Today | YoBot |
|---|---|---|
| 存储 | **Markdown 虚拟文件系统**，`MemoryActivity{file{path,version}, snapshot{version,content}}`，可审计可回滚 | 文件式记忆 + 向量库（`memory/file_memory.js` + `vector`） |
| 提炼 | **本身是一种任务**（`taskType: 'build_up_memory'`），节奏写在文案里：`memory.nextReflectTonightAround3Am` = "Next reflect: tonight around 3 am." | `llm_extractor` / `turn_extractor` / `task_outcome_extractor` |
| 检索 | — | **向量召回 + LLM 判决 + 注入闸门**（阈值 0.48/0.55，用 45 组真实样本校准过） |
| 注入 | 三档：`fullContent / plainContent / compactFiles`（**按 token 预算取压缩版**） | 三层预算：相关记忆 2600 / 常驻 1200 / 知识库 4000 字符 |
| 权限 | `memory.createdByTodayContentNotEditable` = **「Agent 写的记忆，用户只能读不能改」** | — |
| 界面 | 一整套文件管理器（建文件夹/导入/重命名/排序/pin/Highlights），记忆是**可浏览的资产** | — |

### 4.1 对九维 Wiki 的三条直接启发

1. **提炼做成定时任务，不做成实时写入。** Today 的凌晨 3 点 reflect + YoBot 的 `scheduler/` 已具备这个底座。数字分身的 Wiki 候选生成应该走同一条路。
2. **「谁有写入权」要明确。** Today 的规则是「Agent 写的用户只能读不能改」；数字分身的规则更严 —— **候选由 Agent 提，确认权归本人**（`product_plan.md` §8.4）。两者都拒绝"自动生效"。
3. **记忆要能被浏览，不能只是设置项。** 数字分身的「分身 Wiki」页 + 「知识与技能」页正是这个思路，且比 Today 更进一步（有版本、有异常、有允许用途）。

> **最值得记住的一句**：YoBot 的检索能力强、Today 的资产化强。九维 Wiki 需要**两者都** —— 用 Today 的资产化做存储与展示，用 YoBot 的召回 + 判决 + 注入闸门做调用。**这是本次结合里最实的一处互补。**

---

## 五、本地 Agent 与 GUI 自动化（谨慎）

Today 的 `Today AEX Client`（Bun 打包的 79 MB 单文件）内置 **106 个 macOS 工具**，支持 MCP 与 OpenAI function calling：

- `mail` 13、`fs` 16、`reminders` 8、`calendar` 7、`contacts` 7、`imessage` 6、`notes` 6、`system` 6
- **`ghost*` 29 个 —— 完整 GUI Agent 层**：截图/解析/定位 → 点击/输入/拖拽/热键，还有 `learnStart` + `recipeSave` / `GhostRun`，**能把人工操作学成配方再自动重放**

原生侧用 ScreenCaptureKit 抓屏、AXUIElement 读界面元素、CGEvent tap 监听输入。

**与 YoBot 的关系**：YoBot 的微信 RPA 本质也是「GUI 自动化 + 元素定位」，但**垂直、专用、只针对微信**。

> ⚠️ **而这恰好是 `01-数据现实与P0门槛.md` §三 那个失败的根因所在**：
> 14/18 条同步失败的 `error_message` 是 `the single row click did not expose a verified focused remark field` —— **微信的 AX 结构变了，选择器失效**。
> Today 的 `ghost*` 是通用 GUI Agent，理论上对界面变化更鲁棒（靠截图 + 视觉定位，而不是固定 AX 路径）。

**建议**：**先不做通用化，先做「配方录制回放」** —— 即只保留「把人工操作学成配方再重放」这一条，跳过「模型理解屏幕自主决策」。前者可控，后者是不可控的承诺。

**但有一条值得单独评估**：把「元素定位」这一层从**固定 AX 路径**升级为**带自愈的定位策略**（多选择器回退 + 视觉锚点）。这是修 `01` §三那个失败的最小代价路径，且不需要引入整个通用 GUI Agent。

---

## 六、契约包体系（最能体现工程水准）

Today 把内部能力拆成一组**版本化的包**：

```
platform-interface    ← 147 条跨进程 IPC 契约；构建期从 TS 类型生成 wireName + JSON Schema
realtime-contract     ← 实时事件契约（thread.* / task.* / task.run.*）
socket                ← 事件通道
api-client            ← 从 OpenAPI 生成（351 个端点 + 上千个 zod schema）
tck / tck-host        ← 自研 Widget 打包格式（ZIP + 内容哈希寻址，天然免缓存失效）
today-client-cards / today-widget-runtime
webview-bridge / web-extend-adapter
```

**最值得借鉴的是 `platform-interface` 的能力协商模式**：

- 接口在**构建期**从 TypeScript 类型生成 `wireName` + 参数/返回值的 JSON Schema，随包发布 —— **协议文档是编译产物，不会和代码脱节**
- 运行时先做**能力协商**（模块按语义化版本演进，如 `account v0.7.0`），再对参数与返回值**双向校验**
- 因此「新版前端配旧版引擎」能**优雅降级**，不会崩

**对数字分身的价值**：★★★ 高，而且是**有具体落点的**。
- YoBot 现在是裸 HTTP + WebSocket。数字分身六页面要接的数据（今日/人物/事项/时间线/知识/记忆）**正好适合用这套模式定义一遍**
- `DIGITAL-TWIN/数字分身_Agent开发说明_v1.md` §12 已经给出了 `/dt-api/v1/*` 的完整接口草案（21 个端点）—— **把这份草案升级为「生成式契约 + 能力协商」，就是 YoBot 侧的工程演进方向**
- 白标多品牌场景下，能力协商的价值更高：不同渠道的客户端版本可以共存

---

## 七、其他两处

- **区域双轨**：`global` / `cn` 两套运行时环境决定云端点、深链 scheme、用户数据目录；海外版编译期关掉录音（`FEATURE_ENABLE_RECORDING=false`）。**同一份代码产出不同区域的产品** —— 比 YoBot 的运行时品牌配置更高一层，可以叠加使用
- **自研 Widget 格式 TCK**：`.tckb` 是 ZIP 信封，以 SHA-384 内容哈希命名分发。数字分身若要做「卡片/组件生态」，这套内容寻址思路可直接用

---

## 八、照搬要付的代价（必须写进计划）

| Today 的做法 | 照搬代价 |
|---|---|
| Next.js 全栈内嵌 | 重做构建发布链路。**不建议** |
| 云端账号 + 云端编排 | 与本地 License 冲突，且违反数据不出本机的底线。**不做** |
| 自研设计系统三件套 | 一次性投入大，但不做就永远统一不了。**建议至少做 token 层** |
| 通用 GUI Agent | 失败率高，需大量真实场景回归数据。**先做配方回放** |
| 单时间线 | 数字分身是多页面结构，**不强行套用**；抄它背后的「多入口是负债」判断 |
| 契约生成化 | 需要先有类型系统与构建链路。YoBot 是编译产物，**从接口草案起步，逐步生成化** |
