import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { LoaderCircle, Lock } from "lucide-react"
import { supabase } from "../supabaseClient"

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        setLoading(true)
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        })

        if (error) {
            console.error("error reseting password: ", error.message)
        }

        setLoading(false)
        navigate("/app")
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
                    Reset Password
                </h2>
                <p className="text-[#fffadd]/60 mb-8">
                    Why you forgetting your password dude?
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fffadd]/40" />
                            <input
                                type="password"
                                name="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-12 py-4 focus:outline-none focus:border-amber-100/30 transition text-[#fffadd]"
                                placeholder="••••••••"
                                required={true}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-amber-100 rounded-full text-zinc-900 py-4 font-bold hover:bg-amber-200 transition mb-4 flex items-center justify-center"
                    >
                        {!loading ? "Reset Password" : <LoaderCircle className="animate-spin w-5 h-5"/>}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ResetPassword
