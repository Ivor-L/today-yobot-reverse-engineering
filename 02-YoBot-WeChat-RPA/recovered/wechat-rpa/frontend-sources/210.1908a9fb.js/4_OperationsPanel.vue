import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, resolveComponent as _resolveComponent, createVNode as _createVNode, createStaticVNode as _createStaticVNode } from "vue"

const _hoisted_1 = { class: "operations-panel" }
const _hoisted_2 = { class: "panel-content" }
const _hoisted_3 = { class: "horizontal-operations" }
const _hoisted_4 = { class: "mass-send-section" }
const _hoisted_5 = ["disabled", "title"]
const _hoisted_6 = { class: "batch-operations-section" }
const _hoisted_7 = { class: "batch-buttons" }
const _hoisted_8 = ["disabled", "title"]
const _hoisted_9 = ["disabled", "title"]
const _hoisted_10 = { class: "settings-section" }
const _hoisted_11 = ["disabled", "title"]
const _hoisted_12 = { class: "settings-content" }
const _hoisted_13 = {
  key: 0,
  class: "settings-status"
}
const _hoisted_14 = {
  key: 0,
  class: "operation-tips"
}

import { computed, ref, onMounted } from 'vue'
import { getSyncContactsTaskStatus } from '@/api/syncContacts'

// Props
interface Props {
  selectedFriends: string[]
  selectedGroups: string[]
  massSendEnabled?: boolean
  massSendDisabledReason?: string
  batchGroupEnabled?: boolean
  batchGroupDisabledReason?: string
  autoFollowEnabled?: boolean
  autoFollowDisabledReason?: string
  syncEnabled?: boolean
  syncDisabledReason?: string
  scheduledSyncEnabled?: boolean
}


export default /*@__PURE__*/_defineComponent({
  __name: 'OperationsPanel',
  props: {
    selectedFriends: { default: () => [] },
    selectedGroups: { default: () => [] },
    massSendEnabled: { type: Boolean, default: true },
    massSendDisabledReason: { default: '' },
    batchGroupEnabled: { type: Boolean, default: true },
    batchGroupDisabledReason: { default: '' },
    autoFollowEnabled: { type: Boolean, default: true },
    autoFollowDisabledReason: { default: '' },
    syncEnabled: { type: Boolean, default: true },
    syncDisabledReason: { default: '' },
    scheduledSyncEnabled: { type: Boolean, default: true }
  },
  emits: ["mass-send", "batch-group", "auto-follow", "batch-tag", "delete", "open-settings"],
  setup(__props: any, { emit: __emit }) {

const props = __props

// Emits
const emit = __emit

// 自动同步状态
const autoSyncEnabled = ref(false)

// 检查自动同步状态
const checkAutoSyncStatus = async () => {
  try {
    const activeTask = await getSyncContactsTaskStatus()
    autoSyncEnabled.value = !!activeTask
  } catch (error) {
    console.error('查询自动同步状态失败:', error)
    autoSyncEnabled.value = false
  }
}

// 计算属性
const hasSelections = computed(() => {
  return props.selectedFriends.length > 0 || props.selectedGroups.length > 0
})

const hasFriends = computed(() => props.selectedFriends.length > 0)
const hasGroups = computed(() => props.selectedGroups.length > 0)
const hasBothTypes = computed(() => hasFriends.value && hasGroups.value)

// 操作按钮可用性
const canMassSend = computed(() => hasSelections.value)
const canBatchGroup = computed(() => hasFriends.value && !hasGroups.value)
const canAutoFollow = computed(() => hasSelections.value)
const canBatchTag = computed(() => hasFriends.value && !hasGroups.value)
const canDelete = computed(() => hasSelections.value)

const allOperationsAvailable = computed(() => {
  return !hasBothTypes.value
})

const operationTip = computed(() => {
  if (hasBothTypes.value) {
    return '部分操作仅支持好友'
  }
  if (hasGroups.value && !hasFriends.value) {
    return '部分操作仅支持好友'
  }
  return ''
})

// 组件挂载时检查自动同步状态
onMounted(() => {
  if (props.syncEnabled && props.scheduledSyncEnabled) checkAutoSyncStatus()
})

return (_ctx: any,_cache: any) => {
  const _component_el_alert = _resolveComponent("el-alert")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _cache[11] || (_cache[11] = _createElementVNode("div", { class: "panel-header" }, [
      _createElementVNode("h3", { class: "panel-title" }, "批量操作")
    ], -1)),
    _createElementVNode("div", _hoisted_2, [
      _createElementVNode("div", _hoisted_3, [
        _createElementVNode("div", _hoisted_4, [
          _createElementVNode("button", {
            disabled: !canMassSend.value || !__props.massSendEnabled,
            title: __props.massSendEnabled ? '' : __props.massSendDisabledReason,
            onClick: _cache[0] || (_cache[0] = ($event: any) => (_ctx.$emit('mass-send'))),
            class: "action-btn action-btn-primary"
          }, [...(_cache[4] || (_cache[4] = [
            _createElementVNode("svg", {
              class: "action-btn-icon",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2"
            }, [
              _createElementVNode("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }),
              _createElementVNode("path", { d: "M8 10h8M8 14h4" })
            ], -1),
            _createElementVNode("span", { class: "action-btn-text" }, "群发消息", -1)
          ]))], 8, _hoisted_5)
        ]),
        _cache[9] || (_cache[9] = _createElementVNode("div", { class: "vertical-divider" }, null, -1)),
        _createElementVNode("div", _hoisted_6, [
          _createElementVNode("div", _hoisted_7, [
            _createElementVNode("button", {
              disabled: !canBatchGroup.value || !__props.batchGroupEnabled,
              title: __props.batchGroupEnabled ? '' : __props.batchGroupDisabledReason,
              onClick: _cache[1] || (_cache[1] = ($event: any) => (_ctx.$emit('batch-group'))),
              class: "action-btn action-btn-secondary batch-btn"
            }, [...(_cache[5] || (_cache[5] = [
              _createElementVNode("svg", {
                class: "action-btn-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2"
              }, [
                _createElementVNode("path", { d: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" })
              ], -1),
              _createElementVNode("span", { class: "action-btn-text" }, "批量拉群", -1)
            ]))], 8, _hoisted_8),
            _createElementVNode("button", {
              disabled: !canAutoFollow.value || !__props.autoFollowEnabled,
              title: __props.autoFollowEnabled ? '' : __props.autoFollowDisabledReason,
              onClick: _cache[2] || (_cache[2] = ($event: any) => (_ctx.$emit('auto-follow'))),
              class: "action-btn action-btn-secondary batch-btn"
            }, [...(_cache[6] || (_cache[6] = [
              _createElementVNode("svg", {
                class: "action-btn-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2"
              }, [
                _createElementVNode("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
                _createElementVNode("circle", {
                  cx: "12",
                  cy: "7",
                  r: "4"
                })
              ], -1),
              _createElementVNode("span", { class: "action-btn-text" }, "自动跟进", -1)
            ]))], 8, _hoisted_9)
          ])
        ]),
        _cache[10] || (_cache[10] = _createElementVNode("div", { class: "vertical-divider" }, null, -1)),
        _createElementVNode("div", _hoisted_10, [
          _createElementVNode("button", {
            disabled: !__props.syncEnabled,
            title: __props.syncEnabled ? '' : __props.syncDisabledReason,
            onClick: _cache[3] || (_cache[3] = ($event: any) => (_ctx.$emit('open-settings'))),
            class: "settings-btn"
          }, [
            _createElementVNode("div", _hoisted_12, [
              _cache[8] || (_cache[8] = _createStaticVNode("<div class=\"settings-icon-title\" data-v-63028f00><svg class=\"settings-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" data-v-63028f00><circle cx=\"12\" cy=\"12\" r=\"3\" data-v-63028f00></circle><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z\" data-v-63028f00></path></svg><span class=\"settings-title\" data-v-63028f00>同步</span></div>", 1)),
              (autoSyncEnabled.value)
                ? (_openBlock(), _createElementBlock("div", _hoisted_13, [...(_cache[7] || (_cache[7] = [
                    _createElementVNode("span", { class: "status-text" }, "自动同步", -1)
                  ]))]))
                : _createCommentVNode("", true)
            ])
          ], 8, _hoisted_11)
        ])
      ]),
      (hasSelections.value && !allOperationsAvailable.value)
        ? (_openBlock(), _createElementBlock("div", _hoisted_14, [
            _createVNode(_component_el_alert, {
              title: operationTip.value,
              type: "info",
              closable: false,
              "show-icon": "",
              class: "tip-alert"
            }, null, 8, ["title"])
          ]))
        : _createCommentVNode("", true)
    ])
  ]))
}
}

})