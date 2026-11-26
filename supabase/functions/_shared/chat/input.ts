export const MAX_CHARS = 500
export const KEEP_LAST = 12

export const QUOTA_MESSAGES = {
    user: "You have used today's questions. Back tomorrow.",
    global: "The assistant is busy today. Try again tomorrow.",
    busy: "The assistant is busy. Try again in a minute.",
} as const

export type Turn = { role: "user" | "assistant"; content: string }

/** Check what the app sent. Returns the last 12 turns, trimmed, or a plain error. */
export function validateMessages(raw: unknown): { ok: true; messages: Turn[] } | { ok: false; error: string } {
    if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "Send at least one message." }
    const turns: Turn[] = []
    for (const m of raw) {
        if (!m || typeof m !== "object") return { ok: false, error: "Messages must be objects." }
        const { role, content } = m as { role?: unknown; content?: unknown }
        if (role !== "user" && role !== "assistant") return { ok: false, error: "Messages must come from the user or the assistant." }
        if (typeof content !== "string") return { ok: false, error: "Messages must be text." }
        const text = content.trim()
        if (!text) return { ok: false, error: "Type a question first." }
        if (text.length > MAX_CHARS) return { ok: false, error: `Keep it under ${MAX_CHARS} characters.` }
        turns.push({ role, content: text })
    }
    if (turns[turns.length - 1].role !== "user") return { ok: false, error: "The last message must be a question." }
    return { ok: true, messages: turns.slice(-KEEP_LAST) }
}
