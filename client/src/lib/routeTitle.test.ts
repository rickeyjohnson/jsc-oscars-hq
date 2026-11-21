import { describe, expect, it } from "vitest"
import { titleFor } from "./routeTitle"

describe("titleFor", () => {
    it("titles every route", () => {
        expect(titleFor("/")).toBe("JSC Oscars")
        expect(titleFor("/login")).toBe("Log in | JSC Oscars")
        expect(titleFor("/signup")).toBe("Create account | JSC Oscars")
        expect(titleFor("/app")).toBe("Home | JSC Oscars")
        expect(titleFor("/app/ballots")).toBe("Ballots | JSC Oscars")
        expect(titleFor("/app/ballots/abc")).toBe("Vote | JSC Oscars")
        expect(titleFor("/app/ballots/abc/submit")).toBe("Submit ballot | JSC Oscars")
        expect(titleFor("/app/profile/release")).toBe("Release results | JSC Oscars")
        expect(titleFor("/app/profile/ballots/abc")).toBe("Manage ballot | JSC Oscars")
        expect(titleFor("/app/profile/settings/myoc")).toBe("MYOC | JSC Oscars")
        expect(titleFor("/app/profile/settings")).toBe("Settings | JSC Oscars")
        expect(titleFor("/nope")).toBe("Not found | JSC Oscars")
    })
})
