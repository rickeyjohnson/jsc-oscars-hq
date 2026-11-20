import { ordinal } from "../lib/resultsView"

export type PodiumItem = { key: string; slot: 1 | 2 | 3; name: string; sub?: string | null; tag?: string | null; avatarUrl?: string | null }

const BLOCK: Record<1 | 2 | 3, { height: number; bg: string; fg: string; avatar: number; order: number }> = {
    1: { height: 92, bg: "#FFC23D", fg: "#3b2a00", avatar: 38, order: 2 },
    2: { height: 66, bg: "#9DB4D0", fg: "#17263a", avatar: 30, order: 1 },
    3: { height: 48, bg: "#E8803A", fg: "#2b1204", avatar: 30, order: 3 },
}

// DOM order is place order (1, 2, 3); the visual 2-1-3 layout comes from CSS `order`.
const Podium = ({ items }: { items: PodiumItem[] }) => (
    <ol className="flex items-end justify-center gap-2 mt-3 list-none p-0">
        {[...items].sort((a, b) => a.slot - b.slot).map((item) => {
            const b = BLOCK[item.slot]
            return (
                <li key={item.key} className="flex-1 min-w-0 text-center" style={{ order: b.order }}>
                    {item.avatarUrl && (
                        <div
                            className="mx-auto rounded-full bg-cover bg-center"
                            style={{ width: b.avatar, height: b.avatar, backgroundColor: "#71717a", backgroundImage: `url("${encodeURI(item.avatarUrl)}")` }}
                        />
                    )}
                    <div className={`mt-1 text-xs leading-tight break-words ${item.slot === 1 ? "font-bold" : ""}`}>
                        <span className="sr-only">{ordinal(item.slot)} place: </span>
                        {item.name}
                    </div>
                    {item.sub && <div className="text-[10px] text-amber-100/60">{item.sub}</div>}
                    {item.tag && <div className="text-[10px] text-amber-100/80"><span className="rounded-full bg-zinc-900/60 px-1.5">{item.tag}</span></div>}
                    <div
                        aria-hidden="true"
                        className="mt-1 rounded-t-lg flex items-start justify-center pt-1.5"
                        style={{ height: b.height, backgroundColor: b.bg, color: b.fg, fontSize: 15, fontWeight: 700 }}
                    >
                        {item.slot}
                    </div>
                </li>
            )
        })}
    </ol>
)

export default Podium
