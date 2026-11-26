import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { parseSegments } from "../../lib/chat/links"

/** One chat bubble. The assistant's link markers become buttons that open the page. */
export function Message({ role, text, error = false }: { role: "user" | "assistant"; text: string; error?: boolean }) {
    if (role === "user") {
        return <p className="max-w-[86%] self-end whitespace-pre-wrap break-words rounded-card rounded-br-sm bg-surface-2 px-3.5 py-2.5 text-callout">{text}</p>
    }
    const segments = parseSegments(text)
    return (
        <div className={`max-w-[88%] self-start break-words rounded-card rounded-bl-sm bg-fill px-3.5 py-2.5 text-callout ${error ? "text-danger" : ""}`}>
            <p className="whitespace-pre-wrap">
                {segments.map((s, i) => (s.kind === "text" ? <span key={i}>{s.text}</span> : null))}
            </p>
            {segments.some((s) => s.kind === "link") && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {segments.map((l, i) =>
                        l.kind === "link" ? (
                            <Link key={i} to={l.path} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-label-3 px-3 text-subhead font-bold text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                                {l.label}
                                <ArrowRight aria-hidden className="size-4" />
                            </Link>
                        ) : null,
                    )}
                </div>
            )}
        </div>
    )
}
