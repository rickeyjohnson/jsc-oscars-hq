import React, { useState } from "react"
import { Link } from "react-router-dom"
import { Mail, Lock, User, IdCard, Pencil } from "lucide-react"

const SignupPage = () => {
    const [signupData, setSignupData] = useState({
        email: "",
        name: "",
        username: "",
        password: "",
        pfp: "/blank-pfp.png",
    })

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        if (e.target.name === "pfp" && e.target instanceof HTMLInputElement && e.target.files && e.target.files[0]) {
            const img = e.target.files[0]
            setSignupData({
                ...signupData,
                pfp: URL.createObjectURL(img),
            })
            return
        }

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
                    Create Account
                </h2>
                <p className="text-[#fffadd]/60 mb-8">
                    Create your account to start your Oscars experience
                </p>
                <div>
                    <div className="mb-4 w-full flex items-center">
                        <div className="relative shrink-0 w-20 h-20 mr-[1.5rem]">
                            <img src={signupData.pfp} className="rounded-full h-20 w-20"/>
                            <div className="bg-black rounded-full flex items-center justify-center p-2 w-fit absolute -bottom-2 -right-2 cursor-pointer">
                                <Pencil size={15}/>
                            </div>
                            <input name="pfp" type="file" className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange}/>
                        </div>
                        <div className="w-full">
                            <label className="block text-sm font-medium mb-2">
                                Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fffadd]/40" />
                                <select
                                    name="name"
                                    value={signupData.name ?? ""}
                                    onChange={handleChange}
                                    className="w-[100%] bg-amber-100/5 border border-amber-100/10 rounded-xl px-12 py-4 focus:outline-none focus:border-amber-100/30 transition text-[#fffadd]"
                                >
                                    <option value="anthony">Anthony</option>
                                    <option value="dakarai">Dakarai</option>
                                    <option value="demichael">Demichael</option>
                                    <option value="evan">Evan</option>
                                    <option value="john">John Sampson</option>
                                    <option value="jonathan">
                                        Jonathan Madden
                                    </option>
                                    <option value="justin">Justin</option>
                                    <option value="kadin">Kadin</option>
                                    <option value="langston">Langston</option>
                                    <option value="micah">Micah</option>
                                    <option value="nick">Nick</option>
                                    <option value="rickey">Rickey</option>
                                    <option value="tj">TJ</option>
                                </select>
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
                            />
                        </div>
                    </div>
                    <Link to="/login">
                        <button
                            className="w-full bg-amber-100 rounded-full text-zinc-900 py-4 font-bold hover:bg-amber-200 transition mb-4"
                            onClick={handleSubmit}
                        >
                            Create Account
                        </button>
                    </Link>
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
        </div>
    )
}

export default SignupPage
