# RPA 外部 Agent 接入指南

核对日期：2026-09-20。对象：本工作区的 YoBot 恢复版及当前运行的 macOS RPA。

## 结论

修复后的对外 MCP 已可以完成协议握手和工具发现。当前使用恢复版的 **local-compat 兼容服务**，现已扩展为 7 个工具：微信状态、好友列表、群列表、通讯录同步，以及会话索引、历史消息查询和文字发送。朋友圈等其余 API 尚未开放。

外部 Agent 可从「对外开放」页面取得 URL 和配对 Token。当前仍需保持 YoBot 恢复版运行，由宿主管理服务与 RPA。完全脱离 YoBot 独立运行未验证。

## 此前修复后的验证记录（扩展前）

2026-09-20 20:02（北京时间）通过独立 HTTP 客户端复核：

| 项目 | 结果 |
|---|---|
| 开放状态 | `enabled=true`、`running=true`、`connectionState=ready` |
| 当前地址 | `http://127.0.0.1:52737/mcp`，仅本次运行有效 |
| 服务身份 | `yobot-local-compat`，版本 `1.0.0` |
| 能力版本 | profile=`local-compat`，toolsetVersion=`1` |
| MCP 初始化 | 成功，协议版本 `2025-03-26` |
| 工具发现 | 成功，当时返回 4 个工具及参数 schema（下方清单已更新为扩展后版本） |
| 实际状态调用 | MCP 请求完成，但 `isError=true`，底层报辅助功能权限不足 |
| Codex 客户端连接 | 本次未修改 Codex 配置，未验证其客户端会话 |

`wechat_status` 的本次错误：

```text
macOS instance discovery failed [ACCESSIBILITY_PERMISSION_REQUIRED]:
Accessibility permission is not granted to the formal Helper identity
```

因此当前结论是：**MCP 接入通道已通，微信业务状态查询本次受 Helper 辅助功能权限阻挡。** 需在系统设置中核对实际运行的正式 Helper 身份及其辅助功能权限；仅给外层 YoBot 授权不一定足够。权限恢复后重新调用状态工具验收。此前其他验证记录中的成功结果不代表本次运行仍成功。

历史上的 `HTTP_405` 属于修复前故障。当前兼容实现通过独立本机服务提供 MCP，不能继续使用旧的 `9922/mcp` 地址作为接入示例。

## 当前对外开放的 7 个工具

| 工具 | 用途 | 参数 | 本次验证 |
|---|---|---|---|
| `wechat_list_history_sessions` | 列出已有聊天记录的会话索引 | `{}` | 新增；索引可能涉及多个账号 |
| `wechat_get_history_messages` | 读取指定账号、会话的本地记录 | `account_id`、`session_id` 必填 | 新增；session_id 来自索引，不接受路径分隔符或点路径 |
| `wechat_send_message` | 向好友或群发送文字 | `account_id`、`user`、`message` 必填 | 模拟发送验证通过，未真实发送 |
| `wechat_status` | 读取微信账号与 RPA 状态 | `{}` | 已调用，返回上述权限错误 |
| `wechat_list_contacts` | 读取已同步到本机的好友列表 | `account_id` 必填 | 已发现 schema，未读取联系人数据 |
| `wechat_list_groups` | 读取已同步到本机的群列表 | `account_id` 必填 | 已发现 schema，未读取群数据 |
| `wechat_sync_contacts` | 从桌面微信重新同步通讯录 | `account_id`、`type` 必填；type 为 `friend` 或 `group` | 已发现 schema，未触发同步 |

`account_id` 必须来自真实账号状态，不是好友昵称；长度 1–128 字符，不能只填空格。以上工具均不接受未声明的额外字段。列表工具没有 keyword、tag 或 limit 参数，不要照搬 YoBot 内部工具参数。它们读的是已有缓存，不保证覆盖全部好友或群。

参数示例（这是 `tools/call` 的 params，不是完整 HTTP 请求）：

```json
{"name":"wechat_status","arguments":{}}
```

```json
{"name":"wechat_list_contacts","arguments":{"account_id":"<真实账号ID>"}}
```

```json
{"name":"wechat_list_groups","arguments":{"account_id":"<真实账号ID>"}}
```

```json
{"name":"wechat_sync_contacts","arguments":{"account_id":"<真实账号ID>","type":"group"}}
```

同步会操作微信界面并更新缓存，应在用户要求刷新通讯录时调用，避免与其他桌面操作并发。接口存在不等于同步业务已经实测成功。

## 接入 Codex

1. 启动 `standalone/dist/YoBot Recovered.app`，确保微信已登录，RPA 能识别账号，辅助功能与录屏权限正常。
2. 打开 YoBot 左侧「对外开放」，开启开关，等到显示「运行中」。这个页面不同于“让 YoBot 接入别人的 MCP”的 MCP 服务配置页。
3. 复制页面显示的 URL 与 Token。下面的 52737 仅为本次实测端口。兼容服务启动时随机分配端口并生成 Token，重启服务后应重新核对两者；页面重新生成 Token 后也需更新客户端。
4. 在 Codex 的 `~/.codex/config.toml` 合并以下配置，保留已有配置。也可使用受信任项目的 `.codex/config.toml`。

```toml
[mcp_servers.wechat_rpa]
url = "http://127.0.0.1:52737/mcp"
bearer_token_env_var = "WECHAT_RPA_MCP_TOKEN"
enabled = true
startup_timeout_sec = 20
tool_timeout_sec = 180
```

`WECHAT_RPA_MCP_TOKEN` 的值应为对外开放页面的配对 Token。必须让启动 Codex 的进程继承该变量；仅在另一个终端里 export，不会自动传给已经打开的桌面 App。桌面环境不方便传变量时，可用下面的静态 Header 配置替代 `bearer_token_env_var`，但不要把含真实 Token 的配置提交到仓库：

```toml
[mcp_servers.wechat_rpa]
url = "http://127.0.0.1:52737/mcp"
http_headers = { Authorization = "Bearer <替换为页面上的配对Token>" }
enabled = true
tool_timeout_sec = 180
```

以上两个方案二选一，不要重复声明同一个 TOML 表。重新加载 MCP 或重启 Codex 后，先让它列出该服务的工具，再进行只读检查。配置保存成功不等于服务已连通。

Codex 的 Streamable HTTP、环境变量 Bearer Token、静态 Header 和工具超时配置已按 [OpenAI 官方 MCP 文档](https://learn.chatgpt.com/docs/extend/mcp)核对。页面里的通用 `mcpServers` JSON 不能原样粘贴进 Codex TOML。

## 其他 Agent 如何接入

支持 HTTP MCP 和自定义鉴权 Header 的宿主，可参考页面生成的通用配置；具体外层格式以该宿主为准：

```json
{
  "mcpServers": {
    "wechat_rpa": {
      "url": "http://127.0.0.1:52737/mcp",
      "headers": {
        "Authorization": "Bearer <配对Token>"
      }
    }
  }
}
```

服务只面向本机回环地址。运行在云端、容器或其他电脑上的 Agent，其 `127.0.0.1` 不代表这台 Mac，不能照抄地址连接。当前文档没有配置远程转发。

## 底层 API 能力与后续扩展范围

以下是此前从 RPA HTTP schema 和 YoBot 客户端梳理的能力，不是当前 MCP 工具清单。除上面 7 个工具外，其余功能需新增兼容工具映射并验证后，外部 Agent 才能通过当前 MCP 使用。HTTP 路由存在也不代表相应业务在这台 Mac 已通过验收。

| 能力 | 可以做的事 | 当前证据与限制 |
|---|---|---|
| 微信账号与状态 | 查看实例、识别发送账号、初始化连接、诊断功能状态 | 有实例、初始化、backend_status、features_status 接口；多号操作应显式指定账号 |
| 发文字 | 给指定好友或群发消息 | `POST /api/chat/send_message`；收件人用准确名称，与发送账号分开 |
| 发文件 | 向好友或群发送图片、视频、文档等文件 | `POST /api/agent/chat/send_file`；文件路径属于运行 RPA 的本机 |
| 聊天记录 | 读取已保存会话与历史；供 Agent 总结、提取待办 | 有 history_sessions、history_messages 接口；只覆盖已经采集保存的数据，不保证完整微信历史 |
| 当前窗口消息 | 查看某个聊天窗口当前可见的最近消息 | `GET /api/chat/messages/{session_name}`；客户端注明约最后 5 条，不是全天消息流 |
| 通讯录和群 | 查询已同步好友、群、标签，触发重新同步 | contacts、contacts/groups、contact/sync；好友与群是不同数据源；同步慢且会操作微信 |
| 群与标签管理 | 群标签设置、邀请进群 | OpenAPI 有 groups/set-tag、invite-to-group；需要业务实测 |
| 批量推送 | 按对象/标签创建群发，查看进度，暂停、恢复、取消 | agent/mass_sending 与 tasks/mass-sending 系列；任务受理不代表全部送达 |
| 朋友圈发布 | 发布内容和素材，创建发布计划、取消任务、查看日志 | post_moment、moment-material、moment/post-task；多账号及素材格式需按运行版本校验 |
| 朋友圈互动 | 开关自动评论，查看互动记录 | moment/toggle-auto-comment、moment/interactions；具体行为受配置和模型服务影响 |
| 加好友流程 | 导入名单、查看剩余名单与日志、控制自动加人/好友申请任务 | friend/import 等；导入名单不等于已添加，CSV/XLSX 必填表头为 `微信号/手机号` |
| 自动回复 | 配置并启停消息监控/自动回复，处理人工审核或暂停会话 | multi-monitor/start、monitor/stop、manual-review 等；持续执行依赖 RPA 和所配置的模型/Agent 服务 |
| 自动跟进 | 创建、查询、暂停、恢复、取消跟进任务 | tasks/auto-follow 系列；具体策略和执行结果需验证 |
| 配置及任务诊断 | 查看任务、运行状态，读写特定配置 | config/{config_type}、agent/tasks；修改配置先读再改，避免覆盖未提供字段 |

“总结群聊、整理客户待办、生成回复草稿”由外部 Agent 对读取结果进行推理，RPA 负责读取和执行。接入 MCP 不会自动让 Codex 24 小时监听微信；持续监听、定时唤醒和自动回复需要单独启用相应流程。

### 不应直接承诺的能力

- **真正的微信语音气泡、声音克隆**：YoBot 客户端有相关调用代码，但本机当前 OpenAPI 没有 `/api/agent/chat/send_voice` 或 `/api/agent/voice/voices`。旧客户端还注明微信版本及 VB-Cable 前提，不能据此宣称当前 Mac 可用。
- **任意微信历史全文读取**：本地采集记录及当前窗口消息都有覆盖边界。
- **所有 YoBot 技能对外可用**：当前 MCP 控制实现固定面向微信 RPA，不代表 shell、浏览器、知识库或其他内部技能也开放。
- **完全独立于 YoBot 的后台运行**：当前恢复版仍由宿主管理 RPA 生命周期；外部 Agent 调用与独立部署是两回事。
- **94 个 API 等于 94 个 MCP 工具**：API 包含管理、许可等接口，且一个路径可有多种方法，数量不能互换。

## 给 Agent 的使用约定

可以把以下说明随接入文档提供给 Codex：

> 当前服务开放状态、好友列表、群列表、通讯录同步、历史会话、历史消息和文字发送。先用 wechat_status 获取真实账号；失败时报告实际错误，不编造账号。列表来自本地缓存，不能称为完整实时通讯录。同步仅在用户要求时执行，且不要与其他桌面操作并发。历史消息不保证覆盖完整微信历史；发送只在用户明确要求时进行，准确指定发送账号与收件人。超时后先核实结果，不自动重发。

YoBot 内部工具有额外逻辑，例如群发预览确认、发送去重、账号检查和历史批量读取；原生 MCP 不一定复用这一层，需从工具 schema 和实测判断。原始 HTTP 成功码也不等于业务成功：初始化等接口可能 HTTP 200 但返回失败，应检查业务字段及最终任务状态。

## HTTP API 与 MCP 的区别

```text
Codex / 其他本机 Agent
    └─ MCP + 配对 Token → 本机兼容服务 /mcp（动态端口）
                              └─ 宿主受信任通道 → RPA HTTP API → 微信

YoBot 宿主
    ├─ 管理 RPA 的启动、运行租约和恢复
    └─ 通过受信任控制通道启停 MCP、获取配对信息
```

对外 MCP 用 `Authorization: Bearer <配对Token>`；内部业务 HTTP 用 `X-API-Key`，macOS 宿主管理模式下该密钥通过可信进程通信传递。两者不是同一凭据。不要使用代码中的兼容默认值 `yoko_test` 作为当前 Mac 的接入方案，也不需要提取宿主内存中的运行时密钥。

原来的宿主代码以 RPA 原生 MCP 为目标；本次修复实际运行的是 `recovery-mcp.js` 提供的兼容服务。状态接口仍可能显示 mode=`native-rpa`，判断实际实现应结合 profile=`local-compat` 和服务身份。3000 的 `/api/mcp-gateway/status` 是管理接口，不是供 Codex 填写的 MCP URL。兼容服务只接收 POST，GET 返回 405 不代表握手失败；不要与修复前“控制接口 POST 返回 405”混淆。

## 接入后的验收与排错

1. 对外页面为「运行中」，状态为 ready，Token 非空。
2. Codex MCP 初始化成功，能发现工具列表；记录 toolsetVersion、toolCount 与 capabilities（如果服务提供）。
3. 调用只读状态/账号工具成功，再核对聊天与联系人读取范围。
4. 用户要求同步时再验收通讯录同步；发送工具已通过模拟转发测试，真实发送仅在用户指定收件人和内容后验收。

| 现象 | 处理 |
|---|---|
| off / Token 为空 | 对外开放未开启，先在页面启用 |
| connecting | 等待 RPA 启动和后台协调，检查微信登录、权限与窗口可访问性 |
| update-required | 宿主检测到控制接口不兼容；需要匹配支持原生 MCP 的 RPA 组件 |
| HTTP 200 却返回 HTML | 命中了前端页面回退，不是成功的 MCP 握手 |
| 401 / 403 | 检查是否混用了内部 API Key、Token 是否已重新生成、Codex 是否继承环境变量 |
| 能发现工具但状态返回 ACCESSIBILITY_PERMISSION_REQUIRED | 核对正式 Helper 的辅助功能权限，修复后重试状态工具 |
| 重启后连接失败 | 兼容服务端口和 Token 可能均已改变，重新复制页面信息 |
| 工具 isError=false 但正文有失败字段 | 兼容层主要检查传输状态，仍须解析正文的业务结果 |
| 写操作超时 | 查询任务或发送记录后再决定是否重试，避免重复发送 |

## 证据与接口附录

- [实际 MCP 工具 schema 快照](rpa-mcp-tools-2026-09-20.json)
- [本次握手与调用验证记录](../analysis/mcp-documentation-verification.json)：不含 Token 或联系人数据。
- `standalone/app/recovery-mcp.js`：当前 7 个工具、动态端口、Token、HTTP 转发与错误处理。

- [当前 HTTP 接口索引](RPA-HTTP接口索引.md)
- [当前 OpenAPI 快照](rpa-openapi-2026-09-20.json)：请求/响应 schema 的机器可读依据，无运行密钥。
- `standalone/app/dist/electron/skills/mcp/server/index.js`：原生 MCP 控制、状态字段、重试及旧网关停用说明。
- `standalone/app/dist/electron/channels/websocket.js`：对外开放状态与开关管理接口。
- `standalone/app/dist/ui/assets/index-y6HZ4z8k.js`：「对外开放」页面、通用 JSON 与 Bearer 配对方式。
- `standalone/app/dist/electron/skills/wechat_rpa/api_client.js`：业务 HTTP 请求及字段。
- `standalone/app/dist/electron/skills/wechat_rpa/index.js`：YoBot 内部工具说明与使用边界。
- `standalone/app/dist/electron/utils/rpa_port.js`：端口发现与内部运行时凭据机制。
- [恢复版运行说明](../standalone/README.md)

本次更新完成 MCP 初始化、工具发现和只读状态调用；未读取好友/群明细、触发同步、修改 Codex 配置或更改运行组件。

## 新增聊天与发送工具（toolsetVersion 2）

新增参数示例：

```json
{"name":"wechat_list_history_sessions","arguments":{}}
{"name":"wechat_get_history_messages","arguments":{"account_id":"<账号ID>","session_id":"<索引返回的会话ID>"}}
{"name":"wechat_send_message","arguments":{"account_id":"<发送账号ID>","user":"<准确好友或群名>","message":"要发送的文字"}}
```

先列会话，再按真实 session_id 查询；这里只返回已采集保存的记录，不会自动翻页抓取全部微信历史。当前没有时间筛选或分页参数，不要自行传入。发送正文上限 10000 字符，收件人名称上限 256 字符，均不能全为空白。外部 account_id 会映射为 Mac 后端的 accountId；不会自动重试发送。应同时检查 MCP isError 和正文业务结果。

测试覆盖：鉴权、工具发现、历史路径编码、非法路径与参数拒绝、发送账号字段映射、HTTP 200 业务失败传播、单次发送不重试。所有发送测试使用模拟后端。

### 扩展后运行验收

已重新打包、通过签名检查并启动新版本。实际状态 ready，toolsetVersion=2，MCP 握手和 tools/list 成功，发现全部 7 个工具。最新运行端口为 57040（仍应以页面当前地址为准）。

实际调用历史会话索引时，底层 RPA 返回 HTTP 500 / Internal Server Error；再次调用状态工具返回 ACCESSIBILITY_PERMISSION_REQUIRED。因此工具已开放，但本机历史查询尚未完成成功验收；需先恢复正式 Helper 的辅助功能权限，再复测历史接口，不能仅凭权限错误断定 500 的全部原因。发送功能仅做模拟验证，未发送真实消息。

见 [扩展后运行验证](../analysis/mcp-chat-extension-verification.json)。
