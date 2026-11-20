import { describe, it, expect } from "vitest"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { buildBallotCsv, formatTimestamp, csvFileName } from "./exportCsv"
import { parseCsv } from "./csv"

const categories = [
    { id: "c1", name: "Best Locs" },
    { id: "c2", name: "Hook, Line & Sinker" },
]
const voters = [
    { user_id: "u1", name: "Micah" },
    { user_id: "u2", name: "Rico" },
    { user_id: "u3", name: "Evan" },
    { user_id: "u4", name: "Justin" },
]
const nomineeNames: Record<string, string> = { n1: "Nick", n2: "Langston", n3: "John Sampson, Rickey" }
const votes = [
    { category_id: "c1", nominee_id: "n1", voter_id: "u1", updated_at: "2026-11-27T14:05:09Z" },
    { category_id: "c2", nominee_id: "n3", voter_id: "u1", updated_at: "2026-11-27T14:00:00Z" },
    { category_id: "c1", nominee_id: "n1", voter_id: "u2", updated_at: "2026-11-27T15:00:00Z" },
    { category_id: "c1", nominee_id: "n2", voter_id: "u3", updated_at: "2026-11-28T09:00:00Z" },
    { category_id: "c2", nominee_id: "n3", voter_id: "u3", updated_at: "2026-11-28T09:00:00Z" },
]
const fixture = { categories, voters, votes, nomineeNames }
const withNominee = (name: string) => ({ ...fixture, nomineeNames: { ...nomineeNames, n1: name } })

describe("exportCsv", () => {
    it("formats timestamps as local M/D/YYYY H:mm:ss", () => {
        expect(formatTimestamp(new Date("2026-11-27T14:05:09Z"))).toBe("11/27/2026 14:05:09")
        expect(formatTimestamp(new Date("2026-01-02T03:04:05Z"))).toBe("1/2/2026 3:04:05")
    })

    it("builds the oscars.py layout", () => {
        const csv = buildBallotCsv(fixture)
        expect(csv.split("\n")[0]).toBe('Timestamp,Name,Best Locs,"Hook, Line & Sinker"')
        expect(csv.split("\n")[1]).toBe('11/27/2026 14:05:09,Micah,Nick,"John Sampson, Rickey"')
        expect(csv.split("\n")[2]).toBe("11/27/2026 15:00:00,Rico,Nick,")
        expect(csv).not.toContain("Justin")
        expect(csv.endsWith("\n")).toBe(true)
        expect(parseCsv(csv)).toHaveLength(4)
        expect(buildBallotCsv(withNominee('The "Goat"'))).toContain('"The ""Goat"""')
    })

    it("sanitizes file names", () => {
        expect(csvFileName('Fall/26: "Final"?')).toBe("Fall-26- -Final--.csv")
        expect(csvFileName("   ")).toBe("ballot.csv")
    })

    const py = process.env.OSCARS_PYTHON ?? `${homedir()}/repos/jsc-oscars/venv/bin/python`
    it.skipIf(!existsSync(py))("oscars.py reads the export unchanged", () => {
        const file = join(mkdtempSync(join(tmpdir(), "oscars-")), "export.csv")
        writeFileSync(file, buildBallotCsv(fixture))
        const r = spawnSync(py, ["scripts/oscars_compat.py", file, process.env.OSCARS_DIR ?? `${homedir()}/repos/jsc-oscars`], { encoding: "utf8" })
        const out = r.stdout
        expect(r.status, r.stderr).toBe(0)
        expect(out).toContain("Best Locs:\n  1. Nick: 2 votes\n  2. Langston: 1 votes")
        expect(out).toContain("Hook, Line & Sinker:\n  1. John Sampson, Rickey: 2 votes")
        expect(out).toMatch(/^Nick\s+1\s+1\s+100\.0%$/m)
        expect(out).toMatch(/^Langston\s+0\s+1\s+0\.0%$/m)
    })
})

import { riskyNomineeNames } from "./exportCsv"
describe("riskyNomineeNames", () => {
    it("flags names pandas reads as blank", () => {
        expect(riskyNomineeNames([" NA ", "Nick", "N/A", "none", "NA", "Nathan"])).toEqual(["NA", "N/A", "none"])
    })
})
