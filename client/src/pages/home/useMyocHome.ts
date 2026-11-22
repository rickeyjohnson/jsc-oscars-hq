import { useEffect, useState } from "react"
import { fetchIdeas, fetchMyocWindows } from "../../api/myoc"
import { pickWindow, windowPhase } from "../../lib/myoc"
import type { MyocHome } from "./useHomeData"

/**
 * MYOC for the Home card. Silent on failure (the tables may not exist yet): the card just stays hidden.
 * Idea count is the member's own, withdrawn ones excluded (the committee's RLS view returns everyone's, so filter by author).
 */
export function useMyocHome(seasonId: string | undefined, userId: string): MyocHome | null {
    const [myoc, setMyoc] = useState<MyocHome | null>(null)
    useEffect(() => {
        if (!seasonId) return
        let live = true
        void (async () => {
            try {
                const now = new Date()
                const w = pickWindow(await fetchMyocWindows(seasonId), now)
                const phase = windowPhase(w, now)
                if (!w || (phase !== "open" && phase !== "upcoming")) return live ? setMyoc(null) : undefined
                const sent = phase === "open" ? (await fetchIdeas(w.id)).filter((i) => i.author_id === userId && i.status !== "withdrawn").length : 0
                if (live) setMyoc({ window: w, sent })
            } catch {
                if (live) setMyoc(null)
            }
        })()
        return () => {
            live = false
        }
    }, [seasonId, userId])
    return myoc
}
