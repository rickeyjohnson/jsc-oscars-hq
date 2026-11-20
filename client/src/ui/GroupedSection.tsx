import type { ReactNode } from "react"

export function GroupedSection({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
    return (
        <section>
            {header && <h3 className="text-footnote uppercase tracking-wider text-label-2 px-4 pb-1.5">{header}</h3>}
            <ul className="rounded-card bg-surface overflow-hidden divide-y divide-sep">{children}</ul>
            {footer && <p className="text-footnote text-label-2 px-4 pt-1.5">{footer}</p>}
        </section>
    )
}
