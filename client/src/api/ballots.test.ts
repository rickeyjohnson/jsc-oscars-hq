import { describe, it, expect } from "vitest"
import { assertDraft } from "./ballots"

describe("assertDraft", () => {
    it("allows draft", () => expect(() => assertDraft("draft")).not.toThrow())
    it("rejects open", () => expect(() => assertDraft("open")).toThrow("Only draft ballots can be rewritten"))
})
