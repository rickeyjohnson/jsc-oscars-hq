// The tools' view of the database. It uses the member's own Supabase client, so row-level security
// decides what they can see (for example, results stay hidden until the committee releases them).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2"
import type { BallotInfo, SeasonInfo, ToolDb, WinnerInfo } from "../_shared/chat/tools.ts"

type Res<T> = { data: T[] | null; error: { message: string } | null }
const rows = <T>(r: Res<T>): T[] => {
    if (r.error) throw new Error(r.error.message)
    return r.data ?? []
}

export function makeDb(db: SupabaseClient, uid: string): ToolDb {
    const season = async (): Promise<SeasonInfo | null> => {
        const r = rows<SeasonInfo>(await db.from("seasons").select("id, name, ceremony_at, location, results_released_at").order("ceremony_at", { ascending: false, nullsFirst: false }).limit(1))
        return r[0] ?? null
    }
    return {
        pastStats: async () => rows(await db.from("past_stats").select("season_label, season_order, member_id, noms, wins")),
        members: async () => rows(await db.from("members").select("id, name")),
        season,
        ballots: async (seasonId): Promise<BallotInfo[]> => {
            const bs = rows<{ id: string; name: string; round: string; status: string; opens_at: string; closes_at: string; parent_ballot_id: string | null }>(
                await db.from("ballots").select("id, name, round, status, opens_at, closes_at, parent_ballot_id").eq("season_id", seasonId).neq("status", "draft").order("closes_at"),
            )
            if (bs.length === 0) return []
            const ids = bs.map((b) => b.id)
            const [cats, rounds, votes] = await Promise.all([
                db.from("categories").select("ballot_id").in("ballot_id", ids),
                db.from("round_nominees").select("ballot_id, category_id").in("ballot_id", ids),
                db.from("votes").select("ballot_id").in("ballot_id", ids).eq("voter_id", uid),
            ])
            const catRows = rows<{ ballot_id: string }>(cats as Res<{ ballot_id: string }>)
            const roundRows = rows<{ ballot_id: string; category_id: string }>(rounds as Res<{ ballot_id: string; category_id: string }>)
            const voteRows = rows<{ ballot_id: string }>(votes as Res<{ ballot_id: string }>)
            return bs.map((b) => {
                const isRound = b.round !== "main" && b.parent_ballot_id !== null
                const categories = isRound ? new Set(roundRows.filter((r) => r.ballot_id === b.id).map((r) => r.category_id)).size : catRows.filter((c) => c.ballot_id === b.id).length
                return { name: b.name, round: b.round, status: b.status, opens_at: b.opens_at, closes_at: b.closes_at, categories, myVotes: voteRows.filter((v) => v.ballot_id === b.id).length }
            })
        },
        winners: async (seasonId): Promise<WinnerInfo[]> => {
            const bs = rows<{ id: string; name: string }>(await db.from("ballots").select("id, name").eq("season_id", seasonId).eq("round", "main").neq("status", "draft").order("opens_at"))
            if (bs.length === 0) return []
            const cats = rows<{ id: string; name: string; ballot_id: string }>(await db.from("categories").select("id, name, ballot_id").in("ballot_id", bs.map((b) => b.id)).order("sort_order"))
            if (cats.length === 0) return []
            const results = rows<{ category_id: string; winner_nominee_id: string | null }>(await db.from("results").select("category_id, winner_nominee_id").in("category_id", cats.map((c) => c.id)))
            const winnerIds = [...new Set(results.map((r) => r.winner_nominee_id).filter((x): x is string => Boolean(x)))]
            const names = new Map<string, string>()
            if (winnerIds.length > 0) for (const n of rows<{ id: string; display_name: string }>(await db.from("nominees").select("id, display_name").in("id", winnerIds))) names.set(n.id, n.display_name)
            const byCat = new Map(results.map((r) => [r.category_id, r.winner_nominee_id]))
            const ballotName = new Map(bs.map((b) => [b.id, b.name]))
            return cats.filter((c) => byCat.has(c.id)).map((c) => ({ ballot: ballotName.get(c.ballot_id) ?? "", category: c.name, winner: byCat.get(c.id) ? (names.get(byCat.get(c.id) as string) ?? null) : null }))
        },
        myoc: async (seasonId) => {
            const r = rows<{ opens_at: string; closes_at: string }>(await db.from("myoc_windows").select("opens_at, closes_at").eq("season_id", seasonId).order("opens_at", { ascending: false }).limit(1))
            return r[0] ?? null
        },
    }
}
