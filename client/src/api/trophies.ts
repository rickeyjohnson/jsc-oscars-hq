import { supabase } from "../supabaseClient"

export type TrophyAward = { id: string; member_id: string; semester: string; award: string }

// trophy_awards is not in the generated types until they are regenerated after the migration.
type Err = { message?: string; code?: string } | null
type Loose = {
    from: (t: string) => {
        select: (c: string) => PromiseLike<{ data: TrophyAward[] | null; error: Err }>
        insert: (v: unknown) => PromiseLike<{ error: Err }>
        update: (v: unknown) => { eq: (c: string, v: string) => PromiseLike<{ error: Err }> }
        delete: () => { eq: (c: string, v: string) => PromiseLike<{ error: Err }> }
    }
}
const db = supabase as unknown as Loose

export const TROPHIES_UNAVAILABLE = "Trophy names aren't set up yet"
const isMissing = (e: NonNullable<Err>) => e.code === "42P01" || e.code === "PGRST205" || /trophy_awards/.test(e.message ?? "")

/** Every named award. A missing table reads as "none yet", so the shelf still shows the wins. */
export const fetchAwards = async (): Promise<TrophyAward[]> => {
    const { data, error } = await db.from("trophy_awards").select("id, member_id, semester, award")
    if (error) {
        if (isMissing(error)) return []
        throw new Error(error.message)
    }
    return data ?? []
}

export const addAward = async (memberId: string, semester: string, award: string): Promise<void> => {
    const { error } = await db.from("trophy_awards").insert({ member_id: memberId, semester: semester.trim(), award: award.trim() })
    if (error) throw new Error(isMissing(error) ? TROPHIES_UNAVAILABLE : error.message)
}

export const renameAward = async (id: string, award: string): Promise<void> => {
    const { error } = await db.from("trophy_awards").update({ award: award.trim() }).eq("id", id)
    if (error) throw new Error(error.message)
}

export const removeAward = async (id: string): Promise<void> => {
    const { error } = await db.from("trophy_awards").delete().eq("id", id)
    if (error) throw new Error(error.message)
}
