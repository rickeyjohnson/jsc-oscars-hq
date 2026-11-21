import type { Step } from "../../lib/ballotFlow"

// Draft > Open > Closed > Tiebreak (dashed "if needed") > Decided > Released.
export function Stepper({ steps }: { steps: Step[] }) {
    return (
        <ol aria-label="Progress" className="my-2 flex">
            {steps.map((s, i) => {
                const lit = s.state === "done" || s.state === "cur"
                const dot =
                    s.state === "skip"
                        ? "border-2 border-dashed border-label-3"
                        : s.state === "cur"
                          ? "bg-label ring-2 ring-label ring-offset-2 ring-offset-bg"
                          : s.state === "done"
                            ? "bg-label"
                            : "bg-surface-2"
                return (
                    <li key={s.label} aria-current={s.state === "cur" ? "step" : undefined} className={`relative flex-1 text-center text-caption-2 ${s.state === "cur" ? "font-bold text-label" : lit ? "text-label" : "text-label-2"}`}>
                        {i > 0 && <span aria-hidden className={`absolute left-[-50%] right-1/2 top-2 h-0.5 ${s.state === "skip" ? "border-t-2 border-dashed border-label-3" : lit ? "bg-label" : "bg-strip-off"}`} />}
                        <span aria-hidden className={`relative z-10 mx-auto mb-1.5 flex size-4 items-center justify-center rounded-full text-on-inverse ${dot}`}>
                            {s.state === "done" && <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5l2.2 2.2L9.5 3.5" /></svg>}
                        </span>
                        {s.label}
                        {s.state === "skip" && <span className="block text-label-2">if needed</span>}
                    </li>
                )
            })}
        </ol>
    )
}
