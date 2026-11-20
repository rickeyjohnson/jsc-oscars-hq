import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { BrowserRouter } from "react-router-dom"
import { MotionConfig } from "motion/react"
import { AuthProvider } from "./context/AuthContext.tsx"

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <MotionConfig reducedMotion="user">
                    <App />
                </MotionConfig>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
)
