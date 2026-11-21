import { useState } from "react"
import { X } from "lucide-react"
import { SegmentedControl } from "../../ui/SegmentedControl"
import { useConfirm } from "../../ui/ConfirmProvider"
import type { Category, Member, NomineeMode } from "../../types"

interface Props {
    category: Category
    members: Member[]
    onChange: (c: Category) => void
}

const MODES: { value: NomineeMode; label: string }[] = [
    { value: "everyone", label: "Everyone" },
    { value: "subset", label: "Some" },
    { value: "preset", label: "Preset" },
    { value: "group", label: "Group" },
]

const NomineeModePicker: React.FC<Props> = ({ category, members, onChange }) => {
    const confirm = useConfirm()
    const [custom, setCustom] = useState("")
    const [secondary, setSecondary] = useState("")
    const [dupError, setDupError] = useState("")

    const setMode = async (nominee_mode: NomineeMode) => {
        if (nominee_mode === category.nominee_mode) return
        if (category.nominees.length > 0 && !(await confirm({ title: "Switch mode and clear nominees?", message: "Switching mode clears this category's nominees.", confirmLabel: "Switch", destructive: true }))) return
        // Nominee lists do not carry across modes.
        onChange({ ...category, nominee_mode, nominees: [], allow_member_add: nominee_mode === "preset" ? category.allow_member_add : false })
    }

    const selectedIds = new Set(category.nominees.flatMap((n) => n.member_ids))
    const toggleMember = (m: Member) => {
        if (selectedIds.has(m.id)) {
            onChange({ ...category, nominees: category.nominees.filter((n) => !n.member_ids.includes(m.id)) })
        } else {
            onChange({
                ...category,
                nominees: [...category.nominees, { id: crypto.randomUUID(), display_name: m.name, type: "person", member_ids: [m.id] }],
            })
        }
    }

    const addCustom = () => {
        const name = custom.trim()
        if (!name) return
        if (category.nominees.some((n) => n.display_name.toLowerCase() === name.toLowerCase())) {
            setDupError(`"${name}" is already an option`)
            return
        }
        setDupError("")
        const match = members.find((m) => m.name.toLowerCase() === name.toLowerCase())
        onChange({
            ...category,
            nominees: [
                ...category.nominees,
                {
                    id: crypto.randomUUID(),
                    display_name: match ? match.name : name,
                    secondary_text: secondary.trim() || undefined,
                    type: match ? "person" : "outsider",
                    member_ids: match ? [match.id] : [],
                },
            ],
        })
        setCustom("")
        setSecondary("")
    }

    const input = "h-11 w-full rounded-control bg-surface-2 px-3 text-subhead text-label placeholder:text-label-3 outline-none focus-visible:ring-2 focus-visible:ring-accent"

    return (
        <div className="space-y-3">
            <SegmentedControl label="Nominee mode" idPrefix="nominee-mode" options={MODES} value={category.nominee_mode} onChange={setMode} />

            {category.nominee_mode === "everyone" && (
                <p className="text-footnote text-label-2">All {members.length} members are nominees.</p>
            )}

            {category.nominee_mode === "group" && (
                <p className="text-footnote text-label-2">Voters pick 2+ members.</p>
            )}

            {category.nominee_mode === "subset" && (
                <div className="grid grid-cols-2 gap-2">
                    {members.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 bg-surface-2 rounded-control px-3 py-2 min-h-11 text-subhead text-label cursor-pointer">
                            <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleMember(m)} />
                            {m.name}
                        </label>
                    ))}
                </div>
            )}

            {category.nominee_mode === "preset" && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input className={input} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Option name" aria-label="Option name" />
                        <input className={input} value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder="Detail (optional)" aria-label="Option detail" />
                        <button type="button" onClick={addCustom} className="px-4 h-11 bg-inverse text-on-inverse rounded-full text-subhead font-bold">Add</button>
                    </div>
                    {dupError && <p role="alert" className="text-footnote text-danger">{dupError}</p>}
                    <ul className="space-y-1">
                        {category.nominees.map((n) => (
                            <li key={n.id} className="flex items-center justify-between bg-surface-2 rounded-control px-3 py-2 min-h-11 text-subhead text-label">
                                <span>
                                    {n.display_name}
                                    {n.secondary_text && <span className="text-label-3"> - {n.secondary_text}</span>}
                                </span>
                                <button
                                    type="button"
                                    aria-label={`Remove ${n.display_name}`}
                                    onClick={() => onChange({ ...category, nominees: category.nominees.filter((x) => x.id !== n.id) })}
                                >
                                    <X aria-hidden className="size-5 text-label-2" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <label className="flex items-center gap-2 text-subhead text-label">
                        <input
                            type="checkbox"
                            checked={category.allow_member_add}
                            onChange={(e) => onChange({ ...category, allow_member_add: e.target.checked })}
                        />
                        Let members add options
                    </label>
                </div>
            )}
        </div>
    )
}

export default NomineeModePicker
