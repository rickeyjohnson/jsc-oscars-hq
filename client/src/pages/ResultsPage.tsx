import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Clapperboard } from "lucide-react"
import { fetchCurrentSeason } from "../api/ballots"
import { fetchSeasonResults } from "../api/results"
import { fetchMemberAvatars, fetchMembers } from "../api/members"
import { useUserData } from "../context/UserContenxt"
import { buildResultCards, type ResultCard } from "../lib/resultsView"
import { nomineeStats } from "../lib/stats"
import { leaderboard, myCategories, type LeaderRow } from "../lib/leaderboard"
import type { Nominee, Season } from "../types"
import { Screen } from "../ui/Screen"
import { SegmentedControl } from "../ui/SegmentedControl"
import { Skeleton, SkeletonScreen } from "../ui/Skeleton"
import { ErrorState } from "../ui/ErrorState"
import { Countdown } from "../ui/Countdown"
import { Envelope } from "../ui/Envelope"
import { COPY } from "../ui/copy"
import { useReleaseWatch } from "../ui/useReleaseWatch"
import { parseResultsTab, type ResultsTab } from "../ui/logic/resultsTab"
import { hasSeenEnvelope, markEnvelopeSeen, safeStorage } from "../ui/logic/reveal"
import { WinnersView } from "./results/WinnersView"
import { LeaderboardView } from "./results/LeaderboardView"
import type { You } from "./results/YouCard"

type Ready = { season: Season; released: boolean; cards: ResultCard[]; rows: LeaderRow[]; avatars: Record<string, string | null>; you: You | null }
type Load = { state: "loading" } | { state: "error" } | { state: "sealed"; season: Season } | { state: "none" } | ({ state: "ready" } & Ready)

const TABS: { value: ResultsTab; label: string }[] = [
    { value: "winners", label: "Winners" },
    { value: "leaderboard", label: "Leaderboard" },
]

const ResultsPage = () => {
    const { profile, member, loading: userLoading } = useUserData()
    const isCommittee = Boolean(profile?.is_committee)
    const [params, setParams] = useSearchParams()
    const tab = parseResultsTab(`?${params.toString()}`)
    const [load, setLoad] = useState<Load>({ state: "loading" })
    const [envelopeDone, setEnvelopeDone] = useState(false)
    const seq = useRef(0)

    const run = useCallback(async () => {
        const mine = ++seq.current
        setLoad({ state: "loading" })
        try {
            const season = await fetchCurrentSeason()
            if (mine !== seq.current) return
            if (!season) {
                setLoad({ state: "none" })
                return
            }
            const released = season.results_released_at != null
            // Members request nothing about results before release (season row only).
            if (!released && !isCommittee) {
                setLoad({ state: "sealed", season })
                return
            }
            const [{ categories, results }, avatars, members] = await Promise.all([
                fetchSeasonResults(season.id),
                fetchMemberAvatars().catch(() => ({}) as Record<string, string | null>),
                released ? fetchMembers() : Promise.resolve([]),
            ])
            let rows: LeaderRow[] = []
            let you: You | null = null
            if (released) {
                const nominees: Record<string, Nominee> = {}
                for (const c of categories) for (const n of c.nominees) nominees[n.id] = n
                rows = leaderboard(nomineeStats(Object.values(results), nominees).members, members)
                const row = member ? rows.find((r) => r.member_id === member.id) : undefined
                if (member && row) you = { name: member.name, row, ...myCategories(categories, results, member.id, members) }
            }
            if (mine !== seq.current) return
            setLoad({ state: "ready", season, released, cards: buildResultCards(categories, results), rows, avatars, you })
        } catch (e) {
            if (mine !== seq.current) return
            console.error("Error loading results: ", e)
            setLoad({ state: "error" })
        }
    }, [isCommittee, member])

    useEffect(() => {
        if (userLoading) return
        void run()
    }, [run, userLoading])

    // A member waiting on the sealed screen sees the reveal without reloading.
    useReleaseWatch(load.state === "sealed", () => void run())

    const setTab = (v: ResultsTab) => setParams(v === "winners" ? {} : { view: v }, { replace: true })

    if (load.state === "loading") {
        return (
            <Screen title="Results">
                <SkeletonScreen label="Loading results">
                    <div className="space-y-4">
                        <Skeleton shape="row" />
                        <Skeleton shape="card" />
                        <Skeleton shape="card" />
                    </div>
                </SkeletonScreen>
            </Screen>
        )
    }
    if (load.state === "error") {
        return (
            <Screen title="Results">
                <ErrorState title={COPY.somethingWrong} body={COPY.loadFailed("the results")} onRetry={() => void run()} />
            </Screen>
        )
    }
    if (load.state === "none" || load.state === "sealed") {
        const at = load.state === "sealed" && load.season.ceremony_at ? new Date(load.season.ceremony_at) : null
        return (
            <Screen title="Results">
                <section className="rounded-card border-l-4 border-pebble-lemon bg-surface p-5">
                    <Clapperboard aria-hidden className="size-10 text-pebble-lemon" />
                    <h2 className="mt-3 font-display text-title-1">Results are sealed.</h2>
                    <p className="mt-1 text-callout">
                        {at
                            ? `The winners are revealed at the ceremony on ${at.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at ${at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`
                            : "The winners are revealed at the ceremony."}
                    </p>
                    <p className="mt-2 text-callout text-label-2">Nothing to see yet. Cast your votes, then come back on ceremony night to find out who won and how you did.</p>
                    <div className="mt-4">
                        <Countdown target={at} />
                    </div>
                </section>
            </Screen>
        )
    }

    const { season, released } = load
    const showEnvelope = released && !envelopeDone && !hasSeenEnvelope(safeStorage(), season.id)
    const closeEnvelope = () => {
        markEnvelopeSeen(safeStorage(), season.id)
        setEnvelopeDone(true)
    }

    return (
        <Screen title="Results" width="wide">
            {showEnvelope && <Envelope onDone={closeEnvelope} />}
            <div className="space-y-4">
                {!released && (
                    <p role="status" className="rounded-card border-l-4 border-pebble-lemon bg-surface p-3 text-callout">
                        Preview: members can't see this yet. Nothing is revealed until you open the envelope.
                    </p>
                )}
                <SegmentedControl label="Results view" idPrefix="results" options={TABS} value={tab} onChange={setTab} />
                <div role="tabpanel" aria-labelledby={`results-tab-${tab}`}>
                    {tab === "winners" ? (
                        <>
                            <div className="mb-4 flex flex-col items-center gap-3 text-center">
                                <h2 className="font-display text-large-title">And the winners are…</h2>
                            </div>
                            <WinnersView cards={load.cards} avatars={load.avatars} />
                        </>
                    ) : released ? (
                        <LeaderboardView seasonName={season.name} rows={load.rows} avatars={load.avatars} you={load.you} />
                    ) : (
                        <p className="py-12 text-center text-callout text-label-2">Stats appear after the envelope opens.</p>
                    )}
                </div>
            </div>
        </Screen>
    )
}

export default ResultsPage
