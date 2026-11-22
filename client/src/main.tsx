import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { BrowserRouter } from "react-router-dom"
import { ReduceMotionProvider } from "./ui/ReduceMotion.tsx"
import { AuthProvider } from "./context/AuthContext.tsx"
import { ErrorBoundary } from "./ui/ErrorBoundary.tsx"
import { registerServiceWorker } from "./lib/pwa"

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <AuthProvider>
                    <ReduceMotionProvider>
                        <App />
                    </ReduceMotionProvider>
                </AuthProvider>
            </BrowserRouter>
        </ErrorBoundary>
    </StrictMode>
)

registerServiceWorker() // production only
