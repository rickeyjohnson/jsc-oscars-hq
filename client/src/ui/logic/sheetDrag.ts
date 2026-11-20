export type Detent = "medium" | "large"

const FLING = 500 // px/s
const DISMISS_FRACTION = 0.3
const STEP_FRACTION = 0.25
const UP_STEP = 60 // px

export type DragInput = { offsetY: number; velocityY: number; height: number; detent: Detent; detents: Detent[] }

// Decides where a released sheet drag lands. Positive offset/velocity is downward.
export function dragOutcome({ offsetY, velocityY, height, detent, detents }: DragInput): "dismiss" | Detent {
    const canLarge = detents.includes("large")
    const canMedium = detents.includes("medium")
    if (detent === "medium" && canLarge && (offsetY < -UP_STEP || velocityY < -FLING)) return "large"
    const fast = velocityY > FLING
    if (detent === "large" && canMedium) {
        if (offsetY > height * STEP_FRACTION || fast) return "medium"
        return "large"
    }
    if (offsetY > height * DISMISS_FRACTION || fast) return "dismiss"
    return detent
}
