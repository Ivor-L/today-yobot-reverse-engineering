const ICON_PNG_DIR = '/icon-png'

const autoSopIcons: Record<string, string> = {
  comment: 'wechat_moment',
  activate: 'activate_icon',
  addFriend: 'friend_request',
  addNewFriend: 'add_new_friend_icon',
  autoFollow: 'follow_up_icon',
  chatAnalysis: 'collect_message',
}

const pngPlatformIcons: Record<string, string> = {
  coze: `${ICON_PNG_DIR}/coze.png`,
  dify: '/icon/dify.png',
  fireflow: '/icon/fireflow.png',
  yuanqi: '/icon/yuanqi.png',
  agentic: `${ICON_PNG_DIR}/agentic.png`,
}

export function getPngIconPath(iconName: string): string {
  return `${ICON_PNG_DIR}/${iconName}.png`
}

export function getStatefulPngIconPath(iconName: string, active: boolean): string {
  return `${ICON_PNG_DIR}/${iconName}.${active ? 'active' : 'normal'}.png`
}

export function getAutoSopIconPath(functionName: string, active: boolean): string {
  const iconName = autoSopIcons[functionName]
  return iconName ? getStatefulPngIconPath(iconName, active) : getPngIconPath('empty')
}

export function getPlatformIconPath(platform?: string): string {
  return pngPlatformIcons[platform || 'coze'] || pngPlatformIcons.coze
}
