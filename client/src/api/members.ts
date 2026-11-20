import { supabase } from "../supabaseClient"

export const fetchAvailableMemberNames = async (): Promise<string[]> => {
    const { data, error } = await supabase.rpc("available_member_names")
    if (error) throw error
    return (data ?? []) as string[]
}
