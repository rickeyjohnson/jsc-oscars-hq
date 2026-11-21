import { useCallback, useEffect, useState } from "react"
import { Inbox } from "lucide-react"
import BallotCard from "../components/BallotCard"
import { fetchBallotSummaries } from "../api/ballots"
import type { BallotSummary } from "../lib/voting"
import { Screen } from "../ui/Screen"
import { SegmentedControl } from "../ui/SegmentedControl"
import { Skeleton, SkeletonScreen } from "../ui/Skeleton"
import { EmptyState } from "../ui/EmptyState"
import { ErrorState } from "../ui/ErrorState"
import { COPY } from "../ui/copy"
import { opensAtLabel } from "../lib/time"
import { useRefetchOnFocus } from "../ui/useRefetchOnFocus"
import { ballotTabs, defaultTab, nextOpening, splitBallots, type BallotTab } from "../ui/logic/ballotsView"

const BallotsPage = () => {
    const [picked, setPicked] = useState<BallotTab | null>(null)
    const [ballots, setBallots] = useState<BallotSummary[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const now = new Date()

    useEffect(() => {
        let cancelled = false
        fetchBallotSummaries()
            .then((b) => {
                if (!cancelled) setBallots(b)
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Could not load ballots")
            })
        return () => {
            cancelled = true
        }
    }, [reloadKey])

    const retry = () => {
        setError(null)
        setBallots(null)
        setReloadKey((k) => k + 1)
    }
    // Quiet refresh: keeps the current list on screen.
    const refresh = useCallback(() => setReloadKey((k) => k + 1), [])
    useRefetchOnFocus(refresh)

    const { open, closed } = splitBallots(ballots ?? [], now)
    // Open unless nothing is open and something is closed; the member's own pick wins once made.
    const selected: BallotTab = picked ?? defaultTab(open.length, closed.length)
    const filtered = selected === "open" ? open : closed

    return (
        <Screen title="Ballots" width="wide">
            {!error && (
                <div className="mb-5 max-w-md">
                    <SegmentedControl label="Ballots" idPrefix="ballots-filter" options={ballotTabs(open.length, closed.length)} value={selected} onChange={setPicked} />
                </div>
            )}
            {error && <ErrorState title={COPY.somethingWrong} body={COPY.loadFailed("ballots")} onRetry={retry} />}
            {!error && ballots === null && (
                <SkeletonScreen label="Loading ballots">
                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        <Skeleton shape="card" />
                        <Skeleton shape="card" />
                        <Skeleton shape="card" />
                    </div>
                </SkeletonScreen>
            )}
            {!error && ballots !== null && filtered.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((b) => (
                        <BallotCard key={b.id} ballot={b} now={now} />
                    ))}
                </div>
            )}
            {!error && ballots !== null && filtered.length === 0 && (
                <EmptyState
                    icon={Inbox}
                    title={selected === "open" ? "No open ballots right now." : "No closed ballots yet."}
                    body={
                        selected === "open"
                            ? nextOpening(ballots, now)
                                ? `${opensAtLabel(new Date(nextOpening(ballots, now)!.opens_at))}.`
                                : "Voting opens when the committee publishes a ballot. You'll see it here."
                            : undefined
                    }
                />
            )}
        </Screen>
    )
}

export default BallotsPage
