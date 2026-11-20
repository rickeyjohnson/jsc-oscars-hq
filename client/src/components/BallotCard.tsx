import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { ballotCardStatus, type BallotCardStatus, type BallotSummary } from "../lib/voting"
import { closesInLabel } from "../lib/time"

const STATUS_CONFIG: Record<BallotCardStatus, { label: string; badge: string; icon: typeof Calendar; actionText: string; actionStyle: string; dimmed: boolean }> = {
    upcoming: {
        label: "UPCOMING",
        badge: "bg-amber-100/10 text-amber-100/70",
        icon: Clock,
        actionText: "View",
        actionStyle: "bg-amber-100/10 text-amber-100 border border-amber-100/20",
        dimmed: false,
    },
    open: {
        label: "OPEN",
        badge: "bg-green-500/20 text-green-400",
        icon: Calendar,
        actionText: "Vote Now",
        actionStyle: "bg-amber-100 text-zinc-900 font-bold hover:bg-amber-200",
        dimmed: false,
    },
    voted: {
        label: "VOTED",
        badge: "bg-blue-500/20 text-blue-400",
        icon: CheckCircle,
        actionText: "Review Votes",
        actionStyle: "bg-amber-100/10 text-amber-100 border border-amber-100/20",
        dimmed: false,
    },
    closed: {
        label: "CLOSED",
        badge: "bg-red-500/20 text-red-400",
        icon: XCircle,
        actionText: "View",
        actionStyle: "bg-amber-100/10 text-amber-100 border border-amber-100/20",
        dimmed: true,
    },
}

const BallotCard = ({ ballot, now }: { ballot: BallotSummary; now: Date }) => {
    const status = ballotCardStatus(ballot, ballot.category_count, ballot.my_vote_count, now)
    const config = STATUS_CONFIG[status]
    const Icon = config.icon

    return (
        <div className={`bg-amber-100/5 border border-amber-100/10 rounded-2xl p-5 transition hover:border-amber-100/30 ${config.dimmed ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${config.badge}`}>{config.label}</span>
                        {ballot.round === "tiebreak" && <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300">TIEBREAK</span>}
                        {status === "open" && <span className="text-xs text-amber-100/40">{closesInLabel(new Date(ballot.closes_at), now)}</span>}
                    </div>
                    <h3 className="text-xl font-bold text-amber-100">{ballot.name}</h3>
                    <p className="text-sm text-amber-100/60 mt-1">
                        {ballot.my_vote_count} of {ballot.category_count} voted
                    </p>
                </div>
                <Icon className="w-5 h-5 text-amber-100/40" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-amber-100/10">
                <div className="text-sm text-amber-100/60">{ballot.category_count} categorie(s)</div>
                <Link to={ballot.status === "released" ? "/app/results" : `/app/ballots/${ballot.id}`} className={`px-4 py-2 rounded-full text-sm transition ${config.actionStyle}`}>
                    {ballot.status === "released" ? "View Results" : config.actionText}
                </Link>
            </div>
        </div>
    )
}

export default BallotCard
