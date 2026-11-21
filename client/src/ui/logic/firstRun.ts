// The first-run guide is shown once per member per device. Storage can throw (private mode): then it just shows again next time.
export const firstRunKey = (userId: string) => `jsc.firstRunGuide.v1.${userId}`

export function hasSeenGuide(storage: Pick<Storage, "getItem"> | null, userId: string): boolean {
    try {
        return storage?.getItem(firstRunKey(userId)) === "1"
    } catch {
        return false
    }
}

export function markGuideSeen(storage: Pick<Storage, "setItem"> | null, userId: string): void {
    try {
        storage?.setItem(firstRunKey(userId), "1")
    } catch {
        /* storage unavailable: the guide may show again, which is harmless */
    }
}
