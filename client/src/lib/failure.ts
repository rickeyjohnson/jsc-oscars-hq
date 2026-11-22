// One plain sentence for a failed save: what failed and what to do. `action` completes "Couldn't ...", e.g. "save your vote".
export const isNetworkFailure = (e: unknown): boolean => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true
    const msg = String((e as { message?: unknown } | null)?.message ?? "")
    return e instanceof TypeError || /failed to fetch|network|load failed|timed out|timeout/i.test(msg)
}

export const failureMessage = (action: string, e: unknown): string =>
    isNetworkFailure(e)
        ? `Couldn't ${action}. Check your connection and try again.`
        : `Couldn't ${action}. Try again, and reload the page if it keeps happening.`
