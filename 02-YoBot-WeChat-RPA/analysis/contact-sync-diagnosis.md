# 好友同步诊断（2026-09-20）

以下按排查时间记录，早期“未修改、未定位”结论已被末尾的原生修复进展更新。

- 当前微信版本：4.1.13；RPA 2.0.0。
- 复现：客户管理 → 同步 → 同步好友，HTTP 409。
- 首次具体错误：MACOS_MVP_CONTACT_SYNC_FAILED_ELEMENT_NOT_FOUND。
- 用户手动打开通讯录管理后：MACOS_MVP_CONTACT_SYNC_FAILED_OPERATION_FAILED。
- 旧前端把 detail 对象传给 Error，显示 [object Object]，无法说明具体原因。
- 恢复版新增仅对本机 /api/contact/sync 错误响应生效的兼容层，保留 HTTP 失败状态和原始诊断对象，呈现中文提示及错误码。
- 原生 Helper 未修改，未绕过其完整快照校验，未将空列表写作成功。
- 尚未完成：定位原生 Helper 的具体失败步骤、完成完整好友同步。不能据此宣称已兼容当前微信通讯录。

- 后续用户重试已发生多页翻动。计时复现 27.706 秒返回 HTTP 409 / MACOS_MVP_CONTACT_SYNC_FAILED_OPERATION_FAILED；不符合首次读取 360 秒超时。实际失败子步骤仍无法从当前公开接口确认。

## 运行时调用栈定位

使用 macOS sample 只读采样 Helper，采样文件位于 analysis/sync-stack-samples/。

- 00–06：collectOpenContactsToStableBottomCandidate → scrollCandidateOnce / readVisibleContactPayloads，持续翻页和读取。
- 07：readVisibleContactPayloads → readPreciseRemarkOnce，包含 clickCenterOnce 和读取焦点后的等待。
- 08：进入 withOpenContactManager 的 defer，恢复聊天页。

这把失败范围缩小至精确备注读取或随后校验。采样不是异常跟踪，不能据此证明一定是 REMARK_FOCUS_INVALID 或 REMARK_MISMATCH；不应修改用户备注、跳过联系人或忽略完整性校验来制造成功。

当前正式 Helper 启用了 hardened runtime，且无调试授权；现有接口又丢弃 helper_code/message。修复需要在可构建的原生读取模块中保留原始诊断并适配备注控件，不能仅靠前端 CSS 或延长请求超时完成。未修改正式原生签名文件。

- 另已修复独立的 MCP 启动问题：原接口缺失返回 405。新增本机兼容服务已完成实际 initialize、tools/list、wechat_status 验证。此修复不等于通讯录同步成功。

## 追加现场检查

- 再次复现耗时 25.63 秒，仍返回 OPERATION_FAILED。
- 使用短 sample 在 `readPreciseRemarkOnce +1348`（点击后等待）暂停 Helper，45 秒看门狗自动恢复，未修改二进制。
- 此时 CUA 能截图通讯录管理窗口。AX 树只有搜索输入区，未出现备注输入框；点击可见备注单元格后能看到编辑边框，但 CUA 的 AX 树仍未暴露该输入框。
- 静态反汇编证实该函数只接受应用的 `AXFocusedUIElement`，要求 `AXRole == AXTextField`、`AXFocused == true`、几何包含检查及可读 AXValue；失败统一抛出 REMARK_FOCUS_INVALID。公共 API 仍丢弃 helper 子错误，所以目前不能仅凭这些观察证明具体哪条断言失败。
- 新增 `standalone/native/ContactProbe.swift` 和可重建的独立诊断 app，记录焦点、几何、角色与白名单列标题，不读取或输出 AXValue、联系人姓名、手机号、聊天内容。编译成功，运行返回 ACCESSIBILITY_PERMISSION_REQUIRED，等待用户单独开启权限后采集。
- 当前仍未修复，未修改原签名 Helper，也未导入不完整好友快照。


## 已确认的根因与修复（待完整同步验收）

运行时异常探针取得真实 helper_code：`WECHAT_CONTACT_REMARK_FOCUS_INVALID`。在失败行观察到真实空备注编辑框，昵称与标签均可能含空格。原生 `stringValue` 和 `rawStringValue` 都会把空字符串转换为 nil；初版仅切换到 rawStringValue 仍失败。

`standalone/native/contact-fix/` 新增版本锁定的修复构建：仅替换精确备注的 AXValue 读取调用，使用 AXUIElementCopyAttributeValue 保留空字符串。原函数的角色、焦点、位置及长度验证全部保留。另桥接原生标题解析器，区分“未取得备注”与“已验证的空备注”；仅在唯一双空格分隔明确时还原昵称和标签，遇到歧义抛错，保留完整快照验证。

原 vendor 和 /Applications/YoBot.app 未修改。恢复版安装包包含本地签名的独立 Helper（local.yobot.contact-helper）与桥接文件；启动时将 Python 引导钩子部署到恢复版 Control 的 base_library.zip。Control 的资源归档因此已修改，不能声称部署后的整包仍是原始签名资源。原可执行文件保持不变；Helper IPC 验证采用精确 cdhash，原 PID、socket、身份与版本检查仍执行。

2026-09-20：实际原生解析器回归测试 8 项通过，嵌入式 RPA 启动测试通过，恢复版安装包签名检查通过。新 Helper 授权已重新登记并重启，账号状态读取成功；完整好友同步正在验证，尚不能宣称已完成。

补充：空备注修复后完整读取越过原失败点，持续翻页直至外层请求超时；缓存仍为 0，未产生虚假成功。原 Python 第一页（实际扫描全通讯录）的等待上限为 360 秒，MCP 为 390 秒。仅将完整通讯录首轮等待调整为 900 秒、外层同步请求为 960 秒，其他请求与 5,000 条完整性上限不变；等待新一轮验证。
