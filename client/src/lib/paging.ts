// Collects every page from a range-based fetcher (hosted API caps responses at 1000 rows).
export const fetchAllPages = async <T>(fetchPage: (from: number, to: number) => Promise<T[]>, pageSize = 1000): Promise<T[]> => {
    const all: T[] = []
    for (let from = 0; ; from += pageSize) {
        const page = await fetchPage(from, from + pageSize - 1)
        all.push(...page)
        if (page.length < pageSize) return all
    }
}
