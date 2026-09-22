import { API_BASE_URL, headers } from './config'

export interface DoubaoVoiceConfig {
  app_id: string
  access_token: string                      // 写入：明文；返回：永远为 ''（看 _masked / _has_value）
  api_key: string
  access_key_id: string                     // 火山开放 API AccessKey ID（明文，非敏感）
  secret_access_key: string                 // 火山开放 API SecretKey（敏感，加密落盘）
  open_api_region: string
  open_api_endpoint: string
  resource_id_clone: string
  resource_id_tts: string
  endpoint: string
  // 派生字段（仅 GET 返回）
  access_token_masked?: string
  access_token_has_value?: boolean
  api_key_masked?: string
  api_key_has_value?: boolean
  secret_access_key_masked?: string
  secret_access_key_has_value?: boolean
}

export interface VoiceSettings {
  provider: string                          // 当前只可能是 'doubao'
  doubao: DoubaoVoiceConfig
  auto_reply_speed?: number                 // 自动回复语速 0.5~2.0，默认 1.0
  tts_max_chars?: number                    // 文本超过则跳过语音 20~300，默认 120
  compliance_agreed_at: number | null
  compliance_agreed_version: string | null
  compliance_current_version: string        // 后端当前协议版本
}

export interface VoiceHealthResult {
  success: boolean
  details?: {
    app_id?: boolean | string
    access_token?: string                   // 'untested' | 'valid' | 'invalid'
    api_key?: string                        // 'untested' | 'valid' | 'invalid'
    [k: string]: any
  }
  error?: string | null
}

export interface VoiceInfo {
  voice_id: string
  name: string
  source: 'preset' | 'cloned'
  language: string
  gender: string
}

export type VoiceLibStatus =
  | 'pending'
  | 'training'
  | 'active'
  | 'failed'
  | 'gone'

export interface VoiceLibRecord {
  voice_id: string
  name: string
  language: string
  sample_filename: string
  status: VoiceLibStatus
  created_at: number
  last_synced_at: number
  demo_audio_url: string | null
  message: string
}

export interface VoicePreviewResult {
  url: string                // 形如 /api/voice/preview/file/xxx.mp3
  duration_sec: number
  voice_id: string
  text_length: number
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
    credentials: 'include',
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export const voiceApi = {
  async getConfig() {
    return jsonRequest<{ success: boolean; data?: VoiceSettings; error?: string }>(
      `${API_BASE_URL}/api/voice/config`,
    )
  },

  async saveConfig(payload: Partial<VoiceSettings>) {
    return jsonRequest<{ success: boolean; data?: VoiceSettings; error?: string }>(
      `${API_BASE_URL}/api/voice/config`,
      { method: 'POST', body: JSON.stringify(payload) },
    )
  },

  async testConnection() {
    return jsonRequest<VoiceHealthResult>(`${API_BASE_URL}/api/voice/test`, {
      method: 'POST',
      body: '{}',
    })
  },

  async listVoices() {
    return jsonRequest<{ success: boolean; data?: VoiceInfo[]; error?: string }>(
      `${API_BASE_URL}/api/voice/voices`,
    )
  },

  async agreeCompliance() {
    return jsonRequest<{ success: boolean; error?: string }>(
      `${API_BASE_URL}/api/voice/compliance/agree`,
      { method: 'POST', body: '{}' },
    )
  },

  // ---------- 音色库（控制台复刻 + 本地账本） ----------

  async listLibrary() {
    return jsonRequest<{
      success: boolean
      data?: VoiceLibRecord[]
      error?: string
    }>(`${API_BASE_URL}/api/voice/library`)
  },

  async addVoice(args: { voice_id: string; name?: string; language?: string }) {
    return jsonRequest<{ success: boolean; data?: VoiceLibRecord; error?: string }>(
      `${API_BASE_URL}/api/voice/library/add`,
      {
        method: 'POST',
        body: JSON.stringify({
          voice_id: args.voice_id,
          name: args.name || '',
          language: args.language || 'zh',
        }),
      },
    )
  },

  /**
   * 校验本地账本里的音色是否还可用。
   * 不传 voice_ids 则校验全部；传则只校验指定的几个。
   */
  async validateVoices(voice_ids?: string[]) {
    return jsonRequest<{
      success: boolean
      data?: Array<{
        voice_id: string
        status: VoiceLibStatus
        error_code: string | null
        message: string
      }>
      error?: string
    }>(`${API_BASE_URL}/api/voice/library/validate`, {
      method: 'POST',
      body: JSON.stringify(voice_ids ? { voice_ids } : {}),
    })
  },

  async deleteVoice(voice_id: string) {
    return jsonRequest<{ success: boolean; error?: string }>(
      `${API_BASE_URL}/api/voice/library/${encodeURIComponent(voice_id)}`,
      { method: 'DELETE' },
    )
  },

  /** 音频环境探测：VB-Cable / ffmpeg 是否装、CABLE 设备是否找到、当前默认麦克风。 */
  async getAudioDevices() {
    return jsonRequest<{
      success: boolean
      data?: {
        ok: boolean
        vb_cable_installed: boolean
        ffmpeg: {
          installed: boolean
          version: string | null
          path: string | null
        }
        cable_output_endpoint_id: string | null
        cable_input_sd_index: number | null
        default_recording_id: string | null
        default_recording_name: string | null
        playback_endpoints: Array<{ id: string; name: string }>
        recording_endpoints: Array<{ id: string; name: string }>
        reason: string | null
      }
      error?: string
    }>(`${API_BASE_URL}/api/voice/audio_devices`)
  },

  async preview(text: string, voice_id: string, speed = 1.0) {
    return jsonRequest<{
      success: boolean
      data?: VoicePreviewResult
      error?: string
      error_code?: string
    }>(`${API_BASE_URL}/api/voice/preview`, {
      method: 'POST',
      body: JSON.stringify({ text, voice_id, speed }),
    })
  },

  /** 给定预览返回的相对 url，拼成绝对 URL（带后端 origin）。 */
  previewAbsoluteUrl(relUrl: string) {
    if (!relUrl) return ''
    if (relUrl.startsWith('http')) return relUrl
    return `${API_BASE_URL}${relUrl}`
  },

  // ---------- 话术组语音素材 ----------

  /** TTS 生成一条话术语音（用 voice_library 里的音色）。 */
  async greetingFromTts(args: {
    text: string
    voice_id: string
    speed?: number
    display_name?: string
  }) {
    return jsonRequest<{
      success: boolean
      data?: GreetingVoiceAsset
      error?: string
      error_code?: string
    }>(`${API_BASE_URL}/api/voice/greeting/from_tts`, {
      method: 'POST',
      body: JSON.stringify({
        text: args.text,
        voice_id: args.voice_id,
        speed: args.speed ?? 1.0,
        display_name: args.display_name ?? '',
      }),
    })
  },

  /** 用户上传现成的 mp3/wav/m4a。 */
  async greetingUpload(file: Blob, filename: string, display_name?: string) {
    const fd = new FormData()
    fd.append('audio', file, filename)
    fd.append('display_name', display_name || '')
    const { 'Content-Type': _ignore, ...restHeaders } = headers as any
    const res = await fetch(`${API_BASE_URL}/api/voice/greeting/upload`, {
      method: 'POST',
      headers: restHeaders,
      body: fd,
      credentials: 'include',
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`)
    }
    return res.json() as Promise<{ success: boolean; data?: GreetingVoiceAsset; error?: string }>
  },

  /** 浏览器 MediaRecorder 录制的 blob 提交（webm/ogg）。 */
  async greetingRecord(blob: Blob, display_name?: string) {
    const fd = new FormData()
    fd.append('audio', blob, `record-${Date.now()}.webm`)
    fd.append('display_name', display_name || '')
    const { 'Content-Type': _ignore, ...restHeaders } = headers as any
    const res = await fetch(`${API_BASE_URL}/api/voice/greeting/record`, {
      method: 'POST',
      headers: restHeaders,
      body: fd,
      credentials: 'include',
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`)
    }
    return res.json() as Promise<{ success: boolean; data?: GreetingVoiceAsset; error?: string }>
  },

  async greetingDelete(filename: string) {
    return jsonRequest<{ success: boolean; error?: string }>(
      `${API_BASE_URL}/api/voice/greeting/${encodeURIComponent(filename)}`,
      { method: 'DELETE' },
    )
  },

  /** 拼出话术语音文件的绝对 URL（用于 <audio> 试听）。 */
  greetingAbsoluteUrl(filename: string) {
    if (!filename) return ''
    return `${API_BASE_URL}/api/voice/greeting/file/${encodeURIComponent(filename)}`
  },
}

export interface GreetingVoiceAsset {
  filename: string
  audio_path: string
  duration_sec: number
  url: string
  source: 'tts' | 'upload' | 'record'
  display_name: string
  voice_id?: string
  original_text?: string
}
