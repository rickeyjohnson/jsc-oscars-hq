import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { fetchCurrentSeason } from "../../api/ballots"
import { fetchReleaseStatus, releaseSeasonResults } from "../../api/results"
import { HOLD_IDLE, holdProgress, holdReducer, type HoldEvent, type HoldState } from "../../lib/hold"
import { releaseChecks, type ReleaseCheck } from "../../lib/release"

const KEY_POINTER_ID = -1 // never collides with real pointer ids
const CHECK_REFRESH_MS = 30_000

// `done` is terminal in holdReducer, so a failed release needs an explicit reset to retry.
const pageReducer = (s: HoldState, e: HoldEvent | { type: "reset" }): HoldState => (e.type === "reset" ? HOLD_IDLE : holdReducer(s, e))

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; seasonId: string; released: boolean; checks: ReleaseCheck[]; ready: boolean }

const Page = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-zinc-900 min-h-screen text-[#fffadd] px-6 py-10">
        <main className="mx-auto max-w-md space-y-6">{children}</main>
    </div>
)
const Label = ({ children }: { children: React.ReactNode }) => <div className="text-xs tracking-[0.25em] text-amber-100/60">{children}</div>

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

    // release exactly once when the hold completes
    const seasonId = load.state === "ready" ? load.seasonId : null
    useEffect(() => {
        if (hold.phase !== "done" || fired.current || !seasonId) return
        fired.current = true
        setBusy(true)
        setReleaseError(null)
        releaseSeasonResults(seasonId)
            .then(() => setOpened(true))
            .catch((e) => {
                setReleaseError(e instanceof Error ? e.message : "Release failed")
                fired.current = false
                dispatch({ type: "reset" })
            })
            .finally(() => setBusy(false))
    }, [hold.phase, seasonId])

    if (load.state === "loading") return <Page><Label>THE ENVELOPE</Label><div className="text-amber-100/60">Loading...</div></Page>
    if (load.state === "error")
        return (
            <Page>
                <Label>THE ENVELOPE</Label>
                <div className="text-red-400">{load.message}</div>
                <button onClick={() => { setLoad({ state: "loading" }); void refresh(true) }} className="bg-amber-100 text-zinc-900 font-bold rounded-full h-12 px-6">Retry</button>
                <div><Link to="/app/profile" className="text-amber-100/60">← Not yet, take me back</Link></div>
            </Page>
        )

    if (load.released || opened)
        return (
            <Page>
                <Label>THE ENVELOPE IS OPEN</Label>
                <h1 className="text-2xl font-black">The winners are live for every member.</h1>
                <Link to="/app/results" className="block text-center bg-amber-100 text-zinc-900 font-bold rounded-full h-12 leading-[3rem]">See the results</Link>
                <div className="text-center"><Link to="/app/profile" className="text-amber-100/60">Back to profile</Link></div>
            </Page>
        )

    const ready = load.ready
    const progress = holdProgress(hold, now)
    const failing = load.checks.filter((c) => !c.ok)

    const down = (pointerId: number, x: number, y: number) => ready && !busy && dispatch({ type: "down", t: performance.now(), pointerId, x, y })

    return (
        <Page>
            <Label>THE ENVELOPE</Label>
            <h1 className="text-2xl font-black">Reveal the winners?</h1>
            <p className="text-amber-100/80">
                Every member will see every winner and every podium. <b className="text-[#fffadd]">There is no going back.</b>
            </p>
            <ul className="space-y-2">
                {load.checks.map((c) => (
                    <li key={c.id} className="bg-[#27272a] rounded-xl px-4 py-3 flex gap-3 items-center text-sm">
                        <span className={c.ok ? "text-green-300" : "text-amber-400"}>{c.ok ? "✓" : "✕"}</span>
                        {c.label}
                    </li>
                ))}
                <li className="bg-[#27272a] rounded-xl px-4 py-3 flex gap-3 items-center text-sm">
                    <span className="text-green-300">✓</span>Members never see vote counts
                </li>
            </ul>
            <HoldButton
                ready={ready}
                busy={busy}
                progress={progress}
                onDown={down}
                onMove={(id, x, y) => dispatch({ type: "move", pointerId: id, x, y })}
                onUp={(id) => dispatch({ type: "up", pointerId: id })}
                onCancel={() => dispatch({ type: "cancel" })}
            />
            {!ready && (
                <ul className="text-sm text-amber-400 text-center space-y-1">
                    {failing.map((c) => <li key={c.id}>{c.label}</li>)}
                </ul>
            )}
            {releaseError && <div className="text-red-400 text-center text-sm">{releaseError}</div>}
            <div className="text-center text-xs text-amber-100/60">Press and hold for 3 seconds</div>
            <div className="text-center"><Link to="/app/profile" className="text-amber-100/60">← Not yet, take me back</Link></div>
        </Page>
    )
}

type HoldButtonProps = {
    ready: boolean
    busy: boolean
    progress: number
    onDown: (pointerId: number, x: number, y: number) => void
    onMove: (pointerId: number, x: number, y: number) => void
    onUp: (pointerId: number) => void
    onCancel: () => void
}
const HoldButton = ({ ready, busy, progress, onDown, onMove, onUp, onCancel }: HoldButtonProps) => (
    <button
        type="button"
        aria-disabled={!ready || busy}
        className={`relative overflow-hidden w-full h-12 rounded-full bg-[#27272a] border border-[#fffadd]/30 text-[#fffadd] font-bold select-none ${ready ? "" : "opacity-50"}`}
        style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId)
            onDown(e.pointerId, e.clientX, e.clientY)
        }}
        onPointerMove={(e) => onMove(e.pointerId, e.clientX, e.clientY)}
        onPointerUp={(e) => onUp(e.pointerId)}
        onPointerCancel={onCancel}
        onPointerLeave={onCancel}
        onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault()
                onDown(KEY_POINTER_ID, 0, 0)
            }
        }}
        onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") onUp(KEY_POINTER_ID)
        }}
        onBlur={onCancel}
    >
        <span className="absolute inset-y-0 left-0 bg-[#fffadd]/20 pointer-events-none" style={{ width: `${progress * 100}%` }} />
        <span className="relative">{busy ? "Releasing…" : "Hold to release"}</span>
    </button>
)

export default ReleasePage
