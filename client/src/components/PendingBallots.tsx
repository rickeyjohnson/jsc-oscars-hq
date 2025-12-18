import { ChevronRight, Clock, Vote } from "lucide-react"

const PendingBallot = ({ ballot }: { ballot: unknown }) => {
    return (
        <div className="bg-zinc-900/40 rounded-2xl p-4 mb-3 border border-amber-100/10">
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-amber-100">Best Picture</span>
                <span className="px-2 py-1 bg-red-500/30 text-red-300 text-xs font-bold rounded-full">
                    {/* < 1 DAYS = URGENT (RED); < 3 =  */}
                    URGENT
                </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-100/60">
                <Clock className="w-4 h-4" />
                <span>Closes in 3 days</span>
            </div>
        </div>
    )
}

const PendingBallots = ({ ballots }: { ballots: unknown[] }) => {
    return (
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-2 border-red-500/30 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Vote className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-black text-amber-100">
                        Action Required!
                    </h3>
                    <p className="text-sm text-amber-100/70">
                        You have pending ballots to complete
                    </p>
                </div>
            </div>
                {ballots.map((ballot) => {
                    return <PendingBallot ballot={ballot} />
                })}
            <button className="w-full bg-amber-100 text-zinc-900 rounded-xl py-3 font-bold hover:bg-amber-200 transition flex items-center justify-center gap-2">
                Vote Now
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    )
}

export default PendingBallots
