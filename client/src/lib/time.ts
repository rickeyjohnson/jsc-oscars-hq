// Convert a datetime-local value ("2026-11-25T18:00") to a UTC ISO string.
export const toUtcIso = (local: string): string => new Date(local).toISOString()

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number }

export const countdownParts = (target: Date, now: Date): CountdownParts | null => {
    const ms = target.getTime() - now.getTime()
    if (ms <= 0) return null
    return {
        days: Math.floor(ms / 86_400_000),
        hours: Math.floor(ms / 3_600_000) % 24,
        minutes: Math.floor(ms / 60_000) % 60,
        seconds: Math.floor(ms / 1000) % 60,
    }
}

export const closesInLabel = (closesAt: Date, now: Date): string => {
    const ms = closesAt.getTime() - now.getTime()
    if (ms <= 0) return "Closed"
    const plural = (n: number, u: string) => `${n} ${u}${n === 1 ? "" : "s"}`
    const days = Math.floor(ms / 86_400_000)
    if (days >= 1) return `Closes in ${plural(days, "day")}`
    const hours = Math.floor(ms / 3_600_000)
    if (hours >= 1) return `Closes in ${plural(hours, "hour")}`
    return `Closes in ${plural(Math.max(1, Math.floor(ms / 60_000)), "minute")}`
}

export const urgency = (closesAt: Date, now: Date): "urgent" | "soon" | "normal" => {
    const ms = closesAt.getTime() - now.getTime()
    if (ms < 86_400_000) return "urgent"
    if (ms < 3 * 86_400_000) return "soon"
    return "normal"
}
