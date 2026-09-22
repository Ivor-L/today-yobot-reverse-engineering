<template>
  <div class="auto-follow-logs">
    <el-scrollbar height="calc(100vh - 100px)">
      <div class="logs-container">
        <el-empty
          v-if="logs.length === 0 && !loading"
          description="暂无执行日志"
          :image-size="80"
        />
        <div
          v-else
          v-for="log in logs"
          :key="log.id"
          class="log-item"
          :class="{ 'failed-item': log.status === 'failed' }"
        >
          <div class="log-header">
            <div class="friend-info">
              <div class="friend-details">
                <span class="friend-name" :title="log.friend_name">{{ log.friend_name }}</span>
                <span class="friend-wxid" :title="log.friend_wxid">{{ log.friend_wxid }}</span>
              </div>
              <div class="log-status" :class="getStatusClass(log.status)">
                <span class="status-text">{{ getStatusText(log.status) }}</span>
              </div>
            </div>
          </div>
          
          <div class="log-time">跟进日期:{{ formatLogTime(log.execution_time) }}</div>
          
          <div class="log-content" v-if="log.status !== 'failed'">
            <div class="content-text">
              <div class="content-main">
                {{ getDisplayContent(log.message_content, log.id) }}
              </div>
              <div class="content-actions" v-if="shouldShowToggle(log.message_content)">
                <el-button 
                  link
                  size="small" 
                  class="toggle-btn"
                  @click="toggleContent(log.id)"
                >
                  {{ isExpanded(log.id) ? '收起' : '展开' }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAutoFollowLogs } from '../api/autosop'

interface AutoFollowLog {
  id: string
  friend_name: string
  friend_wxid: string
  execution_time: string
  message_content: string
  generated_message?: string
  success?: boolean
  status?: 'success' | 'failed' | 'pending'
  error_message?: string
}

const logs = ref<AutoFollowLog[]>([])
const loading = ref(false)
const expandedItems = ref<Set<string>>(new Set())

// 加载执行日志
const loadLogs = async () => {
  try {
    loading.value = true
    const result = await getAutoFollowLogs()
    // 兼容 V2 和旧版数据格式
    logs.value = (result || []).map((log: any) => ({
      ...log,
      status: log.status || (log.success ? 'success' : 'failed'),
      message_content: log.message_content || log.generated_message || ''
    }))
  } catch (error) {
    console.error('获取自动跟单执行日志失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '获取执行日志失败')
  } finally {
    loading.value = false
  }
}

// 格式化日志时间
const formatLogTime = (timeStr: string) => {
  if (!timeStr) return '--'
  try {
    // 兼容 UTC 时间字符串，如果是以 Z 结尾，说明已经是 UTC，直接解析会根据本地时区转换
    // 如果是 +08:00 结尾的 ISO 字符串，直接解析会多加 8 小时
    let parsedTimeStr = timeStr;
    if (timeStr.includes('T') && timeStr.includes('+08:00')) {
      // 截取掉时区信息，直接按本地时间解析
      parsedTimeStr = timeStr.split('+')[0];
    } else if (timeStr.endsWith('Z')) {
      // 如果后端传的是 Z，我们假设它是北京时间的字面量（之前为了兼容前端去掉了+08:00），所以也截取掉
      parsedTimeStr = timeStr.replace('Z', '');
    }

    const date = new Date(parsedTimeStr)
    // 如果解析失败
    if (isNaN(date.getTime())) return timeStr

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return timeStr
  }
}

// 内容截断长度（约2行的字符数）
const CONTENT_LIMIT = 30

// 获取显示内容
const getDisplayContent = (content: string, itemId: string) => {
  if (!content) return '--'
  
  const cleanContent = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  
  if (isExpanded(itemId) || cleanContent.length <= CONTENT_LIMIT) {
    return cleanContent
  }
  
  return cleanContent.substring(0, CONTENT_LIMIT) + '...'
}

// 判断是否需要显示展开/收起按钮
const shouldShowToggle = (content: string) => {
  if (!content) return false
  const cleanContent = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  return cleanContent.length > CONTENT_LIMIT
}

// 判断是否已展开
const isExpanded = (itemId: string) => {
  return expandedItems.value.has(itemId)
}

// 切换展开/收起状态
const toggleContent = (itemId: string) => {
  if (expandedItems.value.has(itemId)) {
    expandedItems.value.delete(itemId)
  } else {
    expandedItems.value.add(itemId)
  }
}

// 获取状态样式类
const getStatusClass = (status?: string) => {
  switch (status) {
    case 'success':
      return 'status-success'
    case 'failed':
      return 'status-failed'
    case 'pending':
      return 'status-pending'
    default:
      return 'status-unknown'
  }
}

// 获取状态文本
const getStatusText = (status?: string) => {
  switch (status) {
    case 'success':
      return '发送成功'
    case 'failed':
      return '发送失败'
    case 'pending':
      return '发送中'
    default:
      return '未知状态'
  }
}

onMounted(() => {
  loadLogs()
})

// 暴露刷新方法给父组件
defineExpose({
  refresh: loadLogs
})
</script>

<style scoped>
.auto-follow-logs {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.logs-container {
  flex: 1;
  padding: 8px 10px;
}

.log-item {
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 8px;
  padding: 10px;
  transition: all 0.3s ease;
}

.log-item:hover {
  border-color: #c6e2ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.log-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.friend-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 4px;
}

.friend-details {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.friend-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.friend-wxid {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  /* 关键：超长会话名(如很长的群名)必须可收缩并省略，否则会把日志区整体撑宽、挤压左侧列表 */
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-status {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.log-time {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.log-content {
  margin-bottom: 12px;
}

.content-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 6px;
}

.content-text {
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.content-main {
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
  word-break: break-word;
  white-space: normal;
  margin-bottom: 4px;
}

.content-actions {
  display: flex;
  justify-content: flex-end;
}

.toggle-btn {
  font-size: 12px;
  color: #409eff;
  padding: 0;
  height: auto;
  line-height: 1;
}

.log-status {
  display: flex;
  align-items: center;
}

.status-text {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.status-success .status-text {
  background: #f0f9ff;
  color: #67c23a;
  border: 1px solid #b3e19d;
}

.status-failed .status-text {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.status-pending .status-text {
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #f5dab1;
}

.status-unknown .status-text {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #d3d4d6;
}

/* 失败日志的整体样式优化 */
.failed-item {
  background: #f5f5f5;
  border-color: #e0e0e0;
}

/* 失败项中的按钮（如存在）使用深灰色 */
.failed-item .toggle-btn {
  color: #606266;
}
.failed-item .toggle-btn:hover {
  color: #4c4c4c;
}
</style>
