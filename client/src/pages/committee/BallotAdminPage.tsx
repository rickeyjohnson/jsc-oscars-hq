import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useParams } from "react-router-dom"
import NavigationBar from "../../components/NavigationBar"
import NavigationTabs from "../../components/NavigationTabs"
import StatusChip from "../../components/committee/StatusChip"
import CompletionPanel from "../../components/committee/CompletionPanel"
import ExportCsvButton from "../../components/committee/ExportCsvButton"
import TallyPanel from "../../components/committee/TallyPanel"
import { fetchBallotDetail, fetchBallotSummaries, setBallotStatus } from "../../api/ballots"
import { fetchMembers } from "../../api/members"
import { fetchAllVotes } from "../../api/votes"
import { publishBlockers } from "../../lib/ballotForm"
import { completionByMember, chipStatus, type BallotSummary, type MemberCompletion } from "../../lib/voting"
import { useConfirm } from "../../ui/ConfirmProvider"
import { closesInLabel } from "../../lib/time"

// resultsAction / resultsBody override the default Export CSV button and TallyPanel.
type Props = { resultsAction?: ReactNode; resultsBody?: ReactNode }

const BallotAdminPage = ({ resultsAction, resultsBody }: Props) => {
    const { ballotId } = useParams()
    const confirm = useConfirm()
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

    const changeStatus = async (status: "open" | "closed", ask: { title: string; message: string; confirmLabel: string; destructive?: boolean }) => {
        if (!ballotId) return
        if (status === "open" && blockers.length > 0) return
        if (!(await confirm(ask))) return
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
                                onClick={() => changeStatus("closed", { title: `Close voting for ${ballot.name}?`, message: "Votes can no longer be changed.", confirmLabel: "Close voting", destructive: true })}
                                className="w-full bg-red-600 text-white font-bold rounded-2xl p-4 disabled:opacity-50"
                            >
                                Close now
                            </button>
                        )}
                        {ballot.status === "draft" && (
                            <button
                                disabled={busy || blockers.length > 0}
                                onClick={() => changeStatus("open", { title: "Publish this ballot?", message: "Members will be able to vote.", confirmLabel: "Publish" })}
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
                                {resultsAction ?? <ExportCsvButton ballotId={ballot.id} ballotName={ballot.name} />}
                            </div>
                            <p className="text-xs text-amber-100/60 mb-3">The CSV works any time, including mid-vote.</p>
                            {resultsBody ?? <TallyPanel key={`${ballot.id}-${ballot.status}`} ballot={ballot} />}
                        </div>
                    </>
                )}
            </main>
            <NavigationTabs activeTab={"profile"} />
        </div>
    )
}

export default BallotAdminPage
