<template>
  <div class="selected-targets-panel">
    <div class="panel-header">
      <h3 class="panel-title">选择目标</h3>
      <div class="header-actions">
        <el-button
          type="primary"
          plain
          size="small"
          class="set-group-tag-btn"
          :disabled="!canSetGroupTag || !groupTagEnabled"
          :title="groupTagEnabled ? '' : groupTagDisabledReason"
          @click="$emit('set-group-tag')"
        >
          设置群标签
        </el-button>
        <el-button
          link
          @click="$emit('clear-all')"
          class="clear-all-btn"
          size="small"
        >
          清空
        </el-button>
      </div>
    </div>

    <div class="panel-content">
      <!-- 空状态 -->
      <div v-if="!hasSelections" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">选择好友或群聊</div>
        <div class="empty-hint">进行批量操作</div>
      </div>

      <!-- 水平布局的选择区域 -->
      <div v-if="hasSelections" class="selections-container">
        <!-- 已选择的好友 -->
        <div v-if="selectedFriends.length > 0" class="selection-group">
          <div class="group-header">
            <div class="group-title">
              <span class="title-text">已选择的好友</span>
              <span class="count-badge">{{ selectedFriends.length }}</span>
            </div>
          </div>
          
          <div class="selected-items horizontal-items">
            <div
              v-for="friend in displayedFriends"
              :key="friend"
              class="selected-item friend-item"
            >
              <span class="item-name">{{ friend }}</span>
            </div>
            
            <!-- 显示更多好友的省略提示 -->
            <div v-if="selectedFriends.length > maxDisplayItems" class="more-items">
              <span class="more-text">...等{{ selectedFriends.length }}人</span>
            </div>
          </div>
        </div>

        <!-- 已选择的群聊 -->
        <div v-if="selectedGroups.length > 0" class="selection-group">
          <div class="group-header">
            <div class="group-title">
              <span class="title-text">已选择的群聊</span>
              <span class="count-badge">{{ selectedGroups.length }}</span>
            </div>
          </div>
          
          <div class="selected-items horizontal-items">
            <div
              v-for="group in displayedGroups"
              :key="group"
              class="selected-item group-item"
            >
              <span class="item-name">{{ group }}</span>
            </div>
            
            <!-- 显示更多群聊的省略提示 -->
            <div v-if="selectedGroups.length > maxDisplayItems" class="more-items">
              <span class="more-text">...等{{ selectedGroups.length }}个群</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'

// Props
interface Props {
  selectedFriends: string[]
  selectedGroups: string[]
  groupTagEnabled?: boolean
  groupTagDisabledReason?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedFriends: () => [],
  selectedGroups: () => [],
  groupTagEnabled: true,
  groupTagDisabledReason: ''
})

// Emits
const emit = defineEmits<{
  'remove-friend': [name: string]
  'remove-group': [name: string]
  'clear-all': []
  'set-group-tag': []
}>()

// 常量
const maxDisplayItems = 5

// 计算属性
const hasSelections = computed(() => {
  return props.selectedFriends.length > 0 || props.selectedGroups.length > 0
})

const canSetGroupTag = computed(() => {
  return props.selectedGroups.length > 0 && props.selectedFriends.length === 0
})

const displayedFriends = computed(() => {
  return props.selectedFriends.slice(0, maxDisplayItems)
})

const displayedGroups = computed(() => {
  return props.selectedGroups.slice(0, maxDisplayItems)
})
</script>

<style scoped>
.selected-targets-panel {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  border: 1px solid #e5e7eb;
}

.panel-header {
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.set-group-tag-btn {
  font-size: 12px;
}

.clear-all-btn {
  color: #ff4d4f;
  padding: 4px 8px;
  font-size: 12px;
}

.clear-all-btn:hover {
  background-color: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.selection-group {
  margin-bottom: 20px;
}

.selection-group:last-child {
  margin-bottom: 0;
}

.group-header {
  margin-bottom: 12px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-text {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.count-badge {
  background: linear-gradient(135deg, #1890ff, #096dd9);
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.selected-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selections-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.horizontal-items {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.horizontal-items .selected-item {
  flex: 0 0 auto;
  min-width: 120px;
  max-width: 200px;
}

.selected-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.selected-item:hover {
  background-color: #e9ecef;
  border-color: #dee2e6;
}

.friend-item {
  border-left: 3px solid #1890ff;
}

.group-item {
  border-left: 3px solid #52c41a;
}

.item-name {
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.more-items {
  padding: 8px 12px;
  text-align: center;
  background-color: #f0f0f0;
  border-radius: 8px;
  border: 1px dashed #d9d9d9;
}

.more-text {
  font-size: 12px;
  color: #666;
  font-style: italic;
}

/* 响应式设计 */
@media screen and (max-width: 1200px) {
  .selected-targets-panel {
    width: 260px;
  }
  
  .panel-content {
    padding: 10px 10px;
  }
}

@media screen and (max-width: 480px) {
  .selected-targets-panel {
    width: 100%;
    max-height: 200px;
    order: 2;
  }
  
  .panel-header {
    padding: 12px 12px;
  }
  
  .panel-content {
    padding: 10px 10px;
  }
  
  .selected-items {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .selected-item {
    flex: 0 0 auto;
    max-width: calc(50% - 3px);
  }
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  min-height: 200px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 16px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-hint {
  font-size: 14px;
  color: #999;
  line-height: 1.4;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
