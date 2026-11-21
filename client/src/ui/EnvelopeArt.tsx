// The big lemon envelope of the reveal page: dim and locked until ready, lit when ready, open while holding or released.
export function EnvelopeArt({ state, size = 170 }: { state: "dim" | "lit" | "open"; size?: number }) {
    const open = state === "open"
    return (
        <svg aria-hidden viewBox="0 0 200 180" width={size} className={`mx-auto block text-pebble-lemon ${state === "dim" ? "opacity-30" : ""}`}>
            <rect x="10" y="62" width="180" height="108" rx="12" fill="currentColor" />
            {open ? (
                <>
                    <path d="M10 62 L100 14 L190 62 Z" fill="currentColor" className="opacity-80" />
                    <rect x="40" y="30" width="120" height="62" rx="6" className="fill-label" />
                    <rect x="56" y="44" width="62" height="6" rx="3" className="fill-on-pebble-lemon opacity-70" />
                    <rect x="56" y="58" width="88" height="5" rx="2.5" className="fill-on-pebble-lemon opacity-25" />
                    <path d="M10 74 L100 134 L190 74 L190 158 Q190 170 178 170 L22 170 Q10 170 10 158Z" fill="currentColor" className="opacity-90" />
                </>
            ) : (
                <>
                    <path d="M10 62 L100 130 L190 62 L190 74 L100 142 L10 74Z" className="fill-bg opacity-25" />
                    <path d="M10 62 Q10 50 22 50 L178 50 Q190 50 190 62 L100 130Z" fill="currentColor" />
                    <circle cx="100" cy="124" r="19" className="fill-on-pebble-lemon" />
                    {state === "dim" ? (
                        <>
                            <rect x="93" y="124" width="14" height="10" rx="2" fill="currentColor" />
                            <path d="M95 124v-4a5 5 0 0110 0v4" fill="none" stroke="currentColor" strokeWidth="2.6" />
                        </>
                    ) : (
                        <path d="M92 124l6 6 11-12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                </>
            )}
        </svg>
    )
}
