import { useEffect, useMemo, useState } from "react"
import { countdownView } from "./logic/countdown"

/** `onColor`: smaller tile on a colored card (inherits the card's ink instead of dimmed label colors). */
export function Countdown({ target, onColor = false }: { target: Date | null; onColor?: boolean }) {
    const [now, setNow] = useState(() => new Date())
    const ms = target?.getTime() ?? null
    const t = useMemo(() => (ms === null ? null : new Date(ms)), [ms])
    const view = countdownView(t, now)
    const running = view.state === "scheduled" || view.state === "today"

    useEffect(() => {
        if (!running) return
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [running])

    if (view.state === "none") return <p className="text-title-1 font-display">Date coming soon</p>
    if (view.state === "live") return <p className="text-title-1 font-display">It's Oscar night</p>
    if (view.state === "today") return <p className="text-title-1 font-display">Tonight at {view.timeLabel}</p>
    return (
        <div role="timer" aria-live="off" aria-label={view.ariaLabel}>
            <p aria-hidden className="flex flex-wrap items-baseline gap-x-2 font-display tabular-nums">
                <span className={onColor ? "text-title-1" : "text-title-1 sm:text-display"}>{view.main}</span>
                <span className={onColor ? "text-title-3" : "text-title-2 text-label-2"}>{view.seconds}</span>
            </p>
            <p aria-hidden className={`mt-1 text-footnote ${onColor ? "" : "text-label-2"}`}>{view.dateLabel}</p>
        </div>
    )
}
