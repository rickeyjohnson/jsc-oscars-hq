import { describe, expect, it } from "vitest"
import { attentionItems } from "../logic/attention"
import type { Ballot } from "../../types"
import type { ReleaseCheck } from "../../lib/release"

const now = new Date("2026-12-01T12:00:00Z")
const ballot = (o: Partial<Ballot>): Ballot => ({ id: "b", season_id: "s", parent_ballot_id: null, name: "B", round: "main", status: "open", opens_at: "2026-11-01T00:00:00Z", closes_at: "2026-11-30T00:00:00Z", ...o })
const ok = (id: ReleaseCheck["id"]): ReleaseCheck => ({ id, label: id, ok: true })
const bad = (id: ReleaseCheck["id"], label: string): ReleaseCheck => ({ id, label, ok: false })
const allOk = [ok("ballots_closed"), ok("no_round_open"), ok("winners")]

describe("attentionItems", () => {
    it("close then ties", () => {
        const out = attentionItems({ ballots: [ballot({})], checks: [ok("ballots_closed"), ok("no_round_open"), bad("winners", "27 of 30 categories have a winner")], released: false, now })
        expect(out.map((a) => a.id)).toEqual(["close", "ties"])
        expect(out[0]).toMatchObject({ label: "1 ballot ended but is still open", to: "/app/profile/ballots", tone: "warn" })
        expect(out[1]).toMatchObject({ label: "27 of 30 categories have a winner · Go to tally", to: "/app/profile/ballots", tone: "warn" })
    })
    it("pluralises close", () => {
        expect(attentionItems({ ballots: [ballot({ id: "1" }), ballot({ id: "2" })], checks: null, released: false, now })[0].label).toBe("2 ballots ended but are still open")
    })
    it("ignores still-running, closed and draft ballots", () => {
        const bs = [ballot({ closes_at: "2026-12-05T00:00:00Z" }), ballot({ status: "closed" }), ballot({ status: "draft" })]
        expect(attentionItems({ ballots: bs, checks: null, released: false, now })).toEqual([])
    })
    it("release item for other failing checks", () => {
        const out = attentionItems({ ballots: [], checks: [bad("ballots_closed", "1 of 2 ballots closed"), ok("no_round_open"), ok("winners")], released: false, now })
        expect(out).toEqual([{ id: "release", label: "1 of 2 ballots closed", to: "/app/profile/release", tone: "warn" }])
    })
    it("ready", () => {
        expect(attentionItems({ ballots: [], checks: allOk, released: false, now })).toEqual([{ id: "ready", label: "Ready to open the envelope", to: "/app/profile/release", tone: "success" }])
    })
    it("nothing once released, or before checks load", () => {
        expect(attentionItems({ ballots: [], checks: allOk, released: true, now })).toEqual([])
        expect(attentionItems({ ballots: [ballot({})], checks: allOk, released: true, now })).toEqual([])
        expect(attentionItems({ ballots: [], checks: null, released: false, now })).toEqual([])
    })
})
