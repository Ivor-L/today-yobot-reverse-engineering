<template>
  <el-dialog
    v-model="dialogVisible"
    title="自动跟进配置"
    :width="dialogWidth"
    :top="'10vh'"
    :close-on-click-modal="false"
    class="auto-follow-config-dialog"
  >
    <!-- 副标题 -->
    <div class="dialog-subtitle">
      自动跟进客户与群聊，释放AI生产力
    </div>

    <el-form :model="configForm" label-width="100px" class="config-form">
      <!-- 跟进智能体 -->
      <el-form-item class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><Avatar /></el-icon>
            <span>跟进智能体：</span>
          </div>
        </template>
        <div class="item-content">
          <el-select 
            v-model="configForm.agentId" 
            placeholder="选择智能体" 
            class="select-full-width"
          >
            <el-option
              v-for="agent in cozeAgents"
              :key="agent.botId"
              :label="agent.name"
              :value="agent.botId"
            />
          </el-select>
        </div>
      </el-form-item>

      <!-- 跟进对象 -->
      <el-form-item class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><User /></el-icon>
            <span>跟进对象：</span>
          </div>
        </template>
        <div class="item-content">
          <div class="selected-friends">
            {{ formatSelectedTargets }}
          </div>
        </div>
      </el-form-item>

      <!-- 跟进周期 -->
      <el-form-item class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><Calendar /></el-icon>
            <span>跟进周期：</span>
          </div>
        </template>
        <div class="item-content">
          <div class="follow-period">
            <el-input-number 
              v-model="configForm.followDays" 
              :min="3" 
              :max="30" 
              controls-position="right"
              style="width: 120px; margin-right: 8px;"
            />
            <span class="period-unit">天</span>
          </div>
        </div>
      </el-form-item>

      <!-- 跟进频率 -->
      <el-form-item class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><Clock /></el-icon>
            <span>跟进频率：</span>
          </div>
        </template>
        <div class="item-content">
          <div class="frequency-input-row" style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="margin-right: 8px;">每隔</span>
            <el-input-number 
              v-model="configForm.followFrequency" 
              :min="0" 
              :max="10" 
              controls-position="right"
              style="width: 100px; margin-right: 8px;"
            />
            <span>天</span>
          </div>
          <div class="frequency-description">
            <span v-if="configForm.followFrequency === 0" class="desc-text">
              每天跟进一次
            </span>
            <span v-else class="desc-text">
              每隔 {{ configForm.followFrequency }} 天跟进一次
            </span>
          </div>
        </div>
      </el-form-item>

      <!-- 时间选择 -->
      <el-form-item class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><AlarmClock /></el-icon>
            <span>时间段：</span>
          </div>
        </template>
        <div class="item-content">
          <div class="time-range-container">
            <el-time-picker
              v-model="configForm.startTime"
              format="HH:mm"
              placeholder="开始时间"
              class="time-picker"
            />
            <span class="time-separator">—</span>
            <el-time-picker
              v-model="configForm.endTime"
              format="HH:mm"
              placeholder="结束时间"
              class="time-picker"
            />
          </div>
        </div>
      </el-form-item>

      <!-- 次日执行 -->
      <el-form-item class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><Calendar /></el-icon>
            <span>首次执行：</span>
          </div>
        </template>
        <div class="item-content">
          <el-checkbox v-model="configForm.firstRunNextDay">次日执行</el-checkbox>
          <p class="desc-text" style="margin-top: 6px;">
            勾选后，今天无论是否在时间段内都不执行，从次日对应时间段开始跟进。
          </p>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleCreateAutoFollow"
          :loading="creating"
        >
          开启自动跟进
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, PropType } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { getConfig } from '@/api/config'
import { Avatar, User, Calendar, Clock, AlarmClock } from '@element-plus/icons-vue'

interface CozeAgent {
  botId: string
  name: string
}

interface ConfigFormData {
  agentId: string
  followFrequency: number
  followDays: number
  startTime: Date
  endTime: Date
  firstRunNextDay: boolean
}

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedFriends: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  selectedGroups: {
    type: Array as PropType<string[]>,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'update:modelValue', 'create'])
const router = useRouter()

// 响应式数据
const cozeAgents = ref<CozeAgent[]>([])
const creating = ref(false)

// 表单数据
const configForm = ref<ConfigFormData>({
  agentId: '',
  followFrequency: 1, // 默认间隔1天
  followDays: 7, // 默认7天
  startTime: new Date(2000, 1, 1, 8, 0), // 默认8:00
  endTime: new Date(2000, 1, 1, 12, 0),   // 默认12:00
  firstRunNextDay: false // 默认当天按时间段规则执行
})

// 计算属性
const dialogWidth = computed(() => {
  const windowWidth = window.innerWidth
  if (windowWidth < 768) {
    return '95%'
  }
  if (windowWidth < 1200) {
    return '80%'
  }
  return '500px'
})

const dialogVisible = computed({
  get: () => props.visible || props.modelValue,
  set: (val) => {
    emit('update:visible', val)
    emit('update:modelValue', val)
  }
})

const formatSelectedTargets = computed(() => {
  const all = [...props.selectedFriends, ...props.selectedGroups]
  if (all.length === 0) return '未选择'
  if (all.length <= 5) return all.join('、')
  return `${all.slice(0, 5).join('、')}等${all.length}个`
})

// 方法
const loadCozeAgents = async () => {
  try {
    const result = await getConfig('agents')
    if (result.success && result.data) {
      const agents = Array.isArray(result.data) ? result.data : 
                    Array.isArray(result.data.agents) ? result.data.agents : []
      
      cozeAgents.value = agents.filter((agent: CozeAgent) => agent.name && agent.botId)
      
      // 新配置尚未选择智能体时，使用列表第一项作为表单初始值
      const selectedAgentExists = cozeAgents.value.some(agent => agent.botId === configForm.value.agentId)
      if (!selectedAgentExists && cozeAgents.value.length > 0) {
        configForm.value.agentId = cozeAgents.value[0].botId
      }
    }
  } catch (error) {
    console.error('加载智能体配置失败:', error)
    ElMessage.error('加载智能体配置失败')
  }
}

const handleCreateAutoFollow = async () => {
  try {
    // 验证表单
    if (!configForm.value.agentId) {
      ElMessage.warning('请选择跟进智能体')
      return
    }

    if (!configForm.value.startTime || !configForm.value.endTime) {
      ElMessage.warning('请选择时间段')
      return
    }

    // 验证时间范围
    const startHour = configForm.value.startTime.getHours()
    const startMinute = configForm.value.startTime.getMinutes()
    const endHour = configForm.value.endTime.getHours()
    const endMinute = configForm.value.endTime.getMinutes()

    const startTimeInMinutes = startHour * 60 + startMinute
    const endTimeInMinutes = endHour * 60 + endMinute

    if (startTimeInMinutes >= endTimeInMinutes) {
      ElMessage.warning('结束时间必须晚于开始时间')
      return
    }

    creating.value = true

    // 构建配置数据
    const configData = {
      agentId: configForm.value.agentId,
      followFrequency: configForm.value.followFrequency,
      followDays: configForm.value.followDays,
      timeRangeStart: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
      timeRangeEnd: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
      firstRunNextDay: configForm.value.firstRunNextDay,
      selectedFriends: props.selectedFriends
    }

    // 触发创建事件
    emit('create', configData)
    
    // 关闭弹窗
    dialogVisible.value = false

  } catch (error) {
    console.error('创建自动跟单任务失败:', error)
    ElMessage.error('创建自动跟单任务失败')
  } finally {
    creating.value = false
  }
}

// 生命周期
onMounted(() => {
  loadCozeAgents()
})
</script>

<style scoped>
.auto-follow-config-dialog :deep(.el-dialog__title) {
  width: 100%;
  text-align: center;
}

.dialog-subtitle {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
}

.config-form {
  margin-top: 10px;
}

.custom-label-form-item {
  margin-bottom: 20px;
}

.label-with-icon {
  display: flex;
  align-items: center;
  white-space: nowrap;
  min-width: 90px;
}

.label-icon {
  margin-right: 8px;
  font-size: 16px;
  color: #409EFF;
  align-items: center;
  padding-top: 2px;
  justify-content: center;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.select-full-width {
  width: 100%;
}

.selected-friends {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.follow-period {
  display: flex;
  align-items: center;
  gap: 4px;
}

.period-text {
  font-size: 18px;
  font-weight: bold;
  color: #409EFF;
}

.period-unit {
  font-size: 14px;
  color: #606266;
}

.frequency-radio {
  margin-bottom: 8px;
}

.frequency-description {
  margin-top: 8px;
}

.desc-text {
  font-size: 12px;
  color: #909399;
  background-color: #f0f9ff;
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 3px solid #409EFF;
}

.time-range-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

.time-picker {
  flex: 1;
  min-width: 0;
}

.time-separator {
  color: #606266;
  font-weight: bold;
  flex-shrink: 0;
}

:deep(.el-form-item__label) {
  font-weight: bold;
}

:deep(.el-dialog) {
  margin: 0 auto;
  max-width: 500px;
  min-width: 280px;
}

@media screen and (max-width: 768px) {
  .time-range-container {
    gap: 8px;
  }
}
</style>
