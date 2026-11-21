import { LoaderCircle } from "lucide-react"

/** Blocking "working" overlay. Same scrim as dialogs; a plain fade, so nothing moves under reduced motion. */
const FullScreenLoader = ({ title, description }: { title?: string; description?: string }) => (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[80] flex items-center justify-center p-6">
        <div className="sheet-backdrop absolute inset-0" aria-hidden />
        <div className="relative flex w-full max-w-[400px] flex-col items-center gap-2 text-center">
            {title && <h2 className="text-title-3">{title}</h2>}
            {description && <p className="text-callout text-label-2">{description}</p>}
            <LoaderCircle aria-hidden className="mt-2 size-6 animate-spin motion-reduce:animate-none" />
            <span className="sr-only">Working</span>
        </div>
    </div>
)

export default FullScreenLoader
