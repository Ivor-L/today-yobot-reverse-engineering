import { API_BASE_URL, headers } from './config'
import { createRuntimeCapabilitiesClient } from '../runtime/capabilities'

/** Browser wiring only. Construction performs no request. */
export const runtimeCapabilitiesApi = createRuntimeCapabilitiesClient({
  baseUrl: API_BASE_URL,
  headers,
  fetcher: window.fetch.bind(window)
})
