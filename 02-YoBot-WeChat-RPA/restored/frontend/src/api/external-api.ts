import { API_BASE_URL, headers } from './config'

export interface ExternalApiTestResponse {
  success: boolean
  message: string
  data?: any
}

export interface ExternalApiSettings {
  identifier: string
}

/**
 * 测试外部API连接
 * @param identifier API标识符
 * @returns 测试结果
 */
export const testExternalApiConnection = async (identifier: string): Promise<ExternalApiTestResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/external-api/test-connection`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    return {
      success: result.success || false,
      message: result.message || (result.success ? '连接成功' : '连接失败'),
      data: result.data
    }
  } catch (error) {
    console.error('测试外部API连接失败:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '网络错误或服务不可用'
    }
  }
}

/**
 * 保存外部API配置
 * @param settings API配置
 * @returns 保存结果
 */
export const saveExternalApiSettings = async (settings: ExternalApiSettings): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config/external_api_settings`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.success || false
  } catch (error) {
    console.error('保存外部API配置失败:', error)
    throw error
  }
}

/**
 * 获取外部API配置
 * @returns API配置
 */
export const getExternalApiSettings = async (): Promise<ExternalApiSettings | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config/external_api_settings`, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data || null
  } catch (error) {
    console.error('获取外部API配置失败:', error)
    return null
  }
}