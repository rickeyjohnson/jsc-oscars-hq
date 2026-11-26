// Ask Larry's chat is kept on this device so it survives closing the panel and reloads.
// It is keyed by member and wiped on sign-out. Storage can be unavailable (private mode), so every call is guarded.
export type SavedBubble = { id: number; role: "user" | "assistant"; text: string }

const PREFIX = "jsc.chat."
const KEEP = 40

const store = (): Storage | null => {
    try {
        return window.localStorage
    } catch {
        return null
    }
}

export function loadChat(memberId: string | null | undefined): SavedBubble[] {
    const s = store()
    if (!s || !memberId) return []
    try {
        const raw = JSON.parse(s.getItem(PREFIX + memberId) ?? "[]")
        if (!Array.isArray(raw)) return []
        return raw.filter((b): b is SavedBubble => !!b && (b.role === "user" || b.role === "assistant") && typeof b.text === "string" && typeof b.id === "number").slice(-KEEP)
    } catch {
        return []
    }
}

/** Saves the last 40 messages. Failed attempts are never saved. */
export function saveChat(memberId: string | null | undefined, bubbles: (SavedBubble & { error?: boolean })[]): void {
    const s = store()
    if (!s || !memberId) return
    const clean = bubbles.filter((b) => !b.error).slice(-KEEP).map(({ id, role, text }) => ({ id, role, text }))
    try {
        if (clean.length === 0) s.removeItem(PREFIX + memberId)
        else s.setItem(PREFIX + memberId, JSON.stringify(clean))
    } catch {
        // storage full or blocked: the chat just isn't remembered
    }
}

/** Sign-out: forget every member's chat on this device. */
export function clearAllChats(): void {
    const s = store()
    if (!s) return
    try {
        for (const k of Object.keys(s)) if (k.startsWith(PREFIX)) s.removeItem(k)
    } catch {
        // ignore
    }
}
