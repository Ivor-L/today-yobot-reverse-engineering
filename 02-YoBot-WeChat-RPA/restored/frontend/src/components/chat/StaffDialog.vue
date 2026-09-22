<template>
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑AI助理' : '添加AI助理'"
      width="500px"
    >
      <div class="staff-form">
        <!-- 员工名称 -->
        <div class="form-item">
          <h3>*员工名称</h3>
          <el-input v-model="staffForm.name" placeholder="如：培育AI助理" />
        </div>
        
        <!-- 回复范围 -->
        <div class="form-item">
          <h3>*回复范围</h3>
          <el-radio-group v-model="staffForm.chatType">
            <el-radio value="single">单聊</el-radio>
            <el-radio value="group">群聊</el-radio>
          </el-radio-group>
          
          <!-- 是否读取群成员 -->
          <div v-if="staffForm.chatType === 'group'" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #eee;">
            <el-checkbox v-model="staffForm.readGroupMember">
              是否读群成员
            </el-checkbox>
            <div class="description" style="margin-top: 4px; color: #909399; font-size: 12px;">
              微信4.1无法直接读取群聊发送者名称，需额操作获取，如非必须可不勾选
            </div>
            <!-- 是否引用回复 -->
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #eee;">
              <el-checkbox v-model="staffForm.quoteReply">
                是否引用回复
              </el-checkbox>
              <div class="description" style="margin-top: 4px; color: #909399; font-size: 12px;">
                勾选后，回复群消息时会引用对方的原始消息
              </div>
            </div>
            <div
              v-if="props.mentionReplySupported"
              style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #eee;"
            >
              <el-checkbox v-model="staffForm.mentionReply">
                是否@回复
              </el-checkbox>
              <div class="description" style="margin-top: 4px; color: #909399; font-size: 12px;">
                勾选后，每轮群聊回复的第一个文本、图片或文件会原生@消息发送者
              </div>
            </div>
          </div>

          <!-- 群邀请自动加入（仅单聊） -->
          <div v-if="staffForm.chatType === 'single' && props.autoJoinGroupSupported" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #eee;">
            <el-checkbox v-model="staffForm.autoJoinGroup">
              群邀请自动加入
            </el-checkbox>
            <div class="description" style="margin-top: 4px; color: #909399; font-size: 12px;">
              勾选后，收到"邀请你加入群聊"的卡片时自动点击加入，不再交给智能体回复；不勾选则按普通消息走AI自动回复
            </div>
          </div>
        </div>

        <!-- 仅监控模式 -->
        <div class="form-item">
          <el-checkbox v-model="staffForm.monitorOnly">
            仅监控模式
          </el-checkbox>
          <div class="description" style="margin-top: 4px; color: #909399; font-size: 12px;">
            勾选后，该助理只监听和读取消息、参与事件识别（如新进群、新好友），但不会调用智能体生成回复
          </div>
        </div>

        <!-- 智能体选择 -->
        <div class="form-item">
          <h3>*选择智能体</h3>
          <el-select
            v-model="staffForm.agentId"
            placeholder="请选择智能体"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="agent in props.cozeAgents"
              :key="agent.botId"
              :label="agent.name"
              :value="agent.botId"
            >
              <div style="display: flex; align-items: center;">
                <img
                  :src="getPlatformIconPath(agent.platform)"
                  :alt="agent.platform || 'coze'"
                  style="width: 18px; height: 18px; margin-right: 8px;"
                />
                <span>{{ agent.name }}</span>
              </div>
            </el-option>
          </el-select>
        </div>

        <!-- 语音回复 -->
        <div v-if="voiceCapabilityAvailable" class="form-item" :class="{ 'voice-disabled': !voiceSupported }">
          <div class="section-header">
            <div class="title-group">
              <h3>语音回复</h3>
              <p class="description">将 AI 文字回复转语音发送。需要微信客户端 4.1.9 及以上版本。</p>
            </div>
            <el-switch
              v-model="staffForm.voiceEnabled"
              :disabled="!voiceSupported"
            />
          </div>

          <!-- 版本不支持提示 -->
          <el-alert
            v-if="!voiceSupported && !voiceLoading"
            type="warning"
            :closable="false"
            show-icon
            style="margin-top: 8px;"
          >
            <template #title>
              <span v-if="!instances.length">未检测到微信实例</span>
              <span v-else>
                当前所有微信实例版本均低于 4.1.9，无法使用语音回复（已检测：{{ versionSummary }}）
              </span>
            </template>
          </el-alert>

          <!-- 音色选择 -->
          <div v-if="voiceSupported && staffForm.voiceEnabled" class="voice-config-body">
            <!-- VB-Cable 环境检查 -->
            <div class="vb-cable-row">
              <span class="vb-cable-label">
                <el-icon><Headset /></el-icon>
                音频通道
              </span>
              <el-tag v-if="audioEnvLoading" type="info" size="small">检测中…</el-tag>
              <el-tag v-else-if="audioEnv?.vb_cable_installed" type="success" size="small">
                ✓ VB-Cable 已就绪（默认麦克风: {{ audioEnv.default_recording_name || '未知' }}）
              </el-tag>
              <el-tag v-else type="danger" size="small">
                ✗ VB-Cable 未安装
              </el-tag>
              <el-button
                v-if="!audioEnvLoading && !audioEnv?.vb_cable_installed"
                link type="primary" size="small"
                @click="openVBCableSite"
              >下载 VB-Cable →</el-button>
            </div>
            <div v-if="!audioEnvLoading && !audioEnv?.vb_cable_installed" class="voice-hint-empty">
              VB-Cable 未安装，语音回复无法发声 — 请下载并以管理员身份安装，重启电脑后再来。
            </div>

            <!-- ffmpeg 环境检查 -->
            <div class="vb-cable-row" style="margin-top: 8px;">
              <span class="vb-cable-label">
                <el-icon><Headset /></el-icon>
                解码组件
              </span>
              <el-tag v-if="audioEnvLoading" type="info" size="small">检测中…</el-tag>
              <el-tag v-else-if="audioEnv?.ffmpeg?.installed" type="success" size="small">
                ✓ ffmpeg 已就绪{{ audioEnv.ffmpeg.version ? `（${audioEnv.ffmpeg.version}）` : '' }}
              </el-tag>
              <el-tag v-else type="danger" size="small">
                ✗ ffmpeg 未安装
              </el-tag>
              <el-tooltip
                v-if="!audioEnvLoading && !audioEnv?.ffmpeg?.installed"
                content="点击查看安装教程"
                placement="top"
              >
                <el-button
                  circle size="small" type="warning"
                  class="help-btn-inline"
                  @click="ffmpegGuideVisible = true"
                >
                  <el-icon><QuestionFilled /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
            <div v-if="!audioEnvLoading && !audioEnv?.ffmpeg?.installed" class="voice-hint-empty">
              ffmpeg 未安装，语音解码会失败 — 点击右侧问号查看安装教程，装完后请重启本软件。
            </div>

            <div class="voice-row" style="margin-top: 12px;">
              <span class="voice-label">音色</span>
              <el-select
                v-model="staffForm.voiceId"
                placeholder="选择音色"
                style="flex: 1;"
                :loading="voicesLoading"
              >
                <el-option
                  v-for="v in availableVoices"
                  :key="v.voice_id"
                  :label="`${v.name} (${v.voice_id})`"
                  :value="v.voice_id"
                  :disabled="v.status !== 'active'"
                >
                  <span>{{ v.name }}</span>
                  <span style="float: right; color: #909399; font-size: 12px;">
                    {{ v.status === 'active' ? '可用' : statusLabel(v.status) }}
                  </span>
                </el-option>
                <template #empty>
                  <div style="padding: 12px; text-align: center; color: #909399;">
                    尚未添加任何音色
                  </div>
                </template>
              </el-select>
            </div>

            <div v-if="!availableVoices.length && !voicesLoading" class="voice-hint-empty">
              请先到「设置 → AI 语音配置 → 我的音色」添加并校验音色
            </div>
            <div v-else-if="!hasActiveVoice" class="voice-hint-empty">
              已添加的音色都未校验通过，请去「我的音色」执行校验
            </div>

            <div v-if="multiVersionWarning" class="voice-version-tip">
              <el-icon style="vertical-align: -2px;"><InfoFilled /></el-icon>
              注意：你有 {{ unsupportedInstances.length }} 个微信实例版本 &lt; 4.1.9（{{ unsupportedInstances.map(i => i.account_info?.nickname || i.instance_id).join('、') }}），这些实例上的会话会自动回退到文字回复。
            </div>
          </div>
        </div>
        <!-- 好友标签 -->
        <div class="form-item" v-if="staffForm.chatType === 'single' || staffForm.chatType === 'all'">
          <div class="section-header">
            <div class="title-group">
              <h3>好友标签</h3>
              <p class="description">不选会作为兜底AI助理，回复所有好友</p>
            </div>
            <el-button 
              v-if="isEdit"
              type="warning" 
              size="small"
              @click="resetTags"
              :disabled="staffForm.selectedTags.length === 0"
            >
              重置标签
            </el-button>
          </div>
          <el-checkbox-group v-model="staffForm.selectedTags">
            <el-checkbox 
              v-for="tag in props.contactTags" 
              :key="tag.id" 
              :label="tag.id"
            >
              {{ tag.name }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <!-- 群聊标签 -->
        <div class="form-item" v-if="staffForm.chatType === 'group'">
          <div class="section-header">
            <div class="title-group">
              <h3>群聊标签</h3>
              <p class="description">不选会作为兜底AI助理，回复所有群聊</p>
            </div>
            <el-button 
              v-if="isEdit"
              type="warning" 
              size="small"
              @click="resetTags"
              :disabled="staffForm.selectedTags.length === 0"
            >
              重置标签
            </el-button>
          </div>
          <el-checkbox-group v-model="staffForm.selectedTags">
            <el-checkbox 
              v-for="tag in props.groupTags" 
              :key="tag.id" 
              :label="tag.id"
            >
              {{ tag.name }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
        
        <!-- 关键词配置 -->
        <!-- <div class="form-item">
          <div class="section-header">
            <div class="title-group">
              <h3>关键词配置</h3>
              <p class="description">触发关键词回复（非必须）</p>
            </div>
            <el-button 
              type="primary" 
              size="small"
              @click="addKeyword"
              :disabled="staffForm.keywords.length >= 20"
            >
              添加关键词
            </el-button>
          </div>
          <div class="keywords-list">
            <el-tag
              v-for="(keyword, index) in staffForm.keywords"
              :key="index"
              closable
              @close="removeKeyword(index)"
            >
              {{ keyword }}
            </el-tag>
            <el-input
              v-if="keywordInputVisible"
              ref="keywordInputRef"
              v-model="keywordInputValue"
              class="keyword-input"
              size="small"
              @keyup.enter="confirmKeyword"
              @blur="confirmKeyword"
            />
          </div>
        </div> -->
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveStaff">确认</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ffmpeg 安装教程弹窗 -->
    <FfmpegInstallGuide v-model="ffmpegGuideVisible" @recheck="loadAudioEnv" />
  </template>
  
  <script setup lang="ts">
  import { ref, computed, nextTick, onMounted, PropType, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { InfoFilled, Headset, QuestionFilled } from '@element-plus/icons-vue'
  import { Tag } from '@/api/contact'
  import { voiceApi, type VoiceLibRecord, type VoiceLibStatus } from '@/api/voice'
  import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'
  import FfmpegInstallGuide from '@/components/settings/FfmpegInstallGuide.vue'
  import { API_BASE_URL, headers } from '@/api/config'
  import { getPlatformIconPath } from '@/utils/iconImages'
  // 获取平台图标扩展名
  // 定义组件属性
  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    },
    staff: {
      type: Object as PropType<{
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
        voiceEnabled?: boolean
        voiceId?: string
      }>,
      default: undefined
    },
    isEdit: {
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
    },
    contactTags: {
      type: Array as PropType<Tag[]>,
      default: () => []
    },
    groupTags: {
      type: Array as PropType<Tag[]>,
      default: () => []
    },
    hasGroupStaff: {
      type: Boolean,
      default: false
    },
    mentionReplySupported: {
      type: Boolean,
      default: true
    },
    autoJoinGroupSupported: {
      type: Boolean,
      default: true
    }
  })
  
  // 定义组件事件
  const emit = defineEmits(['update:visible', 'save'])
  const isEditingGroupStaff = computed(() => {
    return props.isEdit && props.staff?.chatType === 'group'
  })
  // 对话框可见性
  const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })
  
  // 员工表单
  const staffForm = ref({
    id: '',
    name: '',
    enabled: true,
    agentId: '',
    chatType: 'single' as 'single' | 'group' | 'all',
    selectedTags: [] as string[],
    keywords: [] as string[],
    readGroupMember: false,
    quoteReply: false,
    mentionReply: false,
    monitorOnly: false,
    autoJoinGroup: false,
    voiceEnabled: false,
    voiceId: ''
  })

  // ---------- 语音回复：实例版本 + 音色列表 ----------
  interface InstanceInfo {
    instance_id: string
    window_handle?: number
    wechat_build: number[] | null
    wechat_version: string | null
    account_info?: { nickname?: string; account_id?: string } | null
  }

  const instances = ref<InstanceInfo[]>([])
  const { isFeatureEnabled } = useRuntimeCapabilityPresentation()
  const voicesAll = ref<VoiceLibRecord[]>([])
  const voiceLoading = ref(true)
  const voicesLoading = ref(true)

  // VB-Cable / ffmpeg 音频环境
  const audioEnv = ref<any>(null)
  const audioEnvLoading = ref(true)
  const ffmpegGuideVisible = ref(false)

  function openVBCableSite() {
    window.open('https://vb-audio.com/Cable/', '_blank')
  }

  function buildGE419(b: number[] | null): boolean {
    if (!b || b.length < 3) return false
    const [maj, min, patch] = b
    return maj > 4 || (maj === 4 && (min > 1 || (min === 1 && patch >= 9)))
  }

  const supportedInstances = computed(() => instances.value.filter(i => buildGE419(i.wechat_build)))
  const unsupportedInstances = computed(() => instances.value.filter(i => !buildGE419(i.wechat_build)))
  // 微信版本只说明原生控件可能存在；真正的产品能力必须由运行时
  // capability contract 明确授权。这样 Mac 4.x 不会误探测 Windows
  // 独有的语音 API。
  const voiceCapabilityAvailable = computed(() => isFeatureEnabled('automation.voice_send'))
  const voiceSupported = computed(() => voiceCapabilityAvailable.value && supportedInstances.value.length > 0)
  const multiVersionWarning = computed(() => supportedInstances.value.length > 0 && unsupportedInstances.value.length > 0)
  const versionSummary = computed(() => {
    if (!instances.value.length) return '无'
    return instances.value
      .map(i => i.wechat_version || '未知')
      .join('、')
  })

  const availableVoices = computed(() => voicesAll.value)
  const hasActiveVoice = computed(() => voicesAll.value.some(v => v.status === 'active'))

  function statusLabel(s: VoiceLibStatus): string {
    return ({
      pending: '待校验',
      training: '训练中',
      active: '可用',
      failed: '校验失败',
      gone: '不存在'
    } as Record<VoiceLibStatus, string>)[s] || s
  }

  async function loadInstances() {
    voiceLoading.value = true
    try {
      const res = await fetch(`${API_BASE_URL}/api/instances`, {
        headers: { ...headers },
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        instances.value = (data.instances || []) as InstanceInfo[]
      }
    } catch (e) {
      console.error('加载微信实例失败:', e)
    } finally {
      voiceLoading.value = false
    }
  }

  async function loadVoices() {
    voicesLoading.value = true
    try {
      const r = await voiceApi.listLibrary()
      if (r.success && r.data) {
        voicesAll.value = r.data
      }
    } catch (e) {
      console.error('加载音色列表失败:', e)
    } finally {
      voicesLoading.value = false
    }
  }

  async function loadAudioEnv() {
    audioEnvLoading.value = true
    try {
      const r = await voiceApi.getAudioDevices()
      if (r.success && r.data) {
        audioEnv.value = r.data
      }
    } catch (e) {
      console.error('加载音频环境失败:', e)
    } finally {
      audioEnvLoading.value = false
    }
  }

  onMounted(async () => {
    await loadInstances()
    // 先以实例版本确认语音能力，再读取语音资源。macOS 当前不声明
    // 语音发送能力且不会提供这些 Windows 路由，禁止无能力探测。
    if (voiceCapabilityAvailable.value && voiceSupported.value) {
      await Promise.all([loadVoices(), loadAudioEnv()])
    }
  })
  
  // 关键词输入控制
  const keywordInputVisible = ref(false)
  const keywordInputValue = ref('')
  const keywordInputRef = ref<HTMLInputElement | null>(null)
  
  // 监听staff属性变化
  watch(() => props.staff, (newVal) => {
    if (newVal) {
      const staffData = JSON.parse(JSON.stringify(newVal))
      staffForm.value = {
        ...staffData,
        readGroupMember: staffData.readGroupMember ?? false,
        quoteReply: staffData.quoteReply ?? false,
        mentionReply: staffData.mentionReply ?? false,
        monitorOnly: staffData.monitorOnly ?? false,
        autoJoinGroup: staffData.autoJoinGroup ?? false,
        voiceEnabled: staffData.voiceEnabled ?? false,
        voiceId: staffData.voiceId ?? ''
      }
    }
  }, { immediate: true })
  
  // 关键词相关方法
  const addKeyword = () => {
    keywordInputVisible.value = true
    nextTick(() => {
      keywordInputRef.value?.focus()
    })
  }
  
  const confirmKeyword = () => {
    if (keywordInputValue.value.trim()) {
      if (!staffForm.value.keywords.includes(keywordInputValue.value.trim())) {
        staffForm.value.keywords.push(keywordInputValue.value.trim())
      }
    }
    keywordInputVisible.value = false
    keywordInputValue.value = ''
  }
  
  const removeKeyword = (index: number) => {
    staffForm.value.keywords.splice(index, 1)
  }
  
  // 重置标签选择
  const resetTags = () => {
    staffForm.value.selectedTags = []
    ElMessage.success('已重置，重新保存后生效')
  }
  
  // 保存员工
  const saveStaff = () => {
    // 验证表单
    if (!staffForm.value.name.trim()) {
      ElMessage.error('请输入员工名称')
      return
    }

    if (!staffForm.value.agentId) {
      ElMessage.error('请选择智能体')
      return
    }

    // 语音回复校验：启用了但未选音色 → 拒绝
    if (staffForm.value.voiceEnabled && !staffForm.value.voiceId) {
      ElMessage.error('已启用语音回复，请选择一个音色')
      return
    }
    // 选了但版本不再支持 → 静默关闭
    if (staffForm.value.voiceEnabled && !voiceSupported.value) {
      staffForm.value.voiceEnabled = false
      staffForm.value.voiceId = ''
    }
    if (!props.autoJoinGroupSupported) {
      staffForm.value.autoJoinGroup = false
    }

    emit('save', staffForm.value)
  }
  </script>
  
  <style scoped>
  .staff-form {
  padding: 12px 0;
}

.form-item {
  margin-bottom: 18px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.form-item:last-child {
  margin-bottom: 0;
}

h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
  position: relative;
  padding-left: 12px;
  border-left: 3px solid #409eff;
}

.description {
  margin: 8px 0 16px;
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
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
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background-color: #fff;
  padding: 12px;
  border-radius: 6px;
  border: 1px dashed #dcdfe6;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  background-color: #fff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

:deep(.el-radio-group) {
  display: flex;
  gap: 24px;
  background-color: #fff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 16px;
  margin-bottom: 0;
}

:deep(.el-dialog__title) {
  font-weight: bold;
  font-size: 18px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}

/* 语音回复 */
.voice-disabled {
  opacity: 0.7;
}
.voice-config-body {
  margin-top: 12px;
  padding: 12px;
  background-color: #fff;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}
.voice-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.voice-label {
  width: 60px;
  font-size: 14px;
  color: #606266;
  flex-shrink: 0;
}
.vb-cable-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #ebeef5;
  flex-wrap: wrap;
}
.vb-cable-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 80px;
  font-size: 14px;
  color: #606266;
  flex-shrink: 0;
}
.help-btn-inline {
  padding: 0 !important;
  width: 22px;
  height: 22px;
  min-height: 22px;
}
.voice-hint-empty {
  margin-top: 10px;
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 8px 10px;
  border-radius: 4px;
  border-left: 3px solid #e6a23c;
}
.voice-version-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
  </style>
