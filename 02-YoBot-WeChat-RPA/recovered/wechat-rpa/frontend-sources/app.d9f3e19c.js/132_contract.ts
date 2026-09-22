import {
  isRuntimeCapabilityStatus,
  RuntimeCapabilitiesResponse,
  RuntimeCapabilitiesSnapshot,
  RuntimeCapabilityState
} from './types'

type UnknownRecord = Record<string, unknown>

export class RuntimeCapabilityContractError extends Error {
  readonly code = 'RUNTIME_CAPABILITY_CONTRACT_INVALID'
  readonly fieldPath: string

  constructor(fieldPath: string, message: string) {
    super(`${fieldPath}: ${message}`)
    this.name = 'RuntimeCapabilityContractError'
    this.fieldPath = fieldPath
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRecord(value: unknown, fieldPath: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new RuntimeCapabilityContractError(fieldPath, 'must be an object')
  }
  return value
}

function requireText(value: unknown, fieldPath: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new RuntimeCapabilityContractError(fieldPath, 'must be a non-empty string')
  }
  return value
}

function parseReasonCode(value: unknown, fieldPath: string): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return requireText(value, fieldPath)
}

function parsePermissions(value: unknown, fieldPath: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new RuntimeCapabilityContractError(fieldPath, 'must be an array')
  }
  const permissions = value.map((item, index) => requireText(item, `${fieldPath}[${index}]`))
  if (new Set(permissions).size !== permissions.length) {
    throw new RuntimeCapabilityContractError(fieldPath, 'cannot contain duplicates')
  }
  return permissions
}

function parseCapabilityState(value: unknown, fieldPath: string): RuntimeCapabilityState {
  const state = requireRecord(value, fieldPath)
  if (!isRuntimeCapabilityStatus(state.status)) {
    throw new RuntimeCapabilityContractError(`${fieldPath}.status`, 'is not supported')
  }
  const reasonCode = parseReasonCode(state.reasonCode, `${fieldPath}.reasonCode`)
  const requiredPermissions = parsePermissions(
    state.requiredPermissions,
    `${fieldPath}.requiredPermissions`
  )

  if (state.status !== 'supported' && reasonCode === null) {
    throw new RuntimeCapabilityContractError(
      `${fieldPath}.reasonCode`,
      'is required for a non-supported state'
    )
  }
  if (state.status === 'permission_required' && requiredPermissions.length === 0) {
    throw new RuntimeCapabilityContractError(
      `${fieldPath}.requiredPermissions`,
      'is required for permission_required'
    )
  }

  return {
    status: state.status,
    reasonCode,
    requiredPermissions: [...requiredPermissions]
  }
}

export function parseRuntimeCapabilitiesResponse(payload: unknown): RuntimeCapabilitiesSnapshot {
  const response = requireRecord(payload, 'response')
  if (response.success !== true) {
    throw new RuntimeCapabilityContractError('response.success', 'must be true')
  }
  const data = requireRecord(response.data, 'response.data')
  const rawCapabilities = requireRecord(
    data.capabilities,
    'response.data.capabilities'
  )
  const capabilities: Record<string, RuntimeCapabilityState> = {}
  for (const capabilityName of Object.keys(rawCapabilities).sort()) {
    requireText(capabilityName, 'response.data.capabilities key')
    capabilities[capabilityName] = parseCapabilityState(
      rawCapabilities[capabilityName],
      `response.data.capabilities.${capabilityName}`
    )
  }

  const normalized: RuntimeCapabilitiesResponse = {
    success: true,
    data: {
      contractVersion: requireText(data.contractVersion, 'response.data.contractVersion'),
      platform: requireText(data.platform, 'response.data.platform'),
      arch: requireText(data.arch, 'response.data.arch'),
      driverId: requireText(data.driverId, 'response.data.driverId'),
      driverApiVersion: requireText(
        data.driverApiVersion,
        'response.data.driverApiVersion'
      ),
      capabilities
    }
  }
  return normalized.data
}
