import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import OscarLogo from "../components/OscarLogo"

/** Standalone auth screen (no shell): back link, small logo, then a column that becomes a centered card from 1024px. */
export function AuthLayout({ title, subtitle, step, back = "/", children }: { title: string; subtitle?: string; step?: string; back?: string | null; children: ReactNode }) {
    return (
        <div className="bg-bg text-label min-h-dvh lg:flex lg:items-center lg:justify-center">
            <div className="px-gutter pt-safe pb-safe mx-auto w-full max-w-[420px] py-6 lg:bg-surface lg:rounded-sheet lg:my-10 lg:px-8 lg:py-10">
                <div className="flex min-h-11 items-center justify-between">
                    {back ? (
                        <Link to={back} className="text-callout text-label-2 hover:text-label -ml-2 inline-flex min-h-11 items-center px-2">
                            ‹ Back
                        </Link>
                    ) : (
                        <span />
                    )}
                    {step && <span className="text-footnote text-label-2">{step}</span>}
                </div>
                <div className="my-4 flex justify-start">
                    <OscarLogo size="small" decorative />
                </div>
                <h1 className="text-display mb-1">{title}</h1>
                {subtitle && <p className="text-callout text-label-2 mb-5">{subtitle}</p>}
                {children}
            </div>
        </div>
    )
}
