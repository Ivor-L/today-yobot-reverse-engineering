# Today.app 逆向整理

本目录保存从本机 `/Applications/Today.app` 提取的**发布构建产物**，不是原始开发仓库。提取过程没有修改已安装的应用。

## 已恢复的内容

| 位置 | 内容 |
| --- | --- |
| [`recovered/app/`](recovered/app/) | Electron 主进程、预加载脚本、内置页面及其依赖；来自 `app.asar` |
| [`recovered/web-runtime/`](recovered/web-runtime/) | Next.js 独立服务端、网页构建文件和公开静态资源；来自 `prod.asar` |
| [`recovered/metadata/`](recovered/metadata/) | 应用元数据、归档校验值、网页服务端路由清单 |
| [`recovered/fragments/`](recovered/fragments/) | 从桌面、预加载及网页宿主 bundle 拆出的编译后 JS 片段，按原始模块路径排列 |
| [`scripts/extract.sh`](scripts/extract.sh) | 从原应用重新提取上述内容的脚本 |

## 结构和入口

- macOS 应用 ID：`ai.today.macos.app`；版本 `1.19.5`，构建号 `2000120`。
- Electron 入口：`recovered/app/dist/app/main/index.js`，调用 `DesktopMainApp.create()` 与 `launch()`。
- 核心桌面逻辑：`recovered/app/dist/app/app/index.js`，约 7.8 MB 的 Rspack bundle，包含约 351 个编号模块。
- 这些桌面 bundle 保留了 `CONCATENATED MODULE` 路径标记。主 bundle 可拆出 302 个桌面项目模块和 376 个共享包模块；预加载与网页宿主还分别有 32、14 个项目模块标记。清单在 `recovered/metadata/*-fragments.tsv`。片段是编译后的 JS，模块之间仍依赖 bundle 的共享作用域。
- 网页入口：`recovered/web-runtime/apps/web/server.js`，Next.js `16.3.4` 的独立服务端。
- 桌面逻辑会按 `web-runtimes/{environment}.asar/apps/web/server.js` 寻找网页运行时，生产环境由 `manifest.json` 指向 `prod.asar`。
- 桌面端启动 macOS 原生 platform host，通过管道传送消息；网页运行时在 Electron `utilityProcess` 中启动，再由浏览器会话的 HTTP 协议处理器接入本地服务。窗口加载网页时使用 `dist/preload/desktop.cjs` 提供桥接。
- 应用还依赖原包内的 macOS 原生可执行文件和 `.node` 模块，位置在 `/Applications/Today.app/Contents/Resources/tools/macos/` 及 `Contents/Library/HelperTools/`。
- 远端服务地址出现在客户端构建产物中；它们的服务端源码和数据不在此安装包内。

## 还原程度

保留了可执行的发布版 JS 与资源，可以分析界面、路由、IPC 和部分业务流程。桌面端的部分原始路径可以从 bundle 标记恢复，但原始 TypeScript、注释、测试、构建脚本、monorepo 内部包的完整源码和后端服务端源码没有随安装包发布。网页侧 121 个 `.map` 文件的 `sources` 都为空，无法据此自动恢复原文件。桌面主逻辑也没有可用的源码映射。`package.json` 中大量依赖写为 `catalog:` 或 `workspace:*`，因此提取目录不能当成完整源码项目重新安装依赖并编译。

安装包的签名与元数据标明发布者为 **Today AI PTE. LTD.**，包名为 `@todayai-labs/desktop-client`。若你预期的是内部自研应用，建议核对是否选对了安装包。

## 验证结果

- 两个 ASAR 归档均已成功提取。归档 SHA-256 记录在 `recovered/metadata/archive-sha256.txt`。
- Electron 入口、核心 bundle、网页宿主文件和 Next.js 服务端文件通过 `node --check` 语法检查。
- 解包后的 Next.js 服务端在本机 `127.0.0.1:47831` 启动成功，访问 `/build-info.json` 返回 HTTP 200；测试后已停止。

## 重新提取

```bash
./scripts/extract.sh /Applications/Today.app
```

运行需要 `asar` 命令。`recovered/` 中可能含发布时嵌入的配置和令牌，分享或提交到远端仓库前应检查并清理。
