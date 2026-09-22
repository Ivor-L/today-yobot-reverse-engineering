<template>
  <div class="auto-follow-task-list">
    <div class="section-title">
      <span>自动跟进</span>
      <span class="task-count">{{ tasks.length }}个</span>
      <div class="title-buttons sop-header-actions">
        <!-- <el-button type="text" class="settings-btn" @click="handleSettings">
          跟单设置
        </el-button> -->
        <el-button 
          :type="isEditMode ? 'primary' : 'primary'" 
          :plain="!isEditMode"
          size="small"
          class="sop-header-btn" 
          :disabled="!runtimeEnabled"
          :title="disabledReason"
          @click="toggleEditMode"
        >
          {{ isEditMode ? '完成' : '编辑' }}
        </el-button>
      </div>
    </div>
    
    <!-- 筛选面板 -->
    <transition name="slide-fade">
      <!-- 移除“更新筛选”按钮，日期选择即触发筛选 -->
      <div class="filter-panel" v-show="isEditMode" ref="filterPanel">
        <div class="filter-item">
          <span class="filter-label">智能体：</span>
          <el-select v-model="filterAgentId" placeholder="选择智能体" @change="handleFilterChange" clearable style="width: 160px">
            <el-option
              v-for="agent in cozeAgents"
              :key="agent.botId"
              :label="agent.name"
              :value="agent.botId"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">创建日期：</span>
          <el-date-picker
            v-model="filterDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleFilterChange"
            clearable
            style="width: 160px"
          />
        </div>
        <!-- 删除 filter-actions 按钮区域 -->
      </div>
    </transition>
    
    <el-scrollbar height="calc(100vh - 100px)">
      <div class="task-list">
        <el-empty
          v-if="tasks.length === 0"
          description="暂无跟进任务"
          :image-size="80"
        />
        <div v-else v-for="task in tasks" :key="task.task_info.task_id" class="task-item">
          <!-- 添加复选框 -->
          <div class="task-checkbox" v-if="isEditMode">
            <el-checkbox 
              v-model="task.selected" 
              @change="updateSelectedCount"
            />
          </div>
          <div class="task-info">
            <!-- 第一行：好友昵称 -->
            <div class="task-row task-header">
              <div class="friend-info">
                <span class="friend-name">{{ task.friend_info.name }}</span>
              </div>
              <el-button 
                type="danger" 
                size="small" 
                text 
                :disabled="!runtimeEnabled"
                :title="disabledReason"
                @click="handleCancelTask(task)"
                :loading="cancelingTasks.has(task.friend_info.wxid)"
                v-if="!isEditMode"
              >
                取消
              </el-button>
            </div>
            
            <!-- 第二行：创建时间 -->
            <div class="task-row task-time">
              <span class="label">创建时间：</span>
              <span class="time">{{ formatTime(task.task_info.created_at) }}</span>
            </div>
            
            <!-- 第三行：下次跟进时间 -->
            <div class="task-row task-next">
              <span class="label">下次跟进：</span>
              <span class="time">{{ formatNextTime(task.schedule_info?.next_fire_time) }}</span>
            </div>

            <!-- 新增：跟进智能体显示（在跟进统计上方） -->
            <div class="task-row task-agent">
              <span class="label">智能体：</span>
              <span class="agent-name">{{ getAgentName(task.task_config?.agent_id) }}</span>
            </div>
            
            <!-- 第四行：跟进统计 -->
            <div class="task-row task-stats">
              <span class="label stats-label">跟进统计：</span>
              <span class="stats-text">
                共{{ task.execution_stats?.execution_count || 0 }}次
                <span class="stats-detail">
                  （成功{{ task.execution_stats?.total_success || 0 }}次）
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 批量操作区 -->
      <transition name="slide-fade">
        <div class="batch-operations fixed" v-show="isEditMode">
          <div class="batch-left">
            <div class="select-all">
              <el-checkbox 
                v-model="isAllSelected" 
              >
                全选
              </el-checkbox>
            </div>
            <div class="selected-count">已选：{{ selectedCount }}个</div>
          </div>
          <div class="batch-right">
            <el-button 
              type="danger" 
              size="small" 
              @click="batchCancelTasks"
              :disabled="selectedCount === 0 || !runtimeEnabled"
              :loading="isBatchCanceling"
              :title="runtimeEnabled ? '' : disabledReason"
            >
              批量取消
            </el-button>
            <el-button 
              type="primary" 
              size="small" 
              @click="batchModifyTasks"
              :disabled="selectedCount === 0 || !runtimeEnabled"
              :title="runtimeEnabled ? '' : disabledReason"
            >
              批量修改
            </el-button>
          </div>
        </div>
      </transition>
    </el-scrollbar>

    <!-- 批量修改弹窗 -->
    <el-dialog v-model="isBatchModifyDialogVisible" title="修改跟单任务" width="480px">
      <div class="dialog-subtitle">可修改跟单任务的智能体</div>
      <div class="dialog-item">
        <span class="filter-label">选择智能体：</span>
        <el-select v-model="selectedAgentIdForModify" placeholder="请选择智能体" style="width: 240px">
          <el-option
            v-for="agent in cozeAgents"
            :key="agent.botId"
            :label="agent.name"
            :value="agent.botId"
          />
        </el-select>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeBatchModifyDialog">取消</el-button>
          <el-button
            type="primary"
            :disabled="!selectedAgentIdForModify || !runtimeEnabled"
            :title="runtimeEnabled ? '' : disabledReason"
            @click="confirmBatchModify"
          >确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAutoFollowTasks, cancelAutoFollowTask } from '../api/autosop'
import { getConfig } from '@/api/config'
import { getAutoFollowTasksByStartDate, batchCancelAutoFollowTasks, batchUpdateAutoFollowAgent } from '@/api/contact'

const props = withDefaults(defineProps<{
  runtimeEnabled?: boolean
  disabledReason?: string
}>(), {
  runtimeEnabled: true,
  disabledReason: ''
})

const requireRuntime = () => {
  if (props.runtimeEnabled) return true
  ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
  return false
}

interface AutoFollowTask {
  task_info: {
    task_id: string
    task_type: string
    created_at: string
    updated_at: string
  }
  friend_info: {
    wxid: string
    name: string
    account_id: string
  }
  execution_strategy: {
    follow_scenario: string
    follow_days: number
    follow_frequency: string
    time_range_start: string
    time_range_end: string
    start_date: string
    end_date: string
    max_executions: number
  }
  execution_stats: {
    execution_count: number
    last_execution_time: string
    next_execution_day: number
    total_success: number
    total_failed: number
  }
  task_config: {
    agent_id: string
    ai_service_type: string
  }
  task_status: string
  execution_history: any[]
  schedule_info?: {
    schedule_id: string
    next_fire_time: string | null
    is_paused: boolean
  }
  selected?: boolean // 新增选中状态
}

const tasks = ref<AutoFollowTask[]>([])
const cancelingTasks = ref(new Set<string>())
const loading = ref(false)
// 智能体列表
interface CozeAgent { name: string; botId: string }
const cozeAgents = ref<CozeAgent[]>([])

// 新增状态变量
const isEditMode = ref(false)
const filterAgentId = ref<string>('')
const filterDate = ref('')
const filterPanel = ref<HTMLElement | null>(null)
const selectedCount = ref(0)
const isBatchCanceling = ref(false)
const isBatchModifyDialogVisible = ref(false)
const selectedAgentIdForModify = ref<string>('')

// 计算属性：是否全选
const isAllSelected = computed({
  get: () => {
    return tasks.value.length > 0 && tasks.value.every(task => task.selected)
  },
  set: (value) => {
    tasks.value.forEach(task => task.selected = value)
    updateSelectedCount()
  }
})

// 切换编辑模式
const toggleEditMode = () => {
  if (!requireRuntime()) return
  isEditMode.value = !isEditMode.value
  
  // 退出编辑模式时重置状态
  if (!isEditMode.value) {
    resetFilters()
    resetSelection()
  }
}

// 重置筛选条件
const resetFilters = () => {
  filterAgentId.value = ''
  filterDate.value = ''
  loadTasks() // 重新加载所有任务
}

// 重置选择状态
const resetSelection = () => {
  tasks.value.forEach(task => task.selected = false)
  updateSelectedCount()
}

// 更新选中数量
const updateSelectedCount = () => {
  selectedCount.value = tasks.value.filter(task => task.selected).length
}

// 应用筛选
const applyFilter = async () => {
  try {
    loading.value = true
    // 若任一筛选条件存在，则调用组合筛选接口
    if (filterDate.value || filterAgentId.value) {
      const result = await getAutoFollowTasksByStartDate(
        filterDate.value || undefined,
        filterAgentId.value || undefined
      )
      if (result && Array.isArray(result)) {
        tasks.value = result.map((task: AutoFollowTask) => ({ ...task, selected: false }))
      } else {
        tasks.value = []
      }
    } else {
      await loadTasks()
    }
  } catch (error) {
    console.error('筛选任务失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '筛选任务失败')
  } finally {
    loading.value = false
  }
}

// 处理筛选条件变化 -> 直接调用接口筛选
const handleFilterChange = async () => {
  await applyFilter()
}

// 批量取消任务
const batchCancelTasks = async () => {
  if (!requireRuntime()) return
  const selectedTasks = tasks.value.filter(task => task.selected)
  if (selectedTasks.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要批量取消选中的 ${selectedTasks.length} 个自动跟单任务吗？`,
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    isBatchCanceling.value = true
    const taskIds = selectedTasks.map(task => task.task_info.task_id)
    await batchCancelAutoFollowTasks(taskIds)
    ElMessage.success('批量取消成功')
    
    // 重新加载任务列表
    await applyFilter()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量取消任务失败:', error)
      ElMessage.error(error instanceof Error ? error.message : '批量取消任务失败')
    }
  } finally {
    isBatchCanceling.value = false
  }
}

// 批量修改任务
const batchModifyTasks = () => {
  if (!requireRuntime()) return
  const selectedTasks = tasks.value.filter(task => task.selected)
  if (selectedTasks.length === 0) {
    ElMessage.warning('请先选择需要修改的任务')
    return
  }
  selectedAgentIdForModify.value = ''
  isBatchModifyDialogVisible.value = true
}

// 加载智能体列表
const loadAgents = async () => {
  try {
    const result = await getConfig('agents')
    if ((result as any).success && (result as any).data) {
      const agents = Array.isArray((result as any).data) ? (result as any).data :
                    Array.isArray((result as any).data.agents) ? (result as any).data.agents : []
      cozeAgents.value = agents.filter((agent: CozeAgent) => agent.name && agent.botId)
    }
  } catch (error) {
    console.error('获取智能体配置失败:', error)
  }
}

// 根据 agent_id 获取智能体名称
const getAgentName = (agentId?: string) => {
  if (!agentId) return '—'
  const agent = cozeAgents.value.find(a => a.botId === agentId)
  return agent?.name || '未知智能体'
}

// 加载任务列表
const loadTasks = async () => {
  try {
    loading.value = true
    const result = await getAutoFollowTasks()
    tasks.value = (result || []).map((task: AutoFollowTask) => ({ ...task, selected: false }))
  } catch (error) {
    console.error('获取自动跟单任务列表失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '获取任务列表失败')
  } finally {
    loading.value = false
  }
}

// 取消任务
const handleCancelTask = async (task: AutoFollowTask) => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(
      `确定要取消对 ${task.friend_info.name} 的自动跟单吗？`,
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    cancelingTasks.value.add(task.friend_info.wxid)
    await cancelAutoFollowTask(task.task_info.task_id)
    ElMessage.success('取消成功')
    
    // 重新加载任务列表
    await loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消任务失败:', error)
      ElMessage.error(error instanceof Error ? error.message : '取消任务失败')
    }
  } finally {
    cancelingTasks.value.delete(task.friend_info.wxid)
  }
}

// 跟单设置
const handleSettings = () => {
  ElMessage.info('开发中，下个版本支持...如需创建任务，请前往客户管理创建')
}

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return '--'
  try {
    const date = new Date(timeStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}月${day}日 ${hours}:${minutes}`
  } catch {
    return '--'
  }
}

// 格式化下次执行时间
const formatNextTime = (timeStr?: string | null) => {
  if (!timeStr) return '计算中...'
  return formatTime(timeStr)
}

onMounted(() => {
  if (!props.runtimeEnabled) return
  loadAgents()
  loadTasks()
})

// 暴露刷新方法给父组件
defineExpose({
  refresh: loadTasks
})

const confirmBatchModify = async () => {
  if (!requireRuntime()) return
  if (!selectedAgentIdForModify.value) {
    ElMessage.warning('请选择智能体')
    return
  }
  const selectedTasks = tasks.value.filter(task => task.selected)
  if (selectedTasks.length === 0) {
    ElMessage.warning('请先选择需要修改的任务')
    return
  }
  try {
    loading.value = true
    const taskIds = selectedTasks.map(task => task.task_info.task_id)
    const result = await batchUpdateAutoFollowAgent(taskIds, selectedAgentIdForModify.value)
    if (result && result.success) {
      ElMessage.success('批量修改成功')
    } else {
      ElMessage.error(result?.error || '批量修改失败')
    }
    isBatchModifyDialogVisible.value = false
    await applyFilter()
  } catch (error) {
    console.error('批量修改任务失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '批量修改任务失败')
  } finally {
    loading.value = false
  }
}

const closeBatchModifyDialog = () => {
  isBatchModifyDialogVisible.value = false
}
</script>

<style scoped>
.auto-follow-task-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  /* 预留底部固定操作区的空间，避免列表被遮挡 */
  padding-bottom: 80px;
}

.section-title {
  height: 48px;
  line-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #ebeef5;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.title-buttons {
  display: flex;
  align-items: center;
}

.task-count {
  color: #909399;
  font-size: 14px;
  font-weight: normal;
  margin-left: 8px;
}

.settings-btn {
  color: #409eff;
  font-size: 14px;
  padding: 0;
  margin-right: 12px;
}

.edit-btn {
  color: #67c23a;
  font-size: 14px;
  padding: 0;
}

.edit-btn.active {
  color: #f56c6c;
}

/* 筛选面板样式 */
.filter-panel {
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  overflow: hidden;
  transition: all 0.3s ease-in-out;
}

/* 动画效果 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
  margin-bottom: 0;
}
.slide-fade-enter-to,
.slide-fade-leave-from {
  transform: translateY(0);
  opacity: 1;
  max-height: 100px;
}

.filter-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  margin-right: 8px;
  width: 80px;
  white-space: nowrap; /* 防止标题换行 */
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
}

.task-list {
  flex: 1;
  padding: 0 15px;
  margin-top: 8px;
}

.task-item {
  display: flex;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 12px;
  background: #fff;
  transition: all 0.3s ease;
}

.task-item:hover {
  border-color: #c6e2ff;
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
}

.task-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border-right: 1px solid #ebeef5;
}

.task-info {
  padding: 10px 12px;
  flex: 1;
}

.task-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.task-row:last-child {
  margin-bottom: 0;
}

.task-header {
  justify-content: space-between;
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
}

.label {
  font-size: 14px;
  color: #606266;
  margin-right: 8px;
}

.time {
  font-size: 14px;
  color: #303133;
}

.task-time .time {
  color: #909399;
}

.task-next .time {
  color: #409eff;
  font-weight: 500;
}

.stats-text {
  font-size: 14px;
  color: #303133;
}
.agent-name{
  font-size: 14px;
  color: #303133;
}

.stats-detail {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

/* 跟进统计样式优化 */
.task-stats {
  align-items: flex-start;
}

.stats-label {
  white-space: nowrap;
  flex-shrink: 0;
}

.stats-text {
  flex: 1;
  word-wrap: break-word;
  word-break: break-all;
  line-height: 1.4;
}

/* 批量操作区样式：固定底部，两列两行 */
.batch-operations.fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 20px;
  background-color: #f5f7fa;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center; /* 单行居中对齐 */
  z-index: 1000;
}

.batch-left {
  display: flex;
  flex-direction: row; /* 改为水平排列 */
  align-items: center;
  gap: 12px; /* 全选和计数间距 */
}

.batch-right {
  display: flex;
  flex-direction: row; /* 改为水平排列 */
  align-items: center;
  gap: 8px;
  margin-left: auto; /* 靠右侧对齐 */
}

.select-all {
  display: flex;
  align-items: center;
}

.selected-count {
  font-size: 14px;
  color: #606266;
}

.operation-buttons {
  display: flex;
  gap: 12px;
}
.dialog-subtitle {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}
.dialog-item {
  display: flex;
  align-items: center;
}
.dialog-footer {
  display: inline-flex;
  gap: 8px;
}
</style>
