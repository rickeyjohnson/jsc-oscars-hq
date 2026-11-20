import { supabase } from "../supabaseClient"
import type { ResultRow } from "../types"

// Committee reads every result; members only after the season is released (RLS).
export const fetchResults = async (categoryIds: string[]): Promise<ResultRow[]> => {
    if (categoryIds.length === 0) return []
    const { data, error } = await supabase
        .from("results")
        .select("category_id, decided_ballot_id, winner_nominee_id, nominee_ids, top3_nominee_ids, decided_by")
        .in("category_id", categoryIds)
    if (error) throw error
    return (data ?? []) as ResultRow[]
}

// Committee only (RLS). One row per category (primary key category_id).
export const upsertResults = async (rows: ResultRow[]): Promise<void> => {
    if (rows.length === 0) return
    const now = new Date().toISOString()
    const { error } = await supabase.from("results").upsert(rows.map((r) => ({ ...r, updated_at: now })), { onConflict: "category_id" })
    if (error) throw error
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
