import { useEffect, useRef } from "react"

const THROTTLE_MS = 30_000

/** Calls fn when the tab becomes visible or the window regains focus, at most once per 30 s. */
export function useRefetchOnFocus(fn: () => void): void {
    const ref = useRef(fn)
    ref.current = fn
    useEffect(() => {
        let last = Date.now()
        const on = () => {
            if (document.visibilityState === "hidden") return
            const t = Date.now()
            if (t - last < THROTTLE_MS) return
            last = t
            ref.current()
        }
        document.addEventListener("visibilitychange", on)
        window.addEventListener("focus", on)
        return () => {
            document.removeEventListener("visibilitychange", on)
            window.removeEventListener("focus", on)
        }
    }, [])
}
