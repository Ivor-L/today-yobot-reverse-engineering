import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { API_BASE_URL, headers } from './config'

export interface RequestConfig extends AxiosRequestConfig {
  /** The caller owns the user-facing error message for this request. */
  suppressGlobalError?: boolean
}

function responseErrorMessage(error: any): string {
  const payload = error?.response?.data
  const detail = payload?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (detail && typeof detail.message === 'string' && detail.message.trim()) {
    return detail.message
  }
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message
  return error?.message || '请求失败'
}

// 创建 axios 实例
const service = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers
})

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  error => {
    console.error('响应错误:', error)
    const message = responseErrorMessage(error)
    if (error instanceof Error) error.message = message
    if (!(error?.config as RequestConfig | undefined)?.suppressGlobalError) {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

// 导出请求函数
export const request = async <T>(config: RequestConfig): Promise<T> => {
  try {
    const response = await service(config)
    // 由于响应拦截器已经返回 response.data，这里直接断言
    return response as unknown as T
  } catch (error) {
    throw error
  }
}
