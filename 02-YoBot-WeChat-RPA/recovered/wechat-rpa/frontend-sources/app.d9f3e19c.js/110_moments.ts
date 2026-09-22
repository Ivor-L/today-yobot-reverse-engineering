import { request } from './request'

export const listMomentPlans = async () => {
  return await request<{ success: boolean; plans: string[]; base: string }>({
    url: '/api/moment-material/plans',
    method: 'GET'
  })
}

export const createMomentFolder = async (planName: string) => {
  return await request<{ success: boolean; path?: string; name?: string; error?: string }>({
    url: '/api/moment-material/create-folder',
    method: 'POST',
    data: { plan_name: planName }
  })
}

export const listMomentGroups = async (planName: string) => {
  return await request<{ success: boolean; groups: string[] }>({
    url: '/api/moment-material/groups',
    method: 'GET',
    params: { plan_name: planName }
  })
}

export const selectMomentFolder = async () => {
  return await request<{ success: boolean; selected?: string; groups?: string[]; error?: string }>({
    url: '/api/moment-material/select-folder',
    method: 'GET',
    timeout: 120000 // 2 minutes
  })
}

export const openFolder = async (path: string) => {
  return await request<{ success: boolean; error?: string }>({
    url: '/api/moment-material/open-folder',
    method: 'GET',
    params: { path }
  })
}

export interface Instance {
  account_id: string
  nickname: string
  is_active?: boolean
}

export const getActiveInstances = async () => {
  return await request<{ success: boolean; instances: Instance[] }>({
    url: '/api/instances/active',
    method: 'GET',
    suppressGlobalError: true
  })
}

export interface CreateMomentPostPayload {
  name: string
  execMode: 'fixed' | 'range'
  fixedTime?: string | Date
  rangeStart?: string | Date
  rangeEnd?: string | Date
  postCount?: number
  cycle: 'daily' | 'weekly'
  weekDays?: string[]
  materialFolder: string
  publishMode: 'sequence' | 'random'
  account: string
}

export const createMomentPostTask = async (payload: CreateMomentPostPayload) => {
  return await request<{ success: boolean; task_ids?: string[]; error?: string }>({
    url: '/api/moment/post-task',
    method: 'POST',
    data: payload
  })
}

export const getMomentPostTasks = async () => {
  return await request<{ success: boolean; tasks: { id: string; name: string; createdAt: string; account: string; sentCount: number; nextRunAt: string; ruleDesc: string }[] }>({
    url: '/api/moment/post-tasks',
    method: 'GET'
  })
}

export const cancelMomentPostTask = async (taskId: string) => {
  return await request<{ success: boolean }>({
    url: '/api/moment/post-task/cancel',
    method: 'POST',
    data: { task_id: taskId }
  })
}

export interface MomentPostLog {
  id: string
  timestamp: string
  type: string
  status: string
  folder_path: string
  text: string
  media_count: number
  account: string
  error?: string
}

export const getMomentPostLogs = async () => {
  return await request<{ success: boolean; logs: MomentPostLog[] }>({
    url: '/api/moment/post-logs',
    method: 'GET'
  })
}
