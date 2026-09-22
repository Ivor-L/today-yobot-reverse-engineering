import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock } from "vue"

const _hoisted_1 = { class: "countdown-content" }
const _hoisted_2 = { class: "countdown-message" }
const _hoisted_3 = { class: "countdown-number" }

import { ref, watch } from 'vue'
  
  interface Props {
    modelValue: boolean
    countdown?: number
    message?: string
  }
  
  
export default /*@__PURE__*/_defineComponent({
  __name: 'CountdownDialog',
  props: {
    modelValue: { type: Boolean },
    countdown: {},
    message: {}
  },
  emits: ['update:modelValue', 'finish'],
  setup(__props: any, { emit: __emit }) {

  const props = __props
  const emit = __emit
  
  const visible = ref(false)
  const currentCount = ref(props.countdown || 5)
  
  watch(() => props.modelValue, (newVal) => {
    visible.value = newVal
    if (newVal) {
      startCountdown()
    }
  })
  
  const startCountdown = () => {
    currentCount.value = props.countdown || 5
    const timer = setInterval(() => {
      currentCount.value--
      if (currentCount.value <= 0) {
        clearInterval(timer)
        visible.value = false
        emit('update:modelValue', false)
        emit('finish')
      }
    }, 1000)
  }
  
return (_ctx: any,_cache: any) => {
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: visible.value,
    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((visible).value = $event)),
    "show-close": false,
    "close-on-click-modal": false,
    "close-on-press-escape": false,
    width: "400px",
    class: "countdown-dialog"
  }, {
    default: _withCtx(() => [
      _createElementVNode("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, _toDisplayString(__props.message), 1),
        _createElementVNode("div", _hoisted_3, _toDisplayString(currentCount.value), 1),
        _cache[1] || (_cache[1] = _createElementVNode("div", { class: "countdown-tip" }, "秒后开始执行，请确保微信窗口打开", -1))
      ])
    ]),
    _: 1
  }, 8, ["modelValue"]))
}
}

})