import { useSearchParams } from "react-router-dom"
import { Screen } from "../ui/Screen"
import { SegmentedControl } from "../ui/SegmentedControl"
import { parseResultsTab, type ResultsTab } from "../ui/logic/resultsTab"
import { WinnersPane } from "./results/WinnersPane"
import { LeaderboardPane } from "./results/LeaderboardPane"

const TABS: { value: ResultsTab; label: string }[] = [
    { value: "winners", label: "Winners" },
    { value: "leaderboard", label: "Leaderboard" },
]

// Winners: this season's results (sealed until the reveal; the release gate lives in WinnersPane via results_released_at).
// Leaderboard: all-time and per-semester stats for everyone. Past semesters are public; the current season joins at the reveal.
const ResultsPage = () => {
    const [params, setParams] = useSearchParams()
    const tab = parseResultsTab(`?${params.toString()}`)
    const setTab = (v: ResultsTab) => setParams(v === "winners" ? {} : { view: v }, { replace: true })
    return (
        <Screen title="Results" width="wide">
            <div className="space-y-4">
                <SegmentedControl label="Results view" idPrefix="results" options={TABS} value={tab} onChange={setTab} />
                <div role="tabpanel" aria-labelledby={`results-tab-${tab}`}>
                    {tab === "winners" ? <WinnersPane /> : <LeaderboardPane />}
                </div>
            </div>
        </Screen>
    )
}

export default ResultsPage
