import { useState } from "react"
import { Award, GripVertical, Trash2 } from "lucide-react"
import type { Category } from "../../types"

interface CategoryRowProps {
    category: Category
    index: number
    onDelete: (index: number) => void
    onEdit: (index: number) => void
    onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void
    onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void
    isDragging: boolean
}

export const DraggableCategoryRow: React.FC<CategoryRowProps> = ({
    category, index, onDelete, onEdit, onDragStart, onDragEnter, onDragEnd, isDragging,
}) => (
    <div
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragEnter={(e) => onDragEnter(e, index)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => e.preventDefault()}
        className={`relative group flex items-start gap-3 bg-zinc-800/80 border border-amber-100/10 rounded-2xl p-4 transition-all duration-200 ease-out ${
            isDragging
                ? "opacity-40 scale-95 border-dashed border-amber-500/50"
                : "hover:bg-zinc-800 hover:border-amber-100/20 shadow-lg shadow-black/20"
        }`}
    >
        <div className="mt-1 cursor-grab active:cursor-grabbing text-amber-100/20 hover:text-amber-100/60 p-1">
            <GripVertical className="w-6 h-6" />
        </div>
        <button type="button" onClick={() => onEdit(index)} className="flex-1 min-w-0 text-left">
            <h3 className="text-lg font-bold text-amber-100 truncate pr-2">{category.name}</h3>
            <p className="text-xs text-amber-100/50 font-medium tracking-wide uppercase">
                {category.nominees.length} Nominees
            </p>
            {category.description && (
                <p className="text-sm text-amber-100/60 mt-2 line-clamp-2">{category.description}</p>
            )}
        </button>
        <button
            type="button"
            onClick={() => onDelete(index)}
            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition border border-red-500/10"
            title="Delete Category"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    </div>
)

interface CategoryListProps {
    categories: Category[]
    onChange: (categories: Category[]) => void
    onEdit: (index: number) => void
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, onChange, onEdit }) => {
    const [dragIndex, setDragIndex] = useState<number | null>(null)

    const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDragIndex(index)
        e.dataTransfer.effectAllowed = "move"
    }

    const onDragEnter = (_e: React.DragEvent<HTMLDivElement>, index: number) => {
        if (dragIndex === null || dragIndex === index) return
        const next = [...categories]
        const [moved] = next.splice(dragIndex, 1)
        next.splice(index, 0, moved)
        onChange(next)
        setDragIndex(index)
    }

    const onDragEnd = () => {
        setDragIndex(null)
        onChange(categories.map((c, i) => ({ ...c, order: i })))
    }

    const onDelete = (index: number) =>
        onChange(categories.filter((_, i) => i !== index).map((c, i) => ({ ...c, order: i })))

    if (categories.length === 0) {
        return (
            <div className="bg-zinc-900/50 rounded-2xl p-10 text-center border-2 border-dashed border-amber-100/10 flex flex-col items-center justify-center gap-3">
                <div className="p-4 bg-amber-100/5 rounded-full">
                    <Award className="w-8 h-8 text-amber-100/40" />
                </div>
                <div>
                    <p className="text-base font-bold text-amber-100/60">No categories added</p>
                    <p className="text-xs text-amber-100/30 mt-1">Start building your ballot</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3 min-h-[100px]">
            {categories.map((category, index) => (
                <DraggableCategoryRow
                    key={category.id}
                    index={index}
                    category={category}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onDragStart={onDragStart}
                    onDragEnter={onDragEnter}
                    onDragEnd={onDragEnd}
                    isDragging={dragIndex === index}
                />
            ))}
        </div>
    )
}

export default CategoryList
