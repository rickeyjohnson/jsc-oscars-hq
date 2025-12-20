export interface StatusBadgeProps {
    status: "open" | "voted" | "closed" | "ended" | "upcoming" | "unknown"
    className?: string
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
    const styles = {
        open: "bg-green-500/20 text-green-400",
        voted: "bg-blue-500/20 text-blue-400",
        closed: "bg-red-500/20 text-red-400",
        upcoming: "bg-yellow-500/20 text-yellow-400",
        ended: "bg-zinc-500/20 text-zinc-400",
        unknown: "hidden"
    }

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status]} ${className}`}
        >
            {status}
        </span>
    )
}

export default StatusBadge
