import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Check, ChevronRight } from "lucide-react"
import { COPY } from "./copy"

export function ListRow({
    title,
    subtitle,
    leading,
    trailing,
    to,
    onClick,
    chevron,
    selected,
    destructive,
}: {
    title: ReactNode
    subtitle?: ReactNode
    leading?: ReactNode
    trailing?: ReactNode
    to?: string
    onClick?: () => void
    chevron?: boolean
    selected?: boolean
    destructive?: boolean
}) {
    const interactive = !!(to || onClick)
    const cls = `flex w-full items-center gap-3 min-h-14 px-4 py-2 text-left ${interactive ? "cursor-pointer hover:bg-fill active:bg-fill" : ""}`
    const body = (
        <>
            {leading}
            <span className="min-w-0 flex-1">
                <span className={`block text-body truncate ${destructive ? "text-danger" : "text-label"}`}>{title}</span>
                {subtitle && <span className="block text-footnote text-label-2 truncate">{subtitle}</span>}
            </span>
            {trailing}
            {selected && (
                <>
                    <Check aria-hidden className="size-5 text-accent" />
                    <span className="sr-only">{COPY.selected}</span>
                </>
            )}
            {chevron && <ChevronRight aria-hidden className="size-5 text-label-3" />}
        </>
    )
    return (
        <li>
            {to ? (
                <Link to={to} className={cls}>
                    {body}
                </Link>
            ) : onClick ? (
                <button type="button" onClick={onClick} className={cls}>
                    {body}
                </button>
            ) : (
                <div className={cls}>{body}</div>
            )}
        </li>
    )
}
