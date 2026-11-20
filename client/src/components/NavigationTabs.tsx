import type { ReactNode } from "react"
import { BottomAccessory } from "../ui/BottomAccessory"

// Compat for legacy pages: the app shell now owns the tab bar. Pages that pass a bottom bar as
// children (the Vote page) still get it, hosted in the shell's accessory slot above the tab bar.
const NavigationTabs = ({ children }: { activeTab?: string; children?: ReactNode }) => {
    return children ? <BottomAccessory>{children}</BottomAccessory> : null
}

export default NavigationTabs
