<template>
    <el-dialog
      v-model="dialogVisible"
      :width="windowWidth <= 700 ? '95%' : '700px'"
    >
      <template #header>
        <div class="dialog-header">
          <span class="dialog-title">AI助理配置</span>
          <!-- <span class="dialog-subtitle">配置修改后，立即生效！</span> -->
        </div>
      </template>
      <el-alert
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom: 10px;"
      >
        <span>向托管微信的“文件传输助手”发送指令，可以实现手机远程关闭或启用AI助理，详见操作指南说明</span>
      </el-alert>
      <div class="strategy-content">
        <!-- AI助理列表 -->
        <div class="config-section">
          <div class="section-header">
            <div class="title-group">
              <h3>AI助理配置</h3>
              <p class="description">配置不同场景下的AI助理</p>
            </div>
            <el-button 
              type="primary" 
              size="small"
              @click="showAddStaffDialog"
              class="add-staff-btn"
              round
              :disabled="staffList.length >= 5"
            >
              <el-icon><Plus /></el-icon>
              <span>AI助理</span>
            </el-button>
          </div>
          
          <div class="staff-list">
            <el-empty v-if="staffList.length === 0" description="暂未配置AI助理" />
            <div v-else class="staff-item" v-for="(staff, index) in staffList" :key="index">
              <div class="staff-info">
                <!-- 添加 AI 员工图标 -->
                <div class="staff-icon">
                  <img :src="getStatefulPngIconPath('ai_assistant', staff.chatType === 'single')" />
                </div>
                <div class="staff-details">
                  <div class="staff-name">{{ staff.name }}</div>
                  <div class="staff-tags">
                    <el-tag size="small" :type="getChatTypeTagType(staff.chatType)">{{ getChatTypeText(staff.chatType) }}</el-tag>
                    <el-tag size="small" type="success" v-if="staff.selectedTags.length > 0">{{ getTagsText(staff.selectedTags) }}</el-tag>
                  </div>
                </div>
              </div>
              <div class="staff-actions">
                <el-tooltip
                  :content="staff.enabled ? 'AI助理已启用' : 'AI助理未启用'"
                  placement="top"
                  effect="light"
                >
                  <el-switch v-model="staff.enabled" @change="saveStrategy" />
                </el-tooltip>
                <el-button type="primary" text @click="editStaff(index)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button type="danger" text @click="deleteStaff(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 通用配置 -->
        <div class="config-section">
          <el-collapse v-model="activeCollapse">
            <el-collapse-item title="通用配置（修改完后记得点保存）" name="common">
              <!-- 新好友通过申请后执行运营SOP -->
              <div class="common-config-item">
                <h3>新好友运营SOP</h3>
                <p class="description">检测到对方通过了你的好友申请后，按所选运营SOP依次执行动作（如先发打招呼再拉群）</p>
                <el-select
                  v-model="commonConfig.friendPassSopId"
                  placeholder="不执行"
                  clearable
                  class="greeting-select"
                  @change="saveStrategy"
                >
                  <el-option
                    v-for="sop in sopList"
                    :key="sop.id"
                    :label="sop.name"
                    :value="sop.id"
                  />
                </el-select>
              </div>
              
              <!-- 群聊配置 -->
              <div class="common-config-item">
                <h3>群聊配置</h3>
                <p class="description">设置群聊中的回复行为和忽略规则</p>
                <!-- 子项1：群聊被@才回复 -->
                <div class="form-item group-sub-item">
                  <el-checkbox v-model="commonConfig.groupAtOnly">群聊被@时才回复</el-checkbox>
                </div>

                <el-divider class="group-sub-divider" />

                <!-- 子项2：新建群聊执行运营SOP -->
                <div class="form-item group-sub-item">
                  <h4 style="margin: 0 0 4px;">新建群聊运营SOP</h4>
                  <p class="description">检测到本账号新进入一个群聊后，按所选运营SOP依次执行动作</p>
                  <el-select
                    v-model="commonConfig.groupJoinSopId"
                    placeholder="不执行"
                    clearable
                    class="greeting-select"
                    @change="saveStrategy"
                  >
                    <el-option
                      v-for="sop in sopList"
                      :key="sop.id"
                      :label="sop.name"
                      :value="sop.id"
                    />
                  </el-select>
                </div>

                <el-divider class="group-sub-divider" />

                <!-- 子项3：群同事过滤 -->
                <div class="form-item group-sub-item">
                  <h4 style="margin: 0 0 4px;">群同事过滤</h4>
                  <p class="description">录入群同事名单后，群聊中这些同事的消息会被自动忽略</p>
                  <el-input
                    v-model="commonConfig.colleagueNamesToIgnore"
                    placeholder="录入群聊同事名单，会自动忽略群中同事的消息"
                    clearable
                  ></el-input>
                  <p class="el-form-item__hint" style="font-size: 12px; color: #909399; line-height: 1.5; margin-top: 5px;">
                    多个同事名单用双斜杠"//"分隔开，输入后自动保存。
                  </p>
                </div>
              </div>
              
              <!-- 白名单配置 -->
              <div class="common-config-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <h3>白名单</h3>
                    <p class="description">开启后，仅回复白名单中的好友或群聊</p>
                  </div>
                  <el-switch v-model="commonConfig.whitelist.enabled"/>
                </div>
                
                <!-- 当启用白名单时显示输入框 -->
                <div v-if="commonConfig.whitelist.enabled" class="whitelist-input">
                  <el-input
                    v-model="commonConfig.whitelist.names"
                    type="textarea"
                    :rows="3"
                    placeholder='输入好友昵称或群名并用双斜杠"//"隔开，如：张三//测试一群'
                  />
                  <p class="input-tip">输入好友昵称或群名并用双斜杠"//"隔开，如：张三//测试一群</p>
                </div>
              </div>
              
              <!-- 过滤词配置 -->
              <div class="common-config-item">
                <div class="section-header">
                  <div class="title-group">
                    <h3>回复过滤词</h3>
                    <p class="description">AI生成的回复中包含过滤词（全匹配）时，将不会发送给用户</p>
                  </div>
                  <el-button 
                    type="primary" 
                    size="small"
                    @click="addFilterWord"
                    :disabled="commonConfig.filterWords.length >= 5"
                  >
                    添加过滤词
                  </el-button>
                </div>
                <div class="form-item">
                  <div class="filter-words-list">
                    <el-tag
                      v-for="(word, index) in commonConfig.filterWords"
                      :key="index"
                      closable
                      @close="removeFilterWord(index)"
                    >
                      {{ word }}
                    </el-tag>
                    <el-input
                      v-if="filterWordInputVisible"
                      ref="filterWordInputRef"
                      v-model="filterWordInputValue"
                      class="keyword-input"
                      size="small"
                      @keyup.enter="confirmFilterWord"
                      @blur="confirmFilterWord"
                    />
                  </div>
                </div>
              </div>
              
              <!-- 文件识别配置 -->
              <div class="common-config-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <h3>识别文件</h3>
                    <p class="description">开启后可以识别消息的文件并上传到Coze</p>
                  </div>
                  <el-switch v-model="commonConfig.fileRecognition.enabled"/>
                </div>
                
                <!-- 当启用文件识别时显示配置选项 -->
                <div v-if="commonConfig.fileRecognition.enabled" class="file-recognition-config">
                    <div class="form-item">
                      <h4>文件类型</h4>
                      <el-checkbox-group v-model="commonConfig.fileRecognition.fileTypes">
                        <el-checkbox label="word">Word</el-checkbox>
                        <el-checkbox label="pdf">PDF</el-checkbox>
                        <el-checkbox label="excel">Excel</el-checkbox>
                        <el-checkbox label="image">图片</el-checkbox>
                      </el-checkbox-group>
                    </div>
                    
                    <div class="form-item">
                      <div class="path-input-header">
                        <h4>文件目录</h4>
                        <el-tooltip 
                          effect="dark" 
                          content="Windows 填微信账号目录；macOS 填 xwechat_files/wxid_xxx 目录。最后一级必须对应当前登录账号"
                          placement="top"
                        >
                          <el-icon><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </div>
                      <el-input 
                        v-model="commonConfig.fileRecognition.filePath" 
                        placeholder="请输入微信文件夹路径"
                        @change="saveStrategy"
                      />
                    </div>
                  </div>
                </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
  
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveStrategy">保存配置</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- AI助理添加/编辑弹窗 -->
    <staff-dialog
      v-model:visible="staffDialogVisible"
      :staff="currentStaff"
      :is-edit="isEditMode"
      :coze-agents="props.cozeAgents"
      :contact-tags="contactTags"
      :group-tags="groupTags"
      :has-group-staff="hasGroupStaff"
      :mention-reply-supported="mentionReplySupported"
      :auto-join-group-supported="autoJoinGroupSupported"
      @save="handleStaffSave"
    />
  </template>
  
  <script setup lang="ts">
  import { ref, computed, nextTick, onMounted, onUnmounted, PropType,watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { getContactTags, getGroups, Tag } from '@/api/contact'
  import { saveConfig, getConfig } from '@/api/config'
  import { loadSops } from '@/api/sop'
  import type { Sop } from '@/types/sop'
  import StaffDialog from './StaffDialog.vue'
  import {Edit, Delete, QuestionFilled,Plus } from '@element-plus/icons-vue'
  import { getStatefulPngIconPath } from '@/utils/iconImages'
  import { useRuntimeCapabilityStore } from '@/store/runtimeCapabilities'
  import { isMacStrictRuntime } from '@/runtime/capabilities/settings'
  
  const windowWidth = ref(window.innerWidth)
  const handleResize = () => {
    windowWidth.value = window.innerWidth
  }
  
  // 定义组件属性
  const props = defineProps({
    visible: {
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
    }
  })
  
  // 添加话术组接口定义
  interface GreetingGroup {
    id: string
    name: string
    greetings: Array<{
      type: 'text' | 'file'
      content: string
      filePath?: string
    }>
  }
  
  // 定义AI助理接口
  interface AIStaff {
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
  }
  
  // 定义通用配置接口
  interface CommonConfig {
    groupAtOnly: boolean
    colleagueNamesToIgnore: string
    filterWords: string[]
    // 旧版"新好友自动打招呼"配置，UI 已由"新好友运营SOP"替代；
    // 仍保留字段透传，避免老客户进入新页保存后丢失既有配置（后端兼容垫片仍读取）。
    autoGreeting: {
      enabled: boolean
      greetingGroupId: string
    }
    friendPassSopId: string
    groupJoinSopId: string
    fileRecognition: {
      enabled: boolean
      fileTypes: string[]
      filePath: string
    }
    whitelist: {
      enabled: boolean
      names: string
      list: string[]
    }
  }
  
  // 定义组件事件
  const emit = defineEmits(['update:visible', 'save'])
  const runtimeCapabilityStore = useRuntimeCapabilityStore()
  const mentionReplySupported = computed(() => {
    if (!isMacStrictRuntime(
      runtimeCapabilityStore.mode,
      runtimeCapabilityStore.snapshot?.platform
    )) return true
    const state = runtimeCapabilityStore.capabilities?.['group.member.mention_reply']
    return state?.status === 'supported' || state?.status === 'experimental'
  })
  const autoJoinGroupSupported = computed(() => {
    if (!isMacStrictRuntime(
      runtimeCapabilityStore.mode,
      runtimeCapabilityStore.snapshot?.platform
    )) return true
    const state = runtimeCapabilityStore.capabilities?.['group.invite.join']
    return state?.status === 'supported' || state?.status === 'experimental'
  })
  
  // 对话框可见性
  const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })
  const hasGroupStaff = computed(() => {
  // 如果是编辑模式，且当前编辑的就是群聊类型，则不算已存在
  if (isEditMode.value && currentStaff.value?.chatType === 'group') {
    const otherStaffs = staffList.value.filter((_, index) => index !== editingIndex.value)
    return otherStaffs.some(staff => staff.chatType === 'group')
  }
  // 否则检查所有员工中是否有群聊类型
  return staffList.value.some(staff => staff.chatType === 'group')
})
  // 添加对话框可见性的监听
  watch(dialogVisible, async (newVal) => {
    if (newVal) {
      // 当对话框显示时，重新加载配置
      await loadConfig()
      await loadGreetingGroups()
      await loadSopList()
    }
  })
  // 折叠面板激活的项
  const activeCollapse = ref(['common'])
  
  // AI助理列表
  const staffList = ref<AIStaff[]>([])
  
  // 通用配置
  const commonConfig = ref<CommonConfig>({
    groupAtOnly: false,
    colleagueNamesToIgnore: '',
    filterWords: [],
    autoGreeting: {
      enabled: false,
      greetingGroupId: ''
    },
    friendPassSopId: '',
    groupJoinSopId: '',
    fileRecognition: {
      enabled: false,
      fileTypes: [],
      filePath: ''
    },
    whitelist: {
      enabled: false,
      names: '',
      list: []
    }
  })
  
  // 添加话术组数据
  const greetingGroups = ref<GreetingGroup[]>([])

  // 运营SOP列表（供"进群后执行运营SOP"选择）
  const sopList = ref<Sop[]>([])
  const loadSopList = async () => {
    try {
      sopList.value = await loadSops()
    } catch (e) {
      console.error('加载运营SOP列表失败:', e)
    }
  }
  
  // 联系人标签
  const contactTags = ref<Tag[]>([])
  const groupTags = ref<Tag[]>([])
  
  // 过滤词输入控制
  const filterWordInputVisible = ref(false)
  const filterWordInputValue = ref('')
  const filterWordInputRef = ref<HTMLInputElement | null>(null)
  
  // AI助理弹窗控制
  const staffDialogVisible = ref(false)
  const isEditMode = ref(false)
  const currentStaff = ref<AIStaff | undefined>(undefined)
  const editingIndex = ref(-1)
  
  // 加载数据
  onMounted(async () => {
    try {
      // 加载联系人标签
      contactTags.value = await getContactTags()
      try {
        const groups = await getGroups()
        const counter = new Map<string, number>()
        groups.forEach((g: any) => {
          const t = (g?.tag || '').trim()
          if (t) counter.set(t, (counter.get(t) || 0) + 1)
        })
        groupTags.value = Array.from(counter.entries()).map(([name, count]) => ({
          id: name,
          name,
          count
        }))
      } catch (e) {}
      await loadGreetingGroups()
      // 加载已保存的配置
      await loadConfig()
      window.addEventListener('resize', handleResize)
    } catch (error) {
      console.error('加载配置失败:', error)
      ElMessage.error('加载配置失败')
    }
  })
  
  // 组件卸载时移除事件监听
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
  
  // 加载话术组方法
  const loadGreetingGroups = async () => {
    try {
      const result = await getConfig('greeting_config')
      const config = result?.data?.greeting_config?.greeting_config
      if (Array.isArray(config)) {
        greetingGroups.value = config.map((group) => ({
          id: group.name,
          name: group.name,
          greetings: Array.isArray(group.greetings) ? group.greetings : []
        }))
      }
    } catch (error) {
      console.error('加载话术组失败:', error)
      ElMessage.error('加载话术组失败')
    }
  }
  
  // 加载配置
  const loadConfig = async () => {
    try {
      const result = await getConfig('reply_strategy_v2')
      if (result?.success && result?.data) {
        // 加载AI助理列表
        staffList.value = result.data.staffList || []
        
        // 加载通用配置
        if (result.data.commonConfig) {
          commonConfig.value = {
            groupAtOnly: result.data.commonConfig.groupAtOnly || false,
            colleagueNamesToIgnore: result.data.commonConfig.colleagueNamesToIgnore || '',
            filterWords: result.data.commonConfig.filterWords || [],
            autoGreeting: {
              enabled: result.data.commonConfig.autoGreeting?.enabled || false,
              greetingGroupId: result.data.commonConfig.autoGreeting?.greetingGroupId || ''
            },
            friendPassSopId: result.data.commonConfig.friendPassSopId || '',
            groupJoinSopId: result.data.commonConfig.groupJoinSopId || '',
            fileRecognition: {
              enabled: result.data.commonConfig.fileRecognition?.enabled || false,
              fileTypes: result.data.commonConfig.fileRecognition?.fileTypes || [],
              filePath: result.data.commonConfig.fileRecognition?.filePath || ''
            },
            whitelist: {
              enabled: result.data.commonConfig.whitelist?.enabled || false,
              names: result.data.commonConfig.whitelist?.names || '',
              list: result.data.commonConfig.whitelist?.list || []
            }
          }
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      ElMessage.error('加载配置失败')
    }
  }
  
  // 保存配置
  const saveStrategy = async () => {
    try {
      // 验证文件识别配置
      if (commonConfig.value.fileRecognition.enabled) {
        const fileTypes = commonConfig.value.fileRecognition.fileTypes
        if (fileTypes.length === 0) {
          ElMessage.error('请至少选择一种文件类型')
          return
        }
        // 图片直接从消息中读取，无需配置微信本地文件目录。
        // 只有勾选了 Word/PDF/Excel 等非图片类型时，才校验目录。
        const needsFilePath = fileTypes.some(type => type !== 'image')
        if (needsFilePath && !commonConfig.value.fileRecognition.filePath.trim()) {
          ElMessage.error('请输入文件目录路径')
          return
        }
        commonConfig.value.fileRecognition.filePath = commonConfig.value.fileRecognition.filePath.trim()
      }
      // 检查白名单配置
      if (commonConfig.value.whitelist.enabled && !commonConfig.value.whitelist.names?.trim()) {
        ElMessage.error('请先输入白名单')
        return
      }
      
      // 处理白名单数据
      if (commonConfig.value.whitelist.enabled) {
        // 每次保存时都重新解析names并更新list
        const namesList = commonConfig.value.whitelist.names
          .split('//')
          .map(name => name.trim())
          .filter(name => name)
        
        // 直接赋值解析后的结果
        commonConfig.value.whitelist.list = namesList
      } else {
        // 如果白名单未启用，清空list
        commonConfig.value.whitelist.list = []
      }
      
      // 构建配置对象
      const config = {
        staffList: staffList.value,
        commonConfig: commonConfig.value
      }
      
      const result = await saveConfig('reply_strategy_v2', config)
      if (result?.success) {
        ElMessage.success('保存成功')
        emit('save')
      } else {
        ElMessage.error('保存失败')
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      ElMessage.error('保存配置失败')
    }
  }
  const getChatTypeTagType = (type: string) => {
    switch (type) {
      case 'single': return 'success' // 单聊使用淡绿色
      case 'group': return 'info'    // 群聊使用淡蓝色
      default: return 'info'
    }
  }
  // 过滤词相关方法
  const addFilterWord = () => {
    filterWordInputVisible.value = true
    nextTick(() => {
      filterWordInputRef.value?.focus()
    })
  }
  
  const confirmFilterWord = () => {
    if (filterWordInputValue.value.trim()) {
      if (!commonConfig.value.filterWords.includes(filterWordInputValue.value.trim())) {
        commonConfig.value.filterWords.push(filterWordInputValue.value.trim())
        saveStrategy()
      }
    }
    filterWordInputVisible.value = false
    filterWordInputValue.value = ''
  }
  
  const removeFilterWord = (index: number) => {
    commonConfig.value.filterWords.splice(index, 1)
    saveStrategy()
  }
  
  // AI助理相关方法
  const showAddStaffDialog = () => {
    if (staffList.value.length >= 5) {
      ElMessage.warning('目前最多支持添加5名AI助理')
      return
    }
    isEditMode.value = false
    currentStaff.value = {
      id: Date.now().toString(),
      name: '',
      enabled: true,
      agentId: '',
      chatType: 'single',
      selectedTags: [],
      keywords: [],
      readGroupMember: false,
      quoteReply: false,
      mentionReply: false,
      monitorOnly: false,
      autoJoinGroup: false
    }
    staffDialogVisible.value = true
  }
  
  const editStaff = (index: number) => {
    isEditMode.value = true
    currentStaff.value = JSON.parse(JSON.stringify(staffList.value[index]))
    editingIndex.value = index
    staffDialogVisible.value = true
  }
  
  const deleteStaff = (index: number) => {
    staffList.value.splice(index, 1)
    saveStrategy()
  }
  
  const handleStaffSave = (staff: AIStaff) => {
    if (isEditMode.value && editingIndex.value !== -1) {
      staffList.value[editingIndex.value] = staff
    } else {
      staffList.value.push(staff)
    }
    staffDialogVisible.value = false
    saveStrategy()
  }
  
  // 辅助方法
  const getChatTypeText = (type: string) => {
    switch (type) {
      case 'single': return '单聊'
      case 'group': return '群聊'
      case 'all': return '全部'
      default: return type
    }
  }
  
  const getTagsText = (tags: string[]) => {
    if (tags.length === 0) return ''
    
    const tagNames = tags.map(tagId => {
      const tag = contactTags.value.find(t => t.id === tagId)
      return tag ? tag.name : tagId
    })
    
    if (tagNames.length <= 2) {
      return tagNames.join('、')
    } else {
      return `${tagNames[0]}、${tagNames[1]}等${tagNames.length}个标签`
    }
  }
  </script>
  
  <style scoped>
.strategy-content {
  padding: 10px 0;
  background-color: #fff; /* 设置整个内容区域为白色背景 */
}

.config-section {
  margin-bottom: 24px;
  padding: 15px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.config-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.title-group {
  flex: 1;
}

.title-group h3 {
  margin: 0;
  line-height: 1.2;
  font-size: 16px;
  color: #303133;
}

.description {
  margin: 8px 0 16px;
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.form-item {
  margin-top: 16px;
}

.staff-list {
  margin-top: 16px;
}

/* 降低空列表的高度 */
:deep(.el-empty) {
  padding: 10px 0;
}
:deep(.el-empty__image) {
  width: 80px; /* 减小图片尺寸 */
  height: 80px;
}
:deep(.el-empty__description) {
  margin-top: 8px; /* 减小描述文字与图片的间距 */
}

.staff-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.staff-info {
  display: flex;
  align-items: center;
}
.staff-icon {
  margin-right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.staff-icon img {
  width: 24px;
  height: 24px;
}
.staff-details {
  display: flex;
  flex-direction: column;
}

.staff-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.staff-tags {
  display: flex;
  gap: 8px;
  height: 32px;
}

.staff-actions {
  display: flex;
  align-items: center;
  gap: 16px; /* 增加按钮之间的间距 */
}

.staff-actions .el-button {
  padding: 8px; /* 增加按钮内边距使其更大 */
  margin: 0; /* 移除默认外边距 */
}

.staff-actions .el-icon {
  font-size: 18px; /* 增加图标大小 */
}

.common-config-item {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #ebeef5;
  position: relative; /* 添加相对定位，用于开关的绝对定位 */
}

.common-config-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
:deep(.el-collapse-item__content) {
  padding: 16px;
  background-color: #fff;
  /* border: 1px solid #e4e7ed; */
  border-radius: 4px;
}

.filter-words-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.el-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.keyword-input {
  width: 120px;
  margin-right: 8px;
  vertical-align: bottom;
}

.whitelist-input {
  margin-top: 10px;
}

.input-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.file-recognition-config {
  margin-top: 16px;
  padding: 16px;
  background: #f0f2f5;
  border-radius: 8px;
}

.path-input-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.path-input-header h4 {
  margin: 0;
}

.file-recognition-config h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #606266;
}

.dialog-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0;
}

.dialog-title {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.dialog-subtitle {
  margin-top: 8px;
  font-size: 14px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
}

/* 修改对话框样式 */
:deep(.el-dialog) {
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-dialog__body) {
  padding: 0 24px;
}

:deep(.el-dialog__header) {
  margin: 0;
  padding: 0;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px 24px;
}

:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item__header) {
  font-weight: bold;
  font-size: 16px;
  color: #303133;
  border-bottom: none;
  padding: 8px 0;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

:deep(.el-radio-group) {
  display: flex;
  gap: 24px;
}

.greeting-group-select {
  margin-top: 10px;
}

.greeting-select {
  width: 100%;
}

/* 群聊配置子项之间的视觉分割 */
.group-sub-item {
  margin-top: 0;
}

.group-sub-divider.el-divider--horizontal {
  margin: 14px 0;
  border-top: 1px dashed #e4e7ed;
}
</style>
