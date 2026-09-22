// 运营SOP编排 - 动作注册表
// 新增动作 = 在这里注册一项 + 写一个 Action 组件；编辑器/主面板无需改动。
// targets / isRpa 须与后端 sop_runner.ACTION_TARGET_TYPES / ACTION_IS_RPA 保持一致。
import type { Component } from 'vue'
import type { SopActionType } from '@/types/sop'
import ActionPullGroup from './actions/ActionPullGroup.vue'
import ActionGreeting from './actions/ActionGreeting.vue'
import ActionCreateFollow from './actions/ActionCreateFollow.vue'

export interface ActionMeta {
  type: SopActionType
  title: string
  isRpa: boolean
  targets: Array<'single' | 'group'>
  defaultParams: () => Record<string, any>
  component: Component
  // 返回校验错误信息（空串=通过）
  validate: (params: Record<string, any>) => string
}

export const ACTION_REGISTRY: Record<SopActionType, ActionMeta> = {
  pull_into_group: {
    type: 'pull_into_group',
    title: '拉群',
    isRpa: true,
    targets: ['single'],
    defaultParams: () => ({ targetGroupName: '' }),
    component: ActionPullGroup,
    validate: (p) => (p.targetGroupName ? '' : '「拉群」请选择目标群'),
  },
  greeting: {
    type: 'greeting',
    title: '发打招呼',
    isRpa: true,
    targets: ['single', 'group'],
    defaultParams: () => ({ greetingGroupId: '' }),
    component: ActionGreeting,
    validate: (p) => (p.greetingGroupId ? '' : '「发打招呼」请选择话术组'),
  },
  create_follow: {
    type: 'create_follow',
    title: '创建跟单',
    isRpa: false,
    targets: ['single', 'group'],
    defaultParams: () => ({
      agentId: '',
      followDays: 2,
      frequency: 0,
      timeMode: 'fixed', // 'fixed' 固定时间段 | 'dynamic' 以SOP触发时间起往后1小时
      timeStart: '09:00',
      timeEnd: '12:00',
      firstRun: 'next_day',
    }),
    component: ActionCreateFollow,
    validate: (p) => (p.agentId ? '' : '「创建跟单」请选择智能体'),
  },
}

// 添加动作下拉的顺序
export const ACTION_ORDER: SopActionType[] = ['pull_into_group', 'greeting', 'create_follow']

export const actionTitle = (type: SopActionType): string =>
  ACTION_REGISTRY[type]?.title ?? type
