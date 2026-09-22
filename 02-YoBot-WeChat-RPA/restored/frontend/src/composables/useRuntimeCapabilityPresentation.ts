import { computed } from 'vue'
import { ElMessage } from 'element-plus'

import { useRuntimeCapabilityStore } from '@/store/runtimeCapabilities'
import {
  resolveActionCapability,
  resolveUiFeature,
  isMacStrictRuntime as resolveMacStrictRuntime,
  runtimeCapabilityReasonText
} from '@/runtime/capabilities'

export function useRuntimeCapabilityPresentation() {
  const runtimeCapabilityStore = useRuntimeCapabilityStore()
  const isMacStrictRuntime = computed(() => resolveMacStrictRuntime(
    runtimeCapabilityStore.mode,
    runtimeCapabilityStore.snapshot?.platform
  ))

  const resolveFeature = (featureId: string) => resolveUiFeature(
    featureId,
    runtimeCapabilityStore.mode,
    runtimeCapabilityStore.capabilities
  )
  const resolveAction = (actionKey: string) => resolveActionCapability(
    actionKey,
    runtimeCapabilityStore.mode,
    runtimeCapabilityStore.capabilities
  )
  const isFeatureEnabled = (featureId: string) => resolveFeature(featureId).enabled
  const isActionEnabled = (actionKey: string) => resolveAction(actionKey).enabled
  const featureReason = (featureId: string) => {
    const resolution = resolveFeature(featureId)
    return resolution.enabled ? '' : runtimeCapabilityReasonText(resolution)
  }
  const actionReason = (actionKey: string) => {
    const resolution = resolveAction(actionKey)
    return resolution.enabled ? '' : runtimeCapabilityReasonText(resolution)
  }
  const requireFeature = (featureId: string): boolean => {
    const resolution = resolveFeature(featureId)
    if (resolution.enabled) return true
    ElMessage.warning(runtimeCapabilityReasonText(resolution))
    return false
  }
  const requireAction = (actionKey: string): boolean => {
    const resolution = resolveAction(actionKey)
    if (resolution.enabled) return true
    ElMessage.warning(runtimeCapabilityReasonText(resolution))
    return false
  }

  return {
    resolveFeature,
    resolveAction,
    isFeatureEnabled,
    isActionEnabled,
    featureReason,
    actionReason,
    requireFeature,
    requireAction,
    isMacStrictRuntime
  }
}
