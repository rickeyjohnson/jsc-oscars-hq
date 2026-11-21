import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, GripVertical, Pencil, Trash2 } from "lucide-react"
import { dropIndex } from "../../ui/logic/dragReorder"
import { moveCategory } from "../../ui/logic/builder"
import { PEBBLE_EDGE, pebbleAt } from "../../ui/logic/pebble"
import { EmptyState } from "../../ui/EmptyState"
import { Award } from "lucide-react"
import type { Category } from "../../types"

type Drag = { from: number; startY: number; y: number; gap: number; rects: { top: number; height: number }[]; listTop: number }

// Hidden until focused: the keyboard route to reordering (the visible route is dragging the grip).
const KEY_BTN = "sr-only focus-visible:not-sr-only focus-visible:grid focus-visible:size-11 focus-visible:place-items-center rounded-full text-label disabled:text-label-3 cursor-pointer disabled:cursor-default"

interface CategoryListProps {
    categories: Category[]
    onChange: (categories: Category[]) => void
    onEdit: (index: number) => void
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, onChange, onEdit }) => {
    const listRef = useRef<HTMLUListElement>(null)
    const rowRefs = useRef<(HTMLLIElement | null)[]>([])
    const [drag, setDrag] = useState<Drag | null>(null)

    useEffect(() => {
        if (!drag) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrag(null)
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [drag])

    const start = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
        const rects = rowRefs.current.slice(0, categories.length).map((r) => {
            const b = r?.getBoundingClientRect()
            return { top: b?.top ?? 0, height: b?.height ?? 0 }
        })
        e.currentTarget.setPointerCapture?.(e.pointerId)
        setDrag({ from: i, startY: e.clientY, y: e.clientY, gap: dropIndex(rects, e.clientY), rects, listTop: listRef.current?.getBoundingClientRect().top ?? 0 })
    }
    const move = (e: React.PointerEvent) => setDrag((d) => (d ? { ...d, y: e.clientY, gap: dropIndex(d.rects, e.clientY) } : d))
    const end = () => {
        if (drag) {
            const to = drag.gap > drag.from ? drag.gap - 1 : drag.gap
            if (to !== drag.from) onChange(moveCategory(categories, drag.from, to))
        }
        setDrag(null)
    }
    const remove = (index: number) => onChange(categories.filter((_, i) => i !== index).map((c, i) => ({ ...c, order: i })))

    if (categories.length === 0) return <EmptyState icon={Award} title="No categories yet. Add one or import a list." />

    const r = drag?.rects ?? []
    const lineTop = drag ? (drag.gap < r.length ? r[drag.gap].top : r.length ? r[r.length - 1].top + r[r.length - 1].height : 0) - drag.listTop : 0
    return (
        <ul ref={listRef} className="relative list-none space-y-3 p-0">
            {categories.map((category, i) => {
                const lifted = drag?.from === i
                return (
                    <li
                        key={category.id}
                        ref={(el) => {
                            rowRefs.current[i] = el
                        }}
                        style={lifted ? { transform: `translateY(${drag.y - drag.startY}px) scale(1.02)` } : undefined}
                        className={`flex items-center gap-1 rounded-card border-l-4 bg-surface py-2 pl-1 pr-2 ${PEBBLE_EDGE[pebbleAt(i)]} ${lifted ? "relative z-10 bg-elevated shadow-2xl" : ""}`}
                    >
                        <button
                            type="button"
                            aria-label={`Reorder ${category.name}`}
                            onPointerDown={(e) => start(e, i)}
                            onPointerMove={move}
                            onPointerUp={end}
                            onPointerCancel={() => setDrag(null)}
                            className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-full text-label-2 active:cursor-grabbing"
                        >
                            <GripVertical aria-hidden className="size-5" />
                        </button>
                        <button type="button" onClick={() => onEdit(i)} className="min-h-11 min-w-0 flex-1 text-left">
                            <span className="block truncate text-headline">{category.name}</span>
                            <span className="block text-footnote text-label-2">
                                {category.nominee_mode === "everyone" ? "Everyone" : `${category.nominees.length} ${category.nominees.length === 1 ? "option" : "options"}`}
                            </span>
                        </button>
                        <button type="button" aria-label={`Edit ${category.name}`} onClick={() => onEdit(i)} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-fill px-3 text-subhead font-bold text-label">
                            <Pencil aria-hidden className="size-4" />
                            Edit
                        </button>
                        <button type="button" aria-label={`Move ${category.name} up`} disabled={i === 0} onClick={() => onChange(moveCategory(categories, i, i - 1))} className={KEY_BTN}>
                            <ChevronUp aria-hidden className="size-5" />
                        </button>
                        <button type="button" aria-label={`Move ${category.name} down`} disabled={i === categories.length - 1} onClick={() => onChange(moveCategory(categories, i, i + 1))} className={KEY_BTN}>
                            <ChevronDown aria-hidden className="size-5" />
                        </button>
                        <button type="button" aria-label={`Delete ${category.name}`} onClick={() => remove(i)} className="grid size-11 shrink-0 place-items-center rounded-full text-danger">
                            <Trash2 aria-hidden className="size-5" />
                        </button>
                    </li>
                )
            })}
            {drag && <li aria-hidden style={{ top: lineTop - 1.5 }} className="pointer-events-none absolute inset-x-0 h-[3px] rounded-full bg-pebble-lemon" />}
        </ul>
    )
}

export default CategoryList
