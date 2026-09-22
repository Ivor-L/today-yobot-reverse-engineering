<template>
  <RuntimeStartupPage v-if="useRuntimeStartupPresentation" />
  <LegacyStartupPage v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/store/config'
import { useRuntimeCapabilityStore } from '@/store/runtimeCapabilities'
import LegacyStartupPage from './StartupPage.vue'
import RuntimeStartupPage from './RuntimeStartupPage.vue'

const configStore = useConfigStore()
const runtimeCapabilityStore = useRuntimeCapabilityStore()
const useRuntimeStartupPresentation = computed(() => (
  runtimeCapabilityStore.mode === 'runtime_required'
  && configStore.config.startup?.presentation !== 'classic'
))
</script>
