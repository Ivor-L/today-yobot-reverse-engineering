<template>
  <CommonErrorDialog
    v-model:visible="visible"
    :title="dialogTitle"
    :content="dialogContent"
    :error-detail="dialogDetail"
    :max-content-lines="4"
    :max-detail-lines="8"
    @close="handleDialogClose"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CommonErrorDialog from '@/components/CommonErrorDialog.vue'

interface DialogAlert {
  key: string
  title: string
  content: string
  detail: string
}

type RawRecord = Record<string, unknown>

const visible = ref(false)
const currentAlert = ref<DialogAlert | null>(null)
const queue = ref<DialogAlert[]>([])
const consumedKeys = new Set<string>()

const dialogTitle = computed(() => currentAlert.value?.title || '服务后台报错')
const dialogContent = computed(() => currentAlert.value?.content || '')
const dialogDetail = computed(() => currentAlert.value?.detail || '')

const toText = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const asRecord = (value: unknown): RawRecord => {
  return value && typeof value === 'object' ? value as RawRecord : {}
}

const buildKey = (alert: Omit<DialogAlert, 'key'>, rawValue: unknown): string => {
  const raw = asRecord(rawValue)
  const metadata = asRecord(raw.metadata)
  const context = asRecord(raw.context)
  const explicitKey = raw.dedupe_key || raw.dedupeKey || raw.id || raw.eventId
  if (explicitKey) return String(explicitKey)

  const taskId = raw.task_id || raw.taskId || metadata.task_id || metadata.taskId || ''
  const accountId = raw.account_id || raw.accountId || metadata.account_id || metadata.accountId || ''
  const scene = raw.scene || context.errorScene || ''
  const detailFingerprint = alert.detail.slice(0, 300)
  return [scene, taskId, accountId, alert.title, alert.content, detailFingerprint].join('|')
}

const enqueue = (alert: DialogAlert) => {
  if (!alert.content && !alert.detail) return
  if (consumedKeys.has(alert.key)) return

  consumedKeys.add(alert.key)
  queue.value.push(alert)
  showNext()
}

const showNext = () => {
  if (visible.value || currentAlert.value || queue.value.length === 0) return
  currentAlert.value = queue.value.shift() || null
  visible.value = Boolean(currentAlert.value)
}

const handleDialogClose = () => {
  visible.value = false
  currentAlert.value = null
  window.setTimeout(showNext, 120)
}

const normalizeErrorTask = (data: unknown): DialogAlert => {
  const raw = asRecord(data)
  const scene = toText(raw.scene, '服务后台报错')
  const params = Array.isArray(raw.params) ? raw.params : []

  let title = '服务后台报错'
  let content = `服务后台在「${scene}」场景中出现错误。`
  let detail = toText(params[0], '')

  if (scene === 'AI回复') {
    const errorMsg = toText(params[0], '未知错误')
    const sessionName = toText(params[1], '未知会话')
    const agentId = toText(params[2], '未知ID')
    title = '智能体报错'
    content = `无法回复会话「${sessionName}」的消息，调用智能体「${agentId}」时报错，请检查智能体配置。`
    detail = errorMsg
  } else if (scene === '文件库缺失') {
    const fileKey = toText(params[0], '未知标识')
    const sessionName = toText(params[1], '未知会话')
    title = '文件库文件缺失'
    content = `AI回复「${sessionName}」时需要发送文件「${fileKey}」，但文件库中未找到该文件。请前往【设置 → 文件库】补充上传，并确保标识与工作流中一致。`
    detail = `[send_file:${fileKey}]`
  } else if (scene === '话术组缺失') {
    const groupName = toText(params[0], '未知话术组')
    const sessionName = toText(params[1], '未知会话')
    title = '话术组不可用'
    content = `AI回复「${sessionName}」时需要发送话术组「${groupName}」，但该话术组不存在或发送失败。请前往【设置 → 话术组配置】检查。`
    detail = `[send_group:${groupName}]`
  }

  const alert = { title, content, detail }
  return { ...alert, key: buildKey(alert, raw) }
}

const normalizeServerAlert = (data: unknown): DialogAlert => {
  const raw = asRecord(data)
  const context = asRecord(raw.context)
  const payload = asRecord(raw.payload)
  const scene = toText(raw.scene || raw.event || context.errorScene, '服务后台报错')
  const title = toText(raw.title, scene === '朋友圈评论智能体报错' ? '朋友圈评论智能体报错' : '服务后台报错')
  const content = toText(
    raw.content || raw.message || payload.message,
    `服务后台在「${scene}」场景中出现错误。`
  )
  const detail = toText(
    raw.detail || raw.errorDetail || raw.error || payload.errorMessage || raw.payload,
    ''
  )

  const alert = { title, content, detail }
  return { ...alert, key: buildKey(alert, raw) }
}

const handleErrorTask = ((event: CustomEvent) => {
  enqueue(normalizeErrorTask(event.detail))
}) as EventListener

const handleServerAlert = ((event: CustomEvent) => {
  enqueue(normalizeServerAlert(event.detail))
}) as EventListener

onMounted(() => {
  window.addEventListener('error-task', handleErrorTask)
  window.addEventListener('server-alert', handleServerAlert)
})

onUnmounted(() => {
  window.removeEventListener('error-task', handleErrorTask)
  window.removeEventListener('server-alert', handleServerAlert)
})
</script>
