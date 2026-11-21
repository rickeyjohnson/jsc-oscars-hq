import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
            <Icon aria-hidden className="size-12 text-label-3" />
            <h3 className="text-title-3">{title}</h3>
            {body && <p className="text-callout text-label-2 max-w-sm">{body}</p>}
            {action}
        </div>
    )
}
