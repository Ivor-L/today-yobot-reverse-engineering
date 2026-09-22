import {
  RuntimeCapabilityMap,
  RuntimeCapabilityMode,
  RuntimeCapabilityState,
  RuntimeCapabilityStatus
} from './types'

export const UI_FEATURE_IDS = [
  'startup.shell',
  'welcome.shell',
  'auto_reply.text',
  'customer.directory',
  'customer.friends',
  'customer.groups',
  'customer.sync',
  'customer.sync_friends',
  'customer.sync_groups',
  'customer.sync_schedule',
  'moments.read',
  'moments.publish',
  'automation.sop',
  'automation.sop_orchestration',
  'automation.sop_greeting',
  'automation.mass_send',
  'automation.group_invite',
  'automation.friend_request',
  'automation.friend_add',
  'automation.moment_comment',
  'automation.chat_collection',
  'automation.auto_follow',
  'automation.voice_send',
  'settings.common'
] as const

export type UiFeatureId = typeof UI_FEATURE_IDS[number]

export interface UiFeaturePolicy {
  alwaysAvailable?: boolean
  allOf?: readonly string[]
  anyOf?: readonly string[]
}

export type UiFeaturePolicyMap = Readonly<Record<string, UiFeaturePolicy>>

export type UiFeatureResolutionSource =
  | 'legacy_passthrough'
  | 'always_available'
  | 'runtime'

export interface ResolvedUiFeature {
  featureId: string
  enabled: boolean
  status: RuntimeCapabilityStatus
  reasonCode: string | null
  requiredPermissions: readonly string[]
  missingCapabilities: readonly string[]
  source: UiFeatureResolutionSource
}

export const UI_FEATURE_POLICIES: UiFeaturePolicyMap = {
  'startup.shell': { alwaysAvailable: true },
  'welcome.shell': { alwaysAvailable: true },
  'auto_reply.text': {
    allOf: [
      'instance.attach',
      'account.read_current',
      'conversation.list',
      'conversation.read',
      'message.send_text'
    ]
  },
  'customer.directory': {
    anyOf: ['contact.list', 'group.list']
  },
  'customer.friends': {
    allOf: ['contact.list']
  },
  'customer.groups': {
    allOf: ['group.list']
  },
  'customer.sync': {
    anyOf: ['contact.sync', 'group.sync']
  },
  'customer.sync_friends': {
    allOf: ['contact.sync']
  },
  'customer.sync_groups': {
    allOf: ['group.sync']
  },
  'customer.sync_schedule': {
    allOf: ['contact.sync.schedule']
  },
  'moments.read': {
    allOf: ['moments.read']
  },
  'moments.publish': {
    allOf: ['moments.publish']
  },
  'automation.sop': {
    anyOf: [
      'message.mass_send',
      'group.member.invite',
      'friend.request.accept',
      'friend.add',
      'moments.comment',
      'conversation.collect',
      'contact.auto_follow',
      'message.send_greeting_group'
    ]
  },
  'automation.sop_orchestration': {
    anyOf: [
      'group.member.invite',
      'message.send_greeting_group',
      'contact.auto_follow'
    ]
  },
  'automation.sop_greeting': {
    allOf: ['message.send_greeting_group']
  },
  'automation.mass_send': {
    allOf: ['message.mass_send']
  },
  'automation.group_invite': {
    allOf: ['group.member.invite']
  },
  'automation.friend_request': {
    allOf: ['friend.request.accept']
  },
  'automation.friend_add': {
    allOf: ['friend.add']
  },
  'automation.moment_comment': {
    allOf: ['moments.comment']
  },
  'automation.chat_collection': {
    allOf: ['conversation.collect']
  },
  'automation.auto_follow': {
    allOf: ['contact.auto_follow']
  },
  'automation.voice_send': {
    allOf: ['voice.send']
  },
  'settings.common': { alwaysAvailable: true }
}

const BLOCKED_STATUS_PRIORITY: Readonly<Record<RuntimeCapabilityStatus, number>> = {
  permission_required: 3,
  client_version_unsupported: 2,
  unavailable: 1,
  experimental: 0,
  supported: 0
}

function unique(items: readonly string[]): string[] {
  return [...new Set(items)]
}

function available(state: RuntimeCapabilityState | undefined): boolean {
  return state?.status === 'supported' || state?.status === 'experimental'
}

function missingState(capabilityName: string): RuntimeCapabilityState {
  return {
    status: 'unavailable',
    reasonCode: 'BUILD_CAPABILITY_NOT_DECLARED',
    requiredPermissions: []
  }
}

function selectBlockingState(
  states: readonly RuntimeCapabilityState[]
): RuntimeCapabilityState {
  return states.reduce((selected, state) => (
    BLOCKED_STATUS_PRIORITY[state.status] > BLOCKED_STATUS_PRIORITY[selected.status]
      ? state
      : selected
  ))
}

function validatePolicy(featureId: string, policy: UiFeaturePolicy): void {
  const allOf = policy.allOf || []
  const anyOf = policy.anyOf || []
  if (policy.alwaysAvailable && (allOf.length > 0 || anyOf.length > 0)) {
    throw new Error(`${featureId}: alwaysAvailable cannot be combined with requirements`)
  }
  if (!policy.alwaysAvailable && allOf.length === 0 && anyOf.length === 0) {
    throw new Error(`${featureId}: capability requirements are missing`)
  }
  const requirements = [...allOf, ...anyOf]
  if (requirements.some(item => typeof item !== 'string' || !item.trim())) {
    throw new Error(`${featureId}: capability names must be non-empty strings`)
  }
}

export function resolveUiFeature(
  featureId: string,
  mode: RuntimeCapabilityMode,
  capabilities: RuntimeCapabilityMap | null,
  policies: UiFeaturePolicyMap = UI_FEATURE_POLICIES
): ResolvedUiFeature {
  if (mode === 'legacy_passthrough') {
    return {
      featureId,
      enabled: true,
      status: 'supported',
      reasonCode: null,
      requiredPermissions: [],
      missingCapabilities: [],
      source: 'legacy_passthrough'
    }
  }

  const policy = policies[featureId]
  if (!policy) {
    return {
      featureId,
      enabled: false,
      status: 'unavailable',
      reasonCode: 'UI_FEATURE_POLICY_NOT_DECLARED',
      requiredPermissions: [],
      missingCapabilities: [],
      source: 'runtime'
    }
  }
  validatePolicy(featureId, policy)
  if (policy.alwaysAvailable) {
    return {
      featureId,
      enabled: true,
      status: 'supported',
      reasonCode: null,
      requiredPermissions: [],
      missingCapabilities: [],
      source: 'always_available'
    }
  }
  if (capabilities === null) {
    return {
      featureId,
      enabled: false,
      status: 'unavailable',
      reasonCode: 'RUNTIME_CONTRACT_UNAVAILABLE',
      requiredPermissions: [],
      missingCapabilities: [],
      source: 'runtime'
    }
  }

  const allOf = policy.allOf || []
  const anyOf = policy.anyOf || []
  const missingCapabilities = unique(
    [...allOf, ...anyOf].filter(name => capabilities[name] === undefined)
  )
  const allStates = allOf.map(name => capabilities[name] || missingState(name))
  const anyStates = anyOf.map(name => capabilities[name] || missingState(name))
  const allEnabled = allStates.every(available)
  const availableAnyStates = anyStates.filter(available)
  const anyEnabled = anyStates.length === 0 || availableAnyStates.length > 0
  const enabled = allEnabled && anyEnabled

  if (enabled) {
    const selectedAnyStates = availableAnyStates.some(state => state.status === 'supported')
      ? availableAnyStates.filter(state => state.status === 'supported')
      : availableAnyStates
    const selectedStates = [...allStates, ...selectedAnyStates]
    const experimental = selectedStates.find(state => state.status === 'experimental')
    return {
      featureId,
      enabled: true,
      status: experimental ? 'experimental' : 'supported',
      reasonCode: experimental?.reasonCode || null,
      requiredPermissions: unique(
        selectedStates.flatMap(state => [...state.requiredPermissions])
      ),
      missingCapabilities,
      source: 'runtime'
    }
  }

  const blockedAllStates = allStates.filter(state => !available(state))
  const blockedAnyStates = anyEnabled ? [] : anyStates.filter(state => !available(state))
  const blockedStates = [...blockedAllStates, ...blockedAnyStates]
  const selected = selectBlockingState(blockedStates)
  return {
    featureId,
    enabled: false,
    status: selected.status,
    reasonCode: selected.reasonCode || 'CAPABILITY_UNAVAILABLE',
    requiredPermissions: unique(
      blockedStates.flatMap(state => [...state.requiredPermissions])
    ),
    missingCapabilities,
    source: 'runtime'
  }
}

/** Preserve the configured order and never add a feature not offered by it. */
export function resolveConfiguredFeatures(
  configuredFeatureIds: readonly string[],
  mode: RuntimeCapabilityMode,
  capabilities: RuntimeCapabilityMap | null,
  policies: UiFeaturePolicyMap = UI_FEATURE_POLICIES
): readonly ResolvedUiFeature[] {
  return configuredFeatureIds.map(featureId => (
    resolveUiFeature(featureId, mode, capabilities, policies)
  ))
}
