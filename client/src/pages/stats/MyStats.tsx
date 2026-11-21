import { useUserData } from "../../context/UserContenxt"
import { Skeleton } from "../../ui/Skeleton"
import { MemberStats } from "./MemberStats"
import { StatsGate } from "./StatsGate"
import { useStatsData } from "./useStatsData"

/** The "My stats" section on the You tab: the signed-in member's own stats (all-time totals with rank, then the charts). */
export function MyStats() {
    const { member } = useUserData()
    const { load, reload } = useStatsData()
    return (
        <section aria-labelledby="my-stats-title">
            <h2 id="my-stats-title" className="mb-3 text-title-2">My stats</h2>
            {!member ? (
                <Skeleton shape="block" />
            ) : (
                <StatsGate load={load} reload={reload}>
                    {(r) => <MemberStats model={r.model} memberId={member.id} pendingLabel={r.pendingLabel} />}
                </StatsGate>
            )}
        </section>
    )
}
