import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, resolveComponent as _resolveComponent, createVNode as _createVNode, createTextVNode as _createTextVNode, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, createElementBlock as _createElementBlock, renderList as _renderList, Fragment as _Fragment, unref as _unref, withModifiers as _withModifiers } from "vue"

const _hoisted_1 = { class: "card" }
const _hoisted_2 = { class: "stepper" }
const _hoisted_3 = { key: 0 }
const _hoisted_4 = { class: "scroll-container" }
const _hoisted_5 = { class: "form-group" }
const _hoisted_6 = { class: "form-content" }
const _hoisted_7 = { style: {"margin-top":"5px"} }
const _hoisted_8 = { class: "form-group" }
const _hoisted_9 = { class: "form-content" }
const _hoisted_10 = { class: "mode-row" }
const _hoisted_11 = {
  key: 1,
  class: "range-row"
}
const _hoisted_12 = {
  key: 0,
  class: "interval-hint"
}
const _hoisted_13 = { class: "form-group" }
const _hoisted_14 = { class: "form-content" }
const _hoisted_15 = {
  key: 0,
  class: "week-wrap"
}
const _hoisted_16 = { class: "btn-row" }
const _hoisted_17 = { key: 1 }
const _hoisted_18 = { class: "scroll-container" }
const _hoisted_19 = { class: "form-group" }
const _hoisted_20 = { class: "form-content" }
const _hoisted_21 = ["title"]
const _hoisted_22 = {
  key: 0,
  class: "select-left"
}
const _hoisted_23 = {
  key: 1,
  class: "select-left"
}
const _hoisted_24 = {
  key: 2,
  class: "select-actions"
}
const _hoisted_25 = { class: "group-preview" }
const _hoisted_26 = {
  key: 0,
  class: "group-hint"
}
const _hoisted_27 = {
  key: 1,
  class: "group-count"
}
const _hoisted_28 = {
  key: 2,
  class: "group-list"
}
const _hoisted_29 = ["title", "onClick"]
const _hoisted_30 = { class: "form-group" }
const _hoisted_31 = { class: "form-content" }
const _hoisted_32 = { class: "form-group" }
const _hoisted_33 = { class: "form-content" }
const _hoisted_34 = { class: "account-option" }
const _hoisted_35 = { class: "nickname" }
const _hoisted_36 = { class: "account-id" }
const _hoisted_37 = { class: "btn-row" }

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight, Refresh, Close } from '@element-plus/icons-vue'

import { selectMomentFolder, openFolder, getActiveInstances, type Instance, createMomentPostTask, listMomentGroups, createMomentFolder } from '@/api/moments'
import { computed } from 'vue'

export default /*@__PURE__*/_defineComponent({
  __name: 'CreateTaskWizard',
  props: {
    runtimeEnabled: { type: Boolean, default: true },
    disabledReason: { default: '' }
  },
  emits: ["created", "cancel"],
  setup(__props: any, { emit: __emit }) {

const props = __props
const runtimeEnabled = computed(() => props.runtimeEnabled)
const disabledReason = computed(() => props.disabledReason)
const step = ref<1 | 2>(1)
const refreshingFolder = ref(false)
const instancesLoading = ref(false)

const form = ref({
  name: '',
  createFolder: false,
  execMode: 'fixed',
  fixedTime: '',
  rangeStart: '',
  rangeEnd: '',
  cycle: 'weekly',
  materialFolder: '',
  publishMode: 'sequence',
  account: '',
  postCount: 3
})
const groupList = ref<string[]>([])
const activeInstances = ref<Instance[]>([])

const weeks = ref([
  { label: '一', value: '1', checked: true },
  { label: '二', value: '2', checked: true },
  { label: '三', value: '3', checked: true },
  { label: '四', value: '4', checked: true },
  { label: '五', value: '5', checked: true },
  { label: '六', value: '6', checked: false },
  { label: '日', value: '0', checked: false }
])

const goStep = async (target: 1 | 2) => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (target === 2 && form.value.execMode === 'range') {
    const startMin = timeToMinutes(form.value.rangeStart)
    const endMin = timeToMinutes(form.value.rangeEnd)
    const count = Number(form.value.postCount) || 0
    if (startMin != null && endMin != null && endMin > startMin && count > 0) {
      const M = endMin - startMin
      const interval = Math.floor(M / (count + 1))
      if (interval < 15) {
        ElMessage.error('发圈间隔不得低于15分钟')
        return
      }
    }
  }

  if (target === 2 && form.value.createFolder) {
    if (!form.value.name) {
      ElMessage.warning('请输入计划名称')
      return
    }
    try {
      const res = await createMomentFolder(form.value.name)
      if (res.success && res.path) {
        form.value.materialFolder = res.path
        groupList.value = []
        ElMessage.success(`已创建计划文件夹：${res.name}`)
        // Uncheck to prevent duplicate creation if user goes back and forth
        form.value.createFolder = false 
      } else {
        ElMessage.error(res.error || '创建计划文件夹失败')
        return
      }
    } catch (e: any) {
      ElMessage.error(e.message || '创建计划文件夹失败')
      return
    }
  }

  step.value = target
  if (target === 2 && activeInstances.value.length === 0) {
    await loadActiveInstances(true)
  }
}

const selectFolder = async () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  try {
    const res = await selectMomentFolder()
    if (res.success && res.selected) {
      form.value.materialFolder = res.selected
      groupList.value = res.groups || []
    }
  } catch (e: any) {
    ElMessage.error(e.message || '选择文件夹失败')
  }
}

const openMaterialFolder = async () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (form.value.materialFolder) {
    try {
      const res = await openFolder(form.value.materialFolder)
      if (!res.success) {
        ElMessage.error(res.error || '打开文件夹失败')
      }
    } catch (e: any) {
      ElMessage.error(e.message || '打开文件夹失败')
    }
  } else {
    // 如果没有选择文件夹，先触发选择文件夹
    selectFolder()
  }
}

const clearSelection = () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  form.value.materialFolder = ''
  groupList.value = []
}

const openGroup = async (name: string) => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (!form.value.materialFolder) return
  const path = `${form.value.materialFolder}/${name}`
  try {
    const res = await openFolder(path)
    if (!res.success) {
      ElMessage.error(res.error || '打开素材组失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '打开素材组失败')
  }
}

const refreshFolder = async () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (!form.value.materialFolder) return
  refreshingFolder.value = true
  try {
    // 提取计划名称（文件夹名称）
    const parts = form.value.materialFolder.split(/\\|\//)
    const planName = parts[parts.length - 1]
    
    if (planName) {
      const res = await listMomentGroups(planName)
      if (res.success) {
        groupList.value = res.groups || []
        ElMessage.success('素材组已刷新')
      } else {
        ElMessage.error('刷新失败')
      }
    }
  } catch (e: any) {
    ElMessage.error(e.message || '刷新失败')
  } finally {
    refreshingFolder.value = false
  }
}

// const choosePlan = async (name: string) => {
//   form.value.materialFolder = `${basePath.value}/${name}`
//   planDialogVisible.value = false
//   const res = await listMomentGroups(name)
//   groupList.value = res.success ? res.groups : []
// }
const folderName = computed(() => {
  if (!form.value.materialFolder) return ''
  const parts = form.value.materialFolder.split(/\\|\//)
  return parts[parts.length - 1] || ''
})
const emit = __emit

const formatTime = (val: unknown): string | undefined => {
  if (!val) return undefined
  if (val instanceof Date) {
    const h = `${val.getHours()}`.padStart(2, '0')
    const m = `${val.getMinutes()}`.padStart(2, '0')
    return `${h}:${m}`
  }
  if (typeof val === 'string') return val
  return undefined
}

const submit = async () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  const weekDays = weeks.value.filter(w => w.checked).map(w => w.value)
  const payload = {
    name: form.value.name,
    execMode: form.value.execMode as 'fixed' | 'range',
    fixedTime: formatTime(form.value.fixedTime),
    rangeStart: formatTime(form.value.rangeStart),
    rangeEnd: formatTime(form.value.rangeEnd),
    postCount: form.value.postCount,
    cycle: form.value.cycle as 'daily' | 'weekly',
    weekDays,
    materialFolder: form.value.materialFolder,
    publishMode: form.value.publishMode as 'sequence' | 'random',
    account: form.value.account
  }
  const res = await createMomentPostTask(payload)
  if (res.success) {
    ElMessage.success('任务创建成功')
    emit('created')
  } else {
    ElMessage.error(res.error || '任务创建失败')
  }
}

const onSelectModuleClick = () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  // 如果已经选择了文件夹，点击整个区域不触发重选，避免误操作
  // 只有在未选择时，或者点击“请选择”区域时才触发
  if (!form.value.materialFolder) {
    selectFolder()
  }
}

const selectedWeekCount = computed(() => weeks.value.filter(w => w.checked).length)
const hasValidTime = computed(() => {
  if (form.value.execMode === 'fixed') {
    return !!form.value.fixedTime
  }
  return !!form.value.rangeStart && !!form.value.rangeEnd
})
const canGoNext = computed(() => {
  const nameOk = !!form.value.name && form.value.name.trim().length > 0
  const weeklyOk = form.value.cycle === 'daily' || selectedWeekCount.value > 0
  return nameOk && hasValidTime.value && weeklyOk
})

const handleWeekChange = (w: { label: string; value: string; checked: boolean }) => {
  if (form.value.cycle !== 'weekly') return
  if (!w.checked && selectedWeekCount.value === 0) {
    w.checked = true
    ElMessage.warning('最少需要选择一天')
  }
}

const timeToMinutes = (val: unknown): number | null => {
  if (!val) return null
  if (val instanceof Date) {
    return val.getHours() * 60 + val.getMinutes()
  }
  if (typeof val === 'string') {
    const parts = val.split(':')
    if (parts.length === 2) {
      const h = Number(parts[0])
      const m = Number(parts[1])
      if (!isNaN(h) && !isNaN(m)) return h * 60 + m
    }
  }
  return null
}

const intervalText = computed(() => {
  if (form.value.execMode !== 'range') return ''
  const startMin = timeToMinutes(form.value.rangeStart)
  const endMin = timeToMinutes(form.value.rangeEnd)
  const count = Number(form.value.postCount) || 0
  if (startMin == null || endMin == null || endMin <= startMin || count <= 0) return ''
  const M = endMin - startMin
  const interval = Math.floor(M / (count + 1))
  if (interval <= 0) return ''
  return `每隔 ${interval} 分钟 发一次`
})

const loadActiveInstances = async (showFailure = false): Promise<boolean> => {
  if (instancesLoading.value) return false
  instancesLoading.value = true
  try {
    const data = await getActiveInstances()
    if (data.success) {
      activeInstances.value = data.instances
      if (data.instances.length === 1) {
        form.value.account = data.instances[0].account_id
      } else if (data.instances.length > 1) {
        const act = data.instances.find(i => i.is_active)
        if (act) form.value.account = act.account_id
      }
      return true
    }
    if (showFailure) ElMessage.error('微信实例暂时不可用，请稍后重试')
  } catch (error: any) {
    if (showFailure) {
      ElMessage.error(error?.message || '微信实例暂时不可用，请稍后重试')
    }
  } finally {
    instancesLoading.value = false
  }
  return false
}

const onAccountSelectorVisible = (visible: boolean) => {
  if (visible && activeInstances.value.length === 0) {
    void loadActiveInstances(true)
  }
}

const canSubmit = computed(() => {
  const hasFolder = !!form.value.materialFolder
  const hasMaterials = groupList.value.length > 0
  const hasAccount = !!form.value.account
  return hasFolder && hasMaterials && hasAccount
})

return (_ctx: any,_cache: any) => {
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_radio = _resolveComponent("el-radio")!
  const _component_el_radio_group = _resolveComponent("el-radio-group")!
  const _component_el_time_picker = _resolveComponent("el-time-picker")!
  const _component_el_input_number = _resolveComponent("el-input-number")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _cache[15] || (_cache[15] = _createElementVNode("div", { class: "step-line" }, null, -1)),
      _createElementVNode("div", {
        class: _normalizeClass(["step-item", { active: step.value === 1 }])
      }, [...(_cache[13] || (_cache[13] = [
        _createElementVNode("div", { class: "step-circle" }, "1", -1),
        _createElementVNode("div", null, "设置执行计划", -1)
      ]))], 2),
      _createElementVNode("div", {
        class: _normalizeClass(["step-item", { active: step.value === 2 }])
      }, [...(_cache[14] || (_cache[14] = [
        _createElementVNode("div", { class: "step-circle" }, "2", -1),
        _createElementVNode("div", null, "配置发圈素材", -1)
      ]))], 2)
    ]),
    (step.value === 1)
      ? (_openBlock(), _createElementBlock("div", _hoisted_3, [
          _createElementVNode("div", _hoisted_4, [
            _createElementVNode("div", _hoisted_5, [
              _cache[17] || (_cache[17] = _createElementVNode("div", { class: "form-label" }, "计划名称", -1)),
              _createElementVNode("div", _hoisted_6, [
                _createVNode(_component_el_input, {
                  modelValue: form.value.name,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((form.value.name) = $event)),
                  placeholder: "请输入计划名称，如：1201-元旦发圈推广计划",
                  style: {"width":"100%"}
                }, null, 8, ["modelValue"]),
                _createElementVNode("div", _hoisted_7, [
                  _createVNode(_component_el_checkbox, {
                    modelValue: form.value.createFolder,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((form.value.createFolder) = $event))
                  }, {
                    default: _withCtx(() => [...(_cache[16] || (_cache[16] = [
                      _createTextVNode("同时创建计划文件夹", -1)
                    ]))]),
                    _: 1
                  }, 8, ["modelValue"])
                ])
              ])
            ]),
            _createElementVNode("div", _hoisted_8, [
              _cache[22] || (_cache[22] = _createElementVNode("div", { class: "form-label" }, "执行方式", -1)),
              _createElementVNode("div", _hoisted_9, [
                _createVNode(_component_el_radio_group, {
                  modelValue: form.value.execMode,
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((form.value.execMode) = $event))
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_radio, { value: "fixed" }, {
                      default: _withCtx(() => [...(_cache[18] || (_cache[18] = [
                        _createTextVNode("固定时间", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_el_radio, { value: "range" }, {
                      default: _withCtx(() => [...(_cache[19] || (_cache[19] = [
                        _createTextVNode("时间段(发多条)", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"]),
                _createElementVNode("div", _hoisted_10, [
                  (form.value.execMode === 'fixed')
                    ? (_openBlock(), _createBlock(_component_el_time_picker, {
                        key: 0,
                        modelValue: form.value.fixedTime,
                        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((form.value.fixedTime) = $event)),
                        placeholder: "选择时间",
                        format: "HH:mm"
                      }, null, 8, ["modelValue"]))
                    : (_openBlock(), _createElementBlock("div", _hoisted_11, [
                        _createVNode(_component_el_time_picker, {
                          modelValue: form.value.rangeStart,
                          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((form.value.rangeStart) = $event)),
                          placeholder: "开始时间",
                          format: "HH:mm",
                          class: "time-input",
                          style: {"width":"120px"}
                        }, null, 8, ["modelValue"]),
                        _cache[20] || (_cache[20] = _createElementVNode("span", { class: "range-sep" }, "—", -1)),
                        _createVNode(_component_el_time_picker, {
                          modelValue: form.value.rangeEnd,
                          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((form.value.rangeEnd) = $event)),
                          placeholder: "结束时间",
                          format: "HH:mm",
                          class: "time-input",
                          style: {"width":"120px"}
                        }, null, 8, ["modelValue"]),
                        _createVNode(_component_el_input_number, {
                          modelValue: form.value.postCount,
                          "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event: any) => ((form.value.postCount) = $event)),
                          min: 1,
                          max: 30,
                          "controls-position": "right",
                          placeholder: "发圈数",
                          step: 1,
                          class: "post-count",
                          style: {"width":"82px"}
                        }, null, 8, ["modelValue"]),
                        _cache[21] || (_cache[21] = _createElementVNode("span", { class: "count-unit" }, "条", -1)),
                        (intervalText.value)
                          ? (_openBlock(), _createElementBlock("span", _hoisted_12, _toDisplayString(intervalText.value), 1))
                          : _createCommentVNode("", true)
                      ]))
                ])
              ])
            ]),
            _createElementVNode("div", _hoisted_13, [
              _cache[25] || (_cache[25] = _createElementVNode("div", { class: "form-label" }, "执行周期", -1)),
              _createElementVNode("div", _hoisted_14, [
                _createVNode(_component_el_radio_group, {
                  modelValue: form.value.cycle,
                  "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((form.value.cycle) = $event))
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_radio, { value: "daily" }, {
                      default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
                        _createTextVNode("每天", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_el_radio, { value: "weekly" }, {
                      default: _withCtx(() => [...(_cache[24] || (_cache[24] = [
                        _createTextVNode("每周", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"]),
                (form.value.cycle === 'weekly')
                  ? (_openBlock(), _createElementBlock("div", _hoisted_15, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(weeks.value, (w) => {
                        return (_openBlock(), _createBlock(_component_el_checkbox, {
                          key: w.value,
                          modelValue: w.checked,
                          "onUpdate:modelValue": ($event: any) => ((w.checked) = $event),
                          onChange: ($event: any) => (handleWeekChange(w))
                        }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(w.label), 1)
                          ]),
                          _: 2
                        }, 1032, ["modelValue", "onUpdate:modelValue", "onChange"]))
                      }), 128))
                    ]))
                  : _createCommentVNode("", true)
              ])
            ])
          ]),
          _createElementVNode("div", _hoisted_16, [
            _createVNode(_component_el_button, {
              onClick: _cache[8] || (_cache[8] = ($event: any) => (_ctx.$emit('cancel')))
            }, {
              default: _withCtx(() => [...(_cache[26] || (_cache[26] = [
                _createTextVNode("取消", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_el_button, {
              type: "primary",
              disabled: !canGoNext.value || !runtimeEnabled.value,
              title: disabledReason.value,
              onClick: _cache[9] || (_cache[9] = ($event: any) => (goStep(2)))
            }, {
              default: _withCtx(() => [...(_cache[27] || (_cache[27] = [
                _createTextVNode("下一步", -1)
              ]))]),
              _: 1
            }, 8, ["disabled", "title"])
          ])
        ]))
      : (_openBlock(), _createElementBlock("div", _hoisted_17, [
          _createElementVNode("div", _hoisted_18, [
            _createElementVNode("div", _hoisted_19, [
              _cache[31] || (_cache[31] = _createElementVNode("div", { class: "form-label" }, "添加素材组", -1)),
              _createElementVNode("div", _hoisted_20, [
                _createElementVNode("div", {
                  class: _normalizeClass(['select-module', !form.value.materialFolder ? 'unselected' : 'selected', { 'runtime-disabled': !runtimeEnabled.value }]),
                  title: disabledReason.value,
                  onClick: onSelectModuleClick
                }, [
                  (!form.value.materialFolder)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_22, "请选择素材文件夹"))
                    : (_openBlock(), _createElementBlock("div", _hoisted_23, " 已选：" + _toDisplayString(folderName.value), 1)),
                  (form.value.materialFolder)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_24, [
                        _createVNode(_component_el_button, {
                          size: "small",
                          type: "danger",
                          plain: "",
                          disabled: !runtimeEnabled.value,
                          title: disabledReason.value,
                          onClick: _withModifiers(clearSelection, ["stop"])
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_icon, null, {
                              default: _withCtx(() => [
                                _createVNode(_unref(Close))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }, 8, ["disabled", "title"])
                      ]))
                    : _createCommentVNode("", true)
                ], 10, _hoisted_21),
                _createElementVNode("div", _hoisted_25, [
                  (!form.value.materialFolder)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_26, [...(_cache[28] || (_cache[28] = [
                        _createElementVNode("span", null, "选择素材文件夹，可预览素材组", -1)
                      ]))]))
                    : (_openBlock(), _createElementBlock("div", _hoisted_27, [
                        _createElementVNode("span", null, "包含 " + _toDisplayString(groupList.value.length) + " 个素材组", 1),
                        _createVNode(_component_el_button, {
                          type: "primary",
                          link: "",
                          disabled: !runtimeEnabled.value,
                          title: disabledReason.value,
                          onClick: _withModifiers(openMaterialFolder, ["stop"]),
                          style: {"margin-left":"8px"}
                        }, {
                          default: _withCtx(() => [...(_cache[29] || (_cache[29] = [
                            _createTextVNode(" 去添加素材组 > ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["disabled", "title"]),
                        _createVNode(_component_el_button, {
                          type: "primary",
                          link: "",
                          disabled: !runtimeEnabled.value,
                          title: disabledReason.value || '刷新素材组',
                          onClick: _withModifiers(refreshFolder, ["stop"]),
                          loading: refreshingFolder.value
                        }, {
                          default: _withCtx(() => [...(_cache[30] || (_cache[30] = [
                            _createTextVNode(" 刷新 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["disabled", "title", "loading"])
                      ])),
                  (form.value.materialFolder)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_28, [
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(groupList.value, (g) => {
                          return (_openBlock(), _createElementBlock("div", {
                            class: _normalizeClass(["group-item", { 'runtime-disabled': !runtimeEnabled.value }]),
                            title: disabledReason.value,
                            key: g,
                            onClick: ($event: any) => (openGroup(g))
                          }, _toDisplayString(g), 11, _hoisted_29))
                        }), 128))
                      ]))
                    : _createCommentVNode("", true)
                ])
              ])
            ]),
            _createElementVNode("div", _hoisted_30, [
              _cache[34] || (_cache[34] = _createElementVNode("div", { class: "form-label" }, "发布方式", -1)),
              _createElementVNode("div", _hoisted_31, [
                _createVNode(_component_el_radio_group, {
                  modelValue: form.value.publishMode,
                  "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event: any) => ((form.value.publishMode) = $event))
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_radio, { value: "sequence" }, {
                      default: _withCtx(() => [...(_cache[32] || (_cache[32] = [
                        _createTextVNode("按顺序发布", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_el_radio, { value: "random" }, {
                      default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
                        _createTextVNode("随机发布", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ])
            ]),
            _createElementVNode("div", _hoisted_32, [
              _cache[35] || (_cache[35] = _createElementVNode("div", { class: "form-label" }, "选择账号", -1)),
              _createElementVNode("div", _hoisted_33, [
                _createVNode(_component_el_select, {
                  modelValue: form.value.account,
                  "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event: any) => ((form.value.account) = $event)),
                  placeholder: "选择微信账号",
                  loading: instancesLoading.value,
                  onVisibleChange: onAccountSelectorVisible
                }, {
                  default: _withCtx(() => [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeInstances.value, (inst) => {
                      return (_openBlock(), _createBlock(_component_el_option, {
                        key: inst.account_id,
                        label: inst.nickname,
                        value: inst.account_id
                      }, {
                        default: _withCtx(() => [
                          _createElementVNode("span", _hoisted_34, [
                            _createElementVNode("span", _hoisted_35, _toDisplayString(inst.nickname), 1),
                            _createElementVNode("span", _hoisted_36, _toDisplayString(inst.account_id), 1)
                          ])
                        ]),
                        _: 2
                      }, 1032, ["label", "value"]))
                    }), 128))
                  ]),
                  _: 1
                }, 8, ["modelValue", "loading"])
              ])
            ])
          ]),
          _createElementVNode("div", _hoisted_37, [
            _createVNode(_component_el_button, {
              onClick: _cache[12] || (_cache[12] = ($event: any) => (goStep(1)))
            }, {
              default: _withCtx(() => [...(_cache[36] || (_cache[36] = [
                _createTextVNode("上一步", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_el_button, {
              type: "primary",
              disabled: !canSubmit.value || !runtimeEnabled.value,
              title: disabledReason.value,
              onClick: submit
            }, {
              default: _withCtx(() => [...(_cache[37] || (_cache[37] = [
                _createTextVNode("生成任务", -1)
              ]))]),
              _: 1
            }, 8, ["disabled", "title"])
          ])
        ]))
  ]))
}
}

})