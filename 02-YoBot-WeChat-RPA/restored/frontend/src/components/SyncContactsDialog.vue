<template>
  <el-dialog
    v-model="visible"
    title="同步通讯录"
    width="500px"
    :close-on-click-modal="false"
    class="sync-contacts-dialog"
  >
    <!-- 提示区域 -->
    <div class="warning-section">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        class="warning-banner"
      >
        <span class="warning-text">所有微信通讯录数据均保存本地，绝不会上传服务器</span>
      </el-alert>
      
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        class="warning-banner"
      >
        <span class="warning-text">建议7天同步一次好友(注意：好友标签中不要有空格)</span>
      </el-alert>
    </div>

    <!-- 同步区域 -->
    <div class="sync-section">
      <div class="section-header">
        <h4>手动同步</h4>
      </div>
      <div class="section-content">
        <div class="account-selector">
          <label class="selector-label">账号：</label>
          <el-select
            v-model="selectedAccountId"
            placeholder="请选择账号"
            style="width: 200px"
          >
            <el-option
              v-for="account in accounts"
              :key="account.account_id"
              :label="account.nickname"
              :value="account.account_id"
            />
          </el-select>
        </div>

        <div class="sync-buttons">
          <el-button
            type="primary"
            @click="handleSync('friend')"
            :disabled="!selectedAccountId || !friendSyncEnabled"
            :title="friendSyncEnabled ? '' : friendSyncDisabledReason"
          >
            同步好友
          </el-button>
          <el-button
            type="primary"
            @click="handleSync('group')"
            :disabled="!selectedAccountId || !groupSyncEnabled"
            :title="groupSyncEnabled ? '' : groupSyncDisabledReason"
          >
            同步群聊
          </el-button>
        </div>
      </div>
    </div>

    <!-- 自动同步区域 -->
    <div v-if="scheduledSyncEnabled" class="auto-sync-section">
      <div class="section-header">
        <h4>自动同步</h4>
      </div>
      <div class="section-content">
        <!-- 同步项配置 -->
        <div class="sync-items-config">
          <label>同  步  项：</label>
          <el-checkbox-group v-model="syncItems" :disabled="autoSyncEnabled">
            <el-checkbox label="friend" :disabled="autoSyncEnabled || !friendSyncEnabled">好友</el-checkbox>
            <el-checkbox label="group" :disabled="autoSyncEnabled || !groupSyncEnabled">群聊</el-checkbox>
          </el-checkbox-group>
        </div>
        
        <!-- 同步频率配置 -->
        <div class="sync-frequency-config">
          <label>同步频率：</label>
          <span>每隔</span>
          <el-input-number
            v-model="syncFrequency"
            :min="2"
            :max="30"
            :step="1"
            :disabled="autoSyncEnabled"
            controls-position="right"
          />
          <span>天</span>
        </div>
        
        <!-- 时间段配置 -->
        <div class="time-range-config">
          <label>时  间  段：</label>
          <el-time-picker
            v-model="autoSyncStartTime"
            format="HH:mm"
            placeholder="开始时间"
            :disabled="autoSyncEnabled"
            style="width: 100px"
          />
          <span style="margin: 0 8px">至</span>
          <el-time-picker
            v-model="autoSyncEndTime"
            format="HH:mm"
            placeholder="结束时间"
            :disabled="autoSyncEnabled"
            style="width: 100px"
          />
        </div>
        
        <!-- 下次执行时间显示 -->
        <div v-if="autoSyncEnabled && nextExecutionTime" class="next-execution-time">
          <label>下次执行时间：</label>
          <span class="execution-time">{{ nextExecutionTime }}</span>
        </div>
        
        <!-- 开关控制 -->
        <div class="auto-sync-toggle">
          <el-switch
            v-model="autoSyncEnabled"
            active-text="已启用"
            inactive-text="已关闭"
            :disabled="!runtimeSyncEnabled && !autoSyncEnabled"
            :title="runtimeSyncDisabledReason"
            @change="handleAutoSyncToggle"
          />
        </div>
      </div>
    </div>
    <el-alert
      v-else
      type="info"
      :closable="false"
      show-icon
      title="当前平台支持手动同步，暂不支持定时自动同步"
    />

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 倒计时弹窗 -->
  <countdown-dialog
    v-model="showCountdown"
    :countdown="3"
    :message="countdownMessage"
    @finish="executeSync"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import CountdownDialog from './CountdownDialog.vue'
import { 
  createSyncContactsTask, 
  getSyncContactsTaskStatus,
  cancelSyncContactsTask,
  SyncContactsRequest,
} from '@/api/syncContacts'

interface Account {
  account_id: string
  nickname: string
}

interface Props {
  modelValue: boolean
  accounts: Account[]
  defaultAccountId?: string
  friendSyncEnabled?: boolean
  groupSyncEnabled?: boolean
  friendSyncDisabledReason?: string
  groupSyncDisabledReason?: string
  scheduledSyncEnabled?: boolean
  scheduledSyncDisabledReason?: string
}

const props = withDefaults(defineProps<Props>(), {
  friendSyncEnabled: true,
  groupSyncEnabled: true,
  friendSyncDisabledReason: '',
  groupSyncDisabledReason: '',
  scheduledSyncEnabled: true,
  scheduledSyncDisabledReason: ''
})
const emit = defineEmits(['update:modelValue', 'sync'])

const visible = ref(false)
const selectedAccountId = ref('')
const showCountdown = ref(false)
const countdownMessage = ref('')
const syncType = ref<'friend' | 'group'>('friend')

// 自动同步相关
const autoSyncEnabled = ref(false)
const autoSyncStartTime = ref(new Date(2024, 0, 1, 2, 0)) // 默认凌晨2点
const autoSyncEndTime = ref(new Date(2024, 0, 1, 4, 0))   // 默认凌晨4点
const syncItems = ref(['group']) // 默认勾选群聊
const syncFrequency = ref(7) // 默认7天
const nextExecutionTime = ref('')
const runtimeSyncEnabled = computed(() => props.friendSyncEnabled || props.groupSyncEnabled)
const runtimeSyncDisabledReason = computed(() => (
  runtimeSyncEnabled.value
    ? ''
    : props.friendSyncDisabledReason || props.groupSyncDisabledReason
))

// 开始时间变化后自动联动设置结束时间为开始时间+2小时（处理跨天）
const updateAutoEndTime = () => {
  if (autoSyncEnabled.value) return
  const start = autoSyncStartTime.value
  if (!start) return
  const end = new Date(start)
  end.setHours(end.getHours() + 2)
  autoSyncEndTime.value = end
}

watch(autoSyncStartTime, () => {
  updateAutoEndTime()
})

watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal && props.accounts.length > 0) {
    // 默认选择传入的账号ID；若未传入则选择第一个账号
    const passedId = props.defaultAccountId
    const exists = passedId && props.accounts.some(acc => acc.account_id === passedId)
    selectedAccountId.value = exists ? (passedId as string) : props.accounts[0].account_id
    syncItems.value = syncItems.value.filter(item => (
      item === 'friend' ? props.friendSyncEnabled : props.groupSyncEnabled
    ))
    if (syncItems.value.length === 0) {
      if (props.groupSyncEnabled) syncItems.value = ['group']
      else if (props.friendSyncEnabled) syncItems.value = ['friend']
    }
    // Strict Runtime 不允许为未声明能力探测旧同步接口。
    if (runtimeSyncEnabled.value && props.scheduledSyncEnabled) checkAutoSyncStatus()
  }
})

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 查询自动同步状态
const checkAutoSyncStatus = async () => {
  if (!runtimeSyncEnabled.value) {
    autoSyncEnabled.value = false
    nextExecutionTime.value = ''
    return
  }
  try {
    const activeTask = await getSyncContactsTaskStatus()
    console.log('获取到的任务状态:', activeTask)
    
    if (activeTask) {
      autoSyncEnabled.value = true
      
      // 从 params.sync_config 中获取配置信息
      const syncConfig = activeTask.params?.sync_config || {} as {
        sync_items?: string[]
        sync_frequency?: number
        time_range_start?: string
        time_range_end?: string
        start_date?: string
      }
      syncItems.value = syncConfig.sync_items || ['group']
      syncFrequency.value = syncConfig.sync_frequency || 7
      
      // 设置时间段
      if (syncConfig.time_range_start && syncConfig.time_range_end) {
        const [startHour, startMinute] = syncConfig.time_range_start.split(':')
        const [endHour, endMinute] = syncConfig.time_range_end.split(':')
        autoSyncStartTime.value = new Date(2024, 0, 1, parseInt(startHour), parseInt(startMinute))
        autoSyncEndTime.value = new Date(2024, 0, 1, parseInt(endHour), parseInt(endMinute))
      }
      
      // 设置下次执行时间
      if (activeTask.next_run_time) {
        // 格式化显示时间
        const nextTime = new Date(activeTask.next_run_time)
        nextExecutionTime.value = nextTime.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      } else {
        nextExecutionTime.value = ''
      }
    } else {
      autoSyncEnabled.value = false
      nextExecutionTime.value = ''
    }
  } catch (error) {
    console.error('查询自动同步状态失败:', error)
    autoSyncEnabled.value = false
    nextExecutionTime.value = ''
  }
}

// 处理自动同步开关
const handleAutoSyncToggle = async (val: string | number | boolean) => {
  const enabled = Boolean(val)
  if (!props.scheduledSyncEnabled) {
    ElMessage.warning(props.scheduledSyncDisabledReason || '当前平台暂不支持定时自动同步')
    autoSyncEnabled.value = false
    return
  }
  if (enabled) {
    const unsupportedItem = syncItems.value.find(item => (
      item === 'friend' ? !props.friendSyncEnabled : !props.groupSyncEnabled
    ))
    if (!runtimeSyncEnabled.value || unsupportedItem) {
      ElMessage.warning(runtimeSyncDisabledReason.value || '当前版本暂不支持所选同步项')
      autoSyncEnabled.value = false
      return
    }
    // 开启自动同步
    if (syncItems.value.length === 0) {
      ElMessage.warning('请至少选择一个同步项')
      autoSyncEnabled.value = false
      return
    }
    
    try {
      const request: SyncContactsRequest = {
        sync_items: syncItems.value,
        sync_frequency: syncFrequency.value,
        time_range_start: `${autoSyncStartTime.value.getHours().toString().padStart(2, '0')}:${autoSyncStartTime.value.getMinutes().toString().padStart(2, '0')}`,
        time_range_end: `${autoSyncEndTime.value.getHours().toString().padStart(2, '0')}:${autoSyncEndTime.value.getMinutes().toString().padStart(2, '0')}`,
        enabled: true
      }
      
      const result = await createSyncContactsTask(request)
      
      if (result.success) {
        ElMessage.success('自动同步已开启')
        nextExecutionTime.value = result.next_execution_time || ''
        // 重新查询状态
        await checkAutoSyncStatus()
      } else {
        ElMessage.error(result.error || '开启自动同步失败')
        autoSyncEnabled.value = false
      }
    } catch (error: any) {
      console.error('开启自动同步失败:', error)
      ElMessage.error(`开启自动同步失败: ${error.message || '未知错误'}`)
      autoSyncEnabled.value = false
    }
  } else {
    // 关闭自动同步 - 取消当前活跃的任务
    try {
      const activeTask = await getSyncContactsTaskStatus()
      
      if (activeTask) {
        await cancelSyncContactsTask(activeTask.id)
        ElMessage.success('自动同步已关闭')
      } else {
        ElMessage.info('没有找到活跃的自动同步任务')
      }
      
      nextExecutionTime.value = ''
      // 重新查询状态
      await checkAutoSyncStatus()
    } catch (error: any) {
      console.error('关闭自动同步失败:', error)
      ElMessage.error(`关闭自动同步失败: ${error.message || '未知错误'}`)
      autoSyncEnabled.value = true
    }
  }
}

const handleSync = (type: 'friend' | 'group') => {
  const enabled = type === 'friend' ? props.friendSyncEnabled : props.groupSyncEnabled
  if (!enabled) {
    ElMessage.warning(
      type === 'friend'
        ? props.friendSyncDisabledReason
        : props.groupSyncDisabledReason
    )
    return
  }
  if (!selectedAccountId.value) {
    return
  }
  
  syncType.value = type
  countdownMessage.value = type === 'friend' ? '准备同步好友数据' : '准备同步群聊数据'
  
  // 关闭设置弹窗
  visible.value = false
  
  // 显示倒计时弹窗
  showCountdown.value = true
}

const executeSync = () => {
  emit('sync', {
    accountId: selectedAccountId.value,
    type: syncType.value
  })
}

const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.sync-contacts-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.warning-section {
  margin-bottom: 24px;
}

.warning-banner {
  margin-bottom: 12px;
}

.warning-banner:last-child {
  margin-bottom: 0;
}

.warning-text {
  font-size: 14px;
  line-height: 1.5;
}

.sync-section {
  margin-bottom: 24px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.auto-sync-section {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

/* 统一的模块标题样式 */
.section-header {
  height: 48px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.section-header h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}

/* 模块内容区域 */
.section-content {
  padding: 20px;
}

.account-selector {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.selector-label {
  font-weight: 500;
  margin-right: 12px;
  min-width: 40px;
}

.sync-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* 同步项配置样式 */
.sync-items-config {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  min-height: 32px;
}

.sync-items-config label {
  font-weight: 500;
  margin-right: 16px;
  min-width: 60px;
  color: #333;
  font-size: 14px;
}

.sync-items-config :deep(.el-checkbox-group) {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sync-items-config :deep(.el-checkbox) {
  margin-right: 0;
  white-space: nowrap;
}

/* 同步频率配置样式 */
.sync-frequency-config {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  min-height: 32px;
}

.sync-frequency-config label {
  font-weight: 500;
  margin-right: 16px;
  min-width: 60px;
  color: #333;
  font-size: 14px;
}

.sync-frequency-config span {
  margin: 0 8px;
  color: #666;
  font-size: 14px;
}

.sync-frequency-config :deep(.el-input-number) {
  width: 100px !important;
}

.sync-frequency-config :deep(.el-input-number .el-input__inner) {
  text-align: center;
}

/* 时间段配置样式 */
.time-range-config {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  min-height: 32px;
}

.time-range-config label {
  font-weight: 500;
  margin-right: 16px;
  min-width: 60px;
  color: #333;
  font-size: 14px;
}

.time-range-config span {
  margin: 0 12px;
  color: #666;
  font-size: 14px;
}

.time-range-config :deep(.el-time-picker) {
  width: 120px;
}

/* 下次执行时间显示样式 */
.next-execution-time {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  min-height: 32px;
  padding: 8px 12px;
  background: #e8f4fd;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.next-execution-time label {
  font-weight: 500;
  margin-right: 12px;
  color: #333;
  font-size: 14px;
}

.execution-time {
  color: #409eff;
  font-weight: 600;
  font-size: 14px;
}

/* 开关控制样式 - 水平居中 */
.auto-sync-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.auto-sync-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.time-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-range label {
  font-weight: 500;
  min-width: 60px;
}

.dialog-footer {
  text-align: center;
}
</style>
