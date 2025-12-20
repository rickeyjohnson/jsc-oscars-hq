import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import { useState } from "react"
import { useUserData } from "../context/UserContenxt"
import { Target, TrendingUp, Trophy } from "lucide-react"

const StatsPage = () => {
    const { profile } = useUserData()
    const [selectedYear, setSelectedYear] = useState<"all" | number>("all")

    const baseClasses =
        "px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors"

    const selectedClasses = "bg-amber-100 text-zinc-900 font-bold"
    const unselectedClasses =
        "bg-amber-100/10 text-amber-100 border-amber-100/20 font-medium"

    return (
        <div>
            <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
                <NavigationBar />
                <main>
                    <div className="space-y-6 p-6">
                        <h2 className="text-3xl font-black">Statistics</h2>

                        {/* Year Filter */}
                        <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2">
                            {/* All Time */}
                            <button
                                onClick={() => setSelectedYear("all")}
                                className={`${baseClasses} ${
                                    selectedYear === "all"
                                        ? selectedClasses
                                        : unselectedClasses
                                }`}
                            >
                                All Time
                            </button>
                            {[2026, 2025, 2024, 2023].map((year) => (
                                <button
                                    key={year}
                                    onClick={() => setSelectedYear(year)}
                                    className={`${baseClasses} ${
                                        selectedYear === year
                                            ? selectedClasses
                                            : unselectedClasses
                                    }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>

                        {/* Total Stats */}
                        <div className="bg-gradient-to-br from-amber-100/10 to-amber-100/5 border border-amber-100/20 rounded-3xl p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5" />
                                Your Performance
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-3xl font-black text-amber-100">
                                        --
                                    </div>
                                    <div className="text-xs text-amber-100/60 mt-1">
                                        Nominations
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-black text-green-400">
                                        --
                                    </div>
                                    <div className="text-xs text-amber-100/60 mt-1">
                                        Wins
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-black text-amber-100">
                                        --%
                                    </div>
                                    <div className="text-xs text-amber-100/60 mt-1">
                                        Win Rate
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Podium */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Leaderboard
                                </h3>
                            </div>

                            {/* Podium */}
                            <div className="mb-6">
                                <div className="flex items-end justify-center gap-3 mb-6">
                                    {/* Second Place */}
                                    <div className="flex-1 text-center">
                                        <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-2xl font-black text-zinc-900 border-4 border-gray-200">
                                            C
                                        </div>{" "}
                                        {/* TODO: add the pfps */}
                                        <div className="font-bold text-amber-100 text-sm mb-1">
                                            CinemaLover
                                        </div>
                                        <div className="text-xs text-amber-100/60 mb-2">
                                            42 wins • 87%
                                        </div>
                                        <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-t-2xl p-4 h-24 flex flex-col items-center justify-center border-4 border-gray-200 border-b-0">
                                            <div className="text-3xl font-black text-zinc-900">
                                                2
                                            </div>
                                        </div>
                                    </div>

                                    {/* First Place */}
                                    <div className="flex-1 text-center">
                                        <div className="w-20 h-20 mx-auto mb-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-3xl font-black text-zinc-900 border-4 border-amber-200 shadow-lg">
                                            M
                                        </div>{" "}
                                        {/* TODO: add the pfps */}
                                        <div className="font-bold text-amber-100 mb-1">
                                            MovieBuff2024
                                        </div>
                                        <div className="text-xs text-amber-100/60 mb-2">
                                            45 wins • 89%
                                        </div>
                                        <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-t-2xl p-4 h-32 flex flex-col items-center justify-center border-4 border-amber-200 border-b-0 shadow-lg">
                                            <div className="text-4xl font-black text-zinc-900">
                                                1
                                            </div>
                                        </div>
                                    </div>

                                    {/* Third Place */}
                                    <div className="flex-1 text-center">
                                        <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-amber-700 to-amber-900 rounded-full flex items-center justify-center text-2xl font-black text-white border-4 border-amber-800">
                                            F
                                        </div>{" "}
                                        {/* TODO: add the pfps */}
                                        <div className="font-bold text-amber-100 text-sm mb-1">
                                            FilmFanatic
                                        </div>
                                        <div className="text-xs text-amber-100/60 mb-2">
                                            38 wins • 84%
                                        </div>
                                        <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-t-2xl p-4 h-20 flex flex-col items-center justify-center border-4 border-amber-800 border-b-0">
                                            <div className="text-3xl font-black text-white">
                                                3
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Base of Podium */}
                                <div className="flex items-center w-full my-6">
                                    <div className="flex-grow border-t border-amber-100/30" />
                                    <span className="mx-4 text-sm text-amber-100/70 font-medium whitespace-nowrap font-windsong-medium">
                                        The Others
                                    </span>
                                    <div className="flex-grow border-t border-amber-100/30" />
                                </div>
                            </div>

                            {/* Rest of Rankings */}
                            <div className="space-y-3">
                                {[
                                    "rickeyistaken",
                                    "kadinlovesdogs",
                                    "tjisnotspades",
                                ].map((name, index) => (
                                    <div className="bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-100/10 rounded-full flex items-center justify-center font-black text-amber-100">
                                                    {index + 4}
                                                </div>{" "}
                                                {/* TODO: add the pfps */}
                                                <div>
                                                    <div className="font-bold text-amber-100">
                                                        {profile?.username ===
                                                        name
                                                            ? "You"
                                                            : name}
                                                    </div>
                                                    <div className="text-xs text-amber-100/60">
                                                        18 wins • 75%
                                                    </div>
                                                </div>
                                            </div>
                                            {profile?.username === name && (
                                                <Target className="w-5 h-5 text-amber-100/40" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
                <NavigationTabs activeTab={"stats"} />
            </div>
        </div>
    )
}

export default StatsPage
