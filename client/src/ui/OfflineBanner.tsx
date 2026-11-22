import { WifiOff } from "lucide-react"
import { OFFLINE_BANNER, useOnline } from "../lib/online"

// Slim app-level notice; renders nothing while online.
export function OfflineBanner() {
    const online = useOnline()
    if (online) return null
    return (
        <div role="status" className="flex items-center justify-center gap-2 bg-inverse px-gutter py-2 text-center text-footnote font-bold text-on-inverse">
            <WifiOff aria-hidden className="size-4 shrink-0" />
            <span>{OFFLINE_BANNER}</span>
        </div>
    )
}
