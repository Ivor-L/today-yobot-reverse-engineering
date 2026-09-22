<template>
  <div class="action-body">
    <div class="field">
      <span class="field-label">话术组</span>
      <el-select
        :model-value="modelValue.greetingGroupId"
        @update:model-value="update('greetingGroupId', $event)"
        placeholder="选择话术组"
        class="field-control"
      >
        <el-option
          v-for="g in dataSources.greetingGroups"
          :key="g.id"
          :label="g.name"
          :value="g.id"
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
.field-control { width: 260px; }
</style>
