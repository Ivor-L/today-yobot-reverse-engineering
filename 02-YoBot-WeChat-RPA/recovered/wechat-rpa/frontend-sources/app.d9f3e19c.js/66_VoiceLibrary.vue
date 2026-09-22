import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, createBlock as _createBlock, withModifiers as _withModifiers, withKeys as _withKeys } from "vue"

const _hoisted_1 = { class: "voice-library" }
const _hoisted_2 = {
  key: 0,
  class: "env-warn-box"
}
const _hoisted_3 = { class: "env-warn-icon" }
const _hoisted_4 = { class: "env-warn-content" }
const _hoisted_5 = { class: "env-warn-list" }
const _hoisted_6 = { key: 0 }
const _hoisted_7 = { key: 1 }
const _hoisted_8 = { class: "custom-info-box" }
const _hoisted_9 = { class: "info-icon" }
const _hoisted_10 = { class: "info-content" }
const _hoisted_11 = { class: "speed-config" }
const _hoisted_12 = { class: "speed-row" }
const _hoisted_13 = { class: "speed-current" }
const _hoisted_14 = { class: "length-row" }
const _hoisted_15 = { class: "lib-header" }
const _hoisted_16 = { class: "lib-actions" }
const _hoisted_17 = { class: "voice-id" }

import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, CircleCheck, InfoFilled, WarningFilled, QuestionFilled } from '@element-plus/icons-vue'
import { voiceApi, type VoiceLibRecord, type VoiceLibStatus } from '@/api/voice'
import FfmpegInstallGuide from './FfmpegInstallGuide.vue'

type AudioEnv = NonNullable<Awaited<ReturnType<typeof voiceApi.getAudioDevices>>['data']>
interface AddForm {
  name: string
  voice_id: string
  language: 'zh' | 'en' | 'ja'
}

export default /*@__PURE__*/_defineComponent({
  __name: 'VoiceLibrary',
  setup(__props) {

const voices = ref<VoiceLibRecord[]>([])
const loading = ref(false)
const validating = reactive<Record<string, boolean>>({})
const validatingAll = ref(false)

// ---------- 语音环境探测（VB-Cable / ffmpeg） ----------
const audioEnv = ref<AudioEnv | null>(null)
const audioEnvLoading = ref(false)
const ffmpegGuideVisible = ref(false)

const envBannerVisible = computed(() => {
  if (!audioEnv.value) return false
  return !audioEnv.value.vb_cable_installed || !audioEnv.value.ffmpeg.installed
})

async function loadAudioEnv() {
  audioEnvLoading.value = true
  try {
    const r = await voiceApi.getAudioDevices()
    if (r.success && r.data) {
      audioEnv.value = r.data
    }
  } catch (e) {
    console.error('加载语音环境失败:', e)
  } finally {
    audioEnvLoading.value = false
  }
}

function openVBCableSite() {
  window.open('https://vb-audio.com/Cable/', '_blank', 'noopener')
}

// ---------- 自动回复语速 / 长度上限（全局） ----------
const autoReplySpeed = ref(1.0)
const ttsMaxChars = ref(120)
const speedMarks = {
  0.5: '0.5x',
  1.0: '1.0x',
  1.5: '1.5x',
  2.0: '2.0x',
}

async function loadVoiceSettings() {
  try {
    const r = await voiceApi.getConfig()
    if (r.success && r.data) {
      autoReplySpeed.value = r.data.auto_reply_speed ?? 1.0
      ttsMaxChars.value = r.data.tts_max_chars ?? 120
    }
  } catch (e) {
    console.error('加载语音配置失败:', e)
  }
}

async function onSpeedChange(v: number | number[]) {
  const val = Array.isArray(v) ? v[0] : v
  try {
    const r = await voiceApi.saveConfig({ auto_reply_speed: val } as any)
    if (r.success) {
      ElMessage.success({ message: `语速已设为 ${val.toFixed(1)}x`, duration: 1200 })
    } else {
      ElMessage.error(r.error || '保存失败')
    }
  } catch (e: any) {
    ElMessage.error(`保存语速失败: ${e?.message ?? e}`)
  }
}

async function onMaxCharsChange(v: number | undefined) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return
  try {
    const r = await voiceApi.saveConfig({ tts_max_chars: v } as any)
    if (r.success) {
      ElMessage.success({ message: `长度上限已设为 ${v} 字`, duration: 1200 })
    } else {
      ElMessage.error(r.error || '保存失败')
    }
  } catch (e: any) {
    ElMessage.error(`保存失败: ${e?.message ?? e}`)
  }
}

async function refresh() {
  loading.value = true
  try {
    const r = await voiceApi.listLibrary()
    if (r.success && r.data) {
      voices.value = r.data
    } else if (r.error) {
      ElMessage.error(r.error)
    }
  } catch (e: any) {
    ElMessage.error(`加载音色库失败: ${e?.message ?? e}`)
  } finally {
    loading.value = false
  }
}

function statusLabel(s: VoiceLibStatus) {
  return ({
    pending: '待校验',
    training: '训练中',
    active: '可用',
    failed: '校验失败',
    gone: '音色不存在',
  } as Record<VoiceLibStatus, string>)[s] || s
}
function statusTagType(s: VoiceLibStatus): 'success' | 'warning' | 'danger' | 'info' {
  if (s === 'active') return 'success'
  if (s === 'training' || s === 'pending') return 'warning'
  if (s === 'failed' || s === 'gone') return 'danger'
  return 'info'
}
function formatTs(ts: number) {
  if (!ts) return '-'
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function openConsole() {
  window.open('https://console.volcengine.com/speech/new/experience/clone', '_blank')
}

// ---------- 添加音色 ----------
const addVisible = ref(false)
const adding = ref(false)

const addForm = reactive<AddForm>({ name: '', voice_id: '', language: 'zh' })

const canSubmitAdd = computed(() => {
  return !!addForm.name.trim() && /^S_/.test(addForm.voice_id.trim())
})

function openAddDialog() {
  addForm.name = ''
  addForm.voice_id = ''
  addForm.language = 'zh'
  addVisible.value = true
}

async function onAddVoice() {
  const voice_id = addForm.voice_id.trim()
  const name = addForm.name.trim()

  adding.value = true
  try {
    const r = await voiceApi.addVoice({
      voice_id,
      name,
      language: addForm.language,
    })
    if (!r.success) throw new Error(r.error || '添加失败')

    addVisible.value = false
    ElMessage.success('已添加，正在校验...')
    await refresh()
    // 添加后自动校验一次，让用户立即看到 active/failed 反馈
    await validateOneInner(voice_id, { silent: false })
  } catch (e: any) {
    ElMessage.error(`添加失败: ${e?.message ?? e}`)
  } finally {
    adding.value = false
  }
}

// ---------- 校验 ----------
async function validateOneInner(voice_id: string, opts: { silent: boolean }) {
  validating[voice_id] = true
  try {
    const r = await voiceApi.validateVoices([voice_id])
    if (!r.success || !r.data) {
      if (!opts.silent) ElMessage.error(r.error || '校验失败')
      return
    }
    await refresh()
    const result = r.data[0]
    if (!result) return
    if (!opts.silent) {
      if (result.status === 'active') {
        ElMessage.success(`音色 ${voice_id} 校验通过，可用`)
      } else if (result.status === 'gone') {
        ElMessage.error(`音色 ${voice_id} 在平台上不存在`)
      } else {
        ElMessage.error(`音色 ${voice_id} 校验失败: ${result.message}`)
      }
    }
  } catch (e: any) {
    if (!opts.silent) ElMessage.error(`校验异常: ${e?.message ?? e}`)
  } finally {
    validating[voice_id] = false
  }
}

async function onValidateOne(row: VoiceLibRecord) {
  await validateOneInner(row.voice_id, { silent: false })
}

async function onValidateAll() {
  if (!voices.value.length) return
  validatingAll.value = true
  try {
    const r = await voiceApi.validateVoices()
    if (!r.success || !r.data) {
      ElMessage.error(r.error || '批量校验失败')
      return
    }
    await refresh()
    const total = r.data.length
    const ok = r.data.filter(x => x.status === 'active').length
    const bad = total - ok
    if (bad === 0) {
      ElMessage.success(`全部 ${total} 个音色均可用`)
    } else {
      ElMessage.warning(`${ok}/${total} 可用，${bad} 个失败 — 点单条「校验」查看具体原因`)
    }
  } catch (e: any) {
    ElMessage.error(`批量校验异常: ${e?.message ?? e}`)
  } finally {
    validatingAll.value = false
  }
}

// ---------- 删除 ----------
async function onDelete(row: VoiceLibRecord) {
  try {
    await ElMessageBox.confirm(
      `确定从本地库删除音色 "${row.name}" (${row.voice_id}) 吗？\n该操作不会删除火山平台上的 speaker_id 槽位，仅清除本地记录。`,
      '删除音色', { type: 'warning' },
    )
  } catch { return }
  try {
    const r = await voiceApi.deleteVoice(row.voice_id)
    if (r.success) {
      ElMessage.success('已删除')
      await refresh()
    } else {
      ElMessage.error(r.error || '删除失败')
    }
  } catch (e: any) {
    ElMessage.error(`删除异常: ${e?.message ?? e}`)
  }
}

// ---------- 试听 ----------
const previewVisible = ref(false)
const previewVoice = ref<VoiceLibRecord | null>(null)
const previewText = ref('你好，这是一段试听测试。')
const previewSpeed = ref(1.0)
const previewing = ref(false)

function openPreviewDialog(row: VoiceLibRecord) {
  previewVoice.value = row
  previewText.value = '你好，这是一段试听测试。'
  previewSpeed.value = 1.0
  previewVisible.value = true
}

async function onPreview() {
  if (!previewVoice.value) return
  previewing.value = true
  try {
    const r = await voiceApi.preview(
      previewText.value.trim(),
      previewVoice.value.voice_id,
      previewSpeed.value,
    )
    if (!r.success || !r.data) {
      // 错误时带上 error_code 让用户/我们能看出是鉴权/网络/空音频还是其它
      const code = r.error_code ? `[${r.error_code}] ` : ''
      throw new Error(`${code}${r.error || '合成失败'}`)
    }
    const url = voiceApi.previewAbsoluteUrl(r.data.url)
    window.open(url, '_blank', 'noopener')
    ElMessage.success('已在新窗口打开试听')
  } catch (e: any) {
    ElMessage.error({
      message: `试听失败: ${e?.message ?? e}`,
      duration: 6000,
      showClose: true,
    })
  } finally {
    previewing.value = false
  }
}

onMounted(() => {
  refresh()
  loadVoiceSettings()
  loadAudioEnv()
})

return (_ctx: any,_cache: any) => {
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_tooltip = _resolveComponent("el-tooltip")!
  const _component_el_slider = _resolveComponent("el-slider")!
  const _component_el_input_number = _resolveComponent("el-input-number")!
  const _component_el_table_column = _resolveComponent("el-table-column")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_table = _resolveComponent("el-table")!
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_radio = _resolveComponent("el-radio")!
  const _component_el_radio_group = _resolveComponent("el-radio-group")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    (envBannerVisible.value)
      ? (_openBlock(), _createElementBlock("div", _hoisted_2, [
          _createElementVNode("div", _hoisted_3, [
            _createVNode(_component_el_icon, null, {
              default: _withCtx(() => [
                _createVNode(_unref(WarningFilled))
              ]),
              _: 1
            })
          ]),
          _createElementVNode("div", _hoisted_4, [
            _cache[22] || (_cache[22] = _createElementVNode("div", { class: "env-warn-title" }, " 语音环境未就绪 — 当前发送语音会失败 ", -1)),
            _createElementVNode("ul", _hoisted_5, [
              (audioEnv.value && !audioEnv.value.vb_cable_installed)
                ? (_openBlock(), _createElementBlock("li", _hoisted_6, [
                    _cache[16] || (_cache[16] = _createElementVNode("span", { class: "env-bad" }, "✗", -1)),
                    _cache[17] || (_cache[17] = _createElementVNode("strong", null, "VB-Cable", -1)),
                    _cache[18] || (_cache[18] = _createTextVNode(" 未安装：发语音的虚拟音频通道 ", -1)),
                    _createVNode(_component_el_button, {
                      link: "",
                      type: "primary",
                      size: "small",
                      onClick: openVBCableSite
                    }, {
                      default: _withCtx(() => [...(_cache[15] || (_cache[15] = [
                        _createTextVNode(" 下载 VB-Cable → ", -1)
                      ]))]),
                      _: 1
                    })
                  ]))
                : _createCommentVNode("", true),
              (audioEnv.value && !audioEnv.value.ffmpeg.installed)
                ? (_openBlock(), _createElementBlock("li", _hoisted_7, [
                    _cache[19] || (_cache[19] = _createElementVNode("span", { class: "env-bad" }, "✗", -1)),
                    _cache[20] || (_cache[20] = _createElementVNode("strong", null, "ffmpeg", -1)),
                    _cache[21] || (_cache[21] = _createTextVNode(" 未安装：语音解码依赖 ", -1)),
                    _createVNode(_component_el_tooltip, {
                      content: "点击查看安装教程",
                      placement: "top"
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_button, {
                          circle: "",
                          size: "small",
                          type: "warning",
                          class: "help-btn",
                          onClick: _cache[0] || (_cache[0] = ($event: any) => (ffmpegGuideVisible.value = true))
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
                      _: 1
                    })
                  ]))
                : _createCommentVNode("", true)
            ])
          ]),
          _createVNode(_component_el_button, {
            loading: audioEnvLoading.value,
            size: "small",
            plain: "",
            onClick: loadAudioEnv
          }, {
            default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
              _createTextVNode(" 重新检测 ", -1)
            ]))]),
            _: 1
          }, 8, ["loading"])
        ]))
      : _createCommentVNode("", true),
    _createElementVNode("div", _hoisted_8, [
      _createElementVNode("div", _hoisted_9, [
        _createVNode(_component_el_icon, null, {
          default: _withCtx(() => [
            _createVNode(_unref(InfoFilled))
          ]),
          _: 1
        })
      ]),
      _createElementVNode("div", _hoisted_10, [
        _cache[25] || (_cache[25] = _createElementVNode("div", { class: "info-text" }, " 声音复刻请在火山控制台完成；本页只管理已复刻的音色 ID ", -1)),
        _createVNode(_component_el_button, {
          type: "primary",
          link: "",
          size: "small",
          onClick: openConsole
        }, {
          default: _withCtx(() => [...(_cache[24] || (_cache[24] = [
            _createTextVNode(" → 去火山控制台复刻声音 ", -1)
          ]))]),
          _: 1
        })
      ])
    ]),
    _createElementVNode("div", _hoisted_11, [
      _createElementVNode("div", _hoisted_12, [
        _cache[26] || (_cache[26] = _createElementVNode("span", { class: "speed-label" }, "自动回复语速", -1)),
        _createVNode(_component_el_slider, {
          modelValue: autoReplySpeed.value,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((autoReplySpeed).value = $event)),
          min: 0.5,
          max: 2.0,
          step: 0.1,
          marks: speedMarks,
          "format-tooltip": (v) => `${v.toFixed(1)}x`,
          class: "speed-slider",
          onChange: onSpeedChange
        }, null, 8, ["modelValue", "format-tooltip"]),
        _createElementVNode("span", _hoisted_13, _toDisplayString(autoReplySpeed.value.toFixed(1)) + "x", 1)
      ]),
      _cache[29] || (_cache[29] = _createElementVNode("div", { class: "speed-hint" }, " 所有语音回复都用这个语速 ", -1)),
      _createElementVNode("div", _hoisted_14, [
        _cache[27] || (_cache[27] = _createElementVNode("span", { class: "speed-label" }, "文本转语音长度上限", -1)),
        _createVNode(_component_el_input_number, {
          modelValue: ttsMaxChars.value,
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((ttsMaxChars).value = $event)),
          min: 20,
          max: 300,
          step: 10,
          "controls-position": "right",
          class: "length-input",
          onChange: onMaxCharsChange
        }, null, 8, ["modelValue"]),
        _cache[28] || (_cache[28] = _createElementVNode("span", { class: "speed-unit" }, "字", -1))
      ]),
      _cache[30] || (_cache[30] = _createElementVNode("div", { class: "speed-hint" }, " 文本超过此长度自动改用文字发送，避免生成过长语音，推荐 80~150 ", -1))
    ]),
    _createElementVNode("div", _hoisted_15, [
      _createElementVNode("div", _hoisted_16, [
        _createVNode(_component_el_button, {
          onClick: refresh,
          loading: loading.value,
          icon: _unref(Refresh),
          plain: ""
        }, {
          default: _withCtx(() => [...(_cache[31] || (_cache[31] = [
            _createTextVNode(" 刷新 ", -1)
          ]))]),
          _: 1
        }, 8, ["loading", "icon"]),
        _createVNode(_component_el_button, {
          onClick: onValidateAll,
          loading: validatingAll.value,
          icon: _unref(CircleCheck),
          disabled: !voices.value.length,
          plain: ""
        }, {
          default: _withCtx(() => [...(_cache[32] || (_cache[32] = [
            _createTextVNode(" 批量校验 ", -1)
          ]))]),
          _: 1
        }, 8, ["loading", "icon", "disabled"]),
        _createVNode(_component_el_button, {
          type: "primary",
          icon: _unref(Plus),
          onClick: openAddDialog
        }, {
          default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
            _createTextVNode(" 添加音色 ", -1)
          ]))]),
          _: 1
        }, 8, ["icon"])
      ])
    ]),
    _createVNode(_component_el_table, {
      data: voices.value,
      "empty-text": "还没添加任何音色 — 先去火山控制台复刻，回来粘贴 Speaker ID",
      stripe: "",
      style: {"width":"100%","margin-top":"12px"}
    }, {
      default: _withCtx(() => [
        _createVNode(_component_el_table_column, {
          prop: "name",
          label: "名称",
          "min-width": "120",
          "show-overflow-tooltip": ""
        }),
        _createVNode(_component_el_table_column, {
          prop: "voice_id",
          label: "Speaker ID",
          "min-width": "170"
        }, {
          default: _withCtx(({ row }) => [
            _createElementVNode("code", _hoisted_17, _toDisplayString(row.voice_id), 1)
          ]),
          _: 1
        }),
        _createVNode(_component_el_table_column, {
          label: "状态",
          width: "100",
          align: "center"
        }, {
          default: _withCtx(({ row }) => [
            (row.message)
              ? (_openBlock(), _createBlock(_component_el_tooltip, {
                  key: 0,
                  content: row.message,
                  placement: "top"
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_tag, {
                      type: statusTagType(row.status),
                      size: "small"
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(statusLabel(row.status)), 1)
                      ]),
                      _: 2
                    }, 1032, ["type"])
                  ]),
                  _: 2
                }, 1032, ["content"]))
              : (_openBlock(), _createBlock(_component_el_tag, {
                  key: 1,
                  type: statusTagType(row.status),
                  size: "small"
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(_toDisplayString(statusLabel(row.status)), 1)
                  ]),
                  _: 2
                }, 1032, ["type"]))
          ]),
          _: 1
        }),
        _createVNode(_component_el_table_column, {
          label: "创建时间",
          width: "140",
          align: "center"
        }, {
          default: _withCtx(({ row }) => [
            _createTextVNode(_toDisplayString(formatTs(row.created_at)), 1)
          ]),
          _: 1
        }),
        _createVNode(_component_el_table_column, {
          label: "操作",
          width: "180",
          fixed: "right",
          align: "center"
        }, {
          default: _withCtx(({ row }) => [
            _createVNode(_component_el_button, {
              link: "",
              type: "primary",
              size: "small",
              onClick: ($event: any) => (onValidateOne(row)),
              loading: validating[row.voice_id]
            }, {
              default: _withCtx(() => [...(_cache[34] || (_cache[34] = [
                _createTextVNode("校验", -1)
              ]))]),
              _: 1
            }, 8, ["onClick", "loading"]),
            _createVNode(_component_el_button, {
              link: "",
              type: "success",
              size: "small",
              disabled: row.status !== 'active',
              onClick: ($event: any) => (openPreviewDialog(row))
            }, {
              default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
                _createTextVNode("试听", -1)
              ]))]),
              _: 1
            }, 8, ["disabled", "onClick"]),
            _createVNode(_component_el_button, {
              link: "",
              type: "danger",
              size: "small",
              onClick: ($event: any) => (onDelete(row))
            }, {
              default: _withCtx(() => [...(_cache[36] || (_cache[36] = [
                _createTextVNode("删除", -1)
              ]))]),
              _: 1
            }, 8, ["onClick"])
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["data"]),
    _createVNode(_component_el_dialog, {
      modelValue: addVisible.value,
      "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event: any) => ((addVisible).value = $event)),
      title: "添加已复刻的音色",
      width: "560px",
      "close-on-click-modal": false,
      "append-to-body": ""
    }, {
      footer: _withCtx(() => [
        _createVNode(_component_el_button, {
          onClick: _cache[8] || (_cache[8] = ($event: any) => (addVisible.value = false))
        }, {
          default: _withCtx(() => [...(_cache[41] || (_cache[41] = [
            _createTextVNode("取消", -1)
          ]))]),
          _: 1
        }),
        _createVNode(_component_el_button, {
          type: "primary",
          disabled: !canSubmitAdd.value,
          loading: adding.value,
          onClick: onAddVoice
        }, {
          default: _withCtx(() => [...(_cache[42] || (_cache[42] = [
            _createTextVNode("添加并校验", -1)
          ]))]),
          _: 1
        }, 8, ["disabled", "loading"])
      ]),
      default: _withCtx(() => [
        _createVNode(_component_el_alert, {
          type: "warning",
          closable: false,
          title: "合规提醒",
          description: "仅添加你本人或已获授权人的复刻音色。冒充他人语音用于欺诈/骚扰将被永久封禁本软件账号。",
          "show-icon": "",
          style: {"margin-bottom":"14px"}
        }),
        _createVNode(_component_el_form, {
          model: addForm,
          "label-width": "100px"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_el_form_item, {
              label: "音色名称",
              required: ""
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_input, {
                  modelValue: addForm.name,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((addForm.name) = $event)),
                  placeholder: "给这个音色起个易记的名字",
                  maxlength: "40",
                  "show-word-limit": "",
                  onKeydown: _cache[4] || (_cache[4] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"]))
                }, null, 8, ["modelValue"])
              ]),
              _: 1
            }),
            _createVNode(_component_el_form_item, {
              label: "Speaker ID",
              required: ""
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_input, {
                  modelValue: addForm.voice_id,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event: any) => ((addForm.voice_id) = $event)),
                  placeholder: "形如 S_xxx，从火山控制台复刻完成后复制",
                  onKeydown: _cache[6] || (_cache[6] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"]))
                }, null, 8, ["modelValue"]),
                _cache[37] || (_cache[37] = _createElementVNode("span", { class: "form-hint" }, " 到火山控制台 → 模型推理 → 声音复刻 → 复刻完成后从音色详情复制 Speaker ID ", -1))
              ]),
              _: 1
            }),
            _createVNode(_component_el_form_item, { label: "语言" }, {
              default: _withCtx(() => [
                _createVNode(_component_el_radio_group, {
                  modelValue: addForm.language,
                  "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event: any) => ((addForm.language) = $event))
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_radio, { value: "zh" }, {
                      default: _withCtx(() => [...(_cache[38] || (_cache[38] = [
                        _createTextVNode("中文", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_el_radio, { value: "en" }, {
                      default: _withCtx(() => [...(_cache[39] || (_cache[39] = [
                        _createTextVNode("英文", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_el_radio, { value: "ja" }, {
                      default: _withCtx(() => [...(_cache[40] || (_cache[40] = [
                        _createTextVNode("日文", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["model"])
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_el_dialog, {
      modelValue: previewVisible.value,
      "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event: any) => ((previewVisible).value = $event)),
      title: `试听音色：${previewVoice.value?.name || ''}`,
      width: "560px",
      "append-to-body": ""
    }, {
      footer: _withCtx(() => [
        _createVNode(_component_el_button, {
          onClick: _cache[12] || (_cache[12] = ($event: any) => (previewVisible.value = false))
        }, {
          default: _withCtx(() => [...(_cache[43] || (_cache[43] = [
            _createTextVNode("关闭", -1)
          ]))]),
          _: 1
        }),
        _createVNode(_component_el_button, {
          type: "primary",
          loading: previewing.value,
          disabled: !previewText.value.trim(),
          onClick: onPreview
        }, {
          default: _withCtx(() => [...(_cache[44] || (_cache[44] = [
            _createTextVNode("生成并在浏览器中播放", -1)
          ]))]),
          _: 1
        }, 8, ["loading", "disabled"])
      ]),
      default: _withCtx(() => [
        _createVNode(_component_el_form, { "label-width": "80px" }, {
          default: _withCtx(() => [
            _createVNode(_component_el_form_item, { label: "试听文本" }, {
              default: _withCtx(() => [
                _createVNode(_component_el_input, {
                  modelValue: previewText.value,
                  "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event: any) => ((previewText).value = $event)),
                  type: "textarea",
                  rows: 3,
                  placeholder: "输入想合成的一小段话（≤200 字）",
                  maxlength: "200",
                  "show-word-limit": ""
                }, null, 8, ["modelValue"])
              ]),
              _: 1
            }),
            _createVNode(_component_el_form_item, { label: "语速" }, {
              default: _withCtx(() => [
                _createVNode(_component_el_slider, {
                  modelValue: previewSpeed.value,
                  "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event: any) => ((previewSpeed).value = $event)),
                  min: 0.5,
                  max: 2.0,
                  step: 0.1
                }, null, 8, ["modelValue"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue", "title"]),
    _createVNode(FfmpegInstallGuide, {
      modelValue: ffmpegGuideVisible.value,
      "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event: any) => ((ffmpegGuideVisible).value = $event)),
      onRecheck: loadAudioEnv
    }, null, 8, ["modelValue"])
  ]))
}
}

})