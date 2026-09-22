import { defineComponent as _defineComponent } from 'vue'
import { resolveComponent as _resolveComponent, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, createTextVNode as _createTextVNode, withCtx as _withCtx, createVNode as _createVNode } from "vue"

const _hoisted_1 = { class: "auto-follow-logs" }
const _hoisted_2 = { class: "logs-container" }
const _hoisted_3 = { class: "log-header" }
const _hoisted_4 = { class: "friend-info" }
const _hoisted_5 = { class: "friend-details" }
const _hoisted_6 = ["title"]
const _hoisted_7 = ["title"]
const _hoisted_8 = { class: "status-text" }
const _hoisted_9 = { class: "log-time" }
const _hoisted_10 = {
  key: 0,
  class: "log-content"
}
const _hoisted_11 = { class: "content-text" }
const _hoisted_12 = { class: "content-main" }
const _hoisted_13 = {
  key: 0,
  class: "content-actions"
}

import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAutoFollowLogs } from '../api/autosop'

interface AutoFollowLog {
  id: string
  friend_name: string
  friend_wxid: string
  execution_time: string
  message_content: string
  generated_message?: string
  success?: boolean
  status?: 'success' | 'failed' | 'pending'
  error_message?: string
}

const CONTENT_LIMIT = 30

// 获取显示内容

export default /*@__PURE__*/_defineComponent({
  __name: 'AutoFollowLogs',
  setup(__props, { expose: __expose }) {

const logs = ref<AutoFollowLog[]>([])
const loading = ref(false)
const expandedItems = ref<Set<string>>(new Set())

// 加载执行日志
const loadLogs = async () => {
  try {
    loading.value = true
    const result = await getAutoFollowLogs()
    // 兼容 V2 和旧版数据格式
    logs.value = (result || []).map((log: any) => ({
      ...log,
      status: log.status || (log.success ? 'success' : 'failed'),
      message_content: log.message_content || log.generated_message || ''
    }))
  } catch (error) {
    console.error('获取自动跟单执行日志失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '获取执行日志失败')
  } finally {
    loading.value = false
  }
}

// 格式化日志时间
const formatLogTime = (timeStr: string) => {
  if (!timeStr) return '--'
  try {
    // 兼容 UTC 时间字符串，如果是以 Z 结尾，说明已经是 UTC，直接解析会根据本地时区转换
    // 如果是 +08:00 结尾的 ISO 字符串，直接解析会多加 8 小时
    let parsedTimeStr = timeStr;
    if (timeStr.includes('T') && timeStr.includes('+08:00')) {
      // 截取掉时区信息，直接按本地时间解析
      parsedTimeStr = timeStr.split('+')[0];
    } else if (timeStr.endsWith('Z')) {
      // 如果后端传的是 Z，我们假设它是北京时间的字面量（之前为了兼容前端去掉了+08:00），所以也截取掉
      parsedTimeStr = timeStr.replace('Z', '');
    }

    const date = new Date(parsedTimeStr)
    // 如果解析失败
    if (isNaN(date.getTime())) return timeStr

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return timeStr
  }
}

// 内容截断长度（约2行的字符数）
const getDisplayContent = (content: string, itemId: string) => {
  if (!content) return '--'
  
  const cleanContent = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  
  if (isExpanded(itemId) || cleanContent.length <= CONTENT_LIMIT) {
    return cleanContent
  }
  
  return cleanContent.substring(0, CONTENT_LIMIT) + '...'
}

// 判断是否需要显示展开/收起按钮
const shouldShowToggle = (content: string) => {
  if (!content) return false
  const cleanContent = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  return cleanContent.length > CONTENT_LIMIT
}

// 判断是否已展开
const isExpanded = (itemId: string) => {
  return expandedItems.value.has(itemId)
}

// 切换展开/收起状态
const toggleContent = (itemId: string) => {
  if (expandedItems.value.has(itemId)) {
    expandedItems.value.delete(itemId)
  } else {
    expandedItems.value.add(itemId)
  }
}

// 获取状态样式类
const getStatusClass = (status?: string) => {
  switch (status) {
    case 'success':
      return 'status-success'
    case 'failed':
      return 'status-failed'
    case 'pending':
      return 'status-pending'
    default:
      return 'status-unknown'
  }
}

// 获取状态文本
const getStatusText = (status?: string) => {
  switch (status) {
    case 'success':
      return '发送成功'
    case 'failed':
      return '发送失败'
    case 'pending':
      return '发送中'
    default:
      return '未知状态'
  }
}

onMounted(() => {
  loadLogs()
})

// 暴露刷新方法给父组件
__expose({
  refresh: loadLogs
})

return (_ctx: any,_cache: any) => {
  const _component_el_empty = _resolveComponent("el-empty")!
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_scrollbar = _resolveComponent("el-scrollbar")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createVNode(_component_el_scrollbar, { height: "calc(100vh - 100px)" }, {
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_2, [
          (logs.value.length === 0 && !loading.value)
            ? (_openBlock(), _createBlock(_component_el_empty, {
                key: 0,
                description: "暂无执行日志",
                "image-size": 80
              }))
            : (_openBlock(true), _createElementBlock(_Fragment, { key: 1 }, _renderList(logs.value, (log) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: log.id,
                  class: _normalizeClass(["log-item", { 'failed-item': log.status === 'failed' }])
                }, [
                  _createElementVNode("div", _hoisted_3, [
                    _createElementVNode("div", _hoisted_4, [
                      _createElementVNode("div", _hoisted_5, [
                        _createElementVNode("span", {
                          class: "friend-name",
                          title: log.friend_name
                        }, _toDisplayString(log.friend_name), 9, _hoisted_6),
                        _createElementVNode("span", {
                          class: "friend-wxid",
                          title: log.friend_wxid
                        }, _toDisplayString(log.friend_wxid), 9, _hoisted_7)
                      ]),
                      _createElementVNode("div", {
                        class: _normalizeClass(["log-status", getStatusClass(log.status)])
                      }, [
                        _createElementVNode("span", _hoisted_8, _toDisplayString(getStatusText(log.status)), 1)
                      ], 2)
                    ])
                  ]),
                  _createElementVNode("div", _hoisted_9, "跟进日期:" + _toDisplayString(formatLogTime(log.execution_time)), 1),
                  (log.status !== 'failed')
                    ? (_openBlock(), _createElementBlock("div", _hoisted_10, [
                        _createElementVNode("div", _hoisted_11, [
                          _createElementVNode("div", _hoisted_12, _toDisplayString(getDisplayContent(log.message_content, log.id)), 1),
                          (shouldShowToggle(log.message_content))
                            ? (_openBlock(), _createElementBlock("div", _hoisted_13, [
                                _createVNode(_component_el_button, {
                                  link: "",
                                  size: "small",
                                  class: "toggle-btn",
                                  onClick: ($event: any) => (toggleContent(log.id))
                                }, {
                                  default: _withCtx(() => [
                                    _createTextVNode(_toDisplayString(isExpanded(log.id) ? '收起' : '展开'), 1)
                                  ]),
                                  _: 2
                                }, 1032, ["onClick"])
                              ]))
                            : _createCommentVNode("", true)
                        ])
                      ]))
                    : _createCommentVNode("", true)
                ], 2))
              }), 128))
        ])
      ]),
      _: 1
    })
  ]))
}
}

})