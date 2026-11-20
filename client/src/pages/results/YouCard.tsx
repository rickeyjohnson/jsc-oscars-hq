import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Card } from "../../ui/Card"
import { Chip } from "../../ui/Chip"
import { PEBBLE_CLASS, RESULTS_EXCLUDE, pebbleAt } from "../../ui/logic/pebble"
import type { LeaderRow, MyCategory } from "../../lib/leaderboard"

export type You = { name: string; row: LeaderRow; won: MyCategory[]; nominatedOnly: MyCategory[] }

export function YouCard({ you }: { you: You }) {
    const [open, setOpen] = useState(false)
    const stats = [
        { label: "Wins", value: String(you.row.wins) },
        { label: "Nominations", value: String(you.row.noms) },
        { label: "Win rate", value: `${you.row.rate}%` },
    ]
    return (
        <Card as="section">
            <h2 className="text-title-3">{`You (${you.name})`}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {stats.map((t, i) => {
                    const peb = PEBBLE_CLASS[pebbleAt(i, { exclude: RESULTS_EXCLUDE })]
                    return (
                        <div key={t.label} className={`rounded-control py-3 ${peb.bg} ${peb.text}`}>
                            <div className="font-display text-title-1">{t.value}</div>
                            <div className="text-caption-1">{t.label}</div>
                        </div>
                    )
                })}
            </div>
            <h3 className="mt-4 text-footnote uppercase tracking-wider text-label-2">Categories you won</h3>
            {you.won.length === 0 ? (
                <p className="mt-2 text-callout text-label-2">No wins this season.</p>
            ) : (
                <ul className="mt-2 list-none space-y-2 p-0">
                    {you.won.map((c) => (
                        <li key={c.category_id} className="flex min-h-11 items-center gap-2 rounded-control bg-surface-2 px-3 py-2 text-subhead">
                            <span className="min-w-0 flex-1 break-words">{c.label}</span>
                            <Chip tone="gold">Winner</Chip>
                        </li>
                    ))}
                </ul>
            )}
            {you.nominatedOnly.length > 0 && (
                <div className="mt-3">
                    <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpen((v) => !v)}
                        className="flex min-h-11 w-full items-center justify-between text-footnote uppercase tracking-wider text-label-2"
                    >
                        {`Nominated, didn't win · ${you.nominatedOnly.length}`}
                        <ChevronDown aria-hidden className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                        <ul className="mt-1 list-none space-y-2 p-0">
                            {you.nominatedOnly.map((c) => (
                                <li key={c.category_id} className="rounded-control bg-surface-2 px-3 py-2 text-subhead break-words">
                                    {c.label}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </Card>
    )
}
