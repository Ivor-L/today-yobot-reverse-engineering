<template>
  <el-dialog
    v-model="visible"
    title="AI 语音 / 声音克隆使用须知"
    width="560px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    align-center
  >
    <div class="compliance-body">
      <el-alert
        type="error"
        :closable="false"
        show-icon
        title="违规将导致永久封禁本软件账号"
        description="本须知系强制条款，请仔细阅读后再确认。"
        class="top-alert"
      />

      <div class="terms">
        <p>您声明并承诺：</p>
        <ol>
          <li>我上传的语音样本系<b>本人录制</b>，或已获得被复刻人的<b>明确书面授权</b>。</li>
          <li>我不会使用复刻音色冒充他人身份实施
            <b>欺诈、骚扰、诽谤、虚假宣传、非法引流</b>
            或其他违法违规行为。</li>
          <li>我理解并同意：一旦平台识别违规使用（包括但不限于冒充亲友、伪造领导讲话、虚假投资引流等），
            将<b>永久封禁本软件账号</b>，不予退款，并保留追究法律责任的权利。</li>
          <li>我已阅读并同意上述全部条款，并对由此产生的一切后果自行承担责任。</li>
        </ol>
      </div>

      <div class="checkbox-row">
        <el-checkbox
          v-model="agreed"
          :disabled="countdown > 0"
          size="large"
        >
          <span v-if="countdown > 0">请仔细阅读（{{ countdown }}s 后可勾选）</span>
          <span v-else>我已阅读并同意上述全部条款</span>
        </el-checkbox>
      </div>
    </div>

    <template #footer>
      <el-button @click="onReject">拒绝</el-button>
      <el-button
        type="danger"
        :disabled="!agreed || submitting"
        :loading="submitting"
        @click="onAccept"
      >
        我已知晓并同意
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { voiceApi } from '@/api/voice'

const props = defineProps<{
  modelValue: boolean
  countdownSec?: number       // 默认 3 秒
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'accepted'): void
  (e: 'rejected'): void
}>()

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
</script>

<style scoped>
.compliance-body { padding: 4px 2px; }
.top-alert { margin-bottom: 16px; }
.terms { font-size: 14px; line-height: 1.7; color: #303133; }
.terms ol { padding-left: 22px; margin: 8px 0; }
.terms li { margin-bottom: 8px; }
.terms b { color: #c45656; }
.checkbox-row {
  margin-top: 18px;
  padding: 12px;
  background: #fef0f0;
  border-radius: 6px;
  border: 1px solid #fbc4c4;
}
</style>
