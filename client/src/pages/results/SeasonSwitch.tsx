import { useNavigate } from "react-router-dom"
import { SegmentedControl } from "../../ui/SegmentedControl"

export type SeasonScope = "current" | "previous"
const OPTIONS: { value: SeasonScope; label: string }[] = [
    { value: "current", label: "This season" },
    { value: "previous", label: "Previous" },
]

/** This season (the Results page) | Previous (the Previous Oscars page). */
export function SeasonSwitch({ value }: { value: SeasonScope }) {
    const navigate = useNavigate()
    return (
        <SegmentedControl
            label="Season"
            idPrefix="season"
            options={OPTIONS}
            value={value}
            onChange={(v) => {
                if (v !== value) navigate(v === "previous" ? "/app/results/previous" : "/app/results")
            }}
        />
    )
}
