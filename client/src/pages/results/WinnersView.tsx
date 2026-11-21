import { RevealCard } from "../../ui/RevealCard"
import { EmptyState } from "../../ui/EmptyState"
import { Trophy } from "lucide-react"
import type { ResultCard } from "../../lib/resultsView"

export function WinnersView({ cards, avatars }: { cards: ResultCard[]; avatars: Record<string, string | null> }) {
    if (cards.length === 0) return <EmptyState icon={Trophy} title="No categories yet" />
    return (
        <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-2">
            {cards.map((card, i) => (
                <RevealCard key={card.category_id} card={card} index={i} avatars={avatars} />
            ))}
        </div>
    )
}
