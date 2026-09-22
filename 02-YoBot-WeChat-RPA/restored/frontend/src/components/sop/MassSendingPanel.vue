<template>
  <div class="mass-sending-panel">
    <div class="section-title">
      <span>群发</span>
      <div class="header-actions sop-header-actions">
        <el-button 
          v-if="pendingTaskCount > 3"
          type="danger" 
          plain
          size="small"
          class="sop-header-btn"
          :disabled="!runtimeEnabled"
          :title="disabledReason"
          @click="handleCancelAllTasks"
        >
          全部取消
        </el-button>
        <el-button 
          v-if="runningTaskCount > 0"
          type="warning" 
          plain
          size="small"
          class="sop-header-btn"
          :disabled="!runtimeEnabled"
          :title="disabledReason"
          @click="handlePauseAllTasks"
        >
          全部暂停
        </el-button>
        <el-button 
          type="primary" 
          size="small"
          class="sop-header-btn" 
          :disabled="!runtimeEnabled"
          :title="disabledReason"
          @click="showCreateTaskDialog"
        >
          创建
        </el-button>
      </div>
    </div>
    <el-scrollbar height="calc(100vh - 100px)">
      <!-- 任务列表 -->
      <div class="task-list">
        <el-empty
          v-if="displayCampaigns.length === 0 && standaloneTasks.length === 0"
          description="暂无进行中任务"
        />

        <!-- 群发活动（campaign）：一次群发的多个批次串成整体 -->
        <div
          v-for="c in displayCampaigns"
          :key="c.campaign_id"
          class="campaign-item"
          :class="{ 'is-interrupted': c.status === 'interrupted' }"
        >
          <!-- 活动头：状态 + 展开/收起 -->
          <div class="campaign-header" @click="toggleExpand(c.campaign_id)">
            <span class="campaign-title">
              <el-icon class="expand-icon" :class="{ expanded: expandedSet.has(c.campaign_id) }">
                <ArrowRight />
              </el-icon>
              <el-icon><Promotion /></el-icon>
              <span class="campaign-name">群发活动</span>
              <el-tag :type="getCampaignTagType(campaignDisplayStatus(c))" size="small" effect="light">
                {{ getCampaignStatusText(campaignDisplayStatus(c)) }}
              </el-tag>
            </span>
            <span class="campaign-count">{{ campaignFinishedBatches(c) }}/{{ c.batch_count || 0 }} 批</span>
          </div>

          <!-- 整体进度条 -->
          <div class="campaign-progress">
            <el-progress
              :percentage="campaignPct(c)"
              :status="c.status === 'interrupted' ? 'warning' : (campaignPct(c) === 100 ? 'success' : undefined)"
              :stroke-width="10"
            />
            <span class="campaign-progress-text">
              {{ campaignDisplayProgress(c) }}/{{ c.total || 0 }} 人
              <template v-if="(c.failed_count || 0) > 0">
                · 成功 {{ campaignDisplaySuccess(c) }} / 失败 {{ c.failed_count }}
              </template>
            </span>
          </div>

          <!-- 中断提示 -->
          <div v-if="c.status === 'interrupted'" class="campaign-hint">
            ⚠ 已中断，断点已保存，点「继续」续发
          </div>

          <!-- 活动级操作 -->
          <div class="campaign-actions">
            <el-button
              v-if="c.status === 'interrupted'"
              type="success"
              size="small"
              :disabled="!runtimeEnabled"
              :title="disabledReason"
              @click.stop="handleResumeCampaign(c)"
            >
              继续
            </el-button>
            <el-button
              v-if="['interrupted', 'running'].includes(c.status) && !campaignIsDisplayComplete(c)"
              type="danger"
              plain
              size="small"
              :disabled="!runtimeEnabled"
              :title="disabledReason"
              @click.stop="handleCancelCampaign(c)"
            >
              取消
            </el-button>
          </div>

          <!-- 批次明细（折叠） -->
          <div v-if="expandedSet.has(c.campaign_id)" class="campaign-batches">
            <div v-if="c.batches.length === 0" class="batch-empty">暂无进行中的批次明细</div>
            <div v-for="b in c.batches" :key="b.id" class="batch-row">
              <span class="batch-name">批次 {{ b.batchIndex || '-' }}/{{ b.totalBatches || c.batch_count }}</span>
              <el-tag size="small" :type="getBatchTagType(b)" effect="plain">{{ getBatchStatusText(b) }}</el-tag>
              <span class="batch-prog">{{ b.progress || 0 }}/{{ b.total || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 独立任务（无 campaign，向后兼容旧任务与未分组单任务） -->
        <div v-for="task in standaloneTasks" :key="task.id" class="task-item">
          <div class="task-info">
            <!-- 第一行：日期和状态 -->
            <div class="task-row task-header">
              <span class="task-time">
                <el-icon><Clock /></el-icon>
                {{ formatTaskTime(task.sendTime) }}
              </span>
              <el-tag :type="taskStatusTagType(task)" size="small">
                {{ taskStatusLabel(task) }}
              </el-tag>
            </div>

            <!-- 第二行：群发标签 -->
            <div class="task-row task-tags">
              <span class="label">群发人群：</span>
              <div class="tag-list">
                <template v-if="task.selectedFriends && task.selectedFriends.length">
                  {{ formatSelectedFriends(task.selectedFriends) }}
                </template>
                <template v-else>
                  <el-tag size="small" v-for="tagName in task.tagName" :key="tagName">
                    {{ tagName }}
                  </el-tag>
                </template>
              </div>
            </div>

            <!-- 第三行：话术组 -->
            <div class="task-row task-group">
              <span class="label">话术方式：</span>
              <span class="group-name">{{ task.contentType === 'agent' ? '智能体生成' : '固定话术组' }}</span>
            </div>

            <!-- 第四行：进度信息 -->
            <div class="task-row task-progress" v-if="task.status === 'running' || (task.progress && task.total)">
              进度: {{ task.progress || 0 }}/{{ task.total || 0 }}
            </div>

            <!-- 中断提示（单任务掉线中断） -->
            <div class="task-row task-interrupt-hint" v-if="task.interrupted">
              ⚠ 已中断，断点已保存，点「继续」续发
            </div>

            <!-- 第五行：操作按钮 -->
            <div class="task-row task-actions">
              <!-- 暂停按钮: 仅运行中或排队中(非定时等待)的任务可暂停 -->
              <el-button
                v-if="['running', 'pending'].includes(task.status)"
                type="warning"
                size="small"
                plain
                :disabled="!runtimeEnabled"
                :title="disabledReason"
                @click.stop="handlePauseTask(task.id)"
              >
                暂停
              </el-button>

              <!-- 恢复按钮: 已暂停 / 已中断 -->
              <el-button
                v-if="task.status === 'paused'"
                type="success"
                size="small"
                plain
                :disabled="!runtimeEnabled"
                :title="disabledReason"
                @click.stop="handleResumeTask(task.id)"
              >
                {{ task.interrupted ? '继续' : '恢复' }}
              </el-button>

              <!-- 取消按钮 -->
              <el-button
                v-if="['pending', 'scheduled', 'running', 'paused'].includes(task.status)"
                type="danger"
                size="small"
                plain
                :disabled="!runtimeEnabled"
                :title="disabledReason"
                @click.stop="cancelTask(task.id)"
              >
                取消
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>

    <CreateTaskDialog
      v-model:visible="createTaskVisible"
      :greeting-groups="greetingGroups"
      :wechat-nickname="currentInstanceNickname"
      :is-from-sop="true"
      @create="handleCreateTask"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Clock, ArrowRight, Promotion } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createMassSendingTask, cancelMassSendingTask, getMassSendingTasks, cancelAllMassSendingTasks, pauseMassSendingTask, resumeMassSendingTask, pauseAllMassSendingTasks, getMassSendingCampaigns, resumeMassSendingCampaign, cancelMassSendingCampaign } from '@/api/autosop'
import CreateTaskDialog from '@/components/sop/CreateTaskDialog.vue'

// Props
const props = withDefaults(defineProps<{
  greetingGroups: any[]
  currentInstanceNickname: string
  currentInstanceAccountId?: string
  runtimeEnabled?: boolean
  disabledReason?: string
}>(), {
  currentInstanceAccountId: '',
  runtimeEnabled: true,
  disabledReason: ''
})

const requireRuntime = () => {
  if (props.runtimeEnabled) return true
  ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
  return false
}

// Types
interface ActivateTask {
  id: string
  sendTime: string
  tagId: string
  selectedFriends?: string[]
  tagName: string[]
  greetingGroupId: string
  greetingGroupName: string
  contentType: string
  agentId?: string
  status: 'pending' | 'running' | 'scheduled' | 'paused' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  total?: number
  error?: string
  // campaign 相关
  campaignId?: string
  batchIndex?: number
  totalBatches?: number
  interrupted?: boolean
  interruptReason?: string
}

interface Campaign {
  campaign_id: string
  status: 'running' | 'interrupted' | 'completed' | 'cancelled'
  account_id?: string
  created_at?: string
  progress: number
  total: number
  batch_count: number
  completed_batches: number
  // 只读展示字段：区分“已处理”与“发送成功”，不参与任务执行或断点恢复
  display_progress?: number
  display_success?: number
  finished_batches?: number
  display_complete?: boolean
  failed_count?: number
}

// State
const activateTasks = ref<ActivateTask[]>([])
const campaigns = ref<Campaign[]>([])
const expandedSet = ref<Set<string>>(new Set())
const createTaskVisible = ref(false)

const pendingTaskCount = computed(() => {
  return activateTasks.value.filter(task => task.status === 'pending' || task.status === 'scheduled').length
})

const runningTaskCount = computed(() => {
  return activateTasks.value.filter(task => task.status === 'running').length
})

// 按 campaignId 把批次任务归组
const campaignGroups = computed(() => {
  const map = new Map<string, ActivateTask[]>()
  for (const t of activateTasks.value) {
    if (t.campaignId) {
      if (!map.has(t.campaignId)) map.set(t.campaignId, [])
      map.get(t.campaignId)!.push(t)
    }
  }
  // 批次内按 batchIndex 升序
  for (const list of map.values()) {
    list.sort((a, b) => (a.batchIndex || 0) - (b.batchIndex || 0))
  }
  return map
})

// 展示用的活动列表：附带各自的实时批次明细
const displayCampaigns = computed(() => {
  return campaigns.value.map(c => ({
    ...c,
    batches: campaignGroups.value.get(c.campaign_id) || []
  }))
})

// 无 campaign 的独立任务（向后兼容）
const standaloneTasks = computed(() => activateTasks.value.filter(t => !t.campaignId))

const campaignPct = (c: Campaign) => {
  if (!c.total) return 0
  return Math.min(100, Math.round((campaignDisplayProgress(c) / c.total) * 100))
}

const campaignIsDisplayComplete = (c: Campaign) =>
  c.status === 'running' && c.display_complete === true

const campaignDisplayStatus = (c: Campaign) =>
  campaignIsDisplayComplete(c) ? 'completed' : c.status

const campaignDisplayProgress = (c: Campaign) =>
  c.display_progress ?? c.progress ?? 0

const campaignDisplaySuccess = (c: Campaign) =>
  c.display_success ?? c.progress ?? 0

const campaignFinishedBatches = (c: Campaign) =>
  c.finished_batches ?? c.completed_batches ?? 0

const toggleExpand = (campaignId: string) => {
  const next = new Set(expandedSet.value)
  if (next.has(campaignId)) next.delete(campaignId)
  else next.add(campaignId)
  expandedSet.value = next
}

const getCampaignStatusText = (s: string) => {
  const map: Record<string, string> = {
    running: '发送中', interrupted: '已中断', completed: '已完成', cancelled: '已取消'
  }
  return map[s] || s
}

const getCampaignTagType = (s: string): 'success' | 'warning' | 'info' | 'danger' => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    running: 'warning', interrupted: 'danger', completed: 'success', cancelled: 'info'
  }
  return map[s] || 'info'
}

// 批次状态展示：区分"已中断"与活动中断下的"已挂起"
const getBatchStatusText = (b: ActivateTask) => {
  if (b.interrupted) return '已中断'
  if (b.status === 'paused') return '已挂起'
  return getTaskStatusText(b.status)
}
const getBatchTagType = (b: ActivateTask): 'success' | 'warning' | 'info' | 'danger' => {
  if (b.interrupted) return 'danger'
  return getTaskStatusType(b.status) as any
}

// 独立任务状态：掉线中断时显示"已中断"
const taskStatusLabel = (t: ActivateTask) => {
  if (t.interrupted) return '已中断'
  return getTaskStatusText(t.status)
}
const taskStatusTagType = (t: ActivateTask): 'success' | 'warning' | 'info' | 'primary' | 'danger' => {
  if (t.interrupted) return 'danger'
  return getTaskStatusType(t.status)
}

// Methods
const showCreateTaskDialog = () => {
  if (!requireRuntime()) return
  createTaskVisible.value = true
}

const formatTaskTime = (time: string) => {
  try {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return '无效时间'
  }
}

const getTaskStatusType = (status: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' => {
  const statusMap: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
    pending: 'info',
    running: 'warning',
    scheduled: 'info',
    paused: 'info',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return statusMap[status] || 'info'
}

const getTaskStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '等待执行',
    running: '执行中',
    scheduled: '等待执行',
    paused: '已暂停',
    completed: '已完成',
    failed: '执行失败',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const formatSelectedFriends = (friends: string[]) => {
  if (!friends || friends.length === 0) return '';
  
  if (friends.length <= 2) {
    return friends.join('、');
  }
  
  return `${friends[0]}、${friends[1]}..等${friends.length}人`;
}

const formatTasks = (tasks: any[]): ActivateTask[] => {
  return tasks.map(task => {
    const p = task?.params?.task_params || task?.params || {}
    return {
      id: task.task_id || task.id,
      sendTime: task.next_run_time || task.schedule_time || task.sendTime || new Date().toISOString(),
      tagId: p.tagIds || task.tagId || [],
      tagName: p.tagIds || task.tagName || [],
      selectedFriends: p.selectedFriends || task.selectedFriends || [],
      greetingGroupId: p.greetingGroupId || task.greetingGroupId || '',
      greetingGroupName: p.greetingGroupId || task.greetingGroupName || '',
      contentType: p.contentType || task.contentType || 'greeting',
      agentId: p.agentId || task.agentId || '',
      status: task.status || 'pending',
      progress: task.progress || 0,
      total: task.total || 0,
      error: task.error,
      // campaign 相关字段
      campaignId: p.campaignId || task.campaignId || '',
      batchIndex: p.batchIndex,
      totalBatches: p.totalBatches,
      interrupted: task.interrupted || false,
      interruptReason: task.interrupt_reason || ''
    }
  });
}

// 加载群发活动列表（含整体聚合进度）
const loadCampaigns = async () => {
  try {
    campaigns.value = await getMassSendingCampaigns(false)
  } catch (error) {
    console.error('加载群发活动列表失败:', error)
  }
}

// 同时刷新批次任务与活动
const reloadAll = async () => {
  await Promise.all([loadMassSendingTasks(), loadCampaigns()])
}

const loadMassSendingTasks = async () => {
  try {
    const result = await getMassSendingTasks()
    if (result.success) {
      console.debug('加载群发任务列表成功:', result?.data)
      const { pending, running } = result.data || {}
      // 合并 pending 和 running 列表，优先显示 running
      const runningTasks = formatTasks(running || [])
      const pendingTasks = formatTasks(pending || [])
      
      // 合并列表，running 在前
      activateTasks.value = [...runningTasks, ...pendingTasks]
    } else {
      console.error('加载群发任务列表失败:', result.error)
    }
  } catch (error) {
    console.error('加载群发任务列表失败:', error)
  }
}

const handleCreateTask = async (taskData: any) => {
  if (!requireRuntime()) return
  if (!props.currentInstanceAccountId) {
    ElMessage.warning('请先登录并选择微信账号')
    return
  }
  try {
    // 根据contentType决定使用哪个字段
    const payload = {
      ...taskData,
      account_id: props.currentInstanceAccountId,
      // 如果是智能体类型，将agentId添加到payload中
      ...(taskData.contentType === 'agent' ? { agentId: taskData.agentId } : {})
    }
    
    const result = await createMassSendingTask(payload)
    console.debug("创建任务。。。", result);
    await reloadAll();
    ElMessage.success('任务创建成功')
  } catch (error) {
    console.error('创建任务失败:', error)
    ElMessage.error('创建任务失败')
  }
}

const handlePauseTask = async (taskId: string) => {
  if (!requireRuntime()) return
  try {
    await pauseMassSendingTask(taskId)
    await reloadAll()
    ElMessage.success('任务已暂停')
  } catch (error) {
    ElMessage.error('暂停任务失败')
  }
}

const handleResumeTask = async (taskId: string) => {
  if (!requireRuntime()) return
  try {
    await resumeMassSendingTask(taskId)
    await reloadAll()
    ElMessage.success('任务已恢复')
  } catch (error) {
    ElMessage.error('恢复任务失败')
  }
}

const cancelTask = async (taskId: string) => {
  if (!requireRuntime()) return
  try {
    await cancelMassSendingTask(taskId)
    // 重新加载任务列表，而不是直接在前端过滤，以确保状态一致性
    await reloadAll()
    ElMessage.success('任务已取消')
  } catch (error) {
    ElMessage.error('取消任务失败')
  }
}

// 整体恢复一个被中断的群发活动（从断点续发）
const handleResumeCampaign = async (c: Campaign) => {
  if (!requireRuntime()) return
  const remaining = Math.max(0, (c.total || 0) - (c.progress || 0))
  try {
    await ElMessageBox.confirm(
      `已发送 ${c.progress || 0} 人，将从断点继续向剩余 ${remaining} 人发送。已发送的联系人不会重复收到。`,
      '继续群发活动',
      { confirmButtonText: '确认继续', cancelButtonText: '取消', type: 'warning' }
    )
    await resumeMassSendingCampaign(c.campaign_id)
    ElMessage.success('活动已恢复，正在从断点依次续发剩余批次')
    await reloadAll()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复群发活动失败:', error)
      ElMessage.error('恢复群发活动失败')
    }
  }
}

// 整体取消一个群发活动
const handleCancelCampaign = async (c: Campaign) => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(
      '确定取消整个群发活动？未发送的剩余联系人将不再发送。',
      '确认取消',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await cancelMassSendingCampaign(c.campaign_id)
    ElMessage.success('活动已取消')
    await reloadAll()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消群发活动失败:', error)
      // 展示后端的具体原因（如"活动已完成，无法取消"）
      ElMessage.error(error instanceof Error ? error.message : '取消群发活动失败')
      // 状态可能已变化（如刚好完成），刷新一次保证一致
      await reloadAll()
    }
  }
}

const handlePauseAllTasks = async () => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(
      '是否暂停所有正在执行或排队中的任务？\n(未到时间的定时任务不会被暂停)',
      '确认暂停',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const result = await pauseAllMassSendingTasks()
    if (result.success) {
      ElMessage.success(result.message || '批量暂停成功')
      await loadMassSendingTasks()
    } else {
      ElMessage.error(result.error || '批量暂停失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量暂停任务失败:', error)
      ElMessage.error('批量暂停任务失败')
    }
  }
}

const handleCancelAllTasks = async () => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(
      '是否取消全部任务？',
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const result = await cancelAllMassSendingTasks()
    if (result.success) {
      ElMessage.success(result.message || '批量取消成功')
      await loadMassSendingTasks()
    } else {
      ElMessage.error(result.error || '批量取消失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量取消任务失败:', error)
      ElMessage.error('批量取消任务失败')
    }
  }
}

// WebSocket Listeners
const handleTaskStatusUpdate = (event: CustomEvent) => {
  const taskUpdate = event.detail;
  
  // 处理列表更新通知
  if (taskUpdate.type === 'mass_sending_list_update') {
    console.debug('收到群发任务列表更新通知，重新加载任务列表...');
    reloadAll();
    return;
  }

  // 处理群发任务状态更新
  if (taskUpdate.type === 'mass_sending') {
     if (taskUpdate.status === 'running' && taskUpdate.task_id) {
       // 优化：仅更新本地状态，不重新加载列表，防止阻塞
       const task = activateTasks.value.find(t => t.id === taskUpdate.task_id);
       if (task) {
         task.progress = taskUpdate.progress;
         task.total = taskUpdate.total;
         // 如果状态发生变化，才更新状态
         if (task.status !== 'running') {
            task.status = 'running';
         }
       }
     } else {
       // 对于非运行中状态（完成、失败、取消、中断），重新加载列表与活动以获取最新状态
       console.debug(`收到群发任务状态变更(${taskUpdate.status})，重新加载任务列表...`);
       reloadAll();
     }
  }
}

onMounted(() => {
  if (!props.runtimeEnabled) return
  reloadAll();
  // 移除旧的监听器（如果有）
  // window.addEventListener('massSendingTasks', handleMassSendingTasksUpdate as EventListener);
  window.addEventListener('taskStatus', handleTaskStatusUpdate as EventListener);
})

onUnmounted(() => {
  // window.removeEventListener('massSendingTasks', handleMassSendingTasksUpdate as EventListener);
  window.removeEventListener('taskStatus', handleTaskStatusUpdate as EventListener);
})
</script>

<style scoped>
.mass-sending-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-title {
  height: 48px;
  line-height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-list {
  padding: 10px;
}

.task-item {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  transition: all 0.3s ease;
}

.task-item:hover {
  border-color: #c6e2ff;
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-row {
  display: flex;
  align-items: center;
}

.task-header {
  justify-content: space-between;
}

.task-time {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 14px;
}

.task-tags, .task-group {
  font-size: 14px;
}

.tag-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.label {
  color: #909399;
  min-width: 70px;
  font-size: 14px;
}

.group-name {
  color: #606266;
}

.task-progress {
  color: #409EFF;
  font-size: 14px;
  margin-top: 4px;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
}

.el-button {
  margin-left: 0;
}

/* ===== 群发活动（campaign）卡片 ===== */
.campaign-item {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  transition: all 0.3s ease;
}
.campaign-item.is-interrupted {
  border-color: #f5c6c6;
  background: #fff8f8;
}
.campaign-item:hover {
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
}

.campaign-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}
.campaign-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #303133;
}
.campaign-name {
  font-size: 15px;
}
.expand-icon {
  transition: transform 0.2s ease;
  color: #909399;
}
.expand-icon.expanded {
  transform: rotate(90deg);
}
.campaign-count {
  font-size: 13px;
  color: #909399;
}

.campaign-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.campaign-progress :deep(.el-progress) {
  flex: 1;
}
.campaign-progress-text {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.campaign-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #e6a23c;
  line-height: 1.5;
}

.campaign-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.campaign-batches {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #ebeef5;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.batch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #606266;
}
.batch-name {
  min-width: 110px;
}
.batch-prog {
  color: #909399;
}
.batch-empty {
  font-size: 13px;
  color: #c0c4cc;
}

.task-interrupt-hint {
  font-size: 13px;
  color: #e6a23c;
  line-height: 1.5;
}
</style>
