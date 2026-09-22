<template>
  <div class="card">
    <div class="stepper">
      <div class="step-line"></div>
      <div class="step-item" :class="{ active: step === 1 }">
        <div class="step-circle">1</div>
        <div>设置执行计划</div>
      </div>
      <div class="step-item" :class="{ active: step === 2 }">
        <div class="step-circle">2</div>
        <div>配置发圈素材</div>
      </div>
    </div>

    <div v-if="step === 1">
      <!-- 临时调试信息 -->
      <!-- <div style="background:#fef0f0; padding:10px; margin-bottom:10px; border:1px solid #f56c6c; color:#f56c6c; font-size:12px;">
        <div>[DEBUG MODE] Build: {{ new Date().toLocaleString() }}</div>
        <div>Selected Folder: {{ form.materialFolder || '(empty)' }}</div>
        <div>Groups: {{ groupList.length }}</div>
      </div> -->
      <div class="scroll-container">
        <div class="form-group">
          <div class="form-label">计划名称</div>
          <div class="form-content">
            <el-input v-model="form.name" placeholder="请输入计划名称，如：1201-元旦发圈推广计划" style="width: 100%" />
            <div style="margin-top: 5px;">
              <el-checkbox v-model="form.createFolder">同时创建计划文件夹</el-checkbox>
            </div>
          </div>
        </div>

        <div class="form-group">
          <div class="form-label">执行方式</div>
          <div class="form-content">
            <el-radio-group v-model="form.execMode">
              <el-radio value="fixed">固定时间</el-radio>
              <el-radio value="range">时间段(发多条)</el-radio>
            </el-radio-group>
            <div class="mode-row">
              <el-time-picker
                v-if="form.execMode === 'fixed'"
                v-model="form.fixedTime"
                placeholder="选择时间"
                format="HH:mm"
              />
              <div v-else class="range-row">
                <el-time-picker v-model="form.rangeStart" placeholder="开始时间" format="HH:mm" class="time-input" style="width: 120px" />
                <span class="range-sep">—</span>
                <el-time-picker v-model="form.rangeEnd" placeholder="结束时间" format="HH:mm" class="time-input" style="width: 120px" />
                <el-input-number v-model="form.postCount" :min="1" :max="30" controls-position="right" placeholder="发圈数" :step="1" class="post-count" style="width: 82px" />
                <span class="count-unit">条</span>
                <span v-if="intervalText" class="interval-hint">{{ intervalText }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <div class="form-label">执行周期</div>
          <div class="form-content">
            <el-radio-group v-model="form.cycle">
              <el-radio value="daily">每天</el-radio>
              <el-radio value="weekly">每周</el-radio>
            </el-radio-group>
            <div class="week-wrap" v-if="form.cycle === 'weekly'">
              <el-checkbox v-for="w in weeks" :key="w.value" v-model="w.checked" @change="handleWeekChange(w)">{{ w.label }}</el-checkbox>
            </div>
          </div>
        </div>
      </div>

      <div class="btn-row">
        <el-button @click="$emit('cancel')">取消</el-button>
        <el-button
          type="primary"
          :disabled="!canGoNext || !runtimeEnabled"
          :title="disabledReason"
          @click="goStep(2)"
        >下一步</el-button>
      </div>
    </div>

    <div v-else>
      <div class="scroll-container">
        <div class="form-group">
          <div class="form-label">添加素材组</div>
          <div class="form-content">
            <div
              :class="['select-module', !form.materialFolder ? 'unselected' : 'selected', { 'runtime-disabled': !runtimeEnabled }]"
              :title="disabledReason"
              @click="onSelectModuleClick"
            >
              <div v-if="!form.materialFolder" class="select-left">请选择素材文件夹</div>
              <div v-else class="select-left">
                已选：{{ folderName }}
              </div>
              <div v-if="form.materialFolder" class="select-actions">
                <el-button
                  size="small"
                  type="danger"
                  plain
                  :disabled="!runtimeEnabled"
                  :title="disabledReason"
                  @click.stop="clearSelection"
                >
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="group-preview">
              <div class="group-hint" v-if="!form.materialFolder">
                <span>选择素材文件夹，可预览素材组</span>
              </div>
              <div v-else class="group-count">
                <span>包含 {{ groupList.length }} 个素材组</span>
                <el-button
                  type="primary"
                  link
                  :disabled="!runtimeEnabled"
                  :title="disabledReason"
                  @click.stop="openMaterialFolder"
                  style="margin-left: 8px;"
                >
                  去添加素材组 >
                </el-button>
                <el-button
                  type="primary"
                  link
                  :disabled="!runtimeEnabled"
                  :title="disabledReason || '刷新素材组'"
                  @click.stop="refreshFolder"
                  :loading="refreshingFolder"
                >
                  刷新
                </el-button>
              </div>
              <div class="group-list" v-if="form.materialFolder">
                <div
                  class="group-item"
                  :class="{ 'runtime-disabled': !runtimeEnabled }"
                  :title="disabledReason"
                  v-for="g in groupList"
                  :key="g"
                  @click="openGroup(g)"
                >
                  {{ g }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <div class="form-label">发布方式</div>
          <div class="form-content">
            <el-radio-group v-model="form.publishMode">
              <el-radio value="sequence">按顺序发布</el-radio>
              <el-radio value="random">随机发布</el-radio>
            </el-radio-group>
          </div>
        </div>

        <div class="form-group">
          <div class="form-label">选择账号</div>
          <div class="form-content">
            <el-select
              v-model="form.account"
              placeholder="选择微信账号"
              :loading="instancesLoading"
              @visible-change="onAccountSelectorVisible"
            >
              <el-option v-for="inst in activeInstances" :key="inst.account_id" :label="inst.nickname" :value="inst.account_id">
                <span class="account-option">
                  <span class="nickname">{{ inst.nickname }}</span>
                  <span class="account-id">{{ inst.account_id }}</span>
                </span>
              </el-option>
            </el-select>
          </div>
        </div>
      </div>

      <div class="btn-row">
        <el-button @click="goStep(1)">上一步</el-button>
        <el-button
          type="primary"
          :disabled="!canSubmit || !runtimeEnabled"
          :title="disabledReason"
          @click="submit"
        >生成任务</el-button>
      </div>
    </div>
    <!-- <el-dialog v-model="planDialogVisible" title="选择素材计划" width="30%">
      <div>
        <el-empty v-if="plans.length === 0" description="data/moment_material 为空" />
        <el-button v-for="p in plans" :key="p" style="margin-bottom:8px" @click="choosePlan(p)">{{ p }}</el-button>
      </div>
      <template #footer>
        <el-button @click="planDialogVisible = false">取消</el-button>
      </template>
    </el-dialog> -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight, Refresh, Close } from '@element-plus/icons-vue'

import { selectMomentFolder, openFolder, getActiveInstances, type Instance, createMomentPostTask, listMomentGroups, createMomentFolder } from '@/api/moments'
import { computed } from 'vue'
const props = withDefaults(defineProps<{
  runtimeEnabled?: boolean
  disabledReason?: string
}>(), {
  runtimeEnabled: true,
  disabledReason: ''
})
const runtimeEnabled = computed(() => props.runtimeEnabled)
const disabledReason = computed(() => props.disabledReason)
const step = ref<1 | 2>(1)
const refreshingFolder = ref(false)
const instancesLoading = ref(false)

const form = ref({
  name: '',
  createFolder: false,
  execMode: 'fixed',
  fixedTime: '',
  rangeStart: '',
  rangeEnd: '',
  cycle: 'weekly',
  materialFolder: '',
  publishMode: 'sequence',
  account: '',
  postCount: 3
})
const groupList = ref<string[]>([])
const activeInstances = ref<Instance[]>([])

const weeks = ref([
  { label: '一', value: '1', checked: true },
  { label: '二', value: '2', checked: true },
  { label: '三', value: '3', checked: true },
  { label: '四', value: '4', checked: true },
  { label: '五', value: '5', checked: true },
  { label: '六', value: '6', checked: false },
  { label: '日', value: '0', checked: false }
])

const goStep = async (target: 1 | 2) => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (target === 2 && form.value.execMode === 'range') {
    const startMin = timeToMinutes(form.value.rangeStart)
    const endMin = timeToMinutes(form.value.rangeEnd)
    const count = Number(form.value.postCount) || 0
    if (startMin != null && endMin != null && endMin > startMin && count > 0) {
      const M = endMin - startMin
      const interval = Math.floor(M / (count + 1))
      if (interval < 15) {
        ElMessage.error('发圈间隔不得低于15分钟')
        return
      }
    }
  }

  if (target === 2 && form.value.createFolder) {
    if (!form.value.name) {
      ElMessage.warning('请输入计划名称')
      return
    }
    try {
      const res = await createMomentFolder(form.value.name)
      if (res.success && res.path) {
        form.value.materialFolder = res.path
        groupList.value = []
        ElMessage.success(`已创建计划文件夹：${res.name}`)
        // Uncheck to prevent duplicate creation if user goes back and forth
        form.value.createFolder = false 
      } else {
        ElMessage.error(res.error || '创建计划文件夹失败')
        return
      }
    } catch (e: any) {
      ElMessage.error(e.message || '创建计划文件夹失败')
      return
    }
  }

  step.value = target
  if (target === 2 && activeInstances.value.length === 0) {
    await loadActiveInstances(true)
  }
}

const selectFolder = async () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  try {
    const res = await selectMomentFolder()
    if (res.success && res.selected) {
      form.value.materialFolder = res.selected
      groupList.value = res.groups || []
    }
  } catch (e: any) {
    ElMessage.error(e.message || '选择文件夹失败')
  }
}

const openMaterialFolder = async () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (form.value.materialFolder) {
    try {
      const res = await openFolder(form.value.materialFolder)
      if (!res.success) {
        ElMessage.error(res.error || '打开文件夹失败')
      }
    } catch (e: any) {
      ElMessage.error(e.message || '打开文件夹失败')
    }
  } else {
    // 如果没有选择文件夹，先触发选择文件夹
    selectFolder()
  }
}

const clearSelection = () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  form.value.materialFolder = ''
  groupList.value = []
}

const openGroup = async (name: string) => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (!form.value.materialFolder) return
  const path = `${form.value.materialFolder}/${name}`
  try {
    const res = await openFolder(path)
    if (!res.success) {
      ElMessage.error(res.error || '打开素材组失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '打开素材组失败')
  }
}

const refreshFolder = async () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (!form.value.materialFolder) return
  refreshingFolder.value = true
  try {
    // 提取计划名称（文件夹名称）
    const parts = form.value.materialFolder.split(/\\|\//)
    const planName = parts[parts.length - 1]
    
    if (planName) {
      const res = await listMomentGroups(planName)
      if (res.success) {
        groupList.value = res.groups || []
        ElMessage.success('素材组已刷新')
      } else {
        ElMessage.error('刷新失败')
      }
    }
  } catch (e: any) {
    ElMessage.error(e.message || '刷新失败')
  } finally {
    refreshingFolder.value = false
  }
}

// const choosePlan = async (name: string) => {
//   form.value.materialFolder = `${basePath.value}/${name}`
//   planDialogVisible.value = false
//   const res = await listMomentGroups(name)
//   groupList.value = res.success ? res.groups : []
// }
const folderName = computed(() => {
  if (!form.value.materialFolder) return ''
  const parts = form.value.materialFolder.split(/\\|\//)
  return parts[parts.length - 1] || ''
})
const emit = defineEmits<{ (e: 'created'): void; (e: 'cancel'): void }>()

const formatTime = (val: unknown): string | undefined => {
  if (!val) return undefined
  if (val instanceof Date) {
    const h = `${val.getHours()}`.padStart(2, '0')
    const m = `${val.getMinutes()}`.padStart(2, '0')
    return `${h}:${m}`
  }
  if (typeof val === 'string') return val
  return undefined
}

const submit = async () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  const weekDays = weeks.value.filter(w => w.checked).map(w => w.value)
  const payload = {
    name: form.value.name,
    execMode: form.value.execMode as 'fixed' | 'range',
    fixedTime: formatTime(form.value.fixedTime),
    rangeStart: formatTime(form.value.rangeStart),
    rangeEnd: formatTime(form.value.rangeEnd),
    postCount: form.value.postCount,
    cycle: form.value.cycle as 'daily' | 'weekly',
    weekDays,
    materialFolder: form.value.materialFolder,
    publishMode: form.value.publishMode as 'sequence' | 'random',
    account: form.value.account
  }
  const res = await createMomentPostTask(payload)
  if (res.success) {
    ElMessage.success('任务创建成功')
    emit('created')
  } else {
    ElMessage.error(res.error || '任务创建失败')
  }
}

const onSelectModuleClick = () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  // 如果已经选择了文件夹，点击整个区域不触发重选，避免误操作
  // 只有在未选择时，或者点击“请选择”区域时才触发
  if (!form.value.materialFolder) {
    selectFolder()
  }
}

const selectedWeekCount = computed(() => weeks.value.filter(w => w.checked).length)
const hasValidTime = computed(() => {
  if (form.value.execMode === 'fixed') {
    return !!form.value.fixedTime
  }
  return !!form.value.rangeStart && !!form.value.rangeEnd
})
const canGoNext = computed(() => {
  const nameOk = !!form.value.name && form.value.name.trim().length > 0
  const weeklyOk = form.value.cycle === 'daily' || selectedWeekCount.value > 0
  return nameOk && hasValidTime.value && weeklyOk
})

const handleWeekChange = (w: { label: string; value: string; checked: boolean }) => {
  if (form.value.cycle !== 'weekly') return
  if (!w.checked && selectedWeekCount.value === 0) {
    w.checked = true
    ElMessage.warning('最少需要选择一天')
  }
}

const timeToMinutes = (val: unknown): number | null => {
  if (!val) return null
  if (val instanceof Date) {
    return val.getHours() * 60 + val.getMinutes()
  }
  if (typeof val === 'string') {
    const parts = val.split(':')
    if (parts.length === 2) {
      const h = Number(parts[0])
      const m = Number(parts[1])
      if (!isNaN(h) && !isNaN(m)) return h * 60 + m
    }
  }
  return null
}

const intervalText = computed(() => {
  if (form.value.execMode !== 'range') return ''
  const startMin = timeToMinutes(form.value.rangeStart)
  const endMin = timeToMinutes(form.value.rangeEnd)
  const count = Number(form.value.postCount) || 0
  if (startMin == null || endMin == null || endMin <= startMin || count <= 0) return ''
  const M = endMin - startMin
  const interval = Math.floor(M / (count + 1))
  if (interval <= 0) return ''
  return `每隔 ${interval} 分钟 发一次`
})

const loadActiveInstances = async (showFailure = false): Promise<boolean> => {
  if (instancesLoading.value) return false
  instancesLoading.value = true
  try {
    const data = await getActiveInstances()
    if (data.success) {
      activeInstances.value = data.instances
      if (data.instances.length === 1) {
        form.value.account = data.instances[0].account_id
      } else if (data.instances.length > 1) {
        const act = data.instances.find(i => i.is_active)
        if (act) form.value.account = act.account_id
      }
      return true
    }
    if (showFailure) ElMessage.error('微信实例暂时不可用，请稍后重试')
  } catch (error: any) {
    if (showFailure) {
      ElMessage.error(error?.message || '微信实例暂时不可用，请稍后重试')
    }
  } finally {
    instancesLoading.value = false
  }
  return false
}

const onAccountSelectorVisible = (visible: boolean) => {
  if (visible && activeInstances.value.length === 0) {
    void loadActiveInstances(true)
  }
}

const canSubmit = computed(() => {
  const hasFolder = !!form.value.materialFolder
  const hasMaterials = groupList.value.length > 0
  const hasAccount = !!form.value.account
  return hasFolder && hasMaterials && hasAccount
})
</script>

<style scoped>
.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.stepper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  position: relative;
}
.step-item { z-index: 1; text-align: center; width: 160px; }
.step-circle { width: 32px; height: 32px; background: #e5e7eb; color: #6b7280; border-radius: 50%; margin: 0 auto 8px; line-height: 32px; font-weight: 600; }
.step-item.active .step-circle { background: #3b82f6; color: #fff; }
.step-line { position: absolute; top: 15px; left: 50%; transform: translateX(-50%); width: 160px; height: 2px; background: #e5e7eb; z-index: 0; }

.form-group { margin-bottom: 20px; display: flex; }
.form-label { width: 120px; text-align: right; padding-right: 20px; padding-top: 8px; color: #6b7280; font-size: 14px; }
.form-content { flex: 1; max-width: 100%; min-width: 0; }
.mode-row { margin-top: 8px; }
.range-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.time-input { width: 120px !important; }
:deep(.time-input .el-input__wrapper) { width: 100% !important; }
.post-count { width: 72px; }
.count-unit { color: #6b7280; font-size: 13px; }
.interval-hint { color: #ef4444; font-size: 12px; }
.select-module.unselected { cursor: pointer; }
.range-sep { color: #9ca3af; }

.week-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }

.material-preview { margin-top: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; }
.material-row { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
.material-row:last-child { border-bottom: none; }

.btn-row { margin-top: 20px; display: flex; gap: 12px; }
.select-module {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1f2937;
  color: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 12px;
}
.select-module.unselected { cursor: pointer; opacity: 0.92; }
.select-module.runtime-disabled { cursor: not-allowed; opacity: 0.55; }
.select-left { font-size: 14px; font-weight: 600; }
.select-actions { display: flex; gap: 8px; }

.group-preview { background: #f5f6f8; border-radius: 8px; padding: 12px; }
.group-hint { color: #6b7280; font-size: 13px; }
.group-count { color: #374151; font-size: 13px; margin-bottom: 8px; }
.group-list { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.group-item { background: #eef2f7; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #374151; cursor: pointer; transition: all .2s ease; }
.group-item:hover { background: #e2e8f0; }
.group-item.runtime-disabled,
.group-item.runtime-disabled:hover { cursor: not-allowed; opacity: 0.55; background: #eef2f7; }
.account-option { display: flex; justify-content: space-between; align-items: center; }
.nickname { font-weight: 600; }
.account-id { font-size: 12px; color: #1890ff; background: rgba(24, 144, 255, 0.1); padding: 2px 6px; border-radius: 4px; }

.scroll-container {
  max-height: 50vh;
  overflow-y: auto;
  padding-right: 10px;
}
.scroll-container::-webkit-scrollbar {
  width: 6px;
}
.scroll-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}
.scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
</style>
