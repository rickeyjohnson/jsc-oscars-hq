import { useEffect, useState } from "react"
import { MessageCircle } from "lucide-react"
import { useLocation } from "react-router-dom"
import { OPEN_CHAT_EVENT } from "../../api/chat"
import { Sheet } from "../../ui/Sheet"
import { useIsDesktop } from "../../ui/useDialog"
import { ChatPanel } from "./ChatPanel"

// Not on the vote or submit screens: the button would sit on Back and Next.
const HIDDEN = /^\/app\/ballots\/[^/]+/

/** The floating Ask Larry button. Opens a bottom sheet on phones and a docked panel on desktop. */
export function ChatButton() {
    const { pathname } = useLocation()
    const desktop = useIsDesktop()
    const [open, setOpen] = useState(false)
    useEffect(() => {
        const on = () => setOpen(true)
        window.addEventListener(OPEN_CHAT_EVENT, on)
        return () => window.removeEventListener(OPEN_CHAT_EVENT, on)
    }, [])
    if (HIDDEN.test(pathname) && !open) return null
    return (
        <>
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    style={desktop ? undefined : { bottom: "calc(64px + 16px + env(safe-area-inset-bottom) + var(--accessory-h, 0px))" }}
                    className="fixed right-4 z-30 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-inverse px-4 text-subhead font-bold text-on-inverse shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:bottom-6 lg:right-6"
                >
                    <MessageCircle aria-hidden className="size-5" />
                    Ask Larry
                </button>
            )}
            {desktop ? (
                open && (
                    <aside aria-label="Ask Larry" className="fixed bottom-6 right-6 z-40 flex h-[32rem] w-96 flex-col overflow-hidden rounded-card bg-surface-2 shadow-lg">
                        <ChatPanel onClose={() => setOpen(false)} showHeader />
                    </aside>
                )
            ) : (
                <Sheet open={open} onClose={() => setOpen(false)} title="Larry" detents={["large"]}>
                    <div className="h-[70dvh]">
                        <ChatPanel onClose={() => setOpen(false)} showHeader={false} />
                    </div>
                </Sheet>
            )}
        </>
    )
}
