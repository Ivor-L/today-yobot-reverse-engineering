import { defineComponent as _defineComponent } from 'vue'
import { createTextVNode as _createTextVNode, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, createElementVNode as _createElementVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, unref as _unref, createBlock as _createBlock, toDisplayString as _toDisplayString, renderList as _renderList } from "vue"

const _hoisted_1 = { class: "warning-text" }
const _hoisted_2 = { class: "label-with-icon" }
const _hoisted_3 = { class: "item-content" }
const _hoisted_4 = { class: "label-with-icon" }
const _hoisted_5 = { class: "item-content" }
const _hoisted_6 = { class: "grouping-control" }
const _hoisted_7 = {
  key: 0,
  class: "grouping-input"
}
const _hoisted_8 = {
  key: 0,
  class: "form-tip"
}
const _hoisted_9 = { class: "label-with-icon" }
const _hoisted_10 = { class: "item-content" }
const _hoisted_11 = { class: "label-with-icon" }
const _hoisted_12 = { class: "item-content date-picker-container" }
const _hoisted_13 = { class: "label-with-icon" }
const _hoisted_14 = { class: "item-content" }
const _hoisted_15 = { class: "selected-targets" }
const _hoisted_16 = { class: "label-with-icon" }
const _hoisted_17 = { class: "item-content" }
const _hoisted_18 = { class: "label-with-icon" }
const _hoisted_19 = { class: "item-content" }
const _hoisted_20 = { class: "label-with-icon" }
const _hoisted_21 = { class: "item-content" }
const _hoisted_22 = { class: "dialog-footer" }

import { ref, computed, onMounted, PropType, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getContactTags } from '@/api/contact'
import { getConfig } from '@/api/config'
import { Clock, Calendar, User,Avatar, PriceTag, ChatLineRound, Files } from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 添加标签接口定义
interface UserTag {
  id: string
  name: string
}

interface GreetingGroup {
  id: string  // 改为必需属性
  name: string
  greetings: Array<{
    type: 'text' | 'file'
    content: string
    filePath?: string
  }>
}

interface CozeAgent {
  botId: string
  name: string
}

// 修改 props 定义
interface TaskFormData {
  timeType: 'now' | 'schedule'
  scheduleDate: Date | undefined 
  dayOffset: number
  time: Date
  tagIds: string[]
  contentType: 'greeting' | 'agent'
  greetingGroupId: string
  agentId: string
  sendInterval: string
  autoGrouping: boolean
  batchSize: number
}

interface TaskSubmitData {
  timeType: 'now' | 'schedule'
  scheduleDate?: Date | null
  time: Date | string | null
  tagIds: string[]
  selectedFriends: string[]
  selectedGroups: string[]
  contentType: 'greeting' | 'agent'
  greetingGroupId: string
  agentId: string
  autoGrouping: boolean
  batchSize: number
}

// 创建任务

export default /*@__PURE__*/_defineComponent({
  __name: 'CreateTaskDialog',
  props: {
  visible: {
    type: Boolean,
    default: false
  },
  modelValue: {  // 添加这个以支持 v-model
    type: Boolean,
    default: false
  },
  greetingGroups: {
    type: Array as PropType<GreetingGroup[]>,
    default: () => []
  },
  selectedFriends: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  selectedGroups: {  // 新增群聊列表属性
    type: Array as PropType<string[]>,
    default: () => []
  },
  wechatNickname: {
    type: String,
    default: ''
  },
  isFromSOP: {
    type: Boolean,
    default: false
  }
},
  emits: ['update:visible', 'update:modelValue', 'create'],
  setup(__props, { emit: __emit }) {

const props = __props

const dialogWidth = computed(() => {
  // 获取视窗宽度
  const windowWidth = window.innerWidth
  // 在小屏幕上使用百分比宽度
  if (windowWidth < 768) {
    return '95%'
  }
  // 在中等屏幕上使用较大百分比
  if (windowWidth < 1200) {
    return '80%'
  }
  // 在大屏幕上使用固定最大宽度
  return '500px'
})

const formatSelectedTargets = computed(() => {
  const parts = []
  if (props.selectedFriends.length > 0) {
    const friendText = props.selectedFriends.length <= 3
      ? props.selectedFriends.join('、')
      : `${props.selectedFriends.slice(0, 3).join('、')}等${props.selectedFriends.length}个好友`
    parts.push(friendText)
  }
  if (props.selectedGroups.length > 0) {
    const groupText = props.selectedGroups.length <= 3
      ? props.selectedGroups.join('、')
      : `${props.selectedGroups.slice(0, 3).join('、')}等${props.selectedGroups.length}个群聊`
    parts.push(groupText)
  }
  return parts.join('；')
})

const greetingGroups = ref<GreetingGroup[]>([])
const cozeAgents = ref<CozeAgent[]>([])

// 添加加载话术组方法
const loadGreetingGroups = async () => {
  try {
    const result = await getConfig('greeting_config')
    // console.debug("加载话术组",result)
    // 正确解析多层嵌套的数据
    const config = result?.data?.greeting_config?.greeting_config
    if (Array.isArray(config)) {
      greetingGroups.value = config.map((group) => ({
        id: group.name, // 使用 name 作为唯一标识
        name: group.name,
        greetings: Array.isArray(group.greetings) ? group.greetings : []
      }))
      // console.debug('加载的话术组:', greetingGroups.value)
    } else {
      console.warn('话术组数据格式不正确:', config)
      greetingGroups.value = []
    }
  } catch (error) {
    console.error('加载话术组失败:', error)
    ElMessage.error('加载话术组失败')
  }
}

// 加载智能体列表
const loadCozeAgents = async () => {
  try {
    const result = await getConfig('agents')
    if (result.success && result.data) {
      const agents = Array.isArray(result.data) ? result.data : 
                    Array.isArray(result.data.agents) ? result.data.agents : []
      
      cozeAgents.value = agents.filter((agent: CozeAgent) => agent.name && agent.botId)
    }
  } catch (error) {
    console.error('加载智能体配置失败:', error)
  }
}

// 修改 emit 定义以支持两种方式
const emit = __emit

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible || props.modelValue,
  set: (val) => {
    emit('update:visible', val)
    emit('update:modelValue', val)
  }
})

// 用户标签数据
const userTags = ref<UserTag[]>([])

const handleTimeChange = (time: Date) => {
  if (time) {
    // 保存用户选择的小时和分钟
    const hours = time.getHours()
    const minutes = time.getMinutes()
    
    // 创建一个新的日期对象，使用当前日期
    const now = new Date()
    taskForm.value.time = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0
    )
  }
}

// 添加时区处理函数
const getLocalISOString = (date: Date) => {
  // 创建一个带有本地时区信息的日期
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, '0');
  const hours = pad(tzOffset / 60);
  const minutes = pad(tzOffset % 60);
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    diff + hours + ':' + minutes;
}

// 禁用日期选择器中的日期
const disabledDate = (time: Date) => {
  // 禁用今天之前的日期和60天后的日期
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  
  return time.getTime() < today.getTime() || time.getTime() > maxDate.getTime();
};

// 表单数据
const taskForm = ref<TaskFormData>({
  timeType: 'now',
  scheduleDate: undefined,
  dayOffset: 0,
  time: new Date(),
  tagIds: [],
  contentType: 'greeting',
  greetingGroupId: '',
  agentId: '',
  sendInterval: '3-8',
  autoGrouping: false,
  batchSize: 10
})

// 加载用户标签
const loadUserTags = async () => {
  try {
    // 使用 getContactTags 替换 getConfig
    userTags.value = await getContactTags()
  } catch (error) {
    console.error('加载用户标签失败:', error)
    ElMessage.error('加载用户标签失败')
  }
}

const handleCreate = async () => {
  try {
    if (taskForm.value.timeType === 'schedule') {
      if (!taskForm.value.scheduleDate) {
        ElMessage.warning('请选择发送日期')
        return
      }
      if (!taskForm.value.time) {
        ElMessage.warning('请选择发送时间')
        return
      }
    }

    // 目标校验：必须有标签或好友列表其中之一
    if (!taskForm.value.tagIds.length && 
        !props.selectedFriends.length && 
        !props.selectedGroups.length) {
      ElMessage.warning('请选择本次推送的目标')
      return
    }

    // 内容校验：根据选择的内容类型验证
    if (taskForm.value.contentType === 'greeting' && !taskForm.value.greetingGroupId) {
      ElMessage.warning('请选择话术组')
      return
    }
    
    if (taskForm.value.contentType === 'agent' && !taskForm.value.agentId) {
      ElMessage.warning('请选择智能体')
      return
    }

    // 显式声明 submitData 的类型
    let submitData: TaskSubmitData = {
      ...taskForm.value,
      time: taskForm.value.time,
      selectedFriends: props.selectedFriends,
      selectedGroups: props.selectedGroups
    }
    
    if (taskForm.value.timeType === 'schedule' && taskForm.value.scheduleDate && taskForm.value.time) {
      // 创建包含选择日期和时间的完整日期时间
      const scheduleDate = new Date(taskForm.value.scheduleDate)
      const selectedTime = taskForm.value.time
      
      const scheduleDateTime = new Date(
        scheduleDate.getFullYear(),
        scheduleDate.getMonth(),
        scheduleDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0
      )
      
      // 使用新的格式化函数生成带时区的 ISO 字符串
      submitData.time = getLocalISOString(scheduleDateTime)
    }
    
    emit('create', submitData)
    dialogVisible.value = false
  } catch (error) {
    console.error('创建任务失败:', error)
    ElMessage.error('创建任务失败')
  }
}

const handleResize = () => nextTick()

// 组件挂载时加载数据
onMounted(() => {
  loadUserTags()
  loadGreetingGroups()
  loadCozeAgents()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

return (_ctx: any,_cache: any) => {
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_switch = _resolveComponent("el-switch")!
  const _component_el_input_number = _resolveComponent("el-input-number")!
  const _component_el_radio = _resolveComponent("el-radio")!
  const _component_el_radio_group = _resolveComponent("el-radio-group")!
  const _component_el_date_picker = _resolveComponent("el-date-picker")!
  const _component_el_time_picker = _resolveComponent("el-time-picker")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_checkbox_group = _resolveComponent("el-checkbox-group")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: dialogVisible.value,
    "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event: any) => ((dialogVisible).value = $event)),
    title: "新建推送任务",
    width: dialogWidth.value,
    top: '15vh',
    "close-on-click-modal": false
  }, {
    footer: _withCtx(() => [
      _createElementVNode("span", _hoisted_22, [
        _createVNode(_component_el_button, {
          onClick: _cache[10] || (_cache[10] = ($event: any) => (dialogVisible.value = false))
        }, {
          default: _withCtx(() => [...(_cache[28] || (_cache[28] = [
            _createTextVNode("取消", -1)
          ]))]),
          _: 1
        }),
        _createVNode(_component_el_button, {
          type: "primary",
          onClick: handleCreate
        }, {
          default: _withCtx(() => [...(_cache[29] || (_cache[29] = [
            _createTextVNode("创建任务", -1)
          ]))]),
          _: 1
        })
      ])
    ]),
    default: _withCtx(() => [
      _createVNode(_component_el_alert, {
        type: "warning",
        "show-icon": "",
        closable: false,
        class: "push-warning-banner"
      }, {
        default: _withCtx(() => [
          _createElementVNode("span", _hoisted_1, [
            _cache[12] || (_cache[12] = _createTextVNode("建议单次群发不超过100个目标，支持自动分组推送。", -1)),
            (__props.isFromSOP)
              ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                  _createTextVNode("推荐在【客户管理】中创建任务，支持同时选择好友和群聊进行推送。")
                ], 64))
              : _createCommentVNode("", true)
          ])
        ]),
        _: 1
      }),
      _createVNode(_component_el_form, {
        model: taskForm.value,
        "label-width": "100px"
      }, {
        default: _withCtx(() => [
          (__props.wechatNickname)
            ? (_openBlock(), _createBlock(_component_el_form_item, {
                key: 0,
                class: "custom-label-form-item"
              }, {
                label: _withCtx(() => [
                  _createElementVNode("div", _hoisted_2, [
                    _createVNode(_component_el_icon, { class: "label-icon" }, {
                      default: _withCtx(() => [
                        _createVNode(_unref(Avatar))
                      ]),
                      _: 1
                    }),
                    _cache[13] || (_cache[13] = _createElementVNode("span", null, "微信账号：", -1))
                  ])
                ]),
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_3, [
                    _createVNode(_component_el_input, {
                      "model-value": __props.wechatNickname,
                      readonly: "",
                      placeholder: "未选择微信账号"
                    }, null, 8, ["model-value"])
                  ])
                ]),
                _: 1
              }))
            : _createCommentVNode("", true),
          _createVNode(_component_el_form_item, { class: "custom-label-form-item" }, {
            label: _withCtx(() => [
              _createElementVNode("div", _hoisted_4, [
                _createVNode(_component_el_icon, { class: "label-icon" }, {
                  default: _withCtx(() => [
                    _createVNode(_unref(Files))
                  ]),
                  _: 1
                }),
                _cache[14] || (_cache[14] = _createElementVNode("span", null, "自动分组：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_5, [
                _createElementVNode("div", _hoisted_6, [
                  _createVNode(_component_el_switch, {
                    modelValue: taskForm.value.autoGrouping,
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((taskForm.value.autoGrouping) = $event)),
                    "active-text": "开启",
                    "inactive-text": "关闭"
                  }, null, 8, ["modelValue"]),
                  (taskForm.value.autoGrouping)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_7, [
                        _cache[15] || (_cache[15] = _createElementVNode("span", { class: "grouping-label" }, "每组人数：", -1)),
                        _createVNode(_component_el_input_number, {
                          modelValue: taskForm.value.batchSize,
                          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((taskForm.value.batchSize) = $event)),
                          min: 2,
                          max: 500,
                          step: 1,
                          size: "small",
                          "controls-position": "right"
                        }, null, 8, ["modelValue"])
                      ]))
                    : _createCommentVNode("", true)
                ]),
                (taskForm.value.autoGrouping)
                  ? (_openBlock(), _createElementBlock("div", _hoisted_8, " 将大任务拆分为多个小任务执行，避免长时间占用资源，支持任务插队。 "))
                  : _createCommentVNode("", true)
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
                _cache[16] || (_cache[16] = _createElementVNode("span", null, "发送时间：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_10, [
                _createVNode(_component_el_radio_group, {
                  modelValue: taskForm.value.timeType,
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((taskForm.value.timeType) = $event))
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_radio, { value: "now" }, {
                      default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
                        _createTextVNode("立即发送", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_el_radio, { value: "schedule" }, {
                      default: _withCtx(() => [...(_cache[18] || (_cache[18] = [
                        _createTextVNode("定时发送", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ])
            ]),
            _: 1
          }),
          (taskForm.value.timeType === 'schedule')
            ? (_openBlock(), _createBlock(_component_el_form_item, {
                key: 1,
                class: "custom-label-form-item"
              }, {
                label: _withCtx(() => [
                  _createElementVNode("div", _hoisted_11, [
                    _createVNode(_component_el_icon, { class: "label-icon" }, {
                      default: _withCtx(() => [
                        _createVNode(_unref(Calendar))
                      ]),
                      _: 1
                    }),
                    _cache[19] || (_cache[19] = _createElementVNode("span", null, "选择日期：", -1))
                  ])
                ]),
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_12, [
                    _createVNode(_component_el_date_picker, {
                      modelValue: taskForm.value.scheduleDate,
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((taskForm.value.scheduleDate) = $event)),
                      type: "date",
                      placeholder: "选择日期",
                      format: "YYYY/MM/DD",
                      "disabled-date": disabledDate,
                      class: "date-picker",
                      locale: _unref(zhCn)
                    }, null, 8, ["modelValue", "locale"]),
                    _createVNode(_component_el_time_picker, {
                      modelValue: taskForm.value.time,
                      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((taskForm.value.time) = $event)),
                      format: "HH:mm",
                      placeholder: "选择时间",
                      class: "time-picker",
                      "default-time": new Date(2000, 1, 1, new Date().getHours(), new Date().getMinutes()),
                      onChange: handleTimeChange,
                      locale: _unref(zhCn)
                    }, null, 8, ["modelValue", "default-time", "locale"])
                  ])
                ]),
                _: 1
              }))
            : _createCommentVNode("", true),
          (__props.selectedFriends.length > 0 || __props.selectedGroups.length > 0)
            ? (_openBlock(), _createBlock(_component_el_form_item, {
                key: 2,
                class: "custom-label-form-item"
              }, {
                label: _withCtx(() => [
                  _createElementVNode("div", _hoisted_13, [
                    _createVNode(_component_el_icon, { class: "label-icon" }, {
                      default: _withCtx(() => [
                        _createVNode(_unref(User))
                      ]),
                      _: 1
                    }),
                    _cache[20] || (_cache[20] = _createElementVNode("span", null, "推送对象：", -1))
                  ])
                ]),
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_14, [
                    _createElementVNode("div", _hoisted_15, _toDisplayString(formatSelectedTargets.value), 1)
                  ])
                ]),
                _: 1
              }))
            : (_openBlock(), _createBlock(_component_el_form_item, {
                key: 3,
                class: "custom-label-form-item"
              }, {
                label: _withCtx(() => [
                  _createElementVNode("div", _hoisted_16, [
                    _createVNode(_component_el_icon, { class: "label-icon" }, {
                      default: _withCtx(() => [
                        _createVNode(_unref(PriceTag))
                      ]),
                      _: 1
                    }),
                    _cache[21] || (_cache[21] = _createElementVNode("span", null, "好友标签：", -1))
                  ])
                ]),
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_17, [
                    _createVNode(_component_el_checkbox_group, {
                      modelValue: taskForm.value.tagIds,
                      "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((taskForm.value.tagIds) = $event))
                    }, {
                      default: _withCtx(() => [
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(userTags.value, (tag) => {
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
                  ])
                ]),
                _: 1
              })),
          _createVNode(_component_el_form_item, { class: "custom-label-form-item last-form-item" }, {
            label: _withCtx(() => [
              _createElementVNode("div", _hoisted_18, [
                _createVNode(_component_el_icon, { class: "label-icon" }, {
                  default: _withCtx(() => [
                    _createVNode(_unref(ChatLineRound))
                  ]),
                  _: 1
                }),
                _cache[22] || (_cache[22] = _createElementVNode("span", null, "激活话术：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_19, [
                _createVNode(_component_el_radio_group, {
                  modelValue: taskForm.value.contentType,
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event: any) => ((taskForm.value.contentType) = $event)),
                  class: "content-type-radio"
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_radio, { value: "greeting" }, {
                      default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
                        _createTextVNode("话术组", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"]),
                (taskForm.value.contentType === 'greeting')
                  ? (_openBlock(), _createBlock(_component_el_select, {
                      key: 0,
                      modelValue: taskForm.value.greetingGroupId,
                      "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((taskForm.value.greetingGroupId) = $event)),
                      placeholder: "选择话术组",
                      class: "select-full-width"
                    }, {
                      default: _withCtx(() => [
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(greetingGroups.value, (group) => {
                          return (_openBlock(), _createBlock(_component_el_option, {
                            key: group.id,
                            label: group.name,
                            value: group.id
                          }, null, 8, ["label", "value"]))
                        }), 128))
                      ]),
                      _: 1
                    }, 8, ["modelValue"]))
                  : (_openBlock(), _createBlock(_component_el_select, {
                      key: 1,
                      modelValue: taskForm.value.agentId,
                      "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event: any) => ((taskForm.value.agentId) = $event)),
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
                    }, 8, ["modelValue"]))
              ])
            ]),
            _: 1
          }),
          _createVNode(_component_el_form_item, { class: "custom-label-form-item" }, {
            label: _withCtx(() => [
              _createElementVNode("div", _hoisted_20, [
                _createVNode(_component_el_icon, { class: "label-icon" }, {
                  default: _withCtx(() => [
                    _createVNode(_unref(Clock))
                  ]),
                  _: 1
                }),
                _cache[24] || (_cache[24] = _createElementVNode("span", null, "发送间隔：", -1))
              ])
            ]),
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_21, [
                _createVNode(_component_el_radio_group, {
                  modelValue: taskForm.value.sendInterval,
                  "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event: any) => ((taskForm.value.sendInterval) = $event))
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_radio, { value: "3-8" }, {
                      default: _withCtx(() => [...(_cache[25] || (_cache[25] = [
                        _createTextVNode("3-8秒", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_el_radio, { value: "10-30" }, {
                      default: _withCtx(() => [...(_cache[26] || (_cache[26] = [
                        _createTextVNode("10-30秒", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_el_radio, { value: "30-60" }, {
                      default: _withCtx(() => [...(_cache[27] || (_cache[27] = [
                        _createTextVNode("30-60秒", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"])
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