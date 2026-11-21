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

// Screen-reader-only twins of the handle's keyboard reorder. Never focusable by Tab and never shown, so nothing shifts.
const KEY_BTN = "sr-only"
const HELP_ID = "customize-reorder-help"

type Grab = { id: WidgetId; orig: HomePrefs }

function Group({ defs, prefs, onChange, announce, released }: { defs: WidgetDef[]; prefs: HomePrefs; onChange: (p: HomePrefs) => void; announce: (msg: string) => void; released: boolean }) {
    const ids = defs.map((d) => d.id)
    const hidden = new Set(prefs.hidden)
    const listRef = useRef<HTMLUListElement>(null)
    const rowRefs = useRef<(HTMLLIElement | null)[]>([])
    const [drag, setDrag] = useState<Drag | null>(null)
    const [grab, setGrab] = useState<Grab | null>(null)
    const handleRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    // Moving a row re-parents its node, which can drop focus: put it back on the grabbed handle.
    useEffect(() => {
        if (!grab) return
        const el = handleRefs.current[grab.id]
        if (el && document.activeElement !== el) el.focus()
    })

    // Keyboard reorder on the handle: Space/Enter grabs, Up/Down move one place, Space/Enter drops, Esc puts it back.
    const onHandleKey = (e: React.KeyboardEvent<HTMLButtonElement>, w: WidgetDef, i: number) => {
        const n = defs.length
        const pick = e.key === " " || e.key === "Enter"
        if (grab?.id !== w.id) {
            if (!pick) return
            e.preventDefault()
            setGrab({ id: w.id, orig: prefs })
            announce(`Picked up ${w.title}. Position ${i + 1} of ${n}. Use the up and down arrow keys to move, Space to drop, Escape to cancel.`)
            return
        }
        if (pick) {
            e.preventDefault()
            setGrab(null)
            announce(`Dropped ${w.title} at position ${i + 1} of ${n}.`)
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault()
            const dir = e.key === "ArrowUp" ? -1 : 1
            const to = i + dir
            if (to < 0 || to >= n) {
                announce(`${w.title} is already ${dir < 0 ? "first" : "last"}.`)
                return
            }
            onChange(moveVisible(prefs, ids, w.id, dir))
            announce(`Moved ${w.title} to position ${to + 1} of ${n}.`)
        } else if (e.key === "Escape") {
            e.preventDefault()
            e.stopPropagation()
            const back = grab.orig.order.filter((id) => ids.includes(id)).indexOf(w.id) + 1
            onChange(grab.orig)
            setGrab(null)
            announce(`Cancelled. ${w.title} is back at position ${back} of ${n}.`)
        }
    }

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
                const dot = PEBBLE_CLASS[w.color].bg
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
                            ref={(el) => {
                                handleRefs.current[w.id] = el
                            }}
                            aria-label={`Reorder ${w.title}`}
                            aria-roledescription="sortable"
                            aria-describedby={HELP_ID}
                            aria-pressed={grab?.id === w.id}
                            onKeyDown={(e) => onHandleKey(e, w, i)}
                            onBlur={(e) => {
                                if (grab?.id === w.id && e.relatedTarget) setGrab(null)
                            }}
                            onPointerDown={(e) => start(e, i)}
                            onPointerMove={move}
                            onPointerUp={end}
                            onPointerCancel={() => setDrag(null)}
                            className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-full text-label-2 active:cursor-grabbing"
                        >
                            <GripVertical aria-hidden className="size-5" />
                        </button>
                        <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${dot}`} />
                        <span className="min-w-0 flex-1 pl-1">
                            <span className="block truncate text-headline">{w.title}</span>
                            <span className="block text-footnote text-label-2">{w.blurb}</span>
                            {w.requiresRelease && !released && <span className="block text-footnote text-label-2">Appears after results are released</span>}
                        </span>
                        {w.adminOnly && <Chip>Committee</Chip>}
                        <button type="button" tabIndex={-1} aria-label={`Move ${w.title} up`} disabled={i === 0} onClick={() => onChange(moveVisible(prefs, ids, w.id, -1))} className={KEY_BTN}>
                            <ChevronUp aria-hidden className="size-5" />
                        </button>
                        <button type="button" tabIndex={-1} aria-label={`Move ${w.title} down`} disabled={i === defs.length - 1} onClick={() => onChange(moveVisible(prefs, ids, w.id, 1))} className={KEY_BTN}>
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

export function CustomizeHomeSheet({ open, onClose, prefs, isCommittee, released = false, onChange }: { open: boolean; onClose: () => void; prefs: HomePrefs; isCommittee: boolean; released?: boolean; onChange: (p: HomePrefs) => void }) {
    const byId = new Map(WIDGETS.map((w) => [w.id, w]))
    const ordered = prefs.order.map((id) => byId.get(id)).filter((w): w is WidgetDef => Boolean(w))
    const general = ordered.filter((w) => !w.adminOnly)
    const [message, setMessage] = useState("")
    const admin = isCommittee ? ordered.filter((w) => w.adminOnly) : []
    return (
        <Sheet open={open} onClose={onClose} title="Customize Home" detents={["large"]} trailing={<Button variant="plain" size="md" onClick={onClose}>{COPY.done}</Button>}>
            <p className="mb-3 text-callout text-label-2">Hold the handle and drag to reorder, or focus a handle and press Space, then the arrow keys. Switch widgets on or off.</p>
            <p id={HELP_ID} className="sr-only">
                Press Space to pick up, the up and down arrow keys to move, Space to drop, Escape to cancel.
            </p>
            <div role="status" aria-live="polite" className="sr-only">
                {message}
            </div>
            <Group defs={general} prefs={prefs} onChange={onChange} announce={setMessage} released={released} />
            {admin.length > 0 && (
                <>
                    <h3 className="mb-2 mt-5 px-1 text-caption-2 tracking-wider text-label-2">COMMITTEE ONLY</h3>
                    <Group defs={admin} prefs={prefs} onChange={onChange} announce={setMessage} released={released} />
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
