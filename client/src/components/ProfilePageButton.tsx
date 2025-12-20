import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"

type Variant = "default" | "gradient"

interface ProfilePageButtonProps {
    label: string
    icon: ReactNode
    onClick?: () => void
    variant?: Variant

    // Optional overrides
    textColor?: string
    iconColor?: string
    rightIconColor?: string
    className?: string
}

const ProfilePageButton = ({
    label,
    icon,
    onClick,
    variant = "default",
    textColor,
    iconColor,
    rightIconColor,
    className = "",
}: ProfilePageButtonProps) => {
    const base =
        "w-full rounded-2xl p-4 text-left transition flex items-center justify-between"

    const variants = {
        default:
            "bg-amber-100/5 border border-amber-100/10 hover:bg-amber-100/10",
        gradient:
            "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
    }

    return (
        <button
            onClick={onClick}
            className={`${base} ${variants[variant]} ${className}`}
        >
            <div className="flex items-center gap-3">
                <span className={iconColor ?? "text-amber-100"}>{icon}</span>
                <span
                    className={`${textColor ?? "text-amber-100"} ${
                        variant === "gradient" ? "font-bold" : "font-medium"
                    }`}
                >
                    {label}
                </span>
            </div>

            <ChevronRight
                className={`w-5 h-5 ${
                    rightIconColor ??
                    (variant === "gradient"
                        ? "text-zinc-900"
                        : "text-amber-100/40")
                }`}
            />
        </button>
    )
}

export default ProfilePageButton
