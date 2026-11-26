import { leaderboard, totalsFor, type Member, type PastRow, type SortKey, type Totals } from "./statsMath.ts"

export type SeasonInfo = { id: string; name: string; ceremony_at: string | null; location: string | null; results_released_at: string | null }
export type BallotInfo = { name: string; round: string; status: string; opens_at: string; closes_at: string; categories: number; myVotes: number }
export type WinnerInfo = { ballot: string; category: string; winner: string | null }

/** Everything the tools read. The edge function backs it with the member's own Supabase client, so RLS applies. */
export type ToolDb = {
    pastStats(): Promise<PastRow[]>
    members(): Promise<Member[]>
    season(): Promise<SeasonInfo | null>
    ballots(seasonId: string): Promise<BallotInfo[]>
    winners(seasonId: string): Promise<WinnerInfo[]>
    myoc(seasonId: string): Promise<{ opens_at: string; closes_at: string } | null>
}

const fn = (name: string, description: string, properties: Record<string, unknown> = {}) => ({
    type: "function",
    function: { name, description, parameters: { type: "object", properties, required: [] as string[] } },
})

export const TOOL_DEFS = [
    fn("get_my_stats", "The signed-in member's own all-time wins, nominations, win rate and rank."),
    fn("get_member_stats", "All-time wins, nominations and win rate for another member, by name.", { name: { type: "string", description: "First or full name" } }),
    fn("get_leaderboard", "The all-time leaderboard of past seasons.", {
        sort: { type: "string", enum: ["wins", "noms", "rate"], description: "wins (default), noms or rate" },
        limit: { type: "number", description: "How many rows, 1 to 10 (default 5)" },
    }),
    fn("get_season_winners", "Winners of the current season's categories. Only works after the committee releases results.", { category: { type: "string", description: "Optional: part of a category name" } }),
    fn("get_ballots", "The current season's ballots: status, when they close, how many categories, and how many the member has voted on."),
    fn("get_ceremony", "When and where the Oscar night ceremony is."),
    fn("get_myoc_status", "Whether the Make Your Own Categories window is upcoming, open or closed, and when."),
]

const STATS_NOTE = "Stats cover past seasons on file (the current season is not included). Nominations for Fall 23 and Fall 24 were counted from slides, so they can be a little low."
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10)
const row = (t: Totals) => ({ wins: t.wins, nominations: t.noms, win_rate_percent: round1(t.rate), seasons: t.seasons })

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) + " ET" : null)

/** Runs one tool by name. Every answer is a short string the model reads as data. */
export function makeToolRunner(db: ToolDb, memberId: string | null, now: Date = new Date()): (name: string, args: unknown) => Promise<string> {
    const out = (v: unknown) => JSON.stringify(v)
    const a = (args: unknown): Record<string, unknown> => (args && typeof args === "object" ? (args as Record<string, unknown>) : {})

    const rankOf = (rows: PastRow[], members: Member[], id: string, sort: SortKey) => leaderboard(rows, members, sort).find((r) => r.id === id)

    const stats = async (id: string, label: string) => {
        const [rows, members] = await Promise.all([db.pastStats(), db.members()])
        const t = totalsFor(rows, id)
        if (t.noms === 0) return out({ member: label, note: "No nominations on file yet.", stats_note: STATS_NOTE })
        const rank = (k: SortKey) => {
            const r = rankOf(rows, members, id, k)
            return r ? `${r.tied ? "tied " : ""}#${r.rank}` : "not ranked"
        }
        return out({ member: label, ...row(t), rank_by_wins: rank("wins"), rank_by_nominations: rank("noms"), rank_by_win_rate: rank("rate"), stats_note: STATS_NOTE })
    }

    return async (name, args) => {
        const p = a(args)
        switch (name) {
            case "get_my_stats": {
                if (!memberId) return "No member is linked to this account yet."
                const members = await db.members()
                return stats(memberId, members.find((m) => m.id === memberId)?.name ?? "You")
            }
            case "get_member_stats": {
                const q = typeof p.name === "string" ? p.name.trim().toLowerCase() : ""
                if (!q) return "Give a member name."
                const members = await db.members()
                const exact = members.filter((m) => m.name.toLowerCase() === q)
                const hits = exact.length > 0 ? exact : members.filter((m) => m.name.toLowerCase().split(/\s+/)[0] === q || m.name.toLowerCase().includes(q))
                if (hits.length === 0) return `No member with that name.`
                if (hits.length > 1) return `More than one member matches: ${hits.map((m) => m.name).join(", ")}. Ask which one.`
                return stats(hits[0].id, hits[0].name)
            }
            case "get_leaderboard": {
                const sort: SortKey = p.sort === "noms" || p.sort === "rate" ? p.sort : "wins"
                const limit = Math.min(10, Math.max(1, Math.floor(Number(p.limit) || 5)))
                const [rows, members] = await Promise.all([db.pastStats(), db.members()])
                const board = leaderboard(rows, members, sort).slice(0, limit)
                const note = sort === "rate" ? `${STATS_NOTE} Only members with at least 10 nominations are ranked by win rate.` : STATS_NOTE
                return out({ sorted_by: sort, rows: board.map((r) => ({ rank: `${r.tied ? "tied " : ""}#${r.rank}`, name: r.name, ...row(r) })), stats_note: note })
            }
            case "get_season_winners": {
                const season = await db.season()
                if (!season) return "There is no season yet."
                if (!season.results_released_at) return "Results aren't released yet."
                const q = typeof p.category === "string" ? p.category.trim().toLowerCase() : ""
                const all = await db.winners(season.id)
                const list = (q ? all.filter((w) => w.category.toLowerCase().includes(q)) : all).slice(0, 25)
                return list.length === 0 ? "No winners found." : out({ season: season.name, winners: list.map((w) => ({ category: w.category, ballot: w.ballot, winner: w.winner ?? "no winner recorded" })) })
            }
            case "get_ballots": {
                const season = await db.season()
                if (!season) return "There is no season yet."
                const list = await db.ballots(season.id)
                if (list.length === 0) return "No ballots yet."
                return out({ season: season.name, ballots: list.map((b) => ({ name: b.name, round: b.round, status: b.status, opens: when(b.opens_at), closes: when(b.closes_at), categories: b.categories, you_have_voted_on: b.myVotes })) })
            }
            case "get_ceremony": {
                const season = await db.season()
                if (!season) return "There is no season yet."
                return out({ season: season.name, when: when(season.ceremony_at) ?? "not set yet", where: season.location ?? "not set yet" })
            }
            case "get_myoc_status": {
                const season = await db.season()
                if (!season) return "There is no season yet."
                const w = await db.myoc(season.id)
                if (!w) return "No Make Your Own Categories window has been set up yet."
                const state = now < new Date(w.opens_at) ? "upcoming" : now <= new Date(w.closes_at) ? "open" : "closed"
                return out({ state, opens: when(w.opens_at), closes: when(w.closes_at) })
            }
            default:
                return "unknown tool"
        }
    }
}
