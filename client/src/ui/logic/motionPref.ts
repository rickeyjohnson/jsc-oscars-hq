export const MOTION_KEY = "jsc.reduceMotion.v1"

export function loadReduceMotion(storage: Pick<Storage, "getItem"> | null): boolean {
    try {
        return storage?.getItem(MOTION_KEY) === "1"
    } catch {
        return false
    }
}

export function saveReduceMotion(storage: Pick<Storage, "setItem" | "removeItem"> | null, on: boolean): void {
    try {
        if (on) storage?.setItem(MOTION_KEY, "1")
        else storage?.removeItem(MOTION_KEY)
    } catch {
        /* storage unavailable: the choice lasts for this session only */
    }
}
