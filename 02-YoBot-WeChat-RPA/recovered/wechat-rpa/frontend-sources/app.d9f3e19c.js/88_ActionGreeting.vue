import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveComponent as _resolveComponent, createBlock as _createBlock, withCtx as _withCtx, createVNode as _createVNode } from "vue"

const _hoisted_1 = { class: "action-body" }
const _hoisted_2 = { class: "field" }

import type { SopDataSources } from '@/types/sop'


export default /*@__PURE__*/_defineComponent({
  __name: 'ActionGreeting',
  props: {
    modelValue: {},
    dataSources: {}
  },
  emits: ['update:modelValue'],
  setup(__props: any, { emit: __emit }) {

const props = __props
const emit = __emit

const update = (key: string, val: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: val })
}

return (_ctx: any,_cache: any) => {
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _cache[1] || (_cache[1] = _createElementVNode("span", { class: "field-label" }, "话术组", -1)),
      _createVNode(_component_el_select, {
        "model-value": __props.modelValue.greetingGroupId,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => (update('greetingGroupId', $event))),
        placeholder: "选择话术组",
        class: "field-control"
      }, {
        default: _withCtx(() => [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(__props.dataSources.greetingGroups, (g) => {
            return (_openBlock(), _createBlock(_component_el_option, {
              key: g.id,
              label: g.name,
              value: g.id
            }, null, 8, ["label", "value"]))
          }), 128))
        ]),
        _: 1
      }, 8, ["model-value"])
    ])
  ]))
}
}

})