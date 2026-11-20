import { Check } from "lucide-react"
import { PEBBLE_CLASS, pebbleFor } from "./logic/pebble"
import { COPY } from "./copy"

export type NameChip = { name: string; taken: boolean }

/** Name picker. Taken names are crossed out and cannot be selected; the selected chip gets a cream ring and a check. */
export function NameChips({ names, selected, onSelect }: { names: NameChip[]; selected: string; onSelect: (name: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
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
                        aria-pressed={isSel}
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
