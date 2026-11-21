import { chipClasses, type ChipTone } from "../ui/logic/variants"

export interface StatusBadgeProps {
    status: "open" | "voted" | "closed" | "ended" | "upcoming" | "unknown"
    className?: string
}

const TONE: Record<Exclude<StatusBadgeProps["status"], "unknown">, ChipTone> = {
    open: "lime",
    voted: "strawberry",
    closed: "neutral",
    upcoming: "sky",
    ended: "neutral",
}

const StatusBadge = ({ status, className = "" }: StatusBadgeProps) =>
    status === "unknown" ? null : <span className={`${chipClasses(TONE[status])} uppercase ${className}`}>{status}</span>

export default StatusBadge
