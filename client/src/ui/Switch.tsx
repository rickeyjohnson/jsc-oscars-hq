export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center cursor-pointer"
        >
            <span className={`relative block h-[31px] w-[51px] rounded-full transition-colors duration-200 motion-reduce:transition-none ${checked ? "bg-success" : "bg-surface-2"}`}>
                <span
                    className={`absolute left-0.5 top-0.5 size-[27px] rounded-full bg-inverse transition-transform duration-200 motion-reduce:transition-none ${checked ? "translate-x-5" : "translate-x-0"}`}
                />
            </span>
        </button>
    )
}
