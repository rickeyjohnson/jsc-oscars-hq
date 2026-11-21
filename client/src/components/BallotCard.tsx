import { Link } from "react-router-dom"
import type { BallotSummary } from "../lib/voting"
import { ballotPresentation, ballotSubtitle, roundLabel } from "../ui/logic/ballotsView"
import { PEBBLE_EDGE, pebbleAt } from "../ui/logic/pebble"
import { Chip } from "../ui/Chip"

/** Dark surface card with a 4px pebble edge. Title + content only; the whole card is the link. `index` walks the pebbles so none repeats before all are used. */
const BallotCard = ({ ballot, now, index = 0 }: { ballot: BallotSummary; now: Date; index?: number }) => {
    const p = ballotPresentation(ballot, now)
    const round = roundLabel(ballot.round)
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
            <p className="mt-3 text-subhead font-bold">{p.cta}</p>
        </Link>
    )
}

export default BallotCard
