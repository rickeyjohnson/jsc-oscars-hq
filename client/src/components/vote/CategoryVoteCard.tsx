import { useState } from "react"
import { Check } from "lucide-react"
import type { Category, Member, Nominee } from "../../types"
import { groupCandidates, selectableNominees } from "../../lib/voting"
import { Avatar } from "../../ui/Avatar"
import { avatarFallback } from "../../ui/logic/avatar"
import { PEBBLE_CLASS, PEBBLE_EDGE } from "../../ui/logic/pebble"
import GroupPicker from "./GroupPicker"

type Props = {
    category: Category
    index: number
    total: number
    selectedId: string | undefined
    pending: boolean
    current: boolean
    readOnly: boolean
    myMemberId: string | null
    members: Member[]
    avatars: Record<string, string | null>
    error: string | null
    registerRef: (el: HTMLElement | null) => void
    onVote: (nomineeId: string) => void
    onClear: () => void
    onAddOption: (name: string) => void
    onAddGroup: (memberIds: string[]) => void
}

/** The stable identity of a nominee: the member id for one person (so their color matches everywhere), else the nominee id. */
export const nomineeKey = (n: Nominee): string => (n.member_ids.length === 1 ? n.member_ids[0] : n.id)

/** One category, one page. Each nominee is a dark card with a pebble edge; the chosen one fills with its pebble. */
const CategoryVoteCard = (p: Props) => {
    const { category, selectedId, pending, readOnly } = p
    const [typed, setTyped] = useState("")
    const options = selectableNominees(category.nominees, p.myMemberId)

    return (
        <section
            ref={p.registerRef}
            tabIndex={-1}
            aria-label={`Category ${p.index + 1} of ${p.total}: ${category.name}`}
            className={`tab-enter outline-none ${p.current ? "" : "hidden"}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="font-display text-title-1">{category.name}</h2>
                    {category.description && <p className="mt-1 text-subhead text-label-2">{category.description}</p>}
                </div>
                <span className="whitespace-nowrap pt-2 text-footnote text-label-2" aria-live="polite">
                    {pending ? "Saving..." : selectedId && !p.error ? "✓ Voted" : ""}
                </span>
            </div>

            <div role="radiogroup" aria-label={category.name} className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {options.map((n) => {
                    const on = n.id === selectedId
                    const key = nomineeKey(n)
                    const peb = avatarFallback(key)
                    const c = PEBBLE_CLASS[peb]
                    return (
                        <button
                            key={n.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={readOnly}
                            onClick={() => (on ? p.onClear() : p.onVote(n.id))}
                            className={`flex min-h-16 w-full items-center gap-3 rounded-card border-l-4 p-3 text-left transition-colors duration-150 motion-reduce:transition-none ${PEBBLE_EDGE[peb]} ${on ? `${c.bg} ${c.text}` : "bg-surface"} ${readOnly ? "opacity-70" : "cursor-pointer active:scale-[0.99]"}`}
                        >
                            <Avatar id={key} name={n.display_name} src={n.member_ids.length === 1 ? p.avatars[n.member_ids[0]] : null} size={40} ring="pebble" decorative />
                            <span className="min-w-0 flex-1">
                                <span className="block text-headline">{n.display_name}</span>
                                {n.secondary_text && <span className={`block text-footnote ${on ? "" : "text-label-2"}`}>{n.secondary_text}</span>}
                            </span>
                            {on && <Check aria-hidden strokeWidth={3} className="size-6 shrink-0" />}
                        </button>
                    )
                })}
                {options.length === 0 && <p className="text-callout text-label-2">No options yet.</p>}
            </div>

            {category.nominee_mode === "preset" && category.allow_member_add && !readOnly && (
                <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault()
                        if (typed.trim()) {
                            p.onAddOption(typed)
                            setTyped("")
                        }
                    }}
                >
                    <input
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder="Add an option"
                        aria-label="Add an option"
                        className="h-13 min-w-0 flex-1 rounded-control bg-surface-2 px-4 text-body text-label outline-none placeholder:text-label-3 focus-visible:ring-2 focus-visible:ring-accent"
                    />
                    <button type="submit" disabled={!typed.trim()} className="h-13 rounded-full bg-inverse px-5 text-subhead font-bold text-on-inverse disabled:opacity-40">
                        Add
                    </button>
                </form>
            )}

            {category.nominee_mode === "group" && !readOnly && <GroupPicker candidates={groupCandidates(p.members, p.myMemberId)} disabled={readOnly} onSubmit={p.onAddGroup} />}
            {p.error && (
                <p role="alert" className="mt-3 text-footnote text-danger">
                    {p.error}
                </p>
            )}
        </section>
    )
}

export default CategoryVoteCard
