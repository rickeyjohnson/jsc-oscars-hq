import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock, User, IdCard, LoaderCircle } from "lucide-react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"

type SignupDate = {
    email: string
    name: string
    username: string
    image: File | null
    password: string
}

const VerifyEmailModal = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 h-screen">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
            <div className="relative flex flex-col justify-items items-center">
                <LoaderCircle className="animate-spin w-10 h-10 mb-7" />
                <p>Please verify email to continue</p>
                {/* add resend email. option! */}
            </div>
        </div>
    )
}

const SignupPage = () => {
    const { user } = useAuth()
    const [showVerifyEmailModal, setShowVerifyEmailModal] = useState(false)
    const [loader, setLoader] = useState(false)
    const [signupData, setSignupData] = useState<SignupDate>({
        email: "",
        name: "",
        username: "",
        password: "",
        image: null,
    })
    const navigate = useNavigate()

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setSignupData({
            ...signupData,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoader(true)

        const email = signupData.email
        const password = signupData.password
        const username = signupData.username
        const name = signupData.name
        let is_committee = false

        if (name === "rickey" || name === "kadin") {
            is_committee = true
        }

        // supabase signup
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    name,
                    is_committee,
                },
                emailRedirectTo: "http://localhost:5173/signup/confirmed",
            },
        })

        setLoader(false)

        if (error) {
            console.error("error's signing up: ", error.message)
            return
        }

        setShowVerifyEmailModal(true)
    }

    useEffect(() => {
        if (user && user?.email_confirmed_at) {
            navigate("/app")
        }
    }, [navigate, user, user?.email_confirmed_at])

    return (
        <div className="min-h-screen bg-zinc-900 text-[#fffadd] flex items-center justify-center px-6 py-12">
            {showVerifyEmailModal && <VerifyEmailModal />}
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
                    Create Account
                </h2>
                <p className="text-[#fffadd]/60 mb-8">
                    Create your account to start your Oscars experience
                </p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4 w-full flex items-center">
                        <div className="w-full">
                            <label className="block text-sm font-medium mb-2">
                                Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fffadd]/40" />
                                <div className="group w-full bg-amber-100/5 border border-amber-100/10 rounded-xl pl-12 pr-4 focus-within:outline-none focus-within:border-amber-100/30 transition text-[#fffadd]">
                                    <select
                                        name="name"
                                        value={signupData.name ?? ""}
                                        onChange={handleChange}
                                        className="w-full focus:outline-none text-[#fffadd] py-4"
                                        required={true}
                                    >
                                        <option value="" disabled hidden>
                                            New Nick
                                        </option>
                                        <option value="anthony">Anthony</option>
                                        <option value="dakarai">Dakarai</option>
                                        <option value="demichael">
                                            Demichael
                                        </option>
                                        <option value="evan">Evan</option>
                                        <option value="john">
                                            John Sampson
                                        </option>
                                        <option value="jonathan">
                                            Jonathan Madden
                                        </option>
                                        <option value="justin">Justin</option>
                                        <option value="kadin">Kadin</option>
                                        <option value="langston">
                                            Langston
                                        </option>
                                        <option value="micah">Micah</option>
                                        <option value="nick">Nick</option>
                                        <option value="rickey">Rickey</option>
                                        <option value="tj">TJ</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fffadd]/40" />
                            <input
                                type="email"
                                name="email"
                                value={signupData.email}
                                onChange={handleChange}
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-12 py-4 focus:outline-none focus:border-amber-100/30 transition text-[#fffadd]"
                                placeholder="you@example.com"
                                required={true}
                            />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            Username
                        </label>
                        <div className="relative">
                            <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fffadd]/40" />
                            <input
                                type="text"
                                name="username"
                                value={signupData.username}
                                onChange={handleChange}
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-12 py-4 focus:outline-none focus:border-amber-100/30 transition text-[#fffadd]"
                                placeholder="rickeyistaken"
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
                                value={signupData.password}
                                onChange={handleChange}
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-12 py-4 focus:outline-none focus:border-amber-100/30 transition text-[#fffadd]"
                                placeholder="••••••••"
                                required={true}
                            />
                        </div>
                    </div>
                    <button
                        className="w-full bg-[#fffadd] rounded-full text-zinc-900 py-4 font-bold hover:bg-[#fffadd]/80 transition mb-4 flex justify-center items-center"
                        type="submit"
                    >
                        {loader ? (
                            <LoaderCircle className="animate-spin w-5 h-5" />
                        ) : (
                            "Create Account"
                        )}
                    </button>
                </form>

                <p className="text-center text-[#fffadd]/60">
                    Already have an account?{" "}
                    <Link to="/login">
                        <button className="text-[#fffadd] hover:underline font-bold underline">
                            Login
                        </button>
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default SignupPage
