import { useMemo } from "react"
import { Podium } from "../../ui/Podium"
import { MemberAvatar } from "../../ui/MemberAvatar"
import { useMemberDirectory } from "../../ui/useMemberDirectory"
import { memberFaces } from "../../lib/memberAvatar"
import { ordinal } from "../../lib/resultsView"
import { PEBBLE_EDGE } from "../../ui/logic/pebble"
import { NO_RATE_LABEL, rateText, type PastLeaderRow } from "../../lib/pastStats"

const winsText = (n: number) => `${n} ${n === 1 ? "win" : "wins"}`
const rankLabel = (r: PastLeaderRow) => (r.tied ? `T${r.rank}` : String(r.rank))

/** Previous Oscars leaderboard: podium for the top 3 by wins, then everyone else with wins / noms / win % right-aligned. */
export function PastLeaderboard({ title, rows }: { title: string; rows: PastLeaderRow[] }) {
    const dir = useMemberDirectory()
    const faces = useMemo(() => memberFaces(dir), [dir])
    const top = rows.filter((r) => r.wins > 0).slice(0, 3)
    const rest = rows.slice(top.length)
    return (
        <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-2 min-[1024px]:items-start">
            <section className={`rounded-card border-l-4 bg-surface p-4 ${PEBBLE_EDGE.lime}`}>
                <h2 className="text-title-3">{title}</h2>
                {top.length === 0 ? (
                    <p className="mt-3 text-callout text-label-2">No wins recorded.</p>
                ) : (
                    <div className="mt-4">
                        <Podium
                            key={title}
                            variant="hero"
                            faceRing="pebble"
                            items={top.map((r, i) => ({
                                key: r.member_id,
                                slot: (i + 1) as 1 | 2 | 3,
                                name: r.name,
                                sub: winsText(r.wins),
                                tag: r.tied ? `tied ${ordinal(r.rank)}` : null,
                                avatarUrl: faces.photoFor({ memberId: r.member_id, name: r.name }),
                            }))}
                        />
                    </div>
                )}
            </section>
            <section className="rounded-card bg-surface p-4">
                <div aria-hidden="true" className="flex items-center gap-3 text-caption-1 text-label-2">
                    <span className="flex-1">Member</span>
                    <span className="w-10 text-right">Wins</span>
                    <span className="w-10 text-right">Noms</span>
                    <span className="w-16 text-right">Win %</span>
                </div>
                <ol start={top.length + 1} className="mt-1 list-none divide-y divide-sep p-0">
                    {rest.map((r) => (
                        <li key={r.member_id} className="flex min-h-11 items-center gap-3 py-2 text-subhead">
                            <span className="w-7 shrink-0 text-footnote text-label-2">
                                <span aria-hidden="true">{rankLabel(r)}</span>
                                <span className="sr-only">{r.tied ? `tied ${ordinal(r.rank)}` : ordinal(r.rank)}: </span>
                            </span>
                            <MemberAvatar memberId={r.member_id} name={r.name} size={32} ring="pebble" decorative />
                            <span className="min-w-0 flex-1 break-words">{r.name}</span>
                            <span aria-hidden="true" className="w-10 text-right tabular-nums">{r.wins}</span>
                            <span aria-hidden="true" className="w-10 text-right tabular-nums text-label-2">{r.noms}</span>
                            <span aria-hidden="true" className="w-16 text-right text-footnote tabular-nums text-label-2">{rateText(r.pct)}</span>
                            <span className="sr-only">{`${winsText(r.wins)}, ${r.noms} ${r.noms === 1 ? "nomination" : "nominations"}, ${r.pct === null ? NO_RATE_LABEL : `${r.pct} win rate`}`}</span>
                        </li>
                    ))}
                </ol>
                {top.length > 0 && <p className="mt-2 text-caption-1 text-label-2">The top {top.length} are on the podium above, with the same numbers.</p>}
            </section>
        </div>
    )
}
