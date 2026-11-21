import type { PebbleName } from "../tokens"
import { PEBBLE_CLASS } from "./pebble"

export type ButtonVariant = "primary" | "pebble" | "secondary" | "tinted" | "destructive" | "plain"
export type ButtonSize = "lg" | "md" | "sm"
export type ChipTone = "neutral" | "success" | "warn" | "danger" | "gold" | Exclude<PebbleName, "grape">
export type AvatarSize = 24 | 32 | 40 | 56 | 72 | 96
export type AvatarRing = "bg" | "gold" | "silver" | "bronze" | "lemon" | "pebble"

const BUTTON_VARIANT: Record<Exclude<ButtonVariant, "pebble">, string> = {
    primary: "bg-inverse text-on-inverse",
    secondary: "bg-surface-2 text-label",
    tinted: "bg-fill text-label",
    destructive: "bg-fill text-danger",
    plain: "text-accent",
}

const BUTTON_SIZE: Record<ButtonSize, string> = {
    lg: "h-14 px-6 text-headline",
    md: "h-11 px-5 text-subhead font-bold",
    // 32px visual, 44px hit area via the ::before extension.
    sm: "h-8 px-4 text-footnote font-bold relative before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
}

export function buttonClasses(o: { variant?: ButtonVariant; pebble?: PebbleName; size?: ButtonSize; fullWidth?: boolean }): string {
    const variant = o.variant ?? "primary"
    const color =
        variant === "pebble" ? `${PEBBLE_CLASS[o.pebble ?? "strawberry"].bg} ${PEBBLE_CLASS[o.pebble ?? "strawberry"].text}` : BUTTON_VARIANT[variant]
    return [
        "inline-flex items-center justify-center gap-2 rounded-full select-none cursor-pointer whitespace-nowrap",
        "transition-[filter,background-color,color] duration-150 hover:brightness-110 data-hover:brightness-110 data-pressed:scale-97",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:bg-fill disabled:text-label-3 disabled:pointer-events-none disabled:brightness-100",
        BUTTON_SIZE[o.size ?? "lg"],
        color,
        o.fullWidth ? "w-full" : "",
    ]
        .filter(Boolean)
        .join(" ")
}

export function chipClasses(tone: ChipTone = "neutral"): string {
    const color =
        tone === "neutral"
            ? "bg-fill text-label"
            : tone === "success"
              ? "bg-fill text-success"
              : tone === "warn"
                ? "bg-fill text-warn"
                : tone === "danger"
                  ? "bg-fill text-danger"
                  : tone === "gold"
                    ? "bg-gold text-on-gold"
                    : `${PEBBLE_CLASS[tone].bg} ${PEBBLE_CLASS[tone].text}`
    return `inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-caption-1 font-bold whitespace-nowrap ${color}`
}

const AVATAR_SIZE: Record<AvatarSize, string> = {
    24: "size-6 text-caption-2",
    32: "size-8 text-caption-1",
    40: "size-10 text-footnote",
    56: "size-14 text-headline",
    72: "size-18 text-title-2",
    96: "size-24 text-title-1",
}
export const avatarSizeClass = (s: AvatarSize): string => AVATAR_SIZE[s]

export const AVATAR_RING: Record<AvatarRing, string> = {
    bg: "ring-2 ring-bg",
    gold: "ring-2 ring-gold",
    silver: "ring-2 ring-silver",
    bronze: "ring-2 ring-bronze",
    lemon: "ring-2 ring-pebble-lemon",
    // Resolved per person in Avatar (see PEBBLE_RING); this entry is only the shared geometry.
    pebble: "ring-[3px] ring-offset-2 ring-offset-bg",
}

// A 3px ring in the person's own pebble color with a dark inner gap. Literal strings for Tailwind's scanner.
export const PEBBLE_RING: Record<PebbleName, string> = {
    strawberry: "ring-pebble-strawberry",
    cherry: "ring-pebble-cherry",
    tangerine: "ring-pebble-tangerine",
    lemon: "ring-pebble-lemon",
    lime: "ring-pebble-lime",
    sky: "ring-pebble-sky",
    grape: "ring-pebble-grape",
}
