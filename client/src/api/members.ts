import { supabase } from "../supabaseClient"
import type { Member } from "../types"
import { dedupe, forget } from "../lib/cache/dedup"

export const fetchAvailableMemberNames = async (): Promise<string[]> => {
    const { data, error } = await supabase.rpc("available_member_names")
    if (error) throw error
    return (data ?? []) as string[]
}

export type MemberNameStatus = { name: string; taken: boolean }

// All member names with a taken flag (RPC member_name_status, callable signed out). If the RPC is not deployed yet
// (or fails for any reason) fall back to the available names only, so signup is never blocked by this.
export const fetchMemberNameStatus = async (): Promise<MemberNameStatus[]> => {
    const { data, error } = await supabase.rpc("member_name_status")
    if (!error) return ((data ?? []) as MemberNameStatus[]).map((r) => ({ name: r.name, taken: !!r.taken }))
    const names = await fetchAvailableMemberNames()
    return names.map((name) => ({ name, taken: false }))
}

// Concurrent callers (Home alone used to fire this three times) share one request; nothing is kept once it settles.
export const fetchMembers = (): Promise<Member[]> =>
    dedupe("members", async () => {
        const { data, error } = await supabase.from("members").select("id, name, user_id").order("name")
        if (error) throw error
        return (data ?? []) as Member[]
    })

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

export type MemberDirectoryEntry = { id: string; name: string; photo: string | null }

// One source of truth for a member's face: members.user_id -> profiles.image_url (the photo that user uploaded).
// Null when the member has no claimed account or no photo (callers fall back to initials + pebble ring).
export const fetchMemberDirectory = async (): Promise<MemberDirectoryEntry[]> => {
    const [members, profiles] = await Promise.all([fetchMembers(), supabase.from("profiles").select("user_id, image_url")])
    if (profiles.error) throw profiles.error
    const byUser = new Map((profiles.data ?? []).map((p) => [p.user_id as string, (p.image_url as string | null) || null]))
    return members.map((m) => ({ id: m.id, name: m.name, photo: m.user_id ? (byUser.get(m.user_id) ?? null) : null }))
}

// Member id -> profile photo url.
export const fetchMemberAvatars = async (): Promise<Record<string, string | null>> => {
    const out: Record<string, string | null> = {}
    for (const m of await fetchMemberDirectory()) out[m.id] = m.photo
    return out
}

// Committee-only RPC: unlinks the member and deletes that account's votes.
// expectedUserId guards against a stale list: the DB refuses if the name's claim changed.
export const resetMemberClaim = async (name: string, expectedUserId: string): Promise<void> => {
    forget("members")
    const { error } = await supabase.rpc("reset_member_claim", { p_name: name, p_expected_user: expectedUserId })
    forget("members")
    if (error) {
        if (error.message.includes("member claim changed")) throw new Error("This name was changed by someone else — refresh the list.")
        throw error
    }
}

export const countVotesBy = async (userId: string): Promise<number> => {
    const { count, error } = await supabase.from("votes").select("id", { count: "exact", head: true }).eq("voter_id", userId)
    if (error) throw error
    return count ?? 0
}
