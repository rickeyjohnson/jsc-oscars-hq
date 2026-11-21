import { useEffect, useRef } from "react"
import { fetchCurrentSeason } from "../api/ballots"

export const RELEASE_POLL_MS = 30_000

// One light read: the season row (never any result data). True once results_released_at is set.
export const seasonReleased = async (): Promise<boolean> => (await fetchCurrentSeason())?.results_released_at != null

/**
 * While `active` (a sealed screen is showing): check the release flag when the tab becomes visible or the window
 * regains focus, and every 30 s while visible. Calls onReleased once when it appears, then stops.
 */
export function useReleaseWatch(active: boolean, onReleased: () => void, check: () => Promise<boolean> = seasonReleased, intervalMs = RELEASE_POLL_MS): void {
    const cb = useRef(onReleased)
    cb.current = onReleased
    const chk = useRef(check)
    chk.current = check
    useEffect(() => {
        if (!active) return
        let stopped = false
        let busy = false
        const probe = async () => {
            if (stopped || busy || document.visibilityState === "hidden") return
            busy = true
            try {
                if (await chk.current()) {
                    stopped = true
                    cb.current()
                }
            } catch {
                /* the next tick tries again */
            } finally {
                busy = false
            }
        }
        const timer = setInterval(() => void probe(), intervalMs)
        document.addEventListener("visibilitychange", probe)
        window.addEventListener("focus", probe)
        return () => {
            stopped = true
            clearInterval(timer)
            document.removeEventListener("visibilitychange", probe)
            window.removeEventListener("focus", probe)
        }
    }, [active, intervalMs])
}
