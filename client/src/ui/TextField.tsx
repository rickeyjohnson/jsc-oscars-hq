import { useId, type InputHTMLAttributes, type ReactNode } from "react"

export type TextFieldProps = { label: string; trailing?: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">

/** Labelled 52px field. Text is 16px so iOS Safari does not zoom on focus. */
export function TextField({ label, trailing, ...rest }: TextFieldProps) {
    const id = useId()
    return (
        <div>
            <label htmlFor={id} className="text-subhead text-label-2 mb-1.5 block font-bold">
                {label}
            </label>
            <div className="bg-surface-2 rounded-control focus-within:ring-accent flex h-13 items-center focus-within:ring-2">
                <input id={id} className="text-body text-label placeholder:text-label-3 h-full min-w-0 flex-1 bg-transparent px-4 outline-none" {...rest} />
                {trailing}
            </div>
        </div>
    )
}
