import { useState } from "react"
import { avatarFallback, initials } from "./logic/avatar"
import { AVATAR_RING, avatarSizeClass, type AvatarRing, type AvatarSize } from "./logic/variants"
import { PEBBLE_CLASS } from "./logic/pebble"
import { COPY } from "./copy"

export function Avatar({
    id,
    name,
    src,
    size,
    ring,
    decorative,
    struck,
}: {
    id: string
    name: string
    src?: string | null
    size: AvatarSize
    ring?: AvatarRing
    decorative?: boolean
    struck?: boolean
}) {
    const [failed, setFailed] = useState(false)
    const peb = PEBBLE_CLASS[avatarFallback(id)]
    const showImg = !!src && !failed
    const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": struck ? `${name} (${COPY.taken})` : name }
    return (
        <span
            {...a11y}
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ${avatarSizeClass(size)} ${showImg ? "bg-surface-2" : `${peb.bg} ${peb.text}`} ${ring ? AVATAR_RING[ring] : ""} ${struck ? "opacity-60" : ""}`}
        >
            {showImg ? <img src={src!} alt="" className="size-full object-cover" onError={() => setFailed(true)} /> : <span aria-hidden>{initials(name)}</span>}
            {struck && <span aria-hidden className="absolute inset-x-0 top-1/2 h-0.5 -rotate-45 bg-label" />}
        </span>
    )
}
