import { afterEach, vi } from "vitest"

// Node is the default environment; DOM tests opt in with `// @vitest-environment jsdom`.
if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react")
    afterEach(cleanup)

    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return [] }
    }
    vi.stubGlobal("IntersectionObserver", NoopObserver)
    vi.stubGlobal("ResizeObserver", NoopObserver)
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
}
