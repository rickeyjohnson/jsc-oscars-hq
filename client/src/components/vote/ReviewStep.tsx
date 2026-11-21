import { Button } from "../../ui/Button"
import { PEBBLE_CLASS } from "../../ui/logic/pebble"
import { VoteBanner } from "./VoteBanner"
import type { ReviewRow } from "../../lib/voting"

type Props = {
    rows: ReviewRow[]
    readOnly: boolean
    finishTo: string
    onEdit: (index: number) => void
}

/** Every category with my pick (and its pebble). Skipped ones are flagged. Votes are already saved, so Finish voting just moves on. */
const ReviewStep = ({ rows, readOnly, finishTo, onEdit }: Props) => {
    const skipped = rows.filter((r) => !r.pick).length
    return (
        <section aria-label="Review your votes" className="tab-enter">
            <h2 className="font-display text-title-1">Review your votes</h2>
            <p className="mt-1 text-subhead text-label-2">
                {rows.length - skipped} of {rows.length} voted. Everything is already saved.
            </p>
            {skipped > 0 && (
                <VoteBanner
                    className="mt-3"
                    tone="warn"
                    title={skipped === 1 ? "1 not voted yet" : `${skipped} not voted yet`}
                    detail={`You can skip ${skipped === 1 ? "it" : "them"}, or vote now.`}
                />
            )}
            <ul className="mt-3 grid grid-cols-1 gap-x-4 lg:grid-cols-2">
                {rows.map((r) => (
                    <li key={r.index} className="flex min-h-14 items-center gap-3 border-b border-sep py-1">
                        <span className="min-w-0 flex-1">
                            <span className="block text-footnote text-label-2">{r.category}</span>
                            <span className={`block text-callout font-bold ${r.pick ? "" : "text-warn"}`}>{r.pick ?? "Not voted yet"}</span>
                        </span>
                        {r.pebble && <span aria-hidden className={`size-3.5 shrink-0 rounded-full ${PEBBLE_CLASS[r.pebble].bg}`} />}
                        {!readOnly && (
                            <Button variant="plain" size="md" aria-label={`${r.pick ? "Change" : "Vote in"} ${r.category}`} onClick={() => onEdit(r.index)}>
                                {r.pick ? "Change" : "Vote"}
                            </Button>
                        )}
                    </li>
                ))}
            </ul>
            {!readOnly && (
                <div className="mt-6">
                    <Button fullWidth to={finishTo}>
                        Finish voting
                    </Button>
                </div>
            )}
        </section>
    )
}

export default ReviewStep
