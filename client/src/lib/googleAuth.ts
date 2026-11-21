import { useEffect } from "react"
import { supabase } from "../supabaseClient"
import { authRedirectUrl } from "./siteUrl"

/**
 * Google sign-in is off until the provider is configured; set VITE_GOOGLE_LOGIN=true (or the older VITE_GOOGLE_AUTH=true).
 * Vercel refuses to save names containing AUTH/KEY/SECRET with a public prefix, so VITE_GOOGLE_LOGIN is the one to use there.
 * It is only an on/off switch for the button, not a secret. Read per call so tests can stub it.
 */
export const googleAuthEnabled = (): boolean =>
    import.meta.env.VITE_GOOGLE_LOGIN === "true" || import.meta.env.VITE_GOOGLE_AUTH === "true"

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
