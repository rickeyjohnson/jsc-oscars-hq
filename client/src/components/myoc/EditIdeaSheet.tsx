import { useEffect, useState } from "react"
import { editIdea } from "../../api/myoc"
import { hasErrors, myocMessage, validateIdea, type IdeaDraft, type IdeaErrors, type MyocIdea } from "../../lib/myoc"
import { Sheet } from "../../ui/Sheet"
import { SheetActions } from "../../ui/SheetActions"
import { Button } from "../../ui/Button"
import { IdeaFields } from "./IdeaFields"

const toDraft = (i: MyocIdea | null): IdeaDraft => ({ name: i?.name ?? "", description: i?.description ?? "", hint: i?.hint ?? null })

/** A member edits their own idea (only while the window is open and the committee has not acted). */
export function EditIdeaSheet({ idea, onClose, onSaved }: { idea: MyocIdea | null; onClose: () => void; onSaved: () => void }) {
    const [draft, setDraft] = useState<IdeaDraft>(() => toDraft(idea))
    const [errors, setErrors] = useState<IdeaErrors>({})
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        if (idea) {
            setDraft(toDraft(idea))
            setErrors({})
            setError(null)
        }
    }, [idea])

    const dirty = idea !== null && JSON.stringify(draft) !== JSON.stringify(toDraft(idea))
    const save = async () => {
        if (!idea) return
        const e = validateIdea(draft)
        setErrors(e)
        if (hasErrors(e)) return
        setBusy(true)
        setError(null)
        try {
            await editIdea(idea.id, draft)
            onSaved()
        } catch (err) {
            console.error(err)
            setError(myocMessage(err, err instanceof Error && /can't be changed/.test(err.message) ? err.message : undefined))
        } finally {
            setBusy(false)
        }
    }
    return (
        <Sheet
            open={idea !== null}
            onClose={onClose}
            title="Edit idea"
            dirty={dirty}
            fit
            footer={
                <SheetActions>
                    <Button variant="primary" size="md" fullWidth loading={busy} loadingLabel="Saving…" onClick={save}>
                        Save changes
                    </Button>
                </SheetActions>
            }
        >
            <div className="space-y-4">
                <IdeaFields value={draft} onChange={setDraft} errors={errors} />
                {error && (
                    <p role="alert" className="text-callout text-danger">
                        {error}
                    </p>
                )}
            </div>
        </Sheet>
    )
}
