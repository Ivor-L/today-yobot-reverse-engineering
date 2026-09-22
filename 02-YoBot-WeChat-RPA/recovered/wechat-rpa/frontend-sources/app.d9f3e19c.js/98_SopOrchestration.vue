import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, unref as _unref, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, createBlock as _createBlock, createCommentVNode as _createCommentVNode, resolveDirective as _resolveDirective, withDirectives as _withDirectives } from "vue"

const _hoisted_1 = { class: "sop-orchestration" }
const _hoisted_2 = { class: "sop-title-bar" }
const _hoisted_3 = { class: "sop-list" }
const _hoisted_4 = { class: "sop-row-icon" }
const _hoisted_5 = { class: "sop-row-main" }
const _hoisted_6 = { class: "sop-name" }
const _hoisted_7 = { class: "sop-actions-summary" }
const _hoisted_8 = { class: "sop-row-ops" }

import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Operation } from '@element-plus/icons-vue'
import type { Sop, SopActionAvailabilityMap, SopDataSources } from '@/types/sop'
import { loadSops, saveSops } from '@/api/sop'
import { actionTitle } from './actionRegistry'
import SopEditor from './SopEditor.vue'


export default /*@__PURE__*/_defineComponent({
  __name: 'SopOrchestration',
  props: {
    greetingGroups: {},
    cozeAgents: {},
    groups: {},
    runtimeEnabled: { type: Boolean },
    disabledReason: {},
    actionAvailability: {}
  },
  setup(__props: any) {

const props = __props

const requireRuntime = () => {
  if (props.runtimeEnabled) return true
  ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
  return false
}

const dataSources = computed<SopDataSources>(() => ({
  greetingGroups: props.greetingGroups || [],
  cozeAgents: props.cozeAgents || [],
  groups: props.groups || [],
}))

const sops = ref<Sop[]>([])
const loading = ref(false)
const view = ref<'list' | 'edit'>('list')
const editing = ref<Sop>({ id: '', name: '', actions: [] })

const summary = (sop: Sop) =>
  (sop.actions || []).map((a) => actionTitle(a.type)).join(' › ') || '（空）'

const refresh = async () => {
  loading.value = true
  try {
    sops.value = await loadSops()
  } finally {
    loading.value = false
  }
}

const genId = () => `sop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createSop = () => {
  if (!requireRuntime()) return
  editing.value = { id: genId(), name: '', actions: [] }
  view.value = 'edit'
}

const editSop = (sop: Sop) => {
  if (!requireRuntime()) return
  editing.value = sop
  view.value = 'edit'
}

const handleSave = async (sop: Sop) => {
  if (!requireRuntime()) return
  // 重名校验（排除自身）
  if (sops.value.some((s) => s.id !== sop.id && s.name === sop.name)) {
    ElMessage.warning('已存在同名 SOP，请换个名字')
    return
  }
  const idx = sops.value.findIndex((s) => s.id === sop.id)
  if (idx >= 0) sops.value[idx] = sop
  else sops.value.push(sop)
  try {
    await saveSops(sops.value)
    ElMessage.success('已保存')
    view.value = 'list'
  } catch (e) {
    ElMessage.error('保存失败')
    await refresh()
  }
}

const removeSop = async (sop: Sop) => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(`确定删除 SOP「${sop.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  sops.value = sops.value.filter((s) => s.id !== sop.id)
  try {
    await saveSops(sops.value)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error('删除失败')
    await refresh()
  }
}

onMounted(() => {
  if (props.runtimeEnabled) refresh()
})

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_tooltip = _resolveComponent("el-tooltip")!
  const _component_el_empty = _resolveComponent("el-empty")!
  const _directive_loading = _resolveDirective("loading")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    (view.value === 'list')
      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
          _createElementVNode("div", _hoisted_2, [
            _cache[2] || (_cache[2] = _createElementVNode("span", null, "SOP编排", -1)),
            _createVNode(_component_el_button, {
              type: "primary",
              icon: _unref(Plus),
              disabled: !__props.runtimeEnabled,
              title: __props.disabledReason,
              onClick: createSop
            }, {
              default: _withCtx(() => [...(_cache[1] || (_cache[1] = [
                _createTextVNode("新建SOP", -1)
              ]))]),
              _: 1
            }, 8, ["icon", "disabled", "title"])
          ]),
          _cache[3] || (_cache[3] = _createElementVNode("p", { class: "sop-desc" }, " 为不同触发场景（如新进群）编排一组有序的自动化动作，触发后按从上到下的顺序依次执行（如发打招呼、创建跟单等）。 ", -1)),
          _withDirectives((_openBlock(), _createElementBlock("div", _hoisted_3, [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(sops.value, (sop) => {
              return (_openBlock(), _createElementBlock("div", {
                key: sop.id,
                class: "sop-row"
              }, [
                _createElementVNode("div", _hoisted_4, [
                  _createVNode(_component_el_icon, null, {
                    default: _withCtx(() => [
                      _createVNode(_unref(Operation))
                    ]),
                    _: 1
                  })
                ]),
                _createElementVNode("div", _hoisted_5, [
                  _createElementVNode("div", _hoisted_6, _toDisplayString(sop.name), 1),
                  _createElementVNode("div", _hoisted_7, _toDisplayString(summary(sop)), 1)
                ]),
                _createElementVNode("div", _hoisted_8, [
                  _createVNode(_component_el_tooltip, {
                    content: "编辑",
                    placement: "top"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_button, {
                        text: "",
                        type: "primary",
                        icon: _unref(Edit),
                        circle: "",
                        disabled: !__props.runtimeEnabled,
                        title: __props.disabledReason,
                        onClick: ($event: any) => (editSop(sop))
                      }, null, 8, ["icon", "disabled", "title", "onClick"])
                    ]),
                    _: 2
                  }, 1024),
                  _createVNode(_component_el_tooltip, {
                    content: "删除",
                    placement: "top"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_button, {
                        text: "",
                        type: "danger",
                        icon: _unref(Delete),
                        circle: "",
                        disabled: !__props.runtimeEnabled,
                        title: __props.disabledReason,
                        onClick: ($event: any) => (removeSop(sop))
                      }, null, 8, ["icon", "disabled", "title", "onClick"])
                    ]),
                    _: 2
                  }, 1024)
                ])
              ]))
            }), 128)),
            (!loading.value && sops.value.length === 0)
              ? (_openBlock(), _createBlock(_component_el_empty, {
                  key: 0,
                  description: "还没有 SOP，点击右上角新建"
                }))
              : _createCommentVNode("", true)
          ])), [
            [_directive_loading, loading.value]
          ])
        ], 64))
      : (_openBlock(), _createBlock(SopEditor, {
          key: 1,
          "model-value": editing.value,
          "data-sources": dataSources.value,
          "runtime-enabled": __props.runtimeEnabled,
          "disabled-reason": __props.disabledReason,
          "action-availability": __props.actionAvailability,
          onSave: handleSave,
          onCancel: _cache[0] || (_cache[0] = ($event: any) => (view.value = 'list'))
        }, null, 8, ["model-value", "data-sources", "runtime-enabled", "disabled-reason", "action-availability"]))
  ]))
}
}

})