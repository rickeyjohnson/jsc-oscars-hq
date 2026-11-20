export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Where Tab / Shift+Tab should land inside a trapped dialog; null when there is nothing to focus.
export function nextFocus(items: HTMLElement[], current: Element | null, shift: boolean): HTMLElement | null {
    if (items.length === 0) return null
    const i = current ? items.indexOf(current as HTMLElement) : -1
    if (i === -1) return shift ? items[items.length - 1] : items[0]
    const n = i + (shift ? -1 : 1)
    return items[(n + items.length) % items.length]
}
