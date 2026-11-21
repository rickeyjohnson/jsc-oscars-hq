import { useEffect } from "react"
import { supabase } from "../supabaseClient"
import { authRedirectUrl } from "./siteUrl"

/** Google sign-in is off until the provider is configured; flip VITE_GOOGLE_AUTH=true. Read per call so tests can stub it. */
export const googleAuthEnabled = (): boolean => import.meta.env.VITE_GOOGLE_AUTH === "true"

export const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: authRedirectUrl("/app") } })

/** Coming back via Back/bfcache restores the page with its old state: run `reset` so a Google button never stays stuck. */
export function useResetOnPageShow(reset: () => void): void {
    useEffect(() => {
        const on = (e: PageTransitionEvent) => {
            if (e.persisted) reset()
        }
        window.addEventListener("pageshow", on)
        return () => window.removeEventListener("pageshow", on)
    }, [reset])
}
