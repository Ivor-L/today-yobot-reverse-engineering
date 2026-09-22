import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, unref as _unref, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, withKeys as _withKeys } from "vue"

const _hoisted_1 = { class: "strategy-content" }
const _hoisted_2 = { class: "config-section" }
const _hoisted_3 = { class: "section-header" }
const _hoisted_4 = { class: "staff-list" }
const _hoisted_5 = { class: "staff-info" }
const _hoisted_6 = { class: "staff-icon" }
const _hoisted_7 = ["src"]
const _hoisted_8 = { class: "staff-details" }
const _hoisted_9 = { class: "staff-name" }
const _hoisted_10 = { class: "staff-tags" }
const _hoisted_11 = { class: "staff-actions" }
const _hoisted_12 = { class: "config-section" }
const _hoisted_13 = { class: "common-config-item" }
const _hoisted_14 = { class: "common-config-item" }
const _hoisted_15 = { class: "form-item group-sub-item" }
const _hoisted_16 = { class: "form-item group-sub-item" }
const _hoisted_17 = { class: "form-item group-sub-item" }
const _hoisted_18 = { class: "common-config-item" }
const _hoisted_19 = { style: {"display":"flex","justify-content":"space-between","align-items":"center"} }
const _hoisted_20 = {
  key: 0,
  class: "whitelist-input"
}
const _hoisted_21 = { class: "common-config-item" }
const _hoisted_22 = { class: "section-header" }
const _hoisted_23 = { class: "form-item" }
const _hoisted_24 = { class: "filter-words-list" }
const _hoisted_25 = { class: "common-config-item" }
const _hoisted_26 = { style: {"display":"flex","justify-content":"space-between","align-items":"center"} }
const _hoisted_27 = {
  key: 0,
  class: "file-recognition-config"
}
const _hoisted_28 = { class: "form-item" }
const _hoisted_29 = { class: "form-item" }
const _hoisted_30 = { class: "path-input-header" }
const _hoisted_31 = { class: "dialog-footer" }

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
  
export default /*@__PURE__*/_defineComponent({
  __name: 'AIStaffConfig',
  props: {
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
  },
  emits: ['update:visible', 'save'],
  setup(__props, { emit: __emit }) {

  const windowWidth = ref(window.innerWidth)
  const handleResize = () => {
    windowWidth.value = window.innerWidth
  }
  
  // 定义组件属性
  const props = __props
  
  // 添加话术组接口定义
  const emit = __emit
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
  
return (_ctx: any,_cache: any) => {
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_empty = _resolveComponent("el-empty")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_switch = _resolveComponent("el-switch")!
  const _component_el_tooltip = _resolveComponent("el-tooltip")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_divider = _resolveComponent("el-divider")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_checkbox_group = _resolveComponent("el-checkbox-group")!
  const _component_el_collapse_item = _resolveComponent("el-collapse-item")!
  const _component_el_collapse = _resolveComponent("el-collapse")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createVNode(_component_el_dialog, {
      modelValue: dialogVisible.value,
      "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event: any) => ((dialogVisible).value = $event)),
      width: windowWidth.value <= 700 ? '95%' : '700px'
    }, {
      header: _withCtx(() => [...(_cache[14] || (_cache[14] = [
        _createElementVNode("div", { class: "dialog-header" }, [
          _createElementVNode("span", { class: "dialog-title" }, "AI助理配置")
        ], -1)
      ]))]),
      footer: _withCtx(() => [
        _createElementVNode("div", _hoisted_31, [
          _createVNode(_component_el_button, {
            onClick: _cache[11] || (_cache[11] = ($event: any) => (dialogVisible.value = false))
          }, {
            default: _withCtx(() => [...(_cache[39] || (_cache[39] = [
              _createTextVNode("取消", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            onClick: saveStrategy
          }, {
            default: _withCtx(() => [...(_cache[40] || (_cache[40] = [
              _createTextVNode("保存配置", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      default: _withCtx(() => [
        _createVNode(_component_el_alert, {
          type: "info",
          "show-icon": "",
          closable: false,
          style: {"margin-bottom":"10px"}
        }, {
          default: _withCtx(() => [...(_cache[15] || (_cache[15] = [
            _createElementVNode("span", null, "向托管微信的“文件传输助手”发送指令，可以实现手机远程关闭或启用AI助理，详见操作指南说明", -1)
          ]))]),
          _: 1
        }),
        _createElementVNode("div", _hoisted_1, [
          _createElementVNode("div", _hoisted_2, [
            _createElementVNode("div", _hoisted_3, [
              _cache[17] || (_cache[17] = _createElementVNode("div", { class: "title-group" }, [
                _createElementVNode("h3", null, "AI助理配置"),
                _createElementVNode("p", { class: "description" }, "配置不同场景下的AI助理")
              ], -1)),
              _createVNode(_component_el_button, {
                type: "primary",
                size: "small",
                onClick: showAddStaffDialog,
                class: "add-staff-btn",
                round: "",
                disabled: staffList.value.length >= 5
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_icon, null, {
                    default: _withCtx(() => [
                      _createVNode(_unref(Plus))
                    ]),
                    _: 1
                  }),
                  _cache[16] || (_cache[16] = _createElementVNode("span", null, "AI助理", -1))
                ]),
                _: 1
              }, 8, ["disabled"])
            ]),
            _createElementVNode("div", _hoisted_4, [
              (staffList.value.length === 0)
                ? (_openBlock(), _createBlock(_component_el_empty, {
                    key: 0,
                    description: "暂未配置AI助理"
                  }))
                : (_openBlock(true), _createElementBlock(_Fragment, { key: 1 }, _renderList(staffList.value, (staff, index) => {
                    return (_openBlock(), _createElementBlock("div", {
                      class: "staff-item",
                      key: index
                    }, [
                      _createElementVNode("div", _hoisted_5, [
                        _createElementVNode("div", _hoisted_6, [
                          _createElementVNode("img", {
                            src: _unref(getStatefulPngIconPath)('ai_assistant', staff.chatType === 'single')
                          }, null, 8, _hoisted_7)
                        ]),
                        _createElementVNode("div", _hoisted_8, [
                          _createElementVNode("div", _hoisted_9, _toDisplayString(staff.name), 1),
                          _createElementVNode("div", _hoisted_10, [
                            _createVNode(_component_el_tag, {
                              size: "small",
                              type: getChatTypeTagType(staff.chatType)
                            }, {
                              default: _withCtx(() => [
                                _createTextVNode(_toDisplayString(getChatTypeText(staff.chatType)), 1)
                              ]),
                              _: 2
                            }, 1032, ["type"]),
                            (staff.selectedTags.length > 0)
                              ? (_openBlock(), _createBlock(_component_el_tag, {
                                  key: 0,
                                  size: "small",
                                  type: "success"
                                }, {
                                  default: _withCtx(() => [
                                    _createTextVNode(_toDisplayString(getTagsText(staff.selectedTags)), 1)
                                  ]),
                                  _: 2
                                }, 1024))
                              : _createCommentVNode("", true)
                          ])
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_11, [
                        _createVNode(_component_el_tooltip, {
                          content: staff.enabled ? 'AI助理已启用' : 'AI助理未启用',
                          placement: "top",
                          effect: "light"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_switch, {
                              modelValue: staff.enabled,
                              "onUpdate:modelValue": ($event: any) => ((staff.enabled) = $event),
                              onChange: saveStrategy
                            }, null, 8, ["modelValue", "onUpdate:modelValue"])
                          ]),
                          _: 2
                        }, 1032, ["content"]),
                        _createVNode(_component_el_button, {
                          type: "primary",
                          text: "",
                          onClick: ($event: any) => (editStaff(index))
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_icon, null, {
                              default: _withCtx(() => [
                                _createVNode(_unref(Edit))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }, 8, ["onClick"]),
                        _createVNode(_component_el_button, {
                          type: "danger",
                          text: "",
                          onClick: ($event: any) => (deleteStaff(index))
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_el_icon, null, {
                              default: _withCtx(() => [
                                _createVNode(_unref(Delete))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }, 8, ["onClick"])
                      ])
                    ]))
                  }), 128))
            ])
          ]),
          _createElementVNode("div", _hoisted_12, [
            _createVNode(_component_el_collapse, {
              modelValue: activeCollapse.value,
              "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event: any) => ((activeCollapse).value = $event))
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_collapse_item, {
                  title: "通用配置（修改完后记得点保存）",
                  name: "common"
                }, {
                  default: _withCtx(() => [
                    _createElementVNode("div", _hoisted_13, [
                      _cache[18] || (_cache[18] = _createElementVNode("h3", null, "新好友运营SOP", -1)),
                      _cache[19] || (_cache[19] = _createElementVNode("p", { class: "description" }, "检测到对方通过了你的好友申请后，按所选运营SOP依次执行动作（如先发打招呼再拉群）", -1)),
                      _createVNode(_component_el_select, {
                        modelValue: commonConfig.value.friendPassSopId,
                        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((commonConfig.value.friendPassSopId) = $event)),
                        placeholder: "不执行",
                        clearable: "",
                        class: "greeting-select",
                        onChange: saveStrategy
                      }, {
                        default: _withCtx(() => [
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(sopList.value, (sop) => {
                            return (_openBlock(), _createBlock(_component_el_option, {
                              key: sop.id,
                              label: sop.name,
                              value: sop.id
                            }, null, 8, ["label", "value"]))
                          }), 128))
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ]),
                    _createElementVNode("div", _hoisted_14, [
                      _cache[26] || (_cache[26] = _createElementVNode("h3", null, "群聊配置", -1)),
                      _cache[27] || (_cache[27] = _createElementVNode("p", { class: "description" }, "设置群聊中的回复行为和忽略规则", -1)),
                      _createElementVNode("div", _hoisted_15, [
                        _createVNode(_component_el_checkbox, {
                          modelValue: commonConfig.value.groupAtOnly,
                          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((commonConfig.value.groupAtOnly) = $event))
                        }, {
                          default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
                            _createTextVNode("群聊被@时才回复", -1)
                          ]))]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _createVNode(_component_el_divider, { class: "group-sub-divider" }),
                      _createElementVNode("div", _hoisted_16, [
                        _cache[21] || (_cache[21] = _createElementVNode("h4", { style: {"margin":"0 0 4px"} }, "新建群聊运营SOP", -1)),
                        _cache[22] || (_cache[22] = _createElementVNode("p", { class: "description" }, "检测到本账号新进入一个群聊后，按所选运营SOP依次执行动作", -1)),
                        _createVNode(_component_el_select, {
                          modelValue: commonConfig.value.groupJoinSopId,
                          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((commonConfig.value.groupJoinSopId) = $event)),
                          placeholder: "不执行",
                          clearable: "",
                          class: "greeting-select",
                          onChange: saveStrategy
                        }, {
                          default: _withCtx(() => [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(sopList.value, (sop) => {
                              return (_openBlock(), _createBlock(_component_el_option, {
                                key: sop.id,
                                label: sop.name,
                                value: sop.id
                              }, null, 8, ["label", "value"]))
                            }), 128))
                          ]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _createVNode(_component_el_divider, { class: "group-sub-divider" }),
                      _createElementVNode("div", _hoisted_17, [
                        _cache[23] || (_cache[23] = _createElementVNode("h4", { style: {"margin":"0 0 4px"} }, "群同事过滤", -1)),
                        _cache[24] || (_cache[24] = _createElementVNode("p", { class: "description" }, "录入群同事名单后，群聊中这些同事的消息会被自动忽略", -1)),
                        _createVNode(_component_el_input, {
                          modelValue: commonConfig.value.colleagueNamesToIgnore,
                          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((commonConfig.value.colleagueNamesToIgnore) = $event)),
                          placeholder: "录入群聊同事名单，会自动忽略群中同事的消息",
                          clearable: ""
                        }, null, 8, ["modelValue"]),
                        _cache[25] || (_cache[25] = _createElementVNode("p", {
                          class: "el-form-item__hint",
                          style: {"font-size":"12px","color":"#909399","line-height":"1.5","margin-top":"5px"}
                        }, " 多个同事名单用双斜杠\"//\"分隔开，输入后自动保存。 ", -1))
                      ])
                    ]),
                    _createElementVNode("div", _hoisted_18, [
                      _createElementVNode("div", _hoisted_19, [
                        _cache[28] || (_cache[28] = _createElementVNode("div", null, [
                          _createElementVNode("h3", null, "白名单"),
                          _createElementVNode("p", { class: "description" }, "开启后，仅回复白名单中的好友或群聊")
                        ], -1)),
                        _createVNode(_component_el_switch, {
                          modelValue: commonConfig.value.whitelist.enabled,
                          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event: any) => ((commonConfig.value.whitelist.enabled) = $event))
                        }, null, 8, ["modelValue"])
                      ]),
                      (commonConfig.value.whitelist.enabled)
                        ? (_openBlock(), _createElementBlock("div", _hoisted_20, [
                            _createVNode(_component_el_input, {
                              modelValue: commonConfig.value.whitelist.names,
                              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((commonConfig.value.whitelist.names) = $event)),
                              type: "textarea",
                              rows: 3,
                              placeholder: "输入好友昵称或群名并用双斜杠\"//\"隔开，如：张三//测试一群"
                            }, null, 8, ["modelValue"]),
                            _cache[29] || (_cache[29] = _createElementVNode("p", { class: "input-tip" }, "输入好友昵称或群名并用双斜杠\"//\"隔开，如：张三//测试一群", -1))
                          ]))
                        : _createCommentVNode("", true)
                    ]),
                    _createElementVNode("div", _hoisted_21, [
                      _createElementVNode("div", _hoisted_22, [
                        _cache[31] || (_cache[31] = _createElementVNode("div", { class: "title-group" }, [
                          _createElementVNode("h3", null, "回复过滤词"),
                          _createElementVNode("p", { class: "description" }, "AI生成的回复中包含过滤词（全匹配）时，将不会发送给用户")
                        ], -1)),
                        _createVNode(_component_el_button, {
                          type: "primary",
                          size: "small",
                          onClick: addFilterWord,
                          disabled: commonConfig.value.filterWords.length >= 5
                        }, {
                          default: _withCtx(() => [...(_cache[30] || (_cache[30] = [
                            _createTextVNode(" 添加过滤词 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["disabled"])
                      ]),
                      _createElementVNode("div", _hoisted_23, [
                        _createElementVNode("div", _hoisted_24, [
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(commonConfig.value.filterWords, (word, index) => {
                            return (_openBlock(), _createBlock(_component_el_tag, {
                              key: index,
                              closable: "",
                              onClose: ($event: any) => (removeFilterWord(index))
                            }, {
                              default: _withCtx(() => [
                                _createTextVNode(_toDisplayString(word), 1)
                              ]),
                              _: 2
                            }, 1032, ["onClose"]))
                          }), 128)),
                          (filterWordInputVisible.value)
                            ? (_openBlock(), _createBlock(_component_el_input, {
                                key: 0,
                                ref_key: "filterWordInputRef",
                                ref: filterWordInputRef,
                                modelValue: filterWordInputValue.value,
                                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event: any) => ((filterWordInputValue).value = $event)),
                                class: "keyword-input",
                                size: "small",
                                onKeyup: _withKeys(confirmFilterWord, ["enter"]),
                                onBlur: confirmFilterWord
                              }, null, 8, ["modelValue"]))
                            : _createCommentVNode("", true)
                        ])
                      ])
                    ]),
                    _createElementVNode("div", _hoisted_25, [
                      _createElementVNode("div", _hoisted_26, [
                        _cache[32] || (_cache[32] = _createElementVNode("div", null, [
                          _createElementVNode("h3", null, "识别文件"),
                          _createElementVNode("p", { class: "description" }, "开启后可以识别消息的文件并上传到Coze")
                        ], -1)),
                        _createVNode(_component_el_switch, {
                          modelValue: commonConfig.value.fileRecognition.enabled,
                          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((commonConfig.value.fileRecognition.enabled) = $event))
                        }, null, 8, ["modelValue"])
                      ]),
                      (commonConfig.value.fileRecognition.enabled)
                        ? (_openBlock(), _createElementBlock("div", _hoisted_27, [
                            _createElementVNode("div", _hoisted_28, [
                              _cache[37] || (_cache[37] = _createElementVNode("h4", null, "文件类型", -1)),
                              _createVNode(_component_el_checkbox_group, {
                                modelValue: commonConfig.value.fileRecognition.fileTypes,
                                "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event: any) => ((commonConfig.value.fileRecognition.fileTypes) = $event))
                              }, {
                                default: _withCtx(() => [
                                  _createVNode(_component_el_checkbox, { label: "word" }, {
                                    default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
                                      _createTextVNode("Word", -1)
                                    ]))]),
                                    _: 1
                                  }),
                                  _createVNode(_component_el_checkbox, { label: "pdf" }, {
                                    default: _withCtx(() => [...(_cache[34] || (_cache[34] = [
                                      _createTextVNode("PDF", -1)
                                    ]))]),
                                    _: 1
                                  }),
                                  _createVNode(_component_el_checkbox, { label: "excel" }, {
                                    default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
                                      _createTextVNode("Excel", -1)
                                    ]))]),
                                    _: 1
                                  }),
                                  _createVNode(_component_el_checkbox, { label: "image" }, {
                                    default: _withCtx(() => [...(_cache[36] || (_cache[36] = [
                                      _createTextVNode("图片", -1)
                                    ]))]),
                                    _: 1
                                  })
                                ]),
                                _: 1
                              }, 8, ["modelValue"])
                            ]),
                            _createElementVNode("div", _hoisted_29, [
                              _createElementVNode("div", _hoisted_30, [
                                _cache[38] || (_cache[38] = _createElementVNode("h4", null, "文件目录", -1)),
                                _createVNode(_component_el_tooltip, {
                                  effect: "dark",
                                  content: "Windows 填微信账号目录；macOS 填 xwechat_files/wxid_xxx 目录。最后一级必须对应当前登录账号",
                                  placement: "top"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_el_icon, null, {
                                      default: _withCtx(() => [
                                        _createVNode(_unref(QuestionFilled))
                                      ]),
                                      _: 1
                                    })
                                  ]),
                                  _: 1
                                })
                              ]),
                              _createVNode(_component_el_input, {
                                modelValue: commonConfig.value.fileRecognition.filePath,
                                "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event: any) => ((commonConfig.value.fileRecognition.filePath) = $event)),
                                placeholder: "请输入微信文件夹路径",
                                onChange: saveStrategy
                              }, null, 8, ["modelValue"])
                            ])
                          ]))
                        : _createCommentVNode("", true)
                    ])
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["modelValue"])
          ])
        ])
      ]),
      _: 1
    }, 8, ["modelValue", "width"]),
    _createVNode(StaffDialog, {
      visible: staffDialogVisible.value,
      "onUpdate:visible": _cache[13] || (_cache[13] = ($event: any) => ((staffDialogVisible).value = $event)),
      staff: currentStaff.value,
      "is-edit": isEditMode.value,
      "coze-agents": props.cozeAgents,
      "contact-tags": contactTags.value,
      "group-tags": groupTags.value,
      "has-group-staff": hasGroupStaff.value,
      "mention-reply-supported": mentionReplySupported.value,
      "auto-join-group-supported": autoJoinGroupSupported.value,
      onSave: handleStaffSave
    }, null, 8, ["visible", "staff", "is-edit", "coze-agents", "contact-tags", "group-tags", "has-group-staff", "mention-reply-supported", "auto-join-group-supported"])
  ], 64))
}
}

})