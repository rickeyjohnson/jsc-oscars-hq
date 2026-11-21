import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "../ui/Button"
import { Sheet } from "../ui/Sheet"
import { SheetActions } from "../ui/SheetActions"

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
        <Sheet
            open={isOpen}
            onClose={onClose}
            title="Joke"
            fit
            footer={
                isFinished ? (
                    <SheetActions>
                        <Button fullWidth icon={<RotateCcw aria-hidden size={18} />} onClick={nextJoke}>
                            Another?
                        </Button>
                    </SheetActions>
                ) : undefined
            }
        >
            <div aria-live="polite" className="py-4 text-center">
                <AnimatePresence mode="wait">
                    {!showPunchline ? (
                        <motion.h3 key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="text-title-2">
                            {currentJoke.setup}
                        </motion.h3>
                    ) : (
                        <motion.h3 key="punchline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="text-title-2">
                            "{currentJoke.punchline}"
                        </motion.h3>
                    )}
                </AnimatePresence>
            </div>
        </Sheet>
    )
}

export default JokeGeneratorModal
