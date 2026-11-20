import { useLayoutEffect, useRef, useState } from "react"
import type { DashState } from "../lib/voting"
import { dashAriaLabel, dashClass, progressLabel, segmentsTappable } from "./logic/progress"

export function ProgressStrip({
    states,
    labels,
    orientation = "horizontal",
    onJump,
    onOpenJump,
}: {
    states: DashState[]
    labels: string[]
    orientation?: "horizontal" | "vertical"
    onJump(i: number): void
    onOpenJump(): void
}) {
    const ref = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(0)
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => setWidth(el.clientWidth)
        measure()
        if (typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const vertical = orientation === "vertical"
    const voted = states.filter((s) => s.voted).length
    const tappable = vertical || segmentsTappable(width, states.length)
    const flow = vertical ? "flex-col items-center h-full" : "items-center w-full"

    if (!tappable) {
        return (
            <div ref={ref} className="w-full">
                <button type="button" aria-label={progressLabel(voted, states.length)} onClick={onOpenJump} className="flex min-h-11 w-full cursor-pointer items-center gap-0.5">
                    {states.map((s, i) => (
                        <span key={i} className="flex flex-1 items-center">
                            <span className={dashClass(s, "horizontal")} />
                        </span>
                    ))}
                </button>
            </div>
        )
    }
    return (
        <div ref={ref} className={`flex ${vertical ? "h-full" : "w-full"}`}>
            <div className={`flex gap-0.5 ${flow}`} role="group" aria-label={`${voted} of ${states.length} voted`}>
                {states.map((s, i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={dashAriaLabel(i, labels[i] ?? "", s)}
                        aria-current={s.current ? "step" : undefined}
                        onClick={() => onJump(i)}
                        className={`flex cursor-pointer items-center justify-center ${vertical ? "min-w-11 flex-1" : "min-h-11 flex-1"}`}
                    >
                        <span className={dashClass(s, orientation)} />
                    </button>
                ))}
            </div>
        </div>
    )
}
