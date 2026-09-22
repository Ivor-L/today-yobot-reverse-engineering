import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, normalizeClass as _normalizeClass, createTextVNode as _createTextVNode, createBlock as _createBlock } from "vue"

const _hoisted_1 = { class: "info-text" }
const _hoisted_2 = { class: "account-status-content" }
const _hoisted_3 = { class: "account-list" }
const _hoisted_4 = { class: "account-header" }
const _hoisted_5 = { class: "account-info" }
const _hoisted_6 = { class: "account-label" }
const _hoisted_7 = { class: "account-id" }
const _hoisted_8 = { class: "account-nickname" }
const _hoisted_9 = { class: "status-list" }
const _hoisted_10 = { class: "status-item" }
const _hoisted_11 = { class: "status-item" }
const _hoisted_12 = { class: "dialog-footer" }

import { computed } from 'vue'

interface AccountStatus {
  account_id: string
  nickname: string
  sync_status: {
    synced: boolean
    expired: boolean
    message: string
    error: boolean
  }
  ai_status: {
    configured: boolean
    count: number
    message: string
    error: boolean
  }
}

interface Props {
  visible: boolean
  accountList: AccountStatus[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
}


export default /*@__PURE__*/_defineComponent({
  __name: 'AccountStatusDialog',
  props: {
    visible: { type: Boolean },
    accountList: {}
  },
  emits: ["update:visible", "confirm"],
  setup(__props: any, { emit: __emit }) {

const props = __props
const emit = __emit

// 使用computed属性处理v-model
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

// 获取账号状态标签
const getAccountStatusLabel = (account: AccountStatus) => {
  const hasError = account.sync_status.error || account.ai_status.error
  return hasError ? '异常账号' : '正常账号'
}

// 处理确认按钮点击
const handleConfirm = () => {
  emit('confirm')
  emit('update:visible', false)
}

return (_ctx: any,_cache: any) => {
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: dialogVisible.value,
    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((dialogVisible).value = $event)),
    title: "AI自动回复检查项提醒",
    width: "600px",
    "close-on-click-modal": false,
    class: "account-status-dialog"
  }, {
    default: _withCtx(() => [
      _createVNode(_component_el_alert, {
        type: "info",
        "show-icon": "",
        closable: false,
        class: "status-info-banner"
      }, {
        default: _withCtx(() => [
          _createElementVNode("span", _hoisted_1, "检测到已登录 " + _toDisplayString(__props.accountList.length) + " 个账号，请按指引完善配置后，重新开启自动回复", 1)
        ]),
        _: 1
      }),
      _createElementVNode("div", _hoisted_2, [
        _createElementVNode("div", _hoisted_3, [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(__props.accountList, (account) => {
            return (_openBlock(), _createElementBlock("div", {
              key: account.account_id,
              class: "account-item"
            }, [
              _createElementVNode("div", _hoisted_4, [
                _createElementVNode("div", _hoisted_5, [
                  _createElementVNode("span", _hoisted_6, _toDisplayString(getAccountStatusLabel(account)) + "：", 1),
                  _createElementVNode("span", _hoisted_7, _toDisplayString(account.account_id), 1),
                  _createElementVNode("span", _hoisted_8, "(" + _toDisplayString(account.nickname) + ")", 1)
                ])
              ]),
              _createElementVNode("div", _hoisted_9, [
                _createElementVNode("div", _hoisted_10, [
                  _createElementVNode("span", {
                    class: _normalizeClass(["status-text", { 'error-text': account.sync_status.error }])
                  }, _toDisplayString(account.sync_status.message), 3)
                ]),
                _createElementVNode("div", _hoisted_11, [
                  _createElementVNode("span", {
                    class: _normalizeClass(["status-text", { 'error-text': account.ai_status.error }])
                  }, _toDisplayString(account.ai_status.message), 3)
                ])
              ])
            ]))
          }), 128))
        ]),
        _createElementVNode("div", _hoisted_12, [
          _createVNode(_component_el_button, {
            type: "primary",
            class: "confirm-button",
            onClick: handleConfirm
          }, {
            default: _withCtx(() => [...(_cache[1] || (_cache[1] = [
              _createTextVNode(" 好的 ", -1)
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