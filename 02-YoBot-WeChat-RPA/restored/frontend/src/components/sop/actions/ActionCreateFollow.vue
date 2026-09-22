<template>
  <div class="action-body">
    <div class="field">
      <span class="field-label">智能体</span>
      <el-select
        :model-value="modelValue.agentId"
        @update:model-value="update('agentId', $event)"
        placeholder="选择智能体"
        class="field-control"
      >
        <el-option
          v-for="a in dataSources.cozeAgents"
          :key="a.botId"
          :label="a.name"
          :value="a.botId"
        />
      </el-select>
    </div>

    <div class="field">
      <span class="field-label">跟进周期</span>
      <el-input-number
        :model-value="modelValue.followDays"
        @update:model-value="update('followDays', $event)"
        :min="2"
        :max="30"
        controls-position="right"
        style="width: 120px;"
      />
      <span class="unit">天</span>
    </div>

    <div class="field">
      <span class="field-label">跟进频率</span>
      <span class="unit">每隔</span>
      <el-input-number
        :model-value="modelValue.frequency"
        @update:model-value="update('frequency', $event)"
        :min="0"
        :max="10"
        controls-position="right"
        style="width: 110px;"
      />
      <span class="unit">天（0=每天）</span>
    </div>

    <div class="field">
      <span class="field-label">时间段</span>
      <el-radio-group
        :model-value="modelValue.timeMode || 'fixed'"
        @update:model-value="update('timeMode', $event)"
      >
        <el-radio value="fixed">固定时间段</el-radio>
        <el-radio value="dynamic">动态时间段</el-radio>
      </el-radio-group>
    </div>

    <div v-if="(modelValue.timeMode || 'fixed') === 'fixed'" class="field">
      <span class="field-label"></span>
      <el-time-picker
        :model-value="modelValue.timeStart"
        @update:model-value="update('timeStart', $event)"
        format="HH:mm"
        value-format="HH:mm"
        placeholder="开始"
        style="width: 120px;"
      />
      <span class="unit">—</span>
      <el-time-picker
        :model-value="modelValue.timeEnd"
        @update:model-value="update('timeEnd', $event)"
        format="HH:mm"
        value-format="HH:mm"
        placeholder="结束"
        style="width: 120px;"
      />
    </div>
    <div v-else class="field">
      <span class="field-label"></span>
      <span class="unit">从 SOP 触发时间起，往后 1 小时作为执行时间段（无需手动选择）</span>
    </div>

    <div class="field">
      <span class="field-label">首次执行</span>
      <el-checkbox
        :model-value="modelValue.firstRun === 'next_day'"
        @update:model-value="update('firstRun', $event ? 'next_day' : 'same_day')"
      >次日执行（勾选后今天不执行，从次日时间段开始）</el-checkbox>
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
.field { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.field-label { width: 72px; color: #606266; font-size: 14px; flex-shrink: 0; }
.unit { color: #606266; font-size: 14px; }
</style>
