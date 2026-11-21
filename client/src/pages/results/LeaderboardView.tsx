import { useState } from "react"
import { Medal } from "lucide-react"
import { Podium } from "../../ui/Podium"
import { Avatar } from "../../ui/Avatar"
import { PEBBLE_EDGE } from "../../ui/logic/pebble"
import { Chip } from "../../ui/Chip"
import { EmptyState } from "../../ui/EmptyState"
import { ordinal } from "../../lib/resultsView"
import type { LeaderRow } from "../../lib/leaderboard"
import { YouCard, type You } from "./YouCard"

const VISIBLE = 5
const rankLabel = (r: LeaderRow) => (r.tied ? `T${r.rank}` : String(r.rank))
const winsText = (n: number) => `${n} ${n === 1 ? "win" : "wins"}`

export function LeaderboardView({ seasonName, rows, avatars, you }: { seasonName: string; rows: LeaderRow[]; avatars: Record<string, string | null>; you: You | null }) {
    const [showAll, setShowAll] = useState(false)
    if (rows.length === 0) return <EmptyState icon={Medal} title="Stats appear after the envelope opens." />
    const hasWins = rows[0].wins > 0
    const top = hasWins ? rows.slice(0, 3) : []
    const rest = hasWins ? rows.slice(3) : rows
    const shown = showAll ? rest : rest.slice(0, VISIBLE)
    const hidden = rest.length - shown.length

    return (
        <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-2 min-[1024px]:items-start">
            <section className={`rounded-card border-l-4 bg-surface p-4 ${PEBBLE_EDGE.lime}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-title-3">Season leaders</h2>
                    <Chip>{seasonName}</Chip>
                </div>
                {!hasWins && <p className="mt-3 text-callout text-label-2">No wins yet.</p>}
                {top.length > 0 && (
                    <div className="mt-4">
                        <Podium
                            variant="hero"
                            animate
                            faceRing="pebble"
                            items={top.map((r, i) => ({
                                key: r.member_id,
                                slot: (i + 1) as 1 | 2 | 3,
                                name: r.name,
                                sub: winsText(r.wins),
                                tag: r.tied ? `tied ${ordinal(r.rank)}` : null,
                                avatarUrl: avatars[r.member_id] ?? null,
                            }))}
                        />
                    </div>
                )}
                {rest.length > 0 && (
                    <>
                        <div aria-hidden="true" className="mt-4 text-right text-caption-1 text-label-2">
                            Wins · Nominations · Win %
                        </div>
                        <ol start={hasWins ? 4 : 1} className="mt-1 list-none divide-y divide-sep p-0">
                            {shown.map((r) => (
                                <li key={r.member_id} className="flex min-h-11 items-center gap-3 py-2 text-subhead">
                                    <span className="w-7 shrink-0 text-footnote text-label-2">
                                        <span aria-hidden="true">{rankLabel(r)}</span>
                                        <span className="sr-only">{r.tied ? `tied ${ordinal(r.rank)}` : ordinal(r.rank)}: </span>
                                    </span>
                                    <Avatar id={r.member_id} name={r.name} src={avatars[r.member_id] ?? null} size={32} ring="pebble" decorative />
                                    <span className="min-w-0 flex-1 break-words">{r.name}</span>
                                    <span aria-hidden="true" className="whitespace-nowrap text-footnote text-label-2">{`${r.wins} · ${r.noms} · ${r.rate}%`}</span>
                                    <span className="sr-only">{`${r.wins} ${r.wins === 1 ? "win" : "wins"}, ${r.noms} ${r.noms === 1 ? "nomination" : "nominations"}, ${r.rate} percent`}</span>
                                </li>
                            ))}
                        </ol>
                        {rest.length > VISIBLE && (
                            <button type="button" className="mt-1 min-h-11 text-footnote font-bold text-accent" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                                {showAll ? "Show fewer" : `Show ${hidden} more`}
                            </button>
                        )}
                    </>
                )}
            </section>
            {you && <YouCard you={you} />}
        </div>
    )
}
