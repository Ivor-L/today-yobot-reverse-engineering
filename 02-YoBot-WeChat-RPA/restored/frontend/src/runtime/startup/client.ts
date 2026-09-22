import {
  normalizeStartupCommand,
  parseStartupExecutionResponse,
  parseStartupSnapshotResponse
} from './contract'
import {
  StartupCommand,
  StartupExecutionResult,
  StartupWorkflowSnapshot
} from './types'

export interface StartupFetchResponse {
  ok: boolean
  status: number
  statusText: string
  json(): Promise<unknown>
}

export type StartupFetcher = (
  url: string,
  init: RequestInit
) => Promise<StartupFetchResponse>

export interface StartupWorkflowClient {
  inspect(): Promise<StartupWorkflowSnapshot>
  execute(command: StartupCommand): Promise<StartupExecutionResult>
}

export interface StartupWorkflowClientOptions {
  baseUrl: string
  headers: Readonly<Record<string, string>>
  fetcher: StartupFetcher
  requestTimeoutMs?: number
}

export class StartupWorkflowHttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'StartupWorkflowHttpError'
    this.status = status
    this.code = code
  }
}

function requiredText(value: string, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`)
  }
  return value
}

function errorDetail(payload: unknown): { code: string; message: string } {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { code: 'STARTUP_HTTP_ERROR', message: 'startup workflow request failed' }
  }
  const detail = (payload as Record<string, unknown>).detail
  if (typeof detail !== 'object' || detail === null || Array.isArray(detail)) {
    return { code: 'STARTUP_HTTP_ERROR', message: 'startup workflow request failed' }
  }
  const record = detail as Record<string, unknown>
  return {
    code: typeof record.code === 'string' && record.code.trim()
      ? record.code
      : 'STARTUP_HTTP_ERROR',
    message: typeof record.message === 'string' && record.message.trim()
      ? record.message
      : 'startup workflow request failed'
  }
}

export function createStartupWorkflowClient(
  options: StartupWorkflowClientOptions
): StartupWorkflowClient {
  const baseUrl = requiredText(options.baseUrl, 'baseUrl').replace(/\/$/, '')
  if (typeof options.fetcher !== 'function') {
    throw new TypeError('fetcher must be a function')
  }
  const requestHeaders = { ...options.headers }
  const requestTimeoutMs = options.requestTimeoutMs ?? 5000
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new TypeError('requestTimeoutMs must be a positive number')
  }

  async function request(path: string, init: RequestInit): Promise<unknown> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs)
    let response: StartupFetchResponse
    try {
      response = await options.fetcher(`${baseUrl}${path}`, {
        ...init,
        headers: requestHeaders,
        credentials: 'include',
        signal: controller.signal
      })
    } catch (error) {
      if (controller.signal.aborted) {
        throw new StartupWorkflowHttpError(
          0,
          'STARTUP_REQUEST_TIMEOUT',
          'startup workflow request timed out'
        )
      }
      throw new StartupWorkflowHttpError(
        0,
        'STARTUP_NETWORK_ERROR',
        error instanceof Error ? error.message : 'startup workflow request failed'
      )
    } finally {
      clearTimeout(timeoutId)
    }
    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      throw new StartupWorkflowHttpError(
        response.status,
        'STARTUP_INVALID_JSON',
        'startup workflow response is not valid JSON'
      )
    }
    if (!response.ok) {
      const detail = errorDetail(payload)
      throw new StartupWorkflowHttpError(response.status, detail.code, detail.message)
    }
    return payload
  }

  return {
    async inspect(): Promise<StartupWorkflowSnapshot> {
      const payload = await request('/api/runtime/startup', { method: 'GET' })
      return parseStartupSnapshotResponse(payload)
    },

    async execute(command: StartupCommand): Promise<StartupExecutionResult> {
      const normalized = normalizeStartupCommand(command)
      const payload = await request('/api/runtime/startup/actions', {
        method: 'POST',
        body: JSON.stringify(normalized)
      })
      return parseStartupExecutionResponse(payload)
    }
  }
}
