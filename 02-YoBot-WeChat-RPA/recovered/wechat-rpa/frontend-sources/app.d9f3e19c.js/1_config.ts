// API 基础配置
// export const API_BASE_URL = 'http://localhost:9922'
export const API_BASE_URL = window.location.origin
// API 请求头
export const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-API-Key': 'yoko_test'
}

export const saveConfig = async (configType: string, config: any) => {
  try {
    console.debug('正在保存配置:', configType, config)
    
    const response = await fetch(`${API_BASE_URL}/api/config/${configType}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config),
      credentials: 'include'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('服务器响应:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`服务器错误 (${response.status}): ${errorText || response.statusText}`)
    }

    const data = await response.json()
    console.debug('保存配置响应:', data)
    
    if (!data.success) {
      throw new Error(data.error || '保存失败')
    }

    return data
  } catch (error) {
    console.error('保存配置失败:', error)
    if (error instanceof Error) {
      throw new Error(`保存失败: ${error.message}`)
    }
    throw error
  }
}

export const getConfig = async (configType: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config/${configType}`, {
      headers
    })
    return await response.json()
  } catch (error) {
    console.error('获取配置失败:', error)
    throw error
  }
}