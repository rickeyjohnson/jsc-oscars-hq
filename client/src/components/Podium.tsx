export type PodiumItem = { key: string; slot: 1 | 2 | 3; name: string; sub?: string | null; avatarUrl?: string | null }

const BLOCK: Record<1 | 2 | 3, { height: number; bg: string; fg: string; avatar: number }> = {
    1: { height: 92, bg: "#FFC23D", fg: "#3b2a00", avatar: 38 },
    2: { height: 66, bg: "#9DB4D0", fg: "#17263a", avatar: 30 },
    3: { height: 48, bg: "#E8803A", fg: "#2b1204", avatar: 30 },
}

const Podium = ({ items }: { items: PodiumItem[] }) => (
    <div className="flex items-end justify-center gap-2 mt-3">
        {items.map((item) => {
            const b = BLOCK[item.slot]
            return (
                <div key={item.key} className="flex-1 min-w-0 text-center">
                    <div
                        className="mx-auto rounded-full bg-cover bg-center"
                        style={{ width: b.avatar, height: b.avatar, backgroundColor: "#71717a", backgroundImage: item.avatarUrl ? `url(${item.avatarUrl})` : undefined }}
                    />
                    <div className={`mt-1 text-xs leading-tight break-words ${item.slot === 1 ? "font-bold" : ""}`}>{item.name}</div>
                    {item.sub && <div className="text-[10px] text-amber-100/60">{item.sub}</div>}
                    <div
                        className="mt-1 rounded-t-lg flex items-center justify-center text-lg font-black"
                        style={{ height: b.height, backgroundColor: b.bg, color: b.fg }}
                    >
                        {item.slot}
                    </div>
                </div>
            )
        })}
    </div>
)

export default Podium
