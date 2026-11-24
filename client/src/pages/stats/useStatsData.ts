import { useCallback, useEffect, useRef, useState } from "react"
import { fetchPastStats } from "../../api/pastStats"
import { fetchMembers } from "../../api/members"
import { fetchCurrentSeason } from "../../api/ballots"
import { fetchSeasonResults } from "../../api/results"
import { nomineeStats, statsResults } from "../../lib/stats"
import { buildModel, type StatsModel } from "../../lib/statsLab"
import type { Nominee } from "../../types"

export type StatsLoad =
    | { state: "loading" }
    | { state: "error" }
    | { state: "unavailable" }
    /** pendingLabel: the live season is not released yet (its numbers are hidden); releasedLabel: it is in the model as the last column. */
    | { state: "ready"; model: StatsModel; pendingLabel: string | null; releasedLabel: string | null; empty: boolean }

/**
 * Everything the stats screens need: past semesters (public), the member list and, only once the live season's results are
 * released, that season as the last column. Before release nothing about the live season is requested besides the season row.
 */
export function useStatsData(): { load: StatsLoad; reload: () => void } {
    const [load, setLoad] = useState<StatsLoad>({ state: "loading" })
    const seq = useRef(0)
    const run = useCallback(async () => {
        const mine = ++seq.current
        setLoad({ state: "loading" })
        try {
            const [past, members, season] = await Promise.all([fetchPastStats(), fetchMembers(), fetchCurrentSeason().catch(() => null)])
            if (mine !== seq.current) return
            if (!past.available) {
                setLoad({ state: "unavailable" })
                return
            }
            let current: { label: string; tallies: Record<string, { wins: number; noms: number }> } | null = null
            if (season && season.results_released_at != null) {
                const { categories, results } = await fetchSeasonResults(season.id)
                const nominees: Record<string, Nominee> = {}
                for (const c of categories) for (const n of c.nominees) nominees[n.id] = n
                current = { label: season.name, tallies: nomineeStats(statsResults(Object.values(results), categories), nominees).members }
            }
            if (mine !== seq.current) return
            const model = buildModel({ rows: past.rows, members, current })
            setLoad({
                state: "ready",
                model,
                pendingLabel: season && !current ? season.name : null,
                releasedLabel: current?.label ?? null,
                empty: model.sems.length === 0,
            })
        } catch (e) {
            if (mine !== seq.current) return
            console.error("Error loading stats: ", e)
            setLoad({ state: "error" })
        }
    }, [])
    useEffect(() => {
        void run()
    }, [run])
    return { load, reload: () => void run() }
}
