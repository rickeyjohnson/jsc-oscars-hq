import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"

const src = join(__dirname, "..", "..")

// Files already moved onto tokens. Later tasks append here; legacy pages stay out until migrated.
const MIGRATED = ["components/OscarLogo.tsx", "components/ProfileSetup.tsx", "pages/ballot-builder/BulkImportPanel.tsx",
    "pages/LandingPage.tsx",
    "pages/LoginPage.tsx",
    "pages/SignupPage.tsx",
    "pages/ResetPassword.tsx",
    "pages/ComfirmedEmailPage.tsx",
    "components/FallingProfileBallPhysics.tsx",
    "pages/BallotsPage.tsx",
    "components/BallotCard.tsx",
    "pages/HomePage.tsx",
    "pages/home/widgets.tsx",
    "pages/home/CustomizeHomeSheet.tsx",
    "pages/home/useHomeData.ts",
    "pages/home/format.ts",
    "pages/ResultsPage.tsx",
    "pages/results/WinnersView.tsx",
    "pages/results/LeaderboardView.tsx",
    "pages/results/YouCard.tsx",
    "pages/committee/ReleasePage.tsx",
]
// Directories scanned wholesale (tests excluded: they legitimately hold literal values).
const SCANNED_DIRS = ["ui", "dev"]
const EXCLUDED = ["ui/tokens.ts"]

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) return name === "__tests__" ? [] : walk(p)
        return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : []
    })
}

const rel = (p: string) => relative(src, p).split(sep).join("/")

const RULES: { name: string; re: RegExp }[] = [
    { name: "hex color", re: /#[0-9a-fA-F]{3,8}\b/ },
    { name: "rgb()/rgba()", re: /\brgba?\(/ },
    { name: "arbitrary hex class", re: /\[#/ },
    {
        name: "raw palette class",
        re: /\b(bg|text|border|ring|outline|fill|stroke|from|to|via|shadow|divide|placeholder)-(zinc|amber|neutral|gray|slate|stone|red|green|blue|purple|yellow|orange|pink|emerald|sky|lime|rose|violet)-\d/,
    },
    { name: "dark: variant", re: /\bdark:/ },
    { name: "viewport-height unit", re: /\b(h-screen|min-h-screen|100vh)\b/ },
    {
        name: "font-display with a non-title size",
        re: /font-display[^"'`]*\btext-(headline|body|callout|subhead|footnote|caption-1|caption-2|title-3)\b|\btext-(headline|body|callout|subhead|footnote|caption-1|caption-2|title-3)\b[^"'`]*font-display/,
    },
]

describe("tokens only", () => {
    it("has no hard-coded colors or banned utilities in migrated code", () => {
        const files = [
            ...SCANNED_DIRS.flatMap((d) => walk(join(src, d))).filter((f) => !EXCLUDED.includes(rel(f))),
            ...MIGRATED.map((f) => join(src, f)),
        ]
        const hits: string[] = []
        for (const f of files) {
            readFileSync(f, "utf8")
                .split("\n")
                .forEach((line, i) => {
                    for (const r of RULES) if (r.re.test(line)) hits.push(`${rel(f)}:${i + 1} ${r.name}: ${line.trim()}`)
                })
        }
        expect(hits.join("\n")).toBe("")
    })
})

describe("no nested routers", () => {
    it("ui and dev never create a Router (the app provides one)", () => {
        const hits: string[] = []
        for (const f of ["ui", "dev"].flatMap((d) => walk(join(src, d))))
            readFileSync(f, "utf8").split("\n").forEach((l, i) => {
                if (/\b(BrowserRouter|MemoryRouter|HashRouter|createBrowserRouter)\b/.test(l)) hits.push(`${rel(f)}:${i + 1}`)
            })
        expect(hits.join("\n")).toBe("")
    })
})
