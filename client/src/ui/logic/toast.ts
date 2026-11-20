export type ToastItem = { id: number; text: string; actionLabel?: string; persistent?: boolean }
export const TOAST_MS = 4000

type ToastAction = { type: "show"; item: ToastItem } | { type: "dismiss"; id: number }

// One toast at a time: a new one replaces the visible one; dismissing a stale id is a no-op.
export function toastReducer(s: ToastItem[], a: ToastAction): ToastItem[] {
    if (a.type === "show") return [a.item]
    return s.filter((t) => t.id !== a.id)
}
