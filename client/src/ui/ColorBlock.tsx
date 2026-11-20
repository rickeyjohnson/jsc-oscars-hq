import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { PEBBLE_CLASS } from "./logic/pebble"
import type { PebbleName } from "./tokens"

export function ColorBlock({
    pebble,
    as = "div",
    to,
    eyebrow,
    title,
    children,
    className = "",
}: {
    pebble: PebbleName
    as?: "section" | "div" | "a"
    to?: string
    eyebrow?: string
    title?: ReactNode
    children?: ReactNode
    className?: string
}) {
    const p = PEBBLE_CLASS[pebble]
    const base = `block rounded-card p-5 ${p.bg} ${p.text} ${className}`
    const inner = (
        <>
            {eyebrow && <p className="text-caption-2 uppercase tracking-wider mb-1">{eyebrow}</p>}
            {title && <div className="text-title-2">{title}</div>}
            {children}
        </>
    )
    if (to || as === "a") {
        return (
            <Link to={to ?? "#"} className={`${base} transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 active:scale-97`}>
                {inner}
            </Link>
        )
    }
    const Tag = as
    return <Tag className={base}>{inner}</Tag>
}
