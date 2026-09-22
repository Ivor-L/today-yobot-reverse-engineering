import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createTextVNode as _createTextVNode, createElementVNode as _createElementVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, createCommentVNode as _createCommentVNode, vShow as _vShow, withDirectives as _withDirectives, createBlock as _createBlock, withModifiers as _withModifiers, withKeys as _withKeys, normalizeStyle as _normalizeStyle, resolveDirective as _resolveDirective } from "vue"

const _hoisted_1 = { class: "settings-page-container" }
const _hoisted_2 = { class: "settings-nav" }
const _hoisted_3 = { class: "nav-title" }
const _hoisted_4 = { class: "nav-items" }
const _hoisted_5 = ["onClick"]
const _hoisted_6 = {
  key: 0,
  class: "settings-backup-nav-entry"
}
const _hoisted_7 = {
  key: 0,
  class: "settings-backup-mobile-entry"
}
const _hoisted_8 = ["aria-expanded"]
const _hoisted_9 = { class: "setting-section" }
const _hoisted_10 = { class: "platform-title" }
const _hoisted_11 = ["src"]
const _hoisted_12 = {
  key: 0,
  class: "more-platforms-btn-container",
  style: {"text-align":"center","margin":"10px 0"}
}
const _hoisted_13 = { class: "setting-section" }
const _hoisted_14 = { class: "card-header" }
const _hoisted_15 = { class: "agents-list" }
const _hoisted_16 = { class: "agent-info" }
const _hoisted_17 = ["src", "alt"]
const _hoisted_18 = { class: "agent-details" }
const _hoisted_19 = { class: "agent-name" }
const _hoisted_20 = { class: "agent-botid" }
const _hoisted_21 = {
  key: 0,
  class: "agent-botid"
}
const _hoisted_22 = { class: "agent-actions" }
const _hoisted_23 = { class: "actions" }
const _hoisted_24 = { class: "setting-section" }
const _hoisted_25 = {
  class: "custom-info-box",
  style: {"margin-top":"0","margin-bottom":"15px"}
}
const _hoisted_26 = { class: "info-icon" }
const _hoisted_27 = { class: "setting-section" }
const _hoisted_28 = { class: "form-item-content" }
const _hoisted_29 = { class: "form-item-content" }
const _hoisted_30 = { class: "form-item-content" }
const _hoisted_31 = { class: "transfer-title" }
const _hoisted_32 = { class: "transfer-content" }
const _hoisted_33 = { class: "config-section" }
const _hoisted_34 = { class: "section-header" }
const _hoisted_35 = { class: "form-item" }
const _hoisted_36 = { class: "phrases-list" }
const _hoisted_37 = { class: "config-section" }
const _hoisted_38 = { class: "form-item" }
const _hoisted_39 = { class: "setting-section" }
const _hoisted_40 = { class: "api-description" }
const _hoisted_41 = { class: "custom-info-box" }
const _hoisted_42 = { class: "info-icon" }
const _hoisted_43 = { class: "alert-container" }
const _hoisted_44 = { class: "alert-container" }
const _hoisted_45 = { class: "alert-container" }
const _hoisted_46 = { class: "card-header" }
const _hoisted_47 = { class: "setting-section" }
const _hoisted_48 = {
  class: "custom-info-box",
  style: {"margin-bottom":"16px"}
}
const _hoisted_49 = { class: "info-icon" }
const _hoisted_50 = {
  key: 0,
  style: {"text-align":"center","padding":"20px"}
}
const _hoisted_51 = { style: {"display":"flex","gap":"4px","align-items":"center"} }
const _hoisted_52 = { style: {"font-size":"12px"} }
const _hoisted_53 = {
  key: 0,
  class: "form-error"
}
const _hoisted_54 = { class: "setting-section" }
const _hoisted_55 = { class: "api-description" }
const _hoisted_56 = { class: "custom-info-box" }
const _hoisted_57 = { class: "info-icon" }
const _hoisted_58 = { class: "rest-time-display" }
const _hoisted_59 = { class: "current-setting" }
const _hoisted_60 = { class: "setting-value" }
const _hoisted_61 = { class: "timeline-container" }
const _hoisted_62 = { class: "timeline-track" }
const _hoisted_63 = { class: "time-inputs" }
const _hoisted_64 = { class: "time-input-group" }
const _hoisted_65 = { class: "time-input-group" }
const _hoisted_66 = { class: "task-selection" }
const _hoisted_67 = { class: "task-options" }
const _hoisted_68 = ["checked", "onChange"]
const _hoisted_69 = { class: "task-icon" }
const _hoisted_70 = { class: "task-name" }
const _hoisted_71 = {
  key: 0,
  class: "applied-badge"
}
const _hoisted_72 = { style: {"display":"flex","align-items":"center"} }
const _hoisted_73 = ["src", "alt"]
const _hoisted_74 = { class: "dialog-footer" }
const _hoisted_75 = { class: "clear-cache-content" }
const _hoisted_76 = { class: "dialog-footer" }
const _hoisted_77 = { class: "benefit-content" }
const _hoisted_78 = { class: "benefit-header" }
const _hoisted_79 = { class: "benefit-level" }
const _hoisted_80 = { class: "benefit-stats" }
const _hoisted_81 = { class: "stat-card" }
const _hoisted_82 = { class: "stat-value" }
const _hoisted_83 = { class: "stat-card" }
const _hoisted_84 = { class: "stat-value" }
const _hoisted_85 = { class: "dialog-footer" }

import { ref, watch, onMounted,onUnmounted,onBeforeMount,nextTick,computed, provide, inject, type Ref } from 'vue'
  import type { BrandConfig } from '@/config/brand'
  import { QuestionFilled,Connection, SuccessFilled, CircleCloseFilled, ArrowUp, ArrowDown, Plus, Select, Delete, Edit, InfoFilled, Setting, Loading, CopyDocument, Document } from '@element-plus/icons-vue'
  import { ElMessage,ElMessageBox } from 'element-plus'
  import type { CheckboxValueType } from 'element-plus'
  import CozeAgentConfig from '@/components/settings/CozeAgentConfig.vue'
  import { testExternalApiConnection } from '@/api/external-api'
  import type { CozeAgent } from '@/types/coze'
  import { useRouter } from 'vue-router'
  import { saveConfig, getConfig, headers as apiHeaders, API_BASE_URL } from '@/api/config'
  import { testAgent } from '@/api/coze'
  import GreetingConfig from '@/components/settings/GreetingConfig.vue'
  import VoiceConfig from '@/components/settings/VoiceConfig.vue'
  import VoiceLibrary from '@/components/settings/VoiceLibrary.vue'
  import SettingsBackup from '@/components/settings/SettingsBackup.vue'
  import { getPlatformIconPath } from '@/utils/iconImages'
  import { useRuntimeCapabilityStore } from '@/store/runtimeCapabilities'
  import {
    isMacStrictRuntime as resolveMacStrictRuntime,
    isSettingsConfigAvailable as resolveSettingsConfigAvailable,
    isSettingsSectionAvailable as resolveSettingsSectionAvailable
  } from '@/runtime/capabilities'
  import { debounce } from 'lodash'
  // 添加组件名称定义
  import mitt from 'mitt'
interface CozeSettings {
    token: string
    hasToken?: boolean
    tokenLastUpdated?: string
  }
  interface RestTimeSettings {
    startTime: number
    endTime: number
    selectedTasks: string[]
  }
  // 定义平台类型
  type PlatformType = 'DeepSeek' | '通义千问' | '硅基流动';

  interface ModelSettings {
    platform: PlatformType;
    platformConfigs: {
      [key in PlatformType]: PlatformConfig;
    };
  }
  interface ChatHistorySettings {
    autoSave: boolean
    includeContext: boolean
    contextCount : number
    includeUserInfo: boolean
    autoSplitMode: 'none' | 'double_newline' | 'triple_newline'
    // 消息合并回复配置
    messageMerge: {
      mode: 'none' | 'context' | 'concat'  // 不合并、上下文方式、字符拼接方式
      interval: number  // 消息监听间隔(秒)
    }
    // 添加转人工配置
    transferConfig: {
      phrases: string[]
      notifyWechat: string
      notSendToCustomer?: boolean
    }
  }

  // 定义朋友圈设置类型
  interface MomentSettings {
    agentId: string
    commentLimit: number
    perFriendLimit: number
    autoLike: boolean
    interactionMode: string
    prompt: string
    blacklist: string
  }
  interface PlatformConfig {
    baseUrl: string;
    apiKey: string;
    modelName: string;
  }
  const totalIntervals = 96

// 将间隔数转换为时间字符串

export default /*@__PURE__*/_defineComponent({
  ...{
    name: 'SettingsPage'
  },
  __name: 'SettingsPage',
  setup(__props) {

  
  
  const brandConfig = inject<Ref<BrandConfig>>('brandConfig', ref({} as BrandConfig))
  const runtimeCapabilityStore = useRuntimeCapabilityStore()
  const isMacStrictRuntime = computed(() => (
    resolveMacStrictRuntime(
      runtimeCapabilityStore.mode,
      runtimeCapabilityStore.snapshot?.platform
    )
  ))
  const allowedGreetingTypes = computed(() => {
    if (!isMacStrictRuntime.value) return undefined
    const favorite = runtimeCapabilityStore.snapshot
      ?.capabilities['message.send_favorite']
    const favoriteAvailable = favorite?.status === 'supported'
      || favorite?.status === 'experimental'
    return favoriteAvailable
      ? ['text', 'file', 'agent', 'favorite'] as const
      : ['text', 'file', 'agent'] as const
  })
  const isSettingsSectionAvailable = (sectionId: string) => (
    resolveSettingsSectionAvailable(
      sectionId,
      runtimeCapabilityStore.mode,
      runtimeCapabilityStore.snapshot?.platform
    )
  )
  
  const difySettings = ref({
    baseUrl: ''
  })
  
  const aiSettingsExpanded = ref(false)
  const showMorePlatforms = ref(false)
  const testAgentDialogVisible = ref(false)
    const testAgentForm = ref({
      agentId: ''
  })
  // 清除会话缓存相关变量
  const clearCacheDialogVisible = ref(false)
  const clearingCache = ref(false)
  // 添加话术输入相关变量
  const phraseInputVisible = ref(false)
  const phraseInputValue = ref('')
  const phraseInputRef = ref<HTMLInputElement | null>(null)
  const showTestAgentDialog = () => {
  if (!cozeAgents.value?.length) {
    ElMessage.warning('请先添加一个智能体')
    return
  }
  
    testAgentForm.value.agentId = cozeAgents.value[0].botId
    
    testAgentDialogVisible.value = true
  }
  // 外部API配置
  const externalApiSettings = ref({
    identifier: ''
  })
  const testingConnection = ref(false)
  const connectionStatus = ref<{success: boolean, message: string} | null>(null)
  // 添加自动保存 Dify 配置的方法
  const autoSaveDifySettings = debounce(async () => {
    try {
      await saveConfig('dify_settings', difySettings.value)
      ElMessage.success('Dify配置已保存')
    } catch (error) {
      console.error('保存Dify配置失败:', error)
      ElMessage.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, 500)
  // 添加自动保存 Coze 配置的方法
  const autoSaveCozeSettings = debounce(async () => {
    try {
      const submittedToken = cozeSettings.value.token.trim()
      // 更新最后更新时间
      cozeSettings.value.tokenLastUpdated = new Date().toISOString()
      const result = await saveConfig('coze_settings',
      {
        "coze_settings": {
          "token": submittedToken,
          "tokenLastUpdated": cozeSettings.value.tokenLastUpdated,
      }})
      cozeSettings.value.hasToken = Boolean(
        cozeSettings.value.hasToken || submittedToken
      )
      if (isMacStrictRuntime.value && submittedToken) {
        cozeSettings.value.token = ''
      }
      ElMessage.success(
        result.restartRequired
          ? 'Coze配置已保存，重启客户端后生效'
          : 'Coze配置已保存'
      )
    } catch (error) {
      console.error('保存Coze配置失败:', error)
      ElMessage.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, 500)
  // 导航项配置
  const allNavItems = [
  { id: 'agent-settings', name: '智能体管理' },
  { id: 'greeting-settings', name: '话术组配置' },
  { id: 'chat-history-settings', name: 'AI回复配置' },
  { id: 'ai-settings', name: 'AI接入设置' },
  { id: 'voice-settings', name: 'AI语音配置' },
  { id: 'voice-library', name: '我的音色' },
  { id: 'moment-settings', name: '朋友圈评论' },
  // { id: 'external-api-settings', name: '外部API配置' },
  { id: 'feishu-settings', name: '飞书通知' },
  { id: 'file-library-settings', name: '文件库' },
  { id: 'rest-time-settings', name: '休息时间' }
]
const navItems = computed(() => (
  allNavItems.filter(item => isSettingsSectionAvailable(item.id))
))

// 添加格式化 ID 的方法
const formatId = (id: string) => {
  if (!id || id.length <= 10) return id;
  return `${id.substring(0, 5)}******${id.substring(id.length - 5)}`;
}
const isNarrowScreen = ref(window.innerWidth <= 650)
const activeSection = ref('agent-settings')
const contentRef = ref<HTMLElement | null>(null)
const isScrollingProgrammatically = ref(false) // 添加标志
// 滚动到指定区域
const scrollToSection = (sectionId: string) => {
  isScrollingProgrammatically.value = true // 设置标志
  activeSection.value = sectionId
  const element = document.getElementById(sectionId)
  if (element) {
    const offset = 20 // 设置一个偏移量，避免完全贴顶
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    const offsetPosition = elementPosition - offset
    
    contentRef.value?.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
    
    // 滚动完成后重置标志
    setTimeout(() => {
      isScrollingProgrammatically.value = false
    }, 800) // 给足够的时间完成平滑滚动
  } else {
    isScrollingProgrammatically.value = false
  }
}
// 添加窗口大小变化处理函数
const handleResize = () => {
  isNarrowScreen.value = window.innerWidth <= 650
}

// ==================== 文件库 ====================
const fileLibraryList = ref<any[]>([])
const fileLibraryLoading = ref(false)
const fileLibraryDialogVisible = ref(false)
const fileLibraryUploading = ref(false)
const fileLibraryUploadRef = ref<any>(null)
const fileLibraryKeyError = ref('')
const fileLibraryForm = ref({ key: '', description: '', file: null as File | null })
const fileDetailDialogVisible = ref(false)
const fileDetailItem = ref<any>(null)

const showFileDetail = (row: any) => {
  fileDetailItem.value = row
  fileDetailDialogVisible.value = true
}

const loadFileLibrary = async () => {
  fileLibraryLoading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/api/file_library/list`, { headers: apiHeaders })
    const data = await res.json()
    if (data.success) fileLibraryList.value = data.data
  } catch (e) {
    console.error('加载文件库失败', e)
  } finally {
    fileLibraryLoading.value = false
  }
}

const checkFileLibraryKey = async () => {
  const key = fileLibraryForm.value.key.trim()
  fileLibraryKeyError.value = ''
  if (!key) return
  try {
    const res = await fetch(`${API_BASE_URL}/api/file_library/check?key=${encodeURIComponent(key)}`, { headers: apiHeaders })
    const data = await res.json()
    if (data.exists) fileLibraryKeyError.value = `标识「${key}」已存在，请换一个`
  } catch (e) {
    console.error('检查key失败', e)
  }
}

const onFileLibraryFileChange = (uploadFile: any) => {
  fileLibraryForm.value.file = uploadFile.raw as File
}

const submitFileLibraryUpload = async () => {
  const key = fileLibraryForm.value.key.trim()
  if (!key) { ElMessage.warning('请填写文件标识'); return }
  if (fileLibraryKeyError.value) { ElMessage.warning(fileLibraryKeyError.value); return }
  if (!fileLibraryForm.value.file) { ElMessage.warning('请选择要上传的文件'); return }

  fileLibraryUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', fileLibraryForm.value.file)
    fd.append('key', key)
    fd.append('description', fileLibraryForm.value.description)

    // FormData 上传不能带 Content-Type，只传 X-API-Key
    const res = await fetch(`${API_BASE_URL}/api/file_library/upload`, {
      method: 'POST',
      headers: { 'X-API-Key': apiHeaders['X-API-Key'] },
      body: fd,
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('文件已添加到文件库')
      fileLibraryDialogVisible.value = false
      fileLibraryForm.value = { key: '', description: '', file: null }
      fileLibraryKeyError.value = ''
      fileLibraryUploadRef.value?.clearFiles()
      await loadFileLibrary()
    } else {
      ElMessage.error(data.error || '上传失败')
    }
  } catch (e) {
    ElMessage.error('上传失败，请重试')
  } finally {
    fileLibraryUploading.value = false
  }
}

const deleteFileLibraryItem = async (key: string) => {
  try {
    await ElMessageBox.confirm(`确认删除文件库中的「${key}」？删除后工作流将无法发送该文件。`, '删除确认', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
    })
  } catch { return }

  try {
    const res = await fetch(`${API_BASE_URL}/api/file_library/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: apiHeaders,
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('已删除')
      await loadFileLibrary()
    } else {
      ElMessage.error(data.error || '删除失败')
    }
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

const copyFileKey = (key: string) => {
  const refStr = `[send_file:${key}]`
  navigator.clipboard.writeText(refStr).then(() => {
    ElMessage.success(`已复制：${refStr}`)
  }).catch(() => {
    ElMessage.info(`请手动复制：${refStr}`)
  })
}

const formatUploadTime = (iso: string) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}
// ===================================================

// 优化滚动监听逻辑
const handleScroll = () => {
  if (!contentRef.value || isScrollingProgrammatically.value) return // 添加检查
  
  const sections = navItems.value.map(item => ({
    id: item.id,
    element: document.getElementById(item.id)
  }))
  // 获取可视区域高度
  const viewportHeight = window.innerHeight
  
  // 找到当前在视口中最靠上的部分
  let currentSection = sections[0]
  let minDistance = Infinity
  
  sections.forEach(section => {
    if (!section.element) return
    const rect = section.element.getBoundingClientRect()
    // 计算元素顶部到视口顶部的距离
    const distance = Math.abs(rect.top)
    
    // 如果元素在视口内且距离顶部最近
    if (rect.top <= viewportHeight / 3 && distance < minDistance) {
      minDistance = distance
      currentSection = section
    }
  })
  
  if (currentSection) {
    activeSection.value = currentSection.id
  }
}
  // 定义设置类型
  const feishuSettings = ref({
    appId: '',
    appSecret: '',
    phone: ''
  })
  // 用于比较Token是否发生变化
  const initialCozeToken = ref<string>('');
  const initialCozeTokenLastUpdated = ref<string | undefined>(undefined);
  // 初始化朋友圈设置状态
  const momentSettings = ref<MomentSettings>({
    agentId: '',
    commentLimit: 100,
    perFriendLimit: 2,
    autoLike: false,
    interactionMode: 'like_and_comment',
    blacklist: '', 
    prompt: ``
  })
  // 初始化聊天记录配置状态
  const chatHistorySettings = ref<ChatHistorySettings>({
    autoSave: false,
    includeContext: true,
    contextCount:5,
    includeUserInfo: false,
    autoSplitMode: 'double_newline',
    // 消息合并回复配置默认值
    messageMerge: {
      mode: 'none',
      interval: 5
    },
    // 添加转人工配置默认值
    transferConfig: {
      phrases: [],
      notifyWechat: "",
      notSendToCustomer: false
    }
  })
  // 添加路由实例
  const router = useRouter()
  const testing = ref(false)
  // 添加路由守卫
  router.beforeEach(async (to, from, next) => {
    if (to.name === 'settings') {
      await loadSettings()
    }
    next()
  })
  const saveFeishuSettings = async () => {
    try {
      const result = await saveConfig('feishu_settings', { feishu_settings: feishuSettings.value })
      if (result.success) {
        ElMessage.success('飞书设置已保存')
      } else {
        throw new Error('飞书设置保存失败')
      }
    } catch (error) {
      console.error('飞书设置保存失败:', error)
      ElMessage.error('飞书设置保存失败')
    }
  }
  const handleFeishuAppIdBlur = async () => {
    const val = (feishuSettings.value.appId || '').trim()
    if (!val.startsWith('cli_')) {
      ElMessage.warning('APP ID 必须以 cli_ 开头')
      return
    }
    await saveFeishuSettings()
  }
  const handleFeishuSecretBlur = async () => {
    const val = (feishuSettings.value.appSecret || '').trim()
    if (val.length <= 10) {
      ElMessage.warning('App Secret 长度必须大于 10')
      return
    }
    await saveFeishuSettings()
  }
  const handleFeishuPhoneInput = () => {
    feishuSettings.value.phone = (feishuSettings.value.phone || '').replace(/\D/g, '').slice(0, 11)
  }
  const handleFeishuPhoneBlur = async () => {
    const val = (feishuSettings.value.phone || '').trim()
    if (!/^\d{11}$/.test(val)) {
      ElMessage.warning('手机号必须为 11 位大陆手机号')
      return
    }
    await saveFeishuSettings()
  }
  // 同步转人工话术到回复过滤词
  const syncTransferPhrasesToFilterWords = async () => {
    try {
      const result = await getConfig('reply_strategy_v2')
      let strategyConfig = result?.success && result?.data ? result.data : { staffList: [], commonConfig: { filterWords: [] } }
      
      if (!strategyConfig.commonConfig) {
        strategyConfig.commonConfig = { filterWords: [] }
      }
      if (!strategyConfig.commonConfig.filterWords) {
        strategyConfig.commonConfig.filterWords = []
      }
      
      const filterWords = strategyConfig.commonConfig.filterWords
      const phrases = chatHistorySettings.value.transferConfig.phrases
      
      let isChanged = false
      
      if (chatHistorySettings.value.transferConfig.notSendToCustomer) {
        // 勾选状态下：把所有 phrases 加进去
        phrases.forEach(phrase => {
          if (!filterWords.includes(phrase)) {
            filterWords.push(phrase)
            isChanged = true
          }
        })
      } else {
        // 取消勾选时：把 phrases 从 filterWords 中移除
        phrases.forEach(phrase => {
          const index = filterWords.indexOf(phrase)
          if (index > -1) {
            filterWords.splice(index, 1)
            isChanged = true
          }
        })
      }
      
      if (isChanged) {
        await saveConfig('reply_strategy_v2', strategyConfig)
      }
    } catch (error) {
      console.error('同步回复过滤词失败:', error)
    }
  }

  const handleNotSendToCustomerChange = async (val: CheckboxValueType) => {
    await saveChatHistorySettings()
    await syncTransferPhrasesToFilterWords()
  }

  // 显示话术输入框
  const addPhraseItem = () => {
    if (chatHistorySettings.value.transferConfig.phrases.length < 3) {
      phraseInputVisible.value = true
      nextTick(() => {
        phraseInputRef.value?.focus()
      })
    }
  }
  // 确认添加话术
  const confirmPhrase = async () => {
    if (phraseInputValue.value.trim()) {
      if (!chatHistorySettings.value.transferConfig.phrases.includes(phraseInputValue.value.trim())) {
        chatHistorySettings.value.transferConfig.phrases.push(phraseInputValue.value.trim())
        await saveChatHistorySettings()
        if (chatHistorySettings.value.transferConfig.notSendToCustomer) {
          await syncTransferPhrasesToFilterWords()
        }
      }
    }
    phraseInputVisible.value = false
    phraseInputValue.value = ''
  }
  // 删除识别话术
  const removePhraseItem = async (index: number) => {
    const removedPhrase = chatHistorySettings.value.transferConfig.phrases[index]
    chatHistorySettings.value.transferConfig.phrases.splice(index, 1)
    await saveChatHistorySettings()
    
    if (chatHistorySettings.value.transferConfig.notSendToCustomer) {
      try {
        const result = await getConfig('reply_strategy_v2')
        if (result?.success && result?.data?.commonConfig?.filterWords) {
          const filterWords = result.data.commonConfig.filterWords
          const wordIndex = filterWords.indexOf(removedPhrase)
          if (wordIndex > -1) {
            filterWords.splice(wordIndex, 1)
            await saveConfig('reply_strategy_v2', result.data)
          }
        }
      } catch (error) {
        console.error('删除同步回复过滤词失败:', error)
      }
    }
  }
  // 修改测试方法
  const testCozeAgent = async () => {
    if (!testAgentForm.value.agentId) {
      ElMessage.warning('请选择要测试的智能体')
      return
    }
    
    // 获取选中的智能体信息
    const selectedAgent = cozeAgents.value.find(agent => agent.botId === testAgentForm.value.agentId)
    if (!selectedAgent) {
      ElMessage.warning('未找到选中的智能体')
      return
    }
    
    // 检查平台配置
    if ((selectedAgent.platform || 'coze') === 'coze' && !cozeSettings.value.token) {
      ElMessage.warning('请先配置 Coze Token')
      return
    }
    if (selectedAgent.platform === 'coze3' && !selectedAgent.apiToken) {
      ElMessage.warning('请先配置该 Coze 3.0 Project 的 API Token')
      return
    }
    
    testing.value = true
    try {
      // 调用后端测试接口
      const result = await testAgent(selectedAgent.botId, selectedAgent.platform || 'coze')
      
      if (result.success) {
        ElMessage.success('测试通过！')
        testAgentDialogVisible.value = false
      } else {
        ElMessage.error(result.error || '测试失败')
      }
    } catch (error) {
      console.error('测试失败:', error)
      ElMessage.error(error instanceof Error ? error.message : '测试失败')
    } finally {
      testing.value = false
    }
  }
const saveMomentSettings = async () => {
  try {
    const result = await saveConfig('moment_settings', { moment_settings: momentSettings.value })
    if (result.success) {
      ElMessage.success('朋友圈设置保存成功')
    } else {
      throw new Error('保存失败')
    }
  } catch (error) {
    console.error('保存朋友圈设置失败:', error)
    ElMessage.error('保存朋友圈设置失败')
  }
}
const restTimeSettings = ref<RestTimeSettings>({
  startTime: 0, // 0:00 (in 15-min intervals from 0:00)
  endTime: 28, // 7:00
  selectedTasks: ['自动加好友', '自动通过好友'] // 默认选中的任务
})

const isDragging = ref<string | null>(null)
const timelineRef = ref<HTMLElement | null>(null)
const startTimeDisplay = ref('')
const endTimeDisplay = ref('')

// 任务选项
const allTaskOptions = [
  { id: 'moment_comment', name: '朋友圈评论', icon: '💬' },
  { id: 'add_friend', name: '自动加好友', icon: '👥' },
  { id: 'accept_friend', name: '自动通过好友', icon: '✅' }
]
const taskOptions = computed(() => (
  isMacStrictRuntime.value
    ? allTaskOptions.filter(task => task.id !== 'accept_friend')
    : allTaskOptions
))

// 总共96个15分钟间隔 (24小时 * 4)
const intervalToTime = (interval: number): string => {
  const hours = Math.floor(interval / 4)
  const minutes = (interval % 4) * 15
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

// 将时间字符串转换为间隔数
const timeToInterval = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 4 + minutes / 15
}

// 计算位置百分比
const getPosition = (interval: number): number => {
  return (interval / (totalIntervals - 1)) * 100
}

// 计算禁用时间范围
const disabledRange = computed(() => {
  const start = restTimeSettings.value.startTime
  const end = restTimeSettings.value.endTime
  
  if (start <= end) {
    return {
      start: getPosition(start),
      width: getPosition(end) - getPosition(start)
    }
  } else {
    // 跨越午夜的情况
    return [
      { start: 0, width: getPosition(end) },
      { start: getPosition(start), width: 100 - getPosition(start) }
    ]
  }
})

// 处理任务选择
const handleTaskToggle = (taskName: string) => {
  const tasks = restTimeSettings.value.selectedTasks
  if (tasks.includes(taskName)) {
    restTimeSettings.value.selectedTasks = tasks.filter(t => t !== taskName)
  } else {
    restTimeSettings.value.selectedTasks = [...tasks, taskName]
  }
  saveRestTimeSettings()
}

// 处理鼠标拖拽
const handleMouseDown = (type: string, e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = type
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !timelineRef.value) return

  const rect = timelineRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const interval = Math.round((x / rect.width) * (totalIntervals - 1))

  if (isDragging.value === 'start') {
    restTimeSettings.value.startTime = interval
    startTimeDisplay.value = intervalToTime(interval)
  } else if (isDragging.value === 'end') {
    restTimeSettings.value.endTime = interval
    endTimeDisplay.value = intervalToTime(interval)
  }
  saveRestTimeSettings()
}

const handleMouseUp = () => {
  isDragging.value = null
}

// 处理时间选择器变化
const handleStartTimeChange = (timeStr: string) => {
  restTimeSettings.value.startTime = timeToInterval(timeStr)
  saveRestTimeSettings()
}

const handleEndTimeChange = (timeStr: string) => {
  restTimeSettings.value.endTime = timeToInterval(timeStr)
  saveRestTimeSettings()
}

// 快捷设置
const setQuickTime = (start: number, end: number) => {
  restTimeSettings.value.startTime = start
  restTimeSettings.value.endTime = end
  startTimeDisplay.value = intervalToTime(start)
  endTimeDisplay.value = intervalToTime(end)
  saveRestTimeSettings()
}

// 保存休息时间设置
const saveRestTimeSettings = async () => {
  try {
    const result = await saveConfig('rest_time_settings', {
      rest_time_settings: restTimeSettings.value
    })
    if (result.success) {
      console.log('休息时间设置保存成功')
    }
  } catch (error) {
    console.error('保存休息时间设置失败:', error)
    ElMessage.error('保存失败')
  }
}
// 格式化显示（隐藏中间部分）
const formatIdentifierDisplay = (value: string) => {
  if (!value || value.length <= 8) return value
  return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4)
}

// 解析输入（保持原始值）
const parseIdentifierInput = (value: string) => {
  return value
}

// 处理标识符变更 - 优化交互体验
const handleIdentifierChange = debounce(async (value: string) => {
  // 确保保存的是原始输入值
  const trimmedValue = value.trim()
  externalApiSettings.value.identifier = trimmedValue
  
  // 修改条件：无论是否为空都要保存，但空值时清除连接状态
  try {
    await saveConfig('external_api_settings', {
      identifier: trimmedValue
    })
    connectionStatus.value = null // 清除之前的连接状态
    
    // 如果清空了输入框，显示提示
    if (!trimmedValue) {
      ElMessage.info('API标识符已清空')
    }
  } catch (error) {
    console.error('保存API配置失败:', error)
    ElMessage.error('保存失败')
  }
}, 1000)
// 测试API连接
const testApiConnection = async () => {
  if (!externalApiSettings.value.identifier) return
  
  testingConnection.value = true
  connectionStatus.value = null
  
  try {
    const result = await testExternalApiConnection(externalApiSettings.value.identifier)
    
    connectionStatus.value = {
      success: result.success,
      message: result.message
    }
    
    if (result.success) {
      ElMessage.success('API连接测试成功')
    } else {
      ElMessage.error(`连接测试失败: ${result.message}`)
    }
  } catch (error) {
    console.error('测试连接失败:', error)
    connectionStatus.value = {
      success: false,
      message: '网络错误或服务不可用'
    }
    ElMessage.error('测试连接失败')
  } finally {
    testingConnection.value = false
  }
}
// 添加保存聊天记录配置的方法
const saveChatHistorySettings = async () => {
  try {
    const result = await saveConfig('chat_history_settings', { 
      chat_history_settings: chatHistorySettings.value 
    })
    if (result.success) {
      ElMessage.success('聊天配置保存成功')
    } else {
      throw new Error('保存失败')
    }
  } catch (error) {
    console.error('保存聊天配置失败:', error)
    ElMessage.error('保存聊天配置失败')
  }
}


const deleteAgent = async (agent: CozeAgent) => {
  try {
    await ElMessageBox.confirm('确定要删除该智能体吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const updatedAgents = cozeAgents.value.filter(a => a.botId !== agent.botId)
    const result = await saveConfig('agents', { agents: updatedAgents })
    
    if (result.success) {
      cozeAgents.value = Array.isArray(result.data) ? result.data : updatedAgents
      ElMessage.success('删除成功')
    } else {
      throw new Error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除智能体失败:', error)
      ElMessage.error('删除智能体失败')
    }
  }
}
  
  // 初始化设置状态
  const cozeSettings = ref<CozeSettings>({
    token: '',
    hasToken: false,
    tokenLastUpdated: undefined
  })
  
  const modelSettings = ref<ModelSettings>({
  platform: 'DeepSeek',
  platformConfigs: {
    'DeepSeek': { baseUrl: '', apiKey: '', modelName: '' },
    '通义千问': { baseUrl: '', apiKey: '', modelName: '' },
    '硅基流动': { baseUrl: '', apiKey: '', modelName: '' }
  }
})

  const agentConfigVisible = ref(false)
  const cozeAgents = ref<CozeAgent[]>([])
  const editingAgent = ref<CozeAgent | null>(null)

  // 显示智能体配置
  const showAgentConfig = () => {
    editingAgent.value = null
    agentConfigVisible.value = true
  }

  const editAgent = (agent: CozeAgent) => {
    editingAgent.value = agent
    agentConfigVisible.value = true
  }

  watch(agentConfigVisible, (visible) => {
    if (!visible) editingAgent.value = null
  })
  
// 修改加载配置方法
const loadSettings = async () => {
  try {
    console.debug('开始加载配置...')
    const unavailableResult = { success: false, data: {} }
    const getPageConfig = (configType: string) => (
      !resolveSettingsConfigAvailable(
        configType,
        runtimeCapabilityStore.mode,
        runtimeCapabilityStore.snapshot?.platform
      )
        ? Promise.resolve(unavailableResult)
        : getConfig(configType)
    )
    const [agentsResult, cozeResult, modelResult,momentResult, greetingResult,chatHistoryResult,feishuConfig,difyResult,apiResult,restTimeResult] = await Promise.all([
      getPageConfig('agents'),
      getPageConfig('coze_settings'),
      getPageConfig('model_settings'),
      getPageConfig('moment_settings'),
      getPageConfig('greeting_config'),
      getPageConfig('chat_history_settings'),
      getPageConfig('feishu_settings'),
      getPageConfig('dify_settings'),
      getPageConfig('external_api_settings'),
      getPageConfig('rest_time_settings')
    ])
    // 处理 Dify 设置
    if (difyResult?.success && difyResult?.data) {
          difySettings.value = {
            baseUrl: difyResult.data.baseUrl
          }
        }
    /// 处理智能体配置
    if (agentsResult.success && agentsResult.data) {
      const agents = Array.isArray(agentsResult.data) ? agentsResult.data : 
                    Array.isArray(agentsResult.data.agents) ? agentsResult.data.agents : []
      
      // 添加类型注解并去重
      const uniqueAgents = new Map()
      agents.forEach((agent: { 
        name?: string, 
        botId?: string, 
        id?: string ,
        platform?: string,
        apiUrl?: string,
        apiToken?: string,
        hasApiToken?: boolean,
        deliveryMode?: 'sync_reply' | 'async_reply' | 'consume_only',
        responseFormat?: 'auto' | 'json' | 'sse',
        timeoutSeconds?: number,
        retryCount?: number
      }) => {
        if (agent.botId && !uniqueAgents.has(agent.botId)) {
          uniqueAgents.set(agent.botId, {
            name: agent.name || '',
            botId: agent.botId,
            id: agent.id,
            platform: agent.platform || 'coze',
            apiUrl: agent.apiUrl,
            apiToken: agent.apiToken,
            hasApiToken: agent.hasApiToken,
            deliveryMode: agent.deliveryMode,
            responseFormat: agent.responseFormat,
            timeoutSeconds: agent.timeoutSeconds,
            retryCount: agent.retryCount
          })
        }
      })
      
      cozeAgents.value = Array.from(uniqueAgents.values())
        .filter((agent: CozeAgent) => agent.name && agent.botId)
    }

    // 处理 Coze 设置
    if (cozeResult?.success && cozeResult?.data?.coze_settings) {
      cozeSettings.value = {
        token: cozeResult.data.coze_settings.token || '',
        hasToken: Boolean(
          cozeResult.data.coze_settings.hasToken ||
          cozeResult.data.coze_settings.token
        ),
        tokenLastUpdated: cozeResult.data.coze_settings.tokenLastUpdated // 加载最后更新日期
      };
      initialCozeToken.value = cozeSettings.value.token;
      initialCozeTokenLastUpdated.value = cozeSettings.value.tokenLastUpdated;
    }

    if (apiResult?.success && apiResult?.data?.identifier) {
      externalApiSettings.value.identifier = apiResult.data.identifier
    }
    // 处理模型设置
    if (modelResult.success && modelResult.data) {
      const savedSettings = modelResult.data.model_settings || {}
      
      // 合并保存的设置
      if (savedSettings.platformConfigs) {
        modelSettings.value = {
          platform: savedSettings.platform || 'DeepSeek',
          platformConfigs: {
            'DeepSeek': { baseUrl: '', apiKey: '', modelName: '' },
            '通义千问': { baseUrl: '', apiKey: '', modelName: '' },
            '硅基流动': { baseUrl: '', apiKey: '', modelName: '' },
            ...savedSettings.platformConfigs
          }
        }
      }
    }

     // 处理朋友圈设置
     if (momentResult.success && momentResult.data) {
      momentSettings.value = {
        ...momentSettings.value,
        ...momentResult.data.moment_settings
      }
    }
    // 处理打招呼话术配置
    if (greetingResult.success && greetingResult.data) {
      // console.debug("打招呼配置记录：",greetingResult)
      // 通过 provide/inject 或事件总线更新 GreetingConfig 组件的数据
      // 这里需要配合 GreetingConfig 组件的实现方式来修改
      emitter.emit('updateGreetingConfig', greetingResult.data)
    }
     // 处理聊天记录配置
     if (chatHistoryResult.success && chatHistoryResult.data) {
      const savedSettings = chatHistoryResult.data.chat_history_settings
      chatHistorySettings.value = {
        ...chatHistorySettings.value,
        ...savedSettings,
        autoSplitMode: ['none', 'double_newline', 'triple_newline'].includes(savedSettings?.autoSplitMode)
          ? savedSettings.autoSplitMode
          : 'double_newline',
        transferConfig: {
          ...chatHistorySettings.value.transferConfig,
          ...(savedSettings?.transferConfig || {})
        }
      }
    }

    // 加载飞书设置
    if (feishuConfig?.success && feishuConfig?.data?.feishu_settings) {
      feishuSettings.value = {
        appId: feishuConfig.data.feishu_settings.appId || '',
        appSecret: feishuConfig.data.feishu_settings.appSecret || '',
        phone: feishuConfig.data.feishu_settings.phone || ''
      }
    }
    if (restTimeResult?.success && restTimeResult?.data?.rest_time_settings) {
      restTimeSettings.value = {
        ...restTimeSettings.value,
        ...restTimeResult.data.rest_time_settings
      }
      startTimeDisplay.value = intervalToTime(restTimeSettings.value.startTime)
      endTimeDisplay.value = intervalToTime(restTimeSettings.value.endTime)
    }
    return true
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败')
    return false
  }
}

const handleSettingsImported = async () => {
  const refreshed = await loadSettings()
  if (!refreshed) throw new Error('配置页刷新失败')
  await nextTick()
}

  onBeforeMount(() => {
  loadSettings()
})
const emitter = mitt()
// 将 emitter 提供给子组件
provide('emitter', emitter)
// 打开外部链接
const openExternalLink = (url: string) => {
  window.open(url, '_blank')
}

// 获取平台图标扩展名
// 获取平台ID标签
const getPlatformIdLabel = (platform?: string) => {
  if (platform === 'coze3') return 'Project ID'
  if (platform === 'dify') return 'API 秘钥'
  if (platform === 'fireflow') return 'API Token'
  if (platform === 'agentic') return '智能体 ID'
  return 'Bot ID'
}
// 计算Token已绑定的天数
const daysTokenBound = computed(() => {
  if (cozeSettings.value.token && cozeSettings.value.tokenLastUpdated) {
    const lastUpdated = new Date(cozeSettings.value.tokenLastUpdated);
    const current = new Date();

    // 标准化到当天的开始时间进行比较
    const lastUpdatedStartOfDay = new Date(lastUpdated.getFullYear(), lastUpdated.getMonth(), lastUpdated.getDate());
    const currentStartOfDay = new Date(current.getFullYear(), current.getMonth(), current.getDate());

    const diffTime = currentStartOfDay.getTime() - lastUpdatedStartOfDay.getTime();
    // 计算两个日期开始时间之间的完整天数差
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 

    return diffDays + 1; // 返回 "第x天"
  }
  return 0; // 如果没有token或更新日期，则返回0
});

// 清除会话缓存相关方法
const showClearCacheDialog = () => {
  clearCacheDialogVisible.value = true
}

const handleClearCacheDialogClose = () => {
  clearCacheDialogVisible.value = false
}

const clearCozeCache = async () => {
  try {
    clearingCache.value = true
    
    // 调用后端API清除缓存文件
    const response = await fetch('/api/coze/clear-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'yoko_test'
      }
    })
    
    const result = await response.json()
    
    if (result.success) {
      ElMessage.success('Coze会话缓存已清除')
      clearCacheDialogVisible.value = false
    } else {
      ElMessage.error(result.error || '清除缓存失败')
    }
  } catch (error) {
    console.error('清除缓存失败:', error)
    ElMessage.error('清除缓存失败')
  } finally {
    clearingCache.value = false
  }
}
const benefitDialogVisible = ref(false)
const benefitLoading = ref(false)
const benefitInfo = ref<{ user_level?: string; effective?: { used?: number; total?: number } }>({})
const showBenefitDialog = async () => {
  if (!cozeSettings.value.token) return
  benefitDialogVisible.value = true
  benefitLoading.value = true
  try {
    const res = await fetch('/api/coze/benefits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'yoko_test'
      },
      body: JSON.stringify({ token: cozeSettings.value.token })
    })
    const data = await res.json()
    if (data.success) {
      benefitInfo.value = data
    } else {
      ElMessage.error(data.error || '查询失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    benefitLoading.value = false
  }
}
const levelLabel = computed(() => {
  const lv = benefitInfo.value.user_level || ''
  if (lv === 'free') return '个人免费版'
  if (lv === 'pro_personal') return '个人付费版'
  if (lv === 'team') return '企业标准版'
  if (lv === 'enterprise') return '企业旗舰版'
  return lv || '未知'
})
const levelTagType = computed(() => {
  const lv = benefitInfo.value.user_level || ''
  if (lv === 'free') return 'info'
  if (lv === 'pro_personal') return 'success'
  if (lv === 'team') return 'warning'
  if (lv === 'enterprise') return 'danger'
  return 'info'
})
const progressPercent = computed(() => {
  const used = benefitInfo.value.effective?.used || 0
  const total = benefitInfo.value.effective?.total || 0
  if (!total) return 0
  const p = Math.min(100, Math.max(0, Math.round((used / total) * 100)))
  return p
})
  // 组件挂载时加载设置
  onMounted(async () => {
    try {
      contentRef.value?.addEventListener('scroll', handleScroll)
      await loadSettings()
      await nextTick()
    } catch (error) {
      console.error('组件挂载时加载配置失败:', error)
    }
    if (isSettingsSectionAvailable('file-library-settings')) {
      loadFileLibrary()
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    // 添加鼠标事件监听
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    // 初始化显示值
    startTimeDisplay.value = intervalToTime(restTimeSettings.value.startTime)
    endTimeDisplay.value = intervalToTime(restTimeSettings.value.endTime)
    
  })
    // 组件卸载时移除事件监听
  onUnmounted(() => {
    contentRef.value?.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  })
  
  
return (_ctx: any,_cache: any) => {
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_collapse_transition = _resolveComponent("el-collapse-transition")!
  const _component_el_card = _resolveComponent("el-card")!
  const _component_el_empty = _resolveComponent("el-empty")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_tooltip = _resolveComponent("el-tooltip")!
  const _component_el_input_number = _resolveComponent("el-input-number")!
  const _component_el_divider = _resolveComponent("el-divider")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_table_column = _resolveComponent("el-table-column")!
  const _component_el_table = _resolveComponent("el-table")!
  const _component_el_descriptions_item = _resolveComponent("el-descriptions-item")!
  const _component_el_descriptions = _resolveComponent("el-descriptions")!
  const _component_el_dialog = _resolveComponent("el-dialog")!
  const _component_el_upload = _resolveComponent("el-upload")!
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_progress = _resolveComponent("el-progress")!
  const _directive_loading = _resolveDirective("loading")!

  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createElementVNode("div", _hoisted_1, [
      _withDirectives(_createElementVNode("div", _hoisted_2, [
        _createElementVNode("div", _hoisted_3, [
          _createVNode(_component_el_icon, null, {
            default: _withCtx(() => [
              _createVNode(_unref(Setting))
            ]),
            _: 1
          }),
          _cache[43] || (_cache[43] = _createTextVNode(" 配置导航 ", -1))
        ]),
        _createElementVNode("div", _hoisted_4, [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(navItems.value, (item) => {
            return (_openBlock(), _createElementBlock("div", {
              key: item.id,
              class: _normalizeClass(["nav-item", { active: activeSection.value === item.id }]),
              onClick: ($event: any) => (scrollToSection(item.id))
            }, _toDisplayString(item.name), 11, _hoisted_5))
          }), 128))
        ]),
        (!isMacStrictRuntime.value)
          ? (_openBlock(), _createElementBlock("div", _hoisted_6, [
              _createVNode(SettingsBackup, { "after-import": handleSettingsImported })
            ]))
          : _createCommentVNode("", true)
      ], 512), [
        [_vShow, !isNarrowScreen.value]
      ]),
      _createElementVNode("div", {
        class: _normalizeClass(["settings-content", { 'full-width': isNarrowScreen.value }]),
        ref_key: "contentRef",
        ref: contentRef
      }, [
        (isNarrowScreen.value && !isMacStrictRuntime.value)
          ? (_openBlock(), _createElementBlock("div", _hoisted_7, [
              _createVNode(SettingsBackup, {
                compact: "",
                "after-import": handleSettingsImported
              })
            ]))
          : _createCommentVNode("", true),
        _createVNode(_component_el_card, {
          id: "ai-settings",
          class: _normalizeClass(["setting-card collapsible-setting-card", { 'is-collapsed': !aiSettingsExpanded.value }])
        }, {
          header: _withCtx(() => [
            _createElementVNode("button", {
              type: "button",
              class: "card-header collapsible-card-header",
              "aria-expanded": aiSettingsExpanded.value,
              onClick: _cache[0] || (_cache[0] = ($event: any) => (aiSettingsExpanded.value = !aiSettingsExpanded.value))
            }, [
              _cache[44] || (_cache[44] = _createElementVNode("span", null, "AI接入配置", -1)),
              _createVNode(_component_el_icon, {
                class: _normalizeClass(["collapse-icon", { expanded: aiSettingsExpanded.value }])
              }, {
                default: _withCtx(() => [
                  _createVNode(_unref(ArrowDown))
                ]),
                _: 1
              }, 8, ["class"])
            ], 8, _hoisted_8)
          ]),
          default: _withCtx(() => [
            _createElementVNode("div", _hoisted_9, [
              _createElementVNode("h4", _hoisted_10, [
                _createElementVNode("span", {
                  class: "platform-title-content",
                  title: "点击跳转coze",
                  onClick: _cache[1] || (_cache[1] = ($event: any) => (openExternalLink('https://code.coze.cn/playground')))
                }, [
                  _createElementVNode("img", {
                    src: _unref(getPlatformIconPath)('coze'),
                    alt: "Coze",
                    class: "platform-icon"
                  }, null, 8, _hoisted_11),
                  _cache[45] || (_cache[45] = _createTextVNode(" Coze平台 ", -1))
                ]),
                (!isMacStrictRuntime.value)
                  ? (_openBlock(), _createBlock(_component_el_button, {
                      key: 0,
                      type: "info",
                      size: "small",
                      plain: "",
                      class: "clear-cache-btn",
                      onClick: showClearCacheDialog
                    }, {
                      default: _withCtx(() => [...(_cache[46] || (_cache[46] = [
                        _createTextVNode(" 清除会话缓存 ", -1)
                      ]))]),
                      _: 1
                    }))
                  : _createCommentVNode("", true)
              ]),
              _createVNode(_component_el_form, {
                model: cozeSettings.value,
                "label-width": "120px"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_form_item, { label: "Coze Token" }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_input, {
                        modelValue: cozeSettings.value.token,
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((cozeSettings.value.token) = $event)),
                        type: "password",
                        "show-password": "",
                        onKeydown: _cache[3] || (_cache[3] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])),
                        placeholder: cozeSettings.value.hasToken ? '已配置，输入新 Token 可替换' : '请输入Coze Token',
                        onInput: _unref(autoSaveCozeSettings)
                      }, null, 8, ["modelValue", "placeholder", "onInput"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["model"])
            ]),
            (!isMacStrictRuntime.value)
              ? (_openBlock(), _createElementBlock("div", _hoisted_12, [
                  _createVNode(_component_el_button, {
                    type: "primary",
                    link: "",
                    onClick: _cache[4] || (_cache[4] = ($event: any) => (showMorePlatforms.value = !showMorePlatforms.value))
                  }, {
                    default: _withCtx(() => [
                      _createTextVNode(_toDisplayString(showMorePlatforms.value ? '收起更多平台' : '更多平台') + " ", 1),
                      _createVNode(_component_el_icon, { class: "el-icon--right" }, {
                        default: _withCtx(() => [
                          (showMorePlatforms.value)
                            ? (_openBlock(), _createBlock(_unref(ArrowUp), { key: 0 }))
                            : (_openBlock(), _createBlock(_unref(ArrowDown), { key: 1 }))
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  })
                ]))
              : _createCommentVNode("", true),
            (!isMacStrictRuntime.value)
              ? (_openBlock(), _createBlock(_component_el_collapse_transition, { key: 1 }, {
                  default: _withCtx(() => [
                    _withDirectives(_createElementVNode("div", _hoisted_13, [
                      _cache[47] || (_cache[47] = _createElementVNode("h4", { class: "platform-title" }, [
                        _createElementVNode("img", {
                          src: "/icon/dify.png",
                          alt: "Dify",
                          class: "platform-icon"
                        }),
                        _createTextVNode(" Dify平台 ")
                      ], -1)),
                      _createVNode(_component_el_form, {
                        model: difySettings.value,
                        "label-width": "120px"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_form_item, { label: "服务器地址" }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_input, {
                                modelValue: difySettings.value.baseUrl,
                                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((difySettings.value.baseUrl) = $event)),
                                placeholder: "如果是本地则默认可填入：http://localhost/v1",
                                onInput: _unref(autoSaveDifySettings)
                              }, null, 8, ["modelValue", "onInput"])
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      }, 8, ["model"])
                    ], 512), [
                      [_vShow, showMorePlatforms.value]
                    ])
                  ]),
                  _: 1
                }))
              : _createCommentVNode("", true)
          ]),
          _: 1
        }, 8, ["class"]),
        (isSettingsSectionAvailable('voice-settings'))
          ? (_openBlock(), _createBlock(_component_el_card, {
              key: 1,
              class: "setting-card",
              id: "voice-settings"
            }, {
              header: _withCtx(() => [...(_cache[48] || (_cache[48] = [
                _createElementVNode("div", { class: "card-header" }, [
                  _createElementVNode("span", null, "AI 语音平台配置")
                ], -1)
              ]))]),
              default: _withCtx(() => [
                _createVNode(VoiceConfig)
              ]),
              _: 1
            }))
          : _createCommentVNode("", true),
        (isSettingsSectionAvailable('voice-library'))
          ? (_openBlock(), _createBlock(_component_el_card, {
              key: 2,
              class: "setting-card",
              id: "voice-library"
            }, {
              header: _withCtx(() => [...(_cache[49] || (_cache[49] = [
                _createElementVNode("div", { class: "card-header" }, [
                  _createElementVNode("span", null, "我的音色")
                ], -1)
              ]))]),
              default: _withCtx(() => [
                _createVNode(VoiceLibrary)
              ]),
              _: 1
            }))
          : _createCommentVNode("", true),
        _createVNode(_component_el_card, {
          class: "setting-card",
          id: "agent-settings"
        }, {
          header: _withCtx(() => [
            _createElementVNode("div", _hoisted_14, [
              _cache[51] || (_cache[51] = _createElementVNode("span", null, "智能体管理", -1)),
              (!isMacStrictRuntime.value)
                ? (_openBlock(), _createBlock(_component_el_button, {
                    key: 0,
                    type: "primary",
                    size: "small",
                    icon: _unref(Connection),
                    loading: testing.value,
                    onClick: showTestAgentDialog
                  }, {
                    default: _withCtx(() => [...(_cache[50] || (_cache[50] = [
                      _createTextVNode(" 测试 ", -1)
                    ]))]),
                    _: 1
                  }, 8, ["icon", "loading"]))
                : _createCommentVNode("", true)
            ])
          ]),
          default: _withCtx(() => [
            _createElementVNode("div", _hoisted_15, [
              (cozeAgents.value.length)
                ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(cozeAgents.value, (agent) => {
                    return (_openBlock(), _createElementBlock("div", {
                      key: agent.botId,
                      class: "agent-item"
                    }, [
                      _createElementVNode("div", _hoisted_16, [
                        _createElementVNode("img", {
                          src: _unref(getPlatformIconPath)(agent.platform),
                          alt: agent.platform || 'coze',
                          class: "platform-icon"
                        }, null, 8, _hoisted_17),
                        _createElementVNode("div", _hoisted_18, [
                          _createElementVNode("span", _hoisted_19, _toDisplayString(agent.name), 1),
                          _createElementVNode("span", _hoisted_20, _toDisplayString(getPlatformIdLabel(agent.platform)) + ": " + _toDisplayString(formatId(agent.botId)), 1),
                          ((agent.platform === 'coze3' || agent.platform === 'agentic') && agent.apiUrl)
                            ? (_openBlock(), _createElementBlock("span", _hoisted_21, " API: " + _toDisplayString(agent.apiUrl), 1))
                            : _createCommentVNode("", true)
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_22, [
                        _createVNode(_component_el_button, {
                          type: "primary",
                          link: "",
                          icon: _unref(Edit),
                          onClick: ($event: any) => (editAgent(agent))
                        }, {
                          default: _withCtx(() => [...(_cache[52] || (_cache[52] = [
                            _createTextVNode(" 修改 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["icon", "onClick"]),
                        _createVNode(_component_el_button, {
                          type: "danger",
                          link: "",
                          onClick: ($event: any) => (deleteAgent(agent))
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
                      ])
                    ]))
                  }), 128))
                : (_openBlock(), _createBlock(_component_el_empty, {
                    key: 1,
                    description: "暂无配置的智能体"
                  }))
            ]),
            _createElementVNode("div", _hoisted_23, [
              _createVNode(_component_el_button, {
                type: "primary",
                icon: _unref(Plus),
                onClick: showAgentConfig
              }, {
                default: _withCtx(() => [...(_cache[53] || (_cache[53] = [
                  _createTextVNode(" 添加智能体 ", -1)
                ]))]),
                _: 1
              }, 8, ["icon"])
            ])
          ]),
          _: 1
        }),
        (isSettingsSectionAvailable('moment-settings'))
          ? (_openBlock(), _createBlock(_component_el_card, {
              key: 3,
              class: "setting-card",
              id: "moment-settings"
            }, {
              header: _withCtx(() => [...(_cache[54] || (_cache[54] = [
                _createElementVNode("div", { class: "card-header" }, [
                  _createElementVNode("span", null, "朋友圈黑名单")
                ], -1)
              ]))]),
              default: _withCtx(() => [
                _createElementVNode("div", _hoisted_24, [
                  _createVNode(_component_el_form, {
                    model: momentSettings.value,
                    "label-width": "120px"
                  }, {
                    default: _withCtx(() => [
                      _createElementVNode("div", _hoisted_25, [
                        _createElementVNode("div", _hoisted_26, [
                          _createVNode(_component_el_icon, null, {
                            default: _withCtx(() => [
                              _createVNode(_unref(InfoFilled))
                            ]),
                            _: 1
                          })
                        ]),
                        _cache[55] || (_cache[55] = _createElementVNode("div", { class: "info-content" }, [
                          _createElementVNode("div", { class: "info-text" }, "黑名单用户跳过点赞&评论")
                        ], -1))
                      ]),
                      _createVNode(_component_el_input, {
                        modelValue: momentSettings.value.blacklist,
                        "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event: any) => ((momentSettings.value.blacklist) = $event)),
                        type: "textarea",
                        rows: 4,
                        placeholder: "黑名单用户默认不评论和点赞，多个黑名单中间用、隔开",
                        onChange: saveMomentSettings
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["model"])
                ])
              ]),
              _: 1
            }))
          : _createCommentVNode("", true),
        _createVNode(CozeAgentConfig, {
          visible: agentConfigVisible.value,
          "onUpdate:visible": _cache[7] || (_cache[7] = ($event: any) => ((agentConfigVisible).value = $event)),
          agents: cozeAgents.value,
          "onUpdate:agents": _cache[8] || (_cache[8] = ($event: any) => ((cozeAgents).value = $event)),
          "editing-agent": editingAgent.value,
          "allowed-platforms": isMacStrictRuntime.value ? ['coze', 'fireflow', 'agentic'] : undefined
        }, null, 8, ["visible", "agents", "editing-agent", "allowed-platforms"]),
        (isSettingsSectionAvailable('greeting-settings'))
          ? (_openBlock(), _createBlock(_component_el_card, {
              key: 4,
              class: "setting-card",
              id: "greeting-settings"
            }, {
              header: _withCtx(() => [...(_cache[56] || (_cache[56] = [
                _createElementVNode("div", { class: "card-header" }, [
                  _createElementVNode("span", null, "话术组配置（可配合智能体）")
                ], -1)
              ]))]),
              default: _withCtx(() => [
                _createVNode(GreetingConfig, { "allowed-types": allowedGreetingTypes.value }, null, 8, ["allowed-types"])
              ]),
              _: 1
            }))
          : _createCommentVNode("", true),
        _createVNode(_component_el_card, {
          class: "setting-card",
          id: "chat-history-settings"
        }, {
          header: _withCtx(() => [...(_cache[57] || (_cache[57] = [
            _createElementVNode("div", { class: "card-header" }, [
              _createElementVNode("span", null, "AI回复配置")
            ], -1),
            _createElementVNode("div", { class: "tip-text" }, "聊天记录自动保存本地data文件夹", -1)
          ]))]),
          default: _withCtx(() => [
            _createElementVNode("div", _hoisted_27, [
              _createVNode(_component_el_form, {
                model: chatHistorySettings.value,
                "label-width": "0px"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_form_item, { class: "chat-history-form-item" }, {
                    default: _withCtx(() => [
                      _cache[58] || (_cache[58] = _createElementVNode("span", { class: "form-item-label" }, "消息合并回复", -1)),
                      _createElementVNode("div", _hoisted_28, [
                        _createVNode(_component_el_select, {
                          modelValue: chatHistorySettings.value.messageMerge.mode,
                          "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event: any) => ((chatHistorySettings.value.messageMerge.mode) = $event)),
                          onChange: saveChatHistorySettings,
                          class: "merge-mode-select"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_option, {
                              label: "不合并",
                              value: "none"
                            }),
                            _createVNode(_component_el_option, {
                              label: "消息合并",
                              value: "concat"
                            })
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        _createVNode(_component_el_tooltip, {
                          content: "一个监听周期内，好友连续发消息可合并回复",
                          placement: "left"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_icon, { class: "help-icon" }, {
                              default: _withCtx(() => [
                                _createVNode(_unref(QuestionFilled))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ])
                    ]),
                    _: 1
                  }),
                  _createVNode(_component_el_form_item, { class: "chat-history-form-item" }, {
                    default: _withCtx(() => [
                      _cache[59] || (_cache[59] = _createElementVNode("span", { class: "form-item-label" }, "消息监听间隔(秒)", -1)),
                      _createElementVNode("div", _hoisted_29, [
                        _createVNode(_component_el_input_number, {
                          modelValue: chatHistorySettings.value.messageMerge.interval,
                          "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event: any) => ((chatHistorySettings.value.messageMerge.interval) = $event)),
                          min: 4,
                          max: 120,
                          step: 1,
                          onChange: saveChatHistorySettings,
                          class: "interval-input",
                          onKeydown: _cache[11] || (_cache[11] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"]))
                        }, null, 8, ["modelValue"]),
                        _createVNode(_component_el_tooltip, {
                          content: "读取会话列表的频率，默认5秒",
                          placement: "left"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_icon, { class: "help-icon" }, {
                              default: _withCtx(() => [
                                _createVNode(_unref(QuestionFilled))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ])
                    ]),
                    _: 1
                  }),
                  _createVNode(_component_el_form_item, { class: "chat-history-form-item" }, {
                    default: _withCtx(() => [
                      _cache[60] || (_cache[60] = _createElementVNode("span", { class: "form-item-label" }, "自动分割", -1)),
                      _createElementVNode("div", _hoisted_30, [
                        _createVNode(_component_el_select, {
                          modelValue: chatHistorySettings.value.autoSplitMode,
                          "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event: any) => ((chatHistorySettings.value.autoSplitMode) = $event)),
                          class: "merge-mode-select",
                          onChange: saveChatHistorySettings
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_option, {
                              label: "不分割",
                              value: "none"
                            }),
                            _createVNode(_component_el_option, {
                              label: "连续2个换行符",
                              value: "double_newline"
                            }),
                            _createVNode(_component_el_option, {
                              label: "连续3个换行符",
                              value: "triple_newline"
                            })
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        _createVNode(_component_el_tooltip, {
                          content: "AI 返回长文本时，按选定的连续换行数量拆成多条微信消息",
                          placement: "left"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_icon, { class: "help-icon" }, {
                              default: _withCtx(() => [
                                _createVNode(_unref(QuestionFilled))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ])
                    ]),
                    _: 1
                  }),
                  _createVNode(_component_el_divider, {
                    "border-style": "dashed",
                    style: {"margin":"28px 0","border-color":"#e4e7ed"}
                  }),
                  _createVNode(_component_el_form_item, { class: "transfer-form-item" }, {
                    default: _withCtx(() => [
                      _createElementVNode("div", _hoisted_31, [
                        _cache[62] || (_cache[62] = _createElementVNode("span", { class: "form-item-label" }, "转人工配置", -1)),
                        _createVNode(_component_el_checkbox, {
                          modelValue: chatHistorySettings.value.transferConfig.notSendToCustomer,
                          "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event: any) => ((chatHistorySettings.value.transferConfig.notSendToCustomer) = $event)),
                          onChange: handleNotSendToCustomerChange,
                          style: {"margin-left":"20px"}
                        }, {
                          default: _withCtx(() => [...(_cache[61] || (_cache[61] = [
                            _createTextVNode(" 转人工话术不发送客户 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _createElementVNode("div", _hoisted_32, [
                        _createElementVNode("div", _hoisted_33, [
                          _createElementVNode("div", _hoisted_34, [
                            _cache[64] || (_cache[64] = _createElementVNode("h3", null, "触发词", -1)),
                            _createVNode(_component_el_button, {
                              type: "primary",
                              size: "small",
                              icon: _unref(Plus),
                              onClick: addPhraseItem,
                              disabled: chatHistorySettings.value.transferConfig.phrases.length >= 3
                            }, {
                              default: _withCtx(() => [...(_cache[63] || (_cache[63] = [
                                _createTextVNode(" 添加 ", -1)
                              ]))]),
                              _: 1
                            }, 8, ["icon", "disabled"])
                          ]),
                          _cache[65] || (_cache[65] = _createElementVNode("p", { class: "description" }, "当AI回复命中触发词时，触发转人工通知", -1)),
                          _createElementVNode("div", _hoisted_35, [
                            _createElementVNode("div", _hoisted_36, [
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(chatHistorySettings.value.transferConfig.phrases, (phrase, index) => {
                                return (_openBlock(), _createBlock(_component_el_tag, {
                                  key: index,
                                  closable: "",
                                  onClose: ($event: any) => (removePhraseItem(index))
                                }, {
                                  default: _withCtx(() => [
                                    _createTextVNode(_toDisplayString(phrase), 1)
                                  ]),
                                  _: 2
                                }, 1032, ["onClose"]))
                              }), 128)),
                              (phraseInputVisible.value)
                                ? (_openBlock(), _createBlock(_component_el_input, {
                                    key: 0,
                                    ref_key: "phraseInputRef",
                                    ref: phraseInputRef,
                                    modelValue: phraseInputValue.value,
                                    "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event: any) => ((phraseInputValue).value = $event)),
                                    class: "phrase-input",
                                    size: "small",
                                    placeholder: "请输入触发词",
                                    onKeyup: _withKeys(confirmPhrase, ["enter"]),
                                    onBlur: confirmPhrase
                                  }, null, 8, ["modelValue"]))
                                : _createCommentVNode("", true)
                            ])
                          ])
                        ]),
                        _createElementVNode("div", _hoisted_37, [
                          _cache[66] || (_cache[66] = _createElementVNode("div", { class: "section-header" }, [
                            _createElementVNode("h3", null, "接收通知的微信会话")
                          ], -1)),
                          _cache[67] || (_cache[67] = _createElementVNode("p", { class: "description" }, "转人工通知将优先发送给该好友或群聊", -1)),
                          _createElementVNode("div", _hoisted_38, [
                            _createVNode(_component_el_input, {
                              modelValue: chatHistorySettings.value.transferConfig.notifyWechat,
                              "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event: any) => ((chatHistorySettings.value.transferConfig.notifyWechat) = $event)),
                              placeholder: "请输入接收通知的好友或群聊名称",
                              onChange: saveChatHistorySettings,
                              onKeydown: _cache[16] || (_cache[16] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"]))
                            }, null, 8, ["modelValue"])
                          ])
                        ])
                      ])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["model"])
            ])
          ]),
          _: 1
        }),
        (isSettingsSectionAvailable('feishu-settings'))
          ? (_openBlock(), _createBlock(_component_el_card, {
              key: 5,
              class: "setting-card",
              id: "feishu-settings"
            }, {
              header: _withCtx(() => [...(_cache[68] || (_cache[68] = [
                _createElementVNode("div", { class: "card-header" }, [
                  _createElementVNode("span", null, "飞书通知")
                ], -1)
              ]))]),
              default: _withCtx(() => [
                _createElementVNode("div", _hoisted_39, [
                  _createElementVNode("div", _hoisted_40, [
                    _createElementVNode("div", _hoisted_41, [
                      _createElementVNode("div", _hoisted_42, [
                        _createVNode(_component_el_icon, null, {
                          default: _withCtx(() => [
                            _createVNode(_unref(InfoFilled))
                          ]),
                          _: 1
                        })
                      ]),
                      _cache[69] || (_cache[69] = _createElementVNode("div", { class: "info-content" }, [
                        _createElementVNode("div", { class: "info-text" }, "配置飞书应用与账号，开启转人工等飞书提醒")
                      ], -1))
                    ])
                  ]),
                  _createVNode(_component_el_form, {
                    model: feishuSettings.value,
                    "label-width": "0"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_form_item, { class: "feishu-form-item" }, {
                        default: _withCtx(() => [
                          _createElementVNode("div", _hoisted_43, [
                            _cache[70] || (_cache[70] = _createElementVNode("span", { class: "form-item-label" }, "APP ID", -1)),
                            _createVNode(_component_el_input, {
                              modelValue: feishuSettings.value.appId,
                              "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event: any) => ((feishuSettings.value.appId) = $event)),
                              placeholder: "形如：cli_a9bfed9574f8dcd5",
                              onBlur: handleFeishuAppIdBlur,
                              onKeydown: _cache[18] || (_cache[18] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])),
                              class: "alert-input"
                            }, null, 8, ["modelValue"])
                          ])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { class: "feishu-form-item" }, {
                        default: _withCtx(() => [
                          _createElementVNode("div", _hoisted_44, [
                            _cache[71] || (_cache[71] = _createElementVNode("span", { class: "form-item-label" }, "App Secret", -1)),
                            _createVNode(_component_el_input, {
                              modelValue: feishuSettings.value.appSecret,
                              "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event: any) => ((feishuSettings.value.appSecret) = $event)),
                              type: "password",
                              "show-password": "",
                              placeholder: "应用密钥，长度需大于10",
                              onBlur: handleFeishuSecretBlur,
                              onKeydown: _cache[20] || (_cache[20] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])),
                              class: "alert-input"
                            }, null, 8, ["modelValue"])
                          ])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { class: "feishu-form-item" }, {
                        default: _withCtx(() => [
                          _createElementVNode("div", _hoisted_45, [
                            _cache[73] || (_cache[73] = _createElementVNode("span", { class: "form-item-label" }, "手机号", -1)),
                            _createVNode(_component_el_input, {
                              modelValue: feishuSettings.value.phone,
                              "onUpdate:modelValue": _cache[21] || (_cache[21] = ($event: any) => ((feishuSettings.value.phone) = $event)),
                              placeholder: "请输入飞书注册手机号",
                              maxlength: "11",
                              onInput: handleFeishuPhoneInput,
                              onBlur: handleFeishuPhoneBlur,
                              onKeydown: _cache[22] || (_cache[22] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])),
                              class: "alert-input"
                            }, {
                              prepend: _withCtx(() => [...(_cache[72] || (_cache[72] = [
                                _createTextVNode("+86", -1)
                              ]))]),
                              _: 1
                            }, 8, ["modelValue"])
                          ])
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }, 8, ["model"])
                ])
              ]),
              _: 1
            }))
          : _createCommentVNode("", true),
        (isSettingsSectionAvailable('file-library-settings'))
          ? (_openBlock(), _createBlock(_component_el_card, {
              key: 6,
              class: "setting-card",
              id: "file-library-settings"
            }, {
              header: _withCtx(() => [
                _createElementVNode("div", _hoisted_46, [
                  _cache[75] || (_cache[75] = _createElementVNode("span", null, "文件库", -1)),
                  _createVNode(_component_el_button, {
                    type: "primary",
                    size: "small",
                    icon: _unref(Plus),
                    onClick: _cache[23] || (_cache[23] = ($event: any) => (fileLibraryDialogVisible.value = true))
                  }, {
                    default: _withCtx(() => [...(_cache[74] || (_cache[74] = [
                      _createTextVNode(" 添加文件 ", -1)
                    ]))]),
                    _: 1
                  }, 8, ["icon"])
                ])
              ]),
              default: _withCtx(() => [
                _createElementVNode("div", _hoisted_47, [
                  _createElementVNode("div", _hoisted_48, [
                    _createElementVNode("div", _hoisted_49, [
                      _createVNode(_component_el_icon, null, {
                        default: _withCtx(() => [
                          _createVNode(_unref(InfoFilled))
                        ]),
                        _: 1
                      })
                    ]),
                    _cache[76] || (_cache[76] = _createElementVNode("div", { class: "info-content" }, [
                      _createElementVNode("p", null, [
                        _createTextVNode("上传文件，并在工作流中输出 "),
                        _createElementVNode("code", null, "[send_file:标识]"),
                        _createTextVNode(" 即可自动匹配文件并发送，适合保密文件或大文件发送")
                      ])
                    ], -1))
                  ]),
                  (fileLibraryLoading.value)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_50, [
                        _createVNode(_component_el_icon, { class: "is-loading" }, {
                          default: _withCtx(() => [
                            _createVNode(_unref(Loading))
                          ]),
                          _: 1
                        }),
                        _cache[77] || (_cache[77] = _createTextVNode(" 加载中... ", -1))
                      ]))
                    : (fileLibraryList.value.length === 0)
                      ? (_openBlock(), _createBlock(_component_el_empty, {
                          key: 1,
                          description: "暂无文件，点击「添加文件」上传",
                          "image-size": 60
                        }))
                      : (_openBlock(), _createBlock(_component_el_table, {
                          key: 2,
                          data: fileLibraryList.value,
                          style: {"width":"100%"},
                          size: "small"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_table_column, {
                              label: "标识 (Key)",
                              prop: "key",
                              "min-width": "110"
                            }, {
                              default: _withCtx(({ row }) => [
                                _createVNode(_component_el_tag, {
                                  type: "primary",
                                  size: "small",
                                  style: {"font-family":"monospace","max-width":"100%","overflow":"hidden","text-overflow":"ellipsis"}
                                }, {
                                  default: _withCtx(() => [
                                    _createTextVNode(_toDisplayString(row.key), 1)
                                  ]),
                                  _: 2
                                }, 1024)
                              ]),
                              _: 1
                            }),
                            _createVNode(_component_el_table_column, {
                              label: "文件名",
                              prop: "filename",
                              "show-overflow-tooltip": ""
                            }),
                            _createVNode(_component_el_table_column, {
                              label: "操作",
                              width: "110",
                              fixed: "right"
                            }, {
                              default: _withCtx(({ row }) => [
                                _createElementVNode("div", _hoisted_51, [
                                  _createVNode(_component_el_tooltip, {
                                    content: "复制引用格式",
                                    placement: "top"
                                  }, {
                                    default: _withCtx(() => [
                                      _createVNode(_component_el_button, {
                                        size: "small",
                                        icon: _unref(CopyDocument),
                                        circle: "",
                                        onClick: ($event: any) => (copyFileKey(row.key))
                                      }, null, 8, ["icon", "onClick"])
                                    ]),
                                    _: 2
                                  }, 1024),
                                  _createVNode(_component_el_tooltip, {
                                    content: "文件详情",
                                    placement: "top"
                                  }, {
                                    default: _withCtx(() => [
                                      _createVNode(_component_el_button, {
                                        size: "small",
                                        icon: _unref(Document),
                                        circle: "",
                                        onClick: ($event: any) => (showFileDetail(row))
                                      }, null, 8, ["icon", "onClick"])
                                    ]),
                                    _: 2
                                  }, 1024),
                                  _createVNode(_component_el_tooltip, {
                                    content: "删除文件",
                                    placement: "top"
                                  }, {
                                    default: _withCtx(() => [
                                      _createVNode(_component_el_button, {
                                        size: "small",
                                        type: "danger",
                                        icon: _unref(Delete),
                                        circle: "",
                                        onClick: ($event: any) => (deleteFileLibraryItem(row.key))
                                      }, null, 8, ["icon", "onClick"])
                                    ]),
                                    _: 2
                                  }, 1024)
                                ])
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }, 8, ["data"]))
                ])
              ]),
              _: 1
            }))
          : _createCommentVNode("", true),
        _createVNode(_component_el_dialog, {
          modelValue: fileDetailDialogVisible.value,
          "onUpdate:modelValue": _cache[26] || (_cache[26] = ($event: any) => ((fileDetailDialogVisible).value = $event)),
          title: "文件详情",
          width: "420px"
        }, {
          footer: _withCtx(() => [
            _createVNode(_component_el_button, {
              onClick: _cache[25] || (_cache[25] = ($event: any) => (fileDetailDialogVisible.value = false))
            }, {
              default: _withCtx(() => [...(_cache[79] || (_cache[79] = [
                _createTextVNode("关闭", -1)
              ]))]),
              _: 1
            })
          ]),
          default: _withCtx(() => [
            (fileDetailItem.value)
              ? (_openBlock(), _createBlock(_component_el_descriptions, {
                  key: 0,
                  column: 1,
                  border: "",
                  size: "small"
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_descriptions_item, { label: "标识 Key" }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_tag, {
                          type: "primary",
                          size: "small",
                          style: {"font-family":"monospace"}
                        }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(fileDetailItem.value.key), 1)
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }),
                    _createVNode(_component_el_descriptions_item, { label: "AI 引用格式" }, {
                      default: _withCtx(() => [
                        _createElementVNode("code", _hoisted_52, "[send_file:" + _toDisplayString(fileDetailItem.value.key) + "]", 1),
                        _createVNode(_component_el_button, {
                          link: "",
                          size: "small",
                          style: {"margin-left":"8px"},
                          onClick: _cache[24] || (_cache[24] = ($event: any) => (copyFileKey(fileDetailItem.value.key)))
                        }, {
                          default: _withCtx(() => [...(_cache[78] || (_cache[78] = [
                            _createTextVNode("复制", -1)
                          ]))]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }),
                    _createVNode(_component_el_descriptions_item, { label: "文件名" }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(fileDetailItem.value.filename), 1)
                      ]),
                      _: 1
                    }),
                    _createVNode(_component_el_descriptions_item, { label: "文件大小" }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(fileDetailItem.value.size_mb < 1 ? (fileDetailItem.value.size_mb * 1024).toFixed(0) + ' KB' : fileDetailItem.value.size_mb + ' MB'), 1)
                      ]),
                      _: 1
                    }),
                    _createVNode(_component_el_descriptions_item, { label: "文件状态" }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_tag, {
                          type: fileDetailItem.value.exists ? 'success' : 'danger',
                          size: "small"
                        }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(fileDetailItem.value.exists ? '正常' : '文件缺失'), 1)
                          ]),
                          _: 1
                        }, 8, ["type"])
                      ]),
                      _: 1
                    }),
                    _createVNode(_component_el_descriptions_item, { label: "上传时间" }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(formatUploadTime(fileDetailItem.value.upload_time)), 1)
                      ]),
                      _: 1
                    }),
                    (fileDetailItem.value.description)
                      ? (_openBlock(), _createBlock(_component_el_descriptions_item, {
                          key: 0,
                          label: "备注"
                        }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(fileDetailItem.value.description), 1)
                          ]),
                          _: 1
                        }))
                      : _createCommentVNode("", true)
                  ]),
                  _: 1
                }))
              : _createCommentVNode("", true)
          ]),
          _: 1
        }, 8, ["modelValue"]),
        _createVNode(_component_el_dialog, {
          modelValue: fileLibraryDialogVisible.value,
          "onUpdate:modelValue": _cache[31] || (_cache[31] = ($event: any) => ((fileLibraryDialogVisible).value = $event)),
          title: "添加文件到文件库",
          width: "480px",
          "close-on-click-modal": false
        }, {
          footer: _withCtx(() => [
            _createVNode(_component_el_button, {
              onClick: _cache[30] || (_cache[30] = ($event: any) => (fileLibraryDialogVisible.value = false))
            }, {
              default: _withCtx(() => [...(_cache[81] || (_cache[81] = [
                _createTextVNode("取消", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_el_button, {
              type: "primary",
              loading: fileLibraryUploading.value,
              onClick: submitFileLibraryUpload
            }, {
              default: _withCtx(() => [...(_cache[82] || (_cache[82] = [
                _createTextVNode(" 上传 ", -1)
              ]))]),
              _: 1
            }, 8, ["loading"])
          ]),
          default: _withCtx(() => [
            _createVNode(_component_el_form, {
              model: fileLibraryForm.value,
              "label-width": "80px",
              onSubmit: _cache[29] || (_cache[29] = _withModifiers(() => {}, ["prevent"]))
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_form_item, {
                  label: "标识 Key",
                  required: ""
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_input, {
                      modelValue: fileLibraryForm.value.key,
                      "onUpdate:modelValue": _cache[27] || (_cache[27] = ($event: any) => ((fileLibraryForm.value.key) = $event)),
                      placeholder: "如：产品手册、报价单（全局唯一）",
                      clearable: "",
                      onBlur: checkFileLibraryKey
                    }, null, 8, ["modelValue"]),
                    (fileLibraryKeyError.value)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_53, _toDisplayString(fileLibraryKeyError.value), 1))
                      : _createCommentVNode("", true)
                  ]),
                  _: 1
                }),
                _createVNode(_component_el_form_item, {
                  label: "选择文件",
                  required: ""
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_upload, {
                      ref_key: "fileLibraryUploadRef",
                      ref: fileLibraryUploadRef,
                      "auto-upload": false,
                      limit: 1,
                      "on-change": onFileLibraryFileChange,
                      "on-exceed": () => _unref(ElMessage).warning('每次只能上传一个文件'),
                      "show-file-list": true,
                      action: "#"
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_button, null, {
                          default: _withCtx(() => [...(_cache[80] || (_cache[80] = [
                            _createTextVNode("点击选择文件", -1)
                          ]))]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["on-exceed"])
                  ]),
                  _: 1
                }),
                _createVNode(_component_el_form_item, { label: "备注" }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_input, {
                      modelValue: fileLibraryForm.value.description,
                      "onUpdate:modelValue": _cache[28] || (_cache[28] = ($event: any) => ((fileLibraryForm.value.description) = $event)),
                      placeholder: "可选，描述文件用途"
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
        (isSettingsSectionAvailable('rest-time-settings'))
          ? (_openBlock(), _createBlock(_component_el_card, {
              key: 7,
              class: "setting-card",
              id: "rest-time-settings"
            }, {
              header: _withCtx(() => [...(_cache[83] || (_cache[83] = [
                _createElementVNode("div", { class: "card-header" }, [
                  _createElementVNode("span", null, "休息时间")
                ], -1)
              ]))]),
              default: _withCtx(() => [
                _createElementVNode("div", _hoisted_54, [
                  _createElementVNode("div", _hoisted_55, [
                    _createElementVNode("div", _hoisted_56, [
                      _createElementVNode("div", _hoisted_57, [
                        _createVNode(_component_el_icon, null, {
                          default: _withCtx(() => [
                            _createVNode(_unref(InfoFilled))
                          ]),
                          _: 1
                        })
                      ]),
                      _cache[84] || (_cache[84] = _createElementVNode("div", { class: "info-content" }, [
                        _createElementVNode("div", { class: "info-text" }, "设置任务休息的时间，此期间任务将暂停执行")
                      ], -1))
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_58, [
                    _createElementVNode("div", _hoisted_59, [
                      _cache[85] || (_cache[85] = _createElementVNode("div", { class: "setting-indicator" }, null, -1)),
                      _cache[86] || (_cache[86] = _createElementVNode("span", { class: "setting-label" }, "休息时间：", -1)),
                      _createElementVNode("span", _hoisted_60, _toDisplayString(intervalToTime(restTimeSettings.value.startTime)) + " - " + _toDisplayString(intervalToTime(restTimeSettings.value.endTime)), 1)
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_61, [
                    _createElementVNode("div", {
                      class: "timeline-wrapper",
                      ref_key: "timelineRef",
                      ref: timelineRef
                    }, [
                      _createElementVNode("div", _hoisted_62, [
                        _cache[87] || (_cache[87] = _createElementVNode("div", { class: "enabled-range" }, null, -1)),
                        (Array.isArray(disabledRange.value))
                          ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(disabledRange.value, (range, index) => {
                              return (_openBlock(), _createElementBlock("div", {
                                key: index,
                                class: "disabled-range",
                                style: _normalizeStyle({
                      left: `${range.start}%`,
                      width: `${range.width}%`
                    })
                              }, null, 4))
                            }), 128))
                          : (_openBlock(), _createElementBlock("div", {
                              key: 1,
                              class: "disabled-range",
                              style: _normalizeStyle({
                    left: `${disabledRange.value.start}%`,
                    width: `${disabledRange.value.width}%`
                  })
                            }, null, 4)),
                        _createElementVNode("div", {
                          class: "time-control start-control",
                          style: _normalizeStyle({ left: `${getPosition(restTimeSettings.value.startTime)}%` }),
                          onMousedown: _cache[32] || (_cache[32] = (e) => handleMouseDown('start', e))
                        }, null, 36),
                        _createElementVNode("div", {
                          class: "time-control end-control",
                          style: _normalizeStyle({ left: `${getPosition(restTimeSettings.value.endTime)}%` }),
                          onMousedown: _cache[33] || (_cache[33] = (e) => handleMouseDown('end', e))
                        }, null, 36)
                      ])
                    ], 512)
                  ]),
                  _createElementVNode("div", _hoisted_63, [
                    _createElementVNode("div", _hoisted_64, [
                      _createVNode(_component_el_select, {
                        modelValue: startTimeDisplay.value,
                        "onUpdate:modelValue": _cache[34] || (_cache[34] = ($event: any) => ((startTimeDisplay).value = $event)),
                        onChange: handleStartTimeChange,
                        placeholder: "🕐 休息开始时间",
                        class: "time-select"
                      }, {
                        default: _withCtx(() => [
                          (_openBlock(), _createElementBlock(_Fragment, null, _renderList(96, (i) => {
                            return _createVNode(_component_el_option, {
                              key: i-1,
                              value: intervalToTime(i-1),
                              label: intervalToTime(i-1)
                            }, null, 8, ["value", "label"])
                          }), 64))
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ]),
                    _createElementVNode("div", _hoisted_65, [
                      _createVNode(_component_el_select, {
                        modelValue: endTimeDisplay.value,
                        "onUpdate:modelValue": _cache[35] || (_cache[35] = ($event: any) => ((endTimeDisplay).value = $event)),
                        onChange: handleEndTimeChange,
                        placeholder: "🕐 休息结束时间",
                        class: "time-select"
                      }, {
                        default: _withCtx(() => [
                          (_openBlock(), _createElementBlock(_Fragment, null, _renderList(96, (i) => {
                            return _createVNode(_component_el_option, {
                              key: i-1,
                              value: intervalToTime(i-1),
                              label: intervalToTime(i-1)
                            }, null, 8, ["value", "label"])
                          }), 64))
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_66, [
                    _createElementVNode("div", _hoisted_67, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(taskOptions.value, (task) => {
                        return (_openBlock(), _createElementBlock("label", {
                          key: task.id,
                          class: "task-option"
                        }, [
                          _createElementVNode("input", {
                            type: "checkbox",
                            checked: restTimeSettings.value.selectedTasks.includes(task.name),
                            onChange: ($event: any) => (handleTaskToggle(task.name)),
                            class: "task-checkbox"
                          }, null, 40, _hoisted_68),
                          _createElementVNode("span", _hoisted_69, _toDisplayString(task.icon), 1),
                          _createElementVNode("span", _hoisted_70, _toDisplayString(task.name), 1),
                          (restTimeSettings.value.selectedTasks.includes(task.name))
                            ? (_openBlock(), _createElementBlock("span", _hoisted_71, " 已应用 "))
                            : _createCommentVNode("", true)
                        ]))
                      }), 128))
                    ]),
                    _cache[88] || (_cache[88] = _createElementVNode("p", { class: "task-description" }, " 未勾选的任务不会受休息时间限制 ", -1))
                  ])
                ])
              ]),
              _: 1
            }))
          : _createCommentVNode("", true)
      ], 2)
    ]),
    _createVNode(_component_el_dialog, {
      modelValue: testAgentDialogVisible.value,
      "onUpdate:modelValue": _cache[38] || (_cache[38] = ($event: any) => ((testAgentDialogVisible).value = $event)),
      title: "测试智能体",
      width: "60%",
      "close-on-click-modal": false
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_74, [
          _createVNode(_component_el_button, {
            onClick: _cache[37] || (_cache[37] = ($event: any) => (testAgentDialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[89] || (_cache[89] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            icon: _unref(Connection),
            loading: testing.value,
            onClick: testCozeAgent
          }, {
            default: _withCtx(() => [...(_cache[90] || (_cache[90] = [
              _createTextVNode("测试", -1)
            ]))]),
            _: 1
          }, 8, ["icon", "loading"])
        ])
      ]),
      default: _withCtx(() => [
        _createVNode(_component_el_form, {
          model: testAgentForm.value,
          "label-width": "100px"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_el_form_item, { label: "选择智能体" }, {
              default: _withCtx(() => [
                _createVNode(_component_el_select, {
                  modelValue: testAgentForm.value.agentId,
                  "onUpdate:modelValue": _cache[36] || (_cache[36] = ($event: any) => ((testAgentForm.value.agentId) = $event)),
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
                          _createElementVNode("div", _hoisted_72, [
                            _createElementVNode("img", {
                              src: _unref(getPlatformIconPath)(agent.platform),
                              alt: agent.platform || 'coze',
                              style: {"width":"20px","margin-right":"8px"}
                            }, null, 8, _hoisted_73),
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
            })
          ]),
          _: 1
        }, 8, ["model"])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: clearCacheDialogVisible.value,
      "onUpdate:modelValue": _cache[40] || (_cache[40] = ($event: any) => ((clearCacheDialogVisible).value = $event)),
      title: "清除Coze会话缓存",
      width: "500px",
      "before-close": handleClearCacheDialogClose
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_76, [
          _createVNode(_component_el_button, {
            onClick: _cache[39] || (_cache[39] = ($event: any) => (clearCacheDialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[92] || (_cache[92] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            icon: _unref(Delete),
            loading: clearingCache.value,
            onClick: clearCozeCache
          }, {
            default: _withCtx(() => [...(_cache[93] || (_cache[93] = [
              _createTextVNode("清除会话", -1)
            ]))]),
            _: 1
          }, 8, ["icon", "loading"])
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_75, [
          _createVNode(_component_el_alert, {
            type: "warning",
            "show-icon": "",
            closable: false,
            class: "cache-warning-banner"
          }, {
            default: _withCtx(() => [...(_cache[91] || (_cache[91] = [
              _createElementVNode("span", { class: "cache-warning-text" }, " 为了提高Coze回复的上下文连贯性，机器人会缓存Coze的会话记录。如果你切换了不同的Coze账号，则一定要清除下本地会话缓存，不同Coze账号之间的会话是隔离的。 ", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: benefitDialogVisible.value,
      "onUpdate:modelValue": _cache[42] || (_cache[42] = ($event: any) => ((benefitDialogVisible).value = $event)),
      title: "Coze积分权益",
      width: "520px",
      "close-on-click-modal": false
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_85, [
          _createVNode(_component_el_button, {
            onClick: _cache[41] || (_cache[41] = ($event: any) => (benefitDialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[97] || (_cache[97] = [
              _createTextVNode("关闭", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      default: _withCtx(() => [
        _withDirectives((_openBlock(), _createElementBlock("div", _hoisted_77, [
          _createElementVNode("div", _hoisted_78, [
            _createElementVNode("div", _hoisted_79, [
              _cache[94] || (_cache[94] = _createElementVNode("span", { class: "label" }, "权益等级", -1)),
              _createVNode(_component_el_tag, { type: levelTagType.value }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(levelLabel.value), 1)
                ]),
                _: 1
              }, 8, ["type"])
            ])
          ]),
          _createElementVNode("div", _hoisted_80, [
            _createElementVNode("div", _hoisted_81, [
              _cache[95] || (_cache[95] = _createElementVNode("div", { class: "stat-title" }, "已使用", -1)),
              _createElementVNode("div", _hoisted_82, _toDisplayString(benefitInfo.value.effective?.used ?? 0), 1)
            ]),
            _createElementVNode("div", _hoisted_83, [
              _cache[96] || (_cache[96] = _createElementVNode("div", { class: "stat-title" }, "总积分", -1)),
              _createElementVNode("div", _hoisted_84, _toDisplayString(benefitInfo.value.effective?.total ?? 0), 1)
            ])
          ]),
          _createVNode(_component_el_progress, {
            percentage: progressPercent.value,
            "stroke-width": 12,
            status: "success"
          }, null, 8, ["percentage"])
        ])), [
          [_directive_loading, benefitLoading.value]
        ])
      ]),
      _: 1
    }, 8, ["modelValue"])
  ], 64))
}
}

})