import type { PebbleName } from "../tokens"
import { pebbleFor } from "./pebble"

export function initials(name: string): string {
    const parts = name
        .split(/[\s,]+/)
        .map((p) => p.trim())
        .filter(Boolean)
    if (parts.length === 0) return "?"
    const first = parts[0][0]
    const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
    return (first + last).toUpperCase()
}

export function avatarFallback(id: string): PebbleName {
    return pebbleFor(id, { smallText: true })
}
