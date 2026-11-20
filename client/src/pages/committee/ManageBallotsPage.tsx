import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import NavigationBar from "../../components/NavigationBar"
import NavigationTabs from "../../components/NavigationTabs"
import StatusChip from "../../components/committee/StatusChip"
import { fetchBallotSummaries } from "../../api/ballots"
import { chipStatus, type BallotSummary } from "../../lib/voting"

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })

const ManageBallotsPage = () => {
    const [ballots, setBallots] = useState<BallotSummary[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchBallotSummaries(true)
            .then(setBallots)
            .catch((e) => setError(e instanceof Error ? e.message : "Could not load ballots"))
    }, [])

    return (
        <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
            <NavigationBar />
            <main className="p-6 space-y-6">
                <h2 className="text-3xl font-black">Ballots</h2>
                <div className="space-y-3">
                    {error && <div className="text-center text-red-400">{error}</div>}
                    {!error && ballots === null && <div className="text-center text-amber-100/60">Loading...</div>}
                    {ballots?.map((b) => (
                        <Link key={b.id} to={`/app/profile/ballots/${b.id}`} className="block bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4">
                            <div className="flex justify-between items-center gap-2">
                                <span className="font-bold">{b.name}</span>
                                <span className="flex gap-2 items-center">
                                    {b.round !== "main" && <span className="text-xs text-amber-100/60 capitalize">{b.round}</span>}
                                    <StatusChip status={chipStatus(b, new Date())} />
                                </span>
                            </div>
                            <div className="text-sm text-amber-100/60 mt-1">
                                {day(b.opens_at)} → {day(b.closes_at)} · {b.category_count} {b.category_count === 1 ? "category" : "categories"}
                            </div>
                        </Link>
                    ))}
                    {ballots?.length === 0 && <div className="text-center text-amber-100/60">No ballots</div>}
                </div>
                <Link to="/app/profile/ballots/create" className="block text-center bg-amber-100 text-zinc-900 font-bold rounded-full px-6 py-3">
                    + New ballot
                </Link>
                <Link to="/app/profile/release" className="block text-center bg-amber-100 text-zinc-900 font-bold rounded-full px-6 py-3">
                    Reveal results
                </Link>
            </main>
            <NavigationTabs activeTab={"profile"} />
        </div>
    )
}

export default ManageBallotsPage
