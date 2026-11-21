import type { ReactNode } from "react"
import { Trophy } from "lucide-react"
import { PAST_STATS_UNAVAILABLE } from "../../api/pastStats"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { ErrorState } from "../../ui/ErrorState"
import { EmptyState } from "../../ui/EmptyState"
import type { StatsLoad } from "./useStatsData"

type Ready = Extract<StatsLoad, { state: "ready" }>

/** The shared loading / error / unavailable / empty states for every stats screen; children render only with data. */
export function StatsGate({ load, reload, children }: { load: StatsLoad; reload: () => void; children: (ready: Ready) => ReactNode }) {
    if (load.state === "loading")
        return (
            <SkeletonScreen label="Loading stats">
                <div className="space-y-3">
                    <Skeleton shape="block" />
                    <Skeleton shape="card" />
                    <Skeleton shape="card" />
                </div>
            </SkeletonScreen>
        )
    if (load.state === "error") return <ErrorState title="Couldn't load stats" body="Check your connection. Then try again." onRetry={reload} />
    if (load.state === "unavailable") return <EmptyState icon={Trophy} title={PAST_STATS_UNAVAILABLE} />
    if (load.empty) return <EmptyState icon={Trophy} title="No stats yet" body="Past semesters will show up here once they are added." />
    return <>{children(load)}</>
}
