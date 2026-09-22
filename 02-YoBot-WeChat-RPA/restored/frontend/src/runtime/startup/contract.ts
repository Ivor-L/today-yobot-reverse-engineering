import {
  isStartupAction,
  isStartupCompatibilityMode,
  isStartupInstanceState,
  isStartupPhase,
  NormalizedStartupCommand,
  StartupActionAvailability,
  StartupCommand,
  StartupExecutionResult,
  StartupGuidance,
  StartupInstanceStatus,
  StartupWorkflowSnapshot
} from './types'

type UnknownRecord = Record<string, unknown>

export class StartupContractError extends Error {
  readonly code = 'STARTUP_CONTRACT_INVALID'
  readonly fieldPath: string

  constructor(fieldPath: string, message: string) {
    super(`${fieldPath}: ${message}`)
    this.name = 'StartupContractError'
    this.fieldPath = fieldPath
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRecord(value: unknown, fieldPath: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new StartupContractError(fieldPath, 'must be an object')
  }
  return value
}

function requireText(value: unknown, fieldPath: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new StartupContractError(fieldPath, 'must be a non-empty string')
  }
  return value.trim()
}

function requireString(value: unknown, fieldPath: string): string {
  if (typeof value !== 'string') {
    throw new StartupContractError(fieldPath, 'must be a string')
  }
  return value
}

function optionalText(value: unknown, fieldPath: string): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return requireText(value, fieldPath)
}

function requireBoolean(value: unknown, fieldPath: string): boolean {
  if (typeof value !== 'boolean') {
    throw new StartupContractError(fieldPath, 'must be a boolean')
  }
  return value
}

function requireNonNegativeInteger(value: unknown, fieldPath: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new StartupContractError(fieldPath, 'must be a non-negative integer')
  }
  return value as number
}

function parseTextArray(value: unknown, fieldPath: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new StartupContractError(fieldPath, 'must be an array')
  }
  const items = value.map((item, index) => requireText(item, `${fieldPath}[${index}]`))
  if (new Set(items).size !== items.length) {
    throw new StartupContractError(fieldPath, 'cannot contain duplicates')
  }
  return items
}

function parseInstance(value: unknown, fieldPath: string): StartupInstanceStatus {
  const record = requireRecord(value, fieldPath)
  if (!isStartupInstanceState(record.state)) {
    throw new StartupContractError(`${fieldPath}.state`, 'is not supported')
  }
  const result: StartupInstanceStatus = {
    instanceId: requireText(record.instanceId, `${fieldPath}.instanceId`),
    state: record.state,
    accountId: optionalText(record.accountId, `${fieldPath}.accountId`),
    nickname: optionalText(record.nickname, `${fieldPath}.nickname`),
    reasonCode: optionalText(record.reasonCode, `${fieldPath}.reasonCode`),
    message: optionalText(record.message, `${fieldPath}.message`),
    retryable: requireBoolean(record.retryable, `${fieldPath}.retryable`)
  }
  if (result.state === 'ready' && (!result.accountId || !result.nickname)) {
    throw new StartupContractError(fieldPath, 'ready instance requires account identity')
  }
  if (
    (result.state === 'action_required' || result.state === 'failed') &&
    !result.reasonCode
  ) {
    throw new StartupContractError(
      `${fieldPath}.reasonCode`,
      'is required for action_required and failed states'
    )
  }
  return result
}

function parseActionAvailability(
  value: unknown,
  fieldPath: string
): StartupActionAvailability {
  const record = requireRecord(value, fieldPath)
  if (!isStartupAction(record.action)) {
    throw new StartupContractError(`${fieldPath}.action`, 'is not supported')
  }
  const result: StartupActionAvailability = {
    action: record.action,
    available: requireBoolean(record.available, `${fieldPath}.available`),
    destructive: requireBoolean(record.destructive, `${fieldPath}.destructive`),
    confirmationRequired: requireBoolean(
      record.confirmationRequired,
      `${fieldPath}.confirmationRequired`
    ),
    reasonCode: optionalText(record.reasonCode, `${fieldPath}.reasonCode`),
    hint: optionalText(record.hint, `${fieldPath}.hint`),
    requiredPermissions: parseTextArray(
      record.requiredPermissions,
      `${fieldPath}.requiredPermissions`
    )
  }
  if (result.destructive && !result.confirmationRequired) {
    throw new StartupContractError(
      `${fieldPath}.confirmationRequired`,
      'is required for destructive actions'
    )
  }
  if (!result.available && !result.reasonCode) {
    throw new StartupContractError(
      `${fieldPath}.reasonCode`,
      'is required for unavailable actions'
    )
  }
  return result
}

function parseGuidance(value: unknown, fieldPath: string): StartupGuidance | null {
  if (value === null || value === undefined) {
    return null
  }
  const record = requireRecord(value, fieldPath)
  const guidance: StartupGuidance = {
    title: optionalText(record.title, `${fieldPath}.title`),
    reason: optionalText(record.reason, `${fieldPath}.reason`),
    steps: parseTextArray(record.steps, `${fieldPath}.steps`),
    actionUrl: optionalText(record.actionUrl, `${fieldPath}.actionUrl`),
    actionLabel: optionalText(record.actionLabel, `${fieldPath}.actionLabel`)
  }
  if (Boolean(guidance.actionUrl) !== Boolean(guidance.actionLabel)) {
    throw new StartupContractError(
      fieldPath,
      'actionUrl and actionLabel must be provided together'
    )
  }
  if (
    !guidance.title &&
    !guidance.reason &&
    guidance.steps.length === 0 &&
    !guidance.actionUrl
  ) {
    throw new StartupContractError(fieldPath, 'must contain useful information')
  }
  return guidance
}

export function parseStartupWorkflowSnapshot(
  value: unknown,
  fieldPath = 'response.data'
): StartupWorkflowSnapshot {
  const data = requireRecord(value, fieldPath)
  if (data.schemaVersion !== 1) {
    throw new StartupContractError(`${fieldPath}.schemaVersion`, 'must be 1')
  }
  if (!isStartupPhase(data.phase)) {
    throw new StartupContractError(`${fieldPath}.phase`, 'is not supported')
  }
  const rawSummary = requireRecord(data.summary, `${fieldPath}.summary`)
  const summary = {
    total: requireNonNegativeInteger(rawSummary.total, `${fieldPath}.summary.total`),
    ready: requireNonNegativeInteger(rawSummary.ready, `${fieldPath}.summary.ready`),
    pending: requireNonNegativeInteger(rawSummary.pending, `${fieldPath}.summary.pending`)
  }
  if (!Array.isArray(data.instances)) {
    throw new StartupContractError(`${fieldPath}.instances`, 'must be an array')
  }
  const instances = data.instances.map((item, index) => (
    parseInstance(item, `${fieldPath}.instances[${index}]`)
  ))
  const instanceIds = instances.map(item => item.instanceId)
  if (new Set(instanceIds).size !== instanceIds.length) {
    throw new StartupContractError(`${fieldPath}.instances`, 'instanceId values must be unique')
  }
  const readyCount = instances.filter(item => item.state === 'ready').length
  if (
    summary.total !== instances.length ||
    summary.ready !== readyCount ||
    summary.pending !== instances.length - readyCount
  ) {
    throw new StartupContractError(`${fieldPath}.summary`, 'does not match instances')
  }
  if (!Array.isArray(data.actions)) {
    throw new StartupContractError(`${fieldPath}.actions`, 'must be an array')
  }
  const actions = data.actions.map((item, index) => (
    parseActionAvailability(item, `${fieldPath}.actions[${index}]`)
  ))
  const actionNames = actions.map(item => item.action)
  if (new Set(actionNames).size !== actionNames.length) {
    throw new StartupContractError(`${fieldPath}.actions`, 'action values must be unique')
  }
  let nextAction = null
  if (data.nextAction !== null && data.nextAction !== undefined) {
    if (!isStartupAction(data.nextAction)) {
      throw new StartupContractError(`${fieldPath}.nextAction`, 'is not supported')
    }
    const selected = actions.find(item => item.action === data.nextAction)
    if (!selected?.available) {
      throw new StartupContractError(
        `${fieldPath}.nextAction`,
        'must reference an available action'
      )
    }
    nextAction = data.nextAction
  }
  if (data.phase === 'no_instance' && instances.length > 0) {
    throw new StartupContractError(`${fieldPath}.instances`, 'must be empty for no_instance')
  }
  if (data.phase === 'ready' && readyCount === 0) {
    throw new StartupContractError(`${fieldPath}.instances`, 'must contain a ready instance')
  }
  return {
    schemaVersion: 1,
    platform: requireText(data.platform, `${fieldPath}.platform`),
    driverId: requireText(data.driverId, `${fieldPath}.driverId`),
    phase: data.phase,
    summary,
    instances,
    actions,
    nextAction,
    reasonCode: optionalText(data.reasonCode, `${fieldPath}.reasonCode`),
    message: optionalText(data.message, `${fieldPath}.message`),
    guidance: parseGuidance(data.guidance, `${fieldPath}.guidance`)
  }
}

function responseData(payload: unknown): unknown {
  const response = requireRecord(payload, 'response')
  if (response.success !== true) {
    throw new StartupContractError('response.success', 'must be true')
  }
  return response.data
}

export function parseStartupSnapshotResponse(payload: unknown): StartupWorkflowSnapshot {
  return parseStartupWorkflowSnapshot(responseData(payload))
}

export function parseStartupExecutionResponse(payload: unknown): StartupExecutionResult {
  const data = requireRecord(responseData(payload), 'response.data')
  if (!isStartupAction(data.action)) {
    throw new StartupContractError('response.data.action', 'is not supported')
  }
  const success = requireBoolean(data.success, 'response.data.success')
  const code = requireText(data.code, 'response.data.code')
  const snapshot = data.snapshot === null || data.snapshot === undefined
    ? null
    : parseStartupWorkflowSnapshot(data.snapshot, 'response.data.snapshot')
  if (success && code !== 'OK') {
    throw new StartupContractError('response.data.code', 'must be OK when success is true')
  }
  if (!success && code === 'OK') {
    throw new StartupContractError('response.data.code', 'cannot be OK when success is false')
  }
  if (success && snapshot === null) {
    throw new StartupContractError(
      'response.data.snapshot',
      'is required when success is true'
    )
  }
  return {
    success,
    code,
    reasonCode: optionalText(data.reasonCode, 'response.data.reasonCode'),
    message: requireString(data.message, 'response.data.message'),
    retryable: requireBoolean(data.retryable, 'response.data.retryable'),
    action: data.action,
    snapshot
  }
}

function assertAllowedKeys(
  record: UnknownRecord,
  allowed: readonly string[],
  fieldPath: string
): void {
  const extras = Object.keys(record).filter(key => !allowed.includes(key))
  if (extras.length > 0) {
    throw new StartupContractError(fieldPath, `contains unsupported fields: ${extras.sort().join(', ')}`)
  }
}

export function normalizeStartupCommand(command: StartupCommand): NormalizedStartupCommand {
  const raw = requireRecord(command, 'command')
  assertAllowedKeys(raw, ['action', 'confirmed', 'parameters'], 'command')
  if (!isStartupAction(raw.action)) {
    throw new StartupContractError('command.action', 'is not supported')
  }
  const confirmed = requireBoolean(raw.confirmed, 'command.confirmed')
  const parameters = raw.parameters === undefined
    ? {}
    : requireRecord(raw.parameters, 'command.parameters')

  if (raw.action === 'launch') {
    assertAllowedKeys(parameters, ['count', 'closeExisting'], 'command.parameters')
    const count = parameters.count === undefined ? 1 : parameters.count
    if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > 10) {
      throw new StartupContractError('command.parameters.count', 'must be an integer from 1 to 10')
    }
    const closeExisting = parameters.closeExisting === undefined
      ? false
      : requireBoolean(parameters.closeExisting, 'command.parameters.closeExisting')
    return { action: raw.action, confirmed, parameters: { count, closeExisting } }
  }
  if (raw.action === 'initialize') {
    assertAllowedKeys(parameters, [], 'command.parameters')
    return { action: raw.action, confirmed, parameters: {} }
  }
  if (raw.action === 'configure_accessibility') {
    assertAllowedKeys(parameters, ['compatibilityMode'], 'command.parameters')
    const compatibilityMode = parameters.compatibilityMode ?? 'default'
    if (!isStartupCompatibilityMode(compatibilityMode)) {
      throw new StartupContractError(
        'command.parameters.compatibilityMode',
        'is not supported'
      )
    }
    return { action: raw.action, confirmed, parameters: { compatibilityMode } }
  }
  assertAllowedKeys(parameters, ['permissionName'], 'command.parameters')
  return {
    action: raw.action,
    confirmed,
    parameters: {
      permissionName: requireText(
        parameters.permissionName,
        'command.parameters.permissionName'
      )
    }
  }
}
