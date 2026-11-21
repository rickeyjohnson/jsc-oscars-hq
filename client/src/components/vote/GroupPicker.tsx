import { useState } from "react"
import type { Member } from "../../types"
import { Button } from "../../ui/Button"

type Props = { candidates: Member[]; disabled: boolean; onSubmit: (memberIds: string[]) => void }

const GroupPicker = ({ candidates, disabled, onSubmit }: Props) => {
    const [picked, setPicked] = useState<string[]>([])
    const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    return (
        <div className="mt-4 rounded-card border-l-4 border-pebble-grape bg-surface p-4">
            <p className="text-headline">Make a group (pick 2 or more)</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
                {candidates.map((m) => (
                    <label key={m.id} className="flex min-h-11 items-center gap-2 rounded-control bg-surface-2 px-3 text-subhead">
                        <input type="checkbox" checked={picked.includes(m.id)} disabled={disabled} onChange={() => toggle(m.id)} />
                        {m.name}
                    </label>
                ))}
            </div>
            <div className="mt-3">
                <Button
                    variant="primary"
                    size="md"
                    disabled={disabled || picked.length < 2}
                    onClick={() => {
                        onSubmit(picked)
                        setPicked([])
                    }}
                >
                    Vote for this group
                </Button>
            </div>
        </div>
    )
}

export default GroupPicker
