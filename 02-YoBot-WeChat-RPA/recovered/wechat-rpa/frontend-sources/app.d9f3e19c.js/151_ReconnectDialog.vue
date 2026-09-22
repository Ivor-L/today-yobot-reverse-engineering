import { defineComponent as _defineComponent } from 'vue'
import { createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createBlock as _createBlock } from "vue"

const _hoisted_1 = { class: "reconnect-content" }
const _hoisted_2 = { class: "dialog-footer" }

import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { reconnectWeChat } from '@/api/init'
  
  
export default /*@__PURE__*/_defineComponent({
  __name: 'ReconnectDialog',
  setup(__props, { expose: __expose }) {

  const visible = ref(false)
  const reconnecting = ref(false)
  
  const handleReconnect = async () => {
    reconnecting.value = true
    try {
      const result = await reconnectWeChat()
      if (result.success) {
        ElMessage.success('已重新连接')
        visible.value = false
      } else {
        ElMessage.error(result.message || '重新连接失败')
      }
    } catch (error) {
      ElMessage.error('重新连接失败')
    } finally {
      reconnecting.value = false
    }
  }
  
  // 导出方法供父组件调用
  __expose({
    show: () => visible.value = true
  })
  
return (_ctx: any,_cache: any) => {
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: visible.value,
    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((visible).value = $event)),
    title: "连接已断开",
    "close-on-click-modal": false,
    "close-on-press-escape": false,
    "show-close": false,
    width: "30%"
  }, {
    footer: _withCtx(() => [
      _createElementVNode("span", _hoisted_2, [
        _createVNode(_component_el_button, {
          type: "primary",
          onClick: handleReconnect,
          loading: reconnecting.value
        }, {
          default: _withCtx(() => [
            _createTextVNode(_toDisplayString(reconnecting.value ? '重新连接中...' : '重新连接'), 1)
          ]),
          _: 1
        }, 8, ["loading"])
      ])
    ]),
    default: _withCtx(() => [
      _createElementVNode("div", _hoisted_1, [
        _createVNode(_component_el_alert, {
          type: "warning",
          closable: false,
          "show-icon": ""
        }, {
          default: _withCtx(() => [...(_cache[1] || (_cache[1] = [
            _createTextVNode(" 您已掉线，请重新连接 ", -1)
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