import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { ALLOWED_LINKS, parseSegments, stripUnknownLinks } from "../../../../supabase/functions/_shared/chat/links"

describe("parseSegments", () => {
    it("splits text and an allowed link", () => {
        expect(parseSegments("Go [[go:/app/results|Results]] now")).toEqual([
            { kind: "text", text: "Go " },
            { kind: "link", path: "/app/results", label: "Results" },
            { kind: "text", text: " now" },
        ])
    })
    it("turns an unknown path into plain text", () => {
        expect(parseSegments("[[go:/evil|Click me]]")).toEqual([{ kind: "text", text: "Click me" }])
    })
    it("leaves a malformed marker as text", () => {
        expect(parseSegments("see [[go:/app/results")).toEqual([{ kind: "text", text: "see [[go:/app/results" }])
    })
})

describe("stripUnknownLinks", () => {
    it("keeps allowed markers and replaces unknown ones with the label", () => {
        expect(stripUnknownLinks("[[go:/app/ballots|Ballots]] and [[go:/nope|Nope]]")).toBe("[[go:/app/ballots|Ballots]] and Nope")
    })
})

describe("ALLOWED_LINKS", () => {
    it("only lists pages that exist in the app routes", () => {
        const app = readFileSync("src/App.tsx", "utf8")
        for (const p of Object.keys(ALLOWED_LINKS)) {
            const path = p.split("?")[0]
            if (path === "/app") continue
            expect(app, path).toContain(`path="${path.replace("/app/", "")}"`)
        }
    })
})
