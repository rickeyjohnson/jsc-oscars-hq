import { Component, type ErrorInfo, type ReactNode } from "react"
import { TriangleAlert } from "lucide-react"
import { Button } from "./Button"

// Last line of defence: a render crash shows a friendly screen instead of a blank page.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(error, info.componentStack)
    }

    render() {
        if (!this.state.failed) return this.props.children
        return (
            <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-label">
                <TriangleAlert aria-hidden className="size-12 text-danger" />
                <h1 className="text-title-2">Something went wrong</h1>
                <p className="max-w-sm text-callout text-label-2">Reload the page to try again. Your saved votes are safe.</p>
                <Button variant="primary" size="md" onClick={() => window.location.reload()}>
                    Reload
                </Button>
            </div>
        )
    }
}
