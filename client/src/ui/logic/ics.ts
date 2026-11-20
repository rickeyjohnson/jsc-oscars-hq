// uid must be domain-qualified and stable per event, e.g. `${season.id}@jsc-oscars` (RFC 5545 recommends this).
export type IcsEvent = { uid: string; title: string; start: Date; durationMinutes: number; location?: string | null; description?: string; now: Date }

// Default ceremony length (matches the EditOscarEvent default).
export const DEFAULT_CEREMONY_MINUTES = 180

const pad = (n: number) => String(n).padStart(2, "0")
const utc = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`

// RFC 5545 TEXT escaping.
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n")

// Fold to at most 75 octets per line (continuations start with a space and count it), never splitting a character.
function fold(line: string): string {
    const enc = new TextEncoder()
    const out: string[] = []
    let cur = ""
    let bytes = 0
    for (const ch of line) {
        const n = enc.encode(ch).length
        if (bytes + n > 75) {
            out.push(cur)
            cur = " "
            bytes = 1
        }
        cur += ch
        bytes += n
    }
    out.push(cur)
    return out.join("\r\n")
}

export function buildIcs(e: IcsEvent): string {
    const end = new Date(e.start.getTime() + e.durationMinutes * 60_000)
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//JSC Oscars//Home//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${e.uid}`,
        `DTSTAMP:${utc(e.now)}`,
        `DTSTART:${utc(e.start)}`,
        `DTEND:${utc(end)}`,
        `SUMMARY:${esc(e.title)}`,
        ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
        ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return lines.map(fold).join("\r\n") + "\r\n"
}

export function icsFileName(title: string): string {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    return `${slug || "event"}.ics`
}

// Browser download: Blob + temporary anchor; the object URL is revoked after a short delay (as the CSV export does).
export function downloadIcs(filename: string, text: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
