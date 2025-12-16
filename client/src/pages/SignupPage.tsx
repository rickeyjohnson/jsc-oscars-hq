import React, { useState } from "react"
import OscarLogo from "../components/OscarLogo"

const SignupPage = () => {
    const [signupData, setSignupData] = useState({
        name: "",
        username: "",
        password: "",
    })

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
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
        <div className="bg-[#1a1717] min-h-screen text-white flex flex-col justify-center p-4">
            <button className="font-sans text-left mb-6">← Back</button>
            <OscarLogo />
            <div className="py-3 mb-4 text-left">
                <div className="text-5xl font-bold mb-2">Create Account</div>
                <div>Create your account to start your Oscars experience</div>
            </div>

            <form onSubmit={handleSubmit} className="">
                <div className="flex flex-col mb-4">
                    {" "}
                    <label>Name</label>
                    <select
                        name="name"
                        value={signupData.name}
                        onChange={handleChange}
                        className="bg-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        <option value="anthony">Anthony</option>
                        <option value="dakarai">Dakarai</option>
                        <option value="demichael">Demichael</option>
                        <option value="evan">Evan</option>
                        <option value="john">John Sampson</option>
                        <option value="jonathan">Jonathan Madden</option>
                        <option value="justin">Justin</option>
                        <option value="kadin">Kadin</option>
                        <option value="langston">Langston</option>
                        <option value="micah">Micah</option>
                        <option value="nick">Nick</option>
                        <option value="rickey">Rickey</option>
                        <option value="tj">TJ</option>
                    </select>
                </div>

                <div className="flex flex-col mb-4">
                    {" "}
                    <label>Username</label>
                    <input
                        name="username"
                        type="text"
                        placeholder="Username"
                        value={signupData.username}
                        onChange={handleChange}
                        className="bg-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />{" "}
                </div>

                <div className="flex flex-col mb-4">
                    <label>Password</label>
                    <input
                        name="password"
                        type="text"
                        placeholder="Password"
                        value={signupData.password}
                        onChange={handleChange}
                        className="bg-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                </div>

                <button
                    type="submit"
                    className="px-6 py-3 rounded-full bg-white text-black hover:bg-[#e6e6e6] font-medium w-full my-4"
                >
                    Create Account
                </button>
            </form>

            <div className="text-center mt-4">
                Already have an account?{" "}
                <button className="font-sans hover:underline cursor-pointer">
                    Login
                </button>
            </div>
        </div>
    )
}

export default SignupPage
