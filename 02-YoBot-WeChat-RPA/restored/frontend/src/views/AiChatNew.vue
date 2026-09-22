<template>
  <div class="ai-chat-container">
    <!-- 快捷设置区 -->
    <div class="settings-bar">
      <div class="settings-content">
        <div class="auto-reply-container">
          <el-switch
            v-model="autoReplyEnabled"
            class="auto-reply-switch"
            active-text="自动回复"
            :disabled="!isActionEnabled('ai-chat.monitor.toggle')"
            :title="actionReason('ai-chat.monitor.toggle')"
            @change="handleAutoReplyChange"
          />
           <!-- 人工复核开关-->
           <el-tooltip
            content="勾选后，AI回复的内容等待人工确认后再发送"
            placement="bottom"
            effect="dark"
          >
            <label
              class="cyberpunk-checkbox-label manual-review-top"
              :class="{ 'is-disabled': !autoReplyEnabled || !isActionEnabled('ai-chat.manual-review.toggle') }"
              :title="actionReason('ai-chat.manual-review.toggle')"
            >
              <input
                type="checkbox"
                v-model="manualReviewEnabled"
                :disabled="!autoReplyEnabled || !isActionEnabled('ai-chat.manual-review.toggle')"
                class="cyberpunk-checkbox"
                @change="handleManualReviewChange(manualReviewEnabled)"
              />
              人工复核
            </label>
          </el-tooltip>
          
        </div>

        <div class="settings-right">
          <!-- 数据统计按钮 -->
          <el-button
            class="stats-btn"
            :class="{ 'active': statsExpanded }"
            @click="toggleStatsPanel"
            size="small"
          >
            <span :class="{ 'rotate-icon': true }">
              📊
            </span>
            数据统计
          </el-button>
          
          <!-- 日志按钮 -->
          <el-button
            class="log-btn"
            @click="showLogDialog"
            size="small"
            type="info"
            plain
          >
            📋 记录
          </el-button>
          
          <!-- AI助理配置按钮 -->
          <el-button 
            class="setting-btn"
            @click="showStrategyDialog"
          >
            🤖 AI助理配置
          </el-button>
          
        </div>
      </div>
      
      <!-- 数据统计面板 - 移到settings-bar内部底部 -->
      <StatsPanel :expanded="statsExpanded" :stats="statsData" />
    </div>

    <!-- 主要内容区 -->
    <div class="main-content1">
      <!-- 左侧会话列表 -->
      <div class="chat-list">
        <!-- 会话类型切换 -->
        <div class="chat-tabs">
          <el-tabs v-model="activeTab" class="chat-tabs-container">
            <el-tab-pane label="最新" name="recent">
              <div class="tab-header">
                <div class="tab-header-left">
                  <span class="tab-title">{{ chatList.length }} 条新会话</span>
                  <!-- 状态指示器 - 移到标题右侧 -->
                  <div v-if="autoReplyEnabled" class="status-indicator-chat">
                    <el-tag type="info" size="small">
                      <span class="dot-flashing"></span>
                      {{ isProcessingChat ? `回复 ${currentProcessingName} ` : '运行中' }}
                    </el-tag>
                  </div>
                </div>
                <el-button
                  class="refresh-icon-btn"
                  :loading="refreshing"
                  @click="handleRefresh"
                  size="small"
                  type="primary"
                  circle
                >
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
              
              <!-- 空状态提示 -->
              <el-empty
                v-if="chatList.length === 0"
                :image-size="120"
                description="暂无新消息"/>
                
              <!-- 会话列表 -->
              <template v-else>
                <template v-for="(group, accountId) in groupedChatList" :key="accountId">
                  <!-- 账号标题 -->
                  <div class="account-header" v-if="group.sessions.length > 0">
                    <span class="account-title">账号：{{ accountId || '默认账号' }}</span>
                  </div>
                  <!-- 该账号下的会话列表 -->
                  <div
                    v-for="chat in group.sessions"
                    :key="chat.id"
                    class="chat-item"
                    :class="{ 
                      active: currentChat?.id === chat.id,
                      unread: chat?.unread && chat.unread > 0 
                    }"
                    @click="selectChat(chat)"
              >
                <!-- 头像区域 -->
                <div class="avatar-wrapper">
                  <el-avatar :size="40" :src="chat.avatar" :icon="User" />
                  <span v-if="chat?.unread && chat.unread > 0" class="unread-dot"></span>
                </div>
                
                <!-- 会话信息区域 -->
                <div class="chat-info">
                  <div class="chat-header">
                    <div class="chat-title">
                      <div class="name-tag-container">
                        <span class="chat-name" :title="chat.name">
                          {{ chat.name }}
                        </span>
                        <el-tag v-if="chat.isGroup" size="small" type="info" class="group-tag">群聊</el-tag>
                      </div>
                      <span class="chat-time">{{ chat.lastTime }}</span>
                    </div>
                    <div class="last-message" :title="chat.lastMessage">
                      {{ chat.lastMessage }}
                    </div>
                    <div v-if="chat.account_id" class="account-info">
                      <span class="account-label">来自</span>
                      <span class="account-id">{{ chat.account_id }}</span>
                    </div>
                  </div>
                </div>
              </div>
                </template>
              </template>
            </el-tab-pane>

            <el-tab-pane name="suspended">
              <!-- 角标独立于 suspendedList：那个列表只在切到本 tab 时才加载，
                   拿它当数据源的话，用户不点进来角标永远是 0，等于没有提醒。 -->
              <template #label>
                <span class="suspended-tab-label">
                  挂起
                  <span v-if="suspendedCount > 0" class="suspended-badge">
                    {{ suspendedCount > 99 ? '99+' : suspendedCount }}
                  </span>
                </span>
              </template>
              <div class="tab-header">
                <div class="tab-header-left">
                  <span class="tab-title">{{ suspendedList.length }} 个挂起会话</span>
                </div>
                <!-- <el-button
                  class="refresh-icon-btn"
                  :loading="refreshingSuspended"
                  @click="refreshSuspendedList"
                  size="small"
                  type="primary"
                  circle
                >
                  <el-icon><Refresh /></el-icon>
                </el-button> -->
              </div>

              <!-- 空状态 -->
              <el-empty
                v-if="suspendedList.length === 0"
                :image-size="120"
              >
                <template #description>
                  <span>暂无挂起会话</span>
                  <div style="margin-top: 2cap; padding: 0 20px; font-size: 12px; color: #909399; line-height: 1.6;">
                    <br>手机端向文件传输助手发送“解除挂起”，可远程解除挂起会话
                  </div>
                </template>
              </el-empty>

              <!-- 挂起列表 -->
              <div v-else class="suspended-list">
                <div
                  v-for="session in suspendedList"
                  :key="`${session.account_id}_${session.session_name}`"
                  class="suspended-item"
                  @click="confirmUnsuspend(session)"
                >
                  <!-- 头像区域 -->
                  <div class="avatar-wrapper">
                    <el-avatar :size="40" :icon="User" />
                  </div>

                  <div class="suspended-info">
                    <div class="suspended-header">
                      <div class="suspended-name" :title="session.session_name">
                        {{ session.session_name }}
                      </div>
                      <el-button
                        type="primary"
                        link
                        size="small"
                        @click.stop="confirmUnsuspend(session)"
                      >
                        解除
                      </el-button>
                    </div>
                    
                    <div class="suspended-time-row">
                      <span class="time-label">挂起时间：</span>
                      <span class="suspended-time">
                        {{ formatSuspendedTime(session.suspended_at) }}
                      </span>
                    </div>

                    <div class="account-info">
                      <span class="account-label">来自</span>
                      <span class="account-id">{{ session.account_nickname || session.account_id }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="历史" name="history">
              <!-- 添加标题显示 -->
              <div class="tab-header">
                <span>{{ historySessions.length }} 条历史会话</span>
              </div>
              <div v-if="historyLoadError" class="history-load-error">
                <el-alert :title="historyLoadError" type="error" show-icon :closable="false" />
                <el-button size="small" @click="refreshHistoryList">重试</el-button>
              </div>
              <el-skeleton v-else-if="loadingHistory" animated :rows="3" />
              <!-- 空状态提示 -->
              <el-empty
                v-else-if="historySessions.length === 0"
                :image-size="120"
                description="暂无历史会话"/>
                
              <!-- 历史会话列表 -->
              <template v-else>
                <template v-for="(group, accountId) in groupedHistorySessions" :key="accountId">
                  <!-- 账号标题 -->
                  <div class="account-header" v-if="group.sessions.length > 0">
                    <span class="account-title">账号：{{ accountId || '默认账号' }}</span>
                  </div>
                  <!-- 该账号下的历史会话列表 -->
                  <div
                    v-for="session in group.sessions"
                    :key="session.id"
                    class="chat-item"
                    :class="{ active: currentChat?.id === session.id }"
                    @click="selectHistoryChat(session)"
                  >
                <!-- 头像区域 -->
                <div class="avatar-wrapper">
                  <el-avatar :size="40" :src="session.avatar" :icon="User" />
                </div>
                
                <!-- 会话信息区域 -->
                <div class="chat-info">
                  <div class="chat-header">
                    <div class="chat-title">
                      <div class="name-tag-container">
                        <span class="chat-name" :title="session.name">
                          {{ session.name }}
                        </span>
                        <el-tag v-if="session.isGroup" size="small" type="info" class="group-tag">群聊</el-tag>
                      </div>
                      <span class="chat-time">{{ session.lastTime }}</span>
                    </div>
                    <div class="last-message" :title="session.lastMessage">
                      {{ session.lastMessage }}
                    </div>
                    <div v-if="session.account_id" class="account-info">
                      <span class="account-label">来自</span>
                      <span class="account-id">{{ session.account_id }}</span>
                    </div>
                  </div>
                </div>
              </div>
                </template>
              </template>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <!-- 右侧对话区 -->
      <div class="chat-area" :class="{ 'chat-area-hidden': isNarrowScreen, 'no-transition': isInitialLoad }">
        <template v-if="currentChat">
          <div class="current-chat-header">
            <div class="header-left">
              <span class="user-name">{{ currentChat.name }}</span>
              <el-tag v-if="currentChat.isGroup" size="small" type="info">群聊</el-tag>
            </div>
            <el-button
              class="refresh-chat-btn"
              :loading="refreshingChat"
              v-if="activeTab !== 'history'"
              @click="refreshCurrentChat"
              size="small"
              type="primary"
              plain
            >
              <el-icon><Refresh /></el-icon>
              刷新消息
            </el-button>
            <el-button
              class="delete-chat-btn"
              v-if="activeTab === 'history'"
              :loading="deletingHistory"
              @click="handleDeleteHistorySession"
              size="small"
              type="danger"
              plain
            >
              <el-icon><Delete /></el-icon>
              删除会话记录
            </el-button>
          </div>
          
          <div class="messages" ref="messageContainer">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="message-wrapper"
              :class="{ 'message-wrapper-self': msg.isSelf }"
            >
              <!-- 发送者名称显示 -->
              <div 
                v-if="currentChat?.isGroup && !msg.isSelf && !msg.isTimeMessage" 
                class="sender-name"
              >
                {{ msg.sender?.name }}
              </div>
              <div
                class="message"
                :class="{
                  'message-self': msg.isSelf,
                  'message-time': msg.isTimeMessage
                }"
              >
                <!-- 图片消息：有本地图片URL则渲染缩略图，点击查看大图；否则回退为文本占位。
                     微信4.1.12+的聚合图片一条消息可能有多张，多张时按网格排布，
                     点任意一张进入大图后可左右翻看整组。 -->
                <div
                  v-if="msg.image_urls?.length"
                  class="message-images"
                  :class="{ 'is-multi': msg.image_urls.length > 1 }"
                >
                  <el-image
                    v-for="(url, i) in msg.image_urls"
                    :key="url"
                    :src="url"
                    :preview-src-list="msg.image_urls"
                    :initial-index="i"
                    :preview-teleported="true"
                    hide-on-click-modal
                    fit="cover"
                    class="message-image"
                  />
                </div>
                <template v-else>
                  {{ msg.content }}
                </template>
                <!-- 语音转文本展示 -->
                <template v-if="msg.voice_text">
                  <div class="voice-text-divider"></div>
                  <div class="voice-text">{{ msg.voice_text }}</div>
                </template>
              </div>
            </div>
          </div>
          
          <div class="input-area">
            <div class="message-input-container">
              <!-- 圆形倒计时浮窗 -->
              <div 
                v-if="isAutoSending" 
                ref="countdownOverlayRef"
                class="countdown-overlay"
                :class="{ 'urgent': countdown <= 5 }"
              >
                <div class="countdown-content">
                  <!-- 圆形进度条 -->
                  <div class="countdown-circle">
                    <svg width="40" height="40" viewBox="0 0 40 40">
                      <!-- 背景圆 -->
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.3)"
                        stroke-width="3"
                      />
                      <!-- 进度圆 -->
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="#fff"
                        stroke-width="3"
                        stroke-linecap="round"
                        :stroke-dasharray="circleStrokeDasharray"
                        stroke-dashoffset="0"
                        transform="rotate(-90 20 20)"
                        class="countdown-progress"
                      />
                    </svg>
                    <!-- 倒计时数字 -->
                    <div class="countdown-number">{{ countdown }}</div>
                  </div>
                  
                  <!-- 文本区域 -->
                  <div class="countdown-text">
                    <div class="countdown-title">AI回复确认</div>
                    <div class="countdown-subtitle">{{ countdown }}秒后自动发送</div>
                  </div>
                </div>
                
                <!-- 取消按钮 -->
                <el-button 
                  class="cancel-btn"
                  size="small"
                  type="danger"
                  :disabled="!isActionEnabled('ai-chat.pending-reply.cancel')"
                  :title="actionReason('ai-chat.pending-reply.cancel')"
                  @click="cancelPendingReply"
                >
                  取消
                </el-button>
              </div>
              <div class="input-content">
                <el-input
                  v-model="messageInput"
                  type="textarea"
                  :rows="5"
                  :disabled="!isActionEnabled('ai-chat.message.send')"
                  placeholder="输入消息..."
                  @focus="handleInputFocus"
                />
              </div>
              <div class="input-footer">
                <el-button 
                    v-if="messageInput.trim()"
                    class="copy-btn"
                    @click="copyMessageInput"
                  >
                    <el-icon><DocumentCopy /></el-icon>
                    复制
                  </el-button>
                <el-button 
                    class="coze-btn"
                    :disabled="autoReplyEnabled || !currentChat || isGenerating || !isActionEnabled('ai-chat.reply.generate')"
                    :loading="isGenerating"
                    :title="actionReason('ai-chat.reply.generate')"
                    @click="generateAIResponse"
                  >
                    <img src="/icon/img_ai.png" alt="Dify" class="img-ai" />
                    {{ isGenerating ? '生成中..' : '生成话术' }}
                  </el-button>
                  <el-button 
                    type="primary" 
                    class="send-btn"
                    :disabled="isSending || !messageInput.trim() || !isActionEnabled('ai-chat.message.send')"
                    :loading="isSending"
                    :title="actionReason('ai-chat.message.send')"
                    @click="sendMessageByHand"
                  >
                    {{ isSending ? '发送中.' : '发送' }}
                  </el-button>
              </div>
            </div>
          </div>
        </template>
        
        <!-- 无聊天记录时的提示 -->
        <div v-else class="empty-chat-container">
          <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <div class="empty-state-text">未选中会话</div>
            <div class="empty-state-subtext">从左侧选择会话开始查看聊天记录</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 弹窗组件 -->
    <AIStaffConfig
      v-model:visible="strategyDialogVisible"
      :coze-agents="cozeAgents"
      @save="handleStrategyChange"
    />
    <reply-log-dialog
      v-model:visible="logDialogVisible"
    />
    
    <!-- 账号状态检查弹窗 -->
    <AccountStatusDialog
      v-model:visible="showAccountStatusDialog"
      :account-list="accountStatusList"
      @confirm="handleAccountStatusConfirm"
    />
    
  </div>
</template>

<script setup lang="ts">
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
const SUSPENDED_COUNT_INTERVAL_MS = 30_000

// 静默刷新：失败不弹提示。这是个后台轮询，报错只会打扰用户，
// 而且服务端已经记了日志。
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
interface SyncError {
  message: string;
  type: string;
}

// 窗口大小监听
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
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(180deg, #2c3e50, #4a5568, #2d3748);
  padding: 10px;
  box-sizing: border-box;
  color: #333;
}

/* 设置区域样式 */
.settings-bar {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 15px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.settings-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 16px;
  width: 100%;
}
/* 会话列表中的状态指示器样式 */
.status-indicator-chat {
  display: inline-flex;
  align-items: center;
  max-width: 200px; /* 限制最大宽度，避免挤压其他控件 */
  flex-shrink: 0; /* 防止被压缩 */
}

.status-indicator-chat .el-tag {
  margin: 0;
  font-size: 12px;
  height: 20px;
  line-height: 18px;
  max-width: 100%; /* 继承父容器的最大宽度 */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis; /* 文本超出时显示省略号 */
}
.auto-reply-container {
  display: flex;
  align-items: center;
  gap: 0;
}
.manual-review-checkbox {
  margin-left: 10px;
}

.manual-review-checkbox.is-disabled {
  opacity: 0.5;
}
.settings-right {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}

.stats-btn, .log-btn, .setting-btn {
  height: 32px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.stats-btn {
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border: 2px solid #e2e8f0;
  color: #4a5568;
  padding: 8px 16px;
  border-radius: 10px;
  height: 32px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}
.stats-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s ease;
}
.stats-btn:hover {
  background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #cbd5e0;
}
.stats-btn:hover::before {
  left: 100%;
}
.stats-btn.active, .stats-btn:active {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border-color: #4facfe;
  box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
}

.setting-btn:hover {
  background: linear-gradient(135deg, #5a6eea 0%, #6a3ca2 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
.rotate-icon {
  transform: rotate(0deg); /* 初始状态不旋转 */
  transition: all 0.3s ease;
  font-size: 16px;
  display: inline-block;
}
/* 当展开时，使用90度或270度旋转，避免倾斜效果 */
.stats-btn.active .rotate-icon {
  transform: rotate(180deg) scale(1.1);
}

.status-indicator {
  height: 32px;
  display: flex;
  align-items: center;
}

.dot-flashing {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: currentColor;
  margin-right: 6px;
  animation: dot-flashing 1s infinite linear;
}

@keyframes dot-flashing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 主内容区域样式 */
.main-content1 {
  display: flex;
  flex: 1;
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 会话列表样式 */
.chat-list {
  min-width: 260px;
  width: 25%;
  max-width: 350px;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  transition: width 0.3s ease;
  background: rgba(255, 255, 255, 0.98);
  
  /* 自定义滚动条样式 */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent; /* Firefox */
}
.chat-list::-webkit-scrollbar {
  width: 6px;
}

.chat-list::-webkit-scrollbar-track {
  background: transparent;
}

.chat-list::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  border: 2px solid transparent;
}

.chat-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

.chat-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-tabs-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

:deep(.el-tabs__nav) {
  width: 100%;
  display: flex;
}
.img-ai {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
:deep(.el-tabs__item) {
  flex: 1;
  text-align: center;
  padding: 0 !important;
  justify-content: center;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  padding-left: 16px;
  padding-right: 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fa;
}

.tab-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1; /* 占据剩余空间 */
  min-width: 0; /* 允许收缩 */
  overflow: hidden; /* 防止内容溢出 */
}

.tab-title {
  flex-shrink: 0; /* 标题文本不被压缩 */
  white-space: nowrap; /* 标题文本不换行 */
}

/* 挂起 tab 的红色数字角标：这些客户在等人工，没人接就是真丢单，
   所以用最强的视觉权重（红底白字），和右上角的 toast 提醒相呼应。 */
.suspended-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.suspended-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background-color: #f56c6c; /* Element Plus danger */
  color: #fff;
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
  /* 角标不参与 tab 的下划线对齐，稍微上提更贴合视觉重心 */
  transform: translateY(-1px);
}
.refresh-icon-btn {
  padding: 6px;
}

.chat-item {
  display: flex;
  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.chat-item:hover {
  background-color: #f5f7fa;
}

.chat-item.active {
  background-color: #e6f7ff;
}

.chat-item.unread {
  background-color: #f0f9eb;
}

.avatar-wrapper {
  position: relative;
  margin-right: 12px;
}

.unread-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background-color: #f56c6c;
  border-radius: 50%;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.name-tag-container {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.chat-name {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
  display: inline-block;
}

.chat-time {
  font-size: 12px;
  color: #909399;
}

.last-message {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cyberpunk-checkbox {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid #1890ff;
  border-radius: 4px;
  background-color: transparent;
  display: inline-block;
  position: relative;
  margin-right: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  vertical-align: middle;
}

.cyberpunk-checkbox:before {
  content: "";
  background-color: #1890ff;
  display: block;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 8px;
  height: 8px;
  border-radius: 2px;
  transition: all 0.3s ease-in-out;
}

.cyberpunk-checkbox:checked {
  background-color: rgba(24, 144, 255, 0.1);
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.cyberpunk-checkbox:checked:before {
  transform: translate(-50%, -50%) scale(1);
}

.cyberpunk-checkbox:hover {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.cyberpunk-checkbox-label {
  font-size: 14px;
  color: #333;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  margin-left: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.cyberpunk-checkbox-label:hover {
  background-color: rgba(24, 144, 255, 0.05);
}
.group-tag {
  border-radius: 10px;
  font-size: 12px;
  margin-right: 5px;
}

/* 聊天区域样式 */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  background: #fff;
  transform: translateX(0);
  visibility: visible;
  transition: none;
}

.chat-area:not(.no-transition) {
  transition: transform 0.3s ease, visibility 0.3s ease;
}

.chat-area-hidden {
  transform: translateX(100%);
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  background: #fff;
  width: 75%;
  visibility: hidden;
}
.manual-review-top {
  margin-left: 10px;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s ease;
}

.manual-review-top:hover {
  color: #409eff;
}
.manual-review-top.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.current-chat-header {
  flex-shrink: 0;
  height: 50px; /* 固定高度为50像素 */
  padding: 0 15px; /* 修改垂直方向的内边距 */
  border-bottom: 1px solid #eee;
  background-color: #f5f7fa;
  display: flex;
  align-items: center; /* 确保内部控件垂直居中 */
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-weight: 500;
  font-size: 16px;
}

.refresh-chat-btn {
  height: 32px;
}

.messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f9f9f9;
  display: flex;
  flex-direction: column;
  /* 自定义滚动条样式 */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent; /* Firefox */
}
/* Webkit浏览器的滚动条样式 (Chrome, Safari, Edge等) */
.messages::-webkit-scrollbar {
  width: 6px; /* 滚动条宽度 */
}

.messages::-webkit-scrollbar-track {
  background: transparent; /* 滚动条轨道背景 */
}

.messages::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1); /* 滚动条颜色 */
  border-radius: 6px; /* 滚动条圆角 */
  border: 2px solid transparent; /* 边框 */
}

.messages::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2); /* 悬停时的颜色 */
}


.message-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 16px;
  max-width: 80%;
  align-self: flex-start; /* 非本人消息靠左对齐 */
}

.message-wrapper-self {
  align-items: flex-end;
  align-self: flex-end; /* 本人消息靠右对齐 */
}

.sender-name {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.message {
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  word-break: break-all;
  border-top-left-radius: 4px; /* 非本人消息左上角更尖锐 */
}

.message-self {
  background-color: #95ed68;
  color: #333;
  border-top-right-radius: 4px; /* 本人消息右上角更尖锐 */
  border-top-left-radius: 12px; /* 恢复本人消息左上角圆角 */
}

.message-time {
  background: none;
  color: #999;
  font-size: 12px;
  text-align: center;
  width: 100%;
  max-width: 100%;
  box-shadow: none;
}

.message-image {
  display: block;
  max-width: 180px;
  max-height: 180px;
  border-radius: 6px;
  cursor: pointer;
}

/* 聚合图片：单张保持原尺寸，多张收成正方形网格（仿微信聚合的观感） */
.message-images.is-multi {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  max-width: 186px;
}

.message-images.is-multi .message-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: none;
  max-height: none;
}

.voice-text-divider {
  margin: 8px 0;
  border-top: 1px dashed #dcdfe6;
}

.voice-text {
  font-size: 14px;
  color: #606266;
  margin-top: 4px;
}

.input-area {
  background: #fff;
  border-top: 1px solid #eee;
}

.message-input-container {
  background: #fff;
  position: relative; 
}

.input-header {
  padding: 8px 12px;
  border-top: 1px solid #f1f1f1;
}

.coze-btn {
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 8px;
}

.input-content {
  padding: 10px;
}

.input-content :deep(.el-textarea__inner) {
  border: none;
  resize: none;
  box-shadow: none;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 10px;
}

.input-content :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.input-footer {
  padding: 8px 12px;
  text-align: right;
}

.send-btn {
  border-radius: 20px;
  padding: 8px 24px;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  border: none;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
  transition: all 0.3s ease;
}

.send-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
}
.copy-btn {
  margin-right: 8px;
  border: 1px solid #dcdfe6;
  color: #606266;
}

.copy-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background-color: #ecf5ff;
}
.empty-chat-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-color: #f9f9f9;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #a0aec0;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state-text {
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-state-subtext {
  font-size: 14px;
  opacity: 0.8;
}
/* 圆形倒计时浮窗样式 */
.countdown-overlay {
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #1890ff, #096dd9);
  color: white;
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(24, 144, 255, 0.3);
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 320px;
  animation: slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 100;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.countdown-overlay.urgent {
  background: linear-gradient(135deg, #ff4d4f, #cf1322);
  animation: pulse 0.8s infinite;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: translateX(-50%) scale(1);
  }
  50% {
    transform: translateX(-50%) scale(1.05);
  }
}

.countdown-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.countdown-circle {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.countdown-progress {
  transition: stroke-dasharray 0.3s ease;
}

.countdown-number {
  position: absolute;
  font-size: 14px;
  font-weight: bold;
  color: white;
  text-align: center;
}

.countdown-text {
  flex: 1;
}

.countdown-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.countdown-subtitle {
  font-size: 12px;
  opacity: 0.9;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.setting-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 账号分组标题样式 */
.account-header {
  padding: 8px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.account-title {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  display: inline-block;
}
/* 响应式样式 */
@media screen and (max-width: 768px) {
  .settings-content {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .settings-right {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .stats-btn, .log-btn, .setting-btn {
    font-size: 12px;
    padding: 6px 10px;
  }
}

@media screen and (max-width: 600px) {
  .chat-list {
    width: 100%;
    max-width: 100%;
  }
  
  .settings-right {
    flex-wrap: wrap;
  }
}

/* 账号信息样式 */
.account-info {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
}

.account-label {
  color: #999;
  font-size: 11px;
}

.account-id {
  color: #1890ff;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: rgba(24, 144, 255, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
  letter-spacing: 0.3px;
}

/* 挂起列表样式 */
.suspended-list {
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.suspended-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suspended-item:hover {
  background-color: #f5f7fa;
}

.suspended-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.suspended-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.suspended-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.suspended-time-row {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
}

.time-label {
  color: #909399;
}

.suspended-time {
  color: #606266;
}
</style>
