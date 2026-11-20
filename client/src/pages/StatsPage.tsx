import { useCallback, useEffect, useRef, useState } from "react"
import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import Podium from "../components/Podium"
import { fetchCurrentSeason } from "../api/ballots"
import { fetchSeasonResults } from "../api/results"
import { fetchMemberAvatars, fetchMembers } from "../api/members"
import { useUserData } from "../context/UserContenxt"
import { ordinal } from "../lib/resultsView"
import { nomineeStats } from "../lib/stats"
import { leaderboard, myCategories, type LeaderRow, type MyCategory } from "../lib/leaderboard"
import type { Nominee, Season } from "../types"

type You = { name: string; row: LeaderRow; won: MyCategory[]; nominatedOnly: MyCategory[] }
type Load =
    | { state: "loading" }
    | { state: "error" }
    | { state: "hidden" }
    | { state: "ready"; season: Season; rows: LeaderRow[]; avatars: Record<string, string | null>; you: You | null }

const VISIBLE = 5

const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24 font-poppins">
        <NavigationBar />
        <main className="px-6 py-6 space-y-4 max-w-md mx-auto">{children}</main>
        <NavigationTabs activeTab={"stats"} />
    </div>
)

const rankLabel = (r: LeaderRow) => (r.tied ? `T${r.rank}` : String(r.rank))
const winsText = (n: number) => `${n} ${n === 1 ? "win" : "wins"}`

const StatsPage = () => {
    const { member, loading: userLoading } = useUserData()
    const [load, setLoad] = useState<Load>({ state: "loading" })
    const [showAll, setShowAll] = useState(false)
    const [showNominated, setShowNominated] = useState(false)

    const seq = useRef(0)
    const run = useCallback(async () => {
        const mine = ++seq.current
        setLoad({ state: "loading" })
        try {
            const season = await fetchCurrentSeason()
            if (mine !== seq.current) return
            if (!season || season.results_released_at == null) {
                setLoad({ state: "hidden" })
                return
            }
            const [{ categories, results }, members, avatars] = await Promise.all([
                fetchSeasonResults(season.id),
                fetchMembers(),
                fetchMemberAvatars().catch(() => ({}) as Record<string, string | null>),
            ])
            const nominees: Record<string, Nominee> = {}
            for (const c of categories) for (const n of c.nominees) nominees[n.id] = n
            const stats = nomineeStats(Object.values(results), nominees).members
            const rows = leaderboard(stats, members)
            let you: You | null = null
            if (member) {
                const row = rows.find((r) => r.member_id === member.id)
                if (row) you = { name: member.name, row, ...myCategories(categories, results, member.id, members) }
            }
            if (mine !== seq.current) return
            setLoad({ state: "ready", season, rows, avatars, you })
        } catch (e) {
            if (mine !== seq.current) return
            console.error("Error loading stats: ", e)
            setLoad({ state: "error" })
        }
    }, [member])

    useEffect(() => {
        if (userLoading) return
        void run()
    }, [run, userLoading])

    if (load.state === "loading") return <Shell><p role="status" className="text-center text-amber-100/60 pt-10">Loading...</p></Shell>
    if (load.state === "error") {
        return (
            <Shell>
                <p className="text-center text-red-400 pt-10" role="alert">
                    Couldn't load the stats{" "}
                    <button className="underline" onClick={() => void run()}>Retry</button>
                </p>
            </Shell>
        )
    }
    if (load.state === "hidden") {
        return <Shell><p className="text-center text-amber-100/60 pt-10">Stats appear after the reveal.</p></Shell>
    }

    const { season, rows, avatars, you } = load
    const hasWins = rows.length > 0 && rows[0].wins > 0
    const top = hasWins ? rows.slice(0, 3) : []
    const rest = hasWins ? rows.slice(3) : rows
    const shown = showAll ? rest : rest.slice(0, VISIBLE)
    const hidden = rest.length - shown.length

    return (
        <Shell>
            <h1 className="text-3xl font-black">Statistics</h1>

            <section className="bg-[#27272a] rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold">Season leaders</h2>
                    <span className="text-xs rounded-full bg-amber-100/10 border border-amber-100/20 px-2 py-0.5">{season.name}</span>
                </div>
                {!hasWins && <p className="text-sm text-amber-100/60 mt-3">No wins yet.</p>}
                {top.length > 0 && (
                    <Podium
                        items={top.map((r, i) => ({
                            key: r.member_id,
                            slot: (i + 1) as 1 | 2 | 3,
                            name: r.name,
                            sub: winsText(r.wins),
                            tag: r.tied ? `tied ${ordinal(r.rank)}` : null,
                            avatarUrl: avatars[r.member_id] ?? null,
                        }))}
                    />
                )}
                {rest.length > 0 && (
                    <>
                        <div aria-hidden="true" className="text-[10px] text-amber-100/60 mt-3 text-right">Wins · Nominations · Win %</div>
                        <ol start={hasWins ? 4 : 1} className="space-y-1.5 mt-1 list-none p-0">
                            {shown.map((r) => (
                                <li key={r.member_id} className="flex items-center gap-2 bg-[#3f3f46] rounded-lg px-3 py-1.5 text-sm">
                                    <span className="w-6 text-xs text-amber-100/70">
                                        <span aria-hidden="true">{rankLabel(r)}</span>
                                        <span className="sr-only">{r.tied ? `tied ${ordinal(r.rank)}` : ordinal(r.rank)}: </span>
                                    </span>
                                    {avatars[r.member_id] ? (
                                        <span
                                            aria-hidden="true"
                                            className="w-6 h-6 rounded-full bg-cover bg-center shrink-0"
                                            style={{ backgroundColor: "#71717a", backgroundImage: `url("${encodeURI(avatars[r.member_id] as string)}")` }}
                                        />
                                    ) : (
                                        <span aria-hidden="true" className="w-6 h-6 shrink-0" />
                                    )}
                                    <span className="flex-1 min-w-0 break-words">{r.name}</span>
                                    <span aria-hidden="true" className="text-xs text-amber-100/70 whitespace-nowrap">{`${r.wins} · ${r.noms} · ${r.rate}%`}</span>
                                    <span className="sr-only">{`${r.wins} ${r.wins === 1 ? "win" : "wins"}, ${r.noms} ${r.noms === 1 ? "nomination" : "nominations"}, ${r.rate} percent`}</span>
                                </li>
                            ))}
                        </ol>
                        {rest.length > VISIBLE && (
                            <button className="mt-2 text-xs underline text-amber-100/80" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                                {showAll ? "Show fewer ▴" : `+ ${hidden} more ▾`}
                            </button>
                        )}
                    </>
                )}
            </section>

            {you && (
                <section className="bg-[#27272a] rounded-2xl p-4">
                    <h2 className="text-lg font-bold">{`You (${you.name})`}</h2>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        {[
                            { label: "Wins", value: String(you.row.wins) },
                            { label: "Nominations", value: String(you.row.noms) },
                            { label: "Win rate", value: `${you.row.rate}%` },
                        ].map((t) => (
                            <div key={t.label} className="bg-[#3f3f46] rounded-xl py-2">
                                <div className="text-2xl font-black">{t.value}</div>
                                <div className="text-[10px] text-amber-100/60">{t.label}</div>
                            </div>
                        ))}
                    </div>
                    <h3 className="text-xs tracking-wide text-amber-100/60 mt-4">CATEGORIES YOU WON</h3>
                    {you.won.length === 0 ? (
                        <p className="text-sm text-amber-100/60 mt-1.5">No wins this season.</p>
                    ) : (
                        <ul className="space-y-1.5 mt-1.5 list-none p-0">
                            {you.won.map((c) => (
                                <li key={c.category_id} className="flex items-center gap-2 bg-[#3f3f46] rounded-lg px-3 py-1.5 text-sm">
                                    <span className="flex-1 min-w-0 break-words">{c.label}</span>
                                    <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ backgroundColor: "#FFC23D", color: "#3b2a00" }}>Winner</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {you.nominatedOnly.length > 0 && (
                        <div className="mt-3">
                            <button className="text-xs tracking-wide text-amber-100/60" aria-expanded={showNominated} onClick={() => setShowNominated((v) => !v)}>
                                {`NOMINATED, DIDN'T WIN · ${you.nominatedOnly.length} ${showNominated ? "▴" : "▾"}`}
                            </button>
                            {showNominated && (
                                <ul className="space-y-1.5 mt-1.5 list-none p-0">
                                    {you.nominatedOnly.map((c) => (
                                        <li key={c.category_id} className="bg-[#3f3f46] rounded-lg px-3 py-1.5 text-sm break-words">{c.label}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </section>
            )}
        </Shell>
    )
}

export default StatsPage
