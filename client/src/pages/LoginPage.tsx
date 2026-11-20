/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock } from "lucide-react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"
import { authRedirectUrl } from "../lib/siteUrl"
import { loginErrorText } from "../lib/authErrors"
import { Sheet } from "../ui/Sheet"
import { Button } from "../ui/Button"

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
                <label htmlFor="forgot-password-email" className="text-subhead mb-2 block font-medium">
                    Email
                </label>
                <input
                    id="forgot-password-email"
                    type="email"
                    autoComplete="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="bg-fill text-label w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent"
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
    const navigate = useNavigate()

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

    const closeModal = () => {
        setShowForgotPasswordModal(false)
    }

    useEffect(() => {
        if (session) {
            navigate("/app")
        }
    }, [])

    return (
        <div className="min-h-screen bg-zinc-900 text-[#fffadd] flex items-center justify-center px-6 py-12">
            <ForgotPasswordModal open={showForgotPasswordModal} closeModal={closeModal} />
            <div className="w-full max-w-md">
                <Link to={"/"}>
                    <button className="mb-8 text-[#fffadd]/60 hover:text-[#fffadd] transition">
                        ← Back
                    </button>
                </Link>
                <div className="mb-8">
                    <div className="font-oscars-regular text-xs text-[#fffadd] tracking-widest">
                        JUST SIDECHATTING
                    </div>
                    <div className="font-oscars-thin text-3xl text-[#fffadd] font-light tracking-[0.15rem]">
                        OSCARS
                    </div>
                </div>
                <h2 className="text-4xl font-black mb-2 text-[#fffadd]">
                    Welcome Back
                </h2>
                <p className="text-[#fffadd]/60 mb-8">
                    Login to continue your Oscars experience
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fffadd]/40" />
                            <input
                                type="email"
                                name="email"
                                value={loginData.email}
                                onChange={handleChange}
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-12 py-4 focus:outline-none focus:border-amber-100/30 transition text-[#fffadd]"
                                placeholder="you@example.com"
                                required={true}
                            />
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fffadd]/40" />
                            <input
                                type="password"
                                name="password"
                                value={loginData.password}
                                onChange={handleChange}
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-12 py-4 focus:outline-none focus:border-amber-100/30 transition text-[#fffadd]"
                                placeholder="••••••••"
                                required={true}
                            />
                        </div>
                    </div>
                    <div className="mb-6 text-right">
                        <button
                            type="button"
                            onClick={() => setShowForgotPasswordModal(true)}
                            className="text-sm text-[#fffadd]/60 hover:text-[#fffadd] transition"
                        >
                            Forgot password?
                        </button>
                        <p className="text-xs text-[#fffadd]/50 mt-1">
                            Not getting emails? Ask a committee member to reset your account.
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full bg-[#fffadd] rounded-full text-zinc-900 py-4 font-bold hover:bg-[#fffadd]/80 transition mb-4 disabled:opacity-60"
                    >
                        {loginLoading ? "Logging in..." : "Login"}
                    </button>
                    {loginError && (
                        <p role="alert" className="text-red-400 text-sm mb-4">
                            {loginError}
                        </p>
                    )}
                </form>
                <p className="text-center text-[#fffadd]/60">
                    Don't have an account?{" "}
                    <Link to="/signup">
                        <button className="text-[#fffadd] hover:underline font-bold underline">
                            Sign Up
                        </button>
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default LoginPage
