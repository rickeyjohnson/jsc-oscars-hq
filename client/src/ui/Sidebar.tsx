import { Link, useLocation } from "react-router-dom"
import { FilePlus, KeyRound, ListChecks, Users } from "lucide-react"
import OscarLogo from "../components/OscarLogo"
import { Avatar } from "./Avatar"
import { COPY } from "./copy"
import { TABS, type TabId } from "./logic/tabs"

const COMMITTEE = [
    { label: "New ballot", to: "/app/profile/ballots/create", icon: FilePlus },
    { label: "Manage ballots", to: "/app/profile/ballots", icon: ListChecks },
    { label: "Members", to: "/app/profile/members", icon: Users },
    { label: "The envelope", to: "/app/profile/release", icon: KeyRound },
]

const ITEM = "flex min-h-11 items-center gap-3 rounded-control px-3 text-callout transition-colors motion-reduce:transition-none hover:bg-fill"

export function Sidebar({
    active,
    badge,
    committee,
    user,
    onLogout,
}: {
    active: TabId | null
    badge?: number
    committee: boolean
    user: { id: string; name: string; imageUrl?: string | null }
    onLogout: () => void
}) {
    const { pathname } = useLocation()
    return (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col bg-surface pt-safe pb-safe">
            <div className="px-5 pb-4 pt-6">
                <OscarLogo size="xsmall" decorative />
            </div>
            <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3">
                {TABS.map(({ id, label, to, icon: Icon }) => {
                    const selected = id === active
                    return (
                        <Link key={id} to={to} aria-current={selected ? "page" : undefined} className={`${ITEM} ${selected ? "bg-fill font-bold text-label" : "text-label-2"}`}>
                            <Icon aria-hidden className="size-5" fill={selected ? "currentColor" : "none"} />
                            <span className="flex-1">{label}</span>
                            {id === "ballots" && !!badge && (
                                <span className="min-w-5 rounded-full bg-danger px-1.5 text-center text-caption-1 font-bold text-on-accent">
                                    {badge}
                                    <span className="sr-only">{" to vote"}</span>
                                </span>
                            )}
                        </Link>
                    )
                })}
                {committee && (
                    <div role="group" aria-label="Committee" className="pt-4">
                        <p className="px-3 pb-1 text-footnote font-bold text-label-3">Committee</p>
                        {COMMITTEE.map(({ label, to, icon: Icon }) => (
                            <Link key={to} to={to} aria-current={pathname === to ? "page" : undefined} className={`${ITEM} ${pathname === to ? "bg-fill font-bold text-label" : "text-label-2"}`}>
                                <Icon aria-hidden className="size-5" />
                                <span>{label}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </nav>
            <div className="border-t border-sep p-3">
                <Link to="/app/profile" className="flex min-h-11 items-center gap-3 rounded-control px-2 hover:bg-fill">
                    <Avatar id={user.id} name={user.name} src={user.imageUrl} size={32} decorative />
                    <span className="min-w-0 flex-1 truncate text-callout font-bold">{user.name}</span>
                </Link>
                <button type="button" onClick={onLogout} className="mt-1 flex min-h-11 w-full cursor-pointer items-center rounded-control px-3 text-callout text-label-2 hover:bg-fill">
                    {COPY.logOut}
                </button>
            </div>
        </aside>
    )
}
