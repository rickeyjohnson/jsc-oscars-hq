import { Avatar } from "./Avatar"

export function AvatarStack({ people, max = 4, size = 32 }: { people: { id: string; name: string; src?: string | null }[]; max?: number; size?: 24 | 32 }) {
    const shown = people.slice(0, max)
    const extra = people.length - shown.length
    const dim = size === 24 ? "size-6 text-caption-2" : "size-8 text-caption-1"
    return (
        <span className="inline-flex items-center -space-x-2" role="group" aria-label={`${people.length} people`}>
            {shown.map((p) => (
                <Avatar key={p.id} id={p.id} name={p.name} src={p.src} size={size} ring="bg" />
            ))}
            {extra > 0 && <span className={`inline-flex items-center justify-center rounded-full bg-surface-2 text-label font-bold ring-2 ring-bg ${dim}`}>+{extra}</span>}
        </span>
    )
}
