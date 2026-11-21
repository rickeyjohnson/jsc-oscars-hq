import { useRef } from "react"
import { Check } from "lucide-react"
import { PEBBLE_CLASS, pebbleFor } from "./logic/pebble"
import { COPY } from "./copy"

export type NameChip = { name: string; taken: boolean }

/** Name picker. Taken names are crossed out and cannot be selected; the selected chip gets a ring and a check. A radiogroup with roving tabindex and arrow keys. */
export function NameChips({ names, selected, onSelect }: { names: NameChip[]; selected: string; onSelect: (name: string) => void }) {
    const group = useRef<HTMLDivElement>(null)
    const free = names.filter((n) => !n.taken)
    const tabStop = free.some((n) => n.name === selected) ? selected : free[0]?.name
    // Single-choice group: arrows move to the next free name and select it (taken names are skipped).
    const onKey = (e: React.KeyboardEvent) => {
        const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
        if (!dir || free.length === 0) return
        e.preventDefault()
        const at = free.findIndex((n) => n.name === (document.activeElement as HTMLElement | null)?.dataset.name)
        const next = free[(Math.max(at, 0) + (at < 0 ? 0 : dir) + free.length) % free.length]
        onSelect(next.name)
        group.current?.querySelector<HTMLElement>(`[data-name="${CSS.escape(next.name)}"]`)?.focus()
    }
    return (
        <div ref={group} role="radiogroup" aria-label="Your name" onKeyDown={onKey} className="flex flex-wrap gap-2">
            {names.map(({ name, taken }) => {
                const isSel = !taken && selected === name
                const peb = PEBBLE_CLASS[pebbleFor(name)]
                const look = taken
                    ? "bg-surface-2 text-label-3 line-through cursor-not-allowed"
                    : isSel
                      ? "bg-inverse text-on-inverse ring-2 ring-pebble-lemon cursor-pointer"
                      : `${peb.bg} ${peb.text} cursor-pointer`
                return (
                    <button
                        key={name}
                        type="button"
                        role="radio"
                        data-name={name}
                        aria-checked={isSel}
                        tabIndex={!taken && name === tabStop ? 0 : -1}
                        aria-disabled={taken || undefined}
                        onClick={taken ? undefined : () => onSelect(name)}
                        className={`text-callout focus-visible:ring-accent inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 font-bold outline-none focus-visible:ring-2 ${look}`}
                    >
                        {isSel && <Check aria-hidden className="size-4" />}
                        {name}
                        {taken && <span className="sr-only"> ({COPY.taken})</span>}
                    </button>
                )
            })}
        </div>
    )
}
