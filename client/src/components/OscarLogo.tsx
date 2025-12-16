type LogoSize = "xsmall" | "small" | "medium" | "large"

interface LogoProps {
    size?: LogoSize
}

const SIZE_MAP: Record<LogoSize, number> = {
    xsmall: 2.5,
    small: 3.5,
    medium: 5,
    large: 7,
}

const RATIO = 5 / 22

const Logo: React.FC<LogoProps> = ({ size = "medium" }) => {
    const oscarsSize = SIZE_MAP[size]
    const justSideSize = oscarsSize * RATIO

    return (
        <div className="flex flex-col items-center justify-center text-center uppercase text-white select-none p-1">
            <div
                className="font-oscars-regular leading-none mb-[0.25rem]"
                style={{ fontSize: `${justSideSize}rem` }}
            >
                JUST SIDECHATTING
            </div>

            <h1
                className="font-oscars-thin leading-none mb-[-0.5rem]"
                style={{ fontSize: `${oscarsSize}rem` }}
            >
                OSCARS
            </h1>
        </div>
    )
}

export default Logo
