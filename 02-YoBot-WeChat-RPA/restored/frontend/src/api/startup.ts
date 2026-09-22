import { API_BASE_URL, headers } from './config'
import { createStartupWorkflowClient } from '../runtime/startup'

/** Browser wiring only. Construction performs no request. */
export const startupWorkflowApi = createStartupWorkflowClient({
  baseUrl: API_BASE_URL,
  headers,
  fetcher: window.fetch.bind(window)
})
