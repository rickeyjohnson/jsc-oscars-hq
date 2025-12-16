import { BrowserRouter, Route, Routes } from "react-router-dom"
import "./App.css"
import LandingPage from "./pages/LandingPage"
import SignupPage from "./pages/SignupPage"
import LoginPage from "./pages/LoginPage"
import HomePage from "./pages/HomePage"
import BallotsPage from "./pages/BallotsPage"
import StatsPage from "./pages/StatsPage"
import ProfilePage from "./pages/ProfilePage"

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage/>} />
                <Route path="/signup" element={<SignupPage/>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/app" element={<HomePage />} />
                <Route path="/app/ballots" element={<BallotsPage />} />
                <Route path="/app/stats" element={<StatsPage />} />
                <Route path="/app/profile" element={<ProfilePage />} />
                <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
