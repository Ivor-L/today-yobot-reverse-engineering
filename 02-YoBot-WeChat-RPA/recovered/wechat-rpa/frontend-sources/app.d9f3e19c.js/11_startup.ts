import { defineStore } from 'pinia'
import {
  resolveRuntimeCapabilityMode,
  RuntimeCapabilityMode
} from '../runtime/capabilities/types'
import {
  StartupActionState,
  StartupCommand,
  StartupContractError,
  StartupExecutionResult,
  StartupLoadState,
  StartupWorkflowClient,
  StartupWorkflowHttpError,
  StartupWorkflowSnapshot
} from '../runtime/startup'

export interface StartupStoreError {
  code: string
  message: string
  httpStatus: number | null
}

interface StartupStoreState {
  mode: RuntimeCapabilityMode
  loadState: StartupLoadState
  actionState: StartupActionState
  snapshot: StartupWorkflowSnapshot | null
  lastResult: StartupExecutionResult | null
  error: StartupStoreError | null
  actionError: StartupStoreError | null
  configurationWarning: string | null
  lastLoadedAt: number | null
  requestSerial: number
}

const pendingInspections = new WeakMap<object, Promise<StartupWorkflowSnapshot | null>>()
const pendingActions = new WeakMap<object, Promise<StartupExecutionResult | null>>()

function normalizeError(error: unknown): StartupStoreError {
  if (error instanceof StartupWorkflowHttpError) {
    return {
      code: error.code,
      message: error.message,
      httpStatus: error.status
    }
  }
  if (error instanceof StartupContractError) {
    return {
      code: error.code,
      message: error.message,
      httpStatus: null
    }
  }
  return {
    code: 'STARTUP_REQUEST_FAILED',
    message: error instanceof Error ? error.message : 'startup workflow request failed',
    httpStatus: null
  }
}

function localError(code: string, message: string): StartupStoreError {
  return { code, message, httpStatus: null }
}

export const useStartupStore = defineStore('startup', {
  state: (): StartupStoreState => ({
    mode: 'legacy_passthrough',
    loadState: 'legacy_passthrough',
    actionState: 'idle',
    snapshot: null,
    lastResult: null,
    error: null,
    actionError: null,
    configurationWarning: null,
    lastLoadedAt: null,
    requestSerial: 0
  }),
  getters: {
    isRuntimeRequired: state => state.mode === 'runtime_required',
    isReady: state => state.snapshot?.phase === 'ready',
    nextAction: state => state.snapshot?.nextAction || null
  },
  actions: {
    configureMode(rawMode: unknown) {
      const resolution = resolveRuntimeCapabilityMode(rawMode)
      const changed = (
        this.mode !== resolution.mode ||
        this.configurationWarning !== resolution.warningCode
      )
      this.mode = resolution.mode
      this.configurationWarning = resolution.warningCode
      if (changed) {
        pendingInspections.delete(this)
        pendingActions.delete(this)
        this.requestSerial += 1
        this.snapshot = null
        this.lastResult = null
        this.error = null
        this.actionError = null
        this.lastLoadedAt = null
        this.actionState = 'idle'
        this.loadState = resolution.mode === 'legacy_passthrough'
          ? 'legacy_passthrough'
          : 'idle'
      }
    },

    async inspect(
      force = false,
      client?: StartupWorkflowClient
    ): Promise<StartupWorkflowSnapshot | null> {
      if (this.mode === 'legacy_passthrough') {
        this.loadState = 'legacy_passthrough'
        this.snapshot = null
        this.error = null
        return null
      }
      if (!force && this.loadState === 'ready' && this.snapshot !== null) {
        return this.snapshot
      }
      const activeAction = pendingActions.get(this)
      if (activeAction !== undefined) {
        return this.snapshot
      }
      const existing = pendingInspections.get(this)
      if (!force && existing !== undefined) {
        return existing
      }

      const requestSerial = this.requestSerial + 1
      this.requestSerial = requestSerial
      this.loadState = 'loading'
      this.error = null

      const operation = (async (): Promise<StartupWorkflowSnapshot | null> => {
        try {
          const selectedClient = client || (await import('../api/startup')).startupWorkflowApi
          const snapshot = await selectedClient.inspect()
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

      pendingInspections.set(this, operation)
      try {
        return await operation
      } finally {
        if (pendingInspections.get(this) === operation) {
          pendingInspections.delete(this)
        }
      }
    },

    async execute(
      command: StartupCommand,
      client?: StartupWorkflowClient
    ): Promise<StartupExecutionResult | null> {
      if (this.mode === 'legacy_passthrough') {
        this.actionState = 'idle'
        this.actionError = null
        return null
      }
      const existing = pendingActions.get(this)
      if (existing !== undefined) {
        return existing
      }
      if (this.loadState !== 'ready' || this.snapshot === null) {
        this.actionState = 'failed'
        this.actionError = localError(
          'STARTUP_SNAPSHOT_REQUIRED',
          'startup state must be loaded before executing an action'
        )
        return null
      }
      const availability = this.snapshot.actions.find(item => item.action === command.action)
      if (!availability?.available) {
        this.actionState = 'failed'
        this.actionError = localError(
          availability?.reasonCode || 'STARTUP_ACTION_UNAVAILABLE',
          availability?.hint || 'startup action is unavailable'
        )
        return null
      }
      if (availability.confirmationRequired && command.confirmed !== true) {
        this.actionState = 'failed'
        this.actionError = localError(
          'CONFIRMATION_REQUIRED',
          'startup action requires explicit user confirmation'
        )
        return null
      }

      pendingInspections.delete(this)
      const requestSerial = this.requestSerial + 1
      this.requestSerial = requestSerial
      this.actionState = 'executing'
      this.actionError = null
      this.lastResult = null

      const operation = (async (): Promise<StartupExecutionResult | null> => {
        try {
          const selectedClient = client || (await import('../api/startup')).startupWorkflowApi
          const result = await selectedClient.execute(command)
          if (this.requestSerial !== requestSerial || this.mode !== 'runtime_required') {
            return null
          }
          this.lastResult = result
          if (result.snapshot !== null) {
            this.snapshot = result.snapshot
            this.loadState = 'ready'
            this.lastLoadedAt = Date.now()
          }
          if (result.success) {
            this.actionState = 'succeeded'
            this.actionError = null
          } else {
            this.actionState = 'failed'
            this.actionError = localError(
              result.reasonCode || result.code,
              result.message || 'startup action failed'
            )
          }
          return result
        } catch (error) {
          if (this.requestSerial === requestSerial && this.mode === 'runtime_required') {
            this.actionState = 'failed'
            this.actionError = normalizeError(error)
          }
          return null
        }
      })()

      pendingActions.set(this, operation)
      try {
        return await operation
      } finally {
        if (pendingActions.get(this) === operation) {
          pendingActions.delete(this)
        }
      }
    },

    reset() {
      pendingInspections.delete(this)
      pendingActions.delete(this)
      this.requestSerial += 1
      this.snapshot = null
      this.lastResult = null
      this.error = null
      this.actionError = null
      this.lastLoadedAt = null
      this.actionState = 'idle'
      this.loadState = this.mode === 'legacy_passthrough'
        ? 'legacy_passthrough'
        : 'idle'
    }
  }
})
