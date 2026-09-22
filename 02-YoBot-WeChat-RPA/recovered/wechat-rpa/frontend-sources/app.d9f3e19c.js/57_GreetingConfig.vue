import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, unref as _unref, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, withModifiers as _withModifiers, createBlock as _createBlock, createCommentVNode as _createCommentVNode, resolveDynamicComponent as _resolveDynamicComponent, normalizeClass as _normalizeClass, withKeys as _withKeys } from "vue"

const _hoisted_1 = { class: "greeting-config" }
const _hoisted_2 = { class: "header" }
const _hoisted_3 = { class: "greeting-groups" }
const _hoisted_4 = { class: "group-header" }
const _hoisted_5 = { class: "group-content" }
const _hoisted_6 = { class: "greetings-list" }
const _hoisted_7 = { class: "greeting-content" }
const _hoisted_8 = { class: "dialog-footer" }
const _hoisted_9 = { class: "type-selector-wrap" }
const _hoisted_10 = { class: "type-selector" }
const _hoisted_11 = ["onClick"]
const _hoisted_12 = { class: "type-card__label" }
const _hoisted_13 = { class: "type-card__desc" }
const _hoisted_14 = { class: "file-upload" }
const _hoisted_15 = {
  key: 0,
  class: "selected-file"
}
const _hoisted_16 = { class: "agent-option" }
const _hoisted_17 = ["src", "alt"]
const _hoisted_18 = { class: "record-panel" }
const _hoisted_19 = { class: "record-time" }
const _hoisted_20 = { class: "record-controls" }
const _hoisted_21 = ["src"]
const _hoisted_22 = {
  key: 0,
  class: "voice-ready-badge"
}
const _hoisted_23 = ["src"]
const _hoisted_24 = { class: "dialog-footer" }

import { ref, reactive, inject, onUnmounted, onMounted, computed } from 'vue'
import { Delete, Plus, Select, FolderOpened, VideoCamera, VideoPause, UploadFilled, Microphone, Document, MagicStick, Star } from '@element-plus/icons-vue'
import type { Emitter } from 'mitt'
import { ElMessage } from 'element-plus'
import { uploadFile } from '@/api/autosop'
import { saveConfig, getConfig } from '@/api/config'
import { voiceApi, type VoiceLibRecord, type GreetingVoiceAsset } from '@/api/voice'
import type { CozeAgent } from '@/types/coze'
import { getPlatformIconPath } from '@/utils/iconImages'

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

export default /*@__PURE__*/_defineComponent({
  __name: 'GreetingConfig',
  props: {
    allowedTypes: {}
  },
  setup(__props: any) {

const emitter = inject('emitter') as Emitter<any>

const props = __props

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

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_collapse_item = _resolveComponent("el-collapse-item")!
  const _component_el_collapse = _resolveComponent("el-collapse")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_dialog = _resolveComponent("el-dialog")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_radio = _resolveComponent("el-radio")!
  const _component_el_radio_group = _resolveComponent("el-radio-group")!
  const _component_el_slider = _resolveComponent("el-slider")!
  const _component_el_upload = _resolveComponent("el-upload")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _cache[17] || (_cache[17] = _createElementVNode("h4", null, "打招呼话术配置", -1)),
      _createVNode(_component_el_button, {
        type: "primary",
        icon: _unref(Plus),
        onClick: showAddGroupDialog,
        disabled: greetingGroups.value.length >= 30
      }, {
        default: _withCtx(() => [...(_cache[16] || (_cache[16] = [
          _createTextVNode(" 话术组 ", -1)
        ]))]),
        _: 1
      }, 8, ["icon", "disabled"])
    ]),
    _createElementVNode("div", _hoisted_3, [
      _createVNode(_component_el_collapse, {
        modelValue: activeGroup.value,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((activeGroup).value = $event))
      }, {
        default: _withCtx(() => [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(greetingGroups.value, (group, groupIndex) => {
            return (_openBlock(), _createBlock(_component_el_collapse_item, {
              key: groupIndex,
              name: groupIndex
            }, {
              title: _withCtx(() => [
                _createElementVNode("div", _hoisted_4, [
                  _createElementVNode("span", null, _toDisplayString(group.name), 1),
                  _createVNode(_component_el_button, {
                    type: "danger",
                    size: "small",
                    onClick: _withModifiers(($event: any) => (removeGroup(groupIndex)), ["stop"])
                  }, {
                    default: _withCtx(() => [...(_cache[18] || (_cache[18] = [
                      _createTextVNode(" 删除 ", -1)
                    ]))]),
                    _: 1
                  }, 8, ["onClick"])
                ])
              ]),
              default: _withCtx(() => [
                _createElementVNode("div", _hoisted_5, [
                  _createElementVNode("div", _hoisted_6, [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(group.greetings, (item, index) => {
                      return (_openBlock(), _createElementBlock("div", {
                        key: index,
                        class: "greeting-item"
                      }, [
                        _createVNode(_component_el_tag, {
                          type: getTagType(item.type)
                        }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(getTypeLabel(item.type)), 1)
                          ]),
                          _: 2
                        }, 1032, ["type"]),
                        _createElementVNode("span", _hoisted_7, _toDisplayString(getGreetingContent(item)), 1),
                        (item.type === 'voice' && item.audioFilename)
                          ? (_openBlock(), _createBlock(_component_el_button, {
                              key: 0,
                              link: "",
                              type: "primary",
                              size: "small",
                              onClick: ($event: any) => (onPreviewVoiceGreeting(item))
                            }, {
                              default: _withCtx(() => [...(_cache[19] || (_cache[19] = [
                                _createTextVNode("试听", -1)
                              ]))]),
                              _: 1
                            }, 8, ["onClick"]))
                          : _createCommentVNode("", true),
                        _createVNode(_component_el_button, {
                          type: "danger",
                          size: "small",
                          circle: "",
                          onClick: ($event: any) => (removeGreeting(groupIndex, index))
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_icon, null, {
                              default: _withCtx(() => [
                                _createVNode(_unref(Delete))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }, 8, ["onClick"])
                      ]))
                    }), 128))
                  ]),
                  _createVNode(_component_el_button, {
                    plain: "",
                    type: "info",
                    class: "add-content-btn",
                    onClick: ($event: any) => (showAddGreetingDialog(groupIndex)),
                    disabled: group.greetings.length >= 5
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_icon, { class: "add-icon" }, {
                        default: _withCtx(() => [
                          _createVNode(_unref(Plus))
                        ]),
                        _: 1
                      }),
                      _cache[20] || (_cache[20] = _createTextVNode(" 添加内容 ", -1))
                    ]),
                    _: 1
                  }, 8, ["onClick", "disabled"])
                ])
              ]),
              _: 2
            }, 1032, ["name"]))
          }), 128))
        ]),
        _: 1
      }, 8, ["modelValue"])
    ]),
    _createVNode(_component_el_dialog, {
      modelValue: groupDialogVisible.value,
      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((groupDialogVisible).value = $event)),
      title: "添加话术组",
      width: "400px"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_8, [
          _createVNode(_component_el_button, {
            onClick: _cache[2] || (_cache[2] = ($event: any) => (groupDialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            icon: _unref(Select),
            onClick: addGroup
          }, {
            default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
              _createTextVNode("确认", -1)
            ]))]),
            _: 1
          }, 8, ["icon"])
        ])
      ]),
      default: _withCtx(() => [
        _createVNode(_component_el_form, {
          model: newGroup.value,
          "label-width": "80px"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_el_form_item, {
              label: "组名",
              required: ""
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_input, {
                  modelValue: newGroup.value.name,
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((newGroup.value.name) = $event)),
                  placeholder: "请输入组名"
                }, null, 8, ["modelValue"])
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["model"])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: greetingDialogVisible.value,
      "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event: any) => ((greetingDialogVisible).value = $event)),
      title: "添加话术内容",
      width: "500px"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_24, [
          _createVNode(_component_el_button, {
            onClick: _cache[14] || (_cache[14] = ($event: any) => (greetingDialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            icon: _unref(Select),
            onClick: addGreeting
          }, {
            default: _withCtx(() => [...(_cache[36] || (_cache[36] = [
              _createTextVNode("确认", -1)
            ]))]),
            _: 1
          }, 8, ["icon"])
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_9, [
          _cache[23] || (_cache[23] = _createElementVNode("span", { class: "type-selector-title" }, "消息类型", -1)),
          _createElementVNode("div", _hoisted_10, [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(greetingTypeOptions.value, (opt) => {
              return (_openBlock(), _createElementBlock("button", {
                key: opt.value,
                type: "button",
                class: _normalizeClass(["type-card", { 'is-active': newGreeting.value.type === opt.value }]),
                onClick: ($event: any) => (selectType(opt.value))
              }, [
                _createVNode(_component_el_icon, { class: "type-card__icon" }, {
                  default: _withCtx(() => [
                    (_openBlock(), _createBlock(_resolveDynamicComponent(opt.icon)))
                  ]),
                  _: 2
                }, 1024),
                _createElementVNode("span", _hoisted_12, _toDisplayString(opt.label), 1),
                _createElementVNode("span", _hoisted_13, _toDisplayString(opt.desc), 1)
              ], 10, _hoisted_11))
            }), 128))
          ])
        ]),
        _createVNode(_component_el_form, {
          model: newGreeting.value,
          "label-width": "80px",
          onSubmit: _cache[13] || (_cache[13] = _withModifiers(() => {}, ["prevent"]))
        }, {
          default: _withCtx(() => [
            (newGreeting.value.type === 'text')
              ? (_openBlock(), _createBlock(_component_el_form_item, {
                  key: 0,
                  label: "内容"
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_input, {
                      modelValue: newGreeting.value.content,
                      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((newGreeting.value.content) = $event)),
                      type: "textarea",
                      rows: 4,
                      maxlength: 2000,
                      "show-word-limit": "",
                      placeholder: "请输入话术文本"
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }))
              : (newGreeting.value.type === 'file')
                ? (_openBlock(), _createBlock(_component_el_form_item, {
                    key: 1,
                    label: "文件"
                  }, {
                    default: _withCtx(() => [
                      _createElementVNode("div", _hoisted_14, [
                        _createVNode(_component_el_button, {
                          type: "primary",
                          icon: _unref(FolderOpened),
                          onClick: handleSelectFile
                        }, {
                          default: _withCtx(() => [...(_cache[24] || (_cache[24] = [
                            _createTextVNode("选择文件", -1)
                          ]))]),
                          _: 1
                        }, 8, ["icon"]),
                        (newGreeting.value.content)
                          ? (_openBlock(), _createElementBlock("span", _hoisted_15, " 已选择: " + _toDisplayString(newGreeting.value.content), 1))
                          : _createCommentVNode("", true)
                      ])
                    ]),
                    _: 1
                  }))
                : (newGreeting.value.type === 'favorite')
                  ? (_openBlock(), _createBlock(_component_el_form_item, {
                      key: 2,
                      label: "关键词"
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_input, {
                          modelValue: newGreeting.value.favoriteKeyword,
                          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((newGreeting.value.favoriteKeyword) = $event)),
                          maxlength: 50,
                          placeholder: "微信收藏记录关键词，模糊匹配，多条默认取第一条",
                          onKeydown: _withKeys(_withModifiers(addGreeting, ["prevent"]), ["enter"])
                        }, null, 8, ["modelValue", "onKeydown"]),
                        _cache[25] || (_cache[25] = _createElementVNode("div", { class: "form-tip" }, "需提前在微信收藏中保存好对应记录（如位置卡片）", -1))
                      ]),
                      _: 1
                    }))
                  : (newGreeting.value.type === 'agent')
                    ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
                        _createVNode(_component_el_form_item, { label: "智能体" }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_select, {
                              modelValue: newGreeting.value.agentId,
                              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event: any) => ((newGreeting.value.agentId) = $event)),
                              placeholder: "请选择智能体"
                            }, {
                              default: _withCtx(() => [
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(cozeAgents.value, (agent) => {
                                  return (_openBlock(), _createBlock(_component_el_option, {
                                    key: agent.botId,
                                    label: agent.name,
                                    value: agent.botId
                                  }, {
                                    default: _withCtx(() => [
                                      _createElementVNode("div", _hoisted_16, [
                                        _createElementVNode("img", {
                                          src: _unref(getPlatformIconPath)(agent.platform),
                                          alt: agent.platform || 'coze',
                                          class: "agent-icon"
                                        }, null, 8, _hoisted_17),
                                        _createTextVNode(" " + _toDisplayString(agent.name), 1)
                                      ])
                                    ]),
                                    _: 2
                                  }, 1032, ["label", "value"]))
                                }), 128))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ]),
                          _: 1
                        }),
                        _createVNode(_component_el_form_item, { label: "提示词" }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_input, {
                              modelValue: newGreeting.value.prompt,
                              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((newGreeting.value.prompt) = $event)),
                              type: "textarea",
                              rows: 3,
                              maxlength: 500,
                              "show-word-limit": "",
                              placeholder: "提示词会作为问题传给智能体"
                            }, null, 8, ["modelValue"])
                          ]),
                          _: 1
                        })
                      ], 64))
                    : (newGreeting.value.type === 'voice')
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 4 }, [
                          _createVNode(_component_el_form_item, { label: "生成方式" }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_radio_group, {
                                modelValue: voiceForm.subSource,
                                "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event: any) => ((voiceForm.subSource) = $event)),
                                onChange: resetVoiceAsset
                              }, {
                                default: _withCtx(() => [
                                  _createVNode(_component_el_radio, { value: "tts" }, {
                                    default: _withCtx(() => [...(_cache[26] || (_cache[26] = [
                                      _createTextVNode("输入文字合成", -1)
                                    ]))]),
                                    _: 1
                                  }),
                                  _createVNode(_component_el_radio, { value: "upload" }, {
                                    default: _withCtx(() => [...(_cache[27] || (_cache[27] = [
                                      _createTextVNode("上传音频", -1)
                                    ]))]),
                                    _: 1
                                  }),
                                  _createVNode(_component_el_radio, { value: "record" }, {
                                    default: _withCtx(() => [...(_cache[28] || (_cache[28] = [
                                      _createTextVNode("音频录制", -1)
                                    ]))]),
                                    _: 1
                                  })
                                ]),
                                _: 1
                              }, 8, ["modelValue"])
                            ]),
                            _: 1
                          }),
                          (voiceForm.subSource === 'tts')
                            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                _createVNode(_component_el_form_item, { label: "音色" }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_el_select, {
                                      modelValue: voiceForm.voiceId,
                                      "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event: any) => ((voiceForm.voiceId) = $event)),
                                      placeholder: "选择音色（必须已校验通过）",
                                      style: {"width":"100%"}
                                    }, {
                                      empty: _withCtx(() => [...(_cache[29] || (_cache[29] = [
                                        _createElementVNode("div", { style: {"padding":"12px","text-align":"center","color":"#909399","font-size":"12px"} }, " 尚无可用音色 — 先到「AI 语音配置 → 我的音色」添加并校验 ", -1)
                                      ]))]),
                                      default: _withCtx(() => [
                                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeVoices.value, (v) => {
                                          return (_openBlock(), _createBlock(_component_el_option, {
                                            key: v.voice_id,
                                            label: v.name,
                                            value: v.voice_id
                                          }, null, 8, ["label", "value"]))
                                        }), 128))
                                      ]),
                                      _: 1
                                    }, 8, ["modelValue"])
                                  ]),
                                  _: 1
                                }),
                                _createVNode(_component_el_form_item, { label: "文本" }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_el_input, {
                                      modelValue: voiceForm.text,
                                      "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event: any) => ((voiceForm.text) = $event)),
                                      type: "textarea",
                                      rows: 3,
                                      maxlength: 300,
                                      "show-word-limit": "",
                                      placeholder: "想合成的语音文字"
                                    }, null, 8, ["modelValue"])
                                  ]),
                                  _: 1
                                }),
                                _createVNode(_component_el_form_item, { label: "语速" }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_el_slider, {
                                      modelValue: voiceForm.speed,
                                      "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event: any) => ((voiceForm.speed) = $event)),
                                      min: 0.5,
                                      max: 2.0,
                                      step: 0.1,
                                      "show-stops": ""
                                    }, null, 8, ["modelValue"])
                                  ]),
                                  _: 1
                                })
                              ], 64))
                            : (voiceForm.subSource === 'upload')
                              ? (_openBlock(), _createBlock(_component_el_form_item, {
                                  key: 1,
                                  label: "音频文件"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_el_upload, {
                                      drag: "",
                                      "auto-upload": false,
                                      multiple: false,
                                      accept: ".mp3,.wav,.m4a,.aac,.ogg",
                                      "on-change": onUploadFileChange,
                                      "show-file-list": false
                                    }, {
                                      tip: _withCtx(() => [...(_cache[30] || (_cache[30] = [
                                        _createElementVNode("div", { class: "upload-tip" }, "支持 mp3/wav/m4a/aac/ogg，≤ 5MB，时长 ≤ 60s", -1)
                                      ]))]),
                                      default: _withCtx(() => [
                                        _createVNode(_component_el_icon, { class: "el-icon--upload" }, {
                                          default: _withCtx(() => [
                                            _createVNode(_unref(UploadFilled))
                                          ]),
                                          _: 1
                                        }),
                                        _cache[31] || (_cache[31] = _createElementVNode("div", { class: "el-upload__text" }, [
                                          _createTextVNode("拖拽音频文件或"),
                                          _createElementVNode("em", null, "点击选择")
                                        ], -1))
                                      ]),
                                      _: 1
                                    })
                                  ]),
                                  _: 1
                                }))
                              : (voiceForm.subSource === 'record')
                                ? (_openBlock(), _createBlock(_component_el_form_item, {
                                    key: 2,
                                    label: "音频录制"
                                  }, {
                                    default: _withCtx(() => [
                                      _createElementVNode("div", _hoisted_18, [
                                        _createElementVNode("div", _hoisted_19, _toDisplayString(formatRecordTime(voiceForm.recordSec)) + " / 60s", 1),
                                        _createElementVNode("div", _hoisted_20, [
                                          (!voiceForm.recording && !voiceForm.recordedBlob)
                                            ? (_openBlock(), _createBlock(_component_el_button, {
                                                key: 0,
                                                type: "primary",
                                                icon: _unref(VideoCamera),
                                                onClick: startRecording
                                              }, {
                                                default: _withCtx(() => [...(_cache[32] || (_cache[32] = [
                                                  _createTextVNode("开始录音", -1)
                                                ]))]),
                                                _: 1
                                              }, 8, ["icon"]))
                                            : _createCommentVNode("", true),
                                          (voiceForm.recording)
                                            ? (_openBlock(), _createBlock(_component_el_button, {
                                                key: 1,
                                                type: "danger",
                                                icon: _unref(VideoPause),
                                                onClick: stopRecording
                                              }, {
                                                default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
                                                  _createTextVNode("停止", -1)
                                                ]))]),
                                                _: 1
                                              }, 8, ["icon"]))
                                            : _createCommentVNode("", true),
                                          (voiceForm.recordedBlob && !voiceForm.recording)
                                            ? (_openBlock(), _createBlock(_component_el_button, {
                                                key: 2,
                                                plain: "",
                                                onClick: resetRecording
                                              }, {
                                                default: _withCtx(() => [...(_cache[34] || (_cache[34] = [
                                                  _createTextVNode("重录", -1)
                                                ]))]),
                                                _: 1
                                              }))
                                            : _createCommentVNode("", true)
                                        ]),
                                        (voiceForm.recordedAudioUrl)
                                          ? (_openBlock(), _createElementBlock("audio", {
                                              key: 0,
                                              src: voiceForm.recordedAudioUrl,
                                              controls: "",
                                              class: "record-playback"
                                            }, null, 8, _hoisted_21))
                                          : _createCommentVNode("", true)
                                      ])
                                    ]),
                                    _: 1
                                  }))
                                : _createCommentVNode("", true),
                          _createVNode(_component_el_form_item, { label: "话术名称" }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_input, {
                                modelValue: voiceForm.displayName,
                                "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event: any) => ((voiceForm.displayName) = $event)),
                                maxlength: "40",
                                "show-word-limit": "",
                                placeholder: "给这条语音话术起个易记的名字"
                              }, null, 8, ["modelValue"])
                            ]),
                            _: 1
                          }),
                          _createVNode(_component_el_form_item, { label: "" }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_button, {
                                type: "primary",
                                icon: _unref(Microphone),
                                loading: voiceForm.busy,
                                disabled: !canGenerateVoice.value,
                                onClick: onGenerateVoiceAsset
                              }, {
                                default: _withCtx(() => [
                                  _createTextVNode(_toDisplayString(voiceForm.subSource === 'tts' ? '生成并预览' : (voiceForm.subSource === 'upload' ? '上传并预览' : '提交录音并预览')), 1)
                                ]),
                                _: 1
                              }, 8, ["icon", "loading", "disabled"]),
                              (voiceForm.asset)
                                ? (_openBlock(), _createElementBlock("span", _hoisted_22, " ✓ 已生成 " + _toDisplayString(voiceForm.asset.duration_sec.toFixed(1)) + "s ", 1))
                                : _createCommentVNode("", true)
                            ]),
                            _: 1
                          }),
                          (voiceForm.asset)
                            ? (_openBlock(), _createBlock(_component_el_form_item, {
                                key: 3,
                                label: "试听"
                              }, {
                                default: _withCtx(() => [
                                  _createElementVNode("audio", {
                                    src: _unref(voiceApi).greetingAbsoluteUrl(voiceForm.asset.filename),
                                    controls: "",
                                    class: "record-playback"
                                  }, null, 8, _hoisted_23)
                                ]),
                                _: 1
                              }))
                            : _createCommentVNode("", true)
                        ], 64))
                      : _createCommentVNode("", true)
          ]),
          _: 1
        }, 8, ["model"])
      ]),
      _: 1
    }, 8, ["modelValue"])
  ]))
}
}

})