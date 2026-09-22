import { defineStore } from 'pinia'
import {
  resolveRuntimeCapabilityMode,
  RuntimeCapabilitiesClient,
  RuntimeCapabilitiesSnapshot,
  RuntimeCapabilityContractError,
  RuntimeCapabilityHttpError,
  RuntimeCapabilityLoadState,
  RuntimeCapabilityMode
} from '../runtime/capabilities'

export interface RuntimeCapabilityStoreError {
  code: string
  message: string
  httpStatus: number | null
}

interface RuntimeCapabilityStoreState {
  mode: RuntimeCapabilityMode
  loadState: RuntimeCapabilityLoadState
  snapshot: RuntimeCapabilitiesSnapshot | null
  error: RuntimeCapabilityStoreError | null
  configurationWarning: string | null
  lastLoadedAt: number | null
  requestSerial: number
}

const pendingLoads = new WeakMap<object, Promise<RuntimeCapabilitiesSnapshot | null>>()

function normalizeError(error: unknown): RuntimeCapabilityStoreError {
  if (error instanceof RuntimeCapabilityHttpError) {
    return {
      code: error.code,
      message: error.message,
      httpStatus: error.status
    }
  }
  if (error instanceof RuntimeCapabilityContractError) {
    return {
      code: error.code,
      message: error.message,
      httpStatus: null
    }
  }
  return {
    code: 'RUNTIME_CAPABILITY_LOAD_FAILED',
    message: error instanceof Error ? error.message : 'runtime capability request failed',
    httpStatus: null
  }
}

export const useRuntimeCapabilityStore = defineStore('runtimeCapabilities', {
  state: (): RuntimeCapabilityStoreState => ({
    mode: 'legacy_passthrough',
    loadState: 'legacy_passthrough',
    snapshot: null,
    error: null,
    configurationWarning: null,
    lastLoadedAt: null,
    requestSerial: 0
  }),
  getters: {
    isRuntimeRequired: state => state.mode === 'runtime_required',
    capabilities: state => state.snapshot?.capabilities || null
  },
  actions: {
    configureMode(rawMode: unknown) {
      const resolution = resolveRuntimeCapabilityMode(rawMode)
      const modeChanged = this.mode !== resolution.mode
      const warningChanged = this.configurationWarning !== resolution.warningCode
      this.mode = resolution.mode
      this.configurationWarning = resolution.warningCode
      if (modeChanged || warningChanged) {
        pendingLoads.delete(this)
        this.requestSerial += 1
        this.snapshot = null
        this.error = null
        this.lastLoadedAt = null
        this.loadState = resolution.mode === 'legacy_passthrough'
          ? 'legacy_passthrough'
          : 'idle'
      }
    },

    async loadRuntimeCapabilities(
      force = false,
      client?: RuntimeCapabilitiesClient
    ): Promise<RuntimeCapabilitiesSnapshot | null> {
      if (this.mode === 'legacy_passthrough') {
        this.loadState = 'legacy_passthrough'
        this.snapshot = null
        this.error = null
        return null
      }
      if (!force && this.loadState === 'ready' && this.snapshot !== null) {
        return this.snapshot
      }
      const existingLoad = pendingLoads.get(this)
      if (!force && existingLoad !== undefined) {
        return existingLoad
      }

      const requestSerial = this.requestSerial + 1
      this.requestSerial = requestSerial
      this.loadState = 'loading'
      this.error = null

      const operation = (async (): Promise<RuntimeCapabilitiesSnapshot | null> => {
        try {
          const selectedClient = client || (
            await import('../api/runtimeCapabilities')
          ).runtimeCapabilitiesApi
          const snapshot = await selectedClient.getCapabilities()
          if (this.requestSerial !== requestSerial || this.mode !== 'runtime_required') {
            return null
          }
          this.snapshot = snapshot
          this.loadState = 'ready'
          this.lastLoadedAt = Date.now()
          return snapshot
        } catch (error) {
          if (this.requestSerial === requestSerial && this.mode === 'runtime_required') {
            this.snapshot = null
            this.loadState = 'contract_error'
            this.error = normalizeError(error)
          }
          return null
        }
      })()

      pendingLoads.set(this, operation)
      try {
        return await operation
      } finally {
        if (pendingLoads.get(this) === operation) {
          pendingLoads.delete(this)
        }
      }
    },

    resetRuntimeCapabilities() {
      pendingLoads.delete(this)
      this.requestSerial += 1
      this.snapshot = null
      this.error = null
      this.lastLoadedAt = null
      this.loadState = this.mode === 'legacy_passthrough'
        ? 'legacy_passthrough'
        : 'idle'
    }
  }
})
