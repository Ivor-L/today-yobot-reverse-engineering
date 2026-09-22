export const STARTUP_PHASES = [
  'no_instance',
  'login_required',
  'initialization_required',
  'configuration_required',
  'ready',
  'blocked'
] as const

export type StartupPhase = typeof STARTUP_PHASES[number]

export const STARTUP_ACTIONS = [
  'launch',
  'initialize',
  'configure_accessibility',
  'request_permission'
] as const

export type StartupAction = typeof STARTUP_ACTIONS[number]

export const STARTUP_INSTANCE_STATES = [
  'discovered',
  'login_required',
  'ready',
  'action_required',
  'failed'
] as const

export type StartupInstanceState = typeof STARTUP_INSTANCE_STATES[number]

export const STARTUP_COMPATIBILITY_MODES = [
  'default',
  'platform_fallback'
] as const

export type StartupCompatibilityMode = typeof STARTUP_COMPATIBILITY_MODES[number]

export interface StartupSummary {
  total: number
  ready: number
  pending: number
}

export interface StartupInstanceStatus {
  instanceId: string
  state: StartupInstanceState
  accountId: string | null
  nickname: string | null
  reasonCode: string | null
  message: string | null
  retryable: boolean
}

export interface StartupActionAvailability {
  action: StartupAction
  available: boolean
  destructive: boolean
  confirmationRequired: boolean
  reasonCode: string | null
  hint: string | null
  requiredPermissions: readonly string[]
}

export interface StartupGuidance {
  title: string | null
  reason: string | null
  steps: readonly string[]
  actionUrl: string | null
  actionLabel: string | null
}

export interface StartupWorkflowSnapshot {
  schemaVersion: 1
  platform: string
  driverId: string
  phase: StartupPhase
  summary: StartupSummary
  instances: readonly StartupInstanceStatus[]
  actions: readonly StartupActionAvailability[]
  nextAction: StartupAction | null
  reasonCode: string | null
  message: string | null
  guidance: StartupGuidance | null
}

export interface StartupExecutionResult {
  success: boolean
  code: string
  reasonCode: string | null
  message: string
  retryable: boolean
  action: StartupAction
  snapshot: StartupWorkflowSnapshot | null
}

export interface LaunchStartupCommand {
  action: 'launch'
  confirmed: boolean
  parameters?: {
    count?: number
    closeExisting?: boolean
  }
}

export interface InitializeStartupCommand {
  action: 'initialize'
  confirmed: boolean
  parameters?: Record<string, never>
}

export interface ConfigureAccessibilityStartupCommand {
  action: 'configure_accessibility'
  confirmed: boolean
  parameters?: {
    compatibilityMode?: StartupCompatibilityMode
  }
}

export interface RequestPermissionStartupCommand {
  action: 'request_permission'
  confirmed: boolean
  parameters: {
    permissionName: string
  }
}

export type StartupCommand =
  | LaunchStartupCommand
  | InitializeStartupCommand
  | ConfigureAccessibilityStartupCommand
  | RequestPermissionStartupCommand

export interface NormalizedStartupCommand {
  action: StartupAction
  confirmed: boolean
  parameters: Readonly<Record<string, unknown>>
}

export type StartupLoadState =
  | 'legacy_passthrough'
  | 'idle'
  | 'loading'
  | 'ready'
  | 'contract_error'

export type StartupActionState = 'idle' | 'executing' | 'succeeded' | 'failed'

export function isStartupPhase(value: unknown): value is StartupPhase {
  return typeof value === 'string' && (STARTUP_PHASES as readonly string[]).includes(value)
}

export function isStartupAction(value: unknown): value is StartupAction {
  return typeof value === 'string' && (STARTUP_ACTIONS as readonly string[]).includes(value)
}

export function isStartupInstanceState(value: unknown): value is StartupInstanceState {
  return typeof value === 'string' && (
    STARTUP_INSTANCE_STATES as readonly string[]
  ).includes(value)
}

export function isStartupCompatibilityMode(value: unknown): value is StartupCompatibilityMode {
  return typeof value === 'string' && (
    STARTUP_COMPATIBILITY_MODES as readonly string[]
  ).includes(value)
}
