import { defineStore } from 'pinia'
import { getCurrentUser } from '@/api/init'

// interface UserState {
//   nickname: string
//   account_id: string
//   isLoggedIn: boolean
// }
export interface UserInfo {
  nickname: string
  account_id: string
  friendCount?: number
  groupCount?: number
}
export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null as UserInfo | null,
    isLoggedIn: false,
    lastFetchTime: 0,
    isFetching: false
  }),
  
  actions: {
    // async fetchUserInfo(force = false) {
    //   // 如果已经在获取中，返回一个Promise
    //   if (this.isFetching) {
    //     return new Promise((resolve) => {
    //       const checkInterval = setInterval(() => {
    //         if (!this.isFetching) {
    //           clearInterval(checkInterval)
    //           resolve(this.userInfo)
    //         }
    //       }, 100)
    //     })
    //   }
      
    //   // 如果不强制刷新且有缓存且缓存时间小于5分钟，直接返回缓存
    //   const now = Date.now()
    //   if (!force && this.userInfo && (now - this.lastFetchTime < 5 * 60 * 1000)) {
    //     return this.userInfo
    //   }
      
    //   try {
    //     this.isFetching = true
    //     const result = await getCurrentUser()
    //     if (result.success && result.data) {
    //       this.setUserInfo(result.data)
    //       this.lastFetchTime = now
    //     }
    //     this.isFetching = false
    //     return this.userInfo
    //   } catch (error) {
    //     console.error('获取用户信息失败:', error)
    //     this.isFetching = false
    //     throw error
    //   }
    // },
    async fetchUserInfo(force = false) {
      // 如果已经在获取中，返回一个Promise
      if (this.isFetching) {
          return new Promise((resolve) => {
              const checkInterval = setInterval(() => {
                  if (!this.isFetching) {
                      clearInterval(checkInterval)
                      resolve(this.userInfo)
                  }
              }, 100)
          })
      }
      
      // 如果不强制刷新且有缓存且缓存时间小于30分钟，直接返回缓存
      const now = Date.now()
      if (!force && this.userInfo && (now - this.lastFetchTime < 5 * 60 * 1000)) {
          return this.userInfo
      }
      
      try {
          this.isFetching = true
          const result = await getCurrentUser()
          if (result.success && result.data) {
              this.setUserInfo(result.data)
              this.lastFetchTime = now
          }
          this.isFetching = false
          return this.userInfo
      } catch (error) {
          console.error('获取用户信息失败:', error)
          this.isFetching = false
          throw error
      }
  },
    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo
      this.isLoggedIn = !!userInfo
    },
    clearUserInfo() {
      this.userInfo = null
      this.isLoggedIn = false
      this.lastFetchTime = 0
    }
  }
})