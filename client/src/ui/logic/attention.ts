import { hasEnded, type ReleaseCheck } from "../../lib/release"
import type { Ballot } from "../../types"

export type AttentionItem = { id: "close" | "ties" | "release" | "ready"; label: string; to: string; tone: "warn" | "success" }

const BALLOTS = "/app/profile/ballots"
const RELEASE = "/app/profile/release"

// Committee "needs your attention", computed from data already loaded (no new DB). `checks` is null until loaded.
export function attentionItems(i: { ballots: Ballot[]; checks: ReleaseCheck[] | null; released: boolean; now: Date }): AttentionItem[] {
    if (i.released) return []
    const items: AttentionItem[] = []
    const ended = i.ballots.filter((b) => b.round === "main" && b.status === "open" && hasEnded(b, i.now)).length
    if (ended > 0) {
        items.push({ id: "close", label: ended === 1 ? "1 ballot ended but is still open" : `${ended} ballots ended but are still open`, to: BALLOTS, tone: "warn" })
    }
    if (!i.checks) return items
    const winners = i.checks.find((c) => c.id === "winners")
    if (winners && !winners.ok) items.push({ id: "ties", label: `${winners.label} \u00b7 Go to tally`, to: BALLOTS, tone: "warn" })
    // "ballots closed" failing is already said by the close item when a ballot has simply ended.
    for (const c of i.checks) {
        if (c.ok || c.id === "winners" || (c.id === "ballots_closed" && ended > 0)) continue
        items.push({ id: "release", label: c.label, to: RELEASE, tone: "warn" })
    }
    if (i.checks.every((c) => c.ok)) items.push({ id: "ready", label: "Ready to open the envelope", to: RELEASE, tone: "success" })
    return items
}
