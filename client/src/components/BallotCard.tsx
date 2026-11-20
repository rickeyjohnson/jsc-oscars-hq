import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { BallotSummary } from "../lib/voting"
import { ballotPresentation, ballotSubtitle, roundLabel } from "../ui/logic/ballotsView"
import { PEBBLE_CLASS } from "../ui/logic/pebble"
import { Chip } from "../ui/Chip"
import { SUBMIT_ENABLED } from "../ui/copy"

function Strip({ total, voted }: { total: number; voted: number }) {
    if (total <= 0) return null
    return (
        <div aria-hidden className="mt-4 flex gap-0.5">
            {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i < voted ? "bg-current" : "bg-strip-off"}`} />
            ))}
        </div>
    )
}

const BallotCard = ({ ballot, now }: { ballot: BallotSummary; now: Date }) => {
    const p = ballotPresentation(ballot, now)
    const round = roundLabel(ballot.round)
    const color = p.pebble ? `${PEBBLE_CLASS[p.pebble].bg} ${PEBBLE_CLASS[p.pebble].text}` : "bg-surface text-label"
    const showStrip = p.status === "open" || p.status === "voted"
    const canSubmit = SUBMIT_ENABLED && (p.status === "voted" || p.status === "open") && ballot.my_vote_count >= 1
    return (
        <div className="flex flex-col gap-2">
            <Link
                to={p.to}
                className={`block rounded-card p-5 min-h-11 transition-transform duration-150 hover:-translate-y-0.5 active:scale-97 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${color}`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Chip tone={p.pebble ? "neutral" : p.chipTone}>{p.label}</Chip>
                            {round && <Chip tone="neutral">{round}</Chip>}
                        </div>
                        <h3 className="text-title-3">{ballot.name}</h3>
                        <p className="mt-1 text-footnote opacity-80">{ballotSubtitle(ballot, now)}</p>
                    </div>
                    <ChevronRight aria-hidden className="mt-1 size-5 shrink-0 opacity-70" />
                </div>
                {showStrip && <Strip total={ballot.category_count} voted={ballot.my_vote_count} />}
                <span className="mt-4 inline-flex h-11 items-center rounded-full bg-inverse px-5 text-subhead font-bold text-on-inverse">{p.cta}</span>
            </Link>
            {canSubmit && (
                <Link to={`/app/ballots/${ballot.id}/submit`} className="inline-flex min-h-11 items-center self-start px-2 text-subhead font-bold text-accent">
                    Submit ballot
                </Link>
            )}
        </div>
    )
}

export default BallotCard
