# YoBot 恢复工作区

可构建的恢复版位于 `standalone/`，入口为 `standalone/dist/YoBot Recovered.app`。RPA 已接入本地免商业授权模式，运行与构建方法见 [恢复版说明](standalone/README.md)。以下保留原始提取和部分源码还原的记录。

外部 Agent（包括 Codex）的 MCP 接入方式、功能范围及本机验证状态见 [RPA 外部 Agent 接入指南](docs/RPA外部Agent接入指南.md)。

已提取 YoBot 1.3.5 及微信 RPA 插件 1.9.19 的可恢复代码。

先阅读 [逆向分析](analysis/逆向分析.md)。

- recovered/app：桌面端 JavaScript 和依赖。
- recovered/wechat-rpa/frontend-sources：插件前端 source map 内容。
- recovered/wechat-rpa/bytecode：Python 字节码。
- recovered/wechat-rpa/disassembly：业务模块反汇编。
- recovered/wechat-rpa/native：原生 Helper 副本。
- tools：静态提取脚本。
- analysis：证据、文件索引和校验记录。

`recovered/` 是恢复材料与静态分析成果；`restored/` 是部分手工还原源码。`standalone/` 可重新构建，但仍携带原生二进制依赖，尚未恢复全部 Python/Swift 源码。

## 第二轮还原

查看 [本轮代码、验证和剩余工作](analysis/还原进展.md)。

- `restored/python/`：手工还原的 Helper 协议、消息收发方法和相关模型；属于部分工程。
- `restored/frontend/src/`：92 个按原路径恢复的第一方前端源文件。
- `tests/`：原字节码与恢复逻辑的模拟差分测试，需 Python 3.9。
- `recovered/wechat-rpa/decompiled-candidates/`：自动反编译候选，包含已知错误，不可直接使用。

运行验证：`python3 -m unittest discover -s tests -v`。
