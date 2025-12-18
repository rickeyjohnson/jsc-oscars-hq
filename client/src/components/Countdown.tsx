/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trophy } from "lucide-react"
import { useEffect, useState } from "react"

type TimeLeft = {
    days: number | null
    hours: number | null
    minutes: number | null
    seconds: number | null
}

const Countdown = () => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({
        days: null,
        hours: null,
        minutes: null,
        seconds: null,
    })

    useEffect(() => {
        const calculateTimeLeft = () => {
            const oscarsDate: any = new Date("2025-12-27T17:00:00") // Vacation
            const now: any = new Date()
            const difference = oscarsDate - now

            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                }
            }

            return {
                days: null,
                hours: null,
                minutes: null,
                seconds: null,
            }
        }

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    return (
        <div className="bg-gradient-to-br from-amber-100/10 to-amber-100/5 border border-amber-100/20 rounded-3xl p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-amber-100" />
                <h2 className="text-2xl font-bold text-amber-100">
                    6th JSC Oscars
                </h2>
            </div>
            <div className="grid grid-cols-4 gap-1 justify-between max-w-md mx-auto md:gap-4">
                {Object.keys(timeLeft).length > 0 ? (
                    <>
                        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-amber-100/10 overflow-hidden text-ellipsis">
                            <div className="text-4xl font-black text-amber-100">
                                {timeLeft.days || "0"}
                            </div>
                            <div className="text-xs text-amber-100/60 mt-1">
                                DAYS
                            </div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-amber-100/10 overflow-hidden text-ellipsis">
                            <div className="text-4xl font-black text-amber-100">
                                {timeLeft.hours || "0"}
                            </div>
                            <div className="text-xs text-amber-100/60 mt-1">
                                HRS
                            </div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-amber-100/10 overflow-hidden text-ellipsis">
                            <div className="text-4xl font-black text-amber-100">
                                {timeLeft.minutes || "0"}
                            </div>
                            <div className="text-xs text-amber-100/60 mt-1">
                                MIN
                            </div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-amber-100/10 overflow-hidden text-ellipsis">
                            <div className="text-4xl font-black text-amber-100">
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
    )
}

export default Countdown
