import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useParams } from "react-router-dom"
import NavigationBar from "../../components/NavigationBar"
import NavigationTabs from "../../components/NavigationTabs"
import StatusChip from "../../components/committee/StatusChip"
import CompletionPanel from "../../components/committee/CompletionPanel"
import { fetchBallotDetail, fetchBallotSummaries, setBallotStatus } from "../../api/ballots"
import { fetchMembers } from "../../api/members"
import { fetchAllVotes } from "../../api/votes"
import { publishBlockers } from "../../lib/ballotForm"
import { completionByMember, chipStatus, type BallotSummary, type MemberCompletion } from "../../lib/voting"
import { closesInLabel } from "../../lib/time"

// Task 12 passes the Export CSV button as resultsAction; Task 14 passes the TallyPanel as resultsBody.
type Props = { resultsAction?: ReactNode; resultsBody?: ReactNode }

const BallotAdminPage = ({ resultsAction, resultsBody }: Props) => {
    const { ballotId } = useParams()
    const [ballot, setBallot] = useState<BallotSummary | null>(null)
    const [rows, setRows] = useState<MemberCompletion[]>([])
    const [error, setError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [blockers, setBlockers] = useState<string[]>([])
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        if (!ballotId) return
        try {
            const [all, members, votes, detail] = await Promise.all([fetchBallotSummaries(true), fetchMembers(), fetchAllVotes(ballotId), fetchBallotDetail(ballotId)])
            setBlockers(publishBlockers(detail))
            const found = all.find((b) => b.id === ballotId)
            if (!found) throw new Error("Ballot not found")
            setBallot(found)
            setRows(completionByMember(members, votes, found.category_count))
            setError(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load ballot")
        }
    }, [ballotId])

    useEffect(() => {
        load()
    }, [load])

    const changeStatus = async (status: "open" | "closed", message: string) => {
        if (!ballotId || !window.confirm(message)) return
        setBusy(true)
        setActionError(null)
        try {
            await setBallotStatus(ballotId, status)
            await load()
        } catch (e) {
            setActionError(e instanceof Error ? e.message : "Could not update ballot")
        } finally {
            setBusy(false)
        }
    }

    const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })

    return (
        <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
            <NavigationBar />
            <main className="p-6 space-y-6">
                {error && <div className="text-center text-red-400">{error}</div>}
                {!error && !ballot && <div className="text-center text-amber-100/60">Loading...</div>}
                {ballot && !error && (
                    <>
                        <div>
                            <div className="flex justify-between items-center gap-2">
                                <h2 className="text-2xl font-black">{ballot.name}</h2>
                                <StatusChip status={chipStatus(ballot, new Date())} />
                            </div>
                            <p className="text-sm text-amber-100/60 mt-1">
                                Closes {fmt(ballot.closes_at)} · {closesInLabel(new Date(ballot.closes_at), new Date()).replace(/^Closes /, "")}
                            </p>
                        </div>

                        {ballot.status === "open" && (
                            <button
                                disabled={busy}
                                onClick={() => changeStatus("closed", "Close voting now? Votes can no longer be changed.")}
                                className="w-full bg-red-600 text-white font-bold rounded-2xl p-4 disabled:opacity-50"
                            >
                                Close now
                            </button>
                        )}
                        {ballot.status === "draft" && (
                            <button
                                disabled={busy || blockers.length > 0}
                                onClick={() => changeStatus("open", "Publish this ballot? Members will be able to vote.")}
                                className="w-full bg-amber-100 text-zinc-900 font-bold rounded-2xl p-4 disabled:opacity-50"
                            >
                                Publish
                            </button>
                        )}
                        {ballot.status === "draft" && blockers.length > 0 && (
                            <ul className="text-xs text-amber-400 space-y-1">
                                {blockers.map((b) => <li key={b}>{b}</li>)}
                            </ul>
                        )}
                        {actionError && <div className="text-center text-red-400">{actionError}</div>}

                        <CompletionPanel rows={rows} />

                        <div className="bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold">Results</h3>
                                {/* Task 12: Export CSV button goes here (resultsAction) */}
                                {resultsAction}
                            </div>
                            {/* Task 14: TallyPanel goes here (resultsBody) */}
                            {resultsBody ?? <p className="text-sm text-amber-100/60">Tally, ties, tiebreak and winners appear here once voting closes.</p>}
                        </div>
                    </>
                )}
            </main>
            <NavigationTabs activeTab={"profile"} />
        </div>
    )
}

export default BallotAdminPage
