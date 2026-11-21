import type { ReactNode } from "react"

const SHAPE: Record<string, string> = {
    line: "h-4 w-full rounded-full",
    block: "h-24 w-full rounded-card",
    circle: "size-10 rounded-full",
    card: "h-40 w-full rounded-card",
    row: "h-14 w-full rounded-control",
}

export function Skeleton({ shape, width, height }: { shape: "line" | "block" | "circle" | "card" | "row"; width?: string; height?: string }) {
    return <div aria-hidden className={`skeleton ${SHAPE[shape]}`} style={{ width, height }} />
}

export function SkeletonScreen({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div role="status" aria-busy="true" aria-label={label}>
            <span className="sr-only">{label}</span>
            <div aria-hidden>{children}</div>
        </div>
    )
}
