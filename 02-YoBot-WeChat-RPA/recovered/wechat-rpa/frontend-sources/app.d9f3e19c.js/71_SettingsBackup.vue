<template>
  <div class="settings-backup" :class="{ compact }">
    <el-popover
      v-model:visible="menuVisible"
      :placement="compact ? 'bottom-end' : 'right-end'"
      :width="310"
      trigger="click"
      popper-class="settings-backup-popover"
    >
      <template #reference>
        <button class="backup-trigger" type="button">
          <span class="trigger-icon"><el-icon><FolderOpened /></el-icon></span>
          <span class="trigger-copy">
            <strong>配置备份</strong>
            <small v-if="!compact">换电脑也能快速恢复</small>
          </span>
          <el-icon class="trigger-arrow"><ArrowRight /></el-icon>
        </button>
      </template>

      <div class="backup-menu">
        <div class="menu-heading">
          <strong>导入与导出</strong>
          <span>迁移全局配置和各微信账号的 AI 助理配置</span>
        </div>
        <button class="menu-action export-action" type="button" @click="openExportDialog">
          <span class="menu-action-icon"><el-icon><Download /></el-icon></span>
          <span><strong>导出配置</strong><small>生成 ZIP 备份文件</small></span>
          <el-icon class="menu-chevron"><ArrowRight /></el-icon>
        </button>
        <button class="menu-action import-action" type="button" @click="openImportDialog">
          <span class="menu-action-icon"><el-icon><Upload /></el-icon></span>
          <span><strong>导入配置</strong><small>检查备份后覆盖同名配置</small></span>
          <el-icon class="menu-chevron"><ArrowRight /></el-icon>
        </button>
      </div>
    </el-popover>

    <el-dialog v-model="exportDialogVisible" width="650px" class="backup-dialog" align-center>
      <template #header>
        <div class="dialog-title-row">
          <span class="dialog-title-icon export"><el-icon><Download /></el-icon></span>
          <div><h3>导出配置备份</h3><p>生成可在其他电脑导入的 ZIP 文件</p></div>
        </div>
      </template>

      <div v-if="!exportResult" class="backup-dialog-body">
        <section class="info-section">
          <div class="section-title"><el-icon><CircleCheckFilled /></el-icon>本次将导出</div>
          <div class="feature-grid">
            <div v-for="item in exportIncludes" :key="item" class="feature-item">
              <span class="feature-dot"></span>{{ item }}
            </div>
          </div>
        </section>

        <section class="info-section muted-section">
          <div class="section-title muted"><el-icon><RemoveFilled /></el-icon>以下内容不会导出</div>
          <div class="excluded-list">
            <span v-for="item in exportExcludes" :key="item">{{ item }}</span>
          </div>
        </section>

        <div class="attention-card">
          <el-icon><WarningFilled /></el-icon>
          <div>
            <strong>换电脑后需要重新设置文件识别路径</strong>
            <p>AI 销冠页的“AI 助理配置 → 是否识别文件”依赖本机微信文件保存路径。导入后系统会自动关闭文件识别并清空旧路径，请在新设备重新选择路径后开启。</p>
          </div>
        </div>

        <div class="security-note">
          <el-icon><Lock /></el-icon>
          <span>备份中可能包含 AI 平台 Token、飞书密钥等敏感配置，请勿通过公开群聊或网盘分享。</span>
        </div>
      </div>

      <div v-else class="export-success-state">
        <div class="success-orbit export-success-icon"><el-icon><CircleCheckFilled /></el-icon></div>
        <h3>配置备份已保存</h3>
        <p>备份文件已经写入本机下载目录，可以直接打开所在文件夹查看。</p>
        <div class="export-file-card">
          <div class="export-file-icon"><el-icon><DocumentChecked /></el-icon></div>
          <div class="export-file-copy">
            <strong>{{ exportResult.fileName }}</strong>
            <span>{{ formatBytes(exportResult.fileSize) }}</span>
          </div>
        </div>
        <div class="export-path-block">
          <span class="path-label">保存位置</span>
          <div class="path-value" :title="exportResult.filePath">{{ exportResult.filePath }}</div>
        </div>
      </div>

      <template #footer>
        <template v-if="!exportResult">
          <el-button @click="closeExportDialog">取消</el-button>
          <el-button type="primary" :loading="exporting" @click="handleExport">
            <el-icon class="el-icon--left"><Download /></el-icon>导出到下载目录
          </el-button>
        </template>
        <template v-else>
          <el-button @click="copyExportPath">
            <el-icon class="el-icon--left"><CopyDocument /></el-icon>复制路径
          </el-button>
          <el-button type="primary" @click="handleOpenExportFolder">
            <el-icon class="el-icon--left"><FolderOpened /></el-icon>打开所在文件夹
          </el-button>
          <el-button @click="closeExportDialog">完成</el-button>
        </template>
      </template>
    </el-dialog>

    <el-dialog
      v-model="importDialogVisible"
      width="680px"
      class="backup-dialog"
      align-center
      :before-close="beforeImportClose"
    >
      <template #header>
        <div class="dialog-title-row">
          <span class="dialog-title-icon import"><el-icon><Upload /></el-icon></span>
          <div><h3>导入配置备份</h3><p>系统会先检查文件，确认无误后才会覆盖配置</p></div>
        </div>
      </template>

      <div v-if="!importResult" class="backup-dialog-body">
        <el-upload
          ref="uploadRef"
          class="backup-uploader"
          drag
          accept=".zip,application/zip"
          :auto-upload="false"
          :limit="1"
          :on-change="handleImportFileChange"
          :on-remove="handleImportFileRemove"
        >
          <el-icon class="upload-art"><UploadFilled /></el-icon>
          <div class="upload-copy">
            <strong>{{ inspectionLoading ? '正在检查备份文件…' : '将配置备份拖到这里' }}</strong>
            <span>或点击选择 webot_settings_*.zip</span>
          </div>
        </el-upload>

        <div v-if="inspectionLoading" class="inspection-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          正在校验备份清单、文件完整性和配置格式
        </div>

        <template v-if="inspection">
          <div class="inspection-card">
            <div class="inspection-head">
              <div class="valid-badge"><el-icon><CircleCheckFilled /></el-icon>有效的配置备份</div>
              <span>来自版本 {{ inspection.appVersion || '未知' }}</span>
            </div>
            <div class="summary-grid">
              <div><strong>{{ inspection.summary.globalConfigCount || 0 }}</strong><span>全局配置</span></div>
              <div><strong>{{ inspection.summary.accountConfigCount || 0 }}</strong><span>微信账号</span></div>
              <div><strong>{{ formatBytes(inspection.summary.totalBytes || 0) }}</strong><span>解压大小</span></div>
            </div>
            <div class="backup-meta">
              <span><el-icon><Calendar /></el-icon>{{ formatDate(inspection.createdAt) }}</span>
              <span><el-icon><DocumentChecked /></el-icon>{{ selectedFileName }}</span>
            </div>
          </div>

          <div v-if="inspection.warnings?.length" class="inline-warnings">
            <div v-for="warning in inspection.warnings" :key="warning"><el-icon><InfoFilled /></el-icon>{{ warning }}</div>
          </div>

          <div class="attention-card import-warning">
            <el-icon><WarningFilled /></el-icon>
            <div>
              <strong>导入后请重新设置文件识别路径</strong>
              <p>{{ inspection.manualAdjustments?.[0] || defaultManualAdjustment }}</p>
            </div>
          </div>

          <el-checkbox v-model="overwriteConfirmed" class="overwrite-confirm">
            我已了解：同名配置将被备份内容覆盖，语音配置和本机授权不会改变
          </el-checkbox>
        </template>
      </div>

      <div v-else class="import-success-state">
        <div class="success-orbit"><el-icon><CircleCheckFilled /></el-icon></div>
        <h3>配置导入完成</h3>
        <p>已导入 {{ importResult.importedConfigCount }} 项配置，当前配置页已经同步更新。</p>
        <div class="success-reminder">
          <el-icon><RefreshRight /></el-icon>
          <div><strong>最新配置已加载</strong><span>关闭弹窗即可检查导入参数。为确保正在运行的后台任务也使用新配置，完成检查后仍建议重新启动软件。</span></div>
        </div>
      </div>

      <template #footer>
        <template v-if="!importResult">
          <el-button @click="closeImportDialog">取消</el-button>
          <el-button
            type="primary"
            :disabled="!inspection || !overwriteConfirmed || inspectionLoading"
            :loading="applying"
            @click="handleApplyImport"
          >
            确认覆盖并导入
          </el-button>
        </template>
        <el-button v-else type="primary" @click="closeImportDialog">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
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

const props = withDefaults(defineProps<{
  compact?: boolean
  afterImport?: () => Promise<void>
}>(), { compact: false })

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
const defaultManualAdjustment = 'AI 销冠页的文件识别路径属于本机路径，导入后会自动关闭并清空，请重新选择后开启。'

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
</script>

<style scoped>
:global(.settings-backup-popover.el-popper) {
  --el-bg-color-overlay: #fff;
  --el-text-color-primary: #303b4b;
  --el-border-color-light: #e3e9f1;
  padding: 10px !important;
  background: #fff !important;
  border: 1px solid #dfe6ef !important;
  box-shadow: 0 14px 34px rgba(32, 51, 74, .16) !important;
}
:global(.settings-backup-popover.el-popper .el-popper__arrow::before) {
  background: #fff !important;
  border-color: #dfe6ef !important;
}
.settings-backup { width: 100%; }
.backup-trigger { width: 100%; border: 1px solid #dfe7f2; background: linear-gradient(135deg, #f7fbff 0%, #f2f6ff 100%); border-radius: 10px; padding: 8px; display: flex; align-items: center; gap: 6px; color: #334155; cursor: pointer; text-align: left; transition: all .2s ease; }
.backup-trigger:hover { border-color: #9cc4ff; box-shadow: 0 6px 18px rgba(64, 158, 255, .12); transform: translateY(-1px); }
.trigger-icon { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex: 0 0 auto; color: #fff; background: linear-gradient(145deg, #409eff, #6d7df7); box-shadow: 0 5px 12px rgba(64, 126, 255, .25); }
.trigger-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.trigger-copy strong { font-size: 12px; font-weight: 650; line-height: 1.2; white-space: nowrap; }
.trigger-copy small { font-size: 9px; line-height: 1.2; color: #8492a6; white-space: nowrap; }
.trigger-arrow { flex: 0 0 auto; color: #9aa8ba; font-size: 12px; }
.compact .backup-trigger { width: auto; min-width: 126px; padding: 8px 11px; }

.backup-menu { padding: 4px; }
.menu-heading { padding: 5px 6px 12px; display: flex; flex-direction: column; gap: 4px; border-bottom: 1px solid #edf1f6; }
.menu-heading strong { color: #1f2937; font-size: 15px; }
.menu-heading span { color: #8a96a8; font-size: 12px; line-height: 1.5; }
.menu-action { width: 100%; border: 0; background: transparent; display: flex; align-items: center; gap: 11px; padding: 12px 8px; border-radius: 10px; cursor: pointer; text-align: left; transition: background .2s ease; }
.menu-action:hover { background: #f5f8fc; }
.menu-action-icon { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; font-size: 18px; }
.export-action .menu-action-icon { color: #2878e7; background: #eaf3ff; }
.import-action .menu-action-icon { color: #18a26b; background: #e9f8f1; }
.menu-action > span:nth-child(2) { display: flex; flex: 1; flex-direction: column; gap: 3px; }
.menu-action strong { color: #334155; font-size: 13px; }
.menu-action small { color: #98a2b3; font-size: 11px; }
.menu-chevron { color: #b2bdca; }

.dialog-title-row { display: flex; align-items: center; gap: 13px; }
.dialog-title-row h3 { margin: 0; color: #1f2937; font-size: 18px; }
.dialog-title-row p { margin: 4px 0 0; color: #8b96a7; font-size: 12px; }
.dialog-title-icon { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; font-size: 21px; }
.dialog-title-icon.export { color: #fff; background: linear-gradient(145deg, #408cff, #6a73ee); box-shadow: 0 8px 18px rgba(64, 123, 255, .24); }
.dialog-title-icon.import { color: #fff; background: linear-gradient(145deg, #20b77a, #17a8a1); box-shadow: 0 8px 18px rgba(25, 169, 119, .2); }
.backup-dialog-body { display: flex; flex-direction: column; gap: 15px; }
.info-section { border: 1px solid #e5eaf1; border-radius: 12px; padding: 15px; background: #fff; }
.muted-section { background: #fafbfc; }
.section-title { display: flex; align-items: center; gap: 7px; margin-bottom: 12px; color: #2878e7; font-size: 13px; font-weight: 650; }
.section-title.muted { color: #7b8797; }
.feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.feature-item { display: flex; align-items: center; gap: 8px; color: #4b5565; font-size: 12px; }
.feature-dot { width: 6px; height: 6px; border-radius: 50%; background: #68a7ff; }
.excluded-list { display: flex; flex-wrap: wrap; gap: 8px; }
.excluded-list span { padding: 6px 9px; color: #687386; background: #eef1f5; border-radius: 6px; font-size: 11px; }
.attention-card { display: flex; gap: 11px; padding: 14px; color: #9a5b04; background: linear-gradient(135deg, #fff9ea, #fff5df); border: 1px solid #f4d99a; border-radius: 12px; }
.attention-card > .el-icon { margin-top: 2px; font-size: 19px; flex: 0 0 auto; }
.attention-card strong { color: #885008; font-size: 13px; }
.attention-card p { margin: 5px 0 0; color: #8d6a36; font-size: 12px; line-height: 1.65; }
.security-note { display: flex; align-items: flex-start; gap: 8px; color: #718096; font-size: 11px; line-height: 1.55; }
.security-note .el-icon { margin-top: 2px; color: #5f6f84; }

.export-success-state { padding: 16px 16px 8px; text-align: center; }
.export-success-state h3 { margin: 0 0 7px; color: #25332e; font-size: 19px; }
.export-success-state > p { margin: 0 auto 18px; color: #77847f; font-size: 12px; }
.export-success-icon { color: #347fee; background: radial-gradient(circle, #eaf3ff 50%, #f5f9ff 51%); }
.export-file-card { max-width: 520px; margin: 0 auto 12px; padding: 12px 14px; display: flex; align-items: center; gap: 11px; text-align: left; background: #f7faff; border: 1px solid #dfebfa; border-radius: 11px; }
.export-file-icon { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; color: #357fdf; background: #e5f0ff; border-radius: 10px; font-size: 19px; }
.export-file-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 4px; }
.export-file-copy strong { overflow: hidden; color: #344458; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.export-file-copy span { color: #8996a7; font-size: 10px; }
.export-path-block { max-width: 520px; margin: 0 auto; padding: 11px 13px; text-align: left; background: #fafbfc; border: 1px solid #e7ebf0; border-radius: 10px; }
.path-label { display: block; margin-bottom: 6px; color: #8894a4; font-size: 10px; }
.path-value { padding: 8px 10px; overflow: hidden; color: #475569; background: #fff; border: 1px solid #e6eaf0; border-radius: 7px; font-family: Consolas, "Microsoft YaHei", sans-serif; font-size: 11px; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; user-select: text; }

.backup-uploader :deep(.el-upload-dragger) { padding: 27px 20px; border-radius: 13px; border: 1px dashed #a9c6eb; background: linear-gradient(145deg, #fbfdff, #f5f9ff); }
.backup-uploader :deep(.el-upload-dragger:hover) { border-color: #409eff; }
.upload-art { margin-bottom: 8px; color: #5797ed; font-size: 37px; }
.upload-copy { display: flex; flex-direction: column; gap: 5px; }
.upload-copy strong { color: #38475a; font-size: 14px; }
.upload-copy span { color: #95a0ae; font-size: 12px; }
.inspection-loading { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 12px; color: #5d7da5; background: #f4f8fd; border-radius: 9px; font-size: 12px; }
.inspection-card { overflow: hidden; border: 1px solid #dce9e4; border-radius: 12px; background: #fbfefc; }
.inspection-head { padding: 13px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e7f0ec; color: #859287; font-size: 11px; }
.valid-badge { display: flex; align-items: center; gap: 6px; color: #168b5b; font-size: 13px; font-weight: 650; }
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); padding: 16px 12px; }
.summary-grid > div { display: flex; flex-direction: column; align-items: center; gap: 4px; border-right: 1px solid #e4ece8; }
.summary-grid > div:last-child { border-right: 0; }
.summary-grid strong { color: #2c3e38; font-size: 17px; }
.summary-grid span { color: #8b9892; font-size: 10px; }
.backup-meta { display: flex; gap: 20px; padding: 10px 15px; color: #84908b; background: #f3f8f5; font-size: 11px; }
.backup-meta span { min-width: 0; display: flex; align-items: center; gap: 5px; }
.backup-meta span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inline-warnings { display: flex; flex-direction: column; gap: 5px; color: #96703c; font-size: 11px; }
.inline-warnings div { display: flex; align-items: flex-start; gap: 6px; }
.import-warning { padding: 12px 14px; }
.overwrite-confirm { white-space: normal; height: auto; align-items: flex-start; color: #566274; }
.overwrite-confirm :deep(.el-checkbox__label) { white-space: normal; line-height: 1.55; font-size: 12px; }
.import-success-state { padding: 18px 16px 10px; text-align: center; }
.success-orbit { width: 70px; height: 70px; margin: 0 auto 14px; display: grid; place-items: center; color: #21a66c; background: radial-gradient(circle, #e9faf2 50%, #f5fcf9 51%); border-radius: 50%; font-size: 42px; }
.import-success-state h3 { margin: 0 0 8px; color: #25332e; font-size: 19px; }
.import-success-state > p { margin: 0 auto 20px; color: #77847f; font-size: 12px; }
.success-reminder { max-width: 500px; margin: 0 auto; display: flex; gap: 11px; padding: 14px; text-align: left; color: #45617f; background: #eff6ff; border: 1px solid #d7e8fc; border-radius: 11px; }
.success-reminder > .el-icon { margin-top: 2px; color: #3c83d5; font-size: 20px; }
.success-reminder div { display: flex; flex-direction: column; gap: 4px; }
.success-reminder strong { font-size: 13px; }
.success-reminder span { color: #6d8197; font-size: 11px; line-height: 1.6; }

@media (max-width: 700px) {
  .feature-grid { grid-template-columns: 1fr; }
  .summary-grid { grid-template-columns: repeat(3, 1fr); }
  .backup-meta { flex-direction: column; gap: 6px; }
}
</style>
