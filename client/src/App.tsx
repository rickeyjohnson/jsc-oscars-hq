import { lazy, Suspense } from "react"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import "./App.css"
import LandingPage from "./pages/LandingPage"
import SignupPage from "./pages/SignupPage"
import LoginPage from "./pages/LoginPage"
import HomePage from "./pages/HomePage"
import BallotsPage from "./pages/BallotsPage"
import ResultsPage from "./pages/ResultsPage"
import ProfilePage from "./pages/ProfilePage"
import ResetPassword from "./pages/ResetPassword"
import ComfirmedEmailPage from "./pages/ComfirmedEmailPage"
import { UserDataProvider } from "./context/UserContenxt"
import RequireCommittee from "./components/RequireCommittee"
import BallotBuilderPage from "./pages/ballot-builder/BallotBuilderPage"
import VotePage from "./pages/VotePage"
import ManageBallotsPage from "./pages/committee/ManageBallotsPage"
import BallotAdminPage from "./pages/committee/BallotAdminPage"
import SubmitBallotPage from "./pages/SubmitBallotPage"
import ReleasePage from "./pages/committee/ReleasePage"
import MemberNamesPage from "./pages/committee/MemberNamesPage"
import { AppShell } from "./ui/AppShell"
import { RequireAuth } from "./ui/RequireAuth"
import { NotFound } from "./ui/NotFound"
import { ConfirmProvider } from "./ui/ConfirmProvider"

// Dev-only: the constant folds to null in production builds, so the gallery is tree-shaken out.
const DesignGallery = import.meta.env.DEV ? lazy(() => import("./dev/DesignGallery")) : null

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

                {/* Full-bleed, no shell. UX gate only; RLS is the real protection for committee actions. */}
                <Route
                    path="/app/profile/release"
                    element={
                        <RequireAuth>
                            <UserDataProvider>
                                <RequireCommittee>
                                    <ReleasePage />
                                </RequireCommittee>
                            </UserDataProvider>
                        </RequireAuth>
                    }
                />

                <Route
                    path="/app/ballots/:ballotId/submit"
                    element={
                        <RequireAuth>
                            <UserDataProvider>
                                <SubmitBallotPage />
                            </UserDataProvider>
                        </RequireAuth>
                    }
                />

                <Route
                    path="/app"
                    element={
                        <RequireAuth>
                            <UserDataProvider>
                                <AppShell />
                            </UserDataProvider>
                        </RequireAuth>
                    }
                >
                    <Route index element={<HomePage />} />
                    <Route path="ballots" element={<BallotsPage />} />
                    <Route path="ballots/:ballotId" element={<VotePage />} />
                    <Route path="results" element={<ResultsPage />} />
                    <Route path="stats" element={<Navigate to="/app/results?view=leaderboard" replace />} />
                    <Route path="profile" element={<ProfilePage />} />
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
                    </Route>
                    <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="*" element={<NotFound />} />
            </Routes>
        </ConfirmProvider>
    )
}

export default App
