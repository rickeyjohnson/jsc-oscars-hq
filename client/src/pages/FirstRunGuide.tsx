import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"
import type { Season } from "../types"
import { Button } from "../ui/Button"
import { Sheet } from "../ui/Sheet"
import { SheetActions } from "../ui/SheetActions"
import { ceremonyDate, ceremonyTime } from "./home/format"

const STEPS = 3

function ceremonyLine(season: Season | null): string {
    if (!season?.ceremony_at) return "The ceremony date is coming soon. We'll show it on Home."
    const at = new Date(season.ceremony_at)
    const where = season.location ? ` at ${season.location}` : ""
    return `Join us at the ceremony on ${ceremonyDate(at)} at ${ceremonyTime(at)}${where}.`
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="w-full shrink-0 snap-center px-1">
            <h3 className="text-title-2 font-display">{title}</h3>
            <div className="mt-3 space-y-3 text-callout text-label-2">{children}</div>
        </div>
    )
}

const Tip = ({ children }: { children: React.ReactNode }) => (
    <li className="flex gap-2">
        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-pebble-lemon" />
        <span>{children}</span>
    </li>
)

/** A short three-card tour for new members. Reopened from Settings, shown once after the first Home. */
export function FirstRunGuide({ open, onClose, season }: { open: boolean; onClose: () => void; season: Season | null }) {
    const [index, setIndex] = useState(0)
    // Opening again starts on the first card.
    const [wasOpen, setWasOpen] = useState(open)
    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) setIndex(0)
    }
    const track = useRef<HTMLDivElement>(null)
    const reduce = useReducedMotion()
    const last = index === STEPS - 1

    const go = (to: number) => setIndex(Math.max(0, Math.min(STEPS - 1, to)))
    // Next/Back/keys move the track to the current card. A swipe that already landed there needs no scroll.
    useEffect(() => {
        const el = track.current
        if (!open || !el || typeof el.scrollTo !== "function") return
        if (Math.abs(el.scrollLeft - index * el.clientWidth) > el.clientWidth / 2) el.scrollTo({ left: index * el.clientWidth, behavior: reduce ? "auto" : "smooth" })
    }, [open, index, reduce])
    // Swiping scrolls the track; the card it settles on becomes the current one.
    const onScroll = () => {
        const el = track.current
        if (el && el.clientWidth > 0) setIndex(Math.max(0, Math.min(STEPS - 1, Math.round(el.scrollLeft / el.clientWidth))))
    }
    // Arrow keys work wherever focus is inside the dialog (it opens focused on the title).
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") setIndex((i) => Math.min(STEPS - 1, i + 1))
            else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1))
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open])
    return (
        <Sheet open={open} onClose={onClose} title="How it works" fit initialFocus="title">
            <div className="mx-auto w-full max-w-[480px]">
                <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ touchAction: "pan-x pan-y" }}>
                        <GuideSlide active={index === 0} n={1}>
                            <Card title="What this is">
                                <p>Every semester we hand out our own Oscars. Vote for your friends in fun categories, then watch the winners get revealed.</p>
                                <p>{ceremonyLine(season)}</p>
                            </Card>
                        </GuideSlide>
                        <GuideSlide active={index === 1} n={2}>
                            <Card title="How voting works">
                                <ul className="list-none space-y-2 p-0">
                                    <Tip>You get one category per page. Tap a nominee to vote.</Tip>
                                    <Tip>Some nominees are groups. You can't vote for yourself or a group you're in.</Tip>
                                    <Tip>Skip a category and come back later.</Tip>
                                    <Tip>Change your votes any time until the ballot closes.</Tip>
                                    <Tip>Submit when you're done.</Tip>
                                </ul>
                            </Card>
                        </GuideSlide>
                        <GuideSlide active={index === 2} n={3}>
                            <Card title="Results and MYOC">
                                <p>The committee reveals the winners on ceremony night. After that you can see your own stats.</p>
                                <p>Got an idea for a category? Suggest it in Settings, under MYOC.</p>
                            </Card>
                        </GuideSlide>
                </div>
                <p role="status" className="sr-only">
                    Step {index + 1} of {STEPS}
                </p>
                <div aria-hidden className="my-5 flex justify-center gap-2">
                    {Array.from({ length: STEPS }, (_, i) => (
                        <span key={i} data-testid="guide-dot" data-active={i === index || undefined} className={`h-2 rounded-full transition-all motion-reduce:transition-none ${i === index ? "w-6 bg-accent" : "w-2 bg-label-3"}`} />
                    ))}
                </div>
                <SheetActions>
                    <Button variant="primary" size="lg" fullWidth onClick={last ? onClose : () => go(index + 1)}>
                        {last ? "Got it" : "Next"}
                    </Button>
                    {index === 0 ? (
                        <Button variant="plain" size="lg" fullWidth onClick={onClose}>
                            Skip
                        </Button>
                    ) : (
                        <Button variant="plain" size="lg" fullWidth onClick={() => go(index - 1)}>
                            Back
                        </Button>
                    )}
                </SheetActions>
            </div>
        </Sheet>
    )
}

function GuideSlide({ active, n, children }: { active: boolean; n: number; children: React.ReactNode }) {
    return (
        <div role="group" aria-roledescription="slide" aria-label={`${n} of ${STEPS}`} inert={!active} className="flex w-full shrink-0 snap-center">
            {children}
        </div>
    )
}
