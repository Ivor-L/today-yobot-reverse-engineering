import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, createElementVNode as _createElementVNode, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, resolveDynamicComponent as _resolveDynamicComponent } from "vue"

const _hoisted_1 = { class: "sop-editor" }
const _hoisted_2 = { class: "editor-header" }
const _hoisted_3 = { class: "editor-body" }
const _hoisted_4 = {
  key: 1,
  class: "steps"
}
const _hoisted_5 = { class: "step-card" }
const _hoisted_6 = { class: "step-card-head" }
const _hoisted_7 = { class: "step-index" }
const _hoisted_8 = { class: "step-title" }
const _hoisted_9 = { class: "step-target" }
const _hoisted_10 = { class: "step-ops" }
const _hoisted_11 = { class: "step-card-body" }
const _hoisted_12 = {
  key: 0,
  class: "step-arrow"
}

import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Close, Top, Bottom, Plus } from '@element-plus/icons-vue'
import type {
  Sop,
  SopAction,
  SopActionAvailabilityMap,
  SopActionType,
  SopDataSources
} from '@/types/sop'
import { ACTION_REGISTRY, ACTION_ORDER } from './actionRegistry'


export default /*@__PURE__*/_defineComponent({
  __name: 'SopEditor',
  props: {
    modelValue: {},
    dataSources: {},
    runtimeEnabled: { type: Boolean },
    disabledReason: {},
    actionAvailability: {}
  },
  emits: ['save', 'cancel'],
  setup(__props: any, { emit: __emit }) {

const props = __props
const emit = __emit

// 编辑副本：保存才生效，返回则丢弃
const clone = (sop: Sop): Sop => JSON.parse(JSON.stringify(sop))
const draft = ref<Sop>(clone(props.modelValue))
watch(() => props.modelValue, (v) => { draft.value = clone(v) })

const meta = (type: SopActionType) => ACTION_REGISTRY[type]
const actionEnabled = (type: SopActionType) => props.actionAvailability[type]?.enabled === true
const actionReason = (type: SopActionType) => props.actionAvailability[type]?.reason || ''
const canAddAction = computed(() => (
  props.runtimeEnabled && ACTION_ORDER.some(actionEnabled)
))

// 适用目标类型 -> 简短标签（展示在动作标题右侧）
const targetsLabel = (type: SopActionType): string => {
  const t = ACTION_REGISTRY[type]?.targets || []
  const hasSingle = t.includes('single')
  const hasGroup = t.includes('group')
  if (hasSingle && hasGroup) return '单聊 / 群'
  if (hasSingle) return '仅单聊'
  if (hasGroup) return '仅群'
  return '—'
}

const addAction = (type: SopActionType) => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (!actionEnabled(type)) {
    ElMessage.warning(actionReason(type) || '当前版本暂不支持此动作')
    return
  }
  const action: SopAction = { type, params: ACTION_REGISTRY[type].defaultParams() }
  draft.value.actions.push(action)
}

const removeAction = (i: number) => {
  draft.value.actions.splice(i, 1)
}

const move = (i: number, dir: -1 | 1) => {
  const j = i + dir
  if (j < 0 || j >= draft.value.actions.length) return
  const arr = draft.value.actions
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

const handleSave = () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  const name = (draft.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请填写 SOP 名称')
    return
  }
  if (draft.value.actions.length === 0) {
    ElMessage.warning('请至少添加一个动作')
    return
  }
  for (let i = 0; i < draft.value.actions.length; i++) {
    const a = draft.value.actions[i]
    if (!actionEnabled(a.type)) {
      ElMessage.warning(`第 ${i + 1} 步：${actionReason(a.type) || '当前版本暂不支持此动作'}`)
      return
    }
    const err = ACTION_REGISTRY[a.type].validate(a.params)
    if (err) {
      ElMessage.warning(`第 ${i + 1} 步：${err}`)
      return
    }
  }
  emit('save', clone({ ...draft.value, name }))
}

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_empty = _resolveComponent("el-empty")!
  const _component_el_dropdown_item = _resolveComponent("el-dropdown-item")!
  const _component_el_dropdown_menu = _resolveComponent("el-dropdown-menu")!
  const _component_el_dropdown = _resolveComponent("el-dropdown")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _createVNode(_component_el_button, {
        text: "",
        icon: _unref(ArrowLeft),
        onClick: _cache[0] || (_cache[0] = ($event: any) => (emit('cancel')))
      }, {
        default: _withCtx(() => [...(_cache[2] || (_cache[2] = [
          _createTextVNode("返回", -1)
        ]))]),
        _: 1
      }, 8, ["icon"]),
      _createVNode(_component_el_input, {
        modelValue: draft.value.name,
        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((draft.value.name) = $event)),
        placeholder: "SOP 名称",
        class: "name-input",
        maxlength: "30",
        "show-word-limit": ""
      }, null, 8, ["modelValue"]),
      _createVNode(_component_el_button, {
        type: "primary",
        icon: _unref(Check),
        disabled: !__props.runtimeEnabled,
        title: __props.disabledReason,
        onClick: handleSave
      }, {
        default: _withCtx(() => [...(_cache[3] || (_cache[3] = [
          _createTextVNode("保存", -1)
        ]))]),
        _: 1
      }, 8, ["icon", "disabled", "title"])
    ]),
    _createElementVNode("div", _hoisted_3, [
      _cache[5] || (_cache[5] = _createElementVNode("div", { class: "editor-subtitle" }, "流程步骤（从上到下依次执行）", -1)),
      (draft.value.actions.length === 0)
        ? (_openBlock(), _createBlock(_component_el_empty, {
            key: 0,
            "image-size": 90,
            description: "还没有动作，点击下方「添加动作」开始编排",
            class: "empty-state"
          }))
        : (_openBlock(), _createElementBlock("div", _hoisted_4, [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(draft.value.actions, (action, i) => {
              return (_openBlock(), _createElementBlock(_Fragment, { key: i }, [
                _createElementVNode("div", _hoisted_5, [
                  _createElementVNode("div", _hoisted_6, [
                    _createElementVNode("span", _hoisted_7, _toDisplayString(i + 1), 1),
                    _createElementVNode("span", _hoisted_8, _toDisplayString(meta(action.type).title), 1),
                    _createElementVNode("span", {
                      class: _normalizeClass(["step-rpa", meta(action.type).isRpa ? 'rpa' : 'non-rpa'])
                    }, _toDisplayString(meta(action.type).isRpa ? 'RPA' : '非RPA'), 3),
                    _createElementVNode("span", _hoisted_9, "适用：" + _toDisplayString(targetsLabel(action.type)), 1),
                    _createElementVNode("div", _hoisted_10, [
                      _createVNode(_component_el_button, {
                        text: "",
                        icon: _unref(Top),
                        disabled: i === 0,
                        onClick: ($event: any) => (move(i, -1))
                      }, null, 8, ["icon", "disabled", "onClick"]),
                      _createVNode(_component_el_button, {
                        text: "",
                        icon: _unref(Bottom),
                        disabled: i === draft.value.actions.length - 1,
                        onClick: ($event: any) => (move(i, 1))
                      }, null, 8, ["icon", "disabled", "onClick"]),
                      _createVNode(_component_el_button, {
                        text: "",
                        type: "danger",
                        icon: _unref(Close),
                        onClick: ($event: any) => (removeAction(i))
                      }, null, 8, ["icon", "onClick"])
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_11, [
                    (_openBlock(), _createBlock(_resolveDynamicComponent(meta(action.type).component), {
                      modelValue: action.params,
                      "onUpdate:modelValue": ($event: any) => ((action.params) = $event),
                      "data-sources": __props.dataSources
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "data-sources"]))
                  ])
                ]),
                (i < draft.value.actions.length - 1)
                  ? (_openBlock(), _createElementBlock("div", _hoisted_12, "↓"))
                  : _createCommentVNode("", true)
              ], 64))
            }), 128))
          ])),
      _createVNode(_component_el_dropdown, {
        trigger: "click",
        onCommand: addAction,
        class: "add-dropdown"
      }, {
        dropdown: _withCtx(() => [
          _createVNode(_component_el_dropdown_menu, null, {
            default: _withCtx(() => [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_unref(ACTION_ORDER), (t) => {
                return (_openBlock(), _createBlock(_component_el_dropdown_item, {
                  key: t,
                  command: t,
                  disabled: !actionEnabled(t),
                  title: actionReason(t)
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(_toDisplayString(_unref(ACTION_REGISTRY)[t].title), 1)
                  ]),
                  _: 2
                }, 1032, ["command", "disabled", "title"]))
              }), 128))
            ]),
            _: 1
          })
        ]),
        default: _withCtx(() => [
          _createVNode(_component_el_button, {
            class: "add-action-btn",
            icon: _unref(Plus),
            disabled: !canAddAction.value,
            title: canAddAction.value ? '' : __props.disabledReason
          }, {
            default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
              _createTextVNode("添加动作", -1)
            ]))]),
            _: 1
          }, 8, ["icon", "disabled", "title"])
        ]),
        _: 1
      })
    ])
  ]))
}
}

})