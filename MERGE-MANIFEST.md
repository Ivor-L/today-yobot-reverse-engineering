# 合并清单与剔除记录

本文档记录 `01-Today` 与 `02-YoBot-WeChat-RPA` 合并进本仓库时，**哪些内容被剔除、为什么**。

合并脚本按以下规则过滤，完整规则见文末。

## 一、保留统计

| 目标目录 | 源路径 | 保留文件数 | 保留体积 |
|---|---|---|---|
| `01-Today/` | `/Users/Admin/Desktop/软件开发/Today` | 924 | 17.07 MB |
| `02-YoBot-WeChat-RPA/` | `/Users/Admin/Desktop/软件开发/微信机器人` | 3524 | 70.96 MB |
| **合计** | | **4448** | **88.03 MB** |

## 二、按体积剔除的超大文件

单文件上限 10 MB（阈值一次性剔除，均为批量转储，价值由同目录下更紧凑的汇总文件覆盖）：

| 大小 | 文件 | 剔除原因 |
|---|---|---|
| 31.31 MB | `02-YoBot-WeChat-RPA/standalone/app/dist/server.cjs` | 与 `recovered/app/dist/server.cjs` 逐字节完全一致（已用 `cmp` 验证），保留前者即可 |
| 31.31 MB | `02-YoBot-WeChat-RPA/recovered/app/dist/server.cjs` | **已手动补回**（第一方未压缩业务包，31 MB），见下节 |
| 18.79 MB | `02-YoBot-WeChat-RPA/analysis/helper-disassembly.txt` | **已手动补回**，见下节 |
| 12.37 MB | `02-YoBot-WeChat-RPA/analysis/asar-header.json` | asar 完整头部（含偏移量），文件索引已由 `analysis/asar-files.txt`（1.27 MB）覆盖 |

## 三、手动补回的文件

以下文件超出 10 MB 上限，但确认为**第一方核心证据**，已手动纳入：

| 大小 | 文件 | 说明 |
|---|---|---|
| 31.31 MB | `02-YoBot-WeChat-RPA/recovered/app/dist/server.cjs` | 73.6 万行、平均行长 43 字符，**未压缩**的 YoBot 第一方业务包；`require` 统计显示仅引用 Node 内置模块，无第三方压缩代码 |
| 18.79 MB | `02-YoBot-WeChat-RPA/analysis/helper-disassembly.txt` | native Helper 反汇编，是理解微信注入/控制链路的一手证据 |

## 四、按扩展名剔除的二进制文件

| 源 | 剔除数量 |
|---|---|
| `01-Today` | 22 |
| `02-YoBot-WeChat-RPA` | 1931 |

剔除的扩展名：`.node` `.dylib` `.so` `.dll` `.exe` `.asar` `.marshal` `.bare` `.bcmap` `.pyz` `.pyc` `.wasm` 
`.png` `.jpg` `.jpeg` `.gif` `.ico` `.icns` `.webp` `.tiff` `.bmp` `.woff` `.woff2` `.ttf` `.otf` 
`.zip` `.gz` `.tar` `.7z` `.rar` `.dmg` `.pkg` `.pdf` `.mp3` `.mp4` `.wav` `.m4a` `.mov` `.o` `.a` `.lib` `.db` `.sqlite` `.bin` `.dat` 等。

## 五、剔除的目录

规则：目录名属于 `node_modules` `.next` `__pycache__` `.venv` `.cache` `.turbo` 等，或以 `.app` `.framework` `.xcodeproj` `.xcassets` `.bundle` `.lproj` 结尾。

### `01-Today`（共 3 个目录）

| 目录 |
|---|
| `recovered/app/node_modules` |
| `recovered/web-runtime/apps/web/.next` |
| `recovered/web-runtime/apps/web/node_modules` |

### `02-YoBot-WeChat-RPA`（共 53 个目录）

| 目录 |
|---|
| `recovered/app/node_modules` |
| `standalone/app/node_modules` |
| `standalone/dist/YoBot Recovered.app` |
| `standalone/dist/YoBot Recovered.previous/Contents/Frameworks/Electron Framework.framework` |
| `standalone/dist/YoBot Recovered.previous/Contents/Frameworks/Mantle.framework` |
| `standalone/dist/YoBot Recovered.previous/Contents/Frameworks/ReactiveObjC.framework` |
| `standalone/dist/YoBot Recovered.previous/Contents/Frameworks/Squirrel.framework` |
| `standalone/dist/YoBot Recovered.previous/Contents/Frameworks/YoBot Helper (GPU).app` |
| `standalone/dist/YoBot Recovered.previous/Contents/Frameworks/YoBot Helper (Plugin).app` |
| `standalone/dist/YoBot Recovered.previous/Contents/Frameworks/YoBot Helper (Renderer).app` |
| `standalone/dist/YoBot Recovered.previous/Contents/Frameworks/YoBot Helper.app` |
| `standalone/dist/YoBot Recovered.previous/Contents/Resources/app.asar.unpacked/node_modules` |
| `standalone/dist/YoBot Recovered.previous/Contents/Resources/contact-fix/YoBot Contact Helper.app` |
| `standalone/dist/YoBot Recovered.previous/Contents/Resources/embedded-rpa/1.9.19/YokoWebot RPA Control.app` |
| `standalone/dist/YoBot Recovered.previous/Contents/Resources/embedded-rpa/2.0.0/YokoWebot RPA Control.app` |
| `standalone/dist/YoBot Recovered.previous/Contents/Resources/en.lproj` |
| `standalone/dist/YoBot Recovered.previous/Contents/Resources/zh_CN.lproj` |
| `standalone/dist/YoBot Recovered.previous/Contents/Resources/zh_TW.lproj` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Frameworks/Electron Framework.framework` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Frameworks/Mantle.framework` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Frameworks/ReactiveObjC.framework` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Frameworks/Squirrel.framework` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Frameworks/YoBot Helper (GPU).app` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Frameworks/YoBot Helper (Plugin).app` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Frameworks/YoBot Helper (Renderer).app` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Frameworks/YoBot Helper.app` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Resources/app.asar.unpacked/node_modules` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Resources/contact-fix/YoBot Contact Helper.app` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Resources/embedded-rpa/1.9.19/YokoWebot RPA Control.app` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Resources/embedded-rpa/2.0.0/YokoWebot RPA Control.app` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Resources/en.lproj` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Resources/zh_CN.lproj` |
| `standalone/dist/YoBot-Recovered-previous-backup/Contents/Resources/zh_TW.lproj` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Frameworks/Electron Framework.framework` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Frameworks/Mantle.framework` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Frameworks/ReactiveObjC.framework` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Frameworks/Squirrel.framework` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Frameworks/YoBot Helper (GPU).app` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Frameworks/YoBot Helper (Plugin).app` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Frameworks/YoBot Helper (Renderer).app` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Frameworks/YoBot Helper.app` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Resources/app.asar.unpacked/node_modules` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Resources/contact-fix/YoBot Contact Helper.app` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Resources/embedded-rpa/1.9.19/YokoWebot RPA Control.app` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Resources/embedded-rpa/2.0.0/YokoWebot RPA Control.app` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Resources/en.lproj` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Resources/zh_CN.lproj` |
| `standalone/dist/YoBot-Recovered-previous-titlebar-backup/Contents/Resources/zh_TW.lproj` |
| `standalone/native/YoBot Contacts Diagnostics.app` |
| `standalone/native/contact-fix/build/YoBot Contact Helper.app` |
| `standalone/vendor/runtime/YoBot.app` |
| `standalone/vendor/wechat-rpa/1.9.19/YokoWebot RPA Control.app` |
| `standalone/vendor/wechat-rpa/2.0.0/YokoWebot RPA Control.app` |

## 六、按路径额外剔除

| 源 | 路径规则 | 原因 |
|---|---|---|
| `02-YoBot-WeChat-RPA` | `standalone/dist/` | 4 份 `.app` 构建产物（含 3 份 backup），各约 776 MB，合计 3.1 GB |
| `02-YoBot-WeChat-RPA` | `**/dist/ui/` | Vite 压缩后的前端产物（平均行长 2312 字符），可读版本见 `restored/frontend/src/` 与 `recovered/wechat-rpa/frontend-sources/` |

## 七、复现合并

过滤规则（按优先级）：

1. 目录名命中排除集，或以二进制包后缀结尾 → 整目录跳过
2. 相对路径命中路径规则 → 跳过
3. 扩展名命中二进制列表 → 跳过
4. 文件体积 > 10 MB → 跳过并记录
5. 其余文件按原相对路径复制（`shutil.copy2` 保留时间戳）

原始工作区路径：
- `/Users/Admin/Desktop/软件开发/Today`
- `/Users/Admin/Desktop/软件开发/微信机器人`

> 剔除的内容**未删除**，仍完整保留在上述两个原始目录中。