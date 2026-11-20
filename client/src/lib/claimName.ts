export const PENDING_NAME_KEY = "jsc.pendingName"
export const TEST_EMAIL_SUFFIX = "@jsc-test.local"

export const getPendingName = (): string | null => {
    try {
        return sessionStorage.getItem(PENDING_NAME_KEY)
    } catch {
        return null
    }
}
export const setPendingName = (name: string): void => {
    try {
        sessionStorage.setItem(PENDING_NAME_KEY, name)
    } catch {
        /* storage unavailable: the user just picks again on /claim */
    }
}
export const clearPendingName = (): void => {
    try {
        sessionStorage.removeItem(PENDING_NAME_KEY)
    } catch {
        /* ignore */
    }
}

/** A signed-in user with no linked member (e.g. after Google) is sent to /claim. Never while loading; committee/test accounts are exempt. */
export function shouldClaimName(a: {
    user: { id: string; email?: string | null } | null
    member: { id: string } | null
    loading: boolean
    path: string
    isCommittee?: boolean
    memberFailed?: boolean
}): boolean {
    if (a.loading || !a.user || a.member || a.memberFailed || a.isCommittee) return false
    if ((a.user.email ?? "").toLowerCase().endsWith(TEST_EMAIL_SUFFIX)) return false
    return a.path === "/app" || a.path.startsWith("/app/")
}
