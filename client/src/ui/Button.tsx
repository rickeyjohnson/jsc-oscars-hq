import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Link } from "react-router-dom"
import { motion } from "motion/react"
import { PRESS_SCALE } from "./motion"
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./logic/variants"
import { COPY } from "./copy"
import type { PebbleName } from "./tokens"

export type ButtonProps = {
    variant?: ButtonVariant
    pebble?: PebbleName
    size?: ButtonSize
    loading?: boolean
    loadingLabel?: string
    icon?: ReactNode
    to?: string
    fullWidth?: boolean
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart">

const MotionLink = motion.create(Link)

export function Spinner() {
    return <span aria-hidden className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" />
}

export function Button({ variant, pebble, size, loading, loadingLabel, icon, to, fullWidth, className = "", children, disabled, type = "button", ...rest }: ButtonProps) {
    const cls = `${buttonClasses({ variant, pebble, size, fullWidth })} ${className}`
    const inert = disabled || loading
    const content = loading ? (
        <>
            <Spinner />
            <span>{loadingLabel ?? COPY.loading}</span>
        </>
    ) : (
        <>
            {icon}
            {children}
        </>
    )
    const tap = inert ? undefined : { scale: PRESS_SCALE }
    if (to) {
        return (
            <MotionLink to={to} className={cls} whileTap={tap} aria-label={rest["aria-label"]} aria-busy={loading || undefined} onClick={rest.onClick as never}>
                {content}
            </MotionLink>
        )
    }
    return (
        <motion.button type={type} className={cls} disabled={inert} aria-busy={loading || undefined} whileTap={tap} {...(rest as object)}>
            {content}
        </motion.button>
    )
}
