import { useState } from "react"
import type { Category, Member } from "../../types"
import { groupCandidates, selectableNominees } from "../../lib/voting"
import GroupPicker from "./GroupPicker"

type Props = {
    category: Category
    index: number
    total: number
    selectedId: string | undefined
    readOnly: boolean
    myMemberId: string | null
    members: Member[]
    error: string | null
    onVote: (nomineeId: string) => void
    onClear: () => void
    onAddOption: (name: string) => void
    onAddGroup: (memberIds: string[]) => void
}

const CategoryVoteCard = ({ category, index, total, selectedId, readOnly, myMemberId, members, error, onVote, onClear, onAddOption, onAddGroup }: Props) => {
    const [typed, setTyped] = useState("")
    const options = selectableNominees(category.nominees, myMemberId)
    return (
        <section>
            <div className="mb-4 mt-6 text-center">
                <div className="text-xs tracking-[0.2em] opacity-60">CATEGORY {index + 1} OF {total}</div>
                <h2 className="mt-1 text-2xl font-semibold">{category.name}</h2>
                {category.description && <p className="mt-1 text-sm opacity-60">{category.description}</p>}
            </div>

            <div role="radiogroup" aria-label={category.name} className="space-y-2">
                {options.map((n) => {
                    const on = n.id === selectedId
                    return (
                        <button
                            key={n.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={readOnly}
                            onClick={() => onVote(n.id)}
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
                <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { onAddOption(typed); setTyped("") } }}
                >
                    <input
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder="Add an option"
                        aria-label="Add an option"
                        className="flex-1 rounded-xl bg-[#3f3f46] px-3 py-2 text-sm placeholder:text-[#fffadd]/40"
                    />
                    <button type="submit" disabled={!typed.trim()} className="rounded-xl bg-[#fffadd] px-3 py-2 text-sm font-medium text-black disabled:opacity-40">
                        Add
                    </button>
                </form>
            )}

            {category.nominee_mode === "group" && !readOnly && (
                <GroupPicker candidates={groupCandidates(members, myMemberId)} disabled={readOnly} onSubmit={onAddGroup} />
            )}

            <div className="mt-3 flex items-center justify-between text-xs">
                {error ? <span role="alert" className="text-red-400">{error}</span>
                    : selectedId ? <span className="text-green-300">✓ Saved</span> : <span className="opacity-60">Not voted yet</span>}
                {selectedId && !readOnly && (
                    <button type="button" onClick={onClear} className="opacity-70 underline">Clear</button>
                )}
            </div>
        </section>
    )
}

export default CategoryVoteCard
