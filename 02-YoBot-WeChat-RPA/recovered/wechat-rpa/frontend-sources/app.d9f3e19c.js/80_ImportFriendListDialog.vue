<template>
  <el-dialog
    title="导入微信号/手机号名单"
    v-model="dialogVisible"
    width="500px"
  >
    <!-- 导入方式选择 -->
    <el-tabs v-model="importType">
      <el-tab-pane v-if="allows('excel')" label="Excel导入" name="excel">
        <div class="import-tip">
          <div class="tip-content">
            <el-icon class="info-icon"><InfoFilled /></el-icon>
            <p>将名单录入到表格中，然后导入即可</p>
            <el-button 
              type="primary" 
              link 
              @click="downloadTemplate"
              class="template-btn"
            >
              下载模板
            </el-button>
          </div>
        </div>
      
        <el-upload
          class="upload-demo"
          :action="''"
          :auto-upload="false"
          :on-change="handleFileChange"
          :before-upload="beforeUpload"
          accept=".xlsx,.xls,.csv"
        >
          <template #trigger>
            <el-button plain>选择文件</el-button>
          </template>
          <template #tip>
            <div class="el-upload__tip">
              仅支持 xlsx、xls、csv 格式文件
            </div>
          </template>
        </el-upload>
      </el-tab-pane>
      
      <el-tab-pane v-if="allows('agent')" label="智能体导入" name="agent">
        <div class="agent-import-tip">
          <div class="tip-content">
            <el-icon class="info-icon"><InfoFilled /></el-icon>
            <p>通过智能体连接飞书获取名单数据</p>
          </div>
        </div>
        
        <div class="agent-select-container">
          <el-form label-width="0px">
            <el-form-item class="agent-select-form-item">
              <span class="form-item-label">选择智能体</span>
              <el-select 
                v-model="selectedAgentId" 
                placeholder="请选择智能体"
                class="agent-select"
              >
                <el-option
                  v-for="agent in cozeAgents"
                  :key="agent.botId"
                  :label="agent.name"
                  :value="agent.botId"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
      
      <el-tab-pane v-if="allows('api')" label="API导入" name="api">
        <div class="api-import-tip">
          <div class="tip-content">
            <el-icon class="info-icon"><InfoFilled /></el-icon>
            <p>每次执行任务自动同步数据，也可手动点击同步</p>
          </div>
        </div>
        
        <div class="api-status-container">
          <div class="api-status-item">
            <span class="status-label">API接口标识：</span>
            <span v-if="apiIdentifier" class="status-value configured">
              {{ formatApiIdentifier(apiIdentifier) }}（已配置）
            </span>
            <span v-else class="status-value not-configured">
              尚未配置接口，请先完成配置
            </span>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleUpload" 
          :loading="uploading"
          :disabled="importType === 'api' && !apiIdentifier"
        >
          {{ getButtonText() }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import type { CozeAgent } from '@/types/coze'
import { getExternalApiSettings } from '@/api/external-api'
import { syncFriendListByApi } from '@/api/autosop'

const TEMPLATE_URL = 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/file/%E5%90%8D%E5%8D%95%E6%A8%A1%E6%9D%BF%20.xlsx'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  cozeAgents: {
    type: Array as () => CozeAgent[],
    default: () => []
  },
  allowedTypes: {
    type: Array as () => Array<'excel' | 'agent' | 'api'>,
    default: () => ['excel', 'agent', 'api']
  }
})

const emit = defineEmits(['update:visible', 'import', 'importByAgent', 'importByApi'])

const dialogVisible = ref(false)
const uploading = ref(false)
const fileList = ref<File[]>([])
const importType = ref('excel')
const selectedAgentId = ref('')
const apiIdentifier = ref('')
const allows = (type: 'excel' | 'agent' | 'api') => props.allowedTypes.includes(type)

const downloadTemplate = () => {
  window.open(TEMPLATE_URL, '_blank')
}

// 格式化API标识符显示
const formatApiIdentifier = (identifier: string) => {
  if (identifier.length <= 8) return identifier
  return identifier.substring(0, 4) + '****' + identifier.substring(identifier.length - 4)
}

// 获取按钮文案
const getButtonText = () => {
  switch (importType.value) {
    case 'api':
      return '立即同步'
    case 'agent':
      return '立即上传'
    default:
      return '立即上传'
  }
}

// 加载API配置
const loadApiSettings = async () => {
  try {
    const settings = await getExternalApiSettings()
    if (settings && settings.identifier) {
      apiIdentifier.value = settings.identifier
    } else {
      apiIdentifier.value = ''
    }
  } catch (error) {
    console.error('加载API配置失败:', error)
    apiIdentifier.value = ''
  }
}

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    if (!allows(importType.value as 'excel' | 'agent' | 'api')) {
      importType.value = props.allowedTypes[0] || 'excel'
    }
    // 未迁移外部 API 名单业务的运行时不得探测对应 Windows 路由。
    if (allows('api')) loadApiSettings()
  }
})

watch(() => dialogVisible.value, (val) => {
  if (!val) {
    emit('update:visible', false)
  }
})

// 当有智能体数据时，默认选择第一个智能体
watch(() => props.cozeAgents, (agents) => {
  if (agents && agents.length > 0 && !selectedAgentId.value) {
    selectedAgentId.value = agents[0].botId
  }
}, { immediate: true })

const beforeUpload = (file: File) => {
  const isExcel = file.type === 'application/vnd.ms-excel' || 
                  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  file.name.endsWith('.csv')
  if (!isExcel) {
    ElMessage.error('只能上传 Excel/CSV 文件!')
    return false
  }
  return true
}

const handleFileChange = (file: any) => {
  fileList.value = [file.raw]
}

const handleUpload = async () => {
  if (importType.value === 'excel') {
    if (fileList.value.length === 0) {
      ElMessage.warning('请先选择文件')
      return
    }
    
    uploading.value = true
    try {
      emit('import', fileList.value[0])
      dialogVisible.value = false
    } catch (error) {
      ElMessage.error('上传失败')
    } finally {
      uploading.value = false
    }
  } else if (importType.value === 'agent') {
    if (!selectedAgentId.value) {
      ElMessage.warning('请先选择智能体')
      return
    }
    
    uploading.value = true
    try {
      emit('importByAgent', selectedAgentId.value)
      dialogVisible.value = false
    } catch (error) {
      ElMessage.error('智能体导入失败')
    } finally {
      uploading.value = false
    }
  } else if (importType.value === 'api') {
    if (!apiIdentifier.value) {
      ElMessage.warning('未配置API接口，请先完成配置')
      return
    }
    
    uploading.value = true
    try {
      const result = await syncFriendListByApi()
      if (result.success) {
        ElMessage.success(`同步成功，共导入 ${result.count} 条数据`)
        emit('importByApi', result)
        dialogVisible.value = false
      } else {
        ElMessage.error('同步失败')
      }
    } catch (error) {
      console.error('API同步失败:', error)
      const errorMessage = error instanceof Error ? error.message : 'API同步失败'
      // if (errorMessage.includes('未配置') || errorMessage.includes('配置无效')) {
      //   ElMessage.warning('未配置API接口，请先完成配置')
      // } else {
      ElMessage.error(errorMessage)
      // }
    } finally {
      uploading.value = false
    }
  }
}
</script>

<style scoped>
.import-tip, .agent-import-tip, .api-import-tip {
  margin-bottom: 20px;
}

.import-tip a {
  color: var(--el-color-primary);
  margin-left: 10px;
}

.upload-demo {
  margin: 20px 0;
}

.tip-content {
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.info-icon {
  color: var(--el-color-primary);
  font-size: 16px;
  margin-top: 3px;
}

.tip-content p {
  margin: 0;
  flex: 1;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.5;
}

.template-btn {
  padding: 0;
  height: auto;
  margin-left: 16px;
  white-space: nowrap;
}

.agent-select-container {
  margin: 20px 0;
}

.api-status-container {
  margin: 20px 0;
  padding: 16px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.api-status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.status-value {
  font-size: 14px;
}

.status-value.configured {
  color: var(--el-color-success);
  font-weight: 500;
}

.status-value.not-configured {
  color: var(--el-color-danger);
  font-weight: 500;
}

:deep(.el-select) {
  width: 100%;
}
.agent-select-form-item {
  display: flex;
  align-items: center;
  width: 100%;
}
.agent-select-form-item .form-item-label {
  flex-shrink: 0;
  min-width: 70px;
  font-size: 14px;
  color: #606266;
  margin-right: 12px;
  text-align: left;
}
.agent-select {
  flex: 1;
  max-width: 300px;
}
:deep(.agent-select-form-item .el-form-item__content) {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 0 !important;
}
.upload-demo :deep(.el-upload-list) {
  margin-top: 10px;
}
</style>
