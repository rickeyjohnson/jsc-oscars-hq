// Ceremony date helpers. The season has no timezone column, so the committee edits the date in this zone.
export const SEASON_TZ = "America/New_York"

const parts = (d: Date, tz: string) => {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    const o: Record<string, number> = {}
    for (const p of f.formatToParts(d)) if (p.type !== "literal") o[p.type] = Number(p.value)
    return o
}

// "2026-12-04T15:00" read as wall-clock time in `tz` -> the UTC instant (ISO).
export function zonedToUtcIso(local: string, tz: string = SEASON_TZ): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
    if (!m) return null
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
    let guess = wall
    for (let i = 0; i < 3; i++) {
        const p = parts(new Date(guess), tz)
        const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
        guess += wall - seen
    }
    return new Date(guess).toISOString()
}

// UTC instant -> "YYYY-MM-DDTHH:mm" wall-clock time in `tz` (for a datetime-local input).
export function utcToZonedInput(iso: string, tz: string = SEASON_TZ): string {
    const p = parts(new Date(iso), tz)
    const z = (n: number) => String(n).padStart(2, "0")
    return `${p.year}-${z(p.month)}-${z(p.day)}T${z(p.hour)}:${z(p.minute)}`
}

// "Fri, Dec 4, 2026, 3:00 PM EST"
export const formatCeremony = (iso: string, tz: string = SEASON_TZ): string =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso))
