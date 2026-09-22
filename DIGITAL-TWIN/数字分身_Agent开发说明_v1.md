<!-- 归档于 2026-09-22，来自本机原始材料。
     已脱敏真实账号标识（见 DIGITAL-TWIN/README.md 的脱敏说明）。 -->

# 数字分身｜本地微信接入评估与 Agent 开发说明

版本：1.0  
编写日期：2026-09-21  
交付性质：**基于所提供文档与 v4 原型的接入设计，不是用户电脑上的联调报告。**  
目标执行者：在用户本人 macOS 上、经用户授权工作的开发 Agent。  
首版形态：**本机浏览器 + 自建本地后端 + 只读数据适配器 + 本地数据库；模型能力可选且默认不外发。**

阅读顺序：0–5 节确定可行性与阻塞；6–9 节实现接入和数据契约；10–14 节实现业务与 API；15–19 节安排工程和验收。

---

## 0. 必须先读的结论

### 0.1 能做什么，不能直接承诺什么

**结论：能够开展开发，但尚不能判定数据已足够支撑五个页面的全部真实业务功能。**

需要分开看四层：

| 层次 | 评估结论 | 条件或限制 |
|---|---|---|
| v4 界面与操作 | 可继续开发 | 保留五个页面、视觉布局、日期切换和审阅交互；把演示数据替换成自建 API |
| 本地数据接入 | 有可用路径 | A 通道提供 7 个 MCP 工具；C 通道提供本地文件和 SQLite。实际调用与返回字段须在本机验证 |
| 真实聊天分析 | **有条件可做，当前数据准备不足** | 文档记录时没有聊天落盘目录；客户事件流全是同步失败；好友表为空。先通过 P0/P1 数据验收 |
| 公网真实数据版 | **不在当前许可范围内** | 接入文档禁止数据外发与端口映射，MCP 拒绝浏览器 Origin。公网只保留虚构演示版 |

依据：[S1 §1、§2、§4、§6、§7]。文档中的“实测”属于文档作者的本机验证，本说明未重新执行这些验证。数量与状态均是 **2026-09-21 文档快照**，不是对用户电脑此刻状态的声明。

### 0.2 当前的真实数据下限

按文档快照：

- `chat_history/<account_id>/` 目录不存在。不能据此承诺能读取某日完整聊天，也不能进一步推断 MCP 索引实际会返回怎样的 JSON。
- `customer_events_v1` 存在 18 条事件，全部为 `contact.sync.failed`，`result.status=failed`。这些是**采集运行事件**，不是聊天消息或客户业务事件。
- `wechat_contacts.db` 已存在，`friends=0`、`groups=97`。可先做群聊目录与数据源状态；不能把 97 个群当成 97 位客户。
- 头像不可得；不存在已验证的实时消息流；聊天只覆盖已被机会式采集的部分；不读取完整微信历史。

依据：[S1 §1、§4.1、§4.2、§6、§7]。

### 0.3 Agent 的执行顺序

**先诊断、再固定数据契约、再接前端、最后做分析。**

数据未就绪时，仍可完成应用骨架、空状态、只读诊断、人工记忆及任务管理，但不得用虚构数据冒充真实日报。不要把“工具存在”当成“真实消息已经存在”。

---

## 1. 来源与证据标记

### 1.1 本说明使用的输入

| 编号 | 文件或来源 | 用途 |
|---|---|---|
| S1 | `source/微信数据对外接入文档.md` | 上游能力、路径、协议、已验证状态与禁止事项的唯一依据 |
| S2 | `reference/digital_twin_prototype_v4.html` | 最新视觉与交互参考；内置人物、聊天、画像、排名全部是演示 |
| S3 | `reference/digital_twin_prototype_v3.html` | 只读保留的旧版本，供对照，不覆盖 |
| S4 | 本次产品讨论 | 产品名“数字分身”；五个页面；我的记忆含九维 Wiki；本地数据分析；保留旧版本 |

本文的 `[S1 §x]` 对应源文档章节；完整定位见 `source_map.md`。代码文件用函数或符号定位，便于 Agent 搜索。

### 1.2 三种信息必须分开

**源文档事实**：用 `[S1 …]` 标注。  
**本项目设计**：本文给出的表、状态、应用 API、调度、目录和测试；这些不是 YoBot 已提供的接口。  
**待本机验证**：输入 schema、返回字段、可用消息、身份映射、时间字段、增量语义、端到端延迟；未知就记录未知，不补猜测。

本说明没有引入外部产品资料来扩大 S1 的能力边界，也没有替 S1 修正未验证接口。

---

## 2. 固定产品范围与界面

### 2.1 保持五个一级页面

| 页面 | 子内容 | 延续 v4 的展示方式 |
|---|---|---|
| 今日 | 重点动作、我的承诺、待我响应、优化建议、已处理、历史日报 | 轻量摘要块 + 双列行动面板 |
| 对话洞察 | 重要对话、重复问题/共性主题、新话题与异常信号 | 分组对话 + 主题聚合 + 信号条目 |
| 人物关系 | 重点人物、最近有进展的人、高频互动人物、关系提醒 | 分组人物卡、表格、关注星标 |
| 事件时间线 | 时间流、按人物、按主题、里程碑 | 前一天/后一天/日期选择、分组轴、主题泳道 |
| 我的记忆 | 新增记忆、知识与技能、候选理解、待确认更新、九维 Wiki | 九维索引 + 审阅流 + 条目详情 |

不得恢复占据首屏的大标题和副标题 Hero 区。继续使用白底、轻边框、黑色选中状态、少量紫色链接、紧凑顶栏、详情抽屉和手机端单列布局。

### 2.2 保护已有版本

新建 `digital-twin-local` 工程或独立分支。`reference/` 中 v3、v4 都只读保存；不覆盖用户现有文件，不自动修改已经发布的公网演示站。

真实版与演示版使用不同的数据存储及运行模式。真实模式数据源异常时必须报错或显示旧数据状态，不得回退到 `DATA` 中的虚构人物和聊天。

### 2.3 首版不做

自动发消息、群发、发圈、加好友、自动通讯录同步、自动改 RPA 配置、群内真实 @、头像采集、完整历史回填、实时消息监控、云端真实数据同步。

微信写操作不因界面上有“确认”按钮就自然获得授权。本次只开放本应用内部的任务、备注、记忆、草稿与偏好写入。

---

## 3. 五个页面的数据可实现性

| 页面/能力 | 所需原料 | S1 能提供的基础 | 判断与前端降级 |
|---|---|---|---|
| 数据与设置 | 实例、账号、联系人快照、运行事件 | `wechat_status`；SQLite；JSONL | 优先实现。工具返回格式先验证；运行事件单独展示 |
| 今日重点动作 | 有主体、有时间、有原文的业务事件与待办 | 已保存聊天；人工事项 | 有消息后可分析。无消息时只显示人工待办和数据状态，不虚构 Top 3 |
| 我的承诺 | 我方明确承诺、对象、约定时间 | 历史消息工具，字段未知 | 需要识别我方发言。没有方向信息不能生成“我的”承诺 |
| 待我响应 | 对方问题、后续回答、数据连续性 | 机会式历史 | 只可输出“已采集片段中未见闭环，待核对”，不能肯定“没有回复” |
| 优化建议 | 可追溯反馈、多个独立场景 | 历史消息 + 自建分析 | 单案例标单案例；不凑数、不把同步失败当产品反馈 |
| 重要对话 | 消息内容、上下文、说话者、时间 | 历史工具仅承诺返回已保存内容 | P1 通过后可实现；缺失附件不补写，原文可追溯 |
| 重复问题 | 可比较的主题、唯一消息与人物/会话标识 | 不提供现成主题分类 | 需自建聚合与去重；主体不明时人数为未知而不是猜测 |
| 人物档案 | wxid/稳定 ID、别名、备注、关联会话 | 好友表有字段，当前 0 行；群表有 97 行 | 可做目录与人工补充；消息联系人需可靠映射后才合并 |
| 高频互动 | 范围内去重消息、可靠双方/群成员标识 | 部分聊天；无完整总量 | 标“已采集消息/片段排行”，不等于真实完整互动量、关系亲疏或耗时 |
| 高意向机会 | 明确需求、产品/业务配置、采购推进证据 | 上游没有 CRM 结论 | 本应用计算与审核。S/A/B 属于机会，不给整个人永久评级 |
| 时间线 | 事件发生时间、人物、来源 | JSONL 有运行事件时间；消息时间字段待验 | **业务时间线只用真实业务来源**；18 条失败事件只进诊断页 |
| 知识/技能 | 原文、人工材料、可复用步骤及验证 | 不是上游现成能力 | 本应用提炼；模型未配置时允许人工收录，不伪称自动提炼成功 |
| 九维 Wiki | 本人事实/观点、证据、修订、确认 | 上游没有九维 schema 或审核接口 | 自建；聊天自动候选依赖 P1；人工条目可以先用 |
| 头像 | 头像文件或可访问 URL | S1 明确不可得 | 使用本地文字占位头像，不猜 URL、不读取未授权缓存 |
| 实时刷新 | 连续消息源/推送 | S1 明确无实时流 | 定时检查已保存数据；“刷新”不等于“补齐微信” |

以上能力判断来自 [S1 §2.4、§4、§6、§7]；业务处理和 UI 降级均为本项目设计。

---

## 4. 部署边界：本地真实版与公网演示版分离

### 4.1 首版架构（新增设计）

```text
本机浏览器
   │ 只访问本应用的同源接口；不接触 MCP 凭据
   ▼
自建本地应用服务（仅监听 127.0.0.1:<APP_PORT>）
   ├── 服务 v4 改造后的前端静态文件
   ├── /dt-api/v1/...（本项目自行实现）
   ├── 本应用会话鉴权、CSRF/Origin/Host 检查
   ├── 应用数据库：人物、消息、证据、事项、记忆、报告
   ├── 只读 MCP 适配器
   │       └── 127.0.0.1:<App 对外页显示的随机端口>/mcp
   │                  └── YoBot 代理 RPA（不由本应用直连 9922）
   ├── 只读文件适配器
   │       ├── wechat_contacts.db
   │       └── customer_events_v1（仅用于运行诊断）
   └── 本地分析器（可选）/ 人工确认 / 本应用自己的定时任务

公网静态站
   └── 仅虚构演示数据；不连接上述本地服务，不装入真实聊天/凭据
```

`APP_PORT` 是本应用自行配置的端口，不等于 YoBot MCP 端口，也不默认复用 9922 或文档中已出现的 3000。端口冲突时提示选择空闲端口，不结束其他进程。

### 4.2 为何不能从网页直连上游

S1 的 MCP 只接受 `127.0.0.1:<port>` Host，存在 `Origin` 即 403，只接受 `POST /mcp`，且 token 为进程内随机值、重启后会变。[S1 §2.2、§2.3]

处理方式是：浏览器访问**本应用同源 API**，本应用后端再独立发起 MCP 请求。不要移除上游的 Origin 防护，不实现任意工具转发代理，不开放 `Access-Control-Allow-Origin: *`。

公网静态站不能靠给 HTML 增加一个本地地址就成为正式真实版。本说明不安排端口转发、公网隧道、云端拉取本地文件或自动上传摘要。**衍生摘要、向量、提示词和日志也不应被当成“不是原始聊天所以可随意外发”。**

### 4.3 模型与开发 Agent 的数据边界

S1 §7 的“不做数据外发”作为本工程默认限制执行。第一版可没有模型；需要模型时，仅启用经用户确认的本地推理端点，关闭外部遥测。不要因提供商配置方便而默认发送到云模型。

开发 Agent 先阅读文档、schema 和脱敏 fixture。真实 token 只交给本机受控进程，不粘贴到 Agent 对话、提示词或云端 trace。开发工具本身会把上下文发往远端时，不得让它直接读取真实聊天；联调应在用户批准的本地执行环境里进行，回传脱敏状态与结构，不回传原话。

---

## 5. P0：先在本机生成能力探测报告

### 5.1 探测目标

输出 `capability_report.local.json` 和一份不含秘密的可读摘要，记录：环境是否可达、允许读取的账号、工具实际 inputSchema、各来源是否存在、消息结构是否已验证、可支持的功能和阻塞原因。

交付包中的 `fixtures/readiness.document_snapshot.json` **只代表文档快照**，不得当作探测成功结果。

### 5.2 探测步骤与停止条件

1. 由用户在 App「对外开放」页面打开网关；在本机配置流程提供**当次显示**的 endpoint 和 token。不要猜端口，不从受保护密钥文件里搜取凭据。
2. 连接 `initialize`，保存协商出的协议版本和 `serverInfo`，检查协议级 error。
3. 调用 `tools/list`，保存脱敏后的工具名与 `inputSchema`。比较本说明的只读白名单；未知工具一律不启用。
4. 按实际 schema 调 `wechat_status` 和 `wechat_list_history_sessions`。若发现多个账号，先要求用户选择允许读取的账号；不默认“第一个”。
5. 只对索引中确实返回、且属于已批准账号的 `(account_id, session_id)` 调 `wechat_get_history_messages`。如索引无法可靠分配账号，停止该项导入。
6. 根据实际 schema 读取联系人、群；或选择 C 通道只读 SQLite 快照。分别记录空结果、失败和未验证，不把三者混为零。
7. 检查允许路径是否存在；只读 JSONL 的 meta、account、schema 和事件。将 `contact.sync.failed` 列为采集诊断，不作为消息导入。
8. 在本地得到历史会话和消息响应的脱敏结构 fixture，填写 `field_mapping.md`；原始诊断资料只留本机，不进入仓库。
9. 生成逐功能就绪状态。如果没有消息，状态标 `MESSAGES_NOT_READY`；不要触发发送、通讯录同步或 RPA 配置修改来“自动修好”。

### 5.3 文档中的三处接入细节必须显式核实

| 差异/疑点 | 原文位置 | 实施规则 |
|---|---|---|
| §5 写每个工具都传 account_id，但 §2.4 与示例对 status/session index 写无入参 | S1 §2.4、§5、§8.1 | **以当次 tools/list.inputSchema 为准**。无参数工具不擅自加 account_id；全局结果在后端按允许账号过滤 |
| config.json 的参考端口为 9922，但真实对外端口随机 | S1 §2.2 | 使用 UI 当次 endpoint，不按配置默认值直连 |
| requestTimeout=400s，但通讯录同步可能达 3660s | S1 §2.3 | 不据此承诺长任务同步成功；本期禁止自动调用通讯录同步，另行人工验证 |

还有三项不能从文档推断：history 的返回字段与分页机制、消息的稳定 ID 与发送者/方向字段、媒体附件的可解析程度。没有实际 fixture 前，相关 mapper 不得标为完成。

### 5.4 P1：聊天输入的最低门槛

必须至少有一个已批准账号的已保存会话，能明确映射：**会话归属、原始正文或消息类型、发生时间或其缺失状态、说话者/方向或其未知状态、稳定证据定位**。

一个有效会话足以验证接入闭环，但**不代表足以生成全天日报**。分别开放能力：

- 有正文和来源：可展示片段与人工标注。
- 另有可靠时间：可进入对应日期的时间线与范围统计。
- 另有我方/对方判定：可提取双方问题与承诺候选。
- 有跨会话可验证身份：才可做独立人物统计和跨对话聚合。
- 有足量相关样本与配置：才可生成有依据的洞察与机会建议；不以固定消息条数代替质量判断。

若聊天落盘尚未产生，请用户在已有 App 的支持流程中配置采集并产生少量双方测试消息；**S1 未给出已验证的外部采集启动 API**，不得通过 B 通道或修改目录来自动启动。

---

## 6. 通道 A：只读 MCP Adapter

### 6.1 使用范围

上游暴露 7 个工具，但本应用首版只使用 5 个只读工具：[S1 §2.4]

| 工具 | 文档入参 | 本应用使用规则 |
|---|---|---|
| `wechat_status` | — | 按 runtime schema；仅状态，不执行切号/重连 |
| `wechat_list_history_sessions` | — | 取已采集会话索引；不等于微信所有会话 |
| `wechat_get_history_messages` | account_id, session_id | 二者必须来自已验证索引与允许账号 |
| `wechat_list_contacts` | account_id | 读取已同步好友；空列表不等于没有好友 |
| `wechat_list_groups` | account_id | 读取已同步群；不推断群成员或群内说话者 |
| `wechat_sync_contacts` | account_id, type | **禁止自动调用**；会操作桌面微信 |
| `wechat_send_message` | account_id, user, message | **本期不接入**；不可撤销，不自动重发 |

必须在服务层使用固定 allowlist 校验，不以界面隐藏按钮代替。拒绝模型或浏览器输入任意 `tool_name` 的通用执行 API。

### 6.2 传输约束

按 S1 §2.3 实现：

- 请求仅 `POST /mcp`；JSON 响应，非 SSE；不要发 GET 流连接或 JSON-RPC 数组批量请求。
- `Content-Type: application/json`；Authorization 为本机进程读取的 Bearer。
- MCP 请求不携带浏览器 Origin，不转发浏览器 headers。
- Host 与当次 `127.0.0.1:<port>` 相符。endpoint 限定为该回环地址、合法端口和 `/mcp` 路径；拒绝外域、userinfo、重定向目标及任意路径。
- 客户端禁用自动重定向和环境代理转发，防止 Authorization 被送到非本机。禁止在 exception、请求 trace 或 dump 中打印 headers/token。
- 单请求体不超过文档的 64 KB；此限制是**请求**限制，不能当成消息响应体长度承诺。
- `initialize` 请求示例使用 `2025-06-18`，示例响应为 `2025-03-26`。保存实际协商结果，不强行假定两者一致。
- 无 id 通知按文档可能返回 202 空 body，不能对空 body 强行 `json.loads`。带 id 请求须匹配响应 id。
- 客户端读超时为自建可配置项。默认短探测、较长历史读取；不得把文档服务端 400s 当成正常性能指标。

本期不强制选用特定 MCP SDK；选用的客户端必须经过此本机“POST + JSON、无 GET/SSE”实现的兼容性测试。S1 不能证明任意 SDK 的默认设置都兼容。

### 6.3 解包与错误层次

```text
HTTP 状态 / 网络错误
  → JSON-RPC 顶层 error 与 id
    → result.isError
      → content[] 中 type=text 的原始后端 JSON 文本
        → 已验证的工具响应适配器
          → 本应用标准数据模型
```

禁止只检查 HTTP 200。`result.isError=true` 时业务失败原样分类，但向 UI 输出脱敏错误。S1 说明该标识综合后端状态与业务失败。[S1 §2.5]

**不要预写猜测的 `result.messages`、`messageId`、`senderName`、`create_time` 路径。**真实结构须用 P0 的 fixture 建立字段映射。多个 text content、非 JSON text、缺字段、未知版本要有明确失败或降级逻辑，不把异常数组当空聊天。

### 6.4 重连与重试

| 情况 | 本应用行为 |
|---|---|
| 401 | 标记 `REAUTH_REQUIRED`，暂停轮询，提示回 App 获取新 token；不刷屏重试 |
| endpoint 拒绝连接 | 标记连接失效；保留已导入数据，提示检查 App 与新 endpoint |
| 403 | 排查本应用 Host/Origin 请求构造，不关闭上游防护 |
| 404/405 | 提示路径或传输模式不兼容；不自动切换直连 9922 |
| 413/415 | 修正请求格式，不能截断原始消息来掩盖问题 |
| JSON-RPC -32602 | 重新检查 runtime schema，不试探未声明参数 |
| 工具 `isError` | 记录脱敏错误代码和失败任务，不更新“同步成功”时间 |
| 只读调用超时 | 有上限的退避重试、单会话串行；保持上次成功数据并标记过期 |
| 任何写调用超时 | 本期不可能发生；未来也不得自动重发发送工具 |

---

## 7. 通道 C：本地文件 Adapter

### 7.1 SQLite 联系人快照

允许读取：`~/Library/Application Support/YokoWebot/data/wechat_contacts.db`。

只读打开；不执行写 SQL、schema migration、VACUUM、journal 模式修改或源库修复。写入只发生在本应用自己的数据库。不要同时把 MCP 与 SQLite 的同一批联系人作为两套独立人物统计。

字段依据：[S1 §4.2]

- friends：`account_id, wxid, name, nickname, remark, tag, is_new, created_at, last_updated` 等。
- 源表唯一约束为 `(account_id, wxid, tag)`，同一个好友可能因 tag 形成多行。应用人物按安装实例 + account_id + wxid 识别，tag 聚合；不按数据库自增 id 或名称跨账号合并。
- groups：`account_id, name, tag, last_updated`，唯一约束 `(account_id, name)`，**没有持久的 group wxid**。
- 群目录可以以源记录形成暂定实体，但标记 `identity_quality=name_only`。群改名不自动合并历史，也不以同名认定跨账号同一群。
- `is_new` 保留源语义，不等于“今天新增好友”；`last_updated` 是同步记录时间，不等于最近聊天时间。
- 好友名/群名到 `session_id` 的连接需要验证，不假设两者相同。

空联系人/会话结果不自动视为删除：除非有已验证的完整快照或删除语义，否则不删除本应用已有档案，不把索引缺失写成“已删好友”。

读取源库失败时，保留应用内上次快照并标记 stale。文件复制若用于调试，必须保证一致快照，不把复制主 db 文件的结果无条件当成完整数据；不能借机写源库。[本项目设计]

### 7.2 JSONL 客户事件流

路径、字段与轮转以 S1 §4.1 为准。读取 `meta.json` 与两份 JSON Schema，保留未知字段；`additionalProperties: true`，不能遇到新键就丢整行。

按 `(installation_id, event_id)` 去重；S1 称 event_id 全局唯一。仍在本应用中附加安装实例以隔离不同来源环境。

读取检查点至少含：账号映射、路径、文件身份/代次、字节偏移、最后完整行、最近成功时间。处理按天多分片、文件轮转、追加到一半的最后一行、截断/重建、坏行和重启。检查点与已导入记录提交保持一致；重放同一 event_id 不增加计数。不能只记录“上次读到哪个日期”。

- `contact.sync.failed` → `connector_events`，诊断分类。
- 未来未知 event_type → 本地保留为未知诊断事件，等待 schema 与业务含义确认。
- 不因为字段中出现 `message`、`subject` 或 `customer` 就转成聊天内容。
- 文档没有已验证的消息事件类型。**不得在代码里假设 `message.received` 或 `chat.message` 已存在。**

meta 的 `legacy_data_included=false` 与事件扩展 `pre_v1_data_included=false` 要保留为历史范围提示，不承诺建立事件流前的历史自动回填。[S1 §4.1]

### 7.3 首版不读取的其他目录

`scheduler_v3.db`、`tasks.json` 是上游自动化调度，不能当作“我的客户跟进任务”库。`sessions/context-projections/memory-db` 只是 S1 提到存在的目录，没有导出 schema；不能作为九维 Wiki 的现成接口。运行日志仅在用户明确授权诊断时按最小范围读取。

`protected/agent-secrets.v1.json` 永不读取、上传或打包。不得修改 RPA 目录、终止进程来尝试修复。[S1 §1、§4.3、§7]

---

## 8. 标准数据模型：全部为本应用新增

### 8.1 总原则

原始来源、标准化事实、AI 候选、本人确认和执行结果分别存储。每条衍生结论能够追到证据；证据引用包含账号范围，不能跨账号误引用。

**以下字段不是上游已经提供的字段。**Agent 须在 P0 把实际字段映射到它们；缺项设 null/unknown，并标注，不合成事实。

### 8.2 最小实体

| 实体/表（建议名） | 关键字段 | 规则 |
|---|---|---|
| source_installations | id, provider, binding_status | 隔离不同本机安装；不向前端返回 token |
| source_accounts | id, installation_id, source_account_id, account_key, display_name, status | 同一个 account_id 不跨安装默认合并；在线状态用于本次实例选择 |
| sync_runs | id, source, account_scope, status, started_at, ended_at, cursor, diagnostics | 区分无数据、失败、部分成功 |
| source_records | id, source_locator, source_schema_version, import_run_id, payload_hash, local_payload_ref | 原始内容只本地保存；前端只拿受控 evidence_id |
| people | id, account_id, source_person_id, display_name, aliases, tags, identity_quality | 昵称不做唯一键；未映射者是暂定联系人 |
| conversations | id, account_id, source_session_id, kind, related_person_id, identity_quality | kind=direct/group/unknown；群会话不等于群成员 |
| messages | id, account_id, conversation_id, source_message_id, occurred_at, recorded_at, imported_at, sender_id, direction, message_type, text, evidence_id, identity_quality | nullable 字段保留未知；direction=outbound/inbound/unknown |
| connector_events | id, source_event_id, account_id, event_type, occurred_at, result_status, sanitized_error | 只用于数据健康，不进入客户需求/业务里程碑 |
| business_events | id, account_id, conversation_id, person_id, kind, occurred_at, occurred_at_precision, summary, evidence_ids, verification_status | 从聊天/人工输入提取，不复用 connector event 分类 |
| opportunities | id, account_id, person_id, offering_id, stage, tier, evidence_ids, missing_fields | S/A/B 绑定具体机会；暂停/拒绝单独处理 |
| tasks | id, account_id, person_id, obligation_key, kind, status, verification_status, due_at, original_due_text, snoozed_until, evidence_ids, completion_source, version | 延后提醒不改原承诺；重复提取不覆盖人工状态 |
| insights | id, account_scope, kind, observation, value, recommendation, validation, evidence_ids, subject_count, sample_count | 人数不明设 null；统计与模型解释分开 |
| knowledge_items | id, kind, body, evidence_ids, validation_status, skill_contract | 知识/反馈/方法/技能分别标注 |
| memories | id, dimension, subject_type, current_confirmed_revision_id, review_revision_id | 同一条目按版本维护，九维是索引 |
| memory_revisions | id, memory_id, body, nature, scope, exceptions, evidence_ids, status, created_at, confirmed_at, allowed_use | 修改后新版本 pending；保留旧确认版本与历史 |
| report_snapshots | id, account_scope, report_date, timezone, revision, generated_at, data_cutoff_at, data_version, coverage, content | 固定快照；迟到数据生成修订版 |
| user_actions | id, action_id, actor, entity_id, expected_version, action, created_at | 本应用操作审计与幂等，不含秘密 |
| coverage_observations | account_scope, interval, source_kind, acquisition_mode, observed_count, first/last_observed_at, completeness, limitations | 不用采集片段跨度证明连续覆盖 |

### 8.3 消息与证据定位

`source_message_id` 若由上游提供且验证稳定，优先用于幂等。否则可使用本地原始快照的记录位置作为导入身份，保存内容指纹用于**候选重复检查**；不得单凭“时间 + 发送者 + 正文 hash”强制去重，因为同文同秒可能是两条真实消息。

针对每次全量返回的会话，P0 须验证排序、重复、追加、重排与同文消息行为。无法证明稳定对齐时，保留每次原始快照、记录 ambiguity，受影响的精确统计标为不可用；不要虚报连续增量能力。

证据的最小定位：安装实例 → account_id → source_session_id → 受控 source_record → 消息定位/原文跨度。摘录必须能在原始记录中精确找到；模型输出的“原话”不能只是意思相近。

附件若只有类型没有正文，保留 `message_type` 和 `content_status=unsupported`；不得生成附件摘要。说话者未知时不归给自己，群内作者不可识别时不建立猜测的人物。

### 8.4 时间与日期

区分消息发生时间 `occurred_at`、上游记录时间 `recorded_at`、本应用导入时间 `imported_at`、报告生成时间 `generated_at` 和约定时间 `due_at`。

JSONL 的示例明确含偏移并在 meta 写 `Asia/Shanghai`；消息的时间字段及格式仍待验证。对缺时区或相对时间保留原始字符串与解析依据，不默认为当前时间。

时间线按用户所选时区的 `[当天 00:00, 次日 00:00)` 查询，再转换为存储时间。前一天/后一天按日历日期切换；跨月、跨年、闰日要测试。日期选择与日报日期、当前操作视图相互独立。

没有可靠发生时间的记录放入“时间待确认”，不塞入今天；事件次日导入仍归发生日。v4 的 08:00–19:00 固定分布轴要改为覆盖全日或按实际数据确定范围，不遗漏夜间事件。

---

## 9. 覆盖度与可信状态：每个页面都必须显示

### 9.1 四组状态，不混成一个绿灯

| 状态组 | 本应用建议值 | 含义 |
|---|---|---|
| 连接 connection | unconfigured / ready / reauth_required / unreachable / error | 连接状态，不等于数据完整 |
| 数据 availability | unknown / unavailable / empty / available | 是否读取成功及是否有记录 |
| 完整性 completeness | unknown / none_observed / partial / complete | 已观测范围；当前机会式聊天最多 partial，完整性没有依据时 unknown |
| 新鲜度 freshness | fresh / stale / unknown | 相对本地采样刷新，不等于微信全量实时 |

`complete` 只有在未来出现可验证覆盖证明时才能启用，不能因一次读取成功就设置。UI 不能显示无依据的“覆盖率 100%”或“已同步全部”。

### 9.2 每个查询的公共元信息

所有业务 API 返回：账号范围、请求时间区间、时区、数据来源类型、观察记录数、可用性、完整性、最近成功检查时间、最近观测消息时间、分析水位、限制说明、data_version。

数值规则：

- `null`：未验证、不能计算或来源不可用。
- `0`：一次成功、范围明确的读取没有观测到记录，但依然不意味着现实中没有记录。
- 正整数：指定范围内已采集去重记录数量，不能冒充完整微信总量。
- 不同卡片引用同一事项时数量不可相加；不把两个过滤视图当两条独立待办。

### 9.3 统一空状态文案

| 场景 | 建议文案 |
|---|---|
| MCP 未配置 | “尚未连接本机数据源，请在本机完成连接配置。” |
| token 失效 | “本机授权已失效，请从 App 更新连接凭据。” |
| 无历史落盘 | “尚未读取到已保存聊天。当前无法生成基于聊天的简报。” |
| 已成功读到空日期 | “该日期未采集到记录，无法据此判断当天是否没有沟通。” |
| 同步失败 | “本次更新未完成，下面显示上次成功导入的数据。” |
| 只有部分片段 | “基于已采集的部分聊天，可能缺少其他会话或后续进展。” |
| 模型未配置 | “可查看事实、证据与人工记忆；自动洞察尚未启用。” |
| 人物方向未知 | “无法确认说话者，暂不生成我方承诺。” |

不得出现“18 位活跃客户”“97 位联系人”或“昨日 0 个有效咨询”的推断性占位，只因诊断里有 18 个失败或 97 个群。

---

## 10. 应用业务规则与分析输出

本节全部是新建逻辑，不是 MCP 返回结果。

### 10.1 今日与事项

明确我方承诺后形成 `commitment`；对方提问/要求形成 `response_request`。一条事项可以同时出现在重点与承诺视图，底层 obligation_key 相同。

因为聊天可能漏采，提取到问题且未见答复时默认 `verification_status=needs_check`。UI 写“记录中未见闭环”；不自动判定失约或客户流失。

优先级先考虑明确截止、已有承诺和阻碍，再考虑有依据的机会；排序结果带解释与证据。Top 3 最多三个，只有一个有效事项就显示一个。不要硬编码示例 ID 或每天凑齐三项。

状态至少区分 `needs_verification / open / in_progress / done / cancelled`，提醒延后存在独立 `snoozed_until`；`original_due_text` 和已确认 due_at 不随提醒延后改变。完成来源为本人确认或与该义务匹配的明确证据，不把任意后续回复当完成。

人工确认、取消、纠错和否定有最高优先级；重跑分析不能把已处理事项恢复为未处理，也不能不断复活已否定候选。新增冲突进入审核。

### 10.2 人物、机会与互动

人物可以是客户、同事、供应商、合作方或其他关系，默认未分类；分类来自本人设置或明确证据。不能只因有聊天就变成客户。

S/A/B 用于某个产品或服务的具体机会。S 需要明确需求匹配和实质推进证据，A 需要具体痛点但关键条件未确认，B 仅方向匹配；暂停、拒绝、已成交分开。询价/购买其他低价产品不独立触发高价机会升级。

没有配置当前业务/产品边界时，优先记录事实与待补信息，不盲目推荐产品、价格和交付承诺。

“最近一周打过交道”按所选日期区间内观测消息；“互动最多”只按可验证去重记录统计。好友表 last_updated 不作聊天时间。群数据不足时不统计个人排名；无消息时榜单不可用。

关系提醒由具体约定、问题、授权维护计划触发，不根据沉默推断关系变淡、心理状态或拒绝意图。

### 10.3 对话洞察与反馈

区分原话、事实、假设、建议。每条洞察带 observation/value/recommendation/validation/evidence_ids。

重复主题统计至少分：唯一消息数、会话数、独立人物数、独立组织数（仅可靠映射时）。同一人反复问一次问题，不能计作多个独立客户需求。相邻问题只可标共性线索，不能装作完全相同需求。

异常信号来自明确文本、冲突和日期，不做无依据的情绪/心理推断；政治内容不做人物评级或定向影响建议。

### 10.4 我的记忆与九维

九维：世界观、意识形态、知识体系、思维方式、价值体系、身份、履历、关系、资源。

- 身份、履历、关系、资源：可从可靠事实生成候选，人工核实后确认；资源记录归属、有效期和授权状态。
- 知识体系：已收录不等于已掌握；模型知识不等于本人知识。
- 思维方式、价值体系、世界观：保留情境、证据、例外和变化，单次行为不写成长期定论。
- 意识形态与其他敏感个人信念：只接受本人主动提供并明确确认，不从关系、转发、群聊自动推断，不用于政治个性化劝服。
- “希望成为”与“已经做到”分开；他人的发言、转述、假设、玩笑与系统自己的草稿不能作为本人事实。

记忆流程：候选 revision → 本人查看证据 → 修改/确认/否定。修改已确认条目时生成新 revision 并重新确认；旧版保留但不能把新未确认正文冒充已确认。严重否定旧结论时允许撤回旧确认版本，留审计。

默认问分身仅使用当前已确认、在有效期与授权范围内的条目。需要展示候选时明确标注，不把候选当作事实。确认理解不赋予对外发送权限。

### 10.5 知识与技能

技能不是精美话术摘要，至少包含：名称、适用条件、输入、步骤、输出、质量检查、边界、证据、验证状态。没有实际验证就保持候选。

模型输出必须通过 schema、证据引用、账号隔离、原话匹配、敏感字段与权限检查。失败输出隔离，不进入正式 UI 结论；允许“证据不足/无法判断”。

### 10.6 建议的结构化提取字段

```json
{
  "kind": "commitment_candidate",
  "account_ref": "<本应用账号ID>",
  "subject_ref": "<已验证人物ID或null>",
  "statement": "<提取结论>",
  "evidence_refs": ["<已存在的证据ID>"],
  "quote_spans": [{"evidence_ref": "<证据ID>", "quote": "<必须与原文精确一致>"}],
  "due_at": null,
  "due_text": null,
  "uncertainties": ["<缺失信息>"],
  "verification_status": "needs_check"
}
```

这是本应用模型输出示意，不是上游 schema。实际 contract 要对种类、可空字段和引用验证增加约束；不要把 model confidence 作为事实概率展示。

---

## 11. 更新节奏：定时检查已保存内容，而非实时采集

以下是**本项目可调的调度初值**，不是 S1 承诺的时效。

| 任务 | 建议触发 | 不得声称的能力 |
|---|---|---|
| 本地 UI 的任务/记忆操作 | 立即提交本应用数据库 | 不代表消息已发送或微信已改变 |
| 数据健康检查 | 前台打开时 + 每 60 秒轻量检查；失败退避 | 不不断触发昂贵 RPA 动作 |
| 已保存会话索引检查 | App 运行时约每 5 分钟，串行、可配置 | 5 分钟轮询不等于 5 分钟内收齐微信 |
| 消息读取 | 有验证过的变更提示才增量；否则有限速周期重读与可靠差分 | 未验证上游 cursor/since，就不能发送猜测的增量参数 |
| 聊天分析 | 仅新/更正的可用记录，每 15 分钟一批 | 没新数据不重复推理；不将漏采视为静默 |
| 日报快照 | 每日 08:00（默认时区 Asia/Shanghai，可配置） | 数据不完整仍写“不完整”；无消息只生成数据状态说明 |
| 知识/记忆候选整理 | 每日；长期条目可每周复核 | 不每天重写九维，不自动确认敏感内容 |
| 日期到期提醒 | 本应用独立调度 | 无需等新聊天；不调用上游黑名单 scheduler 工具 |

MCP 没有已验证推送/增量消息接口；默认不使用 WebSocket/SSE 从上游等消息。若自建后端向前端推送“数据已更新”，那只是**本应用刷新通知**，不能叫实时微信采集。

macOS 睡眠、离线、App 退出或 token 重置后，任务进入暂停/失败状态。恢复后补检查与补生成报告，记录实际生成时间，不假装准时运行或覆盖了离线期间消息。

同账号同步加互斥锁，避免重叠执行。服务重启从检查点恢复；手动“刷新页面”只读当前投影，“检查新数据”才排同步任务，“重新分析”只针对明确范围。

---

## 12. 自建 API 契约（不属于 YoBot）

### 12.1 前端只访问 `/dt-api/v1/`

下面所有路径、分页与版本字段都是本工程待实现的接口，不是文档已存在的 `/api/...`。不要把它们拼到 YoBot 的地址。

| 方法与路径 | 输入 | 输出/用途 |
|---|---|---|
| GET `/dt-api/v1/readiness` | 无 | 本地连接、数据与能力状态；不返回凭据 |
| GET `/dt-api/v1/accounts` | 无 | 已获读取授权的账号，在线与历史资料状态分开 |
| GET `/dt-api/v1/coverage` | account_ref, date/from/to, timezone | 观测范围、数量、缺口与证据限制 |
| POST `/dt-api/v1/sync-runs` | account_refs, scope, action_id | 202 + 本应用 job_id；只读检查，不触发通讯录同步 |
| GET `/dt-api/v1/sync-runs/{id}` | id | 排队/运行/成功/部分失败/失联；脱敏信息 |
| GET `/dt-api/v1/today` | account_ref, date, timezone | 当前行动与摘要；有 manual_only/partial 状态 |
| GET `/dt-api/v1/reports` | account_ref, date, revision? | 固定日报快照列表或选定版本 |
| GET `/dt-api/v1/insights` | account_ref, kind, from, to, cursor? | 重要对话、主题、信号，附证据和样本口径 |
| GET `/dt-api/v1/people` | account_ref, group, from, to, cursor? | 人物档案与可计算的统计 |
| GET `/dt-api/v1/people/{id}` | id | 人物详情、机会、事项、时间线和原文引用 |
| POST `/dt-api/v1/people/{id}/actions` | action_id, expected_version, action | 关注、备注、人工身份校正；仅本应用 |
| GET `/dt-api/v1/groups` | account_ref, cursor? | 群目录，标 name_only 身份质量 |
| GET `/dt-api/v1/timeline` | account_ref, date, timezone, view | 四视图共用事件；返回无时间记录数量 |
| GET `/dt-api/v1/evidence/{id}` | id | 权限范围内的原文、相邻已采集片段、缺口说明 |
| GET `/dt-api/v1/tasks` | account_ref, status, kind | 同一任务多个视图，避免复制 |
| POST `/dt-api/v1/tasks/{id}/actions` | action_id, expected_version, action, payload | mark_done/reopen/snooze/cancel/save_draft；幂等、冲突检查 |
| GET `/dt-api/v1/knowledge` | kind, status, cursor? | 知识与技能条目 |
| GET `/dt-api/v1/memories` | dimension, status, cursor? | 九维索引与待审列表 |
| GET `/dt-api/v1/memories/{id}` | id | 当前确认版、待审版、证据、历史与授权 |
| POST `/dt-api/v1/memories` | action_id, dimension, body, nature | 本人新增草稿；人工来源清晰 |
| POST `/dt-api/v1/memories/{id}/actions` | action_id, expected_version, action, payload | revise/confirm/reject/retract；指定 revision，不确认隐式最新版本 |
| GET `/dt-api/v1/search` | account_ref, query, scope, cursor? | 本地检索；默认不将否定条目当记忆答案 |
| POST `/dt-api/v1/ask` | account_ref, question, scope | 本地分析/检索回答；无模型时明确仅检索 |
| GET/PATCH `/dt-api/v1/preferences` | version + approved fields | UI 与自建调度偏好；无 RPA 配置写操作 |

应用分页 cursor 由本应用数据库生成，不代表上游支持分页。所有实体读取要验证账号归属；跨账号合并查询必须由 UI 明确选择并在响应中保留归属。

连接 token 的设置通过本机后端专用配置流程处理，**不提供通用 Web 表单回显 MCP token**。连接后的前端只拿连接状态。若采用桌面包装，也须有独立审批与安全存储实现，不能作为默认跳过凭据隔离的借口。

### 12.2 通用读取响应示例

```json
{
  "data": {"items": []},
  "meta": {
    "mode": "local_live",
    "account_refs": ["<本应用账号ID>"],
    "requested_interval": {
      "from": "2026-09-20T00:00:00+08:00",
      "to_exclusive": "2026-09-21T00:00:00+08:00",
      "timezone": "Asia/Shanghai"
    },
    "availability": "unavailable",
    "completeness": "unknown",
    "acquisition_mode": "opportunistic",
    "observed_message_count": null,
    "last_successful_check_at": null,
    "last_observed_message_at": null,
    "analysis_completed_at": null,
    "data_version": "0",
    "limitations": ["HISTORY_NOT_READY", "MESSAGE_SCHEMA_UNVERIFIED"]
  }
}
```

上例说明 API 格式，不是实际联调结果。`items=[]` 搭配 unavailable 不显示“当天没有消息”。实际调用错误返回适当 4xx/5xx 和脱敏 error envelope；可以在 UI 单独展示已缓存且明确标 stale 的旧结果。

### 12.3 写入与错误契约

所有内部状态写操作携带 `action_id` 和 `expected_version`；重复 action_id 返回第一次结果，版本不符返回 409，并展示差异供用户重新决定。

统一错误字段建议：`error.code / user_message / retryable / correlation_id`。不把带 token、完整路径、账号私密信息或原始聊天的栈输出到浏览器。

核心错误码：`REAUTH_REQUIRED`、`MCP_UNREACHABLE`、`MCP_PROTOCOL_ERROR`、`SCHEMA_UNVERIFIED`、`SOURCE_UNAVAILABLE`、`HISTORY_NOT_READY`、`IDENTITY_AMBIGUOUS`、`MODEL_NOT_CONFIGURED`、`SOURCE_RESULT_TOO_LARGE`、`VERSION_CONFLICT`、`ACTION_NOT_ALLOWED`。这些是本应用自建错误码，不冒充 YoBot 原生返回。

---

## 13. 从 v4 原型改造：具体替换点

S2 内部使用同步渲染、内置 DATA、浏览器 localStorage、预置回答。它是视觉与交互基线，不是生产数据层。

| v4 符号/实现 | 必须怎样改 |
|---|---|
| `const DATA`、`DATA.tasks.push(...)` | 移至独立 mock provider，仅 demo 模式加载；local_live 从应用 API 读 |
| `V4_DAY`、固定日期选项、09/19 字符串 | 改为后端/用户时区与查询日期；不把演示时间当现在 |
| `V4_TOP_IDS`、`V4_PROMISE_IDS`、`t.id==='t1'` 等分支 | 使用任务类型、截止、验证与排序字段；禁用示例人物 ID 驱动业务逻辑 |
| `metric('优化建议',3,...)`、`done/3` | 使用服务端实际总数和状态，空数据不凑三个 |
| `personSamples()` | 使用去重后的已观测消息查询，不把证据片段数当完整消息量 |
| `V4_THEMES`、`V4_IMPROVEMENTS` | 接真实洞察与候选库；证据必须存在且账号匹配 |
| `renderToday()` | 改为 loading/error/partial/empty/manual_only 状态可见的页面渲染 |
| `renderHistoryReport()` / `exportReport()` | 从独立报告快照读取；历史不受今日任务状态变化影响；导出附覆盖说明 |
| `renderTimeline()` | 保留日期切换和四视图；请求取消/序号防竞态；支持夜间、空日和未知时间 |
| 08:00–19:00 固定当日分布轴 | 改为全日或实际范围，避免真实夜间事件落在可视范围之外 |
| `avatar()` | 保留文字占位；不要为了真实头像新增不被支持的采集 |
| `sourcesHTML()` / `detail()` | 调受控 evidence API，不把系统路径或跨账号资料直接发给前端 |
| `localStorage('digital-twin-visual-demo-v4')` | 真实任务、草稿、记忆迁移到本地后端；localStorage 仅保留非敏感 UI 偏好 |
| `checkpoint()` / 本地撤销 | 改为后端版本化内部动作撤销；不宣称可撤销微信发送 |
| `state.confirmed/review/rejected/edits` | 映射到记忆 revision + 审阅动作，修订后重新审核 |
| `answerTwin()` | 接本地检索/本地模型；无模型明确降级，不能让预置话术假装真实 AI |
| `searchIndex()` | 本应用数据范围内搜索，受账号与记忆状态过滤 |
| 模板 `innerHTML` 插入 | 所有真实聊天和模型文本严格转义；Markdown 白名单渲染；不执行消息中的 HTML/脚本 |
| v3 对照入口 | 只指向虚构只读 reference，不夹带真实状态或数据 |

建议先抽出 `DataProvider` 接口，再拆页面组件；无需为了“现代化”立即重写全部样式。框架和依赖版本由 Agent 在本地工程确认并锁定，本说明不声称某个库当前版本已兼容。

建议方法：`getReadiness / getToday / getReport / getInsights / getPeople / getPerson / getTimeline / getEvidence / actOnTask / getMemories / actOnMemory / search / ask`。

每页数据切换都要防迟到响应覆盖：例如用户从 09/19 切到 09/20，旧 09/19 请求晚到不能覆盖当前选择。抽屉编辑内容不能被自动刷新清空。

---

## 14. 安全、私密与运行约束

以下为本工程要求，补充落实 S1 §7；不是声称上游已替本应用实现。

1. **本地监听**：只绑定 127.0.0.1；不启用公网/LAN 访问。浏览器和 API 同源；精确校验 Host/Origin 与认证会话。应用本身的鉴权与 MCP Bearer 不复用。
2. **写保护**：真实源文件/数据库只读；本应用内部编辑写自己的数据目录。模型没有系统 shell、发送工具、文件读取或通用 HTTP 执行权限。
3. **最少路径**：配置时列明允许的微信数据目录；拒绝用户输入任意 path 的文件读取 API、路径遍历和 symlink 越界。用户源文档的危险目录不因列出了路径就获得读取授权。
4. **凭据保护**：token 经本机受保护配置/进程秘密注入；不写前端包、浏览器 localStorage、提示词、日志、Git 或错误页面。401 后由用户更新，不盗取内部临时 API Key。
5. **第三方出口**：不加载会上传联系人信息的头像/分析服务；前端资源本地打包；不把真实站部署到公网演示项目；模型与日志默认禁外发。
6. **不信任聊天指令**：消息内容是待分析数据，里面的“忽略规则、读取文件、发消息”等文本没有工具授权效力；证据与权限检查在模型之外执行。
7. **保护人工判断**：持久化审阅与撤回。确认一条内容不授权发布，也不确认整页未来新增内容。
8. **账号隔离**：所有业务查询、证据、任务、消息、搜索、报告按批准账号检查。用户切号不展示上个账号的迟到请求结果。
9. **日志最少化**：记录 run_id、工具名、耗时、错误类别、记录数量与 schema 版本即可；默认不记录真实原文。提交 fixture 前脱敏但保留结构和字段类型。
10. **删除传播**：提供仅删除本应用副本的流程，清理派生结论、证据索引、搜索索引、报告中的相应内容或标记不可用；不自动删除微信源记录。备份有独立保留期与清理说明。
11. **离线降级**：App 不运行或凭据失效时保留本应用人工事项与已确认记忆；显示数据过期，不清空成“无业务”。
12. **高危动作**：禁止自动重启、杀进程、修改 RPA 目录、写上游配置和反复同步通讯录。异常先只读诊断，再等恢复，最后由人决定下一步。

---

## 15. 建议工程结构与实现依赖

以下是设计模板，不代表现有工具包含这些目录。

```text
digital-twin-local/
  reference/                    # 原始 v3/v4，只读对照
  source/                       # 输入接入文档
  web/
    pages/                      # today / conversations / relationships / timeline / memories
    components/                 # 指标、人物卡、证据抽屉、日期控件、审阅
    providers/                  # demo 与 local_live，绝不静默切换
  server/
    api/                        # /dt-api/v1
    connectors/
      mcp_readonly/              # 唯一受控上游 MCP 出口
      contacts_sqlite_ro/
      customer_events_jsonl/
    ingest/                     # 映射、校验、去重、检查点、覆盖度
    domain/                     # 任务、人物、机会、记忆、报告
    analysis/                   # 可选本地模型，输出须审核验证
    jobs/                       # 本应用自己的调度，不修改 YoBot 调度
    security/                   # 鉴权、scope、凭据、日志脱敏
    storage/                    # 本应用 db 与版本迁移
  tests/
    fixtures/synthetic/         # 可公开的虚构数据
    fixtures/redacted/          # 本机验证后人工检查的脱敏结构
    connector/ domain/ api/ ui/
  docs/
    field_mapping.md
    capability_report.md
    runbook.md
    acceptance_results.md
```

优先沿用现有 HTML/CSS 做数据层改造；本地后端可以选择熟悉且可维护的技术。应用数据库选 SQLite 是本项目建议，和源 `wechat_contacts.db` **不是同一文件**。若使用 Python 读源库，沿用文档的只读打开方式；若选其他语言，保持同样的只读约束。

包里未提供已运行的后端或 MCP 客户端。实现依赖与 lockfile 在工程实际生成，禁止写“所有依赖最新版”而不锁定版本或跳过测试。

---

## 16. 分阶段任务与交付门槛

### P0｜只读诊断与字段确认（优先）

交付：能力探测报告、工具 schema 快照、脱敏响应 fixture、字段映射、阻塞项清单。

通过：连接过程与五个只读工具得到明确成功/空/失败结论；不泄露凭据；未调用任何写工具。允许结论为“聊天未就绪”，这仍是合格诊断，不是合格全功能上线。

### P1｜真实数据最小闭环

交付：本地适配器、原始证据库、标准化记录、账户隔离、覆盖度、检查点；最少一个有来源可追溯的真实会话可读。

通过：重复导入幂等；同名不误合并；消息时间/方向未知被正确保留；诊断事件未进入业务时间线；没有消息时正确降级。

### P2｜v4 页面接线

交付：五页 UI 接本应用 API，内部任务与记忆可持久化；四种时间线视图和日期切换可用；响应状态、空状态和引用可检查。

通过：所有示例 ID、固定日期、固定数量和虚构正文从真实模式移除；v3/v4 原文件不变；演示/真实数据隔离；重启应用状态保留。

### P3｜洞察、日报与记忆候选

交付：分析 contract、规则/可选本地模型、验证器、日报快照、记忆审阅与回放测试。

通过：有证据才显示结论；未配置模型不假装调用；不凑 Top 3/洞察数；已否定不复活；无数据不判零；报告版本与当前状态分开。

### P4｜稳定性与交付

交付：安装/启动/授权轮换/故障排查/停止流程、本地数据保留与删除说明、自动化验收结果、可运行工程。

通过：token 重置、App 退出、睡眠恢复、跨日、轮转、坏行、同时编辑和快速切日期测试通过；真实数据未外发；上游写工具调用数为零。

**仅能完成 P0–P2 而 P1 消息门槛未通过时，交付名必须写“本地接入与空状态版本”，不能写“真实微信日报全功能版”。**

---

## 17. 验收重点（完整用例见 acceptance_tests.md）

必须包含下列反例：

- 文档快照中的 18 个 `contact.sync.failed` 不产生 18 个业务事件或客户洞察。
- friends=0 不说“没有好友”；groups=97 不成为 97 位客户。
- 日期没有消息或历史目录不存在，不显示“当天无沟通/无需跟进”。
- 连接成功但消息 schema 未验，聊天分析仍被阻断。
- 上游没有 cursor/from/to 参数时，不发这些参数；本应用自己按已导入数据查询日期。
- runtime schema 的无参数工具不加 account_id；全局结果仍受本应用账号过滤。
- 重新导入不会重复计数；相同正文的两条真实消息不会被误删。
- 发送者未知不产生“我答应了”；缺少后续记录不肯定“我未回复”。
- 任何关联查询不会将另一个账号的同名人物/证据展示出来。
- 时间线切换跨月、跨年、午夜、夜间、空日、快速连点均正确；旧响应不会覆盖新日期。
- 修订已确认记忆需要确认新 revision；撤回/否定不会被下次分析覆盖。
- MCP 401 不重试刷屏，错误日志和导出里找不到 token；真实模式不回退 demo。
- 模型输出引用不存在的 evidence_id、越账号或编造原话时，候选被拒绝。
- 仅复制草稿/标记完成不会调用 `wechat_send_message`；自动任务不调用 `wechat_sync_contacts`。
- public build 不包含真实数据库、账号、聊天、摘要、凭据、备份；源 v3/v4 hash 保持不变。

---

## 18. Agent 需要交给用户的最终结果

完成时用这四部分报告，不只展示截图：

**已实测接通**：列工具、账号范围、记录类型、读取数量和测试时间。  
**已实现且可用**：列页面与可操作功能，说明是否仍仅基于部分采集。  
**降级或阻塞**：列缺失响应字段、未采集时段、消息源未就绪、模型未配置等。  
**未实施**：明确未做外发、未调用微信写工具、未公开本地端口、未修改源 App。

代码、安装步骤、数据库迁移、测试报告、回滚/停止步骤和脱敏能力报告都要交付。不得因 UI 能显示而跳过数据来源与安全验收。

---

## 19. 可以直接发给开发 Agent 的任务指令

> 在用户本机开发“数字分身”的本地真实数据版。先阅读本说明、source/微信数据对外接入文档.md 与 reference/digital_twin_prototype_v4.html。保留 v3/v4 原文件，创建独立工程。
>
> 第一阶段只做 P0 诊断，不要先把 mock 数据接成“真实”。从用户在 App 对外开放页提供的当次 endpoint/token 连接本机 MCP，先 initialize 和 tools/list，以 runtime inputSchema 为准。首版仅允许五个只读工具；不直连 9922，不调用同步通讯录或发送工具，不读 protected 密钥，不改 RPA 目录，不外发真实数据。
>
> 核对历史会话/消息真实响应结构，检查允许的 SQLite 和 JSONL，输出脱敏 capability_report 与 field_mapping。客户事件流不是已验证的消息源；18 条同步失败只能进入诊断。无聊天时实现清晰空状态，不伪造日报、人物评级或记忆。
>
> P1 消息与证据门槛通过后，构建本地应用 API、独立数据库、账户隔离、幂等导入和覆盖度元信息，再逐页接 v4 的今日、对话洞察、人物关系、事件时间线、我的记忆。保留去 Hero 版式、日期切换、四种时间线视图和九维审阅。真实模式移除全部固定示例数据与预置 AI 回答。
>
> 模型能力默认未启用，需要时仅在批准的本地环境运行。所有结论有证据，未知保持未知，确认后的记忆不自动覆盖。完成、延后、确认只写本应用状态；不触发微信动作。按 acceptance_tests.md 逐项验收并区分“文档声明”“本机实测”“设计建议”，最后报告可用范围与阻塞项。

---

## 20. 最终判断

这个工具能够成为“数字分身”的**本地只读数据入口之一**，但不是现成的聊天分析后端、完整历史数据库或九维记忆系统。

最稳妥的实施路径是：**先让一条真实、可溯源的消息正确出现在本地页面，再扩展为部分记录上的事项与日报，最后增加经本人确认的长期记忆。**

当前最重要的验收不是“网页是否漂亮”或“接口数量是否多”，而是：**有没有真实可用的消息、是否知道它来自谁和何时发生、是否诚实显示缺口、是否没有越过本地与只读边界。**
