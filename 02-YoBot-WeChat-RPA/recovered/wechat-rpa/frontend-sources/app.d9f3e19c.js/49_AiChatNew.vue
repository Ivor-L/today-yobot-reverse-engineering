import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, resolveComponent as _resolveComponent, createVNode as _createVNode, vModelCheckbox as _vModelCheckbox, createElementVNode as _createElementVNode, withDirectives as _withDirectives, createTextVNode as _createTextVNode, normalizeClass as _normalizeClass, withCtx as _withCtx, toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, createBlock as _createBlock, renderList as _renderList, Fragment as _Fragment, withModifiers as _withModifiers } from "vue"

const _hoisted_1 = { class: "ai-chat-container" }
const _hoisted_2 = { class: "settings-bar" }
const _hoisted_3 = { class: "settings-content" }
const _hoisted_4 = { class: "auto-reply-container" }
const _hoisted_5 = ["title"]
const _hoisted_6 = ["disabled"]
const _hoisted_7 = { class: "settings-right" }
const _hoisted_8 = { class: "main-content1" }
const _hoisted_9 = { class: "chat-list" }
const _hoisted_10 = { class: "chat-tabs" }
const _hoisted_11 = { class: "tab-header" }
const _hoisted_12 = { class: "tab-header-left" }
const _hoisted_13 = { class: "tab-title" }
const _hoisted_14 = {
  key: 0,
  class: "status-indicator-chat"
}
const _hoisted_15 = {
  key: 0,
  class: "account-header"
}
const _hoisted_16 = { class: "account-title" }
const _hoisted_17 = ["onClick"]
const _hoisted_18 = { class: "avatar-wrapper" }
const _hoisted_19 = {
  key: 0,
  class: "unread-dot"
}
const _hoisted_20 = { class: "chat-info" }
const _hoisted_21 = { class: "chat-header" }
const _hoisted_22 = { class: "chat-title" }
const _hoisted_23 = { class: "name-tag-container" }
const _hoisted_24 = ["title"]
const _hoisted_25 = { class: "chat-time" }
const _hoisted_26 = ["title"]
const _hoisted_27 = {
  key: 0,
  class: "account-info"
}
const _hoisted_28 = { class: "account-id" }
const _hoisted_29 = { class: "suspended-tab-label" }
const _hoisted_30 = {
  key: 0,
  class: "suspended-badge"
}
const _hoisted_31 = { class: "tab-header" }
const _hoisted_32 = { class: "tab-header-left" }
const _hoisted_33 = { class: "tab-title" }
const _hoisted_34 = {
  key: 1,
  class: "suspended-list"
}
const _hoisted_35 = ["onClick"]
const _hoisted_36 = { class: "avatar-wrapper" }
const _hoisted_37 = { class: "suspended-info" }
const _hoisted_38 = { class: "suspended-header" }
const _hoisted_39 = ["title"]
const _hoisted_40 = { class: "suspended-time-row" }
const _hoisted_41 = { class: "suspended-time" }
const _hoisted_42 = { class: "account-info" }
const _hoisted_43 = { class: "account-id" }
const _hoisted_44 = { class: "tab-header" }
const _hoisted_45 = {
  key: 0,
  class: "history-load-error"
}
const _hoisted_46 = {
  key: 0,
  class: "account-header"
}
const _hoisted_47 = { class: "account-title" }
const _hoisted_48 = ["onClick"]
const _hoisted_49 = { class: "avatar-wrapper" }
const _hoisted_50 = { class: "chat-info" }
const _hoisted_51 = { class: "chat-header" }
const _hoisted_52 = { class: "chat-title" }
const _hoisted_53 = { class: "name-tag-container" }
const _hoisted_54 = ["title"]
const _hoisted_55 = { class: "chat-time" }
const _hoisted_56 = ["title"]
const _hoisted_57 = {
  key: 0,
  class: "account-info"
}
const _hoisted_58 = { class: "account-id" }
const _hoisted_59 = { class: "current-chat-header" }
const _hoisted_60 = { class: "header-left" }
const _hoisted_61 = { class: "user-name" }
const _hoisted_62 = {
  class: "messages",
  ref: "messageContainer"
}
const _hoisted_63 = {
  key: 0,
  class: "sender-name"
}
const _hoisted_64 = { class: "voice-text" }
const _hoisted_65 = { class: "input-area" }
const _hoisted_66 = { class: "message-input-container" }
const _hoisted_67 = { class: "countdown-content" }
const _hoisted_68 = { class: "countdown-circle" }
const _hoisted_69 = {
  width: "40",
  height: "40",
  viewBox: "0 0 40 40"
}
const _hoisted_70 = ["stroke-dasharray"]
const _hoisted_71 = { class: "countdown-number" }
const _hoisted_72 = { class: "countdown-text" }
const _hoisted_73 = { class: "countdown-subtitle" }
const _hoisted_74 = { class: "input-content" }
const _hoisted_75 = { class: "input-footer" }
const _hoisted_76 = {
  key: 1,
  class: "empty-chat-container"
}

import { ref, onMounted, onUnmounted, nextTick, watch,computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLatestSessions, sendChatMessage, ChatSession, 
  ChatMessage, getChatMessages, startChatMonitor, stopChatMonitor, 
  getMonitorStatus,getStatsData, StatsData,getHistoryMessages,
  getHistorySessions,confirmAutoReply, createAutoReplyTask,updateManualReviewStatus,
  getSuspendedSessions, getSuspendedCount, unsuspendSession, SuspendedSession, deleteHistorySession } from '@/api/chat'
import AIStaffConfig from '@/components/chat/AIStaffConfig.vue'
import {User, Refresh,DocumentCopy, ArrowRight, Delete } from '@element-plus/icons-vue'  // 添加图标导入
import ReplyLogDialog from '@/components/chat/ReplyLogDialog.vue'  // 添加日志弹窗组件导入
import StatsPanel from '@/components/chat/StatsPanel.vue'  // 导入数据统计面板
import AccountStatusDialog from '@/components/chat/AccountStatusDialog.vue'  // 导入账号状态弹窗组件
import { getConfig } from '@/api/config'
import { useRouter } from 'vue-router'
import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'
import { mergeSessionsInNativeOrder } from '@/utils/sessionOrdering'

// 路由
const SUSPENDED_COUNT_INTERVAL_MS = 30_000

// 静默刷新：失败不弹提示。这是个后台轮询，报错只会打扰用户，
// 而且服务端已经记了日志。
interface SyncError {
  message: string;
  type: string;
}

// 窗口大小监听

export default /*@__PURE__*/_defineComponent({
  __name: 'AiChatNew',
  setup(__props) {

const router = useRouter()
const {
  isActionEnabled,
  actionReason,
  requireAction
} = useRuntimeCapabilityPresentation()
const isSending = ref(false)
// 状态变量
const logDialogVisible = ref(false)
const autoReplyEnabled = ref(false)
const messageInput = ref('')
const currentChat = ref<ChatSession | null>(null)
const loading = ref(false)
const clearCache = ref(false) // 清除消息缓存
const refreshingChat = ref(false)
const error = ref('')
const isInitialLoad = ref(true)
const isInputting = ref(false)
const currentProcessingName = ref('')
const strategyDialogVisible = ref(false)
const selectedStrategy = ref('none')
const isGenerating = ref(false)
const isProcessingChat = ref(false)
const chatList = ref<ChatSession[]>([])
const messages = ref<ChatMessage[]>([])
const refreshing = ref(false)
const isNarrowScreen = ref(window.innerWidth < 600)
const statsExpanded = ref(false)
const activeTab = ref('recent')
const currentTaskId = ref(null)  // 当前任务ID
const pendingReply = ref<{task_id: string, content: string, timeout?: number} | null>(null)  // 待确认的回复信息
const countdownTimer = ref<number | null>(null)  // 倒计时定时器
const countdown = ref(0)  // 倒计时秒数
const isAutoSending = ref(false)  // 是否正在自动发送倒计时
const manualReviewEnabled = ref(false)  // 人工复核开关状态

// 挂起列表相关
const suspendedList = ref<SuspendedSession[]>([])
const refreshingSuspended = ref(false)

// 挂起数量（tab 角标）。单独维护而不是用 suspendedList.length：
// 列表只在切到挂起 tab 时才拉，而角标恰恰是要给"没在看挂起 tab"的人提醒的。
const suspendedCount = ref(0)
const suspendedCountTimer = ref<number | null>(null)
const refreshSuspendedCount = async () => {
  suspendedCount.value = await getSuspendedCount()
}

// 历史会话相关
const loadingHistory = ref(false)
const historyLoadError = ref('')
const collapsedGroups = ref<Record<string, boolean>>({})

// 智能体配置
const cozeAgents = ref<any[]>([])
const historySessions = ref<ChatSession[]>([])
// 模拟数据统计数据
const statsData = ref<StatsData>({
  sessionCount: 0,
  sessionIncrease: 0,
  messageCount: 0,
  messageIncrease: 0,
  savedHours: 0,
  savedMoney: 0
})

// 计算属性：按账号分组的历史会话
const groupedHistoryList = computed(() => {
  const groups: Record<string, { nickname: string, sessions: ChatSession[] }> = {}
  
  historySessions.value.forEach(session => {
    const accountId = session.account_id || 'unknown'
    const nickname = session.account_nickname || '未知账号'
    
    if (!groups[accountId]) {
      groups[accountId] = {
        nickname,
        sessions: []
      }
    }
    
    // 生成唯一ID，避免多账号会话ID冲突
    session.unique_id = session.unique_id || `${accountId}_${session.name}`
    groups[accountId].sessions.push(session)
  })
  
  return groups
})

// 格式化挂起时间
const formatSuspendedTime = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

// 刷新挂起列表
const refreshSuspendedList = async () => {
  refreshingSuspended.value = true
  try {
    suspendedList.value = await getSuspendedSessions()
    // 列表是权威值，拿到就把角标对齐，省得两个数字打架
    suspendedCount.value = suspendedList.value.length
  } catch (error) {
    console.error('刷新挂起列表失败:', error)
    ElMessage.error('刷新挂起列表失败')
  } finally {
    refreshingSuspended.value = false
  }
}

// 解除挂起确认
const confirmUnsuspend = (session: SuspendedSession) => {
  ElMessageBox.confirm(
    `是否解除 ${session.session_name} 的挂起状态？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    const success = await unsuspendSession(session.session_name, session.account_id)
    if (success) {
      ElMessage.success('解除挂起成功')
      refreshSuspendedList()
    } else {
      ElMessage.error('解除挂起失败')
    }
  }).catch(() => {
    // 取消
  })
}

// 刷新历史会话列表
const refreshHistoryList = async () => {
  loadingHistory.value = true
  historyLoadError.value = ''
  try {
    historySessions.value = await getHistorySessions()
    // 默认展开所有分组
    Object.keys(groupedHistoryList.value).forEach(accId => {
      collapsedGroups.value[accId] = false
    })
  } catch (error) {
    console.error('刷新历史会话失败:', error)
    historySessions.value = []
    historyLoadError.value = '历史会话加载失败，请检查 RPA 历史接口'
    ElMessage.error(historyLoadError.value)
  } finally {
    loadingHistory.value = false
  }
}

// 切换分组折叠状态
const toggleGroup = (accountId: string) => {
  collapsedGroups.value[accountId] = !collapsedGroups.value[accountId]
}

// 监听tab切换
watch(activeTab, (newTab) => {
  if (newTab === 'history') {
    refreshHistoryList()
  } else if (newTab === 'suspended') {
    refreshSuspendedList()
  } else if (newTab === 'recent') {
    fetchSessionList()
  }
})

const handleManualReviewChange = async (val: boolean) => {
  if (!requireAction('ai-chat.manual-review.toggle')) {
    manualReviewEnabled.value = false
    return
  }
  // 确保val是布尔值
  const enabled = typeof val === 'boolean' ? val : manualReviewEnabled.value;
  
  if (!autoReplyEnabled.value) {
    return
  }
  
  try {
    await updateManualReviewStatus(enabled)
    ElMessage.success(`已${enabled ? '开启' : '关闭'}人工复核`)
  } catch (error) {
    console.error('更新人工复核状态失败:', error)
    ElMessage.error('更新人工复核状态失败')
    // 回滚状态
    manualReviewEnabled.value = !enabled
  }
}
// 缓存和定时器
const messageCache = new Map()
const lastMessageTimes = new Map<number, { time: number; content: string }>()

// 事件处理器
const monitorStatusHandler = ((event: CustomEvent) => {
  const { running } = event.detail;
  autoReplyEnabled.value = running;
}) as EventListener;

// 错误类型定义
const handleResize = () => {
  const newIsNarrow = window.innerWidth < 600
  if (isNarrowScreen.value !== newIsNarrow) {
    isNarrowScreen.value = newIsNarrow
  }
}

const taskSessionHandler = ((event: CustomEvent) => {
  const { status, session_name } = event.detail;
  if (status === 'processing') {
    currentProcessingName.value = session_name;
    isProcessingChat.value = true;
  } else {
    if (currentProcessingName.value === session_name) {
      currentProcessingName.value = '';
      isProcessingChat.value = false;
    }
    // 任务完成时自动刷新数据面板
    if (status === 'completed') {
      refreshStatsData();
    }
  }
}) as EventListener;

const sessionListHandler = ((event: CustomEvent) => {
  const { sessions } = event.detail;
  if (Array.isArray(sessions)) {
    const processedList = sessions.map(session => ({
      id: session.unique_id || session.id || Date.now(),
      name: session.name || '',
      avatar: session.avatar || '',
      lastMessage: session.lastMessage || '',
      lastTime: session.lastTime || '',
      unread: session.unread || 0,
      isGroup: session.isGroup || false,
      account_id: session.account_id || '',
      account_nickname: session.account_nickname || '',
      unique_id: session.unique_id || session.name
    }));
    
    // 每次推送都是该账号的完整、有序快照。按账号替换，既保留其他账号，
    // 又让刚移动到微信列表顶部的会话同步移动到页面顶部。
    chatList.value = mergeSessionsInNativeOrder(chatList.value || [], processedList);
  }
}) as EventListener;

// 刷新统计数据
const refreshStatsData = async () => {
  try {
    const data = await getStatsData()
    statsData.value = data
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 切换数据统计面板显示状态
const toggleStatsPanel = async () => {
  statsExpanded.value = !statsExpanded.value
  if (statsExpanded.value) {
    await refreshStatsData()
  }
}
// 删除历史会话本地记录（用于清理重名/被污染的会话）
const deletingHistory = ref(false)
const handleDeleteHistorySession = async () => {
  if (!currentChat.value) return
  const session = currentChat.value
  try {
    await ElMessageBox.confirm(
      `确定删除会话「${session.name}」的本地聊天记录吗？此操作不可恢复。`,
      '删除会话记录',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return // 用户取消
  }
  deletingHistory.value = true
  try {
    const result = await deleteHistorySession(session.name, session.account_id)
    if (result.success) {
      ElMessage.success('已删除会话记录')
      // 从列表移除该会话（按账号+会话名匹配）
      historySessions.value = historySessions.value.filter(
        s => !(s.name === session.name && s.account_id === session.account_id)
      )
      // 清空右侧选中与消息
      currentChat.value = null
      messages.value = []
    } else {
      ElMessage.error(result.error || '删除会话记录失败')
    }
  } catch (err) {
    ElMessage.error('删除会话记录失败')
  } finally {
    deletingHistory.value = false
  }
}

// 选择历史会话
const selectHistoryChat = async (session: ChatSession) => {
  if (currentChat.value?.id === session.id) return
  currentChat.value = session
  
  try {
    // 清空当前消息列表
    messages.value = []
    
    // 获取历史聊天记录
    const result = await getHistoryMessages(session.name, session.account_id)
    const chatMessages = result.messages || []
    
    // 更新消息列表
    if (Array.isArray(chatMessages)) {
      messages.value = chatMessages
    }
    
    await scrollToBottom()
  } catch (err) {
    error.value = '加载历史聊天记录失败'
    loading.value = false
  }
}
// 检查监控状态
const checkMonitorStatus = async () => {
  try {
    const result = await getMonitorStatus()
    if (result.success) {
      autoReplyEnabled.value = result.data.running
      // 添加获取人工复核状态的逻辑
      if (result.data.manual_review_enabled !== undefined) {
        manualReviewEnabled.value = result.data.manual_review_enabled
      }
    }
  } catch (error) {
    console.error('获取监控状态失败:', error)
  }
}
const pendingReplyHandler = ((event: CustomEvent) => {
  handlePendingReply(event)
}) as EventListener;

// 初始化加载会话列表
onMounted(async () => {
  await loadCozeAgents()
  await checkMonitorStatus()

  // 角标要在用户【没点开挂起 tab】时也准，所以进页面就拉一次并定时刷新。
  // 用的是只读内存的轻量接口，30 秒一次的开销可以忽略。
  refreshSuspendedCount()
  suspendedCountTimer.value = window.setInterval(() => {
    refreshSuspendedCount().then(() => {
      // 正停在挂起 tab 上时，数量变了就把列表也拉一次，
      // 否则会出现"角标显示 1、列表却是空的"这种自相矛盾的画面。
      if (activeTab.value === 'suspended'
          && suspendedCount.value !== suspendedList.value.length) {
        refreshSuspendedList()
      }
    })
  }, SUSPENDED_COUNT_INTERVAL_MS)
  
  // 监听监控状态
  window.addEventListener('monitor-status', monitorStatusHandler);
  window.addEventListener('task-session', taskSessionHandler);
  window.addEventListener('session-list', sessionListHandler);
  window.addEventListener('pending-reply', pendingReplyHandler);
  
  await nextTick()
  handleResize() // 初始化时执行一次
  window.addEventListener('resize', handleResize)
  
  // 在下一个渲染帧移除初始化标记
  requestAnimationFrame(() => {
    isInitialLoad.value = false
  })
})

onUnmounted(() => {
  // 移除事件监听器
  window.removeEventListener('monitor-status', monitorStatusHandler);
  window.removeEventListener('task-session', taskSessionHandler);
  window.removeEventListener('session-list', sessionListHandler);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('pending-reply', pendingReplyHandler);
  if (suspendedCountTimer.value !== null) {
    clearInterval(suspendedCountTimer.value)
    suspendedCountTimer.value = null
  }
  clearPendingReply()
})

// 加载智能体配置
const loadCozeAgents = async () => {
  try {
    const result = await getConfig('agents')
    if (result.success && result.data) {
      cozeAgents.value = Array.isArray(result.data) ? result.data : result.data.agents || []
      console.debug('加载到的智能体配置:', cozeAgents.value)
    }
  } catch (error) {
    console.error('加载智能体配置失败:', error)
  }
}

// 刷新当前会话消息
const refreshCurrentChat = async () => {
  if (!currentChat.value || refreshingChat.value) return
  
  refreshingChat.value = true
  try {
    const { messages: chatMessages, chatType } = await getChatMessages(currentChat.value.name, currentChat.value.account_id)
    
    // 检查是否是公众号会话
    if (chatType === 'official_account') {
      ElMessage.warning('公众号会话不支持查看消息')
      return
    }
    if (Array.isArray(chatMessages)) {
      messages.value = chatMessages
    }
    await scrollToBottom()
  } catch (error) {
    console.error('刷新消息失败:', error)
    ElMessage.error('刷新消息失败')
  } finally {
    refreshingChat.value = false
  }
}

// 显示日志对话框
const showLogDialog = () => {
  logDialogVisible.value = true
}

// 刷新会话列表
const handleRefresh = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await fetchSessionList()
  } catch (error) {
    console.error('刷新会话列表失败:', error)
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

// 显示策略对话框
const showStrategyDialog = () => {
  strategyDialogVisible.value = true
}

// 生成AI回复
const generateAIResponse = async () => {
  if (!requireAction('ai-chat.reply.generate')) return
  if (!currentChat.value) {
    ElMessage.warning('请先选择聊天对象')
    return
  }
  // 获取最后一条非自己发送的消息
  if (!currentChat.value.lastMessage) {
    ElMessage.warning('没有找到可回复的用户消息')
    return
  }
  isGenerating.value = true
  try {
    // 调用后端创建自动回复任务
    const result = await createAutoReplyTask({
      sessionId: currentChat.value.id,
      content: currentChat.value.lastMessage, // 传递最新消息
      userName: currentChat.value.name,
      sessionName: currentChat.value.name,
      isGroup: currentChat.value.isGroup || false,
      accountId: currentChat.value.account_id // 传递账号ID
    })

    if (result.success) {
      if (result.message === 'task_exists') {
        ElMessage.warning('该会话已有AI回复任务正在处理中，请勿重复创建')
      } else {
        ElMessage.success('AI正在生成回复，请稍候...')
        // 存储任务ID，用于后续取消操作
        currentTaskId.value = result.taskId
      }
    } else {
      throw new Error(result.error || '创建回复任务失败')
    }
  } catch (error) {
    console.error('创建AI回复任务失败:', error)
    ElMessage.error('创建AI回复任务失败')
  } finally {
    isGenerating.value = false
  }
}

// 处理策略变更
const handleStrategyChange = async (strategyType: string) => {
  selectedStrategy.value = strategyType
}

// 账号状态检查弹窗显示状态
const showAccountStatusDialog = ref(false)
const accountStatusList = ref<any[]>([])

// 处理账号状态弹窗确认
const handleAccountStatusConfirm = () => {
  // 弹窗关闭后不做其他操作，用户需要手动重新开启自动回复
}

// 自动回复开关变更处理
const handleAutoReplyChange = async (val: string | number | boolean) => {
  if (!requireAction('ai-chat.monitor.toggle')) {
    autoReplyEnabled.value = false
    return
  }
  if (val) {
    try {
      const result = await startChatMonitor({
        manualReview: manualReviewEnabled.value
      })
      if (result.status !== 'success') {
        // 检查是否是配置验证失败
        if (result.code === 'VALIDATION_FAILED' && result.accounts) {
          // 显示账号状态检查弹窗
          accountStatusList.value = result.accounts
          showAccountStatusDialog.value = true
          autoReplyEnabled.value = false
          return
        }
        // 其他错误显示错误信息
        ElMessage.error(result.message || '启动监控失败')
        autoReplyEnabled.value = false
        return
      }
      // 启动成功
      ElMessage.success(result.message || '自动回复已启动')
    } catch (error: unknown) {
      // 处理同步错误
      if (error instanceof Error && typeof error.message === 'string') {
          try {
            const errorData = JSON.parse(error.message) as SyncError
            if (errorData.type === 'SYNC_ERROR') {
              ElMessageBox.confirm(
                errorData.message,
                '提示',
                {
                  confirmButtonText: '去同步',
                  cancelButtonText: '取消',
                  type: 'warning',
                }
              ).then(() => {
                router.push('/mass-sending?tab=group')
              }).catch(() => {
                autoReplyEnabled.value = false
              })
              return
            }
          } catch {}
        }
      autoReplyEnabled.value = false
      return
    }
  } else {
    await stopChatMonitor()
    manualReviewEnabled.value = false
    try {
      await updateManualReviewStatus(false)
    } catch {}
  }
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick() // 确保 DOM 已更新
  const container = document.querySelector('.messages')
  if (container) {
    // 使用 setTimeout 确保在下一个事件循环执行滚动
    setTimeout(() => {
      container.scrollTop = container.scrollHeight
    }, 100)
  }
}

// 在 messages 数组变化时自动滚动
watch(() => messages.value, () => {
  scrollToBottom()
}, { deep: true })
watch(autoReplyEnabled, (enabled) => {
  if (!enabled) {
    manualReviewEnabled.value = false
  }
})

// 输入框获取焦点处理
const handleInputFocus = () => {
  isInputting.value = true
}

// 清除消息缓存
const clearMessageCache = () => {
  messageCache.clear()
  lastMessageTimes.clear()
  chatList.value = []
  messages.value = []
}

// 选择聊天会话，仅切换选中的会话不刷新消息
const selectChat = async (chat: ChatSession, isManualSelect = true) => {
  if (currentChat.value?.id === chat.id) return { messages: messages.value }
  currentChat.value = chat
}

// 发送消息
const sendMessage = async (content: string) => {
  if (!requireAction('ai-chat.message.send')) return
  if (!currentChat.value) {
    ElMessage.warning('请先选择聊天对象')
    return
  }
  
  messageInput.value = ''
  
  try {
    const result = await sendChatMessage(currentChat.value.name, content)
    console.debug('发送消息结果:', result)
    
    if (result.status === 'success') {
      console.debug("刷新消息列表，当前对话：",currentChat);   
      // 如果服务端返回了完整的消息记录，则更新整个消息列表
      if (result.data?.messages && Array.isArray(result.data.messages)) {
        // 直接使用服务端返回的消息列表更新
        messages.value = result.data.messages
      }       
      await scrollToBottom()
    } else {
      error.value = result.message || '发送消息失败'
    }
  } catch (err) {
    error.value = '发送消息失败'
  }
}

// 手动发送消息
const sendMessageByHand = async () => {
  if (!requireAction('ai-chat.message.send')) return
  if (!messageInput.value.trim()) {
    ElMessage.warning('请输入消息内容')
    return
  }
  
  // 防止重复点击
  if (isSending.value) {
    return
  }
  
  // 设置发送状态
  isSending.value = true
  
  try {
    // 立即停止倒计时，提供即时反馈
    if (countdownTimer.value) {
      clearInterval(countdownTimer.value)
      countdownTimer.value = null
    }
    isAutoSending.value = false
    
    // 如果是待确认的回复，调用确认API
    if (pendingReply.value && currentTaskId.value) {
      try {
        await confirmAutoReply({
          task_id: currentTaskId.value,
          action: 'confirm',
          final_content: messageInput.value.trim()
        })
        
        clearPendingReply()
        ElMessage.success('回复已发送')
        return
      } catch (error) {
        console.error('确认回复失败:', error)
        ElMessage.error('发送失败')
        // 如果发送失败，恢复倒计时状态
        isAutoSending.value = true
        startCountdown(countdown.value || 30)
        return
      }
    }
    
    // 发送普通消息
    await sendMessage(messageInput.value)
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送失败')
  } finally {
    // 无论成功还是失败，都要重置发送状态
    isSending.value = false
  }
}

// 获取会话列表
const fetchSessionList = async () => {
  try {
    if (clearCache.value) {
      clearMessageCache()
    }
    const list = await getLatestSessions()
    
    // 处理每个会话的最新消息，包含多账号信息
    const processedList = list.map(session => {
      // 确保 session 对象包含必要的字段，包括多账号相关字段
      const processedSession = {
        id: session.unique_id || session.id || Date.now(), // 优先使用unique_id
        name: session.name || '',
        avatar: session.avatar || '',
        lastMessage: session.lastMessage || '',
        lastTime: session.lastTime || '',
        unread: session.unread || 0,
        isGroup: session.isGroup || false,
        account_id: session.account_id || '',
        account_nickname: session.account_nickname || '',
        unique_id: session.unique_id || session.name
      }
      
      return processedSession
    })
    
    chatList.value = processedList
    return processedList
  } catch (error) {
    console.error('获取会话列表失败:', error)
    ElMessage.error('获取会话列表失败')
    return []
  }
}
// 处理推送过来的待确认回复
const handlePendingReply = (event: CustomEvent) => {
  const data = event.detail
  
  // 如果开启了自动回复且当前不在新会话列表，自动切换到新会话列表
  if (autoReplyEnabled.value && activeTab.value !== 'recent') {
    activeTab.value = 'recent'
  }

  console.debug('收到待确认回复:', data, chatList)
  // 根据unique_id查找对应的会话
  const uniqueId = data.unique_id || `${data.account_id}_${data.session_name}`
  let targetChat = null
  // 根据当前activeTab决定在哪个列表中查找会话
  if (activeTab.value === 'recent') {
    // 在最近会话列表中查找，优先使用unique_id
    targetChat = chatList.value.find(chat => 
      chat.unique_id === uniqueId || chat.id === uniqueId
    )
  } else if (activeTab.value === 'history') {
    // 在历史会话列表中查找，优先使用unique_id
    targetChat = historySessions.value.find(chat => 
      chat.unique_id === uniqueId || chat.id === uniqueId
    )
  }
  if (!targetChat) {
    console.warn(`未找到会话: ${data.session_name} (账号: ${data.account_id})`)
    ElMessage.warning(`未找到会话: ${data.session_name} (账号: ${data.account_id})`)
    return
  }
  
  // 如果不是当前选中的会话，自动切换到目标会话
  // selectChat(targetChat, false) 
    // 根据会话类型选择正确的切换方法
    if (activeTab.value === 'recent') {
    // 如果不是当前选中的会话，自动切换到目标会话
    selectChat(targetChat, false)
  } else if (activeTab.value === 'history') {
    // 切换到历史会话
    selectHistoryChat(targetChat)
  }
  
  // 填充AI回复内容（现在无论是否为当前会话都会执行）
  pendingReply.value = {
    task_id: data.task_id,
    content: data.ai_reply,  // 后端字段是ai_reply
    timeout: data.timeout
  }
  messageInput.value = data.ai_reply || ''  // 使用ai_reply字段
  currentTaskId.value = data.task_id
  
  // 开始倒计时
  startCountdown(data.timeout || 30)
  
  ElMessage({
    message: `AI回复已生成，将在${data.timeout || 30}秒后自动发送`,
    type: 'success',
    duration: 2000
  })
}
const countdownOverlayRef = ref<HTMLElement | null>(null)  // 倒计时浮窗的引用

// 添加computed属性计算圆形进度条样式
const circleProgress = computed(() => {
  if (countdown.value <= 0) return 0
  const initialTime = pendingReply.value?.timeout || 30
  const progress = ((initialTime - countdown.value) / initialTime) * 100
  return Math.min(progress, 100)
})

// 计算圆形进度条的stroke-dasharray
const circleStrokeDasharray = computed(() => {
  const circumference = 2 * Math.PI * 18 // 半径为18的圆周长
  const progress = circleProgress.value
  const dashLength = (progress / 100) * circumference
  return `${dashLength} ${circumference}`
})

// 按账号分组的最近会话列表
const groupedChatList = computed(() => {
  const groups: Record<string, { sessions: any[], lastTime: string }> = {}
  
  chatList.value.forEach(chat => {
    const accountId = chat.account_id || '默认账号'
    if (!groups[accountId]) {
      groups[accountId] = { sessions: [], lastTime: '' }
    }
    groups[accountId].sessions.push(chat)
    // 记录该账号下最新的会话时间，用于账号排序
    if (!groups[accountId].lastTime || (chat.lastTime && chat.lastTime > groups[accountId].lastTime)) {
      groups[accountId].lastTime = chat.lastTime || ''
    }
  })
  
  // chatList 已按后端的微信原生顺序组织；不要用浏览器解析微信相对时间。
  return groups
})

// 按账号分组的历史会话列表
const groupedHistorySessions = computed(() => {
  const groups: Record<string, { sessions: any[], lastTime: string }> = {}
  
  historySessions.value.forEach(session => {
    const accountId = session.account_id || '默认账号'
    if (!groups[accountId]) {
      groups[accountId] = { sessions: [], lastTime: '' }
    }
    groups[accountId].sessions.push(session)
    // 记录该账号下最新的会话时间，用于账号排序
    if (!groups[accountId].lastTime || (session.lastTime && session.lastTime > groups[accountId].lastTime)) {
      groups[accountId].lastTime = session.lastTime || ''
    }
  })
  
  // 对每个账号内的会话按时间排序
  Object.values(groups).forEach(group => {
    group.sessions.sort((a, b) => {
      const timeA = new Date(a.lastTime || 0).getTime()
      const timeB = new Date(b.lastTime || 0).getTime()
      return timeB - timeA
    })
  })
  
  return groups
})
// 开始倒计时
const startCountdown = (seconds: number) => {
  countdown.value = seconds
  isAutoSending.value = true
  
  countdownTimer.value = setInterval(() => {
    countdown.value--
    
    // 使用ref获取DOM元素，而不是this.$el
    if (countdown.value <= 5 && countdownOverlayRef.value) {
      countdownOverlayRef.value.classList.add('urgent')
    }
    
    if (countdown.value <= 0) {
      // 倒计时结束，自动确认发送
      autoConfirmReply()
      // 立即清除定时器，防止负数
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
        countdownTimer.value = null
      }
      // 确保倒计时不为负数
      countdown.value = 0
    }
  }, 1000)
}

// 自动确认发送回复
const autoConfirmReply = async () => {
  if (!pendingReply.value) return
  if (!requireAction('ai-chat.pending-reply.confirm')) {
    clearPendingReply()
    return
  }
  
  try {
    await confirmAutoReply({
      task_id: pendingReply.value.task_id,
      action: 'confirm',
      final_content: messageInput.value
    })
    
    clearPendingReply()
    ElMessage.success('回复已自动发送')
  } catch (error) {
    console.error('自动发送失败:', error)
    ElMessage.error('自动发送失败')
    clearPendingReply()
  }
}

// 取消待确认回复
const cancelPendingReply = async () => {
  if (!pendingReply.value) return
  if (!requireAction('ai-chat.pending-reply.cancel')) return
  
  try {
    await confirmAutoReply({
      task_id: pendingReply.value.task_id,
      action: 'cancel'
    })
    
    clearPendingReply()
    ElMessage.info('已取消AI回复任务')
  } catch (error) {
    console.error('取消回复失败:', error)
    ElMessage.error('取消回复失败')
  }
}
// 复制输入框内容
const copyMessageInput = async () => {
  if (!messageInput.value.trim()) {
    ElMessage.warning('输入框内容为空')
    return
  }
  
  try {
    await navigator.clipboard.writeText(messageInput.value)
    ElMessage.success('内容已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}
// 清理待确认状态
const clearPendingReply = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
  
  pendingReply.value = null
  countdown.value = 0
  isAutoSending.value = false
  messageInput.value = ''
  currentTaskId.value = null
}

return (_ctx: any,_cache: any) => {
  const _component_el_switch = _resolveComponent("el-switch")!
  const _component_el_tooltip = _resolveComponent("el-tooltip")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_empty = _resolveComponent("el-empty")!
  const _component_el_avatar = _resolveComponent("el-avatar")!
  const _component_el_tab_pane = _resolveComponent("el-tab-pane")!
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_skeleton = _resolveComponent("el-skeleton")!
  const _component_el_tabs = _resolveComponent("el-tabs")!
  const _component_el_image = _resolveComponent("el-image")!
  const _component_el_input = _resolveComponent("el-input")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _createElementVNode("div", _hoisted_3, [
        _createElementVNode("div", _hoisted_4, [
          _createVNode(_component_el_switch, {
            modelValue: autoReplyEnabled.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((autoReplyEnabled).value = $event)),
            class: "auto-reply-switch",
            "active-text": "自动回复",
            disabled: !_unref(isActionEnabled)('ai-chat.monitor.toggle'),
            title: _unref(actionReason)('ai-chat.monitor.toggle'),
            onChange: handleAutoReplyChange
          }, null, 8, ["modelValue", "disabled", "title"]),
          _createVNode(_component_el_tooltip, {
            content: "勾选后，AI回复的内容等待人工确认后再发送",
            placement: "bottom",
            effect: "dark"
          }, {
            default: _withCtx(() => [
              _createElementVNode("label", {
                class: _normalizeClass(["cyberpunk-checkbox-label manual-review-top", { 'is-disabled': !autoReplyEnabled.value || !_unref(isActionEnabled)('ai-chat.manual-review.toggle') }]),
                title: _unref(actionReason)('ai-chat.manual-review.toggle')
              }, [
                _withDirectives(_createElementVNode("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((manualReviewEnabled).value = $event)),
                  disabled: !autoReplyEnabled.value || !_unref(isActionEnabled)('ai-chat.manual-review.toggle'),
                  class: "cyberpunk-checkbox",
                  onChange: _cache[2] || (_cache[2] = ($event: any) => (handleManualReviewChange(manualReviewEnabled.value)))
                }, null, 40, _hoisted_6), [
                  [_vModelCheckbox, manualReviewEnabled.value]
                ]),
                _cache[8] || (_cache[8] = _createTextVNode(" 人工复核 ", -1))
              ], 10, _hoisted_5)
            ]),
            _: 1
          })
        ]),
        _createElementVNode("div", _hoisted_7, [
          _createVNode(_component_el_button, {
            class: _normalizeClass(["stats-btn", { 'active': statsExpanded.value }]),
            onClick: toggleStatsPanel,
            size: "small"
          }, {
            default: _withCtx(() => [...(_cache[9] || (_cache[9] = [
              _createElementVNode("span", {
                class: _normalizeClass({ 'rotate-icon': true })
              }, " 📊 ", -1),
              _createTextVNode(" 数据统计 ", -1)
            ]))]),
            _: 1
          }, 8, ["class"]),
          _createVNode(_component_el_button, {
            class: "log-btn",
            onClick: showLogDialog,
            size: "small",
            type: "info",
            plain: ""
          }, {
            default: _withCtx(() => [...(_cache[10] || (_cache[10] = [
              _createTextVNode(" 📋 记录 ", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            class: "setting-btn",
            onClick: showStrategyDialog
          }, {
            default: _withCtx(() => [...(_cache[11] || (_cache[11] = [
              _createTextVNode(" 🤖 AI助理配置 ", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      _createVNode(StatsPanel, {
        expanded: statsExpanded.value,
        stats: statsData.value
      }, null, 8, ["expanded", "stats"])
    ]),
    _createElementVNode("div", _hoisted_8, [
      _createElementVNode("div", _hoisted_9, [
        _createElementVNode("div", _hoisted_10, [
          _createVNode(_component_el_tabs, {
            modelValue: activeTab.value,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((activeTab).value = $event)),
            class: "chat-tabs-container"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_tab_pane, {
                label: "最新",
                name: "recent"
              }, {
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_11, [
                    _createElementVNode("div", _hoisted_12, [
                      _createElementVNode("span", _hoisted_13, _toDisplayString(chatList.value.length) + " 条新会话", 1),
                      (autoReplyEnabled.value)
                        ? (_openBlock(), _createElementBlock("div", _hoisted_14, [
                            _createVNode(_component_el_tag, {
                              type: "info",
                              size: "small"
                            }, {
                              default: _withCtx(() => [
                                _cache[12] || (_cache[12] = _createElementVNode("span", { class: "dot-flashing" }, null, -1)),
                                _createTextVNode(" " + _toDisplayString(isProcessingChat.value ? `回复 ${currentProcessingName.value} ` : '运行中'), 1)
                              ]),
                              _: 1
                            })
                          ]))
                        : _createCommentVNode("", true)
                    ]),
                    _createVNode(_component_el_button, {
                      class: "refresh-icon-btn",
                      loading: refreshing.value,
                      onClick: handleRefresh,
                      size: "small",
                      type: "primary",
                      circle: ""
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_icon, null, {
                          default: _withCtx(() => [
                            _createVNode(_unref(Refresh))
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["loading"])
                  ]),
                  (chatList.value.length === 0)
                    ? (_openBlock(), _createBlock(_component_el_empty, {
                        key: 0,
                        "image-size": 120,
                        description: "暂无新消息"
                      }))
                    : (_openBlock(true), _createElementBlock(_Fragment, { key: 1 }, _renderList(groupedChatList.value, (group, accountId) => {
                        return (_openBlock(), _createElementBlock(_Fragment, { key: accountId }, [
                          (group.sessions.length > 0)
                            ? (_openBlock(), _createElementBlock("div", _hoisted_15, [
                                _createElementVNode("span", _hoisted_16, "账号：" + _toDisplayString(accountId || '默认账号'), 1)
                              ]))
                            : _createCommentVNode("", true),
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(group.sessions, (chat) => {
                            return (_openBlock(), _createElementBlock("div", {
                              key: chat.id,
                              class: _normalizeClass(["chat-item", { 
                      active: currentChat.value?.id === chat.id,
                      unread: chat?.unread && chat.unread > 0 
                    }]),
                              onClick: ($event: any) => (selectChat(chat))
                            }, [
                              _createElementVNode("div", _hoisted_18, [
                                _createVNode(_component_el_avatar, {
                                  size: 40,
                                  src: chat.avatar,
                                  icon: _unref(User)
                                }, null, 8, ["src", "icon"]),
                                (chat?.unread && chat.unread > 0)
                                  ? (_openBlock(), _createElementBlock("span", _hoisted_19))
                                  : _createCommentVNode("", true)
                              ]),
                              _createElementVNode("div", _hoisted_20, [
                                _createElementVNode("div", _hoisted_21, [
                                  _createElementVNode("div", _hoisted_22, [
                                    _createElementVNode("div", _hoisted_23, [
                                      _createElementVNode("span", {
                                        class: "chat-name",
                                        title: chat.name
                                      }, _toDisplayString(chat.name), 9, _hoisted_24),
                                      (chat.isGroup)
                                        ? (_openBlock(), _createBlock(_component_el_tag, {
                                            key: 0,
                                            size: "small",
                                            type: "info",
                                            class: "group-tag"
                                          }, {
                                            default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
                                              _createTextVNode("群聊", -1)
                                            ]))]),
                                            _: 1
                                          }))
                                        : _createCommentVNode("", true)
                                    ]),
                                    _createElementVNode("span", _hoisted_25, _toDisplayString(chat.lastTime), 1)
                                  ]),
                                  _createElementVNode("div", {
                                    class: "last-message",
                                    title: chat.lastMessage
                                  }, _toDisplayString(chat.lastMessage), 9, _hoisted_26),
                                  (chat.account_id)
                                    ? (_openBlock(), _createElementBlock("div", _hoisted_27, [
                                        _cache[14] || (_cache[14] = _createElementVNode("span", { class: "account-label" }, "来自", -1)),
                                        _createElementVNode("span", _hoisted_28, _toDisplayString(chat.account_id), 1)
                                      ]))
                                    : _createCommentVNode("", true)
                                ])
                              ])
                            ], 10, _hoisted_17))
                          }), 128))
                        ], 64))
                      }), 128))
                ]),
                _: 1
              }),
              _createVNode(_component_el_tab_pane, { name: "suspended" }, {
                label: _withCtx(() => [
                  _createElementVNode("span", _hoisted_29, [
                    _cache[15] || (_cache[15] = _createTextVNode(" 挂起 ", -1)),
                    (suspendedCount.value > 0)
                      ? (_openBlock(), _createElementBlock("span", _hoisted_30, _toDisplayString(suspendedCount.value > 99 ? '99+' : suspendedCount.value), 1))
                      : _createCommentVNode("", true)
                  ])
                ]),
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_31, [
                    _createElementVNode("div", _hoisted_32, [
                      _createElementVNode("span", _hoisted_33, _toDisplayString(suspendedList.value.length) + " 个挂起会话", 1)
                    ])
                  ]),
                  (suspendedList.value.length === 0)
                    ? (_openBlock(), _createBlock(_component_el_empty, {
                        key: 0,
                        "image-size": 120
                      }, {
                        description: _withCtx(() => [...(_cache[16] || (_cache[16] = [
                          _createElementVNode("span", null, "暂无挂起会话", -1),
                          _createElementVNode("div", { style: {"margin-top":"2cap","padding":"0 20px","font-size":"12px","color":"#909399","line-height":"1.6"} }, [
                            _createElementVNode("br"),
                            _createTextVNode("手机端向文件传输助手发送“解除挂起”，可远程解除挂起会话 ")
                          ], -1)
                        ]))]),
                        _: 1
                      }))
                    : (_openBlock(), _createElementBlock("div", _hoisted_34, [
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(suspendedList.value, (session) => {
                          return (_openBlock(), _createElementBlock("div", {
                            key: `${session.account_id}_${session.session_name}`,
                            class: "suspended-item",
                            onClick: ($event: any) => (confirmUnsuspend(session))
                          }, [
                            _createElementVNode("div", _hoisted_36, [
                              _createVNode(_component_el_avatar, {
                                size: 40,
                                icon: _unref(User)
                              }, null, 8, ["icon"])
                            ]),
                            _createElementVNode("div", _hoisted_37, [
                              _createElementVNode("div", _hoisted_38, [
                                _createElementVNode("div", {
                                  class: "suspended-name",
                                  title: session.session_name
                                }, _toDisplayString(session.session_name), 9, _hoisted_39),
                                _createVNode(_component_el_button, {
                                  type: "primary",
                                  link: "",
                                  size: "small",
                                  onClick: _withModifiers(($event: any) => (confirmUnsuspend(session)), ["stop"])
                                }, {
                                  default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
                                    _createTextVNode(" 解除 ", -1)
                                  ]))]),
                                  _: 1
                                }, 8, ["onClick"])
                              ]),
                              _createElementVNode("div", _hoisted_40, [
                                _cache[18] || (_cache[18] = _createElementVNode("span", { class: "time-label" }, "挂起时间：", -1)),
                                _createElementVNode("span", _hoisted_41, _toDisplayString(formatSuspendedTime(session.suspended_at)), 1)
                              ]),
                              _createElementVNode("div", _hoisted_42, [
                                _cache[19] || (_cache[19] = _createElementVNode("span", { class: "account-label" }, "来自", -1)),
                                _createElementVNode("span", _hoisted_43, _toDisplayString(session.account_nickname || session.account_id), 1)
                              ])
                            ])
                          ], 8, _hoisted_35))
                        }), 128))
                      ]))
                ]),
                _: 1
              }),
              _createVNode(_component_el_tab_pane, {
                label: "历史",
                name: "history"
              }, {
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_44, [
                    _createElementVNode("span", null, _toDisplayString(historySessions.value.length) + " 条历史会话", 1)
                  ]),
                  (historyLoadError.value)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_45, [
                        _createVNode(_component_el_alert, {
                          title: historyLoadError.value,
                          type: "error",
                          "show-icon": "",
                          closable: false
                        }, null, 8, ["title"]),
                        _createVNode(_component_el_button, {
                          size: "small",
                          onClick: refreshHistoryList
                        }, {
                          default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
                            _createTextVNode("重试", -1)
                          ]))]),
                          _: 1
                        })
                      ]))
                    : (loadingHistory.value)
                      ? (_openBlock(), _createBlock(_component_el_skeleton, {
                          key: 1,
                          animated: "",
                          rows: 3
                        }))
                      : (historySessions.value.length === 0)
                        ? (_openBlock(), _createBlock(_component_el_empty, {
                            key: 2,
                            "image-size": 120,
                            description: "暂无历史会话"
                          }))
                        : (_openBlock(true), _createElementBlock(_Fragment, { key: 3 }, _renderList(groupedHistorySessions.value, (group, accountId) => {
                            return (_openBlock(), _createElementBlock(_Fragment, { key: accountId }, [
                              (group.sessions.length > 0)
                                ? (_openBlock(), _createElementBlock("div", _hoisted_46, [
                                    _createElementVNode("span", _hoisted_47, "账号：" + _toDisplayString(accountId || '默认账号'), 1)
                                  ]))
                                : _createCommentVNode("", true),
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(group.sessions, (session) => {
                                return (_openBlock(), _createElementBlock("div", {
                                  key: session.id,
                                  class: _normalizeClass(["chat-item", { active: currentChat.value?.id === session.id }]),
                                  onClick: ($event: any) => (selectHistoryChat(session))
                                }, [
                                  _createElementVNode("div", _hoisted_49, [
                                    _createVNode(_component_el_avatar, {
                                      size: 40,
                                      src: session.avatar,
                                      icon: _unref(User)
                                    }, null, 8, ["src", "icon"])
                                  ]),
                                  _createElementVNode("div", _hoisted_50, [
                                    _createElementVNode("div", _hoisted_51, [
                                      _createElementVNode("div", _hoisted_52, [
                                        _createElementVNode("div", _hoisted_53, [
                                          _createElementVNode("span", {
                                            class: "chat-name",
                                            title: session.name
                                          }, _toDisplayString(session.name), 9, _hoisted_54),
                                          (session.isGroup)
                                            ? (_openBlock(), _createBlock(_component_el_tag, {
                                                key: 0,
                                                size: "small",
                                                type: "info",
                                                class: "group-tag"
                                              }, {
                                                default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
                                                  _createTextVNode("群聊", -1)
                                                ]))]),
                                                _: 1
                                              }))
                                            : _createCommentVNode("", true)
                                        ]),
                                        _createElementVNode("span", _hoisted_55, _toDisplayString(session.lastTime), 1)
                                      ]),
                                      _createElementVNode("div", {
                                        class: "last-message",
                                        title: session.lastMessage
                                      }, _toDisplayString(session.lastMessage), 9, _hoisted_56),
                                      (session.account_id)
                                        ? (_openBlock(), _createElementBlock("div", _hoisted_57, [
                                            _cache[22] || (_cache[22] = _createElementVNode("span", { class: "account-label" }, "来自", -1)),
                                            _createElementVNode("span", _hoisted_58, _toDisplayString(session.account_id), 1)
                                          ]))
                                        : _createCommentVNode("", true)
                                    ])
                                  ])
                                ], 10, _hoisted_48))
                              }), 128))
                            ], 64))
                          }), 128))
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["modelValue"])
        ])
      ]),
      _createElementVNode("div", {
        class: _normalizeClass(["chat-area", { 'chat-area-hidden': isNarrowScreen.value, 'no-transition': isInitialLoad.value }])
      }, [
        (currentChat.value)
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
              _createElementVNode("div", _hoisted_59, [
                _createElementVNode("div", _hoisted_60, [
                  _createElementVNode("span", _hoisted_61, _toDisplayString(currentChat.value.name), 1),
                  (currentChat.value.isGroup)
                    ? (_openBlock(), _createBlock(_component_el_tag, {
                        key: 0,
                        size: "small",
                        type: "info"
                      }, {
                        default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
                          _createTextVNode("群聊", -1)
                        ]))]),
                        _: 1
                      }))
                    : _createCommentVNode("", true)
                ]),
                (activeTab.value !== 'history')
                  ? (_openBlock(), _createBlock(_component_el_button, {
                      key: 0,
                      class: "refresh-chat-btn",
                      loading: refreshingChat.value,
                      onClick: refreshCurrentChat,
                      size: "small",
                      type: "primary",
                      plain: ""
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_icon, null, {
                          default: _withCtx(() => [
                            _createVNode(_unref(Refresh))
                          ]),
                          _: 1
                        }),
                        _cache[24] || (_cache[24] = _createTextVNode(" 刷新消息 ", -1))
                      ]),
                      _: 1
                    }, 8, ["loading"]))
                  : _createCommentVNode("", true),
                (activeTab.value === 'history')
                  ? (_openBlock(), _createBlock(_component_el_button, {
                      key: 1,
                      class: "delete-chat-btn",
                      loading: deletingHistory.value,
                      onClick: handleDeleteHistorySession,
                      size: "small",
                      type: "danger",
                      plain: ""
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_icon, null, {
                          default: _withCtx(() => [
                            _createVNode(_unref(Delete))
                          ]),
                          _: 1
                        }),
                        _cache[25] || (_cache[25] = _createTextVNode(" 删除会话记录 ", -1))
                      ]),
                      _: 1
                    }, 8, ["loading"]))
                  : _createCommentVNode("", true)
              ]),
              _createElementVNode("div", _hoisted_62, [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(messages.value, (msg) => {
                  return (_openBlock(), _createElementBlock("div", {
                    key: msg.id,
                    class: _normalizeClass(["message-wrapper", { 'message-wrapper-self': msg.isSelf }])
                  }, [
                    (currentChat.value?.isGroup && !msg.isSelf && !msg.isTimeMessage)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_63, _toDisplayString(msg.sender?.name), 1))
                      : _createCommentVNode("", true),
                    _createElementVNode("div", {
                      class: _normalizeClass(["message", {
                  'message-self': msg.isSelf,
                  'message-time': msg.isTimeMessage
                }])
                    }, [
                      (msg.image_urls?.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: _normalizeClass(["message-images", { 'is-multi': msg.image_urls.length > 1 }])
                          }, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(msg.image_urls, (url, i) => {
                              return (_openBlock(), _createBlock(_component_el_image, {
                                key: url,
                                src: url,
                                "preview-src-list": msg.image_urls,
                                "initial-index": i,
                                "preview-teleported": true,
                                "hide-on-click-modal": "",
                                fit: "cover",
                                class: "message-image"
                              }, null, 8, ["src", "preview-src-list", "initial-index"]))
                            }), 128))
                          ], 2))
                        : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                            _createTextVNode(_toDisplayString(msg.content), 1)
                          ], 64)),
                      (msg.voice_text)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                            _cache[26] || (_cache[26] = _createElementVNode("div", { class: "voice-text-divider" }, null, -1)),
                            _createElementVNode("div", _hoisted_64, _toDisplayString(msg.voice_text), 1)
                          ], 64))
                        : _createCommentVNode("", true)
                    ], 2)
                  ], 2))
                }), 128))
              ], 512),
              _createElementVNode("div", _hoisted_65, [
                _createElementVNode("div", _hoisted_66, [
                  (isAutoSending.value)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        ref_key: "countdownOverlayRef",
                        ref: countdownOverlayRef,
                        class: _normalizeClass(["countdown-overlay", { 'urgent': countdown.value <= 5 }])
                      }, [
                        _createElementVNode("div", _hoisted_67, [
                          _createElementVNode("div", _hoisted_68, [
                            (_openBlock(), _createElementBlock("svg", _hoisted_69, [
                              _cache[27] || (_cache[27] = _createElementVNode("circle", {
                                cx: "20",
                                cy: "20",
                                r: "18",
                                fill: "none",
                                stroke: "rgba(255, 255, 255, 0.3)",
                                "stroke-width": "3"
                              }, null, -1)),
                              _createElementVNode("circle", {
                                cx: "20",
                                cy: "20",
                                r: "18",
                                fill: "none",
                                stroke: "#fff",
                                "stroke-width": "3",
                                "stroke-linecap": "round",
                                "stroke-dasharray": circleStrokeDasharray.value,
                                "stroke-dashoffset": "0",
                                transform: "rotate(-90 20 20)",
                                class: "countdown-progress"
                              }, null, 8, _hoisted_70)
                            ])),
                            _createElementVNode("div", _hoisted_71, _toDisplayString(countdown.value), 1)
                          ]),
                          _createElementVNode("div", _hoisted_72, [
                            _cache[28] || (_cache[28] = _createElementVNode("div", { class: "countdown-title" }, "AI回复确认", -1)),
                            _createElementVNode("div", _hoisted_73, _toDisplayString(countdown.value) + "秒后自动发送", 1)
                          ])
                        ]),
                        _createVNode(_component_el_button, {
                          class: "cancel-btn",
                          size: "small",
                          type: "danger",
                          disabled: !_unref(isActionEnabled)('ai-chat.pending-reply.cancel'),
                          title: _unref(actionReason)('ai-chat.pending-reply.cancel'),
                          onClick: cancelPendingReply
                        }, {
                          default: _withCtx(() => [...(_cache[29] || (_cache[29] = [
                            _createTextVNode(" 取消 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["disabled", "title"])
                      ], 2))
                    : _createCommentVNode("", true),
                  _createElementVNode("div", _hoisted_74, [
                    _createVNode(_component_el_input, {
                      modelValue: messageInput.value,
                      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((messageInput).value = $event)),
                      type: "textarea",
                      rows: 5,
                      disabled: !_unref(isActionEnabled)('ai-chat.message.send'),
                      placeholder: "输入消息...",
                      onFocus: handleInputFocus
                    }, null, 8, ["modelValue", "disabled"])
                  ]),
                  _createElementVNode("div", _hoisted_75, [
                    (messageInput.value.trim())
                      ? (_openBlock(), _createBlock(_component_el_button, {
                          key: 0,
                          class: "copy-btn",
                          onClick: copyMessageInput
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_icon, null, {
                              default: _withCtx(() => [
                                _createVNode(_unref(DocumentCopy))
                              ]),
                              _: 1
                            }),
                            _cache[30] || (_cache[30] = _createTextVNode(" 复制 ", -1))
                          ]),
                          _: 1
                        }))
                      : _createCommentVNode("", true),
                    _createVNode(_component_el_button, {
                      class: "coze-btn",
                      disabled: autoReplyEnabled.value || !currentChat.value || isGenerating.value || !_unref(isActionEnabled)('ai-chat.reply.generate'),
                      loading: isGenerating.value,
                      title: _unref(actionReason)('ai-chat.reply.generate'),
                      onClick: generateAIResponse
                    }, {
                      default: _withCtx(() => [
                        _cache[31] || (_cache[31] = _createElementVNode("img", {
                          src: "/icon/img_ai.png",
                          alt: "Dify",
                          class: "img-ai"
                        }, null, -1)),
                        _createTextVNode(" " + _toDisplayString(isGenerating.value ? '生成中..' : '生成话术'), 1)
                      ]),
                      _: 1
                    }, 8, ["disabled", "loading", "title"]),
                    _createVNode(_component_el_button, {
                      type: "primary",
                      class: "send-btn",
                      disabled: isSending.value || !messageInput.value.trim() || !_unref(isActionEnabled)('ai-chat.message.send'),
                      loading: isSending.value,
                      title: _unref(actionReason)('ai-chat.message.send'),
                      onClick: sendMessageByHand
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(isSending.value ? '发送中.' : '发送'), 1)
                      ]),
                      _: 1
                    }, 8, ["disabled", "loading", "title"])
                  ])
                ])
              ])
            ], 64))
          : (_openBlock(), _createElementBlock("div", _hoisted_76, [...(_cache[32] || (_cache[32] = [
              _createElementVNode("div", { class: "empty-state" }, [
                _createElementVNode("div", { class: "empty-state-icon" }, "💬"),
                _createElementVNode("div", { class: "empty-state-text" }, "未选中会话"),
                _createElementVNode("div", { class: "empty-state-subtext" }, "从左侧选择会话开始查看聊天记录")
              ], -1)
            ]))]))
      ], 2)
    ]),
    _createVNode(AIStaffConfig, {
      visible: strategyDialogVisible.value,
      "onUpdate:visible": _cache[5] || (_cache[5] = ($event: any) => ((strategyDialogVisible).value = $event)),
      "coze-agents": cozeAgents.value,
      onSave: handleStrategyChange
    }, null, 8, ["visible", "coze-agents"]),
    _createVNode(ReplyLogDialog, {
      visible: logDialogVisible.value,
      "onUpdate:visible": _cache[6] || (_cache[6] = ($event: any) => ((logDialogVisible).value = $event))
    }, null, 8, ["visible"]),
    _createVNode(AccountStatusDialog, {
      visible: showAccountStatusDialog.value,
      "onUpdate:visible": _cache[7] || (_cache[7] = ($event: any) => ((showAccountStatusDialog).value = $event)),
      "account-list": accountStatusList.value,
      onConfirm: handleAccountStatusConfirm
    }, null, 8, ["visible", "account-list"])
  ]))
}
}

})