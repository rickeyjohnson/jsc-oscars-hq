import { Home, Trophy, User, Vote, type LucideIcon } from "lucide-react"

export type TabId = "home" | "ballots" | "results" | "you"

export const TABS: { id: TabId; label: string; to: string; icon: LucideIcon }[] = [
    { id: "home", label: "Home", to: "/app", icon: Home },
    { id: "ballots", label: "Ballots", to: "/app/ballots", icon: Vote },
    { id: "results", label: "Results", to: "/app/results", icon: Trophy },
    { id: "you", label: "You", to: "/app/profile", icon: User },
]

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

// Stats is folded into Results, so /app/stats keeps the Results tab lit.
export function activeTab(pathname: string): TabId | null {
    const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
    if (p === "/app") return "home"
    if (under(p, "/app/ballots")) return "ballots"
    if (under(p, "/app/results") || under(p, "/app/stats")) return "results"
    if (under(p, "/app/profile")) return "you"
    return null
}

// 0 at rest, 1 once the large title has scrolled under the bar.
export function collapseProgress(scrollY: number, threshold: number): number {
    if (threshold <= 0) return 1
    return Math.min(1, Math.max(0, scrollY / threshold))
}

const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "file", "image", "color"])

// Structural so tests need no DOM; true when the on-screen keyboard is likely up.
export function isTextEntry(el: { tagName: string; type?: string; isContentEditable?: boolean } | null): boolean {
    if (!el) return false
    if (el.isContentEditable) return true
    const tag = el.tagName.toUpperCase()
    if (tag === "TEXTAREA" || tag === "SELECT") return true
    if (tag === "INPUT") return !NON_TEXT_INPUTS.has((el.type ?? "text").toLowerCase())
    return false
}
