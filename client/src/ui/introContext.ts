import { createContext, useContext, useEffect } from "react"

type Ctx = { topic: string | null; setTopic: (t: string | null) => void }
export const IntroContext = createContext<Ctx>({ topic: null, setTopic: () => {} })

/** A page calls this with a topic once it is loaded, open for use and idle (null otherwise). Only intros for that topic can show. */
export function useIntroGate(topic: string | null): void {
    const { setTopic } = useContext(IntroContext)
    useEffect(() => {
        setTopic(topic)
        return () => setTopic(null)
    }, [topic, setTopic])
}
