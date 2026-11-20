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
