import { useEffect, useMemo, useRef, useState } from "react"
import { useUserData } from "../../context/UserContenxt"
import { wrappedSlides } from "../../lib/wrapped"
import { Screen } from "../../ui/Screen"
import { EmptyState } from "../../ui/EmptyState"
import { Sparkles } from "lucide-react"
import { StatsGate } from "./StatsGate"
import { useStatsData } from "./useStatsData"
import type { StatsModel } from "../../lib/statsLab"

// Literal class names so Tailwind sees them; each slide takes the next colour.
const FACES = [
    "bg-pebble-lemon text-on-pebble-lemon",
    "bg-pebble-grape text-on-pebble-grape",
    "bg-pebble-lime text-on-pebble-lime",
    "bg-pebble-sky text-on-pebble-sky",
    "bg-pebble-cherry text-on-pebble-cherry",
    "bg-pebble-tangerine text-on-pebble-tangerine",
    "bg-pebble-strawberry text-on-pebble-strawberry",
]

function Wrapped({ model, memberId }: { model: StatsModel; memberId: string }) {
    const [k, setK] = useState(model.sems.length - 1)
    const [at, setAt] = useState(0)
    const rail = useRef<HTMLDivElement | null>(null)
    const slides = useMemo(() => wrappedSlides(model, memberId, k), [model, memberId, k])
    useEffect(() => {
        setAt(0)
        rail.current?.scrollTo({ left: 0 })
    }, [k])
    const onScroll = () => {
        const el = rail.current
        if (el && el.clientWidth > 0) setAt(Math.round(el.scrollLeft / el.clientWidth))
    }
    return (
        <div className="mx-auto max-w-md space-y-4">
            <div role="group" aria-label="Season" className="flex flex-wrap gap-2">
                {model.sems.map((s, i) => (
                    <button key={s.label} type="button" aria-pressed={i === k} onClick={() => setK(i)} className={`min-h-11 cursor-pointer rounded-full px-4 text-subhead font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${i === k ? "bg-inverse text-on-inverse" : "bg-fill text-label"}`}>
                        {s.label}
                    </button>
                ))}
            </div>
            <div ref={rail} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto rounded-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" tabIndex={0} aria-label={`${model.sems[k].label} Wrapped, swipe through`}>
                {slides.map((s, i) => (
                    <section key={`${k}-${s.key}`} aria-label={s.kicker} className={`grid aspect-[4/5] w-full shrink-0 snap-center content-center justify-items-center gap-3 p-8 text-center ${FACES[(k + i) % FACES.length]}`}>
                        <p className="text-subhead font-bold">{s.kicker}</p>
                        <p className="font-display text-stat leading-none tabular-nums">{s.big}</p>
                        <p className="max-w-[16rem] text-headline">{s.line}</p>
                    </section>
                ))}
            </div>
            <div className="flex justify-center gap-1.5" aria-hidden>
                {slides.map((s, i) => (
                    <span key={s.key} className={`size-2 rounded-full ${i === at ? "bg-inverse" : "bg-fill"}`} />
                ))}
            </div>
            <p className="text-center text-footnote text-label-2">Swipe for the next one. Only you see your Wrapped.</p>
        </div>
    )
}

/** A swipeable recap of any past season, from the stats on file. */
export default function WrappedPage() {
    const { member } = useUserData()
    const { load, reload } = useStatsData()
    return (
        <Screen title="Wrapped" back={{ to: "/app/profile", label: "You" }}>
            {!member ? (
                <EmptyState icon={Sparkles} title="Claim your name" body="Wrapped is built from your nominations." />
            ) : (
                <StatsGate load={load} reload={reload}>
                    {({ model }) => <Wrapped model={model} memberId={member.id} />}
                </StatsGate>
            )}
        </Screen>
    )
}
