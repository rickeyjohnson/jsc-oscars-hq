import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { BrowserRouter } from "react-router-dom"
import { ReduceMotionProvider } from "./ui/ReduceMotion.tsx"
import { AuthProvider } from "./context/AuthContext.tsx"

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <ReduceMotionProvider>
                    <App />
                </ReduceMotionProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
)
