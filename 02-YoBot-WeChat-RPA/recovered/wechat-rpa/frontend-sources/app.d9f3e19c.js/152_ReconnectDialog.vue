<template>
    <el-dialog
      v-model="visible"
      title="连接已断开"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      width="30%"
    >
      <div class="reconnect-content">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
        >
          您已掉线，请重新连接
        </el-alert>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button 
            type="primary" 
            @click="handleReconnect"
            :loading="reconnecting"
          >
            {{ reconnecting ? '重新连接中...' : '重新连接' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { reconnectWeChat } from '@/api/init'
  
  const visible = ref(false)
  const reconnecting = ref(false)
  
  const handleReconnect = async () => {
    reconnecting.value = true
    try {
      const result = await reconnectWeChat()
      if (result.success) {
        ElMessage.success('已重新连接')
        visible.value = false
      } else {
        ElMessage.error(result.message || '重新连接失败')
      }
    } catch (error) {
      ElMessage.error('重新连接失败')
    } finally {
      reconnecting.value = false
    }
  }
  
  // 导出方法供父组件调用
  defineExpose({
    show: () => visible.value = true
  })
  </script>
  
  <style scoped>
  .reconnect-content {
    padding: 20px 0;
  }
  </style>