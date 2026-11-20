import { useEffect, useState } from "react"
import type { Category } from "../../types"

interface CategoryModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (category: Category) => void
    initialData?: Category
    existingCategoriesCount: number
}

// Nominee configuration UI moves in here in a later task.
export const CategoryModal: React.FC<CategoryModalProps> = ({
    isOpen, onClose, onSave, initialData, existingCategoriesCount,
}) => {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.name ?? "")
            setDescription(initialData?.description ?? "")
        }
    }, [isOpen, initialData])

    if (!isOpen) return null

    const handleSave = () => {
        if (!name.trim()) return
        onSave({
            id: initialData?.id ?? crypto.randomUUID(),
            name: name.trim(),
            description: description.trim(),
            order: initialData?.order ?? existingCategoriesCount,
            nominee_mode: initialData?.nominee_mode ?? "everyone",
            allow_member_add: initialData?.allow_member_add ?? false,
            nominees: initialData?.nominees ?? [],
        })
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-amber-100/20 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50 overflow-hidden">
                <div className="px-8 py-6 border-b border-amber-100/5">
                    <h2 className="text-2xl font-black text-amber-100">
                        {initialData ? "Edit Category" : "Add Category"}
                    </h2>
                </div>
                <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-amber-100 uppercase tracking-wide">Category Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 text-lg placeholder-amber-100/20"
                            placeholder="e.g. Best Locs"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-amber-100 uppercase tracking-wide">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 resize-none placeholder-amber-100/20"
                            rows={2}
                        />
                    </div>
                </div>
                <div className="p-6 bg-zinc-900 border-t border-amber-100/5 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3.5 bg-zinc-800 text-amber-100/70 rounded-xl font-bold hover:bg-zinc-700 hover:text-amber-100 transition">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 py-3.5 bg-amber-100 text-zinc-950 rounded-xl font-bold hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {initialData ? "Save Changes" : "Create Category"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CategoryModal
