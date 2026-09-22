<template>
  <div class="sop-editor">
    <!-- 顶部：返回 / 名称 / 保存 -->
    <div class="editor-header">
      <el-button text :icon="ArrowLeft" @click="emit('cancel')">返回</el-button>
      <el-input
        v-model="draft.name"
        placeholder="SOP 名称"
        class="name-input"
        maxlength="30"
        show-word-limit
      />
      <el-button
        type="primary"
        :icon="Check"
        :disabled="!runtimeEnabled"
        :title="disabledReason"
        @click="handleSave"
      >保存</el-button>
    </div>

    <div class="editor-body">
      <div class="editor-subtitle">流程步骤（从上到下依次执行）</div>

      <!-- 空状态 -->
      <el-empty
        v-if="draft.actions.length === 0"
        :image-size="90"
        description="还没有动作，点击下方「添加动作」开始编排"
        class="empty-state"
      />

      <!-- 步骤列表 -->
      <div v-else class="steps">
        <template v-for="(action, i) in draft.actions" :key="i">
          <div class="step-card">
            <div class="step-card-head">
              <span class="step-index">{{ i + 1 }}</span>
              <span class="step-title">{{ meta(action.type).title }}</span>
              <span class="step-rpa" :class="meta(action.type).isRpa ? 'rpa' : 'non-rpa'">
                {{ meta(action.type).isRpa ? 'RPA' : '非RPA' }}
              </span>
              <span class="step-target">适用：{{ targetsLabel(action.type) }}</span>
              <div class="step-ops">
                <el-button text :icon="Top" :disabled="i === 0" @click="move(i, -1)" />
                <el-button text :icon="Bottom" :disabled="i === draft.actions.length - 1" @click="move(i, 1)" />
                <el-button text type="danger" :icon="Close" @click="removeAction(i)" />
              </div>
            </div>
            <div class="step-card-body">
              <component
                :is="meta(action.type).component"
                v-model="action.params"
                :data-sources="dataSources"
              />
            </div>
          </div>

          <div v-if="i < draft.actions.length - 1" class="step-arrow">↓</div>
        </template>
      </div>

      <!-- 添加动作 -->
      <el-dropdown trigger="click" @command="addAction" class="add-dropdown">
        <el-button
          class="add-action-btn"
          :icon="Plus"
          :disabled="!canAddAction"
          :title="canAddAction ? '' : disabledReason"
        >添加动作</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="t in ACTION_ORDER"
              :key="t"
              :command="t"
              :disabled="!actionEnabled(t)"
              :title="actionReason(t)"
            >{{ ACTION_REGISTRY[t].title }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Close, Top, Bottom, Plus } from '@element-plus/icons-vue'
import type {
  Sop,
  SopAction,
  SopActionAvailabilityMap,
  SopActionType,
  SopDataSources
} from '@/types/sop'
import { ACTION_REGISTRY, ACTION_ORDER } from './actionRegistry'

const props = defineProps<{
  modelValue: Sop
  dataSources: SopDataSources
  runtimeEnabled: boolean
  disabledReason: string
  actionAvailability: SopActionAvailabilityMap
}>()
const emit = defineEmits(['save', 'cancel'])

// 编辑副本：保存才生效，返回则丢弃
const clone = (sop: Sop): Sop => JSON.parse(JSON.stringify(sop))
const draft = ref<Sop>(clone(props.modelValue))
watch(() => props.modelValue, (v) => { draft.value = clone(v) })

const meta = (type: SopActionType) => ACTION_REGISTRY[type]
const actionEnabled = (type: SopActionType) => props.actionAvailability[type]?.enabled === true
const actionReason = (type: SopActionType) => props.actionAvailability[type]?.reason || ''
const canAddAction = computed(() => (
  props.runtimeEnabled && ACTION_ORDER.some(actionEnabled)
))

// 适用目标类型 -> 简短标签（展示在动作标题右侧）
const targetsLabel = (type: SopActionType): string => {
  const t = ACTION_REGISTRY[type]?.targets || []
  const hasSingle = t.includes('single')
  const hasGroup = t.includes('group')
  if (hasSingle && hasGroup) return '单聊 / 群'
  if (hasSingle) return '仅单聊'
  if (hasGroup) return '仅群'
  return '—'
}

const addAction = (type: SopActionType) => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  if (!actionEnabled(type)) {
    ElMessage.warning(actionReason(type) || '当前版本暂不支持此动作')
    return
  }
  const action: SopAction = { type, params: ACTION_REGISTRY[type].defaultParams() }
  draft.value.actions.push(action)
}

const removeAction = (i: number) => {
  draft.value.actions.splice(i, 1)
}

const move = (i: number, dir: -1 | 1) => {
  const j = i + dir
  if (j < 0 || j >= draft.value.actions.length) return
  const arr = draft.value.actions
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

const handleSave = () => {
  if (!props.runtimeEnabled) {
    ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
    return
  }
  const name = (draft.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请填写 SOP 名称')
    return
  }
  if (draft.value.actions.length === 0) {
    ElMessage.warning('请至少添加一个动作')
    return
  }
  for (let i = 0; i < draft.value.actions.length; i++) {
    const a = draft.value.actions[i]
    if (!actionEnabled(a.type)) {
      ElMessage.warning(`第 ${i + 1} 步：${actionReason(a.type) || '当前版本暂不支持此动作'}`)
      return
    }
    const err = ACTION_REGISTRY[a.type].validate(a.params)
    if (err) {
      ElMessage.warning(`第 ${i + 1} 步：${err}`)
      return
    }
  }
  emit('save', clone({ ...draft.value, name }))
}
</script>

<style scoped>
.sop-editor { width: 100%; }
/* 顶部栏：与列表标题栏一致，带浅色背景 + 底部分割线 */
.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}
.name-input { flex: 1; max-width: 360px; }
.editor-body { padding: 16px; }
.editor-subtitle { color: #909399; font-size: 13px; margin-bottom: 12px; }
.empty-state { padding: 16px 0 24px; }
.steps { margin-bottom: 16px; }
.step-card {
  border: 1px solid #e4e7ed; border-radius: 8px; background: #fff; overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}
.step-card:hover { border-color: #c6d6ea; box-shadow: 0 2px 10px rgba(64, 158, 255, .08); }
/* 标题区：极淡灰底 + 底部分割线，与下方配置区形成层次 */
.step-card-head {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; background: #f7f8fa; border-bottom: 1px solid #eef0f3;
}
.step-index {
  width: 22px; height: 22px; border-radius: 50%; background: #409eff; color: #fff;
  display: inline-flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0;
}
.step-title { font-weight: 600; color: #303133; }
.step-rpa { font-size: 11px; padding: 1px 6px; border-radius: 4px; line-height: 18px; }
.step-rpa.rpa { background: #fef0f0; color: #f56c6c; }
.step-rpa.non-rpa { background: #f0f9eb; color: #67c23a; }
/* 适用标签：放在标题右侧，弱化呈现 */
.step-target {
  font-size: 11px; line-height: 18px; padding: 1px 8px; border-radius: 4px;
  background: #eef1f5; color: #6b7785; white-space: nowrap;
}
.step-ops { margin-left: auto; display: flex; align-items: center; }
/* 配置区：白底 + 内边距，与上方标题区区分 */
.step-card-body { padding: 14px; }
.step-arrow { text-align: center; color: #c0c4cc; font-size: 18px; line-height: 1.6; }
.add-dropdown { width: 100%; }
.add-action-btn { width: 100%; border-style: dashed; }
</style>
