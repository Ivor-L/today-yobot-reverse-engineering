import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, unref as _unref, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, openBlock as _openBlock, normalizeClass as _normalizeClass, vShow as _vShow, withDirectives as _withDirectives, createBlock as _createBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "moments-container" }
const _hoisted_2 = { class: "page-header" }
const _hoisted_3 = { class: "title-wrap" }
const _hoisted_4 = { class: "title-line" }
const _hoisted_5 = { class: "inline-stat" }
const _hoisted_6 = { class: "actions" }
const _hoisted_7 = { class: "content-grid" }
const _hoisted_8 = { class: "mini-sidebar" }
const _hoisted_9 = ["title"]
const _hoisted_10 = ["title"]
const _hoisted_11 = { class: "main-section" }

import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import TaskList from '@/components/moments/TaskList.vue'
import CreateTaskWizard from '@/components/moments/CreateTaskWizard.vue'
import { getMomentPostTasks, cancelMomentPostTask, getMomentPostLogs, type MomentPostLog } from '@/api/moments'
import MomentLogsDialog from '@/components/moments/MomentLogsDialog.vue'
import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'

interface TaskItem {
  id: string
  name: string
  createdAt: string
  account: string
  sentCount: number
  nextRunAt: string
  ruleDesc: string
}


export default /*@__PURE__*/_defineComponent({
  ...{ name: 'MomentsView' },
  __name: 'MomentsView',
  setup(__props) {



const {
  isActionEnabled,
  actionReason,
  requireAction
} = useRuntimeCapabilityPresentation()

const activeView = ref<'list' | 'create'>('list')

const tasks = ref<TaskItem[]>([])
const logsVisible = ref(false)
const logs = ref<MomentPostLog[]>([])
const wizardKey = ref(0)

const todayCount = computed(() => {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
  return logs.value.filter(l => {
    if (l.status !== 'success') return false
    const t = new Date(l.timestamp)
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d
  }).length
})

const switchView = (view: 'list' | 'create') => {
  const actionKey = view === 'list' ? 'moments.task.list' : 'moments.task.create'
  if (!requireAction(actionKey)) return
  activeView.value = view
  if (view === 'list') {
    loadTasks()
  }
}

const handleCancelTask = async (taskId: string) => {
  if (!requireAction('moments.task.cancel')) return
  try {
    await ElMessageBox.confirm('确认取消该任务？', '提示', { type: 'warning' })
    const res = await cancelMomentPostTask(taskId)
    if (res.success) {
      tasks.value = tasks.value.filter(t => t.id !== taskId)
      ElMessage.success('已取消任务')
    } else {
      ElMessage.error('取消任务失败')
    }
  } catch {}
}

const handleTaskCreated = () => {
  ElMessage.success('任务创建成功')
  activeView.value = 'list'
  loadTasks()
  wizardKey.value++
}

const loadTasks = async () => {
  try {
    const res = await getMomentPostTasks()
    if (res.success) {
      tasks.value = res.tasks
    }
  } catch {}
}

onMounted(() => {
  if (isActionEnabled('moments.task.list')) loadTasks()
  if (isActionEnabled('moments.log.read')) loadLogs()
})

const loadLogs = async () => {
  try {
    const res = await getMomentPostLogs()
    if (res.success) {
      logs.value = res.logs
    }
  } catch {}
}

const openLogs = async () => {
  if (!requireAction('moments.log.read')) return
  await loadLogs()
  logsVisible.value = true
}

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _createElementVNode("div", _hoisted_3, [
        _createElementVNode("div", _hoisted_4, [
          _cache[3] || (_cache[3] = _createElementVNode("div", { class: "page-title" }, "朋友圈任务", -1)),
          _createElementVNode("div", _hoisted_5, "今日自动发圈：" + _toDisplayString(todayCount.value) + " 条", 1)
        ]),
        _cache[4] || (_cache[4] = _createElementVNode("div", { class: "page-subtitle" }, "发朋友圈仅支持 4.0 以上微信", -1))
      ]),
      _createElementVNode("div", _hoisted_6, [
        _createVNode(_component_el_button, {
          type: "primary",
          plain: "",
          disabled: !_unref(isActionEnabled)('moments.log.read'),
          title: _unref(actionReason)('moments.log.read'),
          onClick: openLogs
        }, {
          default: _withCtx(() => [...(_cache[5] || (_cache[5] = [
            _createTextVNode("发圈日志", -1)
          ]))]),
          _: 1
        }, 8, ["disabled", "title"])
      ])
    ]),
    _createElementVNode("div", _hoisted_7, [
      _createElementVNode("aside", _hoisted_8, [
        _createElementVNode("div", {
          class: _normalizeClass(["icon-btn", { active: activeView.value === 'list', disabled: !_unref(isActionEnabled)('moments.task.list') }]),
          title: _unref(actionReason)('moments.task.list'),
          onClick: _cache[0] || (_cache[0] = ($event: any) => (switchView('list'))),
          "data-title": "任务列表"
        }, [...(_cache[6] || (_cache[6] = [
          _createElementVNode("svg", {
            width: "20",
            height: "20",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            viewBox: "0 0 24 24"
          }, [
            _createElementVNode("path", { d: "M4 6h16M4 12h16M4 18h16" })
          ], -1)
        ]))], 10, _hoisted_9),
        _createElementVNode("div", {
          class: _normalizeClass(["icon-btn", { active: activeView.value === 'create', disabled: !_unref(isActionEnabled)('moments.task.create') }]),
          title: _unref(actionReason)('moments.task.create'),
          onClick: _cache[1] || (_cache[1] = ($event: any) => (switchView('create'))),
          "data-title": "新建任务"
        }, [...(_cache[7] || (_cache[7] = [
          _createElementVNode("svg", {
            width: "20",
            height: "20",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            viewBox: "0 0 24 24"
          }, [
            _createElementVNode("path", { d: "M12 4v16m8-8H4" })
          ], -1)
        ]))], 10, _hoisted_10)
      ]),
      _createElementVNode("section", _hoisted_11, [
        _withDirectives(_createVNode(TaskList, {
          tasks: tasks.value,
          "runtime-enabled": _unref(isActionEnabled)('moments.task.cancel'),
          "disabled-reason": _unref(actionReason)('moments.task.cancel'),
          onCancel: handleCancelTask
        }, null, 8, ["tasks", "runtime-enabled", "disabled-reason"]), [
          [_vShow, activeView.value === 'list']
        ]),
        _withDirectives((_openBlock(), _createBlock(CreateTaskWizard, {
          key: wizardKey.value,
          "runtime-enabled": _unref(isActionEnabled)('moments.task.create'),
          "disabled-reason": _unref(actionReason)('moments.task.create'),
          onCreated: handleTaskCreated
        }, null, 8, ["runtime-enabled", "disabled-reason"])), [
          [_vShow, activeView.value === 'create']
        ]),
        _createVNode(MomentLogsDialog, {
          visible: logsVisible.value,
          "onUpdate:visible": _cache[2] || (_cache[2] = ($event: any) => ((logsVisible).value = $event)),
          logs: logs.value
        }, null, 8, ["visible", "logs"])
      ])
    ])
  ]))
}
}

})