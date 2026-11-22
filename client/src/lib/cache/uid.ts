import { supabase } from "../../supabaseClient"

/** Signed-in user id from the local session (no network). Null when signed out or when auth is unavailable. */
export async function localUid(): Promise<string | null> {
    try {
        const { data } = await supabase.auth.getSession()
        return data.session?.user.id ?? null
    } catch {
        return null
    }
}
