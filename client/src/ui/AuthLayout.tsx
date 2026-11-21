import type { ReactNode } from "react"
import { Link } from "react-router-dom"

/** Standalone auth screen (no shell): back link, title, then a column that becomes a centered card from 1024px. */
export function AuthLayout({ title, subtitle, step, back = "/", action, footer, children }: { title: string; subtitle?: string; step?: string; back?: string | null; action?: ReactNode; footer?: ReactNode; children: ReactNode }) {
    // No logo here: on wide screens the brand already lives on the landing side, never in the auth panel.
    return (
        <div className="bg-bg text-label min-h-dvh lg:flex lg:items-center lg:justify-center">
            <div className="px-gutter pt-safe pb-safe mx-auto flex min-h-dvh w-full flex-col py-6 sm:max-w-[480px] lg:my-10 lg:min-h-0 lg:max-w-[420px] lg:rounded-sheet lg:bg-surface lg:px-8 lg:py-10">
                <div className="flex min-h-11 items-center justify-between">
                    {back ? (
                        <Link to={back} className="text-callout text-label-2 hover:text-label -ml-2 inline-flex min-h-11 items-center px-2">
                            ‹ Back
                        </Link>
                    ) : (
                        <span />
                    )}
                    {action}
                    {step && <span className="text-footnote text-label-2">{step}</span>}
                </div>
                <div className="flex flex-1 flex-col justify-center py-6 pb-12 lg:flex-none lg:pb-6">
                    <h1 className="mb-2.5 text-[1.875rem] leading-[1.05] font-bold min-[361px]:text-display">{title}</h1>
                    {subtitle && <p className="mb-7 text-callout text-label-2">{subtitle}</p>}
                    {children}
                </div>
                {footer && <div className="pb-2 pt-2 text-center">{footer}</div>}
            </div>
        </div>
    )
}
