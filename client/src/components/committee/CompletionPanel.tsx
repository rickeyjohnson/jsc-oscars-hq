import { MemberAvatar } from "../../ui/MemberAvatar"
import { PEBBLE_EDGE } from "../../ui/logic/pebble"
import type { MemberCompletion } from "../../lib/voting"

const isDone = (r: MemberCompletion) => r.claimed && r.total > 0 && r.voted >= r.total

// Not finished first (signed-up members, then not signed up), then finished; each group by name.
const order = (a: MemberCompletion, b: MemberCompletion) => {
    const rank = (r: MemberCompletion) => (isDone(r) ? 2 : r.claimed ? 0 : 1)
    return rank(a) - rank(b) || a.name.localeCompare(b.name)
}

const CompletionPanel = ({ rows }: { rows: MemberCompletion[] }) => {
    const claimed = rows.filter((r) => r.claimed).length
    const finished = rows.filter(isDone).length
    const sorted = [...rows].sort(order)
    return (
        <section aria-label="Who has voted" className={`rounded-card border-l-4 bg-surface p-4 ${PEBBLE_EDGE.grape}`}>
            <h3 className="text-caption-2 uppercase tracking-wider text-label-2">Who has voted</h3>
            <p className="mb-2 mt-1 text-title-3">
                {finished} of {claimed} finished
                {claimed < rows.length && <span className="text-subhead text-label-2">{` · ${rows.length - claimed} not signed up`}</span>}
            </p>
            <ul className="list-none divide-y divide-sep p-0">
                {sorted.map((r) => {
                    const pct = r.total > 0 ? Math.round((r.voted / r.total) * 100) : 0
                    return (
                        <li key={r.name} className="flex min-h-14 items-center gap-3 py-2">
                            <MemberAvatar name={r.name} size={40} ring="pebble" decorative />
                            <span className={`min-w-0 flex-1 truncate text-callout ${r.claimed ? "" : "text-label-2"}`}>{r.name}</span>
                            {r.claimed ? (
                                <>
                                    <span aria-hidden className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-fill sm:w-28">
                                        <span className={`block h-full rounded-full ${isDone(r) ? "bg-pebble-lime" : "bg-pebble-lemon"}`} style={{ width: `${pct}%` }} />
                                    </span>
                                    <span className="w-14 shrink-0 text-right text-footnote tabular-nums text-label-2">
                                        {r.voted} of {r.total}
                                    </span>
                                </>
                            ) : (
                                <span className="shrink-0 text-footnote text-label-2">not signed up</span>
                            )}
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}

export default CompletionPanel
