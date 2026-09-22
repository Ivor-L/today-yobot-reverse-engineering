import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useConfigStore } from '@/store/config'

export const useThemeStore = defineStore('theme', () => {
  const configStore = useConfigStore()
  const currentTheme = computed(() => configStore.config.theme)
  const isInitialized = ref(false)
  const gradientStart = computed(() => currentTheme.value.gradientStart || currentTheme.value.primary)
  const gradientEnd = computed(() => currentTheme.value.gradientEnd || lighten(currentTheme.value.primary, 0.15))
  const cssVariables = computed(() => {
    const theme = currentTheme.value
    const rgb = hexToRgb(theme.primary)
    const primary50 = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
    const primaryHover = darken(theme.primary, 0.08)
    return {
      '--theme-primary': theme.primary,
      '--menu-background': theme.menuBackground,
      '--menu-text-color': theme.menuTextColor,
      '--menu-active-text-color': theme.menuActiveTextColor,
      '--menu-hover-background': theme.menuHoverBackground,
      '--theme-gradient-start': gradientStart.value,
      '--theme-gradient-end': gradientEnd.value,
      '--el-bg-color-overlay': theme.primary,
      '--theme-primary-50': primary50,
      '--theme-primary-hover': primaryHover
    }
  })
  const applyTheme = () => {
    const root = document.documentElement
    Object.entries(cssVariables.value).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
  }
  const initTheme = () => {
    if (isInitialized.value) return
    applyTheme()
    isInitialized.value = true
  }
  return {
    currentTheme,
    isInitialized,
    cssVariables,
    initTheme,
    applyTheme
  }
})

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
function darken(hex: string, ratio: number) {
  const { r, g, b } = hexToRgb(hex)
  const dr = Math.round(r * (1 - ratio))
  const dg = Math.round(g * (1 - ratio))
  const db = Math.round(b * (1 - ratio))
  return rgbToHex(dr, dg, db)
}
