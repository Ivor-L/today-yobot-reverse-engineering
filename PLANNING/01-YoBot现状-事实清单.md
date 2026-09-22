# YoBot 现状事实清单

> **材料性质声明（重要）**：本清单全部来自**静态逆向分析**，不是开发仓库，不是运维文档。
> 恢复出的代码**从未真实启动运行过**，因此「接口存在」≠「功能已验证可用」。
> 每一节都标注了**证据路径**，可逐条核对。

---

## 一、产品与形态

| 项 | 内容 | 证据 |
|---|---|---|
| 产品 | YoBot（微信私域运营 + AI Agent 桌面客户端） | `02-YoBot-WeChat-RPA/README.md` |
| 版本 | YoBot 1.3.5；微信 RPA 插件 1.9.19，另有 2.0.0 版本的反汇编 | `analysis/逆向分析.md` |
| 平台 | macOS（原生 Helper 为 arm64 Mach-O）；代码内有 `windows_app_update_driver.js`，说明 Windows 版存在 | `recovered/app/dist/electron/electron/` |
| 商业化 | License 闭环：机器码 / 激活 / 解绑 / 校验 | `docs/RPA-HTTP接口索引.md` 前 5 条 |
| 多品牌 | 白标体系，按 `channel_id` 分发不同品牌（名称/logo/slogan/联系方式/二维码），可跳过启动页 | `restored/frontend/src/config/brand.ts` |

## 二、运行架构（三层解耦）

```
Electron 主进程 (main.js)
   ├─ 创建 BrowserWindow，loadFile("dist/ui/index.html")   ← ① 前端 SPA
   ├─ server_supervisor.js 拉起并守护 Node 服务子进程        ← ② 服务内核
   └─ macos_control_driver.js 管理原生 Helper               ← ③ 原生控制层
                                                              ↓
                                        原生 Helper (Swift, arm64)
                                                              ↓
                                        Python WeRobotCore (RPA 业务)
                                                              ↓
                                          微信 macOS 客户端界面
```

**关键结论：前端与内核是解耦的。** 前端是 `dist/ui/` 下的静态产物（`index.html` + `assets/`），内核是独立 Node 子进程，两者通过 HTTP / WebSocket 通信，并有独立的崩溃重启策略。**这意味着更换前端在架构上是受支持的，不必动内核。**

证据：`recovered/app/dist/electron/electron/main.js`（`createWindow` / `loadFile` / `loadURL`）、`server_supervisor.js`（重启退避策略，含「连续存活满 stableMs 才清零计数」的防崩溃循环设计）。

## 三、Agent 内核（已有相当完整的实现）

`recovered/app/dist/electron/` 下共约 380 个 `.js` 模块，**未压缩、保留原始中文注释**：

| 模块 | 文件数 | 内容 | 值得注意的实现 |
|---|---|---|---|
| `agent/` | 145 | `agentic/`（会话编排、幂等、投递账本、输入附件）、`session/`（锁 + 管理器）、`context/`（**pruner 上下文裁剪**）、`expert/`（专家能力解析、组合、灰度发布、部署路由守卫、直连路由）、`harness/`、`llm/`、`task/`、`run/`、`history/`、`heartbeat/`、`diagnostics/`、`eval/`、`upgrade/` | 已有**上下文裁剪器**、**专家能力的灰度发布**、**调用策略与本地 API 守卫** |
| `memory/` | 14 | `file_memory`（文件式记忆 + chokidar 监听）、`recall`（向量召回）、`recall_judge`（LLM 判决）、`injection_gate`（注入闸门）、`vector`、`llm_extractor`、`turn_extractor`、`task_outcome_extractor`、`evolution`、`workflow_rag`、`skill_notes`、`metadata_store`、`image_tokens`、`signal_processor` | 召回阈值是**用 45 组真实 query→memory 对校准过的**（`DEFAULT_MIN_VECTOR_RELEVANCE=0.48`、`STRONG=0.55`），注释明确写了上一版 0.62 阈值「不可达」；三层预算：相关记忆 2600 字符 / 常驻上下文 1200 字符 / 知识库 4000 字符 |
| `skills/` | 72 | `wechat_rpa/`（账号、交付、联系人同步队列、运行时身份、进程清理、运行时闸门）、`mcp/`（客户端 + **服务端** + 传输层 + 暴露控制）、`agent_builder`、`workflow`、`self_profile`、`ima`、`builtins`、`tools`、`scheduler_skill`、`user_installed_catalog` | 已同时具备 **MCP 客户端与服务端**；技能的**用户可安装目录** |
| `knowledge/` | 3 | `registry` / `quota` / `limits` | 知识库有**配额与容量核算**（按日增量、单文件大小、总量） |
| `gateway/` | 8 | `expert_process`、`session`、`session_key`、`session_quota`、`turn_queue`、`model_history`、`trace_upload` | 已有**会话配额**与**轮次队列** |
| `scheduler/` | 9 | `scheduler`、`store`、`store_file`、`execution_preset`、`mutation_intent`、`outcome`、`runs_store` | 已有**变更意图**与**执行结果**模型 |
| `channels/` | 11 | `wechat`、`wechat_ilink`、`feishu`、`websocket`、`adapter` | **四条渠道**：桌面微信 RPA、微信 iLink（扫码绑定 + 长轮询）、飞书、原生 WS |
| `browser/` | 5 | 浏览器自动化 | — |
| `commercial/` | 1 | 商业授权 | — |
| `electron/` | 53 | 应用更新（Squirrel/Zip/多平台）、**插件系统**（安装/清单解析/发布客户端/生命周期/运行时恢复）、日志、窗口 IPC 注册表、安全、工作区路径 | 已有完整的**插件安装与更新链路** |
| `core/` | 12 | `auth`、`config`、`notification`、`platform`、`machine_code` | — |

**结论：YoBot 缺的不是引擎，是产品形态与前端。**

## 四、微信 RPA 能力面（97 个 HTTP 接口）

来源：`docs/RPA-HTTP接口索引.md`（本地运行服务的 `/openapi.json` 快照，2026-09-20）。

| 业务域 | 端点数 | 能力 |
|---|---|---|
| `api/tasks` | 29 | 群发任务（创建/暂停/恢复/取消/批量）、自动加好友任务、通讯录同步任务、朋友圈发布任务、好友请求风控记录。**任务模型已有暂停/恢复/取消的完整状态机** |
| `api/chat` | 12 | 监控开关、多账号监控、历史会话、历史消息、最新会话、发消息、挂起会话（suspended）与恢复、人工复核开关 |
| `api/agent` | 11 | Agent 运行身份、契约、任务、后端状态、功能状态、发文件、群发、发朋友圈、测试 |
| `api/friend` | 9 | 好友列表、删除、批量删除、自动加新、导入、剩余额度、加好友日志、导出 |
| `api/contacts` | 6 | 通讯录、群列表、联系人标签、群标签、设置群标签、邀请入群 |
| `api/moment` | 6 | 朋友圈自动评论开关、互动记录、发布任务、任务列表、取消、发布日志 |
| `api/moment-material` | 5 | 朋友圈素材：计划、文件夹、分组、选择/打开目录 |
| `api/license` | 5 | 授权闭环 |
| `api/runtime` | 3 | 能力声明、启动状态、启动动作 |
| 其他 | 11 | 实例管理、配置读写、健康检查、文件上传、当前用户、连接状态、微信启动 |

### 对外 MCP 工具（7 个）

`docs/rpa-mcp-tools-2026-09-20.json`：

`wechat_list_history_sessions`、`wechat_get_history_messages`、`wechat_send_message`（标记 `destructiveHint: true`）、`wechat_status`、`wechat_list_contacts`、`wechat_list_groups`、`wechat_sync_contacts`

> 工具描述写得相当克制，例如列举历史会话时明确写「**不是完整微信历史**」，发送消息写「**超时后不要自动重发，先核实是否送达**」。这种把能力边界写进工具描述的实践值得保留。

## 五、前端现状

| 项 | 内容 |
|---|---|
| 技术栈 | **Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus**（含 `@element-plus/icons-vue`，中文 locale） |
| 页面（10 个） | `LicenseView`、`StartupRoutePage`、`RuntimeStartupPage`、`MultiWelcomePage`、`AiChatNew`、`CustomerManagement`、`MomentsView`、`AutoSOP`、`SettingsPage`、`StartupPage` |
| 业务组件（37 个 `.vue`） | `settings/`（VoiceConfig、VoiceLibrary、GreetingConfig、CozeAgentConfig、SettingsBackup、FfmpegInstallGuide、VoiceComplianceDialog）、`moments/`（CreateTaskWizard）、`sop/actions/`、`chat/`、`ui/` |
| API 层（17 个模块） | agent、autosop、chat、coze、config、contact、external-api、init、license、moments、request、runtimeCapabilities、settingsBackup、sop、startup、syncContacts、voice |
| 路由守卫 | 有 `requiresStartup` 元信息与 `resolveRouteCapability` 能力校验 |
| 已知实现细节 | `main.ts` 里全局掐掉 `<form>` 原生提交事件（注释说明：WebView2 下回车触发隐式提交会绕过 vue-router 导致整窗变黑）；`isNarrowScreen` 按窗口宽度隐藏右侧栏 |

证据：`restored/frontend/src/`（106 个按原路径恢复的文件），原始路径映射见 `analysis/frontend-sources.json`。

## 六、恢复边界（决定迁移策略的关键）

| 层 | 恢复程度 | 可维护性 |
|---|---|---|
| Electron 主进程 + 服务内核（JS） | **可读、带注释，可直接阅读与修改** | 中——是编译产物，无原始 TS 类型与构建配置 |
| 前端 | 92 个第一方源文件按原路径恢复，另有 1264 条 source map 内容（含第三方与重复视图） | 中高——但**不是完整工程**，无构建配置 |
| Python 控制层 | 仅**反汇编**（字节码指令 + 常量），不是还原后的 Python 源码 | 低——需语义恢复或按契约重写 |
| 原生 Helper | 仅**静态识别**（符号 / 字符串 / 动态库清单），Swift 源码未恢复 | 低 |
| 原始开发仓库 | 未恢复。安装包的 `package.json` 不含完整构建流程 | — |

**已通过的验证**：Node 语法检查（`wechat.js`、`wechat_ilink/adapter.js`、`client.js`）；Python 单元测试（`tests/`，需 Python 3.9）。

**未做的验证**：真实账号的收发、扫码绑定、可重新打包运行。未修改原始安装包，未读取聊天数据库或登录凭据。

## 七、合规提示（必须进入计划的风险项）

1. **逆向产物**：本清单内容源自对第三方商业软件（YoBot）的逆向工程。
2. **授权绕过脚本**：`standalone/scripts/` 下有 `enable_local_rpa.py`、`configure.py`、`patch_main_shell.py` 等改造脚本，用于绕过商业授权——**不得随产品分发**。
3. **微信 RPA 本身的风险**：基于 Accessibility + ScreenCaptureKit + CGEvent 的界面自动化控制微信，涉及平台协议与账号风控，是**产品级风险**而非技术风险，需在计划中单列。
4. **凭据**：构建产物内联了 PostHog token、Sentry DSN、OAuth client ID，对外分享前需脱敏。
