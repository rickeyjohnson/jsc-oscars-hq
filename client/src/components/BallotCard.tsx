import { Calendar, CheckCircle, XCircle } from "lucide-react"

export type BallotStatus = "open" | "voted" | "closed"

export interface Ballot {
    id: string
    title: string
    description?: string
    status: BallotStatus
    nomineesCount: number
    endsAt?: string
    votedFor?: string
}

const STATUS_CONFIG = {
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
        actionText: "View Results",
        actionStyle:
            "bg-amber-100/10 text-amber-100 border border-amber-100/20",
        dimmed: false,
    },
    closed: {
        label: "CLOSED",
        badge: "bg-red-500/20 text-red-400",
        icon: XCircle,
        actionText: "View Results",
        actionStyle:
            "bg-amber-100/10 text-amber-100 border border-amber-100/20",
        dimmed: true,
    },
}

const BallotCard = ({ ballot }: { ballot: Ballot }) => {
    const config = STATUS_CONFIG[ballot.status]
    const Icon = config.icon

    return (
        <div
            className={`bg-amber-100/5 border border-amber-100/10 rounded-2xl p-5 transition hover:border-amber-100/30 ${
                config.dimmed ? "opacity-60" : ""
            }`}
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className={`px-2 py-1 text-xs font-bold rounded-full ${config.badge}`}
                        >
                            {config.label}
                        </span>

                        {ballot.status === "open" && (
                            <span className="text-xs text-amber-100/40">
                                Ends in 3 days
                            </span>
                        )}

                        {ballot.status !== "open" && (
                            <Icon className="w-4 h-4" />
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-amber-100">
                        {ballot.title}
                    </h3>

                    <p className="text-sm text-amber-100/60 mt-1">
                        {ballot.status === "voted"
                            ? `Your vote: ${ballot.votedFor}`
                            : ballot.description}
                    </p>
                </div>

                {ballot.status === "open" && (
                    <Icon className="w-5 h-5 text-amber-100/40" />
                )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-amber-100/10">
                <div className="text-sm text-amber-100/60">
                    {ballot.nomineesCount} categorie(s)
                </div>

                <button
                    className={`px-4 py-2 rounded-full text-sm transition ${config.actionStyle}`}
                >
                    {config.actionText}
                </button>
            </div>
        </div>
    )
}

export default BallotCard
