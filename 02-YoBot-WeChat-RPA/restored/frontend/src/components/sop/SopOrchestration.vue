<template>
  <div class="sop-orchestration">
    <!-- 列表视图 -->
    <template v-if="view === 'list'">
      <div class="sop-title-bar">
        <span>SOP编排</span>
        <el-button
          type="primary"
          :icon="Plus"
          :disabled="!runtimeEnabled"
          :title="disabledReason"
          @click="createSop"
        >新建SOP</el-button>
      </div>

      <p class="sop-desc">
        为不同触发场景（如新进群）编排一组有序的自动化动作，触发后按从上到下的顺序依次执行（如发打招呼、创建跟单等）。
      </p>

      <div v-loading="loading" class="sop-list">
        <div v-for="sop in sops" :key="sop.id" class="sop-row">
          <div class="sop-row-icon">
            <el-icon><Operation /></el-icon>
          </div>
          <div class="sop-row-main">
            <div class="sop-name">{{ sop.name }}</div>
            <div class="sop-actions-summary">{{ summary(sop) }}</div>
          </div>
          <div class="sop-row-ops">
            <el-tooltip content="编辑" placement="top">
              <el-button
                text
                type="primary"
                :icon="Edit"
                circle
                :disabled="!runtimeEnabled"
                :title="disabledReason"
                @click="editSop(sop)"
              />
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button
                text
                type="danger"
                :icon="Delete"
                circle
                :disabled="!runtimeEnabled"
                :title="disabledReason"
                @click="removeSop(sop)"
              />
            </el-tooltip>
          </div>
        </div>

        <el-empty v-if="!loading && sops.length === 0" description="还没有 SOP，点击右上角新建" />
      </div>
    </template>

    <!-- 编辑视图 -->
    <template v-else>
      <SopEditor
        :model-value="editing"
        :data-sources="dataSources"
        :runtime-enabled="runtimeEnabled"
        :disabled-reason="disabledReason"
        :action-availability="actionAvailability"
        @save="handleSave"
        @cancel="view = 'list'"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Operation } from '@element-plus/icons-vue'
import type { Sop, SopActionAvailabilityMap, SopDataSources } from '@/types/sop'
import { loadSops, saveSops } from '@/api/sop'
import { actionTitle } from './actionRegistry'
import SopEditor from './SopEditor.vue'

const props = defineProps<{
  greetingGroups: Array<{ id: string; name: string }>
  cozeAgents: Array<{ botId: string; name: string }>
  groups: Array<{ name: string }>
  runtimeEnabled: boolean
  disabledReason: string
  actionAvailability: SopActionAvailabilityMap
}>()

const requireRuntime = () => {
  if (props.runtimeEnabled) return true
  ElMessage.warning(props.disabledReason || '当前版本暂不支持此功能')
  return false
}

const dataSources = computed<SopDataSources>(() => ({
  greetingGroups: props.greetingGroups || [],
  cozeAgents: props.cozeAgents || [],
  groups: props.groups || [],
}))

const sops = ref<Sop[]>([])
const loading = ref(false)
const view = ref<'list' | 'edit'>('list')
const editing = ref<Sop>({ id: '', name: '', actions: [] })

const summary = (sop: Sop) =>
  (sop.actions || []).map((a) => actionTitle(a.type)).join(' › ') || '（空）'

const refresh = async () => {
  loading.value = true
  try {
    sops.value = await loadSops()
  } finally {
    loading.value = false
  }
}

const genId = () => `sop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createSop = () => {
  if (!requireRuntime()) return
  editing.value = { id: genId(), name: '', actions: [] }
  view.value = 'edit'
}

const editSop = (sop: Sop) => {
  if (!requireRuntime()) return
  editing.value = sop
  view.value = 'edit'
}

const handleSave = async (sop: Sop) => {
  if (!requireRuntime()) return
  // 重名校验（排除自身）
  if (sops.value.some((s) => s.id !== sop.id && s.name === sop.name)) {
    ElMessage.warning('已存在同名 SOP，请换个名字')
    return
  }
  const idx = sops.value.findIndex((s) => s.id === sop.id)
  if (idx >= 0) sops.value[idx] = sop
  else sops.value.push(sop)
  try {
    await saveSops(sops.value)
    ElMessage.success('已保存')
    view.value = 'list'
  } catch (e) {
    ElMessage.error('保存失败')
    await refresh()
  }
}

const removeSop = async (sop: Sop) => {
  if (!requireRuntime()) return
  try {
    await ElMessageBox.confirm(`确定删除 SOP「${sop.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  sops.value = sops.value.filter((s) => s.id !== sop.id)
  try {
    await saveSops(sops.value)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error('删除失败')
    await refresh()
  }
}

onMounted(() => {
  if (props.runtimeEnabled) refresh()
})
</script>

<style scoped>
.sop-orchestration { width: 100%; }
/* 与其它SOP功能一致：标题栏带浅色背景 + 底部分割线 */
.sop-title-bar {
  height: 48px;
  padding: 0 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
/* 顶部功能说明 */
.sop-desc {
  margin: -6px 16px 16px;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}
.sop-list { display: flex; flex-direction: column; gap: 10px; padding: 0 16px; }
.sop-row {
  display: flex; align-items: center; gap: 14px;
  border: 1px solid #e4e7ed; border-radius: 8px; padding: 14px 16px; background: #fff;
  transition: box-shadow .2s, border-color .2s;
}
.sop-row:hover { border-color: #c6d6ea; box-shadow: 0 2px 10px rgba(64, 158, 255, .08); }
/* 左侧占位图标 */
.sop-row-icon {
  flex-shrink: 0;
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #ecf3ff 0%, #e6eeff 100%);
  color: #409eff; font-size: 20px;
}
.sop-row-main { flex: 1; min-width: 0; }
.sop-name { font-weight: 600; color: #303133; margin-bottom: 4px; }
.sop-actions-summary { font-size: 13px; color: #909399; }
.sop-row-ops { flex-shrink: 0; display: flex; align-items: center; gap: 2px; }
</style>
