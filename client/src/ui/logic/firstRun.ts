// The first-run guide is shown once per member per device. Storage can throw (private mode): then it just shows again next time.
export const firstRunKey = (userId: string) => `jsc.firstRunGuide.v1.${userId}`

export function hasSeenGuide(storage: Pick<Storage, "getItem"> | null, userId: string): boolean {
    try {
        return storage?.getItem(firstRunKey(userId)) === "1"
    } catch {
        return false
    }
}

export const GUIDE_SEEN_EVENT = "jsc:guide-seen"

export function markGuideSeen(storage: Pick<Storage, "setItem"> | null, userId: string): void {
    try {
        storage?.setItem(firstRunKey(userId), "1")
    } catch {
        /* storage unavailable: the guide may show again, which is harmless */
    }
    // Lets the feature-intro queue start now that the welcome guide is out of the way.
    try {
        window.dispatchEvent(new Event(GUIDE_SEEN_EVENT))
    } catch {
        /* no window */
    }
}

export function resetGuide(storage: Pick<Storage, "removeItem"> | null, userId: string): void {
    try {
        storage?.removeItem(firstRunKey(userId))
    } catch {
        /* ignore */
    }
}
