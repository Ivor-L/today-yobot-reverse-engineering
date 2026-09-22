<template>
  <div class="runtime-startup-root">
    <div class="background-orb orb-left" aria-hidden="true"></div>
    <div class="background-orb orb-right" aria-hidden="true"></div>

    <header class="startup-header">
      <div class="brand-block">
        <div class="brand-logo">
          <img
            v-if="!logoFailed"
            :src="brandConfig.logo"
            alt=""
            @error="logoFailed = true"
          />
          <span v-else>{{ brandInitial }}</span>
        </div>
        <div>
          <p class="brand-name">{{ brandConfig.alias || brandConfig.name }}</p>
          <p class="brand-slogan">{{ brandConfig.slogan || 'AI 赋能，智驱增长' }}</p>
        </div>
      </div>
      <div class="runtime-badge">统一启动流程</div>
    </header>

    <main class="startup-content">
      <section v-if="startupStore.loadState === 'loading'" class="state-card centered-card">
        <div class="loading-ring" aria-hidden="true"></div>
        <h1>正在检测微信状态</h1>
        <p>只读取当前实例状态，不会自动执行启动或配置操作。</p>
      </section>

      <section
        v-else-if="startupStore.loadState === 'contract_error'"
        class="state-card centered-card"
      >
        <div class="state-symbol error-symbol">!</div>
        <h1>启动服务暂不可用</h1>
        <p>{{ loadErrorText }}</p>
        <div class="error-code">{{ startupStore.error?.code }}</div>
        <el-button type="primary" :loading="refreshing" @click="refresh(true)">
          重新检测
        </el-button>
      </section>

      <template v-else-if="snapshot">
        <section class="state-card status-card">
          <div class="phase-row">
            <div class="state-symbol" :class="`phase-${snapshot.phase}`">
              {{ phaseSymbol }}
            </div>
            <div class="phase-copy">
              <div class="phase-meta">
                <span>{{ snapshot.platform }}</span>
                <span>·</span>
                <span>{{ snapshot.summary.total }} 个实例</span>
              </div>
              <h1>{{ startupPhaseTitle(snapshot.phase) }}</h1>
              <p>{{ snapshot.message || startupPhaseDescription(snapshot.phase) }}</p>
            </div>
            <el-button class="refresh-button" text :loading="refreshing" @click="refresh(true)">
              刷新状态
            </el-button>
          </div>

          <div v-if="snapshot.summary.total > 0" class="summary-grid">
            <div class="summary-item">
              <span>实例总数</span>
              <strong>{{ snapshot.summary.total }}</strong>
            </div>
            <div class="summary-item ready-summary">
              <span>已就绪</span>
              <strong>{{ snapshot.summary.ready }}</strong>
            </div>
            <div class="summary-item">
              <span>待处理</span>
              <strong>{{ snapshot.summary.pending }}</strong>
            </div>
          </div>
        </section>

        <section v-if="snapshot.instances.length" class="content-card">
          <div class="section-heading">
            <div>
              <h2>微信实例</h2>
              <p>实例身份由当前平台 Driver 统一归一化。</p>
            </div>
          </div>
          <div class="instance-list">
            <div
              v-for="instance in snapshot.instances"
              :key="instance.instanceId"
              class="instance-row"
            >
              <span class="instance-dot" :class="`instance-${instance.state}`"></span>
              <div class="instance-copy">
                <strong>{{ instance.nickname || `微信实例 ${instance.instanceId}` }}</strong>
                <span>{{ instance.accountId || instance.message || instanceStateText(instance.state) }}</span>
              </div>
              <span class="instance-state">{{ instanceStateText(instance.state) }}</span>
            </div>
          </div>
        </section>

        <section v-if="snapshot.guidance" class="content-card guidance-card">
          <div class="guidance-icon">i</div>
          <div class="guidance-copy">
            <h2>{{ snapshot.guidance.title || '需要处理' }}</h2>
            <p v-if="snapshot.guidance.reason">{{ snapshot.guidance.reason }}</p>
            <ol v-if="snapshot.guidance.steps.length">
              <li v-for="step in snapshot.guidance.steps" :key="step">{{ step }}</li>
            </ol>
            <el-button
              v-if="snapshot.guidance.actionUrl && snapshot.guidance.actionLabel"
              type="primary"
              plain
              @click="openGuidance(snapshot.guidance.actionUrl)"
            >
              {{ snapshot.guidance.actionLabel }}
            </el-button>
          </div>
        </section>

        <section class="content-card action-card">
          <div class="section-heading">
            <div>
              <h2>下一步</h2>
              <p>仅在点击并确认后执行操作；流程遇到阻塞会停止并展示原因。</p>
            </div>
            <span v-if="snapshot.nextAction" class="recommended-tag">
              推荐：{{ startupActionLabel(snapshot.nextAction) }}
            </span>
          </div>

          <div v-if="launchAction" class="action-row">
            <div class="action-copy">
              <strong>{{ startupActionLabel('launch') }}</strong>
              <span>{{ actionHint(launchAction) }}</span>
            </div>
            <div class="action-controls launch-controls">
              <el-select v-model="launchCount" :disabled="actionBusy || !launchAction.available">
                <el-option :value="1" label="单账号" />
                <el-option :value="2" label="2 个账号" />
                <el-option :value="3" label="3 个账号" />
              </el-select>
              <el-button
                type="primary"
                :disabled="actionBusy || !launchAction.available"
                :loading="isExecuting('launch')"
                @click="launchWechat"
              >
                {{ launchCount > 1 ? '确认并多开' : '启动微信' }}
              </el-button>
            </div>
          </div>

          <div v-if="initializeAction" class="action-row">
            <div class="action-copy">
              <strong>{{ startupActionLabel('initialize') }}</strong>
              <span>{{ actionHint(initializeAction) }}</span>
            </div>
            <el-button
              type="primary"
              :disabled="actionBusy || !initializeAction.available"
              :loading="isExecuting('initialize')"
              @click="initializeWechat"
            >
              初始化账号
            </el-button>
          </div>

          <div v-if="configureAction" class="action-row">
            <div class="action-copy">
              <strong>{{ startupActionLabel('configure_accessibility') }}</strong>
              <span>{{ actionHint(configureAction) }}</span>
            </div>
            <div class="action-controls">
              <el-select
                v-model="compatibilityMode"
                :disabled="actionBusy || !configureAction.available"
              >
                <el-option value="default" label="标准配置" />
                <el-option value="platform_fallback" label="兼容模式" />
              </el-select>
              <el-button
                type="warning"
                :disabled="actionBusy || !configureAction.available"
                :loading="isExecuting('configure_accessibility')"
                @click="configureEnvironment"
              >
                配置环境
              </el-button>
            </div>
          </div>

          <div v-if="permissionAction" class="action-row">
            <div class="action-copy">
              <strong>{{ startupActionLabel('request_permission') }}</strong>
              <span>{{ actionHint(permissionAction) }}</span>
            </div>
            <div class="permission-actions">
              <el-button
                v-for="permission in permissionAction.requiredPermissions"
                :key="permission"
                type="primary"
                plain
                :disabled="actionBusy || !permissionAction.available"
                :loading="isExecuting('request_permission')"
                @click="requestPermission(permission)"
              >
                开启{{ startupPermissionText(permission) }}
              </el-button>
              <el-button v-if="permissionAction.requiredPermissions.length === 0" disabled>
                暂无可申请权限
              </el-button>
            </div>
          </div>

          <div v-if="startupStore.actionError" class="action-error">
            <strong>{{ startupReasonText(startupStore.actionError.code) }}</strong>
            <span>{{ startupStore.actionError.message }}</span>
          </div>

          <div v-if="snapshot.phase === 'ready'" class="ready-action">
            <el-button type="success" size="large" :disabled="actionBusy" @click="enterApplication">
              进入应用
            </el-button>
          </div>
        </section>
      </template>

      <section v-else class="state-card centered-card">
        <div class="state-symbol">?</div>
        <h1>等待启动状态</h1>
        <p>尚未读取到标准 Startup 状态。</p>
        <el-button type="primary" @click="refresh(true)">开始检测</el-button>
      </section>
    </main>

    <footer class="startup-footer">
      <span>{{ brandConfig.copyright || 'Powered by AI' }}</span>
      <span>自动化操作始终需要明确触发</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { checkAgentExists } from '@/api/agent'
import type { BrandConfig } from '@/config/brand'
import { useRuntimeCapabilityStore } from '@/store/runtimeCapabilities'
import { useStartupStore } from '@/store/startup'
import {
  readyStartupNickname,
  startupActionLabel,
  startupPermissionText,
  startupPhaseDescription,
  startupPhaseTitle,
  startupReasonText,
  type StartupAction,
  type StartupActionAvailability,
  type StartupCommand,
  type StartupCompatibilityMode,
  type StartupInstanceState
} from '@/runtime/startup'

const brandConfig = inject<Ref<BrandConfig>>('brandConfig', ref({
  channel_id: 'channel_000001',
  name: 'YokoAI机器人',
  ename: 'YokoAIbot',
  logo: './img/logo.jpg',
  contact: '',
  slogan: '让每个企业都有 AI 销售'
}))

const route = useRoute()
const router = useRouter()
const runtimeCapabilityStore = useRuntimeCapabilityStore()
const startupStore = useStartupStore()
const logoFailed = ref(false)
const refreshing = ref(false)
const launchCount = ref(1)
const compatibilityMode = ref<StartupCompatibilityMode>('default')
const executingAction = ref<StartupAction | null>(null)
let mounted = false

const snapshot = computed(() => startupStore.snapshot)
const brandInitial = computed(() => (
  brandConfig.value.alias || brandConfig.value.name || 'Y'
).charAt(0))
const actionBusy = computed(() => startupStore.actionState === 'executing')
const launchAction = computed(() => findAction('launch'))
const initializeAction = computed(() => findAction('initialize'))
const configureAction = computed(() => findAction('configure_accessibility'))
const permissionAction = computed(() => findAction('request_permission'))
const loadErrorText = computed(() => startupReasonText(
  startupStore.error?.code,
  startupStore.error?.message
))
const phaseSymbol = computed(() => {
  const symbols: Record<string, string> = {
    no_instance: '+',
    login_required: '…',
    initialization_required: '→',
    configuration_required: '⚙',
    ready: '✓',
    blocked: '!'
  }
  return symbols[snapshot.value?.phase || ''] || '·'
})

function findAction(action: StartupAction): StartupActionAvailability | null {
  return snapshot.value?.actions.find(item => item.action === action) || null
}

function actionHint(action: StartupActionAvailability): string {
  if (!action.available) {
    return startupReasonText(action.reasonCode, action.hint)
  }
  return action.hint || '操作将在确认后执行'
}

function instanceStateText(state: StartupInstanceState): string {
  const labels: Record<StartupInstanceState, string> = {
    discovered: '已发现',
    login_required: '等待登录',
    ready: '已就绪',
    action_required: '需要处理',
    failed: '初始化失败'
  }
  return labels[state]
}

function isExecuting(action: StartupAction): boolean {
  return actionBusy.value && executingAction.value === action
}

async function refresh(force = false): Promise<void> {
  if (runtimeCapabilityStore.mode !== 'runtime_required') {
    return
  }
  refreshing.value = true
  try {
    await startupStore.inspect(force)
  } finally {
    refreshing.value = false
  }
}

async function confirmAction(message: string): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, '请确认操作', {
      confirmButtonText: '确认执行',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true
    })
    return true
  } catch {
    return false
  }
}

async function executeCommand(
  command: StartupCommand,
  confirmationMessage?: string
): Promise<void> {
  let finalCommand = command
  const availability = findAction(command.action)
  const effectiveConfirmation = confirmationMessage || (
    availability?.confirmationRequired
      ? `${startupActionLabel(command.action)}需要用户明确确认，是否继续？`
      : undefined
  )
  if (effectiveConfirmation) {
    if (!await confirmAction(effectiveConfirmation)) {
      return
    }
    finalCommand = { ...command, confirmed: true } as StartupCommand
  }
  executingAction.value = finalCommand.action
  try {
    const result = await startupStore.execute(finalCommand)
    if (!result) {
      if (startupStore.actionError) {
        ElMessage.error(startupStore.actionError.message)
      }
      return
    }
    if (!result.success) {
      ElMessage.error(startupReasonText(result.reasonCode || result.code, result.message))
      return
    }
    ElMessage.success(result.message || '操作已完成')
    if (result.snapshot?.phase === 'ready') {
      enterApplication()
    }
  } finally {
    executingAction.value = null
  }
}

async function launchWechat(): Promise<void> {
  const closeExisting = launchCount.value > 1
  await executeCommand(
    {
      action: 'launch',
      confirmed: false,
      parameters: {
        count: launchCount.value,
        closeExisting
      }
    },
    closeExisting
      ? `多开将关闭当前运行中的微信，并重新启动 ${launchCount.value} 个客户端。是否继续？`
      : undefined
  )
}

async function initializeWechat(): Promise<void> {
  await executeCommand({ action: 'initialize', confirmed: false })
}

async function configureEnvironment(): Promise<void> {
  await executeCommand(
    {
      action: 'configure_accessibility',
      confirmed: false,
      parameters: { compatibilityMode: compatibilityMode.value }
    },
    '环境配置可能关闭并重新启动微信，完成后需要重新登录。是否继续？'
  )
}

async function requestPermission(permissionName: string): Promise<void> {
  const availability = permissionAction.value
  await executeCommand(
    {
      action: 'request_permission',
      confirmed: false,
      parameters: { permissionName }
    },
    availability?.confirmationRequired
      ? `即将请求${startupPermissionText(permissionName)}权限，是否继续？`
      : undefined
  )
}

function enterApplication(): void {
  if (!snapshot.value || snapshot.value.phase !== 'ready') {
    return
  }
  localStorage.setItem('appStarted', 'true')
  router.push({
    name: 'WelcomePage',
    params: { nickname: readyStartupNickname(snapshot.value) || '用户' }
  })
}

function openGuidance(url: string): void {
  window.open(url, '_blank', 'noopener')
}

async function initializePage(): Promise<void> {
  const agent = typeof route.query.agent === 'string' ? route.query.agent : undefined
  if (agent && await checkAgentExists(agent)) {
    await router.push({ path: '/agent/login', query: { agent } })
    return
  }
  startupStore.configureMode(runtimeCapabilityStore.mode)
  await refresh(false)
}

onMounted(async () => {
  mounted = true
  await initializePage()
})

watch(
  () => runtimeCapabilityStore.mode,
  async mode => {
    startupStore.configureMode(mode)
    if (mounted && mode === 'runtime_required') {
      await refresh(true)
    }
  }
)

onBeforeUnmount(() => {
  mounted = false
})
</script>

<style scoped>
.runtime-startup-root {
  min-height: 100vh;
  overflow: auto;
  position: relative;
  color: #edf7f3;
  background:
    radial-gradient(circle at top left, rgba(30, 174, 127, 0.16), transparent 38%),
    linear-gradient(135deg, #071714 0%, #0b1721 58%, #111827 100%);
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.background-orb {
  position: fixed;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  opacity: 0.18;
}

.orb-left {
  left: -180px;
  top: 28%;
  background: #22c55e;
}

.orb-right {
  right: -180px;
  top: 4%;
  background: #3b82f6;
}

.startup-header,
.startup-content,
.startup-footer {
  width: min(100% - 40px, 920px);
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.startup-header {
  min-height: 116px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-logo {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #6ee7b7;
  font-size: 24px;
  font-weight: 700;
}

.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.brand-slogan {
  margin: 4px 0 0;
  color: #8da59e;
  font-size: 13px;
}

.runtime-badge,
.recommended-tag {
  border: 1px solid rgba(110, 231, 183, 0.28);
  border-radius: 999px;
  color: #8ef0cb;
  background: rgba(16, 185, 129, 0.08);
  padding: 7px 12px;
  font-size: 12px;
}

.startup-content {
  display: grid;
  gap: 16px;
  padding-bottom: 28px;
}

.state-card,
.content-card {
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 22px;
  background: rgba(13, 27, 34, 0.82);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(18px);
}

.status-card,
.content-card {
  padding: 24px;
}

.centered-card {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 40px;
}

.centered-card h1,
.phase-copy h1,
.section-heading h2,
.guidance-copy h2 {
  margin: 0;
}

.centered-card p,
.phase-copy p,
.section-heading p,
.guidance-copy p {
  margin: 0;
  color: #91a69f;
  line-height: 1.7;
}

.loading-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid rgba(110, 231, 183, 0.18);
  border-top-color: #6ee7b7;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.state-symbol {
  width: 50px;
  height: 50px;
  flex: 0 0 50px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
  font-size: 24px;
  font-weight: 700;
}

.phase-ready {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.14);
}

.phase-blocked,
.phase-configuration_required,
.error-symbol {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.14);
}

.phase-row,
.section-heading,
.action-row,
.instance-row {
  display: flex;
  align-items: center;
}

.phase-row {
  gap: 18px;
}

.phase-copy {
  flex: 1;
  min-width: 0;
}

.phase-copy h1 {
  margin-top: 5px;
  font-size: 25px;
}

.phase-copy p {
  margin-top: 7px;
}

.phase-meta {
  display: flex;
  gap: 7px;
  color: #6ee7b7;
  font-size: 12px;
  text-transform: uppercase;
}

.refresh-button {
  color: #a9bbb5;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 22px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.035);
  color: #8da59e;
  font-size: 13px;
}

.summary-item strong {
  color: #f3faf7;
  font-size: 18px;
}

.ready-summary strong {
  color: #6ee7b7;
}

.section-heading {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.section-heading h2,
.guidance-copy h2 {
  font-size: 17px;
}

.section-heading p {
  margin-top: 5px;
  font-size: 13px;
}

.instance-list {
  display: grid;
  gap: 8px;
}

.instance-row,
.action-row {
  gap: 12px;
  padding: 13px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
}

.instance-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #60a5fa;
}

.instance-ready {
  background: #34d399;
}

.instance-failed,
.instance-action_required {
  background: #f59e0b;
}

.instance-copy,
.action-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.instance-copy span,
.action-copy span,
.instance-state {
  color: #8da59e;
  font-size: 12px;
}

.guidance-card {
  display: flex;
  gap: 16px;
  border-color: rgba(245, 158, 11, 0.28);
}

.guidance-icon {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  font-weight: 700;
}

.guidance-copy ol {
  margin: 12px 0 16px 20px;
  color: #c7d5d0;
  line-height: 1.8;
}

.action-card {
  display: grid;
  gap: 10px;
}

.action-card .section-heading {
  margin-bottom: 6px;
}

.action-controls,
.launch-controls,
.permission-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.action-controls :deep(.el-select),
.launch-controls :deep(.el-select) {
  width: 126px;
}

.action-error {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  color: #fecaca;
  background: rgba(239, 68, 68, 0.1);
  font-size: 13px;
}

.action-error span {
  color: #d8a6a6;
}

.ready-action {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.error-code {
  color: #fca5a5;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.startup-footer {
  min-height: 54px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #617670;
  font-size: 11px;
}

@media (max-width: 680px) {
  .startup-header,
  .startup-content,
  .startup-footer {
    width: min(100% - 24px, 920px);
  }

  .startup-header {
    min-height: 94px;
  }

  .runtime-badge,
  .brand-slogan {
    display: none;
  }

  .phase-row,
  .action-row,
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .refresh-button {
    align-self: flex-end;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .action-controls,
  .permission-actions {
    width: 100%;
    justify-content: stretch;
  }

  .action-controls :deep(.el-select),
  .launch-controls :deep(.el-select) {
    flex: 1;
    width: auto;
  }

  .startup-footer {
    flex-direction: column;
    justify-content: center;
    gap: 4px;
  }
}
</style>
