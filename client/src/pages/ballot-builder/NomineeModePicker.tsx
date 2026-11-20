import { useState } from "react"
import { X } from "lucide-react"
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

    const input = "w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-100/30"

    return (
        <div className="space-y-3">
            <div role="group" aria-label="Nominee mode" className="grid grid-cols-4 gap-1 bg-[#27272a] p-1 rounded-lg">
                {MODES.map((m) => (
                    <button
                        key={m.value}
                        type="button"
                        aria-pressed={category.nominee_mode === m.value}
                        onClick={() => setMode(m.value)}
                        className={`py-2 rounded-lg text-xs font-bold transition ${
                            category.nominee_mode === m.value ? "bg-[#fffadd] text-black" : "bg-[#3f3f46] text-amber-100/70 hover:brightness-125"
                        }`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {category.nominee_mode === "everyone" && (
                <p className="text-xs text-amber-100/50">All {members.length} members are nominees.</p>
            )}

            {category.nominee_mode === "group" && (
                <p className="text-xs text-amber-100/50">Voters pick 2+ members.</p>
            )}

            {category.nominee_mode === "subset" && (
                <div className="grid grid-cols-2 gap-2">
                    {members.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 bg-[#27272a] rounded-lg px-3 py-2 text-sm text-amber-100 cursor-pointer">
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
                        <button type="button" onClick={addCustom} className="px-3 bg-[#fffadd] text-black rounded-lg text-xs font-bold">Add</button>
                    </div>
                    {dupError && <p role="alert" className="text-xs text-red-300">{dupError}</p>}
                    <ul className="space-y-1">
                        {category.nominees.map((n) => (
                            <li key={n.id} className="flex items-center justify-between bg-[#27272a] rounded-lg px-3 py-2 text-sm text-amber-100">
                                <span>
                                    {n.display_name}
                                    {n.secondary_text && <span className="text-amber-100/40"> - {n.secondary_text}</span>}
                                </span>
                                <button
                                    type="button"
                                    aria-label={`Remove ${n.display_name}`}
                                    onClick={() => onChange({ ...category, nominees: category.nominees.filter((x) => x.id !== n.id) })}
                                >
                                    <X className="w-4 h-4 text-amber-100/50" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <label className="flex items-center gap-2 text-sm text-amber-100">
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
