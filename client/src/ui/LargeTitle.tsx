import type { ReactNode } from "react"
import OscarLogo from "../components/OscarLogo"
import type { LogoTone } from "../components/OscarLogo"

export function LargeTitle({ title, subtitle, brandHeader, tone }: { title: string; subtitle?: ReactNode; brandHeader?: boolean; tone?: LogoTone }) {
    return (
        <div className="pb-4 pt-1">
            {brandHeader ? (
                <>
                    <h1 className="sr-only">{title}</h1>
                    <div className="lg:hidden">
                        <OscarLogo size="small" decorative tone={tone} />
                    </div>
                </>
            ) : (
                <h1 className="text-large-title">{title}</h1>
            )}
            {subtitle && <div className="mt-1 text-callout opacity-80">{subtitle}</div>}
        </div>
    )
}
