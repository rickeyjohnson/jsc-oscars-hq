import { supabase } from "../supabaseClient"
import type { PastStatRow } from "../lib/pastStats"

export const PAST_STATS_UNAVAILABLE = "Previous stats aren't available yet"
export type PastStatsResult = { available: true; rows: PastStatRow[] } | { available: false }

// Postgres 42P01 / PostgREST PGRST205: the table is not deployed yet.
const isMissingTable = (e: { code?: string; message?: string }) => e.code === "42P01" || e.code === "PGRST205" || /past_stats/.test(e.message ?? "") && /does not exist|schema cache/.test(e.message ?? "")

// Members read every row (RLS). Not cached. A missing table is "not available yet", not an error.
// past_stats is not in the generated types until they are regenerated after the migration is applied.
type Untyped = { from: (t: string) => { select: (c: string) => { order: (c: string) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> } } }

export const fetchPastStats = async (): Promise<PastStatsResult> => {
    const { data, error } = await (supabase as unknown as Untyped).from("past_stats").select("season_label, season_order, member_id, noms, wins").order("season_order")
    if (error) {
        if (isMissingTable(error)) return { available: false }
        throw error
    }
    return { available: true, rows: (data ?? []) as PastStatRow[] }
}
