import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Check } from "lucide-react"
import { vibrate } from "../../ui/haptics"
import { fetchCurrentSeason } from "../../api/ballots"
import { fetchReleaseStatus, releaseSeasonResults } from "../../api/results"
import { HOLD_IDLE, holdProgress, holdReducer, type HoldEvent, type HoldState } from "../../lib/hold"
import { HoldButton } from "../../ui/HoldButton"
import { releaseChecks, type ReleaseCheck } from "../../lib/release"
import { firstFailingBallotId, winnerCount } from "../../lib/releaseView"
import { useIntroGate } from "../../ui/introContext"

const CHECK_REFRESH_MS = 30_000

// `done` is terminal in holdReducer, so a failed release needs an explicit reset to retry.
const pageReducer = (s: HoldState, e: HoldEvent | { type: "reset" }): HoldState => (e.type === "reset" ? HOLD_IDLE : holdReducer(s, e))

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; seasonId: string; released: boolean; checks: ReleaseCheck[]; ready: boolean; failingId: string | null; winners: number }

const RELEASE_FAILED = "Couldn't open the envelope. Check your connection and hold again."

const Page = ({ children }: { children: React.ReactNode }) => (
    <main className="mx-auto flex min-h-[calc(100dvh-var(--content-pb,32px))] w-full max-w-[520px] flex-col px-gutter pt-safe [@media(max-height:640px)]:gap-1">{children}</main>
)
const quietLink = "flex min-h-11 items-center justify-center rounded-control text-subhead font-bold text-pebble-sky"

type Tone = "ok" | "bad" | "info"
const DOT: Record<Tone, string> = {
    ok: "bg-pebble-lime text-on-pebble-lime",
    bad: "bg-pebble-cherry text-on-pebble-cherry",
    info: "bg-pebble-sky text-on-pebble-sky",
}
const Row = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => (
    <li className="flex items-start gap-3">
        <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-caption-1 font-bold ${DOT[tone]}`}>
            {tone === "ok" ? <Check className="size-3.5" strokeWidth={3} /> : tone === "bad" ? "!" : "i"}
        </span>
        <span className="flex-1">
            <span className="sr-only">{tone === "ok" ? "Ready: " : tone === "bad" ? "Not ready: " : ""}</span>
            {children}
        </span>
    </li>
)

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
    useIntroGate(load.state === "ready" && !load.released && !opened ? "ready" : null)
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
                <div role="status" className="my-auto space-y-4">
                    <span aria-hidden className={`grid size-12 place-items-center rounded-full ${DOT.ok}`}><Check className="size-7" strokeWidth={3} /></span>
                    <h1 className="text-large-title font-display lg:text-display">The envelope is open</h1>
                    <p className="text-body font-bold lg:text-headline">
                        {n > 0 ? `${n} ${n === 1 ? "winner is" : "winners are"} live for every member.` : "The winners are live for every member."}
                    </p>
                </div>
                <div className="pb-4">
                    <Link to="/app/results" className="flex h-14 items-center justify-center rounded-full bg-pebble-lemon text-headline text-on-pebble-lemon">See results</Link>
                    <Link to="/app/profile" className={quietLink}>Back to You</Link>
                </div>
            </Page>
        )
    }

    const ready = load.ready
    const progress = holdProgress(hold, now)
    const holding = hold.phase === "holding"
    const failing = load.checks.filter((c) => !c.ok)

    const down = (pointerId: number, x: number, y: number) => ready && !busy && dispatch({ type: "down", t: performance.now(), pointerId, x, y })
    const hint = holding
        ? "Let go to cancel."
        : ready
          ? "Press and hold for 3 seconds."
          : `Locked until ${failing.length === 1 ? "this is" : "these are"} sorted: ${failing.map((c) => c.label.toLowerCase()).join("; ")}.`

    return (
        <Page>
            <div className="my-auto space-y-5 py-4 [@media(max-height:640px)]:space-y-2 [@media(max-height:640px)]:py-2">
                <h1 className="text-large-title font-display lg:text-display [@media(max-height:640px)]:text-title-1">Reveal the winners?</h1>
                <p className="text-body font-bold lg:text-headline">Every member sees every winner. This cannot be undone.</p>
                <ul className="space-y-3 text-callout lg:text-body [@media(max-height:640px)]:space-y-1">
                    {load.checks.map((c) => <Row key={c.id} tone={c.ok ? "ok" : "bad"}>{c.label}</Row>)}
                    <Row tone="info">Members never see vote counts</Row>
                </ul>
                {failing.length > 0 && (
                    <Link to={load.failingId ? `/app/profile/ballots/${load.failingId}` : "/app/profile/ballots"} className="inline-flex min-h-11 items-center text-subhead font-bold underline underline-offset-4">
                        Go to tally
                    </Link>
                )}
            </div>
            <div className="pb-4 [@media(max-height:640px)]:pb-2">
                <HoldButton
                    ready={ready}
                    busy={busy}
                    label="Hold 3 seconds to reveal"
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
