import { useEffect, useRef, useState } from "react"
import { Check, Lock } from "lucide-react"
import type { Category, Member } from "../../types"
import { groupCandidates, groupLimits, lockedNominees, nomineeKey, nomineePebbles, selectableNominees, type VoteMessage } from "../../lib/voting"
import { Avatar } from "../../ui/Avatar"
import { Button, Spinner } from "../../ui/Button"
import { SheetActions } from "../../ui/SheetActions"
import { Sheet } from "../../ui/Sheet"
import { PEBBLE_CLASS, selectedSmallTextClass } from "../../ui/logic/pebble"
import { VoteBanner } from "./VoteBanner"
import GroupSheet from "./GroupSheet"

type Props = {
    category: Category
    index: number
    total: number
    selectedId: string | undefined
    pending: boolean
    current: boolean
    readOnly: boolean
    myMemberId: string | null
    myName?: string
    members: Member[]
    avatars: Record<string, string | null>
    message: VoteMessage | null
    registerRef: (el: HTMLElement | null) => void
    onVote: (nomineeId: string) => void
    onClear: () => void
    onAddOption: (name: string) => void
    onAddGroup: (memberIds: string[]) => void
    groupOpen: boolean
    onGroupOpenChange: (open: boolean) => void
}

export { nomineeKey }

/** One category per page. Each nominee is a dark card with a pebble face ring; the chosen one fills with that pebble. */
const CategoryVoteCard = (p: Props) => {
    const { category, selectedId, pending, readOnly, message } = p
    const [typed, setTyped] = useState("")
    const [lockedPick, setLockedPick] = useState<string | null>(null)
    const options = selectableNominees(category.nominees, p.myMemberId)
    const locked = lockedNominees(category.nominees, p.myMemberId)
    const pebbles = nomineePebbles(options)
    const isGroup = category.nominee_mode === "group"
    const secRef = useRef<HTMLElement | null>(null)
    // A new error with Try again: move focus to it only when focus was already inside this category.
    useEffect(() => {
        const el = secRef.current
        if (message?.retry && el?.contains(document.activeElement)) el.querySelector<HTMLElement>("[data-retry]")?.focus()
    }, [message])
    // Roving tabindex: arrows move focus only (a vote is a network write); Enter/Space vote through the button's click.
    const onRadioKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"]
        if (!keys.includes(e.key)) return
        const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'))
        const at = radios.indexOf(document.activeElement as HTMLElement)
        if (at < 0 || radios.length === 0) return
        e.preventDefault()
        const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1
        radios[(at + step + radios.length) % radios.length].focus()
    }
    const tabStop = options.some((n) => n.id === selectedId) ? selectedId : options[0]?.id
    const hint = category.description || (isGroup ? "Pick one group. Groups you're in can't be chosen." : "Pick one. You can't vote for yourself.")

    return (
        <section
            ref={(el) => {
                secRef.current = el
                p.registerRef(el)
            }}
            tabIndex={-1}
            aria-label={`Category ${p.index + 1} of ${p.total}: ${category.name}`}
            className={`tab-enter outline-none ${p.current ? "" : "hidden"}`}
        >
            <h2 className="break-words font-display text-title-1">{category.name}</h2>
            {!readOnly && <p className="mt-1 text-subhead text-label-2">{selectedId && !pending && !message ? "Your vote is saved. Tap another to change it." : hint}</p>}
            <p className="mt-1 flex min-h-5 items-center gap-2 text-footnote text-label-2" aria-live="polite">
                {pending && (
                    <>
                        <Spinner />
                        <span>Saving...</span>
                    </>
                )}
            </p>

            {message && <VoteBanner className="mt-2" tone={message.tone} title={message.title} detail={message.detail} retry={message.retry} retryLabel={message.retryLabel} />}

            <div role="radiogroup" aria-label={category.name} onKeyDown={onRadioKey} className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                {options.map((n) => {
                    const on = n.id === selectedId
                    const peb = pebbles[n.id]
                    const c = PEBBLE_CLASS[peb]
                    const group = n.member_ids.length > 1
                    return (
                        <button
                            key={n.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-busy={on && pending ? true : undefined}
                            tabIndex={n.id === tabStop ? 0 : -1}
                            aria-disabled={readOnly || undefined}
                            onClick={() => {
                                if (!on && !readOnly) p.onVote(n.id)
                            }}
                            className={`flex min-h-16 w-full items-center gap-3 rounded-card p-3 text-left transition-colors duration-150 motion-reduce:transition-none ${on ? `${c.bg} ${c.text}` : "bg-surface"} ${readOnly ? "opacity-70" : "cursor-pointer active:scale-[0.99]"}`}
                        >
                            <Avatar
                                id={nomineeKey(n)}
                                name={group ? String(n.member_ids.length) : n.display_name}
                                src={n.member_ids.length === 1 ? p.avatars[n.member_ids[0]] : null}
                                size={40}
                                ring="pebble"
                                onPebble={on}
                                pebble={peb}
                                decorative
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block break-words text-headline">{n.display_name}</span>
                                {group ? (
                                    <span className={`block text-footnote ${on ? selectedSmallTextClass(peb) : "text-label-2"}`}>{n.member_ids.length} people</span>
                                ) : (
                                    n.secondary_text && <span className={`block text-footnote ${on ? selectedSmallTextClass(peb) : "text-label-2"}`}>{n.secondary_text}</span>
                                )}
                            </span>
                            {on && (pending ? <Spinner /> : <Check aria-hidden strokeWidth={3} className="size-6 shrink-0" />)}
                        </button>
                    )
                })}
                {options.length === 0 && <p className="text-callout text-label-2">No options yet.</p>}
            </div>

            {locked.length > 0 && (
                <div className="mt-4">
                    <p className="mb-2 text-caption-1 font-bold tracking-wide text-label-3">YOU'RE IN THESE (CAN'T VOTE)</p>
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                        {locked.map((n) => (
                            <button
                                key={n.id}
                                type="button"
                                aria-label={`${n.display_name}, locked. You're in this group.`}
                                onClick={() => setLockedPick(n.display_name)}
                                className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-card border border-dashed border-label-3 p-3 text-left text-label-2"
                            >
                                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-fill">
                                    <Lock className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block break-words text-headline">{n.display_name}</span>
                                    <span className="block text-footnote">You're in this group</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedId && !readOnly && (
                <Button className="mt-2" variant="link" size="md" onClick={p.onClear}>
                    Clear my vote
                </Button>
            )}

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
                    <Button type="submit" size="md" disabled={!typed.trim()}>
                        Add
                    </Button>
                </form>
            )}

            {isGroup && !readOnly && (
                <>
                    <Button className="mt-4 lg:hidden" fullWidth variant="ghost" onClick={() => p.onGroupOpenChange(true)}>
                        + Add a group
                    </Button>
                    <GroupSheet
                        open={p.groupOpen}
                        candidates={groupCandidates(p.members, p.myMemberId)}
                        min={groupLimits(category).min}
                        max={groupLimits(category).max}
                        myName={p.myName}
                        onClose={() => p.onGroupOpenChange(false)}
                        onSubmit={(ids) => {
                            p.onGroupOpenChange(false)
                            p.onAddGroup(ids)
                        }}
                    />
                </>
            )}

            <Sheet
                open={lockedPick !== null}
                onClose={() => setLockedPick(null)}
                title="Why can't I pick this one?"
                fit
                footer={
                    <SheetActions>
                        <Button fullWidth onClick={() => setLockedPick(null)}>
                            Got it
                        </Button>
                    </SheetActions>
                }
            >
                <p className="text-body">You're in "{lockedPick}", and you can't vote for yourself or a group you belong to. Pick another group.</p>
            </Sheet>
        </section>
    )
}

export default CategoryVoteCard
