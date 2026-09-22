<template>
    <el-dialog
      v-model="visible"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      width="400px"
      class="countdown-dialog"
    >
      <div class="countdown-content">
        <div class="countdown-message">{{ message }}</div>
        <div class="countdown-number">{{ currentCount }}</div>
        <div class="countdown-tip">秒后开始执行，请确保微信窗口打开</div>
      </div>
    </el-dialog>
  </template>
  
  <script setup lang="ts">
  import { ref, watch } from 'vue'
  
  interface Props {
    modelValue: boolean
    countdown?: number
    message?: string
  }
  
  const props = defineProps<Props>()
  const emit = defineEmits(['update:modelValue', 'finish'])
  
  const visible = ref(false)
  const currentCount = ref(props.countdown || 5)
  
  watch(() => props.modelValue, (newVal) => {
    visible.value = newVal
    if (newVal) {
      startCountdown()
    }
  })
  
  const startCountdown = () => {
    currentCount.value = props.countdown || 5
    const timer = setInterval(() => {
      currentCount.value--
      if (currentCount.value <= 0) {
        clearInterval(timer)
        visible.value = false
        emit('update:modelValue', false)
        emit('finish')
      }
    }, 1000)
  }
  </script>
  
  <style scoped>
  .countdown-dialog :deep(.el-dialog__header) {
    display: none;
  }
  
  .countdown-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }
  
  .countdown-message {
    font-size: 18px;
    margin-bottom: 20px;
    color: #409EFF;
  }
  
  .countdown-number {
    font-size: 60px;
    font-weight: bold;
    color: #409EFF;
    margin: 20px 0;
  }
  
  .countdown-tip {
    font-size: 14px;
    color: #666;
  }
  </style>