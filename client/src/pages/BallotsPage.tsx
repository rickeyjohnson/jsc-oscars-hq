import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import { useEffect, useState } from "react"
import BallotCard from "../components/BallotCard"
import { fetchBallotSummaries } from "../api/ballots"
import { ballotCardStatus, type BallotSummary } from "../lib/voting"

const FILTERS = ["All", "Open", "Voted", "Closed"] as const
type Filter = (typeof FILTERS)[number]

const BallotsPage = () => {
    const [selected, setSelected] = useState<Filter>("All")
    const [ballots, setBallots] = useState<BallotSummary[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const now = new Date()

    useEffect(() => {
        fetchBallotSummaries()
            .then(setBallots)
            .catch((e) => setError(e instanceof Error ? e.message : "Could not load ballots"))
    }, [])

    const baseClasses = "px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors"
    const selectedClasses = "bg-amber-100 text-zinc-900 font-bold"
    const unselectedClasses = "bg-amber-100/10 text-amber-100 border-amber-100/20 font-medium"

    const filtered = (ballots ?? []).filter((b) => {
        if (selected === "All") return true
        return ballotCardStatus(b, b.category_count, b.my_vote_count, now) === selected.toLowerCase()
    })

    return (
        <div>
            <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
                <NavigationBar />
                <main>
                    <div className="space-y-6 p-6">
                        <h2 className="text-3xl font-black">Ballots</h2>

                        <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2">
                            {FILTERS.map((f) => (
                                <button key={f} onClick={() => setSelected(f)} className={`${baseClasses} ${selected === f ? selectedClasses : unselectedClasses}`}>
                                    {f}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {error && <div className="text-center text-red-400">{error}</div>}
                            {!error && ballots === null && <div className="text-center text-amber-100/60">Loading...</div>}
                            {ballots !== null && filtered.map((b) => <BallotCard key={b.id} ballot={b} now={now} />)}
                            {ballots !== null && filtered.length === 0 && <div className="text-center">No ballots</div>}
                        </div>
                    </div>
                </main>
                <NavigationTabs activeTab={"ballots"} />
            </div>
        </div>
    )
}

export default BallotsPage
