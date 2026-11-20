import { ChevronRight, Clock, Vote } from "lucide-react"
import { Link } from "react-router-dom"
import { ballotCardStatus, type BallotSummary } from "../lib/voting"
import { closesInLabel, urgency } from "../lib/time"

const PendingBallot = ({ ballot, now }: { ballot: BallotSummary; now: Date }) => {
    const closes = new Date(ballot.closes_at)
    const isUrgent = urgency(closes, now) === "urgent"
    const remaining = ballot.category_count - ballot.my_vote_count
    return (
        <Link to={`/app/ballots/${ballot.id}`} className="block bg-zinc-900/40 rounded-2xl p-4 mb-3 border border-amber-100/10 hover:border-amber-100/30 transition">
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-amber-100">{ballot.name}</span>
                {isUrgent && <span className="px-2 py-1 bg-red-500/30 text-red-300 text-xs font-bold rounded-full">URGENT</span>}
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-100/60">
                <Clock className="w-4 h-4" />
                <span>
                    {closesInLabel(closes, now)} • {remaining} left to vote
                </span>
            </div>
        </Link>
    )
}

const PendingBallots = ({ ballots }: { ballots: BallotSummary[] }) => {
    const now = new Date()
    const pending = ballots.filter((b) => ballotCardStatus(b, b.category_count, b.my_vote_count, now) === "open")

    return pending.length > 0 ? (
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-2 border-red-500/30 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Vote className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-black text-amber-100">Action Required!</h3>
                    <p className="text-sm text-amber-100/70">You have pending ballots to complete</p>
                </div>
            </div>
            {pending.map((b) => (
                <PendingBallot key={b.id} ballot={b} now={now} />
            ))}
            <Link to={`/app/ballots/${pending[0].id}`}>
                <button className="w-full bg-amber-100 text-zinc-900 rounded-xl py-3 font-bold hover:bg-amber-200 transition flex items-center justify-center gap-2">
                    Vote Now
                    <ChevronRight className="w-5 h-5" />
                </button>
            </Link>
        </div>
    ) : (
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Vote className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-black text-amber-100">
                        No Pending Ballots
                    </h3>
                    <p className="text-sm text-amber-100/70">
                        You have no pending ballots to complete, good job
                    </p>
                </div>
            </div>
            <Link to={"/app/ballots"}>
                <button className="w-full bg-amber-100 text-zinc-900 rounded-xl py-3 font-bold hover:bg-amber-200 transition flex items-center justify-center gap-2">
                    View Ballots
                    <ChevronRight className="w-5 h-5" />
                </button>
            </Link>
        </div>
    )
}

export default PendingBallots
