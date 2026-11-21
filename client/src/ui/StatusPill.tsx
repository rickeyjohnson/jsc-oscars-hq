import type { Phase } from "../lib/ballotFlow"
import { PHASE_LABEL } from "../lib/ballotFlow"
import { chipClasses, type ChipTone } from "./logic/variants"

// The one status pill every ballot card uses: Open green, Scheduled sky, Closed neutral grey, Draft neutral dashed, Released lemon.
const TONE: Record<Phase, ChipTone> = { open: "lime", scheduled: "sky", closed: "neutral", draft: "neutral", released: "lemon" }

export const pillClasses = (phase: Phase): string => `${chipClasses(TONE[phase])}${phase === "draft" ? " border border-dashed border-label-3 bg-transparent" : ""}`

export function StatusPill({ phase }: { phase: Phase }) {
    return <span className={pillClasses(phase)}>{PHASE_LABEL[phase]}</span>
}
