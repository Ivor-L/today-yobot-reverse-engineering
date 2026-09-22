  <template>
    <el-dialog
      v-model="dialogVisible"
      title="好友名单"
      :width="windowWidth <= 700 ? '95%' : '600px'"
    >
      <div class="ops-bar">
        <div class="filters">
          <el-select v-model="selectedStatus" placeholder="状态" size="small" class="filter-select" @change="applyFilters">
            <el-option label="全部状态" value="__ALL__" />
            <el-option label="待添加" value="pending" />
            <el-option label="已添加" value="added" />
            <el-option label="添加失败" value="failed" />
            <el-option label="账号不存在" value="unknown" />
            <el-option label="已是好友" value="already" />
          </el-select>
          <el-select v-model="selectedTag" placeholder="标签" size="small" class="filter-select" filterable @change="applyFilters">
            <el-option label="全部标签" value="__ALL__" />
            <el-option
              v-for="tag in tagOptions"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </div>
        <div class="actions">
          <el-button type="primary" plain size="small" @click="handleExport">导出名单</el-button>
          <el-button type="primary" size="small" @click="handleBatchDelete" :disabled="filteredFriendList.length === 0">批量删除</el-button>
        </div>
      </div>
      <el-table :data="friendList" style="width: 100%">
        <el-table-column prop="wxid" label="微信号" width="120" />
        <el-table-column prop="remark" label="备注名" width="120" />
        <el-table-column prop="tags" label="标签" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row.wxid)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </template>
  
  <script setup lang="ts">
  import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  type MessageBoxAction = 'confirm' | 'cancel' | 'close'
  import { getFriendList, deleteFriendFromList, exportFriendListPath, openLocalFolder, batchDeleteFriendFromList } from '@/api/autosop'
  const windowWidth = ref(window.innerWidth)
  const props = defineProps<{
    visible: boolean
  }>()
  const handleResize = () => {
    windowWidth.value = window.innerWidth
  }
  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'refresh'): void
  }>()
  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
  interface FriendListItem {
    wxid: string
    remark: string
    tags: string
    status: string
  }
  const dialogVisible = ref(props.visible)
  const friendList = ref<FriendListItem[]>([])
  const allFriendList = ref<FriendListItem[]>([])
  const selectedStatus = ref('__ALL__')
  const selectedTag = ref('__ALL__')
  const tagOptions = computed(() => {
    const set = new Set<string>()
    allFriendList.value.forEach((row: any) => {
      const t = String(row.tags || '').trim()
      if (!t) return
      t.split(',').map(s => s.trim()).filter(Boolean).forEach(tag => set.add(tag))
    })
    return Array.from(set)
  })
  const filteredFriendList = computed<FriendListItem[]>(() => {
    let list: FriendListItem[] = allFriendList.value.slice()
    if (selectedStatus.value !== '__ALL__') {
      list = list.filter(row => String(row.status || '') === selectedStatus.value)
    }
    if (selectedTag.value !== '__ALL__') {
      list = list.filter(row => {
        const t = String(row.tags || '')
        const tag = selectedTag.value
        return t === tag || t.startsWith(`${tag},`) || t.includes(`,${tag},`) || t.endsWith(`,${tag}`)
      })
    }
    return list
  })
  
  watch(() => props.visible, (val) => {
    dialogVisible.value = val
    if (val) {
      loadFriendList()
    }
  })
  
  watch(() => dialogVisible.value, (val) => {
    emit('update:visible', val)
  })
  
  const loadFriendList = async () => {
    try {
      const result = await getFriendList()
      if (result.success) {
        allFriendList.value = result.data || []
        friendList.value = filteredFriendList.value
      } else {
        ElMessage.error('获取名单失败')
      }
    } catch (error) {
      console.error('获取名单失败:', error)
      ElMessage.error('获取名单失败')
    }
  }
  const applyFilters = async () => {
    friendList.value = filteredFriendList.value
  }
  
  const handleDelete = async (wxid: string) => {
    try {
      const result = await deleteFriendFromList(wxid)
      if (result.success) {
        ElMessage.success('删除成功')
        await loadFriendList()
        emit('refresh')
      } else {
        ElMessage.error('删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
  const handleBatchDelete = async () => {
    if (filteredFriendList.value.length === 0) {
      ElMessage.warning('没有可删除的数据')
      return
    }
    try {
      await ElMessageBox.confirm('确认删除当前筛选出的所有记录吗？此操作不可恢复', '批量删除', { type: 'warning' })
      const wxids = filteredFriendList.value.map((row: any) => String(row.wxid))
      const res = await batchDeleteFriendFromList(wxids)
      if (res && res.success) {
        ElMessage.success('批量删除成功')
        await loadFriendList()
        emit('refresh')
      } else {
        ElMessage.error(res?.error || '批量删除失败')
      }
    } catch {
    }
  }
  const handleExport = async () => {
    try {
      const status = selectedStatus.value === '__ALL__' ? '' : selectedStatus.value
      const tag = selectedTag.value === '__ALL__' ? '' : selectedTag.value
      const path = await exportFriendListPath(status, tag)
      await ElMessageBox({
        title: '文件导出成功',
        message: `文件保存路径：${path}`,
        showCancelButton: true,
        confirmButtonText: '查看',
        cancelButtonText: '关闭',
        callback: async (action: MessageBoxAction) => {
          if (action === 'confirm') {
            const dirPath = path.replace(/\\\\/g, '\\').replace(/\\/g, '/')
            const lastSlash = dirPath.lastIndexOf('/')
            const folder = lastSlash > -1 ? dirPath.substring(0, lastSlash) : dirPath
            await openLocalFolder(folder)
          }
        }
      })
    } catch (error) {
      ElMessage.error('导出失败')
    }
  }
  
  const getStatusType = (status: string) => {
    const statusMap: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
      'pending': 'info',
      'added': 'success',
      'failed': 'danger',
      'unknown': 'warning',
      'already': 'warning'
    }
    return statusMap[status] || 'info'
  }
  
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': '待添加',
      'added': '已添加',
      'failed': '添加失败',
      'unknown': '账号不存在',
      'already': '已是好友'
    }
    return statusMap[status] || status
  }
  </script>
  <style scoped>
  .ops-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .filters {
    display: flex;
    gap: 8px;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .filter-select {
    min-width: 140px;
  }
  </style>