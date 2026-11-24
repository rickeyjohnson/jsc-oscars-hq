import type { SupabaseClient } from "@supabase/supabase-js"
import { supabase as typed } from "../supabaseClient"
import { fetchMembers } from "./members"
import { toUtcIso } from "../lib/time"
import { withAuthors, type IdeaDraft, type MyocIdea, type MyocStatus, type MyocWindow, type ReviewIdea } from "../lib/myoc"

// The MYOC tables are not in database.types.ts until the DB change is applied and types are regenerated, so talk to them untyped.
const supabase = typed as unknown as SupabaseClient

const IDEA_COLS = "id, window_id, author_id, name, description, hint, status, merged_into, assigned_category, created_at, updated_at"
const WINDOW_COLS = "id, season_id, opens_at, closes_at"

// A missing table / failed query throws; callers map it with myocErrorKind (the tables ship in a separate DB change).
export const fetchMyocWindows = async (seasonId: string): Promise<MyocWindow[]> => {
    const { data, error } = await supabase.from("myoc_windows").select(WINDOW_COLS).eq("season_id", seasonId).order("opens_at", { ascending: false })
    if (error) throw error
    return (data ?? []) as MyocWindow[]
}

export const createMyocWindow = async (seasonId: string, opensLocal: string, closesLocal: string): Promise<void> => {
    const { error } = await supabase.from("myoc_windows").insert({ season_id: seasonId, opens_at: toUtcIso(opensLocal), closes_at: toUtcIso(closesLocal) })
    if (error) throw error
}

export const updateMyocWindow = async (id: string, patch: { opens_at?: string; closes_at?: string }): Promise<void> => {
    const { error } = await supabase.from("myoc_windows").update(patch).eq("id", id)
    if (error) throw error
}

// RLS: a member gets only their own rows; the committee gets everyone's.
export const fetchIdeas = async (windowId: string): Promise<MyocIdea[]> => {
    const { data, error } = await supabase.from("myoc_ideas").select(IDEA_COLS).eq("window_id", windowId).order("created_at", { ascending: false })
    if (error) throw error
    return (data ?? []) as MyocIdea[]
}

/** Only the signed-in member's own ideas (the committee's RLS also lets them read everyone's, so filter explicitly). */
export const fetchMyIdeas = async (windowId: string): Promise<MyocIdea[]> => {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) return []
    const { data, error } = await supabase.from("myoc_ideas").select(IDEA_COLS).eq("window_id", windowId).eq("author_id", uid).order("created_at", { ascending: false })
    if (error) throw error
    return (data ?? []) as MyocIdea[]
}

export const fetchReviewIdeas = async (windowId: string): Promise<ReviewIdea[]> => {
    const [ideas, members] = await Promise.all([fetchIdeas(windowId), fetchMembers()])
    return withAuthors(ideas, members)
}

export const submitIdea = async (windowId: string, d: IdeaDraft): Promise<void> => {
    const { error } = await supabase.from("myoc_ideas").insert({ window_id: windowId, name: d.name.trim(), description: d.description.trim(), hint: d.hint })
    if (error) throw error
}

// An update RLS filters out matches no row and raises nothing, so no returned row means it did not happen.
const changed = (data: unknown[] | null) => {
    if (!data || data.length === 0) throw new Error("That idea can't be changed any more.")
}

export const editIdea = async (id: string, d: IdeaDraft): Promise<void> => {
    const { data, error } = await supabase.from("myoc_ideas").update({ name: d.name.trim(), description: d.description.trim(), hint: d.hint }).eq("id", id).select("id")
    if (error) throw error
    changed(data)
}

export const withdrawIdea = async (id: string): Promise<void> => {
    const { data, error } = await supabase.from("myoc_ideas").update({ status: "withdrawn" }).eq("id", id).select("id")
    if (error) throw error
    changed(data)
}

export type ReviewPatch = { name?: string; description?: string; hint?: IdeaDraft["hint"]; status?: MyocStatus; merged_into?: string | null; assigned_category?: string | null }
// Committee only (RLS + trigger). Leaving merge status always clears merged_into.
export const reviewIdea = async (id: string, patch: ReviewPatch): Promise<void> => {
    const next = { ...patch }
    if (next.status && next.status !== "merged") next.merged_into = null
    const { data, error } = await supabase.from("myoc_ideas").update(next).eq("id", id).select("id")
    if (error) throw error
    changed(data)
}
