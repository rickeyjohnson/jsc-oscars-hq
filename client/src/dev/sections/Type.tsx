import { useEffect, useState } from "react"

const TOKENS = [
    ["display", "text-display"],
    ["large-title", "text-large-title"],
    ["title-1", "text-title-1"],
    ["title-2", "text-title-2"],
    ["title-3", "text-title-3"],
    ["headline", "text-headline"],
    ["body", "text-body"],
    ["callout", "text-callout"],
    ["subhead", "text-subhead"],
    ["footnote", "text-footnote"],
    ["caption-1", "text-caption-1"],
    ["caption-2", "text-caption-2"],
] as const

const WEIGHTS = [300, 400, 700] as const

const PARAGRAPH =
    "Every year the group sidechats its way through a year of moments, and every year someone insists the loudest take deserves a trophy. The ballot closes when the committee says it does, and not a minute before."

export default function Type() {
    const [bellaboo, setBellaboo] = useState("")
    useEffect(() => {
        const check = () =>
            setBellaboo(
                document.fonts.check("700 1em Bellaboo") ? "Bellaboo loaded" : "Bellaboo not installed, showing Century Gothic Bold",
            )
        check()
        void document.fonts.ready.then(check)
    }, [])

    return (
        <div className="space-y-10">
            <div>
                <h3 className="text-headline mb-1">Century Gothic (CG)</h3>
                <p className="text-footnote text-label-2 mb-4">300 is the wordmark only. 400 body, 700 headings.</p>
                <div className="space-y-4">
                    {TOKENS.map(([name, cls]) => (
                        <div key={name} className="min-w-0">
                            <p className="text-caption-1 text-label-2">{name}</p>
                            {WEIGHTS.map((w) => (
                                <p key={w} className={`${cls} break-words`} style={{ fontWeight: w }}>
                                    {w} Best locs of the year
                                </p>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-headline mb-2">Paragraph at prose-width</h3>
                <p className="text-body prose-width">{PARAGRAPH}</p>
            </div>

            <div>
                <h3 className="text-headline mb-2">Long category name wrapping</h3>
                <p className="text-title-2 break-words">Most Likely To Reply All To A Company-Wide Email About The Office Fridge</p>
            </div>

            <div>
                <h3 className="text-headline mb-1">Display slot</h3>
                <p className="text-footnote text-label-2 mb-1">
                    font-display resolves to Bellaboo, then CG bold. To enable Bellaboo, uncomment the BELLABOO SLOT @font-face in
                    index.css once the file and web license exist. Use at title-2 and up only.
                </p>
                <p role="status" className="text-footnote text-accent mb-4">
                    {bellaboo}
                </p>
                <div className="space-y-2">
                    <p className="font-display text-title-2">Best locs</p>
                    <p className="font-display text-title-1">Best locs</p>
                    <p className="font-display text-display break-words">Best locs</p>
                </div>
            </div>
        </div>
    )
}
