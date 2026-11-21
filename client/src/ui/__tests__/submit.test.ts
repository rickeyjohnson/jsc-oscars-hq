import { describe, expect, it } from "vitest"
import { submitChecklist } from "../logic/submit"
import { localSubmissionIO, submissionKey } from "../../api/submissions"

const now = new Date("2026-11-20T12:00:00Z")
const closesAt = new Date("2026-11-27T12:00:00Z")
const base = { voted: 30, total: 30, closesAt, now }

describe("submitChecklist", () => {
    it("all voted: submittable, all rows ok", () => {
        const r = submitChecklist(base)
        expect(r.submittable).toBe(true)
        expect(r.blocked).toBeNull()
        expect(r.items.map((i) => [i.id, i.ok])).toEqual([["voted", true], ["private", true], ["editable", true]])
        expect(r.items[0].label).toBe("30 of 30 categories voted")
        expect(r.items[2].label).toMatch(/^You can still edit until /)
    })
    it("skipped categories are warnings but still submittable (plural + singular)", () => {
        const two = submitChecklist({ ...base, voted: 28 })
        expect(two.submittable).toBe(true)
        expect(two.items[0]).toMatchObject({ id: "voted", ok: false, label: "2 categories skipped" })
        expect(submitChecklist({ ...base, voted: 29 }).items[0].label).toBe("1 category skipped")
    })
    it("0 voted is not submittable", () => {
        const r = submitChecklist({ ...base, voted: 0 })
        expect(r.submittable).toBe(false)
        expect(r.blocked).toBe("empty")
    })
    it("closed or ended ballots are not submittable", () => {
        expect(submitChecklist({ ...base, closesAt: new Date("2026-11-19T00:00:00Z") })).toMatchObject({ submittable: false, blocked: "closed" })
        expect(submitChecklist({ ...base, status: "closed" })).toMatchObject({ submittable: false, blocked: "closed" })
    })
    it("upcoming ballots are not submittable", () => {
        expect(submitChecklist({ ...base, opensAt: new Date("2026-11-21T00:00:00Z") })).toMatchObject({ submittable: false, blocked: "upcoming" })
    })
})

const mem = (): Storage => {
    const m = new Map<string, string>()
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 }
}

describe("localSubmissionIO", () => {
    it("round-trips per user and ballot", async () => {
        const s = mem()
        const io = localSubmissionIO(s, "u1", () => new Date("2026-11-27T12:00:00Z"))
        expect(await io.get("B1")).toBeNull()
        expect(await io.submit("B1")).toBe("2026-11-27T12:00:00.000Z")
        expect(await io.get("B1")).toBe("2026-11-27T12:00:00.000Z")
        expect(await localSubmissionIO(s, "u2", () => new Date()).get("B1")).toBeNull()
        expect(submissionKey("B1", "u1")).toBe("jsc.submitted.v1.B1.u1")
    })
    it("survives a null or throwing storage", async () => {
        const bad = { ...mem(), getItem: () => { throw new Error("x") }, setItem: () => { throw new Error("x") } } as Storage
        for (const st of [null, bad]) {
            const io = localSubmissionIO(st, "u1", () => new Date("2026-11-27T12:00:00Z"))
            expect(await io.get("B1")).toBeNull()
            expect(await io.submit("B1")).toBe("2026-11-27T12:00:00.000Z")
        }
    })
})
