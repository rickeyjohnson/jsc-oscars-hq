import { useState } from "react"
import { Envelope } from "../../ui/Envelope"
import { RevealCard } from "../../ui/RevealCard"
import { Button } from "../../ui/Button"
import type { ResultCard } from "../../lib/resultsView"

const card: ResultCard = {
    category_id: "demo",
    number: 3,
    name: "Best hair",
    pending: false,
    note: null,
    podium: [
        { nominee_id: "a", name: "Ann", slot: 1, tieLabel: null, memberIds: ["a"] },
        { nominee_id: "b", name: "Bo", slot: 2, tieLabel: null, memberIds: ["b"] },
        { nominee_id: "c", name: "Cy", slot: 3, tieLabel: null, memberIds: ["c"] },
    ],
    also: [{ nominee_id: "d", name: "Di", placeLabel: "4th" }],
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <h3 className="text-footnote uppercase tracking-wider text-label-2">{label}</h3>
            {/* a transform makes the fixed envelope position against this box, not the viewport */}
            <div className="relative h-80 overflow-hidden rounded-card [transform:translateZ(0)]">{children}</div>
        </div>
    )
}

export default function Reveal() {
    const [live, setLive] = useState(false)
    return (
        <div className="space-y-6">
            <Frame label="Envelope closed (frozen at 0)">
                <Envelope progress={0} onDone={() => {}} />
            </Frame>
            <Frame label="Envelope open (frozen at 1, also the reduced-motion look)">
                <Envelope progress={1} onDone={() => {}} />
            </Frame>
            <div className="space-y-2">
                <Button variant="secondary" size="md" onClick={() => setLive(true)}>
                    Play the real envelope
                </Button>
                {live && <Envelope onDone={() => setLive(false)} />}
            </div>
            <div className="max-w-md space-y-2">
                <h3 className="text-footnote uppercase tracking-wider text-label-2">Opened result card</h3>
                <RevealCard card={card} index={0} avatars={{}} />
            </div>
        </div>
    )
}
