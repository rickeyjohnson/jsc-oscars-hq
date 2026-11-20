import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { useShell } from "./ShellContext"

// Portals into the shell's accessory slot (above the tab bar on phones, bottom of the column on desktop).
// The shell observes the slot's height and publishes --accessory-h, so nothing else is needed here.
export function BottomAccessory({ children }: { children: ReactNode }) {
    const shell = useShell()
    // No shell (isolated tests, gallery): keep the old behavior of a bar pinned to the bottom edge.
    if (!shell) return <div className="fixed inset-x-0 bottom-0 z-40">{children}</div>
    // First render before the slot mounts: nothing yet, the shell re-renders us once it exists.
    if (!shell.accessorySlot) return null
    return createPortal(children, shell.accessorySlot)
}
