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

/** Fit (w, h) inside a max x max box without upscaling. */
export function resizeDimensions(w: number, h: number, max: number): { width: number; height: number } {
    if (w <= 0 || h <= 0) return { width: 0, height: 0 }
    const k = Math.min(1, max / Math.max(w, h))
    return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

/** Storage-safe base name: ascii letters, digits, dashes only. */
export function safeUploadName(fileName: string): string {
    const base = fileName.split(".")[0].normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    return base || "photo"
}

const OBJECT_PATH = "/storage/v1/object/public/"
/** Supabase image transforms (paid plans only): on when VITE_SUPABASE_TRANSFORMS=true, requests 2x the CSS size. */
export function avatarSrc(url: string, cssPx: number, transforms = import.meta.env.VITE_SUPABASE_TRANSFORMS === "true"): string {
    if (!transforms || !url.includes(OBJECT_PATH)) return url
    const px = Math.round(cssPx * 2)
    return `${url.replace(OBJECT_PATH, "/storage/v1/render/image/public/")}?width=${px}&height=${px}&resize=cover&quality=70`
}
