import { MemberAvatar } from "../../ui/MemberAvatar"
import { PEBBLE_CLASS } from "../../ui/logic/pebble"
import { nomineePebbles } from "../../lib/voting"
import type { Nominee } from "../../types"

// Pick one nominee: pebble fill = selected, the same as on the voting cards.
export function WinnerPicker({ label, options, value, onChange }: { label: string; options: Nominee[]; value: string | null; onChange: (id: string) => void }) {
    const pebbles = nomineePebbles(options)
    return (
        <div role="radiogroup" aria-label={label} className="space-y-2">
            {options.map((n) => {
                const on = value === n.id
                const p = PEBBLE_CLASS[pebbles[n.id]]
                return (
                    <button
                        key={n.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(n.id)}
                        className={`flex min-h-14 w-full items-center gap-3 rounded-card px-4 py-2 text-left ${on ? `${p.bg} ${p.text}` : "bg-surface-2 text-label"}`}
                    >
                        <MemberAvatar memberId={n.member_ids.length === 1 ? n.member_ids[0] : undefined} name={n.display_name} size={40} ring="pebble" decorative />
                        <span className="min-w-0 flex-1 truncate text-callout font-bold">{n.display_name}</span>
                        {on && <span aria-hidden className="text-headline">✓</span>}
                    </button>
                )
            })}
        </div>
    )
}
