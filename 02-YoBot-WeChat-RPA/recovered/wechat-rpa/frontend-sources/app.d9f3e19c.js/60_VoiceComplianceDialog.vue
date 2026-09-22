import { defineComponent as _defineComponent } from 'vue'
import { resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, withCtx as _withCtx, createBlock as _createBlock } from "vue"

const _hoisted_1 = { class: "compliance-body" }
const _hoisted_2 = { class: "checkbox-row" }
const _hoisted_3 = { key: 0 }
const _hoisted_4 = { key: 1 }

import { ref, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { voiceApi } from '@/api/voice'


export default /*@__PURE__*/_defineComponent({
  __name: 'VoiceComplianceDialog',
  props: {
    modelValue: { type: Boolean },
    countdownSec: {}
  },
  emits: ["update:modelValue", "accepted", "rejected"],
  setup(__props: any, { emit: __emit }) {

const props = __props

const emit = __emit

const visible = ref(props.modelValue)
const agreed = ref(false)
const submitting = ref(false)
const countdown = ref(props.countdownSec ?? 3)
let timer: number | null = null

watch(() => props.modelValue, (v) => {
  visible.value = v
  if (v) startCountdown()
  else stopCountdown()
})

watch(visible, (v) => {
  if (v !== props.modelValue) emit('update:modelValue', v)
})

function startCountdown() {
  agreed.value = false
  countdown.value = props.countdownSec ?? 3
  stopCountdown()
  timer = window.setInterval(() => {
    if (countdown.value > 0) countdown.value--
    if (countdown.value === 0) stopCountdown()
  }, 1000)
}

function stopCountdown() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

async function onAccept() {
  if (!agreed.value) return
  submitting.value = true
  try {
    const r = await voiceApi.agreeCompliance()
    if (!r.success) throw new Error(r.error || '未知错误')
    visible.value = false
    emit('accepted')
  } catch (e: any) {
    ElMessage.error(`提交失败: ${e?.message ?? e}`)
  } finally {
    submitting.value = false
  }
}

function onReject() {
  visible.value = false
  emit('rejected')
}

onUnmounted(stopCountdown)

return (_ctx: any,_cache: any) => {
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_checkbox = _resolveComponent("el-checkbox")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: visible.value,
    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((visible).value = $event)),
    title: "AI 语音 / 声音克隆使用须知",
    width: "560px",
    "close-on-click-modal": false,
    "close-on-press-escape": false,
    "show-close": false,
    "align-center": ""
  }, {
    footer: _withCtx(() => [
      _createVNode(_component_el_button, { onClick: onReject }, {
        default: _withCtx(() => [...(_cache[3] || (_cache[3] = [
          _createTextVNode("拒绝", -1)
        ]))]),
        _: 1
      }),
      _createVNode(_component_el_button, {
        type: "danger",
        disabled: !agreed.value || submitting.value,
        loading: submitting.value,
        onClick: onAccept
      }, {
        default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
          _createTextVNode(" 我已知晓并同意 ", -1)
        ]))]),
        _: 1
      }, 8, ["disabled", "loading"])
    ]),
    default: _withCtx(() => [
      _createElementVNode("div", _hoisted_1, [
        _createVNode(_component_el_alert, {
          type: "error",
          closable: false,
          "show-icon": "",
          title: "违规将导致永久封禁本软件账号",
          description: "本须知系强制条款，请仔细阅读后再确认。",
          class: "top-alert"
        }),
        _cache[2] || (_cache[2] = _createElementVNode("div", { class: "terms" }, [
          _createElementVNode("p", null, "您声明并承诺："),
          _createElementVNode("ol", null, [
            _createElementVNode("li", null, [
              _createTextVNode("我上传的语音样本系"),
              _createElementVNode("b", null, "本人录制"),
              _createTextVNode("，或已获得被复刻人的"),
              _createElementVNode("b", null, "明确书面授权"),
              _createTextVNode("。")
            ]),
            _createElementVNode("li", null, [
              _createTextVNode("我不会使用复刻音色冒充他人身份实施 "),
              _createElementVNode("b", null, "欺诈、骚扰、诽谤、虚假宣传、非法引流"),
              _createTextVNode(" 或其他违法违规行为。")
            ]),
            _createElementVNode("li", null, [
              _createTextVNode("我理解并同意：一旦平台识别违规使用（包括但不限于冒充亲友、伪造领导讲话、虚假投资引流等）， 将"),
              _createElementVNode("b", null, "永久封禁本软件账号"),
              _createTextVNode("，不予退款，并保留追究法律责任的权利。")
            ]),
            _createElementVNode("li", null, "我已阅读并同意上述全部条款，并对由此产生的一切后果自行承担责任。")
          ])
        ], -1)),
        _createElementVNode("div", _hoisted_2, [
          _createVNode(_component_el_checkbox, {
            modelValue: agreed.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((agreed).value = $event)),
            disabled: countdown.value > 0,
            size: "large"
          }, {
            default: _withCtx(() => [
              (countdown.value > 0)
                ? (_openBlock(), _createElementBlock("span", _hoisted_3, "请仔细阅读（" + _toDisplayString(countdown.value) + "s 后可勾选）", 1))
                : (_openBlock(), _createElementBlock("span", _hoisted_4, "我已阅读并同意上述全部条款"))
            ]),
            _: 1
          }, 8, ["modelValue", "disabled"])
        ])
      ])
    ]),
    _: 1
  }, 8, ["modelValue"]))
}
}

})