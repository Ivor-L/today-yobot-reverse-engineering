<template>
    <el-dialog
      v-model="dialogVisible"
      title="自动回复记录"
      :width="windowWidth <= 700 ? '95%' : '95%'"
      @open="handleDialogOpen"
    >
      <el-table :data="filteredLogs" style="width: 100%" max-height="500px">
        <el-table-column prop="timestamp" label="时间" width="120">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="targetName" label="用户" width="80" />
         <!-- 添加类型列 -->
        <el-table-column prop="chatType" label="类型" width="70">
          <template #default="{ row }">
            <el-tag size="small" :type="row.chatType === 'group' ? 'warning' : 'info'">
              {{ row.chatType === 'group' ? '群聊' : '私聊' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="AI回复" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="70">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : 'danger'" size="small">
              {{ row.status === 'completed' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </template>
  
  <script setup lang="ts">
  import { computed, onMounted,onUnmounted,ref  } from 'vue'
  import dayjs from 'dayjs'
  import { taskQueue } from '@/utils/TaskQueue'
  const windowWidth = ref(window.innerWidth)
  const props = defineProps<{
    visible: boolean
  }>()
  const handleResize = () => {
  windowWidth.value = window.innerWidth
}
  // 加载日志数据
const loadLogs = async () => {
  await taskQueue.loadTaskLogs()
}
  const emit = defineEmits(['update:visible'])
  
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })
  const handleDialogOpen = () => {
  loadLogs()
  console.log('对话框打开后的日志数据:', filteredLogs.value)
}
  // 过滤最近24小时的日志
  const filteredLogs = computed(() => {
    return taskQueue.getTaskLogs()
  })
  // 组件挂载时加载一次数据
onMounted(() => {
  loadLogs()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
})
  const formatTime = (timestamp: Date) => {
    return dayjs(timestamp).format('MM-DD HH:mm:ss')
  }
  </script>
  
  <style scoped>
  .el-dialog :deep(.el-dialog__body) {
    padding: 10px 20px;
  }
  </style>