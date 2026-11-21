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

export const opensAtLabel = (opensAt: Date): string =>
    `Voting opens ${opensAt.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`

export const closedAtLabel = (closesAt: Date): string =>
    `Voting closed at ${closesAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`

// ISO instant -> datetime-local value ("2026-11-25T18:00") in the viewer's local time.
export const toLocalInput = (iso: string): string => {
    const d = new Date(iso)
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// Short "when does it close" for list rows: "Closes in 2d 4h", "Closes in 5h", "Closes in 20m", or the date past a week.
export const closesShort = (closesAt: Date, now: Date): string => {
    const ms = closesAt.getTime() - now.getTime()
    if (ms <= 0) return "Closed"
    const d = Math.floor(ms / 86_400_000)
    const h = Math.floor(ms / 3_600_000) % 24
    if (d >= 7) {
        const day = closesAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        const time = closesAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        return `Closes ${day} ${time}`
    }
    if (d >= 1) return `Closes in ${d}d ${h}h`
    if (h >= 1) return `Closes in ${h}h`
    return `Closes in ${Math.max(1, Math.floor(ms / 60_000))}m`
}
