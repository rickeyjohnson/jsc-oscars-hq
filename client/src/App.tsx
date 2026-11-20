import type { ReactNode } from "react"
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
import RequireCommittee from "./components/RequireCommittee"
import BallotBuilderPage from "./pages/ballot-builder/BallotBuilderPage"
import VotePage from "./pages/VotePage"

const App = () => {
    const ProtectedHomePage = WithAuth(HomePage)
    const ProtectedBallotsPage = WithAuth(BallotsPage)
    const ProtectedStatsPage = WithAuth(StatsPage)
    const ProtectedProfilePage = WithAuth(ProfilePage)
    const ProtectedVotePage = WithAuth(VotePage)

    // UX gate only; RLS is the real protection for committee actions.
    const committeeRoute = (el: ReactNode) => {
        const Guarded = WithAuth(() => (
            <UserDataProvider>
                <RequireCommittee>{el}</RequireCommittee>
            </UserDataProvider>
        ))
        return <Guarded />
    }

    return (
        <>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route
                    path="/signup/confirmed"
                    element={<ComfirmedEmailPage />}
                />
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
                    path="/app/ballots/:ballotId"
                    element={
                        <UserDataProvider>
                            <ProtectedVotePage />
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

                <Route
                    path="/app/profile/ballots/create"
                    element={committeeRoute(<BallotBuilderPage />)}
                />

                <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
        </>
    )
}

export default App
