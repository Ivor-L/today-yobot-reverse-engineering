import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, createBlock as _createBlock } from "vue"

const _hoisted_1 = {
  key: 0,
  class: "empty"
}
const _hoisted_2 = {
  key: 1,
  class: "log-list"
}
const _hoisted_3 = { class: "log-header" }
const _hoisted_4 = { class: "plan" }
const _hoisted_5 = { class: "time" }
const _hoisted_6 = ["title"]
const _hoisted_7 = { class: "footer" }

import { computed } from 'vue'
import { openFolder, type MomentPostLog } from '@/api/moments'


export default /*@__PURE__*/_defineComponent({
  __name: 'MomentLogsDialog',
  props: {
    visible: { type: Boolean },
    logs: {}
  },
  emits: ["update:visible"],
  setup(__props: any, { emit: __emit }) {

const props = __props
const emit = __emit

const visible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v)
})

const formattedLogs = computed(() => props.logs.map(l => {
  const d = new Date(l.timestamp)
  const time = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const parts = l.folder_path.split(/\\|\//)
  const planName = parts.length >= 2 ? parts[parts.length - 2] : l.folder_path
  return { ...l, time, planName }
}))

const close = () => emit('update:visible', false)
const openMaterial = async (path: string) => { await openFolder(path) }

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: visible.value,
    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((visible).value = $event)),
    title: "发圈日志",
    width: "620px"
  }, {
    footer: _withCtx(() => [
      _createVNode(_component_el_button, { onClick: close }, {
        default: _withCtx(() => [...(_cache[2] || (_cache[2] = [
          _createTextVNode("关闭", -1)
        ]))]),
        _: 1
      })
    ]),
    default: _withCtx(() => [
      _cache[3] || (_cache[3] = _createElementVNode("div", { class: "subtitle" }, "最近48小时，发朋友圈任务记录", -1)),
      (__props.logs.length === 0)
        ? (_openBlock(), _createElementBlock("div", _hoisted_1, "暂无日志记录"))
        : (_openBlock(), _createElementBlock("div", _hoisted_2, [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(formattedLogs.value, (item) => {
              return (_openBlock(), _createElementBlock("div", {
                key: item.id,
                class: "log-item"
              }, [
                _createElementVNode("div", _hoisted_3, [
                  _createElementVNode("div", _hoisted_4, _toDisplayString(item.planName), 1),
                  _createElementVNode("div", _hoisted_5, _toDisplayString(item.time), 1),
                  _createElementVNode("div", {
                    class: _normalizeClass(["status", item.status === 'success' ? 'ok' : 'fail'])
                  }, _toDisplayString(item.status === 'success' ? '发表成功' : '发表失败'), 3)
                ]),
                _createElementVNode("div", {
                  class: "text",
                  title: item.text
                }, _toDisplayString(item.text), 9, _hoisted_6),
                _createElementVNode("div", _hoisted_7, [
                  _createElementVNode("span", null, "账号：" + _toDisplayString(item.account), 1),
                  _createVNode(_component_el_button, {
                    link: "",
                    type: "primary",
                    onClick: ($event: any) => (openMaterial(item.folder_path))
                  }, {
                    default: _withCtx(() => [...(_cache[1] || (_cache[1] = [
                      _createTextVNode("查看素材", -1)
                    ]))]),
                    _: 1
                  }, 8, ["onClick"])
                ])
              ]))
            }), 128))
          ]))
    ]),
    _: 1
  }, 8, ["modelValue"]))
}
}

})