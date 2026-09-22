import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, createElementVNode as _createElementVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, createBlock as _createBlock, createCommentVNode as _createCommentVNode, normalizeClass as _normalizeClass, resolveDirective as _resolveDirective, withDirectives as _withDirectives } from "vue"

const _hoisted_1 = { class: "customer-management-container" }
const _hoisted_2 = { class: "filter-bar" }
const _hoisted_3 = { class: "filter-content" }
const _hoisted_4 = { class: "tab-switch" }
const _hoisted_5 = { class: "filter-controls" }
const _hoisted_6 = { class: "account-option" }
const _hoisted_7 = { class: "nickname" }
const _hoisted_8 = { class: "account-id" }
const _hoisted_9 = { class: "content-grid" }
const _hoisted_10 = { class: "contact-list" }
const _hoisted_11 = { class: "list-header" }
const _hoisted_12 = { class: "search-box" }
const _hoisted_13 = { class: "list-count-row" }
const _hoisted_14 = { class: "list-count" }
const _hoisted_15 = { class: "list-content" }
const _hoisted_16 = {
  key: 0,
  class: "friends-list"
}
const _hoisted_17 = ["onClick"]
const _hoisted_18 = { class: "friend-avatar" }
const _hoisted_19 = { class: "avatar-placeholder" }
const _hoisted_20 = { class: "friend-info" }
const _hoisted_21 = { class: "friend-name" }
const _hoisted_22 = { class: "friend-wxid" }
const _hoisted_23 = {
  key: 0,
  class: "friend-tags"
}
const _hoisted_24 = {
  key: 0,
  class: "more-tags"
}
const _hoisted_25 = {
  key: 1,
  class: "groups-list"
}
const _hoisted_26 = ["onClick"]
const _hoisted_27 = { class: "group-avatar" }
const _hoisted_28 = { class: "avatar-placeholder group-avatar-bg" }
const _hoisted_29 = { class: "group-info" }
const _hoisted_30 = { class: "group-name" }
const _hoisted_31 = {
  key: 0,
  class: "friend-tags"
}
const _hoisted_32 = {
  key: 2,
  class: "empty-state"
}
const _hoisted_33 = { class: "empty-text" }
const _hoisted_34 = { class: "right-section" }
const _hoisted_35 = { class: "group-select-container" }
const _hoisted_36 = { class: "dialog-footer" }
const _hoisted_37 = { class: "set-group-tag-dialog" }
const _hoisted_38 = { class: "dialog-targets" }
const _hoisted_39 = { class: "dialog-input" }
const _hoisted_40 = { class: "dialog-footer" }

import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import SelectedTargetsPanel from '@/components/SelectedTargetsPanel.vue'
import OperationsPanel from '@/components/OperationsPanel.vue'
import CreateTaskDialog from '@/components/sop/CreateTaskDialog.vue'
import SyncContactsDialog from '@/components/SyncContactsDialog.vue'
import AutoFollowConfigDialog from '@/components/AutoFollowConfigDialog.vue'
import { getContacts, getContactTags, getGroupTags, getGroups, inviteFriendsToGroup, syncContacts, syncGroups, Contact, Tag, setGroupTagBatch } from '@/api/contact'
import { headers } from '@/api/config'
import { createMassSendingTask, MassSendingTaskRequest, createBatchAutoFollowTasks, BatchAutoFollowRequest } from '@/api/autosop'
import { useRouter, useRoute } from 'vue-router'
import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'

// 定义实例接口
interface Instance {
  account_id: string
  nickname: string
  status?: string
  is_active?: boolean
}

// 响应式数据

export default /*@__PURE__*/_defineComponent({
  __name: 'CustomerManagement',
  setup(__props) {

const router = useRouter()
const route = useRoute()
const {
  isActionEnabled,
  actionReason,
  requireAction
} = useRuntimeCapabilityPresentation()
const activeType = ref('friends') // 'friends' | 'groups'
const selectedAccountId = ref('')
const selectedTag = ref('__ALL__')
const searchKeyword = ref('')
const loading = ref(false)

// 实例和数据
const activeInstances = ref<Instance[]>([])
const friendsList = ref<Contact[]>([])
const groupList = ref<Contact[]>([])
const tagList = ref<Tag[]>([])

// 选中的目标
const selectedFriends = ref<string[]>([])
const selectedGroups = ref<string[]>([])

// 弹窗状态
const showCreateDialog = ref(false)
const showGroupSelectDialog = ref(false)
const showSyncDialog = ref(false)
const showAutoFollowConfigDialog = ref(false)
const selectedTargetGroup = ref('')
const inviting = ref(false)

// 计算属性
const filteredList = computed(() => {
  let list = activeType.value === 'friends' ? friendsList.value : groupList.value
  
  // 关键词搜索
  if (searchKeyword.value) {
    list = list.filter(item => 
      item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )
  }
  
  // 标签筛选（仅好友）
  if (selectedTag.value && selectedTag.value !== '__ALL__') {
    if (activeType.value === 'friends') {
      if (selectedTag.value === '未分组') {
        list = list.filter(friend => !friend.tags || friend.tags.length === 0)
      } else {
        list = list.filter(friend => 
          friend.tags && friend.tags.includes(selectedTag.value)
        )
      }
    } else {
      if (selectedTag.value === '未分组') {
        list = list.filter(group => !('tag' in group) || !group.tag)
      } else {
        list = list.filter(group => ('tag' in group) && group.tag === selectedTag.value)
      }
    }
  }
  
  return list
})

// 全选状态计算属性
const isAllSelected = computed(() => {
  const selectedList = activeType.value === 'friends' ? selectedFriends.value : selectedGroups.value
  return filteredList.value.length > 0 && 
         filteredList.value.every(item => selectedList.includes(item.name))
})

// 方法
const loadActiveInstances = async () => {
  try {
    const response = await fetch('/api/instances/active', { headers })
    const data = await response.json()
    console.log('获取活跃实例:', data)
    if (data.success) {
      activeInstances.value = data.instances
      // 如果只有一个实例，自动选择
      if (data.instances.length === 1) {
        selectedAccountId.value = data.instances[0].account_id
      } else if (data.instances.length > 1) {
        // 选择当前活跃的实例
        const activeInstance = data.instances.find((inst: Instance) => inst.is_active)
        if (activeInstance) {
          selectedAccountId.value = activeInstance.account_id
        }
      }
    }
  } catch (error) {
    console.error('获取活跃实例失败:', error)
    ElMessage.error('获取微信实例失败')
  }
}

const loadFriends = async () => {
  if (!isActionEnabled('customer.view.friends')) return
  if (!selectedAccountId.value) return
  
  loading.value = true
  try {
    // 修正：使用 '__ALL__' 作为全部标签的哨兵值；'未分组' 也不直接传到后端
    const tagParam = (selectedTag.value === '__ALL__' || selectedTag.value === '未分组') ? undefined : selectedTag.value
    const response = await getContacts(tagParam, searchKeyword.value, selectedAccountId.value)
    friendsList.value = response.map(friend => ({
      ...friend,
      is_new: friend.is_new || false,
      last_updated: friend.last_updated
    }))
  } catch (error) {
    console.error('获取好友列表失败:', error)
    ElMessage.error('获取好友列表失败')
  } finally {
    loading.value = false
  }
}

const loadGroups = async () => {
  if (!isActionEnabled('customer.view.groups')) return
  // if (!selectedAccountId.value) return
  loading.value = true
  try {
    const response = await getGroups(searchKeyword.value, selectedAccountId.value)
    groupList.value = response.map(group => {
      return {
        ...group,
        id: group.name,
        tag: group.tag
      }
    })
  } catch (error) {
    console.error('获取群聊列表失败:', error)
    ElMessage.error('获取群聊列表失败')
  } finally {
    loading.value = false
  }
}

const loadTags = async () => {
  const viewAction = activeType.value === 'friends'
    ? 'customer.view.friends'
    : 'customer.view.groups'
  if (!isActionEnabled(viewAction)) return
  if (!selectedAccountId.value) return
  
  try {
    const response = activeType.value === 'friends'
      ? await getContactTags(selectedAccountId.value)
      : await getGroupTags(selectedAccountId.value)
    tagList.value = (response || []).filter(tag => !(tag.name === '未分组' && (tag.count ?? 0) === 0))
  } catch (error) {
    console.error('获取标签列表失败:', error)
  }
}

const isSelected = (name: string) => {
  if (activeType.value === 'friends') {
    return selectedFriends.value.includes(name)
  } else {
    return selectedGroups.value.includes(name)
  }
}

const toggleSelection = (name: string, type: 'friend' | 'group') => {
  if (type === 'friend') {
    const index = selectedFriends.value.indexOf(name)
    if (index > -1) {
      selectedFriends.value.splice(index, 1)
    } else {
      selectedFriends.value.push(name)
    }
  } else {
    const index = selectedGroups.value.indexOf(name)
    if (index > -1) {
      selectedGroups.value.splice(index, 1)
    } else {
      selectedGroups.value.push(name)
    }
  }
}

const removeFriend = (name: string) => {
  const index = selectedFriends.value.indexOf(name)
  if (index > -1) {
    selectedFriends.value.splice(index, 1)
  }
}

const removeGroup = (name: string) => {
  const index = selectedGroups.value.indexOf(name)
  if (index > -1) {
    selectedGroups.value.splice(index, 1)
  }
}

const clearAllSelections = () => {
  selectedFriends.value = []
  selectedGroups.value = []
}

// 全选/取消全选方法
const toggleSelectAll = () => {
  const selectedList = activeType.value === 'friends' ? selectedFriends.value : selectedGroups.value
  if (isAllSelected.value) {
    // 取消全选：清空当前类型的选择
    if (activeType.value === 'friends') {
      selectedFriends.value = []
    } else {
      selectedGroups.value = []
    }
  } else {
    // 全选：选择当前筛选列表中的所有项目
    const newSelections = filteredList.value.map(item => item.name)
    if (activeType.value === 'friends') {
      selectedFriends.value = newSelections
    } else {
      selectedGroups.value = newSelections
    }
  }
}

// 事件处理
const handleTypeChange = async () => {
  const viewAction = activeType.value === 'friends'
    ? 'customer.view.friends'
    : 'customer.view.groups'
  if (!requireAction(viewAction)) {
    activeType.value = isActionEnabled('customer.view.friends') ? 'friends' : 'groups'
    return
  }
  // 切换好友/群聊时不清空已选择的目标，只重置筛选条件
  selectedTag.value = '__ALL__'
  searchKeyword.value = ''
  console.log('activeType.value', activeType.value, selectedAccountId.value)
  // 如果没有选择账号，尝试重新加载实例
  // if (!selectedAccountId.value) {
  //   await loadActiveInstances()
  //   // 如果仍然没有账号，说明没有登录的微信实例

  //   if (!selectedAccountId.value) {
  //     ElMessage.warning('请先登录微信账号')
  //     return
  //   }
  // }
  
  if (activeType.value === 'friends') {
    await loadFriends()
    await loadTags()
  } else {
    await loadGroups()
    await loadTags()
  }
}

const handleAccountChange = () => {
  // 只有切换账号时才清空已选择的目标
  clearAllSelections()
  selectedTag.value = '__ALL__'
  searchKeyword.value = ''
  
  // 切换账号时总是重新加载标签列表，不管当前是好友还是群聊模式
  loadTags()
  
  if (activeType.value === 'friends') {
    loadFriends()
  } else {
    loadGroups()
  }
}

const handleTagChange = () => {
  // 标签变化时不需要重新加载数据，只需要重新过滤
}

const handleSearch = () => {
  // 搜索时不需要重新加载数据，只需要重新过滤
}

// 操作处理
const handleMassSending = () => {
  if (!requireAction('customer.message.mass-send')) return
  showCreateDialog.value = true
}

const handleBatchInvite = async () => {
  if (!requireAction('customer.group.invite')) return
  if (selectedFriends.value.length === 0) {
    ElMessage.warning('请先选择要拉群的好友')
    return
  }
  
  if (!selectedAccountId.value) {
    ElMessage.warning('请先选择微信账号')
    return
  }
  
  // 加载群聊列表用于选择
  try {
    const groups = await getGroups('', selectedAccountId.value)
    groupList.value = groups
    showGroupSelectDialog.value = true
  } catch (error) {
    console.error('获取群聊列表失败:', error)
    ElMessage.error('获取群聊列表失败')
  }
}

const handleAutoFollow = () => {
  if (!requireAction('customer.follow.create')) return
  if (selectedFriends.value.length === 0 && selectedGroups.value.length === 0) {
    ElMessage.warning('请先选择要跟进的好友或群聊')
    return
  }

  if (!selectedAccountId.value) {
    ElMessage.warning('请先选择微信账号')
    return
  }

  // 显示自动跟进配置弹窗
  showAutoFollowConfigDialog.value = true
}

const handleBatchTag = () => {
  if (!requireAction('customer.group.tag')) return
  if (selectedGroups.value.length === 0 || selectedFriends.value.length > 0) {
    ElMessage.warning('仅支持对选中的群聊批量设置标签')
    return
  }
  openSetGroupTagDialog()
}

const handleDeleteContacts = () => {
  ElMessage.info('删除功能开发中...')
}

const handleShowSettings = () => {
  if (!requireAction('customer.sync.open')) return
  showSyncDialog.value = true
}

const handleCreateTask = async (taskData: MassSendingTaskRequest) => {
  if (!requireAction('customer.message.mass-send')) return
  try {
    const requestData = {
      ...taskData,
      selectedFriends: [...selectedFriends.value, ...selectedGroups.value], // 合并为一个列表
      selectedGroups: [], // 不再单独传递群聊列表
      account_id: selectedAccountId.value
    }
    console.debug('创建任务请求数据:', requestData)
    await createMassSendingTask(requestData)
    ElMessage.success('任务创建成功')
    // 重置选择状态
    selectedFriends.value = []
    selectedGroups.value = []
    showCreateDialog.value = false
    // 跳转到 AutoSOP 页面
    router.push({
      name: 'AutoSOP',
      query: {
        function: 'activate'
      }
    })
  } catch (error) {
    console.error('创建任务失败:', error)
    ElMessage.error('创建任务失败')
  }
}

const showSetGroupTagDialog = ref(false)
const inputGroupTag = ref('')

const openSetGroupTagDialog = () => {
  if (!requireAction('customer.group.tag')) return
  inputGroupTag.value = ''
  showSetGroupTagDialog.value = true
}

const isValidTag = (s: string) => {
  const t = s.trim()
  if (!t) return false
  return /^[\u4e00-\u9fffA-Za-z0-9]+$/.test(t)
}

const canConfirmSetGroupTag = computed(() => {
  const t = inputGroupTag.value.trim()
  const len = t.length
  return isValidTag(t) && len >= 1 && len <= 10 && selectedGroups.value.length > 0
})

const groupTagDialogTargetsText = computed(() => {
  const max = 5
  const names = selectedGroups.value.slice(0, max).join('，')
  if (selectedGroups.value.length > max) {
    return `${names} 等${selectedGroups.value.length}个群`
  }
  return names
})

const confirmSetGroupTag = async () => {
  if (!requireAction('customer.group.tag')) return
  if (!selectedAccountId.value) {
    ElMessage.error('请先选择微信账号')
    return
  }
  const t = inputGroupTag.value.trim()
  const len = t.length
  if (!isValidTag(t) || len < 1 || len > 10) {
    ElMessage.error('标签需为1-10个字符（支持中英文和数字）')
    return
  }
  try {
    const res = await setGroupTagBatch({
      groups: selectedGroups.value,
      tag: t,
      account_id: selectedAccountId.value
    })
    if (res && res.success) {
      ElMessage.success('已批量设置群标签')
      showSetGroupTagDialog.value = false
      await loadGroups()
    } else {
      ElMessage.error(res?.error || '设置群标签失败')
    }
  } catch (e) {
    ElMessage.error('设置群标签失败')
  }
}

const handleCreateAutoFollowTask = async (configData: any) => {
  if (!requireAction('customer.follow.create')) return
  try {
    // 构建联系人列表：好友（单聊）+ 群聊
    const friendContacts = selectedFriends.value.map(friendName => {
      const friend = friendsList.value.find(f => f.name === friendName)
      return {
        wxid: friend?.wxid || `wx_${friendName}`,
        nickname: friendName,
        chat_type: 'single'
      }
    })
    const groupContacts = selectedGroups.value.map(groupName => {
      return {
        wxid: `group_${groupName}`,
        nickname: groupName,
        chat_type: 'group'
      }
    })
    const friends = [...friendContacts, ...groupContacts]

    // 构建批量跟单请求
    const batchRequest: BatchAutoFollowRequest = {
      account_id: selectedAccountId.value,
      friends: friends,
      agent_id: configData.agentId,
      follow_scenario: '新好友', // 使用默认场景
      follow_days: configData.followDays, // 使用动态选择的周期
      follow_frequency: configData.followFrequency, // 使用动态选择的频率(间隔天数)
      time_range_start: configData.timeRangeStart,
      time_range_end: configData.timeRangeEnd,
      first_run_next_day: configData.firstRunNextDay // 次日执行
    }

    console.debug('批量创建自动跟单任务请求:', batchRequest)

    // 调用后端接口
    const result = await createBatchAutoFollowTasks(batchRequest)
    
    if (result.success) {
      // 计数需同时包含单聊和群聊：优先用后端返回的 success_count，回退到本次提交的联系人总数
      const createdCount = result.success_count ?? friends.length
      const failedCount = result.failed_count ?? 0
      if (failedCount > 0) {
        ElMessage.success(`成功创建 ${createdCount} 个跟单任务（${failedCount} 个未创建，可能已存在）`)
      } else {
        ElMessage.success(`成功创建 ${createdCount} 个跟单任务`)
      }
      // 重置选择状态（单聊 + 群聊都要清空）
      selectedFriends.value = []
      selectedGroups.value = []
      // 跳转到 AutoSOP 的自动跟单功能
      router.push({
        name: 'AutoSOP',
        query: {
          function: 'autofollow'
        }
      })
    } else {
      ElMessage.error(result.error || '创建自动跟单任务失败')
    }
  } catch (error) {
    console.error('创建自动跟单任务失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '创建自动跟单任务失败')
  }
}

const confirmInviteToGroup = async () => {
  if (!requireAction('customer.group.invite')) return
  if (!selectedTargetGroup.value) {
    ElMessage.warning('请选择目标群聊')
    return
  }
  showGroupSelectDialog.value = false
  try {
    inviting.value = true
    const result = await inviteFriendsToGroup({
      friends: selectedFriends.value,
      targetGroup: selectedTargetGroup.value,
      account_id: selectedAccountId.value
    })
    
    if (result.success) {
      ElMessage.success(`批量拉群成功，已邀请 ${result.data.invitedCount} 位好友`)
      // 重置选择状态
      selectedFriends.value = []
      selectedTargetGroup.value = ''
    } else {
      ElMessage.error(result.error || '批量拉群失败')
    }
  } catch (error) {
    console.error('批量拉群失败:', error)
    const msg = (error instanceof Error) ? error.message : (error as any)?.message || '批量拉群失败'
    ElMessage.error(msg)
  } finally {
    inviting.value = false
  }
}

// 生命周期
onMounted(async () => {
  // Check query param for tab
  if (route.query.tab && (route.query.tab === 'friends' || route.query.tab === 'groups')) {
    activeType.value = route.query.tab as string
  }
  if (activeType.value === 'friends' && !isActionEnabled('customer.view.friends')) {
    activeType.value = 'groups'
  } else if (activeType.value === 'groups' && !isActionEnabled('customer.view.groups')) {
    activeType.value = 'friends'
  }

  await loadActiveInstances()
  if (selectedAccountId.value) {
    if (isActionEnabled('customer.view.friends')) await loadFriends()
    if (isActionEnabled('customer.view.groups')) await loadGroups()
    await loadTags()
  }
})

// 监听账号变化
watch(selectedAccountId, () => {
  if (selectedAccountId.value) {
    if (isActionEnabled('customer.view.friends')) loadFriends()
    if (isActionEnabled('customer.view.groups')) loadGroups()
    loadTags()
  }
})

// 监听activeType变化，确保切换时数据已加载（仅在数据为空时加载）
watch(activeType, () => {
  if (selectedAccountId.value) {
    if (activeType.value === 'friends' && friendsList.value.length === 0) {
      loadFriends()
    } else if (activeType.value === 'groups' && groupList.value.length === 0) {
      loadGroups()
    }
  }
})

// 同步通讯录处理方法
const handleSync = async (syncData: { accountId: string, type: 'friend' | 'group' }) => {
  const actionKey = syncData.type === 'friend'
    ? 'customer.sync.friends'
    : 'customer.sync.groups'
  if (!requireAction(actionKey)) return
  try {
    // 使用API层的接口
    if (syncData.type === 'friend') {
      await syncContacts(syncData.accountId)
      ElMessage.success('好友同步成功')
      await loadFriends()
    } else {
      await syncGroups(syncData.accountId)
      ElMessage.success('群聊同步成功')
      await loadGroups()
    }
  } catch (error: any) {
    console.error('同步失败:', error)
    ElMessage.error(`${syncData.type === 'friend' ? '好友' : '群聊'}同步失败: ${error?.message || '未知错误'}`)
  }
}

return (_ctx: any,_cache: any) => {
  const _component_el_radio_button = _resolveComponent("el-radio-button")!
  const _component_el_radio_group = _resolveComponent("el-radio-group")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_dialog = _resolveComponent("el-dialog")!
  const _directive_loading = _resolveDirective("loading")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _createElementVNode("div", _hoisted_3, [
        _createElementVNode("div", _hoisted_4, [
          _createVNode(_component_el_radio_group, {
            modelValue: activeType.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((activeType).value = $event)),
            onChange: handleTypeChange,
            class: "type-tabs"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_radio_button, {
                value: "friends",
                disabled: !_unref(isActionEnabled)('customer.view.friends'),
                title: _unref(actionReason)('customer.view.friends')
              }, {
                default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
                  _createTextVNode("好友", -1)
                ]))]),
                _: 1
              }, 8, ["disabled", "title"]),
              _createVNode(_component_el_radio_button, {
                value: "groups",
                disabled: !_unref(isActionEnabled)('customer.view.groups'),
                title: _unref(actionReason)('customer.view.groups')
              }, {
                default: _withCtx(() => [...(_cache[14] || (_cache[14] = [
                  _createTextVNode("群聊", -1)
                ]))]),
                _: 1
              }, 8, ["disabled", "title"])
            ]),
            _: 1
          }, 8, ["modelValue"])
        ]),
        _createElementVNode("div", _hoisted_5, [
          (activeInstances.value.length > 1)
            ? (_openBlock(), _createBlock(_component_el_select, {
                key: 0,
                modelValue: selectedAccountId.value,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((selectedAccountId).value = $event)),
                placeholder: "选择微信账号",
                onChange: handleAccountChange,
                class: "account-select",
                size: "default"
              }, {
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeInstances.value, (instance) => {
                    return (_openBlock(), _createBlock(_component_el_option, {
                      key: instance.account_id,
                      label: instance.nickname,
                      value: instance.account_id
                    }, {
                      default: _withCtx(() => [
                        _createElementVNode("span", _hoisted_6, [
                          _createElementVNode("span", _hoisted_7, _toDisplayString(instance.nickname), 1),
                          _createElementVNode("span", _hoisted_8, _toDisplayString(instance.account_id), 1)
                        ])
                      ]),
                      _: 2
                    }, 1032, ["label", "value"]))
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"]))
            : _createCommentVNode("", true),
          _createVNode(_component_el_select, {
            modelValue: selectedTag.value,
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((selectedTag).value = $event)),
            placeholder: "选择标签",
            onChange: handleTagChange,
            class: "tag-select",
            size: "default",
            "popper-class": 'tag-dropdown'
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_option, {
                label: "全部",
                value: "__ALL__"
              }),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(tagList.value, (tag) => {
                return (_openBlock(), _createBlock(_component_el_option, {
                  key: tag.id,
                  label: `${tag.name} (${tag.count})`,
                  value: tag.name
                }, null, 8, ["label", "value"]))
              }), 128))
            ]),
            _: 1
          }, 8, ["modelValue"])
        ])
      ])
    ]),
    _createElementVNode("div", _hoisted_9, [
      _createElementVNode("div", _hoisted_10, [
        _createElementVNode("div", _hoisted_11, [
          _createElementVNode("div", _hoisted_12, [
            _createVNode(_component_el_input, {
              modelValue: searchKeyword.value,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((searchKeyword).value = $event)),
              placeholder: "搜索好友或群聊",
              onInput: handleSearch,
              clearable: "",
              size: "default"
            }, {
              prefix: _withCtx(() => [
                _createVNode(_component_el_icon, null, {
                  default: _withCtx(() => [
                    _createVNode(_unref(Search))
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["modelValue"])
          ]),
          _createElementVNode("div", _hoisted_13, [
            _createElementVNode("span", _hoisted_14, _toDisplayString(activeType.value === 'friends' ? '好友' : '群聊') + " (" + _toDisplayString(filteredList.value.length) + ") ", 1),
            _createVNode(_component_el_button, {
              link: "",
              size: "small",
              onClick: toggleSelectAll,
              disabled: filteredList.value.length === 0
            }, {
              default: _withCtx(() => [
                _createTextVNode(_toDisplayString(isAllSelected.value ? '取消全选' : '全选'), 1)
              ]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        _withDirectives((_openBlock(), _createElementBlock("div", _hoisted_15, [
          (activeType.value === 'friends')
            ? (_openBlock(), _createElementBlock("div", _hoisted_16, [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(filteredList.value, (friend) => {
                  return (_openBlock(), _createElementBlock("div", {
                    key: friend.name,
                    class: _normalizeClass(["friend-item", { 'selected': isSelected(friend.name) }]),
                    onClick: ($event: any) => (toggleSelection(friend.name, 'friend'))
                  }, [
                    _createElementVNode("div", _hoisted_18, [
                      _createElementVNode("div", _hoisted_19, _toDisplayString(friend.name.charAt(0)), 1)
                    ]),
                    _createElementVNode("div", _hoisted_20, [
                      _createElementVNode("div", _hoisted_21, _toDisplayString(friend.name), 1),
                      _createElementVNode("div", _hoisted_22, _toDisplayString(friend.wxid || `wx_${friend.name}`), 1),
                      (friend.tags && friend.tags.length > 0)
                        ? (_openBlock(), _createElementBlock("div", _hoisted_23, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(friend.tags.slice(0, 2), (tag) => {
                              return (_openBlock(), _createBlock(_component_el_tag, {
                                key: tag,
                                size: "small",
                                type: "info"
                              }, {
                                default: _withCtx(() => [
                                  _createTextVNode(_toDisplayString(tag), 1)
                                ]),
                                _: 2
                              }, 1024))
                            }), 128)),
                            (friend.tags.length > 2)
                              ? (_openBlock(), _createElementBlock("span", _hoisted_24, "+" + _toDisplayString(friend.tags.length - 2), 1))
                              : _createCommentVNode("", true)
                          ]))
                        : _createCommentVNode("", true)
                    ])
                  ], 10, _hoisted_17))
                }), 128))
              ]))
            : (_openBlock(), _createElementBlock("div", _hoisted_25, [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(filteredList.value, (group) => {
                  return (_openBlock(), _createElementBlock("div", {
                    key: group.name,
                    class: _normalizeClass(["group-item", { 'selected': isSelected(group.name) }]),
                    onClick: ($event: any) => (toggleSelection(group.name, 'group'))
                  }, [
                    _createElementVNode("div", _hoisted_27, [
                      _createElementVNode("div", _hoisted_28, _toDisplayString(group.name.charAt(0)), 1)
                    ]),
                    _createElementVNode("div", _hoisted_29, [
                      _createElementVNode("div", _hoisted_30, _toDisplayString(group.name), 1),
                      (group.tag)
                        ? (_openBlock(), _createElementBlock("div", _hoisted_31, [
                            _createVNode(_component_el_tag, {
                              size: "small",
                              type: "info"
                            }, {
                              default: _withCtx(() => [
                                _createTextVNode(_toDisplayString(group.tag), 1)
                              ]),
                              _: 2
                            }, 1024)
                          ]))
                        : _createCommentVNode("", true)
                    ])
                  ], 10, _hoisted_26))
                }), 128))
              ])),
          (filteredList.value.length === 0 && !loading.value)
            ? (_openBlock(), _createElementBlock("div", _hoisted_32, [
                _cache[15] || (_cache[15] = _createElementVNode("div", { class: "empty-icon" }, "📭", -1)),
                _createElementVNode("div", _hoisted_33, "请先同步" + _toDisplayString(activeType.value === 'friends' ? '好友' : '群聊') + "数据", 1)
              ]))
            : _createCommentVNode("", true)
        ])), [
          [_directive_loading, loading.value]
        ])
      ]),
      _createElementVNode("div", _hoisted_34, [
        _createVNode(SelectedTargetsPanel, {
          "selected-friends": selectedFriends.value,
          "selected-groups": selectedGroups.value,
          onRemoveFriend: removeFriend,
          onRemoveGroup: removeGroup,
          onClearAll: clearAllSelections,
          onSetGroupTag: openSetGroupTagDialog,
          "group-tag-enabled": _unref(isActionEnabled)('customer.group.tag'),
          "group-tag-disabled-reason": _unref(actionReason)('customer.group.tag'),
          class: "targets-panel"
        }, null, 8, ["selected-friends", "selected-groups", "group-tag-enabled", "group-tag-disabled-reason"]),
        _createVNode(OperationsPanel, {
          "selected-friends": selectedFriends.value,
          "selected-groups": selectedGroups.value,
          "mass-send-enabled": _unref(isActionEnabled)('customer.message.mass-send'),
          "mass-send-disabled-reason": _unref(actionReason)('customer.message.mass-send'),
          "batch-group-enabled": _unref(isActionEnabled)('customer.group.invite'),
          "batch-group-disabled-reason": _unref(actionReason)('customer.group.invite'),
          "auto-follow-enabled": _unref(isActionEnabled)('customer.follow.create'),
          "auto-follow-disabled-reason": _unref(actionReason)('customer.follow.create'),
          "sync-enabled": _unref(isActionEnabled)('customer.sync.open'),
          "sync-disabled-reason": _unref(actionReason)('customer.sync.open'),
          "scheduled-sync-enabled": _unref(isActionEnabled)('customer.sync.schedule'),
          onMassSend: handleMassSending,
          onBatchGroup: handleBatchInvite,
          onAutoFollow: handleAutoFollow,
          onBatchTag: handleBatchTag,
          onDelete: handleDeleteContacts,
          onOpenSettings: handleShowSettings,
          class: "operations-panel"
        }, null, 8, ["selected-friends", "selected-groups", "mass-send-enabled", "mass-send-disabled-reason", "batch-group-enabled", "batch-group-disabled-reason", "auto-follow-enabled", "auto-follow-disabled-reason", "sync-enabled", "sync-disabled-reason", "scheduled-sync-enabled"])
      ])
    ]),
    _createVNode(CreateTaskDialog, {
      modelValue: showCreateDialog.value,
      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((showCreateDialog).value = $event)),
      "selected-friends": selectedFriends.value,
      "selected-groups": selectedGroups.value,
      "wechat-nickname": (activeInstances.value.find(inst => inst.account_id === selectedAccountId.value)?.nickname) || '',
      "is-from-sop": false,
      onCreate: handleCreateTask
    }, null, 8, ["modelValue", "selected-friends", "selected-groups", "wechat-nickname"]),
    _createVNode(_component_el_dialog, {
      modelValue: showGroupSelectDialog.value,
      "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((showGroupSelectDialog).value = $event)),
      title: "选择目标群聊",
      width: "50%"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_36, [
          _createVNode(_component_el_button, {
            onClick: _cache[6] || (_cache[6] = ($event: any) => (showGroupSelectDialog.value = false))
          }, {
            default: _withCtx(() => [...(_cache[16] || (_cache[16] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            onClick: confirmInviteToGroup,
            disabled: !selectedTargetGroup.value
          }, {
            default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
              _createTextVNode("确认", -1)
            ]))]),
            _: 1
          }, 8, ["disabled"])
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_35, [
          _createVNode(_component_el_select, {
            modelValue: selectedTargetGroup.value,
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((selectedTargetGroup).value = $event)),
            placeholder: "请选择目标群聊",
            filterable: "",
            style: {"width":"100%"}
          }, {
            default: _withCtx(() => [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(groupList.value, (group) => {
                return (_openBlock(), _createBlock(_component_el_option, {
                  key: group.name,
                  label: group.name,
                  value: group.name
                }, null, 8, ["label", "value"]))
              }), 128))
            ]),
            _: 1
          }, 8, ["modelValue"])
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: showSetGroupTagDialog.value,
      "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event: any) => ((showSetGroupTagDialog).value = $event)),
      title: "设置群标签",
      width: "500px",
      class: "group-tag-dialog"
    }, {
      footer: _withCtx(() => [
        _createElementVNode("span", _hoisted_40, [
          _createVNode(_component_el_button, {
            onClick: _cache[9] || (_cache[9] = ($event: any) => (showSetGroupTagDialog.value = false))
          }, {
            default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            disabled: !canConfirmSetGroupTag.value,
            onClick: confirmSetGroupTag
          }, {
            default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
              _createTextVNode("确认", -1)
            ]))]),
            _: 1
          }, 8, ["disabled"])
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_37, [
          _cache[20] || (_cache[20] = _createElementVNode("div", { class: "dialog-tip" }, [
            _createElementVNode("div", null, "批量设置群标签，以便绑定AI智能体进行回复"),
            _createElementVNode("div", null, "如果群聊已绑定标签，重新设置会直接覆盖~")
          ], -1)),
          _createElementVNode("div", _hoisted_38, [
            _cache[18] || (_cache[18] = _createElementVNode("span", { class: "label" }, "群聊：", -1)),
            _createTextVNode(" " + _toDisplayString(groupTagDialogTargetsText.value), 1)
          ]),
          _createElementVNode("div", _hoisted_39, [
            _cache[19] || (_cache[19] = _createElementVNode("span", { class: "label" }, "标签：", -1)),
            _createVNode(_component_el_input, {
              modelValue: inputGroupTag.value,
              "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event: any) => ((inputGroupTag).value = $event)),
              maxlength: "10",
              "show-word-limit": "",
              placeholder: "请输入标签（1-10个字符，支持中英文/数字）"
            }, null, 8, ["modelValue"])
          ])
        ])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(SyncContactsDialog, {
      modelValue: showSyncDialog.value,
      "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event: any) => ((showSyncDialog).value = $event)),
      accounts: activeInstances.value,
      "default-account-id": selectedAccountId.value,
      "friend-sync-enabled": _unref(isActionEnabled)('customer.sync.friends'),
      "group-sync-enabled": _unref(isActionEnabled)('customer.sync.groups'),
      "friend-sync-disabled-reason": _unref(actionReason)('customer.sync.friends'),
      "group-sync-disabled-reason": _unref(actionReason)('customer.sync.groups'),
      "scheduled-sync-enabled": _unref(isActionEnabled)('customer.sync.schedule'),
      "scheduled-sync-disabled-reason": _unref(actionReason)('customer.sync.schedule'),
      onSync: handleSync
    }, null, 8, ["modelValue", "accounts", "default-account-id", "friend-sync-enabled", "group-sync-enabled", "friend-sync-disabled-reason", "group-sync-disabled-reason", "scheduled-sync-enabled", "scheduled-sync-disabled-reason"]),
    _createVNode(AutoFollowConfigDialog, {
      modelValue: showAutoFollowConfigDialog.value,
      "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event: any) => ((showAutoFollowConfigDialog).value = $event)),
      "selected-friends": selectedFriends.value,
      "selected-groups": selectedGroups.value,
      onCreate: handleCreateAutoFollowTask
    }, null, 8, ["modelValue", "selected-friends", "selected-groups"])
  ]))
}
}

})