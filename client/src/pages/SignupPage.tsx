import { signupErrorText } from "../lib/authErrors"
import React, { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"
import { fetchMemberNameStatus, type MemberNameStatus } from "../api/members"
import { authRedirectUrl } from "../lib/siteUrl"
import { Sheet } from "../ui/Sheet"
import { Button } from "../ui/Button"
import { AuthLayout } from "../ui/AuthLayout"
import { TextField } from "../ui/TextField"
import { Skeleton, SkeletonScreen } from "../ui/Skeleton"
import { NameChips } from "../ui/NameChips"
import { GoogleButton } from "../ui/GoogleButton"
import { googleAuthEnabled, signInWithGoogle, useResetOnPageShow } from "../lib/googleAuth"
import { EmailToggle } from "../ui/EmailToggle"
import { setPendingName } from "../lib/claimName"

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
    const [memberNames, setMemberNames] = useState<MemberNameStatus[]>([])
    const google = googleAuthEnabled()
    const [useEmail, setUseEmail] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
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
    useResetOnPageShow(() => setGoogleLoading(false))

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

    const handleGoogle = async () => {
        if (!signupData.name) return // the "Pick your name first." hint beside the chips already says why
        setSignupError("")
        setGoogleLoading(true)
        setPendingName(signupData.name)
        const { error } = await signInWithGoogle()
        if (error) {
            console.error("google sign-up failed: ", error.message)
            setSignupError(signupErrorText(error.message))
            setGoogleLoading(false)
        }
    }

    const loadNames = useCallback(() => {
        setNamesLoading(true)
        setNamesError(false)
        fetchMemberNameStatus()
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

    const noNames = !namesLoading && !namesError && !memberNames.some((n) => !n.taken)
    return (
        <AuthLayout title="Pick your name." subtitle="Crossed-out names are taken. Wrong one? Ask a committee member." step="Step 1 of 2"
            footer={
                <p className="text-callout text-label-2">
                    Already have an account?{" "}
                    <Link to="/login" className="text-label inline-flex min-h-11 items-center font-bold underline">
                        Log in
                    </Link>
                </p>
            }
        >
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
                        <NameChips names={memberNames} selected={signupData.name} onSelect={(n) => setSignupData({ ...signupData, name: n })} />
                    )}
                    {google && !signupData.name && !namesLoading && !namesError && (
                        <p id="pick-name-hint" className="text-footnote text-label-2 mt-2">
                            Pick your name first.
                        </p>
                    )}
                </div>
                {google && (
                    <div className="flex flex-col items-center gap-3">
                        <GoogleButton onClick={handleGoogle} loading={googleLoading} notReady={!signupData.name} describedBy={signupData.name ? undefined : "pick-name-hint"} />
                        {!useEmail && (
                            <EmailToggle onOpen={() => setUseEmail(true)} />
                        )}
                    </div>
                )}
                {(!google || useEmail) && (
                    <>
                <TextField
                    label="Username"
                    name="username"
                    autoFocus={useEmail}
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
                    </>
                )}
                {signupError && (
                    <p role="alert" className="text-subhead text-danger">
                        {signupError}
                    </p>
                )}
                {(!google || useEmail) && (
                <Button
                    type="submit"
                    variant="pebble"
                    pebble="lemon"
                    size="lg"
                    fullWidth
                    loading={loader}
                    loadingLabel="Creating…"
                    disabled={namesLoading || namesError || noNames || !signupData.name}
                >
                    Create account
                </Button>
                )}
            </form>
        </AuthLayout>
    )
}

export default SignupPage
