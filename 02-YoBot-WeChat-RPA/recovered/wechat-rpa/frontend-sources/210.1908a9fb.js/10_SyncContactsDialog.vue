import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, createBlock as _createBlock, createTextVNode as _createTextVNode, toDisplayString as _toDisplayString, createCommentVNode as _createCommentVNode } from "vue"

const _hoisted_1 = { class: "warning-section" }
const _hoisted_2 = { class: "sync-section" }
const _hoisted_3 = { class: "section-content" }
const _hoisted_4 = { class: "account-selector" }
const _hoisted_5 = { class: "sync-buttons" }
const _hoisted_6 = {
  key: 0,
  class: "auto-sync-section"
}
const _hoisted_7 = { class: "section-content" }
const _hoisted_8 = { class: "sync-items-config" }
const _hoisted_9 = { class: "sync-frequency-config" }
const _hoisted_10 = { class: "time-range-config" }
const _hoisted_11 = {
  key: 0,
  class: "next-execution-time"
}
const _hoisted_12 = { class: "execution-time" }
const _hoisted_13 = { class: "auto-sync-toggle" }
const _hoisted_14 = { class: "dialog-footer" }

import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import CountdownDialog from './CountdownDialog.vue'
import { 
  createSyncContactsTask, 
  getSyncContactsTaskStatus,
  cancelSyncContactsTask,
  SyncContactsRequest,
} from '@/api/syncContacts'

interface Account {
  account_id: string
  nickname: string
}

interface Props {
  modelValue: boolean
  accounts: Account[]
  defaultAccountId?: string
  friendSyncEnabled?: boolean
  groupSyncEnabled?: boolean
  friendSyncDisabledReason?: string
  groupSyncDisabledReason?: string
  scheduledSyncEnabled?: boolean
  scheduledSyncDisabledReason?: string
}


export default /*@__PURE__*/_defineComponent({
  __name: 'SyncContactsDialog',
  props: {
    modelValue: { type: Boolean },
    accounts: {},
    defaultAccountId: {},
    friendSyncEnabled: { type: Boolean, default: true },
    groupSyncEnabled: { type: Boolean, default: true },
    friendSyncDisabledReason: { default: '' },
    groupSyncDisabledReason: { default: '' },
    scheduledSyncEnabled: { type: Boolean, default: true },
    scheduledSyncDisabledReason: { default: '' }
  },
  emits: ['update:modelValue', 'sync'],
  setup(__props: any, { emit: __emit }) {

const props = __props
const emit = __emit

const visible = ref(false)
const selectedAccountId = ref('')
const showCountdown = ref(false)
const countdownMessage = ref('')
const syncType = ref<'friend' | 'group'>('friend')

// 自动同步相关
const autoSyncEnabled = ref(false)
const autoSyncStartTime = ref(new Date(2024, 0, 1, 2, 0)) // 默认凌晨2点
const autoSyncEndTime = ref(new Date(2024, 0, 1, 4, 0))   // 默认凌晨4点
const syncItems = ref(['group']) // 默认勾选群聊
const syncFrequency = ref(7) // 默认7天
const nextExecutionTime = ref('')
const runtimeSyncEnabled = computed(() => props.friendSyncEnabled || props.groupSyncEnabled)
const runtimeSyncDisabledReason = computed(() => (
  runtimeSyncEnabled.value
    ? ''
    : props.friendSyncDisabledReason || props.groupSyncDisabledReason
))

// 开始时间变化后自动联动设置结束时间为开始时间+2小时（处理跨天）
const updateAutoEndTime = () => {
  if (autoSyncEnabled.value) return
  const start = autoSyncStartTime.value
  if (!start) return
  const end = new Date(start)
  end.setHours(end.getHours() + 2)
  autoSyncEndTime.value = end
}

watch(autoSyncStartTime, () => {
  updateAutoEndTime()
})

watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal && props.accounts.length > 0) {
    // 默认选择传入的账号ID；若未传入则选择第一个账号
    const passedId = props.defaultAccountId
    const exists = passedId && props.accounts.some(acc => acc.account_id === passedId)
    selectedAccountId.value = exists ? (passedId as string) : props.accounts[0].account_id
    syncItems.value = syncItems.value.filter(item => (
      item === 'friend' ? props.friendSyncEnabled : props.groupSyncEnabled
    ))
    if (syncItems.value.length === 0) {
      if (props.groupSyncEnabled) syncItems.value = ['group']
      else if (props.friendSyncEnabled) syncItems.value = ['friend']
    }
    // Strict Runtime 不允许为未声明能力探测旧同步接口。
    if (runtimeSyncEnabled.value && props.scheduledSyncEnabled) checkAutoSyncStatus()
  }
})

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 查询自动同步状态
const checkAutoSyncStatus = async () => {
  if (!runtimeSyncEnabled.value) {
    autoSyncEnabled.value = false
    nextExecutionTime.value = ''
    return
  }
  try {
    const activeTask = await getSyncContactsTaskStatus()
    console.log('获取到的任务状态:', activeTask)
    
    if (activeTask) {
      autoSyncEnabled.value = true
      
      // 从 params.sync_config 中获取配置信息
      const syncConfig = activeTask.params?.sync_config || {} as {
        sync_items?: string[]
        sync_frequency?: number
        time_range_start?: string
        time_range_end?: string
        start_date?: string
      }
      syncItems.value = syncConfig.sync_items || ['group']
      syncFrequency.value = syncConfig.sync_frequency || 7
      
      // 设置时间段
      if (syncConfig.time_range_start && syncConfig.time_range_end) {
        const [startHour, startMinute] = syncConfig.time_range_start.split(':')
        const [endHour, endMinute] = syncConfig.time_range_end.split(':')
        autoSyncStartTime.value = new Date(2024, 0, 1, parseInt(startHour), parseInt(startMinute))
        autoSyncEndTime.value = new Date(2024, 0, 1, parseInt(endHour), parseInt(endMinute))
      }
      
      // 设置下次执行时间
      if (activeTask.next_run_time) {
        // 格式化显示时间
        const nextTime = new Date(activeTask.next_run_time)
        nextExecutionTime.value = nextTime.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      } else {
        nextExecutionTime.value = ''
      }
    } else {
      autoSyncEnabled.value = false
      nextExecutionTime.value = ''
    }
  } catch (error) {
    console.error('查询自动同步状态失败:', error)
    autoSyncEnabled.value = false
    nextExecutionTime.value = ''
  }
}

// 处理自动同步开关
const handleAutoSyncToggle = async (val: string | number | boolean) => {
  const enabled = Boolean(val)
  if (!props.scheduledSyncEnabled) {
    ElMessage.warning(props.scheduledSyncDisabledReason || '当前平台暂不支持定时自动同步')
    autoSyncEnabled.value = false
    return
  }
  if (enabled) {
    const unsupportedItem = syncItems.value.find(item => (
      item === 'friend' ? !props.friendSyncEnabled : !props.groupSyncEnabled
    ))
    if (!runtimeSyncEnabled.value || unsupportedItem) {
      ElMessage.warning(runtimeSyncDisabledReason.value || '当前版本暂不支持所选同步项')
      autoSyncEnabled.value = false
      return
    }
    // 开启自动同步
    if (syncItems.value.length === 0) {
      ElMessage.warning('请至少选择一个同步项')
      autoSyncEnabled.value = false
      return
    }
    
    try {
      const request: SyncContactsRequest = {
        sync_items: syncItems.value,
        sync_frequency: syncFrequency.value,
        time_range_start: `${autoSyncStartTime.value.getHours().toString().padStart(2, '0')}:${autoSyncStartTime.value.getMinutes().toString().padStart(2, '0')}`,
        time_range_end: `${autoSyncEndTime.value.getHours().toString().padStart(2, '0')}:${autoSyncEndTime.value.getMinutes().toString().padStart(2, '0')}`,
        enabled: true
      }
      
      const result = await createSyncContactsTask(request)
      
      if (result.success) {
        ElMessage.success('自动同步已开启')
        nextExecutionTime.value = result.next_execution_time || ''
        // 重新查询状态
        await checkAutoSyncStatus()
      } else {
        ElMessage.error(result.error || '开启自动同步失败')
        autoSyncEnabled.value = false
      }
    } catch (error: any) {
      console.error('开启自动同步失败:', error)
      ElMessage.error(`开启自动同步失败: ${error.message || '未知错误'}`)
      autoSyncEnabled.value = false
    }
  } else {
    // 关闭自动同步 - 取消当前活跃的任务
    try {
      const activeTask = await getSyncContactsTaskStatus()
      
      if (activeTask) {
        await cancelSyncContactsTask(activeTask.id)
        ElMessage.success('自动同步已关闭')
      } else {
        ElMessage.info('没有找到活跃的自动同步任务')
      }
      
      nextExecutionTime.value = ''
      // 重新查询状态
      await checkAutoSyncStatus()
    } catch (error: any) {
      console.error('关闭自动同步失败:', error)
      ElMessage.error(`关闭自动同步失败: ${error.message || '未知错误'}`)
      autoSyncEnabled.value = true
    }
  }
}

const handleSync = (type: 'friend' | 'group') => {
  const enabled = type === 'friend' ? props.friendSyncEnabled : props.groupSyncEnabled
  if (!enabled) {
    ElMessage.warning(
      type === 'friend'
        ? props.friendSyncDisabledReason
        : props.groupSyncDisabledReason
    )
    return
  }
  if (!selectedAccountId.value) {
    return
  }
  
  syncType.value = type
  countdownMessage.value = type === 'friend' ? '准备同步好友数据' : '准备同步群聊数据'
  
  // 关闭设置弹窗
  visible.value = false
  
  // 显示倒计时弹窗
  showCountdown.value = true
}

const executeSync = () => {
  emit('sync', {
    accountId: selectedAccountId.value,
    type: syncType.value
  })
}

const handleClose = () => {
  visible.value = false
}

return (_ctx: any,_cache: any) => {
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_checkbox_group = _resolveComponent("el-checkbox-group")!
  const _component_el_input_number = _resolveComponent("el-input-number")!
  const _component_el_time_picker = _resolveComponent("el-time-picker")!
  const _component_el_switch = _resolveComponent("el-switch")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createVNode(_component_el_dialog, {
      modelValue: visible.value,
      "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event: any) => ((visible).value = $event)),
      title: "同步通讯录",
      width: "500px",
      "close-on-click-modal": false,
      class: "sync-contacts-dialog"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("div", _hoisted_14, [
          _createVNode(_component_el_button, { onClick: handleClose }, {
            default: _withCtx(() => [...(_cache[26] || (_cache[26] = [
              _createTextVNode("关闭", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_1, [
          _createVNode(_component_el_alert, {
            type: "info",
            "show-icon": "",
            closable: false,
            class: "warning-banner"
          }, {
            default: _withCtx(() => [...(_cache[10] || (_cache[10] = [
              _createElementVNode("span", { class: "warning-text" }, "所有微信通讯录数据均保存本地，绝不会上传服务器", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_alert, {
            type: "warning",
            "show-icon": "",
            closable: false,
            class: "warning-banner"
          }, {
            default: _withCtx(() => [...(_cache[11] || (_cache[11] = [
              _createElementVNode("span", { class: "warning-text" }, "建议7天同步一次好友(注意：好友标签中不要有空格)", -1)
            ]))]),
            _: 1
          })
        ]),
        _createElementVNode("div", _hoisted_2, [
          _cache[15] || (_cache[15] = _createElementVNode("div", { class: "section-header" }, [
            _createElementVNode("h4", null, "手动同步")
          ], -1)),
          _createElementVNode("div", _hoisted_3, [
            _createElementVNode("div", _hoisted_4, [
              _cache[12] || (_cache[12] = _createElementVNode("label", { class: "selector-label" }, "账号：", -1)),
              _createVNode(_component_el_select, {
                modelValue: selectedAccountId.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((selectedAccountId).value = $event)),
                placeholder: "请选择账号",
                style: {"width":"200px"}
              }, {
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(__props.accounts, (account) => {
                    return (_openBlock(), _createBlock(_component_el_option, {
                      key: account.account_id,
                      label: account.nickname,
                      value: account.account_id
                    }, null, 8, ["label", "value"]))
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"])
            ]),
            _createElementVNode("div", _hoisted_5, [
              _createVNode(_component_el_button, {
                type: "primary",
                onClick: _cache[1] || (_cache[1] = ($event: any) => (handleSync('friend'))),
                disabled: !selectedAccountId.value || !__props.friendSyncEnabled,
                title: __props.friendSyncEnabled ? '' : __props.friendSyncDisabledReason
              }, {
                default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
                  _createTextVNode(" 同步好友 ", -1)
                ]))]),
                _: 1
              }, 8, ["disabled", "title"]),
              _createVNode(_component_el_button, {
                type: "primary",
                onClick: _cache[2] || (_cache[2] = ($event: any) => (handleSync('group'))),
                disabled: !selectedAccountId.value || !__props.groupSyncEnabled,
                title: __props.groupSyncEnabled ? '' : __props.groupSyncDisabledReason
              }, {
                default: _withCtx(() => [...(_cache[14] || (_cache[14] = [
                  _createTextVNode(" 同步群聊 ", -1)
                ]))]),
                _: 1
              }, 8, ["disabled", "title"])
            ])
          ])
        ]),
        (__props.scheduledSyncEnabled)
          ? (_openBlock(), _createElementBlock("div", _hoisted_6, [
              _cache[25] || (_cache[25] = _createElementVNode("div", { class: "section-header" }, [
                _createElementVNode("h4", null, "自动同步")
              ], -1)),
              _createElementVNode("div", _hoisted_7, [
                _createElementVNode("div", _hoisted_8, [
                  _cache[18] || (_cache[18] = _createElementVNode("label", null, "同 步 项：", -1)),
                  _createVNode(_component_el_checkbox_group, {
                    modelValue: syncItems.value,
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((syncItems).value = $event)),
                    disabled: autoSyncEnabled.value
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_checkbox, {
                        label: "friend",
                        disabled: autoSyncEnabled.value || !__props.friendSyncEnabled
                      }, {
                        default: _withCtx(() => [...(_cache[16] || (_cache[16] = [
                          _createTextVNode("好友", -1)
                        ]))]),
                        _: 1
                      }, 8, ["disabled"]),
                      _createVNode(_component_el_checkbox, {
                        label: "group",
                        disabled: autoSyncEnabled.value || !__props.groupSyncEnabled
                      }, {
                        default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
                          _createTextVNode("群聊", -1)
                        ]))]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    _: 1
                  }, 8, ["modelValue", "disabled"])
                ]),
                _createElementVNode("div", _hoisted_9, [
                  _cache[19] || (_cache[19] = _createElementVNode("label", null, "同步频率：", -1)),
                  _cache[20] || (_cache[20] = _createElementVNode("span", null, "每隔", -1)),
                  _createVNode(_component_el_input_number, {
                    modelValue: syncFrequency.value,
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((syncFrequency).value = $event)),
                    min: 2,
                    max: 30,
                    step: 1,
                    disabled: autoSyncEnabled.value,
                    "controls-position": "right"
                  }, null, 8, ["modelValue", "disabled"]),
                  _cache[21] || (_cache[21] = _createElementVNode("span", null, "天", -1))
                ]),
                _createElementVNode("div", _hoisted_10, [
                  _cache[22] || (_cache[22] = _createElementVNode("label", null, "时 间 段：", -1)),
                  _createVNode(_component_el_time_picker, {
                    modelValue: autoSyncStartTime.value,
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((autoSyncStartTime).value = $event)),
                    format: "HH:mm",
                    placeholder: "开始时间",
                    disabled: autoSyncEnabled.value,
                    style: {"width":"100px"}
                  }, null, 8, ["modelValue", "disabled"]),
                  _cache[23] || (_cache[23] = _createElementVNode("span", { style: {"margin":"0 8px"} }, "至", -1)),
                  _createVNode(_component_el_time_picker, {
                    modelValue: autoSyncEndTime.value,
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event: any) => ((autoSyncEndTime).value = $event)),
                    format: "HH:mm",
                    placeholder: "结束时间",
                    disabled: autoSyncEnabled.value,
                    style: {"width":"100px"}
                  }, null, 8, ["modelValue", "disabled"])
                ]),
                (autoSyncEnabled.value && nextExecutionTime.value)
                  ? (_openBlock(), _createElementBlock("div", _hoisted_11, [
                      _cache[24] || (_cache[24] = _createElementVNode("label", null, "下次执行时间：", -1)),
                      _createElementVNode("span", _hoisted_12, _toDisplayString(nextExecutionTime.value), 1)
                    ]))
                  : _createCommentVNode("", true),
                _createElementVNode("div", _hoisted_13, [
                  _createVNode(_component_el_switch, {
                    modelValue: autoSyncEnabled.value,
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((autoSyncEnabled).value = $event)),
                    "active-text": "已启用",
                    "inactive-text": "已关闭",
                    disabled: !runtimeSyncEnabled.value && !autoSyncEnabled.value,
                    title: runtimeSyncDisabledReason.value,
                    onChange: handleAutoSyncToggle
                  }, null, 8, ["modelValue", "disabled", "title"])
                ])
              ])
            ]))
          : (_openBlock(), _createBlock(_component_el_alert, {
              key: 1,
              type: "info",
              closable: false,
              "show-icon": "",
              title: "当前平台支持手动同步，暂不支持定时自动同步"
            }))
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(CountdownDialog, {
      modelValue: showCountdown.value,
      "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event: any) => ((showCountdown).value = $event)),
      countdown: 3,
      message: countdownMessage.value,
      onFinish: executeSync
    }, null, 8, ["modelValue", "message"])
  ], 64))
}
}

})