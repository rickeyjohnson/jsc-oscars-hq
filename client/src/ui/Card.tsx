import type { ReactNode } from "react"

export function Card({ as: Tag = "div", children, className = "" }: { as?: "section" | "div"; children: ReactNode; className?: string }) {
    return <Tag className={`rounded-card bg-surface p-4 ${className}`}>{children}</Tag>
}
