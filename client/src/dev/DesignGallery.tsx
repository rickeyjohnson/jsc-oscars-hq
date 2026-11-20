import { useEffect, useState } from "react"
import { MotionConfig } from "motion/react"
import { useSearchParams } from "react-router-dom"
import { SECTIONS } from "./sections"

export default function DesignGallery() {
    const [params] = useSearchParams()
    const [reduce, setReduce] = useState(false)
    const [width, setWidth] = useState(() => window.innerWidth)
    useEffect(() => {
        const on = () => setWidth(window.innerWidth)
        window.addEventListener("resize", on)
        return () => window.removeEventListener("resize", on)
    }, [])

    const only = params.get("section")
    const shown = only ? SECTIONS.filter((s) => s.id === only) : SECTIONS

    return (
        <MotionConfig reducedMotion={reduce ? "always" : "user"}>
            <div className="min-h-dvh bg-bg text-label px-gutter py-6 max-w-6xl mx-auto" {...(reduce ? { "data-reduce-motion": "" } : {})}>
                <header className="mb-8 space-y-3">
                    <h1 className="text-large-title">Design gallery</h1>
                    <p className="text-footnote text-label-2">Dev only. Not part of production builds.</p>
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-footnote rounded-full bg-fill px-3 py-1" data-testid="width-ruler">
                            Viewport {width}px
                        </span>
                        <label className="flex items-center gap-2 text-footnote">
                            <input type="checkbox" checked={reduce} onChange={(e) => setReduce(e.target.checked)} />
                            Reduce motion
                        </label>
                    </div>
                    <nav aria-label="Sections" className="flex flex-wrap gap-2">
                        <a href="?" className="text-footnote rounded-full bg-fill px-3 py-1">
                            All
                        </a>
                        {SECTIONS.map((s) => (
                            <a key={s.id} href={`?section=${s.id}`} className="text-footnote rounded-full bg-fill px-3 py-1">
                                {s.title}
                            </a>
                        ))}
                    </nav>
                </header>
                <main className="space-y-12">
                    {shown.map(({ id, title, Component }) => (
                        <section key={id} id={id} aria-labelledby={`${id}-h`} className="min-w-0">
                            <h2 id={`${id}-h`} className="text-title-1 mb-4">
                                {title}
                            </h2>
                            <Component />
                        </section>
                    ))}
                </main>
            </div>
        </MotionConfig>
    )
}
