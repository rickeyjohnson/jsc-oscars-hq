export const HAPTIC = { release: 20, submit: 20, reveal: [15, 60, 15], saveFailed: 40 } as const

export function vibrate(kind: keyof typeof HAPTIC): void {
    try {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            navigator.vibrate(HAPTIC[kind] as number | number[])
        }
    } catch {
        // haptics are best-effort
    }
}
