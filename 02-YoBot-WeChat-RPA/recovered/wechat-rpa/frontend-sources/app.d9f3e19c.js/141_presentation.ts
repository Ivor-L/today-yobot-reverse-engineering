import {
  StartupAction,
  StartupPhase,
  StartupWorkflowSnapshot
} from './types'

const PHASE_TITLES: Readonly<Record<StartupPhase, string>> = {
  no_instance: '等待启动微信',
  login_required: '等待微信登录',
  initialization_required: '微信可以初始化',
  configuration_required: '需要完成环境配置',
  ready: '微信账号已就绪',
  blocked: '当前环境暂不可用'
}

const PHASE_DESCRIPTIONS: Readonly<Record<StartupPhase, string>> = {
  no_instance: '未发现可托管的微信实例，可以启动微信或手动打开后刷新。',
  login_required: '请先在微信窗口完成登录，然后继续初始化。',
  initialization_required: '已发现微信实例，初始化后即可进入应用。',
  configuration_required: '当前实例需要一次平台环境配置，配置过程可能重启微信。',
  ready: '账号身份和驱动均已初始化，可以进入应用。',
  blocked: '请按下方引导处理后重试，系统不会强行继续自动化。'
}

const ACTION_LABELS: Readonly<Record<StartupAction, string>> = {
  launch: '启动微信',
  initialize: '初始化账号',
  configure_accessibility: '配置运行环境',
  request_permission: '申请系统权限'
}

const REASON_TEXT: Readonly<Record<string, string>> = {
  WECHAT_NOT_RUNNING: '未检测到运行中的微信',
  WECHAT_PATH_NOT_FOUND: '未找到微信安装路径',
  WECHAT_VERSION_UNSUPPORTED: '当前微信版本暂不支持',
  ENV_NOT_CONFIGURED: '当前设备环境尚未完成配置',
  INITIALIZATION_FAILED: '微信账号初始化失败',
  INITIALIZATION_EVIDENCE_REQUIRED: '请先运行初始化以确认是否需要配置',
  CONFIGURATION_NOT_REQUIRED: '当前不需要额外配置',
  ACCESSIBILITY_CONFIGURATION_FAILED: '平台环境配置失败',
  ACCESSIBILITY_PERMISSION_REQUIRED: '需要开启辅助功能权限',
  SCREEN_RECORDING_PERMISSION_REQUIRED: '需要开启屏幕录制权限',
  CONFIRMATION_REQUIRED: '该操作需要用户明确确认',
  STARTUP_RUNTIME_NOT_REGISTERED: '当前启动运行时尚未就绪',
  STARTUP_WORKFLOW_UNAVAILABLE: '启动服务暂不可用',
  WINDOWS_PERMISSION_NOT_REQUESTABLE: '该 Windows 权限不能由应用直接申请'
}

const PERMISSION_TEXT: Readonly<Record<string, string>> = {
  accessibility: '辅助功能',
  screen_recording: '屏幕录制',
  automation: '自动化控制'
}

export function startupPhaseTitle(phase: StartupPhase): string {
  return PHASE_TITLES[phase]
}

export function startupPhaseDescription(phase: StartupPhase): string {
  return PHASE_DESCRIPTIONS[phase]
}

export function startupActionLabel(action: StartupAction): string {
  return ACTION_LABELS[action]
}

export function startupReasonText(
  reasonCode: string | null | undefined,
  fallback?: string | null
): string {
  if (reasonCode && REASON_TEXT[reasonCode]) {
    return REASON_TEXT[reasonCode]
  }
  if (fallback?.trim()) {
    return fallback.trim()
  }
  return reasonCode || '启动流程暂不可用'
}

export function startupPermissionText(permission: string): string {
  return PERMISSION_TEXT[permission] || permission
}

export function readyStartupNickname(snapshot: StartupWorkflowSnapshot): string | null {
  return snapshot.instances.find(instance => instance.state === 'ready')?.nickname || null
}
