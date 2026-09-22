import { defineComponent as _defineComponent } from 'vue'
import { resolveComponent as _resolveComponent, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, createElementBlock as _createElementBlock, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, withCtx as _withCtx, createVNode as _createVNode } from "vue"

const _hoisted_1 = { class: "task-list" }
const _hoisted_2 = { class: "task-main-info" }
const _hoisted_3 = { class: "task-header" }
const _hoisted_4 = { class: "task-title" }
const _hoisted_5 = { class: "task-grid" }
const _hoisted_6 = { class: "info-value" }
const _hoisted_7 = { class: "info-value" }
const _hoisted_8 = { class: "info-value sent" }
const _hoisted_9 = { class: "info-value" }
const _hoisted_10 = { class: "task-rule" }

interface TaskItem {
  id: string
  name: string
  createdAt: string
  account: string
  sentCount: number
  nextRunAt: string
  ruleDesc: string
}


export default /*@__PURE__*/_defineComponent({
  __name: 'TaskList',
  props: {
    tasks: {},
    runtimeEnabled: { type: Boolean, default: true },
    disabledReason: { default: '' }
  },
  emits: ["cancel"],
  setup(__props: any) {




return (_ctx: any,_cache: any) => {
  const _component_el_empty = _resolveComponent("el-empty")!
  const _component_el_button = _resolveComponent("el-button")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    (__props.tasks.length === 0)
      ? (_openBlock(), _createBlock(_component_el_empty, {
          key: 0,
          description: "暂无发朋友圈计划，请先创建"
        }))
      : (_openBlock(true), _createElementBlock(_Fragment, { key: 1 }, _renderList(__props.tasks, (task) => {
          return (_openBlock(), _createElementBlock("div", {
            key: task.id,
            class: "task-item"
          }, [
            _createElementVNode("div", _hoisted_2, [
              _createElementVNode("div", _hoisted_3, [
                _createElementVNode("div", _hoisted_4, [
                  _cache[0] || (_cache[0] = _createElementVNode("span", { class: "status-dot" }, null, -1)),
                  _createTextVNode(" " + _toDisplayString(task.name), 1)
                ]),
                _createVNode(_component_el_button, {
                  class: "cancel-btn",
                  type: "danger",
                  plain: "",
                  disabled: !__props.runtimeEnabled,
                  title: __props.disabledReason,
                  onClick: ($event: any) => (_ctx.$emit('cancel', task.id))
                }, {
                  default: _withCtx(() => [...(_cache[1] || (_cache[1] = [
                    _createTextVNode("取消任务", -1)
                  ]))]),
                  _: 1
                }, 8, ["disabled", "title", "onClick"])
              ]),
              _createElementVNode("div", _hoisted_5, [
                _createElementVNode("div", null, [
                  _cache[2] || (_cache[2] = _createElementVNode("span", { class: "info-label" }, "创建日期", -1)),
                  _createElementVNode("span", _hoisted_6, _toDisplayString(task.createdAt), 1)
                ]),
                _createElementVNode("div", null, [
                  _cache[3] || (_cache[3] = _createElementVNode("span", { class: "info-label" }, "微信账号", -1)),
                  _createElementVNode("span", _hoisted_7, _toDisplayString(task.account), 1)
                ]),
                _createElementVNode("div", null, [
                  _cache[4] || (_cache[4] = _createElementVNode("span", { class: "info-label" }, "任务进度", -1)),
                  _createElementVNode("span", _hoisted_8, "已发 " + _toDisplayString(task.sentCount) + " 次", 1)
                ]),
                _createElementVNode("div", null, [
                  _cache[5] || (_cache[5] = _createElementVNode("span", { class: "info-label" }, "下次执行", -1)),
                  _createElementVNode("span", _hoisted_9, _toDisplayString(task.nextRunAt), 1)
                ])
              ]),
              _createElementVNode("div", _hoisted_10, "执行规则：" + _toDisplayString(task.ruleDesc), 1)
            ])
          ]))
        }), 128))
  ]))
}
}

})