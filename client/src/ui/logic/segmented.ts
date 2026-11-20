// Roving-tabindex keyboard model for a tablist: arrows wrap, Home/End jump, anything else is not ours.
export function nextSegment(index: number, key: string, count: number): number | null {
    if (count <= 0) return null
    switch (key) {
        case "ArrowRight":
        case "ArrowDown":
            return (index + 1) % count
        case "ArrowLeft":
        case "ArrowUp":
            return (index - 1 + count) % count
        case "Home":
            return 0
        case "End":
            return count - 1
        default:
            return null
    }
}
