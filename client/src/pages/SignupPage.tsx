import React, { useState } from "react"
import OscarLogo from "../components/OscarLogo"

const SignupPage = () => {
    const [signupData, setSignupData] = useState({
        name: "",
        username: "",
        password: "",
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSignupData({
            ...signupData,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Handle signup logic here
        console.log("Signup data submitted:", signupData)
    }

    return (
        <div className="bg-[#1a1717] min-h-screen text-white">
            <button className="font-sans">← Back</button>
            <OscarLogo />
            <div>Create Account</div>
            <p>Create your account to start your Oscars experience</p>
            <form onSubmit={handleSubmit}>
                <label>Name</label>
                <input
                    name="name"
                    type="text"
                    placeholder="First Name"
                    value={signupData.name}
                    onChange={handleChange}
                    className="bg-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <label>Username</label>
                <input
                    name="username"
                    type="text"
                    placeholder="Username"
                    value={signupData.username}
                    onChange={handleChange}
                    className="bg-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                />

                <label>Password</label>
                <input
                    name="password"
                    type="text"
                    placeholder="Password"
                    value={signupData.password}
                    onChange={handleChange}
                    className="bg-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                />

                <button type="submit">
                    Create Account
                </button>
            </form>

            <div>
                Already have an account? <button className="font-sans hover:underline cursor-pointer">Login</button>
            </div>
        </div>
    )
}

export default SignupPage
