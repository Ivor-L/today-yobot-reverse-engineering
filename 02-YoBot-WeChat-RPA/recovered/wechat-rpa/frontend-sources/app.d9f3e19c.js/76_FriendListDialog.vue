import { defineComponent as _defineComponent } from 'vue'
import { resolveComponent as _resolveComponent, createVNode as _createVNode, withCtx as _withCtx, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, createBlock as _createBlock, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, toDisplayString as _toDisplayString } from "vue"

const _hoisted_1 = { class: "ops-bar" }
const _hoisted_2 = { class: "filters" }
const _hoisted_3 = { class: "actions" }

import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { getFriendList, deleteFriendFromList, exportFriendListPath, openLocalFolder, batchDeleteFriendFromList } from '@/api/autosop'
  type MessageBoxAction = 'confirm' | 'cancel' | 'close'
  interface FriendListItem {
    wxid: string
    remark: string
    tags: string
    status: string
  }
  
export default /*@__PURE__*/_defineComponent({
  __name: 'FriendListDialog',
  props: {
    visible: { type: Boolean }
  },
  emits: ["update:visible", "refresh"],
  setup(__props: any, { emit: __emit }) {

  const windowWidth = ref(window.innerWidth)
  const props = __props
  const handleResize = () => {
    windowWidth.value = window.innerWidth
  }
  const emit = __emit
  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
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
  
return (_ctx: any,_cache: any) => {
  const _component_el_option = _resolveComponent("el-option")!
  const _component_el_select = _resolveComponent("el-select")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_table_column = _resolveComponent("el-table-column")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_table = _resolveComponent("el-table")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: dialogVisible.value,
    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event: any) => ((dialogVisible).value = $event)),
    title: "好友名单",
    width: windowWidth.value <= 700 ? '95%' : '600px'
  }, {
    default: _withCtx(() => [
      _createElementVNode("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, [
          _createVNode(_component_el_select, {
            modelValue: selectedStatus.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((selectedStatus).value = $event)),
            placeholder: "状态",
            size: "small",
            class: "filter-select",
            onChange: applyFilters
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_option, {
                label: "全部状态",
                value: "__ALL__"
              }),
              _createVNode(_component_el_option, {
                label: "待添加",
                value: "pending"
              }),
              _createVNode(_component_el_option, {
                label: "已添加",
                value: "added"
              }),
              _createVNode(_component_el_option, {
                label: "添加失败",
                value: "failed"
              }),
              _createVNode(_component_el_option, {
                label: "账号不存在",
                value: "unknown"
              }),
              _createVNode(_component_el_option, {
                label: "已是好友",
                value: "already"
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          _createVNode(_component_el_select, {
            modelValue: selectedTag.value,
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event: any) => ((selectedTag).value = $event)),
            placeholder: "标签",
            size: "small",
            class: "filter-select",
            filterable: "",
            onChange: applyFilters
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_option, {
                label: "全部标签",
                value: "__ALL__"
              }),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(tagOptions.value, (tag) => {
                return (_openBlock(), _createBlock(_component_el_option, {
                  key: tag,
                  label: tag,
                  value: tag
                }, null, 8, ["label", "value"]))
              }), 128))
            ]),
            _: 1
          }, 8, ["modelValue"])
        ]),
        _createElementVNode("div", _hoisted_3, [
          _createVNode(_component_el_button, {
            type: "primary",
            plain: "",
            size: "small",
            onClick: handleExport
          }, {
            default: _withCtx(() => [...(_cache[3] || (_cache[3] = [
              _createTextVNode("导出名单", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_el_button, {
            type: "primary",
            size: "small",
            onClick: handleBatchDelete,
            disabled: filteredFriendList.value.length === 0
          }, {
            default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
              _createTextVNode("批量删除", -1)
            ]))]),
            _: 1
          }, 8, ["disabled"])
        ])
      ]),
      _createVNode(_component_el_table, {
        data: friendList.value,
        style: {"width":"100%"}
      }, {
        default: _withCtx(() => [
          _createVNode(_component_el_table_column, {
            prop: "wxid",
            label: "微信号",
            width: "120"
          }),
          _createVNode(_component_el_table_column, {
            prop: "remark",
            label: "备注名",
            width: "120"
          }),
          _createVNode(_component_el_table_column, {
            prop: "tags",
            label: "标签"
          }),
          _createVNode(_component_el_table_column, {
            prop: "status",
            label: "状态"
          }, {
            default: _withCtx(({ row }) => [
              _createVNode(_component_el_tag, {
                type: getStatusType(row.status)
              }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(getStatusText(row.status)), 1)
                ]),
                _: 2
              }, 1032, ["type"])
            ]),
            _: 1
          }),
          _createVNode(_component_el_table_column, {
            label: "操作",
            width: "100"
          }, {
            default: _withCtx(({ row }) => [
              _createVNode(_component_el_button, {
                type: "danger",
                size: "small",
                onClick: ($event: any) => (handleDelete(row.wxid))
              }, {
                default: _withCtx(() => [...(_cache[5] || (_cache[5] = [
                  _createTextVNode(" 删除 ", -1)
                ]))]),
                _: 1
              }, 8, ["onClick"])
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["data"])
    ]),
    _: 1
  }, 8, ["modelValue", "width"]))
}
}

})