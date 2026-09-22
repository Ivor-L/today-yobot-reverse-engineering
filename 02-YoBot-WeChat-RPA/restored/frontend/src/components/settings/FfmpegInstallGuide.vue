<template>
  <el-dialog
    v-model="visibleProxy"
    title="安装 ffmpeg（语音解码依赖）"
    width="640px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="ffmpeg-guide">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px;"
      >
        <template #title>
          <span>
            ffmpeg 是开源的音视频解码组件，Windows 系统默认不带。
            <strong>装好后必须彻底关闭并重新打开本软件</strong>，否则旧进程读不到新 PATH。
          </span>
        </template>
      </el-alert>

      <!-- 方式 1：winget -->
      <div class="guide-step">
        <div class="step-title">
          <el-tag type="success" effect="dark" size="small">推荐</el-tag>
          <span>方式 1：用 winget 在线安装（约 30 秒）</span>
        </div>
        <div class="step-body">
          <p>适用于 Windows 11 / Windows 10 1809 及以上。</p>
          <ol>
            <li>右键开始菜单 → 选择 <code>终端（管理员）</code> 或 <code>PowerShell（管理员）</code></li>
            <li>粘贴下面这行命令，回车：</li>
          </ol>
          <div class="cmd-box">
            <code>{{ wingetCmd }}</code>
            <el-button
              size="small"
              type="primary"
              :icon="CopyDocument"
              @click="copyCmd(wingetCmd)"
            >
              复制
            </el-button>
          </div>
          <p class="hint">
            装完后<strong>关闭并重新打开本软件</strong>即可生效。
          </p>
        </div>
      </div>

      <el-divider />

      <!-- 方式 2：脚本 -->
      <div class="guide-step">
        <div class="step-title">
          <el-tag type="warning" effect="plain" size="small">备选</el-tag>
          <span>方式 2：一键安装脚本</span>
        </div>
        <div class="step-body">
          <p>方式 1 报错（如 winget 不可用 / 公司网络拦截），用这套：</p>
          <ol>
            <li>联系技术支持获取 <code>install_ffmpeg.bat</code>（如有内网环境，附带 <code>ffmpeg.exe</code> 一同发来）</li>
            <li>把两个文件放<strong>同一目录</strong></li>
            <li>右键 <code>install_ffmpeg.bat</code> → <strong>以管理员身份运行</strong></li>
            <li>看到 <code>[SUCCESS] ffmpeg 安装完成</code> 字样后，重启本软件</li>
          </ol>
          <p class="hint">
            脚本会自动尝试 winget，失败则用同目录的 <code>ffmpeg.exe</code> 兜底，并写入系统 PATH。
          </p>
        </div>
      </div>

      <el-divider />

      <!-- 方式 3：手动 -->
      <div class="guide-step">
        <div class="step-title">
          <el-tag type="info" effect="plain" size="small">手动</el-tag>
          <span>方式 3：自行下载安装</span>
        </div>
        <div class="step-body">
          <ol>
            <li>
              下载官方编译版：
              <el-button link type="primary" @click="openGyan">
                gyan.dev/ffmpeg/builds →
              </el-button>
              （选 <code>ffmpeg-release-essentials.zip</code>，约 80 MB）
            </li>
            <li>解压到固定目录，例如 <code>C:\ffmpeg</code></li>
            <li>
              把 <code>C:\ffmpeg\bin</code> 添加到系统 PATH 环境变量
              （右键"此电脑" → 属性 → 高级系统设置 → 环境变量 → 系统变量里的 Path → 新建）
            </li>
            <li>关闭所有命令行窗口和本软件，重新打开本软件</li>
          </ol>
        </div>
      </div>

      <!-- 验证 -->
      <el-alert
        type="success"
        :closable="false"
        show-icon
        style="margin-top: 14px;"
      >
        <template #title>
          <span>
            安装完成后，回到此页面会自动重新检测；也可关闭弹窗后手动刷新页面验证。
          </span>
        </template>
      </el-alert>
    </div>

    <template #footer>
      <el-button @click="visibleProxy = false">关闭</el-button>
      <el-button type="primary" @click="onRecheck" :loading="rechecking">
        重新检测
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'recheck'): void
}>()

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const wingetCmd =
  'winget install --id=Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements'

async function copyCmd(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('命令已复制，去 PowerShell 粘贴即可')
  } catch {
    ElMessage.warning('复制失败，请手动选中命令复制')
  }
}

function openGyan() {
  window.open('https://www.gyan.dev/ffmpeg/builds/', '_blank', 'noopener')
}

const rechecking = ref(false)
async function onRecheck() {
  rechecking.value = true
  try {
    emit('recheck')
  } finally {
    // 父组件 recheck 完成后会触发 audioEnv 更新，弹窗保持打开让用户看到结果
    setTimeout(() => { rechecking.value = false }, 800)
  }
}
</script>

<style scoped>
.ffmpeg-guide {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 6px;
}

.guide-step {
  margin-bottom: 4px;
}
.step-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.step-body {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  padding-left: 4px;
}
.step-body p { margin: 4px 0; }
.step-body ol { margin: 6px 0 6px 20px; padding: 0; }
.step-body li { margin-bottom: 4px; }
.step-body code {
  background: #f5f7fa;
  padding: 1px 6px;
  border-radius: 3px;
  font-family: ui-monospace, monospace;
  font-size: 12.5px;
  color: #c0392b;
}

.cmd-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 4px;
  padding: 10px 12px;
  margin: 8px 0;
  font-family: ui-monospace, monospace;
  font-size: 12.5px;
}
.cmd-box code {
  background: transparent;
  color: #d4d4d4;
  padding: 0;
  word-break: break-all;
  flex: 1;
}

.hint {
  font-size: 12px;
  color: #909399;
  margin-top: 6px !important;
}
</style>
