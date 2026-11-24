import { useEffect, useState } from "react"
import { Copy } from "lucide-react"
import { fetchMemberAvatars } from "../../api/members"
import { copyText } from "../../lib/clipboard"
import { pickPair, shareText, winnerSide, type Pair } from "../../lib/labs/higherLower"
import { resolveSiteBase } from "../../lib/siteUrl"
import { useToast } from "../../ui/Toast"
import type { StatsModel } from "../../lib/statsLab"
import { Avatar } from "../../ui/Avatar"
import { Button } from "../../ui/Button"
import { Screen } from "../../ui/Screen"
import { StatsGate } from "../stats/StatsGate"
import { useStatsData } from "../stats/useStatsData"

const BEST_KEY = "jsc.lab.higherLowerBest"
const readBest = (): number => {
    try {
        return Number(window.localStorage.getItem(BEST_KEY)) || 0
    } catch {
        return 0
    }
}
const writeBest = (n: number) => {
    try {
        window.localStorage.setItem(BEST_KEY, String(n))
    } catch {
        /* not remembered */
    }
}

type Phase = "ask" | "right" | "wrong"

const COUNT_MS = 1100
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/** Counts from 0 up to `value` (ease-out) the moment it mounts, formatted like the final number. */
function CountUp({ value, fmt }: { value: number; fmt: (v: number) => string }) {
    const [shown, setShown] = useState(reducedMotion() ? value : 0)
    useEffect(() => {
        if (reducedMotion()) return
        const start = performance.now()
        let frame = 0
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / COUNT_MS)
            setShown(value * (1 - Math.pow(1 - t, 3)))
            if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [value])
    return <>{fmt(shown)}</>
}

function Game({ model, avatars }: { model: StatsModel; avatars: Record<string, string | null> }) {
    const [pair, setPair] = useState<Pair | null>(() => pickPair(Math.random, model))
    const [phase, setPhase] = useState<Phase>("ask")
    const [chosen, setChosen] = useState<"a" | "b" | null>(null)
    const [streak, setStreak] = useState(0)
    const [best, setBest] = useState(readBest)
    const [newBest, setNewBest] = useState(false)
    // the result line and Next button wait until the numbers have counted up
    const [settled, setSettled] = useState(false)
    const toast = useToast()
    const nameOf = (id: string) => model.members.find((m) => m.id === id)?.name ?? "?"

    useEffect(() => {
        if (phase === "ask") {
            setSettled(false)
            return
        }
        const t = window.setTimeout(() => setSettled(true), reducedMotion() ? 0 : COUNT_MS + 150)
        return () => window.clearTimeout(t)
    }, [phase, pair])

    if (!pair) return <p className="text-callout text-label-2">Not enough stats to play yet.</p>

    const pick = (side: "a" | "b") => {
        if (phase !== "ask") return
        setChosen(side)
        if (side === winnerSide(pair)) {
            setStreak((s) => s + 1)
            setPhase("right")
        } else {
            if (streak > best) {
                setBest(streak)
                writeBest(streak)
                setNewBest(true)
            }
            setPhase("wrong")
        }
    }
    const next = () => {
        const winner = winnerSide(pair) === "a" ? pair.a : pair.b
        setPair(pickPair(Math.random, model, { avoidKey: pair.metric.key, keep: winner }) ?? pickPair(Math.random, model, { avoidKey: pair.metric.key }))
        setPhase("ask")
        setChosen(null)
    }
    const again = () => {
        setStreak(0)
        setNewBest(false)
        setPair(pickPair(Math.random, model))
        setPhase("ask")
        setChosen(null)
    }

    const share = async () => {
        const ok = await copyText(shareText(streak, Math.max(best, streak), resolveSiteBase()))
        toast.show(ok ? "Score copied" : "Couldn't copy")
    }

    const reveal = phase !== "ask"
    const win = winnerSide(pair)
    const card = (side: "a" | "b") => {
        const id = side === "a" ? pair.a : pair.b
        const v = side === "a" ? pair.va : pair.vb
        const tone = !reveal ? "bg-surface" : side === win ? "bg-success text-on-inverse" : chosen === side ? "bg-danger text-on-inverse" : "bg-surface"
        return (
            <button
                key={side}
                type="button"
                disabled={phase !== "ask"}
                aria-label={`${nameOf(id)}${reveal ? `, ${pair.metric.fmt(v)}` : ""}`}
                onClick={() => pick(side)}
                className={`flex min-h-44 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-card p-4 text-center transition-colors duration-200 disabled:cursor-default motion-reduce:transition-none ${tone}`}
            >
                <Avatar id={id} name={nameOf(id)} src={avatars[id]} size={96} ring="pebble" decorative />
                <span className="text-headline">{nameOf(id)}</span>
                <span className="text-title-2 tabular-nums">{reveal ? <CountUp key={`${id}-${pair.metric.key}`} value={v} fmt={pair.metric.fmt} /> : "?"}</span>
            </button>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-subhead font-bold">
                <span className="tabular-nums">Streak {streak}</span>
                <span className="tabular-nums text-label-2">Best {Math.max(best, phase === "wrong" ? streak : 0)}</span>
            </div>
            <h2 className="text-center text-title-2">{pair.metric.question}</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
                {card("a")}
                <span aria-hidden className="grid place-items-center self-center text-subhead font-bold text-label-2">vs</span>
                {card("b")}
            </div>
            <p aria-live="polite" className="min-h-6 text-center text-headline">
                {!settled ? "" : phase === "right" ? "Correct!" : phase === "wrong" ? (newBest ? `Wrong. New best streak: ${streak}!` : `Wrong. You got ${streak} in a row.`) : ""}
            </p>
            {settled && phase === "right" && (
                <Button fullWidth onClick={next}>
                    Next
                </Button>
            )}
            {settled && phase === "wrong" && (
                <div className="space-y-2">
                    <Button fullWidth onClick={again}>
                        Play again
                    </Button>
                    <Button fullWidth variant="secondary" icon={<Copy aria-hidden className="size-4" />} onClick={() => void share()}>
                        Share score
                    </Button>
                </div>
            )}
        </div>
    )
}

/** Two members, one real stat: tap who has more. The winner stays for the next round. */
const HigherLowerLab = () => {
    const { load, reload } = useStatsData()
    const [avatars, setAvatars] = useState<Record<string, string | null>>({})
    useEffect(() => {
        fetchMemberAvatars().then(setAvatars).catch(() => {})
    }, [])
    return (
        <Screen title="Higher or lower" back={{ to: "/app/profile", label: "You" }}>
            <StatsGate load={load} reload={reload}>
                {({ model }) => <Game model={model} avatars={avatars} />}
            </StatsGate>
        </Screen>
    )
}

export default HigherLowerLab
