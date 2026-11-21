import { useEffect, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { Check } from "lucide-react"
import { vibrate } from "../ui/haptics"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMyVotes } from "../api/votes"
import { submissionIO } from "../api/submissions"
import { useUserData } from "../context/UserContenxt"
import { dashStates, votedCount, type DashState } from "../lib/voting"
import { Button } from "../ui/Button"
import { ProgressStrip } from "../ui/ProgressStrip"
import { closesLabel, submitChecklist } from "../ui/logic/submit"
import type { BallotDetail } from "../types"

type Load =
    | { state: "loading" }
    | { state: "error" }
    | { state: "ready"; ballot: BallotDetail; voted: number; total: number; states: DashState[]; labels: string[]; submittedAt: string | null }

const Page = ({ children }: { children: React.ReactNode }) => (
    <div className="h-dvh overflow-hidden bg-bg text-label">
        <main className="mx-auto flex h-dvh max-w-[520px] flex-col px-gutter pb-safe pt-safe [@media(max-height:640px)]:gap-1">{children}</main>
    </div>
)

const ARM_MS = 4000

const SubmitBallotPage = () => {
    const { ballotId = "" } = useParams()
    const navigate = useNavigate()
    const { profile } = useUserData()
    const userId = profile?.user_id ?? ""
    const [load, setLoad] = useState<Load>({ state: "loading" })
    const [armed, setArmed] = useState(false)
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
                setLoad({ state: "ready", ballot, voted: votedCount(votes, ids), total: ids.length, states: dashStates(ids, votes, -1), labels: ballot.categories.map((c) => c.name), submittedAt: at })
            })
            .catch(() => alive && setLoad({ state: "error" }))
        return () => {
            alive = false
        }
    }, [ballotId, userId, attempt])

    // The "tap again" prompt expires so a stray tap never lingers.
    useEffect(() => {
        if (!armed) return
        const t = setTimeout(() => setArmed(false), ARM_MS)
        return () => clearTimeout(t)
    }, [armed])

    // Device-local "I'm done" stamp only (no vote writes).
    const submit = () => {
        if (busy || !userId) return
        setBusy(true)
        setSubmitError(false)
        submissionIO(userId)
            .submit(ballotId)
            .then((at) => {
                vibrate("submit")
                setArmed(false)
                setSubmittedAt(at)
            })
            .catch(() => {
                setArmed(false)
                setSubmitError(true)
            })
            .finally(() => setBusy(false))
    }

    const back = `/app/ballots/${ballotId}`
    if (load.state === "loading") return <Page><div className="m-auto text-body">Loading…</div></Page>
    if (load.state === "error")
        return (
            <Page>
                <div className="my-auto space-y-4">
                    <div role="alert" className="text-body font-bold">Couldn't load your ballot. Check your connection and try again.</div>
                    <Button fullWidth onClick={() => { setLoad({ state: "loading" }); setAttempt((n) => n + 1) }}>Try again</Button>
                </div>
            </Page>
        )

    const { ballot, voted, total, states, labels } = load
    const closesAt = new Date(ballot.closes_at)
    const list = submitChecklist({ voted, total, closesAt, now: new Date(), opensAt: new Date(ballot.opens_at), status: ballot.status })
    const doneAt = submittedAt ?? load.submittedAt

    if (doneAt === null && list.blocked && list.blocked !== "empty")
        return <Navigate to={back} replace />

    const until = closesLabel(closesAt)
    const skipped = Math.max(0, total - voted)
    const jumpTo = (i: number) => {
        if (states[i] && !states[i].voted) navigate(back, { state: { jumpTo: i } })
    }
    const head = "mt-auto space-y-3 pt-4 [@media(max-height:640px)]:space-y-1 [@media(max-height:640px)]:pt-1"
    const h1 = "text-display [@media(max-height:640px)]:text-title-1"
    const foot = "mt-auto flex flex-col gap-1 pb-4 [@media(max-height:640px)]:pb-1"

    if (doneAt) {
        return (
            <Page>
                <div role="status" className={head}>
                    <Check aria-hidden className="size-9 text-pebble-sky [@media(max-height:640px)]:size-6" />
                    <h1 className={h1}>You're in.</h1>
                    <p className="text-body text-label-2">
                        Ballot submitted {closesLabel(new Date(doneAt))}. Your votes are saved, and you can still change votes until {until}.
                    </p>
                </div>
                <div className={foot}>
                    <Button fullWidth to="/app">Home</Button>
                    <Button fullWidth variant="link" to={back}>Review your votes</Button>
                </div>
            </Page>
        )
    }

    const ready = list.submittable
    const headline = submitError ? "Not saved" : !ready ? "Nothing voted yet" : skipped === 0 ? "All set?" : `${skipped} skipped`
    const sentence = !ready
        ? "Vote in at least one category to submit."
        : submitError
          ? "Your votes are safe. Only the done mark didn't save on this device."
          : skipped === 0
            ? `All ${total} voted. Your votes are saved, and you can still change votes until ${until}.`
            : `Skipping is fine. Your votes are saved, and you can still change votes until ${until}.`
    const main = busy ? "Submitting…" : submitError ? "Try again" : armed ? "Tap again to confirm" : "Submit ballot"
    return (
        <Page>
            <div className={head}>
                <h1 className={h1}>{headline}</h1>
                <p className={`text-body ${submitError ? "" : "text-label-2"}`} role={submitError ? "alert" : undefined}>{sentence}</p>
                <div className="pt-2">
                    <ProgressStrip
                        tone="submit"
                        states={states}
                        labels={labels}
                        onJump={jumpTo}
                        onOpenJump={() => jumpTo(states.findIndex((s) => !s.voted))}
                    />
                    <p className="text-footnote text-label-2">
                        {voted} of {total} voted{skipped > 0 ? ". Tap a dashed one to vote in it." : "."}
                    </p>
                </div>
            </div>
            <div className={foot}>
                <Button
                    fullWidth
                    size="md"
                    pebble={armed ? "strawberry" : undefined}
                    disabled={!ready}
                    loading={busy}
                    loadingLabel="Submitting…"
                    onClick={() => (submitError || armed ? submit() : setArmed(true))}
                >
                    {main}
                </Button>
                <Button fullWidth variant="link" to={back} disabled={busy}>Keep editing</Button>
            </div>
        </Page>
    )
}

export default SubmitBallotPage
