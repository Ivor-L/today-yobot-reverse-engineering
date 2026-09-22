import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, unref as _unref, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, createTextVNode as _createTextVNode, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "error-dialog-content" }
const _hoisted_2 = { class: "error-header" }
const _hoisted_3 = { class: "error-title" }
const _hoisted_4 = { class: "error-body" }
const _hoisted_5 = { class: "error-message-box" }
const _hoisted_6 = {
  key: 1,
  class: "error-detail-wrapper"
}
const _hoisted_7 = { class: "error-footer" }

import { computed, ref, watch } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'


export default /*@__PURE__*/_defineComponent({
  __name: 'CommonErrorDialog',
  props: {
    visible: { type: Boolean },
    title: {},
    content: {},
    errorDetail: {},
    maxContentLines: { default: 4 },
    maxDetailLines: { default: 8 }
  },
  emits: ['update:visible', 'close'],
  setup(__props: any, { emit: __emit }) {

const props = __props

const emit = __emit
const contentExpanded = ref(false)
const detailExpanded = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const countLines = (text?: string) => (text || '').split(/\r?\n/).length
const shouldShowContentToggle = computed(() => {
  const text = props.content || ''
  return countLines(text) > props.maxContentLines || text.length > 220
})
const shouldShowDetailToggle = computed(() => {
  const text = props.errorDetail || ''
  return countLines(text) > props.maxDetailLines || text.length > 520
})
const isContentClamped = computed(() => shouldShowContentToggle.value && !contentExpanded.value)
const isDetailClamped = computed(() => shouldShowDetailToggle.value && !detailExpanded.value)
const contentClampStyle = computed(() => ({ '--line-clamp': String(props.maxContentLines) }))
const detailClampStyle = computed(() => ({ '--line-clamp': String(props.maxDetailLines) }))

watch(() => props.visible, (visible) => {
  if (visible) {
    contentExpanded.value = false
    detailExpanded.value = false
  }
})

const handleClose = () => {
  dialogVisible.value = false
  emit('close')
}

const handleCopyError = async () => {
  if (props.errorDetail) {
    try {
      await navigator.clipboard.writeText(props.errorDetail)
      ElMessage.success('错误信息已复制')
    } catch (err) {
      console.error('复制失败:', err)
      ElMessage.error('复制失败')
    }
  }
}

return (_ctx: any,_cache: any) => {
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: dialogVisible.value,
    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((dialogVisible).value = $event)),
    "show-close": false,
    width: "420px",
    class: "common-error-dialog",
    center: "",
    "align-center": "",
    "destroy-on-close": ""
  }, {
    header: _withCtx(() => [...(_cache[3] || (_cache[3] = [
      _createElementVNode("div", { class: "my-header" }, null, -1)
    ]))]),
    default: _withCtx(() => [
      _createElementVNode("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, [
          _createVNode(_component_el_icon, {
            class: "error-icon",
            size: 48,
            color: "#F56C6C"
          }, {
            default: _withCtx(() => [
              _createVNode(_unref(WarningFilled))
            ]),
            _: 1
          }),
          _createElementVNode("h3", _hoisted_3, _toDisplayString(__props.title), 1)
        ]),
        _createElementVNode("div", _hoisted_4, [
          _createElementVNode("div", _hoisted_5, [
            _createElementVNode("p", {
              class: _normalizeClass(["main-content", { 'is-clamped': isContentClamped.value }]),
              style: _normalizeStyle(contentClampStyle.value)
            }, _toDisplayString(__props.content), 7),
            (shouldShowContentToggle.value)
              ? (_openBlock(), _createBlock(_component_el_button, {
                  key: 0,
                  link: "",
                  type: "primary",
                  class: "toggle-btn",
                  onClick: _cache[0] || (_cache[0] = ($event: any) => (contentExpanded.value = !contentExpanded.value))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(_toDisplayString(contentExpanded.value ? '收起' : '展开全部'), 1)
                  ]),
                  _: 1
                }))
              : _createCommentVNode("", true),
            (__props.errorDetail)
              ? (_openBlock(), _createElementBlock("div", _hoisted_6, [
                  _cache[4] || (_cache[4] = _createElementVNode("p", { class: "error-detail-title" }, "报错详情：", -1)),
                  _createElementVNode("p", {
                    class: _normalizeClass(["error-detail-text", { 'is-clamped': isDetailClamped.value }]),
                    style: _normalizeStyle(detailClampStyle.value)
                  }, _toDisplayString(__props.errorDetail), 7),
                  (shouldShowDetailToggle.value)
                    ? (_openBlock(), _createBlock(_component_el_button, {
                        key: 0,
                        link: "",
                        type: "primary",
                        class: "toggle-btn",
                        onClick: _cache[1] || (_cache[1] = ($event: any) => (detailExpanded.value = !detailExpanded.value))
                      }, {
                        default: _withCtx(() => [
                          _createTextVNode(_toDisplayString(detailExpanded.value ? '收起' : '展开全部'), 1)
                        ]),
                        _: 1
                      }))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true)
          ])
        ]),
        _createElementVNode("div", _hoisted_7, [
          (__props.errorDetail)
            ? (_openBlock(), _createBlock(_component_el_button, {
                key: 0,
                onClick: handleCopyError,
                class: "copy-btn",
                size: "large"
              }, {
                default: _withCtx(() => [...(_cache[5] || (_cache[5] = [
                  _createTextVNode("复制错误", -1)
                ]))]),
                _: 1
              }))
            : _createCommentVNode("", true),
          _createVNode(_component_el_button, {
            type: "primary",
            onClick: handleClose,
            class: "close-btn",
            size: "large"
          }, {
            default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
              _createTextVNode("关闭", -1)
            ]))]),
            _: 1
          })
        ])
      ])
    ]),
    _: 1
  }, 8, ["modelValue"]))
}
}

})