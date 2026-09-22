<template>
  <div class="voice-library">
    <!-- 环境就绪 banner：缺 VB-Cable / ffmpeg 时展示，红底警告 -->
    <div v-if="envBannerVisible" class="env-warn-box">
      <div class="env-warn-icon">
        <el-icon><WarningFilled /></el-icon>
      </div>
      <div class="env-warn-content">
        <div class="env-warn-title">
          语音环境未就绪 — 当前发送语音会失败
        </div>
        <ul class="env-warn-list">
          <li v-if="audioEnv && !audioEnv.vb_cable_installed">
            <span class="env-bad">✗</span>
            <strong>VB-Cable</strong> 未安装：发语音的虚拟音频通道
            <el-button link type="primary" size="small" @click="openVBCableSite">
              下载 VB-Cable →
            </el-button>
          </li>
          <li v-if="audioEnv && !audioEnv.ffmpeg.installed">
            <span class="env-bad">✗</span>
            <strong>ffmpeg</strong> 未安装：语音解码依赖
            <el-tooltip content="点击查看安装教程" placement="top">
              <el-button
                circle size="small" type="warning"
                class="help-btn"
                @click="ffmpegGuideVisible = true"
              >
                <el-icon><QuestionFilled /></el-icon>
              </el-button>
            </el-tooltip>
          </li>
        </ul>
      </div>
      <el-button
        :loading="audioEnvLoading"
        size="small"
        plain
        @click="loadAudioEnv"
      >
        重新检测
      </el-button>
    </div>

    <!-- 顶部引导：解释为什么不在本机复刻 -->
    <div class="custom-info-box">
      <div class="info-icon">
        <el-icon><InfoFilled /></el-icon>
      </div>
      <div class="info-content">
        <div class="info-text">
          声音复刻请在火山控制台完成；本页只管理已复刻的音色 ID
        </div>
        <el-button type="primary" link size="small" @click="openConsole">
          → 去火山控制台复刻声音
        </el-button>
      </div>
    </div>

    <!-- 自动回复语速 / 长度上限（全局） -->
    <div class="speed-config">
      <div class="speed-row">
        <span class="speed-label">自动回复语速</span>
        <el-slider
          v-model="autoReplySpeed"
          :min="0.5"
          :max="2.0"
          :step="0.1"
          :marks="speedMarks"
          :format-tooltip="(v: number) => `${v.toFixed(1)}x`"
          class="speed-slider"
          @change="onSpeedChange"
        />
        <span class="speed-current">{{ autoReplySpeed.toFixed(1) }}x</span>
      </div>
      <div class="speed-hint">
        所有语音回复都用这个语速
      </div>

      <div class="length-row">
        <span class="speed-label">文本转语音长度上限</span>
        <el-input-number
          v-model="ttsMaxChars"
          :min="20"
          :max="300"
          :step="10"
          controls-position="right"
          class="length-input"
          @change="onMaxCharsChange"
        />
        <span class="speed-unit">字</span>
      </div>
      <div class="speed-hint">
        文本超过此长度自动改用文字发送，避免生成过长语音，推荐 80~150
      </div>
    </div>

    <div class="lib-header">
      <div class="lib-actions">
        <el-button @click="refresh" :loading="loading" :icon="Refresh" plain>
          刷新
        </el-button>
        <el-button
          @click="onValidateAll"
          :loading="validatingAll"
          :icon="CircleCheck"
          :disabled="!voices.length"
          plain
        >
          批量校验
        </el-button>
        <el-button type="primary" :icon="Plus" @click="openAddDialog">
          添加音色
        </el-button>
      </div>
    </div>

    <el-table
      :data="voices"
      empty-text="还没添加任何音色 — 先去火山控制台复刻，回来粘贴 Speaker ID"
      stripe
      style="width: 100%; margin-top: 12px;"
    >
      <el-table-column prop="name" label="名称" min-width="120" show-overflow-tooltip />
      <el-table-column prop="voice_id" label="Speaker ID" min-width="170">
        <template #default="{ row }">
          <code class="voice-id">{{ row.voice_id }}</code>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tooltip
            v-if="row.message"
            :content="row.message"
            placement="top"
          >
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </el-tooltip>
          <el-tag v-else :type="statusTagType(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="140" align="center">
        <template #default="{ row }">
          {{ formatTs(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <el-button
            link type="primary" size="small"
            @click="onValidateOne(row)"
            :loading="validating[row.voice_id]"
          >校验</el-button>
          <el-button
            link type="success" size="small"
            :disabled="row.status !== 'active'"
            @click="openPreviewDialog(row)"
          >试听</el-button>
          <el-button
            link type="danger" size="small"
            @click="onDelete(row)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加音色对话框 -->
    <el-dialog
      v-model="addVisible"
      title="添加已复刻的音色"
      width="560px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-alert
        type="warning"
        :closable="false"
        title="合规提醒"
        description="仅添加你本人或已获授权人的复刻音色。冒充他人语音用于欺诈/骚扰将被永久封禁本软件账号。"
        show-icon
        style="margin-bottom: 14px;"
      />

      <el-form :model="addForm" label-width="100px">
        <el-form-item label="音色名称" required>
          <el-input
            v-model="addForm.name"
            placeholder="给这个音色起个易记的名字"
            maxlength="40" show-word-limit
            @keydown.enter.prevent
          />
        </el-form-item>

        <el-form-item label="Speaker ID" required>
          <el-input
            v-model="addForm.voice_id"
            placeholder="形如 S_xxx，从火山控制台复刻完成后复制"
            @keydown.enter.prevent
          />
          <span class="form-hint">
            到火山控制台 → 模型推理 → 声音复刻 → 复刻完成后从音色详情复制 Speaker ID
          </span>
        </el-form-item>

        <el-form-item label="语言">
          <el-radio-group v-model="addForm.language">
            <el-radio value="zh">中文</el-radio>
            <el-radio value="en">英文</el-radio>
            <el-radio value="ja">日文</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!canSubmitAdd"
          :loading="adding"
          @click="onAddVoice"
        >添加并校验</el-button>
      </template>
    </el-dialog>

    <!-- 试听对话框 -->
    <el-dialog
      v-model="previewVisible"
      :title="`试听音色：${previewVoice?.name || ''}`"
      width="560px"
      append-to-body
    >
      <el-form label-width="80px">
        <el-form-item label="试听文本">
          <el-input
            v-model="previewText"
            type="textarea" :rows="3"
            placeholder="输入想合成的一小段话（≤200 字）"
            maxlength="200" show-word-limit
          />
        </el-form-item>
        <el-form-item label="语速">
          <el-slider v-model="previewSpeed" :min="0.5" :max="2.0" :step="0.1" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :loading="previewing"
          :disabled="!previewText.trim()"
          @click="onPreview"
        >生成并在浏览器中播放</el-button>
      </template>
    </el-dialog>

    <!-- ffmpeg 安装教程弹窗 -->
    <FfmpegInstallGuide v-model="ffmpegGuideVisible" @recheck="loadAudioEnv" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, CircleCheck, InfoFilled, WarningFilled, QuestionFilled } from '@element-plus/icons-vue'
import { voiceApi, type VoiceLibRecord, type VoiceLibStatus } from '@/api/voice'
import FfmpegInstallGuide from './FfmpegInstallGuide.vue'

const voices = ref<VoiceLibRecord[]>([])
const loading = ref(false)
const validating = reactive<Record<string, boolean>>({})
const validatingAll = ref(false)

// ---------- 语音环境探测（VB-Cable / ffmpeg） ----------
type AudioEnv = NonNullable<Awaited<ReturnType<typeof voiceApi.getAudioDevices>>['data']>
const audioEnv = ref<AudioEnv | null>(null)
const audioEnvLoading = ref(false)
const ffmpegGuideVisible = ref(false)

const envBannerVisible = computed(() => {
  if (!audioEnv.value) return false
  return !audioEnv.value.vb_cable_installed || !audioEnv.value.ffmpeg.installed
})

async function loadAudioEnv() {
  audioEnvLoading.value = true
  try {
    const r = await voiceApi.getAudioDevices()
    if (r.success && r.data) {
      audioEnv.value = r.data
    }
  } catch (e) {
    console.error('加载语音环境失败:', e)
  } finally {
    audioEnvLoading.value = false
  }
}

function openVBCableSite() {
  window.open('https://vb-audio.com/Cable/', '_blank', 'noopener')
}

// ---------- 自动回复语速 / 长度上限（全局） ----------
const autoReplySpeed = ref(1.0)
const ttsMaxChars = ref(120)
const speedMarks = {
  0.5: '0.5x',
  1.0: '1.0x',
  1.5: '1.5x',
  2.0: '2.0x',
}

async function loadVoiceSettings() {
  try {
    const r = await voiceApi.getConfig()
    if (r.success && r.data) {
      autoReplySpeed.value = r.data.auto_reply_speed ?? 1.0
      ttsMaxChars.value = r.data.tts_max_chars ?? 120
    }
  } catch (e) {
    console.error('加载语音配置失败:', e)
  }
}

async function onSpeedChange(v: number | number[]) {
  const val = Array.isArray(v) ? v[0] : v
  try {
    const r = await voiceApi.saveConfig({ auto_reply_speed: val } as any)
    if (r.success) {
      ElMessage.success({ message: `语速已设为 ${val.toFixed(1)}x`, duration: 1200 })
    } else {
      ElMessage.error(r.error || '保存失败')
    }
  } catch (e: any) {
    ElMessage.error(`保存语速失败: ${e?.message ?? e}`)
  }
}

async function onMaxCharsChange(v: number | undefined) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return
  try {
    const r = await voiceApi.saveConfig({ tts_max_chars: v } as any)
    if (r.success) {
      ElMessage.success({ message: `长度上限已设为 ${v} 字`, duration: 1200 })
    } else {
      ElMessage.error(r.error || '保存失败')
    }
  } catch (e: any) {
    ElMessage.error(`保存失败: ${e?.message ?? e}`)
  }
}

async function refresh() {
  loading.value = true
  try {
    const r = await voiceApi.listLibrary()
    if (r.success && r.data) {
      voices.value = r.data
    } else if (r.error) {
      ElMessage.error(r.error)
    }
  } catch (e: any) {
    ElMessage.error(`加载音色库失败: ${e?.message ?? e}`)
  } finally {
    loading.value = false
  }
}

function statusLabel(s: VoiceLibStatus) {
  return ({
    pending: '待校验',
    training: '训练中',
    active: '可用',
    failed: '校验失败',
    gone: '音色不存在',
  } as Record<VoiceLibStatus, string>)[s] || s
}
function statusTagType(s: VoiceLibStatus): 'success' | 'warning' | 'danger' | 'info' {
  if (s === 'active') return 'success'
  if (s === 'training' || s === 'pending') return 'warning'
  if (s === 'failed' || s === 'gone') return 'danger'
  return 'info'
}
function formatTs(ts: number) {
  if (!ts) return '-'
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function openConsole() {
  window.open('https://console.volcengine.com/speech/new/experience/clone', '_blank')
}

// ---------- 添加音色 ----------
const addVisible = ref(false)
const adding = ref(false)

interface AddForm {
  name: string
  voice_id: string
  language: 'zh' | 'en' | 'ja'
}
const addForm = reactive<AddForm>({ name: '', voice_id: '', language: 'zh' })

const canSubmitAdd = computed(() => {
  return !!addForm.name.trim() && /^S_/.test(addForm.voice_id.trim())
})

function openAddDialog() {
  addForm.name = ''
  addForm.voice_id = ''
  addForm.language = 'zh'
  addVisible.value = true
}

async function onAddVoice() {
  const voice_id = addForm.voice_id.trim()
  const name = addForm.name.trim()

  adding.value = true
  try {
    const r = await voiceApi.addVoice({
      voice_id,
      name,
      language: addForm.language,
    })
    if (!r.success) throw new Error(r.error || '添加失败')

    addVisible.value = false
    ElMessage.success('已添加，正在校验...')
    await refresh()
    // 添加后自动校验一次，让用户立即看到 active/failed 反馈
    await validateOneInner(voice_id, { silent: false })
  } catch (e: any) {
    ElMessage.error(`添加失败: ${e?.message ?? e}`)
  } finally {
    adding.value = false
  }
}

// ---------- 校验 ----------
async function validateOneInner(voice_id: string, opts: { silent: boolean }) {
  validating[voice_id] = true
  try {
    const r = await voiceApi.validateVoices([voice_id])
    if (!r.success || !r.data) {
      if (!opts.silent) ElMessage.error(r.error || '校验失败')
      return
    }
    await refresh()
    const result = r.data[0]
    if (!result) return
    if (!opts.silent) {
      if (result.status === 'active') {
        ElMessage.success(`音色 ${voice_id} 校验通过，可用`)
      } else if (result.status === 'gone') {
        ElMessage.error(`音色 ${voice_id} 在平台上不存在`)
      } else {
        ElMessage.error(`音色 ${voice_id} 校验失败: ${result.message}`)
      }
    }
  } catch (e: any) {
    if (!opts.silent) ElMessage.error(`校验异常: ${e?.message ?? e}`)
  } finally {
    validating[voice_id] = false
  }
}

async function onValidateOne(row: VoiceLibRecord) {
  await validateOneInner(row.voice_id, { silent: false })
}

async function onValidateAll() {
  if (!voices.value.length) return
  validatingAll.value = true
  try {
    const r = await voiceApi.validateVoices()
    if (!r.success || !r.data) {
      ElMessage.error(r.error || '批量校验失败')
      return
    }
    await refresh()
    const total = r.data.length
    const ok = r.data.filter(x => x.status === 'active').length
    const bad = total - ok
    if (bad === 0) {
      ElMessage.success(`全部 ${total} 个音色均可用`)
    } else {
      ElMessage.warning(`${ok}/${total} 可用，${bad} 个失败 — 点单条「校验」查看具体原因`)
    }
  } catch (e: any) {
    ElMessage.error(`批量校验异常: ${e?.message ?? e}`)
  } finally {
    validatingAll.value = false
  }
}

// ---------- 删除 ----------
async function onDelete(row: VoiceLibRecord) {
  try {
    await ElMessageBox.confirm(
      `确定从本地库删除音色 "${row.name}" (${row.voice_id}) 吗？\n该操作不会删除火山平台上的 speaker_id 槽位，仅清除本地记录。`,
      '删除音色', { type: 'warning' },
    )
  } catch { return }
  try {
    const r = await voiceApi.deleteVoice(row.voice_id)
    if (r.success) {
      ElMessage.success('已删除')
      await refresh()
    } else {
      ElMessage.error(r.error || '删除失败')
    }
  } catch (e: any) {
    ElMessage.error(`删除异常: ${e?.message ?? e}`)
  }
}

// ---------- 试听 ----------
const previewVisible = ref(false)
const previewVoice = ref<VoiceLibRecord | null>(null)
const previewText = ref('你好，这是一段试听测试。')
const previewSpeed = ref(1.0)
const previewing = ref(false)

function openPreviewDialog(row: VoiceLibRecord) {
  previewVoice.value = row
  previewText.value = '你好，这是一段试听测试。'
  previewSpeed.value = 1.0
  previewVisible.value = true
}

async function onPreview() {
  if (!previewVoice.value) return
  previewing.value = true
  try {
    const r = await voiceApi.preview(
      previewText.value.trim(),
      previewVoice.value.voice_id,
      previewSpeed.value,
    )
    if (!r.success || !r.data) {
      // 错误时带上 error_code 让用户/我们能看出是鉴权/网络/空音频还是其它
      const code = r.error_code ? `[${r.error_code}] ` : ''
      throw new Error(`${code}${r.error || '合成失败'}`)
    }
    const url = voiceApi.previewAbsoluteUrl(r.data.url)
    window.open(url, '_blank', 'noopener')
    ElMessage.success('已在新窗口打开试听')
  } catch (e: any) {
    ElMessage.error({
      message: `试听失败: ${e?.message ?? e}`,
      duration: 6000,
      showClose: true,
    })
  } finally {
    previewing.value = false
  }
}

onMounted(() => {
  refresh()
  loadVoiceSettings()
  loadAudioEnv()
})
</script>

<style scoped>
.voice-library { padding: 4px 2px; }

/* 语音环境未就绪警告 banner */
.env-warn-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background-color: #fef0f0;
  border: 1px solid #fbc4c4;
  border-left: 4px solid #f56c6c;
  border-radius: 6px;
  margin-bottom: 12px;
}
.env-warn-icon {
  color: #f56c6c;
  font-size: 20px;
  margin-top: 2px;
  flex-shrink: 0;
}
.env-warn-content {
  flex: 1;
  font-size: 13px;
  line-height: 1.6;
}
.env-warn-title {
  font-weight: 600;
  color: #c45656;
  margin-bottom: 6px;
  font-size: 14px;
}
.env-warn-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.env-warn-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  margin-bottom: 4px;
}
.env-bad {
  color: #f56c6c;
  font-weight: 700;
  font-family: ui-monospace, monospace;
}
.help-btn {
  padding: 0 !important;
  width: 22px;
  height: 22px;
  min-height: 22px;
}

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
.info-content { flex: 1; font-size: 14px; line-height: 1.7; }
.info-text { color: #606266; }

.speed-config {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 14px 18px;
  margin-bottom: 14px;
}
.speed-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 26px;       /* 给 el-slider marks 标签预留空间，防止下方 hint 被压住 */
}
.speed-label {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  flex-shrink: 0;
}
.speed-slider {
  flex: 1;
  margin: 0 8px 0 4px;
}
/* marks 标签字体收小一点，避免和长 hint 一起视觉过重 */
.speed-slider :deep(.el-slider__marks-text) {
  font-size: 11px;
  color: #c0c4cc;
}
.speed-current {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
  font-family: ui-monospace, monospace;
  min-width: 48px;
  text-align: right;
}
.speed-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
.length-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #ebeef5;
}
.length-input {
  width: 140px;
}
.speed-unit {
  font-size: 13px;
  color: #606266;
}

.lib-header {
  display: flex; justify-content: flex-end; align-items: center; gap: 16px;
}
.lib-actions { display: flex; gap: 8px; flex-shrink: 0; }
.voice-id {
  background: #f5f7fa; padding: 2px 6px; border-radius: 3px;
  font-family: ui-monospace, monospace; font-size: 12px;
}
.form-hint { font-size: 12px; color: #909399; line-height: 1.6; margin-top: 4px; }
</style>
