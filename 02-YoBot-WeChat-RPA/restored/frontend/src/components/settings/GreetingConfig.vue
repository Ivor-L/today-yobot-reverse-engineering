<template>
  <div class="greeting-config">
    <div class="header">
      <h4>打招呼话术配置</h4>
      <el-button type="primary" :icon="Plus" @click="showAddGroupDialog" :disabled="greetingGroups.length >= 30">
        话术组
      </el-button>
    </div>

    <div class="greeting-groups">
      <el-collapse v-model="activeGroup">
        <el-collapse-item v-for="(group, groupIndex) in greetingGroups" :key="groupIndex" :name="groupIndex">
          <template #title>
            <div class="group-header">
              <span>{{ group.name }}</span>
              <el-button type="danger" size="small" @click.stop="removeGroup(groupIndex)">
                删除
              </el-button>
            </div>
          </template>

          <div class="group-content">
            <div class="greetings-list">
              <div v-for="(item, index) in group.greetings" :key="index" class="greeting-item">
                <el-tag :type="getTagType(item.type)">
                  {{ getTypeLabel(item.type) }}
                </el-tag>
                <span class="greeting-content">{{ getGreetingContent(item) }}</span>
                <el-button
                  v-if="item.type === 'voice' && item.audioFilename"
                  link
                  type="primary"
                  size="small"
                  @click="onPreviewVoiceGreeting(item)"
                >试听</el-button>
                <el-button
                  type="danger"
                  size="small"
                  circle
                  @click="removeGreeting(groupIndex, index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            
            <el-button 
              plain
              type="info" 
              class="add-content-btn"
              @click="showAddGreetingDialog(groupIndex)"
              :disabled="group.greetings.length >= 5"
          >
              <el-icon class="add-icon"><Plus /></el-icon>
              添加内容
          </el-button>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 添加话术组弹窗 -->
    <el-dialog
      v-model="groupDialogVisible"
      title="添加话术组"
      width="400px"
    >
      <el-form :model="newGroup" label-width="80px">
        <el-form-item label="组名" required>
          <el-input v-model="newGroup.name" placeholder="请输入组名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="groupDialogVisible = false">取消</el-button>
          <el-button type="primary" :icon="Select" @click="addGroup">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加打招呼内容弹窗 -->
    <el-dialog
      v-model="greetingDialogVisible"
      title="添加话术内容"
      width="500px"
    >
      <div class="type-selector-wrap">
        <span class="type-selector-title">消息类型</span>
        <div class="type-selector">
          <button
            v-for="opt in greetingTypeOptions"
            :key="opt.value"
            type="button"
            class="type-card"
            :class="{ 'is-active': newGreeting.type === opt.value }"
            @click="selectType(opt.value)"
          >
            <el-icon class="type-card__icon"><component :is="opt.icon" /></el-icon>
            <span class="type-card__label">{{ opt.label }}</span>
            <span class="type-card__desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>

      <el-form :model="newGreeting" label-width="80px" @submit.prevent>
        <el-form-item v-if="newGreeting.type === 'text'" label="内容">
          <el-input
            v-model="newGreeting.content"
            type="textarea"
            :rows="4"
            :maxlength="2000"
            show-word-limit
            placeholder="请输入话术文本"
          />
        </el-form-item>

        <el-form-item v-else-if="newGreeting.type === 'file'" label="文件">
          <div class="file-upload">
            <el-button type="primary" :icon="FolderOpened" @click="handleSelectFile">选择文件</el-button>
            <span v-if="newGreeting.content" class="selected-file">
              已选择: {{ newGreeting.content }}
            </span>
          </div>
        </el-form-item>

        <el-form-item v-else-if="newGreeting.type === 'favorite'" label="关键词">
          <el-input
            v-model="newGreeting.favoriteKeyword"
            :maxlength="50"
            placeholder="微信收藏记录关键词，模糊匹配，多条默认取第一条"
            @keydown.enter.prevent="addGreeting"
          />
          <div class="form-tip">需提前在微信收藏中保存好对应记录（如位置卡片）</div>
        </el-form-item>

        <!-- 智能体配置 -->
        <template v-else-if="newGreeting.type === 'agent'">
          <el-form-item label="智能体">
            <el-select v-model="newGreeting.agentId" placeholder="请选择智能体">
              <el-option
                v-for="agent in cozeAgents"
                :key="agent.botId"
                :label="agent.name"
                :value="agent.botId"
              >
                <div class="agent-option">
                  <img
                    :src="getPlatformIconPath(agent.platform)"
                    :alt="agent.platform || 'coze'"
                    class="agent-icon"
                  />
                  {{ agent.name }}
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="提示词">
            <el-input
              v-model="newGreeting.prompt"
              type="textarea"
              :rows="3"
              :maxlength="500"
              show-word-limit
              placeholder="提示词会作为问题传给智能体"
            />
          </el-form-item>
        </template>

        <!-- 语音类型 -->
        <template v-else-if="newGreeting.type === 'voice'">
          <el-form-item label="生成方式">
            <el-radio-group v-model="voiceForm.subSource" @change="resetVoiceAsset">
              <el-radio value="tts">输入文字合成</el-radio>
              <el-radio value="upload">上传音频</el-radio>
              <el-radio value="record">音频录制</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- TTS 子表单 -->
          <template v-if="voiceForm.subSource === 'tts'">
            <el-form-item label="音色">
              <el-select
                v-model="voiceForm.voiceId"
                placeholder="选择音色（必须已校验通过）"
                style="width: 100%"
              >
                <el-option
                  v-for="v in activeVoices"
                  :key="v.voice_id"
                  :label="v.name"
                  :value="v.voice_id"
                />
                <template #empty>
                  <div style="padding: 12px; text-align: center; color: #909399; font-size: 12px;">
                    尚无可用音色 — 先到「AI 语音配置 → 我的音色」添加并校验
                  </div>
                </template>
              </el-select>
            </el-form-item>
            <el-form-item label="文本">
              <el-input
                v-model="voiceForm.text"
                type="textarea"
                :rows="3"
                :maxlength="300"
                show-word-limit
                placeholder="想合成的语音文字"
              />
            </el-form-item>
            <el-form-item label="语速">
              <el-slider v-model="voiceForm.speed" :min="0.5" :max="2.0" :step="0.1" show-stops />
            </el-form-item>
          </template>

          <!-- 上传子表单 -->
          <template v-else-if="voiceForm.subSource === 'upload'">
            <el-form-item label="音频文件">
              <el-upload
                drag
                :auto-upload="false"
                :multiple="false"
                accept=".mp3,.wav,.m4a,.aac,.ogg"
                :on-change="onUploadFileChange"
                :show-file-list="false"
              >
                <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                <div class="el-upload__text">拖拽音频文件或<em>点击选择</em></div>
                <template #tip>
                  <div class="upload-tip">支持 mp3/wav/m4a/aac/ogg，≤ 5MB，时长 ≤ 60s</div>
                </template>
              </el-upload>
            </el-form-item>
          </template>

          <!-- 录制子表单 -->
          <template v-else-if="voiceForm.subSource === 'record'">
            <el-form-item label="音频录制">
              <div class="record-panel">
                <div class="record-time">{{ formatRecordTime(voiceForm.recordSec) }} / 60s</div>
                <div class="record-controls">
                  <el-button
                    v-if="!voiceForm.recording && !voiceForm.recordedBlob"
                    type="primary"
                    :icon="VideoCamera"
                    @click="startRecording"
                  >开始录音</el-button>
                  <el-button
                    v-if="voiceForm.recording"
                    type="danger"
                    :icon="VideoPause"
                    @click="stopRecording"
                  >停止</el-button>
                  <el-button
                    v-if="voiceForm.recordedBlob && !voiceForm.recording"
                    plain
                    @click="resetRecording"
                  >重录</el-button>
                </div>
                <audio
                  v-if="voiceForm.recordedAudioUrl"
                  :src="voiceForm.recordedAudioUrl"
                  controls
                  class="record-playback"
                />
              </div>
            </el-form-item>
          </template>

          <!-- 公共：名称 + 生成 + 已生成预览 -->
          <el-form-item label="话术名称">
            <el-input
              v-model="voiceForm.displayName"
              maxlength="40"
              show-word-limit
              placeholder="给这条语音话术起个易记的名字"
            />
          </el-form-item>

          <el-form-item label="">
            <el-button
              type="primary"
              :icon="Microphone"
              :loading="voiceForm.busy"
              :disabled="!canGenerateVoice"
              @click="onGenerateVoiceAsset"
            >{{ voiceForm.subSource === 'tts' ? '生成并预览' : (voiceForm.subSource === 'upload' ? '上传并预览' : '提交录音并预览') }}</el-button>
            <span v-if="voiceForm.asset" class="voice-ready-badge">
              ✓ 已生成 {{ voiceForm.asset.duration_sec.toFixed(1) }}s
            </span>
          </el-form-item>

          <el-form-item v-if="voiceForm.asset" label="试听">
            <audio :src="voiceApi.greetingAbsoluteUrl(voiceForm.asset.filename)" controls class="record-playback" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="greetingDialogVisible = false">取消</el-button>
          <el-button type="primary" :icon="Select" @click="addGreeting">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, inject, onUnmounted, onMounted, computed } from 'vue'
import { Delete, Plus, Select, FolderOpened, VideoCamera, VideoPause, UploadFilled, Microphone, Document, MagicStick, Star } from '@element-plus/icons-vue'
import type { Emitter } from 'mitt'
import { ElMessage } from 'element-plus'
import { uploadFile } from '@/api/autosop'
import { saveConfig, getConfig } from '@/api/config'
import { voiceApi, type VoiceLibRecord, type GreetingVoiceAsset } from '@/api/voice'
import type { CozeAgent } from '@/types/coze'
import { getPlatformIconPath } from '@/utils/iconImages'

const emitter = inject('emitter') as Emitter<any>

const props = defineProps<{
  allowedTypes?: ReadonlyArray<'text' | 'file' | 'agent' | 'voice' | 'favorite'>
}>()

interface Greeting {
  type: 'text' | 'file' | 'agent' | 'voice' | 'favorite'
  content: string
  filePath?: string
  agentId?: string
  prompt?: string
  favoriteKeyword?: string   // favorite 类型：微信收藏搜索关键词
  // voice 类型字段
  audioPath?: string         // 后端绝对路径（消费侧用这个发送）
  audioFilename?: string     // voice_greetings 目录下文件名（删除时用）
  source?: 'tts' | 'upload' | 'record'
  displayName?: string
  durationSec?: number
  voiceId?: string           // 仅 source=tts
  originalText?: string      // 仅 source=tts
}

interface GreetingGroup {
  name: string
  greetings: Greeting[]
}

const activeGroup = ref([])
const greetingGroups = ref<GreetingGroup[]>([])
const groupDialogVisible = ref(false)
const greetingDialogVisible = ref(false)
const currentGroupIndex = ref<number>(0)
const cozeAgents = ref<CozeAgent[]>([])

const newGroup = ref<GreetingGroup>({
  name: '',
  greetings: []
})

const newGreeting = ref<Greeting>({
  type: 'text',
  content: '',
  prompt: '请按要求生成话术'
})

// 话术类型选项（卡片式选择器）
const allGreetingTypeOptions = [
  { value: 'text', label: '文本', desc: '固定文案', icon: Document },
  { value: 'file', label: '文件', desc: '本地文件', icon: FolderOpened },
  { value: 'agent', label: '智能体', desc: 'AI 生成', icon: MagicStick },
  { value: 'voice', label: '语音', desc: '语音消息', icon: Microphone },
  { value: 'favorite', label: '收藏', desc: '定位卡片', icon: Star },
] as const

const greetingTypeOptions = computed(() => {
  if (!props.allowedTypes) return allGreetingTypeOptions
  const allowed = new Set(props.allowedTypes)
  return allGreetingTypeOptions.filter(option => allowed.has(option.value))
})

const selectType = (val: string) => {
  if (newGreeting.value.type === val) return
  newGreeting.value.type = val as Greeting['type']
  onTypeChange()
}

// ---------- 语音类型话术：UI 临时状态（不入 newGreeting，确认后才转写） ----------
interface VoiceForm {
  subSource: 'tts' | 'upload' | 'record'
  // TTS
  text: string
  voiceId: string
  speed: number
  // 共用
  displayName: string
  // 录制
  recording: boolean
  recordSec: number
  recordedBlob: Blob | null
  recordedAudioUrl: string
  // 已生成的素材（创建成功后填）
  asset: GreetingVoiceAsset | null
  busy: boolean
}
const voiceForm = reactive<VoiceForm>({
  subSource: 'tts',
  text: '',
  voiceId: '',
  speed: 1.0,
  displayName: '',
  recording: false,
  recordSec: 0,
  recordedBlob: null,
  recordedAudioUrl: '',
  asset: null,
  busy: false,
})
const voiceLibrary = ref<VoiceLibRecord[]>([])
const activeVoices = computed(() => voiceLibrary.value.filter(v => v.status === 'active'))

// 加载智能体列表
const loadCozeAgents = async () => {
  try {
    const result = await getConfig('agents')
    if (result?.success && result?.data) {
      const agents = Array.isArray(result.data) ? result.data :
        Array.isArray(result.data.agents) ? result.data.agents : []
      
      cozeAgents.value = agents.filter((agent: CozeAgent) => agent.name && agent.botId)
    }
  } catch (error) {
    console.error('加载智能体配置失败:', error)
  }
}

// 获取平台图标扩展名
// 获取标签类型
const getTagType = (type: string) => {
  switch (type) {
    case 'text': return 'success'
    case 'file': return 'warning'
    case 'agent': return 'info'
    case 'voice': return 'primary'
    case 'favorite': return 'danger'
    default: return 'info'
  }
}

// 获取类型标签
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'text': return '文本'
    case 'file': return '文件'
    case 'agent': return '智能体'
    case 'voice': return '语音'
    case 'favorite': return '收藏'
    default: return '未知'
  }
}

// 修改加载配置方法
const loadConfig = async () => {
  try {
    const result = await getConfig('greeting_config')
    if (result?.success && result?.data) {
      // 处理双层 greeting_config 的情况
      const config = result.data?.greeting_config?.greeting_config || result.data?.greeting_config || []
      // 确保每个组都有 greetings 数组
      greetingGroups.value = Array.isArray(config) ? config.map(group => ({
        ...group,
        greetings: Array.isArray(group.greetings) ? group.greetings : []
      })) : []
    }
  } catch (error) {
    console.error('加载打招呼配置失败:', error)
    greetingGroups.value = []
  }
}
  
// 修改保存配置方法
const saveGreetingConfig = async () => {
  try {
    const config = {
        greeting_config: greetingGroups.value || []
    }
    await saveConfig('greeting_config', config)
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存失败')
  }
}
  
  // 添加话术组
  const showAddGroupDialog = () => {
    newGroup.value = { name: '', greetings: [] }
    groupDialogVisible.value = true
  }
  
  const addGroup = async () => {
    const groupName = newGroup.value.name.trim()
    if (!groupName) {
      ElMessage.warning('请输入组名')
      return
    }
    // 组名需唯一：工作流通过 [send_group:组名] 引用，重名会导致匹配歧义
    if (greetingGroups.value.some(g => g.name === groupName)) {
      ElMessage.warning('组名已存在，请换一个（组名需唯一）')
      return
    }

    greetingGroups.value.push({
      name: groupName,
      greetings: []
    })

    await saveGreetingConfig()
    groupDialogVisible.value = false
  }
  
  const removeGroup = async (index: number) => {
    greetingGroups.value.splice(index, 1)
    await saveGreetingConfig()
  }
  
  // 打招呼内容相关方法
  const showAddGreetingDialog = (groupIndex: number) => {
    currentGroupIndex.value = groupIndex
    newGreeting.value = {
      type: 'text',
      content: '',
      prompt: '请按要求生成话术',
      favoriteKeyword: ''
    }
    resetVoiceForm()
    greetingDialogVisible.value = true
  }

  // ---------- 语音类型话术：UI 逻辑 ----------

  const onTypeChange = () => {
    if (newGreeting.value.type === 'voice') {
      // 首次进入语音类型时加载音色列表
      if (!voiceLibrary.value.length) loadVoiceLibrary()
    }
    resetVoiceAsset()
  }

  const loadVoiceLibrary = async () => {
    try {
      const r = await voiceApi.listLibrary()
      if (r.success && r.data) voiceLibrary.value = r.data
    } catch (e) {
      console.error('加载音色列表失败:', e)
    }
  }

  const canGenerateVoice = computed(() => {
    if (voiceForm.busy) return false
    if (voiceForm.subSource === 'tts') {
      return !!voiceForm.text.trim() && !!voiceForm.voiceId
    }
    if (voiceForm.subSource === 'upload') {
      return !!pendingUploadFile.value
    }
    if (voiceForm.subSource === 'record') {
      return !!voiceForm.recordedBlob
    }
    return false
  })

  // 上传用临时变量（不能直接放 reactive 因为 File 对象会被代理）
  const pendingUploadFile = ref<File | null>(null)

  const onUploadFileChange = (file: any) => {
    const raw: File | undefined = file?.raw
    if (!raw) return
    if (raw.size > 5 * 1024 * 1024) {
      ElMessage.error('文件不能超过 5MB')
      pendingUploadFile.value = null
      return
    }
    pendingUploadFile.value = raw
    voiceForm.asset = null
  }

  const resetVoiceAsset = () => {
    if (voiceForm.asset) {
      // 之前生成过但用户切换了模式 → 删后端文件
      voiceApi.greetingDelete(voiceForm.asset.filename).catch(() => undefined)
      voiceForm.asset = null
    }
  }

  const resetVoiceForm = () => {
    resetVoiceAsset()
    voiceForm.subSource = 'tts'
    voiceForm.text = ''
    voiceForm.voiceId = activeVoices.value[0]?.voice_id || ''
    voiceForm.speed = 1.0
    voiceForm.displayName = ''
    voiceForm.busy = false
    pendingUploadFile.value = null
    stopMediaRecorder()
    voiceForm.recordedBlob = null
    if (voiceForm.recordedAudioUrl) {
      URL.revokeObjectURL(voiceForm.recordedAudioUrl)
      voiceForm.recordedAudioUrl = ''
    }
    voiceForm.recordSec = 0
    voiceForm.recording = false
  }

  const onGenerateVoiceAsset = async () => {
    voiceForm.busy = true
    try {
      let resp: any
      if (voiceForm.subSource === 'tts') {
        resp = await voiceApi.greetingFromTts({
          text: voiceForm.text.trim(),
          voice_id: voiceForm.voiceId,
          speed: voiceForm.speed,
          display_name: voiceForm.displayName.trim(),
        })
      } else if (voiceForm.subSource === 'upload') {
        const f = pendingUploadFile.value!
        resp = await voiceApi.greetingUpload(f, f.name, voiceForm.displayName.trim())
      } else {
        resp = await voiceApi.greetingRecord(voiceForm.recordedBlob!, voiceForm.displayName.trim())
      }

      if (!resp.success || !resp.data) {
        ElMessage.error(resp.error || '生成失败')
        return
      }
      voiceForm.asset = resp.data
      // 若用户没输入名字 → 用 backend 默认
      if (!voiceForm.displayName.trim()) {
        voiceForm.displayName = resp.data.display_name || ''
      }
      ElMessage.success(`已生成，时长 ${resp.data.duration_sec.toFixed(1)}s`)
    } catch (e: any) {
      ElMessage.error(`生成异常: ${e?.message ?? e}`)
    } finally {
      voiceForm.busy = false
    }
  }

  // 浏览器 MediaRecorder 录制
  let mediaRecorder: MediaRecorder | null = null
  let recordedChunks: Blob[] = []
  let recordTimer: number | null = null
  let mediaStream: MediaStream | null = null

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      ElMessage.error('当前环境不支持录音 API')
      return
    }
    try {
      if (voiceForm.recordedAudioUrl) {
        URL.revokeObjectURL(voiceForm.recordedAudioUrl)
        voiceForm.recordedAudioUrl = ''
      }
      voiceForm.recordedBlob = null
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordedChunks = []
      mediaRecorder = new MediaRecorder(mediaStream)
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data)
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
        voiceForm.recordedBlob = blob
        voiceForm.recordedAudioUrl = URL.createObjectURL(blob)
        mediaStream?.getTracks().forEach(t => t.stop())
        mediaStream = null
      }
      mediaRecorder.start()
      voiceForm.recording = true
      voiceForm.recordSec = 0
      recordTimer = window.setInterval(() => {
        voiceForm.recordSec++
        if (voiceForm.recordSec >= 60) stopRecording()
      }, 1000)
    } catch (e: any) {
      ElMessage.error(`录音启动失败: ${e?.message ?? e}`)
      voiceForm.recording = false
    }
  }

  const stopRecording = () => {
    if (recordTimer !== null) {
      clearInterval(recordTimer)
      recordTimer = null
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop() } catch {}
    }
    voiceForm.recording = false
  }

  const stopMediaRecorder = stopRecording

  const resetRecording = () => {
    stopRecording()
    voiceForm.recordedBlob = null
    if (voiceForm.recordedAudioUrl) {
      URL.revokeObjectURL(voiceForm.recordedAudioUrl)
      voiceForm.recordedAudioUrl = ''
    }
    voiceForm.recordSec = 0
    voiceForm.asset = null
  }

  const formatRecordTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }
  
  onMounted(() => {
    emitter.on('updateGreetingConfig', (config) => {
      let newConfig = []
      if (config?.greeting_config?.greeting_config) {
        newConfig = config.greeting_config.greeting_config
      } else if (config?.greeting_config) {
        newConfig = config.greeting_config
      }
      // 确保每个组都有 greetings 数组
      greetingGroups.value = Array.isArray(newConfig) ? newConfig.map(group => ({
        ...group,
        greetings: Array.isArray(group.greetings) ? group.greetings : []
      })) : []
    })
    loadConfig()
    loadCozeAgents()
  })
  
  onUnmounted(() => {
    emitter.off('updateGreetingConfig')
  }) 
  
  const addGreeting = async () => {
  if (newGreeting.value.type === 'text' && !newGreeting.value.content.trim()) {
    ElMessage.warning('请输入打招呼内容')
    return
  }

  if (newGreeting.value.type === 'file' && !newGreeting.value.filePath) {
    ElMessage.warning('请选择文件')
    return
  }

  if (newGreeting.value.type === 'agent') {
    if (!newGreeting.value.agentId) {
      ElMessage.warning('请选择智能体')
      return
    }
    if (!newGreeting.value.prompt?.trim()) {
      ElMessage.warning('请输入提示词')
      return
    }
  }

  if (newGreeting.value.type === 'voice') {
    if (!voiceForm.asset) {
      ElMessage.warning('请先生成 / 上传 / 录制 语音内容')
      return
    }
  }

  if (newGreeting.value.type === 'favorite' && !newGreeting.value.favoriteKeyword?.trim()) {
    ElMessage.warning('请输入收藏关键词')
    return
  }

  // 根据类型构建不同的数据结构
  let greetingData: Greeting

  if (newGreeting.value.type === 'text') {
    greetingData = {
      type: 'text',
      content: newGreeting.value.content
    }
  } else if (newGreeting.value.type === 'file') {
    greetingData = {
      type: 'file',
      content: newGreeting.value.content,
      filePath: newGreeting.value.filePath
    }
  } else if (newGreeting.value.type === 'agent') {
    greetingData = {
      type: 'agent',
      content: newGreeting.value.content,
      agentId: newGreeting.value.agentId,
      prompt: newGreeting.value.prompt
    }
  } else if (newGreeting.value.type === 'voice') {
    const asset = voiceForm.asset!
    greetingData = {
      type: 'voice',
      content: voiceForm.displayName.trim() || asset.display_name || '语音话术',
      audioPath: asset.audio_path,
      audioFilename: asset.filename,
      source: asset.source,
      displayName: voiceForm.displayName.trim() || asset.display_name || '',
      durationSec: asset.duration_sec,
      voiceId: asset.voice_id,
      originalText: asset.original_text,
    }
    // 入库后这条 asset 不再"挂在 voiceForm 上"，关闭对话框时不能误删
    voiceForm.asset = null
  } else if (newGreeting.value.type === 'favorite') {
    greetingData = {
      type: 'favorite',
      content: newGreeting.value.favoriteKeyword!.trim(),
      favoriteKeyword: newGreeting.value.favoriteKeyword!.trim()
    }
  } else {
    greetingData = { ...newGreeting.value }
  }

  greetingGroups.value[currentGroupIndex.value].greetings.push(greetingData)
  await saveGreetingConfig()
  greetingDialogVisible.value = false
}
  
  const removeGreeting = async (groupIndex: number, greetingIndex: number) => {
    const greeting = greetingGroups.value[groupIndex].greetings[greetingIndex]
    // 如果是语音类型 → 顺便删后端文件，避免孤儿
    if (greeting?.type === 'voice' && greeting.audioFilename) {
      voiceApi.greetingDelete(greeting.audioFilename).catch(() => undefined)
    }
    greetingGroups.value[groupIndex].greetings.splice(greetingIndex, 1)
    await saveGreetingConfig()
  }

  const onPreviewVoiceGreeting = (greeting: Greeting) => {
    if (!greeting.audioFilename) {
      ElMessage.warning('文件名缺失，无法预览')
      return
    }
    window.open(voiceApi.greetingAbsoluteUrl(greeting.audioFilename), '_blank', 'noopener')
  }

  const getGreetingContent = (greeting: Greeting) => {
    if (greeting.type === 'text') return greeting.content
    if (greeting.type === 'file') return greeting.filePath || '未知文件'
    if (greeting.type === 'agent') {
      const agent = cozeAgents.value.find(a => a.botId === greeting.agentId)
      return `${agent?.name || '未知智能体'} - ${greeting.prompt || '无提示词'}`
    }
    if (greeting.type === 'voice') {
      const name = greeting.displayName || greeting.content || '语音话术'
      const dur = greeting.durationSec ? ` (${greeting.durationSec.toFixed(1)}s)` : ''
      const sourceTag = greeting.source === 'tts' ? ' [TTS]' : (greeting.source === 'upload' ? ' [上传]' : ' [录制]')
      return `${name}${dur}${sourceTag}`
    }
    if (greeting.type === 'favorite') return `收藏: ${greeting.favoriteKeyword || '未设置关键词'}`
    return '未知类型'
  }
  
  const handleSelectFile = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '*/*'
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        
        try {
          const result = await uploadFile(file)
          newGreeting.value.content = result.filename
          newGreeting.value.filePath = result.filepath
          ElMessage.success('文件上传成功')
        } catch (error) {
          ElMessage.error(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }
      
      input.click()
    } catch (error) {
      console.error('选择文件失败:', error)
    }
  }
</script>

<style scoped>
.greeting-config {
  margin-top: 20px;
  margin-bottom: 20px;
}

.add-content-btn {
  width: 100%;
  border-style: dashed;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
}

/* 语音话术子表单 */
.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}
.record-panel {
  width: 100%;
  padding: 8px 0;
  text-align: center;
}
.record-time {
  font-size: 22px;
  font-family: ui-monospace, monospace;
  color: #303133;
  margin-bottom: 10px;
}
.record-controls {
  margin-bottom: 10px;
}
.record-playback {
  width: 100%;
  margin-top: 6px;
}
.voice-ready-badge {
  margin-left: 10px;
  font-size: 12px;
  color: #67c23a;
}

.add-content-btn:not(:disabled):hover {
  color: #409EFF;
  border-color: #409EFF;
}

.add-icon {
  font-size: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h4 {
  margin: 0;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.group-content {
  padding: 16px;
}

.greetings-list {
  margin-bottom: 16px;
}

.greeting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.greeting-groups {
  margin-bottom: 20px;
}

.greeting-content {
  flex: 1;
  word-break: break-all;
}

.file-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-file {
  color: #606266;
  font-size: 14px;
}

.form-tip {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

/* 话术类型卡片选择器 */
.type-selector-wrap {
  margin-bottom: 22px;
}

.type-selector-title {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.type-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 14px 6px 12px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 10px;
  background: var(--el-fill-color-blank, #fff);
  color: #606266;
  cursor: pointer;
  transition: border-color .18s ease, color .18s ease, background-color .18s ease, transform .18s ease;
}

.type-card:hover {
  border-color: var(--el-color-primary, #409eff);
  color: var(--el-color-primary, #409eff);
  transform: translateY(-1px);
}

.type-card.is-active {
  border-color: var(--el-color-primary, #409eff);
  color: var(--el-color-primary, #409eff);
  background: var(--el-color-primary-light-9, #ecf5ff);
  box-shadow: inset 0 0 0 1px var(--el-color-primary, #409eff);
}

.type-card__icon {
  font-size: 22px;
}

.type-card__label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}

.type-card__desc {
  font-size: 11px;
  line-height: 1.2;
  color: #a8abb2;
}

.type-card.is-active .type-card__desc {
  color: var(--el-color-primary, #409eff);
  opacity: .75;
}

.agent-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-icon {
  width: 16px;
  height: 16px;
}
</style>
