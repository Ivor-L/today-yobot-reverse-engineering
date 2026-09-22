<template>
  <div class="customer-management-container">
    <!-- 顶部筛选区域 -->
    <div class="filter-bar">
      <div class="filter-content">
        <!-- 左侧：好友/群聊切换 -->
        <div class="tab-switch">
          <el-radio-group v-model="activeType" @change="handleTypeChange" class="type-tabs">
            <el-radio-button
              value="friends"
              :disabled="!isActionEnabled('customer.view.friends')"
              :title="actionReason('customer.view.friends')"
            >好友</el-radio-button>
            <el-radio-button
              value="groups"
              :disabled="!isActionEnabled('customer.view.groups')"
              :title="actionReason('customer.view.groups')"
            >群聊</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 右侧：微信账号选择和标签筛选 -->
        <div class="filter-controls">
          <!-- 微信账号选择 -->
          <el-select
            v-model="selectedAccountId"
            v-if="activeInstances.length > 1"
            placeholder="选择微信账号"
            @change="handleAccountChange"
            class="account-select"
            size="default"
          >
            <el-option
              v-for="instance in activeInstances"
              :key="instance.account_id"
              :label="instance.nickname"
              :value="instance.account_id"
            >
              <span class="account-option">
                <span class="nickname">{{ instance.nickname }}</span>
                <span class="account-id">{{ instance.account_id }}</span>
              </span>
            </el-option>
          </el-select>

          <!-- 标签筛选 -->
          <el-select
            v-model="selectedTag"
            placeholder="选择标签"
            @change="handleTagChange"
            class="tag-select"
            size="default"
            :popper-class="'tag-dropdown'"
          >
            <el-option label="全部" value="__ALL__" />
            <el-option
              v-for="tag in tagList"
              :key="tag.id"
              :label="`${tag.name} (${tag.count})`"
              :value="tag.name"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-grid">
      <!-- 左侧：好友/群聊列表 -->
      <div class="contact-list">
        <div class="list-header">
          <div class="search-box">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索好友或群聊"
              @input="handleSearch"
              clearable
              size="default"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="list-count-row">
            <span class="list-count">
              {{ activeType === 'friends' ? '好友' : '群聊' }} ({{ filteredList.length }})
            </span>
            <el-button 
              link
              size="small"
              @click="toggleSelectAll"
              :disabled="filteredList.length === 0">
              {{ isAllSelected ? '取消全选' : '全选' }}
            </el-button>
          </div>
        </div>

        <div class="list-content" v-loading="loading">
          <!-- 好友列表 -->
          <div v-if="activeType === 'friends'" class="friends-list">
            <div
              v-for="friend in filteredList"
              :key="friend.name"
              class="friend-item"
              :class="{ 'selected': isSelected(friend.name) }"
              @click="toggleSelection(friend.name, 'friend')"
            >
              <div class="friend-avatar">
                <div class="avatar-placeholder">
                  {{ friend.name.charAt(0) }}
                </div>
                <!-- <div v-if="friend.is_new" class="new-badge">
                  <img src="/icon/new_friend.png" alt="新好友" class="new-badge-icon" />
                </div> -->
              </div>
              <div class="friend-info">
                <div class="friend-name">{{ friend.name }}</div>
                <div class="friend-wxid">{{ friend.wxid || `wx_${friend.name}` }}</div>
                <div v-if="friend.tags && friend.tags.length > 0" class="friend-tags">
                  <el-tag
                    v-for="tag in friend.tags.slice(0, 2)"
                    :key="tag"
                    size="small"
                    type="info"
                  >
                    {{ tag }}
                  </el-tag>
                  <span v-if="friend.tags.length > 2" class="more-tags">+{{ friend.tags.length - 2 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 群聊列表 -->
          <div v-else class="groups-list">
            <div
              v-for="group in filteredList"
              :key="group.name"
              class="group-item"
              :class="{ 'selected': isSelected(group.name) }"
              @click="toggleSelection(group.name, 'group')"
            >
              <div class="group-avatar">
                <div class="avatar-placeholder group-avatar-bg">
                  {{ group.name.charAt(0) }}
                </div>
              </div>
              <div class="group-info">
                <div class="group-name">{{ group.name }}</div>
                <div v-if="group.tag" class="friend-tags">
                  <el-tag size="small" type="info">
                    {{ group.tag }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="filteredList.length === 0 && !loading" class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-text">请先同步{{ activeType === 'friends' ? '好友' : '群聊' }}数据</div>
          </div>
        </div>
      </div>

      <!-- 右侧：上下分布区域 -->
      <div class="right-section">
        <!-- 上方：选中目标展示 -->
        <SelectedTargetsPanel
          :selected-friends="selectedFriends"
          :selected-groups="selectedGroups"
          @remove-friend="removeFriend"
          @remove-group="removeGroup"
          @clear-all="clearAllSelections"
          @set-group-tag="openSetGroupTagDialog"
          :group-tag-enabled="isActionEnabled('customer.group.tag')"
          :group-tag-disabled-reason="actionReason('customer.group.tag')"
          class="targets-panel"
        />

        <!-- 下方：操作区域 -->
        <OperationsPanel
          :selected-friends="selectedFriends"
          :selected-groups="selectedGroups"
          :mass-send-enabled="isActionEnabled('customer.message.mass-send')"
          :mass-send-disabled-reason="actionReason('customer.message.mass-send')"
          :batch-group-enabled="isActionEnabled('customer.group.invite')"
          :batch-group-disabled-reason="actionReason('customer.group.invite')"
          :auto-follow-enabled="isActionEnabled('customer.follow.create')"
          :auto-follow-disabled-reason="actionReason('customer.follow.create')"
          :sync-enabled="isActionEnabled('customer.sync.open')"
          :sync-disabled-reason="actionReason('customer.sync.open')"
          :scheduled-sync-enabled="isActionEnabled('customer.sync.schedule')"
          @mass-send="handleMassSending"
          @batch-group="handleBatchInvite"
          @auto-follow="handleAutoFollow"
          @batch-tag="handleBatchTag"
          @delete="handleDeleteContacts"
          @open-settings="handleShowSettings"
          class="operations-panel"
        />
      </div>
    </div>

    <!-- 群发消息弹窗 -->
    <CreateTaskDialog
      v-model="showCreateDialog"
      :selected-friends="selectedFriends"
      :selected-groups="selectedGroups"
      :wechat-nickname="(activeInstances.find(inst => inst.account_id === selectedAccountId)?.nickname) || ''"
      :is-from-sop="false"
      @create="handleCreateTask"
    />

    <!-- 批量拉群弹窗 -->
    <el-dialog
      v-model="showGroupSelectDialog"
      title="选择目标群聊"
      width="50%"
    >
      <div class="group-select-container">
        <el-select
          v-model="selectedTargetGroup"
          placeholder="请选择目标群聊"
          filterable
          style="width: 100%"
        >
          <el-option
            v-for="group in groupList"
            :key="group.name"
            :label="group.name"
            :value="group.name"
          />
        </el-select>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showGroupSelectDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmInviteToGroup" :disabled="!selectedTargetGroup">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showSetGroupTagDialog"
      title="设置群标签"
      width="500px"
      class="group-tag-dialog"
    >
      <div class="set-group-tag-dialog">
        <div class="dialog-tip">
          <div>批量设置群标签，以便绑定AI智能体进行回复</div>
          <div>如果群聊已绑定标签，重新设置会直接覆盖~</div>
        </div>
        <div class="dialog-targets">
          <span class="label">群聊：</span>
          {{ groupTagDialogTargetsText }}
        </div>
        <div class="dialog-input">
          <span class="label">标签：</span>
          <el-input
            v-model="inputGroupTag"
            maxlength="10"
            show-word-limit
            placeholder="请输入标签（1-10个字符，支持中英文/数字）"
          />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSetGroupTagDialog = false">取消</el-button>
          <el-button type="primary" :disabled="!canConfirmSetGroupTag" @click="confirmSetGroupTag">确认</el-button>
        </span>
      </template>
    </el-dialog>
    <!-- 同步通讯录弹窗 -->
    <sync-contacts-dialog
      v-model="showSyncDialog"
      :accounts="activeInstances"
      :default-account-id="selectedAccountId"
      :friend-sync-enabled="isActionEnabled('customer.sync.friends')"
      :group-sync-enabled="isActionEnabled('customer.sync.groups')"
      :friend-sync-disabled-reason="actionReason('customer.sync.friends')"
      :group-sync-disabled-reason="actionReason('customer.sync.groups')"
      :scheduled-sync-enabled="isActionEnabled('customer.sync.schedule')"
      :scheduled-sync-disabled-reason="actionReason('customer.sync.schedule')"
      @sync="handleSync"
    />

    <!-- 自动跟单配置弹窗 -->
    <AutoFollowConfigDialog
      v-model="showAutoFollowConfigDialog"
      :selected-friends="selectedFriends"
      :selected-groups="selectedGroups"
      @create="handleCreateAutoFollowTask"
    />
  </div>
</template>

<script setup lang="ts">
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
</script>

<style scoped>
.customer-management-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  overflow: hidden;
  position: relative;
}

/* 顶部筛选区域 */
.filter-bar {
  background: white;
  border-radius: 0;
  padding: 20px 0;
  margin: 0 -18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  width: calc(100% + 48px);
}

.filter-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 48px;
}

.type-tabs {
  display: flex;
  gap: 12px;
}

.type-tabs :deep(.el-radio-button__inner) {
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s ease;
}

.type-tabs :deep(.el-radio-button__inner:hover) {
  background: #e5e7eb;
  color: #374151;
}

.type-tabs :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  color: white;
  box-shadow: 0 4px 12px rgba(30, 58, 138, 0.25);
}

.filter-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.account-select, .tag-select {
  min-width: 140px;
}

.account-select :deep(.el-input__wrapper),
.tag-select :deep(.el-input__wrapper) {
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.25s ease;
}

.account-select :deep(.el-input__wrapper:hover),
.tag-select :deep(.el-input__wrapper:hover) {
  border-color: #1e3a8a;
}

.account-select :deep(.el-input__wrapper.is-focus),
.tag-select :deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.account-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nickname {
  font-weight: 500;
}

.account-id {
  font-size: 12px;
  color: #1890ff;
  background: rgba(24, 144, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

/* 主要内容区域 */
.content-grid {
  display: flex;
  gap: 10px;
  flex: 1;
  overflow: hidden;
  height: calc(100% - 80px);
  width: 100%;
  margin: 0;
  padding: 10px;
}

/* 左侧联系人列表 - 严格占1/3宽度 */
.contact-list {
  background: white;
  border-radius: 16px;
  padding: 5px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  width: 30%;
  flex-shrink: 0;
  min-width: 250px;
  max-width: 35%;
}

/* 右侧区域 - 严格占2/3宽度，上下分布 */
.right-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: hidden;
}

/* 上方：选中目标展示 - 占右侧高度的60% */
.targets-panel {
  flex: 0 0 60%;
  min-height: 200px;
  width: 100%;
}

/* 下方：操作区域 - 占右侧高度的40% */
.operations-panel {
  flex: 1;
  min-height: 150px;
  width: 100%;
}

.list-header {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.search-box {
  margin-bottom: 12px;
}

.list-count-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-count {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

/* 好友列表项 */
.friend-item, .group-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-bottom: 8px;
  position: relative;
  border: 1px solid transparent;
  background: #fafbfc;
}

.friend-item:hover, .group-item:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.friend-item.selected, .group-item.selected {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(30, 58, 138, 0.08));
  border: 1.5px solid #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
}

.friend-avatar, .group-avatar {
  position: relative;
  margin-right: 12px;
}

.avatar-placeholder {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.group-avatar-bg {
  background: linear-gradient(135deg, #7dd3fc, #3b82f6);
  box-shadow: 0 2px 8px rgba(125, 211, 252, 0.25);
}

.new-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  z-index: 2;
}

.new-badge-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.friend-info, .group-info {
  flex: 1;
  min-width: 0;
}

.friend-name, .group-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-wxid, .group-member-count {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
  font-family: 'Courier New', monospace;
}

.friend-tags {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}

.more-tags {
  font-size: 12px;
  color: #999;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 10px;
  color: #a0aec0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}

/* 弹窗样式 */
.group-select-container {
  padding: 10px 0;
}

.dialog-footer {
  display: flex;
  gap: 12px;
}

.set-group-tag-dialog .dialog-tip {
  background: #f5f7fa;
  color: #606266;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}
.set-group-tag-dialog .dialog-targets {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.set-group-tag-dialog .dialog-input {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.set-group-tag-dialog .dialog-input .label {
  min-width: 48px;
  text-align: right;
  color: #606266;
  font-weight: bold;
}
.set-group-tag-dialog .dialog-targets .label {
  min-width: 48px;
  text-align: right;
  color: #606266;
  font-weight: bold;
}

/* 对齐现有弹窗与OperationsPanel的风格 */
:deep(.el-dialog__header) {
  padding-bottom: 20px;
  margin-bottom: 0;
  display: flex;
  justify-content: center;
}
:deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 16px;
  color: #1f2937;
  text-align: center;
}
:deep(.el-dialog__footer) {
  padding-top: 20px;
  display: flex;
  justify-content: center;
}
/* .set-group-tag-dialog :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}
.set-group-tag-dialog :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px #3b82f6 inset;
} */
.set-group-tag-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.set-group-tag-dialog .dialog-tip {
  background: #f5f7fa;
  color: #606266;
  padding: 12px;
  border-radius: 8px;
  line-height: 1.7;
}
.set-group-tag-dialog .dialog-input :deep(.el-input) {
  flex: 1;
}
/* 标签下拉弹层样式优化，处理长标签展示 */
:deep(.tag-dropdown) {
  max-width: 420px;
}
:deep(.tag-dropdown .el-select-dropdown__item) {
  white-space: normal;
  word-break: break-word;
}


</style>
