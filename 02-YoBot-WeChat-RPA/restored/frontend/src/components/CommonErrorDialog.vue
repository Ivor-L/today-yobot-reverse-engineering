<template>
  <el-dialog
    v-model="dialogVisible"
    :show-close="false"
    width="420px"
    class="common-error-dialog"
    center
    align-center
    destroy-on-close
  >
    <template #header>
      <div class="my-header"></div>
    </template>
    <div class="error-dialog-content">
      <div class="error-header">
        <el-icon class="error-icon" :size="48" color="#F56C6C"><WarningFilled /></el-icon>
        <h3 class="error-title">{{ title }}</h3>
      </div>
      
      <div class="error-body">
        <div class="error-message-box">
            <p
              class="main-content"
              :class="{ 'is-clamped': isContentClamped }"
              :style="contentClampStyle"
            >{{ content }}</p>
            <el-button
              v-if="shouldShowContentToggle"
              link
              type="primary"
              class="toggle-btn"
              @click="contentExpanded = !contentExpanded"
            >
              {{ contentExpanded ? '收起' : '展开全部' }}
            </el-button>
            <div v-if="errorDetail" class="error-detail-wrapper">
              <p class="error-detail-title">报错详情：</p>
              <p
                class="error-detail-text"
                :class="{ 'is-clamped': isDetailClamped }"
                :style="detailClampStyle"
              >{{ errorDetail }}</p>
              <el-button
                v-if="shouldShowDetailToggle"
                link
                type="primary"
                class="toggle-btn"
                @click="detailExpanded = !detailExpanded"
              >
                {{ detailExpanded ? '收起' : '展开全部' }}
              </el-button>
            </div>
        </div>
      </div>
      
      <div class="error-footer">
        <el-button v-if="errorDetail" @click="handleCopyError" class="copy-btn" size="large">复制错误</el-button>
        <el-button type="primary" @click="handleClose" class="close-btn" size="large">关闭</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = withDefaults(defineProps<{
  visible: boolean
  title: string
  content: string
  errorDetail?: string
  maxContentLines?: number
  maxDetailLines?: number
}>(), {
  maxContentLines: 4,
  maxDetailLines: 8
})

const emit = defineEmits(['update:visible', 'close'])
const contentExpanded = ref(false)
const detailExpanded = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const countLines = (text?: string) => (text || '').split(/\r?\n/).length
const shouldShowContentToggle = computed(() => {
  const text = props.content || ''
  return countLines(text) > props.maxContentLines || text.length > 220
})
const shouldShowDetailToggle = computed(() => {
  const text = props.errorDetail || ''
  return countLines(text) > props.maxDetailLines || text.length > 520
})
const isContentClamped = computed(() => shouldShowContentToggle.value && !contentExpanded.value)
const isDetailClamped = computed(() => shouldShowDetailToggle.value && !detailExpanded.value)
const contentClampStyle = computed(() => ({ '--line-clamp': String(props.maxContentLines) }))
const detailClampStyle = computed(() => ({ '--line-clamp': String(props.maxDetailLines) }))

watch(() => props.visible, (visible) => {
  if (visible) {
    contentExpanded.value = false
    detailExpanded.value = false
  }
})

const handleClose = () => {
  dialogVisible.value = false
  emit('close')
}

const handleCopyError = async () => {
  if (props.errorDetail) {
    try {
      await navigator.clipboard.writeText(props.errorDetail)
      ElMessage.success('错误信息已复制')
    } catch (err) {
      console.error('复制失败:', err)
      ElMessage.error('复制失败')
    }
  }
}
</script>

<style scoped>
.error-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 10px 10px;
}

.error-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.error-icon {
  margin-bottom: 16px;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  line-height: 1.4;
}

.error-body {
  width: 100%;
  margin-bottom: 30px;
}

.error-message-box {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
}

.main-content {
  white-space: pre-wrap; 
  word-break: break-all;
  margin: 0;
}

.is-clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--line-clamp);
  overflow: hidden;
}

.error-detail-wrapper {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.error-detail-title {
  font-weight: bold;
  color: #303133;
  margin: 0 0 8px 0;
}

.error-detail-text {
  color: #F56C6C;
  white-space: pre-wrap; 
  word-break: break-all;
  margin: 0;
  max-height: 240px;
  overflow: auto;
}

.error-detail-text.is-clamped {
  max-height: none;
  overflow: hidden;
}

.toggle-btn {
  padding: 6px 0 0;
  height: auto;
  font-size: 13px;
}

.error-footer {
  display: flex;
  justify-content: center;
  width: 100%;
  gap: 12px;
}

.close-btn, .copy-btn {
  width: 140px;
  border-radius: 8px;
}
</style>
