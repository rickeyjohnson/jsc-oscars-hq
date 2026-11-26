// Pages the assistant may link to. Anything else the model writes is shown as plain text.
export const ALLOWED_LINKS: Record<string, string> = {
    "/app": "Home",
    "/app/ballots": "Your ballots",
    "/app/results": "Results",
    "/app/results?view=leaderboard": "Leaderboard",
    "/app/profile": "You",
    "/app/profile/settings": "Settings",
    "/app/profile/settings/feedback": "Feedback",
    "/app/profile/settings/myoc": "Make Your Own Categories",
    "/app/profile/settings/patch-notes": "Patch notes",
    "/app/profile/wrapped": "Wrapped",
    "/app/profile/labs/trophies": "Trophy shelf",
    "/app/profile/labs/higher-lower": "Higher or lower",
    "/app/profile/labs/slots": "Slot machine",
    "/app/profile/labs/balls": "Balls",
}

export type Segment = { kind: "text"; text: string } | { kind: "link"; path: string; label: string }

const MARKER = /\[\[go:([^|\]]+)\|([^\]]+)\]\]/g

/** Split a reply into text and link segments. Unknown paths become plain text (their label). */
export function parseSegments(text: string): Segment[] {
    const out: Segment[] = []
    let last = 0
    for (const m of text.matchAll(MARKER)) {
        const at = m.index ?? 0
        if (at > last) out.push({ kind: "text", text: text.slice(last, at) })
        const path = m[1].trim()
        const label = m[2].trim()
        out.push(path in ALLOWED_LINKS ? { kind: "link", path, label } : { kind: "text", text: label })
        last = at + m[0].length
    }
    if (last < text.length) out.push({ kind: "text", text: text.slice(last) })
    return out
}

/** The reply with every marker for an unknown path replaced by its label (allowed markers stay). */
export function stripUnknownLinks(text: string): string {
    return text.replace(MARKER, (whole, path: string, label: string) => (path.trim() in ALLOWED_LINKS ? whole : label.trim()))
}
