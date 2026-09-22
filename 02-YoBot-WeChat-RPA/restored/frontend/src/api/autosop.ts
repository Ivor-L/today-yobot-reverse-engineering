import { API_BASE_URL, headers } from './config'
import type { FriendConfig, MassSendingTaskRequest, BatchAutoFollowRequest, AutoFollowTaskResult } from '../types/autosop'

// 重新导出类型
export type { MassSendingTaskRequest, BatchAutoFollowRequest, AutoFollowTaskResult } from '../types/autosop'
interface ImportFriendListResponse {
  success: boolean
  count: number
  remaining: number
  needsAuth?: boolean
  authUrl?: string
}
export const uploadFile = async (file: File) => {
    try {
      // 检查文件大小（例如限制为10MB）
      const MAX_SIZE = 100 * 1024 * 1024 // 10MB
      if (file.size > MAX_SIZE) {
        throw new Error('文件大小不能超过100MB')
      }
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`${API_BASE_URL}/api/file/upload`, {
        method: 'POST',
        headers: {
          'X-API-Key': headers['X-API-Key']
        },
        body: formData
      })
  
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.detail || '上传失败')
      }
  
      return result.data
    } catch (error) {
      console.error('文件上传失败:', error)
      throw error instanceof Error ? error : new Error('未知错误')
    }
  }
  export const startAutoAddFriend = async (config: FriendConfig) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friend/auto-add/start`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
  
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }
  
      return result
    } catch (error) {
      console.error('启动自动加好友失败:', error)
      throw error instanceof Error ? error : new Error('未知错误')
    }
  }

  export const getTaskLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/logs`, {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      })
  
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '获取任务日志失败')
      }
  
      return result.data
    } catch (error) {
      console.error('获取任务日志失败:', error)
      throw error instanceof Error ? error : new Error('未知错误')
    }
  }
  // 主动激活任务相关
  export const createMassSendingTask = async (taskData: MassSendingTaskRequest) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/mass-sending`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        })

        const result = await response.json()
        
        // 检查 HTTP 状态码
        if (!response.ok) {
            throw new Error(result.error || result.detail || '服务器错误')
        }
        console.debug("群发任务创建结果：",result)
        // 检查业务逻辑状态
        if (!result.success) {
            throw new Error(result.error || '创建任务失败')
        }

        return result.data
    } catch (error) {
        console.error('创建群发任务失败:', error)
        throw error instanceof Error ? error : new Error('未知错误')
    }
}

export const pauseMassSendingTask = async (taskId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/mass-sending/${taskId}/pause`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            }
        })

        const result = await response.json()
        if (!result.success) {
            throw new Error(result.error)
        }
        return result
    } catch (error) {
        console.error('暂停群发任务失败:', error)
        throw error instanceof Error ? error : new Error('未知错误')
    }
}

export const resumeMassSendingTask = async (taskId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/mass-sending/${taskId}/resume`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            }
        })

        const result = await response.json()
        if (!result.success) {
            throw new Error(result.error)
        }
        return result
    } catch (error) {
        console.error('恢复群发任务失败:', error)
        throw error instanceof Error ? error : new Error('未知错误')
    }
}

export const cancelMassSendingTask = async (taskId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/mass-sending/${taskId}/cancel`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            }
        })

        const result = await response.json()
        if (!result.success) {
            throw new Error(result.error)
        }
        return result
    } catch (error) {
        console.error('取消群发任务失败:', error)
        throw error instanceof Error ? error : new Error('未知错误')
    }
}

export const pauseAllMassSendingTasks = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/mass-sending/pause-all`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            }
        })

        const result = await response.json()
        if (!result.success) {
            throw new Error(result.error)
        }
        return result
    } catch (error) {
        console.error('批量暂停群发任务失败:', error)
        throw error instanceof Error ? error : new Error('未知错误')
    }
}

export const cancelAllMassSendingTasks = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/mass-sending/cancel-all`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            }
        })

        const result = await response.json()
        if (!result.success) {
            throw new Error(result.error)
        }
        return result
    } catch (error) {
        console.error('批量取消群发任务失败:', error)
        throw error instanceof Error ? error : new Error('未知错误')
    }
}

export const getMassSendingTasks = async () => {
  try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/mass-sending`, {
          headers: headers
      })

      const result = await response.json()
      if (!result.success) {
          throw new Error(result.error || '获取任务列表失败')
      }

      return result
  } catch (error) {
      console.error('获取群发任务列表失败:', error)
      throw error instanceof Error ? error : new Error('未知错误')
  }
}

// ===== 群发活动（Campaign）：把一次群发的多个批次串成整体 =====

// 获取群发活动列表（含整体聚合进度），默认不含终态
export const getMassSendingCampaigns = async (includeTerminal = false) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/tasks/mass-sending/campaigns?include_terminal=${includeTerminal}`,
      { headers }
    )
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '获取群发活动列表失败')
    }
    return result.campaigns || []
  } catch (error) {
    console.error('获取群发活动列表失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

// 整体恢复一个被中断的群发活动（从各批次断点续发）
export const resumeMassSendingCampaign = async (campaignId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/tasks/mass-sending/campaigns/${campaignId}/resume`,
      { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' } }
    )
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '恢复群发活动失败')
    }
    return result
  } catch (error) {
    console.error('恢复群发活动失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

// 整体取消一个群发活动
export const cancelMassSendingCampaign = async (campaignId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/tasks/mass-sending/campaigns/${campaignId}/cancel`,
      { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' } }
    )
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '取消群发活动失败')
    }
    return result
  } catch (error) {
    console.error('取消群发活动失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

// 添加自动加好友相关接口
export const toggleAutoAddFriend = async (enabled: boolean, settings: FriendConfig) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/friend-request/toggle`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled,
        maxFriendsPerDay: settings.maxFriendsPerDay,
        maxProcessPerTime: settings.maxProcessPerTime,
        tag: settings.tag,
        targetGroup: settings.targetGroup, 
        greetingGroupId:settings.greetingGroupId,
        checkInterval: settings.checkInterval,
        multiCycleEnabled: settings.multiCycleEnabled,
        accountIds: settings.selectedAccounts
      })
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error)
    }

    return result
  } catch (error) {
    console.error('切换自动通过好友失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}
export const toggleAutoComment = async (enabled: boolean, config: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/moment/toggle-auto-comment`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...config,
        enabled
      })
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error)
    }

    return result
  } catch (error) {
    console.error('切换自动评论失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

export const getFriendRequestLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/friend-request/logs`, {
      method: 'GET',
      headers
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error)
    }

    return result.data
  } catch (error) {
    console.error('获取好友请求日志失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

export const getFriendRequestRiskRecords = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/friend-request/risk-records`, {
      method: 'GET',
      headers
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error)
    }

    return result
  } catch (error) {
    console.error('获取风控记录失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

// 导入好友名单
export const importFriendList = async (file: File): Promise<ImportFriendListResponse> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${API_BASE_URL}/api/friend/import`, {
      method: 'POST',
      headers: {
        'X-API-Key': headers['X-API-Key']
      },
      body: formData
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.detail || '导入失败')
    }

    return {
      success: true,
      count: result.count,
      remaining: result.remaining
    }
  } catch (error) {
    console.error('导入好友名单失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}
// 通过智能体导入好友名单
export const importFriendListByAgent = async (agentId: string): Promise<ImportFriendListResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friend/import-by-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': headers['X-API-Key']
      },
      body: JSON.stringify({ agent_id: agentId })
    })

    const result = await response.json()
    
    console.debug("智能体导入结果：",result)
    // 首先检查返回结果中是否直接包含授权信息
    if (result.needsAuth && result.authUrl) {
      return {
        success: false,
        count: 0,
        remaining: 0,
        needsAuth: true,
        authUrl: result.authUrl
      }
    }
    if (!response.ok) {
      // 检查错误信息中是否包含授权链接
      const errorMsg = result.detail || '导入失败'
      const authUrlMatch = errorMsg.match(/https:\/\/open\.feishu\.cn\/open-apis\/authen[^\s"']+/)
      
      if (authUrlMatch) {
        return {
          success: false,
          count: 0,
          remaining: 0,
          needsAuth: true,
          authUrl: authUrlMatch[0]
        }
      }
      
      throw new Error(errorMsg)
    }

    return {
      success: true,
      count: result.count,
      remaining: result.remaining
    }
  } catch (error) {
    console.error('通过智能体导入名单失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}
// 通过API同步好友名单
export const syncFriendListByApi = async (): Promise<ImportFriendListResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friend/sync-by-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': headers['X-API-Key']
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.detail || result.error || '同步失败')
    }

    if (!result.success) {
      throw new Error(result.error || '同步失败')
    }

    return {
      success: true,
      count: result.count || 0,
      remaining: result.remaining || 0
    }
  } catch (error) {
    console.error('通过API同步名单失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}
// 获取添加好友日志
export const getAddFriendLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friend/add-logs`, {
      method: 'GET',
      headers
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '获取添加好友日志失败')
    }

    return result.data
  } catch (error) {
    console.error('获取添加好友日志失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}
// 获取剩余可添加好友数量
export const getRemainingFriendCount = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friend/remaining-count`, {
      method: 'GET',
      headers
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '获取待添加好友数量失败')
    }
    return {
      remaining: result.data.remaining,
      today_added: result.data.today_added || 0
    }
  } catch (error) {
    console.error('获取待添加好友数量失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

// 开启/关闭自动加好友
export const toggleAutoAddNewFriend = async (enabled: boolean, config: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friend/auto-add-new/toggle`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled,
        maxFriendsPerDay: config.maxFriendsPerDay,
        interval: config.interval,
        batchSize: config.batchSize,
        verifyMessage: config.verifyMessage || '',
        multiCycleEnabled: Boolean(config.multiCycleEnabled),
        accountIds: Array.isArray(config.selectedAccounts) ? config.selectedAccounts : []
      })
    })

    const result = await response.json()
    // if (!result.success) {
    //   throw new Error(result.error || '操作失败')
    // }
    return result
  } catch (error) {
    console.error('切换自动加好友状态失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}
export const getFriendConfig = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/friend-request/logs`, {
      method: 'GET',
      headers
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error)
    }

    return result.data
  } catch (error) {
    console.error('获取好友配置失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

export const getFriendList = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friend/list`, {
      headers
    })
    return await response.json()
  } catch (error) {
    console.error('获取好友名单失败:', error)
    throw error
  }
}

export const getFriendListFiltered = async (status?: string, tag?: string) => {
  try {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (tag) params.append('tag', tag)
    const response = await fetch(`${API_BASE_URL}/api/friend/list?${params.toString()}`, {
      headers
    })
    return await response.json()
  } catch (error) {
    console.error('筛选好友名单失败:', error)
    throw error
  }
}

export const deleteFriendFromList = async (wxid: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friend/list/${wxid}`, {
      method: 'DELETE',
      headers
    })
    return await response.json()
  } catch (error) {
    console.error('删除好友失败:', error)
    throw error
  }
}

export const batchDeleteFriendFromList = async (wxids: string[]) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friend/list/batch_delete`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ wxids })
    })
    return await response.json()
  } catch (error) {
    console.error('批量删除好友失败:', error)
    throw error
  }
}

export const exportFriendList = async (status?: string, tag?: string): Promise<void> => {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (tag) params.append('tag', tag)
  const url = `${API_BASE_URL}/api/friend/list/export?${params.toString()}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || `导出失败(${response.status})`)
    }
    const blob = await response.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `好友名单_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(objectUrl)
  } catch (error) {
    console.error('导出好友失败:', error)
    throw error
  }
}

export const getMomentLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/moment/interactions`, {
      method: 'GET',
      headers
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || result.message || '获取朋友圈日志失败')
    }

    return result.data
  } catch (error) {
    console.error('获取朋友圈日志失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}
export const exportFriendListPath = async (status?: string, tag?: string): Promise<string> => {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (tag) params.append('tag', tag)
  const url = `${API_BASE_URL}/api/friend/list/export_path?${params.toString()}`
  const response = await fetch(url, { headers })
  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || result.detail || '导出失败')
  }
  return result.path as string
}
export const openLocalFolder = async (path: string): Promise<void> => {
  const params = new URLSearchParams()
  params.append('path', path)
  await fetch(`${API_BASE_URL}/api/moment-material/open-folder?${params.toString()}`, {
    method: 'GET',
    headers
  })
}

// 聊天采集任务相关接口
export interface ChatCollectionTaskRequest {
  timeType: 'now' | 'schedule'
  time?: string | Date | null
  agent_id: string
  max_sessions: number
  time_limit_days: number
  file_types: string[]
}

export const createChatCollectionTask = async (taskData: ChatCollectionTaskRequest) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/chat-collection`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || result.detail || '服务器错误')
    }
    
    if (!result.success) {
      throw new Error(result.error || '创建任务失败')
    }

    return result.data
  } catch (error) {
    console.error('创建聊天采集任务失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

export const getChatCollectionTasks = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/chat-collection`, {
      headers
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '获取任务列表失败')
    }

    return result
  } catch (error) {
    console.error('获取聊天采集任务列表失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

export const cancelChatCollectionTask = async (taskId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/chat-collection/${taskId}/cancel`, {
      method: 'POST',
      headers
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '取消任务失败')
    }

    return result.data
  } catch (error) {
    console.error('取消聊天采集任务失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

export const getChatCollectionLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat-collection/logs`, {
      method: 'GET',
      headers
    })

    const result = await response.json()
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.detail || '获取聊天采集日志失败')
    }

    return result.data || []
  } catch (error) {
    console.error('获取聊天采集日志失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

// 自动跟单任务相关接口
export const createBatchAutoFollowTasks = async (taskData: BatchAutoFollowRequest): Promise<AutoFollowTaskResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/auto-follow/batch`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    })

    const result = await response.json()
    
    // 检查 HTTP 状态码
    if (!response.ok) {
      throw new Error(result.error || result.detail || '服务器错误')
    }
    
    console.debug("批量创建自动跟单任务结果：", result)
    
    // 检查业务逻辑状态
    if (!result.success) {
      throw new Error(result.error || '创建任务失败')
    }

    return {
      success: true,
      task_id: result.task_id,
      ...result
    }
  } catch (error) {
    console.error('批量创建自动跟单任务失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

// 获取自动跟单任务列表
export const getAutoFollowTasks = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/auto-follow`, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    console.info("获取自动跟单任务列表结果：", result)
    if (!response.ok) {
      throw new Error(result.error || result.detail || '获取任务列表失败')
    }
    
    if (!result.success) {
      throw new Error(result.error || '获取任务列表失败')
    }

    return result.tasks || []
  } catch (error) {
    console.error('获取自动跟单任务列表失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

// 取消自动跟单任务（按任务ID取消）
export const cancelAutoFollowTask = async (taskId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/auto-follow/${taskId}/cancel`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || result.detail || '取消任务失败')
    }
    
    if (!result.success) {
      throw new Error(result.error || '取消任务失败')
    }

    return result
  } catch (error) {
    console.error('取消自动跟单任务失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}

// 获取自动跟单执行日志
export const getAutoFollowLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/auto-follow/logs`, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || result.detail || '获取执行日志失败')
    }
    
    if (!result.success) {
      throw new Error(result.error || '获取执行日志失败')
    }

    return result.data || []
  } catch (error) {
    console.error('获取自动跟单执行日志失败:', error)
    throw error instanceof Error ? error : new Error('未知错误')
  }
}