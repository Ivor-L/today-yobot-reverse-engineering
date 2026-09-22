import {
  ResolvedUiFeature,
  resolveUiFeature,
  UI_FEATURE_POLICIES
} from './policy'
import {
  RuntimeCapabilityMap,
  RuntimeCapabilityMode
} from './types'

export interface ConfiguredNavigationItem {
  index: string
  text: string
}

export interface PresentedNavigationItem extends ConfiguredNavigationItem {
  featureId: string
  capability: ResolvedUiFeature
}

export const NAV_FEATURE_BY_INDEX: Readonly<Record<string, string>> = {
  welcome: 'welcome.shell',
  'ai-chat': 'auto_reply.text',
  'customer-management': 'customer.directory',
  moments: 'moments.publish',
  'auto-add': 'automation.sop',
  settings: 'settings.common'
}

export const ROUTE_FEATURE_BY_PATH: Readonly<Record<string, string>> = {
  '/startup': 'startup.shell',
  '/welcome': 'welcome.shell',
  '/ai-chat': 'auto_reply.text',
  '/customer-management': 'customer.directory',
  '/moments': 'moments.publish',
  '/auto-add': 'automation.sop',
  '/settings': 'settings.common'
}

export const ACTION_FEATURE_BY_KEY: Readonly<Record<string, string>> = {
  'ai-chat.monitor.toggle': 'auto_reply.text',
  'ai-chat.manual-review.toggle': 'auto_reply.text',
  'ai-chat.reply.generate': 'auto_reply.text',
  'ai-chat.message.send': 'auto_reply.text',
  'ai-chat.pending-reply.confirm': 'auto_reply.text',
  'ai-chat.pending-reply.cancel': 'auto_reply.text',
  'customer.view.friends': 'customer.friends',
  'customer.view.groups': 'customer.groups',
  'customer.sync.friends': 'customer.sync_friends',
  'customer.sync.groups': 'customer.sync_groups',
  'customer.sync.open': 'customer.sync',
  'customer.sync.schedule': 'customer.sync_schedule',
  'customer.message.mass-send': 'automation.mass_send',
  'customer.group.invite': 'automation.group_invite',
  'customer.follow.create': 'automation.auto_follow',
  'customer.group.tag': 'customer.groups',
  'moments.task.list': 'moments.publish',
  'moments.task.create': 'moments.publish',
  'moments.task.cancel': 'moments.publish',
  'moments.log.read': 'moments.publish',
  'auto-sop.moment-comment': 'automation.moment_comment',
  'auto-sop.mass-send': 'automation.mass_send',
  'auto-sop.friend-request': 'automation.friend_request',
  'auto-sop.friend-add': 'automation.friend_add',
  'auto-sop.auto-follow': 'automation.auto_follow',
  'auto-sop.orchestration': 'automation.sop_orchestration',
  'auto-sop.action.pull-group': 'automation.group_invite',
  'auto-sop.action.greeting': 'automation.sop_greeting',
  'auto-sop.action.create-follow': 'automation.auto_follow'
}

export const AUTO_SOP_FUNCTION_ACTION_KEY_BY_ID: Readonly<Record<string, string>> = {
  comment: 'auto-sop.moment-comment',
  activate: 'auto-sop.mass-send',
  addFriend: 'auto-sop.friend-request',
  addNewFriend: 'auto-sop.friend-add',
  autoFollow: 'auto-sop.auto-follow',
  sop: 'auto-sop.orchestration'
}

export const SOP_EDITOR_ACTION_KEY_BY_TYPE: Readonly<Record<string, string>> = {
  pull_into_group: 'auto-sop.action.pull-group',
  greeting: 'auto-sop.action.greeting',
  create_follow: 'auto-sop.action.create-follow'
}

function unresolvedFeatureId(kind: 'nav' | 'route' | 'action', identifier: string): string {
  return `ui.${kind}.mapping_missing:${identifier}`
}

export function resolveNavigationItem(
  item: ConfiguredNavigationItem,
  mode: RuntimeCapabilityMode,
  capabilities: RuntimeCapabilityMap | null
): PresentedNavigationItem {
  const featureId = NAV_FEATURE_BY_INDEX[item.index] || unresolvedFeatureId('nav', item.index)
  return {
    ...item,
    featureId,
    capability: resolveUiFeature(featureId, mode, capabilities, UI_FEATURE_POLICIES)
  }
}

export function resolveNavigationItems(
  items: readonly ConfiguredNavigationItem[],
  mode: RuntimeCapabilityMode,
  capabilities: RuntimeCapabilityMap | null
): readonly PresentedNavigationItem[] {
  return items.map(item => resolveNavigationItem(item, mode, capabilities))
}

export function resolveRouteCapability(
  path: string,
  mode: RuntimeCapabilityMode,
  capabilities: RuntimeCapabilityMap | null
): ResolvedUiFeature {
  const featureId = ROUTE_FEATURE_BY_PATH[path] || unresolvedFeatureId('route', path)
  return resolveUiFeature(featureId, mode, capabilities, UI_FEATURE_POLICIES)
}

export function resolveActionCapability(
  actionKey: string,
  mode: RuntimeCapabilityMode,
  capabilities: RuntimeCapabilityMap | null
): ResolvedUiFeature {
  const featureId = ACTION_FEATURE_BY_KEY[actionKey] || unresolvedFeatureId('action', actionKey)
  return resolveUiFeature(featureId, mode, capabilities, UI_FEATURE_POLICIES)
}

const REASON_TEXT: Readonly<Record<string, string>> = {
  ACCESSIBILITY_PERMISSION_REQUIRED: '需要先完成系统辅助功能授权',
  SCREEN_RECORDING_PERMISSION_REQUIRED: '需要先完成系统录屏授权',
  PRODUCT_RUNTIME_NOT_REGISTERED: '当前产品运行时尚未就绪',
  RUNTIME_CONTRACT_UNAVAILABLE: '当前产品能力信息不可用',
  BUILD_CAPABILITY_NOT_DECLARED: '当前版本尚未提供此功能',
  UI_FEATURE_POLICY_NOT_DECLARED: '当前页面尚未登记能力规则',
  NOT_IMPLEMENTED: '当前版本尚未实现此功能'
}

export function runtimeCapabilityReasonText(resolution: ResolvedUiFeature): string {
  if (resolution.enabled && resolution.status === 'experimental') {
    return '该功能当前处于实验性支持阶段'
  }
  return runtimeCapabilityReasonCodeText(
    resolution.reasonCode,
    resolution.status,
    resolution.enabled
  )
}

export function runtimeCapabilityReasonCodeText(
  reasonCode: string | null,
  status: ResolvedUiFeature['status'] = 'unavailable',
  enabled = false
): string {
  if (status === 'permission_required') {
    return reasonCode && REASON_TEXT[reasonCode]
      ? REASON_TEXT[reasonCode]
      : '需要先完成系统授权'
  }
  if (status === 'client_version_unsupported') {
    return '当前微信客户端版本不支持此功能'
  }
  if (reasonCode && REASON_TEXT[reasonCode]) {
    return REASON_TEXT[reasonCode]
  }
  return enabled ? '' : '当前版本暂不支持此功能'
}
