import React, { useState } from "react"
import OscarLogo from "../components/OscarLogo"
import { Link } from "react-router-dom"

const LoginPage = () => {
    const [loginData, setloginData] = useState({
        username: "",
        password: "",
    })

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setloginData({
            ...loginData,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Handle signup logic here
        console.log("Login data submitted:", loginData)
    }

    return (
        <div className="bg-zinc-900 min-h-screen text-white flex flex-col justify-center p-4">
            <Link to={"/"}><button className="font-sans text-left mb-6">← Back</button></Link>
            <OscarLogo />
            <div className="py-3 mb-4 text-left">
                <div className="text-5xl font-bold mb-2">Welcome Back</div>
                <div>Login to continue your Oscars experience</div>
            </div>

            <form onSubmit={handleSubmit} className="">

                <div className="flex flex-col mb-4">
                    {" "}
                    <label>Username</label>
                    <input
                        name="username"
                        type="text"
                        placeholder="Username"
                        value={loginData.username}
                        onChange={handleChange}
                        className="bg-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />{" "}
                </div>

                <div className="flex flex-col mb-4">
                    <label>Password</label>
                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        value={loginData.password}
                        onChange={handleChange}
                        className="bg-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                </div>

                <button
                    type="submit"
                    className="px-6 py-3 rounded-full bg-white text-black hover:bg-[#e6e6e6] font-medium w-full my-4"
                >
                    Login
                </button>
            </form>

            <div className="text-center mt-4">
                Don't have an account?{" "}
                <button className="font-sans underline cursor-pointer font-bold">
                    Sign up
                </button>
            </div>
        </div>
    )
}

export default LoginPage
