/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"
import { authRedirectUrl } from "../lib/siteUrl"
import { loginErrorText } from "../lib/authErrors"
import { Sheet } from "../ui/Sheet"
import { Button } from "../ui/Button"
import { AuthLayout } from "../ui/AuthLayout"
import { TextField } from "../ui/TextField"
import { GoogleButton } from "../ui/GoogleButton"
import { googleAuthEnabled, signInWithGoogle, useResetOnPageShow } from "../lib/googleAuth"
import { EmailToggle } from "../ui/EmailToggle"

interface LoginData {
    email: string
    password: string
}

const ForgotPasswordModal = ({ open, closeModal }: { open: boolean; closeModal: () => void }) => {
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        setLoading(true)
        setMessage(null)

        const { error } = await supabase.auth.resetPasswordForEmail(
            forgotPasswordEmail,
            { redirectTo: authRedirectUrl("/login/reset") }
        )

        setLoading(false)

        if (error) {
            console.error("error reseting password:", error.message)
            setMessage({ text: error.message, ok: false })
            return
        }

        setMessage({ text: "If that email has an account, we sent a reset link.", ok: true })
    }

    return (
        <Sheet
            open={open}
            onClose={closeModal}
            title="Reset password"
            detents={["medium"]}
            footer={
                <div className="flex gap-3">
                    <Button variant="tinted" fullWidth onClick={closeModal}>
                        Cancel
                    </Button>
                    <Button type="submit" form="forgot-password-form" variant="primary" fullWidth loading={loading} loadingLabel="Sending…">
                        Send reset link
                    </Button>
                </div>
            }
        >
            <form id="forgot-password-form" onSubmit={handleForgotPassword}>
                <p className="text-callout text-label-2 mb-4">Enter your email and we'll send you a reset link.</p>
                <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="send"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="you@example.com"
                />
                {message && (
                    <p role="alert" className={`text-footnote mt-3 ${message.ok ? "text-label-2" : "text-danger"}`}>
                        {message.text}
                    </p>
                )}
                <p className="text-footnote text-label-3 mt-3">Not getting emails? Ask a committee member to reset your account.</p>
            </form>
        </Sheet>
    )
}

const LoginPage = () => {
    const { session } = useAuth()
    const [loginData, setloginData] = useState<LoginData>({
        email: "",
        password: "",
    })
    const [showForgotPasswordModal, setShowForgotPasswordModal] =
        useState(false)
    const [loginError, setLoginError] = useState("")
    const [loginLoading, setLoginLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const google = googleAuthEnabled()
    const [useEmail, setUseEmail] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const navigate = useNavigate()
    useResetOnPageShow(() => setGoogleLoading(false))

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setloginData({
            ...loginData,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const { email, password } = loginData

        setLoginError("")
        setLoginLoading(true)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        setLoginLoading(false)

        if (error) {
            console.error(
                "an error has occured while logging in: ",
                error.message
            )
            setLoginError(loginErrorText(error.message))
            return
        }

        navigate("/app")
    }

    const handleGoogle = async () => {
        setLoginError("")
        setGoogleLoading(true)
        const { error } = await signInWithGoogle()
        if (error) {
            console.error("google sign-in failed: ", error.message)
            setLoginError(loginErrorText(error.message))
            setGoogleLoading(false)
        }
    }

    const closeModal = () => {
        setShowForgotPasswordModal(false)
    }

    useEffect(() => {
        if (session) {
            navigate("/app")
        }
    }, [])

    return (
        <AuthLayout
            title="Welcome back."
            subtitle="Log in to vote."
            footer={
                <p className="text-callout text-label-2">
                    New here?{" "}
                    <Link to="/signup" className="text-label inline-flex min-h-11 items-center font-bold underline">
                        Sign up
                    </Link>
                </p>
            }
        >
            <ForgotPasswordModal open={showForgotPasswordModal} closeModal={closeModal} />
            {google && (
                <div className="mt-6 flex flex-col items-center gap-3">
                    <GoogleButton onClick={handleGoogle} loading={googleLoading} />
                    {!useEmail && (
                        <EmailToggle onOpen={() => setUseEmail(true)} />
                    )}
                    {!useEmail && loginError && (
                        <p role="alert" className="text-subhead text-danger">
                            {loginError}
                        </p>
                    )}
                </div>
            )}
            {(!google || useEmail) && (
            <div className={google ? "mt-6" : undefined}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <TextField
                    label="Email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="next"
                    autoCapitalize="none"
                    autoFocus={useEmail}
                    value={loginData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                />
                <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    enterKeyHint="go"
                    value={loginData.password}
                    onChange={handleChange}
                    required
                    trailing={
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-pressed={showPassword}
                            className="text-subhead text-label-2 hover:text-label min-h-11 min-w-11 px-3 font-bold"
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    }
                />
                {loginError && (
                    <p role="alert" className="text-subhead text-danger">
                        {loginError}
                    </p>
                )}
                <Button type="submit" variant="pebble" pebble="lemon" size="lg" fullWidth loading={loginLoading} loadingLabel="Logging in…">
                    Log in
                </Button>
            </form>
            <div className="mt-4 flex flex-col items-center gap-1 text-center">
                <Button variant="plain" size="md" onClick={() => setShowForgotPasswordModal(true)}>
                    Forgot password?
                </Button>
                <p className="text-footnote text-label-3">Not getting emails? Ask a committee member to reset your account.</p>
            </div>
            </div>
            )}
        </AuthLayout>
    )
}

export default LoginPage
