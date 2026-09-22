# YoBot 资产清单

> 数字分身的实现地基在这里。本清单回答一个问题：**YoBot 已经有什么，可以直接用，不用重造。**
>
> **材料性质**：第二节至第五节的引擎与前端能力来自**静态逆向分析**（`02-YoBot-WeChat-RPA/`）；第一节的数据源能力来自**本机实测文档**（`DIGITAL-TWIN/微信数据对外接入文档.md`）。两者的可信度不同，已分别标注。
> 每节都带证据路径，可逐条核对。

---

## 一、可读数据源能力（✅ 本机实测）

这是数字分身**唯一被授权的数据入口**。三条通道，能力与限制都很硬。

| 通道 | 形态 | 鉴权 | 状态 | 数字分身是否使用 |
|---|---|---|---|---|
| **A. MCP 网关** | Streamable HTTP，`POST 127.0.0.1:<随机端口>/mcp` | Bearer | ✅ 已启用 | **首选**（在线读取） |
| **B. RPA HTTP API** | FastAPI，`127.0.0.1:9922`，有 `/docs` | `X-API-Key` + `X-Channel-ID`（进程内临时凭据） | ⚠️ 端口在听，**外部进程拿不到凭据** | ❌ 不使用 |
| **C. 本地文件** | SQLite / JSONL / JSON | 文件权限 | ✅ 路径与结构实测 | 使用（离线取数、诊断） |

### 1.1 MCP 工具的只读白名单

7 个工具中，数字分身**只用 5 个只读工具**：

| 工具 | 入参 | 只读 | 用途 |
|---|---|---|---|
| `wechat_status` | — | ✅ | 账号与 RPA 状态 |
| `wechat_list_history_sessions` | — | ✅ | 已采集会话**索引**（≠ 完整微信历史） |
| `wechat_get_history_messages` | `account_id`, `session_id` | ✅ | 某会话**已保存**的消息 |
| `wechat_list_contacts` | `account_id` | ✅ | 已同步好友 |
| `wechat_list_groups` | `account_id` | ✅ | 已同步群 |
| `wechat_sync_contacts` | `account_id`, `type` | ❌ 有副作用 | **禁止自动调用**（会驱动桌面微信） |
| `wechat_send_message` | `account_id`, `user`, `message` | ❌ 不可撤销 | **不进首版** |

> 工具描述本身写得克制，例如列举会话时明确写「**不是完整微信历史**」，发送消息写「**超时后不要自动重发，先核实是否送达**」。**这种把能力边界写进工具描述的做法，数字分身应当继承。**

### 1.2 传输约束（实现时必须遵守）

- 仅 `POST /mcp`；JSON 响应模式，**不提供 SSE**；不支持 JSON-RPC 批量数组
- `Host` 必须是 `127.0.0.1:<端口>`；**请求带 `Origin` 头即 403**（故意的，防网页脚本盗用）
- 请求体上限 64 KB（这是**请求**限制，不是响应体长度的承诺）
- 协议版本 `initialize` 示例用 `2025-06-18`，实测响应回落 `2025-03-26` —— **以实际协商结果为准**
- 无 `id` 的通知返回 `202` 空 body，**不能对空 body 强行 `json.loads`**
- 客户端必须**禁用自动重定向与代理转发**，防止 Bearer 被送到非本机；禁止在异常/trace/dump 里打印 headers

### 1.3 离线文件（通道 C）

**SQLite 联系人快照** — `~/Library/Application Support/YokoWebot/data/wechat_contacts.db`

```sql
friends(id, account_id, wxid, name, nickname, remark, tag, is_new, created_at, last_updated)
    UNIQUE(account_id, wxid, tag)      -- 同一好友可能因 tag 形成多行
groups (id, account_id, name, tag, last_updated)
    UNIQUE(account_id, name)           -- ⚠️ 没有持久的 group wxid
```

必须遵守的口径：
- 应用侧人物按 `安装实例 + account_id + wxid` 识别，tag 聚合；**不按自增 id 或名称跨账号合并**
- 群只能形成**暂定实体**，标记 `identity_quality=name_only`
- `is_new` 是源语义，**不等于「今天新增好友」**；`last_updated` 是同步记录时间，**不等于最近聊天时间**
- **只读打开**（`file:<path>?mode=ro`），不执行写 SQL / migration / VACUUM
- 空结果**不自动视为删除**

**JSONL 客户事件流** — `~/.webot/data/customer_events_v1/`

- 必备字段：`schema_version, event_id, event_type, occurred_at, recorded_at, account, subject, source, result, data, extensions`
- `additionalProperties: true` —— **遇到新键不能丢整行**
- 按 `(installation_id, event_id)` 去重
- 轮转规则：`max_records: 10000`、`max_bytes: 16MB`、按天分片（一天可能多片）
- ⚠️ **当前这个流里没有消息类事件**，只有 `contact.sync.failed`。**不得在代码里假设 `message.received` 之类的类型存在**

### 1.4 能力边界（别对外承诺）

| 想要的 | 实际 | 结论 |
|---|---|---|
| 每个好友的头像 | 表里无头像列，同步流水线不持久化，原生缓存不读 | ❌ 拿不到 |
| 实时监控群消息 | 只有机会式采集的落盘历史 + 当前窗口快照 | ❌ 无实时流 |
| 群聊里 @ 某人 | RPA 无 @ 发件人能力（写 `@张三` 只是文字） | ❌ 做不到 |
| 完整微信历史 | RPA 不读微信 `WeChat Files` | ❌ 只有被采集过的部分 |

---

## 二、可复用引擎能力（⚠️ 静态逆向，未运行验证）

`02-YoBot-WeChat-RPA/recovered/app/dist/electron/` 下约 **380 个 `.js` 模块，未压缩、保留原始中文注释**。

| 模块 | 文件数 | 内容 | 与数字分身的关系 |
|---|---|---|---|
| `agent/` | 145 | `agentic/`（会话编排、幂等、投递账本）、`session/`（锁）、`context/`（**pruner 裁剪器**）、`expert/`（能力组合 + 灰度发布 + 路由守卫）、`harness/`、`llm/`、`task/`、`run/`、`history/`、`heartbeat/`、`diagnostics/`、`eval/` | **直接复用**。「问分身」与事项提取的底座 |
| `memory/` | 14 | `file_memory`（文件式 + chokidar 监听）、`recall`（向量召回）、`recall_judge`（LLM 判决）、`injection_gate`（注入闸门）、`vector`、`llm_extractor`、`turn_extractor`、`task_outcome_extractor`、`evolution`、`workflow_rag`、`skill_notes`、`metadata_store`、`image_tokens`、`signal_processor` | **直接复用**。九维 Wiki 的检索底座 |
| `skills/` | 72 | `wechat_rpa/`、`mcp/`（客户端 + **服务端** + 传输层 + 暴露控制）、`agent_builder`、`workflow`、`self_profile`、`ima`、`builtins`、`tools`、`scheduler_skill`、`user_installed_catalog` | 复用。`user_installed_catalog` 是「知识与技能」页的天然落点 |
| `knowledge/` | 3 | `registry` / `quota` / `limits`（配额、日增量、容量核算） | 复用。已有配额模型 |
| `scheduler/` | 9 | `scheduler`、`store`、`execution_preset`、`mutation_intent`、`outcome`、`runs_store` | 复用。日报定时、检查任务的底座 |
| `gateway/` | 8 | `expert_process`、`session`、`session_quota`、`turn_queue`、`model_history`、`trace_upload` | 复用 |
| `channels/` | 11 | `wechat`、`wechat_ilink`、`feishu`、`websocket`、`adapter` | **四条渠道**，数字分身的推送出口 |
| `electron/` | 53 | 应用更新、**插件系统**（安装/清单/生命周期/运行时恢复）、日志、窗口 IPC、安全、工作区路径 | 复用。数字分身可作为插件形态落地 |
| `browser/` | 5 | 浏览器自动化 | — |
| `core/` | 12 | `auth`、`config`、`notification`、`platform`、`machine_code` | 复用 |

### 记忆层的两个具体设计（值得直接继承）

- **召回阈值是用 45 组真实 query→memory 对校准过的**：`DEFAULT_MIN_VECTOR_RELEVANCE=0.48`、`STRONG=0.55`。注释里明确记着上一版 0.62 阈值「不可达」 —— **这是有人认真调过的证据，不要随便推翻**
- **三层 token 预算**：相关记忆 2600 字符 / 常驻上下文 1200 字符 / 知识库 4000 字符

> 这与 Today 的「记忆外置成 Markdown VFS + 按预算压缩注入」**是同一思路的不同实现**：YoBot 偏检索式，Today 偏资产式。**两者互补，不是替代。** 详见 `04-Today范式与设计对标.md`。

---

## 三、微信 RPA 能力面（97 个 HTTP 接口）

来源：`02-YoBot-WeChat-RPA/docs/RPA-HTTP接口索引.md`（本地 `/openapi.json` 快照）。

| 业务域 | 端点数 | 能力 | 数字分身可用性 |
|---|---|---|---|
| `api/tasks` | 29 | 群发、自动加好友、通讯录同步、朋友圈发布任务。**已有暂停/恢复/取消完整状态机** | 机制可借鉴；**动作不进首版** |
| `api/chat` | 12 | 监控开关、历史会话/消息、发消息、挂起会话、人工复核 | 只读部分可用（经 MCP） |
| `api/agent` | 11 | 运行身份、契约、任务、后端状态、发文件、群发、发圈 | 只读部分可用 |
| `api/friend` | 9 | 好友列表、删除、导入、加好友日志、导出 | 只读可用 |
| `api/contacts` | 6 | 通讯录、群列表、标签、邀请入群 | 只读可用 |
| `api/moment` | 6 | 朋友圈自动评论、互动记录、发布任务 | **不进首版** |
| `api/runtime` | 3 | 能力声明、启动状态 | 可用 |
| 其他 | 11 | 实例管理、配置读写、健康检查、上传 | 部分可用 |

> ⚠️ **通道 B（9922）不应被数字分身依赖**：凭据是进程内临时值，外部进程默认拿不到。

---

## 四、前端现状（⚠️ 静态逆向）

| 项 | 内容 |
|---|---|
| 技术栈 | **Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus** |
| 页面（10 个） | `LicenseView`、`StartupRoutePage`、`RuntimeStartupPage`、`MultiWelcomePage`、`AiChatNew`、`CustomerManagement`、`MomentsView`、`AutoSOP`、`SettingsPage`、`StartupPage` |
| 业务组件 | 37 个 `.vue`（settings / moments / sop / chat / ui） |
| API 层 | 17 个模块 |
| 路由守卫 | `requiresStartup` 元信息 + `resolveRouteCapability` 能力校验 |
| 已知细节 | `main.ts` 全局掐掉 `<form>` 原生提交（注释说明：WebView2 下回车触发隐式提交会绕过 vue-router 导致整窗变黑）；`isNarrowScreen` 按宽度隐藏右侧栏 |

**关键判断**：现有 10 个页面**全部是销售动作导向的**（客户管理、朋友圈、SOP、群发）。数字分身的六页面（今日 / 人物 / 事项 / 时间线 / 知识与技能 / 分身 Wiki）在这套前端里**没有对应物** —— 这是新增，不是改造。

---

## 五、恢复边界与合规提示

| 层 | 恢复程度 | 可维护性 |
|---|---|---|
| Electron 主进程 + 服务内核（JS） | 可读、带注释，可直接阅读与修改 | 中 —— 是编译产物，无原始 TS 类型与构建配置 |
| 前端 | 92 个第一方源文件按原路径恢复 + 1264 条 source map | 中高 —— 但不是完整工程 |
| Python 控制层 | **仅反汇编**（字节码 + 常量） | 低 —— 需语义恢复或按契约重写 |
| 原生 Helper | 仅静态识别（符号/字符串/动态库） | 低 |
| 原始开发仓库 | **未恢复** | — |

**合规提示**（必须进计划的风险项）：

1. 本材料源自对第三方商业软件的**逆向工程**
2. `standalone/scripts/` 下有 `enable_local_rpa.py`、`configure.py`、`patch_main_shell.py` 等**授权绕过脚本** —— 不得随产品分发
3. **数字分身的 MCP 数据通道建在逆向改造版之上**（原版 RPA 2.0.0 没有 MCP 网关，`recovery-mcp.js` 是加装的）。若要商业分发，这条依赖必须替换
4. 构建产物内联了 PostHog token、Sentry DSN、OAuth client ID —— 对外分享前需脱敏
