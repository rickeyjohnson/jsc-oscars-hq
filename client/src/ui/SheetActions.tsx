import type { ReactNode } from "react"

/**
 * The one footer layout for every sheet and dialog: primary first (top on phones, right on wider screens),
 * then at most one secondary. Close lives in the header X, so there is no Cancel next to it.
 */
export function SheetActions({ children }: { children: ReactNode }) {
    return <div className="flex flex-col gap-3 sm:flex-row-reverse sm:[&>*]:flex-1">{children}</div>
}
