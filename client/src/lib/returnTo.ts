// Where to send someone after they log in again: only in-app paths, never an outside URL.
export const safeReturnPath = (state: unknown): string => {
    const from = (state as { from?: unknown } | null)?.from
    return typeof from === "string" && /^\/app(\/|\?|$)/.test(from) ? from : "/app"
}

export const loginNotice = (state: unknown): string | null => {
    const n = (state as { notice?: unknown } | null)?.notice
    return typeof n === "string" ? n : null
}
