import { useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { Screen } from "../../ui/Screen"
import { TabBar } from "../../ui/TabBar"
import { Sidebar } from "../../ui/Sidebar"
import type { TabId } from "../../ui/logic/tabs"

function Frame({ title, height = 360, children }: { title: string; height?: number; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="mb-2 text-footnote text-label-2">{title}</p>
            {/* transform makes position:fixed children (the sidebar) resolve against the frame */}
            <div className="relative overflow-y-auto rounded-card border border-sep bg-bg" style={{ height, transform: "translateZ(0)" }}>
                {children}
            </div>
        </div>
    )
}

const Filler = () => (
    <div className="space-y-3 pb-24">
        {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 rounded-card bg-surface" />
        ))}
    </div>
)

function TabBarFrame({ active, badge }: { active: TabId | null; badge?: number }) {
    return (
        <div className="flex h-24 items-end overflow-hidden rounded-card border border-sep bg-surface-2">
            <div className="w-full">
                <TabBar active={active} badge={badge} />
            </div>
        </div>
    )
}

export default function Shell() {
    const [params] = useSearchParams()
    const scrolled = params.get("scrolled") === "1"
    const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1024px)").matches)
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)")
        const on = () => setWide(mq.matches)
        mq.addEventListener("change", on)
        return () => mq.removeEventListener("change", on)
    }, [])

    return (
        <div className="space-y-10">
            <div>
                <h3 className="mb-3 text-headline">Nav bar and large title</h3>
                <div className="grid gap-6 md:grid-cols-2">
                    <Frame title="At rest">
                        <Screen title="Ballots" forceCollapsed={false} back={{ to: "/dev/design", label: "Home" }}>
                            <Filler />
                        </Screen>
                    </Frame>
                    <Frame title="Collapsed (compact title, material bar; also ?scrolled=1)">
                        <Screen title="Ballots" forceCollapsed back={{ to: "/dev/design", label: "Home" }}>
                            <Filler />
                        </Screen>
                    </Frame>
                    <Frame title="Brand header (Home)">
                        <Screen title="Home" brandHeader forceCollapsed={scrolled}>
                            <Filler />
                        </Screen>
                    </Frame>
                    <Frame title="Ceremony: lemon">
                        <Screen title="The envelope" ceremony="lemon" back={{ to: "/dev/design", label: "You" }} forceCollapsed={false}>
                            <p className="text-body">Full-bleed with on-pebble text.</p>
                        </Screen>
                    </Frame>
                    <Frame title="Ceremony: lime">
                        <Screen title="Submitted" ceremony="lime" back={{ to: "/dev/design", label: "Ballots" }} forceCollapsed={false}>
                            <p className="text-body">Full-bleed with on-pebble text.</p>
                        </Screen>
                    </Frame>
                </div>
            </div>

            <div>
                <h3 className="mb-3 text-headline">Tab bar states</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <TabBarFrame active="home" />
                    <TabBarFrame active="ballots" badge={2} />
                    <TabBarFrame active="results" />
                    <TabBarFrame active="you" />
                </div>
            </div>

            <div>
                <h3 className="mb-3 text-headline">Sidebar</h3>
                {wide ? (
                    <Frame title="User chip, committee group" height={560}>
                        <Sidebar active="ballots" badge={2} committee user={{ id: "gallery", name: "Mia Me" }} onLogout={() => {}} />
                    </Frame>
                ) : (
                    <p className="text-callout text-label-2">The sidebar renders at viewport widths of 1024px and up.</p>
                )}
            </div>
        </div>
    )
}
