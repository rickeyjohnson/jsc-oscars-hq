import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react"
import { Button } from "../../ui/Button"
import { Chip } from "../../ui/Chip"
import { Sheet } from "../../ui/Sheet"
import { Switch } from "../../ui/Switch"
import { COPY } from "../../ui/copy"
import { WIDGETS, type WidgetDef, type WidgetId } from "../../ui/logic/homeWidgets"
import { defaultPrefs, moveWidget, toggleWidget, type HomePrefs } from "../../ui/logic/homePrefs"
import { applyGroupOrder, dropIndex, moveToGap } from "../../ui/logic/dragReorder"
import { PEBBLE_CLASS } from "../../ui/logic/pebble"

// Moves `id` past its visible neighbour (the full order also holds widgets this user never sees).
function moveVisible(p: HomePrefs, group: WidgetId[], id: WidgetId, dir: -1 | 1): HomePrefs {
    const gi = group.indexOf(id)
    const neighbour = group[gi + dir]
    if (!neighbour) return p
    let next = p
    const steps = Math.abs(p.order.indexOf(neighbour) - p.order.indexOf(id))
    for (let i = 0; i < steps; i++) next = moveWidget(next, id, dir)
    return next
}

type Drag = { id: WidgetId; from: number; startY: number; y: number; gap: number; rects: { top: number; height: number }[]; listTop: number }

// Hidden until focused: the keyboard route to reordering (the visible route is dragging the handle).
const KEY_BTN = "sr-only focus-visible:not-sr-only focus-visible:grid focus-visible:size-11 focus-visible:place-items-center rounded-full text-label disabled:text-label-3 cursor-pointer disabled:cursor-default"

function Group({ defs, prefs, onChange }: { defs: WidgetDef[]; prefs: HomePrefs; onChange: (p: HomePrefs) => void }) {
    const ids = defs.map((d) => d.id)
    const hidden = new Set(prefs.hidden)
    const listRef = useRef<HTMLUListElement>(null)
    const rowRefs = useRef<(HTMLLIElement | null)[]>([])
    const [drag, setDrag] = useState<Drag | null>(null)

    // Esc cancels an in-progress drag.
    useEffect(() => {
        if (!drag) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrag(null)
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [drag])

    const start = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
        const rects = rowRefs.current.slice(0, defs.length).map((r) => {
            const b = r?.getBoundingClientRect()
            return { top: b?.top ?? 0, height: b?.height ?? 0 }
        })
        const listTop = listRef.current?.getBoundingClientRect().top ?? 0
        e.currentTarget.setPointerCapture?.(e.pointerId)
        setDrag({ id: defs[i].id, from: i, startY: e.clientY, y: e.clientY, gap: dropIndex(rects, e.clientY), rects, listTop })
    }
    const move = (e: React.PointerEvent) => setDrag((d) => (d ? { ...d, y: e.clientY, gap: dropIndex(d.rects, e.clientY) } : d))
    const end = () => {
        if (drag) {
            const next = moveToGap(ids, drag.from, drag.gap)
            if (next.some((id, k) => id !== ids[k])) onChange(applyGroupOrder(prefs, ids, next))
        }
        setDrag(null)
    }

    const lineTop = drag ? (drag.gap < drag.rects.length ? drag.rects[drag.gap].top : drag.rects.length ? drag.rects[drag.rects.length - 1].top + drag.rects[drag.rects.length - 1].height : 0) - drag.listTop : 0
    return (
        <ul ref={listRef} className="relative list-none rounded-card bg-surface px-3 py-1">
            {defs.map((w, i) => {
                const lifted = drag?.id === w.id
                const dot = w.color === "ink" ? "bg-surface-2 ring-1 ring-label-3" : PEBBLE_CLASS[w.color].bg
                return (
                    <li
                        key={w.id}
                        ref={(el) => {
                            rowRefs.current[i] = el
                        }}
                        style={lifted ? { transform: `translateY(${drag.y - drag.startY}px) scale(1.03)` } : undefined}
                        className={`flex min-h-11 items-center gap-1 py-1 ${i > 0 ? "border-t border-sep" : ""} ${lifted ? "relative z-10 rounded-control bg-elevated shadow-2xl" : ""}`}
                    >
                        <button
                            type="button"
                            aria-label={`Reorder ${w.title}`}
                            onPointerDown={(e) => start(e, i)}
                            onPointerMove={move}
                            onPointerUp={end}
                            onPointerCancel={() => setDrag(null)}
                            className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-full text-label-2 active:cursor-grabbing"
                        >
                            <GripVertical aria-hidden className="size-5" />
                        </button>
                        <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${dot}`} />
                        <span className="min-w-0 flex-1 truncate pl-1 text-headline">{w.title}</span>
                        {w.adminOnly && <Chip>Committee</Chip>}
                        <button type="button" aria-label={`Move ${w.title} up`} disabled={i === 0} onClick={() => onChange(moveVisible(prefs, ids, w.id, -1))} className={KEY_BTN}>
                            <ChevronUp aria-hidden className="size-5" />
                        </button>
                        <button type="button" aria-label={`Move ${w.title} down`} disabled={i === defs.length - 1} onClick={() => onChange(moveVisible(prefs, ids, w.id, 1))} className={KEY_BTN}>
                            <ChevronDown aria-hidden className="size-5" />
                        </button>
                        <Switch label={w.title} checked={!hidden.has(w.id)} onChange={(on) => onChange(toggleWidget(prefs, w.id, on))} />
                    </li>
                )
            })}
            {drag && <li aria-hidden style={{ top: lineTop - 1.5 }} className="pointer-events-none absolute inset-x-0 h-[3px] rounded-full bg-pebble-lemon" />}
        </ul>
    )
}

export function CustomizeHomeSheet({ open, onClose, prefs, isCommittee, onChange }: { open: boolean; onClose: () => void; prefs: HomePrefs; isCommittee: boolean; onChange: (p: HomePrefs) => void }) {
    const byId = new Map(WIDGETS.map((w) => [w.id, w]))
    const ordered = prefs.order.map((id) => byId.get(id)).filter((w): w is WidgetDef => Boolean(w))
    const general = ordered.filter((w) => !w.adminOnly)
    const admin = isCommittee ? ordered.filter((w) => w.adminOnly) : []
    return (
        <Sheet open={open} onClose={onClose} title="Customize Home" detents={["large"]} trailing={<Button variant="plain" size="md" onClick={onClose}>{COPY.done}</Button>}>
            <p className="mb-3 text-callout text-label-2">Hold the handle and drag to reorder. Switch widgets on or off.</p>
            <Group defs={general} prefs={prefs} onChange={onChange} />
            {admin.length > 0 && (
                <>
                    <h3 className="mb-2 mt-5 px-1 text-caption-2 tracking-wider text-label-2">COMMITTEE ONLY</h3>
                    <Group defs={admin} prefs={prefs} onChange={onChange} />
                </>
            )}
            <div className="mt-5">
                <Button variant="secondary" size="md" onClick={() => onChange(defaultPrefs(isCommittee))}>
                    Reset to default
                </Button>
            </div>
        </Sheet>
    )
}
