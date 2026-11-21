import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import OscarLogo from "../components/OscarLogo"
import type { PebbleName } from "./tokens"
import { PEBBLE_CLASS } from "./logic/pebble"

// Transparent at rest; material + hairline once the large title has scrolled under (progress 1).
export function NavBar({
    title,
    back,
    trailing,
    brandHeader,
    progress,
    ceremony,
}: {
    title: string
    back?: { to: string; label: string }
    trailing?: ReactNode
    brandHeader?: boolean
    progress: number
    ceremony?: PebbleName
}) {
    const collapsed = progress >= 1
    const surface = ceremony ? "" : collapsed ? "material-bar" : ""
    const tone = ceremony ? PEBBLE_CLASS[ceremony].text : ""
    return (
        <header className={`sticky top-0 z-30 pt-safe ${surface} ${tone} ${collapsed && !ceremony ? "border-b border-sep" : ""}`} data-collapsed={collapsed || undefined}>
            <div className="relative flex min-h-16 items-center py-2 justify-between gap-2 px-gutter">
                <div className="flex min-w-0 flex-1 items-center">
                    {back && (
                        <Link to={back.to} aria-label={`Back to ${back.label}`} className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-0.5 rounded-control pr-3 text-body font-bold">
                            <ChevronLeft aria-hidden className="size-6" />
                            <span>{back.label}</span>
                        </Link>
                    )}
                </div>
                <div aria-hidden className="pointer-events-none absolute inset-x-16 inset-y-0 flex items-center justify-center transition-opacity duration-200 motion-reduce:transition-none" style={{ opacity: progress }}>
                    {brandHeader ? (
                        // pb-2 offsets the logo's negative bottom margin so it centers on the icon with equal space above and below.
                        <div className="py-2 pb-4">
                            <OscarLogo size="xxsmall" decorative />
                        </div>
                    ) : <span className="truncate text-headline">{title}</span>}
                </div>
                <div className="flex flex-1 items-center justify-end">{trailing}</div>
            </div>
        </header>
    )
}
