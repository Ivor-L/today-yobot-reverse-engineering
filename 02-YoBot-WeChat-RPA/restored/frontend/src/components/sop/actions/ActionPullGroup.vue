<template>
  <div class="action-body">
    <div class="field">
      <span class="field-label">拉入群</span>
      <el-select
        :model-value="modelValue.targetGroupName"
        @update:model-value="update('targetGroupName', $event)"
        placeholder="选择目标群（仅已存在的群）"
        filterable
        class="field-control"
      >
        <el-option
          v-for="g in dataSources.groups"
          :key="g.name"
          :label="g.name"
          :value="g.name"
        />
      </el-select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SopDataSources } from '@/types/sop'

const props = defineProps<{
  modelValue: Record<string, any>
  dataSources: SopDataSources
}>()
const emit = defineEmits(['update:modelValue'])

const update = (key: string, val: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: val })
}
</script>

<style scoped>
.field { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.field-label { width: 72px; color: #606266; font-size: 14px; flex-shrink: 0; }
.field-control { width: 280px; }
</style>
