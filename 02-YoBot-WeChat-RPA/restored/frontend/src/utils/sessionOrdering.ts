export interface AccountScopedSession {
  account_id?: string
}

function accountScope(session: AccountScopedSession): string {
  return typeof session.account_id === 'string' ? session.account_id : ''
}

/**
 * Replace every updated account slice with the complete native-order batch.
 *
 * WeChat display times such as `21:50`, `昨天 15:00` and `星期二` are not
 * JavaScript date strings. Treating them as `new Date(...)` returns NaN and
 * leaves existing rows in their stale positions. The backend already emits a
 * complete, newest-first account snapshot, so its ordering is authoritative.
 */
export function mergeSessionsInNativeOrder<T extends AccountScopedSession>(
  existing: readonly T[],
  incoming: readonly T[]
): T[] {
  if (incoming.length === 0) return [...existing]

  const incomingByAccount = new Map<string, T[]>()
  for (const session of incoming) {
    const account = accountScope(session)
    const sessions = incomingByAccount.get(account)
    if (sessions) {
      sessions.push(session)
    } else {
      incomingByAccount.set(account, [session])
    }
  }

  const emittedAccounts = new Set<string>()
  const merged: T[] = []
  for (const session of existing) {
    const account = accountScope(session)
    const replacement = incomingByAccount.get(account)
    if (!replacement) {
      merged.push(session)
      continue
    }
    if (!emittedAccounts.has(account)) {
      merged.push(...replacement)
      emittedAccounts.add(account)
    }
  }
  for (const [account, sessions] of incomingByAccount) {
    if (!emittedAccounts.has(account)) merged.push(...sessions)
  }
  return merged
}
