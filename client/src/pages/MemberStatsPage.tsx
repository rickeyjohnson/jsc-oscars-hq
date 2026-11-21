import { useParams } from "react-router-dom"
import { UserX } from "lucide-react"
import { Screen } from "../ui/Screen"
import { MemberAvatar } from "../ui/MemberAvatar"
import { EmptyState } from "../ui/EmptyState"
import { MemberStats } from "./stats/MemberStats"
import { StatsGate } from "./stats/StatsGate"
import { useStatsData } from "./stats/useStatsData"
import { useUserData } from "../context/UserContenxt"

/** Any member's stats, read-only. Public to every member (past semesters; the live season only once released). */
const MemberStatsPage = () => {
    const { memberId = "" } = useParams()
    const { member } = useUserData()
    const { load, reload } = useStatsData()
    const mine = member?.id === memberId
    return (
        <Screen title="Member stats" back={{ to: "/app/results?view=leaderboard", label: "Leaderboard" }} width="wide">
            <StatsGate load={load} reload={reload}>
                {(r) => {
                    const m = r.model.members.find((x) => x.id === memberId)
                    if (!m) return <EmptyState icon={UserX} title="We couldn't find that member" />
                    return (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 rounded-card bg-surface p-3">
                                <MemberAvatar memberId={m.id} name={m.name} size={56} ring="pebble" decorative />
                                <div className="min-w-0">
                                    <h2 className="truncate text-headline">{mine ? `Viewing ${m.name} (you)` : `Viewing ${m.name}`}</h2>
                                    <p className="text-footnote text-label-2">Read-only · visible to all members</p>
                                </div>
                            </div>
                            <MemberStats model={r.model} memberId={m.id} viewer={mine} pendingLabel={r.pendingLabel} />
                        </div>
                    )
                }}
            </StatsGate>
        </Screen>
    )
}

export default MemberStatsPage
