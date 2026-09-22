import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, renderList as _renderList, Fragment as _Fragment } from "vue"

const _hoisted_1 = { class: "selected-targets-panel" }
const _hoisted_2 = { class: "panel-header" }
const _hoisted_3 = { class: "header-actions" }
const _hoisted_4 = { class: "panel-content" }
const _hoisted_5 = {
  key: 0,
  class: "empty-state"
}
const _hoisted_6 = {
  key: 1,
  class: "selections-container"
}
const _hoisted_7 = {
  key: 0,
  class: "selection-group"
}
const _hoisted_8 = { class: "group-header" }
const _hoisted_9 = { class: "group-title" }
const _hoisted_10 = { class: "count-badge" }
const _hoisted_11 = { class: "selected-items horizontal-items" }
const _hoisted_12 = { class: "item-name" }
const _hoisted_13 = {
  key: 0,
  class: "more-items"
}
const _hoisted_14 = { class: "more-text" }
const _hoisted_15 = {
  key: 1,
  class: "selection-group"
}
const _hoisted_16 = { class: "group-header" }
const _hoisted_17 = { class: "group-title" }
const _hoisted_18 = { class: "count-badge" }
const _hoisted_19 = { class: "selected-items horizontal-items" }
const _hoisted_20 = { class: "item-name" }
const _hoisted_21 = {
  key: 0,
  class: "more-items"
}
const _hoisted_22 = { class: "more-text" }

import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'

// Props
interface Props {
  selectedFriends: string[]
  selectedGroups: string[]
  groupTagEnabled?: boolean
  groupTagDisabledReason?: string
}

const maxDisplayItems = 5

// 计算属性

export default /*@__PURE__*/_defineComponent({
  __name: 'SelectedTargetsPanel',
  props: {
    selectedFriends: { default: () => [] },
    selectedGroups: { default: () => [] },
    groupTagEnabled: { type: Boolean, default: true },
    groupTagDisabledReason: { default: '' }
  },
  emits: ["remove-friend", "remove-group", "clear-all", "set-group-tag"],
  setup(__props: any, { emit: __emit }) {

const props = __props

// Emits
const emit = __emit

// 常量
const hasSelections = computed(() => {
  return props.selectedFriends.length > 0 || props.selectedGroups.length > 0
})

const canSetGroupTag = computed(() => {
  return props.selectedGroups.length > 0 && props.selectedFriends.length === 0
})

const displayedFriends = computed(() => {
  return props.selectedFriends.slice(0, maxDisplayItems)
})

const displayedGroups = computed(() => {
  return props.selectedGroups.slice(0, maxDisplayItems)
})

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _cache[4] || (_cache[4] = _createElementVNode("h3", { class: "panel-title" }, "选择目标", -1)),
      _createElementVNode("div", _hoisted_3, [
        _createVNode(_component_el_button, {
          type: "primary",
          plain: "",
          size: "small",
          class: "set-group-tag-btn",
          disabled: !canSetGroupTag.value || !__props.groupTagEnabled,
          title: __props.groupTagEnabled ? '' : __props.groupTagDisabledReason,
          onClick: _cache[0] || (_cache[0] = ($event: any) => (_ctx.$emit('set-group-tag')))
        }, {
          default: _withCtx(() => [...(_cache[2] || (_cache[2] = [
            _createTextVNode(" 设置群标签 ", -1)
          ]))]),
          _: 1
        }, 8, ["disabled", "title"]),
        _createVNode(_component_el_button, {
          link: "",
          onClick: _cache[1] || (_cache[1] = ($event: any) => (_ctx.$emit('clear-all'))),
          class: "clear-all-btn",
          size: "small"
        }, {
          default: _withCtx(() => [...(_cache[3] || (_cache[3] = [
            _createTextVNode(" 清空 ", -1)
          ]))]),
          _: 1
        })
      ])
    ]),
    _createElementVNode("div", _hoisted_4, [
      (!hasSelections.value)
        ? (_openBlock(), _createElementBlock("div", _hoisted_5, [...(_cache[5] || (_cache[5] = [
            _createElementVNode("div", { class: "empty-icon" }, "📋", -1),
            _createElementVNode("div", { class: "empty-text" }, "选择好友或群聊", -1),
            _createElementVNode("div", { class: "empty-hint" }, "进行批量操作", -1)
          ]))]))
        : _createCommentVNode("", true),
      (hasSelections.value)
        ? (_openBlock(), _createElementBlock("div", _hoisted_6, [
            (__props.selectedFriends.length > 0)
              ? (_openBlock(), _createElementBlock("div", _hoisted_7, [
                  _createElementVNode("div", _hoisted_8, [
                    _createElementVNode("div", _hoisted_9, [
                      _cache[6] || (_cache[6] = _createElementVNode("span", { class: "title-text" }, "已选择的好友", -1)),
                      _createElementVNode("span", _hoisted_10, _toDisplayString(__props.selectedFriends.length), 1)
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_11, [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(displayedFriends.value, (friend) => {
                      return (_openBlock(), _createElementBlock("div", {
                        key: friend,
                        class: "selected-item friend-item"
                      }, [
                        _createElementVNode("span", _hoisted_12, _toDisplayString(friend), 1)
                      ]))
                    }), 128)),
                    (__props.selectedFriends.length > maxDisplayItems)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_13, [
                          _createElementVNode("span", _hoisted_14, "...等" + _toDisplayString(__props.selectedFriends.length) + "人", 1)
                        ]))
                      : _createCommentVNode("", true)
                  ])
                ]))
              : _createCommentVNode("", true),
            (__props.selectedGroups.length > 0)
              ? (_openBlock(), _createElementBlock("div", _hoisted_15, [
                  _createElementVNode("div", _hoisted_16, [
                    _createElementVNode("div", _hoisted_17, [
                      _cache[7] || (_cache[7] = _createElementVNode("span", { class: "title-text" }, "已选择的群聊", -1)),
                      _createElementVNode("span", _hoisted_18, _toDisplayString(__props.selectedGroups.length), 1)
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_19, [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(displayedGroups.value, (group) => {
                      return (_openBlock(), _createElementBlock("div", {
                        key: group,
                        class: "selected-item group-item"
                      }, [
                        _createElementVNode("span", _hoisted_20, _toDisplayString(group), 1)
                      ]))
                    }), 128)),
                    (__props.selectedGroups.length > maxDisplayItems)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_21, [
                          _createElementVNode("span", _hoisted_22, "...等" + _toDisplayString(__props.selectedGroups.length) + "个群", 1)
                        ]))
                      : _createCommentVNode("", true)
                  ])
                ]))
              : _createCommentVNode("", true)
          ]))
        : _createCommentVNode("", true)
    ])
  ]))
}
}

})