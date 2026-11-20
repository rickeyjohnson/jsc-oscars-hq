import { supabase } from "../supabaseClient"
import { buildNomineeRows } from "../lib/ballotForm"
import { toUtcIso } from "../lib/time"
import type { BallotFormData, BallotStatus, Member, Season } from "../types"

export const fetchSeasons = async (): Promise<Season[]> => {
    const { data, error } = await supabase.from("seasons").select("*").order("ceremony_at", { ascending: false })
    if (error) throw error
    return (data ?? []) as Season[]
}

// Saves the form as a draft (insert or update) and rewrites its categories and nominees.
export const saveBallotDraft = async (form: BallotFormData, members: Member[], ballotId?: string): Promise<string> => {
    const fields = {
        season_id: form.season_id,
        name: form.name.trim(),
        opens_at: toUtcIso(form.opens_at),
        closes_at: toUtcIso(form.closes_at),
        status: "draft" as const,
    }
    let id = ballotId
    if (id) {
        const { error } = await supabase.from("ballots").update(fields).eq("id", id)
        if (error) throw error
        const { error: delError } = await supabase.from("categories").delete().eq("ballot_id", id)
        if (delError) throw delError
    } else {
        const { data, error } = await supabase.from("ballots").insert(fields).select("id").single()
        if (error) throw error
        id = data.id as string
    }

    for (const [index, category] of form.categories.entries()) {
        const { data: cat, error } = await supabase
            .from("categories")
            .insert({
                ballot_id: id,
                name: category.name,
                description: category.description,
                sort_order: index,
                nominee_mode: category.nominee_mode,
                allow_member_add: category.allow_member_add,
            })
            .select("id")
            .single()
        if (error) throw error
        const rows = buildNomineeRows(category, members).map((r) => ({ ...r, category_id: cat.id as string }))
        if (rows.length > 0) {
            const { error: nomError } = await supabase.from("nominees").insert(rows)
            if (nomError) throw nomError
        }
    }
    return id
}

export const setBallotStatus = async (ballotId: string, status: BallotStatus): Promise<void> => {
    const { error } = await supabase.from("ballots").update({ status }).eq("id", ballotId)
    if (error) throw error
}
