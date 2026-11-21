import { useState } from "react"
import { MemberAvatar } from "../../ui/MemberAvatar"
import { Button } from "../../ui/Button"
import { isFinished, leftNames, orderVoters, votedSummary } from "../../lib/ballotFlow"
import type { MemberCompletion } from "../../lib/voting"

// One list: ring face, name, progress bar, "n of N". One action: copy the names of who is left for the group chat.
export default function WhoVoted({ rows, id }: { rows: MemberCompletion[]; id?: string }) {
    const [filter, setFilter] = useState<"all" | "left">("all")
    const [notice, setNotice] = useState<string | null>(null)
    const sum = votedSummary(rows)
    const shown = orderVoters(rows).filter((r) => filter === "all" || (r.claimed && !isFinished(r)))
    const names = leftNames(rows)

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(names.join(", "))
            setNotice(`Copied ${names.length} ${names.length === 1 ? "name" : "names"}.`)
        } catch {
            setNotice("Couldn't copy. Select the names and copy them by hand.")
        }
    }
    const chip = (on: boolean) => `inline-flex min-h-11 items-center rounded-full px-4 text-subhead font-bold ${on ? "bg-inverse text-on-inverse" : "bg-surface-2 text-label"}`

    return (
        <section id={id} aria-label="Who voted" tabIndex={-1} className="scroll-mt-24 space-y-2 outline-none">
            <h2 className="text-caption-2 font-bold uppercase tracking-wider text-label-2">Who voted</h2>
            <p className="text-title-3">
                {sum.finished} of {sum.claimed} finished
                {sum.unclaimed > 0 && <span className="text-subhead text-label-2">{` · ${sum.unclaimed} not signed up`}</span>}
            </p>
            <div className="flex gap-2">
                <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={chip(filter === "all")}>All {rows.length}</button>
                <button type="button" aria-pressed={filter === "left"} onClick={() => setFilter("left")} className={chip(filter === "left")}>Not finished {sum.left}</button>
            </div>
            <ul className="list-none divide-y divide-sep overflow-hidden rounded-card bg-surface p-0">
                {shown.map((r) => {
                    const pct = r.total > 0 ? Math.round((r.voted / r.total) * 100) : 0
                    return (
                        <li key={r.name} className="flex min-h-14 items-center gap-3 px-4 py-2">
                            <MemberAvatar name={r.name} size={40} ring="pebble" decorative />
                            <span className={`min-w-0 flex-1 truncate text-callout font-bold ${r.claimed ? "" : "text-label-2"}`}>{r.name}</span>
                            {r.claimed ? (
                                <>
                                    <span aria-hidden className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-fill sm:w-24">
                                        <span className={`block h-full rounded-full ${isFinished(r) ? "bg-pebble-lime" : "bg-pebble-lemon"}`} style={{ width: `${pct}%` }} />
                                    </span>
                                    <span className={`w-14 shrink-0 text-right text-footnote tabular-nums ${isFinished(r) ? "font-bold" : "text-label-2"}`}>
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
            {names.length > 0 && (
                <Button variant="secondary" size="md" fullWidth onClick={copy}>
                    Copy names of who's left
                </Button>
            )}
            {notice && <p role="status" className="text-footnote text-label-2">{notice}</p>}
        </section>
    )
}
