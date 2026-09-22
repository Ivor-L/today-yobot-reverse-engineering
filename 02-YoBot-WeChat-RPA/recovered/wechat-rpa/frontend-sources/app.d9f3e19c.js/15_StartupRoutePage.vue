import { defineComponent as _defineComponent } from 'vue'
import { openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode } from "vue"

import { computed } from 'vue'
import { useConfigStore } from '@/store/config'
import { useRuntimeCapabilityStore } from '@/store/runtimeCapabilities'
import LegacyStartupPage from './StartupPage.vue'
import RuntimeStartupPage from './RuntimeStartupPage.vue'


export default /*@__PURE__*/_defineComponent({
  __name: 'StartupRoutePage',
  setup(__props) {

const configStore = useConfigStore()
const runtimeCapabilityStore = useRuntimeCapabilityStore()
const useRuntimeStartupPresentation = computed(() => (
  runtimeCapabilityStore.mode === 'runtime_required'
  && configStore.config.startup?.presentation !== 'classic'
))

return (_ctx: any,_cache: any) => {
  return (useRuntimeStartupPresentation.value)
    ? (_openBlock(), _createBlock(RuntimeStartupPage, { key: 0 }))
    : (_openBlock(), _createBlock(LegacyStartupPage, { key: 1 }))
}
}

})