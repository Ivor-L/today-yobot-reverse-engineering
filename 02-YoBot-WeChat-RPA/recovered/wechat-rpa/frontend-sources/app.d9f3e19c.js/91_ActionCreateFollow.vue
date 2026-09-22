import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveComponent as _resolveComponent, createBlock as _createBlock, withCtx as _withCtx, createVNode as _createVNode, createTextVNode as _createTextVNode, createCommentVNode as _createCommentVNode } from "vue"

const _hoisted_1 = { class: "action-body" }
const _hoisted_2 = { class: "field" }
const _hoisted_3 = { class: "field" }
const _hoisted_4 = { class: "field" }
const _hoisted_5 = { class: "field" }
const _hoisted_6 = {
  key: 0,
  class: "field"
}
const _hoisted_7 = {
  key: 1,
  class: "field"
}
const _hoisted_8 = { class: "field" }

import type { SopDataSources } from '@/types/sop'


export default /*@__PURE__*/_defineComponent({
  __name: 'ActionCreateFollow',
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
  const _component_el_input_number = _resolveComponent("el-input-number")!
  const _component_el_radio = _resolveComponent("el-radio")!
  const _component_el_radio_group = _resolveComponent("el-radio-group")!
  const _component_el_time_picker = _resolveComponent("el-time-picker")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _cache[7] || (_cache[7] = _createElementVNode("span", { class: "field-label" }, "智能体", -1)),
      _createVNode(_component_el_select, {
        "model-value": __props.modelValue.agentId,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => (update('agentId', $event))),
        placeholder: "选择智能体",
        class: "field-control"
      }, {
        default: _withCtx(() => [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(__props.dataSources.cozeAgents, (a) => {
            return (_openBlock(), _createBlock(_component_el_option, {
              key: a.botId,
              label: a.name,
              value: a.botId
            }, null, 8, ["label", "value"]))
          }), 128))
        ]),
        _: 1
      }, 8, ["model-value"])
    ]),
    _createElementVNode("div", _hoisted_3, [
      _cache[8] || (_cache[8] = _createElementVNode("span", { class: "field-label" }, "跟进周期", -1)),
      _createVNode(_component_el_input_number, {
        "model-value": __props.modelValue.followDays,
        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => (update('followDays', $event))),
        min: 2,
        max: 30,
        "controls-position": "right",
        style: {"width":"120px"}
      }, null, 8, ["model-value"]),
      _cache[9] || (_cache[9] = _createElementVNode("span", { class: "unit" }, "天", -1))
    ]),
    _createElementVNode("div", _hoisted_4, [
      _cache[10] || (_cache[10] = _createElementVNode("span", { class: "field-label" }, "跟进频率", -1)),
      _cache[11] || (_cache[11] = _createElementVNode("span", { class: "unit" }, "每隔", -1)),
      _createVNode(_component_el_input_number, {
        "model-value": __props.modelValue.frequency,
        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => (update('frequency', $event))),
        min: 0,
        max: 10,
        "controls-position": "right",
        style: {"width":"110px"}
      }, null, 8, ["model-value"]),
      _cache[12] || (_cache[12] = _createElementVNode("span", { class: "unit" }, "天（0=每天）", -1))
    ]),
    _createElementVNode("div", _hoisted_5, [
      _cache[15] || (_cache[15] = _createElementVNode("span", { class: "field-label" }, "时间段", -1)),
      _createVNode(_component_el_radio_group, {
        "model-value": __props.modelValue.timeMode || 'fixed',
        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => (update('timeMode', $event)))
      }, {
        default: _withCtx(() => [
          _createVNode(_component_el_radio, { value: "fixed" }, {
            default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
              _createTextVNode("固定时间段", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_radio, { value: "dynamic" }, {
            default: _withCtx(() => [...(_cache[14] || (_cache[14] = [
              _createTextVNode("动态时间段", -1)
            ]))]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["model-value"])
    ]),
    ((__props.modelValue.timeMode || 'fixed') === 'fixed')
      ? (_openBlock(), _createElementBlock("div", _hoisted_6, [
          _cache[16] || (_cache[16] = _createElementVNode("span", { class: "field-label" }, null, -1)),
          _createVNode(_component_el_time_picker, {
            "model-value": __props.modelValue.timeStart,
            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => (update('timeStart', $event))),
            format: "HH:mm",
            "value-format": "HH:mm",
            placeholder: "开始",
            style: {"width":"120px"}
          }, null, 8, ["model-value"]),
          _cache[17] || (_cache[17] = _createElementVNode("span", { class: "unit" }, "—", -1)),
          _createVNode(_component_el_time_picker, {
            "model-value": __props.modelValue.timeEnd,
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => (update('timeEnd', $event))),
            format: "HH:mm",
            "value-format": "HH:mm",
            placeholder: "结束",
            style: {"width":"120px"}
          }, null, 8, ["model-value"])
        ]))
      : (_openBlock(), _createElementBlock("div", _hoisted_7, [...(_cache[18] || (_cache[18] = [
          _createElementVNode("span", { class: "field-label" }, null, -1),
          _createElementVNode("span", { class: "unit" }, "从 SOP 触发时间起，往后 1 小时作为执行时间段（无需手动选择）", -1)
        ]))])),
    _createElementVNode("div", _hoisted_8, [
      _cache[20] || (_cache[20] = _createElementVNode("span", { class: "field-label" }, "首次执行", -1)),
      _createVNode(_component_el_checkbox, {
        "model-value": __props.modelValue.firstRun === 'next_day',
        "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event: any) => (update('firstRun', $event ? 'next_day' : 'same_day')))
      }, {
        default: _withCtx(() => [...(_cache[19] || (_cache[19] = [
          _createTextVNode("次日执行（勾选后今天不执行，从次日时间段开始）", -1)
        ]))]),
        _: 1
      }, 8, ["model-value"])
    ])
  ]))
}
}

})