import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { X, RotateCcw } from "lucide-react"

interface Joke {
    setup: string
    punchline: string
}

const JOKES: Joke[] = [
    {
        setup: "Why did the developer go broke?",
        punchline: "Because he used up all his cache.",
    },
    {
        setup: "How many programmers does it take to change a light bulb?",
        punchline: "None. It's a hardware problem.",
    },
    {
        setup: "Why do programmers prefer dark mode?",
        punchline: "Because light attracts bugs.",
    },
]

type JokeGeneratorProps = {
    isOpen: boolean
    onClose: () => void
}

const JokeGeneratorModal = ({ isOpen, onClose }: JokeGeneratorProps) => {
    const [currentJoke, setCurrentJoke] = useState<Joke>(JOKES[0])
    const [showPunchline, setShowPunchline] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [isVisible, setIsVisible] = useState(!document.hidden)

    // Function to pick a new random joke
    const nextJoke = () => {
        const remainingJokes = JOKES.filter(
            (j) => j.setup !== currentJoke.setup
        )
        const randomJoke =
            remainingJokes[Math.floor(Math.random() * remainingJokes.length)]
        setCurrentJoke(randomJoke)
        setShowPunchline(false)
        setIsFinished(false)
    }

    // Logic for auto-advancing from Setup to Punchline
    useEffect(() => {
        if (!isOpen || showPunchline || !isVisible) return

        const timer = setTimeout(() => {
            setShowPunchline(true)
            // Wait a moment after punchline appears to show buttons
            setTimeout(() => setIsFinished(true), 1500)
        }, 4000) // Wait 4 seconds on the setup

        return () => clearTimeout(timer)
    }, [isOpen, showPunchline, isVisible, currentJoke])

    // Tab Visibility Logic (from your provided code)
    useEffect(() => {
        const handleVisibilityChange = () => setIsVisible(!document.hidden)
        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () =>
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            )
    }, [])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="joke-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{
                        y: "-110%",
                        opacity: 0,
                        scale: 0.96,
                        filter: "blur(6px)",
                        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
                    }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 h-screen"
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    <div className="relative flex flex-col justify-items items-center w-[80%] text-[#fffadd]">
                        <AnimatePresence mode="wait">
                            {!showPunchline ? (
                                <motion.div
                                    key="setup"
                                    initial={{
                                        opacity: 0,
                                        filter: "blur(8px)",
                                        scale: 0.98,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        filter: "blur(0px)",
                                        scale: 1,
                                    }}
                                    exit={{ opacity: 0, filter: "blur(8px)" }}
                                    transition={{ duration: 0.6 }}
                                    className="text-center"
                                >
                                    <h2 className="font-bold">
                                        {currentJoke.setup}
                                    </h2>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="punchline"
                                    initial={{
                                        opacity: 0,
                                        y: 20,
                                        filter: "blur(10px)",
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        filter: "blur(0px)",
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        ease: "easeOut",
                                    }}
                                    className="text-center"
                                >
                                    <h2 className="font-bold italics">
                                        "{currentJoke.punchline}"
                                    </h2>

                                    {/* Action Buttons - Appear when joke is finished */}
                                    {isFinished && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-12 flex gap-4 justify-center"
                                        >
                                            <button
                                                onClick={onClose}
                                                className="flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition font-semibold"
                                            >
                                                <X size={18} /> Quit
                                            </button>
                                            <button
                                                onClick={nextJoke}
                                                className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#fffadd] text-black hover:bg-white transition font-bold"
                                            >
                                                <RotateCcw size={18} /> Another?
                                            </button>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default JokeGeneratorModal
