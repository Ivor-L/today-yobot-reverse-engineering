<template>
  <el-dialog
    v-model="dialogVisible"
    title="AI自动回复检查项提醒"
    width="600px"
    :close-on-click-modal="false"
    class="account-status-dialog"
  >
    <!-- 提示信息区域 -->
    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="status-info-banner"
    >
      <span class="info-text">检测到已登录 {{ accountList.length }} 个账号，请按指引完善配置后，重新开启自动回复</span>
    </el-alert>
    
    <div class="account-status-content">
      <div class="account-list">
        <div 
          v-for="account in accountList" 
          :key="account.account_id"
          class="account-item"
        >
          <div class="account-header">
            <div class="account-info">
              <span class="account-label">{{ getAccountStatusLabel(account) }}：</span>
              <span class="account-id">{{ account.account_id }}</span>
              <span class="account-nickname">({{ account.nickname }})</span>
            </div>
          </div>
          
          <div class="status-list">
            <div class="status-item">
              <span 
                class="status-text"
                :class="{ 'error-text': account.sync_status.error }"
              >
                {{ account.sync_status.message }}
              </span>
            </div>
            
            <div class="status-item">
              <span 
                class="status-text"
                :class="{ 'error-text': account.ai_status.error }"
              >
                {{ account.ai_status.message }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <el-button 
          type="primary" 
          class="confirm-button"
          @click="handleConfirm"
        >
          好的
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AccountStatus {
  account_id: string
  nickname: string
  sync_status: {
    synced: boolean
    expired: boolean
    message: string
    error: boolean
  }
  ai_status: {
    configured: boolean
    count: number
    message: string
    error: boolean
  }
}

interface Props {
  visible: boolean
  accountList: AccountStatus[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 使用computed属性处理v-model
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

// 获取账号状态标签
const getAccountStatusLabel = (account: AccountStatus) => {
  const hasError = account.sync_status.error || account.ai_status.error
  return hasError ? '异常账号' : '正常账号'
}

// 处理确认按钮点击
const handleConfirm = () => {
  emit('confirm')
  emit('update:visible', false)
}
</script>

<style scoped>
/* 账号状态检查弹窗样式 */
.account-status-dialog {
  .el-dialog__header {
    text-align: center;
    padding: 20px 20px 10px;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .el-dialog__title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
}

.status-info-banner {
  margin-bottom: 20px;
}

.info-text {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.account-status-content {
  padding: 0;
}

.account-list {
  max-height: 400px;
  overflow-y: auto;
}

.account-item {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.account-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.account-header {
  margin-bottom: 12px;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.account-label {
  color: #666;
  font-weight: 500;
}

.account-id {
  color: #1890ff;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  font-size: 15px;
  background: rgba(24, 144, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.account-nickname {
  color: #333;
  font-weight: 500;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #52c41a;
}

.status-text {
  font-size: 13px;
  color: #333;
  line-height: 1.4;
}

.error-text {
  color: #ff4d4f !important;
  font-weight: 500;
}

.status-item:has(.error-text) {
  border-left-color: #ff4d4f;
  background: #fff2f0;
}

.dialog-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  margin-top: 20px;
}

.confirm-button {
  background: linear-gradient(135deg, #1890ff, #096dd9);
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.confirm-button:hover {
  background: linear-gradient(135deg, #096dd9, #0050b3);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.3);
}
</style>