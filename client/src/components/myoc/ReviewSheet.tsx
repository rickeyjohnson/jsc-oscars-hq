import { useEffect, useId, useState } from "react"
import { reviewIdea, type ReviewPatch } from "../../api/myoc"
import { hasErrors, mergeTargets, myocMessage, reviewActions, validateIdea, type IdeaDraft, type IdeaErrors, type MyocStatus, type ReviewIdea } from "../../lib/myoc"
import { MemberAvatar } from "../../ui/MemberAvatar"
import { Sheet } from "../../ui/Sheet"
import { SheetActions } from "../../ui/SheetActions"
import { Button } from "../../ui/Button"
import { TextField } from "../../ui/TextField"
import { fieldCls } from "../committee/ActionSheet"
import { IdeaFields } from "./IdeaFields"

const toDraft = (i: ReviewIdea | null): IdeaDraft => ({ name: i?.name ?? "", description: i?.description ?? "", hint: i?.hint ?? null })

/** The committee's sheet for one idea: who sent it, edit the wording, give it a category label, accept / reject / merge. */
export function ReviewSheet({ idea, all, onClose, onSaved }: { idea: ReviewIdea | null; all: ReviewIdea[]; onClose: () => void; onSaved: (message: string) => void }) {
    const [draft, setDraft] = useState<IdeaDraft>(() => toDraft(idea))
    const [group, setGroup] = useState(idea?.assigned_category ?? "")
    const [target, setTarget] = useState("")
    const [errors, setErrors] = useState<IdeaErrors>({})
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const selectId = useId()
    useEffect(() => {
        if (idea) {
            setDraft(toDraft(idea))
            setGroup(idea.assigned_category ?? "")
            setTarget("")
            setErrors({})
            setError(null)
        }
    }, [idea])

    const actions = idea ? reviewActions(idea.status) : null
    const targets = idea ? mergeTargets(all, idea) : []
    const dirty = idea !== null && (JSON.stringify(draft) !== JSON.stringify(toDraft(idea)) || group.trim() !== (idea.assigned_category ?? ""))

    const run = async (label: string, status: MyocStatus | "keep", done: string, mergedInto?: string) => {
        if (!idea) return
        const e = validateIdea(draft)
        setErrors(e)
        if (hasErrors(e)) return
        const patch: ReviewPatch = { name: draft.name.trim(), description: draft.description.trim(), hint: draft.hint, assigned_category: group.trim() || null }
        if (status !== "keep") patch.status = status
        if (mergedInto) patch.merged_into = mergedInto
        setBusy(label)
        setError(null)
        try {
            await reviewIdea(idea.id, patch)
            onSaved(done)
        } catch (err) {
            console.error(err)
            setError(myocMessage(err))
        } finally {
            setBusy(null)
        }
    }
    const done = (s: MyocStatus | "keep") => (s === "accepted" ? "Accepted" : s === "rejected" ? "Rejected" : s === "submitted" ? "Moved back to new" : "Saved")

    return (
        <Sheet
            open={idea !== null}
            onClose={onClose}
            title="Review idea"
            dirty={dirty}
            fit
            footer={
                actions && (
                    <SheetActions>
                        <Button variant="primary" size="md" fullWidth loading={busy === actions.primary.label} disabled={busy !== null} onClick={() => run(actions.primary.label, actions.primary.status, done(actions.primary.status))}>
                            {actions.primary.label}
                        </Button>
                        {actions.secondary && (
                            <Button variant="tinted" size="md" fullWidth loading={busy === actions.secondary.label} disabled={busy !== null} onClick={() => run(actions.secondary!.label, actions.secondary!.status, done(actions.secondary!.status))}>
                                {actions.secondary.label}
                            </Button>
                        )}
                    </SheetActions>
                )
            }
        >
            {idea && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <MemberAvatar memberId={idea.author.id ?? undefined} name={idea.author.name} size={40} ring="pebble" decorative />
                        <p className="text-callout text-label-2">
                            From <span className="font-bold text-label">{idea.author.name}</span>
                        </p>
                    </div>
                    {!actions ? (
                        <div className="space-y-1">
                            <p className="text-headline">{idea.name}</p>
                            {idea.description && <p className="text-callout text-label-2">{idea.description}</p>}
                            <p className="pt-2 text-callout text-label-2">{idea.author.name} withdrew this idea, so there is nothing to review.</p>
                        </div>
                    ) : (
                        <>
                            <IdeaFields value={draft} onChange={setDraft} errors={errors} readOnly />
                            <div>
                                <TextField label="Category label (optional)" value={group} maxLength={80} placeholder="Superlatives" onChange={(e) => setGroup(e.target.value)} />
                                <p className="mt-1.5 text-footnote text-label-2">Groups accepted ideas when they go to the ballot builder.</p>
                            </div>
                            {targets.length > 0 && idea.status !== "merged" && (
                                <div>
                                    <label htmlFor={selectId} className="mb-1.5 block text-subhead font-bold text-label-2">
                                        Merge into another idea
                                    </label>
                                    <div className="flex gap-2">
                                        <select id={selectId} value={target} onChange={(e) => setTarget(e.target.value)} className={`${fieldCls} min-w-0 flex-1`}>
                                            <option value="">Pick the idea to keep</option>
                                            {targets.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                        <Button variant="secondary" size="md" disabled={!target || busy !== null} loading={busy === "Merge"} onClick={() => run("Merge", "merged", "Merged", target)}>
                                            Merge
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {error && (
                        <p role="alert" className="text-callout text-danger">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </Sheet>
    )
}
