import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import StartupRoutePage from '../views/StartupRoutePage.vue'
import MultiWelcomePage from '../views/MultiWelcomePage.vue'
import AiChatNew from '../views/AiChatNew.vue'
import Settings from '../views/SettingsPage.vue'  // 添加设置页面导入
import AutoSOP from '../views/AutoSOP.vue'
import LicenseView from '@/views/LicenseView.vue'
import Moments from '../views/MomentsView.vue'
import { useLicenseStore } from '@/store/license'
import { useRuntimeCapabilityStore } from '@/store/runtimeCapabilities'
import { resolveRouteCapability } from '@/runtime/capabilities'
import { getBrandConfig } from '../config/brand'

const isNarrowScreen = () => window.innerWidth < 650
const routes: Array<RouteRecordRaw> = [
  {
    path: '/license',
    name: 'License',
    component: LicenseView
  },
  {
    path: '/',
    redirect: (to) => {
      const brandConfig = getBrandConfig()
      if (brandConfig.skipStartup) {
        return { path: '/welcome', query: to.query }
      }
      return { path: '/startup', query: to.query }
    }
  },
  {
    path: '/startup',
    name: 'StartupPage',
    component: StartupRoutePage
  },
  {
    path: '/welcome',
    name: 'WelcomePage',
    component: MultiWelcomePage,
    meta: { requiresStartup: true }
  },
  {
    path: '/ai-chat',
    name: 'AiChat',
    component: AiChatNew,
    meta: { requiresStartup: true,
      shouldHideRightPanel: isNarrowScreen
     }
  },
  {
    path: '/customer-management',
    name: 'CustomerManagement',
    component: () => import('../views/CustomerManagement.vue'),
    meta: { requiresStartup: true }
  },
  {
    path: '/moments',
    name: 'Moments',
    component: Moments,
    meta: { requiresStartup: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresStartup: true }
  },
  {
    path: '/auto-add',
    name: 'AutoSOP',
    component: AutoSOP,
    meta: { requiresStartup: true,
      shouldHideRightPanel: isNarrowScreen
     },
    props: (route) => ({
      activeFunction: route.params.activeFunction
    })
  }
]

const router = createRouter({
  history: createWebHistory(''),
  routes
})
// 添加全局路由守卫
router.beforeEach(async (to, from, next) => {
  // 如果是访问供应商路由
  // console.debug('before路由加载完成:', to.path)
    // 非供应商路由，检查授权
    if (to.name === 'License') {
      next();
      return;
    }
    
    // 使用store中的授权状态，不再每次都调用API
    const licenseStore = useLicenseStore()
    if (!licenseStore.isLicenseValid) {
      // 如果还没验证过，进行一次验证
      if (!licenseStore.isVerified) {
        const isValid = await licenseStore.verifyLicenseOnce()
        if (!isValid) {
          next('/license')
          return
        }
      } else {
        // 已验证过但无效
        next('/license')
        return
      }
    }
    const runtimeCapabilityStore = useRuntimeCapabilityStore()
    const routeCapability = resolveRouteCapability(
      to.path,
      runtimeCapabilityStore.mode,
      runtimeCapabilityStore.capabilities
    )
    if (!routeCapability.enabled) {
      next({
        path: '/welcome',
        query: {
          capabilityBlocked: routeCapability.featureId,
          reasonCode: routeCapability.reasonCode || 'CAPABILITY_UNAVAILABLE'
        }
      })
      return
    }
    next()
});
router.afterEach((to) => {
  console.debug('after路由加载完成:', to.path)
})
export default router
