<template>
  <Transition name="nav-slide">
    <div class="nav-wrapper" v-if="configStore.isLoaded" v-cloak :style="{ backgroundColor: configStore.config.theme.primary }">
      <div class="logo-container">
        <img
          :src="brandConfig.logo"
          :alt="brandConfig.name"
          class="logo-image"
          :class="{ 'logo-blend-mask': !logoHasTransparentBg }"
          @load="detectLogoTransparency"
        />
        <span class="app-name" v-if="!brandConfig.skipStartup">{{ brandConfig.name }}</span>
      </div>
      <div class="menu-container">
        <el-menu
          :default-active="activeIndex"
          class="nav-menu"
          mode="horizontal"
          @select="handleSelect"
          background-color="transparent"
          :text-color="themeStore.currentTheme.menuTextColor"
          :active-text-color="themeStore.currentTheme.menuActiveTextColor"
          :ellipsis="true"
        >
          <el-menu-item
            v-for="item in presentedNavigationItems"
            :key="item.index"
            :index="item.index"
            :disabled="!item.capability.enabled"
            :title="item.capability.enabled ? '' : runtimeCapabilityReasonText(item.capability)"
          >
            {{ item.text }}
          </el-menu-item>
        </el-menu>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted,computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { BrandConfig } from '@/config/brand'
import { useConfigStore } from '@/store/config'
import { useThemeStore } from '@/store/theme'
import { useRuntimeCapabilityStore } from '@/store/runtimeCapabilities'
import {
  resolveNavigationItems,
  runtimeCapabilityReasonText
} from '@/runtime/capabilities'

const configStore = useConfigStore()
const themeStore = useThemeStore()
const runtimeCapabilityStore = useRuntimeCapabilityStore()
const availableWidth = ref(window.innerWidth)

// true = transparent bg (no mask), false = opaque bg (apply edge mask)
const logoHasTransparentBg = ref(true)

function detectLogoTransparency(event: Event) {
  const img = event.target as HTMLImageElement
  try {
    const canvas = document.createElement('canvas')
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    if (!w || !h) return
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
    // 采样四角各 4x4 像素的 alpha 均值
    const sampleSize = 4
    const regions = [
      ctx.getImageData(0, 0, sampleSize, sampleSize),
      ctx.getImageData(w - sampleSize, 0, sampleSize, sampleSize),
      ctx.getImageData(0, h - sampleSize, sampleSize, sampleSize),
      ctx.getImageData(w - sampleSize, h - sampleSize, sampleSize, sampleSize),
    ]
    let totalAlpha = 0
    let totalPixels = 0
    for (const { data } of regions) {
      for (let i = 3; i < data.length; i += 4) {
        totalAlpha += data[i]
        totalPixels++
      }
    }
    // 四角平均 alpha < 30 视为透明背景
    logoHasTransparentBg.value = totalAlpha / totalPixels < 30
  } catch {
    // CORS 或其他异常：保守默认，不加 mask
    logoHasTransparentBg.value = true
  }
}
// 监听窗口大小变化
const handleResize = () => {
  availableWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
    // 监听路由变化，更新activeIndex
    router.afterEach((to) => {
    activeIndex.value = to.path.substring(1) || 'welcome'
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
// 计算导航栏渐变背景
const navGradient = computed(() => {
  const theme = themeStore.currentTheme
  const start = theme.primary
  const end = lighten(start, 0.15)
  return `linear-gradient(90deg, ${start}, ${end})`
})

// 计算菜单项悬停背景色
const menuHoverBackground = computed(() => {
  return themeStore.currentTheme.menuHoverBackground
})

// 计算菜单项选中背景色
const menuActiveBackground = computed(() => {
  return themeStore.currentTheme.primary
})
const menuPopupBackground = computed(() => {
  return themeStore.currentTheme.primary
})
const menuPopupTextColor = computed(() => {
  return themeStore.currentTheme.menuTextColor
})
const brandConfig = inject<BrandConfig>('brandConfig', {
  channel_id: 'channel_000001',
  name: 'YokoAI机器人',
  ename: 'YokoAIbot',
  logo: '/assets/logo.png',
  contact: '473726474@qq.com'
})

const route = useRoute()
const router = useRouter()

// 根据当前路由路径设置默认选中项
const activeIndex = ref(route.path.substring(1) || 'welcome')
const presentedNavigationItems = computed(() => resolveNavigationItems(
  configStore.config.navbar.items,
  runtimeCapabilityStore.mode,
  runtimeCapabilityStore.capabilities
))

const handleSelect = (key: string) => {
  const selected = presentedNavigationItems.value.find(item => item.index === key)
  if (!selected?.capability.enabled) return
  // 导航到选中的路由
  router.push(`/${key}`)
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16)
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16)
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16)
  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => v.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function lighten(hex: string, ratio: number) {
  const { r, g, b } = hexToRgb(hex)
  const lr = Math.round(r + (255 - r) * ratio)
  const lg = Math.round(g + (255 - g) * ratio)
  const lb = Math.round(b + (255 - b) * ratio)
  return rgbToHex(lr, lg, lb)
}
</script>
  
<style scoped>
/* 导航栏滑入动画 */
.nav-slide-enter-active {
  transition: all 0.3s ease-out;
}

.nav-slide-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}
.menu-container {
  flex: 1;
  min-width: 0; /* 重要：防止 flex 子项溢出 */
  overflow: hidden; /* 确保内容不会溢出 */
}

.nav-slide-enter-to {
  transform: translateY(0);
  opacity: 1;
}
[v-cloak] {
  display: none;
}
.nav-menu {
  width: 100%;
  height: 100%;
  background: transparent !important;
}

.nav-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  height: 56px;
  background-color: v-bind(menuActiveBackground);
}

.logo-container {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.logo-image {
  width: 56px;
  height: 56px;
  padding: 8px;
  box-sizing: border-box;
  object-fit: contain;
}

.logo-blend-mask {
  -webkit-mask-image: radial-gradient(ellipse at center, black 50%, transparent 88%);
  mask-image: radial-gradient(ellipse at center, black 50%, transparent 88%);
}

.app-name {
  color: #ffffff;
  font-size: 18px;
  font-weight: bold;
  margin-left: 1px;
  margin-right: 6px;
}

:deep(.el-menu--horizontal) {
  border-bottom: none !important;
  background: transparent !important;
}

:deep(.el-menu-item) {
  height: 56px;
  line-height: 56px;
  background: transparent !important;
}

:deep(.el-menu-item:hover) {
  background-color: v-bind(menuHoverBackground) !important;
}

:deep(.el-menu-item.is-active) {
  background-color: v-bind(menuActiveBackground) !important;
}
:deep(.el-sub-menu__title) {
  height: 56px;
  line-height: 56px;
}

:deep(.el-icon) {
  font-size: 20px;
  vertical-align: middle;
}

:deep(.el-sub-menu .el-menu-item) {
  min-width: 120px;
}
:deep(.el-menu--popup) {
  background-color: var(--theme-primary) !important;
}
:deep(.el-menu--popup .el-menu-item) {
  color: var(--menu-text-color) !important;
}
:deep(.el-menu--popup .el-menu-item:hover) {
  background-color: var(--menu-hover-background) !important;
  color: var(--menu-text-color) !important;
}
:deep(.el-menu--popup-container) {
  background-color: var(--theme-primary) !important;
  border-color: transparent !important;
}
:deep(.el-popper:has(.el-menu--popup)) {
  background-color: var(--theme-primary) !important;
  border-color: transparent !important;
  --el-bg-color-overlay: var(--theme-primary);
}
</style>
