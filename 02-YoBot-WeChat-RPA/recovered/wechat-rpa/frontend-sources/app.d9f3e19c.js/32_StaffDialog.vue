import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, resolveComponent as _resolveComponent, createVNode as _createVNode, createTextVNode as _createTextVNode, withCtx as _withCtx, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, unref as _unref, toDisplayString as _toDisplayString, createBlock as _createBlock, normalizeClass as _normalizeClass } from "vue"

const _hoisted_1 = { class: "staff-form" }
const _hoisted_2 = { class: "form-item" }
const _hoisted_3 = { class: "form-item" }
const _hoisted_4 = {
  key: 0,
  style: {"margin-top":"6px","padding-top":"6px","border-top":"1px dashed #eee"}
}
const _hoisted_5 = { style: {"margin-top":"6px","padding-top":"6px","border-top":"1px dashed #eee"} }
const _hoisted_6 = {
  key: 0,
  style: {"margin-top":"6px","padding-top":"6px","border-top":"1px dashed #eee"}
}
const _hoisted_7 = {
  key: 1,
  style: {"margin-top":"6px","padding-top":"6px","border-top":"1px dashed #eee"}
}
const _hoisted_8 = { class: "form-item" }
const _hoisted_9 = { class: "form-item" }
const _hoisted_10 = { style: {"display":"flex","align-items":"center"} }
const _hoisted_11 = ["src", "alt"]
const _hoisted_12 = { class: "section-header" }
const _hoisted_13 = { key: 0 }
const _hoisted_14 = { key: 1 }
const _hoisted_15 = {
  key: 1,
  class: "voice-config-body"
}
const _hoisted_16 = { class: "vb-cable-row" }
const _hoisted_17 = { class: "vb-cable-label" }
const _hoisted_18 = {
  key: 0,
  class: "voice-hint-empty"
}
const _hoisted_19 = {
  class: "vb-cable-row",
  style: {"margin-top":"8px"}
}
const _hoisted_20 = { class: "vb-cable-label" }
const _hoisted_21 = {
  key: 1,
  class: "voice-hint-empty"
}
const _hoisted_22 = {
  class: "voice-row",
  style: {"margin-top":"12px"}
}
const _hoisted_23 = { style: {"float":"right","color":"#909399","font-size":"12px"} }
const _hoisted_24 = {
  key: 2,
  class: "voice-hint-empty"
}
const _hoisted_25 = {
  key: 3,
  class: "voice-hint-empty"
}
const _hoisted_26 = {
  key: 4,
  class: "voice-version-tip"
}
const _hoisted_27 = {
  key: 1,
  class: "form-item"
}
const _hoisted_28 = { class: "section-header" }
const _hoisted_29 = {
  key: 2,
  class: "form-item"
}
const _hoisted_30 = { class: "section-header" }
const _hoisted_31 = { class: "dialog-footer" }

import { ref, computed, nextTick, onMounted, PropType, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { InfoFilled, Headset, QuestionFilled } from '@element-plus/icons-vue'
  import { Tag } from '@/api/contact'
  import { voiceApi, type VoiceLibRecord, type VoiceLibStatus } from '@/api/voice'
  import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'
  import FfmpegInstallGuide from '@/components/settings/FfmpegInstallGuide.vue'
  import { API_BASE_URL, headers } from '@/api/config'
  import { getPlatformIconPath } from '@/utils/iconImages'
  // 获取平台图标扩展名
  // 定义组件属性
  interface InstanceInfo {
    instance_id: string
    window_handle?: number
    wechat_build: number[] | null
    wechat_version: string | null
    account_info?: { nickname?: string; account_id?: string } | null
  }

  
export default /*@__PURE__*/_defineComponent({
  __name: 'StaffDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    staff: {
      type: Object as PropType<{
        id: string
        name: string
        enabled: boolean
        agentId: string
        chatType: 'single' | 'group' | 'all'
        selectedTags: string[]
        keywords: string[]
        readGroupMember?: boolean
        quoteReply?: boolean
        mentionReply?: boolean
        monitorOnly?: boolean
        autoJoinGroup?: boolean
        voiceEnabled?: boolean
        voiceId?: string
      }>,
      default: undefined
    },
    isEdit: {
      type: Boolean,
      default: false
    },
    cozeAgents: {
      type: Array as PropType<Array<{
        name: string,
        botId: string,
        platform: string
      }>>,
      default: () => []
    },
    contactTags: {
      type: Array as PropType<Tag[]>,
      default: () => []
    },
    groupTags: {
      type: Array as PropType<Tag[]>,
      default: () => []
    },
    hasGroupStaff: {
      type: Boolean,
      default: false
    },
    mentionReplySupported: {
      type: Boolean,
      default: true
    },
    autoJoinGroupSupported: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:visible', 'save'],
  setup(__props, { emit: __emit }) {

  const props = __props
  
  // 定义组件事件
  const emit = __emit
  const isEditingGroupStaff = computed(() => {
    return props.isEdit && props.staff?.chatType === 'group'
  })
  // 对话框可见性
  const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })
  
  // 员工表单
  const staffForm = ref({
    id: '',
    name: '',
    enabled: true,
    agentId: '',
    chatType: 'single' as 'single' | 'group' | 'all',
    selectedTags: [] as string[],
    keywords: [] as string[],
    readGroupMember: false,
    quoteReply: false,
    mentionReply: false,
    monitorOnly: false,
    autoJoinGroup: false,
    voiceEnabled: false,
    voiceId: ''
  })

  // ---------- 语音回复：实例版本 + 音色列表 ----------
  const instances = ref<InstanceInfo[]>([])
  const { isFeatureEnabled } = useRuntimeCapabilityPresentation()
  const voicesAll = ref<VoiceLibRecord[]>([])
  const voiceLoading = ref(true)
  const voicesLoading = ref(true)

  // VB-Cable / ffmpeg 音频环境
  const audioEnv = ref<any>(null)
  const audioEnvLoading = ref(true)
  const ffmpegGuideVisible = ref(false)

  function openVBCableSite() {
    window.open('https://vb-audio.com/Cable/', '_blank')
  }

  function buildGE419(b: number[] | null): boolean {
    if (!b || b.length < 3) return false
    const [maj, min, patch] = b
    return maj > 4 || (maj === 4 && (min > 1 || (min === 1 && patch >= 9)))
  }

  const supportedInstances = computed(() => instances.value.filter(i => buildGE419(i.wechat_build)))
  const unsupportedInstances = computed(() => instances.value.filter(i => !buildGE419(i.wechat_build)))
  // 微信版本只说明原生控件可能存在；真正的产品能力必须由运行时
  // capability contract 明确授权。这样 Mac 4.x 不会误探测 Windows
  // 独有的语音 API。
  const voiceCapabilityAvailable = computed(() => isFeatureEnabled('automation.voice_send'))
  const voiceSupported = computed(() => voiceCapabilityAvailable.value && supportedInstances.value.length > 0)
  const multiVersionWarning = computed(() => supportedInstances.value.length > 0 && unsupportedInstances.value.length > 0)
  const versionSummary = computed(() => {
    if (!instances.value.length) return '无'
    return instances.value
      .map(i => i.wechat_version || '未知')
      .join('、')
  })

  const availableVoices = computed(() => voicesAll.value)
  const hasActiveVoice = computed(() => voicesAll.value.some(v => v.status === 'active'))

  function statusLabel(s: VoiceLibStatus): string {
    return ({
      pending: '待校验',
      training: '训练中',
      active: '可用',
      failed: '校验失败',
      gone: '不存在'
    } as Record<VoiceLibStatus, string>)[s] || s
  }

  async function loadInstances() {
    voiceLoading.value = true
    try {
      const res = await fetch(`${API_BASE_URL}/api/instances`, {
        headers: { ...headers },
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        instances.value = (data.instances || []) as InstanceInfo[]
      }
    } catch (e) {
      console.error('加载微信实例失败:', e)
    } finally {
      voiceLoading.value = false
    }
  }

  async function loadVoices() {
    voicesLoading.value = true
    try {
      const r = await voiceApi.listLibrary()
      if (r.success && r.data) {
        voicesAll.value = r.data
      }
    } catch (e) {
      console.error('加载音色列表失败:', e)
    } finally {
      voicesLoading.value = false
    }
  }

  async function loadAudioEnv() {
    audioEnvLoading.value = true
    try {
      const r = await voiceApi.getAudioDevices()
      if (r.success && r.data) {
        audioEnv.value = r.data
      }
    } catch (e) {
      console.error('加载音频环境失败:', e)
    } finally {
      audioEnvLoading.value = false
    }
  }

  onMounted(async () => {
    await loadInstances()
    // 先以实例版本确认语音能力，再读取语音资源。macOS 当前不声明
    // 语音发送能力且不会提供这些 Windows 路由，禁止无能力探测。
    if (voiceCapabilityAvailable.value && voiceSupported.value) {
      await Promise.all([loadVoices(), loadAudioEnv()])
    }
  })
  
  // 关键词输入控制
  const keywordInputVisible = ref(false)
  const keywordInputValue = ref('')
  const keywordInputRef = ref<HTMLInputElement | null>(null)
  
  // 监听staff属性变化
  watch(() => props.staff, (newVal) => {
    if (newVal) {
      const staffData = JSON.parse(JSON.stringify(newVal))
      staffForm.value = {
        ...staffData,
        readGroupMember: staffData.readGroupMember ?? false,
        quoteReply: staffData.quoteReply ?? false,
        mentionReply: staffData.mentionReply ?? false,
        monitorOnly: staffData.monitorOnly ?? false,
        autoJoinGroup: staffData.autoJoinGroup ?? false,
        voiceEnabled: staffData.voiceEnabled ?? false,
        voiceId: staffData.voiceId ?? ''
      }
    }
  }, { immediate: true })
  
  // 关键词相关方法
  const addKeyword = () => {
    keywordInputVisible.value = true
    nextTick(() => {
      keywordInputRef.value?.focus()
    })
  }
  
  const confirmKeyword = () => {
    if (keywordInputValue.value.trim()) {
      if (!staffForm.value.keywords.includes(keywordInputValue.value.trim())) {
        staffForm.value.keywords.push(keywordInputValue.value.trim())
      }
    }
    keywordInputVisible.value = false
    keywordInputValue.value = ''
  }
  
  const removeKeyword = (index: number) => {
    staffForm.value.keywords.splice(index, 1)
  }
  
  // 重置标签选择
  const resetTags = () => {
    staffForm.value.selectedTags = []
    ElMessage.success('已重置，重新保存后生效')
  }
  
  // 保存员工
  const saveStaff = () => {
    // 验证表单
    if (!staffForm.value.name.trim()) {
      ElMessage.error('请输入员工名称')
      return
    }

    if (!staffForm.value.agentId) {
      ElMessage.error('请选择智能体')
      return
    }

    // 语音回复校验：启用了但未选音色 → 拒绝
    if (staffForm.value.voiceEnabled && !staffForm.value.voiceId) {
      ElMessage.error('已启用语音回复，请选择一个音色')
      return
    }
    // 选了但版本不再支持 → 静默关闭
    if (staffForm.value.voiceEnabled && !voiceSupported.value) {
      staffForm.value.voiceEnabled = false
      staffForm.value.voiceId = ''
    }
    if (!props.autoJoinGroupSupported) {
      staffForm.value.autoJoinGroup = false
    }

    emit('save', staffForm.value)
  }
  
return (_ctx: any,_cache: any) => {
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_radio = _resolveComponent("el-radio")!
  const _component_el_radio_group = _resolveComponent("el-radio-group")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_switch = _resolveComponent("el-switch")!
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_tooltip = _resolveComponent("el-tooltip")!
  const _component_el_checkbox_group = _resolveComponent("el-checkbox-group")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createVNode(_component_el_dialog, {
      modelValue: dialogVisible.value,
      "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event: any) => ((dialogVisible).value = $event)),
      title: __props.isEdit ? '编辑AI助理' : '添加AI助理',
      width: "500px"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("div", _hoisted_31, [
          _createVNode(_component_el_button, {
            onClick: _cache[13] || (_cache[13] = ($event: any) => (dialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[45] || (_cache[45] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            onClick: saveStaff
          }, {
            default: _withCtx(() => [...(_cache[46] || (_cache[46] = [
              _createTextVNode("确认", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_1, [
          _createElementVNode("div", _hoisted_2, [
            _cache[16] || (_cache[16] = _createElementVNode("h3", null, "*员工名称", -1)),
            _createVNode(_component_el_input, {
              modelValue: staffForm.value.name,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((staffForm.value.name) = $event)),
              placeholder: "如：培育AI助理"
            }, null, 8, ["modelValue"])
          ]),
          _createElementVNode("div", _hoisted_3, [
            _cache[27] || (_cache[27] = _createElementVNode("h3", null, "*回复范围", -1)),
            _createVNode(_component_el_radio_group, {
              modelValue: staffForm.value.chatType,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((staffForm.value.chatType) = $event))
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_radio, { value: "single" }, {
                  default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
                    _createTextVNode("单聊", -1)
                  ]))]),
                  _: 1
                }),
                _createVNode(_component_el_radio, { value: "group" }, {
                  default: _withCtx(() => [...(_cache[18] || (_cache[18] = [
                    _createTextVNode("群聊", -1)
                  ]))]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["modelValue"]),
            (staffForm.value.chatType === 'group')
              ? (_openBlock(), _createElementBlock("div", _hoisted_4, [
                  _createVNode(_component_el_checkbox, {
                    modelValue: staffForm.value.readGroupMember,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((staffForm.value.readGroupMember) = $event))
                  }, {
                    default: _withCtx(() => [...(_cache[19] || (_cache[19] = [
                      _createTextVNode(" 是否读群成员 ", -1)
                    ]))]),
                    _: 1
                  }, 8, ["modelValue"]),
                  _cache[24] || (_cache[24] = _createElementVNode("div", {
                    class: "description",
                    style: {"margin-top":"4px","color":"#909399","font-size":"12px"}
                  }, " 微信4.1无法直接读取群聊发送者名称，需额操作获取，如非必须可不勾选 ", -1)),
                  _createElementVNode("div", _hoisted_5, [
                    _createVNode(_component_el_checkbox, {
                      modelValue: staffForm.value.quoteReply,
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((staffForm.value.quoteReply) = $event))
                    }, {
                      default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
                        _createTextVNode(" 是否引用回复 ", -1)
                      ]))]),
                      _: 1
                    }, 8, ["modelValue"]),
                    _cache[21] || (_cache[21] = _createElementVNode("div", {
                      class: "description",
                      style: {"margin-top":"4px","color":"#909399","font-size":"12px"}
                    }, " 勾选后，回复群消息时会引用对方的原始消息 ", -1))
                  ]),
                  (props.mentionReplySupported)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_6, [
                        _createVNode(_component_el_checkbox, {
                          modelValue: staffForm.value.mentionReply,
                          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((staffForm.value.mentionReply) = $event))
                        }, {
                          default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
                            _createTextVNode(" 是否@回复 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["modelValue"]),
                        _cache[23] || (_cache[23] = _createElementVNode("div", {
                          class: "description",
                          style: {"margin-top":"4px","color":"#909399","font-size":"12px"}
                        }, " 勾选后，每轮群聊回复的第一个文本、图片或文件会原生@消息发送者 ", -1))
                      ]))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true),
            (staffForm.value.chatType === 'single' && props.autoJoinGroupSupported)
              ? (_openBlock(), _createElementBlock("div", _hoisted_7, [
                  _createVNode(_component_el_checkbox, {
                    modelValue: staffForm.value.autoJoinGroup,
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((staffForm.value.autoJoinGroup) = $event))
                  }, {
                    default: _withCtx(() => [...(_cache[25] || (_cache[25] = [
                      _createTextVNode(" 群邀请自动加入 ", -1)
                    ]))]),
                    _: 1
                  }, 8, ["modelValue"]),
                  _cache[26] || (_cache[26] = _createElementVNode("div", {
                    class: "description",
                    style: {"margin-top":"4px","color":"#909399","font-size":"12px"}
                  }, " 勾选后，收到\"邀请你加入群聊\"的卡片时自动点击加入，不再交给智能体回复；不勾选则按普通消息走AI自动回复 ", -1))
                ]))
              : _createCommentVNode("", true)
          ]),
          _createElementVNode("div", _hoisted_8, [
            _createVNode(_component_el_checkbox, {
              modelValue: staffForm.value.monitorOnly,
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event: any) => ((staffForm.value.monitorOnly) = $event))
            }, {
              default: _withCtx(() => [...(_cache[28] || (_cache[28] = [
                _createTextVNode(" 仅监控模式 ", -1)
              ]))]),
              _: 1
            }, 8, ["modelValue"]),
            _cache[29] || (_cache[29] = _createElementVNode("div", {
              class: "description",
              style: {"margin-top":"4px","color":"#909399","font-size":"12px"}
            }, " 勾选后，该助理只监听和读取消息、参与事件识别（如新进群、新好友），但不会调用智能体生成回复 ", -1))
          ]),
          _createElementVNode("div", _hoisted_9, [
            _cache[30] || (_cache[30] = _createElementVNode("h3", null, "*选择智能体", -1)),
            _createVNode(_component_el_select, {
              modelValue: staffForm.value.agentId,
              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((staffForm.value.agentId) = $event)),
              placeholder: "请选择智能体",
              clearable: "",
              style: {"width":"100%"}
            }, {
              default: _withCtx(() => [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(props.cozeAgents, (agent) => {
                  return (_openBlock(), _createBlock(_component_el_option, {
                    key: agent.botId,
                    label: agent.name,
                    value: agent.botId
                  }, {
                    default: _withCtx(() => [
                      _createElementVNode("div", _hoisted_10, [
                        _createElementVNode("img", {
                          src: _unref(getPlatformIconPath)(agent.platform),
                          alt: agent.platform || 'coze',
                          style: {"width":"18px","height":"18px","margin-right":"8px"}
                        }, null, 8, _hoisted_11),
                        _createElementVNode("span", null, _toDisplayString(agent.name), 1)
                      ])
                    ]),
                    _: 2
                  }, 1032, ["label", "value"]))
                }), 128))
              ]),
              _: 1
            }, 8, ["modelValue"])
          ]),
          (voiceCapabilityAvailable.value)
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: _normalizeClass(["form-item", { 'voice-disabled': !voiceSupported.value }])
              }, [
                _createElementVNode("div", _hoisted_12, [
                  _cache[31] || (_cache[31] = _createElementVNode("div", { class: "title-group" }, [
                    _createElementVNode("h3", null, "语音回复"),
                    _createElementVNode("p", { class: "description" }, "将 AI 文字回复转语音发送。需要微信客户端 4.1.9 及以上版本。")
                  ], -1)),
                  _createVNode(_component_el_switch, {
                    modelValue: staffForm.value.voiceEnabled,
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event: any) => ((staffForm.value.voiceEnabled) = $event)),
                    disabled: !voiceSupported.value
                  }, null, 8, ["modelValue", "disabled"])
                ]),
                (!voiceSupported.value && !voiceLoading.value)
                  ? (_openBlock(), _createBlock(_component_el_alert, {
                      key: 0,
                      type: "warning",
                      closable: false,
                      "show-icon": "",
                      style: {"margin-top":"8px"}
                    }, {
                      title: _withCtx(() => [
                        (!instances.value.length)
                          ? (_openBlock(), _createElementBlock("span", _hoisted_13, "未检测到微信实例"))
                          : (_openBlock(), _createElementBlock("span", _hoisted_14, " 当前所有微信实例版本均低于 4.1.9，无法使用语音回复（已检测：" + _toDisplayString(versionSummary.value) + "） ", 1))
                      ]),
                      _: 1
                    }))
                  : _createCommentVNode("", true),
                (voiceSupported.value && staffForm.value.voiceEnabled)
                  ? (_openBlock(), _createElementBlock("div", _hoisted_15, [
                      _createElementVNode("div", _hoisted_16, [
                        _createElementVNode("span", _hoisted_17, [
                          _createVNode(_component_el_icon, null, {
                            default: _withCtx(() => [
                              _createVNode(_unref(Headset))
                            ]),
                            _: 1
                          }),
                          _cache[32] || (_cache[32] = _createTextVNode(" 音频通道 ", -1))
                        ]),
                        (audioEnvLoading.value)
                          ? (_openBlock(), _createBlock(_component_el_tag, {
                              key: 0,
                              type: "info",
                              size: "small"
                            }, {
                              default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
                                _createTextVNode("检测中…", -1)
                              ]))]),
                              _: 1
                            }))
                          : (audioEnv.value?.vb_cable_installed)
                            ? (_openBlock(), _createBlock(_component_el_tag, {
                                key: 1,
                                type: "success",
                                size: "small"
                              }, {
                                default: _withCtx(() => [
                                  _createTextVNode(" ✓ VB-Cable 已就绪（默认麦克风: " + _toDisplayString(audioEnv.value.default_recording_name || '未知') + "） ", 1)
                                ]),
                                _: 1
                              }))
                            : (_openBlock(), _createBlock(_component_el_tag, {
                                key: 2,
                                type: "danger",
                                size: "small"
                              }, {
                                default: _withCtx(() => [...(_cache[34] || (_cache[34] = [
                                  _createTextVNode(" ✗ VB-Cable 未安装 ", -1)
                                ]))]),
                                _: 1
                              })),
                        (!audioEnvLoading.value && !audioEnv.value?.vb_cable_installed)
                          ? (_openBlock(), _createBlock(_component_el_button, {
                              key: 3,
                              link: "",
                              type: "primary",
                              size: "small",
                              onClick: openVBCableSite
                            }, {
                              default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
                                _createTextVNode("下载 VB-Cable →", -1)
                              ]))]),
                              _: 1
                            }))
                          : _createCommentVNode("", true)
                      ]),
                      (!audioEnvLoading.value && !audioEnv.value?.vb_cable_installed)
                        ? (_openBlock(), _createElementBlock("div", _hoisted_18, " VB-Cable 未安装，语音回复无法发声 — 请下载并以管理员身份安装，重启电脑后再来。 "))
                        : _createCommentVNode("", true),
                      _createElementVNode("div", _hoisted_19, [
                        _createElementVNode("span", _hoisted_20, [
                          _createVNode(_component_el_icon, null, {
                            default: _withCtx(() => [
                              _createVNode(_unref(Headset))
                            ]),
                            _: 1
                          }),
                          _cache[36] || (_cache[36] = _createTextVNode(" 解码组件 ", -1))
                        ]),
                        (audioEnvLoading.value)
                          ? (_openBlock(), _createBlock(_component_el_tag, {
                              key: 0,
                              type: "info",
                              size: "small"
                            }, {
                              default: _withCtx(() => [...(_cache[37] || (_cache[37] = [
                                _createTextVNode("检测中…", -1)
                              ]))]),
                              _: 1
                            }))
                          : (audioEnv.value?.ffmpeg?.installed)
                            ? (_openBlock(), _createBlock(_component_el_tag, {
                                key: 1,
                                type: "success",
                                size: "small"
                              }, {
                                default: _withCtx(() => [
                                  _createTextVNode(" ✓ ffmpeg 已就绪" + _toDisplayString(audioEnv.value.ffmpeg.version ? `（${audioEnv.value.ffmpeg.version}）` : ''), 1)
                                ]),
                                _: 1
                              }))
                            : (_openBlock(), _createBlock(_component_el_tag, {
                                key: 2,
                                type: "danger",
                                size: "small"
                              }, {
                                default: _withCtx(() => [...(_cache[38] || (_cache[38] = [
                                  _createTextVNode(" ✗ ffmpeg 未安装 ", -1)
                                ]))]),
                                _: 1
                              })),
                        (!audioEnvLoading.value && !audioEnv.value?.ffmpeg?.installed)
                          ? (_openBlock(), _createBlock(_component_el_tooltip, {
                              key: 3,
                              content: "点击查看安装教程",
                              placement: "top"
                            }, {
                              default: _withCtx(() => [
                                _createVNode(_component_el_button, {
                                  circle: "",
                                  size: "small",
                                  type: "warning",
                                  class: "help-btn-inline",
                                  onClick: _cache[9] || (_cache[9] = ($event: any) => (ffmpegGuideVisible.value = true))
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_el_icon, null, {
                                      default: _withCtx(() => [
                                        _createVNode(_unref(QuestionFilled))
                                      ]),
                                      _: 1
                                    })
                                  ]),
                                  _: 1
                                })
                              ]),
                              _: 1
                            }))
                          : _createCommentVNode("", true)
                      ]),
                      (!audioEnvLoading.value && !audioEnv.value?.ffmpeg?.installed)
                        ? (_openBlock(), _createElementBlock("div", _hoisted_21, " ffmpeg 未安装，语音解码会失败 — 点击右侧问号查看安装教程，装完后请重启本软件。 "))
                        : _createCommentVNode("", true),
                      _createElementVNode("div", _hoisted_22, [
                        _cache[40] || (_cache[40] = _createElementVNode("span", { class: "voice-label" }, "音色", -1)),
                        _createVNode(_component_el_select, {
                          modelValue: staffForm.value.voiceId,
                          "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event: any) => ((staffForm.value.voiceId) = $event)),
                          placeholder: "选择音色",
                          style: {"flex":"1"},
                          loading: voicesLoading.value
                        }, {
                          empty: _withCtx(() => [...(_cache[39] || (_cache[39] = [
                            _createElementVNode("div", { style: {"padding":"12px","text-align":"center","color":"#909399"} }, " 尚未添加任何音色 ", -1)
                          ]))]),
                          default: _withCtx(() => [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(availableVoices.value, (v) => {
                              return (_openBlock(), _createBlock(_component_el_option, {
                                key: v.voice_id,
                                label: `${v.name} (${v.voice_id})`,
                                value: v.voice_id,
                                disabled: v.status !== 'active'
                              }, {
                                default: _withCtx(() => [
                                  _createElementVNode("span", null, _toDisplayString(v.name), 1),
                                  _createElementVNode("span", _hoisted_23, _toDisplayString(v.status === 'active' ? '可用' : statusLabel(v.status)), 1)
                                ]),
                                _: 2
                              }, 1032, ["label", "value", "disabled"]))
                            }), 128))
                          ]),
                          _: 1
                        }, 8, ["modelValue", "loading"])
                      ]),
                      (!availableVoices.value.length && !voicesLoading.value)
                        ? (_openBlock(), _createElementBlock("div", _hoisted_24, " 请先到「设置 → AI 语音配置 → 我的音色」添加并校验音色 "))
                        : (!hasActiveVoice.value)
                          ? (_openBlock(), _createElementBlock("div", _hoisted_25, " 已添加的音色都未校验通过，请去「我的音色」执行校验 "))
                          : _createCommentVNode("", true),
                      (multiVersionWarning.value)
                        ? (_openBlock(), _createElementBlock("div", _hoisted_26, [
                            _createVNode(_component_el_icon, { style: {"vertical-align":"-2px"} }, {
                              default: _withCtx(() => [
                                _createVNode(_unref(InfoFilled))
                              ]),
                              _: 1
                            }),
                            _createTextVNode(" 注意：你有 " + _toDisplayString(unsupportedInstances.value.length) + " 个微信实例版本 < 4.1.9（" + _toDisplayString(unsupportedInstances.value.map(i => i.account_info?.nickname || i.instance_id).join('、')) + "），这些实例上的会话会自动回退到文字回复。 ", 1)
                          ]))
                        : _createCommentVNode("", true)
                    ]))
                  : _createCommentVNode("", true)
              ], 2))
            : _createCommentVNode("", true),
          (staffForm.value.chatType === 'single' || staffForm.value.chatType === 'all')
            ? (_openBlock(), _createElementBlock("div", _hoisted_27, [
                _createElementVNode("div", _hoisted_28, [
                  _cache[42] || (_cache[42] = _createElementVNode("div", { class: "title-group" }, [
                    _createElementVNode("h3", null, "好友标签"),
                    _createElementVNode("p", { class: "description" }, "不选会作为兜底AI助理，回复所有好友")
                  ], -1)),
                  (__props.isEdit)
                    ? (_openBlock(), _createBlock(_component_el_button, {
                        key: 0,
                        type: "warning",
                        size: "small",
                        onClick: resetTags,
                        disabled: staffForm.value.selectedTags.length === 0
                      }, {
                        default: _withCtx(() => [...(_cache[41] || (_cache[41] = [
                          _createTextVNode(" 重置标签 ", -1)
                        ]))]),
                        _: 1
                      }, 8, ["disabled"]))
                    : _createCommentVNode("", true)
                ]),
                _createVNode(_component_el_checkbox_group, {
                  modelValue: staffForm.value.selectedTags,
                  "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event: any) => ((staffForm.value.selectedTags) = $event))
                }, {
                  default: _withCtx(() => [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(props.contactTags, (tag) => {
                      return (_openBlock(), _createBlock(_component_el_checkbox, {
                        key: tag.id,
                        label: tag.id
                      }, {
                        default: _withCtx(() => [
                          _createTextVNode(_toDisplayString(tag.name), 1)
                        ]),
                        _: 2
                      }, 1032, ["label"]))
                    }), 128))
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ]))
            : _createCommentVNode("", true),
          (staffForm.value.chatType === 'group')
            ? (_openBlock(), _createElementBlock("div", _hoisted_29, [
                _createElementVNode("div", _hoisted_30, [
                  _cache[44] || (_cache[44] = _createElementVNode("div", { class: "title-group" }, [
                    _createElementVNode("h3", null, "群聊标签"),
                    _createElementVNode("p", { class: "description" }, "不选会作为兜底AI助理，回复所有群聊")
                  ], -1)),
                  (__props.isEdit)
                    ? (_openBlock(), _createBlock(_component_el_button, {
                        key: 0,
                        type: "warning",
                        size: "small",
                        onClick: resetTags,
                        disabled: staffForm.value.selectedTags.length === 0
                      }, {
                        default: _withCtx(() => [...(_cache[43] || (_cache[43] = [
                          _createTextVNode(" 重置标签 ", -1)
                        ]))]),
                        _: 1
                      }, 8, ["disabled"]))
                    : _createCommentVNode("", true)
                ]),
                _createVNode(_component_el_checkbox_group, {
                  modelValue: staffForm.value.selectedTags,
                  "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event: any) => ((staffForm.value.selectedTags) = $event))
                }, {
                  default: _withCtx(() => [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(props.groupTags, (tag) => {
                      return (_openBlock(), _createBlock(_component_el_checkbox, {
                        key: tag.id,
                        label: tag.id
                      }, {
                        default: _withCtx(() => [
                          _createTextVNode(_toDisplayString(tag.name), 1)
                        ]),
                        _: 2
                      }, 1032, ["label"]))
                    }), 128))
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ]))
            : _createCommentVNode("", true)
        ])
      ]),
      _: 1
    }, 8, ["modelValue", "title"]),
    _createVNode(FfmpegInstallGuide, {
      modelValue: ffmpegGuideVisible.value,
      "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event: any) => ((ffmpegGuideVisible).value = $event)),
      onRecheck: loadAudioEnv
    }, null, 8, ["modelValue"])
  ], 64))
}
}

})