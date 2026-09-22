<template>
  <div class="operations-panel">
    <div class="panel-header">
      <h3 class="panel-title">批量操作</h3>
    </div>

    <div class="panel-content">
      <!-- 水平布局的操作区域 -->
      <div class="horizontal-operations">
        <!-- 群发消息区域 -->
        <div class="mass-send-section">
          <button
            :disabled="!canMassSend || !massSendEnabled"
            :title="massSendEnabled ? '' : massSendDisabledReason"
            @click="$emit('mass-send')"
            class="action-btn action-btn-primary"
          >
            <svg class="action-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <path d="M8 10h8M8 14h4"/>
            </svg>
            <span class="action-btn-text">群发消息</span>
          </button>
        </div>

        <!-- 分割线 -->
        <div class="vertical-divider"></div>

        <!-- 批量操作区域 -->
        <div class="batch-operations-section">
          <div class="batch-buttons">
            <button
              :disabled="!canBatchGroup || !batchGroupEnabled"
              :title="batchGroupEnabled ? '' : batchGroupDisabledReason"
              @click="$emit('batch-group')"
              class="action-btn action-btn-secondary batch-btn"
            >
              <svg class="action-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              <span class="action-btn-text">批量拉群</span>
            </button>

            <button
              :disabled="!canAutoFollow || !autoFollowEnabled"
              :title="autoFollowEnabled ? '' : autoFollowDisabledReason"
              @click="$emit('auto-follow')"
              class="action-btn action-btn-secondary batch-btn"
            >
              <svg class="action-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span class="action-btn-text">自动跟进</span>
            </button>
          </div>
        </div>

        <!-- 分割线 -->
        <div class="vertical-divider"></div>

        <!-- 通讯录设置区域 -->
        <div class="settings-section">
          <button
            :disabled="!syncEnabled"
            :title="syncEnabled ? '' : syncDisabledReason"
            @click="$emit('open-settings')"
            class="settings-btn"
          >
            <div class="settings-content">
              <div class="settings-icon-title">
                <svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span class="settings-title">同步</span>
              </div>
              <div v-if="autoSyncEnabled" class="settings-status">
                <span class="status-text">自动同步</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- 操作提示 -->
      <div v-if="hasSelections && !allOperationsAvailable" class="operation-tips">
        <el-alert
          :title="operationTip"
          type="info"
          :closable="false"
          show-icon
          class="tip-alert"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { getSyncContactsTaskStatus } from '@/api/syncContacts'

// Props
interface Props {
  selectedFriends: string[]
  selectedGroups: string[]
  massSendEnabled?: boolean
  massSendDisabledReason?: string
  batchGroupEnabled?: boolean
  batchGroupDisabledReason?: string
  autoFollowEnabled?: boolean
  autoFollowDisabledReason?: string
  syncEnabled?: boolean
  syncDisabledReason?: string
  scheduledSyncEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedFriends: () => [],
  selectedGroups: () => [],
  massSendEnabled: true,
  massSendDisabledReason: '',
  batchGroupEnabled: true,
  batchGroupDisabledReason: '',
  autoFollowEnabled: true,
  autoFollowDisabledReason: '',
  syncEnabled: true,
  syncDisabledReason: '',
  scheduledSyncEnabled: true
})

// Emits
const emit = defineEmits<{
  'mass-send': []
  'batch-group': []
  'auto-follow': []
  'batch-tag': []
  'delete': []
  'open-settings': []
}>()

// 自动同步状态
const autoSyncEnabled = ref(false)

// 检查自动同步状态
const checkAutoSyncStatus = async () => {
  try {
    const activeTask = await getSyncContactsTaskStatus()
    autoSyncEnabled.value = !!activeTask
  } catch (error) {
    console.error('查询自动同步状态失败:', error)
    autoSyncEnabled.value = false
  }
}

// 计算属性
const hasSelections = computed(() => {
  return props.selectedFriends.length > 0 || props.selectedGroups.length > 0
})

const hasFriends = computed(() => props.selectedFriends.length > 0)
const hasGroups = computed(() => props.selectedGroups.length > 0)
const hasBothTypes = computed(() => hasFriends.value && hasGroups.value)

// 操作按钮可用性
const canMassSend = computed(() => hasSelections.value)
const canBatchGroup = computed(() => hasFriends.value && !hasGroups.value)
const canAutoFollow = computed(() => hasSelections.value)
const canBatchTag = computed(() => hasFriends.value && !hasGroups.value)
const canDelete = computed(() => hasSelections.value)

const allOperationsAvailable = computed(() => {
  return !hasBothTypes.value
})

const operationTip = computed(() => {
  if (hasBothTypes.value) {
    return '部分操作仅支持好友'
  }
  if (hasGroups.value && !hasFriends.value) {
    return '部分操作仅支持好友'
  }
  return ''
})

// 组件挂载时检查自动同步状态
onMounted(() => {
  if (props.syncEnabled && props.scheduledSyncEnabled) checkAutoSyncStatus()
})
</script>

<style scoped>
.operations-panel {
  background: white;
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  margin-bottom: 12px;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding: 0 16px 16px 16px;
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 4px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 水平布局的操作区域 */
.horizontal-operations {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 16px;
  width: 100%;
}

/* 群发消息区域 */
.mass-send-section {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.mass-send-section .action-btn {
  padding: 20px 12px;
  font-size: 16px;
  font-weight: 600;
  min-width: 80px;
  min-height: 80px;
}

.mass-send-section .action-btn-icon {
  width: 28px;
  height: 28px;
}

/* 批量操作区域 */
.batch-operations-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.batch-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
  width: 100%;
  height: 100%;
  justify-content: center;
}

/* 通讯录设置区域 */
.settings-section {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

/* 垂直分割线 */
.vertical-divider {
  width: 1px;
  background: #e5e7eb;
  align-self: stretch;
  margin: 8px 0;
}

.operations-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-btn {
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.action-btn:hover::before {
  width: 300px;
  height: 300px;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn-primary {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(30, 58, 138, 0.25);
  grid-column: span 2;
}

.action-btn-primary:hover {
  box-shadow: 0 6px 20px rgba(30, 58, 138, 0.35);
}

.action-btn-secondary {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  color: #0c4a6e;
  border: 1px solid #bae6fd;
}

.action-btn-secondary:hover {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
}

/* 批量操作按钮特殊样式 */
.batch-btn {
  flex: 1;
  flex-direction: row !important;
  justify-content: center;
  align-items: center;
  gap: 8px !important;
  min-height: 0;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
}

.batch-btn .action-btn-icon {
  width: 20px;
  height: 20px;
}

.batch-btn .action-btn-text {
  white-space: nowrap;
}

.action-btn-icon {
  width: 24px;
  height: 24px;
}

.action-btn-text {
  position: relative;
  z-index: 1;
}

.action-btn:disabled {
  background: #f5f5f5;
  color: #bfbfbf;
  border-color: #d9d9d9;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.action-btn:disabled::before {
  display: none;
}

.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 20px 0;
}

.operation-tips {
  margin-top: 8px;
}

.tip-alert {
  border-radius: 8px;
}

.tip-alert :deep(.el-alert__content) {
  font-size: 12px;
}

.no-selection-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.empty-state {
  margin: 0;
}

.empty-state :deep(.el-empty__description) {
  color: #999;
  font-size: 14px;
}

/* 设置按钮区域 */
.settings-btn {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px 10px;
  cursor: pointer;
  transition: all 0.25s ease;
  display: block;
  min-width: 75px;
  min-height: 80px;
}

.settings-btn:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  text-align: center;
}

.settings-icon-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.settings-icon {
  width: 20px;
  height: 20px;
  color: #64748b;
}

.settings-title {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.settings-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.status-text {
  font-size: 12px;
  color: #16a34a;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

/* 响应式设计 */
@media screen and (max-width: 1200px) {
  .operations-panel {
    width: 240px;
  }
  
  .panel-content {
    padding: 0 10px 10px 10px;
  }
  
  .operation-btn {
    height: 44px;
    font-size: 13px;
  }
}

@media screen and (max-width: 480px) {
  .operations-panel {
    width: 100%;
    order: 3;
  }
  
  .operation-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .operation-btn {
    height: 40px;
    font-size: 12px;
  }
  
  .operation-btn span {
    display: none;
  }
  
  .no-selection-tip {
    grid-column: 1 / -1;
    min-height: 120px;
  }
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
