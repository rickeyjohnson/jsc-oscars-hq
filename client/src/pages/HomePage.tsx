import { Trophy } from "lucide-react"
import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import { useEffect, useState } from "react"

const HomePage = () => {
    const [timeLeft, setTimeLeft] = useState({})

    useEffect(() => {
        const calculateTimeLeft = () => {
            const oscarsDate = new Date("2026-03-08T20:00:00") // NEXT OSCARS - UPDATE FROM /GET
            const now = new Date()
            const difference = oscarsDate - now

            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                }
            }
            return {}
        }

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    return (
        <div className="bg-zinc-900 min-h-screen text-neutral-100 pb-24">
            <NavigationBar />

            <div className="space-y-6">
                <div className="bg-gradient-to-br from-amber-100/10 to-amber-100/5 border border-amber-100/20 rounded-3xl p-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Trophy className="w-6 h-6 text-amber-100" />
                        <h2 className="text-2xl font-bold text-amber-100">
                            6th Academy Awards
                        </h2>
                    </div>
                    <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
                        {Object.keys(timeLeft).length > 0 ? (
                            <>
                                <div className="bg-zinc-900/50 rounded-2xl p-4 border border-amber-100/10">
                                    <div className="text-2xl font-black text-amber-100">
                                        {timeLeft.days || "0"}
                                    </div>
                                    <div className="text-xs text-amber-100/60 mt-1">
                                        DAYS
                                    </div>
                                </div>
                                <div className="bg-zinc-900/50 rounded-2xl p-4 border border-amber-100/10">
                                    <div className="text-2xl font-black text-amber-100">
                                        {timeLeft.hours || "0"}
                                    </div>
                                    <div className="text-xs text-amber-100/60 mt-1">
                                        HRS
                                    </div>
                                </div>
                                <div className="bg-zinc-900/50 rounded-2xl p-4 border border-amber-100/10">
                                    <div className="text-2xl font-black text-amber-100">
                                        {timeLeft.minutes || "0"}
                                    </div>
                                    <div className="text-xs text-amber-100/60 mt-1">
                                        MIN
                                    </div>
                                </div>
                                <div className="bg-zinc-900/50 rounded-2xl p-4 border border-amber-100/10">
                                    <div className="text-2xl font-black text-amber-100">
                                        {timeLeft.seconds || "0"}
                                    </div>
                                    <div className="text-xs text-amber-100/60 mt-1">
                                        SEC
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="col-span-4 text-amber-100">
                                It's Oscar Night!
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-amber-100/60 mt-4">
                        March 8, 2026 • 8:00 PM EST
                    </p>
                </div>
            </div>

            <NavigationTabs activeTab={"home"} />
        </div>
    )
}

export default HomePage
