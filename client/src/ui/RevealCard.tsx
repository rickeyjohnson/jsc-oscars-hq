import { Podium } from "./Podium"
import { Card } from "./Card"
import { Chip } from "./Chip"
import { PEBBLE_CLASS, RESULTS_EXCLUDE, pebbleAt } from "./logic/pebble"
import type { ResultCard } from "../lib/resultsView"

/** One category's result: pebble header strip, podium, "Also placed" rows. Never shows vote counts. */
export function RevealCard({ card, index, avatars }: { card: ResultCard; index: number; avatars: Record<string, string | null> }) {
    const peb = PEBBLE_CLASS[pebbleAt(index, { exclude: RESULTS_EXCLUDE })]
    return (
        <Card as="section" className="!p-0 overflow-hidden">
            <h2 className={`px-4 py-3 font-display text-title-2 ${peb.bg} ${peb.text}`}>{`${card.number} · ${card.name}`}</h2>
            <div className="p-4">
                {card.pending ? (
                    <p className="text-callout text-label-2">No winner recorded</p>
                ) : (
                    <>
                        <Podium
                            animate
                            items={card.podium.map((e) => ({
                                key: e.nominee_id,
                                slot: e.slot,
                                name: e.name,
                                sub: e.tieLabel,
                                avatarUrl: e.memberIds.length === 1 ? (avatars[e.memberIds[0]] ?? null) : null,
                            }))}
                        />
                        {card.also.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-footnote uppercase tracking-wider text-label-2">Also placed</h3>
                                <ul className="mt-2 list-none space-y-2 p-0">
                                    {card.also.map((a) => (
                                        <li key={a.nominee_id} className="flex min-h-11 items-center gap-2 rounded-control bg-surface-2 px-3 py-2 text-subhead">
                                            <Chip>{a.placeLabel}</Chip>
                                            <span className="min-w-0 flex-1 break-words">{a.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {card.note && <p className="mt-3 text-center text-footnote text-label-2">{card.note}</p>}
                    </>
                )}
            </div>
        </Card>
    )
}
