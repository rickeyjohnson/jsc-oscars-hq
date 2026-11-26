export type ToolCall = { id: string; function: { name: string; arguments: string } }
export type ChatMessage = {
    role: "system" | "user" | "assistant" | "tool"
    content: string | null
    tool_calls?: ToolCall[]
    tool_call_id?: string
    name?: string
}
export type ModelReply = { content: string | null; tool_calls?: ToolCall[] }

/** The provider said slow down (HTTP 429). The loop tries the next model, then gives up. */
export class RateLimited extends Error {
    constructor() {
        super("rate limited")
        this.name = "RateLimited"
    }
}

export type ModelCaller = (model: string, messages: ChatMessage[], tools?: unknown[]) => Promise<ModelReply>

export const GIVE_UP = "I couldn't work that out. Try rephrasing."
const MAX_TOOL_CHARS = 4000

/** Ask the model, run any tools it asks for, and return its final text. Falls back to the next model on rate limits. */
export async function runChat(o: {
    messages: ChatMessage[]
    models: string[]
    call: ModelCaller
    runTool: (name: string, args: unknown) => Promise<string>
    /** Tool definitions passed to the model on every call. */
    tools?: unknown[]
    maxSteps?: number
}): Promise<string> {
    const messages = [...o.messages]
    const maxSteps = o.maxSteps ?? 4
    const ask = async (): Promise<ModelReply> => {
        let last: unknown = new RateLimited()
        for (const model of o.models) {
            try {
                return await o.call(model, messages, o.tools)
            } catch (e) {
                if (!(e instanceof RateLimited)) throw e
                last = e
            }
        }
        throw last
    }
    for (let step = 0; step <= maxSteps; step++) {
        const reply = await ask()
        // Some providers omit the call id: make one so the tool answer can point back at it.
        const calls = (reply.tool_calls ?? []).map((c, i) => ({ ...c, id: c.id || `call_${step}_${i}` }))
        if (calls.length === 0) return (reply.content ?? "").trim() || GIVE_UP
        if (step === maxSteps) break
        messages.push({ role: "assistant", content: reply.content, tool_calls: calls })
        for (const c of calls) {
            let out: string
            try {
                out = await o.runTool(c.function.name, JSON.parse(c.function.arguments || "{}"))
            } catch (e) {
                out = e instanceof SyntaxError ? "invalid arguments" : "that lookup failed"
            }
            messages.push({ role: "tool", tool_call_id: c.id, name: c.function.name, content: out.slice(0, MAX_TOOL_CHARS) })
        }
    }
    return GIVE_UP
}
