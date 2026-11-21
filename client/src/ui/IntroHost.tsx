import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation } from "react-router-dom"
import { useUserData } from "../context/UserContenxt"
import { FeatureIntro } from "./FeatureIntro"
import { IntroContext } from "./introContext"
import { GUIDE_SEEN_EVENT, hasSeenGuide } from "./logic/firstRun"
import { INTROS, INTROS_RESET_EVENT, hasSeenIntro, introsFor, markIntroSeen } from "./logic/featureIntros"
import { safeStorage } from "./logic/reveal"

const SETTLE_MS = 600

/** Wraps the app shell: pages report here when they are ready (and what kind of screen they are) so the host never interrupts a half-loaded or busy screen. */
export function IntroProvider({ children }: { children: ReactNode }) {
    const [topic, setTopic] = useState<string | null>(null)
    const value = useMemo(() => ({ topic, setTopic }), [topic])
    return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>
}

type Open = { id: string; visit: string; on: boolean }

/**
 * Shows at most one feature intro at a time: the first one the member hasn't seen for this screen, after the
 * welcome guide has been dealt with and the screen has settled. Marked seen as soon as it appears.
 */
export function IntroHost() {
    const { pathname, search } = useLocation()
    const { profile } = useUserData()
    const { topic } = useContext(IntroContext)
    const userId = profile?.user_id ?? ""
    const committee = Boolean(profile?.is_committee)
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
    const visit = path + search
    const [open, setOpen] = useState<Open | null>(null)
    const [muted, setMuted] = useState<string | null>(null)
    const [, bump] = useState(0)
    const visitRef = useRef(visit)
    useEffect(() => {
        visitRef.current = visit
    }, [visit])
    useEffect(() => {
        const onGuide = () => bump((n) => n + 1)
        const onReset = () => setMuted(visitRef.current)
        window.addEventListener(GUIDE_SEEN_EVENT, onGuide)
        window.addEventListener(INTROS_RESET_EVENT, onReset)
        return () => {
            window.removeEventListener(GUIDE_SEEN_EVENT, onGuide)
            window.removeEventListener(INTROS_RESET_EVENT, onReset)
        }
    }, [])

    const storage = safeStorage()
    const sp = new URLSearchParams(search)
    const tab = sp.get("tab")
    const view = sp.get("view")
    const showing = open?.on && open.visit === visit
    const eligible = Boolean(userId) && hasSeenGuide(storage, userId) && muted !== visit && !showing
    const next = eligible ? introsFor(committee).find((i) => i.match({ path, tab, view, topic }) && !hasSeenIntro(storage, userId, i.id)) : undefined
    const nextId = next?.id
    useEffect(() => {
        if (!nextId) return
        const t = setTimeout(() => {
            markIntroSeen(safeStorage(), userId, nextId)
            setOpen({ id: nextId, visit, on: true })
        }, SETTLE_MS)
        return () => clearTimeout(t)
    }, [nextId, userId, visit])

    const intro = open ? INTROS.find((i) => i.id === open.id) : undefined
    if (!intro) return null
    return <FeatureIntro intro={intro} open={Boolean(showing)} onClose={() => setOpen((o) => (o ? { ...o, on: false } : o))} />
}
