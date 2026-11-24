import { useCallback, useEffect, useState } from "react"
import { Lightbulb } from "lucide-react"
import { fetchMyIdeas, submitIdea, withdrawIdea } from "../../api/myoc"
import {
    canChange, closesLabel, hasErrors, hintLabel, memberStatusLabel, myocErrorKind, myocMessage, MYOC_LOAD_FAILED, MYOC_UNAVAILABLE,
    validateIdea, type IdeaDraft, type IdeaErrors, type MyocIdea, type MyocWindow, type WindowPhase,
} from "../../lib/myoc"
import { Button } from "../../ui/Button"
import { Chip } from "../../ui/Chip"
import { useConfirm } from "../../ui/ConfirmProvider"
import { EmptyState } from "../../ui/EmptyState"
import { ErrorState } from "../../ui/ErrorState"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { useToast } from "../../ui/Toast"
import { COPY } from "../../ui/copy"
import { PEBBLE_EDGE } from "../../ui/logic/pebble"
import { EditIdeaSheet } from "./EditIdeaSheet"
import { IdeaFields } from "./IdeaFields"
import { OFFLINE_REASON, useOnline } from "../../lib/online"

const EMPTY: IdeaDraft = { name: "", description: "", hint: null }
const when = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

type Load = { status: "loading" } | { status: "error"; unavailable: boolean } | { status: "ready"; ideas: MyocIdea[] }

/** The member side: the window banner, the suggest form while it is open, and the member's own ideas. */
export function SuggestView({ window: w, phase, now }: { window: MyocWindow | null; phase: WindowPhase; now: Date }) {
    const toast = useToast()
    const confirm = useConfirm()
    const online = useOnline()
    const [load, setLoad] = useState<Load>({ status: "loading" })
    const [reload, setReload] = useState(0)
    const [draft, setDraft] = useState<IdeaDraft>(EMPTY)
    const [errors, setErrors] = useState<IdeaErrors>({})
    const [busy, setBusy] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [editing, setEditing] = useState<MyocIdea | null>(null)
    const [withdrawing, setWithdrawing] = useState<string | null>(null)
    const windowId = w?.id ?? null

    useEffect(() => {
        if (!windowId) return
        let live = true
        fetchMyIdeas(windowId)
            .then((ideas) => live && setLoad({ status: "ready", ideas }))
            .catch((e) => {
                console.error(e)
                if (live) setLoad({ status: "error", unavailable: myocErrorKind(e) === "unavailable" })
            })
        return () => {
            live = false
        }
    }, [windowId, reload])
    const refresh = useCallback(() => setReload((k) => k + 1), [])

    if (!w || phase === "none") {
        return <EmptyState icon={Lightbulb} title="Make Your Own Categories isn't open" body="When the committee opens it, you can suggest categories for the next ballot here." />
    }
    if (load.status === "error") {
        if (load.unavailable) return <EmptyState icon={Lightbulb} title={MYOC_UNAVAILABLE} body="The committee is still setting it up." />
        return (
            <ErrorState
                title={COPY.somethingWrong}
                body={MYOC_LOAD_FAILED}
                onRetry={() => {
                    setLoad({ status: "loading" })
                    refresh()
                }}
            />
        )
    }
    if (load.status === "loading") {
        return (
            <SkeletonScreen label="Loading your ideas">
                <div className="space-y-2">
                    <Skeleton shape="block" />
                    <Skeleton shape="row" />
                    <Skeleton shape="row" />
                </div>
            </SkeletonScreen>
        )
    }

    const ideas = load.ideas
    const open = phase === "open"

    const submit = async () => {
        const e = validateIdea(draft)
        setErrors(e)
        setFormError(null)
        if (hasErrors(e)) return
        setBusy(true)
        try {
            await submitIdea(w.id, draft)
            setDraft(EMPTY)
            toast.show("Idea submitted")
            refresh()
        } catch (err) {
            console.error(err)
            setFormError(myocMessage(err))
            if (myocErrorKind(err) !== "other") refresh()
        } finally {
            setBusy(false)
        }
    }

    const withdraw = async (idea: MyocIdea) => {
        const ok = await confirm({ title: "Withdraw this idea?", message: `"${idea.name}" goes back to you and the committee won't consider it. You can use the slot for another idea.`, confirmLabel: "Withdraw idea", cancelLabel: "Keep it", destructive: true })
        if (!ok) return
        setWithdrawing(idea.id)
        try {
            await withdrawIdea(idea.id)
            toast.show("Idea withdrawn")
        } catch (err) {
            console.error(err)
            toast.show(myocMessage(err, "Couldn't withdraw that. Try again."))
        } finally {
            setWithdrawing(null)
            refresh()
        }
    }

    return (
        <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
            <div className="space-y-4">
                <section aria-label="Make Your Own Categories status" className={`rounded-card border-l-4 bg-surface p-4 ${PEBBLE_EDGE[open ? "lime" : phase === "upcoming" ? "sky" : "grape"]}`}>
                    <p className="text-caption-2 font-bold uppercase tracking-wider text-label-2">Make Your Own Categories</p>
                    {open && (
                        <>
                            <h2 className="mt-1 text-balance text-headline">Suggest a category</h2>
                            <p className="mt-1 text-callout text-label-2">{closesLabel(w, now)}</p>
                        </>
                    )}
                    {phase === "upcoming" && (
                        <>
                            <h2 className="mt-1 text-balance text-headline">Make Your Own Categories isn't open yet</h2>
                            <p className="mt-1 text-callout text-label-2">Opens {when(w.opens_at)}</p>
                        </>
                    )}
                    {phase === "closed" && (
                        <>
                            <h2 className="mt-1 text-balance text-headline">Make Your Own Categories is closed</h2>
                            <p className="mt-1 text-callout text-label-2">Thanks for your ideas. The committee is putting the ballot together.</p>
                        </>
                    )}
                </section>

                {open && (
                    <form
                        aria-label="Suggest a category"
                        noValidate
                        className="space-y-4 rounded-card bg-surface p-4"
                        onSubmit={(e) => {
                            e.preventDefault()
                            void submit()
                        }}
                    >
                        <IdeaFields value={draft} onChange={setDraft} errors={errors} />
                        {formError && (
                            <p role="alert" className="text-callout text-danger">
                                {formError}
                            </p>
                        )}
                        {!online && <p className="text-footnote text-label-2">{OFFLINE_REASON}</p>}
                        <Button type="submit" variant="primary" size="md" fullWidth loading={busy} loadingLabel="Submitting…" disabled={!online}>
                            Submit idea
                        </Button>
                    </form>
                )}
            </div>

            <section aria-label="Your ideas">
                <h2 className="mb-1.5 px-1 text-caption-2 font-bold uppercase tracking-wider text-label-2">Your ideas</h2>
                {ideas.length === 0 ? (
                    <p className="rounded-card bg-surface p-4 text-callout text-label-2">{open ? "Nothing yet. Your ideas stay private: only the committee reads them." : "You didn't send any ideas."}</p>
                ) : (
                    <ul className="grid list-none grid-cols-1 items-stretch gap-3 p-0">
                        {ideas.map((i) => {
                            const changeable = canChange(i, phase)
                            const status = memberStatusLabel(i.status)
                            return (
                                <li key={i.id} className="flex min-h-36 flex-col rounded-card bg-surface p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className={`line-clamp-2 min-w-0 break-words text-body font-bold ${i.status === "withdrawn" ? "text-label-2 line-through" : ""}`}>{i.name}</p>
                                        <Chip tone={status === "Submitted" ? "strawberry" : "neutral"}>{status}</Chip>
                                    </div>
                                    {i.description && <p className="mt-1 line-clamp-3 break-words text-callout text-label-2">{i.description}</p>}
                                    {hintLabel(i.hint) && <p className="mt-1 text-footnote text-label-2">Nominees: {hintLabel(i.hint)}</p>}
                                    {changeable && (
                                        <div className="mt-auto flex gap-2 pt-3">
                                            <Button variant="tinted" size="md" aria-label={`Edit ${i.name}`} onClick={() => setEditing(i)}>
                                                Edit
                                            </Button>
                                            <Button variant="dangerOutline" size="md" aria-label={`Withdraw ${i.name}`} loading={withdrawing === i.id} loadingLabel="Withdrawing…" onClick={() => void withdraw(i)}>
                                                Withdraw
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>

            <EditIdeaSheet
                idea={editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                    setEditing(null)
                    toast.show("Idea updated")
                    refresh()
                }}
            />
        </div>
    )
}
