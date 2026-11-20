import { useEffect, useReducer, useRef, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Check, ChevronLeft, TriangleAlert } from "lucide-react"
import OscarLogo from "../components/OscarLogo"
import { vibrate } from "../ui/haptics"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMyVotes } from "../api/votes"
import { submissionIO } from "../api/submissions"
import { useUserData } from "../context/UserContenxt"
import { votedCount } from "../lib/voting"
import { HOLD_IDLE, holdProgress, holdReducer } from "../lib/hold"
import { HoldButton } from "../ui/HoldButton"
import { closesLabel, submitChecklist } from "../ui/logic/submit"
import type { BallotDetail } from "../types"

type Load =
    | { state: "loading" }
    | { state: "error" }
    | { state: "ready"; ballot: BallotDetail; voted: number; total: number; submittedAt: string | null }

const quietLink = "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-body font-bold underline underline-offset-4"
const pill = "inline-flex min-h-14 items-center justify-center rounded-full bg-bg px-6 text-title-3 text-label"

const Page = ({ backTo, children }: { backTo: string; children: React.ReactNode }) => (
    <div className="min-h-dvh bg-pebble-lime text-on-pebble-lime">
        <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col gap-6 px-gutter py-6 pt-safe pb-safe">
            <div className="flex items-center justify-between">
                <Link to={backTo} className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-0.5 rounded-control pr-3 text-body font-bold">
                    <ChevronLeft aria-hidden className="size-6" />
                    <span>Back to voting</span>
                </Link>
                <OscarLogo size="small" decorative tone="onLime" />
            </div>
            {children}
        </main>
    </div>
)

const SubmitBallotPage = () => {
    const { ballotId = "" } = useParams()
    const { profile } = useUserData()
    const userId = profile?.user_id ?? ""
    const [load, setLoad] = useState<Load>({ state: "loading" })
    const [hold, dispatch] = useReducer(holdReducer, HOLD_IDLE)
    const [now, setNow] = useState(0)
    const [submittedAt, setSubmittedAt] = useState<string | null>(null)
    const fired = useRef(false)
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

    useEffect(() => {
        if (hold.phase !== "holding") return
        let raf = 0
        const loop = () => {
            const t = performance.now()
            setNow(t)
            dispatch({ type: "tick", t })
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(raf)
    }, [hold.phase])

    useEffect(() => {
        const cancel = () => dispatch({ type: "cancel" })
        const onVis = () => document.visibilityState === "hidden" && cancel()
        window.addEventListener("blur", cancel)
        document.addEventListener("visibilitychange", onVis)
        return () => {
            window.removeEventListener("blur", cancel)
            document.removeEventListener("visibilitychange", onVis)
        }
    }, [])

    // confirm exactly once when the hold completes (no vote writes)
    useEffect(() => {
        if (hold.phase !== "done" || fired.current || !userId) return
        fired.current = true
        void submissionIO(userId)
            .submit(ballotId)
            .then((at) => {
                vibrate("submit")
                setSubmittedAt(at)
            })
    }, [hold.phase, ballotId, userId])

    const back = `/app/ballots/${ballotId}`
    if (load.state === "loading") return <Page backTo={back}><div className="text-body">Loading…</div></Page>
    if (load.state === "error")
        return (
            <Page backTo={back}>
                <div role="alert" className="text-body font-bold">Couldn't load your ballot. Check your connection and try again.</div>
                <button type="button" className={pill} onClick={() => { setLoad({ state: "loading" }); setAttempt((n) => n + 1) }}>Try again</button>
            </Page>
        )

    const { ballot, voted, total } = load
    const closesAt = new Date(ballot.closes_at)
    const list = submitChecklist({ voted, total, closesAt, now: new Date(), opensAt: new Date(ballot.opens_at), status: ballot.status })
    const doneAt = submittedAt ?? load.submittedAt

    if (doneAt === null && list.blocked && list.blocked !== "empty")
        return <Navigate to={back} replace state={{ notice: list.blocked === "closed" ? "Voting is closed, so this ballot can't be submitted." : "Voting hasn't opened yet." }} />

    if (doneAt) {
        return (
            <Page backTo={back}>
                <div role="status" className="space-y-4 pt-4">
                    <div className="text-caption-1 font-bold tracking-[0.25em]">{ballot.name.toUpperCase()}</div>
                    <h1 className="text-display">Ballot submitted</h1>
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
    const progress = holdProgress(hold, now)
    const down = (pointerId: number, x: number, y: number) => ready && dispatch({ type: "down", t: performance.now(), pointerId, x, y })

    return (
        <Page backTo={back}>
            <div className="space-y-4 pt-4">
                <div className="text-caption-1 font-bold tracking-[0.25em]">{ballot.name.toUpperCase()}</div>
                <h1 className="text-display">Submit your ballot?</h1>
                <p className="text-title-3">Make it official.</p>
            </div>
            <ul className="space-y-2">
                {list.items.map((c) => (
                    <li key={c.id} className="flex min-h-11 items-center gap-3 rounded-card bg-on-pebble-lime/10 px-4 py-3 text-callout">
                        {c.ok ? <Check aria-hidden className="size-5 shrink-0" /> : <TriangleAlert aria-hidden className="size-5 shrink-0" />}
                        <span className="flex-1">{c.label}</span>
                        {!c.ok && c.id === "voted" && <Link to={back} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Finish voting</Link>}
                    </li>
                ))}
            </ul>
            <div className="mt-auto space-y-3">
                <HoldButton
                    ready={ready}
                    busy={false}
                    label="Hold to submit"
                    hint={ready ? "Press and hold for 3 seconds" : "Vote in at least one category to submit"}
                    progress={progress}
                    onDown={down}
                    onMove={(id, x, y) => dispatch({ type: "move", pointerId: id, x, y })}
                    onUp={(id) => dispatch({ type: "up", pointerId: id })}
                    onCancel={() => dispatch({ type: "cancel" })}
                />
                <div className="text-center"><Link to={back} className={quietLink}>Not yet, back to voting</Link></div>
            </div>
        </Page>
    )
}

export default SubmitBallotPage
