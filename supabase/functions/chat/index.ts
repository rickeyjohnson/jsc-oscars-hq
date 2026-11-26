// Ask Larry: member-only chat helper. Checks the login, takes one question from the daily allowance,
// then asks an OpenAI-compatible model API (Groq, Gemini, OpenRouter, ...) with a fallback model.
// Larry reads group data through tools that run as the signed-in member.
import { createClient } from "npm:@supabase/supabase-js@2"
import { validateMessages, QUOTA_MESSAGES } from "../_shared/chat/input.ts"
import { stripUnknownLinks } from "../_shared/chat/links.ts"
import { buildSystemPrompt } from "../_shared/chat/prompt.ts"
import { TOOL_DEFS, makeToolRunner } from "../_shared/chat/tools.ts"
import { makeDb } from "./db.ts"
import { RateLimited, runChat, type ChatMessage, type ModelCaller } from "../_shared/chat/loop.ts"

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })
const fail = (status: number, code: "auth" | "input" | "limit" | "busy" | "server", error: string) => json(status, { error, code })

// Any OpenAI-compatible chat completions URL. Default: Gemini's compatible endpoint.
const LLM_URL = Deno.env.get("LLM_BASE_URL") ?? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
const num = (name: string, fallback: number) => {
    const v = Number(Deno.env.get(name))
    return Number.isFinite(v) && v > 0 ? v : fallback
}

const llm: ModelCaller = async (model, messages, tools) => {
    const res = await fetch(LLM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LLM_API_KEY") ?? ""}` },
        body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 1024, ...(tools && tools.length > 0 ? { tools, tool_choice: "auto" } : {}) }),
    })
    // Too many requests or a provider hiccup (5xx): let the loop try the fallback model.
    if (res.status === 429 || res.status >= 500) throw new RateLimited()
    if (!res.ok) throw new Error(`llm ${res.status}`)
    const data = await res.json()
    return data?.choices?.[0]?.message ?? { content: null }
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
    if (req.method !== "POST") return fail(405, "input", "Use POST.")

    const jwt = req.headers.get("Authorization") ?? ""
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: jwt } } })
    const { data: auth } = await db.auth.getUser()
    if (!auth.user) return fail(401, "auth", "Sign in to ask a question.")

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return fail(400, "input", "Send JSON.")
    }
    const checked = validateMessages((body as { messages?: unknown })?.messages)
    if (!checked.ok) return fail(400, "input", checked.error)

    const { data: quota, error: quotaError } = await db.rpc("chat_take_quota", { p_user_cap: num("CHAT_USER_CAP", 20), p_global_cap: num("CHAT_GLOBAL_CAP", 400) })
    if (quotaError || !quota) return fail(500, "server", "Couldn't check your daily allowance. Try again.")
    if (!quota.ok) return fail(429, "limit", quota.reason === "global" ? QUOTA_MESSAGES.global : QUOTA_MESSAGES.user)

    const { data: member } = await db.from("members").select("id, name").eq("user_id", auth.user.id).maybeSingle()
    const messages: ChatMessage[] = [{ role: "system", content: buildSystemPrompt({ memberName: member?.name ?? "a member", now: new Date() }) }, ...checked.messages]
    const models = [Deno.env.get("CHAT_MODEL"), Deno.env.get("CHAT_FALLBACK_MODEL")].filter((m): m is string => Boolean(m))
    if (models.length === 0) return fail(500, "server", "The assistant isn't set up yet.")

    try {
        const reply = await runChat({ messages, models, call: llm, tools: TOOL_DEFS, runTool: makeToolRunner(makeDb(db, auth.user.id), member?.id ?? null) })
        return json(200, { reply: stripUnknownLinks(reply), left: quota.left })
    } catch (e) {
        if (e instanceof RateLimited) return fail(503, "busy", QUOTA_MESSAGES.busy)
        console.error("chat failed", e)
        return fail(500, "server", "Something went wrong. Try again.")
    }
})
