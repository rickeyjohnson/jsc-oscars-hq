import { BrowserRouter, Route, Routes } from "react-router-dom"
import "./App.css"
import LandingPage from "./pages/LandingPage"
import SignupPage from "./pages/SignupPage"

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage/>} />
                <Route path="/signup" element={<SignupPage/>} />
                <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
