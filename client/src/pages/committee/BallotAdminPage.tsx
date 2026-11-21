import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useParams } from "react-router-dom"
import StatusChip from "../../components/committee/StatusChip"
import { statusPebble } from "../../components/committee/statusPebble"
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
import { Screen } from "../../ui/Screen"
import { Button } from "../../ui/Button"
import { PEBBLE_EDGE } from "../../ui/logic/pebble"
import { ErrorState } from "../../ui/ErrorState"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { COPY } from "../../ui/copy"

const UPDATE_FAILED = "Couldn't update the ballot. Check your connection and try again."

// resultsAction / resultsBody override the default Export CSV button and TallyPanel.
type Props = { resultsAction?: ReactNode; resultsBody?: ReactNode }

const BallotAdminPage = ({ resultsAction, resultsBody }: Props) => {
    const { ballotId } = useParams()
    const confirm = useConfirm()
    const [ballot, setBallot] = useState<BallotSummary | null>(null)
    const [rows, setRows] = useState<MemberCompletion[]>([])
    const [error, setError] = useState(false)
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
            setError(false)
        } catch (e) {
            console.error(e)
            setError(true)
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
            console.error(e)
            setActionError(UPDATE_FAILED)
        } finally {
            setBusy(false)
        }
    }

    const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    const retry = () => {
        setError(false)
        setBallot(null)
        void load()
    }
    const status = ballot ? chipStatus(ballot, new Date()) : null

    return (
        <Screen title={ballot?.name ?? "Ballot"} back={{ to: "/app/profile/ballots", label: "Ballots" }} width="wide">
            {error && <ErrorState title={COPY.somethingWrong} body={COPY.loadFailed("this ballot")} onRetry={retry} />}
            {!error && !ballot && (
                <SkeletonScreen label="Loading ballot">
                    <div className="space-y-4">
                        <Skeleton shape="block" />
                        <Skeleton shape="card" />
                    </div>
                </SkeletonScreen>
            )}
            {ballot && !error && status && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start">
                    <div className="space-y-4">
                        <section aria-label="Status" className={`rounded-card border-l-4 bg-surface p-4 ${PEBBLE_EDGE[statusPebble(status) ?? "grape"]}`}>
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-callout">
                                    Closes {fmt(ballot.closes_at)} · {closesInLabel(new Date(ballot.closes_at), new Date()).replace(/^Closes /, "")}
                                </p>
                                <StatusChip status={status} />
                            </div>
                        </section>

                        {ballot.status === "open" && (
                            <Button
                                variant="pebble"
                                pebble="cherry"
                                size="md"
                                fullWidth
                                disabled={busy}
                                onClick={() => changeStatus("closed", { title: `Close voting for ${ballot.name}?`, message: "Votes can no longer be changed.", confirmLabel: "Close voting", destructive: true })}
                            >
                                Close now
                            </Button>
                        )}
                        {ballot.status === "draft" && (
                            <Button
                                variant="primary"
                                size="md"
                                fullWidth
                                disabled={busy || blockers.length > 0}
                                onClick={() => changeStatus("open", { title: "Publish this ballot?", message: "Members will be able to vote.", confirmLabel: "Publish" })}
                            >
                                Publish
                            </Button>
                        )}
                        {ballot.status === "draft" && blockers.length > 0 && (
                            <ul className="space-y-1 text-footnote text-warn">
                                {blockers.map((b) => <li key={b}>{b}</li>)}
                            </ul>
                        )}
                        {actionError && <div role="alert" className="text-center text-callout text-danger">{actionError}</div>}

                        <CompletionPanel rows={rows} />
                    </div>

                    <div className="space-y-4">
                        <section aria-label="Results" className={`rounded-card border-l-4 bg-surface p-4 ${PEBBLE_EDGE.lemon}`}>
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-title-3">Results</h3>
                                {resultsAction ?? <ExportCsvButton ballotId={ballot.id} ballotName={ballot.name} />}
                            </div>
                            <p className="mt-2 text-footnote text-label-2">The CSV works any time, including mid-vote.</p>
                        </section>
                        {resultsBody ?? <TallyPanel key={`${ballot.id}-${ballot.status}`} ballot={ballot} />}
                    </div>
                </div>
            )}
        </Screen>
    )
}

export default BallotAdminPage
