import { Link } from "react-router-dom"
import type { BallotSummary } from "../lib/voting"
import { ballotPresentation, ballotSubtitle, pillPhase, roundLabel } from "../ui/logic/ballotsView"
import { Chip } from "../ui/Chip"
import { StatusPill } from "../ui/StatusPill"

/** Dark surface card. Status pill + title + (open ballots) a voted strip; the whole card is the link. */
const BallotCard = ({ ballot, now }: { ballot: BallotSummary; now: Date }) => {
    const p = ballotPresentation(ballot, now)
    const round = roundLabel(ballot.round)
    return (
        <Link
            to={p.to}
            className="block min-h-11 rounded-card bg-surface p-4 transition-transform duration-150 hover:-translate-y-0.5 active:scale-97 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusPill phase={pillPhase(ballot, now)} />
                {round && <Chip tone="neutral">{round}</Chip>}
            </div>
            <h3 className="text-title-3">{ballot.name}</h3>
            <p className="mt-1 text-footnote text-label-2">{ballotSubtitle(ballot, now)}</p>
            {p.status === "open" || p.status === "voted" ? (
                <div aria-hidden className="mt-3 flex gap-0.5">
                    {Array.from({ length: ballot.category_count }, (_, i) => (
                        <span key={i} className={`h-1 flex-1 rounded-full ${p.status === "voted" ? "bg-pebble-sky" : i < ballot.my_vote_count ? "bg-pebble-lime" : "bg-strip-off"}`} />
                    ))}
                </div>
            ) : null}
            <p className="mt-3 text-subhead font-bold">{p.cta}</p>
        </Link>
    )
}

export default BallotCard
