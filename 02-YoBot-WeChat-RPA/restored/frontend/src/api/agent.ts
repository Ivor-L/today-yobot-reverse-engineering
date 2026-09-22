import { API_BASE_URL, headers } from './config'

export const updateActivationCodeRemark = async (code: string, remark: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/agent/activation-code/remark`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code, remark })
    })
    return await res.json()
  } catch (e) {
    return { success: false, message: '网络错误' }
  }
}
export const checkAgentExists = async (name: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/agent/exists?name=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers
    })
    const data = await res.json()
    return data.success && data.exists
  } catch (e) {
    return false
  }
}

export const loginAgent = async (name: string, password: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/agent/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, password })
    })
    return await res.json()
  } catch (e) {
    return { success: false, message: '网络错误' }
  }
}

export const getAgentActivationCodes = async (name: string): Promise<any[]> => {
  // try {
  //   const res = await fetch(`${API_BASE_URL}/api/agent/activation-codes?name=${encodeURIComponent(name)}`, {
  //     method: 'GET',
  //     headers
  //   })
  //   const data = await res.json()
  //   if (data.success) return data.data
  //   return []
  // } catch (e) {
    return []
  // }
}