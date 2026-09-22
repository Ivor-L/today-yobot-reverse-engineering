<template>
  <div class="task-list">
    <el-empty v-if="tasks.length === 0" description="暂无发朋友圈计划，请先创建" />
    <div v-else v-for="task in tasks" :key="task.id" class="task-item">
      <div class="task-main-info">
        <div class="task-header">
          <div class="task-title">
            <span class="status-dot"></span>
            {{ task.name }}
          </div>
          <el-button
            class="cancel-btn"
            type="danger"
            plain
            :disabled="!runtimeEnabled"
            :title="disabledReason"
            @click="$emit('cancel', task.id)"
          >取消任务</el-button>
        </div>
        <div class="task-grid">
          <div>
            <span class="info-label">创建日期</span>
            <span class="info-value">{{ task.createdAt }}</span>
          </div>
          <div>
            <span class="info-label">微信账号</span>
            <span class="info-value">{{ task.account }}</span>
          </div>
          <div>
            <span class="info-label">任务进度</span>
            <span class="info-value sent">已发 {{ task.sentCount }} 次</span>
          </div>
          <div>
            <span class="info-label">下次执行</span>
            <span class="info-value">{{ task.nextRunAt }}</span>
          </div>
        </div>
        <div class="task-rule">执行规则：{{ task.ruleDesc }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TaskItem {
  id: string
  name: string
  createdAt: string
  account: string
  sentCount: number
  nextRunAt: string
  ruleDesc: string
}

withDefaults(defineProps<{
  tasks: TaskItem[]
  runtimeEnabled?: boolean
  disabledReason?: string
}>(), {
  runtimeEnabled: true,
  disabledReason: ''
})
defineEmits<{ (e: 'cancel', id: string): void }>()
</script>

<style scoped>
.task-list {
  height: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-right: 4px;
  padding-bottom: 4px;
}

.task-list::-webkit-scrollbar {
  width: 7px;
}

.task-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.task-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.task-list::-webkit-scrollbar-track {
  background: transparent;
}

.task-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 15px;
  margin-bottom: 16px;
  background: #fff;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.cancel-btn {
  min-width: 92px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  font-size: 13px;
  color: #6b7280;
  margin-top: 12px;
}

.info-label {
  display: block;
  font-size: 12px;
  margin-bottom: 2px;
  color: #9ca3af;
}

.info-value {
  color: #1f2937;
  font-weight: 500;
}

.sent {
  color: #059669;
}

.task-rule {
  margin-top: 8px;
  background: #f9fafb;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: #4b5563;
  border-left: 3px solid #3b82f6;
}
</style>
