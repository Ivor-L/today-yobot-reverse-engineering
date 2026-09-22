/**
 * Select one already-initialized macOS instance for Legacy UI resume.
 *
 * The backend remains authoritative: this helper never infers readiness from
 * localStorage or from process presence alone.  Windows always returns null so
 * its frozen startup flow is unaffected.
 */

export interface LegacyResumeInstance {
  instance_id?: unknown
  initialized?: unknown
  nickname?: unknown
  account_id?: unknown
  account_info?: {
    nickname?: unknown
    account_id?: unknown
  } | null
  is_connected?: unknown
  manually_exited?: unknown
}

export interface LegacyResumeCandidate {
  instanceId: string
  accountId: string
  nickname: string
}

function normalizedText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function selectMacOSLegacyResumeCandidate(
  targetPlatform: unknown,
  instances: readonly LegacyResumeInstance[] | null | undefined
): LegacyResumeCandidate | null {
  if (targetPlatform !== 'macos' || !Array.isArray(instances) || instances.length !== 1) {
    return null
  }

  const instance = instances[0]
  if (
    instance.initialized !== true
    || instance.is_connected === false
    || instance.manually_exited === true
  ) {
    return null
  }

  const instanceId = normalizedText(instance.instance_id)
  const accountId = normalizedText(
    instance.account_info?.account_id ?? instance.account_id
  )
  const nickname = normalizedText(
    instance.account_info?.nickname ?? instance.nickname
  )
  if (!instanceId || !accountId || !nickname) {
    return null
  }

  return { instanceId, accountId, nickname }
}
