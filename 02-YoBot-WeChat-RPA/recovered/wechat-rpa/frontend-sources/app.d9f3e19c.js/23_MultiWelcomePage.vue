import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, withModifiers as _withModifiers, createCommentVNode as _createCommentVNode, normalizeStyle as _normalizeStyle, unref as _unref, resolveComponent as _resolveComponent, createVNode as _createVNode, withCtx as _withCtx, createTextVNode as _createTextVNode, createBlock as _createBlock, createStaticVNode as _createStaticVNode } from "vue"

const _hoisted_1 = { class: "multi-welcome-container" }
const _hoisted_2 = { class: "main-container" }
const _hoisted_3 = { class: "sidebar" }
const _hoisted_4 = { class: "sidebar-top" }
const _hoisted_5 = ["onClick", "onContextmenu"]
const _hoisted_6 = {
  key: 1,
  class: "context-menu-item disabled"
}
const _hoisted_7 = ["title"]
const _hoisted_8 = ["src"]
const _hoisted_9 = { class: "sidebar-actions" }
const _hoisted_10 = ["src"]
const _hoisted_11 = ["src"]
const _hoisted_12 = ["src"]
const _hoisted_13 = { class: "content" }
const _hoisted_14 = { class: "top-row" }
const _hoisted_15 = { class: "top-brand" }
const _hoisted_16 = { class: "brand-name" }
const _hoisted_17 = { class: "brand-ver" }
const _hoisted_18 = { class: "top-user" }
const _hoisted_19 = { class: "user-name" }
const _hoisted_20 = { class: "ac-metrics" }
const _hoisted_21 = ["title"]
const _hoisted_22 = { class: "ac-metric-num c" }
const _hoisted_23 = ["title"]
const _hoisted_24 = { class: "ac-metric-num b" }
const _hoisted_25 = { class: "sec-label" }
const _hoisted_26 = { class: "today-date" }
const _hoisted_27 = { class: "today-grid" }
const _hoisted_28 = { class: "op-card c1" }
const _hoisted_29 = { class: "op-val" }
const _hoisted_30 = { class: "op-card c2" }
const _hoisted_31 = { class: "op-val" }
const _hoisted_32 = { class: "op-card c3" }
const _hoisted_33 = { class: "op-val" }
const _hoisted_34 = { class: "op-card c4" }
const _hoisted_35 = { class: "op-val" }
const _hoisted_36 = { class: "op-card c5" }
const _hoisted_37 = { class: "op-val" }
const _hoisted_38 = { class: "op-card c6" }
const _hoisted_39 = { class: "op-val" }
const _hoisted_40 = { class: "guide-container" }
const _hoisted_41 = {
  key: 0,
  class: "guide-mode newcomer"
}
const _hoisted_42 = { class: "guide-body" }
const _hoisted_43 = { class: "step-content" }
const _hoisted_44 = { class: "step-header-wrapper" }
const _hoisted_45 = { class: "step-badge" }
const _hoisted_46 = { class: "step-title-large" }
const _hoisted_47 = {
  key: 0,
  class: "warning-badge",
  title: "未完成"
}
const _hoisted_48 = ["innerHTML"]
const _hoisted_49 = ["disabled", "title"]
const _hoisted_50 = { class: "step-nav" }
const _hoisted_51 = ["onClick"]
const _hoisted_52 = { class: "nav-radio" }
const _hoisted_53 = {
  key: 0,
  class: "nav-radio-inner"
}
const _hoisted_54 = { class: "nav-text" }
const _hoisted_55 = {
  key: 0,
  class: "warning-icon",
  title: "未完成"
}
const _hoisted_56 = {
  key: 1,
  class: "guide-mode advanced"
}
const _hoisted_57 = { class: "guide-body" }
const _hoisted_58 = { class: "step-content" }
const _hoisted_59 = { class: "step-header-wrapper" }
const _hoisted_60 = { class: "step-badge" }
const _hoisted_61 = { class: "step-title-large" }
const _hoisted_62 = ["innerHTML"]
const _hoisted_63 = ["disabled", "title"]
const _hoisted_64 = { class: "step-nav" }
const _hoisted_65 = ["onClick"]
const _hoisted_66 = { class: "nav-radio" }
const _hoisted_67 = {
  key: 0,
  class: "nav-radio-inner"
}
const _hoisted_68 = { class: "nav-text" }
const _hoisted_69 = { class: "assistant-content" }
const _hoisted_70 = { class: "assistant-info" }
const _hoisted_71 = ["src"]
const _hoisted_72 = {
  key: 2,
  class: "copyright-info"
}
const _hoisted_73 = { class: "copyright-text" }
const _hoisted_74 = { class: "yobot-dialog-shell" }
const _hoisted_75 = { class: "unbind-content" }
const _hoisted_76 = { class: "machine-code-info" }
const _hoisted_77 = { class: "dialog-footer" }
const _hoisted_78 = { class: "dialog-footer" }
const _hoisted_79 = { class: "update-content" }
const _hoisted_80 = { class: "update-header" }
const _hoisted_81 = ["src"]
const _hoisted_82 = { class: "version-info" }
const _hoisted_83 = { class: "version-item" }
const _hoisted_84 = { class: "version-value latest" }
const _hoisted_85 = { class: "version-item" }
const _hoisted_86 = { class: "version-value" }
const _hoisted_87 = { class: "changelog" }
const _hoisted_88 = ["innerHTML"]
const _hoisted_89 = { class: "dialog-footer" }
const _hoisted_90 = { class: "customer-service-content" }
const _hoisted_91 = {
  key: 0,
  class: "qrcode-container"
}
const _hoisted_92 = ["src"]
const _hoisted_93 = { class: "customer-service-contact" }
const _hoisted_94 = {
  key: 1,
  class: "text-contact-container"
}
const _hoisted_95 = { class: "customer-service-contact" }
const _hoisted_96 = { class: "dialog-footer" }

import { ref, onMounted, inject, computed, Ref, onUnmounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogViewerDialog from '../components/LogViewerDialog.vue'
import { API_BASE_URL, headers } from '../api/config'
import { ElMessage } from 'element-plus'
import { 
  reconnectWeChat, 
  checkConnectionStatus, 
  getLicenseInfo, 
  unbindLicense, 
  checkVersion, 
  downloadUpdate, 
  getVersionNotify, 
  saveVersionNotify,
  getAllInstances,
  switchActiveInstance,
  exitInstanceManagement,
  getServerTime,
  InstanceInfo,
  getGuideStatus // 导入新API
} from '../api/init'
import { useUserStore, UserInfo } from '../store/user'
import { version } from '../../package.json'
import type { BrandConfig } from '@/config/brand'
import { shouldShowYobotPromotion, YOBOT_WEBSITE_URL } from '@/config/brand'
import { getPngIconPath } from '@/utils/iconImages'
import { runtimeCapabilityReasonCodeText } from '@/runtime/capabilities'
import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'

interface WelcomeGuideEntry {
  navTitle: string
  title: string
  description: string
  actionText: string
  featureId: string
  route: string
  completed?: boolean
  url?: string
}

const yobotLogoUrl = './icon-png/yobot_logo.png'  


export default /*@__PURE__*/_defineComponent({
  ...{
  name: 'MultiWelcomePage'
},
  __name: 'MultiWelcomePage',
  setup(__props) {

const router = useRouter()
const route = useRoute()
const {
  isFeatureEnabled,
  featureReason,
  requireFeature,
  isMacStrictRuntime
} = useRuntimeCapabilityPresentation()

watch(
  () => [route.query.capabilityBlocked, route.query.reasonCode],
  ([blocked, reasonCode]) => {
    if (typeof blocked !== 'string') return
    ElMessage.warning(runtimeCapabilityReasonCodeText(
      typeof reasonCode === 'string' ? reasonCode : null
    ))
  },
  { immediate: true }
)

const brandConfig = inject<Ref<BrandConfig>>('brandConfig', ref({
  channel_id:'channel_000001',
  name: 'Yoko微信机器人',
  ename: 'YokoAIBot',
  logo: '/assets/logo.png',
  contact: '473726474@qq.com',
  version: '1.0.9'
}))

const showYobotPromotion = shouldShowYobotPromotion()
const yobotDialogVisible = ref(false)
const openYobotWebsite = () => {
  window.open(YOBOT_WEBSITE_URL, '_blank', 'noopener')
}

// 实例相关状态
const instances = ref<InstanceInfo[]>([])
const activeInstanceId = ref('')

// 右键上下文菜单状态
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  instance: null as InstanceInfo | null
})
const currentInstance = computed(() => {
  return instances.value.find(inst => inst.instance_id === activeInstanceId.value)
})

// 用户信息相关状态
// const nickname = computed(() => currentInstance.value?.nickname || '用户')
const friendCount = ref(0)
const groupCount = ref(0)
const isConnected = ref(true)
const reconnecting = ref(false)

const goToCustomerManagement = (tab: string) => {
  if (!requireFeature('customer.directory')) return
  router.push({
    name: 'CustomerManagement',
    query: { tab }
  })
}

const userStore = useUserStore()

// 今日数据统计
const todayDateString = computed(() => {
  const d = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  const day = days[d.getDay()]
  return `${year}-${month}-${date} · ${day}`
})

const todayStats = reactive({
  auto_reply: 0,
  add_friend: 0,
  friend_request: 0,
  mass_sending: 0,
  moment_interaction: 0,
  auto_follow: 0
})

const fetchTodayStats = async () => {
  try {
    const activeInstance = instances.value.find(inst => inst.is_active)
    const accountId = activeInstance?.account_id || ''
    
    let url = '/api/tasks/stats/today'
    if (accountId) {
      url += `?account_id=${encodeURIComponent(accountId)}`
    }
    
    const res = await fetch(url, {
      headers: {
        ...headers,
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    })
    const data = await res.json()
    if (data.success && data.data) {
      Object.assign(todayStats, data.data)
    }
  } catch (error) {
    console.error('获取今日统计数据失败:', error)
  }
}

// 解绑相关状态
const unbindDialogVisible = ref(false)
const confirmDialogVisible = ref(false)
const machineCode = ref('')
const activationCode = ref('')

// 更新相关状态
const updateDialogVisible = ref(false)
const updateInfo = ref({
  needs_update: false,
  latest_version: '',
  download_url: '',
  installer_url: '' as string | null,
  changelog: '',
  is_mandatory: false,
  release_date: ''
})
const updating = ref(false)
const updateProgress = ref(0)
const updateChecked = ref(false)

// 运行日志弹窗组件 ref（侧栏「运行日志」按钮点击时调用其 open()）
const logDialogRef = ref()

// 安装渠道（zip / installer）：用于决定是否引导迁移到安装器
const installChannel = ref<string>('zip')
const fetchInstallChannel = async (): Promise<string> => {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/system/install-channel`, { headers })
    const data = await resp.json()
    return data.channel || 'zip'
  } catch {
    return 'zip'
  }
}
// 该版本提供了安装器地址 且 本机是 zip 装 → 引导迁移到安装器（不再走 zip 就地更新）
// 只要该版本提供了 installer_url，就引导下载安装器完成升级：
//   · zip 装的用户 = 迁移到安装器；· installer 装的用户 = 正常升级（下载新安装器覆盖安装）。
// 关键：installer 用户【绝不能】走 zip 就地更新，否则会被 zip 包覆盖、掉回 zip 模式。
const migrateToInstaller = computed(() => !!updateInfo.value.installer_url)
// 打开系统浏览器下载安装器（webview 内 window.open 不可靠，走后端）
const openInstaller = async () => {
  const url = updateInfo.value.installer_url
  if (!url) return
  try {
    await fetch(`${API_BASE_URL}/api/system/open-browser`, {
      method: 'POST', headers, body: JSON.stringify({ url })
    })
    ElMessage.success('已在浏览器打开安装器下载，下载后运行安装即可完成升级')
  } catch {
    ElMessage.error('打开下载失败，请手动复制链接下载：' + url)
  }
}

// 客服对话框状态
const customerServiceDialogVisible = ref(false)
// 处理二维码加载错误
const handleQrcodeError = () => {
  ElMessage.error('二维码加载失败，请联系客服')
}

// ===================== 新人指引 & 更多玩法逻辑 =====================

const isNewcomer = ref(true)
const currentStepIndex = ref(0)
const hasInitializedStep = ref(false) // 新增：标记是否已初始化步骤
const currentFeatureIndex = ref(0)
let guidePollTimer: any = null
let statsPollTimer: any = null

const newcomerSteps = reactive<WelcomeGuideEntry[]>([
  {
    navTitle: '同步通讯录',
    title: '同步通讯录',
    description: '1.打开客户管理 -> 配置 -> 点击[同步]按钮。<br>2.同步好友耗时较长，建议先只同步一次群聊。<br><br>欢迎页每5分钟会自动刷新数据',
    actionText: '立即同步',
    completed: false,
    featureId: 'customer.sync',
    route: '/customer-management'
  },
  {
    navTitle: '配置Token',
    title: '配置Token',
    description: '1.打开<a href="https://www.coze.cn" target="_blank">coze.cn</a>，左侧点击扣子编程-> API & SDK<br>2.点击页面顶部“授权” ，在第二行切换“服务身份及凭证”<br>3.点击右侧“添加”即可，添加后记得复制token',
    actionText: '去配置',
    completed: false,
    featureId: 'settings.common',
    route: '/settings'
  },
  {
    navTitle: '绑定智能体',
    title: '绑定智能体',
    description: '1.打开<a href="https://www.coze.cn" target="_blank">coze.cn</a>，左侧点击扣子编程->页面最右边点击“回到旧版”<br>2.创建完智能体后，发布（记得发布渠道勾选“API”）<br>3.复制智能体的ID，在机器人配置页中绑定',
    actionText: '去绑定',
    completed: false,
    featureId: 'settings.common',
    route: '/settings'
  },
  {
    navTitle: '创建AI员工',
    title: '创建AI员工',
    description: '1.打开AI销冠，点击右上角“AI助理配置”<br>2.添加助理，选择完配置后保存即可',
    actionText: '去创建',
    completed: false,
    featureId: 'auto_reply.text',
    route: '/ai-chat'
  }
])

const advancedFeatures = reactive<WelcomeGuideEntry[]>([
  {
    navTitle: 'AI朋友圈运营',
    title: 'AI朋友圈运营',
    description: '1.打开SOP自动化 -> 自动点评朋友圈，设置30分钟循环点评朋友圈，激活老客户。<br>2.打开朋友圈 -> 创建自动发圈任务，适合朋友圈心智建立。',
    actionText: '去发圈',
    featureId: 'moments.publish',
    route: '/moments'
  },
  {
    navTitle: '客户自动跟单',
    title: '客户自动跟单',
    description: '跟进新客户，智能体生成动态跟进话术：<br>1.客户管理页，选择需要跟进的好友；<br>2.点击自动跟单，设置跟进频率和智能体；<br>创建跟单任务',
    actionText: '去设置',
    featureId: 'automation.auto_follow',
    route: '/customer-management' // 假设SOP在这个路由
  },
  {
    navTitle: '群发消息',
    title: '群发消息',
    description: '支持按好友标签、群聊进行批量消息发送：<br>方式一：客户管理页，勾选好友和群聊，创建推送任务；<br>方式一：自动化SOP -> 推送，点击顶部创建<br><span style="color: #f56c6c; font-weight: bold;">注意：控制推送的频率</span>',
    actionText: '去群发',
    featureId: 'automation.mass_send',
    route: '/auto-add' // 假设群发也在SOP或独立页面
  },
  // {
  //   navTitle: '自动添加好友',
  //   title: '自动添加好友',
  //   description: '批量导入号码或自动通过好友请求，快速扩充私域流量池。',
  //   actionText: '去添加',
  //   route: '/auto-add'
  // },
  {
    navTitle: '手机远程控制',
    title: '手机远程控制',
    description: '给微信文件传输助手发送指令可远程控制：<br>1.开启/暂停：开启或暂停AI自动回复<br>2.解除挂起：解除客户的挂起状态<br>3.启用 xxx：远程启用某个AI助理',
    actionText: '', // 可能是说明性质，无跳转
    featureId: 'welcome.shell',
    route: ''
  }
])

const fetchGuideStatus = async () => {
  try {
    const res = await getGuideStatus()
    if (res.success) {
      isNewcomer.value = res.is_newcomer
      
      // 更新步骤状态
      if (res.steps) {
        newcomerSteps[0].completed = res.steps.step1
        newcomerSteps[1].completed = res.steps.step2
        newcomerSteps[2].completed = res.steps.step3
        newcomerSteps[3].completed = res.steps.step4
        
        // 动态设置默认步骤：仅在首次加载时执行
        if (!hasInitializedStep.value && isNewcomer.value) {
            const firstIncomplete = newcomerSteps.findIndex(s => !s.completed)
            if (firstIncomplete !== -1) {
                // 有未完成的步骤，跳转到第一个未完成的步骤
                currentStepIndex.value = firstIncomplete
            } else {
                // 所有步骤已完成，展示最后一步
                currentStepIndex.value = newcomerSteps.length - 1
            }
            hasInitializedStep.value = true
        }
      }
    }
  } catch (e) {
    console.error('获取指引状态失败', e)
  }
}

const handleStepAction = (step: WelcomeGuideEntry) => {
  if (!requireFeature(step.featureId)) return
  if (step.route) {
    router.push(step.route)
  } else if (step.url) {
    window.open(step.url, '_blank')
  }
}

const handleFeatureAction = (feature: WelcomeGuideEntry) => {
  if (!requireFeature(feature.featureId)) return
  if (feature.route) {
    router.push(feature.route)
  }
}

// ==============================================================

// 保存二维码到本地
const saveQrcode = async () => {
  if (!brandConfig.value.qrcodeUrl) {
    ElMessage.warning('二维码链接不存在')
    return
  }
  
  try {
    // 创建下载链接
    const link = document.createElement('a')
    link.href = brandConfig.value.qrcodeUrl
    link.download = `${brandConfig.value.name}_客服二维码.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    ElMessage.success('二维码已保存到下载文件夹')
  } catch (error) {
    console.error('保存二维码失败:', error)
    ElMessage.error('保存失败，请右键图片另存为')
  }
}
// 显示客服对话框
const showCustomerServiceDialog = () => {
  customerServiceDialogVisible.value = true
}
// 复制联系方式
const copyContactInfo = () => {
  if (brandConfig.value.contact) {
    navigator.clipboard.writeText(brandConfig.value.contact)
      .then(() => {
        ElMessage.success('联系方式已复制到剪贴板')
      })
      .catch(err => {
        console.error('复制失败:', err)
        ElMessage.error('复制失败，请手动复制')
      })
  } else {
    ElMessage.warning('联系方式为空')
  }
}
// 显示解绑对话框
const showUnbindDialog = async () => {
  try {
    const result = await getLicenseInfo()
    if (result.success) {
      machineCode.value = result.data.machine_code
      unbindDialogVisible.value = true
    } else {
      ElMessage.error(result.error || '获取授权信息失败')
    }
  } catch (error) {
    ElMessage.error('获取授权信息失败')
  }
}

// 执行解绑
const executeUnbind = async () => {
  try {
    const result = await unbindLicense(activationCode.value)
    if (result.success) {
      ElMessage.success('解绑成功，应用即将关闭')
      // 应用会自动关闭，不需要额外处理
    } else {
      ElMessage.error(result.message || '解绑失败')
    }
  } catch (error) {
    ElMessage.error('解绑失败')
  } finally {
    confirmDialogVisible.value = false
    unbindDialogVisible.value = false
  }
}

// 检查连接状态
const checkStatus = async () => {
  try {
    const data = await checkConnectionStatus()
    isConnected.value = data.connected
    if (!data.connected) {
      ElMessage.warning(`连接状态: ${data.reason}`)
    }
  } catch (error) {
    console.error('检查连接状态失败:', error)
    isConnected.value = false
  }
}

// 重新连接
const handleReconnect = async () => {
  try {
    reconnecting.value = true
    const result = await reconnectWeChat(activeInstanceId.value)
    if (result.success) {
      ElMessage.success('重新连接成功')
      isConnected.value = true
      // 更新用户信息
      if (result.user_info) {
        userStore.setUserInfo(result.user_info)
      }
      // 刷新实例列表
      await loadInstances()
    } else {
      ElMessage.error(result.error || '重新连接失败')
    }
  } catch (error) {
    ElMessage.error('重新连接失败: ' + error)
  } finally {
    reconnecting.value = false
  }
}

// 切换微信实例
const handleSwitchInstance = async (instance: InstanceInfo) => {
  try {
    if (instance.is_active) {
      return // 已经是活动实例，不需要切换
    }
    const result = await switchActiveInstance(instance.instance_id)
    console.debug('切换结果:', result)
    if (result.success) {
      if (!instance.manually_exited) {
        ElMessage.success('成功切换微信号')
      }
      activeInstanceId.value = instance.instance_id
      
      // 更新实例列表
      await loadInstances()
      
      // 更新用户信息，从instance字段获取数据
      if (result.instance) {
        friendCount.value = result.instance.friend_count || 0
        groupCount.value = result.instance.group_count || 0
        userStore.setUserInfo({
          nickname: result.instance.nickname,
          account_id: result.instance.account_id,
          friendCount: result.instance.friend_count,
          groupCount: result.instance.group_count
        })
        // 更新最后获取时间，避免重复获取
        userStore.$state.lastFetchTime = Date.now()
      }
      
      // 检查连接状态
      await checkStatus()
      
      // 获取今日数据统计
      await fetchTodayStats()
    } else {
      ElMessage.error(result.error || '切换实例失败')
    }
  } catch (error) {
    console.error('切换实例失败:', error)
    ElMessage.error('切换实例失败')
  }
}

// 打开右键菜单
const handleInstanceContextMenu = (event: MouseEvent, instance: InstanceInfo) => {
  contextMenu.visible = true
  contextMenu.instance = instance
  // 防止菜单超出侧边栏右边界，直接显示在鼠标右侧
  contextMenu.x = event.clientX + 4
  contextMenu.y = event.clientY
}

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenu.visible = false
  contextMenu.instance = null
}

// 退出托管
const handleExitManagement = async (instance: InstanceInfo) => {
  closeContextMenu()
  try {
    await exitInstanceManagement(instance.instance_id)
    ElMessage.success(`已退出托管：${instance.nickname || '该实例'}`)
    await loadInstances()
    // 若退出的是当前活动实例，立即同步右侧连接状态，无需等待 checkStatus API
    if (instance.instance_id === activeInstanceId.value) {
      isConnected.value = false
    }
  } catch (error) {
    ElMessage.error('退出托管失败: ' + error)
  }
}

// 加载微信实例列表
const loadInstances = async () => {
  try {
    const result = await getAllInstances();
    console.debug('加载微信实例列表结果:', result);
    if (result.success) {
      instances.value = result.instances.map((inst: InstanceInfo) => ({
        ...inst,
        // 确保从 account_info 中获取昵称和账号ID（如果存在）
        nickname: inst.nickname || (inst.account_info?.nickname) || '微信',
        account_id: inst.account_id || (inst.account_info?.account_id) || '',
        is_connected: inst.is_connected ?? true,
        manually_exited: inst.manually_exited ?? false
      }));
      
      // 设置当前活动实例
      const activeInstance = instances.value.find(inst => inst.is_active);
      if (activeInstance) {
        activeInstanceId.value = activeInstance.instance_id;
      }
    } else {
      ElMessage.error(result.error || '获取实例列表失败');
    }
  } catch (error) {
    console.error('获取实例列表失败:', error);
    ElMessage.error('获取实例列表失败');
  }
}

// 初始化多微信实例
const initializeMultiInstances = async () => {
  try {
    const result = await getAllInstances();
    console.debug('初始化多微信实例结果:', result);
    if (result.success) {
      instances.value = result.instances.map((inst: InstanceInfo) => ({
        ...inst,
        // 确保从 account_info 中获取昵称和账号ID（如果存在）
        nickname: inst.nickname || (inst.account_info?.nickname) || '微信',
        account_id: inst.account_id || (inst.account_info?.account_id) || '',
        is_connected: inst.is_connected ?? true,
        manually_exited: inst.manually_exited ?? false
      }));
      
      // 设置当前活动实例
      if (result.instances.length > 0) {
        const activeInstance = result.instances.find((inst: InstanceInfo) => inst.is_active) || result.instances[0];
        activeInstanceId.value = activeInstance.instance_id;
      }
      
      return true;
    } else {
      ElMessage.error(result.message || '获取微信实例失败');
      return false;
    }
  } catch (error) {
    console.error('获取微信实例失败:', error);
    ElMessage.error('获取微信实例失败');
    return false;
  }
}

// 手动检查更新
const manualCheckUpdate = async () => {
  try {
    // 获取当前代理商ID
    const agentId = brandConfig.value.channel_id || 'default'
    const result = await checkVersion(version, agentId)
    
    if (result.success) {
      if (result.data.needs_update) {
        updateInfo.value = result.data
        // 该版本提供了安装器地址时，探一次本机安装渠道，决定是否引导迁移到安装器
        if (result.data.installer_url) {
          installChannel.value = await fetchInstallChannel()
        }
        updateDialogVisible.value = true
      } else {
        ElMessage.success('当前已是最新版本')
      }
    } else {
      ElMessage.error(result.error || '检查更新失败')
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    ElMessage.error('检查更新失败')
  }
}

// 格式化更新日志
const formatChangelog = (changelog: string) => {
  if (!changelog) return ''
  return changelog.replace(/\n/g, '<br>')
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 进度条格式化
const progressFormat = (percentage: number) => {
  return percentage === 100 ? '准备重启' : `${percentage}%`
}

// 开始更新
const startUpdate = async () => {
  try {
    updating.value = true
    updateProgress.value = 0
    
    // 模拟下载进度
    const progressInterval = setInterval(() => {
      if (updateProgress.value < 90) {
        updateProgress.value += 10
      }
    }, 500)
    
    // 获取当前代理商ID
    const agentId = brandConfig.value.channel_id || 'default'
    
    // 调用下载更新API
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 60000)
    })
    const result = await Promise.race([downloadUpdate(version, agentId), timeoutPromise])
    
    clearInterval(progressInterval)
    
    if ((result as any).success) {
      updateProgress.value = 100
      const logFile = (result as any).log_file
      ElMessage.success(`更新已下载，应用将在几秒后重启${logFile ? '（日志：'+ logFile +'）' : ''}`)
      setTimeout(() => {
        if (updating.value) {
          ElMessage.warning('自动重启可能失败，请手动关闭并重新打开应用')
          updating.value = false
        }
      }, 20000)
    } else {
      const err = (result as any).error || ''
      const logFile = (result as any).log_file
      if (err === 'invalid_update_package' || /zip/i.test(err)) {
        ElMessage.error(`更新包为空或已损坏，请稍后重试${logFile ? '（日志：'+ logFile +'）' : ''}`)
      } else if (err === 'permission_denied') {
        ElMessage.error(`更新失败：当前目录无写入权限，请使用管理员权限运行或关闭安全软件后重试${logFile ? '（日志：'+ logFile +'）' : ''}`)
      } else {
        ElMessage.error(((result as any).error || '更新失败') + (logFile ? '（日志：'+ logFile +'）' : ''))
      }
      updating.value = false
    }
  } catch (error) {
    if ((error as Error)?.message === 'timeout') {
      ElMessage.error('下载超时，请检查网络后重试')
    } else {
      ElMessage.error('更新失败')
    }
    updating.value = false
  }
}

// 检查版本更新
const checkForUpdates = async () => {
  // Mac 的应用更新由 YokoAgent / Darwin updater 所有，RPA Host 不探测
  // Windows 版本更新接口。
  if (isMacStrictRuntime.value) return
  // 如果配置了跳过启动页（如default_rpa），则不自动检查更新
  if (brandConfig.value.skipStartup) return

  if (updateChecked.value) return
  
  try {
    // 获取当前代理商ID
    const agentId = brandConfig.value.channel_id || 'default'
    const result = await checkVersion(version, agentId)
    
    if (result.success && result.data.needs_update) {
      updateInfo.value = result.data
      
      // 检查是否是强制更新
      if (result.data.is_mandatory) {
        // 强制更新总是显示
        updateDialogVisible.value = true
      } else {
        // 非强制更新，检查是否已经提示过
        const notifyResult = await getVersionNotify()
        if (notifyResult.success) {
          const notifiedVersions = notifyResult.data.notified_versions || []
          if (!notifiedVersions.includes(result.data.latest_version)) {
            // 未提示过的版本，显示更新弹窗
            updateDialogVisible.value = true
            // 记录已提示版本
            notifiedVersions.push(result.data.latest_version)
            await saveVersionNotify({ notified_versions: notifiedVersions })
          }
        } else {
          // 获取配置失败，默认显示更新弹窗
          updateDialogVisible.value = true
        }
      }
    }
    updateChecked.value = true
  } catch (error) {
    console.error('检查更新失败:', error)
  }
}

// 获取当前用户信息
const fetchUserInfo = async () => {
  try {
    // 获取当前活跃实例的账号ID
    const activeInstance = instances.value.find(inst => inst.is_active);
    const currentAccountId = activeInstance?.account_id || '';
    
    // 检查当前活跃实例的账号ID与缓存中的是否一致
    const cachedAccountId = userStore.userInfo?.account_id || '';
    const forceRefresh = currentAccountId !== '' && cachedAccountId !== '' && currentAccountId !== cachedAccountId;
    
    if (forceRefresh) {
      console.debug('检测到账号切换，强制刷新用户信息');
    }
    
    // 使用store中的缓存机制，如果账号ID不一致则强制刷新
    const userInfo = await userStore.fetchUserInfo(forceRefresh);
    console.debug('获取用户信息:', userInfo);
    if (userInfo) {
      friendCount.value = (userInfo as UserInfo).friendCount || 0;
      groupCount.value = (userInfo as UserInfo).groupCount || 0;
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
}
const isRefreshing = ref(false)
// 刷新账号列表和状态
const refreshInstances = async () => {
  // 如果正在刷新中，则不执行
  if (isRefreshing.value) {
    return
  }
  
  try {
    isRefreshing.value = true
    ElMessage.info('正在刷新...')
    
    // 执行与 onMounted 相同的初始化动作
    // 初始化多微信实例
    const initSuccess = await initializeMultiInstances()
    
    if (initSuccess) {
      // 获取当前用户信息
      await fetchUserInfo()
      
      // 检查连接状态
      await checkStatus()
    }
    
    ElMessage.success('刷新完成')
  } catch (error) {
    console.error('刷新失败:', error)
    ElMessage.error('刷新失败')
  } finally {
    isRefreshing.value = false
  }
}
onMounted(async () => {
  document.addEventListener('click', closeContextMenu)
  try {
    console.time('多开欢迎页-总加载时间')
    // 初始化多微信实例
    const initSuccess = await initializeMultiInstances()
    // 预加载SVG图片
    if (initSuccess) {
      // 获取当前用户信息
      await fetchUserInfo()
      
      // 检查连接状态
      await checkStatus()
      
      // 获取今日数据统计
      await fetchTodayStats()
      
      // 检查更新
      if (!isMacStrictRuntime.value) await checkForUpdates()
    }
    if (!isMacStrictRuntime.value) {
      try {
        const res = await getServerTime()
        const iso = (res && res.success) ? (res.authority_time || res.server_time) : null
        if (iso) {
          const serverMs = new Date(iso).getTime()
          const localMs = Date.now()
          const diff = Math.abs(localMs - serverMs)
          timeSkewSeconds.value = Math.round(diff / 1000)
          showTimeWarning.value = diff > 60000
        }
      } catch (e) {}
    }
    
    // 获取指引状态
    if (!isMacStrictRuntime.value) {
      await fetchGuideStatus()
      // 每5分钟轮询一次状态
      guidePollTimer = setInterval(fetchGuideStatus, 5 * 60 * 1000)
    }

    // 定时刷新统计数据 (1分钟)
    statsPollTimer = setInterval(fetchTodayStats, 60000)

    console.timeEnd('多开欢迎页-总加载时间')
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error('初始化失败')
  }
})

onUnmounted(() => {
  if (guidePollTimer) {
    clearInterval(guidePollTimer)
  }
  if (statsPollTimer) {
    clearInterval(statsPollTimer)
  }
  document.removeEventListener('click', closeContextMenu)
})



const showTimeWarning = ref(false)
const timeSkewSeconds = ref(0)

// AI助理卡片相关
const isDefaultChannel = computed(() => {
  return brandConfig.value.channel_id === 'default' || brandConfig.value.channel_id === 'channel_000001'
})

const openAiAssistant = () => {
  window.open('https://www.coze.cn/s/kzzkO7cEzq8/', '_blank')
}

return (_ctx: any,_cache: any) => {
  const _component_Document = _resolveComponent("Document")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_dialog = _resolveComponent("el-dialog")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_progress = _resolveComponent("el-progress")!

  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createElementVNode("div", _hoisted_1, [
      _cache[36] || (_cache[36] = _createElementVNode("div", { class: "background-animation" }, null, -1)),
      _createElementVNode("div", _hoisted_2, [
        _createElementVNode("div", _hoisted_3, [
          _createElementVNode("div", _hoisted_4, [
            _cache[19] || (_cache[19] = _createElementVNode("div", { class: "sidebar-title" }, "账号", -1)),
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(instances.value, (instance) => {
              return (_openBlock(), _createElementBlock("div", {
                key: instance.instance_id,
                class: _normalizeClass(["account-item", {
                'active': instance.instance_id === activeInstanceId.value,
                'exited': instance.manually_exited
              }]),
                onClick: ($event: any) => (handleSwitchInstance(instance)),
                onContextmenu: _withModifiers(($event: any) => (handleInstanceContextMenu($event, instance)), ["prevent"])
              }, [
                _createElementVNode("span", null, _toDisplayString(instance.nickname?.substring(0, 2) || '微信'), 1),
                _createElementVNode("div", {
                  class: _normalizeClass(["status-indicator", { 'offline': !instance.is_connected, 'exited': instance.manually_exited }])
                }, null, 2)
              ], 42, _hoisted_5))
            }), 128)),
            (contextMenu.visible)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "instance-context-menu",
                  style: _normalizeStyle({ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }),
                  onClick: _cache[1] || (_cache[1] = _withModifiers(() => {}, ["stop"]))
                }, [
                  (contextMenu.instance && !contextMenu.instance.manually_exited && contextMenu.instance.is_connected)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        class: "context-menu-item danger",
                        onClick: _cache[0] || (_cache[0] = ($event: any) => (handleExitManagement(contextMenu.instance!)))
                      }, " 退出托管 "))
                    : (_openBlock(), _createElementBlock("div", _hoisted_6, _toDisplayString(contextMenu.instance?.manually_exited ? '已退出托管' : '未初始化'), 1))
                ], 4))
              : _createCommentVNode("", true),
            _createElementVNode("div", {
              class: _normalizeClass(["refresh-button", {'refreshing': isRefreshing.value}]),
              onClick: refreshInstances,
              title: isRefreshing.value ? '正在刷新...' : '刷新账号列表'
            }, [
              _createElementVNode("img", {
                src: _unref(getPngIconPath)('refresh'),
                alt: "刷新",
                class: "refresh-icon"
              }, null, 8, _hoisted_8)
            ], 10, _hoisted_7)
          ]),
          _createElementVNode("div", _hoisted_9, [
            (!_unref(brandConfig).skipStartup)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "sidebar-btn",
                  onClick: showCustomerServiceDialog,
                  title: "专属客服"
                }, [
                  _createElementVNode("img", {
                    src: _unref(getPngIconPath)('kefu_mail'),
                    class: "sidebar-icon-img",
                    alt: "客服"
                  }, null, 8, _hoisted_10)
                ]))
              : _createCommentVNode("", true),
            _createElementVNode("div", {
              class: "sidebar-btn",
              onClick: showUnbindDialog,
              title: "解绑账号"
            }, [
              _createElementVNode("img", {
                src: _unref(getPngIconPath)('unlink'),
                class: "sidebar-icon-img",
                alt: "解绑"
              }, null, 8, _hoisted_11)
            ]),
            (!_unref(brandConfig).skipStartup)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "sidebar-btn",
                  onClick: manualCheckUpdate,
                  title: "版本更新"
                }, [
                  _createElementVNode("img", {
                    src: _unref(getPngIconPath)('update'),
                    class: "sidebar-icon-img",
                    alt: "更新"
                  }, null, 8, _hoisted_12)
                ]))
              : _createCommentVNode("", true),
            (_unref(brandConfig).showRuntimeLog !== false)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 2,
                  class: "sidebar-btn",
                  title: "运行日志",
                  onClick: _cache[2] || (_cache[2] = ($event: any) => (logDialogRef.value?.open()))
                }, [
                  _createVNode(_component_el_icon, { class: "sidebar-log-icon" }, {
                    default: _withCtx(() => [
                      _createVNode(_component_Document)
                    ]),
                    _: 1
                  })
                ]))
              : _createCommentVNode("", true),
            (_unref(showYobotPromotion))
              ? (_openBlock(), _createElementBlock("div", {
                  key: 3,
                  class: "sidebar-btn yobot-sidebar-btn",
                  title: "下载最新 YoBot 桌面AI助理",
                  onClick: _cache[3] || (_cache[3] = ($event: any) => (yobotDialogVisible.value = true))
                }, [
                  _createElementVNode("img", {
                    src: yobotLogoUrl,
                    class: "yobot-sidebar-icon",
                    alt: "YoBot"
                  }),
                  _cache[20] || (_cache[20] = _createElementVNode("span", {
                    class: "yobot-new-dot",
                    "aria-hidden": "true"
                  }, null, -1))
                ]))
              : _createCommentVNode("", true)
          ])
        ]),
        _createElementVNode("div", _hoisted_13, [
          _createElementVNode("div", _hoisted_14, [
            _createElementVNode("div", _hoisted_15, [
              _createElementVNode("div", _hoisted_16, _toDisplayString(_unref(brandConfig).alias || _unref(brandConfig).ename), 1),
              _createElementVNode("div", _hoisted_17, "v" + _toDisplayString(_unref(version)), 1)
            ]),
            _createElementVNode("div", _hoisted_18, [
              _createElementVNode("div", _hoisted_19, _toDisplayString(currentInstance.value?.nickname || '用户'), 1),
              _createElementVNode("div", {
                class: _normalizeClass(["user-status", { 'offline': !isConnected.value }])
              }, [
                _cache[22] || (_cache[22] = _createElementVNode("div", { class: "dot" }, null, -1)),
                _createTextVNode(" " + _toDisplayString(isConnected.value ? '在线' : '离线') + " ", 1),
                (!isConnected.value)
                  ? (_openBlock(), _createBlock(_component_el_button, {
                      key: 0,
                      type: "info",
                      size: "small",
                      link: "",
                      style: {"margin-left":"8px","color":"var(--tx-2)"},
                      onClick: handleReconnect,
                      loading: reconnecting.value
                    }, {
                      default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
                        _createTextVNode(" 重新连接 ", -1)
                      ]))]),
                      _: 1
                    }, 8, ["loading"]))
                  : _createCommentVNode("", true)
              ], 2)
            ])
          ]),
          (showTimeWarning.value)
            ? (_openBlock(), _createBlock(_component_el_alert, {
                key: 0,
                type: "warning",
                "show-icon": "",
                class: "time-warning-banner"
              }, {
                default: _withCtx(() => [
                  _createElementVNode("span", null, "检测到异常！电脑时间与实时时间偏差 " + _toDisplayString(timeSkewSeconds.value) + " 秒，请尽快联网校准设备时间", 1)
                ]),
                _: 1
              }))
            : _createCommentVNode("", true),
          _createElementVNode("div", _hoisted_20, [
            _createElementVNode("div", {
              class: _normalizeClass(["ac-metric clickable-card", { 'capability-disabled': !_unref(isFeatureEnabled)('customer.directory') }]),
              title: _unref(featureReason)('customer.directory'),
              onClick: _cache[4] || (_cache[4] = ($event: any) => (goToCustomerManagement('friends')))
            }, [
              _cache[23] || (_cache[23] = _createElementVNode("div", { class: "ac-metric-lbl" }, [
                _createElementVNode("svg", {
                  viewBox: "0 0 24 24",
                  fill: "var(--cyan)"
                }, [
                  _createElementVNode("path", { d: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" })
                ]),
                _createTextVNode(" 好友数量 ")
              ], -1)),
              _createElementVNode("div", _hoisted_22, _toDisplayString(friendCount.value), 1)
            ], 10, _hoisted_21),
            _createElementVNode("div", {
              class: _normalizeClass(["ac-metric clickable-card", { 'capability-disabled': !_unref(isFeatureEnabled)('customer.directory') }]),
              title: _unref(featureReason)('customer.directory'),
              onClick: _cache[5] || (_cache[5] = ($event: any) => (goToCustomerManagement('groups')))
            }, [
              _cache[24] || (_cache[24] = _createElementVNode("div", { class: "ac-metric-lbl" }, [
                _createElementVNode("svg", {
                  viewBox: "0 0 24 24",
                  fill: "var(--blue)"
                }, [
                  _createElementVNode("path", { d: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" })
                ]),
                _createTextVNode(" 群聊数量 ")
              ], -1)),
              _createElementVNode("div", _hoisted_24, _toDisplayString(groupCount.value), 1)
            ], 10, _hoisted_23)
          ]),
          _createElementVNode("div", _hoisted_25, [
            _cache[25] || (_cache[25] = _createTextVNode("今日数据 ", -1)),
            _createElementVNode("span", _hoisted_26, _toDisplayString(todayDateString.value), 1)
          ]),
          _createElementVNode("div", _hoisted_27, [
            _createElementVNode("div", _hoisted_28, [
              _cache[26] || (_cache[26] = _createStaticVNode("<div class=\"op-head\" data-v-02973ba3><div class=\"op-icon\" data-v-02973ba3><svg viewBox=\"0 0 24 24\" fill=\"var(--cyan)\" data-v-02973ba3><path d=\"M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z\" data-v-02973ba3></path></svg></div><div class=\"op-name\" data-v-02973ba3>自动回复</div></div>", 1)),
              _createElementVNode("div", _hoisted_29, _toDisplayString(todayStats.auto_reply), 1)
            ]),
            _createElementVNode("div", _hoisted_30, [
              _cache[27] || (_cache[27] = _createStaticVNode("<div class=\"op-head\" data-v-02973ba3><div class=\"op-icon\" data-v-02973ba3><svg viewBox=\"0 0 24 24\" fill=\"var(--blue)\" data-v-02973ba3><path d=\"M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\" data-v-02973ba3></path></svg></div><div class=\"op-name\" data-v-02973ba3>自动加人</div></div>", 1)),
              _createElementVNode("div", _hoisted_31, _toDisplayString(todayStats.add_friend), 1)
            ]),
            _createElementVNode("div", _hoisted_32, [
              _cache[28] || (_cache[28] = _createStaticVNode("<div class=\"op-head\" data-v-02973ba3><div class=\"op-icon\" data-v-02973ba3><svg viewBox=\"0 0 24 24\" fill=\"var(--green)\" data-v-02973ba3><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z\" data-v-02973ba3></path></svg></div><div class=\"op-name\" data-v-02973ba3>通过好友</div></div>", 1)),
              _createElementVNode("div", _hoisted_33, _toDisplayString(todayStats.friend_request), 1)
            ]),
            _createElementVNode("div", _hoisted_34, [
              _cache[29] || (_cache[29] = _createStaticVNode("<div class=\"op-head\" data-v-02973ba3><div class=\"op-icon\" data-v-02973ba3><svg viewBox=\"0 0 24 24\" fill=\"var(--orange)\" data-v-02973ba3><path d=\"M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z\" data-v-02973ba3></path></svg></div><div class=\"op-name\" data-v-02973ba3>推送消息</div></div>", 1)),
              _createElementVNode("div", _hoisted_35, _toDisplayString(todayStats.mass_sending), 1)
            ]),
            _createElementVNode("div", _hoisted_36, [
              _cache[30] || (_cache[30] = _createStaticVNode("<div class=\"op-head\" data-v-02973ba3><div class=\"op-icon\" data-v-02973ba3><svg viewBox=\"0 0 24 24\" fill=\"var(--purple)\" data-v-02973ba3><path d=\"M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z\" data-v-02973ba3></path></svg></div><div class=\"op-name\" data-v-02973ba3>朋友圈赞评</div></div>", 1)),
              _createElementVNode("div", _hoisted_37, _toDisplayString(todayStats.moment_interaction), 1)
            ]),
            _createElementVNode("div", _hoisted_38, [
              _cache[31] || (_cache[31] = _createStaticVNode("<div class=\"op-head\" data-v-02973ba3><div class=\"op-icon\" data-v-02973ba3><svg viewBox=\"0 0 24 24\" fill=\"var(--pink)\" data-v-02973ba3><path d=\"M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z\" data-v-02973ba3></path></svg></div><div class=\"op-name\" data-v-02973ba3>自动跟单</div></div>", 1)),
              _createElementVNode("div", _hoisted_39, _toDisplayString(todayStats.auto_follow), 1)
            ])
          ]),
          _createElementVNode("div", _hoisted_40, [
            (isNewcomer.value)
              ? (_openBlock(), _createElementBlock("div", _hoisted_41, [
                  _cache[32] || (_cache[32] = _createElementVNode("div", { class: "sec-label" }, "新手启航：配置专属AI员工", -1)),
                  _createElementVNode("div", _hoisted_42, [
                    _createElementVNode("div", _hoisted_43, [
                      _createElementVNode("div", _hoisted_44, [
                        _createElementVNode("div", _hoisted_45, _toDisplayString(currentStepIndex.value + 1), 1),
                        _createElementVNode("div", _hoisted_46, [
                          _createTextVNode(_toDisplayString(newcomerSteps[currentStepIndex.value].title) + " ", 1),
                          (!newcomerSteps[currentStepIndex.value].completed)
                            ? (_openBlock(), _createElementBlock("span", _hoisted_47, "⚠️"))
                            : _createCommentVNode("", true)
                        ])
                      ]),
                      _createElementVNode("div", {
                        class: "step-description",
                        innerHTML: newcomerSteps[currentStepIndex.value].description
                      }, null, 8, _hoisted_48),
                      (newcomerSteps[currentStepIndex.value].actionText)
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            class: "step-action-btn",
                            onClick: _cache[6] || (_cache[6] = ($event: any) => (handleStepAction(newcomerSteps[currentStepIndex.value]))),
                            disabled: !_unref(isFeatureEnabled)(newcomerSteps[currentStepIndex.value].featureId),
                            title: _unref(featureReason)(newcomerSteps[currentStepIndex.value].featureId)
                          }, _toDisplayString(newcomerSteps[currentStepIndex.value].actionText) + " -> ", 9, _hoisted_49))
                        : _createCommentVNode("", true)
                    ]),
                    _createElementVNode("div", _hoisted_50, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(newcomerSteps, (step, index) => {
                        return (_openBlock(), _createElementBlock("div", {
                          key: index,
                          class: _normalizeClass(["step-nav-item", { 'active': currentStepIndex.value === index, 'completed': step.completed }]),
                          onClick: ($event: any) => (currentStepIndex.value = index)
                        }, [
                          _createElementVNode("div", _hoisted_52, [
                            (currentStepIndex.value === index || step.completed)
                              ? (_openBlock(), _createElementBlock("div", _hoisted_53))
                              : _createCommentVNode("", true)
                          ]),
                          _createElementVNode("span", _hoisted_54, _toDisplayString(index + 1) + "." + _toDisplayString(step.navTitle), 1),
                          (!step.completed)
                            ? (_openBlock(), _createElementBlock("span", _hoisted_55, "⚠️"))
                            : _createCommentVNode("", true)
                        ], 10, _hoisted_51))
                      }), 128))
                    ])
                  ])
                ]))
              : (_openBlock(), _createElementBlock("div", _hoisted_56, [
                  _cache[33] || (_cache[33] = _createElementVNode("div", { class: "sec-label" }, "更多AI自动化玩法", -1)),
                  _createElementVNode("div", _hoisted_57, [
                    _createElementVNode("div", _hoisted_58, [
                      _createElementVNode("div", _hoisted_59, [
                        _createElementVNode("div", _hoisted_60, _toDisplayString(currentFeatureIndex.value + 1), 1),
                        _createElementVNode("div", _hoisted_61, _toDisplayString(advancedFeatures[currentFeatureIndex.value].title), 1)
                      ]),
                      _createElementVNode("div", {
                        class: "step-description",
                        innerHTML: advancedFeatures[currentFeatureIndex.value].description
                      }, null, 8, _hoisted_62),
                      (advancedFeatures[currentFeatureIndex.value].actionText)
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            class: "step-action-btn",
                            onClick: _cache[7] || (_cache[7] = ($event: any) => (handleFeatureAction(advancedFeatures[currentFeatureIndex.value]))),
                            disabled: !_unref(isFeatureEnabled)(advancedFeatures[currentFeatureIndex.value].featureId),
                            title: _unref(featureReason)(advancedFeatures[currentFeatureIndex.value].featureId)
                          }, _toDisplayString(advancedFeatures[currentFeatureIndex.value].actionText) + " -> ", 9, _hoisted_63))
                        : _createCommentVNode("", true)
                    ]),
                    _createElementVNode("div", _hoisted_64, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(advancedFeatures, (feature, index) => {
                        return (_openBlock(), _createElementBlock("div", {
                          key: index,
                          class: _normalizeClass(["step-nav-item", { 'active': currentFeatureIndex.value === index }]),
                          onClick: ($event: any) => (currentFeatureIndex.value = index)
                        }, [
                          _createElementVNode("div", _hoisted_66, [
                            (currentFeatureIndex.value === index)
                              ? (_openBlock(), _createElementBlock("div", _hoisted_67))
                              : _createCommentVNode("", true)
                          ]),
                          _createElementVNode("span", _hoisted_68, _toDisplayString(feature.navTitle), 1)
                        ], 10, _hoisted_65))
                      }), 128))
                    ])
                  ])
                ]))
          ]),
          (_unref(showYobotPromotion))
            ? (_openBlock(), _createElementBlock("div", {
                key: 1,
                class: "assistant-entry",
                onClick: openAiAssistant
              }, [
                _createElementVNode("div", _hoisted_69, [
                  _createElementVNode("div", _hoisted_70, [
                    _createElementVNode("img", {
                      src: _unref(getPngIconPath)('offial_kefu'),
                      class: "assistant-icon",
                      alt: "AI助理"
                    }, null, 8, _hoisted_71),
                    _cache[34] || (_cache[34] = _createElementVNode("span", { class: "assistant-title" }, "遇到问题？问在线AI助理", -1))
                  ]),
                  _cache[35] || (_cache[35] = _createElementVNode("span", { class: "assistant-link" }, "助理Yoko >", -1))
                ])
              ]))
            : _createCommentVNode("", true),
          (_unref(brandConfig).copyright)
            ? (_openBlock(), _createElementBlock("div", _hoisted_72, [
                _createElementVNode("span", _hoisted_73, _toDisplayString(_unref(brandConfig).copyright), 1)
              ]))
            : _createCommentVNode("", true)
        ])
      ])
    ]),
    _createVNode(_component_el_dialog, {
      modelValue: yobotDialogVisible.value,
      "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event: any) => ((yobotDialogVisible).value = $event)),
      width: "600px",
      "align-center": "",
      "show-close": false,
      class: "yobot-dialog"
    }, {
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_74, [
          _createElementVNode("button", {
            type: "button",
            class: "yobot-dialog-close",
            "aria-label": "关闭",
            onClick: _cache[8] || (_cache[8] = ($event: any) => (yobotDialogVisible.value = false))
          }, [...(_cache[37] || (_cache[37] = [
            _createElementVNode("svg", {
              viewBox: "0 0 24 24",
              "aria-hidden": "true"
            }, [
              _createElementVNode("path", { d: "M6 6l12 12M18 6L6 18" })
            ], -1)
          ]))]),
          _createElementVNode("div", { class: "yobot-dialog-hero" }, [
            _createElementVNode("div", { class: "yobot-dialog-logo" }, [
              _createElementVNode("img", {
                src: yobotLogoUrl,
                alt: "YoBot"
              })
            ]),
            _cache[38] || (_cache[38] = _createElementVNode("div", { class: "yobot-dialog-heading" }, [
              _createElementVNode("div", { class: "yobot-eyebrow" }, "YOKOAGI"),
              _createElementVNode("h2", null, "YoBot 桌面 AI 助理"),
              _createElementVNode("p", null, "从逐项操作功能，到直接告诉 Agent 你想完成什么。")
            ], -1)),
            _cache[39] || (_cache[39] = _createElementVNode("div", { class: "yobot-dialog-tags" }, [
              _createElementVNode("span", null, "更易用"),
              _createElementVNode("span", null, "更智能"),
              _createElementVNode("span", null, "更开放")
            ], -1))
          ]),
          _createElementVNode("div", { class: "yobot-dialog-body" }, [
            _cache[41] || (_cache[41] = _createElementVNode("div", { class: "yobot-feature-list" }, [
              _createElementVNode("div", { class: "yobot-feature-item" }, [
                _createElementVNode("div", { class: "yobot-feature-icon feature-chat" }, [
                  _createElementVNode("svg", {
                    viewBox: "0 0 24 24",
                    "aria-hidden": "true"
                  }, [
                    _createElementVNode("path", { d: "M4 5.8A2.8 2.8 0 016.8 3h10.4A2.8 2.8 0 0120 5.8v6.4a2.8 2.8 0 01-2.8 2.8H11l-4.8 4v-4A2.8 2.8 0 014 12.2V5.8z" }),
                    _createElementVNode("path", { d: "M8 8h8M8 11h5" })
                  ])
                ]),
                _createElementVNode("div", null, [
                  _createElementVNode("h3", null, "和 Agent 对话，机器人就能执行"),
                  _createElementVNode("p", null, "不用逐页寻找功能，说出目标即可开始操作，新手几分钟就能上手。")
                ])
              ]),
              _createElementVNode("div", { class: "yobot-feature-item" }, [
                _createElementVNode("div", { class: "yobot-feature-icon feature-skill" }, [
                  _createElementVNode("svg", {
                    viewBox: "0 0 24 24",
                    "aria-hidden": "true"
                  }, [
                    _createElementVNode("path", { d: "M8.5 4.5A3.5 3.5 0 1112 8V4.5a3.5 3.5 0 117 0V8h.5a3.5 3.5 0 110 7H19v4.5h-4.5V19a3.5 3.5 0 10-7 0v.5H3V15h.5a3.5 3.5 0 100-7H3V4.5h5.5z" })
                  ])
                ]),
                _createElementVNode("div", null, [
                  _createElementVNode("h3", null, "组合 Skills，承载更多场景化 SOP"),
                  _createElementVNode("p", null, "把运营经验沉淀为可复用流程，让复杂业务按标准步骤稳定执行。")
                ])
              ]),
              _createElementVNode("div", { class: "yobot-feature-item" }, [
                _createElementVNode("div", { class: "yobot-feature-icon feature-mcp" }, [
                  _createElementVNode("svg", {
                    viewBox: "0 0 24 24",
                    "aria-hidden": "true"
                  }, [
                    _createElementVNode("circle", {
                      cx: "5",
                      cy: "12",
                      r: "2.5"
                    }),
                    _createElementVNode("circle", {
                      cx: "19",
                      cy: "6",
                      r: "2.5"
                    }),
                    _createElementVNode("circle", {
                      cx: "19",
                      cy: "18",
                      r: "2.5"
                    }),
                    _createElementVNode("path", { d: "M7.5 11l9-4M7.5 13l9 4" })
                  ])
                ]),
                _createElementVNode("div", null, [
                  _createElementVNode("h3", null, "RPA 能力作为 MCP，对外开放"),
                  _createElementVNode("p", null, "你的龙虾、WorkBuddy、Codex 等 Agent，也能直接调用机器人自动化能力。")
                ])
              ])
            ], -1)),
            _cache[42] || (_cache[42] = _createElementVNode("div", { class: "yobot-migration-note" }, [
              _createElementVNode("span", { class: "yobot-note-check" }, "✓"),
              _createElementVNode("span", null, [
                _createElementVNode("strong", null, "完整融合现有 YokoAI 机器人能力"),
                _createTextVNode("，升级使用方式，不改变你的业务目标。")
              ])
            ], -1)),
            _createElementVNode("button", {
              type: "button",
              class: "yobot-download-btn",
              onClick: openYobotWebsite
            }, [...(_cache[40] || (_cache[40] = [
              _createTextVNode(" 前往 YoBot 官网下载 ", -1),
              _createElementVNode("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                _createElementVNode("path", { d: "M5 12h14M14 7l5 5-5 5" })
              ], -1)
            ]))]),
            _cache[43] || (_cache[43] = _createElementVNode("div", { class: "yobot-site-text" }, "yobot.yokoagi.com", -1))
          ])
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: unbindDialogVisible.value,
      "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event: any) => ((unbindDialogVisible).value = $event)),
      title: "提示：请谨慎解绑，一旦解绑不可恢复",
      width: "400px",
      class: "unbind-dialog"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_77, [
          _createVNode(_component_el_button, {
            onClick: _cache[11] || (_cache[11] = ($event: any) => (unbindDialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[44] || (_cache[44] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "danger",
            onClick: executeUnbind
          }, {
            default: _withCtx(() => [...(_cache[45] || (_cache[45] = [
              _createTextVNode(" 确认 ", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_75, [
          _createElementVNode("p", _hoisted_76, "本机机器码： " + _toDisplayString(machineCode.value), 1),
          _createVNode(_component_el_form, null, {
            default: _withCtx(() => [
              _createVNode(_component_el_form_item, { label: "您的激活码：" }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_input, {
                    modelValue: activationCode.value,
                    "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event: any) => ((activationCode).value = $event)),
                    placeholder: "请输入激活码",
                    maxlength: 54
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: confirmDialogVisible.value,
      "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event: any) => ((confirmDialogVisible).value = $event)),
      title: "确认解绑",
      width: "300px"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_78, [
          _createVNode(_component_el_button, {
            onClick: _cache[13] || (_cache[13] = ($event: any) => (confirmDialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[46] || (_cache[46] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "danger",
            onClick: executeUnbind
          }, {
            default: _withCtx(() => [...(_cache[47] || (_cache[47] = [
              _createTextVNode("确认解绑", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      default: _withCtx(() => [
        _cache[48] || (_cache[48] = _createElementVNode("p", null, "确定要解绑当前设备吗？此操作不可恢复！", -1))
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: updateDialogVisible.value,
      "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event: any) => ((updateDialogVisible).value = $event)),
      title: updateInfo.value.is_mandatory ? '强制更新' : '发现新版本',
      width: "450px",
      "close-on-click-modal": !updateInfo.value.is_mandatory,
      "close-on-press-escape": !updateInfo.value.is_mandatory,
      "show-close": !updateInfo.value.is_mandatory,
      class: "update-dialog"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_89, [
          (!updateInfo.value.is_mandatory)
            ? (_openBlock(), _createBlock(_component_el_button, {
                key: 0,
                onClick: _cache[15] || (_cache[15] = ($event: any) => (updateDialogVisible.value = false))
              }, {
                default: _withCtx(() => [...(_cache[53] || (_cache[53] = [
                  _createTextVNode("稍后更新", -1)
                ]))]),
                _: 1
              }))
            : _createCommentVNode("", true),
          (migrateToInstaller.value)
            ? (_openBlock(), _createBlock(_component_el_button, {
                key: 1,
                type: "primary",
                onClick: openInstaller
              }, {
                default: _withCtx(() => [...(_cache[54] || (_cache[54] = [
                  _createTextVNode("下载安装器", -1)
                ]))]),
                _: 1
              }))
            : (_openBlock(), _createBlock(_component_el_button, {
                key: 2,
                type: "primary",
                onClick: startUpdate,
                loading: updating.value,
                disabled: updating.value
              }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(updating.value ? '更新中' : '立即更新'), 1)
                ]),
                _: 1
              }, 8, ["loading", "disabled"]))
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_79, [
          _createElementVNode("div", _hoisted_80, [
            _createElementVNode("img", {
              src: _unref(getPngIconPath)('update'),
              alt: "更新",
              class: "update-icon"
            }, null, 8, _hoisted_81),
            _cache[49] || (_cache[49] = _createElementVNode("div", { class: "update-title" }, [
              _createElementVNode("h3", null, "软件更新"),
              _createElementVNode("p", { class: "update-subtitle" }, "发现新版本可用")
            ], -1))
          ]),
          _createElementVNode("div", _hoisted_82, [
            _createElementVNode("div", _hoisted_83, [
              _cache[50] || (_cache[50] = _createElementVNode("span", { class: "version-label" }, "最新版本:", -1)),
              _createElementVNode("span", _hoisted_84, "v" + _toDisplayString(updateInfo.value.latest_version), 1)
            ]),
            _createElementVNode("div", _hoisted_85, [
              _cache[51] || (_cache[51] = _createElementVNode("span", { class: "version-label" }, "发布日期:", -1)),
              _createElementVNode("span", _hoisted_86, _toDisplayString(formatDate(updateInfo.value.release_date)), 1)
            ])
          ]),
          _createElementVNode("div", _hoisted_87, [
            _cache[52] || (_cache[52] = _createElementVNode("h4", null, "更新内容:", -1)),
            _createElementVNode("div", {
              class: "changelog-content",
              innerHTML: formatChangelog(updateInfo.value.changelog)
            }, null, 8, _hoisted_88)
          ]),
          (migrateToInstaller.value)
            ? (_openBlock(), _createBlock(_component_el_alert, {
                key: 0,
                type: "info",
                closable: false,
                "show-icon": "",
                title: installChannel.value === 'zip' ? '升级为更稳定的安装器版本' : '有新版本可用',
                description: "点击下方「下载安装器」下载并运行安装即可完成升级；登录状态、激活与数据都会自动保留。",
                style: {"margin-top":"8px"}
              }, null, 8, ["title"]))
            : _createCommentVNode("", true),
          (updating.value && !migrateToInstaller.value)
            ? (_openBlock(), _createBlock(_component_el_progress, {
                key: 1,
                percentage: updateProgress.value,
                format: progressFormat,
                "stroke-width": 10,
                class: "update-progress"
              }, null, 8, ["percentage"]))
            : _createCommentVNode("", true)
        ])
      ]),
      _: 1
    }, 8, ["modelValue", "title", "close-on-click-modal", "close-on-press-escape", "show-close"]),
    _createVNode(_component_el_dialog, {
      modelValue: customerServiceDialogVisible.value,
      "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event: any) => ((customerServiceDialogVisible).value = $event)),
      title: "专属客服",
      width: "400px"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_96, [
          (_unref(brandConfig).contactType !== 'qrcode')
            ? (_openBlock(), _createBlock(_component_el_button, {
                key: 0,
                type: "primary",
                onClick: copyContactInfo
              }, {
                default: _withCtx(() => [...(_cache[56] || (_cache[56] = [
                  _createTextVNode("复制联系方式", -1)
                ]))]),
                _: 1
              }))
            : (_openBlock(), _createBlock(_component_el_button, {
                key: 1,
                type: "primary",
                onClick: saveQrcode
              }, {
                default: _withCtx(() => [...(_cache[57] || (_cache[57] = [
                  _createTextVNode("保存二维码", -1)
                ]))]),
                _: 1
              })),
          _createVNode(_component_el_button, {
            onClick: _cache[17] || (_cache[17] = ($event: any) => (customerServiceDialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[58] || (_cache[58] = [
              _createTextVNode("关闭", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_90, [
          (_unref(brandConfig).contactType === 'qrcode' && _unref(brandConfig).qrcodeUrl)
            ? (_openBlock(), _createElementBlock("div", _hoisted_91, [
                _createElementVNode("img", {
                  src: _unref(brandConfig).qrcodeUrl,
                  alt: "客服二维码",
                  class: "customer-qrcode",
                  onError: handleQrcodeError
                }, null, 40, _hoisted_92),
                _createElementVNode("p", _hoisted_93, _toDisplayString(_unref(brandConfig).contact), 1)
              ]))
            : (_openBlock(), _createElementBlock("div", _hoisted_94, [
                _cache[55] || (_cache[55] = _createElementVNode("div", { class: "contact-icon" }, [
                  _createElementVNode("span", { style: {"font-size":"100px"} }, "📞")
                ], -1)),
                _createElementVNode("p", _hoisted_95, "客服联系方式：" + _toDisplayString(_unref(brandConfig).contact), 1)
              ]))
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    (_unref(brandConfig).showRuntimeLog !== false)
      ? (_openBlock(), _createBlock(LogViewerDialog, {
          key: 0,
          ref_key: "logDialogRef",
          ref: logDialogRef
        }, null, 512))
      : _createCommentVNode("", true)
  ], 64))
}
}

})