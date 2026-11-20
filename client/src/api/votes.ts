import { supabase } from "../supabaseClient"

// votes.voter_id is the auth user id (default auth.uid()); RLS enforces window, self-vote and claim.
const currentUserId = async (): Promise<string> => {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!data.user) throw new Error("Not signed in")
    return data.user.id
}

export const fetchMyVotes = async (ballotId: string): Promise<Record<string, string>> => {
    const uid = await currentUserId()
    const { data, error } = await supabase.from("votes").select("category_id, nominee_id").eq("ballot_id", ballotId).eq("voter_id", uid)
    if (error) throw error
    return Object.fromEntries((data ?? []).map((v) => [v.category_id, v.nominee_id]))
}

export const castVote = async (ballotId: string, categoryId: string, nomineeId: string): Promise<void> => {
    const uid = await currentUserId()
    const { error } = await supabase
        .from("votes")
        .upsert(
            { ballot_id: ballotId, category_id: categoryId, nominee_id: nomineeId, voter_id: uid },
            { onConflict: "ballot_id,category_id,voter_id" },
        )
    if (error) throw error
}

export const clearVote = async (ballotId: string, categoryId: string): Promise<void> => {
    const uid = await currentUserId()
    const { error } = await supabase.from("votes").delete().eq("ballot_id", ballotId).eq("category_id", categoryId).eq("voter_id", uid)
    if (error) throw error
}

export const addNominee = async (categoryId: string, displayName: string, memberIds: string[]): Promise<string> => {
    const { data, error } = await supabase.rpc("add_nominee", {
        p_category: categoryId,
        p_display_name: displayName,
        p_member_ids: memberIds,
    })
    if (error) throw error
    return data as string
}
