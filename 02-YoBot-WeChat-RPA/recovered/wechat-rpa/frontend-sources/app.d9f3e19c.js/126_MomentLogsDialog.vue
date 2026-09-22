<template>
  <el-dialog v-model="visible" title="发圈日志" width="620px">
    <div class="subtitle">最近48小时，发朋友圈任务记录</div>
    <div v-if="logs.length === 0" class="empty">暂无日志记录</div>
    <div v-else class="log-list">
      <div v-for="item in formattedLogs" :key="item.id" class="log-item">
        <div class="log-header">
          <div class="plan">{{ item.planName }}</div>
          <div class="time">{{ item.time }}</div>
          <div class="status" :class="item.status === 'success' ? 'ok' : 'fail'">{{ item.status === 'success' ? '发表成功' : '发表失败' }}</div>
        </div>
        <div class="text" :title="item.text">{{ item.text }}</div>
        <div class="footer">
          <span>账号：{{ item.account }}</span>
          <el-button link type="primary" @click="openMaterial(item.folder_path)">查看素材</el-button>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="close">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { openFolder, type MomentPostLog } from '@/api/moments'

const props = defineProps<{ visible: boolean; logs: MomentPostLog[] }>()
const emit = defineEmits<{ (e: 'update:visible', val: boolean): void }>()

const visible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v)
})

const formattedLogs = computed(() => props.logs.map(l => {
  const d = new Date(l.timestamp)
  const time = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const parts = l.folder_path.split(/\\|\//)
  const planName = parts.length >= 2 ? parts[parts.length - 2] : l.folder_path
  return { ...l, time, planName }
}))

const close = () => emit('update:visible', false)
const openMaterial = async (path: string) => { await openFolder(path) }
</script>

<style scoped>
.subtitle { color: #6b7280; font-size: 13px; margin-bottom: 10px; }
.empty { color: #9ca3af; font-size: 13px; padding: 16px; text-align: center; }
.log-list { display: flex; flex-direction: column; gap: 12px; }
.log-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff; }
.log-header { display: grid; grid-template-columns: 1fr 120px 90px; align-items: center; gap: 8px; margin-bottom: 8px; }
.plan { font-weight: 600; color: #111827; }
.time { color: #6b7280; font-size: 13px; }
.status { justify-self: end; font-size: 12px; border-radius: 12px; padding: 2px 8px; }
.status.ok { color: #10b981; background: rgba(16,185,129,0.12); }
.status.fail { color: #ef4444; background: rgba(239,68,68,0.12); }
.text { background: #f3f4f6; border-radius: 6px; padding: 8px; color: #374151; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; color: #6b7280; font-size: 13px; }
</style>