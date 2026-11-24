import { useEffect, useRef, useState } from "react"
import { Copy, Dices } from "lucide-react"
import { fetchMemberAvatars, fetchMembers } from "../../api/members"
import { copyText } from "../../lib/clipboard"
import { recordSpin } from "../../lib/labs/records"
import { MISS_LINES, PAIR_LINES, jackpotShare, outcomeOf, spinReels, type Outcome } from "../../lib/labs/slots"
import { resolveSiteBase } from "../../lib/siteUrl"
import { useToast } from "../../ui/Toast"
import type { Member } from "../../types"
import { Avatar } from "../../ui/Avatar"
import { Button } from "../../ui/Button"
import { Screen } from "../../ui/Screen"

const STOPS = [800, 1300, 1800]
const TICK = 90
const pickLine = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)]

/** Three reels of member photos. Match all three for a jackpot. No money involved. */
const SlotsLab = () => {
    const [members, setMembers] = useState<Member[]>([])
    const [avatars, setAvatars] = useState<Record<string, string | null>>({})
    const [faces, setFaces] = useState<[number, number, number]>([0, 1, 2])
    const [spinning, setSpinning] = useState<[boolean, boolean, boolean]>([false, false, false])
    const [result, setResult] = useState<{ outcome: Outcome; line: string } | null>(null)
    const [stats, setStats] = useState({ spins: 0, jackpots: 0 })
    const timers = useRef<number[]>([])
    const toast = useToast()
    const stopped = useRef<[boolean, boolean, boolean]>([true, true, true])
    const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    useEffect(() => {
        Promise.all([fetchMembers(), fetchMemberAvatars().catch(() => ({}) as Record<string, string | null>)])
            .then(([m, a]) => {
                setMembers(m)
                setAvatars(a)
                setFaces([0, Math.min(1, m.length - 1), Math.min(2, m.length - 1)])
            })
            .catch((e) => console.error(e))
        return () => timers.current.forEach((t) => window.clearTimeout(t))
    }, [])

    const busy = spinning.some(Boolean)
    const pull = () => {
        if (busy || members.length === 0) return
        const target = spinReels(Math.random, members.length)
        setResult(null)
        const finish = () => {
            setFaces(target)
            setSpinning([false, false, false])
            const outcome = outcomeOf(target)
            setResult({ outcome, line: outcome === "jackpot" ? `JACKPOT! ${members[target[0]].name} x3` : outcome === "pair" ? pickLine(PAIR_LINES) : pickLine(MISS_LINES) })
            setStats((s) => ({ spins: s.spins + 1, jackpots: s.jackpots + (outcome === "jackpot" ? 1 : 0) }))
            recordSpin(outcome === "jackpot")
        }
        if (reduced) return finish()
        setSpinning([true, true, true])
        stopped.current = [false, false, false]
        const tick = window.setInterval(() => setFaces((f) => f.map((v, i) => (stopped.current[i] ? v : Math.floor(Math.random() * members.length))) as [number, number, number]), TICK)
        timers.current.push(tick)
        STOPS.forEach((ms, i) =>
            timers.current.push(
                window.setTimeout(() => {
                    stopped.current[i] = true
                    setSpinning((s) => s.map((v, j) => (j === i ? false : v)) as [boolean, boolean, boolean])
                    setFaces((f) => f.map((v, j) => (j === i ? target[i] : v)) as [number, number, number])
                    if (i === STOPS.length - 1) {
                        window.clearInterval(tick)
                        finish()
                    }
                }, ms),
            ),
        )
    }

    const jackpot = result?.outcome === "jackpot"
    const share = async () => {
        const name = members[faces[0]]?.name
        if (!name) return
        toast.show((await copyText(jackpotShare(name, stats.spins, stats.jackpots, resolveSiteBase()))) ? "Jackpot copied" : "Couldn't copy")
    }
    return (
        <Screen title="Slot machine" back={{ to: "/app/profile", label: "You" }}>
            <div className="space-y-4">
                <p className="text-callout text-label-2">Match three faces for a jackpot. No money, just glory.</p>
                <div className={`rounded-card p-4 transition-colors duration-300 motion-reduce:transition-none ${jackpot ? "bg-pebble-lemon" : "bg-surface"}`}>
                    <div className="flex items-center justify-center gap-3">
                        {faces.map((f, i) => {
                            const m = members[f]
                            return (
                                <div key={i} className={`grid size-24 place-items-center overflow-hidden rounded-card bg-surface-2 ${spinning[i] ? "opacity-70" : ""}`}>
                                    {m ? <Avatar id={m.id} name={m.name} src={avatars[m.id]} size={72} ring="pebble" decorative /> : <span className="text-title-1">?</span>}
                                </div>
                            )
                        })}
                    </div>
                    <p aria-live="polite" className={`mt-4 min-h-6 text-center text-headline ${jackpot ? "text-on-pebble-lemon" : ""}`}>
                        {busy ? "Spinning…" : (result?.line ?? "Pull the lever.")}
                    </p>
                </div>
                <Button fullWidth size="lg" icon={<Dices aria-hidden className="size-5" />} disabled={busy || members.length === 0} onClick={pull}>
                    {busy ? "Spinning…" : "Spin"}
                </Button>
                {jackpot && !busy && (
                    <Button fullWidth variant="secondary" icon={<Copy aria-hidden className="size-4" />} onClick={() => void share()}>
                        Share jackpot
                    </Button>
                )}
                <p className="text-center text-footnote text-label-2">
                    {stats.spins} {stats.spins === 1 ? "spin" : "spins"} · {stats.jackpots} {stats.jackpots === 1 ? "jackpot" : "jackpots"}
                </p>
            </div>
        </Screen>
    )
}

export default SlotsLab
