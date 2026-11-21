import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Check, ChevronDown, ChevronLeft } from "lucide-react"
import { vibrate } from "../../ui/haptics"
import { fetchCurrentSeason } from "../../api/ballots"
import { fetchReleaseStatus, releaseSeasonResults } from "../../api/results"
import { HOLD_IDLE, holdProgress, holdReducer, type HoldEvent, type HoldState } from "../../lib/hold"
import { HoldButton } from "../../ui/HoldButton"
import { releaseChecks, type ReleaseCheck } from "../../lib/release"
import { failingLines, firstFailingBallotId, winnerCount } from "../../lib/releaseView"
import { EnvelopeArt } from "../../ui/EnvelopeArt"

const CHECK_REFRESH_MS = 30_000

// `done` is terminal in holdReducer, so a failed release needs an explicit reset to retry.
const pageReducer = (s: HoldState, e: HoldEvent | { type: "reset" }): HoldState => (e.type === "reset" ? HOLD_IDLE : holdReducer(s, e))

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; seasonId: string; released: boolean; checks: ReleaseCheck[]; ready: boolean; failingId: string | null; winners: number }

const RELEASE_FAILED = "Couldn't open the envelope. Check your connection and hold again."

const Page = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-dvh bg-bg text-label">
        <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-gutter pb-safe pt-safe">
            <Link to="/app/profile" className="-ml-2 inline-flex min-h-11 items-center gap-0.5 self-start rounded-control pl-1 pr-3 text-subhead font-bold">
                <ChevronLeft aria-hidden className="size-6" />
                <span>Back</span>
            </Link>
            {children}
        </main>
    </div>
)
const quietLink = "mt-0.5 flex min-h-11 items-center justify-center rounded-control text-subhead font-bold opacity-85"

const ReleasePage = () => {
    const [load, setLoad] = useState<Load>({ state: "loading" })
    const [hold, dispatch] = useReducer(pageReducer, HOLD_IDLE)
    const [now, setNow] = useState(0)
    const [busy, setBusy] = useState(false)
    const [releaseError, setReleaseError] = useState<string | null>(null)
    const [opened, setOpened] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const fired = useRef(false)

    const refresh = useCallback(async (initial: boolean) => {
        try {
            const season = await fetchCurrentSeason()
            if (!season) throw new Error("No current season")
            const status = await fetchReleaseStatus(season.id)
            const { checks, ready } = releaseChecks(status, new Date())
            setLoad({ state: "ready", seasonId: season.id, released: status.season.results_released_at != null, checks, ready, failingId: ready ? null : firstFailingBallotId(status, checks, new Date()), winners: winnerCount(status) })
        } catch (e) {
            // a failed background refresh keeps the last good checks
            if (initial) setLoad({ state: "error", message: e instanceof Error ? e.message : "Could not load release status" })
        }
    }, [])

    useEffect(() => {
        void refresh(true)
        const id = setInterval(() => void refresh(false), CHECK_REFRESH_MS)
        return () => clearInterval(id)
    }, [refresh])

    // tick loop while holding
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

    // cancel when the page is hidden or loses focus
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

    // a check turning red mid-hold cancels the hold
    const isReady = load.state === "ready" && load.ready
    useEffect(() => {
        if (!isReady) dispatch({ type: "cancel" })
    }, [isReady])

    // release exactly once when the hold completes
    const seasonId = load.state === "ready" ? load.seasonId : null
    useEffect(() => {
        if (hold.phase !== "done" || fired.current || !seasonId) return
        fired.current = true
        setBusy(true)
        setReleaseError(null)
        releaseSeasonResults(seasonId)
            .then(() => {
                vibrate("release")
                setOpened(true)
            })
            .catch((e) => {
                void e
                setReleaseError(RELEASE_FAILED)
                fired.current = false
                dispatch({ type: "reset" })
            })
            .finally(() => setBusy(false))
    }, [hold.phase, seasonId])

    if (load.state === "loading") return <Page><div className="my-auto text-center text-body">Loading…</div></Page>
    if (load.state === "error")
        return (
            <Page>
                <div className="my-auto space-y-4 text-center">
                    <div role="alert" className="text-body font-bold">{load.message}</div>
                    <button type="button" onClick={() => { setLoad({ state: "loading" }); void refresh(true) }} className="min-h-14 rounded-full bg-pebble-lemon px-6 text-headline text-on-pebble-lemon">Retry</button>
                </div>
            </Page>
        )

    if (load.released || opened) {
        const n = load.winners
        return (
            <Page>
                <div role="status" className="my-auto space-y-3 text-center">
                    <EnvelopeArt state="open" size={180} />
                    <h1 className="pt-4 text-large-title font-display">The envelope is open</h1>
                    <p className="text-callout text-label-2">
                        {n > 0 ? `${n} ${n === 1 ? "winner is" : "winners are"} live for every member.` : "The winners are live for every member."}
                    </p>
                </div>
                <Link to="/app/results" className="mb-4 inline-flex h-14 items-center justify-center rounded-full bg-pebble-lemon text-headline text-on-pebble-lemon">See results</Link>
            </Page>
        )
    }

    const ready = load.ready
    const progress = holdProgress(hold, now)
    const holding = hold.phase === "holding"
    const lines = failingLines(load.checks)

    const down = (pointerId: number, x: number, y: number) => ready && !busy && dispatch({ type: "down", t: performance.now(), pointerId, x, y })
    const hint = holding ? "Let go to cancel." : ready ? "Press and hold for 3 seconds." : `Finish the ${lines.length} ${lines.length === 1 ? "thing" : "things"} above to unlock.`

    return (
        <Page>
            <div className="my-auto space-y-3 py-6 text-center">
                <EnvelopeArt state={holding ? "open" : ready ? "lit" : "dim"} />
                <h1 className="pt-3 text-title-1 font-display">{holding ? "Opening…" : "Reveal the winners?"}</h1>
                <p className="text-callout text-label-2">{holding ? "Keep your finger down until the bar fills." : "Every member will see every winner. This can't be undone."}</p>
            </div>
            {!holding && (
                <div className="border-t border-sep">
                    {ready ? (
                        <div className="flex min-h-11 items-center gap-2 text-subhead font-bold">
                            <Check aria-hidden className="size-5" />
                            <span>Everything is ready</span>
                        </div>
                    ) : (
                        <>
                            <button type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="flex min-h-11 w-full items-center justify-between text-subhead font-bold">
                                <span>{lines.length} {lines.length === 1 ? "thing" : "things"} left</span>
                                <ChevronDown aria-hidden className={`size-5 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
                            </button>
                            {expanded && (
                                <ul className="space-y-1 pb-1 text-footnote text-label-2">
                                    {lines.map((l) => <li key={l} className="flex gap-2"><span aria-hidden>•</span>{l}</li>)}
                                </ul>
                            )}
                            <Link to={load.failingId ? `/app/profile/ballots/${load.failingId}` : "/app/profile/ballots"} className="inline-flex min-h-11 items-center text-footnote font-bold underline underline-offset-4">
                                Go to tally
                            </Link>
                        </>
                    )}
                </div>
            )}
            <div className="mt-2 pb-4">
                <HoldButton
                    ready={ready}
                    busy={busy}
                    label={holding ? "Keep holding…" : "Hold to open the envelope"}
                    busyLabel="Opening…"
                    hint={hint}
                    progress={progress}
                    onDown={down}
                    onMove={(id, x, y) => dispatch({ type: "move", pointerId: id, x, y })}
                    onUp={(id) => dispatch({ type: "up", pointerId: id })}
                    onCancel={() => dispatch({ type: "cancel" })}
                />
                {releaseError && <div role="alert" className="mt-2 text-center text-callout font-bold text-danger">{releaseError}</div>}
                {!holding && <Link to="/app/profile" className={quietLink}>Not yet</Link>}
            </div>
        </Page>
    )
}

export default ReleasePage
