import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "../../ui/Button"
import { Chip } from "../../ui/Chip"
import { Sheet } from "../../ui/Sheet"
import { Switch } from "../../ui/Switch"
import { COPY } from "../../ui/copy"
import { WIDGETS, type WidgetDef, type WidgetId } from "../../ui/logic/homeWidgets"
import { defaultPrefs, moveWidget, toggleWidget, type HomePrefs } from "../../ui/logic/homePrefs"

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

function Group({ defs, prefs, onChange }: { defs: WidgetDef[]; prefs: HomePrefs; onChange: (p: HomePrefs) => void }) {
    const ids = defs.map((d) => d.id)
    const hidden = new Set(prefs.hidden)
    return (
        <ul className="list-none rounded-card bg-surface px-3 py-1">
            {defs.map((w, i) => (
                <li key={w.id} className={`flex min-h-11 items-center gap-1 py-1 ${i > 0 ? "border-t border-sep" : ""}`}>
                    <span className="min-w-0 flex-1 truncate text-headline">{w.title}</span>
                    {w.adminOnly && <Chip>Committee</Chip>}
                    <button
                        type="button"
                        aria-label={`Move ${w.title} up`}
                        disabled={i === 0}
                        onClick={() => onChange(moveVisible(prefs, ids, w.id, -1))}
                        className="grid size-11 place-items-center rounded-full text-label disabled:text-label-3 cursor-pointer disabled:cursor-default"
                    >
                        <ChevronUp aria-hidden className="size-5" />
                    </button>
                    <button
                        type="button"
                        aria-label={`Move ${w.title} down`}
                        disabled={i === defs.length - 1}
                        onClick={() => onChange(moveVisible(prefs, ids, w.id, 1))}
                        className="grid size-11 place-items-center rounded-full text-label disabled:text-label-3 cursor-pointer disabled:cursor-default"
                    >
                        <ChevronDown aria-hidden className="size-5" />
                    </button>
                    <Switch label={w.title} checked={!hidden.has(w.id)} onChange={(on) => onChange(toggleWidget(prefs, w.id, on))} />
                </li>
            ))}
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
            <p className="mb-3 text-callout text-label-2">Choose and reorder what you see on Home.</p>
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
