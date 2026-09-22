import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, unref as _unref, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, normalizeClass as _normalizeClass, renderList as _renderList, Fragment as _Fragment, createBlock as _createBlock } from "vue"

const _hoisted_1 = { class: "runtime-startup-root" }
const _hoisted_2 = { class: "startup-header" }
const _hoisted_3 = { class: "brand-block" }
const _hoisted_4 = { class: "brand-logo" }
const _hoisted_5 = ["src"]
const _hoisted_6 = { key: 1 }
const _hoisted_7 = { class: "brand-name" }
const _hoisted_8 = { class: "brand-slogan" }
const _hoisted_9 = { class: "startup-content" }
const _hoisted_10 = {
  key: 0,
  class: "state-card centered-card"
}
const _hoisted_11 = {
  key: 1,
  class: "state-card centered-card"
}
const _hoisted_12 = { class: "error-code" }
const _hoisted_13 = { class: "state-card status-card" }
const _hoisted_14 = { class: "phase-row" }
const _hoisted_15 = { class: "phase-copy" }
const _hoisted_16 = { class: "phase-meta" }
const _hoisted_17 = {
  key: 0,
  class: "summary-grid"
}
const _hoisted_18 = { class: "summary-item" }
const _hoisted_19 = { class: "summary-item ready-summary" }
const _hoisted_20 = { class: "summary-item" }
const _hoisted_21 = {
  key: 0,
  class: "content-card"
}
const _hoisted_22 = { class: "instance-list" }
const _hoisted_23 = { class: "instance-copy" }
const _hoisted_24 = { class: "instance-state" }
const _hoisted_25 = {
  key: 1,
  class: "content-card guidance-card"
}
const _hoisted_26 = { class: "guidance-copy" }
const _hoisted_27 = { key: 0 }
const _hoisted_28 = { key: 1 }
const _hoisted_29 = { class: "content-card action-card" }
const _hoisted_30 = { class: "section-heading" }
const _hoisted_31 = {
  key: 0,
  class: "recommended-tag"
}
const _hoisted_32 = {
  key: 0,
  class: "action-row"
}
const _hoisted_33 = { class: "action-copy" }
const _hoisted_34 = { class: "action-controls launch-controls" }
const _hoisted_35 = {
  key: 1,
  class: "action-row"
}
const _hoisted_36 = { class: "action-copy" }
const _hoisted_37 = {
  key: 2,
  class: "action-row"
}
const _hoisted_38 = { class: "action-copy" }
const _hoisted_39 = { class: "action-controls" }
const _hoisted_40 = {
  key: 3,
  class: "action-row"
}
const _hoisted_41 = { class: "action-copy" }
const _hoisted_42 = { class: "permission-actions" }
const _hoisted_43 = {
  key: 4,
  class: "action-error"
}
const _hoisted_44 = {
  key: 5,
  class: "ready-action"
}
const _hoisted_45 = {
  key: 3,
  class: "state-card centered-card"
}
const _hoisted_46 = { class: "startup-footer" }

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


export default /*@__PURE__*/_defineComponent({
  __name: 'RuntimeStartupPage',
  setup(__props) {

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

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _cache[29] || (_cache[29] = _createElementVNode("div", {
      class: "background-orb orb-left",
      "aria-hidden": "true"
    }, null, -1)),
    _cache[30] || (_cache[30] = _createElementVNode("div", {
      class: "background-orb orb-right",
      "aria-hidden": "true"
    }, null, -1)),
    _createElementVNode("header", _hoisted_2, [
      _createElementVNode("div", _hoisted_3, [
        _createElementVNode("div", _hoisted_4, [
          (!logoFailed.value)
            ? (_openBlock(), _createElementBlock("img", {
                key: 0,
                src: _unref(brandConfig).logo,
                alt: "",
                onError: _cache[0] || (_cache[0] = ($event: any) => (logoFailed.value = true))
              }, null, 40, _hoisted_5))
            : (_openBlock(), _createElementBlock("span", _hoisted_6, _toDisplayString(brandInitial.value), 1))
        ]),
        _createElementVNode("div", null, [
          _createElementVNode("p", _hoisted_7, _toDisplayString(_unref(brandConfig).alias || _unref(brandConfig).name), 1),
          _createElementVNode("p", _hoisted_8, _toDisplayString(_unref(brandConfig).slogan || 'AI 赋能，智驱增长'), 1)
        ])
      ]),
      _cache[7] || (_cache[7] = _createElementVNode("div", { class: "runtime-badge" }, "统一启动流程", -1))
    ]),
    _createElementVNode("main", _hoisted_9, [
      (_unref(startupStore).loadState === 'loading')
        ? (_openBlock(), _createElementBlock("section", _hoisted_10, [...(_cache[8] || (_cache[8] = [
            _createElementVNode("div", {
              class: "loading-ring",
              "aria-hidden": "true"
            }, null, -1),
            _createElementVNode("h1", null, "正在检测微信状态", -1),
            _createElementVNode("p", null, "只读取当前实例状态，不会自动执行启动或配置操作。", -1)
          ]))]))
        : (_unref(startupStore).loadState === 'contract_error')
          ? (_openBlock(), _createElementBlock("section", _hoisted_11, [
              _cache[10] || (_cache[10] = _createElementVNode("div", { class: "state-symbol error-symbol" }, "!", -1)),
              _cache[11] || (_cache[11] = _createElementVNode("h1", null, "启动服务暂不可用", -1)),
              _createElementVNode("p", null, _toDisplayString(loadErrorText.value), 1),
              _createElementVNode("div", _hoisted_12, _toDisplayString(_unref(startupStore).error?.code), 1),
              _createVNode(_component_el_button, {
                type: "primary",
                loading: refreshing.value,
                onClick: _cache[1] || (_cache[1] = ($event: any) => (refresh(true)))
              }, {
                default: _withCtx(() => [...(_cache[9] || (_cache[9] = [
                  _createTextVNode(" 重新检测 ", -1)
                ]))]),
                _: 1
              }, 8, ["loading"])
            ]))
          : (snapshot.value)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                _createElementVNode("section", _hoisted_13, [
                  _createElementVNode("div", _hoisted_14, [
                    _createElementVNode("div", {
                      class: _normalizeClass(["state-symbol", `phase-${snapshot.value.phase}`])
                    }, _toDisplayString(phaseSymbol.value), 3),
                    _createElementVNode("div", _hoisted_15, [
                      _createElementVNode("div", _hoisted_16, [
                        _createElementVNode("span", null, _toDisplayString(snapshot.value.platform), 1),
                        _cache[12] || (_cache[12] = _createElementVNode("span", null, "·", -1)),
                        _createElementVNode("span", null, _toDisplayString(snapshot.value.summary.total) + " 个实例", 1)
                      ]),
                      _createElementVNode("h1", null, _toDisplayString(_unref(startupPhaseTitle)(snapshot.value.phase)), 1),
                      _createElementVNode("p", null, _toDisplayString(snapshot.value.message || _unref(startupPhaseDescription)(snapshot.value.phase)), 1)
                    ]),
                    _createVNode(_component_el_button, {
                      class: "refresh-button",
                      text: "",
                      loading: refreshing.value,
                      onClick: _cache[2] || (_cache[2] = ($event: any) => (refresh(true)))
                    }, {
                      default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
                        _createTextVNode(" 刷新状态 ", -1)
                      ]))]),
                      _: 1
                    }, 8, ["loading"])
                  ]),
                  (snapshot.value.summary.total > 0)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_17, [
                        _createElementVNode("div", _hoisted_18, [
                          _cache[14] || (_cache[14] = _createElementVNode("span", null, "实例总数", -1)),
                          _createElementVNode("strong", null, _toDisplayString(snapshot.value.summary.total), 1)
                        ]),
                        _createElementVNode("div", _hoisted_19, [
                          _cache[15] || (_cache[15] = _createElementVNode("span", null, "已就绪", -1)),
                          _createElementVNode("strong", null, _toDisplayString(snapshot.value.summary.ready), 1)
                        ]),
                        _createElementVNode("div", _hoisted_20, [
                          _cache[16] || (_cache[16] = _createElementVNode("span", null, "待处理", -1)),
                          _createElementVNode("strong", null, _toDisplayString(snapshot.value.summary.pending), 1)
                        ])
                      ]))
                    : _createCommentVNode("", true)
                ]),
                (snapshot.value.instances.length)
                  ? (_openBlock(), _createElementBlock("section", _hoisted_21, [
                      _cache[17] || (_cache[17] = _createElementVNode("div", { class: "section-heading" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("h2", null, "微信实例"),
                          _createElementVNode("p", null, "实例身份由当前平台 Driver 统一归一化。")
                        ])
                      ], -1)),
                      _createElementVNode("div", _hoisted_22, [
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(snapshot.value.instances, (instance) => {
                          return (_openBlock(), _createElementBlock("div", {
                            key: instance.instanceId,
                            class: "instance-row"
                          }, [
                            _createElementVNode("span", {
                              class: _normalizeClass(["instance-dot", `instance-${instance.state}`])
                            }, null, 2),
                            _createElementVNode("div", _hoisted_23, [
                              _createElementVNode("strong", null, _toDisplayString(instance.nickname || `微信实例 ${instance.instanceId}`), 1),
                              _createElementVNode("span", null, _toDisplayString(instance.accountId || instance.message || instanceStateText(instance.state)), 1)
                            ]),
                            _createElementVNode("span", _hoisted_24, _toDisplayString(instanceStateText(instance.state)), 1)
                          ]))
                        }), 128))
                      ])
                    ]))
                  : _createCommentVNode("", true),
                (snapshot.value.guidance)
                  ? (_openBlock(), _createElementBlock("section", _hoisted_25, [
                      _cache[18] || (_cache[18] = _createElementVNode("div", { class: "guidance-icon" }, "i", -1)),
                      _createElementVNode("div", _hoisted_26, [
                        _createElementVNode("h2", null, _toDisplayString(snapshot.value.guidance.title || '需要处理'), 1),
                        (snapshot.value.guidance.reason)
                          ? (_openBlock(), _createElementBlock("p", _hoisted_27, _toDisplayString(snapshot.value.guidance.reason), 1))
                          : _createCommentVNode("", true),
                        (snapshot.value.guidance.steps.length)
                          ? (_openBlock(), _createElementBlock("ol", _hoisted_28, [
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(snapshot.value.guidance.steps, (step) => {
                                return (_openBlock(), _createElementBlock("li", { key: step }, _toDisplayString(step), 1))
                              }), 128))
                            ]))
                          : _createCommentVNode("", true),
                        (snapshot.value.guidance.actionUrl && snapshot.value.guidance.actionLabel)
                          ? (_openBlock(), _createBlock(_component_el_button, {
                              key: 2,
                              type: "primary",
                              plain: "",
                              onClick: _cache[3] || (_cache[3] = ($event: any) => (openGuidance(snapshot.value.guidance.actionUrl)))
                            }, {
                              default: _withCtx(() => [
                                _createTextVNode(_toDisplayString(snapshot.value.guidance.actionLabel), 1)
                              ]),
                              _: 1
                            }))
                          : _createCommentVNode("", true)
                      ])
                    ]))
                  : _createCommentVNode("", true),
                _createElementVNode("section", _hoisted_29, [
                  _createElementVNode("div", _hoisted_30, [
                    _cache[19] || (_cache[19] = _createElementVNode("div", null, [
                      _createElementVNode("h2", null, "下一步"),
                      _createElementVNode("p", null, "仅在点击并确认后执行操作；流程遇到阻塞会停止并展示原因。")
                    ], -1)),
                    (snapshot.value.nextAction)
                      ? (_openBlock(), _createElementBlock("span", _hoisted_31, " 推荐：" + _toDisplayString(_unref(startupActionLabel)(snapshot.value.nextAction)), 1))
                      : _createCommentVNode("", true)
                  ]),
                  (launchAction.value)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_32, [
                        _createElementVNode("div", _hoisted_33, [
                          _createElementVNode("strong", null, _toDisplayString(_unref(startupActionLabel)('launch')), 1),
                          _createElementVNode("span", null, _toDisplayString(actionHint(launchAction.value)), 1)
                        ]),
                        _createElementVNode("div", _hoisted_34, [
                          _createVNode(_component_el_select, {
                            modelValue: launchCount.value,
                            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((launchCount).value = $event)),
                            disabled: actionBusy.value || !launchAction.value.available
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_option, {
                                value: 1,
                                label: "单账号"
                              }),
                              _createVNode(_component_el_option, {
                                value: 2,
                                label: "2 个账号"
                              }),
                              _createVNode(_component_el_option, {
                                value: 3,
                                label: "3 个账号"
                              })
                            ]),
                            _: 1
                          }, 8, ["modelValue", "disabled"]),
                          _createVNode(_component_el_button, {
                            type: "primary",
                            disabled: actionBusy.value || !launchAction.value.available,
                            loading: isExecuting('launch'),
                            onClick: launchWechat
                          }, {
                            default: _withCtx(() => [
                              _createTextVNode(_toDisplayString(launchCount.value > 1 ? '确认并多开' : '启动微信'), 1)
                            ]),
                            _: 1
                          }, 8, ["disabled", "loading"])
                        ])
                      ]))
                    : _createCommentVNode("", true),
                  (initializeAction.value)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_35, [
                        _createElementVNode("div", _hoisted_36, [
                          _createElementVNode("strong", null, _toDisplayString(_unref(startupActionLabel)('initialize')), 1),
                          _createElementVNode("span", null, _toDisplayString(actionHint(initializeAction.value)), 1)
                        ]),
                        _createVNode(_component_el_button, {
                          type: "primary",
                          disabled: actionBusy.value || !initializeAction.value.available,
                          loading: isExecuting('initialize'),
                          onClick: initializeWechat
                        }, {
                          default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
                            _createTextVNode(" 初始化账号 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["disabled", "loading"])
                      ]))
                    : _createCommentVNode("", true),
                  (configureAction.value)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_37, [
                        _createElementVNode("div", _hoisted_38, [
                          _createElementVNode("strong", null, _toDisplayString(_unref(startupActionLabel)('configure_accessibility')), 1),
                          _createElementVNode("span", null, _toDisplayString(actionHint(configureAction.value)), 1)
                        ]),
                        _createElementVNode("div", _hoisted_39, [
                          _createVNode(_component_el_select, {
                            modelValue: compatibilityMode.value,
                            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((compatibilityMode).value = $event)),
                            disabled: actionBusy.value || !configureAction.value.available
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_option, {
                                value: "default",
                                label: "标准配置"
                              }),
                              _createVNode(_component_el_option, {
                                value: "platform_fallback",
                                label: "兼容模式"
                              })
                            ]),
                            _: 1
                          }, 8, ["modelValue", "disabled"]),
                          _createVNode(_component_el_button, {
                            type: "warning",
                            disabled: actionBusy.value || !configureAction.value.available,
                            loading: isExecuting('configure_accessibility'),
                            onClick: configureEnvironment
                          }, {
                            default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
                              _createTextVNode(" 配置环境 ", -1)
                            ]))]),
                            _: 1
                          }, 8, ["disabled", "loading"])
                        ])
                      ]))
                    : _createCommentVNode("", true),
                  (permissionAction.value)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_40, [
                        _createElementVNode("div", _hoisted_41, [
                          _createElementVNode("strong", null, _toDisplayString(_unref(startupActionLabel)('request_permission')), 1),
                          _createElementVNode("span", null, _toDisplayString(actionHint(permissionAction.value)), 1)
                        ]),
                        _createElementVNode("div", _hoisted_42, [
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(permissionAction.value.requiredPermissions, (permission) => {
                            return (_openBlock(), _createBlock(_component_el_button, {
                              key: permission,
                              type: "primary",
                              plain: "",
                              disabled: actionBusy.value || !permissionAction.value.available,
                              loading: isExecuting('request_permission'),
                              onClick: ($event: any) => (requestPermission(permission))
                            }, {
                              default: _withCtx(() => [
                                _createTextVNode(" 开启" + _toDisplayString(_unref(startupPermissionText)(permission)), 1)
                              ]),
                              _: 2
                            }, 1032, ["disabled", "loading", "onClick"]))
                          }), 128)),
                          (permissionAction.value.requiredPermissions.length === 0)
                            ? (_openBlock(), _createBlock(_component_el_button, {
                                key: 0,
                                disabled: ""
                              }, {
                                default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
                                  _createTextVNode(" 暂无可申请权限 ", -1)
                                ]))]),
                                _: 1
                              }))
                            : _createCommentVNode("", true)
                        ])
                      ]))
                    : _createCommentVNode("", true),
                  (_unref(startupStore).actionError)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_43, [
                        _createElementVNode("strong", null, _toDisplayString(_unref(startupReasonText)(_unref(startupStore).actionError.code)), 1),
                        _createElementVNode("span", null, _toDisplayString(_unref(startupStore).actionError.message), 1)
                      ]))
                    : _createCommentVNode("", true),
                  (snapshot.value.phase === 'ready')
                    ? (_openBlock(), _createElementBlock("div", _hoisted_44, [
                        _createVNode(_component_el_button, {
                          type: "success",
                          size: "large",
                          disabled: actionBusy.value,
                          onClick: enterApplication
                        }, {
                          default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
                            _createTextVNode(" 进入应用 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["disabled"])
                      ]))
                    : _createCommentVNode("", true)
                ])
              ], 64))
            : (_openBlock(), _createElementBlock("section", _hoisted_45, [
                _cache[25] || (_cache[25] = _createElementVNode("div", { class: "state-symbol" }, "?", -1)),
                _cache[26] || (_cache[26] = _createElementVNode("h1", null, "等待启动状态", -1)),
                _cache[27] || (_cache[27] = _createElementVNode("p", null, "尚未读取到标准 Startup 状态。", -1)),
                _createVNode(_component_el_button, {
                  type: "primary",
                  onClick: _cache[6] || (_cache[6] = ($event: any) => (refresh(true)))
                }, {
                  default: _withCtx(() => [...(_cache[24] || (_cache[24] = [
                    _createTextVNode("开始检测", -1)
                  ]))]),
                  _: 1
                })
              ]))
    ]),
    _createElementVNode("footer", _hoisted_46, [
      _createElementVNode("span", null, _toDisplayString(_unref(brandConfig).copyright || 'Powered by AI'), 1),
      _cache[28] || (_cache[28] = _createElementVNode("span", null, "自动化操作始终需要明确触发", -1))
    ])
  ]))
}
}

})