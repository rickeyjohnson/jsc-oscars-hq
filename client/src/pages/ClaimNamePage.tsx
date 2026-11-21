import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useUserData } from "../context/UserContenxt"
import { fetchMemberNameStatus, type MemberNameStatus } from "../api/members"
import { clearPendingName, getPendingName } from "../lib/claimName"
import { AuthLayout } from "../ui/AuthLayout"
import { Button } from "../ui/Button"
import { NameChips } from "../ui/NameChips"
import { Skeleton, SkeletonScreen } from "../ui/Skeleton"

const NOT_SET_UP = "Name claiming isn't set up yet. Ask a committee member."
const TAKEN = "That name isn't available. Pick another or ask a committee member."

const ClaimNamePage = () => {
    const { member, refetch } = useUserData()
    const navigate = useNavigate()
    const [names, setNames] = useState<MemberNameStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [picked, setPicked] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const autoTried = useRef(false)
    // A name picked on signup is claimed automatically: show that, not the chips, while it runs.
    const [autoName, setAutoName] = useState<string | null>(() => (member ? null : getPendingName()))

    const load = useCallback((silent?: boolean) => {
        if (!silent) setLoading(true)
        setLoadError(false)
        fetchMemberNameStatus()
            .then(setNames)
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false))
    }, [])

    const claim = useCallback(
        async (name: string) => {
            setBusy(true)
            setError("")
            const { error: err } = await supabase.rpc("claim_member_name", { p_name: name })
            if (err) {
                const missing = err.code === "PGRST202" || /not found|could not find/i.test(err.message ?? "")
                setError(missing ? NOT_SET_UP : TAKEN)
                setBusy(false)
                setAutoName(null)
                // The name may have just been taken: drop the stale pick and show the current list.
                setPicked("")
                if (!missing) load(true)
                return
            }
            await refetch()
            navigate("/app", { replace: true })
        },
        [refetch, navigate, load]
    )

    useEffect(() => {
        if (member) navigate("/app", { replace: true })
    }, [member, navigate])

    useEffect(() => load(), [load])

    // A name picked on the signup screen before Google is used once, automatically.
    useEffect(() => {
        if (autoTried.current || member) return
        const pending = getPendingName()
        if (!pending) return
        autoTried.current = true
        clearPendingName()
        void claim(pending)
    }, [member, claim])

    const logOut = async () => {
        try {
            await supabase.auth.signOut()
        } catch {
            /* leave anyway: the landing page works signed out or in */
        }
        navigate("/", { replace: true })
    }

    const available = names.filter((n) => !n.taken)
    const claiming = autoName !== null
    return (
        <AuthLayout title="Pick your name." subtitle={claiming ? undefined : "Crossed-out names are taken. Wrong one? Ask a committee member."} back={null} action={<Button variant="plain" size="md" className="-mr-3" onClick={() => void logOut()}>Log out</Button>}>
            {claiming && (
                <p role="status" className="text-callout text-label-2">
                    Claiming {autoName}…
                </p>
            )}
            {!claiming && loading && (
                <SkeletonScreen label="Loading names">
                    <div className="flex flex-wrap gap-2">
                        {[88, 64, 96, 72, 80].map((w) => (
                            <Skeleton key={w} shape="circle" width={`${w}px`} height="44px" />
                        ))}
                    </div>
                </SkeletonScreen>
            )}
            {!claiming && loadError && (
                <div role="alert" className="flex flex-col items-start gap-2">
                    <p className="text-subhead text-danger">Couldn't load names.</p>
                    <Button variant="tinted" size="md" onClick={() => load()}>
                        Try again
                    </Button>
                </div>
            )}
            {!claiming && !loading && !loadError && available.length === 0 && <p className="text-subhead text-danger">No names left. Ask a committee member.</p>}
            {!claiming && !loading && !loadError && available.length > 0 && <NameChips names={names} selected={picked} onSelect={setPicked} />}
            {error && (
                <p role="alert" className="text-subhead text-danger mt-4">
                    {error}
                </p>
            )}
            <div className={`mt-6 ${claiming ? "hidden" : ""}`}>
                <Button variant="primary" size="lg" fullWidth disabled={!picked} loading={busy} loadingLabel="Claiming…" onClick={() => void claim(picked)}>
                    Continue
                </Button>
            </div>
        </AuthLayout>
    )
}

export default ClaimNamePage
