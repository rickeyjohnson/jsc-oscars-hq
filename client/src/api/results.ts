import { supabase } from "../supabaseClient"
import { runRelease, type ReleaseIO, type ReleaseStatus } from "../lib/release"
import type { Ballot, Category, Place, ResultRow, Season } from "../types"
import { fetchBallotDetail } from "./ballots"

// Committee reads every result; members only after the season is released (RLS).
export const fetchResults = async (categoryIds: string[]): Promise<ResultRow[]> => {
    if (categoryIds.length === 0) return []
    const { data, error } = await supabase
        .from("results")
        .select("category_id, decided_ballot_id, winner_nominee_id, nominee_ids, top3_nominee_ids, decided_by, places")
        .in("category_id", categoryIds)
    if (error) throw error
    return (data ?? []) as ResultRow[]
}

// Committee only (RLS). One row per category (primary key category_id).
// A row without `places` leaves the stored places alone (the key is not sent).
// Rows in one call should agree on whether they carry places: PostgREST sends the union of keys
// and fills a missing one with null (default_to_null).
export const upsertResults = async (rows: ResultRow[]): Promise<void> => {
    if (rows.length === 0) return
    const now = new Date().toISOString()
    const payload = rows.map(({ places, ...rest }) => (places === undefined ? { ...rest, updated_at: now } : { ...rest, places, updated_at: now }))
    const { error } = await supabase.from("results").upsert(payload, { onConflict: "category_id" })
    if (error) throw error
}

// Committee only. Fills podium places on recorded rows whose places are still null (never
// overwrites places written since the panel loaded); touches no other column.
// Returns how many rows were actually filled.
export const updatePlaces = async (rows: { category_id: string; places: Place[] }[]): Promise<number> => {
    let filled = 0
    for (const { category_id, places } of rows) {
        const { data, error } = await supabase.from("results").update({ places }).eq("category_id", category_id).is("places", null).select("category_id")
        if (error) throw error
        filled += data?.length ?? 0
    }
    return filled
}

// Committee only. Everything the release checks need for one season.
export const fetchReleaseStatus = async (seasonId: string): Promise<ReleaseStatus> => {
    const { data: season, error } = await supabase.from("seasons").select("*").eq("id", seasonId).single()
    if (error) throw error
    const { data: ballots, error: bError } = await supabase.from("ballots").select("*").eq("season_id", seasonId)
    if (bError) throw bError
    const all = (ballots ?? []) as Ballot[]
    const mains = all.filter((b) => b.round === "main" && b.status !== "draft")
    const details = await Promise.all(mains.map((b) => fetchBallotDetail(b.id)))
    const mainCategoryIds = details.flatMap((d) => d.categories.map((c) => c.id))
    const rows = await fetchResults(mainCategoryIds)
    const results: Record<string, ResultRow> = {}
    for (const r of rows) results[r.category_id] = r
    return { season: season as Season, ballots: all, mainCategoryIds, results }
}

const realReleaseIO: ReleaseIO = {
    load: fetchReleaseStatus,
    async releaseBallots(seasonId, nowIso) {
        const closed = await supabase.from("ballots").update({ status: "released" }).eq("season_id", seasonId).eq("status", "closed")
        if (closed.error) throw closed.error
        // open ballots whose window has ended count as closed
        const ended = await supabase.from("ballots").update({ status: "released" }).eq("season_id", seasonId).eq("status", "open").lte("closes_at", nowIso)
        if (ended.error) throw ended.error
    },
    async markSeasonReleased(seasonId, nowIso) {
        const { data, error } = await supabase
            .from("seasons")
            .update({ results_released_at: nowIso })
            .eq("id", seasonId)
            .is("results_released_at", null)
            .select("id")
        if (error) throw error
        return (data ?? []).length === 1
    },
}

// Committee only. Checks first (no writes if any fail), marks finished ballots released,
// then reveals the season's results to members last.
export const releaseSeasonResults = (seasonId: string): Promise<void> => runRelease(realReleaseIO, seasonId, new Date())

export type SeasonResults = { categories: Category[]; results: Record<string, ResultRow> }

// Main, non-draft ballots of the season by opens_at; their categories in ballot order, with recorded results.
export const fetchSeasonResults = async (seasonId: string): Promise<SeasonResults> => {
    const { data: ballots, error } = await supabase
        .from("ballots")
        .select("id")
        .eq("season_id", seasonId)
        .eq("round", "main")
        .neq("status", "draft")
        .order("opens_at")
    if (error) throw error
    const details = await Promise.all((ballots ?? []).map((b) => fetchBallotDetail(b.id as string)))
    const categories = details.flatMap((d) => d.categories)
    const rows = await fetchResults(categories.map((c) => c.id))
    const results: Record<string, ResultRow> = {}
    for (const r of rows) results[r.category_id] = r
    return { categories, results }
}
