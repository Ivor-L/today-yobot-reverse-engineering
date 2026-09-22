import { defineStore } from 'pinia'
import type { Config } from '@/types/config'

const defaultConfig: Config = {
  theme: {
    primary: '#2c3e50',
    menuBackground: '#2c3e50',
    menuTextColor: '#ffffff',
    menuActiveTextColor: '#ffd04b',
    menuHoverBackground: '#34495e',
    gradientStart: '#2c3e50',
    gradientEnd: '#4c5b6a'
  },
  navbar: {
    items: [
      { index: 'welcome', text: '欢迎' },
      { index: 'ai-chat', text: 'AI销冠' },
      { index: 'customer-management', text: '客户管理' },
      { index: 'auto-add', text: '自动化SOP' },
      { index: 'settings', text: '配置' }
    ]
  },
  runtimeCapabilities: {
    mode: 'legacy_passthrough'
  }
}

export const useConfigStore = defineStore('config', {
  state: () => ({
    config: defaultConfig as Config,
    isLoaded: false
  }),
  actions: {
    async loadConfig() {
      try {
        const response = await fetch('/config.json')
        const data = await response.json()
        this.config = data
        this.isLoaded = true
      } catch (error) {
        console.error('Failed to load config:', error)
        this.isLoaded = true // 加载失败时使用默认配置
      }
    }
  }
})
