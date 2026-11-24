import { lazy, Suspense, useEffect } from "react"
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { titleFor } from "./lib/routeTitle"
import "./App.css"
import LandingPage from "./pages/LandingPage"
import SignupPage from "./pages/SignupPage"
import LoginPage from "./pages/LoginPage"
import HomePage from "./pages/HomePage"
import BallotsPage from "./pages/BallotsPage"
import MemberStatsPage from "./pages/MemberStatsPage"
import ResultsPage from "./pages/ResultsPage"
import ProfilePage from "./pages/ProfilePage"
import ResetPassword from "./pages/ResetPassword"
import ComfirmedEmailPage from "./pages/ComfirmedEmailPage"
import { UserDataProvider } from "./context/UserContenxt"
import RequireCommittee from "./components/RequireCommittee"
import SettingsPage from "./pages/SettingsPage"
import MyocPage from "./pages/myoc/MyocPage"
import BallotBuilderPage from "./pages/ballot-builder/BallotBuilderPage"
import VotePage from "./pages/VotePage"
import FeedbackPage from "./pages/FeedbackPage"
import ManageBallotsPage from "./pages/committee/ManageBallotsPage"
import BallotAdminPage from "./pages/committee/BallotAdminPage"
import SubmitBallotPage from "./pages/SubmitBallotPage"
import ReleasePage from "./pages/committee/ReleasePage"
import MemberNamesPage from "./pages/committee/MemberNamesPage"
import { AppShell } from "./ui/AppShell"
import { RequireAuth } from "./ui/RequireAuth"
import { NotFound } from "./ui/NotFound"
import { ClaimGate } from "./ui/ClaimGate"
import ClaimNamePage from "./pages/ClaimNamePage"
import { ConfirmProvider } from "./ui/ConfirmProvider"

// Dev-only: the constant folds to null in production builds, so the gallery is tree-shaken out.
const DesignGallery = import.meta.env.DEV ? lazy(() => import("./dev/DesignGallery")) : null

// Rendered after <Routes> so its effect runs last and wins over any tab-level title.
const RouteTitle = () => {
    const { pathname } = useLocation()
    useEffect(() => {
        document.title = titleFor(pathname)
    }, [pathname])
    return null
}

const App = () => {
    return (
        <ConfirmProvider>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                {DesignGallery && (
                    <Route
                        path="/dev/design"
                        element={
                            <Suspense fallback={null}>
                                <DesignGallery />
                            </Suspense>
                        }
                    />
                )}
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/signup/confirmed" element={<ComfirmedEmailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/login/reset" element={<ResetPassword />} />
                <Route
                    path="/claim"
                    element={
                        <RequireAuth>
                            <UserDataProvider>
                                <ClaimNamePage />
                            </UserDataProvider>
                        </RequireAuth>
                    }
                />

                <Route
                    path="/app"
                    element={
                        <RequireAuth>
                            <UserDataProvider>
                                <ClaimGate>
                                    <AppShell />
                                </ClaimGate>
                            </UserDataProvider>
                        </RequireAuth>
                    }
                >
                    <Route index element={<HomePage />} />
                    <Route path="ballots" element={<BallotsPage />} />
                    <Route path="ballots/:ballotId" element={<VotePage />} />
                    <Route path="ballots/:ballotId/submit" element={<SubmitBallotPage />} />
                    <Route path="results" element={<ResultsPage />} />
                    <Route path="results/previous" element={<Navigate to="/app/results?view=leaderboard" replace />} />
                    <Route path="results/members/:memberId" element={<MemberStatsPage />} />
                    <Route path="stats" element={<Navigate to="/app/results?view=leaderboard" replace />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="profile/settings" element={<SettingsPage />} />
                    <Route path="profile/settings/myoc" element={<MyocPage />} />
                    <Route path="profile/settings/feedback" element={<FeedbackPage />} />
                    <Route
                        element={
                            <RequireCommittee>
                                <Outlet />
                            </RequireCommittee>
                        }
                    >
                        <Route path="profile/ballots/create" element={<BallotBuilderPage />} />
                        <Route path="profile/ballots" element={<ManageBallotsPage />} />
                        <Route path="profile/ballots/:ballotId" element={<BallotAdminPage />} />
                        <Route path="profile/members" element={<MemberNamesPage />} />
                        <Route path="profile/release" element={<ReleasePage />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="*" element={<NotFound />} />
            </Routes>
            <RouteTitle />
        </ConfirmProvider>
    )
}

export default App
