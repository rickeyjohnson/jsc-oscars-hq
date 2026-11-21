import { StatsGate } from "../stats/StatsGate"
import { useStatsData } from "../stats/useStatsData"
import { useIntroGate } from "../../ui/introContext"
import { useUserData } from "../../context/UserContenxt"
import { Leaderboard } from "./Leaderboard"

/** The Leaderboard segment of Results: loads the stats and reports "leaderboard" to the intro host once it is showing. */
export function LeaderboardPane() {
    const { member } = useUserData()
    const { load, reload } = useStatsData()
    useIntroGate(load.state === "ready" && !load.empty ? "leaderboard" : null)
    return <StatsGate load={load} reload={reload}>{(r) => <Leaderboard model={r.model} pendingLabel={r.pendingLabel} viewerId={member?.id ?? null} />}</StatsGate>
}
