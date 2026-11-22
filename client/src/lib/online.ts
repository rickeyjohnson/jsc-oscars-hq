import { useSyncExternalStore } from "react"

export const OFFLINE_BANNER = "You're offline. Changes can't be saved."
export const OFFLINE_REASON = "You're offline. Reconnect to save."

const read = (): boolean => (typeof navigator === "undefined" ? true : navigator.onLine !== false)

const subscribe = (cb: () => void) => {
    window.addEventListener("online", cb)
    window.addEventListener("offline", cb)
    return () => {
        window.removeEventListener("online", cb)
        window.removeEventListener("offline", cb)
    }
}

/** True while the browser believes it has a connection (navigator.onLine plus online/offline events). */
export const useOnline = (): boolean => useSyncExternalStore(subscribe, read, () => true)
