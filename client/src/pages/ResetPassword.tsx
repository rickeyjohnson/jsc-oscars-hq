import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { AuthLayout } from "../ui/AuthLayout"
import { TextField } from "../ui/TextField"
import { Button } from "../ui/Button"

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        setLoading(true)
        setError("")
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        })

        setLoading(false)

        if (updateError) {
            console.error("error reseting password: ", updateError.message)
            setError(updateError.message)
            return
        }

        navigate("/app")
    }

    return (
        <AuthLayout title="Reset password." subtitle="Choose a new password for your account.">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <TextField
                    label="New password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    enterKeyHint="go"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
                {error && (
                    <p role="alert" className="text-subhead text-danger">
                        {error}
                    </p>
                )}
                <Button type="submit" variant="pebble" pebble="lemon" size="lg" fullWidth loading={loading} loadingLabel="Saving…">
                    Reset password
                </Button>
            </form>
        </AuthLayout>
    )
}

export default ResetPassword
