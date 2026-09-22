import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, createBlock as _createBlock, vShow as _vShow, withDirectives as _withDirectives, Transition as _Transition, createCommentVNode as _createCommentVNode } from "vue"

const _hoisted_1 = { class: "auto-follow-task-list" }
const _hoisted_2 = { class: "section-title" }
const _hoisted_3 = { class: "task-count" }
const _hoisted_4 = { class: "title-buttons sop-header-actions" }
const _hoisted_5 = { class: "filter-item" }
const _hoisted_6 = { class: "filter-item" }
const _hoisted_7 = { class: "task-list" }
const _hoisted_8 = {
  key: 0,
  class: "task-checkbox"
}
const _hoisted_9 = { class: "task-info" }
const _hoisted_10 = { class: "task-row task-header" }
const _hoisted_11 = { class: "friend-info" }
const _hoisted_12 = { class: "friend-name" }
const _hoisted_13 = { class: "task-row task-time" }
const _hoisted_14 = { class: "time" }
const _hoisted_15 = { class: "task-row task-next" }
const _hoisted_16 = { class: "time" }
const _hoisted_17 = { class: "task-row task-agent" }
const _hoisted_18 = { class: "agent-name" }
const _hoisted_19 = { class: "task-row task-stats" }
const _hoisted_20 = { class: "stats-text" }
const _hoisted_21 = { class: "stats-detail" }
const _hoisted_22 = { class: "batch-operations fixed" }
const _hoisted_23 = { class: "batch-left" }
const _hoisted_24 = { class: "select-all" }
const _hoisted_25 = { class: "selected-count" }
const _hoisted_26 = { class: "batch-right" }
const _hoisted_27 = { class: "dialog-item" }
const _hoisted_28 = { class: "dialog-footer" }

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAutoFollowTasks, cancelAutoFollowTask } from '../api/autosop'
import { getConfig } from '@/api/config'
import { getAutoFollowTasksByStartDate, batchCancelAutoFollowTasks, batchUpdateAutoFollowAgent } from '@/api/contact'

interface AutoFollowTask {
  task_info: {
    task_id: string
    task_type: string
    created_at: string
    updated_at: string
  }
  friend_info: {
    wxid: string
    name: string
    account_id: string
  }
  execution_strategy: {
    follow_scenario: string
    follow_days: number
    follow_frequency: string
    time_range_start: string
    time_range_end: string
    start_date: string
    end_date: string
    max_executions: number
  }
  execution_stats: {
    execution_count: number
    last_execution_time: string
    next_execution_day: number
    total_success: number
    total_failed: number
  }
  task_config: {
    agent_id: string
    ai_service_type: string
  }
  task_status: string
  execution_history: any[]
  schedule_info?: {
    schedule_id: string
    next_fire_time: string | null
    is_paused: boolean
  }
  selected?: boolean // 新增选中状态
}

interface CozeAgent { name: string; botId: string }

export default /*@__PURE__*/_defineComponent({
  __name: 'AutoFollowTaskList',
  props: {
    runtimeEnabled: { type: Boolean, default: true },
    disabledReason: { default: '' }
  },
  setup(__props: any, { expose: __expose }) {

const props = __props

const requireRuntime = () => {
  if (props.runtimeEnabled) return true
  ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
  return false
}

const tasks = ref<AutoFollowTask[]>([])
const cancelingTasks = ref(new Set<string>())
const loading = ref(false)
// 智能体列表
const cozeAgents = ref<CozeAgent[]>([])

// 新增状态变量
const isEditMode = ref(false)
const filterAgentId = ref<string>('')
const filterDate = ref('')
const filterPanel = ref<HTMLElement | null>(null)
const selectedCount = ref(0)
const isBatchCanceling = ref(false)
const isBatchModifyDialogVisible = ref(false)
const selectedAgentIdForModify = ref<string>('')

// 计算属性：是否全选
const isAllSelected = computed({
  get: () => {
    return tasks.value.length > 0 && tasks.value.every(task => task.selected)
  },
  set: (value) => {
    tasks.value.forEach(task => task.selected = value)
    updateSelectedCount()
  }
})

// 切换编辑模式
const toggleEditMode = () => {
  if (!requireRuntime()) return
  isEditMode.value = !isEditMode.value
  
  // 退出编辑模式时重置状态
  if (!isEditMode.value) {
    resetFilters()
    resetSelection()
  }
}

// 重置筛选条件
const resetFilters = () => {
  filterAgentId.value = ''
  filterDate.value = ''
  loadTasks() // 重新加载所有任务
}

// 重置选择状态
const resetSelection = () => {
  tasks.value.forEach(task => task.selected = false)
  updateSelectedCount()
}

// 更新选中数量
const updateSelectedCount = () => {
  selectedCount.value = tasks.value.filter(task => task.selected).length
}

// 应用筛选
const applyFilter = async () => {
  try {
    loading.value = true
    // 若任一筛选条件存在，则调用组合筛选接口
    if (filterDate.value || filterAgentId.value) {
      const result = await getAutoFollowTasksByStartDate(
        filterDate.value || undefined,
        filterAgentId.value || undefined
      )
      if (result && Array.isArray(result)) {
        tasks.value = result.map((task: AutoFollowTask) => ({ ...task, selected: false }))
      } else {
        tasks.value = []
      }
    } else {
      await loadTasks()
    }
  } catch (error) {
    console.error('筛选任务失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '筛选任务失败')
  } finally {
    loading.value = false
  }
}

// 处理筛选条件变化 -> 直接调用接口筛选
const handleFilterChange = async () => {
  await applyFilter()
}

// 批量取消任务
const batchCancelTasks = async () => {
  if (!requireRuntime()) return
  const selectedTasks = tasks.value.filter(task => task.selected)
  if (selectedTasks.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要批量取消选中的 ${selectedTasks.length} 个自动跟单任务吗？`,
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    isBatchCanceling.value = true
    const taskIds = selectedTasks.map(task => task.task_info.task_id)
    await batchCancelAutoFollowTasks(taskIds)
    ElMessage.success('批量取消成功')
    
    // 重新加载任务列表
    await applyFilter()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量取消任务失败:', error)
      ElMessage.error(error instanceof Error ? error.message : '批量取消任务失败')
    }
  } finally {
    isBatchCanceling.value = false
  }
}

// 批量修改任务
const batchModifyTasks = () => {
  if (!requireRuntime()) return
  const selectedTasks = tasks.value.filter(task => task.selected)
  if (selectedTasks.length === 0) {
    ElMessage.warning('请先选择需要修改的任务')
    return
  }
  selectedAgentIdForModify.value = ''
  isBatchModifyDialogVisible.value = true
}

// 加载智能体列表
const loadAgents = async () => {
  try {
    const result = await getConfig('agents')
    if ((result as any).success && (result as any).data) {
      const agents = Array.isArray((result as any).data) ? (result as any).data :
                    Array.isArray((result as any).data.agents) ? (result as any).data.agents : []
      cozeAgents.value = agents.filter((agent: CozeAgent) => agent.name && agent.botId)
    }
  } catch (error) {
    console.error('获取智能体配置失败:', error)
  }
}

// 根据 agent_id 获取智能体名称
const getAgentName = (agentId?: string) => {
  if (!agentId) return '—'
  const agent = cozeAgents.value.find(a => a.botId === agentId)
  return agent?.name || '未知智能体'
}

// 加载任务列表
const loadTasks = async () => {
  try {
    loading.value = true
    const result = await getAutoFollowTasks()
    tasks.value = (result || []).map((task: AutoFollowTask) => ({ ...task, selected: false }))
  } catch (error) {
    console.error('获取自动跟单任务列表失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '获取任务列表失败')
  } finally {
    loading.value = false
  }
}

// 取消任务
const handleCancelTask = async (task: AutoFollowTask) => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(
      `确定要取消对 ${task.friend_info.name} 的自动跟单吗？`,
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    cancelingTasks.value.add(task.friend_info.wxid)
    await cancelAutoFollowTask(task.task_info.task_id)
    ElMessage.success('取消成功')
    
    // 重新加载任务列表
    await loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消任务失败:', error)
      ElMessage.error(error instanceof Error ? error.message : '取消任务失败')
    }
  } finally {
    cancelingTasks.value.delete(task.friend_info.wxid)
  }
}

// 跟单设置
const handleSettings = () => {
  ElMessage.info('开发中，下个版本支持...如需创建任务，请前往客户管理创建')
}

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return '--'
  try {
    const date = new Date(timeStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}月${day}日 ${hours}:${minutes}`
  } catch {
    return '--'
  }
}

// 格式化下次执行时间
const formatNextTime = (timeStr?: string | null) => {
  if (!timeStr) return '计算中...'
  return formatTime(timeStr)
}

onMounted(() => {
  if (!props.runtimeEnabled) return
  loadAgents()
  loadTasks()
})

// 暴露刷新方法给父组件
__expose({
  refresh: loadTasks
})

const confirmBatchModify = async () => {
  if (!requireRuntime()) return
  if (!selectedAgentIdForModify.value) {
    ElMessage.warning('请选择智能体')
    return
  }
  const selectedTasks = tasks.value.filter(task => task.selected)
  if (selectedTasks.length === 0) {
    ElMessage.warning('请先选择需要修改的任务')
    return
  }
  try {
    loading.value = true
    const taskIds = selectedTasks.map(task => task.task_info.task_id)
    const result = await batchUpdateAutoFollowAgent(taskIds, selectedAgentIdForModify.value)
    if (result && result.success) {
      ElMessage.success('批量修改成功')
    } else {
      ElMessage.error(result?.error || '批量修改失败')
    }
    isBatchModifyDialogVisible.value = false
    await applyFilter()
  } catch (error) {
    console.error('批量修改任务失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '批量修改任务失败')
  } finally {
    loading.value = false
  }
}

const closeBatchModifyDialog = () => {
  isBatchModifyDialogVisible.value = false
}

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_date_picker = _resolveComponent("el-date-picker")!
  const _component_el_empty = _resolveComponent("el-empty")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_scrollbar = _resolveComponent("el-scrollbar")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _cache[5] || (_cache[5] = _createElementVNode("span", null, "自动跟进", -1)),
      _createElementVNode("span", _hoisted_3, _toDisplayString(tasks.value.length) + "个", 1),
      _createElementVNode("div", _hoisted_4, [
        _createVNode(_component_el_button, {
          type: isEditMode.value ? 'primary' : 'primary',
          plain: !isEditMode.value,
          size: "small",
          class: "sop-header-btn",
          disabled: !__props.runtimeEnabled,
          title: __props.disabledReason,
          onClick: toggleEditMode
        }, {
          default: _withCtx(() => [
            _createTextVNode(_toDisplayString(isEditMode.value ? '完成' : '编辑'), 1)
          ]),
          _: 1
        }, 8, ["type", "plain", "disabled", "title"])
      ])
    ]),
    _createVNode(_Transition, { name: "slide-fade" }, {
      default: _withCtx(() => [
        _withDirectives(_createElementVNode("div", {
          class: "filter-panel",
          ref_key: "filterPanel",
          ref: filterPanel
        }, [
          _createElementVNode("div", _hoisted_5, [
            _cache[6] || (_cache[6] = _createElementVNode("span", { class: "filter-label" }, "智能体：", -1)),
            _createVNode(_component_el_select, {
              modelValue: filterAgentId.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((filterAgentId).value = $event)),
              placeholder: "选择智能体",
              onChange: handleFilterChange,
              clearable: "",
              style: {"width":"160px"}
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
          ]),
          _createElementVNode("div", _hoisted_6, [
            _cache[7] || (_cache[7] = _createElementVNode("span", { class: "filter-label" }, "创建日期：", -1)),
            _createVNode(_component_el_date_picker, {
              modelValue: filterDate.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((filterDate).value = $event)),
              type: "date",
              placeholder: "选择日期",
              format: "YYYY-MM-DD",
              "value-format": "YYYY-MM-DD",
              onChange: handleFilterChange,
              clearable: "",
              style: {"width":"160px"}
            }, null, 8, ["modelValue"])
          ])
        ], 512), [
          [_vShow, isEditMode.value]
        ])
      ]),
      _: 1
    }),
    _createVNode(_component_el_scrollbar, { height: "calc(100vh - 100px)" }, {
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_7, [
          (tasks.value.length === 0)
            ? (_openBlock(), _createBlock(_component_el_empty, {
                key: 0,
                description: "暂无跟进任务",
                "image-size": 80
              }))
            : (_openBlock(true), _createElementBlock(_Fragment, { key: 1 }, _renderList(tasks.value, (task) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: task.task_info.task_id,
                  class: "task-item"
                }, [
                  (isEditMode.value)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_8, [
                        _createVNode(_component_el_checkbox, {
                          modelValue: task.selected,
                          "onUpdate:modelValue": ($event: any) => ((task.selected) = $event),
                          onChange: updateSelectedCount
                        }, null, 8, ["modelValue", "onUpdate:modelValue"])
                      ]))
                    : _createCommentVNode("", true),
                  _createElementVNode("div", _hoisted_9, [
                    _createElementVNode("div", _hoisted_10, [
                      _createElementVNode("div", _hoisted_11, [
                        _createElementVNode("span", _hoisted_12, _toDisplayString(task.friend_info.name), 1)
                      ]),
                      (!isEditMode.value)
                        ? (_openBlock(), _createBlock(_component_el_button, {
                            key: 0,
                            type: "danger",
                            size: "small",
                            text: "",
                            disabled: !__props.runtimeEnabled,
                            title: __props.disabledReason,
                            onClick: ($event: any) => (handleCancelTask(task)),
                            loading: cancelingTasks.value.has(task.friend_info.wxid)
                          }, {
                            default: _withCtx(() => [...(_cache[8] || (_cache[8] = [
                              _createTextVNode(" 取消 ", -1)
                            ]))]),
                            _: 1
                          }, 8, ["disabled", "title", "onClick", "loading"]))
                        : _createCommentVNode("", true)
                    ]),
                    _createElementVNode("div", _hoisted_13, [
                      _cache[9] || (_cache[9] = _createElementVNode("span", { class: "label" }, "创建时间：", -1)),
                      _createElementVNode("span", _hoisted_14, _toDisplayString(formatTime(task.task_info.created_at)), 1)
                    ]),
                    _createElementVNode("div", _hoisted_15, [
                      _cache[10] || (_cache[10] = _createElementVNode("span", { class: "label" }, "下次跟进：", -1)),
                      _createElementVNode("span", _hoisted_16, _toDisplayString(formatNextTime(task.schedule_info?.next_fire_time)), 1)
                    ]),
                    _createElementVNode("div", _hoisted_17, [
                      _cache[11] || (_cache[11] = _createElementVNode("span", { class: "label" }, "智能体：", -1)),
                      _createElementVNode("span", _hoisted_18, _toDisplayString(getAgentName(task.task_config?.agent_id)), 1)
                    ]),
                    _createElementVNode("div", _hoisted_19, [
                      _cache[12] || (_cache[12] = _createElementVNode("span", { class: "label stats-label" }, "跟进统计：", -1)),
                      _createElementVNode("span", _hoisted_20, [
                        _createTextVNode(" 共" + _toDisplayString(task.execution_stats?.execution_count || 0) + "次 ", 1),
                        _createElementVNode("span", _hoisted_21, " （成功" + _toDisplayString(task.execution_stats?.total_success || 0) + "次） ", 1)
                      ])
                    ])
                  ])
                ]))
              }), 128))
        ]),
        _createVNode(_Transition, { name: "slide-fade" }, {
          default: _withCtx(() => [
            _withDirectives(_createElementVNode("div", _hoisted_22, [
              _createElementVNode("div", _hoisted_23, [
                _createElementVNode("div", _hoisted_24, [
                  _createVNode(_component_el_checkbox, {
                    modelValue: isAllSelected.value,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((isAllSelected).value = $event))
                  }, {
                    default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
                      _createTextVNode(" 全选 ", -1)
                    ]))]),
                    _: 1
                  }, 8, ["modelValue"])
                ]),
                _createElementVNode("div", _hoisted_25, "已选：" + _toDisplayString(selectedCount.value) + "个", 1)
              ]),
              _createElementVNode("div", _hoisted_26, [
                _createVNode(_component_el_button, {
                  type: "danger",
                  size: "small",
                  onClick: batchCancelTasks,
                  disabled: selectedCount.value === 0 || !__props.runtimeEnabled,
                  loading: isBatchCanceling.value,
                  title: __props.runtimeEnabled ? '' : __props.disabledReason
                }, {
                  default: _withCtx(() => [...(_cache[14] || (_cache[14] = [
                    _createTextVNode(" 批量取消 ", -1)
                  ]))]),
                  _: 1
                }, 8, ["disabled", "loading", "title"]),
                _createVNode(_component_el_button, {
                  type: "primary",
                  size: "small",
                  onClick: batchModifyTasks,
                  disabled: selectedCount.value === 0 || !__props.runtimeEnabled,
                  title: __props.runtimeEnabled ? '' : __props.disabledReason
                }, {
                  default: _withCtx(() => [...(_cache[15] || (_cache[15] = [
                    _createTextVNode(" 批量修改 ", -1)
                  ]))]),
                  _: 1
                }, 8, ["disabled", "title"])
              ])
            ], 512), [
              [_vShow, isEditMode.value]
            ])
          ]),
          _: 1
        })
      ]),
      _: 1
    }),
    _createVNode(_component_el_dialog, {
      modelValue: isBatchModifyDialogVisible.value,
      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((isBatchModifyDialogVisible).value = $event)),
      title: "修改跟单任务",
      width: "480px"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_28, [
          _createVNode(_component_el_button, { onClick: closeBatchModifyDialog }, {
            default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            disabled: !selectedAgentIdForModify.value || !__props.runtimeEnabled,
            title: __props.runtimeEnabled ? '' : __props.disabledReason,
            onClick: confirmBatchModify
          }, {
            default: _withCtx(() => [...(_cache[18] || (_cache[18] = [
              _createTextVNode("确定", -1)
            ]))]),
            _: 1
          }, 8, ["disabled", "title"])
        ])
      ]),
      default: _withCtx(() => [
        _cache[19] || (_cache[19] = _createElementVNode("div", { class: "dialog-subtitle" }, "可修改跟单任务的智能体", -1)),
        _createElementVNode("div", _hoisted_27, [
          _cache[16] || (_cache[16] = _createElementVNode("span", { class: "filter-label" }, "选择智能体：", -1)),
          _createVNode(_component_el_select, {
            modelValue: selectedAgentIdForModify.value,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((selectedAgentIdForModify).value = $event)),
            placeholder: "请选择智能体",
            style: {"width":"240px"}
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
    }, 8, ["modelValue"])
  ]))
}
}

})