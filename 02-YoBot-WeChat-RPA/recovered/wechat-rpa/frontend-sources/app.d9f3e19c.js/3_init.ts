import { API_BASE_URL, headers } from './config'

interface InitResponse {
  success: boolean
  message: string
  user_info?: {
    nickname: string
    account_id: string
  }
}

// 多微信实例信息接口
export interface InstanceInfo {
  instance_id: string;
  window_handle: number;
  api_port: number;
  initialized?: boolean;
  nickname?: string;
  account_id?: string;
  account_info?: {
    nickname: string;
    account_id: string;
  };
  is_active?: boolean; // 添加 is_active 属性，使用可选标记
  is_connected?: boolean;
  manually_exited?: boolean; // 用户主动退出托管
  accessibility_method?: 'existing' | 'hot_gate' | 'narrator' | string;
}

export interface FailedInstanceInfo {
  instance_index: number
  window_handle: number
  reason: string      // ENV_NOT_CONFIGURED | INIT_FAILED
  description: string
  accessibility_reason_code?: string
}

export interface InitSummary {
  total: number
  success: number
  failed: number
}

// 多微信初始化响应接口
export interface MultiInitResponse {
  success: boolean
  message: string
  instances: InstanceInfo[]
  code?: string
  error_detail?: string
  // 新增字段（旧调用方忽略）
  init_summary?: InitSummary
  failed_instances?: FailedInstanceInfo[]
  need_auto_config?: boolean
  next_action?: { action: string; endpoint?: string; required?: boolean; hint: string }
  accessibility?: {
    status: 'ready' | 'partial_ready' | 'needs_narrator' | string
    attempted?: string[]
    requires_confirmation?: boolean
    destructive?: boolean
    summary?: Record<string, number>
    instances?: Array<Record<string, unknown>>
  }
  // 版本不支持 / 通用引导（由 RPA 返回，前端仅渲染）
  version_info?: { detected: string; min: string; max: string; recommended: string }
  guidance?: {
    title?: string
    reason?: string
    fix_steps?: string[]
    download_url?: string
    download_label?: string
  }
  // 连续失败后的降级引导（附在 ENV_NOT_CONFIGURED 响应里）
  downgrade_suggestion?: {
    show?: boolean
    message?: string
    recommended_version?: string
    download_url?: string
    download_label?: string
  }
}

export interface LaunchWechatResponse {
  status: 'launched' | 'error'
  code?: string
  launched_count?: number
  closed_count?: number
  enable_narrator?: boolean
  message: string
  next_action?: { action: string; endpoint?: string; hint: string }
}
// 添加版本检查接口
export const checkVersion = async (currentVersion: string, agentId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/version/check`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ current_version: currentVersion, agent_id: agentId })
    })
    
    return await response.json()
  } catch (error) {
    console.error('检查版本失败:', error)
    throw error
  }
}
// 获取版本通知配置
export const getVersionNotify = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config/version_notify`, {
      headers
    })
    return await response.json()
  } catch (error) {
    console.error('获取版本通知配置失败:', error)
    throw error
  }
}

// 保存版本通知配置
export const saveVersionNotify = async (config: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config/version_notify`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config),
      credentials: 'include'
    })
    return await response.json()
  } catch (error) {
    console.error('保存版本通知配置失败:', error)
    throw error
  }
}
// 添加更新下载接口
export const downloadUpdate = async (currentVersion: string, agentId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/version/download`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ current_version: currentVersion, agent_id: agentId })
    })
    
    return await response.json()
  } catch (error) {
    console.error('下载更新失败:', error)
    throw error
  }
}
// 添加重连方法
export const reconnectWeChat = async (instanceId?: string) => {
  try {
    const body = instanceId ? JSON.stringify({ instance_id: instanceId }) : '{}';
    const response = await fetch(`${API_BASE_URL}/api/reconnect`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: body
    });
    return await response.json();
  } catch (error) {
    console.error('重连失败:', error);
    return { success: false, error: '网络请求失败' };
  }
};
// 初始化所有微信实例
export const initializeMultipleWechat = async (): Promise<MultiInitResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/init/multi`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify({ timestamp: Date.now() })
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '初始化多微信失败' }))
      throw new Error(error.detail || '初始化多微信失败')
    }
    
    const data = await response.json()
    console.debug('多微信初始化响应:', data)
    return data
  } catch (error) {
    console.error('初始化多微信失败:', error)
    throw error
  }
}

export const autoConfigWechat41 = async (forceNarrator = false): Promise<{
  success: boolean
  message: string
  status?: 'awaiting_user_login' | string
  launched_count?: number
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/system/wechat41/auto_config`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ force_narrator: forceNarrator })
    })
    return await response.json()
  } catch (error) {
    console.error('自动配置失败:', error)
    return { success: false, message: '自动配置失败' }
  }
}

export const stopNarrator = async (): Promise<{success: boolean; message: string}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/system/narrator/stop`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
    return await response.json()
  } catch (error) {
    console.error('退出讲述人失败:', error)
    return { success: false, message: '退出讲述人失败' }
  }
}

// 启动微信进程（支持多开）
export const launchWechat = async (
  count = 1,
  closeExisting = true,
  enableNarrator = false
): Promise<LaunchWechatResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/system/wechat/launch`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ count, close_existing: closeExisting, enable_narrator: enableNarrator })
    })
    return await response.json()
  } catch (error) {
    console.error('启动微信失败:', error)
    return { status: 'error', code: 'NETWORK_ERROR', message: '网络请求失败' }
  }
}

// 获取所有微信实例
export const getAllInstances = async (): Promise<{
  success?: boolean;
  instances?: InstanceInfo[];
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/instances`, {
      headers
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '获取实例信息失败')
    }
    
    return await response.json()
  } catch (error) {
    console.error('获取实例信息失败:', error)
    throw error
  }
}

// 切换当前活动的微信实例
export const switchActiveInstance = async (instanceId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/instances/switch`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instance_id: instanceId })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '切换实例失败')
    }
    
    return await response.json()
  } catch (error) {
    console.error('切换实例失败:', error)
    throw error
  }
}
// 退出实例托管
export const exitInstanceManagement = async (instanceId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/instances/exit`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instance_id: instanceId })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '退出托管失败')
    }

    return await response.json()
  } catch (error) {
    console.error('退出托管失败:', error)
    throw error
  }
}

export const getLicenseInfo = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/license/info`, {
      headers
    })
    return await response.json()
  } catch (error) {
    console.error('获取授权信息失败:', error)
    throw error
  }
}

export const unbindLicense = async (activation_code: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/license/unbind`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activation_code })
    })
    return await response.json()
  } catch (error) {
    console.error('解绑失败:', error)
    throw error
  }
}
export const checkConnectionStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/connection/status`, {
      headers
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '检查连接状态失败')
    }
    
    return await response.json()
  } catch (error) {
    console.error('检查连接状态失败:', error)
    throw error
  }
}
export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/current`, {
      headers
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '获取用户信息失败')
    }
    const data =  await response.json()
    console.debug('用户信息:', data)
    return data
  } catch (error) {
    console.error('获取用户信息失败:', error)
    throw error
  }
}

export const getServerTime = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/time/authority`, {
      method: 'GET',
      headers
    })
    return await response.json()
  } catch (error) {
    console.error('获取服务器时间失败:', error)
    throw error
  }
}

// 获取向导状态
export const getGuideStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/guide/status`, {
      headers
    })
    return await response.json()
  } catch (error) {
    console.error('获取向导状态失败:', error)
    throw error
  }
}
