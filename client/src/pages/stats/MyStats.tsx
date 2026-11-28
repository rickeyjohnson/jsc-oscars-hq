import { useEffect, useState } from "react"
import { fetchInspiredCategories } from "../../api/ballots"
import { useUserData } from "../../context/UserContenxt"
import { Skeleton } from "../../ui/Skeleton"
import { MemberStats } from "./MemberStats"
import { StatsGate } from "./StatsGate"
import { useStatsData } from "./useStatsData"

/** The "My stats" section on the You tab: the signed-in member's own stats (all-time totals with rank, then the charts). */
export function MyStats() {
    const { member } = useUserData()
    const { load, reload } = useStatsData()
    const [inspired, setInspired] = useState<{ id: string; name: string; ballot: string }[]>([])
    useEffect(() => {
        if (!member) return
        let live = true
        fetchInspiredCategories(member.id).then((r) => live && setInspired(r), () => {})
        return () => {
            live = false
        }
    }, [member])
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
            {inspired.length > 0 && (
                <div className="mt-4 rounded-card bg-surface-2 p-4">
                    <h3 className="text-headline">Categories you inspired</h3>
                    <ul className="mt-2 list-none space-y-1 p-0 text-subhead text-label-2">
                        {inspired.map((c) => (
                            <li key={c.id}>
                                {c.name}
                                {c.ballot ? ` (${c.ballot})` : ""}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    )
}
