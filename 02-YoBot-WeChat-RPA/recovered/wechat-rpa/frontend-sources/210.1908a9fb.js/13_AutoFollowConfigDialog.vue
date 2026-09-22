import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, unref as _unref, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, createBlock as _createBlock, toDisplayString as _toDisplayString, createCommentVNode as _createCommentVNode, createTextVNode as _createTextVNode } from "vue"

const _hoisted_1 = { class: "label-with-icon" }
const _hoisted_2 = { class: "item-content" }
const _hoisted_3 = { class: "label-with-icon" }
const _hoisted_4 = { class: "item-content" }
const _hoisted_5 = { class: "selected-friends" }
const _hoisted_6 = { class: "label-with-icon" }
const _hoisted_7 = { class: "item-content" }
const _hoisted_8 = { class: "follow-period" }
const _hoisted_9 = { class: "label-with-icon" }
const _hoisted_10 = { class: "item-content" }
const _hoisted_11 = {
  class: "frequency-input-row",
  style: {"display":"flex","align-items":"center","margin-bottom":"8px"}
}
const _hoisted_12 = { class: "frequency-description" }
const _hoisted_13 = {
  key: 0,
  class: "desc-text"
}
const _hoisted_14 = {
  key: 1,
  class: "desc-text"
}
const _hoisted_15 = { class: "label-with-icon" }
const _hoisted_16 = { class: "item-content" }
const _hoisted_17 = { class: "time-range-container" }
const _hoisted_18 = { class: "label-with-icon" }
const _hoisted_19 = { class: "item-content" }
const _hoisted_20 = { class: "dialog-footer" }

import { ref, computed, onMounted, PropType } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { getConfig } from '@/api/config'
import { Avatar, User, Calendar, Clock, AlarmClock } from '@element-plus/icons-vue'

interface CozeAgent {
  botId: string
  name: string
}

interface ConfigFormData {
  agentId: string
  followFrequency: number
  followDays: number
  startTime: Date
  endTime: Date
  firstRunNextDay: boolean
}


export default /*@__PURE__*/_defineComponent({
  __name: 'AutoFollowConfigDialog',
  props: {
  visible: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedFriends: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  selectedGroups: {
    type: Array as PropType<string[]>,
    default: () => []
  }
},
  emits: ['update:visible', 'update:modelValue', 'create'],
  setup(__props, { emit: __emit }) {

const props = __props

const emit = __emit
const router = useRouter()

// 响应式数据
const cozeAgents = ref<CozeAgent[]>([])
const creating = ref(false)

// 表单数据
const configForm = ref<ConfigFormData>({
  agentId: '',
  followFrequency: 1, // 默认间隔1天
  followDays: 7, // 默认7天
  startTime: new Date(2000, 1, 1, 8, 0), // 默认8:00
  endTime: new Date(2000, 1, 1, 12, 0),   // 默认12:00
  firstRunNextDay: false // 默认当天按时间段规则执行
})

// 计算属性
const dialogWidth = computed(() => {
  const windowWidth = window.innerWidth
  if (windowWidth < 768) {
    return '95%'
  }
  if (windowWidth < 1200) {
    return '80%'
  }
  return '500px'
})

const dialogVisible = computed({
  get: () => props.visible || props.modelValue,
  set: (val) => {
    emit('update:visible', val)
    emit('update:modelValue', val)
  }
})

const formatSelectedTargets = computed(() => {
  const all = [...props.selectedFriends, ...props.selectedGroups]
  if (all.length === 0) return '未选择'
  if (all.length <= 5) return all.join('、')
  return `${all.slice(0, 5).join('、')}等${all.length}个`
})

// 方法
const loadCozeAgents = async () => {
  try {
    const result = await getConfig('agents')
    if (result.success && result.data) {
      const agents = Array.isArray(result.data) ? result.data : 
                    Array.isArray(result.data.agents) ? result.data.agents : []
      
      cozeAgents.value = agents.filter((agent: CozeAgent) => agent.name && agent.botId)
      
      // 新配置尚未选择智能体时，使用列表第一项作为表单初始值
      const selectedAgentExists = cozeAgents.value.some(agent => agent.botId === configForm.value.agentId)
      if (!selectedAgentExists && cozeAgents.value.length > 0) {
        configForm.value.agentId = cozeAgents.value[0].botId
      }
    }
  } catch (error) {
    console.error('加载智能体配置失败:', error)
    ElMessage.error('加载智能体配置失败')
  }
}

const handleCreateAutoFollow = async () => {
  try {
    // 验证表单
    if (!configForm.value.agentId) {
      ElMessage.warning('请选择跟进智能体')
      return
    }

    if (!configForm.value.startTime || !configForm.value.endTime) {
      ElMessage.warning('请选择时间段')
      return
    }

    // 验证时间范围
    const startHour = configForm.value.startTime.getHours()
    const startMinute = configForm.value.startTime.getMinutes()
    const endHour = configForm.value.endTime.getHours()
    const endMinute = configForm.value.endTime.getMinutes()

    const startTimeInMinutes = startHour * 60 + startMinute
    const endTimeInMinutes = endHour * 60 + endMinute

    if (startTimeInMinutes >= endTimeInMinutes) {
      ElMessage.warning('结束时间必须晚于开始时间')
      return
    }

    creating.value = true

    // 构建配置数据
    const configData = {
      agentId: configForm.value.agentId,
      followFrequency: configForm.value.followFrequency,
      followDays: configForm.value.followDays,
      timeRangeStart: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
      timeRangeEnd: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
      firstRunNextDay: configForm.value.firstRunNextDay,
      selectedFriends: props.selectedFriends
    }

    // 触发创建事件
    emit('create', configData)
    
    // 关闭弹窗
    dialogVisible.value = false

  } catch (error) {
    console.error('创建自动跟单任务失败:', error)
    ElMessage.error('创建自动跟单任务失败')
  } finally {
    creating.value = false
  }
}

// 生命周期
onMounted(() => {
  loadCozeAgents()
})

return (_ctx: any,_cache: any) => {
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_input_number = _resolveComponent("el-input-number")!
  const _component_el_time_picker = _resolveComponent("el-time-picker")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: dialogVisible.value,
    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((dialogVisible).value = $event)),
    title: "自动跟进配置",
    width: dialogWidth.value,
    top: '10vh',
    "close-on-click-modal": false,
    class: "auto-follow-config-dialog"
  }, {
    footer: _withCtx(() => [
      _createElementVNode("span", _hoisted_20, [
        _createVNode(_component_el_button, {
          onClick: _cache[6] || (_cache[6] = ($event: any) => (dialogVisible.value = false))
        }, {
          default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
            _createTextVNode("取消", -1)
          ]))]),
          _: 1
        }),
        _createVNode(_component_el_button, {
          type: "primary",
          onClick: handleCreateAutoFollow,
          loading: creating.value
        }, {
          default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
            _createTextVNode(" 开启自动跟进 ", -1)
          ]))]),
          _: 1
        }, 8, ["loading"])
      ])
    ]),
    default: _withCtx(() => [
      _cache[22] || (_cache[22] = _createElementVNode("div", { class: "dialog-subtitle" }, " 自动跟进客户与群聊，释放AI生产力 ", -1)),
      _createVNode(_component_el_form, {
        model: configForm.value,
        "label-width": "100px",
        class: "config-form"
      }, {
        default: _withCtx(() => [
          _createVNode(_component_el_form_item, { class: "custom-label-form-item" }, {
            label: _withCtx(() => [
              _createElementVNode("div", _hoisted_1, [
                _createVNode(_component_el_icon, { class: "label-icon" }, {
                  default: _withCtx(() => [
                    _createVNode(_unref(Avatar))
                  ]),
                  _: 1
                }),
                _cache[8] || (_cache[8] = _createElementVNode("span", null, "跟进智能体：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_2, [
                _createVNode(_component_el_select, {
                  modelValue: configForm.value.agentId,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((configForm.value.agentId) = $event)),
                  placeholder: "选择智能体",
                  class: "select-full-width"
                }, {
                  default: _withCtx(() => [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(cozeAgents.value, (agent) => {
                      return (_openBlock(), _createBlock(_component_el_option, {
                        key: agent.botId,
                        label: agent.name,
                        value: agent.botId
                      }, null, 8, ["label", "value"]))
                    }), 128))
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ])
            ]),
            _: 1
          }),
          _createVNode(_component_el_form_item, { class: "custom-label-form-item" }, {
            label: _withCtx(() => [
              _createElementVNode("div", _hoisted_3, [
                _createVNode(_component_el_icon, { class: "label-icon" }, {
                  default: _withCtx(() => [
                    _createVNode(_unref(User))
                  ]),
                  _: 1
                }),
                _cache[9] || (_cache[9] = _createElementVNode("span", null, "跟进对象：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_4, [
                _createElementVNode("div", _hoisted_5, _toDisplayString(formatSelectedTargets.value), 1)
              ])
            ]),
            _: 1
          }),
          _createVNode(_component_el_form_item, { class: "custom-label-form-item" }, {
            label: _withCtx(() => [
              _createElementVNode("div", _hoisted_6, [
                _createVNode(_component_el_icon, { class: "label-icon" }, {
                  default: _withCtx(() => [
                    _createVNode(_unref(Calendar))
                  ]),
                  _: 1
                }),
                _cache[10] || (_cache[10] = _createElementVNode("span", null, "跟进周期：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_7, [
                _createElementVNode("div", _hoisted_8, [
                  _createVNode(_component_el_input_number, {
                    modelValue: configForm.value.followDays,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((configForm.value.followDays) = $event)),
                    min: 3,
                    max: 30,
                    "controls-position": "right",
                    style: {"width":"120px","margin-right":"8px"}
                  }, null, 8, ["modelValue"]),
                  _cache[11] || (_cache[11] = _createElementVNode("span", { class: "period-unit" }, "天", -1))
                ])
              ])
            ]),
            _: 1
          }),
          _createVNode(_component_el_form_item, { class: "custom-label-form-item" }, {
            label: _withCtx(() => [
              _createElementVNode("div", _hoisted_9, [
                _createVNode(_component_el_icon, { class: "label-icon" }, {
                  default: _withCtx(() => [
                    _createVNode(_unref(Clock))
                  ]),
                  _: 1
                }),
                _cache[12] || (_cache[12] = _createElementVNode("span", null, "跟进频率：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_10, [
                _createElementVNode("div", _hoisted_11, [
                  _cache[13] || (_cache[13] = _createElementVNode("span", { style: {"margin-right":"8px"} }, "每隔", -1)),
                  _createVNode(_component_el_input_number, {
                    modelValue: configForm.value.followFrequency,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((configForm.value.followFrequency) = $event)),
                    min: 0,
                    max: 10,
                    "controls-position": "right",
                    style: {"width":"100px","margin-right":"8px"}
                  }, null, 8, ["modelValue"]),
                  _cache[14] || (_cache[14] = _createElementVNode("span", null, "天", -1))
                ]),
                _createElementVNode("div", _hoisted_12, [
                  (configForm.value.followFrequency === 0)
                    ? (_openBlock(), _createElementBlock("span", _hoisted_13, " 每天跟进一次 "))
                    : (_openBlock(), _createElementBlock("span", _hoisted_14, " 每隔 " + _toDisplayString(configForm.value.followFrequency) + " 天跟进一次 ", 1))
                ])
              ])
            ]),
            _: 1
          }),
          _createVNode(_component_el_form_item, { class: "custom-label-form-item" }, {
            label: _withCtx(() => [
              _createElementVNode("div", _hoisted_15, [
                _createVNode(_component_el_icon, { class: "label-icon" }, {
                  default: _withCtx(() => [
                    _createVNode(_unref(AlarmClock))
                  ]),
                  _: 1
                }),
                _cache[15] || (_cache[15] = _createElementVNode("span", null, "时间段：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_16, [
                _createElementVNode("div", _hoisted_17, [
                  _createVNode(_component_el_time_picker, {
                    modelValue: configForm.value.startTime,
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((configForm.value.startTime) = $event)),
                    format: "HH:mm",
                    placeholder: "开始时间",
                    class: "time-picker"
                  }, null, 8, ["modelValue"]),
                  _cache[16] || (_cache[16] = _createElementVNode("span", { class: "time-separator" }, "—", -1)),
                  _createVNode(_component_el_time_picker, {
                    modelValue: configForm.value.endTime,
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((configForm.value.endTime) = $event)),
                    format: "HH:mm",
                    placeholder: "结束时间",
                    class: "time-picker"
                  }, null, 8, ["modelValue"])
                ])
              ])
            ]),
            _: 1
          }),
          _createVNode(_component_el_form_item, { class: "custom-label-form-item" }, {
            label: _withCtx(() => [
              _createElementVNode("div", _hoisted_18, [
                _createVNode(_component_el_icon, { class: "label-icon" }, {
                  default: _withCtx(() => [
                    _createVNode(_unref(Calendar))
                  ]),
                  _: 1
                }),
                _cache[17] || (_cache[17] = _createElementVNode("span", null, "首次执行：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_19, [
                _createVNode(_component_el_checkbox, {
                  modelValue: configForm.value.firstRunNextDay,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((configForm.value.firstRunNextDay) = $event))
                }, {
                  default: _withCtx(() => [...(_cache[18] || (_cache[18] = [
                    _createTextVNode("次日执行", -1)
                  ]))]),
                  _: 1
                }, 8, ["modelValue"]),
                _cache[19] || (_cache[19] = _createElementVNode("p", {
                  class: "desc-text",
                  style: {"margin-top":"6px"}
                }, " 勾选后，今天无论是否在时间段内都不执行，从次日对应时间段开始跟进。 ", -1))
              ])
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["model"])
    ]),
    _: 1
  }, 8, ["modelValue", "width"]))
}
}

})