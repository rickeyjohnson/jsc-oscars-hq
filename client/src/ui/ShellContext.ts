import { createContext, useContext } from "react"

export type ShellApi = {
    accessorySlot: HTMLElement | null
    setHideTabBar: (hide: boolean) => void
}

// null outside the shell (gallery, tests): Screen and BottomAccessory degrade gracefully.
export const ShellContext = createContext<ShellApi | null>(null)
export const useShell = (): ShellApi | null => useContext(ShellContext)
