import { TriangleAlert } from "lucide-react"
import { Button } from "./Button"
import { COPY } from "./copy"

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
    return (
        <div role="alert" className="flex flex-col items-center text-center gap-3 py-12 px-6">
            <TriangleAlert aria-hidden className="size-12 text-danger" />
            <h3 className="text-title-3">{title}</h3>
            <p className="text-callout text-label-2 max-w-sm">{body}</p>
            {onRetry && (
                <Button variant="secondary" size="md" onClick={onRetry}>
                    {COPY.retry}
                </Button>
            )}
        </div>
    )
}
