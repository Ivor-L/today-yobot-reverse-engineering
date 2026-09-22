import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, unref as _unref, normalizeClass as _normalizeClass, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, resolveDirective as _resolveDirective, withDirectives as _withDirectives, createTextVNode as _createTextVNode, toDisplayString as _toDisplayString, createElementBlock as _createElementBlock, renderList as _renderList, Fragment as _Fragment } from "vue"

const _hoisted_1 = { class: "auto-sop-container" }
const _hoisted_2 = { class: "function-section" }
const _hoisted_3 = { class: "function-list" }
const _hoisted_4 = ["title"]
const _hoisted_5 = { class: "function-icon" }
const _hoisted_6 = ["src"]
const _hoisted_7 = ["title"]
const _hoisted_8 = { class: "function-icon" }
const _hoisted_9 = ["src"]
const _hoisted_10 = ["title"]
const _hoisted_11 = { class: "function-icon" }
const _hoisted_12 = ["src"]
const _hoisted_13 = ["title"]
const _hoisted_14 = { class: "function-icon" }
const _hoisted_15 = ["src"]
const _hoisted_16 = ["title"]
const _hoisted_17 = { class: "function-icon" }
const _hoisted_18 = ["src"]
const _hoisted_19 = ["title"]
const _hoisted_20 = { class: "function-icon" }
const _hoisted_21 = { class: "config-section" }
const _hoisted_22 = { class: "config-content" }
const _hoisted_23 = { class: "sop-tag-summary" }
const _hoisted_24 = { key: 0 }
const _hoisted_25 = { key: 1 }
const _hoisted_26 = { class: "comment-action" }
const _hoisted_27 = {
  key: 0,
  class: "comment-tip"
}
const _hoisted_28 = {
  key: 0,
  class: "config-tip"
}
const _hoisted_29 = { class: "config-content" }
const _hoisted_30 = { class: "section-title" }
const _hoisted_31 = { class: "button-group sop-header-actions" }
const _hoisted_32 = { class: "remaining-count" }
const _hoisted_33 = {
  key: 0,
  class: "risk-banner"
}
const _hoisted_34 = {
  key: 1,
  class: "config-tip"
}
const _hoisted_35 = { class: "config-content" }
const _hoisted_36 = { class: "log-content" }
const _hoisted_37 = { class: "log-header" }
const _hoisted_38 = { class: "log-status-time" }
const _hoisted_39 = { class: "log-time" }
const _hoisted_40 = { class: "log-info" }
const _hoisted_41 = { class: "task-details" }
const _hoisted_42 = { class: "publisher" }
const _hoisted_43 = { class: "moment-content" }
const _hoisted_44 = { class: "comment-info" }
const _hoisted_45 = {
  key: 0,
  class: "like-action"
}
const _hoisted_46 = {
  key: 1,
  class: "comment-action"
}
const _hoisted_47 = { class: "comment-text" }
const _hoisted_48 = {
  key: 1,
  class: "empty-state"
}
const _hoisted_49 = ["src"]
const _hoisted_50 = { class: "log-header" }
const _hoisted_51 = { class: "log-status-time" }
const _hoisted_52 = { class: "log-time" }
const _hoisted_53 = { class: "log-info" }
const _hoisted_54 = { class: "task-details" }
const _hoisted_55 = {
  key: 0,
  class: "task-progress"
}
const _hoisted_56 = { class: "task-group" }
const _hoisted_57 = {
  key: 1,
  class: "task-schedule"
}
const _hoisted_58 = {
  key: 0,
  class: "task-error"
}
const _hoisted_59 = {
  key: 1,
  class: "empty-state"
}
const _hoisted_60 = ["src"]
const _hoisted_61 = { class: "log-header" }
const _hoisted_62 = { class: "log-status-time" }
const _hoisted_63 = { class: "log-time" }
const _hoisted_64 = { class: "log-info" }
const _hoisted_65 = { class: "task-details" }
const _hoisted_66 = { class: "friend-count" }
const _hoisted_67 = {
  key: 0,
  class: "friend-tag"
}
const _hoisted_68 = {
  key: 1,
  class: "friend-tag"
}
const _hoisted_69 = {
  key: 2,
  class: "target-list"
}
const _hoisted_70 = { class: "target-left" }
const _hoisted_71 = ["title"]
const _hoisted_72 = {
  key: 1,
  class: "empty-state"
}
const _hoisted_73 = ["src"]
const _hoisted_74 = { class: "log-header" }
const _hoisted_75 = { class: "log-status-time" }
const _hoisted_76 = { class: "log-time" }
const _hoisted_77 = { class: "log-info" }
const _hoisted_78 = { class: "task-details" }
const _hoisted_79 = { class: "friend-info" }
const _hoisted_80 = {
  key: 0,
  class: "friend-tags"
}
const _hoisted_81 = { class: "greeting-text" }
const _hoisted_82 = {
  key: 1,
  class: "target-list"
}
const _hoisted_83 = { class: "target-left" }
const _hoisted_84 = ["title"]
const _hoisted_85 = ["title"]
const _hoisted_86 = { class: "target-right" }
const _hoisted_87 = {
  key: 0,
  class: "status-success"
}
const _hoisted_88 = ["title"]
const _hoisted_89 = {
  key: 1,
  class: "empty-state"
}
const _hoisted_90 = ["src"]
const _hoisted_91 = { class: "auth-dialog-content" }
const _hoisted_92 = { class: "auth-actions" }
const _hoisted_93 = { class: "tag-selection-content" }
const _hoisted_94 = { class: "tag-name" }
const _hoisted_95 = { class: "tag-count" }
const _hoisted_96 = { class: "dialog-footer-custom" }
const _hoisted_97 = { class: "action-buttons" }

import { ref,onMounted,computed,onUnmounted ,watch, onActivated} from 'vue'
import {User, Warning,PriceTag, InfoFilled, Operation} from '@element-plus/icons-vue'
import FriendListDialog from '@/components/sop/FriendListDialog.vue'
import ImportFriendListDialog from '@/components/sop/ImportFriendListDialog.vue'
import { ElMessage } from 'element-plus'
import { getConfig, saveConfig } from '@/api/config'
import type { CozeAgent } from '@/types/coze' 
import {getTaskLogs,toggleAutoAddFriend,getFriendRequestLogs,getRemainingFriendCount,getFriendRequestRiskRecords,
  toggleAutoAddNewFriend,importFriendList,toggleAutoComment,importFriendListByAgent,getAddFriendLogs, getMomentLogs} from '@/api/autosop'
import MassSendingPanel from '@/components/sop/MassSendingPanel.vue'
import SopOrchestration from '@/components/sop/SopOrchestration.vue'
import AutoFollowTaskList from '@/components/AutoFollowTaskList.vue'
import AutoFollowLogs from '@/components/AutoFollowLogs.vue'
import { getContactTags ,getGroups, Tag} from '@/api/contact'
import { useRoute } from 'vue-router'
import CosmicSwitch from '@/components/ui/CosmicSwitch.vue'
import { getActiveInstances, type Instance } from '@/api/moments'
import { getAutoSopIconPath, getPngIconPath } from '@/utils/iconImages'
import {
  AUTO_SOP_FUNCTION_ACTION_KEY_BY_ID,
  SOP_EDITOR_ACTION_KEY_BY_TYPE
} from '@/runtime/capabilities'
import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'
import '@/styles/sop.css'
interface LogParams {
  content?: string
  scheduleTime?: string
  contentType?: string
  progress?: number
  total?: number
  greetingGroupId?: string
  timestamp?: string
}
interface RestTimeSettings {
  startTime: number
  endTime: number
  selectedTasks: string[]
}
interface AddFriendLog {
  task_id: string
  account_id?: string // 微信账号
  time: string  // 任务执行时间
  processed_count: number  // 成功数量
  attempt_count: number  // 尝试总数
  tag: string  // 打招呼话术
  targets?: Array<{ // 新增的目标明细
    wxid: string
    nickname: string
    status: string
    error_msg: string
  }>
}

interface GreetingGroup {
  id: string
  name: string
  greetings: Array<{
    type: 'text' | 'file'
    content: string
    filePath?: string
  }>
}
// 添加朋友圈日志的类型定义
interface MomentLog {
  id: string;
  timestamp: string;
  account_id?: string; // 微信账号
  type: string[];
  publisher: string;
  content: string;
  publish_time?: string;
  comment_content: string;
}

// 添加好友配置接口
export interface FriendConfig {
  maxFriendsPerDay: number
  checkInterval: number
  maxProcessPerTime: number
  greetingGroupId: string
  targetGroup:string
  tag: string
  enabled: boolean
  multiCycleEnabled: boolean
  selectedAccounts: string[]
}
// 添加好友日志接口
interface FriendLog {
  task_id: string
  time: string
  account_id?: string
  processed_count: number
  tag?: string
  greetingGroupId?: string
  targetGroup?: string
  processed_users?: string[]
  status: string
  error?: string
}
// 使用SVG加载器
// 添加好友配置响应式对象
interface LogItem {
  id: string
  timestamp: string | number
  taskType: string
  description: string
  status: string
  progress?: number
  total?: number
  error?: string | null
  publisher?: string
  content?: string
  comment_content?: string
  account_id?: string
  params?: {
    content?: string
    scheduleTime?: string
    progress?: number
    total?: number
    greetingGroupId?: string
    contentType?: string
    agentId?: string
  }
}

// 添加话术组加载方法
const LOG_MIN_WIDTH = 570 // 内容区(content-wrapper)宽度低于此值时自动隐藏日志，防止与左侧列表挤压/重叠

export default /*@__PURE__*/_defineComponent({
  __name: 'AutoSOP',
  setup(__props) {

const route = useRoute()
const {
  resolveAction,
  isActionEnabled,
  actionReason,
  requireAction,
  isMacStrictRuntime
} = useRuntimeCapabilityPresentation()
const friendImportTypes = computed<Array<'excel' | 'agent' | 'api'>>(() => (
  isMacStrictRuntime.value ? ['excel'] : ['excel', 'agent', 'api']
))
const functionActionKey = (func: string) => AUTO_SOP_FUNCTION_ACTION_KEY_BY_ID[func] || ''
const isFunctionEnabled = (func: string) => {
  const actionKey = functionActionKey(func)
  return actionKey ? isActionEnabled(actionKey) : false
}
const functionDisabledReason = (func: string) => {
  const actionKey = functionActionKey(func)
  return actionKey ? actionReason(actionKey) : '当前页面功能尚未登记能力规则'
}
const requireFunction = (func: string) => {
  const actionKey = functionActionKey(func)
  return actionKey ? requireAction(actionKey) : false
}
const sopActionAvailability = computed(() => Object.fromEntries(
  Object.entries(SOP_EDITOR_ACTION_KEY_BY_TYPE).map(([type, actionKey]) => {
    const resolution = resolveAction(actionKey)
    return [type, {
      enabled: resolution.enabled,
      reason: resolution.enabled ? '' : actionReason(actionKey)
    }]
  })
))
const groupList = ref<any[]>([])
// 添加评论配置
const commentConfig = ref({
  commentLimit: 10,
  perFriendLimit: 2,
  autoLike: false,
  interactionMode:'like_and_comment',
  checkInterval: 120, // 默认120分钟
  reachLastPosition: 'stop', // 默认终止任务
  blacklist: '',
  agentId: '',
  enabled: false,
  multiCycleEnabled: false,
  selectedAccounts: [] as string[],
  selectedTags:[] as string[], // 选中的标签ID列表
  selectedTagNames: [] as string[] // 选中的标签名称列表（用于显示）
})
const addFriendConfig = ref({
  maxFriendsPerDay: 10,
  interval: 30,
  batchSize: 1,
  targetGroup: '',
  verifyMessage:'',
  enabled: false,
  multiCycleEnabled: false,
  selectedAccounts: [] as string[]
})
const restTimeSettings = ref<RestTimeSettings>({
  startTime: 0,
  endTime: 28,
  selectedTasks: []
})
const addFriendLogs = ref<AddFriendLog[]>([])
const riskAccounts = ref<string[]>([])
const remainingCount = ref(0)
const todayAddedCount = ref(0)
const importDialogVisible = ref(false)
const friendListVisible = ref(false)
// 添加统一的日志参数接口定义
const friendConfig = ref<FriendConfig>({
  maxFriendsPerDay: 100,
  checkInterval: 10,
  maxProcessPerTime: 5,
  tag: '',
  targetGroup:'',
  greetingGroupId: '',
  enabled: false,
  multiCycleEnabled: false,
  selectedAccounts: []
})
const showImportDialog = () => {
  if (!requireFunction('addNewFriend')) return
  importDialogVisible.value = true
}
// 添加授权弹窗相关状态
const authDialogVisible = ref(false)
const authUrl = ref('')
const hasClickedAuth = ref(false)
// 添加打开授权链接的方法
const openAuthUrl = () => {
  if (authUrl.value) {
    window.open(authUrl.value, '_blank')
    hasClickedAuth.value = true
  }
}
// 添加执行时间显示的计算属性
const friendRequestExecutionTime = computed(() => {
  if (!restTimeSettings.value.selectedTasks.includes('自动通过好友')) {
    return null // 没有配置时隐藏提示
  }
  return formatExecutionTime(restTimeSettings.value.startTime, restTimeSettings.value.endTime)
})

const addFriendExecutionTime = computed(() => {
  if (!restTimeSettings.value.selectedTasks.includes('自动加好友')) {
    return null // 没有配置时隐藏提示
  }
  return formatExecutionTime(restTimeSettings.value.startTime, restTimeSettings.value.endTime)
})

// 添加时间格式化函数
const formatExecutionTime = (startTime: number, endTime: number) => {
  const formatInterval = (interval: number) => {
    const hour = Math.floor(interval / 4)
    const minute = (interval % 4) * 15
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
  
  const startTimeStr = formatInterval(startTime)
  const endTimeStr = formatInterval(endTime)
  
  if (startTime <= endTime) {
    return `${startTimeStr}-${endTimeStr}为休息时间，暂停执行任务，可前往配置页修改`
  } else {
    return `${startTimeStr}-次日${endTimeStr}为休息时间，暂停执行任务，可前往配置页修改`
  }
}

// 添加加载休息时间配置的函数
const loadRestTimeSettings = async () => {
  try {
    const result = await getConfig('rest_time_settings')
    if (result.success && result.data?.rest_time_settings) {
      restTimeSettings.value = {
        startTime: result.data.rest_time_settings.startTime || 0,
        endTime: result.data.rest_time_settings.endTime || 28,
        selectedTasks: result.data.rest_time_settings.selectedTasks || []
      }
    }
  } catch (error) {
    console.error('加载休息时间配置失败:', error)
  }
}
// 添加智能体导入处理方法
const handleImportByAgent = async (agentId: string) => {
  if (!requireFunction('addNewFriend')) return
  try {
    ElMessage.info('正在通过智能体导入名单...')
    const result = await importFriendListByAgent(agentId)
    
    // 检查是否需要授权
    if (result.needsAuth && result.authUrl) {
      authUrl.value = result.authUrl
      authDialogVisible.value = true
      return
    }
    
    if (result.success) {
      ElMessage.success(`成功导入${result.count}条数据，剩余${result.remaining}条待添加`)
      remainingCount.value = result.remaining
    }
  } catch (error) {
    ElMessage.error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
const showFriendList = () => {
  friendListVisible.value = true
}
const saveAddFriendConfig = () => {
  try {
    // 自动加好友开关属于当前 Control 进程的运行态。后端不会在重启后
    // 恢复该调度任务，因此本地缓存也只能保存表单参数，不能保存开启态。
    localStorage.setItem('addFriendConfig', JSON.stringify({
      ...addFriendConfig.value,
      enabled: false
    }))
    saveSopCache('addFriendConfig')
  } catch (error) {
    console.error('保存添加好友配置失败:', error)
  }
}
// 添加加载群聊列表的方法
const loadGroupList = async () => {
  if (groupList.value.length === 0) {
    try {
      groupList.value = await getGroups()
    } catch (error) {
      console.error('获取群聊列表失败:', error)
      ElMessage.error('获取群聊列表失败')
    }
  }
}
const activeInstances = ref<Instance[]>([])
const loadActiveInstancesForAddFriend = async () => {
  try {
    const result = await getActiveInstances()
    if (result.success) {
      activeInstances.value = result.instances || []
      if (addFriendConfig.value.multiCycleEnabled && addFriendConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
        addFriendConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
      }
    }
  } catch (e) {
    console.error('获取活跃实例失败:', e)
  }
}
const onMultiCycleToggle = async (val: any) => {
  if (addFriendConfig.value.enabled) {
    return
  }
  if (Boolean(val)) {
    await loadActiveInstancesForAddFriend()
    if (addFriendConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
      addFriendConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
    }
  }
  saveAddFriendConfig()
}

const onFriendMultiCycleToggle = async (val: any) => {
  if (friendConfig.value.enabled) {
    return
  }
  if (Boolean(val)) {
    await loadActiveInstancesForAddFriend() // we can reuse this since it just calls getActiveInstances()
    if (friendConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
      friendConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
    }
  }
  localStorage.setItem('friendConfig', JSON.stringify(friendConfig.value))
  saveSopCache('friendConfig')
}

const loadActiveInstancesForComment = async () => {
  try {
    const result = await getActiveInstances()
    if (result.success) {
      activeInstances.value = result.instances || []
      if (commentConfig.value.multiCycleEnabled && commentConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
        commentConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
      }
    }
  } catch (e) {
    console.error('获取活跃实例失败:', e)
  }
}

const onCommentMultiCycleToggle = async (val: any) => {
  if (commentConfig.value.enabled) {
    return
  }
  if (Boolean(val)) {
    await loadActiveInstancesForComment()
    if (commentConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
      commentConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
    }
  }
  saveCommentConfig()
}
const handleAddFriendSwitchChange = async (val: string | number | boolean) => {
  if (!requireFunction('addNewFriend')) {
    addFriendConfig.value.enabled = false
    return
  }
  const value = Boolean(val)  // 将输入值转换为布尔值
  try {
    const result = await toggleAutoAddNewFriend(value, addFriendConfig.value)
    if (result.success) {
      ElMessage.success(value ? '已开启自动加好友' : '已关闭自动加好友')
    } else {
      addFriendConfig.value.enabled = !value
      ElMessage.error(result.error || '操作失败')
    }
    saveAddFriendConfig()//保存开关的状态
  } catch (error) {
    addFriendConfig.value.enabled = !value
    ElMessage.error('操作失败')
    saveAddFriendConfig()
  }
}
const handleImportFriendList = async (fileData: any) => {
  if (!requireFunction('addNewFriend')) return
  try {
    const result = await importFriendList(fileData)
    if (result.success) {
      ElMessage.success('导入成功')
      await loadRemainingCount()
    } else {
      ElMessage.error('导入失败')
    }
  } catch (error) {
    ElMessage.error('导入失败')
    console.error("导入名单失败",error)
  }
}
const handleSwitchChange = async (value: boolean) => {
  if (!requireFunction('comment')) {
    commentConfig.value.enabled = false
    return
  }
  try {
    await toggleAutoComment(value, value ? commentConfig.value : {})
    saveCommentConfig()
    ElMessage.success(`自动评论已${value ? '开启' : '关闭'}`)
  } catch (error) {
    ElMessage.error(`${value ? '开启' : '关闭'}自动评论失败`)
    commentConfig.value.enabled = !value
    saveCommentConfig()
  }
}

// 验证标签格式
const validateTag = (value: string) => {
  const regex = /^[a-zA-Z0-9\u4e00-\u9fa5]+$/
  if (value && !regex.test(value)) {
    friendConfig.value.tag = value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
    ElMessage.warning('标签只能包含中文、英文和数字')
  }
}
const userTags = ref<Tag[]>([])
const tagDialogVisible = ref(false)
const tempSelectedTags = ref<string[]>([])
// 打开标签选择弹窗
const openTagDialog = async () => {
  if (!requireFunction('comment')) return
  try {
    userTags.value = await getContactTags()
    tempSelectedTags.value = [...commentConfig.value.selectedTags]
    tagDialogVisible.value = true
  } catch (error) {
    console.error('获取标签列表失败:', error)
    ElMessage.error('获取标签列表失败')
  }
}
// 重置标签选择
const resetTagSelection = () => {
  tempSelectedTags.value = []
  commentConfig.value.selectedTags = []
  commentConfig.value.selectedTagNames = []
  saveCommentConfig()
  ElMessage.success('标签已重置')
}
// 确认标签选择
const confirmTagSelection = () => {
  commentConfig.value.selectedTags = [...tempSelectedTags.value]
  commentConfig.value.selectedTagNames = tempSelectedTags.value.map(tagId => {
    const tag = userTags.value.find(t => t.id === tagId)
    return tag ? tag.name : tagId
  })
  tagDialogVisible.value = false
  saveCommentConfig()
}

// 取消标签选择
const cancelTagSelection = () => {
  tempSelectedTags.value = [...commentConfig.value.selectedTags]
  tagDialogVisible.value = false
}
// 添加加载用户标签方法
const loadUserTags = async () => {
  try {
    userTags.value = await getContactTags()
  } catch (error) {
    console.error('加载用户标签失败:', error)
    ElMessage.error('加载用户标签失败')
  }
}
// 添加状态文案转换方法
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '等待执行',
    'running': '执行中',
    'completed': '已完成',
    'failed': '执行失败',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}
// 添加状态类型转换方法
const getStatusType = (status: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' => {
  const statusMap: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
    'pending': 'info',
    'running': 'warning',
    'completed': 'success',
    'failed': 'danger',
    'cancelled': 'info'
  }
  return statusMap[status] || 'info'
}

// 格式化定时执行时间
const formatScheduleTime = (time: string) => {
  try {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return '时间格式错误'
  }
}
const friendLogs = ref<FriendLog[]>([])
// 加载好友请求日志
const loadFriendLogs = async () => {
  try {
    const logs = await getFriendRequestLogs()
    friendLogs.value = logs
    console.debug('好友请求日志:', logs)
  } catch (error) {
    console.error('加载好友请求日志失败:', error)
    ElMessage.error('加载好友请求日志失败')
  }
}
// 修改 filteredLogs computed 属性
const filteredLogs = computed<any[]>(() => {
  if (currentFunction.value === 'addFriend') {
    return friendLogs.value.map(log => ({
      id: log.task_id,
      timestamp: log.time,
      processed_count: log.processed_count,
      tag: log.tag,
      status: log.status || 'completed',
      type: 'friend_request',
      error: log.error,
      progress: log.processed_count,
      total: undefined,
      params: {
        content: `通过了 ${log.processed_count} 个好友申请`,
        scheduleTime: undefined,
        progress: log.processed_count,
        total: undefined,
        greetingGroupId: undefined
      } as LogParams
    }))
  } else if (currentFunction.value === 'comment') {
    return momentLogs.value.map((log: MomentLog) => ({
      id: log.timestamp,
      timestamp: new Date(log.timestamp).getTime(),
      taskType: 'comment',
      status: 'completed',
      publisher: log.publisher,
      content: log.content,
      comment_content: log.comment_content,
      description: `${log.publisher} 的朋友圈`,
      progress: undefined,
      total: undefined,
      params: {
        content: log.content,
        scheduleTime: undefined,
        progress: undefined,
        total: undefined,
        greetingGroupId: undefined
      } as LogParams,
      error: null
    }))
  } else if (currentFunction.value === 'activate') {
    console.debug("群发日志信息。。。",taskLogs.value)
    return taskLogs.value.map(log => ({
      ...log,
      progress: log.params?.progress,
      total: log.params?.total,
      params: {
        content: log.params?.content || '',
        scheduleTime: log.params?.scheduleTime,
        contentType: log.params?.contentType,
        progress: log.params?.progress,
        total: log.params?.total,
        greetingGroupId: log.params?.greetingGroupId,
        agentId: log.params?.agentId
      } as LogParams
    }))
  } else if (currentFunction.value === 'chatAnalysis') {
    console.debug("聊天采集日志信息。。。", taskLogs.value)
    return taskLogs.value.map(log => ({
      ...log,
      params: {
        total: log.params?.total || 0,
        progress: log.params?.progress || 0
      } as LogParams
    }))
  }
  return taskLogs.value
})
// 添加朋友圈日志状态
const momentLogs = ref<MomentLog[]>([])
// 添加加载朋友圈日志的方法
const loadMomentLogs = async () => {
  try {
    const logs = await getMomentLogs()
    // console.debug('加载朋友圈日志:', logs)
    // 确保每条日志都有ID，如果没有则使用时间戳
    momentLogs.value = (logs || []).map((log: any) => ({
      ...log,
      id: log.id || log.timestamp
    }))
  } catch (error) {
    console.error('加载朋友圈日志失败:', error)
  }
}
const cozeAgents = ref<CozeAgent[]>([])
const currentFunction = ref('comment')
const isRunning = ref(false)
// const activateTasks = ref<ActivateTask[]>([])
// const userTags = ref<UserTag[]>([])
const greetingGroups = ref<GreetingGroup[]>([])
const taskLogs = ref<LogItem[]>([])

// 加载任务日志
const loadTaskLogs = async () => {
  try {
    const response = await getTaskLogs()
    taskLogs.value = response;
  } catch (error) {
    console.error('加载任务日志失败:', error)
    taskLogs.value = []
  }
}

const loadGreetingGroups = async () => {
  try {
    const result = await getConfig('greeting_config')
    if (result?.data?.greeting_config?.greeting_config) {
      const config = result.data.greeting_config.greeting_config
      greetingGroups.value = config.map((group: any) => ({
        id: group.name,
        name: group.name,
        greetings: Array.isArray(group.greetings) ? group.greetings : [] // 确保 greetings 属性存在
      }))
    }
  } catch (error) {
    console.error('加载话术组失败:', error)
    ElMessage.error('加载话术组失败')
  }
}

// 处理自动加好友开关变化
const handleFriendSwitchChange = async (val: string | number | boolean) => {
  if (!requireFunction('addFriend')) {
    friendConfig.value.enabled = false
    return
  }
  const originalValue = friendConfig.value.enabled  // 保存原始状态
  const value = Boolean(val)
  
  try {
    const result = await toggleAutoAddFriend(value, friendConfig.value)
    if (result.success) {
      ElMessage.success(value ? '已开启自动通过好友，3秒后会开始执行任务' : '已关闭自动通过好友')
      friendConfig.value.enabled = value  // 更新状态
      localStorage.setItem('friendConfig', JSON.stringify(friendConfig.value))
      saveSopCache('friendConfig')
    } else {
      // 如果后端返回失败，恢复原始状态
      friendConfig.value.enabled = originalValue
      friendConfig.value = { ...friendConfig.value }
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    // 发生错误时恢复原始状态
    friendConfig.value.enabled = originalValue
    friendConfig.value = { ...friendConfig.value }
    console.error('切换自动通过好友失败:', error)
    ElMessage.error('操作失败')
  }
}
// 日志区显隐：基于「真实内容区宽度」而非整窗宽度，用 ResizeObserver 观测，
// 任何尺寸/布局变化（窗口拖拽、侧栏变化、缩放）都会触发，避免出现状态卡死、拖拽无效的情况。
const isLogVisible = ref(true)
const contentWrapperRef = ref<HTMLElement | null>(null)
let logResizeObserver: ResizeObserver | null = null
const updateLogVisibility = () => {
  const el = contentWrapperRef.value
  const width = el ? el.clientWidth : window.innerWidth
  isLogVisible.value = width >= LOG_MIN_WIDTH
}
onMounted(async () => {
  //注册广播监听
  await loadCozeAgents()
  // await loadTaskLogs()
  if (isFunctionEnabled('comment')) await loadMomentLogs()
  if (isFunctionEnabled('comment')) await loadUserTags()
  await loadGreetingGroups()
  if (isFunctionEnabled('comment')) await loadCommentConfig()


  if (isFunctionEnabled('addFriend')) await loadFriendConfig()
  if (isFunctionEnabled('addNewFriend')) await loadAddNewFriendConfig()
  await loadRestTimeSettings()
  updateLogVisibility()
  if (typeof ResizeObserver !== 'undefined' && contentWrapperRef.value) {
    logResizeObserver = new ResizeObserver(() => updateLogVisibility())
    logResizeObserver.observe(contentWrapperRef.value)
  } else {
    // 兜底：环境不支持 ResizeObserver 时退回 window resize
    window.addEventListener('resize', updateLogVisibility)
  }
  if (isFunctionEnabled('addNewFriend')) await loadActiveInstancesForAddFriend()
  if (Object.values(AUTO_SOP_FUNCTION_ACTION_KEY_BY_ID).some(isActionEnabled)) {
    await loadActiveInstances()
  }

  if (!isFunctionEnabled(currentFunction.value)) {
    const firstAvailable = Object.keys(AUTO_SOP_FUNCTION_ACTION_KEY_BY_ID).find(isFunctionEnabled)
    if (firstAvailable) switchFunction(firstAvailable)
  }
})

onUnmounted(() => {
  if (logResizeObserver) {
    logResizeObserver.disconnect()
    logResizeObserver = null
  }
  window.removeEventListener('resize', updateLogVisibility)
})

const loadActiveInstances = async () => {
  try {
    const result = await getActiveInstances()
    if (result.success) {
      activeInstances.value = result.instances || []
    }
  } catch (e) {
    console.error('获取活跃实例失败:', e)
  }
}

onActivated(() => {
  loadActiveInstances()
})

const currentInstanceNickname = computed(() => {
  const list = activeInstances.value || []
  const active = list.find(i => i.is_active)
  return active ? active.nickname : (list[0]?.nickname || '')
})

const currentInstanceAccountId = computed(() => {
  const list = activeInstances.value || []
  const active = list.find(i => i.is_active)
  return active ? active.account_id : (list[0]?.account_id || '')
})

// 加载智能体列表
const loadCozeAgents = async () => {
  try {
    const result = await getConfig('agents')
    if (result.success && result.data) {
      const agents = Array.isArray(result.data) ? result.data : 
                    Array.isArray(result.data.agents) ? result.data.agents : []
      
      cozeAgents.value = agents.filter((agent: CozeAgent) => agent.name && agent.botId)
      
      // 新配置尚未选择智能体时，使用列表第一项作为表单初始值
      const selectedAgentExists = cozeAgents.value.some(agent => agent.botId === commentConfig.value.agentId)
      if (!selectedAgentExists && cozeAgents.value.length > 0) {
        commentConfig.value.agentId = cozeAgents.value[0].botId
      }
    }
  } catch (error) {
    console.error('加载智能体配置失败:', error)
  }
}

const loadCommentConfig = async () => {
  try {
    // 优先从本地存储读取配置
    const savedConfig = localStorage.getItem('commentConfig')
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig)
      // 朋友圈开关是本次进程的运行态，不是配置项。Windows 端重启后
      // 不恢复该任务；这里只恢复表单参数，并始终以关闭状态进入页面。
      commentConfig.value = {
        ...commentConfig.value,
        ...parsedConfig,
        enabled: false
      }
      return
    }
    await loadSopCache()
    if (sopCache.value?.commentConfig) {
      const cachedConfig = sopCache.value.commentConfig
      // 过滤掉 selectedAccounts，避免使用缓存的账号列表
      const { selectedAccounts, ...restConfig } = cachedConfig
      commentConfig.value = { 
        ...commentConfig.value,
        ...restConfig,
        enabled: false
      }
      return
    }
    const result = await getConfig('moment_settings')
    if (result.success && result.data?.moment_settings) {
      commentConfig.value = {
        commentLimit: result.data.moment_settings.commentLimit,
        perFriendLimit: result.data.moment_settings.perFriendLimit || 2,
        autoLike: result.data.moment_settings.autoLike,
        interactionMode: result.data.moment_settings.interactionMode || 'like_and_comment',
        blacklist: result.data.moment_settings.blacklist || '',
        agentId: result.data.moment_settings.agentId || commentConfig.value.agentId,
        checkInterval:120,
        reachLastPosition: 'stop',
        enabled: false,
        multiCycleEnabled: commentConfig.value.multiCycleEnabled || false,
        selectedAccounts: Array.isArray(commentConfig.value.selectedAccounts) ? commentConfig.value.selectedAccounts : [],
        selectedTags: [],//标签默认不在配置页中设置
        selectedTagNames: []
      }
    }
  } catch (error) {
    console.error('加载评论配置失败:', error)
  }
}
// 统一的SOP缓存读写
const sopCache = ref<any>(null)
const loadSopCache = async () => {
  try {
    if (!sopCache.value) {
      const res = await getConfig('sop_cache')
      if (res.success) {
        sopCache.value = res.data || {}
      }
    }
  } catch (e) {
    console.error('加载SOP缓存失败:', e)
  }
}
const saveSopCache = async (key: 'commentConfig' | 'addFriendConfig' | 'friendConfig') => {
  try {
    const res = await getConfig('sop_cache')
    const base = (res.success && res.data) ? res.data : {}
    
    // 构建需要缓存的数据，过滤掉 selectedAccounts
    let configToCache = {}
    if (key === 'commentConfig') {
      const { selectedAccounts, ...rest } = commentConfig.value
      configToCache = rest
    } else if (key === 'addFriendConfig') {
      const { selectedAccounts, ...rest } = addFriendConfig.value
      configToCache = rest
    } else if (key === 'friendConfig') {
      const { selectedAccounts, ...rest } = friendConfig.value
      configToCache = rest
    }

    const payload = {
      commentConfig: {
        ...(base.commentConfig || {}),
        ...(key === 'commentConfig' ? configToCache : {}),
        enabled: false
      },
      addFriendConfig: {
        ...(base.addFriendConfig || {}),
        ...(key === 'addFriendConfig' ? addFriendConfig.value : {}),
        enabled: false
      },
      friendConfig: {
        ...(base.friendConfig || {}),
        ...(key === 'friendConfig' ? friendConfig.value : {}),
        enabled: false
      }
    }
    await saveConfig('sop_cache', payload)
  } catch (e) {
    console.error('保存SOP缓存失败:', e)
  }
}
// 添加保存配置的方法
const saveCommentConfig = () => {
  try {
    // 不持久化任务运行态，避免客户端重启后显示为已开启，而后端实际
    // 没有对应的朋友圈调度任务。
    localStorage.setItem('commentConfig', JSON.stringify({
      ...commentConfig.value,
      enabled: false
    }))
    saveSopCache('commentConfig')
  } catch (error) {
    console.error('保存评论配置失败:', error)
  }
}

const switchFunction = (func: string) => {
  if (!requireFunction(func)) return
  console.debug('切换功能到:', func)
  currentFunction.value = func
  
  if (func === 'addFriend') {
    loadFriendLogs()
  } else if (func === 'activate') {
    loadTaskLogs()
  } else if (func === 'addNewFriend') {
    loadAddFriendLogs()
    loadRemainingCount()
    loadRiskAccounts()
  } else if (func === 'chatAnalysis') {
    loadTaskLogs()
  } else if (func === 'comment') {
    loadMomentLogs()
  } else if (func === 'sop') {
    // SOP编排的"拉群"动作需要群列表；话术组/智能体已在挂载时加载
    loadGroupList()
  }
}

// 添加加载日志的方法
const loadAddFriendLogs = async () => {
  try {
    const logs = await getAddFriendLogs()
    addFriendLogs.value = logs
  } catch (error) {
    console.error('加载添加好友日志失败:', error)
    ElMessage.error('加载日志失败')
  }
}

const loadRemainingCount = async () => {
  try {
    const result = await getRemainingFriendCount()
    if (typeof result === 'object' && result !== null) {
      remainingCount.value = result.remaining
      todayAddedCount.value = result.today_added || 0
    } else {
      // 兼容旧接口返回
      remainingCount.value = Number(result)
      todayAddedCount.value = 0
    }
  } catch (error) {
    console.error('获取剩余可添加好友数量失败:', error)
  }
}

const loadRiskAccounts = async () => {
  try {
    const result = await getFriendRequestRiskRecords()
    if (result && result.success && Array.isArray(result.data)) {
      const accounts = new Set<string>()
      result.data.forEach((item: any) => {
        if (item.risk_type === 'ADD_FRIEND_FREQUENT' && item.account_id) {
          accounts.add(item.account_id)
        }
      })
      riskAccounts.value = Array.from(accounts)
    }
  } catch (error) {
    console.error('获取风控记录失败:', error)
  }
}

const loadFriendConfig = async () => {
  try {
    const savedConfig = localStorage.getItem('friendConfig')
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig)
      friendConfig.value = {
        ...friendConfig.value,
        ...parsed
      }
      return
    }
    await loadSopCache()
    if (sopCache.value?.friendConfig) {
      const { selectedAccounts, ...rest } = sopCache.value.friendConfig
      friendConfig.value = { ...friendConfig.value, ...rest, enabled: false }
    }
  } catch (error) {
    console.error('加载好友配置失败:', error)
  }
}

const loadAddNewFriendConfig = async () => {
  try {
    const savedConfig = localStorage.getItem('addFriendConfig')
    if (savedConfig) {
      // 兼容历史上已经写入 enabled=true 的缓存：每次新进程进入页面
      // 都以关闭状态显示，和后端“不恢复自动加好友任务”的语义一致。
      addFriendConfig.value = {
        ...addFriendConfig.value,
        ...JSON.parse(savedConfig),
        enabled: false
      }
      return
    }
    await loadSopCache()
    if (sopCache.value?.addFriendConfig) {
      addFriendConfig.value = { ...addFriendConfig.value, ...sopCache.value.addFriendConfig, enabled: false }
    }
  } catch (error) {
    console.error('加载好友配置失败:', error)
  }
}

// 修改时间格式化函数，使其兼容不同的日志时间格式
const formatTimestamp = (timestamp: string | number | undefined) => {
  try {
    if (!timestamp) {
      return '时间未知'
    }

    // 彻底解决时区多加8小时的问题：
    // 后端传过来的时间是：2026-03-31T11:02:06.942Z 或 2026-03-31T11:02:06.942+08:00
    // 我们直接截取 "T" 前面的日期和 "T" 后面的时间（去掉毫秒和时区），自己手动拼接即可。
    // 这样彻底绕过 JS 的 new Date() 时区转换坑。
    
    let timeStr = String(timestamp);
    
    // 如果是 ISO 格式包含 'T'
    if (timeStr.includes('T')) {
      const parts = timeStr.split('T');
      const datePart = parts[0]; // 2026-03-31
      
      let timePart = parts[1]; // 11:02:06.942Z 或 11:02:06.942+08:00
      
      // 核心修复：先去掉末尾的 'Z'
      timePart = timePart.replace('Z', '');
      // 再去掉时区符号 +08:00 等
      timePart = timePart.split('+')[0].split('-')[0];
      // 去掉毫秒
      timePart = timePart.split('.')[0];
      
      return `${datePart} ${timePart}`;
    }

    // 兜底逻辑：如果是其他格式，用 Date 解析
    // 检查是否是纯数字的时间戳字符串
    const isNumeric = /^\d+$/.test(timeStr);
    const date = new Date(isNumeric ? Number(timeStr) : timeStr);
    if (isNaN(date.getTime())) {
      return timestamp || '时间格式错误'
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    console.error('时间格式化错误:', error, 'timestamp:', timestamp)
    return timestamp || '时间格式错误'
  }
}

watch(
  () => route.query.function,
  (newValue) => {
    console.debug("AutoSOP==>watch", newValue)
    console.debug("AutoSOP类型检查:", {
      value: newValue,
      type: typeof newValue,
      isString: typeof newValue === 'string',
      isValid: ['comment', 'activate', 'addFriend', 'autofollow'].includes(newValue as string)
    })
    
    if (newValue && typeof newValue === 'string' && ['comment', 'activate', 'addFriend', 'autofollow'].includes(newValue)) {
      console.debug('AutoSOP条件判断通过，准备切换功能')
      try {
        console.debug('当前功能值:', currentFunction.value)
        // 处理autofollow到autoFollow的映射
        const targetFunction = newValue === 'autofollow' ? 'autoFollow' : newValue
        if (!requireFunction(targetFunction)) return
        currentFunction.value = targetFunction
        console.debug('AutoSOP当前功能已切换到:', currentFunction.value)
        
        if (newValue === 'addFriend') {
          console.debug('AutoSOP准备加载好友日志')
          loadFriendLogs()
        } else if (newValue === 'activate') {
          console.debug('AutoSOP准备加载任务日志')
          loadTaskLogs()
        } else if (newValue === 'autofollow') {
          console.debug('AutoSOP准备加载自动跟单任务')
          // 这里可以添加加载自动跟单任务的逻辑
        }
      } catch (error) {
        console.error('AutoSOP切换功能时发生错误:', error)
      }
    } else {
      console.debug('AutoSOP条件判断未通过，不执行切换')
    }
  },
  { immediate: true }
)

return (_ctx: any,_cache: any) => {
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_input_number = _resolveComponent("el-input-number")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_checkbox_group = _resolveComponent("el-checkbox-group")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_ChatDotRound = _resolveComponent("ChatDotRound")!
  const _component_el_scrollbar = _resolveComponent("el-scrollbar")!
  const _component_el_dialog = _resolveComponent("el-dialog")!
  const _directive_tooltip = _resolveDirective("tooltip")!

  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createElementVNode("div", _hoisted_1, [
      _createElementVNode("div", _hoisted_2, [
        _cache[44] || (_cache[44] = _createElementVNode("div", { class: "section-title" }, "功能", -1)),
        _createElementVNode("div", _hoisted_3, [
          _createElementVNode("div", {
            class: _normalizeClass(["function-item", { active: currentFunction.value === 'comment', disabled: !isFunctionEnabled('comment') }]),
            title: functionDisabledReason('comment'),
            onClick: _cache[0] || (_cache[0] = ($event: any) => (switchFunction('comment'))),
            "data-function": "comment"
          }, [
            _createElementVNode("div", _hoisted_5, [
              _createElementVNode("img", {
                src: _unref(getAutoSopIconPath)('comment', currentFunction.value === 'comment'),
                class: "icon",
                alt: "朋友圈运营"
              }, null, 8, _hoisted_6)
            ]),
            _cache[38] || (_cache[38] = _createElementVNode("div", { class: "function-tooltip" }, "朋友圈运营", -1))
          ], 10, _hoisted_4),
          _createElementVNode("div", {
            class: _normalizeClass(["function-item", { active: currentFunction.value === 'activate', disabled: !isFunctionEnabled('activate') }]),
            title: functionDisabledReason('activate'),
            onClick: _cache[1] || (_cache[1] = ($event: any) => (switchFunction('activate'))),
            "data-function": "activate"
          }, [
            _createElementVNode("div", _hoisted_8, [
              _createElementVNode("img", {
                src: _unref(getAutoSopIconPath)('activate', currentFunction.value === 'activate'),
                class: "icon",
                alt: "主动推送"
              }, null, 8, _hoisted_9)
            ]),
            _cache[39] || (_cache[39] = _createElementVNode("div", { class: "function-tooltip" }, "主动推送", -1))
          ], 10, _hoisted_7),
          _createElementVNode("div", {
            class: _normalizeClass(["function-item", { active: currentFunction.value === 'addFriend', disabled: !isFunctionEnabled('addFriend') }]),
            title: functionDisabledReason('addFriend'),
            onClick: _cache[2] || (_cache[2] = ($event: any) => (switchFunction('addFriend'))),
            "data-function": "addFriend"
          }, [
            _createElementVNode("div", _hoisted_11, [
              _createElementVNode("img", {
                src: _unref(getAutoSopIconPath)('addFriend', currentFunction.value === 'addFriend'),
                class: "icon",
                alt: "通过好友"
              }, null, 8, _hoisted_12)
            ]),
            _cache[40] || (_cache[40] = _createElementVNode("div", { class: "function-tooltip" }, "通过好友", -1))
          ], 10, _hoisted_10),
          _createElementVNode("div", {
            class: _normalizeClass(["function-item", { active: currentFunction.value === 'addNewFriend', disabled: !isFunctionEnabled('addNewFriend') }]),
            title: functionDisabledReason('addNewFriend'),
            onClick: _cache[3] || (_cache[3] = ($event: any) => (switchFunction('addNewFriend'))),
            "data-function": "addNewFriend"
          }, [
            _createElementVNode("div", _hoisted_14, [
              _createElementVNode("img", {
                src: _unref(getAutoSopIconPath)('addNewFriend', currentFunction.value === 'addNewFriend'),
                class: "icon",
                alt: "添加好友"
              }, null, 8, _hoisted_15)
            ]),
            _cache[41] || (_cache[41] = _createElementVNode("div", { class: "function-tooltip" }, "添加好友", -1))
          ], 10, _hoisted_13),
          _createElementVNode("div", {
            class: _normalizeClass(["function-item", { active: currentFunction.value === 'autoFollow', disabled: !isFunctionEnabled('autoFollow') }]),
            title: functionDisabledReason('autoFollow'),
            onClick: _cache[4] || (_cache[4] = ($event: any) => (switchFunction('autoFollow'))),
            "data-function": "autoFollow"
          }, [
            _createElementVNode("div", _hoisted_17, [
              _createElementVNode("img", {
                src: _unref(getAutoSopIconPath)('autoFollow', currentFunction.value === 'autoFollow'),
                class: "icon",
                alt: "自动跟进"
              }, null, 8, _hoisted_18)
            ]),
            _cache[42] || (_cache[42] = _createElementVNode("div", { class: "function-tooltip" }, "自动跟进", -1))
          ], 10, _hoisted_16),
          _createElementVNode("div", {
            class: _normalizeClass(["function-item", { active: currentFunction.value === 'sop', disabled: !isFunctionEnabled('sop') }]),
            title: functionDisabledReason('sop'),
            onClick: _cache[5] || (_cache[5] = ($event: any) => (switchFunction('sop'))),
            "data-function": "sop"
          }, [
            _createElementVNode("div", _hoisted_20, [
              _createVNode(_component_el_icon, {
                class: "icon",
                size: 22
              }, {
                default: _withCtx(() => [
                  _createVNode(_unref(Operation))
                ]),
                _: 1
              })
            ]),
            _cache[43] || (_cache[43] = _createElementVNode("div", { class: "function-tooltip" }, "SOP编排", -1))
          ], 10, _hoisted_19)
        ])
      ]),
      _createElementVNode("div", {
        class: "content-wrapper",
        ref_key: "contentWrapperRef",
        ref: contentWrapperRef
      }, [
        _createElementVNode("div", _hoisted_21, [
          (currentFunction.value === 'activate')
            ? (_openBlock(), _createBlock(MassSendingPanel, {
                key: 0,
                "greeting-groups": greetingGroups.value,
                "current-instance-nickname": currentInstanceNickname.value,
                "current-instance-account-id": currentInstanceAccountId.value,
                "runtime-enabled": isFunctionEnabled('activate'),
                "disabled-reason": functionDisabledReason('activate')
              }, null, 8, ["greeting-groups", "current-instance-nickname", "current-instance-account-id", "runtime-enabled", "disabled-reason"]))
            : _createCommentVNode("", true),
          (currentFunction.value === 'sop')
            ? (_openBlock(), _createBlock(SopOrchestration, {
                key: 1,
                "greeting-groups": greetingGroups.value,
                "coze-agents": cozeAgents.value,
                groups: groupList.value,
                "runtime-enabled": isFunctionEnabled('sop'),
                "disabled-reason": functionDisabledReason('sop'),
                "action-availability": sopActionAvailability.value
              }, null, 8, ["greeting-groups", "coze-agents", "groups", "runtime-enabled", "disabled-reason", "action-availability"]))
            : _createCommentVNode("", true),
          (currentFunction.value === 'comment')
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                _cache[50] || (_cache[50] = _createElementVNode("div", { class: "section-title" }, "自动评论朋友圈", -1)),
                _createElementVNode("div", _hoisted_22, [
                  _createVNode(_component_el_form, {
                    model: commentConfig.value,
                    "label-width": "120px"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_form_item, { label: "条数上限" }, {
                        default: _withCtx(() => [
                          _withDirectives(_createVNode(_component_el_input_number, {
                            modelValue: commentConfig.value.commentLimit,
                            "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event: any) => ((commentConfig.value.commentLimit) = $event)),
                            min: 1,
                            max: 1000,
                            placeholder: "请输入条数限制"
                          }, null, 8, ["modelValue"]), [
                            [_directive_tooltip, '请输入条数限制']
                          ])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "单好友次数" }, {
                        default: _withCtx(() => [
                          _withDirectives(_createVNode(_component_el_input_number, {
                            modelValue: commentConfig.value.perFriendLimit,
                            "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((commentConfig.value.perFriendLimit) = $event)),
                            min: 1,
                            max: 10,
                            placeholder: "单个好友评论次数上限"
                          }, null, 8, ["modelValue"]), [
                            [_directive_tooltip, '单个好友评论次数的上限']
                          ])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "循环间隔(分钟)" }, {
                        default: _withCtx(() => [
                          _withDirectives(_createVNode(_component_el_input_number, {
                            modelValue: commentConfig.value.checkInterval,
                            "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event: any) => ((commentConfig.value.checkInterval) = $event)),
                            min: 1,
                            max: 1440,
                            "default-value": 120,
                            placeholder: "任务循环执行间隔时间"
                          }, null, 8, ["modelValue"]), [
                            [_directive_tooltip, '任务循环执行间隔时间']
                          ])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "到达上次位置" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_select, {
                            modelValue: commentConfig.value.reachLastPosition,
                            "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event: any) => ((commentConfig.value.reachLastPosition) = $event)),
                            placeholder: "请选择处理方式"
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_option, {
                                label: "终止本次任务",
                                value: "stop"
                              }),
                              _createVNode(_component_el_option, {
                                label: "跳过并继续",
                                value: "skip"
                              })
                            ]),
                            _: 1
                          }, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "互动模式" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_select, {
                            modelValue: commentConfig.value.interactionMode,
                            "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event: any) => ((commentConfig.value.interactionMode) = $event)),
                            placeholder: "请选择互动模式"
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_option, {
                                label: "仅点赞",
                                value: "like_only"
                              }),
                              _createVNode(_component_el_option, {
                                label: "仅评论",
                                value: "comment_only"
                              }),
                              _createVNode(_component_el_option, {
                                label: "评论才点赞",
                                value: "like_and_comment"
                              }),
                              _createVNode(_component_el_option, {
                                label: "点赞+评论(必点赞)",
                                value: "like_always_and_comment"
                              })
                            ]),
                            _: 1
                          }, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "标签(非必须)" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_button, {
                            type: "primary",
                            disabled: !isFunctionEnabled('comment'),
                            title: functionDisabledReason('comment'),
                            onClick: openTagDialog
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_icon, { class: "el-icon--left" }, {
                                default: _withCtx(() => [
                                  _createVNode(_unref(PriceTag))
                                ]),
                                _: 1
                              }),
                              _cache[45] || (_cache[45] = _createTextVNode(" 选择标签 ", -1))
                            ]),
                            _: 1
                          }, 8, ["disabled", "title"])
                        ]),
                        _: 1
                      }),
                      (commentConfig.value.selectedTagNames.length > 0)
                        ? (_openBlock(), _createBlock(_component_el_form_item, {
                            key: 0,
                            label: ""
                          }, {
                            default: _withCtx(() => [
                              _createElementVNode("div", _hoisted_23, [
                                _createVNode(_component_el_icon, { style: {"margin-right":"6px"} }, {
                                  default: _withCtx(() => [
                                    _createVNode(_unref(PriceTag))
                                  ]),
                                  _: 1
                                }),
                                _cache[46] || (_cache[46] = _createElementVNode("span", { style: {"margin-right":"6px"} }, "已选：", -1)),
                                (commentConfig.value.selectedTagNames.length <= 3)
                                  ? (_openBlock(), _createElementBlock("span", _hoisted_24, _toDisplayString(commentConfig.value.selectedTagNames.join('、')), 1))
                                  : (_openBlock(), _createElementBlock("span", _hoisted_25, _toDisplayString(commentConfig.value.selectedTagNames.slice(0, 3).join('、')) + "...等" + _toDisplayString(commentConfig.value.selectedTagNames.length) + "个标签 ", 1))
                              ])
                            ]),
                            _: 1
                          }))
                        : _createCommentVNode("", true),
                      _createVNode(_component_el_form_item, {
                        label: "选择智能体",
                        class: "custom-label-form-item last-form-item"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_select, {
                            modelValue: commentConfig.value.agentId,
                            "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event: any) => ((commentConfig.value.agentId) = $event)),
                            placeholder: "请选择智能体"
                          }, {
                            default: _withCtx(() => [
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(cozeAgents.value, (agent) => {
                                return (_openBlock(), _createBlock(_component_el_option, {
                                  key: agent.botId,
                                  label: agent.name,
                                  value: agent.botId
                                }, null, 8, ["label", "value"]))
                              }), 128))
                            ]),
                            _: 1
                          }, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, {
                        label: "",
                        class: "align-right-form-item"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_checkbox, {
                            modelValue: commentConfig.value.multiCycleEnabled,
                            "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event: any) => ((commentConfig.value.multiCycleEnabled) = $event)),
                            onChange: onCommentMultiCycleToggle,
                            disabled: commentConfig.value.enabled
                          }, {
                            default: _withCtx(() => [...(_cache[47] || (_cache[47] = [
                              _createTextVNode(" 多微信循环 ", -1)
                            ]))]),
                            _: 1
                          }, 8, ["modelValue", "disabled"])
                        ]),
                        _: 1
                      }),
                      (commentConfig.value.multiCycleEnabled)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 1,
                            class: _normalizeClass(["multi-cycle-box", { disabled: commentConfig.value.enabled }]),
                            "aria-disabled": "commentConfig.enabled"
                          }, [
                            _cache[48] || (_cache[48] = _createElementVNode("div", { class: "multi-cycle-tip" }, "按勾选的账号循环执行朋友圈评论", -1)),
                            _createVNode(_component_el_checkbox_group, {
                              modelValue: commentConfig.value.selectedAccounts,
                              "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event: any) => ((commentConfig.value.selectedAccounts) = $event))
                            }, {
                              default: _withCtx(() => [
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeInstances.value, (inst) => {
                                  return (_openBlock(), _createBlock(_component_el_checkbox, {
                                    key: inst.account_id,
                                    label: inst.account_id,
                                    class: "instance-item",
                                    disabled: commentConfig.value.enabled
                                  }, {
                                    default: _withCtx(() => [
                                      _createTextVNode(_toDisplayString(inst.nickname), 1)
                                    ]),
                                    _: 2
                                  }, 1032, ["label", "disabled"]))
                                }), 128))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ], 2))
                        : _createCommentVNode("", true),
                      _createVNode(_component_el_form_item, null, {
                        default: _withCtx(() => [
                          _createElementVNode("div", _hoisted_26, [
                            _createVNode(CosmicSwitch, {
                              modelValue: commentConfig.value.enabled,
                              "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event: any) => ((commentConfig.value.enabled) = $event)),
                              loading: isRunning.value,
                              disabled: !isFunctionEnabled('comment'),
                              title: functionDisabledReason('comment'),
                              onChange: handleSwitchChange,
                              "active-text": "开启任务",
                              "inactive-text": "关闭任务"
                            }, null, 8, ["modelValue", "loading", "disabled", "title"])
                          ])
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }, 8, ["model"]),
                  (commentConfig.value.enabled)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_27, [
                        _createVNode(_component_el_icon, null, {
                          default: _withCtx(() => [
                            _createVNode(_unref(InfoFilled))
                          ]),
                          _: 1
                        }),
                        _cache[49] || (_cache[49] = _createElementVNode("span", null, "关闭开关后，等待一会即可自动终止朋友圈自动化任务~", -1))
                      ]))
                    : _createCommentVNode("", true)
                ])
              ], 64))
            : _createCommentVNode("", true),
          (currentFunction.value === 'addFriend')
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
                _cache[53] || (_cache[53] = _createElementVNode("div", { class: "section-title" }, "自动通过好友", -1)),
                (friendRequestExecutionTime.value)
                  ? (_openBlock(), _createElementBlock("div", _hoisted_28, [
                      _createVNode(_component_el_icon, null, {
                        default: _withCtx(() => [
                          _createVNode(_unref(InfoFilled))
                        ]),
                        _: 1
                      }),
                      _createElementVNode("span", null, _toDisplayString(friendRequestExecutionTime.value), 1)
                    ]))
                  : _createCommentVNode("", true),
                _createElementVNode("div", _hoisted_29, [
                  _createVNode(_component_el_form, {
                    model: friendConfig.value,
                    "label-width": "120px"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_form_item, { label: "每日通过上限" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input_number, {
                            modelValue: friendConfig.value.maxFriendsPerDay,
                            "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event: any) => ((friendConfig.value.maxFriendsPerDay) = $event)),
                            min: 1,
                            max: 100,
                            step: 1
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "检查间隔(分钟)" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input_number, {
                            modelValue: friendConfig.value.checkInterval,
                            "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event: any) => ((friendConfig.value.checkInterval) = $event)),
                            min: 5,
                            max: 120,
                            step: 5
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "单次最大处理" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input_number, {
                            modelValue: friendConfig.value.maxProcessPerTime,
                            "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event: any) => ((friendConfig.value.maxProcessPerTime) = $event)),
                            min: 1,
                            max: 20,
                            step: 1
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "打招呼话术" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_select, {
                            modelValue: friendConfig.value.greetingGroupId,
                            "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event: any) => ((friendConfig.value.greetingGroupId) = $event)),
                            placeholder: "选择打招呼话术组",
                            clearable: ""
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_option, {
                                label: "不发送打招呼",
                                value: ""
                              }),
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(greetingGroups.value, (group) => {
                                return (_openBlock(), _createBlock(_component_el_option, {
                                  key: group.id,
                                  label: group.name,
                                  value: group.id
                                }, null, 8, ["label", "value"]))
                              }), 128))
                            ]),
                            _: 1
                          }, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "自动拉群" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_select, {
                            modelValue: friendConfig.value.targetGroup,
                            "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event: any) => ((friendConfig.value.targetGroup) = $event)),
                            placeholder: "选择目标群聊",
                            filterable: "",
                            clearable: "",
                            onFocus: loadGroupList
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_option, {
                                label: "不自动拉群",
                                value: ""
                              }),
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(groupList.value, (group) => {
                                return (_openBlock(), _createBlock(_component_el_option, {
                                  key: group.name,
                                  label: group.name,
                                  value: group.name
                                }, null, 8, ["label", "value"]))
                              }), 128))
                            ]),
                            _: 1
                          }, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, {
                        label: "好友标签",
                        class: "friend-tag-input"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input, {
                            modelValue: friendConfig.value.tag,
                            "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event: any) => ((friendConfig.value.tag) = $event)),
                            placeholder: "请输入标签",
                            maxlength: 20,
                            onInput: validateTag
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_checkbox, {
                            modelValue: friendConfig.value.multiCycleEnabled,
                            "onUpdate:modelValue": _cache[21] || (_cache[21] = ($event: any) => ((friendConfig.value.multiCycleEnabled) = $event)),
                            onChange: onFriendMultiCycleToggle,
                            disabled: friendConfig.value.enabled
                          }, {
                            default: _withCtx(() => [...(_cache[51] || (_cache[51] = [
                              _createTextVNode(" 多微信循环 ", -1)
                            ]))]),
                            _: 1
                          }, 8, ["modelValue", "disabled"])
                        ]),
                        _: 1
                      }),
                      (friendConfig.value.multiCycleEnabled)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: _normalizeClass(["multi-cycle-box", { disabled: friendConfig.value.enabled }]),
                            "aria-disabled": "friendConfig.enabled"
                          }, [
                            _cache[52] || (_cache[52] = _createElementVNode("div", { class: "multi-cycle-tip" }, "按勾选的账号循环自动通过好友", -1)),
                            _createVNode(_component_el_checkbox_group, {
                              modelValue: friendConfig.value.selectedAccounts,
                              "onUpdate:modelValue": _cache[22] || (_cache[22] = ($event: any) => ((friendConfig.value.selectedAccounts) = $event))
                            }, {
                              default: _withCtx(() => [
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeInstances.value, (inst) => {
                                  return (_openBlock(), _createBlock(_component_el_checkbox, {
                                    key: inst.account_id,
                                    label: inst.account_id,
                                    class: "instance-item",
                                    disabled: friendConfig.value.enabled
                                  }, {
                                    default: _withCtx(() => [
                                      _createTextVNode(_toDisplayString(inst.nickname), 1)
                                    ]),
                                    _: 2
                                  }, 1032, ["label", "disabled"]))
                                }), 128))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ], 2))
                        : _createCommentVNode("", true),
                      _createVNode(_component_el_form_item, null, {
                        default: _withCtx(() => [
                          _createVNode(CosmicSwitch, {
                            modelValue: friendConfig.value.enabled,
                            "onUpdate:modelValue": _cache[23] || (_cache[23] = ($event: any) => ((friendConfig.value.enabled) = $event)),
                            loading: isRunning.value,
                            disabled: !isFunctionEnabled('addFriend'),
                            title: functionDisabledReason('addFriend'),
                            "active-text": "开启任务",
                            "inactive-text": "关闭任务",
                            onChange: handleFriendSwitchChange
                          }, null, 8, ["modelValue", "loading", "disabled", "title"])
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }, 8, ["model"])
                ])
              ], 64))
            : _createCommentVNode("", true),
          (currentFunction.value === 'addNewFriend')
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 4 }, [
                _createElementVNode("div", _hoisted_30, [
                  _cache[56] || (_cache[56] = _createElementVNode("span", null, "添加好友", -1)),
                  _createElementVNode("div", _hoisted_31, [
                    _createVNode(_component_el_button, {
                      type: "primary",
                      size: "small",
                      class: "sop-header-btn",
                      disabled: !isFunctionEnabled('addNewFriend'),
                      title: functionDisabledReason('addNewFriend'),
                      onClick: showImportDialog
                    }, {
                      default: _withCtx(() => [...(_cache[54] || (_cache[54] = [
                        _createTextVNode(" 导入名单 ", -1)
                      ]))]),
                      _: 1
                    }, 8, ["disabled", "title"]),
                    _createVNode(_component_el_button, {
                      type: "info",
                      plain: "",
                      size: "small",
                      class: "sop-header-btn",
                      onClick: showFriendList
                    }, {
                      default: _withCtx(() => [...(_cache[55] || (_cache[55] = [
                        _createTextVNode(" 记录 ", -1)
                      ]))]),
                      _: 1
                    })
                  ])
                ]),
                _createElementVNode("div", _hoisted_32, " 今日已加 " + _toDisplayString(todayAddedCount.value) + " 人，剩余可加 " + _toDisplayString(remainingCount.value) + " 人 ", 1),
                (riskAccounts.value.length > 0)
                  ? (_openBlock(), _createElementBlock("div", _hoisted_33, [
                      _createVNode(_component_el_alert, {
                        title: '微信 ' + riskAccounts.value.join(', ') + ' 风控中，暂无法加好友',
                        type: "warning",
                        "show-icon": "",
                        closable: false,
                        style: {"margin-top":"10px"}
                      }, null, 8, ["title"])
                    ]))
                  : _createCommentVNode("", true),
                (addFriendExecutionTime.value)
                  ? (_openBlock(), _createElementBlock("div", _hoisted_34, [
                      _createVNode(_component_el_icon, null, {
                        default: _withCtx(() => [
                          _createVNode(_unref(InfoFilled))
                        ]),
                        _: 1
                      }),
                      _createElementVNode("span", null, _toDisplayString(addFriendExecutionTime.value), 1)
                    ]))
                  : _createCommentVNode("", true),
                _createElementVNode("div", _hoisted_35, [
                  _createVNode(_component_el_form, {
                    model: addFriendConfig.value,
                    "label-width": "120px"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_form_item, { label: "每日添加上限" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input_number, {
                            modelValue: addFriendConfig.value.maxFriendsPerDay,
                            "onUpdate:modelValue": _cache[24] || (_cache[24] = ($event: any) => ((addFriendConfig.value.maxFriendsPerDay) = $event)),
                            min: 1,
                            max: 100,
                            step: 1
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "添加间隔(分钟)" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input_number, {
                            modelValue: addFriendConfig.value.interval,
                            "onUpdate:modelValue": _cache[25] || (_cache[25] = ($event: any) => ((addFriendConfig.value.interval) = $event)),
                            min: 1,
                            max: 120,
                            step: 5
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "单次添加人数" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input_number, {
                            modelValue: addFriendConfig.value.batchSize,
                            "onUpdate:modelValue": _cache[26] || (_cache[26] = ($event: any) => ((addFriendConfig.value.batchSize) = $event)),
                            min: 1,
                            max: 10,
                            step: 1
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "验证消息" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input, {
                            modelValue: addFriendConfig.value.verifyMessage,
                            "onUpdate:modelValue": _cache[27] || (_cache[27] = ($event: any) => ((addFriendConfig.value.verifyMessage) = $event)),
                            type: "textarea",
                            rows: 2,
                            placeholder: "请输入添加好友时的验证消息"
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_checkbox, {
                            modelValue: addFriendConfig.value.multiCycleEnabled,
                            "onUpdate:modelValue": _cache[28] || (_cache[28] = ($event: any) => ((addFriendConfig.value.multiCycleEnabled) = $event)),
                            onChange: onMultiCycleToggle,
                            disabled: addFriendConfig.value.enabled
                          }, {
                            default: _withCtx(() => [...(_cache[57] || (_cache[57] = [
                              _createTextVNode(" 多微信循环 ", -1)
                            ]))]),
                            _: 1
                          }, 8, ["modelValue", "disabled"])
                        ]),
                        _: 1
                      }),
                      (addFriendConfig.value.multiCycleEnabled)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: _normalizeClass(["multi-cycle-box", { disabled: addFriendConfig.value.enabled }]),
                            "aria-disabled": "addFriendConfig.enabled"
                          }, [
                            _cache[58] || (_cache[58] = _createElementVNode("div", { class: "multi-cycle-tip" }, "按勾选的账号循环添加好友", -1)),
                            _createVNode(_component_el_checkbox_group, {
                              modelValue: addFriendConfig.value.selectedAccounts,
                              "onUpdate:modelValue": _cache[29] || (_cache[29] = ($event: any) => ((addFriendConfig.value.selectedAccounts) = $event))
                            }, {
                              default: _withCtx(() => [
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeInstances.value, (inst) => {
                                  return (_openBlock(), _createBlock(_component_el_checkbox, {
                                    key: inst.account_id,
                                    label: inst.account_id,
                                    class: "instance-item",
                                    disabled: addFriendConfig.value.enabled
                                  }, {
                                    default: _withCtx(() => [
                                      _createTextVNode(_toDisplayString(inst.nickname), 1)
                                    ]),
                                    _: 2
                                  }, 1032, ["label", "disabled"]))
                                }), 128))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ], 2))
                        : _createCommentVNode("", true),
                      _createVNode(_component_el_form_item, null, {
                        default: _withCtx(() => [
                          _createVNode(CosmicSwitch, {
                            modelValue: addFriendConfig.value.enabled,
                            "onUpdate:modelValue": _cache[30] || (_cache[30] = ($event: any) => ((addFriendConfig.value.enabled) = $event)),
                            loading: isRunning.value,
                            disabled: !isFunctionEnabled('addNewFriend'),
                            title: functionDisabledReason('addNewFriend'),
                            "active-text": "开启任务",
                            "inactive-text": "关闭任务",
                            onChange: handleAddFriendSwitchChange
                          }, null, 8, ["modelValue", "loading", "disabled", "title"])
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }, 8, ["model"])
                ])
              ], 64))
            : _createCommentVNode("", true),
          (currentFunction.value === 'autoFollow')
            ? (_openBlock(), _createBlock(AutoFollowTaskList, {
                key: 5,
                ref: "autoFollowTaskListRef",
                "runtime-enabled": isFunctionEnabled('autoFollow'),
                "disabled-reason": functionDisabledReason('autoFollow')
              }, null, 8, ["runtime-enabled", "disabled-reason"]))
            : _createCommentVNode("", true)
        ]),
        (currentFunction.value !== 'sop')
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: _normalizeClass(["log-section", { 'hidden': !isLogVisible.value }])
            }, [
              _cache[64] || (_cache[64] = _createElementVNode("div", { class: "section-title" }, "操作日志", -1)),
              _createElementVNode("div", _hoisted_36, [
                _createVNode(_component_el_scrollbar, null, {
                  default: _withCtx(() => [
                    (currentFunction.value === 'comment')
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                          (momentLogs.value.length > 0)
                            ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(momentLogs.value, (log) => {
                                return (_openBlock(), _createElementBlock("div", {
                                  key: log.id,
                                  class: "log-item moment-log"
                                }, [
                                  _createElementVNode("div", _hoisted_37, [
                                    _createElementVNode("div", _hoisted_38, [
                                      _createElementVNode("span", _hoisted_39, _toDisplayString(formatTimestamp(log.timestamp)), 1),
                                      (log.account_id)
                                        ? (_openBlock(), _createBlock(_component_el_tag, {
                                            key: 0,
                                            size: "small",
                                            type: "info",
                                            style: {"margin-left":"8px"}
                                          }, {
                                            default: _withCtx(() => [
                                              _createTextVNode(_toDisplayString(log.account_id), 1)
                                            ]),
                                            _: 2
                                          }, 1024))
                                        : _createCommentVNode("", true)
                                    ])
                                  ]),
                                  _createElementVNode("div", _hoisted_40, [
                                    _createElementVNode("div", _hoisted_41, [
                                      _createElementVNode("div", _hoisted_42, [
                                        _createVNode(_component_el_icon, null, {
                                          default: _withCtx(() => [
                                            _createVNode(_unref(User))
                                          ]),
                                          _: 1
                                        }),
                                        _createElementVNode("span", null, _toDisplayString(log.publisher), 1)
                                      ]),
                                      _createElementVNode("div", _hoisted_43, _toDisplayString(log.content), 1),
                                      _createElementVNode("div", _hoisted_44, [
                                        (log.type.includes('like'))
                                          ? (_openBlock(), _createElementBlock("span", _hoisted_45, "❤ 点赞"))
                                          : _createCommentVNode("", true),
                                        (log.type.includes('comment') && log.comment_content && log.comment_content.trim() !== '')
                                          ? (_openBlock(), _createElementBlock("span", _hoisted_46, [
                                              _createElementVNode("span", _hoisted_47, "AI评论：" + _toDisplayString(log.comment_content), 1)
                                            ]))
                                          : _createCommentVNode("", true)
                                      ])
                                    ])
                                  ])
                                ]))
                              }), 128))
                            : (_openBlock(), _createElementBlock("div", _hoisted_48, [
                                _createElementVNode("img", {
                                  src: _unref(getPngIconPath)('empty'),
                                  alt: "暂无数据",
                                  class: "empty-icon"
                                }, null, 8, _hoisted_49),
                                _cache[59] || (_cache[59] = _createElementVNode("div", { class: "empty-text" }, "最近没有新的操作记录", -1))
                              ]))
                        ], 64))
                      : (currentFunction.value === 'activate')
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                            (filteredLogs.value.length > 0)
                              ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(filteredLogs.value, (log) => {
                                  return (_openBlock(), _createElementBlock("div", {
                                    key: log.id,
                                    class: "log-item task-log"
                                  }, [
                                    _createElementVNode("div", _hoisted_50, [
                                      _createElementVNode("div", _hoisted_51, [
                                        _createElementVNode("span", _hoisted_52, _toDisplayString(formatTimestamp(log.timestamp)), 1),
                                        (log.account_id)
                                          ? (_openBlock(), _createBlock(_component_el_tag, {
                                              key: 0,
                                              size: "small",
                                              type: "info",
                                              style: {"margin-left":"8px"}
                                            }, {
                                              default: _withCtx(() => [
                                                _createTextVNode(_toDisplayString(log.account_id), 1)
                                              ]),
                                              _: 2
                                            }, 1024))
                                          : _createCommentVNode("", true)
                                      ])
                                    ]),
                                    _createElementVNode("div", _hoisted_53, [
                                      _createElementVNode("div", _hoisted_54, [
                                        (log.progress !== undefined)
                                          ? (_openBlock(), _createElementBlock("div", _hoisted_55, " 发送给 " + _toDisplayString(log.total) + " 人，已完成 " + _toDisplayString(log.progress) + " 人 ", 1))
                                          : _createCommentVNode("", true),
                                        _createElementVNode("div", _hoisted_56, " 话术组：" + _toDisplayString(log.params?.agentId || '--'), 1),
                                        (log.params?.scheduleTime)
                                          ? (_openBlock(), _createElementBlock("div", _hoisted_57, " 执行时间：" + _toDisplayString(formatScheduleTime(log.params.scheduleTime)), 1))
                                          : _createCommentVNode("", true)
                                      ]),
                                      (log.error)
                                        ? (_openBlock(), _createElementBlock("div", _hoisted_58, [
                                            _createVNode(_component_el_icon, null, {
                                              default: _withCtx(() => [
                                                _createVNode(_unref(Warning))
                                              ]),
                                              _: 1
                                            }),
                                            _createElementVNode("span", null, _toDisplayString(log.error), 1)
                                          ]))
                                        : _createCommentVNode("", true)
                                    ])
                                  ]))
                                }), 128))
                              : (_openBlock(), _createElementBlock("div", _hoisted_59, [
                                  _createElementVNode("img", {
                                    src: _unref(getPngIconPath)('empty'),
                                    alt: "暂无数据",
                                    class: "empty-icon"
                                  }, null, 8, _hoisted_60),
                                  _cache[60] || (_cache[60] = _createElementVNode("div", { class: "empty-text" }, "最近没有新的操作记录", -1))
                                ]))
                          ], 64))
                        : (currentFunction.value === 'addFriend')
                          ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                              (friendLogs.value.length > 0)
                                ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(friendLogs.value, (log) => {
                                    return (_openBlock(), _createElementBlock("div", {
                                      key: log.task_id,
                                      class: "log-item friend-log"
                                    }, [
                                      _createElementVNode("div", _hoisted_61, [
                                        _createElementVNode("div", _hoisted_62, [
                                          _createElementVNode("span", _hoisted_63, _toDisplayString(formatTimestamp(log.time)), 1),
                                          (log.account_id)
                                            ? (_openBlock(), _createBlock(_component_el_tag, {
                                                key: 0,
                                                size: "small",
                                                type: "info",
                                                style: {"margin-left":"8px"}
                                              }, {
                                                default: _withCtx(() => [
                                                  _createTextVNode(_toDisplayString(log.account_id), 1)
                                                ]),
                                                _: 2
                                              }, 1024))
                                            : _createCommentVNode("", true)
                                        ])
                                      ]),
                                      _createElementVNode("div", _hoisted_64, [
                                        _createElementVNode("div", _hoisted_65, [
                                          _createElementVNode("div", _hoisted_66, " 本次执行通过了 " + _toDisplayString(log.processed_count) + " 个好友申请 ", 1),
                                          (log.tag)
                                            ? (_openBlock(), _createElementBlock("div", _hoisted_67, [
                                                _createVNode(_component_el_icon, null, {
                                                  default: _withCtx(() => [
                                                    _createVNode(_unref(PriceTag))
                                                  ]),
                                                  _: 1
                                                }),
                                                _createElementVNode("span", null, "标签: " + _toDisplayString(log.tag), 1)
                                              ]))
                                            : _createCommentVNode("", true),
                                          (log.targetGroup)
                                            ? (_openBlock(), _createElementBlock("div", _hoisted_68, [
                                                _createVNode(_component_el_icon, null, {
                                                  default: _withCtx(() => [
                                                    _createVNode(_component_ChatDotRound)
                                                  ]),
                                                  _: 1
                                                }),
                                                _createElementVNode("span", null, "拉群: " + _toDisplayString(log.targetGroup), 1)
                                              ]))
                                            : _createCommentVNode("", true),
                                          (log.processed_users && log.processed_users.length > 0)
                                            ? (_openBlock(), _createElementBlock("div", _hoisted_69, [
                                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(log.processed_users, (user, idx) => {
                                                  return (_openBlock(), _createElementBlock("div", {
                                                    key: idx,
                                                    class: "target-item"
                                                  }, [
                                                    _createElementVNode("div", _hoisted_70, [
                                                      _createElementVNode("span", {
                                                        class: "target-wxid",
                                                        title: user
                                                      }, _toDisplayString(user), 9, _hoisted_71)
                                                    ]),
                                                    _cache[61] || (_cache[61] = _createElementVNode("div", { class: "target-right" }, [
                                                      _createElementVNode("span", { class: "status-success" }, "已通过")
                                                    ], -1))
                                                  ]))
                                                }), 128))
                                              ]))
                                            : _createCommentVNode("", true)
                                        ])
                                      ])
                                    ]))
                                  }), 128))
                                : (_openBlock(), _createElementBlock("div", _hoisted_72, [
                                    _createElementVNode("img", {
                                      src: _unref(getPngIconPath)('empty'),
                                      alt: "暂无数据",
                                      class: "empty-icon"
                                    }, null, 8, _hoisted_73),
                                    _cache[62] || (_cache[62] = _createElementVNode("div", { class: "empty-text" }, "最近没有新的操作记录", -1))
                                  ]))
                            ], 64))
                          : (currentFunction.value === 'addNewFriend')
                            ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
                                (addFriendLogs.value.length > 0)
                                  ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(addFriendLogs.value, (log) => {
                                      return (_openBlock(), _createElementBlock("div", {
                                        key: log.task_id,
                                        class: "log-item friend-log"
                                      }, [
                                        _createElementVNode("div", _hoisted_74, [
                                          _createElementVNode("div", _hoisted_75, [
                                            _createElementVNode("span", _hoisted_76, _toDisplayString(formatTimestamp(log.time)), 1),
                                            (log.account_id)
                                              ? (_openBlock(), _createBlock(_component_el_tag, {
                                                  key: 0,
                                                  size: "small",
                                                  type: "info",
                                                  style: {"margin-left":"8px"}
                                                }, {
                                                  default: _withCtx(() => [
                                                    _createTextVNode(_toDisplayString(log.account_id), 1)
                                                  ]),
                                                  _: 2
                                                }, 1024))
                                              : _createCommentVNode("", true)
                                          ])
                                        ]),
                                        _createElementVNode("div", _hoisted_77, [
                                          _createElementVNode("div", _hoisted_78, [
                                            _createElementVNode("div", _hoisted_79, [
                                              _createElementVNode("span", null, "尝试添加 " + _toDisplayString(log.attempt_count) + " 人，成功 " + _toDisplayString(log.processed_count) + " 人", 1)
                                            ]),
                                            (log.tag)
                                              ? (_openBlock(), _createElementBlock("div", _hoisted_80, [
                                                  _createElementVNode("span", _hoisted_81, "验证信息：" + _toDisplayString(log.tag), 1)
                                                ]))
                                              : _createCommentVNode("", true),
                                            (log.targets && log.targets.length > 0)
                                              ? (_openBlock(), _createElementBlock("div", _hoisted_82, [
                                                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(log.targets, (target, idx) => {
                                                    return (_openBlock(), _createElementBlock("div", {
                                                      key: idx,
                                                      class: "target-item"
                                                    }, [
                                                      _createElementVNode("div", _hoisted_83, [
                                                        _createElementVNode("span", {
                                                          class: "target-name",
                                                          title: target.nickname
                                                        }, _toDisplayString(target.nickname || '未知'), 9, _hoisted_84),
                                                        _createElementVNode("span", {
                                                          class: "target-wxid",
                                                          title: target.wxid
                                                        }, "(" + _toDisplayString(target.wxid) + ")", 9, _hoisted_85)
                                                      ]),
                                                      _createElementVNode("div", _hoisted_86, [
                                                        (target.status === 'success')
                                                          ? (_openBlock(), _createElementBlock("span", _hoisted_87, "添加成功"))
                                                          : (_openBlock(), _createElementBlock("span", {
                                                              key: 1,
                                                              class: "status-failed",
                                                              title: target.error_msg
                                                            }, _toDisplayString(target.error_msg || '添加失败'), 9, _hoisted_88))
                                                      ])
                                                    ]))
                                                  }), 128))
                                                ]))
                                              : _createCommentVNode("", true)
                                          ])
                                        ])
                                      ]))
                                    }), 128))
                                  : (_openBlock(), _createElementBlock("div", _hoisted_89, [
                                      _createElementVNode("img", {
                                        src: _unref(getPngIconPath)('empty'),
                                        alt: "暂无数据",
                                        class: "empty-icon"
                                      }, null, 8, _hoisted_90),
                                      _cache[63] || (_cache[63] = _createElementVNode("div", { class: "empty-text" }, "最近没有新的操作记录", -1))
                                    ]))
                              ], 64))
                            : (currentFunction.value === 'autoFollow')
                              ? (_openBlock(), _createBlock(AutoFollowLogs, {
                                  key: 4,
                                  ref: "autoFollowLogsRef"
                                }, null, 512))
                              : _createCommentVNode("", true)
                  ]),
                  _: 1
                })
              ])
            ], 2))
          : _createCommentVNode("", true)
      ], 512),
      _createVNode(ImportFriendListDialog, {
        visible: importDialogVisible.value,
        "onUpdate:visible": _cache[31] || (_cache[31] = ($event: any) => ((importDialogVisible).value = $event)),
        cozeAgents: cozeAgents.value,
        "allowed-types": friendImportTypes.value,
        onImport: handleImportFriendList,
        onImportByAgent: handleImportByAgent
      }, null, 8, ["visible", "cozeAgents", "allowed-types"])
    ]),
    _createVNode(FriendListDialog, {
      visible: friendListVisible.value,
      "onUpdate:visible": _cache[32] || (_cache[32] = ($event: any) => ((friendListVisible).value = $event)),
      onRefresh: loadRemainingCount
    }, null, 8, ["visible"]),
    _createVNode(_component_el_dialog, {
      title: "需要授权",
      modelValue: authDialogVisible.value,
      "onUpdate:modelValue": _cache[35] || (_cache[35] = ($event: any) => ((authDialogVisible).value = $event)),
      width: "400px"
    }, {
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_91, [
          _createVNode(_component_el_alert, {
            title: "需要授权访问飞书文档",
            type: "info",
            description: "智能体需要获取飞书文档的访问权限，请点击下方按钮前往授权。",
            closable: false,
            "show-icon": ""
          }),
          _createElementVNode("div", _hoisted_92, [
            _createVNode(_component_el_button, {
              type: "primary",
              onClick: openAuthUrl
            }, {
              default: _withCtx(() => [...(_cache[65] || (_cache[65] = [
                _createTextVNode("去授权", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_el_button, {
              onClick: _cache[33] || (_cache[33] = ($event: any) => (authDialogVisible.value = false))
            }, {
              default: _withCtx(() => [...(_cache[66] || (_cache[66] = [
                _createTextVNode("取消", -1)
              ]))]),
              _: 1
            }),
            (hasClickedAuth.value)
              ? (_openBlock(), _createBlock(_component_el_button, {
                  key: 0,
                  type: "success",
                  onClick: _cache[34] || (_cache[34] = ($event: any) => (authDialogVisible.value = false))
                }, {
                  default: _withCtx(() => [...(_cache[67] || (_cache[67] = [
                    _createTextVNode("我已授权", -1)
                  ]))]),
                  _: 1
                }))
              : _createCommentVNode("", true)
          ])
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: tagDialogVisible.value,
      "onUpdate:modelValue": _cache[37] || (_cache[37] = ($event: any) => ((tagDialogVisible).value = $event)),
      title: "选择标签",
      width: "500px",
      onClose: cancelTagSelection,
      class: "tag-selection-dialog"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("div", _hoisted_96, [
          _createVNode(_component_el_button, {
            onClick: resetTagSelection,
            type: "danger",
            plain: ""
          }, {
            default: _withCtx(() => [...(_cache[68] || (_cache[68] = [
              _createTextVNode("重置", -1)
            ]))]),
            _: 1
          }),
          _createElementVNode("div", _hoisted_97, [
            _createVNode(_component_el_button, { onClick: cancelTagSelection }, {
              default: _withCtx(() => [...(_cache[69] || (_cache[69] = [
                _createTextVNode("取消", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_el_button, {
              type: "primary",
              onClick: confirmTagSelection
            }, {
              default: _withCtx(() => [...(_cache[70] || (_cache[70] = [
                _createTextVNode("确定", -1)
              ]))]),
              _: 1
            })
          ])
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_93, [
          _createVNode(_component_el_checkbox_group, {
            modelValue: tempSelectedTags.value,
            "onUpdate:modelValue": _cache[36] || (_cache[36] = ($event: any) => ((tempSelectedTags).value = $event)),
            class: "tag-checkbox-group"
          }, {
            default: _withCtx(() => [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(userTags.value, (tag) => {
                return (_openBlock(), _createBlock(_component_el_checkbox, {
                  key: tag.id,
                  label: tag.id,
                  class: "tag-checkbox-item"
                }, {
                  default: _withCtx(() => [
                    _createElementVNode("span", _hoisted_94, _toDisplayString(tag.name), 1),
                    _createElementVNode("span", _hoisted_95, "(" + _toDisplayString(tag.count) + ")", 1)
                  ]),
                  _: 2
                }, 1032, ["label"]))
              }), 128))
            ]),
            _: 1
          }, 8, ["modelValue"])
        ])
      ]),
      _: 1
    }, 8, ["modelValue"])
  ], 64))
}
}

})