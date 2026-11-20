import { motion } from "motion/react"
import { ordinal } from "../lib/resultsView"
import { Avatar } from "./Avatar"
import { Chip } from "./Chip"
import { spring } from "./motion"
import type { AvatarRing, AvatarSize } from "./logic/variants"

export type PodiumItem = { key: string; slot: 1 | 2 | 3; name: string; sub?: string | null; tag?: string | null; avatarUrl?: string | null }

// Fixed flat colors: gold, silver-blue, bronze. Heights in px; hero is x1.4.
const BLOCK: Record<1 | 2 | 3, { height: number; box: string; ring: AvatarRing; avatar: AvatarSize; heroAvatar: AvatarSize; order: string }> = {
    1: { height: 112, box: "bg-gold text-on-gold", ring: "gold", avatar: 72, heroAvatar: 96, order: "order-2" },
    2: { height: 84, box: "bg-silver text-on-silver", ring: "silver", avatar: 56, heroAvatar: 72, order: "order-1" },
    3: { height: 64, box: "bg-bronze text-on-bronze", ring: "bronze", avatar: 56, heroAvatar: 72, order: "order-3" },
}

// DOM order is place order (1, 2, 3); the visual 2-1-3 layout comes from CSS `order`.
export function Podium({ items, variant = "card", animate = false, onColor = false, faceRing }: { items: PodiumItem[]; variant?: "card" | "hero"; animate?: boolean; onColor?: boolean; faceRing?: "pebble" }) {
    const hero = variant === "hero"
    return (
        <ol className={`flex items-end justify-center list-none p-0 ${hero ? "gap-3" : "gap-2"}`}>
            {[...items].sort((a, b) => a.slot - b.slot).map((item) => {
                const b = BLOCK[item.slot]
                const h = Math.round(b.height * (hero ? 1.4 : 1))
                return (
                    <li key={item.key} className={`flex-1 min-w-0 text-center ${b.order}`}>
                        {(item.avatarUrl || faceRing) && (
                            <div className="mb-2 flex justify-center">
                                <Avatar id={item.key} name={item.name} src={item.avatarUrl} size={hero ? b.heroAvatar : b.avatar} ring={faceRing ?? b.ring} decorative />
                            </div>
                        )}
                        <div className={`${hero ? "text-callout" : "text-footnote"} break-words ${item.slot === 1 ? "font-bold" : ""}`}>
                            <span className="sr-only">{ordinal(item.slot)} place: </span>
                            {item.name}
                        </div>
                        {item.sub && <div className={`text-caption-1 ${onColor ? "" : "text-label-2"}`}>{item.sub}</div>}
                        {item.tag && (
                            <div className="mt-1">
                                <Chip>{item.tag}</Chip>
                            </div>
                        )}
                        <motion.div
                            aria-hidden="true"
                            initial={animate ? { height: 0 } : false}
                            animate={{ height: h }}
                            transition={spring.podium}
                            className={`mt-2 flex items-start justify-center rounded-t-control pt-2 font-display ${hero ? "text-display" : "text-title-1"} ${b.box}`}
                        >
                            {item.slot}
                        </motion.div>
                    </li>
                )
            })}
        </ol>
    )
}
