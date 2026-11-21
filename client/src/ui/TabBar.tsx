import { Link } from "react-router-dom"
import { TABS, type TabId } from "./logic/tabs"

export function TabBar({ active, badge }: { active: TabId | null; badge?: number }) {
    return (
        <nav aria-label="Main" className="material-bar pointer-events-auto mx-3 mb-[calc(8px+env(safe-area-inset-bottom))] flex items-stretch gap-1 rounded-sheet p-1">
            {TABS.map(({ id, label, to, icon: Icon }) => {
                const selected = id === active
                const count = id === "ballots" && badge ? badge : 0
                return (
                    <Link
                        key={id}
                        to={to}
                        aria-current={selected ? "page" : undefined}
                        className={`relative flex min-h-[49px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1 transition-colors motion-reduce:transition-none ${selected ? "bg-fill text-label" : "text-label-2"}`}
                    >
                        <span className="relative">
                            <Icon aria-hidden className="size-6" fill={selected ? "currentColor" : "none"} />
                            {count > 0 && (
                                <span aria-hidden className="absolute -right-2 -top-1 min-w-4 rounded-full bg-danger px-1 text-center text-caption-2 text-on-accent">
                                    {count}
                                </span>
                            )}
                        </span>
                        <span className="text-caption-2">{label}</span>
                        {count > 0 && <span className="sr-only">{`, ${count} to vote`}</span>}
                    </Link>
                )
            })}
        </nav>
    )
}
