import { defineComponent as _defineComponent } from 'vue'
import { resolveComponent as _resolveComponent, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, unref as _unref, withCtx as _withCtx, createVNode as _createVNode, withModifiers as _withModifiers, withKeys as _withKeys, createElementBlock as _createElementBlock, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, toDisplayString as _toDisplayString } from "vue"

const _hoisted_1 = {
  key: 0,
  class: "field-tip"
}
const _hoisted_2 = {
  key: 0,
  class: "field-tip"
}
const _hoisted_3 = { class: "dialog-footer" }

import { computed, inject, ref, watch, type Ref } from 'vue'
import { ElMessage, type FormItemRule } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import type { CozeAgent } from '@/types/coze'
import { saveConfig } from '@/api/config'
import type { BrandConfig } from '@/config/brand'

const DEFAULT_AGENTIC_URL = 'http://127.0.0.1:3000'
type ValidateCallback = (error?: Error | string) => void


export default /*@__PURE__*/_defineComponent({
  __name: 'CozeAgentConfig',
  props: {
    visible: { type: Boolean },
    agents: {},
    editingAgent: {},
    allowedPlatforms: {}
  },
  emits: ['update:visible', 'update:agents'],
  setup(__props: any, { emit: __emit }) {

const brandConfig = inject<Ref<BrandConfig>>('brandConfig', ref({} as BrandConfig))

const props = __props

const emit = __emit
const dialogVisible = ref(props.visible)
const agentFormRef = ref()
const agenticPanels = ref<string[]>([])
const safeAgents = computed(() => Array.isArray(props.agents) ? props.agents : [])
const isEditing = computed(() => Boolean(props.editingAgent))
const isPlatformAllowed = (platform: string) => (
  !props.allowedPlatforms || props.allowedPlatforms.includes(platform)
)

const createEmptyForm = () => ({
  name: '',
  botId: '',
  apiUrl: '',
  apiToken: '',
  hasApiToken: false,
  deliveryMode: 'sync_reply' as const,
  responseFormat: 'auto' as const,
  timeoutSeconds: 300,
  retryCount: 1,
  platform: 'coze'
})

const agentForm = ref(createEmptyForm())
const checkBotIdExists = (botId: string): boolean => {
  const editingBotId = props.editingAgent?.botId
  return safeAgents.value.some(agent => agent.botId === botId && agent.botId !== editingBotId)
}

const agentRules = {
  name: [
    { required: true, message: '请输入智能体名称', trigger: 'blur' }
  ] as FormItemRule[],
  botId: [
    {
      validator: (_rule: unknown, value: string, callback: ValidateCallback) => {
        if (!value) {
          const message = agentForm.value.platform === 'coze3'
            ? '请输入 Project ID'
            : (agentForm.value.platform === 'coze'
              ? '请输入 Bot ID'
              : (agentForm.value.platform === 'fireflow'
                ? '请输入 API Token'
                : (agentForm.value.platform === 'agentic' ? '请输入智能体 ID' : '请输入 API 秘钥')))
          callback(new Error(message))
        } else if (agentForm.value.platform === 'coze3' && !/^\d+$/.test(value.trim())) {
          callback(new Error('Project ID 必须为数字'))
        } else if (checkBotIdExists(value.trim())) {
          callback(new Error('该智能体已经添加过了，无法重复添加'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ] as FormItemRule[],
  apiUrl: [
    {
      validator: (_rule: unknown, value: string, callback: ValidateCallback) => {
        if (agentForm.value.platform !== 'coze3' && agentForm.value.platform !== 'agentic') {
          callback()
          return
        }
        if (agentForm.value.platform === 'agentic') {
          try {
            const url = new URL(value?.trim())
            const hostname = url.hostname.toLowerCase()
            const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
              callback(new Error('请输入有效的私域Agent服务根地址'))
              return
            }
            if (!isLoopback && url.protocol !== 'https:') {
              callback(new Error('远程私域Agent服务必须使用 HTTPS'))
              return
            }
            callback()
          } catch {
            callback(new Error('请输入有效的私域Agent服务根地址'))
          }
          return
        }
        if (!value) {
          callback(new Error('请输入 Coze 3.0 API 地址'))
          return
        }
        try {
          const url = new URL(value.trim())
          const validHost = url.hostname === 'coze.site' || url.hostname.endsWith('.coze.site')
          const validPath = url.pathname.replace(/\/$/, '') === '/stream_run'
          if (url.protocol !== 'https:' || !validHost || !validPath || url.search || url.hash) {
            callback(new Error('请输入有效的 https://xxxx.coze.site/stream_run 地址'))
            return
          }
          callback()
        } catch {
          callback(new Error('请输入有效的 Coze 3.0 API 地址'))
        }
      },
      trigger: 'blur'
    }
  ] as FormItemRule[],
  apiToken: [
    {
      validator: (_rule: unknown, value: string, callback: ValidateCallback) => {
        if (agentForm.value.platform === 'coze3' && !value?.trim()) {
          callback(new Error('请输入该 Project 的 API Token'))
          return
        }
        if (agentForm.value.platform === 'agentic') {
          try {
            const url = new URL(agentForm.value.apiUrl.trim())
            const hostname = url.hostname.toLowerCase()
            const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
            if (!isLoopback && !value?.trim() && !agentForm.value.hasApiToken) {
              callback(new Error('远程私域Agent服务必须配置接口 Token'))
              return
            }
          } catch {
            // 地址错误由 apiUrl 校验器提示。
          }
        }
        callback()
      },
      trigger: 'blur'
    }
  ] as FormItemRule[]
}

const getIdLabel = () => {
  if (agentForm.value.platform === 'coze3') return 'Project ID'
  if (agentForm.value.platform === 'agentic') return '智能体 ID'
  if (agentForm.value.platform === 'coze') return 'Bot ID'
  if (agentForm.value.platform === 'fireflow') return 'API Token'
  return 'API 秘钥'
}

const getIdPlaceholder = () => `请输入 ${getIdLabel()}`

const fillForm = () => {
  const agent = props.editingAgent
  agentForm.value = agent
    ? {
        name: agent.name || '',
        botId: agent.botId || '',
        apiUrl: agent.apiUrl || '',
        apiToken: agent.platform === 'agentic' ? '' : (agent.apiToken || ''),
        hasApiToken: Boolean(agent.hasApiToken || agent.apiToken),
        deliveryMode: agent.deliveryMode || 'sync_reply',
        responseFormat: agent.responseFormat || 'auto',
        timeoutSeconds: agent.timeoutSeconds || 300,
        retryCount: agent.retryCount ?? 1,
        platform: agent.platform || 'coze'
      }
    : createEmptyForm()
  agenticPanels.value = []
  agentFormRef.value?.clearValidate()
}

watch(() => props.visible, (visible) => {
  dialogVisible.value = visible
  if (visible) fillForm()
})

watch(() => props.editingAgent, () => {
  if (props.visible) fillForm()
})

watch(dialogVisible, (visible) => {
  emit('update:visible', visible)
})

watch(() => agentForm.value.platform, (platform) => {
  if (platform !== 'agentic') return
  if (!agentForm.value.apiUrl) agentForm.value.apiUrl = DEFAULT_AGENTIC_URL
  if (!agentForm.value.botId) agentForm.value.botId = 'rpa-reply'
  if (!agentForm.value.name) agentForm.value.name = '私域Agent'
})

const handleClose = () => {
  dialogVisible.value = false
  agentFormRef.value?.resetFields()
}

const buildAgent = (): CozeAgent => {
  const platform = agentForm.value.platform
  const agent: CozeAgent = {
    ...(props.editingAgent || {}),
    name: agentForm.value.name.trim(),
    botId: agentForm.value.botId.trim(),
    platform
  }

  if (platform === 'coze3') {
    agent.apiUrl = agentForm.value.apiUrl.trim().replace(/\/$/, '')
    agent.apiToken = agentForm.value.apiToken.trim()
  } else if (platform === 'agentic') {
    agent.apiUrl = agentForm.value.apiUrl.trim().replace(/\/$/, '')
    agent.apiToken = agentForm.value.apiToken.trim()
    agent.hasApiToken = agentForm.value.hasApiToken
    agent.deliveryMode = agentForm.value.deliveryMode
    agent.responseFormat = agentForm.value.responseFormat
    agent.timeoutSeconds = agentForm.value.timeoutSeconds
    agent.retryCount = agentForm.value.retryCount
  } else {
    delete agent.apiUrl
    delete agent.apiToken
  }

  if (!isEditing.value) {
    agent.id = platform === 'dify'
      ? `dify-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
      : agent.botId
  }
  return agent
}

const handleSubmit = async () => {
  if (!agentFormRef.value) return
  const valid = await agentFormRef.value.validate().catch(() => false)
  if (!valid) return

  if (!isEditing.value && safeAgents.value.length >= 10) {
    ElMessage.warning('最多只能添加10个智能体')
    return
  }

  const agent = buildAgent()
  const updatedAgents = isEditing.value
    ? safeAgents.value.map(item => item.botId === props.editingAgent?.botId ? agent : item)
    : [...safeAgents.value, agent]

  try {
    const result = await saveConfig('agents', { agents: updatedAgents })
    if (!result.success) throw new Error(result.error || '保存失败')
    const publicAgents = (Array.isArray(result.data) ? result.data : updatedAgents).map((item: CozeAgent) => item.platform === 'agentic'
      ? {
          ...item,
          apiToken: '',
          hasApiToken: Boolean(item.apiToken || item.hasApiToken)
        }
      : item)
    emit('update:agents', publicAgents)
    const actionMessage = isEditing.value ? '修改成功' : '添加成功'
    ElMessage.success(
      result.restartRequired
        ? `${actionMessage}，重启客户端后生效`
        : actionMessage
    )
    dialogVisible.value = false
  } catch (error) {
    console.error('保存智能体失败:', error)
    ElMessage.error(`保存智能体失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

return (_ctx: any,_cache: any) => {
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_input_number = _resolveComponent("el-input-number")!
  const _component_el_collapse_item = _resolveComponent("el-collapse-item")!
  const _component_el_collapse = _resolveComponent("el-collapse")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: dialogVisible.value,
    "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event: any) => ((dialogVisible).value = $event)),
    title: isEditing.value ? '修改智能体' : '添加智能体',
    width: "500px"
  }, {
    default: _withCtx(() => [
      _createVNode(_component_el_form, {
        ref_key: "agentFormRef",
        ref: agentFormRef,
        model: agentForm.value,
        rules: agentRules,
        "label-width": "100px",
        class: "agent-form"
      }, {
        default: _withCtx(() => [
          _createVNode(_component_el_form_item, {
            label: "平台",
            prop: "platform"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_select, {
                modelValue: agentForm.value.platform,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((agentForm.value.platform) = $event)),
                disabled: isEditing.value,
                placeholder: "请选择平台"
              }, {
                default: _withCtx(() => [
                  (isPlatformAllowed('coze'))
                    ? (_openBlock(), _createBlock(_component_el_option, {
                        key: 0,
                        label: "Coze",
                        value: "coze"
                      }))
                    : _createCommentVNode("", true),
                  (isPlatformAllowed('dify'))
                    ? (_openBlock(), _createBlock(_component_el_option, {
                        key: 1,
                        label: "Dify",
                        value: "dify"
                      }))
                    : _createCommentVNode("", true),
                  (_unref(brandConfig).enableFireflow && isPlatformAllowed('fireflow'))
                    ? (_openBlock(), _createBlock(_component_el_option, {
                        key: 2,
                        label: "Fireflow",
                        value: "fireflow"
                      }))
                    : _createCommentVNode("", true),
                  (isPlatformAllowed('agentic'))
                    ? (_openBlock(), _createBlock(_component_el_option, {
                        key: 3,
                        label: "私域Agent",
                        value: "agentic"
                      }))
                    : _createCommentVNode("", true)
                ]),
                _: 1
              }, 8, ["modelValue", "disabled"])
            ]),
            _: 1
          }),
          _createVNode(_component_el_form_item, {
            label: "智能体名称",
            prop: "name"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_input, {
                modelValue: agentForm.value.name,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((agentForm.value.name) = $event)),
                onKeydown: _cache[2] || (_cache[2] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])),
                placeholder: "请输入智能体名称"
              }, null, 8, ["modelValue"])
            ]),
            _: 1
          }),
          _createVNode(_component_el_form_item, {
            label: getIdLabel(),
            prop: "botId"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_input, {
                modelValue: agentForm.value.botId,
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((agentForm.value.botId) = $event)),
                disabled: isEditing.value,
                type: (agentForm.value.platform === 'dify' || agentForm.value.platform === 'fireflow') ? 'password' : 'text',
                "show-password": !isEditing.value && (agentForm.value.platform === 'dify' || agentForm.value.platform === 'fireflow'),
                placeholder: getIdPlaceholder(),
                onKeydown: _cache[4] || (_cache[4] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"]))
              }, null, 8, ["modelValue", "disabled", "type", "show-password", "placeholder"]),
              (isEditing.value)
                ? (_openBlock(), _createElementBlock("div", _hoisted_1, "平台和标识已被业务配置引用，修改时不可变更"))
                : _createCommentVNode("", true)
            ]),
            _: 1
          }, 8, ["label"]),
          (agentForm.value.platform === 'agentic')
            ? (_openBlock(), _createBlock(_component_el_collapse, {
                key: 0,
                modelValue: agenticPanels.value,
                "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event: any) => ((agenticPanels).value = $event)),
                class: "agentic-config-collapse"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_collapse_item, { name: "interface" }, {
                    title: _withCtx(() => [...(_cache[19] || (_cache[19] = [
                      _createElementVNode("div", { class: "agentic-collapse-title" }, [
                        _createElementVNode("span", null, "接口高级配置"),
                        _createElementVNode("span", { class: "field-tip" }, "默认使用本机私域Agent")
                      ], -1)
                    ]))]),
                    default: _withCtx(() => [
                      _createVNode(_component_el_form_item, {
                        label: "接口地址",
                        prop: "apiUrl"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input, {
                            modelValue: agentForm.value.apiUrl,
                            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((agentForm.value.apiUrl) = $event)),
                            placeholder: "http://127.0.0.1:3000",
                            onKeydown: _cache[6] || (_cache[6] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"]))
                          }, null, 8, ["modelValue"]),
                          _cache[20] || (_cache[20] = _createElementVNode("div", { class: "field-tip" }, "填写服务根地址，系统会调用 /v1/capabilities 和 /v1/chat", -1))
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "处理模式" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_select, {
                            modelValue: agentForm.value.deliveryMode,
                            "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((agentForm.value.deliveryMode) = $event)),
                            style: {"width":"100%"}
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_option, {
                                label: "同步回复",
                                value: "sync_reply"
                              }),
                              _createVNode(_component_el_option, {
                                label: "异步任务回复",
                                value: "async_reply"
                              }),
                              _createVNode(_component_el_option, {
                                label: "仅推送不回复",
                                value: "consume_only"
                              })
                            ]),
                            _: 1
                          }, 8, ["modelValue"]),
                          (agentForm.value.deliveryMode === 'async_reply')
                            ? (_openBlock(), _createElementBlock("div", _hoisted_2, " 平台返回任务号后，系统通过 HTTP 定时查询结果，无需开放本机回调端口 "))
                            : _createCommentVNode("", true)
                        ]),
                        _: 1
                      }),
                      (agentForm.value.deliveryMode !== 'async_reply')
                        ? (_openBlock(), _createBlock(_component_el_form_item, {
                            key: 0,
                            label: "响应格式"
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_el_select, {
                                modelValue: agentForm.value.responseFormat,
                                "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event: any) => ((agentForm.value.responseFormat) = $event)),
                                style: {"width":"100%"}
                              }, {
                                default: _withCtx(() => [
                                  _createVNode(_component_el_option, {
                                    label: "自动识别 JSON / SSE",
                                    value: "auto"
                                  }),
                                  _createVNode(_component_el_option, {
                                    label: "JSON",
                                    value: "json"
                                  }),
                                  _createVNode(_component_el_option, {
                                    label: "SSE",
                                    value: "sse"
                                  })
                                ]),
                                _: 1
                              }, 8, ["modelValue"])
                            ]),
                            _: 1
                          }))
                        : _createCommentVNode("", true),
                      _createVNode(_component_el_form_item, {
                        label: "接口 Token",
                        prop: "apiToken"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input, {
                            modelValue: agentForm.value.apiToken,
                            "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event: any) => ((agentForm.value.apiToken) = $event)),
                            type: "password",
                            "show-password": "",
                            autocomplete: "new-password",
                            placeholder: agentForm.value.hasApiToken ? '已配置，留空表示不修改' : '本机地址可留空，远程地址必填',
                            onKeydown: _cache[10] || (_cache[10] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"]))
                          }, null, 8, ["modelValue", "placeholder"])
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "超时时间" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input_number, {
                            modelValue: agentForm.value.timeoutSeconds,
                            "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event: any) => ((agentForm.value.timeoutSeconds) = $event)),
                            min: 1,
                            max: 300,
                            step: 10,
                            "controls-position": "right"
                          }, null, 8, ["modelValue"]),
                          _cache[21] || (_cache[21] = _createElementVNode("span", { class: "number-unit" }, "秒", -1))
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_el_form_item, { label: "失败重试" }, {
                        default: _withCtx(() => [
                          _createVNode(_component_el_input_number, {
                            modelValue: agentForm.value.retryCount,
                            "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event: any) => ((agentForm.value.retryCount) = $event)),
                            min: 0,
                            max: 3,
                            "controls-position": "right"
                          }, null, 8, ["modelValue"]),
                          _cache[22] || (_cache[22] = _createElementVNode("span", { class: "number-unit" }, "次", -1))
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["modelValue"]))
            : _createCommentVNode("", true),
          (agentForm.value.platform === 'coze3')
            ? (_openBlock(), _createBlock(_component_el_form_item, {
                key: 1,
                label: "API 地址",
                prop: "apiUrl"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_input, {
                    modelValue: agentForm.value.apiUrl,
                    "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event: any) => ((agentForm.value.apiUrl) = $event)),
                    placeholder: "https://xxxx.coze.site/stream_run",
                    onKeydown: _cache[15] || (_cache[15] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"]))
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }))
            : _createCommentVNode("", true),
          (agentForm.value.platform === 'coze3')
            ? (_openBlock(), _createBlock(_component_el_form_item, {
                key: 2,
                label: "API Token",
                prop: "apiToken"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_input, {
                    modelValue: agentForm.value.apiToken,
                    "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event: any) => ((agentForm.value.apiToken) = $event)),
                    type: "password",
                    "show-password": "",
                    autocomplete: "new-password",
                    placeholder: "请输入该 Project 的 API Token",
                    onKeydown: _cache[17] || (_cache[17] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"]))
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }))
            : _createCommentVNode("", true)
        ]),
        _: 1
      }, 8, ["model"]),
      _createElementVNode("div", _hoisted_3, [
        _createVNode(_component_el_button, { onClick: handleClose }, {
          default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
            _createTextVNode("取消", -1)
          ]))]),
          _: 1
        }),
        _createVNode(_component_el_button, {
          type: "primary",
          icon: isEditing.value ? _unref(Edit) : _unref(Plus),
          disabled: !isEditing.value && safeAgents.value.length >= 10,
          onClick: handleSubmit
        }, {
          default: _withCtx(() => [
            _createTextVNode(_toDisplayString(isEditing.value ? '保存修改' : '添加智能体'), 1)
          ]),
          _: 1
        }, 8, ["icon", "disabled"])
      ])
    ]),
    _: 1
  }, 8, ["modelValue", "title"]))
}
}

})