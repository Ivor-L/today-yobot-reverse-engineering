# 给 GPT 的开发计划提示词

> **用法**：把下面 `---` 之间的全部内容复制，粘贴给网页版 GPT（建议开新对话、选推理模型）。
> 如果 GPT 已能访问本仓库（GitHub 连接器），它会自己去核对文件；如果不能，把 `01` / `02` / `03` 三份文档一并作为附件上传。

---

# 角色

你是一位同时具备**桌面客户端架构、AI Agent 系统工程、to B 私域运营产品**三重经验的技术负责人。你的任务不是写代码，而是产出一份**可以直接排期的开发计划**。

# 背景

我手里有两个 macOS/Windows 桌面产品的逆向分析成果（完整材料在仓库里）：

**A. YoBot（我的产品，要改造的对象）**
- 微信私域运营 + AI Agent 桌面客户端。Electron 外壳 + Vue 3 静态 SPA + 独立 Node 服务子进程；macOS 侧挂一个原生 Helper 驱动 Python 编写的微信 RPA 插件
- **核心资产**：微信界面自动化（RPA），97 个 HTTP 接口覆盖群发 / 自动加好友 / 朋友圈 / 通讯录同步 / 客户管理 / 自动 SOP / 语音；已对外暴露 7 个 MCP 工具；License 商业化闭环；**多品牌白标**（`channel_id` + 品牌配置，同一套代码多渠道分发）
- **已有一套相当完整的 Agent 内核**：`agent/`（145 个模块，含 agentic 会话编排、expert 专家组合与灰度发布、harness、llm、session、context pruner、task、run、history、heartbeat、diagnostics、eval）、`skills/`（72 个模块，含 wechat_rpa、MCP 客户端与服务端、agent_builder、workflow、self_profile）、`memory/`（14 个模块，含向量召回 + LLM 判决 + 注入闸门 + token 预算 + 知识库配额）、`knowledge/`、`gateway/`、`scheduler/`、`channels/`（wechat / wechat_ilink / feishu / websocket）

**B. Today（参照对象，要学它的产品形态）**
- AI 原生的个人助手桌面端。同样是 Electron，但内嵌一整个 Next.js 全栈应用（跑在 utilityProcess，绑定 127.0.0.1 随机端口）
- **产品形态的四个关键设计**：① 全局只有一条对话时间线（主动砍掉了多话题侧边栏）；② 任务与对话是同级运行时对象，任务开独立会话；③ 记忆外置成可版本化的 Markdown 文件系统，由凌晨定时任务提炼，不进对话上下文；④ 主动动作六形态（定时自动化 / 任务推荐 / 主动消息 / 常驻组件 / 简报 / 今日进展），并配「有用性 / 事实准确性 / **时机**」三维反馈
- **前端工程范式**：自研设计系统 `opal-tokens` + `opal-ui` + `opal-icons`（基于 Tailwind v4 的 CSS 变量 token 层）+ Radix / Base UI 无头组件 + CVA 变体 + zustand / react-query 状态层 + react-virtuoso 长列表 + Storybook / Playwright 视觉回归 / vitest
- **内部契约包体系**：`platform-interface`（147 条跨进程 IPC 契约，构建期从类型生成 JSON Schema，运行时做能力协商与双向校验）、`realtime-contract`、`socket`、`tck`（自研 Widget 打包格式）、`today-client-cards`、`webview-bridge`

# 我的目标

把 YoBot 改造成 Today 这种产品体验：**前端设计语言完全统一、服务与功能重新组织、但必须保留并放大 YoBot 已有的功能与优势**。不是照抄 Today，而是「Today 的产品形态 + YoBot 的引擎与渠道能力」有机结合。

# 任务

产出一份**分阶段开发计划**。请严格按下面的结构输出：

## 1. 现状核实与关键判断（先做这步，再谈计划）

- 核对仓库中 YoBot 的实际能力边界：**哪些是已验证可用的，哪些只是逆向出来的代码结构**。特别注意：这是一份逆向工程产物，恢复的代码**从未真实启动运行过**，不要把它当作「已上线的现有系统」来规划
- 明确区分：YoBot **已有**的引擎能力 / Today **才有**的产品形态 / 两者**都没有**需要新建的
- 给出你的**总体判断**：与其在 YoBot 上改造，还是新建一个外壳复用 YoBot 引擎更划算？说明理由和代价

## 2. 面向决策的取舍清单

列出所有**必须由我拍板**的决策点，每个决策点给出：选项、各自的代价与风险、你的推荐、以及「如果不决策会怎样」。至少覆盖：

- 前端技术栈（保留 Vue 3 / 迁移到 React+Next / 其他）
- 「设计统一」统一到哪一层（只统一视觉语言 / 统一组件库 / 统一到代码复用）
- Agent 内核保留还是重写（YoBot 内核已有大量投入，但它是逆向产物而非可维护源码——这是个真问题，请正面回答）
- 云端能力要不要（Today 是云端账号体系 + 云端编排，YoBot 是本地 License）
- 微信 RPA 的定位（它的合规风险请直接说，并给出降低风险的方案）
- 多品牌白标能力保留与否

## 3. 目标架构

- 分层架构图（用 Mermaid 或 ASCII），标注每层的**技术选型与归属**（沿用 YoBot / 引入 Today 范式 / 新建）
- 明确前端与引擎之间的**契约层**怎么设计（Today 的 `platform-interface` 能力协商模式值得借鉴，但请说明在 YoBot 现有 HTTP/WS 基础上怎么演进）
- 数据与记忆层的目标模型
- 明确列出**明确不做的事**（scope out）

## 4. 分阶段里程碑

每个阶段给出：阶段目标 / 交付物 / 验收标准 / 依赖 / 预估工作量（用「人周」而非日历时间）/ 主要风险。
阶段划分要让**每一步都有可独立验证的产出**，不要出现「改造三个月后才能看到效果」这种安排。

## 5. 前端统一的具体方案

- 设计系统的 token 层怎么建（颜色 / 间距 / 字号 / 圆角 / 阴影 / 动效）
- 组件库怎么组织（基础组件 / 业务组件 / 卡片体系）
- YoBot 现有 10 个页面（License / 启动 / 欢迎 / AI 对话 / 客户管理 / 朋友圈 / 自动 SOP / 设置 / 运行状态）在**单时间线 + 卡片**的新形态下怎么重新表达——这一条要具体，逐页给出改造方案
- 白标多品牌在统一设计系统下怎么实现（不能破坏换肤能力）

## 6. 风险与验证

- 技术风险、合规风险、产品风险分类列出
- 每个风险给出**可执行的早期验证动作**（怎么在一周内证伪）
- 指出这份计划里**你不确定的地方**，以及对我的输入依赖

# 硬性要求

1. **不要编造**。凡涉及 YoBot 具体实现细节，请先在仓库里找到证据文件再下结论，并在结论后标注证据路径。找不到证据的，明确写「未验证」。
2. **不要重新发明已有能力**。YoBot 的 `memory/`、`skills/`、`expert/`、`scheduler/` 已有完整实现，如果你的方案要重写它们，必须说明为什么现有实现不可用。
3. **不要把逆向产物当源码工程**。它能读、能作为设计参考，但**不是可维护的开发代码库**——这条会直接影响你的迁移策略，请认真对待。
4. **优先给决策，不要给中立描述**。每个取舍都要有你的推荐和理由，可以明确反对我的某些想法。
5. 输出用中文，Markdown 格式。**总长度控制在 6000 字以内**，信息密度优先，不要写客套话和总结性套话。
6. 如果我的目标里有内在矛盾（比如「完全统一前端」与「保留 Vue 投入」冲突），**直接指出来**，不要和稀泥。

# 仓库阅读指引

| 想了解 | 看哪个文件 |
|---|---|
| YoBot 能力事实清单 | `PLANNING/01-YoBot现状-事实清单.md` |
| Today 产品范式参照 | `PLANNING/02-Today范式-参照清单.md` |
| 已识别的差异与决策点 | `PLANNING/03-差异地图与待决策项.md` |
| YoBot 微信 RPA 全部接口 | `02-YoBot-WeChat-RPA/docs/RPA-HTTP接口索引.md` |
| YoBot RPA 的 MCP 工具定义 | `02-YoBot-WeChat-RPA/docs/rpa-mcp-tools-2026-09-20.json` |
| YoBot 引擎源码（未压缩、保留注释） | `02-YoBot-WeChat-RPA/recovered/app/dist/electron/` |
| YoBot 记忆层实现 | `02-YoBot-WeChat-RPA/recovered/app/dist/electron/memory/` |
| YoBot 前端页面（原始 TS/Vue） | `02-YoBot-WeChat-RPA/restored/frontend/src/` |
| Today 后端接口与数据模型 | `01-Today/recovered/fragments/desktop/packages/api-client/src/generated/` |
| Today 跨进程契约 | `01-Today/recovered/fragments/*/packages/platform-interface/generated/bridge/` |
| Today 模块骨架 | `01-Today/recovered/metadata/desktop-fragments.tsv` |
| Today 前端依赖清单 | `01-Today/recovered/web-runtime/apps/web/package.json` |

> 注意：`02-YoBot-WeChat-RPA/recovered/app/dist/server.cjs`（31 MB / 73.6 万行）与 `analysis/helper-disassembly.txt`（18.8 MB）是批量转储，**不要整份读取**，按关键词检索局部即可。

---

## 追问模板（第一轮输出后接着用）

计划出来后，用这几句继续挖，效果比一次问完更好：

- 「第 3 章的架构里，`platform-interface` 这一层如果不上，代价具体是什么？给我一个不上也能跑的最小版本。」
- 「把第 4 章的第 1 阶段拆到『一个人两周内能交付并验收』的粒度。」
- 「第 2 章你推荐的选项，如果我选了你没推荐的那个，计划要怎么改？」
- 「针对最高风险项，给我一个一周内能做完的证伪实验，要能得出『继续 / 放弃』的结论。」
- 「现在假装计划已经执行到一半失败了。最可能踩的坑是哪个？当时应该在哪一步埋什么检查点？」
