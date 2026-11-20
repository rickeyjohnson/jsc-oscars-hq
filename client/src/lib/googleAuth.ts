import { supabase } from "../supabaseClient"
import { authRedirectUrl } from "./siteUrl"

/** Google sign-in is off until the provider is configured; flip VITE_GOOGLE_AUTH=true. Read per call so tests can stub it. */
export const googleAuthEnabled = (): boolean => import.meta.env.VITE_GOOGLE_AUTH === "true"

export const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: authRedirectUrl("/app") } })
