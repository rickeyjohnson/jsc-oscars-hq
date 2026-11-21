import type { ReactNode } from "react"
import { Button } from "../../ui/Button"
import { PEBBLE_EDGE } from "../../ui/logic/pebble"
import type { Next, PrimaryId } from "../../lib/ballotFlow"

// The one place that says what to do now: exactly one primary button, everything else (quiet) passed as children.
export function NextCard({ next, blockers = [], busy, onPrimary, children }: { next: Next; blockers?: string[]; busy?: boolean; onPrimary: (id: PrimaryId) => void; children?: ReactNode }) {
    return (
        <section aria-label="Next" className={`rounded-card border-l-4 bg-surface p-4 ${PEBBLE_EDGE[next.tone]}`}>
            <p className="text-caption-2 font-bold tracking-wider text-label-2">NEXT</p>
            <h2 className="mt-1 text-headline">{next.heading}</h2>
            <p className="mt-1 text-callout text-label-2">{next.text}</p>
            {blockers.length > 0 && (
                <ul className="mt-2 space-y-1 text-footnote text-warn">
                    {blockers.map((b) => <li key={b}>• {b}</li>)}
                </ul>
            )}
            <div className="mt-3 space-y-2">
                {next.primary && (
                    <Button variant="primary" size="md" fullWidth disabled={busy || next.primary.disabled} onClick={() => onPrimary(next.primary!.id)}>
                        {next.primary.label}
                    </Button>
                )}
                {children}
            </div>
        </section>
    )
}
