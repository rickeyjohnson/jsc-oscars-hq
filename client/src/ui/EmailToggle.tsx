/** "or use email instead": reveals the email form. The caller focuses the first field when it opens. */
export function EmailToggle({ onOpen }: { onOpen: () => void }) {
    return (
        <button type="button" aria-expanded={false} onClick={onOpen} className="text-callout text-label-2 hover:text-label min-h-11 px-3">
            or <span className="text-label font-bold">use email instead</span>
        </button>
    )
}
