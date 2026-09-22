import { API_BASE_URL, headers } from './config'

// 自动同步通讯录请求接口
export interface SyncContactsRequest {
  sync_items: string[]        // 同步项：['friend', 'group']
  sync_frequency: number      // 同步频率（天）
  time_range_start: string    // 开始时间 HH:mm
  time_range_end: string      // 结束时间 HH:mm
  enabled: boolean            // 是否启用
}

// 自动同步通讯录任务信息（匹配后端返回的数据结构）
export interface SyncContactsTask {
  id: string
  type: string
  status: string
  next_run_time?: string
  params?: {
    task_info?: {
      task_id: string
      task_type: string
      created_at: string
      updated_at: string
    }
    sync_config?: {
      sync_items: string[]
      sync_frequency: number
      time_range_start: string
      time_range_end: string
      start_date: string
    }
    execution_stats?: {
      execution_count: number
      last_execution_time: string
      total_success: number
      total_failed: number
    }
    task_status?: string
    execution_history?: any[]
    schedule_id?: string
  }
}

// 兼容旧接口的任务信息（用于向后兼容）
export interface LegacySyncContactsTask {
  task_id: string
  sync_items: string[]
  sync_frequency: number
  time_range_start: string
  time_range_end: string
  enabled: boolean
  next_execution_time?: string
  created_at: string
  updated_at: string
}

// 创建自动同步通讯录任务
export const createSyncContactsTask = async (request: SyncContactsRequest): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/sync-contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '创建自动同步任务失败')
    }
    
    return await response.json()
  } catch (error) {
    console.error('创建自动同步任务失败:', error)
    throw error
  }
}

// 获取当前自动同步通讯录任务状态（单个任务）
export const getSyncContactsTaskStatus = async (): Promise<SyncContactsTask | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/sync-contacts/status`, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取自动同步任务状态失败')
    }
    
    const result = await response.json()
    return result.task || null
  } catch (error) {
    console.error('获取自动同步任务状态失败:', error)
    throw error
  }
}

// 获取自动同步通讯录任务信息
export const getSyncContactsTaskInfo = async (taskId: string): Promise<SyncContactsTask | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/sync-contacts/${taskId}`, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取自动同步任务信息失败')
    }
    
    const result = await response.json()
    return result.task || null
  } catch (error) {
    console.error('获取自动同步任务信息失败:', error)
    throw error
  }
}

// 取消自动同步通讯录任务
export const cancelSyncContactsTask = async (taskId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/sync-contacts/${taskId}/cancel`, {
      method: 'POST',
      headers
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '取消自动同步任务失败')
    }
    
    return await response.json()
  } catch (error) {
    console.error('取消自动同步任务失败:', error)
    throw error
  }
}