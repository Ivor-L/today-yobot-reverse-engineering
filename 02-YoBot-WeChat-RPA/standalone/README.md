# YoBot 恢复版：本地 RPA 模式

双击 `dist/YoBot Recovered.app` 启动。运行前退出原 YoBot，两个版本使用相同的本地控制端口。

本恢复版的 RPA 不需要商业席位、激活码或远程授权服务。启动时会在本机创建临时运行凭据，通过仅监听 `127.0.0.1` 的兼容接口提供本地运行策略。凭据每次启动重新生成，不写入文件，不发送给远程服务。保留接口鉴权、单实例运行租约和 macOS 权限检查。vendor 中保留原签名依赖；好友同步修复使用独立的本地签名 Helper，运行时桥接以精确代码哈希验证它。

外层应用原有的账号登录、云端 AI、积分和其他在线服务保持原有配置。本次本地 RPA 改动不代表那些在线功能也已离线化。此交付包含已恢复的 JavaScript 和原签名的 RPA 二进制依赖，尚不是全部 Python/Swift 源码的完整重建。

## 构建

已随工作目录保留 Electron 和 RPA 2.0.0 运行依赖；再次构建不需要 `/Applications/YoBot.app`，也不需要下载依赖：

```sh
python3 standalone/scripts/enable_local_rpa.py
node --test tests/local_rpa_policy.test.mjs tests/embedded_rpa_recovery.test.mjs
python3 standalone/scripts/build.py
```

从项目根目录执行。构建会将上一份产物保留为 `dist/YoBot Recovered.previous.app`。构建前应退出恢复版，避免替换正在运行的应用文件。

## 代码与数据

- `app/`：可编辑的恢复版 JavaScript。
- `app/recovery-local-rpa.js`：本地运行策略；无商业授权和付款依赖。
- `native/rpa-web-patch/`：把好友全量同步标记为可选，并保持自动同步默认仅勾选群聊。
- `scripts/enable_local_rpa.py`：可重复应用的本地模式接入修改。
- `vendor/`：构建依赖及来源记录。
- 用户配置：`~/Library/Application Support/YoBot-Recovered`。
- 原生控制器可能继续使用 `~/Library/Application Support/YokoWebot` 保存自己的配置。

本地策略只服务当前恢复版启动的控制器。其他进程缺少临时凭据会被拒绝，网页来源请求也会被拒绝；未知接口不会转发到远端。运行租约每 30 秒续期，120 秒过期，避免两个运行实例同时占用同一个控制上下文。

## 首次运行权限

在 macOS 的“系统设置 → 隐私与安全性”里为 `YoBot Contact Helper` 开启“辅助功能”和“录屏与系统录音”。恢复版首次启动会把它安装到 `~/Library/Application Support/YoBot-Recovered/contact-fix/` 下的固定版本目录，避免主应用重建后权限记录失效。这两项是操作系统权限，和商业授权无关。权限改变后退出恢复版并重新启动。

若录屏列表中找不到 Helper，点击“+”，选择 `~/Library/Application Support/YokoWebot/helpers/20260918.2/YokoRpaDistributionHelper.app`。这是当前 RPA 2.0.0 安装的正式 Helper 路径。以后组件升级可能改变版本目录。

## 本机验证结果（2026-09-20）

已通过本地策略与原 RPA 2.0.0 字节码解析器的契约测试、接口鉴权/租约测试、首次启动激活流程测试和完整应用签名检查。实际运行已识别 1 个微信实例并完成账号初始化，进入完整 BOT 管理窗口。`3000/health` 与 `9922/docs` 均返回 200。

未发送真实消息，也未开启自动回复、朋友圈互动或自动加人。云端 AI、通讯录同步和各自动化业务流程尚未逐项验收。微信需保持登录且主窗口可被系统访问；微信不暴露任何窗口时，原控制器会报告 `WECHAT_MAIN_WINDOW_NOT_FOUND`。

结构化验证记录见项目根目录的 `analysis/local-rpa-verification.json`。

## RPA 扁平界面

恢复版由 Electron 宿主加载 `app/recovery-rpa-flat.css`，统一 RPA 导航、欢迎页、客户管理、会话、配置及 Element Plus 控件。白色背景、黑色主按钮、灰色次级面板和细边框；绿色用于启用状态和焦点。默认管理窗口为 1120 × 840，仍支持缩放和窄窗导航。

参考 [open-design 的 OpenAI 风格规范](https://github.com/nexu-io/open-design/blob/main/design-systems/openai/DESIGN.md)，核对版本 `0ffafb3d763981656aa9f1e63d922692cfe5dca3`。该规范为第三方整理的 OpenAI-inspired 设计，并非 OpenAI 官方设计系统。字体使用本机系统字体，无远程字体依赖。主题不修改原生 RPA 的签名文件或业务逻辑。编辑 CSS 后执行 `python3 standalone/scripts/build.py` 重新打包（先退出运行中的恢复版）。

### 本机 MCP 兼容服务

原 macOS RPA 2.0.0 未提供主程序要求的 `POST /api/mcp/control`，导致原“对外开放”持续返回 HTTP 405。恢复版在该接口不存在时启用 `app/recovery-mcp.js`：仅监听 127.0.0.1 随机端口，独立随机 Bearer 凭证，拒绝浏览器 Origin，关闭开关即关闭监听。账号状态、已同步好友、已同步群聊、通讯录同步共四个工具；不声称支持尚未实现的完整原生工具集。同步失败原样向调用方返回错误。支持 MCP Streamable HTTP 的 JSON 响应模式；可选 SSE GET 不提供。令牌不写入日志。


## 好友同步原生修复构建

`native/contact-fix` 针对 Helper 20260918.2 的空备注读取与标题解析问题提供可重建补丁，构建前检查原始二进制 SHA-256。空值读取不再当成焦点错误；昵称或标签的分隔仍有歧义时停止，不跳过记录或写入不完整快照。

```sh
python3 standalone/native/contact-fix/build.py
python3 standalone/native/contact-fix/test_parser.py
# 先退出恢复版，再打包
python3 standalone/scripts/build.py
```

原生构建需要 macOS arm64 与 Xcode Command Line Tools；Python 引导归档对应原 Control 的 Python 3.9。最终安装包包含修复 Helper、运行时桥接和归档，不依赖开发目录。首次使用或 Helper 重新签名后，需要在系统设置中为实际打包的 `YoBot Contact Helper.app` 登记权限；旧记录显示开启不保证新签名已获授权。

当前测试状态以 `analysis/contact-sync-diagnosis.md` 最末记录为准，原生解析回归通过不等于完整好友同步已通过。

## 通讯录同步范围

恢复版不要求先完成好友全量同步。账号连接成功后可以直接使用基础 BOT；新手导航将通讯录标记为可选，自动同步默认只选择群聊。客户管理仍保留“全量同步好友（可选）”入口，只有依赖完整好友名单的批量功能才需要手动执行。

当前 macOS 原生读取模块会先滚动并采集完整好友列表，再一次性保存快照。它没有可靠的分页增量接口，因此好友很多时应跳过好友同步，而不是把未完成的半截数据当成同步成功。
