import { useCssVars as _useCssVars, defineComponent as _defineComponent } from 'vue'
import { unref as _unref, normalizeClass as _normalizeClass, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createBlock as _createBlock, createVNode as _createVNode, normalizeStyle as _normalizeStyle, Transition as _Transition } from "vue"

const _hoisted_1 = { class: "logo-container" }
const _hoisted_2 = ["src", "alt"]
const _hoisted_3 = {
  key: 0,
  class: "app-name"
}
const _hoisted_4 = { class: "menu-container" }

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


export default /*@__PURE__*/_defineComponent({
  __name: 'NavBar',
  setup(__props) {

_useCssVars(_ctx => ({
  "v5e443476": (menuActiveBackground.value),
  "v3e478fa8": (menuHoverBackground.value)
}))

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

return (_ctx: any,_cache: any) => {
  const _component_el_menu_item = _resolveComponent("el-menu-item")!
  const _component_el_menu = _resolveComponent("el-menu")!

  return (_openBlock(), _createBlock(_Transition, { name: "nav-slide" }, {
    default: _withCtx(() => [
      (_unref(configStore).isLoaded)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "nav-wrapper",
            style: _normalizeStyle({ backgroundColor: _unref(configStore).config.theme.primary })
          }, [
            _createElementVNode("div", _hoisted_1, [
              _createElementVNode("img", {
                src: _unref(brandConfig).logo,
                alt: _unref(brandConfig).name,
                class: _normalizeClass(["logo-image", { 'logo-blend-mask': !logoHasTransparentBg.value }]),
                onLoad: detectLogoTransparency
              }, null, 42, _hoisted_2),
              (!_unref(brandConfig).skipStartup)
                ? (_openBlock(), _createElementBlock("span", _hoisted_3, _toDisplayString(_unref(brandConfig).name), 1))
                : _createCommentVNode("", true)
            ]),
            _createElementVNode("div", _hoisted_4, [
              _createVNode(_component_el_menu, {
                "default-active": activeIndex.value,
                class: "nav-menu",
                mode: "horizontal",
                onSelect: handleSelect,
                "background-color": "transparent",
                "text-color": _unref(themeStore).currentTheme.menuTextColor,
                "active-text-color": _unref(themeStore).currentTheme.menuActiveTextColor,
                ellipsis: true
              }, {
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(presentedNavigationItems.value, (item) => {
                    return (_openBlock(), _createBlock(_component_el_menu_item, {
                      key: item.index,
                      index: item.index,
                      disabled: !item.capability.enabled,
                      title: item.capability.enabled ? '' : _unref(runtimeCapabilityReasonText)(item.capability)
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(item.text), 1)
                      ]),
                      _: 2
                    }, 1032, ["index", "disabled", "title"]))
                  }), 128))
                ]),
                _: 1
              }, 8, ["default-active", "text-color", "active-text-color"])
            ])
          ], 4))
        : _createCommentVNode("", true)
    ]),
    _: 1
  }))
}
}

})