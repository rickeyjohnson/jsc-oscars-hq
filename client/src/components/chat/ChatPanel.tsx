import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowUp, X } from "lucide-react"
import { ChatError, sendChat, type ChatTurn } from "../../api/chat"
import { useUserData } from "../../context/UserContenxt"
import { loadChat, saveChat } from "../../lib/chat/history"
import { Message } from "./Message"

const SUGGESTIONS = ["How do I vote?", "Who has the most wins?", "When does voting close?", "Tell me a joke"]
const MAX = 500
const LIMIT_COPY = "You have used today's questions. Back tomorrow."

type Bubble = { id: number; role: "user" | "assistant"; text: string; error?: boolean; retry?: string }

/** The conversation: greeting, suggestion chips, messages and the composer. Lives in a Sheet on phones and a docked panel on desktop. */
export function ChatPanel({ onClose, showHeader }: { onClose: () => void; showHeader: boolean }) {
    const { member } = useUserData()
    const [bubbles, setBubbles] = useState<Bubble[]>(() => loadChat(member?.id))
    const [text, setText] = useState("")
    const [busy, setBusy] = useState(false)
    const [left, setLeft] = useState<number | null>(null)
    const [limit, setLimit] = useState(false)
    const next = useRef(Math.max(0, ...bubbles.map((b) => b.id)) + 1)
    const end = useRef<HTMLDivElement | null>(null)
    const first = member?.name?.split(" ")[0] ?? ""

    useEffect(() => {
        saveChat(member?.id, bubbles)
    }, [member?.id, bubbles])
    useEffect(() => {
        end.current?.scrollIntoView?.({ block: "end" })
    }, [bubbles, busy])

    const ask = async (question: string, base: Bubble[]) => {
        const q = question.trim()
        if (!q || busy || limit) return
        const withQuestion: Bubble[] = [...base, { id: next.current++, role: "user", text: q }]
        setBubbles(withQuestion)
        setText("")
        setBusy(true)
        const history: ChatTurn[] = withQuestion.filter((b) => !b.error).map((b) => ({ role: b.role, content: b.text }))
        try {
            const r = await sendChat(history)
            setBubbles((b) => [...b, { id: next.current++, role: "assistant", text: r.reply }])
            if (r.left !== null) setLeft(r.left)
        } catch (e) {
            const err = e instanceof ChatError ? e : new ChatError("server", "Something went wrong. Try again.")
            if (err.code === "limit") setLimit(true)
            setBubbles((b) => [...b, { id: next.current++, role: "assistant", text: err.message, error: true, retry: err.code === "limit" ? undefined : q }])
        } finally {
            setBusy(false)
        }
    }
    // Drop the failed question and its error bubble, then ask again.
    const retry = (b: Bubble) => void ask(b.retry ?? "", bubbles.filter((x) => x.id < b.id - 1))
    const submit = (e: FormEvent) => {
        e.preventDefault()
        void ask(text, bubbles)
    }
    const counter = left !== null ? (limit ? "0 left today" : `${left} left today`) : null

    return (
        <div className="flex h-full min-h-0 flex-col">
            {showHeader ? (
                <div className="flex items-center justify-between px-4 py-3">
                    <div>
                        <h2 className="text-headline">Larry</h2>
                        {counter && <p className="text-footnote text-label-2">{counter}</p>}
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 cursor-pointer place-items-center rounded-full bg-fill text-label focus-visible:outline-2 focus-visible:outline-accent">
                        <X aria-hidden className="size-4" />
                    </button>
                </div>
            ) : (
                counter && <p className="px-4 pb-1 text-footnote text-label-2">{counter}</p>
            )}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-2" aria-live="polite">
                <Message role="assistant" text={`Hey${first ? ` ${first}` : ""}, Larry here. Ask me how the app works, about stats and winners, or for a joke. I can only read what you can already see.`} />
                {bubbles.map((b) => (
                    <div key={b.id} className="flex flex-col">
                        <Message role={b.role} text={b.text} error={b.error} onNavigate={onClose} />
                        {b.retry && !busy && (
                            <button type="button" onClick={() => retry(b)} className="mt-1.5 min-h-9 cursor-pointer self-start rounded-full border border-label-3 px-3 text-subhead font-bold focus-visible:outline-2 focus-visible:outline-accent">
                                Try again
                            </button>
                        )}
                    </div>
                ))}
                {busy && (
                    <div role="status" aria-label="Larry is thinking" className="flex items-center gap-1.5 self-start rounded-card rounded-bl-sm bg-fill px-4 py-3.5">
                        {[0, 1, 2].map((i) => (
                            <span key={i} aria-hidden style={{ animationDelay: `${i * 160}ms` }} className="size-2 animate-bounce rounded-full bg-label-2 motion-reduce:animate-pulse" />
                        ))}
                    </div>
                )}
                <div ref={end} />
            </div>
            {bubbles.length === 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-2">
                    {SUGGESTIONS.map((s) => (
                        <button key={s} type="button" onClick={() => void ask(s, bubbles)} className="min-h-9 cursor-pointer rounded-full bg-fill px-3 text-subhead text-label focus-visible:outline-2 focus-visible:outline-accent">
                            {s}
                        </button>
                    ))}
                </div>
            )}
            {bubbles.length > 0 && !busy && (
                <button type="button" onClick={() => setBubbles([])} className="mx-4 mb-1 min-h-9 cursor-pointer self-start text-footnote font-bold text-label-2 underline focus-visible:outline-2 focus-visible:outline-accent">
                    Clear chat
                </button>
            )}
            {limit && <p className="px-4 pb-1 text-center text-footnote text-label-2">{LIMIT_COPY}</p>}
            <form onSubmit={submit} className="flex gap-2 px-3 pb-3 pt-1">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={MAX}
                    disabled={limit}
                    placeholder={limit ? "Come back tomorrow" : "Ask a question"}
                    aria-label="Ask a question"
                    className="min-h-11 min-w-0 flex-1 rounded-full bg-fill px-4 text-body text-label outline-none placeholder:text-label-3 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                />
                <button type="submit" aria-label="Send" disabled={busy || limit || !text.trim()} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-inverse text-on-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40">
                    <ArrowUp aria-hidden className="size-5" />
                </button>
            </form>
        </div>
    )
}
