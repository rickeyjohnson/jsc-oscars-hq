import { Trophy } from "lucide-react"
import { useEffect, useState } from "react"
import { countdownParts } from "../lib/time"
import type { Season } from "../types"

const Countdown = ({ season }: { season: Season | null }) => {
    const [now, setNow] = useState(() => new Date())

    const ceremony = season?.ceremony_at ? new Date(season.ceremony_at) : null
    const parts = ceremony ? countdownParts(ceremony, now) : null
    const running = parts !== null

    useEffect(() => {
        if (!running) return
        const timer = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(timer)
    }, [running])
    const cells = parts
        ? [
              { value: parts.days, label: "DAYS" },
              { value: parts.hours, label: "HRS" },
              { value: parts.minutes, label: "MIN" },
              { value: parts.seconds, label: "SEC" },
          ]
        : []

    return (
        <div className="bg-gradient-to-br from-amber-100/10 to-amber-100/5 border border-amber-100/20 rounded-3xl p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-amber-100" />
                <h2 className="text-2xl font-bold text-amber-100 font-sans">{season ? season.name : "JSC Oscars"}</h2>
            </div>
            <div className="grid grid-cols-4 gap-1 justify-between max-w-md mx-auto md:gap-4">
                {parts ? (
                    cells.map((c) => (
                        <div key={c.label} className="bg-zinc-900/50 rounded-2xl p-4 border border-amber-100/10 overflow-hidden text-ellipsis">
                            <div className="text-3xl sm:text-4xl font-black text-amber-100">{c.value}</div>
                            <div className="text-xs text-amber-100/60 mt-1">{c.label}</div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-4 text-amber-100">{ceremony ? "It's Oscar Night!" : "No ceremony scheduled yet"}</div>
                )}
            </div>
            {ceremony && (
                <p className="text-sm text-amber-100/60 mt-4">
                    {ceremony.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} •{" "}
                    {ceremony.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </p>
            )}
        </div>
    )
}

export default Countdown
