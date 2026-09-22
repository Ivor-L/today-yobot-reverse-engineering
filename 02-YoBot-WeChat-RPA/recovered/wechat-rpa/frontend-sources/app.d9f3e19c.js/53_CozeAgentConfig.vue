<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEditing ? '修改智能体' : '添加智能体'"
    width="500px"
  >
    <el-form
      ref="agentFormRef"
      :model="agentForm"
      :rules="agentRules"
      label-width="100px"
      class="agent-form"
    >
      <el-form-item label="平台" prop="platform">
        <el-select v-model="agentForm.platform" :disabled="isEditing" placeholder="请选择平台">
          <el-option v-if="isPlatformAllowed('coze')" label="Coze" value="coze" />
          <!-- Coze 3.0 暂不开放绑定入口，保留相关逻辑以便后续恢复。 -->
          <!-- <el-option label="Coze 3.0" value="coze3" /> -->
          <el-option v-if="isPlatformAllowed('dify')" label="Dify" value="dify" />
          <el-option v-if="brandConfig.enableFireflow && isPlatformAllowed('fireflow')" label="Fireflow" value="fireflow" />
          <el-option v-if="isPlatformAllowed('agentic')" label="私域Agent" value="agentic" />
        </el-select>
      </el-form-item>

      <el-form-item label="智能体名称" prop="name">
        <el-input v-model="agentForm.name" @keydown.enter.prevent placeholder="请输入智能体名称" />
      </el-form-item>

      <el-form-item :label="getIdLabel()" prop="botId">
        <el-input
          v-model="agentForm.botId"
          :disabled="isEditing"
          :type="(agentForm.platform === 'dify' || agentForm.platform === 'fireflow') ? 'password' : 'text'"
          :show-password="!isEditing && (agentForm.platform === 'dify' || agentForm.platform === 'fireflow')"
          :placeholder="getIdPlaceholder()"
          @keydown.enter.prevent
        />
        <div v-if="isEditing" class="field-tip">平台和标识已被业务配置引用，修改时不可变更</div>
      </el-form-item>

      <el-collapse
        v-if="agentForm.platform === 'agentic'"
        v-model="agenticPanels"
        class="agentic-config-collapse"
      >
        <el-collapse-item name="interface">
          <template #title>
            <div class="agentic-collapse-title">
              <span>接口高级配置</span>
              <span class="field-tip">默认使用本机私域Agent</span>
            </div>
          </template>

          <el-form-item label="接口地址" prop="apiUrl">
            <el-input
              v-model="agentForm.apiUrl"
              placeholder="http://127.0.0.1:3000"
              @keydown.enter.prevent
            />
            <div class="field-tip">填写服务根地址，系统会调用 /v1/capabilities 和 /v1/chat</div>
          </el-form-item>

          <el-form-item label="处理模式">
            <el-select v-model="agentForm.deliveryMode" style="width: 100%">
              <el-option label="同步回复" value="sync_reply" />
              <el-option label="异步任务回复" value="async_reply" />
              <el-option label="仅推送不回复" value="consume_only" />
            </el-select>
            <div v-if="agentForm.deliveryMode === 'async_reply'" class="field-tip">
              平台返回任务号后，系统通过 HTTP 定时查询结果，无需开放本机回调端口
            </div>
          </el-form-item>

          <el-form-item v-if="agentForm.deliveryMode !== 'async_reply'" label="响应格式">
            <el-select v-model="agentForm.responseFormat" style="width: 100%">
              <el-option label="自动识别 JSON / SSE" value="auto" />
              <el-option label="JSON" value="json" />
              <el-option label="SSE" value="sse" />
            </el-select>
          </el-form-item>

          <el-form-item label="接口 Token" prop="apiToken">
            <el-input
              v-model="agentForm.apiToken"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="agentForm.hasApiToken ? '已配置，留空表示不修改' : '本机地址可留空，远程地址必填'"
              @keydown.enter.prevent
            />
          </el-form-item>

          <el-form-item label="超时时间">
            <el-input-number
              v-model="agentForm.timeoutSeconds"
              :min="1"
              :max="300"
              :step="10"
              controls-position="right"
            />
            <span class="number-unit">秒</span>
          </el-form-item>

          <el-form-item label="失败重试">
            <el-input-number
              v-model="agentForm.retryCount"
              :min="0"
              :max="3"
              controls-position="right"
            />
            <span class="number-unit">次</span>
          </el-form-item>
        </el-collapse-item>
      </el-collapse>

      <el-form-item v-if="agentForm.platform === 'coze3'" label="API 地址" prop="apiUrl">
        <el-input
          v-model="agentForm.apiUrl"
          placeholder="https://xxxx.coze.site/stream_run"
          @keydown.enter.prevent
        />
      </el-form-item>

      <el-form-item v-if="agentForm.platform === 'coze3'" label="API Token" prop="apiToken">
        <el-input
          v-model="agentForm.apiToken"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="请输入该 Project 的 API Token"
          @keydown.enter.prevent
        />
      </el-form-item>
    </el-form>

    <div class="dialog-footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :icon="isEditing ? Edit : Plus"
        :disabled="!isEditing && safeAgents.length >= 10"
        @click="handleSubmit"
      >
        {{ isEditing ? '保存修改' : '添加智能体' }}
      </el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'
import { ElMessage, type FormItemRule } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import type { CozeAgent } from '@/types/coze'
import { saveConfig } from '@/api/config'
import type { BrandConfig } from '@/config/brand'

const brandConfig = inject<Ref<BrandConfig>>('brandConfig', ref({} as BrandConfig))

const props = defineProps<{
  visible: boolean
  agents: CozeAgent[]
  editingAgent?: CozeAgent | null
  allowedPlatforms?: string[]
}>()

const emit = defineEmits(['update:visible', 'update:agents'])
const dialogVisible = ref(props.visible)
const agentFormRef = ref()
const agenticPanels = ref<string[]>([])
const safeAgents = computed(() => Array.isArray(props.agents) ? props.agents : [])
const isEditing = computed(() => Boolean(props.editingAgent))
const DEFAULT_AGENTIC_URL = 'http://127.0.0.1:3000'
const isPlatformAllowed = (platform: string) => (
  !props.allowedPlatforms || props.allowedPlatforms.includes(platform)
)

const createEmptyForm = () => ({
  name: '',
  botId: '',
  apiUrl: '',
  apiToken: '',
  hasApiToken: false,
  deliveryMode: 'sync_reply' as const,
  responseFormat: 'auto' as const,
  timeoutSeconds: 300,
  retryCount: 1,
  platform: 'coze'
})

const agentForm = ref(createEmptyForm())
type ValidateCallback = (error?: Error | string) => void

const checkBotIdExists = (botId: string): boolean => {
  const editingBotId = props.editingAgent?.botId
  return safeAgents.value.some(agent => agent.botId === botId && agent.botId !== editingBotId)
}

const agentRules = {
  name: [
    { required: true, message: '请输入智能体名称', trigger: 'blur' }
  ] as FormItemRule[],
  botId: [
    {
      validator: (_rule: unknown, value: string, callback: ValidateCallback) => {
        if (!value) {
          const message = agentForm.value.platform === 'coze3'
            ? '请输入 Project ID'
            : (agentForm.value.platform === 'coze'
              ? '请输入 Bot ID'
              : (agentForm.value.platform === 'fireflow'
                ? '请输入 API Token'
                : (agentForm.value.platform === 'agentic' ? '请输入智能体 ID' : '请输入 API 秘钥')))
          callback(new Error(message))
        } else if (agentForm.value.platform === 'coze3' && !/^\d+$/.test(value.trim())) {
          callback(new Error('Project ID 必须为数字'))
        } else if (checkBotIdExists(value.trim())) {
          callback(new Error('该智能体已经添加过了，无法重复添加'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ] as FormItemRule[],
  apiUrl: [
    {
      validator: (_rule: unknown, value: string, callback: ValidateCallback) => {
        if (agentForm.value.platform !== 'coze3' && agentForm.value.platform !== 'agentic') {
          callback()
          return
        }
        if (agentForm.value.platform === 'agentic') {
          try {
            const url = new URL(value?.trim())
            const hostname = url.hostname.toLowerCase()
            const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
              callback(new Error('请输入有效的私域Agent服务根地址'))
              return
            }
            if (!isLoopback && url.protocol !== 'https:') {
              callback(new Error('远程私域Agent服务必须使用 HTTPS'))
              return
            }
            callback()
          } catch {
            callback(new Error('请输入有效的私域Agent服务根地址'))
          }
          return
        }
        if (!value) {
          callback(new Error('请输入 Coze 3.0 API 地址'))
          return
        }
        try {
          const url = new URL(value.trim())
          const validHost = url.hostname === 'coze.site' || url.hostname.endsWith('.coze.site')
          const validPath = url.pathname.replace(/\/$/, '') === '/stream_run'
          if (url.protocol !== 'https:' || !validHost || !validPath || url.search || url.hash) {
            callback(new Error('请输入有效的 https://xxxx.coze.site/stream_run 地址'))
            return
          }
          callback()
        } catch {
          callback(new Error('请输入有效的 Coze 3.0 API 地址'))
        }
      },
      trigger: 'blur'
    }
  ] as FormItemRule[],
  apiToken: [
    {
      validator: (_rule: unknown, value: string, callback: ValidateCallback) => {
        if (agentForm.value.platform === 'coze3' && !value?.trim()) {
          callback(new Error('请输入该 Project 的 API Token'))
          return
        }
        if (agentForm.value.platform === 'agentic') {
          try {
            const url = new URL(agentForm.value.apiUrl.trim())
            const hostname = url.hostname.toLowerCase()
            const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
            if (!isLoopback && !value?.trim() && !agentForm.value.hasApiToken) {
              callback(new Error('远程私域Agent服务必须配置接口 Token'))
              return
            }
          } catch {
            // 地址错误由 apiUrl 校验器提示。
          }
        }
        callback()
      },
      trigger: 'blur'
    }
  ] as FormItemRule[]
}

const getIdLabel = () => {
  if (agentForm.value.platform === 'coze3') return 'Project ID'
  if (agentForm.value.platform === 'agentic') return '智能体 ID'
  if (agentForm.value.platform === 'coze') return 'Bot ID'
  if (agentForm.value.platform === 'fireflow') return 'API Token'
  return 'API 秘钥'
}

const getIdPlaceholder = () => `请输入 ${getIdLabel()}`

const fillForm = () => {
  const agent = props.editingAgent
  agentForm.value = agent
    ? {
        name: agent.name || '',
        botId: agent.botId || '',
        apiUrl: agent.apiUrl || '',
        apiToken: agent.platform === 'agentic' ? '' : (agent.apiToken || ''),
        hasApiToken: Boolean(agent.hasApiToken || agent.apiToken),
        deliveryMode: agent.deliveryMode || 'sync_reply',
        responseFormat: agent.responseFormat || 'auto',
        timeoutSeconds: agent.timeoutSeconds || 300,
        retryCount: agent.retryCount ?? 1,
        platform: agent.platform || 'coze'
      }
    : createEmptyForm()
  agenticPanels.value = []
  agentFormRef.value?.clearValidate()
}

watch(() => props.visible, (visible) => {
  dialogVisible.value = visible
  if (visible) fillForm()
})

watch(() => props.editingAgent, () => {
  if (props.visible) fillForm()
})

watch(dialogVisible, (visible) => {
  emit('update:visible', visible)
})

watch(() => agentForm.value.platform, (platform) => {
  if (platform !== 'agentic') return
  if (!agentForm.value.apiUrl) agentForm.value.apiUrl = DEFAULT_AGENTIC_URL
  if (!agentForm.value.botId) agentForm.value.botId = 'rpa-reply'
  if (!agentForm.value.name) agentForm.value.name = '私域Agent'
})

const handleClose = () => {
  dialogVisible.value = false
  agentFormRef.value?.resetFields()
}

const buildAgent = (): CozeAgent => {
  const platform = agentForm.value.platform
  const agent: CozeAgent = {
    ...(props.editingAgent || {}),
    name: agentForm.value.name.trim(),
    botId: agentForm.value.botId.trim(),
    platform
  }

  if (platform === 'coze3') {
    agent.apiUrl = agentForm.value.apiUrl.trim().replace(/\/$/, '')
    agent.apiToken = agentForm.value.apiToken.trim()
  } else if (platform === 'agentic') {
    agent.apiUrl = agentForm.value.apiUrl.trim().replace(/\/$/, '')
    agent.apiToken = agentForm.value.apiToken.trim()
    agent.hasApiToken = agentForm.value.hasApiToken
    agent.deliveryMode = agentForm.value.deliveryMode
    agent.responseFormat = agentForm.value.responseFormat
    agent.timeoutSeconds = agentForm.value.timeoutSeconds
    agent.retryCount = agentForm.value.retryCount
  } else {
    delete agent.apiUrl
    delete agent.apiToken
  }

  if (!isEditing.value) {
    agent.id = platform === 'dify'
      ? `dify-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
      : agent.botId
  }
  return agent
}

const handleSubmit = async () => {
  if (!agentFormRef.value) return
  const valid = await agentFormRef.value.validate().catch(() => false)
  if (!valid) return

  if (!isEditing.value && safeAgents.value.length >= 10) {
    ElMessage.warning('最多只能添加10个智能体')
    return
  }

  const agent = buildAgent()
  const updatedAgents = isEditing.value
    ? safeAgents.value.map(item => item.botId === props.editingAgent?.botId ? agent : item)
    : [...safeAgents.value, agent]

  try {
    const result = await saveConfig('agents', { agents: updatedAgents })
    if (!result.success) throw new Error(result.error || '保存失败')
    const publicAgents = (Array.isArray(result.data) ? result.data : updatedAgents).map((item: CozeAgent) => item.platform === 'agentic'
      ? {
          ...item,
          apiToken: '',
          hasApiToken: Boolean(item.apiToken || item.hasApiToken)
        }
      : item)
    emit('update:agents', publicAgents)
    const actionMessage = isEditing.value ? '修改成功' : '添加成功'
    ElMessage.success(
      result.restartRequired
        ? `${actionMessage}，重启客户端后生效`
        : actionMessage
    )
    dialogVisible.value = false
  } catch (error) {
    console.error('保存智能体失败:', error)
    ElMessage.error(`保存智能体失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
</script>

<style scoped>
.agent-form {
  margin-top: 20px;
}

.agentic-config-collapse {
  margin: 0 0 18px;
}

.agentic-collapse-title {
  display: flex;
  gap: 12px;
  align-items: center;
}

.field-tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
  margin-top: 4px;
}

.dialog-footer {
  margin-top: 20px;
  text-align: right;
}

.number-unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}
</style>
