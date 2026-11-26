import { supabase } from "../supabaseClient"

export type ChatTurn = { role: "user" | "assistant"; content: string }
export type ChatErrorCode = "limit" | "busy" | "auth" | "input" | "offline" | "server"

export class ChatError extends Error {
    code: ChatErrorCode
    constructor(code: ChatErrorCode, message: string) {
        super(message)
        this.name = "ChatError"
        this.code = code
    }
}

const OFFLINE = "Couldn't reach Larry. Check your connection and try again."
const SERVER = "Something went wrong. Try again."

/** Ask Larry. `messages` ends with the new question. Errors are ChatError with a plain message to show. */
export async function sendChat(messages: ChatTurn[]): Promise<{ reply: string; left: number | null }> {
    const { data, error } = await supabase.functions.invoke("chat", { body: { messages } })
    if (error) {
        const res = (error as { context?: unknown }).context
        if (res && typeof (res as Response).json === "function") {
            let body: { code?: ChatErrorCode; error?: string } | null = null
            try {
                body = await (res as Response).json()
            } catch {
                body = null
            }
            throw new ChatError(body?.code ?? "server", body?.error ?? SERVER)
        }
        throw new ChatError("offline", OFFLINE)
    }
    const d = data as { reply?: unknown; left?: unknown } | null
    if (!d || typeof d.reply !== "string") throw new ChatError("server", SERVER)
    return { reply: d.reply, left: typeof d.left === "number" ? d.left : null }
}

export const OPEN_CHAT_EVENT = "jsc:open-chat"
/** Open the chat from anywhere (the Settings row). The floating button listens for this. */
export const openChat = () => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))
