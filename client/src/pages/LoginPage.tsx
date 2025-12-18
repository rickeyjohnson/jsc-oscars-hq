/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock } from "lucide-react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"

interface LoginData {
    email: string
    password: string
}

const LoginPage = () => {
    const { session } = useAuth()
    const [loginData, setloginData] = useState<LoginData>({
        email: "",
        password: "",
    })
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

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error(
                "an error has occured while logging in: ",
                error.message
            )
            return
        }

        navigate("/app")
    }

    useEffect(() => {
        if (session) {
            navigate("/app")
        }
    }, [])

    return (
        <div className="min-h-screen bg-zinc-900 text-[#fffadd] flex items-center justify-center px-6 py-12">
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
                    <button
                        type="submit"
                        className="w-full bg-amber-100 rounded-full text-zinc-900 py-4 font-bold hover:bg-amber-200 transition mb-4"
                    >
                        Login
                    </button>
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
