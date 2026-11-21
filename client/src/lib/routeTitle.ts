// Document title for every route (screen readers announce it on navigation).
const SUFFIX = "JSC Oscars"

const TITLES: [RegExp, string][] = [
    [/^\/$/, ""],
    [/^\/login\/reset\/?$/, "Reset password"],
    [/^\/login\/?$/, "Log in"],
    [/^\/signup\/confirmed\/?$/, "Email confirmed"],
    [/^\/signup\/?$/, "Create account"],
    [/^\/claim\/?$/, "Claim your name"],
    [/^\/app\/profile\/release\/?$/, "Release results"],
    [/^\/app\/ballots\/[^/]+\/submit\/?$/, "Submit ballot"],
    [/^\/app\/ballots\/[^/]+\/?$/, "Vote"],
    [/^\/app\/ballots\/?$/, "Ballots"],
    [/^\/app\/results\/?$/, "Results"],
    [/^\/app\/profile\/settings\/?$/, "Settings"],
    [/^\/app\/profile\/ballots\/create\/?$/, "New ballot"],
    [/^\/app\/profile\/ballots\/[^/]+\/?$/, "Manage ballot"],
    [/^\/app\/profile\/ballots\/?$/, "Manage ballots"],
    [/^\/app\/profile\/members\/?$/, "Member names"],
    [/^\/app\/profile\/?$/, "You"],
    [/^\/app\/?$/, "Home"],
]

export function titleFor(pathname: string): string {
    const hit = TITLES.find(([re]) => re.test(pathname))
    if (!hit) return `Not found | ${SUFFIX}`
    return hit[1] ? `${hit[1]} | ${SUFFIX}` : SUFFIX
}
