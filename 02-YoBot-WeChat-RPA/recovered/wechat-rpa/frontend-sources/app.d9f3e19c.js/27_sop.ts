// 运营SOP编排 - 数据读写（复用通用配置接口，无需新增后端 API）
// 存储键：operation_sops；后端 config_manager.get_operation_sops() 已兼容 { sops: [...] } 结构。
import { getConfig, saveConfig } from './config'
import type { Sop } from '@/types/sop'

export const loadSops = async (): Promise<Sop[]> => {
  try {
    const res = await getConfig('operation_sops')
    const data = res?.data
    if (!data) return []
    if (Array.isArray(data)) return data as Sop[]
    return (data.sops as Sop[]) ?? []
  } catch (e) {
    console.error('加载运营SOP失败:', e)
    return []
  }
}

export const saveSops = async (sops: Sop[]) => {
  return saveConfig('operation_sops', { sops })
}
