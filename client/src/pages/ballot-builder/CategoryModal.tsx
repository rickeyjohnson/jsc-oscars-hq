import { useEffect, useState } from "react"
import { SheetActions } from "../../ui/SheetActions"
import { Sheet } from "../../ui/Sheet"
import { Button } from "../../ui/Button"
import { TextField } from "../../ui/TextField"
import type { Category, Member } from "../../types"
import NomineeModePicker from "./NomineeModePicker"
import { fetchMyocWindows, fetchReviewIdeas } from "../../api/myoc"
import type { ReviewIdea } from "../../lib/myoc"

interface CategoryModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (category: Category) => void
    initialData?: Category
    existingCategoriesCount: number
    members: Member[]
    seasonId?: string
}

/** The category editor: a Sheet (bottom on phones, centered on desktop). */
export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, initialData, existingCategoriesCount, members, seasonId }) => {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [nomineeConfig, setNomineeConfig] = useState<Category | null>(null)
    const [dirty, setDirty] = useState(false)
    const [credit, setCredit] = useState<string[]>([])
    const [ideas, setIdeas] = useState<ReviewIdea[]>([])

    // Ideas from this season's MYOC windows, so the committee can credit whoever inspired the category.
    useEffect(() => {
        if (!isOpen || !seasonId) return
        let live = true
        fetchMyocWindows(seasonId)
            .then((ws) => Promise.all(ws.map((w) => fetchReviewIdeas(w.id))))
            .then((lists) => live && setIdeas(lists.flat().filter((i) => i.status !== "withdrawn" && i.author.id)))
            .catch(() => live && setIdeas([]))
        return () => {
            live = false
        }
    }, [isOpen, seasonId])

    useEffect(() => {
        if (isOpen) {
            setDirty(false)
            setName(initialData?.name ?? "")
            setDescription(initialData?.description ?? "")
            setCredit(initialData?.credit_member_ids ?? [])
            setNomineeConfig(
                initialData ?? { id: crypto.randomUUID(), name: "", description: "", order: existingCategoriesCount, nominee_mode: "everyone", allow_member_add: false, nominees: [] },
            )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData])

    const handleSave = () => {
        if (!name.trim()) return
        onSave({
            id: initialData?.id ?? crypto.randomUUID(),
            name: name.trim(),
            description: description.trim(),
            order: initialData?.order ?? existingCategoriesCount,
            nominee_mode: nomineeConfig?.nominee_mode ?? "everyone",
            allow_member_add: nomineeConfig?.allow_member_add ?? false,
            nominees: nomineeConfig?.nominees ?? [],
            ...(credit.length > 0 ? { credit_member_ids: credit } : {}),
            ...(initialData?.source ? { source: initialData.source } : {}),
        })
        setDirty(false)
        onClose()
    }

    return (
        <Sheet
            open={isOpen}
            onClose={onClose}
            dirty={dirty}
            title={initialData ? "Edit category" : "Add category"}
            detents={["large"]}
            width="wide"
            footer={
                <SheetActions>
                    <Button variant="primary" fullWidth onClick={handleSave} disabled={!name.trim()}>
                        {initialData ? "Save changes" : "Add category"}
                    </Button>
                </SheetActions>
            }
        >
            <div className="space-y-4">
                <TextField
                    label="Category name"
                    value={name}
                    onChange={(e) => {
                        setDirty(true)
                        setName(e.target.value)
                    }}
                    placeholder="e.g. Best Locs"
                    data-autofocus
                />
                <div>
                    <label htmlFor="cat-desc" className="mb-1.5 block text-subhead font-bold text-label-2">
                        Description (optional)
                    </label>
                    <textarea
                        id="cat-desc"
                        value={description}
                        onChange={(e) => {
                            setDirty(true)
                            setDescription(e.target.value)
                        }}
                        rows={2}
                        className="w-full resize-none rounded-control bg-surface-2 px-4 py-3 text-body text-label outline-none placeholder:text-label-3 focus-visible:ring-2 focus-visible:ring-accent"
                    />
                </div>
                <div>
                    <p className="mb-1.5 text-subhead font-bold text-label-2">Credit (optional)</p>
                    {credit.length > 0 && (
                        <ul aria-label="Credited" className="mb-2 flex list-none flex-wrap gap-2 p-0">
                            {credit.map((id) => (
                                <li key={id}>
                                    <button
                                        type="button"
                                        aria-label={`Remove credit for ${members.find((m) => m.id === id)?.name ?? "member"}`}
                                        onClick={() => {
                                            setDirty(true)
                                            setCredit(credit.filter((c) => c !== id))
                                        }}
                                        className="min-h-11 cursor-pointer rounded-full bg-fill px-4 text-subhead font-bold text-label"
                                    >
                                        {members.find((m) => m.id === id)?.name ?? "Member"} ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <select
                        aria-label="Credit a MYOC idea"
                        value=""
                        onChange={(e) => {
                            const idea = ideas.find((i) => i.id === e.target.value)
                            if (!idea?.author.id || credit.includes(idea.author.id)) return
                            setDirty(true)
                            setCredit([...credit, idea.author.id])
                        }}
                        className="min-h-11 w-full rounded-control bg-surface-2 px-4 text-body text-label"
                    >
                        <option value="">{ideas.length > 0 ? "Pick the idea that inspired this" : "No MYOC ideas to credit"}</option>
                        {ideas.map((i) => (
                            <option key={i.id} value={i.id}>
                                {i.name} ({i.author.name})
                            </option>
                        ))}
                    </select>
                    <p className="mt-1.5 text-footnote text-label-2">Members see "Idea from ..." on the vote screen. Leave empty for a committee category.</p>
                </div>
                {nomineeConfig && (
                    <div>
                        <p className="mb-1.5 text-subhead font-bold text-label-2">Nominees</p>
                        <NomineeModePicker
                            category={nomineeConfig}
                            members={members}
                            onChange={(c) => {
                                setDirty(true)
                                setNomineeConfig(c)
                            }}
                        />
                    </div>
                )}
            </div>
        </Sheet>
    )
}

export default CategoryModal
