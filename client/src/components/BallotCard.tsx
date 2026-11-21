import { Link } from "react-router-dom"
import type { BallotSummary } from "../lib/voting"
import { ballotPresentation, ballotSubtitle, roundLabel } from "../ui/logic/ballotsView"
import { PEBBLE_EDGE, pebbleAt } from "../ui/logic/pebble"
import { Chip } from "../ui/Chip"

function Strip({ total, voted, on }: { total: number; voted: number; on: string }) {
    if (total <= 0) return null
    return (
        <div aria-hidden className="mt-3 flex gap-0.5">
            {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i < voted ? on : "bg-strip-off"}`} />
            ))}
        </div>
    )
}

const FILL = "bg-label"

/** Dark surface card with a 4px pebble edge. Title + content only; the whole card is the link. `index` walks the pebbles so none repeats before all are used. */
const BallotCard = ({ ballot, now, index = 0 }: { ballot: BallotSummary; now: Date; index?: number }) => {
    const p = ballotPresentation(ballot, now)
    const round = roundLabel(ballot.round)
    const showStrip = p.status === "open" || p.status === "voted"
    return (
        <Link
            to={p.to}
            className={`block min-h-11 rounded-card border-l-4 bg-surface p-4 transition-transform duration-150 hover:-translate-y-0.5 active:scale-97 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${PEBBLE_EDGE[pebbleAt(index)]}`}
        >
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <Chip tone={p.chipTone}>{p.label}</Chip>
                {round && <Chip tone="neutral">{round}</Chip>}
            </div>
            <h3 className="text-title-3">{ballot.name}</h3>
            <p className="mt-1 text-footnote text-label-2">{ballotSubtitle(ballot, now)}</p>
            {showStrip && <Strip total={ballot.category_count} voted={ballot.my_vote_count} on={FILL} />}
            <p className="mt-3 text-subhead font-bold">{p.cta}</p>
        </Link>
    )
}

export default BallotCard
