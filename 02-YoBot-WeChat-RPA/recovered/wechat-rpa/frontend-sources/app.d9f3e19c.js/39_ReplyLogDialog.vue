import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock } from "vue"

import { computed, onMounted,onUnmounted,ref  } from 'vue'
  import dayjs from 'dayjs'
  import { taskQueue } from '@/utils/TaskQueue'
  
export default /*@__PURE__*/_defineComponent({
  __name: 'ReplyLogDialog',
  props: {
    visible: { type: Boolean }
  },
  emits: ['update:visible'],
  setup(__props: any, { emit: __emit }) {

  const windowWidth = ref(window.innerWidth)
  const props = __props
  const handleResize = () => {
  windowWidth.value = window.innerWidth
}
  // 加载日志数据
const loadLogs = async () => {
  await taskQueue.loadTaskLogs()
}
  const emit = __emit
  
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })
  const handleDialogOpen = () => {
  loadLogs()
  console.log('对话框打开后的日志数据:', filteredLogs.value)
}
  // 过滤最近24小时的日志
  const filteredLogs = computed(() => {
    return taskQueue.getTaskLogs()
  })
  // 组件挂载时加载一次数据
onMounted(() => {
  loadLogs()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
})
  const formatTime = (timestamp: Date) => {
    return dayjs(timestamp).format('MM-DD HH:mm:ss')
  }
  
return (_ctx: any,_cache: any) => {
  const _component_el_table_column = _resolveComponent("el-table-column")!
  const _component_el_tag = _resolveComponent("el-tag")!
  const _component_el_table = _resolveComponent("el-table")!
  const _component_el_dialog = _resolveComponent("el-dialog")!

  return (_openBlock(), _createBlock(_component_el_dialog, {
    modelValue: dialogVisible.value,
    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((dialogVisible).value = $event)),
    title: "自动回复记录",
    width: windowWidth.value <= 700 ? '95%' : '95%',
    onOpen: handleDialogOpen
  }, {
    default: _withCtx(() => [
      _createVNode(_component_el_table, {
        data: filteredLogs.value,
        style: {"width":"100%"},
        "max-height": "500px"
      }, {
        default: _withCtx(() => [
          _createVNode(_component_el_table_column, {
            prop: "timestamp",
            label: "时间",
            width: "120"
          }, {
            default: _withCtx(({ row }) => [
              _createTextVNode(_toDisplayString(formatTime(row.timestamp)), 1)
            ]),
            _: 1
          }),
          _createVNode(_component_el_table_column, {
            prop: "targetName",
            label: "用户",
            width: "80"
          }),
          _createVNode(_component_el_table_column, {
            prop: "chatType",
            label: "类型",
            width: "70"
          }, {
            default: _withCtx(({ row }) => [
              _createVNode(_component_el_tag, {
                size: "small",
                type: row.chatType === 'group' ? 'warning' : 'info'
              }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(row.chatType === 'group' ? '群聊' : '私聊'), 1)
                ]),
                _: 2
              }, 1032, ["type"])
            ]),
            _: 1
          }),
          _createVNode(_component_el_table_column, {
            prop: "content",
            label: "AI回复",
            "show-overflow-tooltip": ""
          }),
          _createVNode(_component_el_table_column, {
            prop: "status",
            label: "状态",
            width: "70"
          }, {
            default: _withCtx(({ row }) => [
              _createVNode(_component_el_tag, {
                type: row.status === 'completed' ? 'success' : 'danger',
                size: "small"
              }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(row.status === 'completed' ? '成功' : '失败'), 1)
                ]),
                _: 2
              }, 1032, ["type"])
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