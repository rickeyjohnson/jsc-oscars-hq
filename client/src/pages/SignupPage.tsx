import { signupErrorText } from "../lib/authErrors"
import React, { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Check } from "lucide-react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"
import { fetchAvailableMemberNames } from "../api/members"
import { authRedirectUrl } from "../lib/siteUrl"
import { Sheet } from "../ui/Sheet"
import { Button } from "../ui/Button"
import { AuthLayout } from "../ui/AuthLayout"
import { TextField } from "../ui/TextField"
import { Skeleton, SkeletonScreen } from "../ui/Skeleton"
import { PEBBLE_CLASS, pebbleFor } from "../ui/logic/pebble"

type SignupDate = {
    email: string
    name: string
    username: string
    image: File | null
    password: string
}

const VerifyEmailModal = ({ open, onDone }: { open: boolean; onDone: () => void }) => {
    return (
        <Sheet
            open={open}
            onClose={onDone}
            title="Check your email"
            detents={["medium"]}
            footer={
                <Button variant="primary" fullWidth onClick={onDone}>
                    Done
                </Button>
            }
        >
            <p className="text-callout text-label-2">Please verify email to continue. Open the link we sent you, then come back and log in.</p>
        </Sheet>
    )
}

const SignupPage = () => {
    const { user } = useAuth()
    const [showVerifyEmailModal, setShowVerifyEmailModal] = useState(false)
    const [loader, setLoader] = useState(false)
    const [memberNames, setMemberNames] = useState<string[]>([])
    const [namesLoading, setNamesLoading] = useState(true)
    const [namesError, setNamesError] = useState(false)
    const [signupError, setSignupError] = useState("")
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
        setSignupError("")

        // supabase signup
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username, member_name: name },
                emailRedirectTo: authRedirectUrl("/signup/confirmed"),
            },
        })

        setLoader(false)

        if (error) {
            console.error("error's signing up: ", error.message)
            setSignupError(signupErrorText(error.message))
            return
        }

        if (data.session) {
            // Email confirmation is off: the user is already signed in.
            navigate("/app")
            return
        }

        // Email confirmation is on: no session until the link is clicked.
        setShowVerifyEmailModal(true)
    }

    const loadNames = useCallback(() => {
        setNamesLoading(true)
        setNamesError(false)
        fetchAvailableMemberNames()
            .then(setMemberNames)
            .catch((err) => {
                console.error("error loading names: ", err)
                setNamesError(true)
            })
            .finally(() => setNamesLoading(false))
    }, [])

    useEffect(() => {
        loadNames()
    }, [loadNames])

    useEffect(() => {
        if (user && user?.email_confirmed_at) {
            navigate("/app")
        }
    }, [navigate, user, user?.email_confirmed_at])

    const noNames = !namesLoading && !namesError && memberNames.length === 0
    return (
        <AuthLayout title="Pick your name." subtitle="Only the names below are on the list." step="Step 1 of 2">
            <VerifyEmailModal open={showVerifyEmailModal} onDone={() => setShowVerifyEmailModal(false)} />
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div role="group" aria-labelledby="name-heading">
                    <h2 id="name-heading" className="sr-only">
                        Your name
                    </h2>
                    {namesLoading && (
                        <SkeletonScreen label="Loading names">
                            <div className="flex flex-wrap gap-2">
                                {[88, 64, 96, 72, 80, 104].map((w) => (
                                    <Skeleton key={w} shape="circle" width={`${w}px`} height="44px" />
                                ))}
                            </div>
                        </SkeletonScreen>
                    )}
                    {namesError && (
                        <div role="alert" className="flex flex-col items-start gap-2">
                            <p className="text-subhead text-danger">Couldn't load names.</p>
                            <Button variant="tinted" size="md" onClick={loadNames}>
                                Try again
                            </Button>
                        </div>
                    )}
                    {noNames && <p className="text-subhead text-danger">No names left. Ask a committee member.</p>}
                    {!namesLoading && !namesError && memberNames.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {memberNames.map((n) => {
                                const selected = signupData.name === n
                                const peb = selected ? "bg-inverse text-on-inverse ring-2 ring-pebble-lemon" : PEBBLE_CLASS[pebbleFor(n)].bg + " " + PEBBLE_CLASS[pebbleFor(n)].text
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => setSignupData({ ...signupData, name: n })}
                                        className={`text-callout inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 font-bold ${peb}`}
                                    >
                                        {selected && <Check aria-hidden className="size-4" />}
                                        {n}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    {memberNames.length > 0 && !namesLoading && !namesError && (
                        <p className="text-footnote text-label-3 mt-3">Wrong name? A committee member can reset it.</p>
                    )}
                </div>
                <TextField
                    label="Username"
                    name="username"
                    autoComplete="username"
                    enterKeyHint="next"
                    autoCapitalize="none"
                    value={signupData.username}
                    onChange={handleChange}
                    required
                />
                <TextField
                    label="Email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="next"
                    autoCapitalize="none"
                    value={signupData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                />
                <TextField
                    label="Password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    enterKeyHint="go"
                    value={signupData.password}
                    onChange={handleChange}
                    required
                />
                {signupError && (
                    <p role="alert" className="text-subhead text-danger">
                        {signupError}
                    </p>
                )}
                <Button
                    type="submit"
                    variant="pebble"
                    pebble="lemon"
                    size="lg"
                    fullWidth
                    loading={loader}
                    loadingLabel="Creating…"
                    disabled={namesLoading || namesError || memberNames.length === 0 || !signupData.name}
                >
                    Create account
                </Button>
            </form>
            <p className="text-callout text-label-2 mt-4 text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-label inline-flex min-h-11 items-center font-bold underline">
                    Log in
                </Link>
            </p>
        </AuthLayout>
    )
}

export default SignupPage
