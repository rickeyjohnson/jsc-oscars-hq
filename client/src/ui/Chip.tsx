import type { ReactNode } from "react"
import { chipClasses, type ChipTone } from "./logic/variants"

export function Chip({ tone, icon, children }: { tone?: ChipTone; icon?: ReactNode; children: ReactNode }) {
    return (
        <span className={chipClasses(tone)}>
            {icon}
            {children}
        </span>
    )
}
