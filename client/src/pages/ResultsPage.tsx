import { useCallback, useEffect, useState } from "react"
import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import Podium from "../components/Podium"
import { fetchCurrentSeason } from "../api/ballots"
import { fetchSeasonResults } from "../api/results"
import { fetchMemberAvatars } from "../api/members"
import { useUserData } from "../context/UserContenxt"
import { buildResultCards, type ResultCard } from "../lib/resultsView"
import type { Season } from "../types"

type Load =
    | { state: "loading" }
    | { state: "error" }
    | { state: "hidden" }
    | { state: "ready"; season: Season; cards: ResultCard[]; avatars: Record<string, string | null> }

const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
        <NavigationBar />
        <main className="px-6 py-6 space-y-4 max-w-md mx-auto">{children}</main>
        <NavigationTabs activeTab="results" />
    </div>
)

const ResultsPage = () => {
    const { profile, loading: profileLoading } = useUserData()
    const isCommittee = Boolean(profile?.is_committee)
    const [load, setLoad] = useState<Load>({ state: "loading" })

    const run = useCallback(async () => {
        setLoad({ state: "loading" })
        try {
            const season = await fetchCurrentSeason()
            if (!season) {
                setLoad({ state: "hidden" })
                return
            }
            const released = season.results_released_at != null
            if (!released && !isCommittee) {
                setLoad({ state: "hidden" })
                return
            }
            const [{ categories, results }, avatars] = await Promise.all([fetchSeasonResults(season.id), fetchMemberAvatars().catch(() => ({}))])
            setLoad({ state: "ready", season, cards: buildResultCards(categories, results), avatars })
        } catch (e) {
            console.error("Error loading results: ", e)
            setLoad({ state: "error" })
        }
    }, [isCommittee])

    useEffect(() => {
        if (profileLoading) return
        void run()
    }, [run, profileLoading])

    if (load.state === "loading") return <Shell><p className="text-center text-amber-100/60 pt-10">Loading...</p></Shell>
    if (load.state === "error") {
        return (
            <Shell>
                <p className="text-center text-red-400 pt-10">
                    Couldn't load the results{" "}
                    <button className="underline" onClick={() => void run()}>Retry</button>
                </p>
            </Shell>
        )
    }

    if (load.state === "hidden") {
        return (
            <Shell>
                <p className="text-center text-amber-100/60 pt-10">Results will be revealed at the ceremony.</p>
            </Shell>
        )
    }

    const { season } = load
    const header = (
        <div className="text-center">
            <div className="text-xs tracking-[0.25em] text-amber-100/60">THE WINNERS</div>
            <h1 className="text-2xl font-black mt-1">{season.name}</h1>
        </div>
    )

    const released = season.results_released_at != null
    return (
        <Shell>
            {header}
            {!released && (
                <>
                    <p className="text-center text-amber-100/60">Results will be revealed at the ceremony.</p>
                    <div className="rounded-xl bg-amber-100/10 border border-amber-100/20 text-center text-xs py-2 px-3">
                        Preview (only the committee can see this)
                    </div>
                </>
            )}
            {load.cards.length === 0 && <p className="text-center text-amber-100/60">No categories yet.</p>}
            {load.cards.map((card) => (
                <section key={card.category_id} className="bg-[#27272a] rounded-2xl p-4">
                    <h2 className="text-xs font-normal uppercase tracking-wide text-amber-100/60">{`${card.number} · ${card.name}`}</h2>
                    {card.pending ? (
                        <p className="text-sm text-amber-100/60 mt-3">No winner recorded</p>
                    ) : (
                        <>
                            <Podium
                                items={card.podium.map((e) => ({
                                    key: e.nominee_id,
                                    slot: e.slot,
                                    name: e.name,
                                    sub: e.tieLabel,
                                    avatarUrl: e.memberIds.length === 1 ? load.avatars[e.memberIds[0]] ?? null : null,
                                }))}
                            />
                            {card.also.length > 0 && (
                                <div className="mt-3">
                                    <div className="text-xs tracking-wide text-amber-100/60">ALSO PLACED</div>
                                    <ul className="space-y-1.5 mt-1.5 list-none p-0">
                                        {card.also.map((a) => (
                                            <li key={a.nominee_id} className="flex items-center gap-2 bg-[#3f3f46] rounded-lg px-3 py-1.5 text-sm">
                                                <span className="text-xs rounded-full bg-zinc-900/60 px-2 py-0.5 text-amber-100/80">{a.placeLabel}</span>
                                                <span className="flex-1 min-w-0 break-words">{a.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {card.note && <p className="mt-3 text-center text-xs text-amber-100/60">{card.note}</p>}
                        </>
                    )}
                </section>
            ))}
        </Shell>
    )
}

export default ResultsPage
