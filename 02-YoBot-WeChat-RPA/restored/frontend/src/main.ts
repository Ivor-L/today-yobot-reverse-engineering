import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { wsClient } from '@/utils/websocket'
import { useConfigStore } from './store/config'
import { useThemeStore } from './store/theme'
import { useRuntimeCapabilityStore } from './store/runtimeCapabilities'

// el-form 渲染的是原生 <form>：表单内只有一个单行 input 且没有 submit 按钮时，
// 回车会触发 HTML 隐式提交，绕过 vue-router 发起真实导航（如 GET /settings?xxx），
// 后端静态服务找不到该路径就返回 404，WebView2 整窗变黑。
// 捕获阶段全局掐掉原生提交，避免逐个输入框补 @keydown.enter.prevent。
document.addEventListener('submit', (e) => e.preventDefault(), true)

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)  // 先安装 Pinia
const configStore = useConfigStore()
const themeStore = useThemeStore()
const runtimeCapabilityStore = useRuntimeCapabilityStore()
// 初始化 WebSocket 客户端
const initWebSocket = () => {
  // 确保 wsClient 实例被创建
  if (!wsClient) {
    console.error('WebSocket client initialization failed')
    return
  }
  console.log("初始化websocket....success")
  
  // 添加全局的 WebSocket 事件监听和重连逻辑
  window.addEventListener('ws-error', (event: Event) => {
    console.error('WebSocket error:', (event as CustomEvent).detail)
  })

  // 监听页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('页面变为可见，检查 WebSocket 连接...')
      wsClient.checkConnection()
    }
  })

  // 监听网络状态变化
  window.addEventListener('online', () => {
    console.log('网络恢复，尝试重新连接 WebSocket...')
    wsClient.checkConnection()
  })
}

// 等待 DOM 加载完成后再初始化 WebSocket
window.addEventListener('DOMContentLoaded', () => {
  initWebSocket()
})
// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
initWebSocket()
// 等待配置加载完成后再挂载应用
await configStore.loadConfig()
runtimeCapabilityStore.configureMode(configStore.config.runtimeCapabilities?.mode)
await runtimeCapabilityStore.loadRuntimeCapabilities()
themeStore.initTheme()
app.use(ElementPlus, {
  locale: zhCn
})

app.use(ElementPlus)
app.use(router)
app.use(store)
app.mount('#app')
