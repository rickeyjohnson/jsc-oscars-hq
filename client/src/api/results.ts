import { supabase } from "../supabaseClient"
import type { Place, ResultRow } from "../types"

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

// Committee only. Reveals the season's results to members and marks its finished ballots released.
export const releaseSeasonResults = async (seasonId: string): Promise<void> => {
    const now = new Date().toISOString()
    const { error } = await supabase.from("seasons").update({ results_released_at: now }).eq("id", seasonId)
    if (error) throw error
    const closed = await supabase.from("ballots").update({ status: "released" }).eq("season_id", seasonId).eq("status", "closed")
    if (closed.error) throw closed.error
    // open ballots whose window has ended count as closed
    const ended = await supabase.from("ballots").update({ status: "released" }).eq("season_id", seasonId).eq("status", "open").lte("closes_at", now)
    if (ended.error) throw ended.error
}
