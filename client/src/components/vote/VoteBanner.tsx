import type { VoteMessage } from "../../lib/voting"
import { Button } from "../../ui/Button"

// Literal strings for Tailwind's scanner.
const TONE: Record<VoteMessage["tone"], string> = {
    error: "border-pebble-cherry bg-pebble-cherry/15",
    info: "border-pebble-sky bg-pebble-sky/15",
    warn: "border-pebble-lemon bg-pebble-lemon/15",
}

/** Tinted banner: error = cherry, info = sky, warn = lemon. Try again is primary: full width on phones, inline at lg. */
export function VoteBanner({ tone, title, detail, retry, retryLabel = "Try again", className = "" }: { tone: VoteMessage["tone"]; title: string; detail?: string; retry?: () => void; retryLabel?: string; className?: string }) {
    return (
        <div role={tone === "error" ? "alert" : "status"} className={`flex flex-col gap-3 rounded-card border p-3 lg:flex-row lg:items-center ${TONE[tone]} ${className}`}>
            <div className="min-w-0 flex-1">
                <p className="text-subhead font-bold">{title}</p>
                {detail && <p className="text-footnote text-label-2">{detail}</p>}
            </div>
            {retry && (
                <Button size="md" className="w-full lg:w-auto" onClick={retry}>
                    {retryLabel}
                </Button>
            )}
        </div>
    )
}
