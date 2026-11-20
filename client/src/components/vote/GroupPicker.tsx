import { useState } from "react"
import type { Member } from "../../types"

type Props = { candidates: Member[]; disabled: boolean; onSubmit: (memberIds: string[]) => void }

const GroupPicker = ({ candidates, disabled, onSubmit }: Props) => {
    const [picked, setPicked] = useState<string[]>([])
    const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    return (
        <div className="mt-4 rounded-xl bg-[#27272a] p-3">
            <p className="text-sm font-medium">Make a group (pick 2 or more)</p>
            <div className="mt-2 grid grid-cols-2 gap-1">
                {candidates.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 rounded-lg bg-[#3f3f46] px-2 py-2 text-sm">
                        <input type="checkbox" checked={picked.includes(m.id)} disabled={disabled} onChange={() => toggle(m.id)} />
                        {m.name}
                    </label>
                ))}
            </div>
            <button
                type="button"
                disabled={disabled || picked.length < 2}
                onClick={() => { onSubmit(picked); setPicked([]) }}
                className="mt-3 rounded-full bg-[#fffadd] px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
                Vote for this group
            </button>
        </div>
    )
}

export default GroupPicker
