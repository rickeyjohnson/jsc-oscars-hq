/** Scroll position per history entry, so Back returns to where you were (not the top, not wherever the browser guesses). */
export type ScrollMemory = { save: (key: string, y: number) => void; get: (key: string) => number | undefined }

export function createScrollMemory(max = 60): ScrollMemory {
    const map = new Map<string, number>()
    return {
        save(key, y) {
            map.delete(key)
            map.set(key, Math.max(0, Math.round(y)))
            while (map.size > max) map.delete(map.keys().next().value as string)
        },
        get: (key) => map.get(key),
    }
}

/** Can the page already scroll that far? Content that loads late is shorter at first, so restoring waits for it. */
export const canReach = (target: number, docHeight: number, viewport: number): boolean => target <= 1 || docHeight - viewport >= target - 1
