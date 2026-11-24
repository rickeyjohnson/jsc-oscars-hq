import { TextField } from "../../ui/TextField"
import { Switch } from "../../ui/Switch"
import type { BallotFormData, Season } from "../../types"

interface BasicInfoProps {
    formData: BallotFormData
    setFormData: (data: BallotFormData) => void
    seasons: Season[]
}

export const BallotBasicInfo: React.FC<BasicInfoProps> = ({ formData, setFormData, seasons }) => {
    const handleChange = (field: "season_id" | "name" | "opens_at" | "closes_at", value: string) => setFormData({ ...formData, [field]: value })
    return (
        <div className="space-y-5">
            <div>
                <label htmlFor="ballot-season" className="mb-1.5 block text-subhead font-bold text-label-2">
                    Season
                </label>
                <select
                    id="ballot-season"
                    value={formData.season_id}
                    onChange={(e) => handleChange("season_id", e.target.value)}
                    className="h-13 w-full rounded-control bg-surface-2 px-4 text-body text-label outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                    <option value="" disabled>
                        Select a season
                    </option>
                    {seasons.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>
            <TextField label="Ballot name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. Main categories" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Opens" type="datetime-local" value={formData.opens_at} onChange={(e) => handleChange("opens_at", e.target.value)} />
                <TextField label="Closes" type="datetime-local" value={formData.closes_at} onChange={(e) => handleChange("closes_at", e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-card bg-surface px-4 py-2">
                <div className="min-w-0">
                    <p className="text-body font-bold">Count toward stats</p>
                    <p className="text-footnote text-label-2">{formData.count_in_stats === false ? "Practice ballot: results show, but wins and noms are not counted." : "Wins and noms from this ballot go into the leaderboard and My stats."}</p>
                </div>
                <Switch label="Count toward stats" checked={formData.count_in_stats !== false} onChange={(v) => setFormData({ ...formData, count_in_stats: v })} />
            </div>
        </div>
    )
}

export default BallotBasicInfo
