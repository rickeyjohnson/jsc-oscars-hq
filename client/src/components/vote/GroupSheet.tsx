import { useState } from "react"
import { Check } from "lucide-react"
import type { Member } from "../../types"
import { GROUP_MAX_SIZE, GROUP_MIN_SIZE, joinNames } from "../../lib/voting"
import { Avatar } from "../../ui/Avatar"
import { Button } from "../../ui/Button"
import { Sheet } from "../../ui/Sheet"
import { avatarFallback } from "../../ui/logic/avatar"
import { PEBBLE_CLASS } from "../../ui/logic/pebble"

type Props = { open: boolean; candidates: Member[]; myName?: string; onClose: () => void; onSubmit: (memberIds: string[]) => void }

/** Pick 2 to GROUP_MAX_SIZE other people. The button names the group it will vote for. */
const GroupSheet = ({ open, candidates, myName, onClose, onSubmit }: Props) => {
    const [picked, setPicked] = useState<string[]>([])
    const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < GROUP_MAX_SIZE ? [...p, id] : p))
    const names = candidates.filter((m) => picked.includes(m.id)).map((m) => m.name)
    const ready = picked.length >= GROUP_MIN_SIZE
    const full = picked.length >= GROUP_MAX_SIZE
    const close = () => {
        setPicked([])
        onClose()
    }
    return (
        <Sheet
            open={open}
            onClose={close}
            title="Add a group"
            fit
            footer={
                <div className="flex flex-col gap-2">
                    <Button
                        fullWidth
                        disabled={!ready}
                        onClick={() => {
                            onSubmit(picked)
                            setPicked([])
                        }}
                    >
                        {ready ? `Vote for ${joinNames(names)}` : `Pick ${GROUP_MIN_SIZE} or ${GROUP_MAX_SIZE} people`}
                    </Button>
                    <Button fullWidth variant="plain" onClick={close}>
                        Cancel
                    </Button>
                </div>
            }
        >
            <p className="text-subhead text-label-2">
                Pick {GROUP_MIN_SIZE} or {GROUP_MAX_SIZE} people. You can't include yourself.
            </p>
            {picked.length > 0 && (
                <div className="mt-3 flex items-center gap-3 rounded-card bg-bg p-3" data-testid="group-preview">
                    <span aria-hidden className="flex shrink-0">
                        {candidates
                            .filter((m) => picked.includes(m.id))
                            .map((m, i) => (
                                <span key={m.id} className={i > 0 ? "-ml-2" : ""}>
                                    <Avatar id={m.id} name={m.name} size={32} ring="bg" decorative />
                                </span>
                            ))}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-headline">{joinNames(names)}</span>
                        <span className="block text-footnote text-label-2">{picked.length} people</span>
                    </span>
                </div>
            )}
            {picked.length === 1 && <p className="mt-2 text-footnote text-label-2">Pick one more person</p>}
            <div role="group" aria-label="People in this group" className="mt-3 flex flex-wrap gap-2">
                {candidates.map((m) => {
                    const on = picked.includes(m.id)
                    const c = PEBBLE_CLASS[avatarFallback(m.id)]
                    return (
                        <button
                            key={m.id}
                            type="button"
                            aria-pressed={on}
                            disabled={!on && full}
                            onClick={() => toggle(m.id)}
                            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-subhead font-bold disabled:cursor-default disabled:opacity-40 ${on ? `${c.bg} ${c.text}` : "bg-fill text-label"}`}
                        >
                            <span aria-hidden className={`size-2.5 rounded-full ${on ? "bg-on-pebble-lemon" : c.bg}`} />
                            {m.name}
                            {on && <Check aria-hidden strokeWidth={3} className="size-4" />}
                        </button>
                    )
                })}
                {myName && (
                    <span className="inline-flex min-h-11 items-center rounded-full border border-dashed border-label-3 px-4 text-subhead text-label-3">{myName} (you)</span>
                )}
            </div>
        </Sheet>
    )
}

export default GroupSheet
