import { describe, it, expect } from "vitest"
import { parseCsv, toCsvRow } from "./csv"

describe("csv", () => {
    it("quotes cells that need it", () => {
        expect(toCsvRow(["a", "b, c", 'say "hi"'])).toBe('a,"b, c","say ""hi"""')
        expect(toCsvRow(["line\nbreak", "cr\rx"])).toBe('"line\nbreak","cr\rx"')
    })
    it("parses quoted cells", () => {
        expect(parseCsv('x,"b, c"\n1,"q ""z"""\n')).toEqual([["x", "b, c"], ["1", 'q "z"']])
    })
    it("handles CRLF", () => {
        expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([["a", "b"], ["c", "d"]])
    })
})
