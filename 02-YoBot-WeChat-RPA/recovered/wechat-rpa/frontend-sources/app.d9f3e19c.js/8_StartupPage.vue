import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, unref as _unref, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, createBlock as _createBlock, renderList as _renderList, Fragment as _Fragment } from "vue"

const _hoisted_1 = { class: "startup-root" }
const _hoisted_2 = { class: "hero" }
const _hoisted_3 = { class: "hero-content" }
const _hoisted_4 = ["src"]
const _hoisted_5 = {
  key: 1,
  class: "hero-logo-fallback"
}
const _hoisted_6 = { class: "hero-version" }
const _hoisted_7 = {
  key: 0,
  class: "state-body center"
}
const _hoisted_8 = {
  key: 1,
  class: "state-body"
}
const _hoisted_9 = { class: "action-col" }
const _hoisted_10 = { class: "refresh-link" }
const _hoisted_11 = {
  key: 2,
  class: "state-body"
}
const _hoisted_12 = { class: "panel-hint" }
const _hoisted_13 = {
  key: 3,
  class: "state-body"
}
const _hoisted_14 = { class: "instance-info-card" }
const _hoisted_15 = { class: "instance-info-main" }
const _hoisted_16 = { class: "instance-count-text" }
const _hoisted_17 = {
  key: 0,
  class: "instance-info-action"
}
const _hoisted_18 = { class: "guide-list" }
const _hoisted_19 = {
  key: 0,
  class: "progress-wrap"
}
const _hoisted_20 = { class: "progress-label" }
const _hoisted_21 = {
  key: 4,
  class: "state-body"
}
const _hoisted_22 = { class: "status-pill info" }
const _hoisted_23 = {
  key: 0,
  class: "progress-wrap"
}
const _hoisted_24 = { class: "progress-label" }
const _hoisted_25 = { class: "panel-footer" }
const _hoisted_26 = {
  key: 0,
  class: "wizard-body"
}
const _hoisted_27 = { class: "count-row" }
const _hoisted_28 = ["onClick"]
const _hoisted_29 = {
  key: 1,
  class: "wizard-body center"
}
const _hoisted_30 = {
  class: "state-text",
  style: {"margin-top":"16px"}
}
const _hoisted_31 = {
  key: 0,
  class: "wizard-footer"
}
const _hoisted_32 = {
  key: 1,
  class: "wizard-footer center-text"
}
const _hoisted_33 = { class: "dlg-header warn" }
const _hoisted_34 = { class: "dlg-body" }
const _hoisted_35 = {
  key: 0,
  class: "instance-list"
}
const _hoisted_36 = { class: "inst-name" }
const _hoisted_37 = { class: "inst-name" }
const _hoisted_38 = { class: "dlg-desc" }
const _hoisted_39 = { class: "steps-list" }
const _hoisted_40 = { class: "step-num" }
const _hoisted_41 = { key: 0 }
const _hoisted_42 = {
  key: 1,
  class: "skip-note"
}
const _hoisted_43 = {
  key: 2,
  class: "config-error-box"
}
const _hoisted_44 = { class: "config-error-title" }
const _hoisted_45 = { class: "config-error-msg" }
const _hoisted_46 = {
  key: 3,
  class: "downgrade-box"
}
const _hoisted_47 = { class: "downgrade-msg" }
const _hoisted_48 = { class: "dlg-footer" }
const _hoisted_49 = { class: "dlg-header warn" }
const _hoisted_50 = { class: "dlg-body" }
const _hoisted_51 = {
  key: 0,
  class: "dlg-desc",
  style: {"white-space":"pre-line"}
}
const _hoisted_52 = {
  key: 1,
  class: "steps-list"
}
const _hoisted_53 = { class: "step-num" }
const _hoisted_54 = { class: "dlg-footer" }
const _hoisted_55 = { class: "dlg-body" }
const _hoisted_56 = {
  class: "dlg-desc",
  style: {"text-align":"center"}
}
const _hoisted_57 = { class: "dlg-footer" }
const _hoisted_58 = { class: "update-content" }
const _hoisted_59 = { class: "version-info" }
const _hoisted_60 = { class: "version-item" }
const _hoisted_61 = { class: "version-value latest" }
const _hoisted_62 = { class: "version-item" }
const _hoisted_63 = { class: "version-value" }
const _hoisted_64 = { class: "changelog" }
const _hoisted_65 = ["innerHTML"]
const _hoisted_66 = { class: "dialog-footer" }

import { computed, ref, inject, onMounted, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { WarningFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { API_BASE_URL, headers } from '@/api/config'
import {
  initializeMultipleWechat,
  autoConfigWechat41,
  getAllInstances,
  launchWechat,
  checkVersion,
  downloadUpdate,
  getVersionNotify,
  saveVersionNotify,
  type FailedInstanceInfo,
  type MultiInitResponse
} from '@/api/init'
import { version } from '../../package.json'
import type { BrandConfig } from '@/config/brand'
import {
  getWechatDownloadUrl,
  shouldShowYobotPromotion,
  YOBOT_WEBSITE_URL
} from '@/config/brand'
import { checkAgentExists } from '@/api/agent'
import { useConfigStore } from '@/store/config'
import { selectMacOSLegacyResumeCandidate } from '@/runtime/startup'

const yobotLogoUrl = './icon-png/yobot_logo.png'

type StartupState = 'checking' | 'no_wechat' | 'wechat_found' | 'check_failed' | 'wait_login'

export default /*@__PURE__*/_defineComponent({
  __name: 'StartupPage',
  setup(__props) {

const brandConfig = inject<Ref<BrandConfig>>('brandConfig', ref({
  channel_id: 'channel_000001',
  name: 'YokoAI机器人',
  ename: 'YokoAIbot',
  logo: './img/logo.jpg',
  contact: '',
  slogan: '让每个企业都有 AI 销售'
}))

const showYobotPromotion = shouldShowYobotPromotion()
const router = useRouter()
const route  = useRoute()
const configStore = useConfigStore()
const multiInstanceEnabled = computed(() => (
  configStore.config.startup?.multiInstance !== false
))
const macosStartup = computed(() => (
  configStore.config.startup?.targetPlatform === 'macos'
))

// ── Hero 动画触发 ──
const heroReady  = ref(false)
const logoFailed = ref(false)
onMounted(() => {
  // 下一帧触发入场动画，确保 transition 能捕获到状态变化
  requestAnimationFrame(() => setTimeout(() => { heroReady.value = true }, 60))
})

// ── 主状态机 ──
const startupState  = ref<StartupState>('checking')
const detectedCount = ref(0)
const startupCheckError = ref('')

// ── 进度 ──
const initializing   = ref(false)
const launching      = ref(false)
const progress       = ref(0)
const progressStatus = ref<'success' | 'exception'>('success')
const progressText   = ref('')
const updateProgress = (val: number, text: string) => {
  progress.value = val; progressText.value = text
}

// ── 多开向导 ──
const showWizardDialog = ref(false)
const wizardStep  = ref<'count_select' | 'launching'>('count_select')
const wizardCount = ref(2)

// ── 环境配置 ──
const showEnvConfigDialog     = ref(false)
const showConfigCompleteDialog = ref(false)
const envConfigIsPartial       = ref(false)
const autoConfigRunning        = ref(false)
const autoConfigError          = ref('')
const launchedCountAfterConfig = ref(1)
const autoConfigSteps = ref<Record<number, 'pending' | 'done'>>({
  1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending'
})
const configStepLabels = ['退出当前微信程序', '配置电脑环境变量', '启动Windows讲述人模式', '重新启动微信程序']
const partialSuccessInstances = ref<{ nickname: string; account_id: string }[]>([])
const partialFailedInstances  = ref<FailedInstanceInfo[]>([])
const partialInitResult       = ref<any>(null)

// 引导弹窗（微信版本不支持 / 通用引导，内容由 RPA 返回）
const showGuidanceDialog  = ref(false)
const guidanceContent     = ref<MultiInitResponse['guidance'] | null>(null)
// 环境配置弹窗内的「降级到更稳定版本」引导（连续失败时由 RPA 附带）
const downgradeSuggestion = ref<MultiInitResponse['downgrade_suggestion'] | null>(null)

// 打开外部下载链接
const openExternalUrl = (url?: string) => {
  if (url) window.open(url, '_blank', 'noopener')
}

// ─────────────────────────────────────────────
// Mount
// ─────────────────────────────────────────────
onMounted(async () => {
  const agent = route.query.agent as string | undefined
  if (agent) {
    const isAgent = await checkAgentExists(agent)
    if (isAgent) {
      router.push({ path: '/agent/login', query: { agent } })
      return
    }
  }
  await checkWechatStatus()
  checkForUpdates()
})

// ─────────────────────────────────────────────
// 检测微信
// ─────────────────────────────────────────────
const checkWechatStatus = async () => {
  startupState.value = 'checking'
  detectedCount.value = 0
  startupCheckError.value = ''
  try {
    const result = await getAllInstances()
    const instances = result?.instances || []
    if (instances.length === 0) {
      startupState.value = 'no_wechat'
    } else {
      detectedCount.value = instances.length
      startupState.value  = 'wechat_found'
      const resumeCandidate = selectMacOSLegacyResumeCandidate(
        configStore.config.startup?.targetPlatform,
        instances
      )
      if (resumeCandidate) {
        localStorage.setItem('appStarted', 'true')
        await router.replace({ name: 'WelcomePage' })
      }
    }
  } catch (error) {
    if (macosStartup.value) {
      startupCheckError.value = error instanceof Error
        ? error.message
        : '无法读取微信实例，请检查本机服务日志'
      startupState.value = 'check_failed'
      return
    }
    // Preserve the established Windows Legacy fallback exactly. Mac opts
    // into the explicit error state through its isolated copied config.
    startupState.value = 'wechat_found'
  }
}

// ─────────────────────────────────────────────
// 单开
// ─────────────────────────────────────────────
const launchSingle = async () => {
  launching.value = true
  try {
    const res = await launchWechat(1, false, false)
    if (res.status === 'launched') {
      wizardCount.value   = 1
      startupState.value  = 'wait_login'
    } else if (res.code === 'WECHAT_PATH_NOT_FOUND') {
      ElMessage.warning('未找到微信安装路径，请手动打开微信后点击刷新')
    } else {
      ElMessage.error(res.message || '启动微信失败')
    }
  } catch { ElMessage.error('启动微信失败') }
  finally  { launching.value = false }
}

// ─────────────────────────────────────────────
// 多开向导
// ─────────────────────────────────────────────
const openWizard = () => {
  wizardStep.value = 'count_select'
  wizardCount.value = 2
  showWizardDialog.value = true
}

const startMultiLaunch = async () => {
  wizardStep.value = 'launching'
  try {
    const res = await launchWechat(wizardCount.value, true, false)
    showWizardDialog.value = false
    if (res.status === 'launched') {
      startupState.value = 'wait_login'
    } else if (res.code === 'WECHAT_PATH_NOT_FOUND') {
      ElMessage.warning('未找到微信安装路径，请手动打开微信后点击刷新')
      startupState.value = 'no_wechat'
    } else {
      ElMessage.error(res.message || '启动微信失败')
      startupState.value = 'no_wechat'
    }
  } catch {
    ElMessage.error('启动微信失败')
    showWizardDialog.value = false
    startupState.value = 'no_wechat'
  }
}

// ─────────────────────────────────────────────
// 核心初始化
// ─────────────────────────────────────────────
const handleMultiStartup = async () => {
  if (initializing.value) return
  initializing.value   = true
  progressStatus.value = 'success'
  let navigating = false

  try {
    updateProgress(20, '正在检查微信状态…')
    const result = await initializeMultipleWechat()

    if (result.success) {
      updateProgress(80, '正在初始化微信实例…')

      if (result.need_auto_config && result.failed_instances?.length) {
        initializing.value = false
        envConfigIsPartial.value     = true
        partialSuccessInstances.value = result.instances.map(i => ({
          nickname: i.nickname || '', account_id: i.account_id || ''
        }))
        partialFailedInstances.value  = result.failed_instances
        partialInitResult.value       = result
        launchedCountAfterConfig.value = result.init_summary?.total ?? 1
        autoConfigSteps.value = { 1:'pending', 2:'pending', 3:'pending', 4:'pending' }
        showEnvConfigDialog.value = true
        return
      }

      updateProgress(100, '初始化成功！')
      localStorage.setItem('appStarted', 'true')
      navigating = true
      setTimeout(() => {
        router.push({ name: 'WelcomePage', params: { nickname: result.instances[0]?.nickname || '用户'} }) 
      }, 200)
      // router.push({ name: 'WelcomePage', params: { nickname: result.instances[0]?.nickname || '用户' } })

    } else {
      // 微信版本过高（或任意带 guidance 的失败）→ 引导弹窗（含下载链接）
      if (result.code === 'WECHAT_VERSION_UNSUPPORTED' || result.guidance) {
        initializing.value = false
        guidanceContent.value = result.guidance || {
          title: '微信版本不支持',
          reason: result.message,
          download_url: result.version_info?.download_url,
        }
        showGuidanceDialog.value = true
        return
      }
      if (result.code === 'ENV_NOT_CONFIGURED') {
        initializing.value = false
        envConfigIsPartial.value      = false
        partialSuccessInstances.value = []
        partialFailedInstances.value  = result.failed_instances || []
        // 连续失败时 RPA 会附带降级引导（旧后端无此字段则为 null，不渲染）
        downgradeSuggestion.value     = result.downgrade_suggestion?.show ? result.downgrade_suggestion : null
        launchedCountAfterConfig.value = result.init_summary?.total ?? 1
        autoConfigSteps.value = { 1:'pending', 2:'pending', 3:'pending', 4:'pending' }
        showEnvConfigDialog.value = true
        return
      }
      throw new Error(result.message)
    }

  } catch (error) {
    progressStatus.value = 'exception'
    updateProgress(100, `启动失败: ${(error as Error).message}`)
    ElMessage.error(`启动失败: ${(error as Error).message}`)
  } finally {
    if (!navigating) initializing.value = false
  }
}

// ─────────────────────────────────────────────
// 跳过配置
// ─────────────────────────────────────────────
const skipConfigAndEnter = () => {
  if (!partialInitResult.value?.instances?.length) return
  showEnvConfigDialog.value = false
  localStorage.setItem('appStarted', 'true')
  router.push({
    name: 'WelcomePage',
    params: { nickname: partialInitResult.value.instances[0]?.nickname || '用户' }
  })
}

// ─────────────────────────────────────────────
// 自动配置
// ─────────────────────────────────────────────
const startAutoConfig = async (forceNarrator = false) => {
  if (autoConfigRunning.value) return
  autoConfigRunning.value = true
  autoConfigError.value   = ''
  autoConfigSteps.value   = { 1:'pending', 2:'pending', 3:'pending', 4:'pending' }
  try {
    const res = await autoConfigWechat41(forceNarrator)
    if (res.success) {
      showEnvConfigDialog.value     = false
      showConfigCompleteDialog.value = true
    } else {
      autoConfigError.value = res.message || '自动配置失败'
    }
  } catch { autoConfigError.value = '自动配置失败，请重试' }
  finally  { autoConfigRunning.value = false }
}

// ─────────────────────────────────────────────
// 配置后重新初始化
// ─────────────────────────────────────────────
const launchAppAfterConfig = async () => {
  initializing.value = true
  updateProgress(20, '正在检查微信状态…')
  try {
    const result = await initializeMultipleWechat()
    if (result.success) {
      updateProgress(100, '初始化成功！')
      localStorage.setItem('appStarted', 'true')
      showConfigCompleteDialog.value = false
      setTimeout(() => {
        router.push({ name: 'WelcomePage', params: { nickname: result.instances[0]?.nickname || '用户' } })
      }, 500)
    } else {
      ElMessage.error(result.message || '初始化失败')
    }
  } finally { initializing.value = false }
}

// ─────────────────────────────────────────────
// 版本更新
// ─────────────────────────────────────────────
const updateDialogVisible = ref(false)
const hasNewVersion = ref(false)
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
const updateProgress2 = ref(0)

const formatChangelog = (changelog: string) => {
  if (!changelog) return ''
  return changelog.replace(/\n/g, '<br>')
}
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}
const progressFormat = (percentage: number) => percentage === 100 ? '准备重启' : `${percentage}%`

const openInstaller = async () => {
  const url = updateInfo.value.installer_url
  if (!url) return

  try {
    const response = await fetch(`${API_BASE_URL}/api/system/open-browser`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url })
    })
    if (!response.ok) {
      throw new Error(`打开下载链接失败 (${response.status})`)
    }
    ElMessage.success('已在系统浏览器中打开安装器下载，下载完成后请运行安装器升级')
  } catch {
    ElMessage.error('打开下载链接失败，请稍后重试')
  }
}

const checkForUpdates = async () => {
  try {
    const agentId = brandConfig.value.channel_id || 'default'
    const result = await checkVersion(version, agentId)
    if (result.success && result.data.needs_update) {
      updateInfo.value = result.data
      hasNewVersion.value = true
      if (result.data.is_mandatory) {
        updateDialogVisible.value = true
      }
    }
  } catch (error) {
    console.error('检查更新失败:', error)
  }
}

const startUpdate = async () => {
  try {
    updating.value = true
    updateProgress2.value = 0
    const progressInterval = setInterval(() => {
      if (updateProgress2.value < 90) updateProgress2.value += 10
    }, 500)
    const agentId = brandConfig.value.channel_id || 'default'
    const result = await downloadUpdate(version, agentId)
    clearInterval(progressInterval)
    if (result.success) {
      updateProgress2.value = 100
      ElMessage.success('更新已下载，应用将在几秒后重启')
    } else {
      ElMessage.error(result.error || '更新失败')
      updating.value = false
    }
  } catch {
    ElMessage.error('更新失败')
    updating.value = false
  }
}

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_progress = _resolveComponent("el-progress")!
  const _component_el_dialog = _resolveComponent("el-dialog")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_alert = _resolveComponent("el-alert")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _cache[15] || (_cache[15] = _createElementVNode("div", { class: "aurora-blob aurora-b1" }, null, -1)),
      _cache[16] || (_cache[16] = _createElementVNode("div", { class: "aurora-blob aurora-b2" }, null, -1)),
      _cache[17] || (_cache[17] = _createElementVNode("div", { class: "aurora-blob aurora-b3" }, null, -1)),
      _createElementVNode("div", _hoisted_3, [
        _createElementVNode("div", {
          class: _normalizeClass(["logo-ring", { 'logo-ready': heroReady.value }])
        }, [
          (!logoFailed.value)
            ? (_openBlock(), _createElementBlock("img", {
                key: 0,
                src: _unref(brandConfig).logo,
                class: "hero-logo-img",
                onError: _cache[0] || (_cache[0] = ($event: any) => (logoFailed.value = true))
              }, null, 40, _hoisted_4))
            : (_openBlock(), _createElementBlock("div", _hoisted_5, _toDisplayString((_unref(brandConfig).alias || _unref(brandConfig).name).charAt(0)), 1))
        ], 2),
        _createElementVNode("div", {
          class: _normalizeClass(["hero-name", { 'name-ready': heroReady.value }])
        }, _toDisplayString(_unref(brandConfig).alias || _unref(brandConfig).name), 3),
        _createElementVNode("div", {
          class: _normalizeClass(["hero-slogan", { 'slogan-ready': heroReady.value }])
        }, _toDisplayString(_unref(brandConfig).slogan || 'AI 赋能，智驱增长'), 3),
        _createElementVNode("div", {
          class: _normalizeClass(["hero-version-row", { 'version-ready': heroReady.value }])
        }, [
          _createElementVNode("div", _hoisted_6, "v" + _toDisplayString(_unref(version)), 1),
          (hasNewVersion.value)
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: "update-badge",
                onClick: _cache[1] || (_cache[1] = ($event: any) => (updateDialogVisible.value = true))
              }, " ↑ 新版本 "))
            : _createCommentVNode("", true)
        ], 2)
      ])
    ]),
    (_unref(showYobotPromotion))
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: _normalizeClass(["yobot-promo-banner", { 'promo-ready': heroReady.value }])
        }, [
          _createElementVNode("div", {
            class: "yobot-promo-mark",
            "aria-hidden": "true"
          }, [
            _createElementVNode("img", {
              src: yobotLogoUrl,
              alt: ""
            })
          ]),
          _cache[19] || (_cache[19] = _createElementVNode("div", { class: "yobot-promo-copy" }, [
            _createElementVNode("div", { class: "yobot-promo-title" }, "全新的桌面 AI 助理"),
            _createElementVNode("div", { class: "yobot-promo-desc" }, "深度融合 YokoAI 机器人全部功能，通过聊天就能控制")
          ], -1)),
          _createElementVNode("button", {
            type: "button",
            class: "yobot-promo-link",
            onClick: _cache[2] || (_cache[2] = ($event: any) => (openExternalUrl(_unref(YOBOT_WEBSITE_URL))))
          }, [...(_cache[18] || (_cache[18] = [
            _createTextVNode(" 官网下载 ", -1),
            _createElementVNode("span", { "aria-hidden": "true" }, "→", -1)
          ]))])
        ], 2))
      : _createCommentVNode("", true),
    _createElementVNode("div", {
      class: _normalizeClass(["panel", { 'panel-ready': heroReady.value, 'with-yobot-promo': _unref(showYobotPromotion) }])
    }, [
      (startupState.value === 'checking')
        ? (_openBlock(), _createElementBlock("div", _hoisted_7, [...(_cache[20] || (_cache[20] = [
            _createElementVNode("div", { class: "spinner" }, null, -1),
            _createElementVNode("p", { class: "state-text" }, "正在检测微信状态…", -1)
          ]))]))
        : (startupState.value === 'no_wechat')
          ? (_openBlock(), _createElementBlock("div", _hoisted_8, [
              _cache[24] || (_cache[24] = _createElementVNode("div", { class: "status-pill warn" }, "未检测到运行中的微信", -1)),
              _cache[25] || (_cache[25] = _createElementVNode("p", { class: "panel-hint" }, "请选择启动方式", -1)),
              _createElementVNode("div", _hoisted_9, [
                _createVNode(_component_el_button, {
                  type: "primary",
                  class: "action-btn primary-btn",
                  style: {"width":"100%"},
                  loading: launching.value,
                  onClick: launchSingle
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(_toDisplayString(launching.value ? '正在启动…' : '启动微信（单账号）'), 1)
                  ]),
                  _: 1
                }, 8, ["loading"]),
                (multiInstanceEnabled.value)
                  ? (_openBlock(), _createBlock(_component_el_button, {
                      key: 0,
                      type: "warning",
                      class: "action-btn warn-btn",
                      style: {"width":"100%"},
                      disabled: launching.value,
                      onClick: openWizard
                    }, {
                      default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
                        _createTextVNode("多开微信（多账号托管）", -1)
                      ]))]),
                      _: 1
                    }, 8, ["disabled"]))
                  : _createCommentVNode("", true)
              ]),
              _createElementVNode("span", _hoisted_10, [
                _cache[23] || (_cache[23] = _createTextVNode(" 已手动启动？ ", -1)),
                _createVNode(_component_el_button, {
                  link: "",
                  type: "primary",
                  onClick: checkWechatStatus
                }, {
                  default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
                    _createTextVNode("点此刷新", -1)
                  ]))]),
                  _: 1
                })
              ])
            ]))
          : (startupState.value === 'check_failed')
            ? (_openBlock(), _createElementBlock("div", _hoisted_11, [
                _cache[27] || (_cache[27] = _createElementVNode("div", { class: "status-pill warn" }, "微信状态检测失败", -1)),
                _createElementVNode("p", _hoisted_12, _toDisplayString(startupCheckError.value), 1),
                _createVNode(_component_el_button, {
                  type: "primary",
                  class: "action-btn primary-btn",
                  style: {"width":"100%","max-width":"290px"},
                  onClick: checkWechatStatus
                }, {
                  default: _withCtx(() => [...(_cache[26] || (_cache[26] = [
                    _createTextVNode("重新检测", -1)
                  ]))]),
                  _: 1
                })
              ]))
            : (startupState.value === 'wechat_found')
              ? (_openBlock(), _createElementBlock("div", _hoisted_13, [
                  _createElementVNode("div", _hoisted_14, [
                    _createElementVNode("div", _hoisted_15, [
                      _cache[30] || (_cache[30] = _createElementVNode("span", { class: "instance-ok-dot" }, null, -1)),
                      _createElementVNode("span", _hoisted_16, [
                        _cache[28] || (_cache[28] = _createTextVNode("检测到 ", -1)),
                        _createElementVNode("strong", null, _toDisplayString(detectedCount.value), 1),
                        _cache[29] || (_cache[29] = _createTextVNode(" 个微信窗口", -1))
                      ])
                    ]),
                    (multiInstanceEnabled.value)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_17, [
                          _cache[32] || (_cache[32] = _createElementVNode("span", { class: "instance-hint" }, "账号数量不对？", -1)),
                          _createVNode(_component_el_button, {
                            link: "",
                            type: "primary",
                            size: "small",
                            style: {"padding":"0","height":"auto","line-height":"1","vertical-align":"baseline"},
                            onClick: openWizard
                          }, {
                            default: _withCtx(() => [...(_cache[31] || (_cache[31] = [
                              _createTextVNode("多开向导 →", -1)
                            ]))]),
                            _: 1
                          })
                        ]))
                      : _createCommentVNode("", true)
                  ]),
                  _createElementVNode("ul", _hoisted_18, [
                    _createElementVNode("li", null, _toDisplayString(multiInstanceEnabled.value ? '请确保所有微信账号已登录' : '请确保微信账号已登录'), 1),
                    _cache[33] || (_cache[33] = _createElementVNode("li", { class: "warn-item" }, [
                      _createElementVNode("span", null, "⚠"),
                      _createElementVNode("strong", null, "确保微信窗口可见，不要最小化")
                    ], -1)),
                    _cache[34] || (_cache[34] = _createElementVNode("li", null, "点击启动后，请勿操作鼠标", -1))
                  ]),
                  (initializing.value)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_19, [
                        _createVNode(_component_el_progress, {
                          percentage: progress.value,
                          status: progressStatus.value,
                          "stroke-width": 6,
                          "show-text": false
                        }, null, 8, ["percentage", "status"]),
                        _createElementVNode("p", _hoisted_20, _toDisplayString(progressText.value), 1)
                      ]))
                    : _createCommentVNode("", true),
                  _createVNode(_component_el_button, {
                    type: "primary",
                    class: "action-btn cta-btn",
                    loading: initializing.value,
                    onClick: handleMultiStartup
                  }, {
                    default: _withCtx(() => [
                      _createTextVNode(_toDisplayString(initializing.value ? '正在启动…' : '启动应用'), 1)
                    ]),
                    _: 1
                  }, 8, ["loading"])
                ]))
              : (startupState.value === 'wait_login')
                ? (_openBlock(), _createElementBlock("div", _hoisted_21, [
                    _createElementVNode("div", _hoisted_22, "已启动 " + _toDisplayString(wizardCount.value) + " 个微信窗口", 1),
                    _cache[36] || (_cache[36] = _createElementVNode("p", { class: "panel-hint" }, "请在桌面找到微信窗口，依次登录所有账号", -1)),
                    _cache[37] || (_cache[37] = _createElementVNode("div", { class: "tip-box" }, [
                      _createElementVNode("p", { class: "tip-title" }, "💡 提示"),
                      _createElementVNode("ul", null, [
                        _createElementVNode("li", null, "微信窗口已在桌面显示，请切换过去"),
                        _createElementVNode("li", null, "如有多个窗口，请依次登录每一个"),
                        _createElementVNode("li", null, "全部登录完成后，点击下方按钮")
                      ])
                    ], -1)),
                    (initializing.value)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_23, [
                          _createVNode(_component_el_progress, {
                            percentage: progress.value,
                            status: progressStatus.value,
                            "stroke-width": 6,
                            "show-text": false
                          }, null, 8, ["percentage", "status"]),
                          _createElementVNode("p", _hoisted_24, _toDisplayString(progressText.value), 1)
                        ]))
                      : _createCommentVNode("", true),
                    _createVNode(_component_el_button, {
                      type: "primary",
                      class: "action-btn primary-btn",
                      style: {"width":"100%","max-width":"290px"},
                      loading: initializing.value,
                      onClick: handleMultiStartup
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(initializing.value ? '正在初始化…' : '我已全部登录完成'), 1)
                      ]),
                      _: 1
                    }, 8, ["loading"]),
                    _createVNode(_component_el_button, {
                      link: "",
                      style: {"font-size":"12px","color":"#aaa","margin-top":"4px"},
                      onClick: checkWechatStatus
                    }, {
                      default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
                        _createTextVNode(" 返回重新检测 ", -1)
                      ]))]),
                      _: 1
                    })
                  ]))
                : _createCommentVNode("", true),
      _cache[38] || (_cache[38] = _createElementVNode("div", { class: "disclaimer" }, [
        _createElementVNode("div", { class: "disclaimer-title" }, "免责声明"),
        _createElementVNode("span", { class: "disclaimer-dot" }, "·"),
        _createElementVNode("span", null, "本软件仅供日常交流使用，严禁用于非法用途"),
        _createElementVNode("span", null, "请遵守相关法律法规，违规使用造成的后果由使用者承担")
      ], -1)),
      _createElementVNode("div", _hoisted_25, [
        _createElementVNode("span", null, _toDisplayString(_unref(brandConfig).copyright || 'Powered by AI'), 1)
      ])
    ], 2),
    _createVNode(_component_el_dialog, {
      modelValue: showWizardDialog.value,
      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((showWizardDialog).value = $event)),
      title: "多开微信向导",
      width: "400px",
      "align-center": "",
      "close-on-click-modal": wizardStep.value === 'count_select',
      class: "wizard-dialog"
    }, {
      footer: _withCtx(() => [
        (wizardStep.value === 'count_select')
          ? (_openBlock(), _createElementBlock("div", _hoisted_31, [
              _createVNode(_component_el_button, {
                onClick: _cache[3] || (_cache[3] = ($event: any) => (showWizardDialog.value = false))
              }, {
                default: _withCtx(() => [...(_cache[43] || (_cache[43] = [
                  _createTextVNode("取消", -1)
                ]))]),
                _: 1
              }),
              _createVNode(_component_el_button, {
                type: "primary",
                onClick: startMultiLaunch
              }, {
                default: _withCtx(() => [
                  _createTextVNode(" 开始多开（" + _toDisplayString(wizardCount.value) + " 个） ", 1)
                ]),
                _: 1
              })
            ]))
          : (_openBlock(), _createElementBlock("div", _hoisted_32, [...(_cache[44] || (_cache[44] = [
              _createElementVNode("span", { style: {"color":"#aaa","font-size":"13px"} }, "处理中，请稍候…", -1)
            ]))]))
      ]),
      default: _withCtx(() => [
        (wizardStep.value === 'count_select')
          ? (_openBlock(), _createElementBlock("div", _hoisted_26, [
              _cache[39] || (_cache[39] = _createElementVNode("p", { class: "wizard-q" }, "需要同时运行几个微信账号？", -1)),
              _createElementVNode("div", _hoisted_27, [
                (_openBlock(), _createElementBlock(_Fragment, null, _renderList([2, 3], (n) => {
                  return _createElementVNode("div", {
                    key: n,
                    class: _normalizeClass(["count-chip", { active: wizardCount.value === n }]),
                    onClick: ($event: any) => (wizardCount.value = n)
                  }, _toDisplayString(n), 11, _hoisted_28)
                }), 64))
              ]),
              _cache[40] || (_cache[40] = _createElementVNode("div", { class: "warn-box" }, [
                _createElementVNode("p", null, "⚠ 操作前注意"),
                _createElementVNode("ul", null, [
                  _createElementVNode("li", null, "将关闭所有已运行的微信进程"),
                  _createElementVNode("li", null, "重新启动后需重新扫码登录所有账号")
                ])
              ], -1))
            ]))
          : (wizardStep.value === 'launching')
            ? (_openBlock(), _createElementBlock("div", _hoisted_29, [
                _cache[41] || (_cache[41] = _createElementVNode("div", { class: "spinner large" }, null, -1)),
                _createElementVNode("p", _hoisted_30, "正在启动 " + _toDisplayString(wizardCount.value) + " 个微信窗口…", 1),
                _cache[42] || (_cache[42] = _createElementVNode("p", { style: {"color":"#aaa","font-size":"13px"} }, "请稍候，不要操作鼠标", -1))
              ]))
            : _createCommentVNode("", true)
      ]),
      _: 1
    }, 8, ["modelValue", "close-on-click-modal"]),
    _createVNode(_component_el_dialog, {
      modelValue: showEnvConfigDialog.value,
      "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event: any) => ((showEnvConfigDialog).value = $event)),
      width: "460px",
      "align-center": "",
      "close-on-click-modal": false,
      class: "env-dialog"
    }, {
      header: _withCtx(() => [
        _createElementVNode("div", _hoisted_33, [
          _createVNode(_component_el_icon, { class: "dlg-icon" }, {
            default: _withCtx(() => [
              _createVNode(_unref(WarningFilled))
            ]),
            _: 1
          }),
          _createElementVNode("span", null, _toDisplayString(envConfigIsPartial.value ? '部分微信需要首次配置' : '设备环境异常'), 1)
        ])
      ]),
      footer: _withCtx(() => [
        _createElementVNode("div", _hoisted_48, [
          _createVNode(_component_el_button, {
            type: "primary",
            class: "dlg-btn primary",
            style: {"width":"100%"},
            loading: autoConfigRunning.value,
            onClick: _cache[6] || (_cache[6] = ($event: any) => (startAutoConfig(true)))
          }, {
            default: _withCtx(() => [
              _createTextVNode(_toDisplayString(autoConfigRunning.value ? '正在自动配置…' : (autoConfigError.value ? '重新配置' : '开始自动配置（推荐）')), 1)
            ]),
            _: 1
          }, 8, ["loading"]),
          (envConfigIsPartial.value)
            ? (_openBlock(), _createBlock(_component_el_button, {
                key: 0,
                class: "dlg-btn",
                style: {"width":"100%"},
                disabled: autoConfigRunning.value,
                onClick: skipConfigAndEnter
              }, {
                default: _withCtx(() => [
                  _createTextVNode("跳过，仅用已就绪的 " + _toDisplayString(partialSuccessInstances.value.length) + " 个账号", 1)
                ]),
                _: 1
              }, 8, ["disabled"]))
            : _createCommentVNode("", true),
          _createVNode(_component_el_button, {
            link: "",
            style: {"font-size":"12px","color":"#bbb","margin-top":"4px"},
            disabled: autoConfigRunning.value,
            onClick: _cache[7] || (_cache[7] = ($event: any) => (startAutoConfig(false)))
          }, {
            default: _withCtx(() => [...(_cache[52] || (_cache[52] = [
              _createTextVNode("使用静默模式", -1)
            ]))]),
            _: 1
          }, 8, ["disabled"])
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_34, [
          (envConfigIsPartial.value)
            ? (_openBlock(), _createElementBlock("div", _hoisted_35, [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(partialSuccessInstances.value, (inst) => {
                  return (_openBlock(), _createElementBlock("div", {
                    key: inst.nickname,
                    class: "inst-row ok"
                  }, [
                    _cache[45] || (_cache[45] = _createElementVNode("span", { class: "inst-dot ok" }, null, -1)),
                    _createElementVNode("span", _hoisted_36, _toDisplayString(inst.nickname), 1),
                    _cache[46] || (_cache[46] = _createElementVNode("span", { class: "inst-badge ok" }, "已就绪", -1))
                  ]))
                }), 128)),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(partialFailedInstances.value, (fail) => {
                  return (_openBlock(), _createElementBlock("div", {
                    key: fail.instance_index,
                    class: "inst-row warn"
                  }, [
                    _cache[47] || (_cache[47] = _createElementVNode("span", { class: "inst-dot warn" }, null, -1)),
                    _createElementVNode("span", _hoisted_37, "微信窗口 " + _toDisplayString(fail.instance_index), 1),
                    _cache[48] || (_cache[48] = _createElementVNode("span", { class: "inst-badge warn" }, "需首次配置", -1))
                  ]))
                }), 128))
              ]))
            : _createCommentVNode("", true),
          _createElementVNode("p", _hoisted_38, [
            (envConfigIsPartial.value)
              ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                  _createTextVNode(" 部分微信账号首次在本设备托管，需执行一次自动配置。 ")
                ], 64))
              : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                  _createTextVNode(" 您使用的是微信 4.1，需进行设备环境配置（一次性操作）。 ")
                ], 64)),
            _cache[49] || (_cache[49] = _createTextVNode(" 点击下方按钮将自动完成以下步骤： ", -1))
          ]),
          _createElementVNode("div", _hoisted_39, [
            (_openBlock(), _createElementBlock(_Fragment, null, _renderList(configStepLabels, (label, idx) => {
              return _createElementVNode("div", {
                key: idx,
                class: _normalizeClass(["step-row", { done: autoConfigSteps.value[idx + 1] === 'done' }])
              }, [
                _createElementVNode("div", _hoisted_40, _toDisplayString(idx + 1), 1),
                _createElementVNode("span", null, [
                  _createTextVNode(_toDisplayString(label), 1),
                  (autoConfigSteps.value[idx + 1] === 'done')
                    ? (_openBlock(), _createElementBlock("span", _hoisted_41, " ✓"))
                    : _createCommentVNode("", true)
                ])
              ], 2)
            }), 64))
          ]),
          (envConfigIsPartial.value)
            ? (_openBlock(), _createElementBlock("p", _hoisted_42, " 已就绪账号可正常使用；配置后需重新登录所有微信 "))
            : _createCommentVNode("", true),
          (autoConfigError.value)
            ? (_openBlock(), _createElementBlock("div", _hoisted_43, [
                _createElementVNode("div", _hoisted_44, [
                  _createVNode(_component_el_icon, null, {
                    default: _withCtx(() => [
                      _createVNode(_unref(CircleCloseFilled))
                    ]),
                    _: 1
                  }),
                  _cache[50] || (_cache[50] = _createTextVNode(" 配置失败 ", -1))
                ]),
                _createElementVNode("p", _hoisted_45, _toDisplayString(autoConfigError.value), 1)
              ]))
            : _createCommentVNode("", true),
          (downgradeSuggestion.value && downgradeSuggestion.value.show)
            ? (_openBlock(), _createElementBlock("div", _hoisted_46, [
                _cache[51] || (_cache[51] = _createElementVNode("div", { class: "downgrade-title" }, "💡 多次失败？试试更稳定的版本", -1)),
                _createElementVNode("p", _hoisted_47, _toDisplayString(downgradeSuggestion.value.message), 1),
                (downgradeSuggestion.value.download_url)
                  ? (_openBlock(), _createBlock(_component_el_button, {
                      key: 0,
                      class: "downgrade-btn",
                      style: {"width":"100%"},
                      onClick: _cache[5] || (_cache[5] = ($event: any) => (openExternalUrl(_unref(getWechatDownloadUrl)())))
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(downgradeSuggestion.value.download_label || '下载推荐版本'), 1)
                      ]),
                      _: 1
                    }))
                  : _createCommentVNode("", true)
              ]))
            : _createCommentVNode("", true)
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: showGuidanceDialog.value,
      "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event: any) => ((showGuidanceDialog).value = $event)),
      width: "460px",
      "align-center": "",
      "close-on-click-modal": false,
      class: "env-dialog"
    }, {
      header: _withCtx(() => [
        _createElementVNode("div", _hoisted_49, [
          _createVNode(_component_el_icon, { class: "dlg-icon" }, {
            default: _withCtx(() => [
              _createVNode(_unref(WarningFilled))
            ]),
            _: 1
          }),
          _createElementVNode("span", null, _toDisplayString(guidanceContent.value?.title || '需要处理'), 1)
        ])
      ]),
      footer: _withCtx(() => [
        _createElementVNode("div", _hoisted_54, [
          (guidanceContent.value?.download_url)
            ? (_openBlock(), _createBlock(_component_el_button, {
                key: 0,
                type: "primary",
                class: "dlg-btn primary",
                style: {"width":"100%"},
                onClick: _cache[9] || (_cache[9] = ($event: any) => (openExternalUrl(_unref(getWechatDownloadUrl)())))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(guidanceContent.value?.download_label || '前往下载'), 1)
                ]),
                _: 1
              }))
            : _createCommentVNode("", true),
          _createVNode(_component_el_button, {
            class: "dlg-btn",
            style: {"width":"100%"},
            onClick: _cache[10] || (_cache[10] = ($event: any) => (showGuidanceDialog.value = false))
          }, {
            default: _withCtx(() => [...(_cache[53] || (_cache[53] = [
              _createTextVNode("我知道了", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_50, [
          (guidanceContent.value?.reason)
            ? (_openBlock(), _createElementBlock("p", _hoisted_51, _toDisplayString(guidanceContent.value.reason), 1))
            : _createCommentVNode("", true),
          (guidanceContent.value?.fix_steps?.length)
            ? (_openBlock(), _createElementBlock("div", _hoisted_52, [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(guidanceContent.value.fix_steps, (label, idx) => {
                  return (_openBlock(), _createElementBlock("div", {
                    key: idx,
                    class: "step-row"
                  }, [
                    _createElementVNode("div", _hoisted_53, _toDisplayString(idx + 1), 1),
                    _createElementVNode("span", null, _toDisplayString(label), 1)
                  ]))
                }), 128))
              ]))
            : _createCommentVNode("", true)
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: showConfigCompleteDialog.value,
      "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event: any) => ((showConfigCompleteDialog).value = $event)),
      width: "360px",
      "align-center": "",
      class: "complete-dialog"
    }, {
      header: _withCtx(() => [...(_cache[54] || (_cache[54] = [
        _createElementVNode("div", { class: "dlg-header ok" }, [
          _createElementVNode("span", null, "✅"),
          _createElementVNode("span", null, "自动配置完成！")
        ], -1)
      ]))]),
      footer: _withCtx(() => [
        _createElementVNode("div", _hoisted_57, [
          _createVNode(_component_el_button, {
            type: "primary",
            class: "dlg-btn primary",
            style: {"width":"100%"},
            loading: initializing.value,
            onClick: launchAppAfterConfig
          }, {
            default: _withCtx(() => [
              _createTextVNode(_toDisplayString(initializing.value ? '正在启动…' : '我已重新登录，启动应用'), 1)
            ]),
            _: 1
          }, 8, ["loading"])
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_55, [
          _createElementVNode("p", _hoisted_56, _toDisplayString(launchedCountAfterConfig.value > 1
              ? `请重新登录 ${launchedCountAfterConfig.value} 个微信账号后，点击下方按钮`
              : '请重新登录微信后，点击下方按钮启动应用'), 1)
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: updateDialogVisible.value,
      "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event: any) => ((updateDialogVisible).value = $event)),
      title: updateInfo.value.is_mandatory ? '强制更新' : '发现新版本',
      width: "450px",
      "close-on-click-modal": !updateInfo.value.is_mandatory,
      "close-on-press-escape": !updateInfo.value.is_mandatory,
      "show-close": !updateInfo.value.is_mandatory,
      class: "update-dialog"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_66, [
          (!updateInfo.value.is_mandatory)
            ? (_openBlock(), _createBlock(_component_el_button, {
                key: 0,
                onClick: _cache[13] || (_cache[13] = ($event: any) => (updateDialogVisible.value = false))
              }, {
                default: _withCtx(() => [...(_cache[59] || (_cache[59] = [
                  _createTextVNode("稍后更新", -1)
                ]))]),
                _: 1
              }))
            : _createCommentVNode("", true),
          (updateInfo.value.installer_url)
            ? (_openBlock(), _createBlock(_component_el_button, {
                key: 1,
                type: "primary",
                onClick: openInstaller
              }, {
                default: _withCtx(() => [...(_cache[60] || (_cache[60] = [
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
        _createElementVNode("div", _hoisted_58, [
          _cache[58] || (_cache[58] = _createElementVNode("div", { class: "update-header" }, [
            _createElementVNode("div", { class: "update-icon-wrap" }, "🚀"),
            _createElementVNode("div", { class: "update-title" }, [
              _createElementVNode("h3", null, "软件更新"),
              _createElementVNode("p", { class: "update-subtitle" }, "发现新版本可用")
            ])
          ], -1)),
          _createElementVNode("div", _hoisted_59, [
            _createElementVNode("div", _hoisted_60, [
              _cache[55] || (_cache[55] = _createElementVNode("span", { class: "version-label" }, "最新版本:", -1)),
              _createElementVNode("span", _hoisted_61, "v" + _toDisplayString(updateInfo.value.latest_version), 1)
            ]),
            _createElementVNode("div", _hoisted_62, [
              _cache[56] || (_cache[56] = _createElementVNode("span", { class: "version-label" }, "发布日期:", -1)),
              _createElementVNode("span", _hoisted_63, _toDisplayString(formatDate(updateInfo.value.release_date)), 1)
            ])
          ]),
          _createElementVNode("div", _hoisted_64, [
            _cache[57] || (_cache[57] = _createElementVNode("h4", null, "更新内容:", -1)),
            _createElementVNode("div", {
              class: "changelog-content",
              innerHTML: formatChangelog(updateInfo.value.changelog)
            }, null, 8, _hoisted_65)
          ]),
          (updateInfo.value.installer_url)
            ? (_openBlock(), _createBlock(_component_el_alert, {
                key: 0,
                type: "info",
                closable: false,
                "show-icon": "",
                title: "安装器版本可用",
                description: "点击下方“下载安装器”后，将在系统浏览器中开始下载；下载完成后运行安装器即可升级，登录状态、激活与数据都会保留。",
                class: "installer-update-alert"
              }))
            : _createCommentVNode("", true),
          (updating.value && !updateInfo.value.installer_url)
            ? (_openBlock(), _createBlock(_component_el_progress, {
                key: 1,
                percentage: updateProgress2.value,
                format: progressFormat,
                "stroke-width": 10,
                class: "update-progress"
              }, null, 8, ["percentage"]))
            : _createCommentVNode("", true)
        ])
      ]),
      _: 1
    }, 8, ["modelValue", "title", "close-on-click-modal", "close-on-press-escape", "show-close"])
  ]))
}
}

})