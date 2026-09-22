import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, createTextVNode as _createTextVNode, renderList as _renderList, Fragment as _Fragment, toDisplayString as _toDisplayString, createBlock as _createBlock, normalizeClass as _normalizeClass } from "vue"

const _hoisted_1 = {
  class: "backup-trigger",
  type: "button"
}
const _hoisted_2 = { class: "trigger-icon" }
const _hoisted_3 = { class: "trigger-copy" }
const _hoisted_4 = { key: 0 }
const _hoisted_5 = { class: "backup-menu" }
const _hoisted_6 = { class: "menu-action-icon" }
const _hoisted_7 = { class: "menu-action-icon" }
const _hoisted_8 = { class: "dialog-title-row" }
const _hoisted_9 = { class: "dialog-title-icon export" }
const _hoisted_10 = {
  key: 0,
  class: "backup-dialog-body"
}
const _hoisted_11 = { class: "info-section" }
const _hoisted_12 = { class: "section-title" }
const _hoisted_13 = { class: "feature-grid" }
const _hoisted_14 = { class: "info-section muted-section" }
const _hoisted_15 = { class: "section-title muted" }
const _hoisted_16 = { class: "excluded-list" }
const _hoisted_17 = { class: "attention-card" }
const _hoisted_18 = { class: "security-note" }
const _hoisted_19 = {
  key: 1,
  class: "export-success-state"
}
const _hoisted_20 = { class: "success-orbit export-success-icon" }
const _hoisted_21 = { class: "export-file-card" }
const _hoisted_22 = { class: "export-file-icon" }
const _hoisted_23 = { class: "export-file-copy" }
const _hoisted_24 = { class: "export-path-block" }
const _hoisted_25 = ["title"]
const _hoisted_26 = { class: "dialog-title-row" }
const _hoisted_27 = { class: "dialog-title-icon import" }
const _hoisted_28 = {
  key: 0,
  class: "backup-dialog-body"
}
const _hoisted_29 = { class: "upload-copy" }
const _hoisted_30 = {
  key: 0,
  class: "inspection-loading"
}
const _hoisted_31 = { class: "inspection-card" }
const _hoisted_32 = { class: "inspection-head" }
const _hoisted_33 = { class: "valid-badge" }
const _hoisted_34 = { class: "summary-grid" }
const _hoisted_35 = { class: "backup-meta" }
const _hoisted_36 = {
  key: 0,
  class: "inline-warnings"
}
const _hoisted_37 = { class: "attention-card import-warning" }
const _hoisted_38 = {
  key: 1,
  class: "import-success-state"
}
const _hoisted_39 = { class: "success-orbit" }
const _hoisted_40 = { class: "success-reminder" }

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import {
  ArrowRight,
  Calendar,
  CircleCheckFilled,
  CopyDocument,
  DocumentChecked,
  Download,
  FolderOpened,
  InfoFilled,
  Loading,
  Lock,
  RefreshRight,
  RemoveFilled,
  Upload,
  UploadFilled,
  WarningFilled
} from '@element-plus/icons-vue'
import {
  applySettingsBackup,
  discardSettingsBackup,
  exportSettingsBackup,
  inspectSettingsBackup,
  openSettingsBackupFolder,
  type BackupExportResult,
  type BackupImportResult,
  type BackupInspection
} from '@/api/settingsBackup'

const defaultManualAdjustment = 'AI 销冠页的文件识别路径属于本机路径，导入后会自动关闭并清空，请重新选择后开启。'


export default /*@__PURE__*/_defineComponent({
  __name: 'SettingsBackup',
  props: {
    compact: { type: Boolean, default: false },
    afterImport: {}
  },
  setup(__props: any) {

const props = __props

const menuVisible = ref(false)
const exportDialogVisible = ref(false)
const importDialogVisible = ref(false)
const exporting = ref(false)
const exportResult = ref<BackupExportResult | null>(null)
const inspectionLoading = ref(false)
const applying = ref(false)
const overwriteConfirmed = ref(false)
const inspection = ref<BackupInspection | null>(null)
const importResult = ref<BackupImportResult | null>(null)
const selectedFileName = ref('')
const uploadRef = ref<UploadInstance>()

const exportIncludes = [
  'AI 平台与智能体配置',
  '各微信账号的 AI 助理配置',
  '回复、话术、SOP 与通知配置',
  '朋友圈、休息时间与公共规则配置'
]
const exportExcludes = [
  'AI 语音平台、音色库和语音话术',
  '文件库、普通文件话术附件和其他用户数据',
  '软件授权、设备密钥和渠道信息',
  '聊天记录、任务日志、缓存和运行进度'
]
const openExportDialog = () => {
  menuVisible.value = false
  exportResult.value = null
  exportDialogVisible.value = true
}

const resetImportState = () => {
  inspection.value = null
  importResult.value = null
  selectedFileName.value = ''
  overwriteConfirmed.value = false
  uploadRef.value?.clearFiles()
}

const discardCurrentInspection = async () => {
  if (inspection.value?.importId) {
    await discardSettingsBackup(inspection.value.importId)
  }
  inspection.value = null
  overwriteConfirmed.value = false
}

const openImportDialog = () => {
  menuVisible.value = false
  resetImportState()
  importDialogVisible.value = true
}

const handleExport = async () => {
  exporting.value = true
  try {
    exportResult.value = await exportSettingsBackup()
    ElMessage.success('配置备份已保存到下载目录')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '导出配置失败')
  } finally {
    exporting.value = false
  }
}

const closeExportDialog = () => {
  exportDialogVisible.value = false
  exportResult.value = null
}

const handleOpenExportFolder = async () => {
  if (!exportResult.value) return
  try {
    await openSettingsBackupFolder(exportResult.value.exportId)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '打开文件夹失败')
  }
}

const copyExportPath = async () => {
  if (!exportResult.value) return
  const text = exportResult.value.filePath
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    ElMessage.success('文件路径已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择路径复制')
  }
}

const handleImportFileChange = async (uploadFile: UploadFile) => {
  if (!uploadFile.raw) return
  await discardCurrentInspection()
  selectedFileName.value = uploadFile.name
  inspectionLoading.value = true
  try {
    inspection.value = await inspectSettingsBackup(uploadFile.raw)
    ElMessage.success('备份检查通过，请确认导入内容')
  } catch (error) {
    selectedFileName.value = ''
    uploadRef.value?.clearFiles()
    ElMessage.error(error instanceof Error ? error.message : '备份文件检查失败')
  } finally {
    inspectionLoading.value = false
  }
}

const handleImportFileRemove = async () => {
  await discardCurrentInspection()
  selectedFileName.value = ''
}

const handleApplyImport = async () => {
  if (!inspection.value || !overwriteConfirmed.value) return
  applying.value = true
  try {
    importResult.value = await applySettingsBackup(inspection.value.importId)
    inspection.value = null
    localStorage.removeItem('commentConfig')
    localStorage.removeItem('friendConfig')
    localStorage.removeItem('addFriendConfig')
    try {
      await props.afterImport?.()
      ElMessage.success('配置已导入，配置页已刷新')
    } catch (refreshError) {
      console.error('导入成功后刷新配置页失败:', refreshError)
      ElMessage.warning('配置已导入，但页面刷新失败，请切换页面后重新查看')
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '配置导入失败')
  } finally {
    applying.value = false
  }
}

const closeImportDialog = async () => {
  await discardCurrentInspection()
  importDialogVisible.value = false
  resetImportState()
}

const beforeImportClose = async (done: () => void) => {
  if (applying.value) return
  await discardCurrentInspection()
  resetImportState()
  done()
}

const formatDate = (value?: string) => {
  if (!value) return '备份时间未知'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

return (_ctx: any,_cache: any) => {
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_popover = _resolveComponent("el-popover")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!
  const _component_el_upload = _resolveComponent("el-upload")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!

  return (_openBlock(), _createElementBlock("div", {
    class: _normalizeClass(["settings-backup", { compact: __props.compact }])
  }, [
    _createVNode(_component_el_popover, {
      visible: menuVisible.value,
      "onUpdate:visible": _cache[0] || (_cache[0] = ($event: any) => ((menuVisible).value = $event)),
      placement: __props.compact ? 'bottom-end' : 'right-end',
      width: 310,
      trigger: "click",
      "popper-class": "settings-backup-popover"
    }, {
      reference: _withCtx(() => [
        _createElementVNode("button", _hoisted_1, [
          _createElementVNode("span", _hoisted_2, [
            _createVNode(_component_el_icon, null, {
              default: _withCtx(() => [
                _createVNode(_unref(FolderOpened))
              ]),
              _: 1
            })
          ]),
          _createElementVNode("span", _hoisted_3, [
            _cache[4] || (_cache[4] = _createElementVNode("strong", null, "配置备份", -1)),
            (!__props.compact)
              ? (_openBlock(), _createElementBlock("small", _hoisted_4, "换电脑也能快速恢复"))
              : _createCommentVNode("", true)
          ]),
          _createVNode(_component_el_icon, { class: "trigger-arrow" }, {
            default: _withCtx(() => [
              _createVNode(_unref(ArrowRight))
            ]),
            _: 1
          })
        ])
      ]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_5, [
          _cache[7] || (_cache[7] = _createElementVNode("div", { class: "menu-heading" }, [
            _createElementVNode("strong", null, "导入与导出"),
            _createElementVNode("span", null, "迁移全局配置和各微信账号的 AI 助理配置")
          ], -1)),
          _createElementVNode("button", {
            class: "menu-action export-action",
            type: "button",
            onClick: openExportDialog
          }, [
            _createElementVNode("span", _hoisted_6, [
              _createVNode(_component_el_icon, null, {
                default: _withCtx(() => [
                  _createVNode(_unref(Download))
                ]),
                _: 1
              })
            ]),
            _cache[5] || (_cache[5] = _createElementVNode("span", null, [
              _createElementVNode("strong", null, "导出配置"),
              _createElementVNode("small", null, "生成 ZIP 备份文件")
            ], -1)),
            _createVNode(_component_el_icon, { class: "menu-chevron" }, {
              default: _withCtx(() => [
                _createVNode(_unref(ArrowRight))
              ]),
              _: 1
            })
          ]),
          _createElementVNode("button", {
            class: "menu-action import-action",
            type: "button",
            onClick: openImportDialog
          }, [
            _createElementVNode("span", _hoisted_7, [
              _createVNode(_component_el_icon, null, {
                default: _withCtx(() => [
                  _createVNode(_unref(Upload))
                ]),
                _: 1
              })
            ]),
            _cache[6] || (_cache[6] = _createElementVNode("span", null, [
              _createElementVNode("strong", null, "导入配置"),
              _createElementVNode("small", null, "检查备份后覆盖同名配置")
            ], -1)),
            _createVNode(_component_el_icon, { class: "menu-chevron" }, {
              default: _withCtx(() => [
                _createVNode(_unref(ArrowRight))
              ]),
              _: 1
            })
          ])
        ])
      ]),
      _: 1
    }, 8, ["visible", "placement"]),
    _createVNode(_component_el_dialog, {
      modelValue: exportDialogVisible.value,
      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((exportDialogVisible).value = $event)),
      width: "650px",
      class: "backup-dialog",
      "align-center": ""
    }, {
      header: _withCtx(() => [
        _createElementVNode("div", _hoisted_8, [
          _createElementVNode("span", _hoisted_9, [
            _createVNode(_component_el_icon, null, {
              default: _withCtx(() => [
                _createVNode(_unref(Download))
              ]),
              _: 1
            })
          ]),
          _cache[8] || (_cache[8] = _createElementVNode("div", null, [
            _createElementVNode("h3", null, "导出配置备份"),
            _createElementVNode("p", null, "生成可在其他电脑导入的 ZIP 文件")
          ], -1))
        ])
      ]),
      footer: _withCtx(() => [
        (!exportResult.value)
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
              _createVNode(_component_el_button, { onClick: closeExportDialog }, {
                default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
                  _createTextVNode("取消", -1)
                ]))]),
                _: 1
              }),
              _createVNode(_component_el_button, {
                type: "primary",
                loading: exporting.value,
                onClick: handleExport
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_icon, { class: "el-icon--left" }, {
                    default: _withCtx(() => [
                      _createVNode(_unref(Download))
                    ]),
                    _: 1
                  }),
                  _cache[18] || (_cache[18] = _createTextVNode("导出到下载目录 ", -1))
                ]),
                _: 1
              }, 8, ["loading"])
            ], 64))
          : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
              _createVNode(_component_el_button, { onClick: copyExportPath }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_icon, { class: "el-icon--left" }, {
                    default: _withCtx(() => [
                      _createVNode(_unref(CopyDocument))
                    ]),
                    _: 1
                  }),
                  _cache[19] || (_cache[19] = _createTextVNode("复制路径 ", -1))
                ]),
                _: 1
              }),
              _createVNode(_component_el_button, {
                type: "primary",
                onClick: handleOpenExportFolder
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_icon, { class: "el-icon--left" }, {
                    default: _withCtx(() => [
                      _createVNode(_unref(FolderOpened))
                    ]),
                    _: 1
                  }),
                  _cache[20] || (_cache[20] = _createTextVNode("打开所在文件夹 ", -1))
                ]),
                _: 1
              }),
              _createVNode(_component_el_button, { onClick: closeExportDialog }, {
                default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
                  _createTextVNode("完成", -1)
                ]))]),
                _: 1
              })
            ], 64))
      ]),
      default: _withCtx(() => [
        (!exportResult.value)
          ? (_openBlock(), _createElementBlock("div", _hoisted_10, [
              _createElementVNode("section", _hoisted_11, [
                _createElementVNode("div", _hoisted_12, [
                  _createVNode(_component_el_icon, null, {
                    default: _withCtx(() => [
                      _createVNode(_unref(CircleCheckFilled))
                    ]),
                    _: 1
                  }),
                  _cache[9] || (_cache[9] = _createTextVNode("本次将导出", -1))
                ]),
                _createElementVNode("div", _hoisted_13, [
                  (_openBlock(), _createElementBlock(_Fragment, null, _renderList(exportIncludes, (item) => {
                    return _createElementVNode("div", {
                      key: item,
                      class: "feature-item"
                    }, [
                      _cache[10] || (_cache[10] = _createElementVNode("span", { class: "feature-dot" }, null, -1)),
                      _createTextVNode(_toDisplayString(item), 1)
                    ])
                  }), 64))
                ])
              ]),
              _createElementVNode("section", _hoisted_14, [
                _createElementVNode("div", _hoisted_15, [
                  _createVNode(_component_el_icon, null, {
                    default: _withCtx(() => [
                      _createVNode(_unref(RemoveFilled))
                    ]),
                    _: 1
                  }),
                  _cache[11] || (_cache[11] = _createTextVNode("以下内容不会导出", -1))
                ]),
                _createElementVNode("div", _hoisted_16, [
                  (_openBlock(), _createElementBlock(_Fragment, null, _renderList(exportExcludes, (item) => {
                    return _createElementVNode("span", { key: item }, _toDisplayString(item), 1)
                  }), 64))
                ])
              ]),
              _createElementVNode("div", _hoisted_17, [
                _createVNode(_component_el_icon, null, {
                  default: _withCtx(() => [
                    _createVNode(_unref(WarningFilled))
                  ]),
                  _: 1
                }),
                _cache[12] || (_cache[12] = _createElementVNode("div", null, [
                  _createElementVNode("strong", null, "换电脑后需要重新设置文件识别路径"),
                  _createElementVNode("p", null, "AI 销冠页的“AI 助理配置 → 是否识别文件”依赖本机微信文件保存路径。导入后系统会自动关闭文件识别并清空旧路径，请在新设备重新选择路径后开启。")
                ], -1))
              ]),
              _createElementVNode("div", _hoisted_18, [
                _createVNode(_component_el_icon, null, {
                  default: _withCtx(() => [
                    _createVNode(_unref(Lock))
                  ]),
                  _: 1
                }),
                _cache[13] || (_cache[13] = _createElementVNode("span", null, "备份中可能包含 AI 平台 Token、飞书密钥等敏感配置，请勿通过公开群聊或网盘分享。", -1))
              ])
            ]))
          : (_openBlock(), _createElementBlock("div", _hoisted_19, [
              _createElementVNode("div", _hoisted_20, [
                _createVNode(_component_el_icon, null, {
                  default: _withCtx(() => [
                    _createVNode(_unref(CircleCheckFilled))
                  ]),
                  _: 1
                })
              ]),
              _cache[15] || (_cache[15] = _createElementVNode("h3", null, "配置备份已保存", -1)),
              _cache[16] || (_cache[16] = _createElementVNode("p", null, "备份文件已经写入本机下载目录，可以直接打开所在文件夹查看。", -1)),
              _createElementVNode("div", _hoisted_21, [
                _createElementVNode("div", _hoisted_22, [
                  _createVNode(_component_el_icon, null, {
                    default: _withCtx(() => [
                      _createVNode(_unref(DocumentChecked))
                    ]),
                    _: 1
                  })
                ]),
                _createElementVNode("div", _hoisted_23, [
                  _createElementVNode("strong", null, _toDisplayString(exportResult.value.fileName), 1),
                  _createElementVNode("span", null, _toDisplayString(formatBytes(exportResult.value.fileSize)), 1)
                ])
              ]),
              _createElementVNode("div", _hoisted_24, [
                _cache[14] || (_cache[14] = _createElementVNode("span", { class: "path-label" }, "保存位置", -1)),
                _createElementVNode("div", {
                  class: "path-value",
                  title: exportResult.value.filePath
                }, _toDisplayString(exportResult.value.filePath), 9, _hoisted_25)
              ])
            ]))
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: importDialogVisible.value,
      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((importDialogVisible).value = $event)),
      width: "680px",
      class: "backup-dialog",
      "align-center": "",
      "before-close": beforeImportClose
    }, {
      header: _withCtx(() => [
        _createElementVNode("div", _hoisted_26, [
          _createElementVNode("span", _hoisted_27, [
            _createVNode(_component_el_icon, null, {
              default: _withCtx(() => [
                _createVNode(_unref(Upload))
              ]),
              _: 1
            })
          ]),
          _cache[22] || (_cache[22] = _createElementVNode("div", null, [
            _createElementVNode("h3", null, "导入配置备份"),
            _createElementVNode("p", null, "系统会先检查文件，确认无误后才会覆盖配置")
          ], -1))
        ])
      ]),
      footer: _withCtx(() => [
        (!importResult.value)
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
              _createVNode(_component_el_button, { onClick: closeImportDialog }, {
                default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
                  _createTextVNode("取消", -1)
                ]))]),
                _: 1
              }),
              _createVNode(_component_el_button, {
                type: "primary",
                disabled: !inspection.value || !overwriteConfirmed.value || inspectionLoading.value,
                loading: applying.value,
                onClick: handleApplyImport
              }, {
                default: _withCtx(() => [...(_cache[34] || (_cache[34] = [
                  _createTextVNode(" 确认覆盖并导入 ", -1)
                ]))]),
                _: 1
              }, 8, ["disabled", "loading"])
            ], 64))
          : (_openBlock(), _createBlock(_component_el_button, {
              key: 1,
              type: "primary",
              onClick: closeImportDialog
            }, {
              default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
                _createTextVNode("完成", -1)
              ]))]),
              _: 1
            }))
      ]),
      default: _withCtx(() => [
        (!importResult.value)
          ? (_openBlock(), _createElementBlock("div", _hoisted_28, [
              _createVNode(_component_el_upload, {
                ref_key: "uploadRef",
                ref: uploadRef,
                class: "backup-uploader",
                drag: "",
                accept: ".zip,application/zip",
                "auto-upload": false,
                limit: 1,
                "on-change": handleImportFileChange,
                "on-remove": handleImportFileRemove
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_icon, { class: "upload-art" }, {
                    default: _withCtx(() => [
                      _createVNode(_unref(UploadFilled))
                    ]),
                    _: 1
                  }),
                  _createElementVNode("div", _hoisted_29, [
                    _createElementVNode("strong", null, _toDisplayString(inspectionLoading.value ? '正在检查备份文件…' : '将配置备份拖到这里'), 1),
                    _cache[23] || (_cache[23] = _createElementVNode("span", null, "或点击选择 webot_settings_*.zip", -1))
                  ])
                ]),
                _: 1
              }, 512),
              (inspectionLoading.value)
                ? (_openBlock(), _createElementBlock("div", _hoisted_30, [
                    _createVNode(_component_el_icon, { class: "is-loading" }, {
                      default: _withCtx(() => [
                        _createVNode(_unref(Loading))
                      ]),
                      _: 1
                    }),
                    _cache[24] || (_cache[24] = _createTextVNode(" 正在校验备份清单、文件完整性和配置格式 ", -1))
                  ]))
                : _createCommentVNode("", true),
              (inspection.value)
                ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                    _createElementVNode("div", _hoisted_31, [
                      _createElementVNode("div", _hoisted_32, [
                        _createElementVNode("div", _hoisted_33, [
                          _createVNode(_component_el_icon, null, {
                            default: _withCtx(() => [
                              _createVNode(_unref(CircleCheckFilled))
                            ]),
                            _: 1
                          }),
                          _cache[25] || (_cache[25] = _createTextVNode("有效的配置备份", -1))
                        ]),
                        _createElementVNode("span", null, "来自版本 " + _toDisplayString(inspection.value.appVersion || '未知'), 1)
                      ]),
                      _createElementVNode("div", _hoisted_34, [
                        _createElementVNode("div", null, [
                          _createElementVNode("strong", null, _toDisplayString(inspection.value.summary.globalConfigCount || 0), 1),
                          _cache[26] || (_cache[26] = _createElementVNode("span", null, "全局配置", -1))
                        ]),
                        _createElementVNode("div", null, [
                          _createElementVNode("strong", null, _toDisplayString(inspection.value.summary.accountConfigCount || 0), 1),
                          _cache[27] || (_cache[27] = _createElementVNode("span", null, "微信账号", -1))
                        ]),
                        _createElementVNode("div", null, [
                          _createElementVNode("strong", null, _toDisplayString(formatBytes(inspection.value.summary.totalBytes || 0)), 1),
                          _cache[28] || (_cache[28] = _createElementVNode("span", null, "解压大小", -1))
                        ])
                      ]),
                      _createElementVNode("div", _hoisted_35, [
                        _createElementVNode("span", null, [
                          _createVNode(_component_el_icon, null, {
                            default: _withCtx(() => [
                              _createVNode(_unref(Calendar))
                            ]),
                            _: 1
                          }),
                          _createTextVNode(_toDisplayString(formatDate(inspection.value.createdAt)), 1)
                        ]),
                        _createElementVNode("span", null, [
                          _createVNode(_component_el_icon, null, {
                            default: _withCtx(() => [
                              _createVNode(_unref(DocumentChecked))
                            ]),
                            _: 1
                          }),
                          _createTextVNode(_toDisplayString(selectedFileName.value), 1)
                        ])
                      ])
                    ]),
                    (inspection.value.warnings?.length)
                      ? (_openBlock(), _createElementBlock("div", _hoisted_36, [
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(inspection.value.warnings, (warning) => {
                            return (_openBlock(), _createElementBlock("div", { key: warning }, [
                              _createVNode(_component_el_icon, null, {
                                default: _withCtx(() => [
                                  _createVNode(_unref(InfoFilled))
                                ]),
                                _: 1
                              }),
                              _createTextVNode(_toDisplayString(warning), 1)
                            ]))
                          }), 128))
                        ]))
                      : _createCommentVNode("", true),
                    _createElementVNode("div", _hoisted_37, [
                      _createVNode(_component_el_icon, null, {
                        default: _withCtx(() => [
                          _createVNode(_unref(WarningFilled))
                        ]),
                        _: 1
                      }),
                      _createElementVNode("div", null, [
                        _cache[29] || (_cache[29] = _createElementVNode("strong", null, "导入后请重新设置文件识别路径", -1)),
                        _createElementVNode("p", null, _toDisplayString(inspection.value.manualAdjustments?.[0] || defaultManualAdjustment), 1)
                      ])
                    ]),
                    _createVNode(_component_el_checkbox, {
                      modelValue: overwriteConfirmed.value,
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((overwriteConfirmed).value = $event)),
                      class: "overwrite-confirm"
                    }, {
                      default: _withCtx(() => [...(_cache[30] || (_cache[30] = [
                        _createTextVNode(" 我已了解：同名配置将被备份内容覆盖，语音配置和本机授权不会改变 ", -1)
                      ]))]),
                      _: 1
                    }, 8, ["modelValue"])
                  ], 64))
                : _createCommentVNode("", true)
            ]))
          : (_openBlock(), _createElementBlock("div", _hoisted_38, [
              _createElementVNode("div", _hoisted_39, [
                _createVNode(_component_el_icon, null, {
                  default: _withCtx(() => [
                    _createVNode(_unref(CircleCheckFilled))
                  ]),
                  _: 1
                })
              ]),
              _cache[32] || (_cache[32] = _createElementVNode("h3", null, "配置导入完成", -1)),
              _createElementVNode("p", null, "已导入 " + _toDisplayString(importResult.value.importedConfigCount) + " 项配置，当前配置页已经同步更新。", 1),
              _createElementVNode("div", _hoisted_40, [
                _createVNode(_component_el_icon, null, {
                  default: _withCtx(() => [
                    _createVNode(_unref(RefreshRight))
                  ]),
                  _: 1
                }),
                _cache[31] || (_cache[31] = _createElementVNode("div", null, [
                  _createElementVNode("strong", null, "最新配置已加载"),
                  _createElementVNode("span", null, "关闭弹窗即可检查导入参数。为确保正在运行的后台任务也使用新配置，完成检查后仍建议重新启动软件。")
                ], -1))
              ])
            ]))
      ]),
      _: 1
    }, 8, ["modelValue"])
  ], 2))
}
}

})