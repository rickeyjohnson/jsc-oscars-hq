import { useEffect, useState } from "react"
import { Sheet } from "../../ui/Sheet"
import { Button } from "../../ui/Button"
import { TextField } from "../../ui/TextField"
import type { Category, Member } from "../../types"
import NomineeModePicker from "./NomineeModePicker"

interface CategoryModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (category: Category) => void
    initialData?: Category
    existingCategoriesCount: number
    members: Member[]
}

/** The category editor: a Sheet (bottom on phones, centered on desktop). */
export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, initialData, existingCategoriesCount, members }) => {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [nomineeConfig, setNomineeConfig] = useState<Category | null>(null)
    const [dirty, setDirty] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setDirty(false)
            setName(initialData?.name ?? "")
            setDescription(initialData?.description ?? "")
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
                <div className="flex gap-3">
                    <Button variant="tinted" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" fullWidth onClick={handleSave} disabled={!name.trim()}>
                        {initialData ? "Save changes" : "Add category"}
                    </Button>
                </div>
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
