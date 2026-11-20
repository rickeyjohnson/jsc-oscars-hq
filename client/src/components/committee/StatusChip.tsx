import { CircleDot, Clock, Lock, Pencil, Trophy } from "lucide-react"
import type { ReactNode } from "react"
import { Chip } from "../../ui/Chip"
import type { ChipTone } from "../../ui/logic/variants"
import { statusPebble } from "./statusPebble"
import type { ChipStatus } from "../../lib/voting"

const ICON: Record<ChipStatus, ReactNode> = {
    open: <CircleDot aria-hidden className="size-3.5" />,
    draft: <Pencil aria-hidden className="size-3.5" />,
    closed: <Lock aria-hidden className="size-3.5" />,
    ended: <Clock aria-hidden className="size-3.5" />,
    released: <Trophy aria-hidden className="size-3.5" />,
}

// onColor: a dark pill for sitting on a block painted in the same status pebble.
const StatusChip = ({ status, label, onColor }: { status: ChipStatus; label?: string; onColor?: boolean }) => {
    if (onColor)
        return (
            <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full bg-bg px-2.5 text-caption-1 font-bold text-label">
                {ICON[status]}
                <span className="capitalize">{label ?? status}</span>
            </span>
        )
    const pebble = statusPebble(status)
    const tone: ChipTone = pebble && pebble !== "grape" ? pebble : status === "ended" ? "warn" : "neutral"
    return (
        <Chip tone={tone} icon={ICON[status]}>
            <span className="capitalize">{label ?? status}</span>
        </Chip>
    )
}

export default StatusChip
