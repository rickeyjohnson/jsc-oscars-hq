import { supabase } from "../supabaseClient"
import type { Member } from "../types"

export const fetchAvailableMemberNames = async (): Promise<string[]> => {
    const { data, error } = await supabase.rpc("available_member_names")
    if (error) throw error
    return (data ?? []) as string[]
}

export const fetchMembers = async (): Promise<Member[]> => {
    const { data, error } = await supabase.from("members").select("id, name, user_id").order("name")
    if (error) throw error
    return (data ?? []) as Member[]
}

// Member ids of the committee: members whose account has profiles.is_committee.
export const fetchCommitteeMemberIds = async (): Promise<string[]> => {
    const [profiles, members] = await Promise.all([
        supabase.from("profiles").select("user_id").eq("is_committee", true),
        fetchMembers(),
    ])
    if (profiles.error) throw profiles.error
    const committee = new Set((profiles.data ?? []).map((p) => p.user_id))
    return members.filter((m) => m.user_id && committee.has(m.user_id)).map((m) => m.id)
}

// Member id -> profile photo url (null when the member has no claimed account or no photo).
export const fetchMemberAvatars = async (): Promise<Record<string, string | null>> => {
    const [members, profiles] = await Promise.all([fetchMembers(), supabase.from("profiles").select("user_id, image_url")])
    if (profiles.error) throw profiles.error
    const byUser = new Map((profiles.data ?? []).map((p) => [p.user_id as string, (p.image_url as string | null) ?? null]))
    const out: Record<string, string | null> = {}
    for (const m of members) out[m.id] = m.user_id ? byUser.get(m.user_id) ?? null : null
    return out
}

// Committee-only RPC: unlinks the member and deletes that account's votes.
export const resetMemberClaim = async (name: string): Promise<void> => {
    const { error } = await supabase.rpc("reset_member_claim", { p_name: name })
    if (error) throw error
}

export const countVotesBy = async (userId: string): Promise<number> => {
    const { count, error } = await supabase.from("votes").select("id", { count: "exact", head: true }).eq("voter_id", userId)
    if (error) throw error
    return count ?? 0
}
