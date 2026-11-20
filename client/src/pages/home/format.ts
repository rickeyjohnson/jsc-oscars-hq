// Pure helpers for the Home widgets.
export const mapsUrl = (location: string): string => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`

export const ceremonyDate = (d: Date): string => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
export const ceremonyTime = (d: Date): string => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })

export const firstName = (name: string | null | undefined): string => (name ?? "").trim().split(/\s+/)[0] ?? ""
