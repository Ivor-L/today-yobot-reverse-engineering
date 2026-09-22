export const RUNTIME_CAPABILITY_STATUSES = [
  'supported',
  'experimental',
  'permission_required',
  'client_version_unsupported',
  'unavailable'
] as const

export type RuntimeCapabilityStatus = typeof RUNTIME_CAPABILITY_STATUSES[number]

export const RUNTIME_CAPABILITY_MODES = [
  'legacy_passthrough',
  'runtime_required'
] as const

export type RuntimeCapabilityMode = typeof RUNTIME_CAPABILITY_MODES[number]

export interface RuntimeCapabilityState {
  status: RuntimeCapabilityStatus
  reasonCode: string | null
  requiredPermissions: readonly string[]
}

export type RuntimeCapabilityMap = Readonly<Record<string, RuntimeCapabilityState>>

export interface RuntimeCapabilitiesSnapshot {
  contractVersion: string
  platform: string
  arch: string
  driverId: string
  driverApiVersion: string
  capabilities: RuntimeCapabilityMap
}

export interface RuntimeCapabilitiesResponse {
  success: true
  data: RuntimeCapabilitiesSnapshot
}

export type RuntimeCapabilityLoadState =
  | 'idle'
  | 'legacy_passthrough'
  | 'loading'
  | 'ready'
  | 'contract_error'

export interface RuntimeCapabilityModeResolution {
  mode: RuntimeCapabilityMode
  warningCode: string | null
}

export const RUNTIME_CAPABILITY_MODE_MISSING = 'RUNTIME_CAPABILITY_MODE_MISSING'
export const RUNTIME_CAPABILITY_MODE_INVALID = 'RUNTIME_CAPABILITY_MODE_INVALID'

export function isRuntimeCapabilityStatus(value: unknown): value is RuntimeCapabilityStatus {
  return typeof value === 'string' && (
    RUNTIME_CAPABILITY_STATUSES as readonly string[]
  ).includes(value)
}

export function isRuntimeCapabilityMode(value: unknown): value is RuntimeCapabilityMode {
  return typeof value === 'string' && (
    RUNTIME_CAPABILITY_MODES as readonly string[]
  ).includes(value)
}

/**
 * Keep existing Windows/OEM configs compatible during migration. Unknown
 * explicit values are not treated as legacy: they enter strict mode and let
 * the Store surface a configuration warning instead of opening all features.
 */
export function resolveRuntimeCapabilityMode(value: unknown): RuntimeCapabilityModeResolution {
  if (isRuntimeCapabilityMode(value)) {
    return { mode: value, warningCode: null }
  }
  if (value === undefined || value === null || value === '') {
    return {
      mode: 'legacy_passthrough',
      warningCode: RUNTIME_CAPABILITY_MODE_MISSING
    }
  }
  return {
    mode: 'runtime_required',
    warningCode: RUNTIME_CAPABILITY_MODE_INVALID
  }
}
