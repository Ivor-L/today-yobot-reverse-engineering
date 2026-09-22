import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, withModifiers as _withModifiers, withKeys as _withKeys, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass } from "vue"

const _hoisted_1 = { class: "voice-config" }
const _hoisted_2 = { class: "custom-info-box" }
const _hoisted_3 = { class: "info-icon" }
const _hoisted_4 = { class: "section" }
const _hoisted_5 = {
  key: 0,
  class: "section"
}
const _hoisted_6 = { class: "section-head" }
const _hoisted_7 = {
  key: 1,
  class: "section"
}
const _hoisted_8 = { class: "test-row" }
const _hoisted_9 = {
  key: 0,
  class: "check-grid"
}
const _hoisted_10 = { class: "check-item" }

import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { voiceApi, type VoiceSettings } from '@/api/voice'
import VoiceComplianceDialog from './VoiceComplianceDialog.vue'


export default /*@__PURE__*/_defineComponent({
  __name: 'VoiceConfig',
  setup(__props) {

function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let timer: number | null = null
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), wait)
  }
}

const form = reactive({
  provider: 'doubao',
  doubao: {
    app_id: '',
    access_token: '',
    api_key: '',
    access_key_id: '',
    secret_access_key: '',
    // 以下几项后端默认值，UI 不暴露；仅在保存时透传原值不被覆盖
    open_api_region: 'cn-north-1',
    open_api_endpoint: 'https://open.volcengineapi.com',
    resource_id_clone: 'seed-icl-2.0',
    resource_id_tts: 'seed-tts-2.0',
    endpoint: 'https://openspeech.bytedance.com',
  },
})

const masked = reactive({
  access_token_masked: '',
  access_token_has_value: false,
  api_key_masked: '',
  api_key_has_value: false,
  secret_access_key_masked: '',
  secret_access_key_has_value: false,
})

const testing = ref(false)
const testResult = ref<{ ok: boolean; text: string; details?: any } | null>(null)

const showCompliance = ref(false)
// 当前用户是否已同意当前版本协议；onMounted 时从服务端拿
const complianceAgreed = ref(false)
// 本次会话是否已经为"首次填 API Key"触发过弹窗，避免持续输入时反复弹
const complianceTriggeredThisSession = ref(false)
const apiKeyInputRef = ref<any>(null)

function placeholder(field: 'access_token' | 'api_key' | 'secret_access_key') {
  const map: Record<string, { has: boolean; m: string; tip: string }> = {
    access_token: {
      has: masked.access_token_has_value,
      m: masked.access_token_masked,
      tip: '从豆包控制台获取',
    },
    api_key: {
      has: masked.api_key_has_value,
      m: masked.api_key_masked,
      tip: '从豆包控制台 → 系统管理 → API Key 管理 → 创建',
    },
    secret_access_key: {
      has: masked.secret_access_key_has_value,
      m: masked.secret_access_key_masked,
      tip: '从火山控制台 → 访问控制 → 密钥管理 取',
    },
  }
  const cfg = map[field]
  if (!cfg) return ''
  if (cfg.has) return `已保存：${cfg.m}（留空保留原值）`
  return cfg.tip
}

function badgeText(v: any) {
  if (v === true || v === 'valid' || v === 'ok') return '✓ 可用'
  if (v === false || v === 'invalid' || v === 'auth_failed') return '✗ 鉴权失败'
  if (v === 'not_subscribed') return '未开通授权'
  if (v === 'disabled') return '未启用'
  if (v === 'network_error') return '网络异常'
  if (v === 'untested') return '未验证'
  if (v === 'unknown') return '未知'
  if (typeof v === 'string' && v.startsWith('http_')) return `HTTP ${v.slice(5)}`
  return String(v ?? '-')
}
function badgeType(v: any): 'success' | 'danger' | 'warning' | 'info' {
  if (v === true || v === 'valid' || v === 'ok') return 'success'
  if (v === false || v === 'invalid' || v === 'auth_failed') return 'danger'
  if (v === 'not_subscribed') return 'warning'
  return 'info'
}

async function loadSettings() {
  try {
    const r = await voiceApi.getConfig()
    if (!r.success || !r.data) return
    const s = r.data
    form.provider = s.provider || 'doubao'
    Object.assign(form.doubao, {
      app_id: s.doubao.app_id || '',
      access_token: '',           // 永远不预填
      api_key: '',
      access_key_id: s.doubao.access_key_id || '',
      secret_access_key: '',      // 敏感字段永远不预填
      open_api_region: s.doubao.open_api_region || 'cn-north-1',
      open_api_endpoint: s.doubao.open_api_endpoint || 'https://open.volcengineapi.com',
      resource_id_clone: s.doubao.resource_id_clone || 'seed-icl-2.0',
      resource_id_tts: s.doubao.resource_id_tts || 'seed-tts-2.0',
      endpoint: s.doubao.endpoint || 'https://openspeech.bytedance.com',
    })
    masked.access_token_masked = s.doubao.access_token_masked || ''
    masked.access_token_has_value = !!s.doubao.access_token_has_value
    masked.api_key_masked = s.doubao.api_key_masked || ''
    masked.api_key_has_value = !!s.doubao.api_key_has_value
    masked.secret_access_key_masked = s.doubao.secret_access_key_masked || ''
    masked.secret_access_key_has_value = !!s.doubao.secret_access_key_has_value

    complianceAgreed.value = s.compliance_agreed_version === s.compliance_current_version
  } catch (e: any) {
    ElMessage.error(`加载语音配置失败: ${e?.message ?? e}`)
  }
}

const doSave = async () => {
  try {
    const r = await voiceApi.saveConfig({
      provider: form.provider,
      doubao: { ...form.doubao },
    } as any)
    if (!r.success) throw new Error(r.error || '保存失败')
    if (r.data) {
      masked.access_token_masked = r.data.doubao.access_token_masked || ''
      masked.access_token_has_value = !!r.data.doubao.access_token_has_value
      masked.api_key_masked = r.data.doubao.api_key_masked || ''
      masked.api_key_has_value = !!r.data.doubao.api_key_has_value
      masked.secret_access_key_masked = r.data.doubao.secret_access_key_masked || ''
      masked.secret_access_key_has_value = !!r.data.doubao.secret_access_key_has_value
      form.doubao.access_token = ''
      form.doubao.api_key = ''
      form.doubao.secret_access_key = ''
    }
    ElMessage.success({ message: '语音配置已保存', duration: 1200 })
  } catch (e: any) {
    ElMessage.error(`保存失败: ${e?.message ?? e}`)
  }
}
const autoSave = debounce(doSave, 600)

/**
 * API Key 字段首次输入触发：
 * - 已同意当前版本合规协议：直接 autoSave，不弹窗
 * - 未同意：弹合规框；同意后才 autoSave；拒绝则清空输入
 * 一次会话内只触发一次，避免边输入边弹
 */
function onApiKeyInput() {
  if (!form.doubao.api_key) {
    // 用户清空了，不动
    autoSave()
    return
  }
  if (complianceAgreed.value || complianceTriggeredThisSession.value) {
    autoSave()
    return
  }
  complianceTriggeredThisSession.value = true
  showCompliance.value = true
}

async function onTest() {
  testing.value = true
  testResult.value = null
  try {
    const r = await voiceApi.testConnection()
    testResult.value = {
      ok: !!r.success,
      text: r.success ? '连接正常' : `连接失败：${r.error || '未知错误'}`,
      details: r.details,
    }
  } catch (e: any) {
    testResult.value = { ok: false, text: `请求异常: ${e?.message ?? e}` }
  } finally {
    testing.value = false
  }
}

function openConsole() {
  window.open('https://console.volcengine.com/speech/app', '_blank')
}

function onComplianceAccepted() {
  complianceAgreed.value = true
  ElMessage.success('已同意须知，可继续使用 AI 语音功能')
  autoSave()    // 同意后把已经输入的 API Key 落盘
}
function onComplianceRejected() {
  // 拒绝就清空已输入的 api_key，避免误存
  form.doubao.api_key = ''
  ElMessage.warning('未同意须知，API Key 已清除；如需启用请重新填写并同意条款')
}

onMounted(loadSettings)

return (_ctx: any,_cache: any) => {
  const _component_el_icon = _resolveComponent("el-icon")!
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_tag = _resolveComponent("el-tag")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _createElementVNode("div", _hoisted_3, [
        _createVNode(_component_el_icon, null, {
          default: _withCtx(() => [
            _createVNode(_unref(InfoFilled))
          ]),
          _: 1
        })
      ]),
      _cache[4] || (_cache[4] = _createElementVNode("div", { class: "info-content" }, [
        _createElementVNode("div", { class: "info-text" }, " 用于 AI 语音回复：合成语音或克隆声音回复客户 ")
      ], -1))
    ]),
    _createElementVNode("div", _hoisted_4, [
      _cache[5] || (_cache[5] = _createElementVNode("h4", { class: "section-title" }, "语音模型", -1)),
      _createVNode(_component_el_select, {
        modelValue: form.provider,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((form.provider) = $event)),
        class: "provider-select"
      }, {
        default: _withCtx(() => [
          _createVNode(_component_el_option, {
            label: "豆包（火山引擎）",
            value: "doubao"
          })
        ]),
        _: 1
      }, 8, ["modelValue"])
    ]),
    (form.provider === 'doubao')
      ? (_openBlock(), _createElementBlock("div", _hoisted_5, [
          _createElementVNode("div", _hoisted_6, [
            _cache[7] || (_cache[7] = _createElementVNode("h4", { class: "section-title" }, "火山凭证", -1)),
            _createVNode(_component_el_button, {
              type: "info",
              size: "small",
              plain: "",
              onClick: openConsole
            }, {
              default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
                _createTextVNode(" 打开火山控制台 ", -1)
              ]))]),
              _: 1
            })
          ]),
          _createVNode(_component_el_form, {
            model: form.doubao,
            "label-width": "100px",
            class: "field-form"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_form_item, { required: "" }, {
                label: _withCtx(() => [...(_cache[8] || (_cache[8] = [
                  _createElementVNode("span", { class: "req-label" }, "API Key", -1)
                ]))]),
                default: _withCtx(() => [
                  _createVNode(_component_el_input, {
                    ref_key: "apiKeyInputRef",
                    ref: apiKeyInputRef,
                    modelValue: form.doubao.api_key,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((form.doubao.api_key) = $event)),
                    type: "password",
                    "show-password": "",
                    placeholder: placeholder('api_key'),
                    onKeydown: _cache[2] || (_cache[2] = _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])),
                    onInput: onApiKeyInput
                  }, null, 8, ["modelValue", "placeholder"])
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["model"])
        ]))
      : _createCommentVNode("", true),
    (form.provider === 'doubao')
      ? (_openBlock(), _createElementBlock("div", _hoisted_7, [
          _createElementVNode("div", _hoisted_8, [
            _createVNode(_component_el_button, {
              type: "primary",
              loading: testing.value,
              onClick: onTest
            }, {
              default: _withCtx(() => [...(_cache[9] || (_cache[9] = [
                _createTextVNode(" 测试连接 ", -1)
              ]))]),
              _: 1
            }, 8, ["loading"]),
            (testResult.value)
              ? (_openBlock(), _createElementBlock("span", {
                  key: 0,
                  class: _normalizeClass(["test-result", testResult.value.ok ? 'ok' : 'err'])
                }, _toDisplayString(testResult.value.text), 3))
              : _createCommentVNode("", true)
          ]),
          (testResult.value?.details)
            ? (_openBlock(), _createElementBlock("div", _hoisted_9, [
                _createElementVNode("div", _hoisted_10, [
                  _cache[10] || (_cache[10] = _createElementVNode("span", { class: "label" }, "TTS 合成 (API Key):", -1)),
                  _createVNode(_component_el_tag, {
                    type: badgeType(testResult.value.details.tts),
                    size: "small"
                  }, {
                    default: _withCtx(() => [
                      _createTextVNode(_toDisplayString(badgeText(testResult.value.details.tts)), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])
                ])
              ]))
            : _createCommentVNode("", true)
        ]))
      : _createCommentVNode("", true),
    _createVNode(VoiceComplianceDialog, {
      modelValue: showCompliance.value,
      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event: any) => ((showCompliance).value = $event)),
      "countdown-sec": 3,
      onAccepted: onComplianceAccepted,
      onRejected: onComplianceRejected
    }, null, 8, ["modelValue"])
  ]))
}
}

})