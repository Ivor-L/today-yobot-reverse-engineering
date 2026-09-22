import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, toDisplayString as _toDisplayString, resolveDirective as _resolveDirective, openBlock as _openBlock, createElementBlock as _createElementBlock, withDirectives as _withDirectives, createBlock as _createBlock } from "vue"

const _hoisted_1 = { class: "dialog-heading" }
const _hoisted_2 = { class: "heading-icon" }
const _hoisted_3 = { class: "log-viewer-body" }
const _hoisted_4 = { class: "log-toolbar" }
const _hoisted_5 = { class: "toolbar-control" }
const _hoisted_6 = { class: "toolbar-actions" }
const _hoisted_7 = { class: "terminal-panel" }
const _hoisted_8 = { class: "terminal-header" }
const _hoisted_9 = { class: "line-count" }

import { computed, ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Document, FolderOpened, Refresh } from '@element-plus/icons-vue'
import { API_BASE_URL, headers } from '../api/config'


export default /*@__PURE__*/_defineComponent({
  __name: 'LogViewerDialog',
  setup(__props, { expose: __expose }) {

const visible = ref(false)
const content = ref('')
const loading = ref(false)
const tailLines = ref(500)
const logBox = ref<HTMLElement | null>(null)

const lineCount = computed(() => content.value ? content.value.split(/\r?\n/).length : 0)

const fetchLog = async () => {
  loading.value = true
  try {
    const resp = await fetch(`${API_BASE_URL}/api/diagnostics/log?tail=${tailLines.value}`, { headers })
    const data = await resp.json()
    content.value = data.content || ''
    await nextTick()
    if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight // 滚到底看最新
  } catch (e) {
    content.value = '读取日志失败：' + (e as Error).message
  } finally {
    loading.value = false
  }
}

const open = async () => {
  visible.value = true
  await fetchLog()
}

const copyLog = async () => {
  const text = content.value || ''
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // 兜底：不支持 clipboard API 时用隐藏 textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success('日志已复制，可粘贴发给技术支持')
  } catch {
    ElMessage.error('复制失败，请在窗口内手动选中复制')
  }
}

const openFolder = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/diagnostics/log/open`, { method: 'POST', headers })
    ElMessage.success('已在资源管理器中打开日志文件夹')
  } catch {
    ElMessage.error('打开失败，请手动到日志文件路径查看')
  }
}

// 暴露给父组件（欢迎页侧栏按钮）调用
__expose({ open })

return (_ctx: any,_cache: any) => {
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!
  const _directive_loading = _resolveDirective("loading")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: visible.value,
    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((visible).value = $event)),
    width: "82%",
    top: "5vh",
    "append-to-body": true,
    "close-on-click-modal": false,
    class: "log-viewer-dialog"
  }, {
    header: _withCtx(() => [
      _createElementVNode("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, [
          _createVNode(_component_el_icon, null, {
            default: _withCtx(() => [
              _createVNode(_unref(Document))
            ]),
            _: 1
          })
        ]),
        _cache[2] || (_cache[2] = _createElementVNode("div", { class: "heading-copy" }, [
          _createElementVNode("h2", null, "运行日志"),
          _createElementVNode("p", null, "查看客户端最近的运行记录与异常信息")
        ], -1))
      ])
    ]),
    default: _withCtx(() => [
      _createElementVNode("div", _hoisted_3, [
        _createElementVNode("div", _hoisted_4, [
          _createElementVNode("div", _hoisted_5, [
            _cache[3] || (_cache[3] = _createElementVNode("span", { class: "toolbar-label" }, "显示范围", -1)),
            _createVNode(_component_el_select, {
              modelValue: tailLines.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((tailLines).value = $event)),
              class: "line-select",
              onChange: fetchLog
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_option, {
                  value: 200,
                  label: "最近 200 行"
                }),
                _createVNode(_component_el_option, {
                  value: 500,
                  label: "最近 500 行"
                }),
                _createVNode(_component_el_option, {
                  value: 2000,
                  label: "最近 2000 行"
                })
              ]),
              _: 1
            }, 8, ["modelValue"])
          ]),
          _createElementVNode("div", _hoisted_6, [
            _createVNode(_component_el_button, {
              icon: _unref(Refresh),
              loading: loading.value,
              onClick: fetchLog
            }, {
              default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
                _createTextVNode("刷新", -1)
              ]))]),
              _: 1
            }, 8, ["icon", "loading"]),
            _createVNode(_component_el_button, {
              icon: _unref(FolderOpened),
              onClick: openFolder
            }, {
              default: _withCtx(() => [...(_cache[5] || (_cache[5] = [
                _createTextVNode("打开文件夹", -1)
              ]))]),
              _: 1
            }, 8, ["icon"]),
            _createVNode(_component_el_button, {
              type: "primary",
              icon: _unref(CopyDocument),
              onClick: copyLog
            }, {
              default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
                _createTextVNode("复制日志", -1)
              ]))]),
              _: 1
            }, 8, ["icon"])
          ])
        ]),
        _createElementVNode("div", _hoisted_7, [
          _createElementVNode("div", _hoisted_8, [
            _cache[7] || (_cache[7] = _createElementVNode("div", {
              class: "window-controls",
              "aria-hidden": "true"
            }, [
              _createElementVNode("span", { class: "control-dot close" }),
              _createElementVNode("span", { class: "control-dot minimize" }),
              _createElementVNode("span", { class: "control-dot maximize" })
            ], -1)),
            _cache[8] || (_cache[8] = _createElementVNode("span", { class: "terminal-title" }, "client.log", -1)),
            _createElementVNode("span", _hoisted_9, _toDisplayString(lineCount.value) + " 行", 1)
          ]),
          _withDirectives((_openBlock(), _createElementBlock("pre", {
            ref_key: "logBox",
            ref: logBox,
            class: "log-content"
          }, [
            _createTextVNode(_toDisplayString(content.value || '暂无运行日志'), 1)
          ])), [
            [_directive_loading, loading.value && !content.value]
          ])
        ])
      ])
    ]),
    _: 1
  }, 8, ["modelValue"]))
}
}

})