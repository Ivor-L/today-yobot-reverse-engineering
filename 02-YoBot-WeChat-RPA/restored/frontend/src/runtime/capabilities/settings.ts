import { RuntimeCapabilityMode } from './types'

export const MACOS_MVP_SETTINGS_SECTION_IDS = [
  'agent-settings',
  'greeting-settings',
  'chat-history-settings',
  'moment-settings',
  'rest-time-settings',
  'ai-settings'
] as const

export const MACOS_MVP_SETTINGS_CONFIG_TYPES = [
  'agents',
  'greeting_config',
  'operation_sops',
  'coze_settings',
  'chat_history_settings',
  'reply_strategy_v2',
  'moment_settings',
  'rest_time_settings',
  'sop_cache'
] as const

const MACOS_MVP_SETTINGS_SECTIONS = new Set<string>(
  MACOS_MVP_SETTINGS_SECTION_IDS
)
const MACOS_MVP_SETTINGS_CONFIGS = new Set<string>(
  MACOS_MVP_SETTINGS_CONFIG_TYPES
)

export function isMacStrictRuntime(
  mode: RuntimeCapabilityMode,
  platform: string | null | undefined
): boolean {
  return mode === 'runtime_required' && platform?.toLowerCase() === 'darwin'
}

export function isSettingsSectionAvailable(
  sectionId: string,
  mode: RuntimeCapabilityMode,
  platform: string | null | undefined
): boolean {
  return !isMacStrictRuntime(mode, platform) || (
    MACOS_MVP_SETTINGS_SECTIONS.has(sectionId)
  )
}

export function isSettingsConfigAvailable(
  configType: string,
  mode: RuntimeCapabilityMode,
  platform: string | null | undefined
): boolean {
  return !isMacStrictRuntime(mode, platform) || (
    MACOS_MVP_SETTINGS_CONFIGS.has(configType)
  )
}
