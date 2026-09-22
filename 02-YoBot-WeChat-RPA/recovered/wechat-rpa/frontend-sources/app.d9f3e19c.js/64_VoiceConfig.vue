<template>
  <div class="voice-config">
    <!-- 顶部场景说明：风格与"朋友圈黑名单"一致 -->
    <div class="custom-info-box">
      <div class="info-icon">
        <el-icon><InfoFilled /></el-icon>
      </div>
      <div class="info-content">
        <div class="info-text">
          用于 AI 语音回复：合成语音或克隆声音回复客户
        </div>
      </div>
    </div>

    <!-- 服务提供商 -->
    <div class="section">
      <h4 class="section-title">语音模型</h4>
      <el-select v-model="form.provider" class="provider-select">
        <el-option label="豆包（火山引擎）" value="doubao" />
      </el-select>
    </div>

    <!-- 豆包凭证 -->
    <div v-if="form.provider === 'doubao'" class="section">
      <div class="section-head">
        <h4 class="section-title">火山凭证</h4>
        <el-button type="info" size="small" plain @click="openConsole">
          打开火山控制台
        </el-button>
      </div>

      <el-form :model="form.doubao" label-width="100px" class="field-form">
        <el-form-item required>
          <template #label>
            <span class="req-label">API Key</span>
          </template>
          <el-input
            ref="apiKeyInputRef"
            v-model="form.doubao.api_key"
            type="password"
            show-password
            :placeholder="placeholder('api_key')"
            @keydown.enter.prevent
            @input="onApiKeyInput"
          />
        </el-form-item>
      </el-form>
    </div>

    <!-- 声音复刻能力（可选） -->
    <!-- <div v-if="form.provider === 'doubao'" class="section">
      <div class="section-head">
        <h4 class="section-title">声音复刻</h4>
        <span class="optional-tag">可选 / 仅在需要克隆音色时配置</span>
      </div>

      <el-form :model="form.doubao" label-width="100px" class="field-form">
        <el-form-item label="App ID">
          <el-input
            v-model="form.doubao.app_id"
            placeholder="形如 1234567890"
            @keydown.enter.prevent
            @input="autoSave"
          />
        </el-form-item>
        <el-form-item label="Access Token">
          <el-input
            v-model="form.doubao.access_token"
            type="password"
            show-password
            :placeholder="placeholder('access_token')"
            @keydown.enter.prevent
            @input="autoSave"
          />
        </el-form-item>
      </el-form>
    </div> -->

    <!-- 测试连接 -->
    <div v-if="form.provider === 'doubao'" class="section">
      <div class="test-row">
        <el-button type="primary" :loading="testing" @click="onTest">
          测试连接
        </el-button>
        <span v-if="testResult" class="test-result" :class="testResult.ok ? 'ok' : 'err'">
          {{ testResult.text }}
        </span>
      </div>

      <div v-if="testResult?.details" class="check-grid">
        <div class="check-item">
          <span class="label">TTS 合成 (API Key):</span>
          <el-tag :type="badgeType(testResult.details.tts)" size="small">
            {{ badgeText(testResult.details.tts) }}
          </el-tag>
        </div>
        <!-- <div class="check-item">
          <span class="label">声音复刻 (App ID + Access Token):</span>
          <el-tag :type="badgeType(testResult.details.cloning)" size="small">
            {{ badgeText(testResult.details.cloning) }}
          </el-tag>
        </div> -->
      </div>
    </div>

    <!-- 合规弹窗（首次填 API Key 时触发） -->
    <VoiceComplianceDialog
      v-model="showCompliance"
      :countdown-sec="3"
      @accepted="onComplianceAccepted"
      @rejected="onComplianceRejected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { voiceApi, type VoiceSettings } from '@/api/voice'
import VoiceComplianceDialog from './VoiceComplianceDialog.vue'

function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let timer: number | null = null
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), wait)
  }
}

const form = reactive({
  provider: 'doubao',
  doubao: {
    app_id: '',
    access_token: '',
    api_key: '',
    access_key_id: '',
    secret_access_key: '',
    // 以下几项后端默认值，UI 不暴露；仅在保存时透传原值不被覆盖
    open_api_region: 'cn-north-1',
    open_api_endpoint: 'https://open.volcengineapi.com',
    resource_id_clone: 'seed-icl-2.0',
    resource_id_tts: 'seed-tts-2.0',
    endpoint: 'https://openspeech.bytedance.com',
  },
})

const masked = reactive({
  access_token_masked: '',
  access_token_has_value: false,
  api_key_masked: '',
  api_key_has_value: false,
  secret_access_key_masked: '',
  secret_access_key_has_value: false,
})

const testing = ref(false)
const testResult = ref<{ ok: boolean; text: string; details?: any } | null>(null)

const showCompliance = ref(false)
// 当前用户是否已同意当前版本协议；onMounted 时从服务端拿
const complianceAgreed = ref(false)
// 本次会话是否已经为"首次填 API Key"触发过弹窗，避免持续输入时反复弹
const complianceTriggeredThisSession = ref(false)
const apiKeyInputRef = ref<any>(null)

function placeholder(field: 'access_token' | 'api_key' | 'secret_access_key') {
  const map: Record<string, { has: boolean; m: string; tip: string }> = {
    access_token: {
      has: masked.access_token_has_value,
      m: masked.access_token_masked,
      tip: '从豆包控制台获取',
    },
    api_key: {
      has: masked.api_key_has_value,
      m: masked.api_key_masked,
      tip: '从豆包控制台 → 系统管理 → API Key 管理 → 创建',
    },
    secret_access_key: {
      has: masked.secret_access_key_has_value,
      m: masked.secret_access_key_masked,
      tip: '从火山控制台 → 访问控制 → 密钥管理 取',
    },
  }
  const cfg = map[field]
  if (!cfg) return ''
  if (cfg.has) return `已保存：${cfg.m}（留空保留原值）`
  return cfg.tip
}

function badgeText(v: any) {
  if (v === true || v === 'valid' || v === 'ok') return '✓ 可用'
  if (v === false || v === 'invalid' || v === 'auth_failed') return '✗ 鉴权失败'
  if (v === 'not_subscribed') return '未开通授权'
  if (v === 'disabled') return '未启用'
  if (v === 'network_error') return '网络异常'
  if (v === 'untested') return '未验证'
  if (v === 'unknown') return '未知'
  if (typeof v === 'string' && v.startsWith('http_')) return `HTTP ${v.slice(5)}`
  return String(v ?? '-')
}
function badgeType(v: any): 'success' | 'danger' | 'warning' | 'info' {
  if (v === true || v === 'valid' || v === 'ok') return 'success'
  if (v === false || v === 'invalid' || v === 'auth_failed') return 'danger'
  if (v === 'not_subscribed') return 'warning'
  return 'info'
}

async function loadSettings() {
  try {
    const r = await voiceApi.getConfig()
    if (!r.success || !r.data) return
    const s = r.data
    form.provider = s.provider || 'doubao'
    Object.assign(form.doubao, {
      app_id: s.doubao.app_id || '',
      access_token: '',           // 永远不预填
      api_key: '',
      access_key_id: s.doubao.access_key_id || '',
      secret_access_key: '',      // 敏感字段永远不预填
      open_api_region: s.doubao.open_api_region || 'cn-north-1',
      open_api_endpoint: s.doubao.open_api_endpoint || 'https://open.volcengineapi.com',
      resource_id_clone: s.doubao.resource_id_clone || 'seed-icl-2.0',
      resource_id_tts: s.doubao.resource_id_tts || 'seed-tts-2.0',
      endpoint: s.doubao.endpoint || 'https://openspeech.bytedance.com',
    })
    masked.access_token_masked = s.doubao.access_token_masked || ''
    masked.access_token_has_value = !!s.doubao.access_token_has_value
    masked.api_key_masked = s.doubao.api_key_masked || ''
    masked.api_key_has_value = !!s.doubao.api_key_has_value
    masked.secret_access_key_masked = s.doubao.secret_access_key_masked || ''
    masked.secret_access_key_has_value = !!s.doubao.secret_access_key_has_value

    complianceAgreed.value = s.compliance_agreed_version === s.compliance_current_version
  } catch (e: any) {
    ElMessage.error(`加载语音配置失败: ${e?.message ?? e}`)
  }
}

const doSave = async () => {
  try {
    const r = await voiceApi.saveConfig({
      provider: form.provider,
      doubao: { ...form.doubao },
    } as any)
    if (!r.success) throw new Error(r.error || '保存失败')
    if (r.data) {
      masked.access_token_masked = r.data.doubao.access_token_masked || ''
      masked.access_token_has_value = !!r.data.doubao.access_token_has_value
      masked.api_key_masked = r.data.doubao.api_key_masked || ''
      masked.api_key_has_value = !!r.data.doubao.api_key_has_value
      masked.secret_access_key_masked = r.data.doubao.secret_access_key_masked || ''
      masked.secret_access_key_has_value = !!r.data.doubao.secret_access_key_has_value
      form.doubao.access_token = ''
      form.doubao.api_key = ''
      form.doubao.secret_access_key = ''
    }
    ElMessage.success({ message: '语音配置已保存', duration: 1200 })
  } catch (e: any) {
    ElMessage.error(`保存失败: ${e?.message ?? e}`)
  }
}
const autoSave = debounce(doSave, 600)

/**
 * API Key 字段首次输入触发：
 * - 已同意当前版本合规协议：直接 autoSave，不弹窗
 * - 未同意：弹合规框；同意后才 autoSave；拒绝则清空输入
 * 一次会话内只触发一次，避免边输入边弹
 */
function onApiKeyInput() {
  if (!form.doubao.api_key) {
    // 用户清空了，不动
    autoSave()
    return
  }
  if (complianceAgreed.value || complianceTriggeredThisSession.value) {
    autoSave()
    return
  }
  complianceTriggeredThisSession.value = true
  showCompliance.value = true
}

async function onTest() {
  testing.value = true
  testResult.value = null
  try {
    const r = await voiceApi.testConnection()
    testResult.value = {
      ok: !!r.success,
      text: r.success ? '连接正常' : `连接失败：${r.error || '未知错误'}`,
      details: r.details,
    }
  } catch (e: any) {
    testResult.value = { ok: false, text: `请求异常: ${e?.message ?? e}` }
  } finally {
    testing.value = false
  }
}

function openConsole() {
  window.open('https://console.volcengine.com/speech/app', '_blank')
}

function onComplianceAccepted() {
  complianceAgreed.value = true
  ElMessage.success('已同意须知，可继续使用 AI 语音功能')
  autoSave()    // 同意后把已经输入的 API Key 落盘
}
function onComplianceRejected() {
  // 拒绝就清空已输入的 api_key，避免误存
  form.doubao.api_key = ''
  ElMessage.warning('未同意须知，API Key 已清除；如需启用请重新填写并同意条款')
}

onMounted(loadSettings)
</script>

<style scoped>
.voice-config { padding: 4px 2px; }

/* 顶部场景说明（与 SettingsPage 全局 .custom-info-box 风格保持一致） */
.custom-info-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  color: #606266;
  margin-bottom: 16px;
}
.info-icon {
  color: #409eff;
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}
.info-content { flex: 1; font-size: 14px; line-height: 1.5; }
.info-text { color: #606266; }

/* 区段统一：左对齐 h4，可选副标签 */
.section { margin-bottom: 20px; }
.section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  text-align: left;
}
.section .section-title:not(.section-head .section-title) {
  margin-bottom: 10px;
}
.optional-tag {
  font-size: 12px;
  color: #909399;
  padding: 2px 8px;
  background: #f4f4f5;
  border-radius: 10px;
}

.provider-select { max-width: 280px; }
.field-form { max-width: 600px; }
.req-label::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.test-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.test-result.ok { color: #67c23a; }
.test-result.err { color: #f56c6c; }
.check-grid {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 4px;
  max-width: 600px;
}
.check-item { display: flex; align-items: center; gap: 6px; }
.check-item .label { color: #606266; font-size: 13px; }
</style>
