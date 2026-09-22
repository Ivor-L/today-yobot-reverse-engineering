import { parseRuntimeCapabilitiesResponse } from './contract'
import { RuntimeCapabilitiesSnapshot } from './types'

export interface RuntimeCapabilityFetchResponse {
  ok: boolean
  status: number
  statusText: string
  json(): Promise<unknown>
}

export type RuntimeCapabilityFetcher = (
  url: string,
  init: RequestInit
) => Promise<RuntimeCapabilityFetchResponse>

export interface RuntimeCapabilitiesClient {
  getCapabilities(): Promise<RuntimeCapabilitiesSnapshot>
}

export interface RuntimeCapabilitiesClientOptions {
  baseUrl: string
  headers: Readonly<Record<string, string>>
  fetcher: RuntimeCapabilityFetcher
  requestTimeoutMs?: number
}

export class RuntimeCapabilityHttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'RuntimeCapabilityHttpError'
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
    return { code: 'RUNTIME_CAPABILITY_HTTP_ERROR', message: 'runtime capability request failed' }
  }
  const detail = (payload as Record<string, unknown>).detail
  if (typeof detail !== 'object' || detail === null || Array.isArray(detail)) {
    return { code: 'RUNTIME_CAPABILITY_HTTP_ERROR', message: 'runtime capability request failed' }
  }
  const record = detail as Record<string, unknown>
  return {
    code: typeof record.code === 'string' && record.code.trim()
      ? record.code
      : 'RUNTIME_CAPABILITY_HTTP_ERROR',
    message: typeof record.message === 'string' && record.message.trim()
      ? record.message
      : 'runtime capability request failed'
  }
}

export function createRuntimeCapabilitiesClient(
  options: RuntimeCapabilitiesClientOptions
): RuntimeCapabilitiesClient {
  const baseUrl = requiredText(options.baseUrl, 'baseUrl').replace(/\/$/, '')
  if (typeof options.fetcher !== 'function') {
    throw new TypeError('fetcher must be a function')
  }
  const requestHeaders = { ...options.headers }
  const requestTimeoutMs = options.requestTimeoutMs ?? 5000
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new TypeError('requestTimeoutMs must be a positive number')
  }

  return {
    async getCapabilities(): Promise<RuntimeCapabilitiesSnapshot> {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs)
      let response: RuntimeCapabilityFetchResponse
      try {
        response = await options.fetcher(
          `${baseUrl}/api/runtime/capabilities`,
          {
            method: 'GET',
            headers: requestHeaders,
            credentials: 'include',
            signal: controller.signal
          }
        )
      } catch (error) {
        if (controller.signal.aborted) {
          throw new RuntimeCapabilityHttpError(
            0,
            'RUNTIME_CAPABILITY_REQUEST_TIMEOUT',
            'runtime capability request timed out'
          )
        }
        throw new RuntimeCapabilityHttpError(
          0,
          'RUNTIME_CAPABILITY_NETWORK_ERROR',
          error instanceof Error ? error.message : 'runtime capability request failed'
        )
      } finally {
        clearTimeout(timeoutId)
      }
      let payload: unknown
      try {
        payload = await response.json()
      } catch (error) {
        throw new RuntimeCapabilityHttpError(
          response.status,
          'RUNTIME_CAPABILITY_INVALID_JSON',
          'runtime capability response is not valid JSON'
        )
      }
      if (!response.ok) {
        const detail = errorDetail(payload)
        throw new RuntimeCapabilityHttpError(response.status, detail.code, detail.message)
      }
      return parseRuntimeCapabilitiesResponse(payload)
    }
  }
}
