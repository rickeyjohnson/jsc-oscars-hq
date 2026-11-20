import { useState } from "react"
import type { Category, Member } from "../../types"
import { groupCandidates, selectableNominees } from "../../lib/voting"
import GroupPicker from "./GroupPicker"

type Props = {
    category: Category
    index: number
    total: number
    selectedId: string | undefined
    pending: boolean
    expanded: boolean
    readOnly: boolean
    myMemberId: string | null
    members: Member[]
    error: string | null
    registerRef: (el: HTMLElement | null) => void
    onToggle: () => void
    onVote: (nomineeId: string) => void
    onClear: () => void
    onAddOption: (name: string) => void
    onAddGroup: (memberIds: string[]) => void
}

const CategoryVoteCard = (p: Props) => {
    const { category, selectedId, pending, expanded, readOnly } = p
    const [typed, setTyped] = useState("")
    const options = selectableNominees(category.nominees, p.myMemberId)
    const chosen = options.find((n) => n.id === selectedId)
    const open = expanded || !selectedId

    return (
        <section
            ref={p.registerRef}
            tabIndex={-1}
            aria-label={`Category ${p.index + 1} of ${p.total}: ${category.name}`}
            className="scroll-mt-24 rounded-2xl bg-[#27272a] p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#fffadd]"
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h2 className="font-semibold">{category.name}</h2>
                    {category.description && <p className="text-xs opacity-60">{category.description}</p>}
                </div>
                {selectedId && !pending && !p.error && <span className="whitespace-nowrap text-xs text-green-300">✓ Voted</span>}
                {pending && <span className="whitespace-nowrap text-xs opacity-60">Saving...</span>}
            </div>

            {selectedId && !open && (
                <button type="button" onClick={p.onToggle} className="mt-2 block text-left">
                    <span className="inline-block rounded-full bg-[#fffadd] px-3 py-1 text-xs font-medium text-black">{chosen?.display_name ?? "Your pick"}</span>
                    <span className="mt-1 block text-xs opacity-60">Tap to change ▾</span>
                </button>
            )}

            {open && (
                <>
                    <div role="radiogroup" aria-label={category.name} className="mt-2 space-y-2">
                        {options.map((n) => {
                            const on = n.id === selectedId
                            return (
                                <button
                                    key={n.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={on}
                                    disabled={readOnly}
                                    onClick={() => p.onVote(n.id)}
                                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${on ? "bg-[#fffadd] text-black" : "bg-[#3f3f46]"}`}
                                >
                                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#71717a] text-xs font-semibold text-white">
                                        {n.display_name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="flex-1">
                                        {n.display_name}
                                        {n.secondary_text && <span className="block text-xs opacity-60">{n.secondary_text}</span>}
                                    </span>
                                    <span className={`ml-auto h-4 w-4 flex-none rounded-full border-2 ${on ? "border-black bg-black" : "border-[#fffadd]/50"}`} />
                                </button>
                            )
                        })}
                        {options.length === 0 && <p className="text-sm opacity-60">No options yet.</p>}
                    </div>

                    {category.nominee_mode === "preset" && category.allow_member_add && !readOnly && (
                        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { p.onAddOption(typed); setTyped("") } }}>
                            <input
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                                placeholder="Add an option"
                                aria-label="Add an option"
                                className="flex-1 rounded-xl bg-[#3f3f46] px-3 py-2 text-sm placeholder:text-[#fffadd]/40"
                            />
                            <button type="submit" disabled={!typed.trim()} className="rounded-xl bg-[#fffadd] px-3 py-2 text-sm font-medium text-black disabled:opacity-40">Add</button>
                        </form>
                    )}

                    {category.nominee_mode === "group" && !readOnly && (
                        <GroupPicker candidates={groupCandidates(p.members, p.myMemberId)} disabled={readOnly} onSubmit={p.onAddGroup} />
                    )}

                    {selectedId && !readOnly && (
                        <div className="mt-3 flex justify-end gap-4 text-xs">
                            <button type="button" onClick={p.onToggle} className="opacity-70 underline">Collapse</button>
                            <button type="button" onClick={p.onClear} className="opacity-70 underline">Clear</button>
                        </div>
                    )}
                </>
            )}
            {p.error && <p role="alert" className="mt-2 text-xs text-red-400">{p.error}</p>}
        </section>
    )
}

export default CategoryVoteCard
