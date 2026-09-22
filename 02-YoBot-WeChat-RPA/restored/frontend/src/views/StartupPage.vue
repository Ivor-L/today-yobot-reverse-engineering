<template>
  <div class="startup-root">
    <!-- ═══════════════════════════════════════════
         HERO — 品牌展示区（顶部约 1/3）
    ═══════════════════════════════════════════ -->
    <div class="hero">
      <!-- Aurora 极光背景：3 个独立漂浮光斑 -->
      <div class="aurora-blob aurora-b1"></div>
      <div class="aurora-blob aurora-b2"></div>
      <div class="aurora-blob aurora-b3"></div>

      <div class="hero-content">
        <!-- Logo -->
        <div class="logo-ring" :class="{ 'logo-ready': heroReady }">
          <img
            v-if="!logoFailed"
            :src="brandConfig.logo"
            class="hero-logo-img"
            @error="logoFailed = true"
          />
          <div v-else class="hero-logo-fallback">
            {{ (brandConfig.alias || brandConfig.name).charAt(0) }}
          </div>
        </div>

        <!-- 产品名称 -->
        <div class="hero-name" :class="{ 'name-ready': heroReady }">
          {{ brandConfig.alias || brandConfig.name }}
        </div>

        <!-- Slogan -->
        <div class="hero-slogan" :class="{ 'slogan-ready': heroReady }">
          {{ brandConfig.slogan || 'AI 赋能，智驱增长' }}
        </div>

        <!-- 版本 pill + 新版本 badge -->
        <div class="hero-version-row" :class="{ 'version-ready': heroReady }">
          <div class="hero-version">v{{ version }}</div>
          <div v-if="hasNewVersion" class="update-badge" @click="updateDialogVisible = true">
            ↑ 新版本
          </div>
        </div>
      </div>

    </div>

    <!-- ═══════════════════════════════════════════
         BUSINESS PANEL — 业务交互区（底部约 2/3）
    ═══════════════════════════════════════════ -->
    <div v-if="showYobotPromotion" class="yobot-promo-banner" :class="{ 'promo-ready': heroReady }">
      <div class="yobot-promo-mark" aria-hidden="true">
        <img :src="yobotLogoUrl" alt="" />
      </div>
      <div class="yobot-promo-copy">
        <div class="yobot-promo-title">全新的桌面 AI 助理</div>
        <div class="yobot-promo-desc">深度融合 YokoAI 机器人全部功能，通过聊天就能控制</div>
      </div>
      <button type="button" class="yobot-promo-link" @click="openExternalUrl(YOBOT_WEBSITE_URL)">
        官网下载 <span aria-hidden="true">→</span>
      </button>
    </div>

    <div
      class="panel"
      :class="{ 'panel-ready': heroReady, 'with-yobot-promo': showYobotPromotion }"
    >

      <!-- ─── 检测中 ─── -->
      <div v-if="startupState === 'checking'" class="state-body center">
        <div class="spinner"></div>
        <p class="state-text">正在检测微信状态…</p>
      </div>

      <!-- ─── 未检测到微信 ─── -->
      <div v-else-if="startupState === 'no_wechat'" class="state-body">
        <div class="status-pill warn">未检测到运行中的微信</div>
        <p class="panel-hint">请选择启动方式</p>

        <div class="action-col">
          <el-button
            type="primary"
            class="action-btn primary-btn"
            style="width:100%"
            :loading="launching"
            @click="launchSingle"
          >{{ launching ? '正在启动…' : '启动微信（单账号）' }}</el-button>

          <el-button
            v-if="multiInstanceEnabled"
            type="warning"
            class="action-btn warn-btn"
            style="width:100%"
            :disabled="launching"
            @click="openWizard"
          >多开微信（多账号托管）</el-button>
        </div>

        <span class="refresh-link">
          已手动启动？
          <el-button link type="primary" @click="checkWechatStatus">点此刷新</el-button>
        </span>
      </div>

      <!-- Mac strict candidate: never turn an API failure into a fake
           successful "0 instances" state. Windows keeps its frozen Legacy
           fallback because its config does not opt into this branch. -->
      <div v-else-if="startupState === 'check_failed'" class="state-body">
        <div class="status-pill warn">微信状态检测失败</div>
        <p class="panel-hint">{{ startupCheckError }}</p>
        <el-button
          type="primary"
          class="action-btn primary-btn"
          style="width:100%;max-width:290px"
          @click="checkWechatStatus"
        >重新检测</el-button>
      </div>

      <!-- ─── 检测到微信 ─── -->
      <div v-else-if="startupState === 'wechat_found'" class="state-body">

        <!-- 实例信息卡：状态 + 多开入口聚合 -->
        <div class="instance-info-card">
          <div class="instance-info-main">
            <span class="instance-ok-dot"></span>
            <span class="instance-count-text">检测到 <strong>{{ detectedCount }}</strong> 个微信窗口</span>
          </div>
          <div v-if="multiInstanceEnabled" class="instance-info-action">
            <span class="instance-hint">账号数量不对？</span>
            <el-button link type="primary" size="small" style="padding:0;height:auto;line-height:1;vertical-align:baseline" @click="openWizard">多开向导 →</el-button>
          </div>
        </div>

        <ul class="guide-list">
          <li>{{ multiInstanceEnabled ? '请确保所有微信账号已登录' : '请确保微信账号已登录' }}</li>
          <li class="warn-item">
            <span>⚠</span>
            <strong>确保微信窗口可见，不要最小化</strong>
          </li>
          <li>点击启动后，请勿操作鼠标</li>
        </ul>

        <div class="progress-wrap" v-if="initializing">
          <el-progress :percentage="progress" :status="progressStatus"
                       :stroke-width="6" :show-text="false" />
          <p class="progress-label">{{ progressText }}</p>
        </div>

        <el-button
          type="primary"
          class="action-btn cta-btn"
          :loading="initializing"
          @click="handleMultiStartup"
        >{{ initializing ? '正在启动…' : '启动应用' }}</el-button>
      </div>

      <!-- ─── 等待用户登录（多开后） ─── -->
      <div v-else-if="startupState === 'wait_login'" class="state-body">
        <div class="status-pill info">已启动 {{ wizardCount }} 个微信窗口</div>
        <p class="panel-hint">请在桌面找到微信窗口，依次登录所有账号</p>

        <div class="tip-box">
          <p class="tip-title">💡 提示</p>
          <ul>
            <li>微信窗口已在桌面显示，请切换过去</li>
            <li>如有多个窗口，请依次登录每一个</li>
            <li>全部登录完成后，点击下方按钮</li>
          </ul>
        </div>

        <div class="progress-wrap" v-if="initializing">
          <el-progress :percentage="progress" :status="progressStatus"
                       :stroke-width="6" :show-text="false" />
          <p class="progress-label">{{ progressText }}</p>
        </div>

        <el-button
          type="primary"
          class="action-btn primary-btn"
          style="width:100%;max-width:290px"
          :loading="initializing"
          @click="handleMultiStartup"
        >{{ initializing ? '正在初始化…' : '我已全部登录完成' }}</el-button>

        <el-button link style="font-size:12px;color:#aaa;margin-top:4px" @click="checkWechatStatus">
          返回重新检测
        </el-button>
      </div>

      <!-- ─── 免责声明 ─── -->
      <div class="disclaimer">
        <div class="disclaimer-title">免责声明</div>
        <span class="disclaimer-dot">·</span>
        <span>本软件仅供日常交流使用，严禁用于非法用途</span>
        <span>请遵守相关法律法规，违规使用造成的后果由使用者承担</span>
      </div>

      <!-- ─── 底部版权 ─── -->
      <div class="panel-footer">
        <span>{{ brandConfig.copyright || 'Powered by AI' }}</span>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════
         多开向导 Dialog
    ═══════════════════════════════════════════ -->
    <el-dialog
      v-model="showWizardDialog"
      title="多开微信向导"
      width="400px"
      align-center
      :close-on-click-modal="wizardStep === 'count_select'"
      class="wizard-dialog"
    >
      <!-- Step 1: 选数量 -->
      <div v-if="wizardStep === 'count_select'" class="wizard-body">
        <p class="wizard-q">需要同时运行几个微信账号？</p>
        <div class="count-row">
          <div
            v-for="n in [2, 3]"
            :key="n"
            class="count-chip"
            :class="{ active: wizardCount === n }"
            @click="wizardCount = n"
          >{{ n }}</div>
        </div>
        <div class="warn-box">
          <p>⚠ 操作前注意</p>
          <ul>
            <li>将关闭所有已运行的微信进程</li>
            <li>重新启动后需重新扫码登录所有账号</li>
          </ul>
        </div>
      </div>

      <!-- Step 2: 启动中 -->
      <div v-else-if="wizardStep === 'launching'" class="wizard-body center">
        <div class="spinner large"></div>
        <p class="state-text" style="margin-top:16px">正在启动 {{ wizardCount }} 个微信窗口…</p>
        <p style="color:#aaa;font-size:13px">请稍候，不要操作鼠标</p>
      </div>

      <template #footer>
        <div class="wizard-footer" v-if="wizardStep === 'count_select'">
          <el-button @click="showWizardDialog = false">取消</el-button>
          <el-button type="primary" @click="startMultiLaunch">
            开始多开（{{ wizardCount }} 个）
          </el-button>
        </div>
        <div v-else class="wizard-footer center-text">
          <span style="color:#aaa;font-size:13px">处理中，请稍候…</span>
        </div>
      </template>
    </el-dialog>

    <!-- ═══════════════════════════════════════════
         环境配置 Dialog（全部失败 / 部分失败）
    ═══════════════════════════════════════════ -->
    <el-dialog
      v-model="showEnvConfigDialog"
      width="460px"
      align-center
      :close-on-click-modal="false"
      class="env-dialog"
    >
      <template #header>
        <div class="dlg-header warn">
          <el-icon class="dlg-icon"><WarningFilled /></el-icon>
          <span>{{ envConfigIsPartial ? '部分微信需要首次配置' : '设备环境异常' }}</span>
        </div>
      </template>

      <div class="dlg-body">
        <!-- 部分失败时的实例状态列表 -->
        <div v-if="envConfigIsPartial" class="instance-list">
          <div
            v-for="inst in partialSuccessInstances"
            :key="inst.nickname"
            class="inst-row ok"
          >
            <span class="inst-dot ok"></span>
            <span class="inst-name">{{ inst.nickname }}</span>
            <span class="inst-badge ok">已就绪</span>
          </div>
          <div
            v-for="fail in partialFailedInstances"
            :key="fail.instance_index"
            class="inst-row warn"
          >
            <span class="inst-dot warn"></span>
            <span class="inst-name">微信窗口 {{ fail.instance_index }}</span>
            <span class="inst-badge warn">需首次配置</span>
          </div>
        </div>

        <p class="dlg-desc">
          <template v-if="envConfigIsPartial">
            部分微信账号首次在本设备托管，需执行一次自动配置。
          </template>
          <template v-else>
            您使用的是微信 4.1，需进行设备环境配置（一次性操作）。
          </template>
          点击下方按钮将自动完成以下步骤：
        </p>

        <div class="steps-list">
          <div
            v-for="(label, idx) in configStepLabels"
            :key="idx"
            class="step-row"
            :class="{ done: autoConfigSteps[idx + 1] === 'done' }"
          >
            <div class="step-num">{{ idx + 1 }}</div>
            <span>{{ label }}<span v-if="autoConfigSteps[idx + 1] === 'done'"> ✓</span></span>
          </div>
        </div>

        <p v-if="envConfigIsPartial" class="skip-note">
          已就绪账号可正常使用；配置后需重新登录所有微信
        </p>

        <!-- 配置失败内联提示 -->
        <div v-if="autoConfigError" class="config-error-box">
          <div class="config-error-title">
            <el-icon><CircleCloseFilled /></el-icon>
            配置失败
          </div>
          <p class="config-error-msg">{{ autoConfigError }}</p>
        </div>

        <!-- 连续失败后的降级引导（仅 RPA 返回 show=true 时显示） -->
        <div v-if="downgradeSuggestion && downgradeSuggestion.show" class="downgrade-box">
          <div class="downgrade-title">💡 多次失败？试试更稳定的版本</div>
          <p class="downgrade-msg">{{ downgradeSuggestion.message }}</p>
          <el-button
            v-if="downgradeSuggestion.download_url"
            class="downgrade-btn"
            style="width:100%"
            @click="openExternalUrl(getWechatDownloadUrl())"
          >{{ downgradeSuggestion.download_label || '下载推荐版本' }}</el-button>
        </div>
      </div>

      <template #footer>
        <div class="dlg-footer">
          <el-button
            type="primary"
            class="dlg-btn primary"
            style="width:100%"
            :loading="autoConfigRunning"
            @click="startAutoConfig(true)"
          >{{ autoConfigRunning ? '正在自动配置…' : (autoConfigError ? '重新配置' : '开始自动配置（推荐）') }}</el-button>

          <el-button
            v-if="envConfigIsPartial"
            class="dlg-btn"
            style="width:100%"
            :disabled="autoConfigRunning"
            @click="skipConfigAndEnter"
          >跳过，仅用已就绪的 {{ partialSuccessInstances.length }} 个账号</el-button>

          <el-button
            link
            style="font-size:12px;color:#bbb;margin-top:4px"
            :disabled="autoConfigRunning"
            @click="startAutoConfig(false)"
          >使用静默模式</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ═══════════════════════════════════════════
         版本引导 Dialog（微信版本不支持等，内容由 RPA 返回）
    ═══════════════════════════════════════════ -->
    <el-dialog
      v-model="showGuidanceDialog"
      width="460px"
      align-center
      :close-on-click-modal="false"
      class="env-dialog"
    >
      <template #header>
        <div class="dlg-header warn">
          <el-icon class="dlg-icon"><WarningFilled /></el-icon>
          <span>{{ guidanceContent?.title || '需要处理' }}</span>
        </div>
      </template>

      <div class="dlg-body">
        <p v-if="guidanceContent?.reason" class="dlg-desc" style="white-space:pre-line">
          {{ guidanceContent.reason }}
        </p>

        <div v-if="guidanceContent?.fix_steps?.length" class="steps-list">
          <div
            v-for="(label, idx) in guidanceContent.fix_steps"
            :key="idx"
            class="step-row"
          >
            <div class="step-num">{{ idx + 1 }}</div>
            <span>{{ label }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dlg-footer">
          <el-button
            v-if="guidanceContent?.download_url"
            type="primary"
            class="dlg-btn primary"
            style="width:100%"
            @click="openExternalUrl(getWechatDownloadUrl())"
          >{{ guidanceContent?.download_label || '前往下载' }}</el-button>
          <el-button
            class="dlg-btn"
            style="width:100%"
            @click="showGuidanceDialog = false"
          >我知道了</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ═══════════════════════════════════════════
         配置完成 Dialog
    ═══════════════════════════════════════════ -->
    <el-dialog
      v-model="showConfigCompleteDialog"
      width="360px"
      align-center
      class="complete-dialog"
    >
      <template #header>
        <div class="dlg-header ok">
          <span>✅</span>
          <span>自动配置完成！</span>
        </div>
      </template>
      <div class="dlg-body">
        <p class="dlg-desc" style="text-align:center">
          {{
            launchedCountAfterConfig > 1
              ? `请重新登录 ${launchedCountAfterConfig} 个微信账号后，点击下方按钮`
              : '请重新登录微信后，点击下方按钮启动应用'
          }}
        </p>
      </div>
      <template #footer>
        <div class="dlg-footer">
          <el-button
            type="primary"
            class="dlg-btn primary"
            style="width:100%"
            :loading="initializing"
            @click="launchAppAfterConfig"
          >{{ initializing ? '正在启动…' : '我已重新登录，启动应用' }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ═══════════════════════════════════════════
         版本更新 Dialog
    ═══════════════════════════════════════════ -->
    <el-dialog
      v-model="updateDialogVisible"
      :title="updateInfo.is_mandatory ? '强制更新' : '发现新版本'"
      width="450px"
      :close-on-click-modal="!updateInfo.is_mandatory"
      :close-on-press-escape="!updateInfo.is_mandatory"
      :show-close="!updateInfo.is_mandatory"
      class="update-dialog"
    >
      <div class="update-content">
        <div class="update-header">
          <div class="update-icon-wrap">🚀</div>
          <div class="update-title">
            <h3>软件更新</h3>
            <p class="update-subtitle">发现新版本可用</p>
          </div>
        </div>

        <div class="version-info">
          <div class="version-item">
            <span class="version-label">最新版本:</span>
            <span class="version-value latest">v{{ updateInfo.latest_version }}</span>
          </div>
          <div class="version-item">
            <span class="version-label">发布日期:</span>
            <span class="version-value">{{ formatDate(updateInfo.release_date) }}</span>
          </div>
        </div>

        <div class="changelog">
          <h4>更新内容:</h4>
          <div class="changelog-content" v-html="formatChangelog(updateInfo.changelog)"></div>
        </div>

        <el-alert
          v-if="updateInfo.installer_url"
          type="info"
          :closable="false"
          show-icon
          title="安装器版本可用"
          description="点击下方“下载安装器”后，将在系统浏览器中开始下载；下载完成后运行安装器即可升级，登录状态、激活与数据都会保留。"
          class="installer-update-alert"
        />

        <el-progress
          v-if="updating && !updateInfo.installer_url"
          :percentage="updateProgress2"
          :format="progressFormat"
          :stroke-width="10"
          class="update-progress"
        ></el-progress>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button
            v-if="!updateInfo.is_mandatory"
            @click="updateDialogVisible = false"
          >稍后更新</el-button>
          <el-button
            v-if="updateInfo.installer_url"
            type="primary"
            @click="openInstaller"
          >下载安装器</el-button>
          <el-button
            v-else
            type="primary"
            @click="startUpdate"
            :loading="updating"
            :disabled="updating"
          >{{ updating ? '更新中' : '立即更新' }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
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

const brandConfig = inject<Ref<BrandConfig>>('brandConfig', ref({
  channel_id: 'channel_000001',
  name: 'YokoAI机器人',
  ename: 'YokoAIbot',
  logo: './img/logo.jpg',
  contact: '',
  slogan: '让每个企业都有 AI 销售'
}))

const showYobotPromotion = shouldShowYobotPromotion()
const yobotLogoUrl = './icon-png/yobot_logo.png'

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
type StartupState = 'checking' | 'no_wechat' | 'wechat_found' | 'check_failed' | 'wait_login'
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
</script>

<style scoped>
/* ═══════════════════════════════════════════
   根布局：全屏，竖向两段
═══════════════════════════════════════════ */
.startup-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0c0e1f;
  position: relative;
}

/* ═══════════════════════════════════════════
   HERO 区
═══════════════════════════════════════════ */
.hero {
  position: relative;
  flex: 0 0 40%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* ── Aurora 极光背景 ── */
.aurora-blob {
  position: absolute;
  border-radius: 50%;
  /* GPU 合成层，避免重排 */
  will-change: transform;
  filter: blur(72px);
  opacity: 0;
  animation: auroraFadeIn 1.8s ease forwards;
}

/* 靛蓝光斑：左上，主色调 */
.aurora-b1 {
  width: 380px; height: 320px;
  top: -80px; left: -80px;
  background: radial-gradient(ellipse, rgba(67,97,238,0.65) 0%, transparent 70%);
  animation: auroraFadeIn 1.8s ease forwards,
             auroraDrift1 22s ease-in-out 1.8s infinite;
}

/* 紫罗兰光斑：右侧，辅色 */
.aurora-b2 {
  width: 280px; height: 340px;
  top: -30px; right: -50px;
  background: radial-gradient(ellipse, rgba(139,92,246,0.55) 0%, transparent 70%);
  animation: auroraFadeIn 1.8s ease 0.3s forwards,
             auroraDrift2 26s ease-in-out 2.1s infinite;
}

/* 宝蓝光斑：底部中央，点缀 */
.aurora-b3 {
  width: 240px; height: 220px;
  bottom: 10px; left: 50%;
  transform: translateX(-50%);
  background: radial-gradient(ellipse, rgba(59,130,246,0.4) 0%, transparent 70%);
  animation: auroraFadeIn 1.8s ease 0.6s forwards,
             auroraDrift3 18s ease-in-out 2.4s infinite;
}

@keyframes auroraFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* 各光斑走不同的缓慢路径，形成有机漂浮感 */
@keyframes auroraDrift1 {
  0%,100% { transform: translate(0, 0)    scale(1);    }
  25%     { transform: translate(40px,-20px) scale(1.06); }
  50%     { transform: translate(20px, 30px) scale(0.96); }
  75%     { transform: translate(-20px, 10px) scale(1.03); }
}
@keyframes auroraDrift2 {
  0%,100% { transform: translate(0, 0)      scale(1);    }
  30%     { transform: translate(-30px, 20px) scale(1.08); }
  60%     { transform: translate(20px,-30px)  scale(0.94); }
  80%     { transform: translate(-10px, 10px) scale(1.04); }
}
@keyframes auroraDrift3 {
  0%,100% { transform: translateX(-50%) translate(0, 0)     scale(1);    }
  40%     { transform: translateX(-50%) translate(30px,-15px) scale(1.1);  }
  70%     { transform: translateX(-50%) translate(-20px, 20px) scale(0.92); }
}

/* hero 内容容器 */
.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
}

/* Logo 外环 */
.logo-ring {
  width: 96px; height: 96px;
  border-radius: 24px;
  border: 2.5px solid rgba(255,255,255,0.18);
  box-shadow:
    0 0 0 6px rgba(255,255,255,0.06),
    0 12px 36px rgba(0,0,0,0.45);
  overflow: hidden;
  opacity: 0;
  transform: scale(0.68);
  transition: opacity 0.55s cubic-bezier(0.34,1.56,0.64,1),
              transform 0.55s cubic-bezier(0.34,1.56,0.64,1);
  animation: logoPulse 3.5s ease-in-out 1.2s infinite;
}
.logo-ring.logo-ready {
  opacity: 1;
  transform: scale(1);
}
@keyframes logoPulse {
  0%,100% { box-shadow: 0 0 0 6px rgba(255,255,255,0.06), 0 12px 36px rgba(0,0,0,0.45); }
  50%     { box-shadow: 0 0 0 10px rgba(255,255,255,0.12), 0 12px 36px rgba(0,0,0,0.45); }
}

.hero-logo-img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
.hero-logo-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px; font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #409eff, #36d1dc);
}

/* 产品名称 */
.hero-name {
  font-size: 34px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 12px rgba(0,0,0,0.4);
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.5s ease 0.35s, transform 0.5s ease 0.35s;
}
.hero-name.name-ready {
  opacity: 1;
  transform: translateY(0);
}

/* Slogan */
.hero-slogan {
  font-size: 15px;
  color: rgba(255,255,255,0.62);
  letter-spacing: 1.5px;
  font-style: italic;
  opacity: 0;
  transition: opacity 0.5s ease 0.58s;
}
.hero-slogan.slogan-ready { opacity: 1; }

/* 版本行（pill + badge 并排） */
.hero-version-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  opacity: 0;
  transition: opacity 0.5s ease 0.75s;
}
.hero-version-row.version-ready { opacity: 1; }

.hero-version {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 2px 10px;
}

/* 新版本 badge */
.update-badge {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  border-radius: 10px;
  padding: 2px 9px;
  cursor: pointer;
  animation: badgePulse 2s ease-in-out infinite;
  white-space: nowrap;
}
.update-badge:hover { opacity: 0.85; }
@keyframes badgePulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
  50%     { box-shadow: 0 0 0 5px rgba(245,158,11,0); }
}

/* YoBot 迁移入口：跨在品牌区与操作区之间，但不抢占主操作视觉层级 */
.yobot-promo-banner {
  position: absolute;
  z-index: 5;
  top: 40%;
  left: 50%;
  width: min(440px, calc(100vw - 72px));
  min-height: 60px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 12px;
  border: 1px solid rgba(119, 139, 255, 0.28);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 14px 34px rgba(8, 15, 48, 0.22), 0 2px 8px rgba(8, 15, 48, 0.08);
  opacity: 0;
  transform: translate(-50%, -38%) translateY(12px);
  transition: opacity 0.5s ease 0.9s, transform 0.5s ease 0.9s;
}
.yobot-promo-banner.promo-ready {
  opacity: 1;
  transform: translate(-50%, -38%) translateY(0);
}
.yobot-promo-mark {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #08090d;
  box-shadow: 0 5px 12px rgba(25, 32, 67, 0.18);
  overflow: hidden;
}
.yobot-promo-mark img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
.yobot-promo-copy {
  flex: 1;
  min-width: 0;
}
.yobot-promo-title {
  color: #182033;
  font-size: 14px;
  line-height: 20px;
  font-weight: 700;
}
.yobot-promo-desc {
  color: #7a8294;
  font-size: 11px;
  line-height: 17px;
  white-space: nowrap;
}
.yobot-promo-link {
  flex: 0 0 auto;
  padding: 7px 10px;
  border: 0;
  border-radius: 9px;
  background: #edf2ff;
  color: #4169e1;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
.yobot-promo-link:hover {
  color: #fff;
  background: #4169e1;
  transform: translateY(-1px);
}
.yobot-promo-link:focus-visible {
  outline: 2px solid #4169e1;
  outline-offset: 2px;
}

/* ═══════════════════════════════════════════
   PANEL 区
═══════════════════════════════════════════ */
.panel {
  flex: 1;
  background: #f8f9fb;
  display: flex;
  flex-direction: column;
  padding: 24px 28px 0;
  overflow-y: auto;
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.55s ease 0.2s, transform 0.55s ease 0.2s;
  position: relative;
  z-index: 2;
  margin: 0 10px 10px;
  border-radius: 20px;
}
.panel.with-yobot-promo {
  padding-top: 50px;
}
.panel.panel-ready {
  opacity: 1;
  transform: translateY(0);
}

/* 状态内容区 */
.state-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-bottom: 12px;
}
.state-body.center { justify-content: center; }

/* 状态 pill */
.status-pill {
  padding: 5px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.status-pill.ok   { background:#f0f9eb; color:#52c41a; border:1px solid #b7eb8f; }
.status-pill.warn { background:#fff7e6; color:#fa8c16; border:1px solid #ffd591; }
.status-pill.info { background:#e6f7ff; color:#1890ff; border:1px solid #91d5ff; }

.panel-hint { color:#606266; font-size:14px; margin:0; }

/* 操作按钮列 */
.action-col { display:flex; flex-direction:column; align-items:stretch; gap:10px; width:100%; max-width:290px; }
.action-btn {
  width:100%; height:46px;
  border-radius:23px;
  font-size:15px; font-weight:600;
  letter-spacing:0.3px;
  border:none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.action-btn:hover { transform:translateY(-2px); }
.primary-btn { background:linear-gradient(135deg,#409eff,#36d1dc); color:#fff; }
.primary-btn:hover { box-shadow:0 6px 20px rgba(64,158,255,0.4); }
.warn-btn   { background:linear-gradient(135deg,#fa8c16,#f56c6c); color:#fff; }
.warn-btn:hover { box-shadow:0 6px 20px rgba(250,140,22,0.4); }
.cta-btn    { background:linear-gradient(135deg,#4361ee,#3b82f6); color:#fff; max-width:260px; height:52px; font-size:16px; }
.cta-btn:hover { box-shadow:0 8px 24px rgba(67,97,238,0.38); }

.refresh-link { font-size:12px; color:#aaa; }

/* 实例信息卡 */
.instance-info-card {
  width: 100%;
  max-width: 340px;
  background: #fff;
  border: 1px solid #e0e7ff;
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(67,97,238,0.08);
}
.instance-info-main {
  display: flex;
  align-items: center;
  gap: 8px;
}
.instance-ok-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 0 3px rgba(82,196,26,0.18);
  flex-shrink: 0;
}
.instance-count-text {
  font-size: 14px;
  color: #303133;
}
.instance-count-text strong {
  color: #4361ee;
  font-size: 16px;
}
.instance-info-action {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 16px;
  line-height: 1;
}
.instance-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1;
}

/* 引导列表 */
.guide-list {
  list-style: decimal;
  padding-left: 20px;
  color: #606266;
  font-size: 14px;
  line-height: 2;
  margin: 0;
  width: 100%;
  max-width: 340px;
}
.warn-item {
  color:#fa8c16;
  background:rgba(250,140,22,0.08);
  border-radius:6px;
  padding:6px 10px;
  margin:4px 0;
  list-style:none;
  margin-left:-20px;
  display:flex; gap:6px; align-items:center;
}

/* 登录等待提示 */
.tip-box {
  background:#fff;
  border:1px solid #e8eaed;
  border-radius:10px;
  padding:14px 18px;
  width:100%;
  max-width:340px;
  box-sizing:border-box;
}
.tip-title { color:#1890ff; font-weight:600; font-size:13px; margin:0 0 8px; }
.tip-box ul { margin:0; padding-left:18px; }
.tip-box li { color:#606266; font-size:13px; line-height:1.9; }

/* 进度 */
.progress-wrap { width:100%; max-width:340px; }
.progress-label { text-align:center; color:#409eff; font-size:13px; margin-top:8px; }

/* 旋转加载 */
.spinner {
  width:36px; height:36px;
  border:3px solid rgba(64,158,255,0.2);
  border-top-color:#409eff;
  border-radius:50%;
  animation:spin 0.9s linear infinite;
}
.spinner.large { width:44px; height:44px; }
@keyframes spin { to { transform:rotate(360deg); } }

.state-text { color:#606266; font-size:15px; margin:0; }

/* 免责声明 */
.disclaimer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 16px;
  background: rgba(67,97,238,0.04);
  border: 1px solid rgba(67,97,238,0.1);
  border-radius: 8px;
  margin-top: auto;
  color: #909399;
  font-size: 11.5px;
  line-height: 1.7;
  text-align: center;
}
.disclaimer-title {
  font-weight: 600;
  color: #6b8cff;
  white-space: nowrap;
  font-size: 12px;
}
.disclaimer-dot {
  color: #c0c4cc;
  font-size: 10px;
  display: inline;
  margin: 0 3px;
}

/* panel 底部版权 */
.panel-footer {
  text-align: center;
  padding: 10px 0 14px;
  color: #c0c4cc;
  font-size: 11px;
  border-top: 1px solid #edf0f3;
}

/* ═══════════════════════════════════════════
   多开向导 Dialog
═══════════════════════════════════════════ */
.wizard-body {
  display:flex; flex-direction:column;
  gap:14px; padding:4px 2px;
}
.wizard-body.center { align-items:center; }
.wizard-q { color:#2c3e50; font-size:15px; font-weight:600; margin:0; }

.count-row { display:flex; gap:12px; }
.count-chip {
  width:56px; height:56px; border-radius:14px;
  display:flex; align-items:center; justify-content:center;
  font-size:22px; font-weight:700; cursor:pointer;
  background:#f0f2f5; color:#606266;
  border:2px solid transparent;
  transition:all 0.18s;
  user-select:none;
}
.count-chip:hover { border-color:#a0cfff; color:#409eff; }
.count-chip.active { background:#e6f7ff; border-color:#409eff; color:#409eff; }

.warn-box {
  background:#fff7e6; border-radius:8px; padding:10px 14px;
}
.warn-box p { color:#fa8c16; font-weight:600; font-size:13px; margin:0 0 4px; }
.warn-box ul { margin:0; padding-left:18px; }
.warn-box li { color:#595959; font-size:13px; line-height:1.9; }

.config-error-box {
  margin-top:12px; background:#fff2f0; border:1px solid #ffccc7;
  border-radius:8px; padding:10px 14px;
}
.config-error-title {
  display:flex; align-items:center; gap:6px;
  color:#ff4d4f; font-weight:600; font-size:13px; margin-bottom:6px;
}
.config-error-msg {
  color:#595959; font-size:13px; line-height:1.75;
  margin:0; white-space:pre-line;
}

.downgrade-box {
  margin-top:12px; background:#fffbe6; border:1px solid #ffe58f;
  border-radius:8px; padding:10px 14px;
}
.downgrade-title {
  color:#d48806; font-weight:600; font-size:13px; margin-bottom:6px;
}
.downgrade-msg {
  color:#595959; font-size:13px; line-height:1.75;
  margin:0 0 10px; white-space:pre-line;
}
.downgrade-btn {
  background:#faad14; border-color:#faad14; color:#fff;
}
.downgrade-btn:hover { background:#d48806; border-color:#d48806; color:#fff; }

.wizard-footer { display:flex; justify-content:flex-end; gap:10px; }
.wizard-footer.center-text { justify-content:center; }

/* ═══════════════════════════════════════════
   环境配置 / 完成 Dialog 通用
═══════════════════════════════════════════ */
.dlg-header {
  display:flex; align-items:center; gap:8px;
  font-size:17px; font-weight:700; padding:2px 0;
}
.dlg-header.warn { color:#fa8c16; }
.dlg-header.ok   { color:#52c41a; }
.dlg-icon        { font-size:20px; }

.dlg-body { padding:2px 0 8px; }
.dlg-desc { color:#595959; font-size:13px; line-height:1.75; margin:0 0 12px; }

/* 实例状态列表 */
.instance-list { margin-bottom:14px; }
.inst-row {
  display:flex; align-items:center; gap:8px;
  padding:8px 12px; border-radius:8px; margin-bottom:5px;
}
.inst-row.ok   { background:#f6ffed; }
.inst-row.warn { background:#fff7e6; }
.inst-dot {
  width:8px; height:8px; border-radius:50%; flex-shrink:0;
}
.inst-dot.ok   { background:#52c41a; }
.inst-dot.warn { background:#fa8c16; }
.inst-name { flex:1; font-size:13px; color:#2c3e50; }
.inst-badge {
  font-size:11px; font-weight:600; padding:1px 8px;
  border-radius:8px;
}
.inst-badge.ok   { background:#d9f7be; color:#389e0d; }
.inst-badge.warn { background:#ffe7ba; color:#d46b08; }

/* 步骤列表 */
.steps-list {
  background:#f8f9fb; border-radius:12px; padding:12px 16px;
  display:flex; flex-direction:column; gap:2px;
}
.step-row {
  display:flex; align-items:center; gap:12px;
  padding:8px 0;
  border-bottom:1px solid #f0f2f5;
  color:#2c3e50; font-size:13px;
  transition: color 0.3s;
}
.step-row:last-child { border-bottom:none; }
.step-row.done { color:#52c41a; }
.step-num {
  width:24px; height:24px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:700; color:#fff; flex-shrink:0;
  background:linear-gradient(135deg,#5AC8FA,#0A84FF);
  box-shadow:0 3px 10px rgba(10,132,255,0.3);
}
.step-row.done .step-num { background:linear-gradient(135deg,#73d13d,#52c41a); box-shadow:none; }

.skip-note { color:#aaa; font-size:12px; margin:10px 0 0; }

/* dialog 底部按钮区 */
.dlg-footer {
  display:flex; flex-direction:column; align-items:stretch; gap:8px;
}
/* 纵向堆叠时清除 Element Plus 相邻按钮默认的 margin-left，避免第二个按钮右偏 */
.dlg-footer :deep(.el-button + .el-button) {
  margin-left:0;
}
.dlg-btn {
  width:100%; height:42px; border-radius:21px; font-weight:600; font-size:14px;
}
.dlg-btn.primary {
  background:linear-gradient(135deg,#0A84FF,#0060DF);
  color:#fff; border:none;
  box-shadow:0 6px 18px rgba(10,132,255,0.3);
}

/* ═══════════════════════════════════════════
   Dialog 容器全局覆盖
═══════════════════════════════════════════ */
:deep(.wizard-dialog .el-dialog),
:deep(.env-dialog .el-dialog),
:deep(.complete-dialog .el-dialog) {
  border-radius: 20px;
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 60px rgba(0,0,0,0.18);
}
:deep(.env-dialog .el-dialog__header),
:deep(.complete-dialog .el-dialog__header) {
  padding: 20px 24px 10px;
  border-bottom: 1px solid #f0f2f5;
}
:deep(.env-dialog .el-dialog__body),
:deep(.complete-dialog .el-dialog__body) {
  padding: 14px 24px 8px;
}
:deep(.env-dialog .el-dialog__footer),
:deep(.complete-dialog .el-dialog__footer) {
  padding: 8px 24px 20px;
}

/* 进度条覆盖 */
:deep(.el-progress-bar__outer) { background:#e8ecf0; border-radius:4px; }
:deep(.el-progress-bar__inner) {
  background:linear-gradient(90deg,#409eff,#36d1dc);
  border-radius:4px; transition:width 0.35s ease;
}

/* ═══════════════════════════════════════════
   版本更新 Dialog
═══════════════════════════════════════════ */
.update-content { padding: 4px 0; }
.update-header {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 16px;
}
.update-icon-wrap {
  font-size: 36px; line-height: 1;
  flex-shrink: 0;
}
.update-title h3 { margin: 0 0 4px; font-size: 16px; color: #303133; }
.update-subtitle { margin: 0; font-size: 13px; color: #909399; }

.version-info {
  display: flex; gap: 20px;
  background: #f5f7ff; border-radius: 8px;
  padding: 10px 14px; margin-bottom: 14px;
}
.version-item { display: flex; align-items: center; gap: 6px; }
.version-label { font-size: 13px; color: #909399; }
.version-value { font-size: 13px; color: #303133; }
.version-value.latest { color: #4361ee; font-weight: 700; font-size: 15px; }

.changelog h4 { margin: 0 0 8px; font-size: 13px; color: #606266; }
.changelog-content {
  font-size: 13px; color: #303133;
  line-height: 1.8;
  max-height: 160px; overflow-y: auto;
  background: #fafafa; border-radius: 6px;
  padding: 10px 12px;
  border: 1px solid #edf0f3;
}
.update-progress { margin-top: 14px; }
.installer-update-alert { margin-top: 14px; }
</style>
