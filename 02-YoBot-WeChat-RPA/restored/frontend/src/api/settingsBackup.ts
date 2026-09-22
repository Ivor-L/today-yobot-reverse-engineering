import { API_BASE_URL, headers } from '@/api/config'

export interface BackupInspection {
  importId: string
  createdAt?: string
  appVersion?: string
  accounts: string[]
  summary: {
    globalConfigCount?: number
    accountConfigCount?: number
    resourceFileCount?: number
    fileLibraryFileCount?: number
    totalBytes?: number
    removedVoiceGreetingCount?: number
    fileRecognitionResetAccounts?: string[]
  }
  excluded: string[]
  manualAdjustments: string[]
  warnings: string[]
  expiresInSeconds: number
}

export interface BackupImportResult {
  importedConfigCount: number
  importedResourceCount: number
  accountCount: number
  fileRecognitionResetAccounts: string[]
  manualAdjustments: string[]
  requiresRestart: boolean
}

export interface BackupExportResult {
  exportId: string
  fileName: string
  filePath: string
  fileSize: number
}

const readError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json()
    return data.detail || data.error || data.message || `请求失败（${response.status}）`
  } catch {
    return `请求失败（${response.status}）`
  }
}

export const exportSettingsBackup = async (): Promise<BackupExportResult> => {
  const response = await fetch(`${API_BASE_URL}/api/settings-backup/export`, {
    method: 'POST',
    headers
  })
  if (!response.ok) throw new Error(await readError(response))
  const result = await response.json()
  if (!result.success) throw new Error(result.error || '导出配置失败')
  return result.data as BackupExportResult
}

export const openSettingsBackupFolder = async (exportId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/settings-backup/export/open-folder`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ exportId })
  })
  if (!response.ok) throw new Error(await readError(response))
  const result = await response.json()
  if (!result.success) throw new Error(result.error || '打开文件夹失败')
}

export const inspectSettingsBackup = async (file: File): Promise<BackupInspection> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}/api/settings-backup/import/inspect`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-API-Key': headers['X-API-Key']
    },
    body: formData
  })
  if (!response.ok) throw new Error(await readError(response))
  const result = await response.json()
  if (!result.success) throw new Error(result.error || '配置备份检查失败')
  return result.data as BackupInspection
}

export const applySettingsBackup = async (importId: string): Promise<BackupImportResult> => {
  const response = await fetch(`${API_BASE_URL}/api/settings-backup/import/apply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ importId })
  })
  if (!response.ok) throw new Error(await readError(response))
  const result = await response.json()
  if (!result.success) throw new Error(result.error || '配置导入失败')
  return result.data as BackupImportResult
}

export const discardSettingsBackup = async (importId: string): Promise<void> => {
  await fetch(`${API_BASE_URL}/api/settings-backup/import/${encodeURIComponent(importId)}`, {
    method: 'DELETE',
    headers
  }).catch(() => undefined)
}
