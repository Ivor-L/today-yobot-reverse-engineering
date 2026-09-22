import { defineComponent as _defineComponent } from 'vue'
import { openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, resolveDynamicComponent as _resolveDynamicComponent, createElementVNode as _createElementVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "app-container" }
const _hoisted_2 = { class: "main-content" }

import { computed, ref, provide,onErrorCaptured } from 'vue'
import { getBrandConfig } from '@/config/brand'
import { useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import ReconnectDialog from '@/components/ReconnectDialog.vue'
import GlobalServerAlert from '@/components/GlobalServerAlert.vue'

export default /*@__PURE__*/_defineComponent({
  __name: 'App',
  setup(__props) {

const route = useRoute()
const isStartupPage = computed(() => route.name === 'StartupPage')
const isAgentPage = computed(() => route.path.startsWith('/agent') || route.path.includes('dashboard'))
const reconnectDialog = ref()
const brandConfig = ref(getBrandConfig())
provide('brandConfig', brandConfig)

const showReconnectDialog = () => {
  reconnectDialog.value?.show()
}
onErrorCaptured((err, instance, info) => {
  console.error('Vue 错误:', err)
  console.log('错误组件:', instance)
  console.log('错误信息:', info)
  return false
})
// 将方法提供给所有子组件
provide('showReconnectDialog', showReconnectDialog)
provide('brandConfig', brandConfig)
  
return (_ctx: any,_cache: any) => {
  const _component_router_view = _resolveComponent("router-view")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    (!isStartupPage.value && !isAgentPage.value)
      ? (_openBlock(), _createBlock(NavBar, { key: 0 }))
      : _createCommentVNode("", true),
    _createVNode(_component_router_view, null, {
      default: _withCtx(({ Component }) => [
        _createElementVNode("div", _hoisted_2, [
          (_openBlock(), _createBlock(_resolveDynamicComponent(Component)))
        ])
      ]),
      _: 1
    }),
    _createVNode(ReconnectDialog, {
      ref_key: "reconnectDialog",
      ref: reconnectDialog
    }, null, 512),
    _createVNode(GlobalServerAlert)
  ]))
}
}

})