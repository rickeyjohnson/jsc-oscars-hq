import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Check, ChevronLeft, TriangleAlert } from "lucide-react"
import OscarLogo from "../../components/OscarLogo"
import { vibrate } from "../../ui/haptics"
import { fetchCurrentSeason } from "../../api/ballots"
import { fetchReleaseStatus, releaseSeasonResults } from "../../api/results"
import { HOLD_IDLE, holdProgress, holdReducer, type HoldEvent, type HoldState } from "../../lib/hold"
import { HoldButton } from "../../ui/HoldButton"
import { releaseChecks, type ReleaseCheck } from "../../lib/release"

const CHECK_REFRESH_MS = 30_000

// `done` is terminal in holdReducer, so a failed release needs an explicit reset to retry.
const pageReducer = (s: HoldState, e: HoldEvent | { type: "reset" }): HoldState => (e.type === "reset" ? HOLD_IDLE : holdReducer(s, e))

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; seasonId: string; released: boolean; checks: ReleaseCheck[]; ready: boolean }

const RELEASE_FAILED = "Couldn't open the envelope. Check your connection and hold again."

const Page = ({ children, back = true }: { children: React.ReactNode; back?: boolean }) => (
    <div className="min-h-dvh bg-pebble-lemon text-on-pebble-lemon">
        <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col gap-6 px-gutter py-6 pt-safe pb-safe">
            <div className="flex items-center justify-between">
                {back ? (
                    <Link to="/app/profile" aria-label="Back to You" className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-0.5 rounded-control pr-3 text-body font-bold">
                        <ChevronLeft aria-hidden className="size-6" />
                        <span>You</span>
                    </Link>
                ) : <span />}
                <OscarLogo size="small" decorative tone="onLemon" />
            </div>
            {children}
        </main>
    </div>
)
const Label = () => <div className="text-caption-1 font-bold tracking-[0.25em]">THE ENVELOPE</div>
const quietLink = "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-body font-bold underline underline-offset-4"

const ReleasePage = () => {
    const [load, setLoad] = useState<Load>({ state: "loading" })
    const [hold, dispatch] = useReducer(pageReducer, HOLD_IDLE)
    const [now, setNow] = useState(0)
    const [busy, setBusy] = useState(false)
    const [releaseError, setReleaseError] = useState<string | null>(null)
    const [opened, setOpened] = useState(false)
    const fired = useRef(false)

    const refresh = useCallback(async (initial: boolean) => {
        try {
            const season = await fetchCurrentSeason()
            if (!season) throw new Error("No current season")
            const status = await fetchReleaseStatus(season.id)
            const { checks, ready } = releaseChecks(status, new Date())
            setLoad({ state: "ready", seasonId: season.id, released: status.season.results_released_at != null, checks, ready })
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

    if (load.state === "loading") return <Page><Label /><div className="text-body">Loading…</div></Page>
    if (load.state === "error")
        return (
            <Page>
                <Label />
                <div role="alert" className="text-body font-bold">{load.message}</div>
                <button type="button" onClick={() => { setLoad({ state: "loading" }); void refresh(true) }} className="min-h-14 rounded-full bg-bg px-6 text-title-3 text-label">Retry</button>
                <Link to="/app/profile" className={quietLink}>Not yet</Link>
            </Page>
        )

    if (load.released || opened)
        return (
            <Page>
                <div role="status" className="space-y-4">
                    <Label />
                    <h1 className="text-display">The envelope is open</h1>
                    <p className="text-body">The winners are live for every member.</p>
                </div>
                <Link to="/app/results" className="inline-flex min-h-14 items-center justify-center rounded-full bg-bg text-title-3 text-label">See results</Link>
                <Link to="/app/profile" className={quietLink}>Back to You</Link>
            </Page>
        )

    const ready = load.ready
    const progress = holdProgress(hold, now)
    const failing = load.checks.filter((c) => !c.ok)

    const down = (pointerId: number, x: number, y: number) => ready && !busy && dispatch({ type: "down", t: performance.now(), pointerId, x, y })

    return (
        <Page>
            <div className="space-y-4 pt-4">
                <Label />
                <h1 className="text-display">Reveal the winners?</h1>
                <p className="text-title-3">There is no going back.</p>
                <p className="text-body">Every member will see every winner. This can't be undone.</p>
            </div>
            <ul className="space-y-2">
                {load.checks.map((c) => (
                    <li key={c.id} className="flex min-h-11 items-center gap-3 rounded-card bg-on-pebble-lemon/10 px-4 py-3 text-callout">
                        {c.ok ? <Check aria-hidden className="size-5 shrink-0" /> : <TriangleAlert aria-hidden className="size-5 shrink-0" />}
                        <span className="flex-1">
                            <span className="sr-only">{c.ok ? "Ready: " : "Not ready: "}</span>
                            {c.label}
                        </span>
                        {!c.ok && <Link to="/app/profile/ballots" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Go to tally</Link>}
                    </li>
                ))}
                <li className="flex min-h-11 items-center gap-3 rounded-card bg-on-pebble-lemon/10 px-4 py-3 text-callout">
                    <Check aria-hidden className="size-5 shrink-0" />Members never see vote counts
                </li>
            </ul>
            <div className="mt-auto space-y-3">
                <HoldButton
                    ready={ready}
                    busy={busy}
                    label="Hold to open the envelope"
                    busyLabel="Opening…"
                    hint={ready ? "Press and hold for 3 seconds" : `Locked until every check passes: ${failing.map((c) => c.label).join("; ")}`}
                    progress={progress}
                    onDown={down}
                    onMove={(id, x, y) => dispatch({ type: "move", pointerId: id, x, y })}
                    onUp={(id) => dispatch({ type: "up", pointerId: id })}
                    onCancel={() => dispatch({ type: "cancel" })}
                />
                {releaseError && <div role="alert" className="text-center text-callout font-bold">{releaseError}</div>}
                <div className="text-center"><Link to="/app/profile" className={quietLink}>Not yet</Link></div>
            </div>
        </Page>
    )
}

export default ReleasePage
