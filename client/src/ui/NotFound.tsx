import { Compass } from "lucide-react"
import { Button } from "./Button"
import { EmptyState } from "./EmptyState"

export function NotFound() {
    return (
        <div className="min-h-dvh bg-bg text-label flex items-center justify-center">
            <EmptyState icon={Compass} title="Page not found" body="That page doesn't exist or has moved." action={<Button to="/app" variant="primary">Go home</Button>} />
        </div>
    )
}
