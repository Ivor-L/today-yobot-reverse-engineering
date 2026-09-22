<template>
  <!-- 仅弹窗，无自带入口；由父组件（欢迎页侧栏「运行日志」按钮）通过 ref 调用 open() 打开 -->
  <el-dialog
    v-model="visible"
    width="82%"
    top="5vh"
    :append-to-body="true"
    :close-on-click-modal="false"
    class="log-viewer-dialog"
  >
    <template #header>
      <div class="dialog-heading">
        <div class="heading-icon">
          <el-icon><Document /></el-icon>
        </div>
        <div class="heading-copy">
          <h2>运行日志</h2>
          <p>查看客户端最近的运行记录与异常信息</p>
        </div>
      </div>
    </template>

    <div class="log-viewer-body">
      <div class="log-toolbar">
        <div class="toolbar-control">
          <span class="toolbar-label">显示范围</span>
          <el-select v-model="tailLines" class="line-select" @change="fetchLog">
            <el-option :value="200" label="最近 200 行" />
            <el-option :value="500" label="最近 500 行" />
            <el-option :value="2000" label="最近 2000 行" />
          </el-select>
        </div>
        <div class="toolbar-actions">
          <el-button :icon="Refresh" :loading="loading" @click="fetchLog">刷新</el-button>
          <el-button :icon="FolderOpened" @click="openFolder">打开文件夹</el-button>
          <el-button type="primary" :icon="CopyDocument" @click="copyLog">复制日志</el-button>
        </div>
      </div>

      <div class="terminal-panel">
        <div class="terminal-header">
          <div class="window-controls" aria-hidden="true">
            <span class="control-dot close"></span>
            <span class="control-dot minimize"></span>
            <span class="control-dot maximize"></span>
          </div>
          <span class="terminal-title">client.log</span>
          <span class="line-count">{{ lineCount }} 行</span>
        </div>
        <pre ref="logBox" v-loading="loading && !content" class="log-content">{{ content || '暂无运行日志' }}</pre>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Document, FolderOpened, Refresh } from '@element-plus/icons-vue'
import { API_BASE_URL, headers } from '../api/config'

const visible = ref(false)
const content = ref('')
const loading = ref(false)
const tailLines = ref(500)
const logBox = ref<HTMLElement | null>(null)

const lineCount = computed(() => content.value ? content.value.split(/\r?\n/).length : 0)

const fetchLog = async () => {
  loading.value = true
  try {
    const resp = await fetch(`${API_BASE_URL}/api/diagnostics/log?tail=${tailLines.value}`, { headers })
    const data = await resp.json()
    content.value = data.content || ''
    await nextTick()
    if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight // 滚到底看最新
  } catch (e) {
    content.value = '读取日志失败：' + (e as Error).message
  } finally {
    loading.value = false
  }
}

const open = async () => {
  visible.value = true
  await fetchLog()
}

const copyLog = async () => {
  const text = content.value || ''
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // 兜底：不支持 clipboard API 时用隐藏 textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success('日志已复制，可粘贴发给技术支持')
  } catch {
    ElMessage.error('复制失败，请在窗口内手动选中复制')
  }
}

const openFolder = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/diagnostics/log/open`, { method: 'POST', headers })
    ElMessage.success('已在资源管理器中打开日志文件夹')
  } catch {
    ElMessage.error('打开失败，请手动到日志文件路径查看')
  }
}

// 暴露给父组件（欢迎页侧栏按钮）调用
defineExpose({ open })
</script>

<style scoped>
.dialog-heading {
  display: flex;
  align-items: center;
  min-width: 0;
  padding-right: 34px;
}

.heading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  margin-right: 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  color: #2563eb;
  background: linear-gradient(145deg, #eff6ff 0%, #e8f1ff 100%);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.1);
  font-size: 21px;
}

.heading-copy {
  min-width: 0;
}

.heading-copy h2 {
  margin: 0;
  color: #182230;
  font-size: 18px;
  font-weight: 650;
  line-height: 1.4;
}

.heading-copy p {
  margin: 2px 0 0;
  color: #8490a2;
  font-size: 12px;
  line-height: 1.4;
}

.log-viewer-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 11px 12px;
  border: 1px solid #e7ebf1;
  border-radius: 12px;
  background: #f8fafc;
}

.toolbar-control {
  display: flex;
  align-items: center;
  gap: 9px;
}

.toolbar-label {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.line-select {
  width: 136px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.terminal-panel {
  overflow: hidden;
  border: 1px solid #273449;
  border-radius: 12px;
  background: #111827;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
}

.terminal-header {
  position: relative;
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 13px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  color: #94a3b8;
  background: #172033;
  font-size: 12px;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.control-dot.close { background: #fb7185; }
.control-dot.minimize { background: #fbbf24; }
.control-dot.maximize { background: #4ade80; }

.terminal-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  color: #b8c3d4;
  font-family: Consolas, 'Courier New', monospace;
}

.line-count {
  margin-left: auto;
  color: #7e8ba0;
}

.log-content {
  box-sizing: border-box;
  height: 57vh;
  overflow: auto;
  margin: 0;
  padding: 16px 18px 20px;
  color: #cbd5e1;
  background: #111827;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.65;
  tab-size: 2;
  white-space: pre-wrap;
  word-break: break-all;
  scrollbar-color: #475569 #111827;
  scrollbar-width: thin;
}

.log-content::selection {
  color: #f8fafc;
  background: rgba(59, 130, 246, 0.42);
}

:global(.log-viewer-dialog) {
  max-width: 1440px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.24);
}

:global(.log-viewer-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 18px 22px 16px;
  border-bottom: 1px solid #edf0f4;
}

:global(.log-viewer-dialog .el-dialog__headerbtn) {
  top: 18px;
  right: 18px;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  transition: background-color 0.2s ease;
}

:global(.log-viewer-dialog .el-dialog__headerbtn:hover) {
  background: #f1f5f9;
}

:global(.log-viewer-dialog .el-dialog__body) {
  padding: 16px 22px 18px;
}

:deep(.log-toolbar .el-button),
:deep(.log-toolbar .el-select__wrapper) {
  min-height: 34px;
  border-radius: 8px;
}

:deep(.log-toolbar .el-button) {
  margin-left: 0;
}

:deep(.log-toolbar .el-button--primary) {
  box-shadow: 0 5px 12px rgba(64, 158, 255, 0.2);
}

@media (max-width: 900px) {
  .toolbar-actions {
    width: 100%;
    margin-left: 0;
  }

  .log-content {
    height: 54vh;
  }
}

@media (max-width: 640px) {
  .toolbar-actions {
    flex-wrap: wrap;
  }

  :global(.log-viewer-dialog .el-dialog__header),
  :global(.log-viewer-dialog .el-dialog__body) {
    padding-left: 14px;
    padding-right: 14px;
  }
}
</style>
