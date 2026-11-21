import { useEffect, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Check, TriangleAlert } from "lucide-react"
import { vibrate } from "../ui/haptics"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMyVotes } from "../api/votes"
import { submissionIO } from "../api/submissions"
import { useUserData } from "../context/UserContenxt"
import { votedCount } from "../lib/voting"
import { Button } from "../ui/Button"
import { SheetActions } from "../ui/SheetActions"
import { Sheet } from "../ui/Sheet"
import { closesLabel, submitChecklist } from "../ui/logic/submit"
import type { BallotDetail } from "../types"

type Load =
    | { state: "loading" }
    | { state: "error" }
    | { state: "ready"; ballot: BallotDetail; voted: number; total: number; submittedAt: string | null }

const quietLink = "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-body font-bold underline underline-offset-4"
const pill = "inline-flex min-h-14 items-center justify-center rounded-full bg-bg px-6 text-title-3 text-label"

const Page = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-dvh bg-pebble-lime text-on-pebble-lime">
        <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col gap-4 px-gutter pb-safe pt-safe [@media(max-height:640px)]:gap-2">{children}</main>
    </div>
)

const SubmitBallotPage = () => {
    const { ballotId = "" } = useParams()
    const { profile } = useUserData()
    const userId = profile?.user_id ?? ""
    const [load, setLoad] = useState<Load>({ state: "loading" })
    const [confirming, setConfirming] = useState(false)
    const [busy, setBusy] = useState(false)
    const [submitError, setSubmitError] = useState(false)
    const [submittedAt, setSubmittedAt] = useState<string | null>(null)
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        if (!userId) return
        let alive = true
        Promise.all([fetchBallotDetail(ballotId), fetchMyVotes(ballotId), submissionIO(userId).get(ballotId)])
            .then(([ballot, votes, at]) => {
                if (!alive) return
                const ids = ballot.categories.map((c) => c.id)
                setLoad({ state: "ready", ballot, voted: votedCount(votes, ids), total: ids.length, submittedAt: at })
            })
            .catch(() => alive && setLoad({ state: "error" }))
        return () => {
            alive = false
        }
    }, [ballotId, userId, attempt])

    // Confirmed in the sheet: store the device-local confirmation (no vote writes).
    const confirm = () => {
        if (busy || !userId) return
        setBusy(true)
        setSubmitError(false)
        submissionIO(userId)
            .submit(ballotId)
            .then((at) => {
                vibrate("submit")
                setConfirming(false)
                setSubmittedAt(at)
            })
            .catch(() => setSubmitError(true))
            .finally(() => setBusy(false))
    }

    const back = `/app/ballots/${ballotId}`
    if (load.state === "loading") return <Page><div className="text-body">Loading…</div></Page>
    if (load.state === "error")
        return (
            <Page>
                <div role="alert" className="text-body font-bold">Couldn't load your ballot. Check your connection and try again.</div>
                <button type="button" className={pill} onClick={() => { setLoad({ state: "loading" }); setAttempt((n) => n + 1) }}>Try again</button>
            </Page>
        )

    const { ballot, voted, total } = load
    const closesAt = new Date(ballot.closes_at)
    const list = submitChecklist({ voted, total, closesAt, now: new Date(), opensAt: new Date(ballot.opens_at), status: ballot.status })
    const doneAt = submittedAt ?? load.submittedAt

    if (doneAt === null && list.blocked && list.blocked !== "empty")
        return <Navigate to={back} replace />

    if (doneAt) {
        return (
            <Page>
                <div role="status" className="mt-auto space-y-4 pt-4">
                    <h1 className="text-display [@media(max-height:640px)]:text-title-1">Ballot submitted</h1>
                    <p className="text-body">
                        {voted} of {total} categories voted. Submitted {closesLabel(new Date(doneAt))}.
                    </p>
                    <p className="text-body">You can still change votes until {closesLabel(closesAt)}.</p>
                </div>
                <div className="mt-auto flex flex-col gap-3">
                    <Link to="/app" className={pill}>Home</Link>
                    <Link to={back} className={quietLink}>Review your votes</Link>
                </div>
            </Page>
        )
    }

    const ready = list.submittable

    const skipped = Math.max(0, total - voted)
    return (
        <Page>
            <div className="mt-auto space-y-3 pt-4 [@media(max-height:640px)]:space-y-1 [@media(max-height:640px)]:pt-2">
                <h1 className="text-display [@media(max-height:640px)]:text-title-1">Submit your ballot?</h1>
                <p className="text-title-3">
                    {voted} of {total} {total === 1 ? "category" : "categories"} voted{skipped > 0 ? `, ${skipped} skipped` : ""}.
                </p>
            </div>
            <ul className="space-y-1 [@media(max-height:640px)]:space-y-0">
                {list.items.map((c) => (
                    <li key={c.id} className="flex min-h-11 items-center gap-3 text-callout">
                        {c.ok ? <Check aria-hidden className="size-5 shrink-0" /> : <TriangleAlert aria-hidden className="size-5 shrink-0" />}
                        <span className="flex-1">{c.label}</span>
                        {!c.ok && c.id === "voted" && <Link to={back} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Finish voting</Link>}
                    </li>
                ))}
            </ul>
            <div className="mt-auto space-y-3 pb-4 [@media(max-height:640px)]:space-y-1 [@media(max-height:640px)]:pb-2">
                <Button fullWidth size="lg" variant="primary" disabled={!ready} onClick={() => setConfirming(true)}>
                    Submit my ballot
                </Button>
                {!ready && <p className="text-center text-footnote">Vote in at least one category to submit</p>}
                <div className="text-center"><Link to={back} className={quietLink}>Back to ballot</Link></div>
            </div>
            <Sheet
                open={confirming}
                onClose={() => !busy && setConfirming(false)}
                title="Submit your ballot?"
                fit
                footer={
                    <SheetActions>
                        <Button fullWidth loading={busy} loadingLabel="Submitting…" onClick={confirm}>
                            Submit ballot
                        </Button>
                        <Button fullWidth variant="tinted" disabled={busy} onClick={() => setConfirming(false)}>
                            Keep editing
                        </Button>
                    </SheetActions>
                }
            >
                <p className="text-body">
                    {voted} of {total} {total === 1 ? "category" : "categories"} voted{skipped > 0 ? `, ${skipped} skipped` : ""}.
                </p>
                {submitError && (
                    <p role="alert" className="mt-3 text-callout font-bold">
                        Couldn't save your submission. Try again.
                    </p>
                )}
            </Sheet>
        </Page>
    )
}

export default SubmitBallotPage
