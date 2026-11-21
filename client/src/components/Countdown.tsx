import { Countdown as UiCountdown } from "../ui/Countdown"
import type { Season } from "../types"

// Keeps the existing { season } contract for HomePage.
const Countdown = ({ season }: { season: Season | null }) => (
    <div className="text-center">
        {season && <p className="mb-2 text-footnote text-label-2">{season.name}</p>}
        <UiCountdown target={season?.ceremony_at ? new Date(season.ceremony_at) : null} />
    </div>
)

export default Countdown
