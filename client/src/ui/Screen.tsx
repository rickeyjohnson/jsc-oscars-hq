import { useEffect, useState, type ReactNode } from "react"
import { NavBar } from "./NavBar"
import { LargeTitle } from "./LargeTitle"
import { useShell } from "./ShellContext"
import { collapseProgress } from "./logic/tabs"
import { PEBBLE_CLASS } from "./logic/pebble"
import type { PebbleName } from "./tokens"

const WIDTH = { column: "max-w-[720px] mx-auto", wide: "max-w-[1040px] mx-auto", full: "" } as const
const COLLAPSE_AFTER_PX = 40

function useCollapse(force?: boolean): number {
    const [progress, setProgress] = useState(0)
    useEffect(() => {
        if (force !== undefined) return
        let raf = 0
        const on = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => setProgress(collapseProgress(window.scrollY, COLLAPSE_AFTER_PX)))
        }
        on()
        window.addEventListener("scroll", on, { passive: true })
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener("scroll", on)
        }
    }, [force])
    return force === undefined ? progress : force ? 1 : 0
}

export function Screen({
    title,
    back,
    trailing,
    subtitle,
    brandHeader,
    ceremony,
    width = "column",
    forceCollapsed,
    children,
}: {
    title: string
    back?: { to: string; label: string }
    trailing?: ReactNode
    subtitle?: ReactNode
    brandHeader?: boolean
    ceremony?: PebbleName
    width?: "column" | "wide" | "full"
    /** Gallery only: pins the nav bar collapsed (true) or at rest (false) instead of following scroll. */
    forceCollapsed?: boolean
    children: ReactNode
}) {
    const shell = useShell()
    const setHide = shell?.setHideTabBar
    useEffect(() => {
        if (!ceremony || !setHide) return
        setHide(true)
        return () => setHide(false)
    }, [ceremony, setHide])

    const progress = useCollapse(forceCollapsed)
    const pebble = ceremony ? PEBBLE_CLASS[ceremony] : null
    return (
        <div className={`min-h-dvh ${pebble ? `${pebble.bg} ${pebble.text}` : "text-label"}`}>
            <NavBar title={title} back={back} trailing={trailing} brandHeader={brandHeader} progress={progress} ceremony={ceremony} />
            <div className={`px-gutter pb-[var(--content-pb,32px)] ${WIDTH[width]}`}>
                <LargeTitle title={title} subtitle={subtitle} brandHeader={brandHeader} tone={ceremony === "lemon" ? "onLemon" : ceremony === "lime" ? "onLime" : undefined} />
                {children}
            </div>
        </div>
    )
}
