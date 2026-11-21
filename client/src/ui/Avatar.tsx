import { useState } from "react"
import { avatarFallback, initials } from "./logic/avatar"
import { AVATAR_RING, PEBBLE_RING, avatarSizeClass, type AvatarRing, type AvatarSize } from "./logic/variants"
import { PEBBLE_CLASS, PEBBLE_INK_FACE } from "./logic/pebble"
import { COPY } from "./copy"
import type { PebbleName } from "./tokens"

export function Avatar({
    id,
    name,
    src,
    size,
    ring,
    decorative,
    struck,
    pebble,
    onPebble,
}: {
    id: string
    name: string
    src?: string | null
    size: AvatarSize
    ring?: AvatarRing
    decorative?: boolean
    struck?: boolean
    /** Use this pebble instead of the one derived from `id` (non-member options colored by list order). */
    pebble?: PebbleName
    /** Sitting on a card filled with this pebble: ink face, no ring. */
    onPebble?: boolean
}) {
    const [failed, setFailed] = useState(false)
    const pebbleName = pebble ?? avatarFallback(id)
    const peb = PEBBLE_CLASS[pebbleName]
    const showImg = !!src && !failed
    const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": struck ? `${name} (${COPY.taken})` : name }
    return (
        <span
            {...a11y}
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ${avatarSizeClass(size)} ${showImg ? "bg-surface-2" : onPebble ? PEBBLE_INK_FACE[pebbleName] : `${peb.bg} ${peb.text}`} ${ring && !onPebble ? AVATAR_RING[ring] : ""} ${ring === "pebble" && !onPebble ? PEBBLE_RING[pebbleName] : ""} ${struck ? "opacity-60" : ""}`}
        >
            {showImg ? <img src={src!} alt="" className="size-full object-cover" onError={() => setFailed(true)} /> : <span aria-hidden>{initials(name)}</span>}
            {struck && <span aria-hidden className="absolute inset-x-0 top-1/2 h-0.5 -rotate-45 bg-label" />}
        </span>
    )
}
