import { useEffect, useRef, useState, type ReactNode } from "react"
import { useReducedMotion } from "motion/react"
import { Button } from "./Button"
import { Sheet } from "./Sheet"
import { SheetActions } from "./SheetActions"

export type IntroSlide = { title: string; content: ReactNode }

export const Tip = ({ children }: { children: ReactNode }) => (
    <li className="flex gap-2">
        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-pebble-lemon" />
        <span>{children}</span>
    </li>
)

/** The shared swipe stepper behind the welcome guide and every feature intro: cards, dots, Next/Back/Skip, one Close. */
export function IntroSheet({ open, onClose, title, slides }: { open: boolean; onClose: () => void; title: string; slides: IntroSlide[] }) {
    const steps = slides.length
    const [index, setIndex] = useState(0)
    // Opening again starts on the first card.
    const [wasOpen, setWasOpen] = useState(open)
    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) setIndex(0)
    }
    const track = useRef<HTMLDivElement>(null)
    const reduce = useReducedMotion()
    const last = index === steps - 1
    const clamp = (n: number) => Math.max(0, Math.min(steps - 1, n))

    // Next/Back/keys move the track to the current card. A swipe that already landed there needs no scroll.
    useEffect(() => {
        const el = track.current
        if (!open || !el || typeof el.scrollTo !== "function") return
        if (Math.abs(el.scrollLeft - index * el.clientWidth) > el.clientWidth / 2) el.scrollTo({ left: index * el.clientWidth, behavior: reduce ? "auto" : "smooth" })
    }, [open, index, reduce])
    // Swiping scrolls the track; the card it settles on becomes the current one.
    const onScroll = () => {
        const el = track.current
        if (el && el.clientWidth > 0) setIndex(clamp(Math.round(el.scrollLeft / el.clientWidth)))
    }
    // Arrow keys work wherever focus is inside the dialog (it opens focused on the title).
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") setIndex((i) => Math.min(steps - 1, i + 1))
            else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1))
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open, steps])

    return (
        <Sheet open={open} onClose={onClose} title={title} fit initialFocus="title">
            <div className="mx-auto w-full max-w-[480px]">
                <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ touchAction: "pan-x pan-y" }}>
                    {slides.map((s, i) => (
                        <div key={s.title} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${steps}`} inert={i !== index} className="flex w-full shrink-0 snap-center">
                            <div className="w-full shrink-0 snap-center px-1">
                                <h3 className="text-title-2 font-display">{s.title}</h3>
                                <div className="mt-3 space-y-3 text-callout text-label-2">{s.content}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <p role="status" className="sr-only">
                    Step {index + 1} of {steps}
                </p>
                <div aria-hidden className="my-5 flex justify-center gap-2">
                    {slides.map((s, i) => (
                        <span key={s.title} data-testid="guide-dot" data-active={i === index || undefined} className={`h-2 rounded-full transition-all motion-reduce:transition-none ${i === index ? "w-6 bg-accent" : "w-2 bg-label-3"}`} />
                    ))}
                </div>
                <SheetActions>
                    <Button variant="primary" size="lg" fullWidth onClick={last ? onClose : () => setIndex(clamp(index + 1))}>
                        {last ? "Got it" : "Next"}
                    </Button>
                    {index === 0 ? (
                        steps > 1 && (
                            <Button variant="plain" size="lg" fullWidth onClick={onClose}>
                                Skip
                            </Button>
                        )
                    ) : (
                        <Button variant="plain" size="lg" fullWidth onClick={() => setIndex(clamp(index - 1))}>
                            Back
                        </Button>
                    )}
                </SheetActions>
            </div>
        </Sheet>
    )
}
