import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, createElementBlock as _createElementBlock, unref as _unref, normalizeClass as _normalizeClass, toDisplayString as _toDisplayString, withModifiers as _withModifiers } from "vue"

const _hoisted_1 = { class: "mass-sending-panel" }
const _hoisted_2 = { class: "section-title" }
const _hoisted_3 = { class: "header-actions sop-header-actions" }
const _hoisted_4 = { class: "task-list" }
const _hoisted_5 = ["onClick"]
const _hoisted_6 = { class: "campaign-title" }
const _hoisted_7 = { class: "campaign-count" }
const _hoisted_8 = { class: "campaign-progress" }
const _hoisted_9 = { class: "campaign-progress-text" }
const _hoisted_10 = {
  key: 0,
  class: "campaign-hint"
}
const _hoisted_11 = { class: "campaign-actions" }
const _hoisted_12 = {
  key: 1,
  class: "campaign-batches"
}
const _hoisted_13 = {
  key: 0,
  class: "batch-empty"
}
const _hoisted_14 = { class: "batch-name" }
const _hoisted_15 = { class: "batch-prog" }
const _hoisted_16 = { class: "task-info" }
const _hoisted_17 = { class: "task-row task-header" }
const _hoisted_18 = { class: "task-time" }
const _hoisted_19 = { class: "task-row task-tags" }
const _hoisted_20 = { class: "tag-list" }
const _hoisted_21 = { class: "task-row task-group" }
const _hoisted_22 = { class: "group-name" }
const _hoisted_23 = {
  key: 0,
  class: "task-row task-progress"
}
const _hoisted_24 = {
  key: 1,
  class: "task-row task-interrupt-hint"
}
const _hoisted_25 = { class: "task-row task-actions" }

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Clock, ArrowRight, Promotion } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createMassSendingTask, cancelMassSendingTask, getMassSendingTasks, cancelAllMassSendingTasks, pauseMassSendingTask, resumeMassSendingTask, pauseAllMassSendingTasks, getMassSendingCampaigns, resumeMassSendingCampaign, cancelMassSendingCampaign } from '@/api/autosop'
import CreateTaskDialog from '@/components/sop/CreateTaskDialog.vue'

// Props
interface ActivateTask {
  id: string
  sendTime: string
  tagId: string
  selectedFriends?: string[]
  tagName: string[]
  greetingGroupId: string
  greetingGroupName: string
  contentType: string
  agentId?: string
  status: 'pending' | 'running' | 'scheduled' | 'paused' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  total?: number
  error?: string
  // campaign 相关
  campaignId?: string
  batchIndex?: number
  totalBatches?: number
  interrupted?: boolean
  interruptReason?: string
}

interface Campaign {
  campaign_id: string
  status: 'running' | 'interrupted' | 'completed' | 'cancelled'
  account_id?: string
  created_at?: string
  progress: number
  total: number
  batch_count: number
  completed_batches: number
  // 只读展示字段：区分“已处理”与“发送成功”，不参与任务执行或断点恢复
  display_progress?: number
  display_success?: number
  finished_batches?: number
  display_complete?: boolean
  failed_count?: number
}

// State

export default /*@__PURE__*/_defineComponent({
  __name: 'MassSendingPanel',
  props: {
    greetingGroups: {},
    currentInstanceNickname: {},
    currentInstanceAccountId: { default: '' },
    runtimeEnabled: { type: Boolean, default: true },
    disabledReason: { default: '' }
  },
  setup(__props: any) {

const props = __props

const requireRuntime = () => {
  if (props.runtimeEnabled) return true
  ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
  return false
}

// Types
const activateTasks = ref<ActivateTask[]>([])
const campaigns = ref<Campaign[]>([])
const expandedSet = ref<Set<string>>(new Set())
const createTaskVisible = ref(false)

const pendingTaskCount = computed(() => {
  return activateTasks.value.filter(task => task.status === 'pending' || task.status === 'scheduled').length
})

const runningTaskCount = computed(() => {
  return activateTasks.value.filter(task => task.status === 'running').length
})

// 按 campaignId 把批次任务归组
const campaignGroups = computed(() => {
  const map = new Map<string, ActivateTask[]>()
  for (const t of activateTasks.value) {
    if (t.campaignId) {
      if (!map.has(t.campaignId)) map.set(t.campaignId, [])
      map.get(t.campaignId)!.push(t)
    }
  }
  // 批次内按 batchIndex 升序
  for (const list of map.values()) {
    list.sort((a, b) => (a.batchIndex || 0) - (b.batchIndex || 0))
  }
  return map
})

// 展示用的活动列表：附带各自的实时批次明细
const displayCampaigns = computed(() => {
  return campaigns.value.map(c => ({
    ...c,
    batches: campaignGroups.value.get(c.campaign_id) || []
  }))
})

// 无 campaign 的独立任务（向后兼容）
const standaloneTasks = computed(() => activateTasks.value.filter(t => !t.campaignId))

const campaignPct = (c: Campaign) => {
  if (!c.total) return 0
  return Math.min(100, Math.round((campaignDisplayProgress(c) / c.total) * 100))
}

const campaignIsDisplayComplete = (c: Campaign) =>
  c.status === 'running' && c.display_complete === true

const campaignDisplayStatus = (c: Campaign) =>
  campaignIsDisplayComplete(c) ? 'completed' : c.status

const campaignDisplayProgress = (c: Campaign) =>
  c.display_progress ?? c.progress ?? 0

const campaignDisplaySuccess = (c: Campaign) =>
  c.display_success ?? c.progress ?? 0

const campaignFinishedBatches = (c: Campaign) =>
  c.finished_batches ?? c.completed_batches ?? 0

const toggleExpand = (campaignId: string) => {
  const next = new Set(expandedSet.value)
  if (next.has(campaignId)) next.delete(campaignId)
  else next.add(campaignId)
  expandedSet.value = next
}

const getCampaignStatusText = (s: string) => {
  const map: Record<string, string> = {
    running: '发送中', interrupted: '已中断', completed: '已完成', cancelled: '已取消'
  }
  return map[s] || s
}

const getCampaignTagType = (s: string): 'success' | 'warning' | 'info' | 'danger' => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    running: 'warning', interrupted: 'danger', completed: 'success', cancelled: 'info'
  }
  return map[s] || 'info'
}

// 批次状态展示：区分"已中断"与活动中断下的"已挂起"
const getBatchStatusText = (b: ActivateTask) => {
  if (b.interrupted) return '已中断'
  if (b.status === 'paused') return '已挂起'
  return getTaskStatusText(b.status)
}
const getBatchTagType = (b: ActivateTask): 'success' | 'warning' | 'info' | 'danger' => {
  if (b.interrupted) return 'danger'
  return getTaskStatusType(b.status) as any
}

// 独立任务状态：掉线中断时显示"已中断"
const taskStatusLabel = (t: ActivateTask) => {
  if (t.interrupted) return '已中断'
  return getTaskStatusText(t.status)
}
const taskStatusTagType = (t: ActivateTask): 'success' | 'warning' | 'info' | 'primary' | 'danger' => {
  if (t.interrupted) return 'danger'
  return getTaskStatusType(t.status)
}

// Methods
const showCreateTaskDialog = () => {
  if (!requireRuntime()) return
  createTaskVisible.value = true
}

const formatTaskTime = (time: string) => {
  try {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return '无效时间'
  }
}

const getTaskStatusType = (status: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' => {
  const statusMap: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
    pending: 'info',
    running: 'warning',
    scheduled: 'info',
    paused: 'info',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return statusMap[status] || 'info'
}

const getTaskStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '等待执行',
    running: '执行中',
    scheduled: '等待执行',
    paused: '已暂停',
    completed: '已完成',
    failed: '执行失败',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const formatSelectedFriends = (friends: string[]) => {
  if (!friends || friends.length === 0) return '';
  
  if (friends.length <= 2) {
    return friends.join('、');
  }
  
  return `${friends[0]}、${friends[1]}..等${friends.length}人`;
}

const formatTasks = (tasks: any[]): ActivateTask[] => {
  return tasks.map(task => {
    const p = task?.params?.task_params || task?.params || {}
    return {
      id: task.task_id || task.id,
      sendTime: task.next_run_time || task.schedule_time || task.sendTime || new Date().toISOString(),
      tagId: p.tagIds || task.tagId || [],
      tagName: p.tagIds || task.tagName || [],
      selectedFriends: p.selectedFriends || task.selectedFriends || [],
      greetingGroupId: p.greetingGroupId || task.greetingGroupId || '',
      greetingGroupName: p.greetingGroupId || task.greetingGroupName || '',
      contentType: p.contentType || task.contentType || 'greeting',
      agentId: p.agentId || task.agentId || '',
      status: task.status || 'pending',
      progress: task.progress || 0,
      total: task.total || 0,
      error: task.error,
      // campaign 相关字段
      campaignId: p.campaignId || task.campaignId || '',
      batchIndex: p.batchIndex,
      totalBatches: p.totalBatches,
      interrupted: task.interrupted || false,
      interruptReason: task.interrupt_reason || ''
    }
  });
}

// 加载群发活动列表（含整体聚合进度）
const loadCampaigns = async () => {
  try {
    campaigns.value = await getMassSendingCampaigns(false)
  } catch (error) {
    console.error('加载群发活动列表失败:', error)
  }
}

// 同时刷新批次任务与活动
const reloadAll = async () => {
  await Promise.all([loadMassSendingTasks(), loadCampaigns()])
}

const loadMassSendingTasks = async () => {
  try {
    const result = await getMassSendingTasks()
    if (result.success) {
      console.debug('加载群发任务列表成功:', result?.data)
      const { pending, running } = result.data || {}
      // 合并 pending 和 running 列表，优先显示 running
      const runningTasks = formatTasks(running || [])
      const pendingTasks = formatTasks(pending || [])
      
      // 合并列表，running 在前
      activateTasks.value = [...runningTasks, ...pendingTasks]
    } else {
      console.error('加载群发任务列表失败:', result.error)
    }
  } catch (error) {
    console.error('加载群发任务列表失败:', error)
  }
}

const handleCreateTask = async (taskData: any) => {
  if (!requireRuntime()) return
  if (!props.currentInstanceAccountId) {
    ElMessage.warning('请先登录并选择微信账号')
    return
  }
  try {
    // 根据contentType决定使用哪个字段
    const payload = {
      ...taskData,
      account_id: props.currentInstanceAccountId,
      // 如果是智能体类型，将agentId添加到payload中
      ...(taskData.contentType === 'agent' ? { agentId: taskData.agentId } : {})
    }
    
    const result = await createMassSendingTask(payload)
    console.debug("创建任务。。。", result);
    await reloadAll();
    ElMessage.success('任务创建成功')
  } catch (error) {
    console.error('创建任务失败:', error)
    ElMessage.error('创建任务失败')
  }
}

const handlePauseTask = async (taskId: string) => {
  if (!requireRuntime()) return
  try {
    await pauseMassSendingTask(taskId)
    await reloadAll()
    ElMessage.success('任务已暂停')
  } catch (error) {
    ElMessage.error('暂停任务失败')
  }
}

const handleResumeTask = async (taskId: string) => {
  if (!requireRuntime()) return
  try {
    await resumeMassSendingTask(taskId)
    await reloadAll()
    ElMessage.success('任务已恢复')
  } catch (error) {
    ElMessage.error('恢复任务失败')
  }
}

const cancelTask = async (taskId: string) => {
  if (!requireRuntime()) return
  try {
    await cancelMassSendingTask(taskId)
    // 重新加载任务列表，而不是直接在前端过滤，以确保状态一致性
    await reloadAll()
    ElMessage.success('任务已取消')
  } catch (error) {
    ElMessage.error('取消任务失败')
  }
}

// 整体恢复一个被中断的群发活动（从断点续发）
const handleResumeCampaign = async (c: Campaign) => {
  if (!requireRuntime()) return
  const remaining = Math.max(0, (c.total || 0) - (c.progress || 0))
  try {
    await ElMessageBox.confirm(
      `已发送 ${c.progress || 0} 人，将从断点继续向剩余 ${remaining} 人发送。已发送的联系人不会重复收到。`,
      '继续群发活动',
      { confirmButtonText: '确认继续', cancelButtonText: '取消', type: 'warning' }
    )
    await resumeMassSendingCampaign(c.campaign_id)
    ElMessage.success('活动已恢复，正在从断点依次续发剩余批次')
    await reloadAll()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复群发活动失败:', error)
      ElMessage.error('恢复群发活动失败')
    }
  }
}

// 整体取消一个群发活动
const handleCancelCampaign = async (c: Campaign) => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(
      '确定取消整个群发活动？未发送的剩余联系人将不再发送。',
      '确认取消',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await cancelMassSendingCampaign(c.campaign_id)
    ElMessage.success('活动已取消')
    await reloadAll()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消群发活动失败:', error)
      // 展示后端的具体原因（如"活动已完成，无法取消"）
      ElMessage.error(error instanceof Error ? error.message : '取消群发活动失败')
      // 状态可能已变化（如刚好完成），刷新一次保证一致
      await reloadAll()
    }
  }
}

const handlePauseAllTasks = async () => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(
      '是否暂停所有正在执行或排队中的任务？\n(未到时间的定时任务不会被暂停)',
      '确认暂停',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const result = await pauseAllMassSendingTasks()
    if (result.success) {
      ElMessage.success(result.message || '批量暂停成功')
      await loadMassSendingTasks()
    } else {
      ElMessage.error(result.error || '批量暂停失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量暂停任务失败:', error)
      ElMessage.error('批量暂停任务失败')
    }
  }
}

const handleCancelAllTasks = async () => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(
      '是否取消全部任务？',
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const result = await cancelAllMassSendingTasks()
    if (result.success) {
      ElMessage.success(result.message || '批量取消成功')
      await loadMassSendingTasks()
    } else {
      ElMessage.error(result.error || '批量取消失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量取消任务失败:', error)
      ElMessage.error('批量取消任务失败')
    }
  }
}

// WebSocket Listeners
const handleTaskStatusUpdate = (event: CustomEvent) => {
  const taskUpdate = event.detail;
  
  // 处理列表更新通知
  if (taskUpdate.type === 'mass_sending_list_update') {
    console.debug('收到群发任务列表更新通知，重新加载任务列表...');
    reloadAll();
    return;
  }

  // 处理群发任务状态更新
  if (taskUpdate.type === 'mass_sending') {
     if (taskUpdate.status === 'running' && taskUpdate.task_id) {
       // 优化：仅更新本地状态，不重新加载列表，防止阻塞
       const task = activateTasks.value.find(t => t.id === taskUpdate.task_id);
       if (task) {
         task.progress = taskUpdate.progress;
         task.total = taskUpdate.total;
         // 如果状态发生变化，才更新状态
         if (task.status !== 'running') {
            task.status = 'running';
         }
       }
     } else {
       // 对于非运行中状态（完成、失败、取消、中断），重新加载列表与活动以获取最新状态
       console.debug(`收到群发任务状态变更(${taskUpdate.status})，重新加载任务列表...`);
       reloadAll();
     }
  }
}

onMounted(() => {
  if (!props.runtimeEnabled) return
  reloadAll();
  // 移除旧的监听器（如果有）
  // window.addEventListener('massSendingTasks', handleMassSendingTasksUpdate as EventListener);
  window.addEventListener('taskStatus', handleTaskStatusUpdate as EventListener);
})

onUnmounted(() => {
  // window.removeEventListener('massSendingTasks', handleMassSendingTasksUpdate as EventListener);
  window.removeEventListener('taskStatus', handleTaskStatusUpdate as EventListener);
})

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_empty = _resolveComponent("el-empty")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_progress = _resolveComponent("el-progress")!
  const _component_el_scrollbar = _resolveComponent("el-scrollbar")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _cache[4] || (_cache[4] = _createElementVNode("span", null, "群发", -1)),
      _createElementVNode("div", _hoisted_3, [
        (pendingTaskCount.value > 3)
          ? (_openBlock(), _createBlock(_component_el_button, {
              key: 0,
              type: "danger",
              plain: "",
              size: "small",
              class: "sop-header-btn",
              disabled: !__props.runtimeEnabled,
              title: __props.disabledReason,
              onClick: handleCancelAllTasks
            }, {
              default: _withCtx(() => [...(_cache[1] || (_cache[1] = [
                _createTextVNode(" 全部取消 ", -1)
              ]))]),
              _: 1
            }, 8, ["disabled", "title"]))
          : _createCommentVNode("", true),
        (runningTaskCount.value > 0)
          ? (_openBlock(), _createBlock(_component_el_button, {
              key: 1,
              type: "warning",
              plain: "",
              size: "small",
              class: "sop-header-btn",
              disabled: !__props.runtimeEnabled,
              title: __props.disabledReason,
              onClick: handlePauseAllTasks
            }, {
              default: _withCtx(() => [...(_cache[2] || (_cache[2] = [
                _createTextVNode(" 全部暂停 ", -1)
              ]))]),
              _: 1
            }, 8, ["disabled", "title"]))
          : _createCommentVNode("", true),
        _createVNode(_component_el_button, {
          type: "primary",
          size: "small",
          class: "sop-header-btn",
          disabled: !__props.runtimeEnabled,
          title: __props.disabledReason,
          onClick: showCreateTaskDialog
        }, {
          default: _withCtx(() => [...(_cache[3] || (_cache[3] = [
            _createTextVNode(" 创建 ", -1)
          ]))]),
          _: 1
        }, 8, ["disabled", "title"])
      ])
    ]),
    _createVNode(_component_el_scrollbar, { height: "calc(100vh - 100px)" }, {
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_4, [
          (displayCampaigns.value.length === 0 && standaloneTasks.value.length === 0)
            ? (_openBlock(), _createBlock(_component_el_empty, {
                key: 0,
                description: "暂无进行中任务"
              }))
            : _createCommentVNode("", true),
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(displayCampaigns.value, (c) => {
            return (_openBlock(), _createElementBlock("div", {
              key: c.campaign_id,
              class: _normalizeClass(["campaign-item", { 'is-interrupted': c.status === 'interrupted' }])
            }, [
              _createElementVNode("div", {
                class: "campaign-header",
                onClick: ($event: any) => (toggleExpand(c.campaign_id))
              }, [
                _createElementVNode("span", _hoisted_6, [
                  _createVNode(_component_el_icon, {
                    class: _normalizeClass(["expand-icon", { expanded: expandedSet.value.has(c.campaign_id) }])
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_unref(ArrowRight))
                    ]),
                    _: 1
                  }, 8, ["class"]),
                  _createVNode(_component_el_icon, null, {
                    default: _withCtx(() => [
                      _createVNode(_unref(Promotion))
                    ]),
                    _: 1
                  }),
                  _cache[5] || (_cache[5] = _createElementVNode("span", { class: "campaign-name" }, "群发活动", -1)),
                  _createVNode(_component_el_tag, {
                    type: getCampaignTagType(campaignDisplayStatus(c)),
                    size: "small",
                    effect: "light"
                  }, {
                    default: _withCtx(() => [
                      _createTextVNode(_toDisplayString(getCampaignStatusText(campaignDisplayStatus(c))), 1)
                    ]),
                    _: 2
                  }, 1032, ["type"])
                ]),
                _createElementVNode("span", _hoisted_7, _toDisplayString(campaignFinishedBatches(c)) + "/" + _toDisplayString(c.batch_count || 0) + " 批", 1)
              ], 8, _hoisted_5),
              _createElementVNode("div", _hoisted_8, [
                _createVNode(_component_el_progress, {
                  percentage: campaignPct(c),
                  status: c.status === 'interrupted' ? 'warning' : (campaignPct(c) === 100 ? 'success' : undefined),
                  "stroke-width": 10
                }, null, 8, ["percentage", "status"]),
                _createElementVNode("span", _hoisted_9, [
                  _createTextVNode(_toDisplayString(campaignDisplayProgress(c)) + "/" + _toDisplayString(c.total || 0) + " 人 ", 1),
                  ((c.failed_count || 0) > 0)
                    ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                        _createTextVNode(" · 成功 " + _toDisplayString(campaignDisplaySuccess(c)) + " / 失败 " + _toDisplayString(c.failed_count), 1)
                      ], 64))
                    : _createCommentVNode("", true)
                ])
              ]),
              (c.status === 'interrupted')
                ? (_openBlock(), _createElementBlock("div", _hoisted_10, " ⚠ 已中断，断点已保存，点「继续」续发 "))
                : _createCommentVNode("", true),
              _createElementVNode("div", _hoisted_11, [
                (c.status === 'interrupted')
                  ? (_openBlock(), _createBlock(_component_el_button, {
                      key: 0,
                      type: "success",
                      size: "small",
                      disabled: !__props.runtimeEnabled,
                      title: __props.disabledReason,
                      onClick: _withModifiers(($event: any) => (handleResumeCampaign(c)), ["stop"])
                    }, {
                      default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
                        _createTextVNode(" 继续 ", -1)
                      ]))]),
                      _: 1
                    }, 8, ["disabled", "title", "onClick"]))
                  : _createCommentVNode("", true),
                (['interrupted', 'running'].includes(c.status) && !campaignIsDisplayComplete(c))
                  ? (_openBlock(), _createBlock(_component_el_button, {
                      key: 1,
                      type: "danger",
                      plain: "",
                      size: "small",
                      disabled: !__props.runtimeEnabled,
                      title: __props.disabledReason,
                      onClick: _withModifiers(($event: any) => (handleCancelCampaign(c)), ["stop"])
                    }, {
                      default: _withCtx(() => [...(_cache[7] || (_cache[7] = [
                        _createTextVNode(" 取消 ", -1)
                      ]))]),
                      _: 1
                    }, 8, ["disabled", "title", "onClick"]))
                  : _createCommentVNode("", true)
              ]),
              (expandedSet.value.has(c.campaign_id))
                ? (_openBlock(), _createElementBlock("div", _hoisted_12, [
                    (c.batches.length === 0)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_13, "暂无进行中的批次明细"))
                      : _createCommentVNode("", true),
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(c.batches, (b) => {
                      return (_openBlock(), _createElementBlock("div", {
                        key: b.id,
                        class: "batch-row"
                      }, [
                        _createElementVNode("span", _hoisted_14, "批次 " + _toDisplayString(b.batchIndex || '-') + "/" + _toDisplayString(b.totalBatches || c.batch_count), 1),
                        _createVNode(_component_el_tag, {
                          size: "small",
                          type: getBatchTagType(b),
                          effect: "plain"
                        }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(getBatchStatusText(b)), 1)
                          ]),
                          _: 2
                        }, 1032, ["type"]),
                        _createElementVNode("span", _hoisted_15, _toDisplayString(b.progress || 0) + "/" + _toDisplayString(b.total || 0), 1)
                      ]))
                    }), 128))
                  ]))
                : _createCommentVNode("", true)
            ], 2))
          }), 128)),
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(standaloneTasks.value, (task) => {
            return (_openBlock(), _createElementBlock("div", {
              key: task.id,
              class: "task-item"
            }, [
              _createElementVNode("div", _hoisted_16, [
                _createElementVNode("div", _hoisted_17, [
                  _createElementVNode("span", _hoisted_18, [
                    _createVNode(_component_el_icon, null, {
                      default: _withCtx(() => [
                        _createVNode(_unref(Clock))
                      ]),
                      _: 1
                    }),
                    _createTextVNode(" " + _toDisplayString(formatTaskTime(task.sendTime)), 1)
                  ]),
                  _createVNode(_component_el_tag, {
                    type: taskStatusTagType(task),
                    size: "small"
                  }, {
                    default: _withCtx(() => [
                      _createTextVNode(_toDisplayString(taskStatusLabel(task)), 1)
                    ]),
                    _: 2
                  }, 1032, ["type"])
                ]),
                _createElementVNode("div", _hoisted_19, [
                  _cache[8] || (_cache[8] = _createElementVNode("span", { class: "label" }, "群发人群：", -1)),
                  _createElementVNode("div", _hoisted_20, [
                    (task.selectedFriends && task.selectedFriends.length)
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                          _createTextVNode(_toDisplayString(formatSelectedFriends(task.selectedFriends)), 1)
                        ], 64))
                      : (_openBlock(true), _createElementBlock(_Fragment, { key: 1 }, _renderList(task.tagName, (tagName) => {
                          return (_openBlock(), _createBlock(_component_el_tag, {
                            size: "small",
                            key: tagName
                          }, {
                            default: _withCtx(() => [
                              _createTextVNode(_toDisplayString(tagName), 1)
                            ]),
                            _: 2
                          }, 1024))
                        }), 128))
                  ])
                ]),
                _createElementVNode("div", _hoisted_21, [
                  _cache[9] || (_cache[9] = _createElementVNode("span", { class: "label" }, "话术方式：", -1)),
                  _createElementVNode("span", _hoisted_22, _toDisplayString(task.contentType === 'agent' ? '智能体生成' : '固定话术组'), 1)
                ]),
                (task.status === 'running' || (task.progress && task.total))
                  ? (_openBlock(), _createElementBlock("div", _hoisted_23, " 进度: " + _toDisplayString(task.progress || 0) + "/" + _toDisplayString(task.total || 0), 1))
                  : _createCommentVNode("", true),
                (task.interrupted)
                  ? (_openBlock(), _createElementBlock("div", _hoisted_24, " ⚠ 已中断，断点已保存，点「继续」续发 "))
                  : _createCommentVNode("", true),
                _createElementVNode("div", _hoisted_25, [
                  (['running', 'pending'].includes(task.status))
                    ? (_openBlock(), _createBlock(_component_el_button, {
                        key: 0,
                        type: "warning",
                        size: "small",
                        plain: "",
                        disabled: !__props.runtimeEnabled,
                        title: __props.disabledReason,
                        onClick: _withModifiers(($event: any) => (handlePauseTask(task.id)), ["stop"])
                      }, {
                        default: _withCtx(() => [...(_cache[10] || (_cache[10] = [
                          _createTextVNode(" 暂停 ", -1)
                        ]))]),
                        _: 1
                      }, 8, ["disabled", "title", "onClick"]))
                    : _createCommentVNode("", true),
                  (task.status === 'paused')
                    ? (_openBlock(), _createBlock(_component_el_button, {
                        key: 1,
                        type: "success",
                        size: "small",
                        plain: "",
                        disabled: !__props.runtimeEnabled,
                        title: __props.disabledReason,
                        onClick: _withModifiers(($event: any) => (handleResumeTask(task.id)), ["stop"])
                      }, {
                        default: _withCtx(() => [
                          _createTextVNode(_toDisplayString(task.interrupted ? '继续' : '恢复'), 1)
                        ]),
                        _: 2
                      }, 1032, ["disabled", "title", "onClick"]))
                    : _createCommentVNode("", true),
                  (['pending', 'scheduled', 'running', 'paused'].includes(task.status))
                    ? (_openBlock(), _createBlock(_component_el_button, {
                        key: 2,
                        type: "danger",
                        size: "small",
                        plain: "",
                        disabled: !__props.runtimeEnabled,
                        title: __props.disabledReason,
                        onClick: _withModifiers(($event: any) => (cancelTask(task.id)), ["stop"])
                      }, {
                        default: _withCtx(() => [...(_cache[11] || (_cache[11] = [
                          _createTextVNode(" 取消 ", -1)
                        ]))]),
                        _: 1
                      }, 8, ["disabled", "title", "onClick"]))
                    : _createCommentVNode("", true)
                ])
              ])
            ]))
          }), 128))
        ])
      ]),
      _: 1
    }),
    _createVNode(CreateTaskDialog, {
      visible: createTaskVisible.value,
      "onUpdate:visible": _cache[0] || (_cache[0] = ($event: any) => ((createTaskVisible).value = $event)),
      "greeting-groups": __props.greetingGroups,
      "wechat-nickname": __props.currentInstanceNickname,
      "is-from-sop": true,
      onCreate: handleCreateTask
    }, null, 8, ["visible", "greeting-groups", "wechat-nickname"])
  ]))
}
}

})