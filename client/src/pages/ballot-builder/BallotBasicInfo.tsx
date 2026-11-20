import { Calendar, Clock, Trophy } from "lucide-react"
import type { BallotFormData, Season } from "../../types"

interface BasicInfoProps {
    formData: BallotFormData
    setFormData: (data: BallotFormData) => void
    seasons: Season[]
}

export const BallotBasicInfo: React.FC<BasicInfoProps> = ({ formData, setFormData, seasons }) => {
    const handleChange = (field: "season_id" | "name" | "opens_at" | "closes_at", value: string) => {
        setFormData({ ...formData, [field]: value })
    }

    return (
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-bold mb-2 text-amber-100 uppercase tracking-wider">
                    Season
                </label>
                <div className="relative">
                    <select
                        value={formData.season_id}
                        onChange={(e) => handleChange("season_id", e.target.value)}
                        className="w-full appearance-none bg-zinc-800 border border-amber-100/10 rounded-xl px-4 py-4 pr-10 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition text-amber-100 text-base"
                    >
                        <option value="" disabled>
                            Select a Season
                        </option>
                        {seasons.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <Trophy className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/30 pointer-events-none" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold mb-2 text-amber-100 uppercase tracking-wider">
                    Ballot Name
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-4 focus:outline-none focus:border-amber-100/30 transition text-amber-100 text-lg placeholder-amber-100/20"
                    placeholder="e.g. 97th Academy Awards - Main Categories"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold mb-2 text-amber-100/70 uppercase">Opens At</label>
                    <div className="relative">
                        <input
                            type="datetime-local"
                            value={formData.opens_at}
                            onChange={(e) => handleChange("opens_at", e.target.value)}
                            className="w-full bg-zinc-800 border border-amber-100/10 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-amber-100/30 text-amber-100 text-sm [color-scheme:dark]"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/40" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-2 text-amber-100/70 uppercase">Closes At</label>
                    <div className="relative">
                        <input
                            type="datetime-local"
                            value={formData.closes_at}
                            onChange={(e) => handleChange("closes_at", e.target.value)}
                            className="w-full bg-zinc-800 border border-amber-100/10 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-amber-100/30 text-amber-100 text-sm [color-scheme:dark]"
                        />
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/40" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BallotBasicInfo
