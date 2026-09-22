# today-yobot-reverse-engineering

两个 macOS 桌面端产品的**逆向分析工作区**合并仓库。内容全部来自发布构建产物的静态提取与部分源码还原，**不含原始 TypeScript 工程，也不含可重编译的完整项目**。

> **给 AI 助手的阅读提示**
> 本仓库约 149 MB / 4450 个文件。请优先阅读各项目下的 `README.md`、`analysis/*.md`、`docs/*.md`。
> 以下三个文件是**批量原始转储，不要直接整份读取**，需要时按关键词检索局部：
> - `02-YoBot-WeChat-RPA/recovered/app/dist/server.cjs`（31 MB / 73.6 万行，未压缩的第一方业务包）
> - `02-YoBot-WeChat-RPA/analysis/helper-disassembly.txt`（18.8 MB，native Helper 反汇编）
> - `01-Today/recovered/app/dist/app/app/index.js`（7.4 MB / 21.2 万行，Rspack 构建的主进程包）

---

## 目录结构

| 目录 | 产品 | 说明 |
|---|---|---|
| `01-Today/` | **Today**（`ai.today.macos.app` v1.19.5） | 发布者 Today AI PTE. LTD.，内部仓库名 `today-platform-web`。Electron + 内嵌 Next.js 全栈应用 + 本地 Agent 执行引擎 |
| `02-YoBot-WeChat-RPA/` | **YoBot**（v1.3.5）+ 微信 RPA 插件（v1.9.19 / v2.0.0） | Electron 桌面端 + Python 字节码业务模块 + native Helper |

---

## 阅读顺序建议

### 先建立全局认知
1. `01-Today/README.md` —— Today 提取包的原始说明
2. `02-YoBot-WeChat-RPA/README.md` —— YoBot 恢复工作区的原始说明
3. `02-YoBot-WeChat-RPA/analysis/逆向分析.md` —— YoBot 逆向的总体结论
4. `02-YoBot-WeChat-RPA/analysis/还原进展.md` —— 已还原到什么程度、还剩什么

### Today 的技术骨架
| 想了解 | 去哪里看 |
|---|---|
| 模块目录骨架（678 条原始路径） | `01-Today/recovered/metadata/desktop-fragments.tsv` |
| 后端接口全景（351 个端点） | `01-Today/recovered/fragments/desktop/packages/api-client/src/generated/sdk.gen.ts.fragment.js` |
| 数据模型（zod schema） | `01-Today/recovered/fragments/desktop/packages/api-client/src/generated/zod.gen.ts.fragment.js` |
| 三层桥接接口契约（JSON-RPC 能力协商） | `01-Today/recovered/fragments/*/packages/platform-interface/generated/bridge/utils/consts.ts.fragment.js` |
| Next.js 路由清单（121 条） | `01-Today/recovered/metadata/server-routes.txt` |
| 按模块拆分的可读源码片段（保留原注释） | `01-Today/recovered/fragments/`（678 个文件） |

### YoBot / 微信 RPA 的技术骨架
| 想了解 | 去哪里看 |
|---|---|
| 后端 HTTP 接口索引 | `02-YoBot-WeChat-RPA/docs/RPA-HTTP接口索引.md` |
| OpenAPI 定义 | `02-YoBot-WeChat-RPA/docs/rpa-openapi-2026-09-20.json` |
| 外部 Agent（含 MCP）接入方式 | `02-YoBot-WeChat-RPA/docs/RPA外部Agent接入指南.md` |
| MCP 工具清单 | `02-YoBot-WeChat-RPA/docs/rpa-mcp-tools-2026-09-20.json` |
| **桌面端未压缩源码（保留原注释，最佳入口）** | `02-YoBot-WeChat-RPA/recovered/app/dist/electron/` |
| 插件前端原始 TS 源码（由 source map 恢复） | `02-YoBot-WeChat-RPA/recovered/wechat-rpa/frontend-sources/` |
| Python 业务模块字节码反汇编（带原始 file/line 引用） | `02-YoBot-WeChat-RPA/recovered/wechat-rpa/disassembly/` |
| 自动反编译候选（**含已知错误，不可直接使用**） | `02-YoBot-WeChat-RPA/recovered/wechat-rpa/decompiled-candidates/` |
| 手工还原的部分源码 | `02-YoBot-WeChat-RPA/restored/` |

> YoBot 的 `recovered/app/dist/electron/` 是本次合并中信息密度最高的资产：**未压缩、保留原始 JSDoc 注释的 ESM 模块树**，按 `agent / skills / knowledge / memory / gateway / scheduler / browser / channels / commercial` 等业务域组织，可直接用于理解系统设计。

---

## 完整性说明

原始两个工作区共约 **5.0 GB / 62259 个文件**。本仓库为**面向阅读与检索的精简版**（149 MB / 4450 文件），已剔除：

- **构建产物与二进制**：`node_modules/`、`.next/`、`.app` 包体、`.framework`、`.asar`、`.marshal` 字节码、`.dylib`、`.node`、图片/字体等（约 1953 个文件）
- **重复内容**：`standalone/dist/` 下 4 份 `.app` 构建（各约 776 MB，共 3.1 GB）；`standalone/app/dist/server.cjs` 与 `recovered/app/dist/server.cjs` 完全一致，仅保留后者
- **与已有文件重复的转储**：`analysis/asar-header.json`（12 MB，文件索引已由 `analysis/asar-files.txt` 覆盖）

完整剔除清单见 [`MERGE-MANIFEST.md`](MERGE-MANIFEST.md)。

**原始体量**：`01-Today` 102 MB / 5920 文件；`02-YoBot-WeChat-RPA` 4.9 GB / 56739 文件。

---

## 已知边界

- **没有原始 TypeScript 工程**：只剩编译后产物与片段，依赖锁在 `catalog:` / `workspace:*` 私有 workspace 协议上，无法直接重编译
- **没有 sourcemap 的 `sources`**：Today 的 `.map` 中 `sources` 字段为空，源码内容不可逆
- **没有后端实现**：服务端（`today-cloud` / YoBot 后端）不在包内。代码中出现的服务端路径引用只能用于**反推模块划分**，不能当作读过源码
- **算法细节不可断言**：涉及排序、召回、评分等具体算法的部分，本仓库只提供接口与数据模型，不提供实现
- **`decompiled-candidates/` 含已知错误**，仅供线索参考

---

## 合规提醒

本仓库内容为**第三方商业软件的逆向工程产物**，其中 `02-YoBot-WeChat-RPA/standalone/scripts/` 包含绕过商业授权的改造脚本（`enable_local_rpa.py`、`configure.py` 等）。仓库已设为私有，请勿公开分发。

构建产物中内联了第三方服务的令牌（PostHog token、Sentry DSN、OAuth client ID 等），对外分享前需脱敏。
