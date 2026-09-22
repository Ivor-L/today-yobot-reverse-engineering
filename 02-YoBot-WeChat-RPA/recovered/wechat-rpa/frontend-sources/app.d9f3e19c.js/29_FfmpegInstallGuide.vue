import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, toDisplayString as _toDisplayString, unref as _unref, openBlock as _openBlock, createBlock as _createBlock } from "vue"

const _hoisted_1 = { class: "ffmpeg-guide" }
const _hoisted_2 = { class: "guide-step" }
const _hoisted_3 = { class: "step-title" }
const _hoisted_4 = { class: "step-body" }
const _hoisted_5 = { class: "cmd-box" }
const _hoisted_6 = { class: "guide-step" }
const _hoisted_7 = { class: "step-title" }
const _hoisted_8 = { class: "guide-step" }
const _hoisted_9 = { class: "step-title" }
const _hoisted_10 = { class: "step-body" }

import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'

const wingetCmd =
  'winget install --id=Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements'


export default /*@__PURE__*/_defineComponent({
  __name: 'FfmpegInstallGuide',
  props: {
    modelValue: { type: Boolean }
  },
  emits: ["update:modelValue", "recheck"],
  setup(__props: any, { emit: __emit }) {

const props = __props
const emit = __emit

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

async function copyCmd(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('命令已复制，去 PowerShell 粘贴即可')
  } catch {
    ElMessage.warning('复制失败，请手动选中命令复制')
  }
}

function openGyan() {
  window.open('https://www.gyan.dev/ffmpeg/builds/', '_blank', 'noopener')
}

const rechecking = ref(false)
async function onRecheck() {
  rechecking.value = true
  try {
    emit('recheck')
  } finally {
    // 父组件 recheck 完成后会触发 audioEnv 更新，弹窗保持打开让用户看到结果
    setTimeout(() => { rechecking.value = false }, 800)
  }
}

return (_ctx: any,_cache: any) => {
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_divider = _resolveComponent("el-divider")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: visibleProxy.value,
    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((visibleProxy).value = $event)),
    title: "安装 ffmpeg（语音解码依赖）",
    width: "640px",
    "close-on-click-modal": false,
    "append-to-body": ""
  }, {
    footer: _withCtx(() => [
      _createVNode(_component_el_button, {
        onClick: _cache[1] || (_cache[1] = ($event: any) => (visibleProxy.value = false))
      }, {
        default: _withCtx(() => [...(_cache[24] || (_cache[24] = [
          _createTextVNode("关闭", -1)
        ]))]),
        _: 1
      }),
      _createVNode(_component_el_button, {
        type: "primary",
        onClick: onRecheck,
        loading: rechecking.value
      }, {
        default: _withCtx(() => [...(_cache[25] || (_cache[25] = [
          _createTextVNode(" 重新检测 ", -1)
        ]))]),
        _: 1
      }, 8, ["loading"])
    ]),
    default: _withCtx(() => [
      _createElementVNode("div", _hoisted_1, [
        _createVNode(_component_el_alert, {
          type: "info",
          closable: false,
          "show-icon": "",
          style: {"margin-bottom":"16px"}
        }, {
          title: _withCtx(() => [...(_cache[3] || (_cache[3] = [
            _createElementVNode("span", null, [
              _createTextVNode(" ffmpeg 是开源的音视频解码组件，Windows 系统默认不带。 "),
              _createElementVNode("strong", null, "装好后必须彻底关闭并重新打开本软件"),
              _createTextVNode("，否则旧进程读不到新 PATH。 ")
            ], -1)
          ]))]),
          _: 1
        }),
        _createElementVNode("div", _hoisted_2, [
          _createElementVNode("div", _hoisted_3, [
            _createVNode(_component_el_tag, {
              type: "success",
              effect: "dark",
              size: "small"
            }, {
              default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
                _createTextVNode("推荐", -1)
              ]))]),
              _: 1
            }),
            _cache[5] || (_cache[5] = _createElementVNode("span", null, "方式 1：用 winget 在线安装（约 30 秒）", -1))
          ]),
          _createElementVNode("div", _hoisted_4, [
            _cache[7] || (_cache[7] = _createElementVNode("p", null, "适用于 Windows 11 / Windows 10 1809 及以上。", -1)),
            _cache[8] || (_cache[8] = _createElementVNode("ol", null, [
              _createElementVNode("li", null, [
                _createTextVNode("右键开始菜单 → 选择 "),
                _createElementVNode("code", null, "终端（管理员）"),
                _createTextVNode(" 或 "),
                _createElementVNode("code", null, "PowerShell（管理员）")
              ]),
              _createElementVNode("li", null, "粘贴下面这行命令，回车：")
            ], -1)),
            _createElementVNode("div", _hoisted_5, [
              _createElementVNode("code", null, _toDisplayString(wingetCmd)),
              _createVNode(_component_el_button, {
                size: "small",
                type: "primary",
                icon: _unref(CopyDocument),
                onClick: _cache[0] || (_cache[0] = ($event: any) => (copyCmd(wingetCmd)))
              }, {
                default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
                  _createTextVNode(" 复制 ", -1)
                ]))]),
                _: 1
              }, 8, ["icon"])
            ]),
            _cache[9] || (_cache[9] = _createElementVNode("p", { class: "hint" }, [
              _createTextVNode(" 装完后"),
              _createElementVNode("strong", null, "关闭并重新打开本软件"),
              _createTextVNode("即可生效。 ")
            ], -1))
          ])
        ]),
        _createVNode(_component_el_divider),
        _createElementVNode("div", _hoisted_6, [
          _createElementVNode("div", _hoisted_7, [
            _createVNode(_component_el_tag, {
              type: "warning",
              effect: "plain",
              size: "small"
            }, {
              default: _withCtx(() => [...(_cache[10] || (_cache[10] = [
                _createTextVNode("备选", -1)
              ]))]),
              _: 1
            }),
            _cache[11] || (_cache[11] = _createElementVNode("span", null, "方式 2：一键安装脚本", -1))
          ]),
          _cache[12] || (_cache[12] = _createElementVNode("div", { class: "step-body" }, [
            _createElementVNode("p", null, "方式 1 报错（如 winget 不可用 / 公司网络拦截），用这套："),
            _createElementVNode("ol", null, [
              _createElementVNode("li", null, [
                _createTextVNode("联系技术支持获取 "),
                _createElementVNode("code", null, "install_ffmpeg.bat"),
                _createTextVNode("（如有内网环境，附带 "),
                _createElementVNode("code", null, "ffmpeg.exe"),
                _createTextVNode(" 一同发来）")
              ]),
              _createElementVNode("li", null, [
                _createTextVNode("把两个文件放"),
                _createElementVNode("strong", null, "同一目录")
              ]),
              _createElementVNode("li", null, [
                _createTextVNode("右键 "),
                _createElementVNode("code", null, "install_ffmpeg.bat"),
                _createTextVNode(" → "),
                _createElementVNode("strong", null, "以管理员身份运行")
              ]),
              _createElementVNode("li", null, [
                _createTextVNode("看到 "),
                _createElementVNode("code", null, "[SUCCESS] ffmpeg 安装完成"),
                _createTextVNode(" 字样后，重启本软件")
              ])
            ]),
            _createElementVNode("p", { class: "hint" }, [
              _createTextVNode(" 脚本会自动尝试 winget，失败则用同目录的 "),
              _createElementVNode("code", null, "ffmpeg.exe"),
              _createTextVNode(" 兜底，并写入系统 PATH。 ")
            ])
          ], -1))
        ]),
        _createVNode(_component_el_divider),
        _createElementVNode("div", _hoisted_8, [
          _createElementVNode("div", _hoisted_9, [
            _createVNode(_component_el_tag, {
              type: "info",
              effect: "plain",
              size: "small"
            }, {
              default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
                _createTextVNode("手动", -1)
              ]))]),
              _: 1
            }),
            _cache[14] || (_cache[14] = _createElementVNode("span", null, "方式 3：自行下载安装", -1))
          ]),
          _createElementVNode("div", _hoisted_10, [
            _createElementVNode("ol", null, [
              _createElementVNode("li", null, [
                _cache[16] || (_cache[16] = _createTextVNode(" 下载官方编译版： ", -1)),
                _createVNode(_component_el_button, {
                  link: "",
                  type: "primary",
                  onClick: openGyan
                }, {
                  default: _withCtx(() => [...(_cache[15] || (_cache[15] = [
                    _createTextVNode(" gyan.dev/ffmpeg/builds → ", -1)
                  ]))]),
                  _: 1
                }),
                _cache[17] || (_cache[17] = _createTextVNode(" （选 ", -1)),
                _cache[18] || (_cache[18] = _createElementVNode("code", null, "ffmpeg-release-essentials.zip", -1)),
                _cache[19] || (_cache[19] = _createTextVNode("，约 80 MB） ", -1))
              ]),
              _cache[20] || (_cache[20] = _createElementVNode("li", null, [
                _createTextVNode("解压到固定目录，例如 "),
                _createElementVNode("code", null, "C:\\ffmpeg")
              ], -1)),
              _cache[21] || (_cache[21] = _createElementVNode("li", null, [
                _createTextVNode(" 把 "),
                _createElementVNode("code", null, "C:\\ffmpeg\\bin"),
                _createTextVNode(" 添加到系统 PATH 环境变量 （右键\"此电脑\" → 属性 → 高级系统设置 → 环境变量 → 系统变量里的 Path → 新建） ")
              ], -1)),
              _cache[22] || (_cache[22] = _createElementVNode("li", null, "关闭所有命令行窗口和本软件，重新打开本软件", -1))
            ])
          ])
        ]),
        _createVNode(_component_el_alert, {
          type: "success",
          closable: false,
          "show-icon": "",
          style: {"margin-top":"14px"}
        }, {
          title: _withCtx(() => [...(_cache[23] || (_cache[23] = [
            _createElementVNode("span", null, " 安装完成后，回到此页面会自动重新检测；也可关闭弹窗后手动刷新页面验证。 ", -1)
          ]))]),
          _: 1
        })
      ])
    ]),
    _: 1
  }, 8, ["modelValue"]))
}
}

})