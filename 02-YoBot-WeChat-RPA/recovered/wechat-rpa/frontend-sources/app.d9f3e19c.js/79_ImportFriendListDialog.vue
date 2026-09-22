import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString } from "vue"

const _hoisted_1 = { class: "import-tip" }
const _hoisted_2 = { class: "tip-content" }
const _hoisted_3 = { class: "agent-import-tip" }
const _hoisted_4 = { class: "tip-content" }
const _hoisted_5 = { class: "agent-select-container" }
const _hoisted_6 = { class: "api-import-tip" }
const _hoisted_7 = { class: "tip-content" }
const _hoisted_8 = { class: "api-status-container" }
const _hoisted_9 = { class: "api-status-item" }
const _hoisted_10 = {
  key: 0,
  class: "status-value configured"
}
const _hoisted_11 = {
  key: 1,
  class: "status-value not-configured"
}
const _hoisted_12 = { class: "dialog-footer" }

import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import type { CozeAgent } from '@/types/coze'
import { getExternalApiSettings } from '@/api/external-api'
import { syncFriendListByApi } from '@/api/autosop'

const TEMPLATE_URL = 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/file/%E5%90%8D%E5%8D%95%E6%A8%A1%E6%9D%BF%20.xlsx'


export default /*@__PURE__*/_defineComponent({
  __name: 'ImportFriendListDialog',
  props: {
  visible: {
    type: Boolean,
    default: false
  },
  cozeAgents: {
    type: Array as () => CozeAgent[],
    default: () => []
  },
  allowedTypes: {
    type: Array as () => Array<'excel' | 'agent' | 'api'>,
    default: () => ['excel', 'agent', 'api']
  }
},
  emits: ['update:visible', 'import', 'importByAgent', 'importByApi'],
  setup(__props, { emit: __emit }) {

const props = __props

const emit = __emit

const dialogVisible = ref(false)
const uploading = ref(false)
const fileList = ref<File[]>([])
const importType = ref('excel')
const selectedAgentId = ref('')
const apiIdentifier = ref('')
const allows = (type: 'excel' | 'agent' | 'api') => props.allowedTypes.includes(type)

const downloadTemplate = () => {
  window.open(TEMPLATE_URL, '_blank')
}

// 格式化API标识符显示
const formatApiIdentifier = (identifier: string) => {
  if (identifier.length <= 8) return identifier
  return identifier.substring(0, 4) + '****' + identifier.substring(identifier.length - 4)
}

// 获取按钮文案
const getButtonText = () => {
  switch (importType.value) {
    case 'api':
      return '立即同步'
    case 'agent':
      return '立即上传'
    default:
      return '立即上传'
  }
}

// 加载API配置
const loadApiSettings = async () => {
  try {
    const settings = await getExternalApiSettings()
    if (settings && settings.identifier) {
      apiIdentifier.value = settings.identifier
    } else {
      apiIdentifier.value = ''
    }
  } catch (error) {
    console.error('加载API配置失败:', error)
    apiIdentifier.value = ''
  }
}

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    if (!allows(importType.value as 'excel' | 'agent' | 'api')) {
      importType.value = props.allowedTypes[0] || 'excel'
    }
    // 未迁移外部 API 名单业务的运行时不得探测对应 Windows 路由。
    if (allows('api')) loadApiSettings()
  }
})

watch(() => dialogVisible.value, (val) => {
  if (!val) {
    emit('update:visible', false)
  }
})

// 当有智能体数据时，默认选择第一个智能体
watch(() => props.cozeAgents, (agents) => {
  if (agents && agents.length > 0 && !selectedAgentId.value) {
    selectedAgentId.value = agents[0].botId
  }
}, { immediate: true })

const beforeUpload = (file: File) => {
  const isExcel = file.type === 'application/vnd.ms-excel' || 
                  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  file.name.endsWith('.csv')
  if (!isExcel) {
    ElMessage.error('只能上传 Excel/CSV 文件!')
    return false
  }
  return true
}

const handleFileChange = (file: any) => {
  fileList.value = [file.raw]
}

const handleUpload = async () => {
  if (importType.value === 'excel') {
    if (fileList.value.length === 0) {
      ElMessage.warning('请先选择文件')
      return
    }
    
    uploading.value = true
    try {
      emit('import', fileList.value[0])
      dialogVisible.value = false
    } catch (error) {
      ElMessage.error('上传失败')
    } finally {
      uploading.value = false
    }
  } else if (importType.value === 'agent') {
    if (!selectedAgentId.value) {
      ElMessage.warning('请先选择智能体')
      return
    }
    
    uploading.value = true
    try {
      emit('importByAgent', selectedAgentId.value)
      dialogVisible.value = false
    } catch (error) {
      ElMessage.error('智能体导入失败')
    } finally {
      uploading.value = false
    }
  } else if (importType.value === 'api') {
    if (!apiIdentifier.value) {
      ElMessage.warning('未配置API接口，请先完成配置')
      return
    }
    
    uploading.value = true
    try {
      const result = await syncFriendListByApi()
      if (result.success) {
        ElMessage.success(`同步成功，共导入 ${result.count} 条数据`)
        emit('importByApi', result)
        dialogVisible.value = false
      } else {
        ElMessage.error('同步失败')
      }
    } catch (error) {
      console.error('API同步失败:', error)
      const errorMessage = error instanceof Error ? error.message : 'API同步失败'
      // if (errorMessage.includes('未配置') || errorMessage.includes('配置无效')) {
      //   ElMessage.warning('未配置API接口，请先完成配置')
      // } else {
      ElMessage.error(errorMessage)
      // }
    } finally {
      uploading.value = false
    }
  }
}

return (_ctx: any,_cache: any) => {
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_upload = _resolveComponent("el-upload")!
  const _component_el_tab_pane = _resolveComponent("el-tab-pane")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_tabs = _resolveComponent("el-tabs")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    title: "导入微信号/手机号名单",
    modelValue: dialogVisible.value,
    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((dialogVisible).value = $event)),
    width: "500px"
  }, {
    footer: _withCtx(() => [
      _createElementVNode("span", _hoisted_12, [
        _createVNode(_component_el_button, {
          onClick: _cache[2] || (_cache[2] = ($event: any) => (dialogVisible.value = false))
        }, {
          default: _withCtx(() => [...(_cache[12] || (_cache[12] = [
            _createTextVNode("取消", -1)
          ]))]),
          _: 1
        }),
        _createVNode(_component_el_button, {
          type: "primary",
          onClick: handleUpload,
          loading: uploading.value,
          disabled: importType.value === 'api' && !apiIdentifier.value
        }, {
          default: _withCtx(() => [
            _createTextVNode(_toDisplayString(getButtonText()), 1)
          ]),
          _: 1
        }, 8, ["loading", "disabled"])
      ])
    ]),
    default: _withCtx(() => [
      _createVNode(_component_el_tabs, {
        modelValue: importType.value,
        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((importType).value = $event))
      }, {
        default: _withCtx(() => [
          (allows('excel'))
            ? (_openBlock(), _createBlock(_component_el_tab_pane, {
                key: 0,
                label: "Excel导入",
                name: "excel"
              }, {
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_1, [
                    _createElementVNode("div", _hoisted_2, [
                      _createVNode(_component_el_icon, { class: "info-icon" }, {
                        default: _withCtx(() => [
                          _createVNode(_unref(InfoFilled))
                        ]),
                        _: 1
                      }),
                      _cache[5] || (_cache[5] = _createElementVNode("p", null, "将名单录入到表格中，然后导入即可", -1)),
                      _createVNode(_component_el_button, {
                        type: "primary",
                        link: "",
                        onClick: downloadTemplate,
                        class: "template-btn"
                      }, {
                        default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
                          _createTextVNode(" 下载模板 ", -1)
                        ]))]),
                        _: 1
                      })
                    ])
                  ]),
                  _createVNode(_component_el_upload, {
                    class: "upload-demo",
                    action: '',
                    "auto-upload": false,
                    "on-change": handleFileChange,
                    "before-upload": beforeUpload,
                    accept: ".xlsx,.xls,.csv"
                  }, {
                    trigger: _withCtx(() => [
                      _createVNode(_component_el_button, { plain: "" }, {
                        default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
                          _createTextVNode("选择文件", -1)
                        ]))]),
                        _: 1
                      })
                    ]),
                    tip: _withCtx(() => [...(_cache[7] || (_cache[7] = [
                      _createElementVNode("div", { class: "el-upload__tip" }, " 仅支持 xlsx、xls、csv 格式文件 ", -1)
                    ]))]),
                    _: 1
                  })
                ]),
                _: 1
              }))
            : _createCommentVNode("", true),
          (allows('agent'))
            ? (_openBlock(), _createBlock(_component_el_tab_pane, {
                key: 1,
                label: "智能体导入",
                name: "agent"
              }, {
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_3, [
                    _createElementVNode("div", _hoisted_4, [
                      _createVNode(_component_el_icon, { class: "info-icon" }, {
                        default: _withCtx(() => [
                          _createVNode(_unref(InfoFilled))
                        ]),
                        _: 1
                      }),
                      _cache[8] || (_cache[8] = _createElementVNode("p", null, "通过智能体连接飞书获取名单数据", -1))
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_5, [
                    _createVNode(_component_el_form, { "label-width": "0px" }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_form_item, { class: "agent-select-form-item" }, {
                          default: _withCtx(() => [
                            _cache[9] || (_cache[9] = _createElementVNode("span", { class: "form-item-label" }, "选择智能体", -1)),
                            _createVNode(_component_el_select, {
                              modelValue: selectedAgentId.value,
                              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((selectedAgentId).value = $event)),
                              placeholder: "请选择智能体",
                              class: "agent-select"
                            }, {
                              default: _withCtx(() => [
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(__props.cozeAgents, (agent) => {
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
                          _: 1
                        })
                      ]),
                      _: 1
                    })
                  ])
                ]),
                _: 1
              }))
            : _createCommentVNode("", true),
          (allows('api'))
            ? (_openBlock(), _createBlock(_component_el_tab_pane, {
                key: 2,
                label: "API导入",
                name: "api"
              }, {
                default: _withCtx(() => [
                  _createElementVNode("div", _hoisted_6, [
                    _createElementVNode("div", _hoisted_7, [
                      _createVNode(_component_el_icon, { class: "info-icon" }, {
                        default: _withCtx(() => [
                          _createVNode(_unref(InfoFilled))
                        ]),
                        _: 1
                      }),
                      _cache[10] || (_cache[10] = _createElementVNode("p", null, "每次执行任务自动同步数据，也可手动点击同步", -1))
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_8, [
                    _createElementVNode("div", _hoisted_9, [
                      _cache[11] || (_cache[11] = _createElementVNode("span", { class: "status-label" }, "API接口标识：", -1)),
                      (apiIdentifier.value)
                        ? (_openBlock(), _createElementBlock("span", _hoisted_10, _toDisplayString(formatApiIdentifier(apiIdentifier.value)) + "（已配置） ", 1))
                        : (_openBlock(), _createElementBlock("span", _hoisted_11, " 尚未配置接口，请先完成配置 "))
                    ])
                  ])
                ]),
                _: 1
              }))
            : _createCommentVNode("", true)
        ]),
        _: 1
      }, 8, ["modelValue"])
    ]),
    _: 1
  }, 8, ["modelValue"]))
}
}

})