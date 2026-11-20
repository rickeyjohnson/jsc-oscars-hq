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
