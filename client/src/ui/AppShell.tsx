import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { ToastProvider } from "./Toast"
import { TabBar } from "./TabBar"
import { Sidebar } from "./Sidebar"
import { ShellContext } from "./ShellContext"
import { TABS, activeTab, isTextEntry } from "./logic/tabs"
import { useUserData } from "../context/UserContenxt"
import { fetchBallotSummaries } from "../api/ballots"
import { pendingBallots } from "../lib/voting"
import { supabase } from "../supabaseClient"

const DESKTOP = "(min-width: 1024px)"

function useIsDesktop(): boolean {
    const [on, setOn] = useState(() => window.matchMedia(DESKTOP).matches)
    useEffect(() => {
        const mq = window.matchMedia(DESKTOP)
        const handler = () => setOn(mq.matches)
        handler()
        mq.addEventListener("change", handler)
        return () => mq.removeEventListener("change", handler)
    }, [])
    return on
}

// Ballots the member can still vote on; any failure just means no badge.
function usePendingCount(): number {
    const [count, setCount] = useState(0)
    useEffect(() => {
        let live = true
        const load = () => {
            fetchBallotSummaries()
                .then((list) => live && setCount(pendingBallots(list, new Date()).length))
                .catch(() => live && setCount(0))
        }
        load()
        const onVisible = () => document.visibilityState === "visible" && load()
        document.addEventListener("visibilitychange", onVisible)
        return () => {
            live = false
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [])
    return count
}

function useTextFocus(enabled: boolean): boolean {
    const [typing, setTyping] = useState(false)
    useEffect(() => {
        if (!enabled) return
        const check = () => setTyping(isTextEntry(document.activeElement as HTMLElement | null))
        const onIn = () => check()
        const onOut = () => setTimeout(check, 0)
        document.addEventListener("focusin", onIn)
        document.addEventListener("focusout", onOut)
        return () => {
            document.removeEventListener("focusin", onIn)
            document.removeEventListener("focusout", onOut)
        }
    }, [enabled])
    return enabled && typing
}

export function AppShell() {
    const { pathname } = useLocation()
    const { profile } = useUserData()
    const desktop = useIsDesktop()
    const badge = usePendingCount()
    const [slot, setSlot] = useState<HTMLElement | null>(null)
    const [hideTabBar, setHideTabBar] = useState(false)
    const typing = useTextFocus(!desktop)
    const root = useRef<HTMLDivElement>(null)
    const active = activeTab(pathname)

    // Route title, and after a tab change move focus to the content when it was on the nav (the fade is visual only).
    const first = useRef(true)
    useEffect(() => {
        const label = TABS.find((t) => t.id === active)?.label
        if (label) document.title = `${label} | JSC Oscars`
        if (first.current) {
            first.current = false
            return
        }
        const el = document.activeElement
        if (el && el.closest("nav")) document.getElementById("main-content")?.focus({ preventScroll: true })
    }, [active])

    useEffect(() => {
        if (!slot) return
        const publish = () => root.current?.style.setProperty("--accessory-h", `${slot.offsetHeight}px`)
        publish()
        const ro = new ResizeObserver(publish)
        ro.observe(slot)
        return () => ro.disconnect()
    }, [slot])

    const setHide = useCallback((h: boolean) => setHideTabBar(h), [])
    const api = useMemo(() => ({ accessorySlot: slot, setHideTabBar: setHide }), [slot, setHide])
    const name = profile?.display_name || profile?.username || "You"
    const showTabBar = !desktop && !hideTabBar && !typing

    return (
        <ShellContext.Provider value={api}>
            <ToastProvider>
                <div
                    ref={root}
                    className="min-h-dvh bg-bg text-label lg:pl-[260px]"
                    style={{ ["--content-pb" as string]: desktop ? "32px" : "calc(64px + 8px + env(safe-area-inset-bottom) + var(--accessory-h, 0px) + 16px)" }}
                >
                    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-inverse focus:px-4 focus:py-2 focus:text-on-inverse">
                        Skip to content
                    </a>
                    {desktop && (
                        <Sidebar
                            active={active}
                            badge={badge}
                            committee={!!profile?.is_committee}
                            user={{ id: profile?.user_id ?? "me", name, imageUrl: profile?.image_url }}
                            onLogout={() => void supabase.auth.signOut()}
                        />
                    )}
                    <div className="flex min-h-dvh flex-col">
                        <div id="main-content" tabIndex={-1} className="flex-1 outline-none" style={{ paddingBottom: "var(--content-pb)" }}>
                            {/* Keyed by tab: switching tabs replays a subtle fade/slide (no fill-forwards, so no lingering transform). */}
                            <div key={active} className="tab-enter">
                                <Outlet />
                            </div>
                        </div>
                        {desktop && <div ref={setSlot} data-testid="shell-accessory" className="sticky bottom-0 z-20" />}
                    </div>
                    {!desktop && (
                        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col">
                            <div ref={setSlot} data-testid="shell-accessory" className="pointer-events-auto" />
                            {showTabBar && <TabBar active={active} badge={badge} />}
                        </div>
                    )}
                </div>
            </ToastProvider>
        </ShellContext.Provider>
    )
}
