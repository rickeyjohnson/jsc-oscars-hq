import { Route, Routes } from "react-router-dom"
import "./App.css"
import LandingPage from "./pages/LandingPage"
import SignupPage from "./pages/SignupPage"
import LoginPage from "./pages/LoginPage"
import HomePage from "./pages/HomePage"
import BallotsPage from "./pages/BallotsPage"
import StatsPage from "./pages/StatsPage"
import ProfilePage from "./pages/ProfilePage"
import WithAuth from "./components/WithAuth"
import ResetPassword from "./pages/ResetPassword"
import ComfirmedEmailPage from "./pages/ComfirmedEmailPage"
import { UserDataProvider } from "./context/UserContenxt"

const App = () => {
    const ProtectedHomePage = WithAuth(HomePage)
    const ProtectedBallotsPage = WithAuth(BallotsPage)
    const ProtectedStatsPage = WithAuth(StatsPage)
    const ProtectedProfilePage = WithAuth(ProfilePage)

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/signup/confirmed" element={<ComfirmedEmailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/reset" element={<ResetPassword />} />
            <Route
                path="/app"
                element={
                    <UserDataProvider>
                        <ProtectedHomePage />
                    </UserDataProvider>
                }
            />
            <Route
                path="/app/ballots"
                element={
                    <UserDataProvider>
                        <ProtectedBallotsPage />
                    </UserDataProvider>
                }
            />
            <Route
                path="/app/stats"
                element={
                    <UserDataProvider>
                        <ProtectedStatsPage />
                    </UserDataProvider>
                }
            />
            <Route
                path="/app/profile"
                element={
                    <UserDataProvider>
                        <ProtectedProfilePage />
                    </UserDataProvider>
                }
            />
            <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
    )
}

export default App
