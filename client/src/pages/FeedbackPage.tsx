import { useEffect, useState } from "react"
import { Check, Inbox as InboxIcon, Trash2 } from "lucide-react"
import { useUserData } from "../context/UserContenxt"
import { deleteFeedback, fetchFeedback, FEEDBACK_MAX, KIND_LABEL, sendFeedback, setFeedbackResolved, type FeedbackItem, type FeedbackKind } from "../api/feedback"
import { failureMessage } from "../lib/failure"
import { OFFLINE_REASON, useOnline } from "../lib/online"
import { Button } from "../ui/Button"
import { EmptyState } from "../ui/EmptyState"
import { ErrorState } from "../ui/ErrorState"
import { Screen } from "../ui/Screen"
import { SegmentedControl } from "../ui/SegmentedControl"
import { useToast } from "../ui/Toast"

type Tab = "send" | "inbox"
const KINDS: FeedbackKind[] = ["idea", "bug", "other"]

const SendForm = () => {
    const [kind, setKind] = useState<FeedbackKind>("idea")
    const [message, setMessage] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const online = useOnline()
    const toast = useToast()
    const ready = message.trim().length > 0 && message.length <= FEEDBACK_MAX
    const submit = async () => {
        if (!ready) return
        setBusy(true)
        setError(null)
        try {
            await sendFeedback(kind, message)
            setMessage("")
            toast.show("Thanks, the committee will see it")
        } catch (e) {
            console.error(e)
            setError(failureMessage("send your feedback", e) + " What you wrote is still here.")
        } finally {
            setBusy(false)
        }
    }
    return (
        <div className="space-y-4">
            <p className="text-callout text-label-2">Found a bug or have an idea? Tell the committee. Rickey and Kadin can read it.</p>
            <div role="radiogroup" aria-label="Kind of feedback" className="flex flex-wrap gap-2">
                {KINDS.map((k) => (
                    <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`min-h-11 cursor-pointer rounded-full px-4 text-subhead font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${kind === k ? "bg-inverse text-on-inverse" : "bg-fill text-label"}`}>
                        {KIND_LABEL[k]}
                    </button>
                ))}
            </div>
            <div>
                <label htmlFor="feedback-message" className="mb-1.5 block text-subhead font-bold text-label-2">
                    What's on your mind?
                </label>
                <textarea
                    id="feedback-message"
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full resize-none rounded-control bg-surface-2 px-4 py-3 text-body text-label outline-none placeholder:text-label-3 focus-visible:ring-2 focus-visible:ring-accent"
                />
                <p className={`mt-1.5 text-right text-footnote tabular-nums ${message.length > FEEDBACK_MAX ? "text-danger" : "text-label-2"}`}>
                    {message.length}/{FEEDBACK_MAX}
                </p>
            </div>
            {error && (
                <p role="alert" className="text-callout text-danger">
                    {error}
                </p>
            )}
            <Button fullWidth loading={busy} disabled={!ready || !online} onClick={() => void submit()}>
                Send feedback
            </Button>
            {!online && <p className="text-footnote text-label-2">{OFFLINE_REASON}</p>}
        </div>
    )
}

const Inbox = () => {
    const [items, setItems] = useState<FeedbackItem[] | null>(null)
    const [error, setError] = useState(false)
    const [reload, setReload] = useState(0)
    const toast = useToast()
    useEffect(() => {
        let live = true
        fetchFeedback()
            .then((r) => live && setItems(r))
            .catch((e) => {
                console.error(e)
                if (live) setError(true)
            })
        return () => {
            live = false
        }
    }, [reload])
    const act = async (fn: () => Promise<void>, done: string) => {
        try {
            await fn()
            toast.show(done)
            setReload((n) => n + 1)
        } catch (e) {
            console.error(e)
            toast.show(failureMessage("do that", e))
        }
    }
    if (error) return <ErrorState title="Couldn't load feedback" body="Check your connection and try again." onRetry={() => { setError(false); setItems(null); setReload((n) => n + 1) }} />
    if (!items) return <p role="status" className="text-callout text-label-2">Loading feedback…</p>
    if (items.length === 0) return <EmptyState icon={InboxIcon} title="No feedback yet" />
    return (
        <ul className="list-none space-y-3 p-0">
            {items.map((f) => (
                <li key={f.id} className={`rounded-card bg-surface p-4 ${f.resolved ? "opacity-60" : ""}`}>
                    <p className="text-footnote text-label-2">
                        {f.from} · {KIND_LABEL[f.kind]} · {new Date(f.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-body">{f.message}</p>
                    <div className="mt-3 flex gap-2">
                        <Button variant="secondary" size="sm" icon={<Check aria-hidden className="size-4" />} onClick={() => void act(() => setFeedbackResolved(f.id, !f.resolved), f.resolved ? "Reopened" : "Marked done")}>
                            {f.resolved ? "Reopen" : "Mark done"}
                        </Button>
                        <Button variant="dangerOutline" size="sm" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => void act(() => deleteFeedback(f.id), "Deleted")}>
                            Delete
                        </Button>
                    </div>
                </li>
            ))}
        </ul>
    )
}

const FeedbackPage = () => {
    const { profile } = useUserData()
    const committee = Boolean(profile?.is_committee)
    const [tab, setTab] = useState<Tab>("send")
    return (
        <Screen title="Feedback" back={{ to: "/app/profile/settings", label: "Settings" }}>
            {committee && (
                <div className="mb-5 max-w-md">
                    <SegmentedControl<Tab>
                        label="Feedback"
                        idPrefix="feedback-tab"
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: "send", label: "Send" },
                            { value: "inbox", label: "Inbox" },
                        ]}
                    />
                </div>
            )}
            {committee && tab === "inbox" ? <Inbox /> : <SendForm />}
        </Screen>
    )
}

export default FeedbackPage
