import { supabase } from "../supabaseClient"

export type FeedbackKind = "bug" | "idea" | "other"
export type FeedbackItem = { id: string; user_id: string; kind: FeedbackKind; message: string; resolved: boolean; created_at: string; from: string }

export const FEEDBACK_MAX = 1000
export const KIND_LABEL: Record<FeedbackKind, string> = { bug: "Something's broken", idea: "Idea", other: "Other" }

// The feedback table is not in the generated types until they are regenerated.
type Row = { id: string; user_id: string; kind: FeedbackKind; message: string; resolved: boolean; created_at: string }
type Loose = {
    from: (t: string) => {
        insert: (v: unknown) => PromiseLike<{ error: { message?: string } | null }>
        select: (c: string) => { order: (c: string, o: { ascending: boolean }) => PromiseLike<{ data: Row[] | null; error: { message?: string } | null }> }
        update: (v: unknown) => { eq: (c: string, v: string) => PromiseLike<{ error: { message?: string } | null }> }
        delete: () => { eq: (c: string, v: string) => PromiseLike<{ error: { message?: string } | null }> }
    }
}
const db = supabase as unknown as Loose

export const sendFeedback = async (kind: FeedbackKind, message: string): Promise<void> => {
    const { error } = await db.from("feedback").insert({ kind, message: message.trim() })
    if (error) throw new Error(error.message)
}

// Committee only (RLS returns just your own rows to anyone else). Names come from the members list.
export const fetchFeedback = async (): Promise<FeedbackItem[]> => {
    const [{ data, error }, members] = await Promise.all([
        db.from("feedback").select("id, user_id, kind, message, resolved, created_at").order("created_at", { ascending: false }),
        supabase.from("members").select("name, user_id"),
    ])
    if (error) throw new Error(error.message)
    const names = new Map((members.data ?? []).map((m) => [m.user_id as string, m.name as string]))
    return (data ?? []).map((r) => ({ ...r, from: names.get(r.user_id) ?? "Unknown" }))
}

export const setFeedbackResolved = async (id: string, resolved: boolean): Promise<void> => {
    const { error } = await db.from("feedback").update({ resolved }).eq("id", id)
    if (error) throw new Error(error.message)
}

export const deleteFeedback = async (id: string): Promise<void> => {
    const { error } = await db.from("feedback").delete().eq("id", id)
    if (error) throw new Error(error.message)
}
