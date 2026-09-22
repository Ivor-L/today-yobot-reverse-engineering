<template>
  <div class="moments-container">
    <div class="page-header">
      <div class="title-wrap">
        <div class="title-line">
          <div class="page-title">朋友圈任务</div>
          <div class="inline-stat">今日自动发圈：{{ todayCount }} 条</div>
        </div>
        <div class="page-subtitle">发朋友圈仅支持 4.0 以上微信</div>
      </div>
      <div class="actions">
        <el-button
          type="primary"
          plain
          :disabled="!isActionEnabled('moments.log.read')"
          :title="actionReason('moments.log.read')"
          @click="openLogs"
        >发圈日志</el-button>
      </div>
    </div>

    <div class="content-grid">
      <aside class="mini-sidebar">
        <div
          class="icon-btn"
          :class="{ active: activeView === 'list', disabled: !isActionEnabled('moments.task.list') }"
          :title="actionReason('moments.task.list')"
          @click="switchView('list')"
          data-title="任务列表"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </div>
        <div
          class="icon-btn"
          :class="{ active: activeView === 'create', disabled: !isActionEnabled('moments.task.create') }"
          :title="actionReason('moments.task.create')"
          @click="switchView('create')"
          data-title="新建任务"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
        </div>
      </aside>

      <section class="main-section">
        <TaskList
          v-show="activeView === 'list'"
          :tasks="tasks"
          :runtime-enabled="isActionEnabled('moments.task.cancel')"
          :disabled-reason="actionReason('moments.task.cancel')"
          @cancel="handleCancelTask"
        />
        <CreateTaskWizard
          :key="wizardKey"
          v-show="activeView === 'create'"
          :runtime-enabled="isActionEnabled('moments.task.create')"
          :disabled-reason="actionReason('moments.task.create')"
          @created="handleTaskCreated"
        />
        <MomentLogsDialog v-model:visible="logsVisible" :logs="logs" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import TaskList from '@/components/moments/TaskList.vue'
import CreateTaskWizard from '@/components/moments/CreateTaskWizard.vue'
import { getMomentPostTasks, cancelMomentPostTask, getMomentPostLogs, type MomentPostLog } from '@/api/moments'
import MomentLogsDialog from '@/components/moments/MomentLogsDialog.vue'
import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'

defineOptions({ name: 'MomentsView' })

const {
  isActionEnabled,
  actionReason,
  requireAction
} = useRuntimeCapabilityPresentation()

interface TaskItem {
  id: string
  name: string
  createdAt: string
  account: string
  sentCount: number
  nextRunAt: string
  ruleDesc: string
}

const activeView = ref<'list' | 'create'>('list')

const tasks = ref<TaskItem[]>([])
const logsVisible = ref(false)
const logs = ref<MomentPostLog[]>([])
const wizardKey = ref(0)

const todayCount = computed(() => {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
  return logs.value.filter(l => {
    if (l.status !== 'success') return false
    const t = new Date(l.timestamp)
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d
  }).length
})

const switchView = (view: 'list' | 'create') => {
  const actionKey = view === 'list' ? 'moments.task.list' : 'moments.task.create'
  if (!requireAction(actionKey)) return
  activeView.value = view
  if (view === 'list') {
    loadTasks()
  }
}

const handleCancelTask = async (taskId: string) => {
  if (!requireAction('moments.task.cancel')) return
  try {
    await ElMessageBox.confirm('确认取消该任务？', '提示', { type: 'warning' })
    const res = await cancelMomentPostTask(taskId)
    if (res.success) {
      tasks.value = tasks.value.filter(t => t.id !== taskId)
      ElMessage.success('已取消任务')
    } else {
      ElMessage.error('取消任务失败')
    }
  } catch {}
}

const handleTaskCreated = () => {
  ElMessage.success('任务创建成功')
  activeView.value = 'list'
  loadTasks()
  wizardKey.value++
}

const loadTasks = async () => {
  try {
    const res = await getMomentPostTasks()
    if (res.success) {
      tasks.value = res.tasks
    }
  } catch {}
}

onMounted(() => {
  if (isActionEnabled('moments.task.list')) loadTasks()
  if (isActionEnabled('moments.log.read')) loadLogs()
})

const loadLogs = async () => {
  try {
    const res = await getMomentPostLogs()
    if (res.success) {
      logs.value = res.logs
    }
  } catch {}
}

const openLogs = async () => {
  if (!requireAction('moments.log.read')) return
  await loadLogs()
  logsVisible.value = true
}
</script>

<style scoped>
.moments-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.title-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.title-line { display: flex; align-items: center; gap: 12px; }
.inline-stat { background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 14px; font-size: 13px; font-weight: 500; }
.actions { display: flex; align-items: center; }

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
}

.page-subtitle {
  font-size: 13px;
  color: #f59e0b;
  margin-top: 4px;
  display: block;
}

.stat-badge {
  background: #dbeafe;
  color: #1e40af;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.content-grid {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

.mini-sidebar {
  width: 64px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  padding: 20px 12px 0;
  box-shadow: 1px 0 6px rgba(0,0,0,0.02);
}
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 20px;
  cursor: pointer;
  color: #6b7280;
  font-size: 20px;
  transition: all 0.2s;
  position: relative;
}
.icon-btn:hover {
  background-color: #f3f4f6;
  color: #3b82f6;
}
.icon-btn.active {
  background-color: #eff6ff;
  color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}
.icon-btn.disabled,
.icon-btn.disabled:hover {
  cursor: not-allowed;
  opacity: 0.45;
  color: #6b7280;
  background-color: transparent;
}
.icon-btn::after {
  content: attr(data-title);
  position: absolute;
  left: 50px;
  background: rgba(0,0,0,0.8);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s;
  pointer-events: none;
}
.icon-btn:hover::after { opacity: 1; visibility: visible; }

.main-section {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: transparent;
}
</style>
