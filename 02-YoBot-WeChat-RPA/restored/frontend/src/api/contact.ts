import { API_BASE_URL, headers } from './config'

export interface Contact {
  id: string      // 使用 name 作为 id
  name: string
  tag?: string //群聊标签
  tags: string[]
  avatar?: string // 可选的头像
  wxid?: string   // 微信ID
  is_new?: number | boolean // 是否为新好友
  last_updated?: string     // 最后更新时间
  member_count?: number     // 群成员数量（用于群聊）
}

export interface Tag {
  id: string
  name: string
  count: number
}

// 获取好友列表
export const getContacts = async (tag?: string, keyword?: string, accountId?: string): Promise<Contact[]> => {
  try {
    const params = new URLSearchParams()
    if (tag) params.append('tag', tag)
    if (keyword) params.append('keyword', keyword)
    if (accountId) params.append('account_id', accountId)
    const response = await fetch(
      `${API_BASE_URL}/api/contacts?${params.toString()}`,
      { headers }
    )
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '获取好友列表失败')
    }
    
    const data = await response.json()
    // console.log('获取好友列表原始数据:', data)
    const result = Array.isArray(data) ? data.map(contact => ({
      id: String(contact.name || ''),
      name: String(contact.name || ''),
      wxid: String(contact.wxid || ''),
      tags: Array.isArray(contact.tags) ? 
        contact.tags.map((tag: string | null) => String(tag || '')) : [],
      avatar: contact.avatar || undefined,
      is_new: contact.is_new === true,
    })).filter(contact => contact.name.length > 0) : [];
    return result;
  } catch (error) {
    console.error('获取好友列表失败:', error)
    throw error
  }
}
// 添加批量拉群的接口
export const inviteFriendsToGroup = async (params: { friends: string[], targetGroup: string, account_id: string }) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/contacts/invite-to-group`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      console.debug('批量拉群失败响应:', error)
      const msg = (error && (error.error || error.message)) || '批量拉群失败'
      throw new Error(msg)
    }
    
    return await response.json()
  } catch (error) {
    console.error('批量拉群失败:', error)
    throw error
  }
}
// 获取群成员列表
export const getGroupMembers = async (groupName: string): Promise<any[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/contacts/group/${encodeURIComponent(groupName)}/members`,
      { headers }
    )
    
    if (!response.ok) {
      throw new Error('获取群成员列表失败')
    }
    
    const data = await response.json()
    return data.members || []
  } catch (error) {
    console.error('获取群成员列表失败:', error)
    throw error
  }
}

// 同步群成员
export const syncGroupMembers = async (groupName: string): Promise<any[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/contacts/group/${encodeURIComponent(groupName)}/sync`,
      {
        method: 'POST',
        headers
      }
    )
    
    if (!response.ok) {
      throw new Error('同步群成员失败')
    }
    
    const data = await response.json()
    return data.members || []
  } catch (error) {
    console.error('同步群成员失败:', error)
    throw error
  }
}
// 获取群聊列表
export const getGroups = async (keyword?: string, accountId?: string): Promise<Contact[]> => {
  try {
    const params = new URLSearchParams()
    if (keyword) params.append('keyword', keyword)
    if (accountId) params.append('account_id', accountId)
    
    const response = await fetch(
      `${API_BASE_URL}/api/contacts/groups?${params.toString()}`,
      { headers }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '获取群聊列表失败')
    }
    
    const data = await response.json()
    return data.groups || []
  } catch (error) {
    console.error('获取群聊列表失败:', error)
    throw error
  }
}

export const setGroupTagBatch = async (params: { groups: string[], tag: string, account_id: string }): Promise<any> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/contacts/groups/set-tag`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      }
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || error.error || '批量设置群标签失败')
    }
    return await response.json()
  } catch (error) {
    console.error('批量设置群标签失败:', error)
    throw error
  }
}

// 获取标签列表
export const getContactTags = async (accountId?: string): Promise<Tag[]> => {
  try {
    const params = new URLSearchParams()
    if (accountId) params.append('account_id', accountId)
    
    const response = await fetch(
      `${API_BASE_URL}/api/contacts/tags?${params.toString()}`,
      { headers }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '获取标签列表失败')
    }
    
    return await response.json()
  } catch (error) {
    console.error('获取标签列表失败:', error)
    throw error
  }
}

// 获取群聊标签列表
export const getGroupTags = async (accountId?: string): Promise<Tag[]> => {
  try {
    const params = new URLSearchParams()
    if (accountId) params.append('account_id', accountId)
    const response = await fetch(
      `${API_BASE_URL}/api/contacts/group_tags?${params.toString()}`,
      { headers }
    )
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '获取群聊标签列表失败')
    }
    return await response.json()
  } catch (error) {
    console.error('获取群聊标签列表失败:', error)
    throw error
  }
}
// 同步群聊
export const syncGroups = async (accountId?: string): Promise<void> => {
  try {
    const requestBody: any = { type: 'group' }
    if (accountId) {
      requestBody.account_id = accountId
    }
    
    const response = await fetch(
      `${API_BASE_URL}/api/contact/sync`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '同步群聊失败')
    }
    const data = await response.json()
    console.debug("syncContacts-group",data)
    return data
  } catch (error) {
    console.error('同步群聊失败:', error)
    throw error
  }
}
// 同步通讯录
export const syncContacts = async (accountId?: string): Promise<void> => {
  try {
    const requestBody: any = { type: 'friend' }
    if (accountId) {
      requestBody.account_id = accountId
    }
    
    const response = await fetch(
      `${API_BASE_URL}/api/contact/sync`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '同步通讯录失败')
    }
    const data = await response.json()
    // console.debug("syncContacts-friend",data)
    return data
  } catch (error) {
    // console.error('同步通讯录失败:', error)
    throw error
  }
}

// 自动跟单任务：按开始日期/智能体组合筛选（两个参数均可选）
export const getAutoFollowTasksByStartDate = async (date?: string, agentId?: string): Promise<any> => {
  try {
    const params = new URLSearchParams()
    if (date) params.append('date', date)
    if (agentId) params.append('agent_id', agentId)
    const response = await fetch(
      `${API_BASE_URL}/api/tasks/auto-follow/by-start-date?${params.toString()}`,
      { headers }
    )
    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.detail || result.error || '获取自动跟单任务失败')
    }
    // 统一返回数组，兼容后端返回 { success, tasks }
    if (Array.isArray(result)) {
      return result
    }
    return result.tasks || []
  } catch (error) {
    console.error('获取自动跟单任务失败:', error)
    throw error
  }
}

// 自动跟单任务：批量取消
export const batchCancelAutoFollowTasks = async (taskIds: string[]): Promise<any> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/tasks/auto-follow/batch-cancel`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_ids: taskIds })
      }
    )
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '批量取消自动跟单任务失败')
    }
    return await response.json()
  } catch (error) {
    console.error('批量取消自动跟单任务失败:', error)
    throw error
  }
}

export const batchUpdateAutoFollowAgent = async (taskIds: string[], agentId: string): Promise<any> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/tasks/auto-follow/batch-update-agent`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_ids: taskIds, agent_id: agentId })
      }
    )
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '批量修改自动跟单任务智能体失败')
    }
    return await response.json()
  } catch (error) {
    console.error('批量修改自动跟单任务智能体失败:', error)
    throw error
  }
}