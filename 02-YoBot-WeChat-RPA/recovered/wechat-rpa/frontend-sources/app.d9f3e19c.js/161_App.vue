<template>
    <div class="app-container">
      <NavBar v-if="!isStartupPage && !isAgentPage" />
      <router-view v-slot="{ Component }">
        <div class="main-content">
          <component :is="Component" />
        </div>
      </router-view>
      <Reconnect-dialog ref="reconnectDialog" />
      <GlobalServerAlert />
    </div>
  </template>
  
  <script setup lang="ts">
import { computed, ref, provide,onErrorCaptured } from 'vue'
import { getBrandConfig } from '@/config/brand'
import { useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import ReconnectDialog from '@/components/ReconnectDialog.vue'
import GlobalServerAlert from '@/components/GlobalServerAlert.vue'
const route = useRoute()
const isStartupPage = computed(() => route.name === 'StartupPage')
const isAgentPage = computed(() => route.path.startsWith('/agent') || route.path.includes('dashboard'))
const reconnectDialog = ref()
const brandConfig = ref(getBrandConfig())
provide('brandConfig', brandConfig)

const showReconnectDialog = () => {
  reconnectDialog.value?.show()
}
onErrorCaptured((err, instance, info) => {
  console.error('Vue 错误:', err)
  console.log('错误组件:', instance)
  console.log('错误信息:', info)
  return false
})
// 将方法提供给所有子组件
provide('showReconnectDialog', showReconnectDialog)
provide('brandConfig', brandConfig)
  </script>
  
  <style>
  /* 重置浏览器默认样式 */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
  }
  
  .app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .main-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .el-select-dropdown .el-select-dropdown__item {
    color: #ffffff !important;
    background-color: transparent !important;
  }
  .el-select-dropdown .el-select-dropdown__item:hover,
  .el-select-dropdown .el-select-dropdown__item.hover,
  .el-select-dropdown .el-select-dropdown__item.is-hover,
  .el-select-dropdown .el-select-dropdown__item.is-selected,
  .el-select-dropdown.is-multiple .el-select-dropdown__item.selected {
    color: var(--menu-active-text-color) !important;
    background-color: var(--theme-primary-hover) !important;
  }
  .el-popper .el-select-dropdown .el-select-dropdown__item.hover,
  .el-popper .el-select-dropdown .el-select-dropdown__item.is-hover {
    background-color: var(--theme-primary-hover) !important;
  }
  .el-dropdown-menu .el-dropdown-menu__item {
    color: #ffffff !important;
    background-color: transparent !important;
  }
  .el-dropdown-menu .el-dropdown-menu__item:hover,
  .el-dropdown-menu .el-dropdown-menu__item.is-active {
    color: var(--menu-active-text-color) !important;
    background-color: var(--theme-primary-hover) !important;
  }

  /* 日期时间选择器暗色主题优化 */
  .el-picker-panel,
  .el-time-panel {
    background-color: #1f1f1f !important;
    border: 1px solid #3a3a3a !important;
    color: #e0e0e0 !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
    --el-datepicker-text-color: #e0e0e0;
    --el-datepicker-off-text-color: #505050;
    --el-datepicker-header-text-color: #ffffff;
    --el-datepicker-icon-color: #a0a0a0;
    --el-datepicker-border-color: #3a3a3a;
    --el-datepicker-inner-border-color: #3a3a3a;
    --el-datepicker-inrange-bg-color: rgba(64, 158, 255, 0.1);
    --el-datepicker-inrange-hover-bg-color: rgba(64, 158, 255, 0.2);
  }

  /* 头部样式 */
  .el-date-picker__header-label {
    color: #ffffff !important;
    font-weight: 500 !important;
  }

  .el-picker-panel__icon-btn {
    color: #a0a0a0 !important;
  }

  .el-picker-panel__icon-btn:hover {
    color: var(--el-color-primary) !important;
  }

  /* 星期标题 */
  .el-date-table th {
    color: #909399 !important;
    border-bottom: 1px solid #3a3a3a !important;
  }

  /* 日期单元格 - 普通状态 */
  .el-date-table td.available .el-date-table-cell__text {
    color: #e0e0e0 !important;
  }

  /* 日期单元格 - 悬停状态 */
  .el-date-table td.available:hover {
    color: var(--el-color-primary) !important;
  }

  /* 日期单元格 - 当前选中状态 (亮色) */
  .el-date-table td.current:not(.disabled) .el-date-table-cell__text {
    background-color: var(--el-color-primary) !important;
    color: #ffffff !important;
    font-weight: bold !important;
    box-shadow: 0 0 8px rgba(64, 158, 255, 0.5) !important;
  }

  /* 今天 */
  .el-date-table td.today .el-date-table-cell__text {
    color: var(--el-color-primary) !important;
    font-weight: bold !important;
  }

  /* 非本月日期 */
  .el-date-table td.next-month .el-date-table-cell__text,
  .el-date-table td.prev-month .el-date-table-cell__text {
    color: #505050 !important;
  }

  /* 时间选择器特定样式 */
  .el-time-spinner__item {
    color: #909399 !important;
  }

  .el-time-spinner__item.active:not(.disabled) {
    color: #ffffff !important;
    font-weight: bold !important;
    font-size: 16px !important;
  }

  .el-time-spinner__item:hover:not(.disabled):not(.active) {
    background: rgba(255, 255, 255, 0.05) !important;
    color: #ffffff !important;
  }

  /* 底部按钮栏 */
  .el-picker-panel__footer {
    background-color: #1f1f1f !important;
    border-top: 1px solid #3a3a3a !important;
  }

  .el-picker-panel__footer .el-button.is-text {
    color: #909399 !important;
  }

  .el-picker-panel__footer .el-button.is-plain {
    /* 确认按钮 */
  }

  /* 箭头和分隔线 */
  .el-popper__arrow::before {
    background: #1f1f1f !important;
    border: 1px solid #3a3a3a !important;
  }

  .el-date-picker__time-header {
    border-bottom: 1px solid #3a3a3a !important;
  }
  </style>
