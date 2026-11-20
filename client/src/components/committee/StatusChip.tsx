import type { BallotStatus } from "../../types"

const STYLES: Record<BallotStatus, string> = {
    open: "bg-[#14532d] text-[#bbf7d0]",
    draft: "bg-zinc-700 text-zinc-200",
    closed: "bg-[#7f1d1d] text-[#fecaca]",
    released: "bg-amber-100/20 text-amber-100",
}

const StatusChip = ({ status, label }: { status: BallotStatus; label?: string }) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${STYLES[status]}`}>{label ?? status}</span>
)

export default StatusChip
