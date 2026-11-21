import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Trophy } from "lucide-react"
import { fetchPastStats, PAST_STATS_UNAVAILABLE } from "../api/pastStats"
import { fetchMembers } from "../api/members"
import { ALL_TIME, pastLeaderboard, semesters, type PastStatRow } from "../lib/pastStats"
import type { Member } from "../types"
import { Screen } from "../ui/Screen"
import { Skeleton, SkeletonScreen } from "../ui/Skeleton"
import { ErrorState } from "../ui/ErrorState"
import { EmptyState } from "../ui/EmptyState"
import { COPY } from "../ui/copy"
import { SeasonSwitch } from "./results/SeasonSwitch"
import { PastLeaderboard } from "./results/PastLeaderboard"

export const PAST_FOOTNOTE =
    "Stats are counted by nominations: the top 3 in votes, not only what was on screen (ties may have been picked at random on screen). Live-voting categories are not included. Group votes count toward wins and nominations."

type Load = { state: "loading" } | { state: "error" } | { state: "unavailable" } | { state: "ready"; rows: PastStatRow[]; members: Member[] }

const PreviousOscarsPage = () => {
    const [load, setLoad] = useState<Load>({ state: "loading" })
    const [scope, setScope] = useState<string>(ALL_TIME)
    const seq = useRef(0)

    const run = useCallback(async () => {
        const mine = ++seq.current
        setLoad({ state: "loading" })
        try {
            const [past, members] = await Promise.all([fetchPastStats(), fetchMembers()])
            if (mine !== seq.current) return
            setLoad(past.available ? { state: "ready", rows: past.rows, members } : { state: "unavailable" })
        } catch (e) {
            if (mine !== seq.current) return
            console.error("Error loading previous stats: ", e)
            setLoad({ state: "error" })
        }
    }, [])
    useEffect(() => {
        void run()
    }, [run])

    const ready = load.state === "ready" ? load : null
    const sems = useMemo(() => (ready ? semesters(ready.rows) : []), [ready])
    const rows = useMemo(() => (ready ? pastLeaderboard(ready.rows, ready.members, scope) : []), [ready, scope])

    let body
    if (load.state === "loading") {
        body = (
            <SkeletonScreen label="Loading previous stats">
                <div className="space-y-4">
                    <Skeleton shape="row" />
                    <Skeleton shape="card" />
                    <Skeleton shape="card" />
                </div>
            </SkeletonScreen>
        )
    } else if (load.state === "error") {
        body = <ErrorState title={COPY.somethingWrong} body={COPY.loadFailed("the previous stats")} onRetry={() => void run()} />
    } else if (load.state === "unavailable") {
        body = <EmptyState icon={Trophy} title={PAST_STATS_UNAVAILABLE} />
    } else if (load.rows.length === 0) {
        body = <EmptyState icon={Trophy} title="No previous stats yet" body="Past semesters will show up here once they are added." />
    } else {
        const options = [{ value: ALL_TIME, label: "All time" }, ...sems.map((s) => ({ value: s.label, label: s.label }))]
        body = (
            <div className="space-y-4">
                <div role="group" aria-label="Semester" className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1">
                    {options.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            aria-pressed={scope === o.value}
                            onClick={() => setScope(o.value)}
                            className={`min-h-11 shrink-0 rounded-full px-4 text-subhead font-bold cursor-pointer transition-colors ${scope === o.value ? "bg-inverse text-on-inverse" : "bg-fill text-label-2"}`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
                {scope === ALL_TIME && <p className="text-footnote text-label-2">Totals across the previous semesters.</p>}
                <PastLeaderboard title={scope === ALL_TIME ? "All time" : scope} rows={rows} />
            </div>
        )
    }

    return (
        <Screen title="Previous Oscars" width="wide">
            <div className="space-y-4">
                <SeasonSwitch value="previous" />
                {body}
                {load.state === "ready" && <p className="text-footnote text-label-2">{PAST_FOOTNOTE}</p>}
            </div>
        </Screen>
    )
}

export default PreviousOscarsPage
