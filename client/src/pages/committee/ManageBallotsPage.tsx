import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Inbox, Plus, Sparkles } from "lucide-react"
import StatusChip from "../../components/committee/StatusChip"
import { fetchBallotSummaries } from "../../api/ballots"
import { chipStatus, type BallotSummary } from "../../lib/voting"
import { Screen } from "../../ui/Screen"
import { Button } from "../../ui/Button"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { EmptyState } from "../../ui/EmptyState"
import { ErrorState } from "../../ui/ErrorState"
import { COPY } from "../../ui/copy"
import { GroupedSection } from "../../ui/GroupedSection"

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })

const ManageBallotsPage = () => {
    const [ballots, setBallots] = useState<BallotSummary[] | null>(null)
    const [error, setError] = useState(false)

    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        fetchBallotSummaries(true)
            .then((b) => {
                if (!cancelled) setBallots(b)
            })
            .catch((e) => {
                console.error(e)
                if (!cancelled) setError(true)
            })
        return () => {
            cancelled = true
        }
    }, [reloadKey])

    const now = new Date()
    return (
        <Screen title="Manage ballots" back={{ to: "/app/profile", label: "You" }} width="wide">
            <div className="mb-5 flex flex-wrap gap-3">
                <Button to="/app/profile/ballots/create" variant="primary" size="md" icon={<Plus aria-hidden className="size-4" />}>
                    New ballot
                </Button>
                <Button to="/app/profile/release" variant="secondary" size="md" icon={<Sparkles aria-hidden className="size-4" />}>
                    Reveal results
                </Button>
            </div>
            {error && (
                <ErrorState
                    title={COPY.somethingWrong}
                    body={COPY.loadFailed("ballots")}
                    onRetry={() => {
                        setError(false)
                        setBallots(null)
                        setReloadKey((k) => k + 1)
                    }}
                />
            )}
            {!error && ballots === null && (
                <SkeletonScreen label="Loading ballots">
                    <div className="space-y-2">
                        <Skeleton shape="row" />
                        <Skeleton shape="row" />
                        <Skeleton shape="row" />
                    </div>
                </SkeletonScreen>
            )}
            {!error && ballots?.length === 0 && <EmptyState icon={Inbox} title="No ballots yet" />}
            {!error && ballots && ballots.length > 0 && (
                <GroupedSection>
                    {ballots.map((b) => (
                        <li key={b.id}>
                            <Link to={`/app/profile/ballots/${b.id}`} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 hover:bg-fill active:bg-fill">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-body">{b.name}</span>
                                    <span className="block text-footnote text-label-2">
                                        {day(b.opens_at)} → {day(b.closes_at)} · {b.category_count} {b.category_count === 1 ? "category" : "categories"}
                                    </span>
                                </span>
                                {b.round !== "main" && <span className="text-footnote capitalize text-label-2">{b.round}</span>}
                                <StatusChip status={chipStatus(b, now)} />
                            </Link>
                        </li>
                    ))}
                </GroupedSection>
            )}
        </Screen>
    )
}

export default ManageBallotsPage
