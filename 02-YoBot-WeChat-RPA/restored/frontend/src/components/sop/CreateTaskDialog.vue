<template>
  <el-dialog
    v-model="dialogVisible"
    title="新建推送任务"
    :width="dialogWidth"
    :top="'15vh'"
    :close-on-click-modal="false"
  >
  <!-- 添加警告横幅 -->
  <el-alert
      type="warning"
      show-icon
      :closable="false"
      class="push-warning-banner"
    >
      <span class="warning-text">建议单次群发不超过100个目标，支持自动分组推送。<template v-if="isFromSOP">推荐在【客户管理】中创建任务，支持同时选择好友和群聊进行推送。</template></span>
    </el-alert>
    <el-form :model="taskForm" label-width="100px">
      <el-form-item class="custom-label-form-item" v-if="wechatNickname">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><Avatar /></el-icon>
            <span>微信账号：</span>
          </div>
        </template>
        <div class="item-content">
          <el-input :model-value="wechatNickname" readonly placeholder="未选择微信账号" />
        </div>
      </el-form-item>
      <!-- 自动分组 -->
      <el-form-item class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><Files /></el-icon>
            <span>自动分组：</span>
          </div>
        </template>
        <div class="item-content">
          <div class="grouping-control">
            <el-switch
              v-model="taskForm.autoGrouping"
              active-text="开启"
              inactive-text="关闭"
            />
            <div v-if="taskForm.autoGrouping" class="grouping-input">
              <span class="grouping-label">每组人数：</span>
              <el-input-number
                v-model="taskForm.batchSize"
                :min="2"
                :max="500"
                :step="1"
                size="small"
                controls-position="right"
              />
            </div>
          </div>
          <div class="form-tip" v-if="taskForm.autoGrouping">
            将大任务拆分为多个小任务执行，避免长时间占用资源，支持任务插队。
          </div>
        </div>
      </el-form-item>

      <el-form-item class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><Clock /></el-icon>
            <span>发送时间：</span>
          </div>
        </template>
        <div class="item-content">
          <el-radio-group v-model="taskForm.timeType">
            <el-radio value="now">立即发送</el-radio>
            <el-radio value="schedule">定时发送</el-radio>
          </el-radio-group>
        </div>
      </el-form-item>

      <template v-if="taskForm.timeType === 'schedule'">
        <!-- 同样修改这里 -->
        <el-form-item class="custom-label-form-item">
          <template #label>
            <div class="label-with-icon">
              <el-icon class="label-icon"><Calendar /></el-icon>
              <span>选择日期：</span>
            </div>
          </template>
          <div class="item-content date-picker-container">
            <el-date-picker
              v-model="taskForm.scheduleDate"
              type="date"
              placeholder="选择日期"
              format="YYYY/MM/DD"
              :disabled-date="disabledDate"
              class="date-picker"
              :locale="zhCn"
            />
            <el-time-picker
              v-model="taskForm.time"
              format="HH:mm"
              placeholder="选择时间"
              class="time-picker"
              :default-time="new Date(2000, 1, 1, new Date().getHours(), new Date().getMinutes())"
              @change="handleTimeChange"
              :locale="zhCn"
            />
          </div>
        </el-form-item>
      </template>

      <!-- 推送对象 -->
      <el-form-item v-if="selectedFriends.length > 0 || selectedGroups.length > 0" class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><User /></el-icon>
            <span>推送对象：</span>
          </div>
        </template>
        <div class="item-content">
          <div class="selected-targets">
            {{ formatSelectedTargets }}
          </div>
        </div>
      </el-form-item>

      <!-- 标签选择器(仅在没有选择好友时显示) -->
      <el-form-item v-else class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><PriceTag /></el-icon>
            <span>好友标签：</span>
          </div>
        </template>
        <div class="item-content">
          <el-checkbox-group v-model="taskForm.tagIds">
            <el-checkbox 
              v-for="tag in userTags" 
              :key="tag.id" 
              :label="tag.id"
            >
              {{ tag.name }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </el-form-item>

       <!-- 激活话术 -->
       <el-form-item class="custom-label-form-item last-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><ChatLineRound /></el-icon>
            <span>激活话术：</span>
          </div>
        </template>
        <div class="item-content">
          <el-radio-group v-model="taskForm.contentType" class="content-type-radio">
            <el-radio value="greeting">话术组</el-radio>
            <!-- <el-radio label="agent">智能体</el-radio> -->
          </el-radio-group>
          
          <template v-if="taskForm.contentType === 'greeting'">
            <el-select v-model="taskForm.greetingGroupId" placeholder="选择话术组" class="select-full-width">
              <el-option
                v-for="group in greetingGroups"
                :key="group.id"
                :label="group.name"
                :value="group.id"
              />
            </el-select>
          </template>
          
          <template v-else>
            <el-select v-model="taskForm.agentId" placeholder="选择智能体" class="select-full-width">
              <el-option
                v-for="agent in cozeAgents"
                :key="agent.botId"
                :label="agent.name"
                :value="agent.botId"
              />
            </el-select>
          </template>
        </div>
      </el-form-item>
      <el-form-item class="custom-label-form-item">
        <template #label>
          <div class="label-with-icon">
            <el-icon class="label-icon"><Clock /></el-icon>
            <span>发送间隔：</span>
          </div>
        </template>
        <div class="item-content">
          <el-radio-group v-model="taskForm.sendInterval">
            <el-radio value="3-8">3-8秒</el-radio>
            <el-radio value="10-30">10-30秒</el-radio>
            <el-radio value="30-60">30-60秒</el-radio>
          </el-radio-group>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">创建任务</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, PropType, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getContactTags } from '@/api/contact'
import { getConfig } from '@/api/config'
import { Clock, Calendar, User,Avatar, PriceTag, ChatLineRound, Files } from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 添加标签接口定义
interface UserTag {
  id: string
  name: string
}

interface GreetingGroup {
  id: string  // 改为必需属性
  name: string
  greetings: Array<{
    type: 'text' | 'file'
    content: string
    filePath?: string
  }>
}

interface CozeAgent {
  botId: string
  name: string
}

// 修改 props 定义
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  modelValue: {  // 添加这个以支持 v-model
    type: Boolean,
    default: false
  },
  greetingGroups: {
    type: Array as PropType<GreetingGroup[]>,
    default: () => []
  },
  selectedFriends: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  selectedGroups: {  // 新增群聊列表属性
    type: Array as PropType<string[]>,
    default: () => []
  },
  wechatNickname: {
    type: String,
    default: ''
  },
  isFromSOP: {
    type: Boolean,
    default: false
  }
})

const dialogWidth = computed(() => {
  // 获取视窗宽度
  const windowWidth = window.innerWidth
  // 在小屏幕上使用百分比宽度
  if (windowWidth < 768) {
    return '95%'
  }
  // 在中等屏幕上使用较大百分比
  if (windowWidth < 1200) {
    return '80%'
  }
  // 在大屏幕上使用固定最大宽度
  return '500px'
})

const formatSelectedTargets = computed(() => {
  const parts = []
  if (props.selectedFriends.length > 0) {
    const friendText = props.selectedFriends.length <= 3
      ? props.selectedFriends.join('、')
      : `${props.selectedFriends.slice(0, 3).join('、')}等${props.selectedFriends.length}个好友`
    parts.push(friendText)
  }
  if (props.selectedGroups.length > 0) {
    const groupText = props.selectedGroups.length <= 3
      ? props.selectedGroups.join('、')
      : `${props.selectedGroups.slice(0, 3).join('、')}等${props.selectedGroups.length}个群聊`
    parts.push(groupText)
  }
  return parts.join('；')
})

const greetingGroups = ref<GreetingGroup[]>([])
const cozeAgents = ref<CozeAgent[]>([])

// 添加加载话术组方法
const loadGreetingGroups = async () => {
  try {
    const result = await getConfig('greeting_config')
    // console.debug("加载话术组",result)
    // 正确解析多层嵌套的数据
    const config = result?.data?.greeting_config?.greeting_config
    if (Array.isArray(config)) {
      greetingGroups.value = config.map((group) => ({
        id: group.name, // 使用 name 作为唯一标识
        name: group.name,
        greetings: Array.isArray(group.greetings) ? group.greetings : []
      }))
      // console.debug('加载的话术组:', greetingGroups.value)
    } else {
      console.warn('话术组数据格式不正确:', config)
      greetingGroups.value = []
    }
  } catch (error) {
    console.error('加载话术组失败:', error)
    ElMessage.error('加载话术组失败')
  }
}

// 加载智能体列表
const loadCozeAgents = async () => {
  try {
    const result = await getConfig('agents')
    if (result.success && result.data) {
      const agents = Array.isArray(result.data) ? result.data : 
                    Array.isArray(result.data.agents) ? result.data.agents : []
      
      cozeAgents.value = agents.filter((agent: CozeAgent) => agent.name && agent.botId)
    }
  } catch (error) {
    console.error('加载智能体配置失败:', error)
  }
}

// 修改 emit 定义以支持两种方式
const emit = defineEmits(['update:visible', 'update:modelValue', 'create'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible || props.modelValue,
  set: (val) => {
    emit('update:visible', val)
    emit('update:modelValue', val)
  }
})

// 用户标签数据
const userTags = ref<UserTag[]>([])

const handleTimeChange = (time: Date) => {
  if (time) {
    // 保存用户选择的小时和分钟
    const hours = time.getHours()
    const minutes = time.getMinutes()
    
    // 创建一个新的日期对象，使用当前日期
    const now = new Date()
    taskForm.value.time = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0
    )
  }
}

// 添加时区处理函数
const getLocalISOString = (date: Date) => {
  // 创建一个带有本地时区信息的日期
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, '0');
  const hours = pad(tzOffset / 60);
  const minutes = pad(tzOffset % 60);
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    diff + hours + ':' + minutes;
}

// 禁用日期选择器中的日期
const disabledDate = (time: Date) => {
  // 禁用今天之前的日期和60天后的日期
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  
  return time.getTime() < today.getTime() || time.getTime() > maxDate.getTime();
};

// 表单数据
interface TaskFormData {
  timeType: 'now' | 'schedule'
  scheduleDate: Date | undefined 
  dayOffset: number
  time: Date
  tagIds: string[]
  contentType: 'greeting' | 'agent'
  greetingGroupId: string
  agentId: string
  sendInterval: string
  autoGrouping: boolean
  batchSize: number
}

const taskForm = ref<TaskFormData>({
  timeType: 'now',
  scheduleDate: undefined,
  dayOffset: 0,
  time: new Date(),
  tagIds: [],
  contentType: 'greeting',
  greetingGroupId: '',
  agentId: '',
  sendInterval: '3-8',
  autoGrouping: false,
  batchSize: 10
})

// 加载用户标签
const loadUserTags = async () => {
  try {
    // 使用 getContactTags 替换 getConfig
    userTags.value = await getContactTags()
  } catch (error) {
    console.error('加载用户标签失败:', error)
    ElMessage.error('加载用户标签失败')
  }
}

interface TaskSubmitData {
  timeType: 'now' | 'schedule'
  scheduleDate?: Date | null
  time: Date | string | null
  tagIds: string[]
  selectedFriends: string[]
  selectedGroups: string[]
  contentType: 'greeting' | 'agent'
  greetingGroupId: string
  agentId: string
  autoGrouping: boolean
  batchSize: number
}

// 创建任务
const handleCreate = async () => {
  try {
    if (taskForm.value.timeType === 'schedule') {
      if (!taskForm.value.scheduleDate) {
        ElMessage.warning('请选择发送日期')
        return
      }
      if (!taskForm.value.time) {
        ElMessage.warning('请选择发送时间')
        return
      }
    }

    // 目标校验：必须有标签或好友列表其中之一
    if (!taskForm.value.tagIds.length && 
        !props.selectedFriends.length && 
        !props.selectedGroups.length) {
      ElMessage.warning('请选择本次推送的目标')
      return
    }

    // 内容校验：根据选择的内容类型验证
    if (taskForm.value.contentType === 'greeting' && !taskForm.value.greetingGroupId) {
      ElMessage.warning('请选择话术组')
      return
    }
    
    if (taskForm.value.contentType === 'agent' && !taskForm.value.agentId) {
      ElMessage.warning('请选择智能体')
      return
    }

    // 显式声明 submitData 的类型
    let submitData: TaskSubmitData = {
      ...taskForm.value,
      time: taskForm.value.time,
      selectedFriends: props.selectedFriends,
      selectedGroups: props.selectedGroups
    }
    
    if (taskForm.value.timeType === 'schedule' && taskForm.value.scheduleDate && taskForm.value.time) {
      // 创建包含选择日期和时间的完整日期时间
      const scheduleDate = new Date(taskForm.value.scheduleDate)
      const selectedTime = taskForm.value.time
      
      const scheduleDateTime = new Date(
        scheduleDate.getFullYear(),
        scheduleDate.getMonth(),
        scheduleDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0
      )
      
      // 使用新的格式化函数生成带时区的 ISO 字符串
      submitData.time = getLocalISOString(scheduleDateTime)
    }
    
    emit('create', submitData)
    dialogVisible.value = false
  } catch (error) {
    console.error('创建任务失败:', error)
    ElMessage.error('创建任务失败')
  }
}

const handleResize = () => nextTick()

// 组件挂载时加载数据
onMounted(() => {
  loadUserTags()
  loadGreetingGroups()
  loadCozeAgents()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.form-item-with-icon {
  display: flex;
  align-items: flex-start;
}

.item-icon {
  margin-right: 8px;
  font-size: 18px;
  color: #409EFF;
  width: 24px;
  display: flex;
  justify-content: center;
  margin-top: 6px
}

.item-content {
  flex: 1;
}

:deep(.el-form-item__label) {
  font-weight: bold;
}
.el-form-item__content {
  margin: 0;
}

.date-picker-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.date-picker {
  width: 160px;
}
.label-icon {
  margin-right: 8px; /* 增加图标与文字的间距 */
  font-size: 16px;
  color: #409EFF;
  align-items: center; 
  padding-top: 2px;
  justify-content: center;
}
.time-picker {
  width: 120px;
}

.content-type-radio {
  margin-bottom: 12px;
  width: 100%;
}
/* 警告横幅样式 */
.push-warning-banner {
  margin-bottom: 16px;
  border-radius: 4px;
  font-size: 13px;
}

.warning-text {
  line-height: 1.5;
  color: #8c6231;
}

:deep(.el-alert__icon) {
  font-size: 16px;
  color: #e6a23c;
}

:deep(.el-alert__content) {
  padding: 0 8px;
  display: flex;
  align-items: center;
}
.select-full-width {
  width: 100%;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: flex-start;
}

.selected-targets {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  padding: 5px 0;
  text-align: left;
}

:deep(.el-dialog) {
  margin: 0 auto;
  max-width: 500px;
  min-width: 280px;
}
.label-with-icon {
  display: flex;
  align-items: center;
  white-space: nowrap;
  min-width: 90px;
}
:deep(.last-form-item .el-form-item__content) {
  margin: 0 !important;
  padding-right: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
/* 在小屏幕上调整表单布局 */
@media screen and (max-width: 768px) {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
  
  .date-picker,
  .time-picker {
    width: 100%;
  }
}

.grouping-control {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.grouping-input {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.grouping-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
  flex-shrink: 0;
}

.form-tip {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}
</style>
