export type LogoSize = "xxsmall" | "xsmall" | "small" | "medium" | "large"
export type LogoTone = "cream" | "onLemon" | "onLime"

interface LogoProps {
    size?: LogoSize
    as?: "h1" | "div"
    decorative?: boolean
    tone?: LogoTone
}

export const LOGO_SIZES: LogoSize[] = ["xxsmall", "xsmall", "small", "medium", "large"]

const SIZE_MAP: Record<LogoSize, number> = {
    xxsmall: 2,
    xsmall: 2.5,
    small: 3.5,
    medium: 5,
    large: 7,
}

// Literal strings so Tailwind's scanner sees every class.
const TONE_CLASS: Record<LogoTone, string> = {
    cream: "text-label",
    onLemon: "text-on-pebble-lemon",
    onLime: "text-on-pebble-lime",
}

const RATIO = 5 / 22

const Logo: React.FC<LogoProps> = ({ size = "medium", as: Root = "div", decorative = false, tone = "cream" }) => {
    const oscarsSize = SIZE_MAP[size]
    const justSideSize = oscarsSize * RATIO
    const a11y = decorative ? { "aria-hidden": true } : Root === "h1" ? { "aria-label": "Just Sidechatting Oscars" } : { role: "img", "aria-label": "Just Sidechatting Oscars" }

    return (
        <Root
            {...a11y}
            className={`flex flex-col items-center justify-center text-center uppercase ${TONE_CLASS[tone]} select-none p-1`}
        >
            <div className="font-oscars-regular leading-none mb-[0.25rem]" style={{ fontSize: `${justSideSize}rem` }}>
                JUST SIDECHATTING
            </div>

            <div className="font-oscars-thin leading-none mb-[-0.5rem]" style={{ fontSize: `min(${oscarsSize}rem, 16vw)` }}>
                OSCARS
            </div>
        </Root>
    )
}

export default Logo
