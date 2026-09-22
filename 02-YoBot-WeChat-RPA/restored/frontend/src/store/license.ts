import { defineStore } from 'pinia'
import { verifyLicense } from '@/api/license'
import type { LicenseInfo } from '@/api/license'

export const useLicenseStore = defineStore('license', {
  state: () => ({
    isValid: false,
    isVerified: false,
    licenseInfo: null as LicenseInfo['data'] | null,
    lastVerifyTime: 0
  }),
  getters: {
    isLicenseValid: (state) => state.isValid && state.isVerified
  },
  actions: {
    async verifyLicenseOnce() {
      // 如果已经验证过且在24小时内，直接返回缓存结果
      const now = Date.now()
      if (this.isVerified && (now - this.lastVerifyTime < 24 * 60 * 60 * 1000)) {
        return this.isValid
      }
      
      try {
        const result = await verifyLicense()
        this.isValid = result.valid
        this.licenseInfo = result.data || null
        this.isVerified = true
        this.lastVerifyTime = now
        return this.isValid
      } catch (error) {
        console.error('验证授权失败:', error)
        this.isValid = false
        this.isVerified = true
        this.lastVerifyTime = now
        return false
      }
    }
  }
})