import { Card } from "../../ui/Card"
import { Avatar } from "../../ui/Avatar"
import { AvatarStack } from "../../ui/AvatarStack"
import type { MemberCompletion } from "../../lib/voting"

const CompletionPanel = ({ rows }: { rows: MemberCompletion[] }) => {
    const claimed = rows.filter((r) => r.claimed).length
    const finished = rows.filter((r) => r.claimed && r.total > 0 && r.voted >= r.total).length
    const done = rows.filter((r) => r.claimed && r.total > 0 && r.voted >= r.total)
    return (
        <Card as="section">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-headline">Who has voted</h3>
                <span className="flex items-center gap-2 text-footnote text-label-2">
                    {done.length > 0 && <AvatarStack people={done.map((r) => ({ id: r.name, name: r.name }))} size={24} max={3} />}
                    <span>
                        {finished} of {claimed} finished{claimed < rows.length ? ` (+${rows.length - claimed} not signed up)` : ""}
                    </span>
                </span>
            </div>
            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {rows.map((r) => {
                    const complete = r.total > 0 && r.voted >= r.total
                    const pct = r.total > 0 ? Math.round((r.voted / r.total) * 100) : 0
                    return (
                        <li key={r.name} className="flex min-h-11 items-center gap-3">
                            <Avatar id={r.name} name={r.name} size={32} ring="pebble" decorative />
                            <span className={`min-w-0 flex-1 truncate text-callout ${r.claimed ? "" : "text-label-2"}`}>{r.name}</span>
                            {r.claimed ? (
                                <>
                                    <span aria-hidden className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-fill sm:w-20">
                                        <span className={`block h-full rounded-full ${complete ? "bg-pebble-lime" : "bg-pebble-lemon"}`} style={{ width: `${pct}%` }} />
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
        </Card>
    )
}

export default CompletionPanel
