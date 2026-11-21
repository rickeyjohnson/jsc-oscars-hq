import { useEffect, useRef, useState } from "react"
import { SheetActions } from "../../ui/SheetActions"
import { Sheet } from "../../ui/Sheet"
import { Button } from "../../ui/Button"
import { parseCategoryImport } from "../../lib/categoryImport"
import type { Category } from "../../types"

interface BulkImportPanelProps {
    isOpen: boolean
    onClose: () => void
    existingNames: string[]
    onImport: (categories: Category[]) => void
    returnFocusRef?: React.RefObject<HTMLElement | null>
}

// Bottom sheet for bulk category import.
const BulkImportPanel: React.FC<BulkImportPanelProps> = ({ isOpen, onClose, existingNames, onImport, returnFocusRef }) => {
    const [text, setText] = useState("")
    const [duplicates, setDuplicates] = useState<string[]>([])
    const fileRef = useRef<HTMLInputElement>(null)


    // Sheet provides Escape, the body scroll lock and focus trapping; keep focus returning to the opener.
    useEffect(() => {
        if (!isOpen) return
        return () => returnFocusRef?.current?.focus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const parsed = parseCategoryImport(text)
    const count = parsed.categories.length

    const close = () => {
        setText("")
        setDuplicates([])
        onClose()
    }

    const handleImport = () => {
        const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()))
        const fresh = parsed.categories.filter((c) => !existing.has(c.name.toLowerCase()))
        const skipped = [
            ...parsed.duplicates,
            ...parsed.categories.filter((c) => existing.has(c.name.toLowerCase())).map((c) => c.name),
        ]
        onImport(
            fresh.map((c, i) => ({
                id: crypto.randomUUID(),
                name: c.name,
                description: c.description,
                order: existingNames.length + i,
                nominee_mode: "everyone",
                allow_member_add: false,
                nominees: [],
            }))
        )
        setText("")
        if (skipped.length === 0) onClose()
        setDuplicates(skipped)
    }

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setText(await file.text())
            setDuplicates([])
        }
        e.target.value = ""
    }

    return (
        <Sheet
            open={isOpen}
            onClose={close}
            title="Import categories"
            detents={["large"]}
            width="wide"
            footer={
                <SheetActions>
                    <Button variant="primary" fullWidth onClick={handleImport} disabled={count === 0}>
                        Import {count}
                    </Button>
                    <Button variant="tinted" fullWidth onClick={() => fileRef.current?.click()}>
                        Choose file
                    </Button>
                </SheetActions>
            }
        >
            <p className="text-footnote text-label-2 mb-3">One per line: Name | Description, or a CSV with name,description columns</p>
            <textarea
                value={text}
                onChange={(e) => {
                    setText(e.target.value)
                    setDuplicates([])
                }}
                rows={6}
                aria-label="Categories to import"
                data-autofocus
                className="bg-fill text-label placeholder:text-label-3 text-subhead w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent"
                placeholder={"Best Locs | Who has the best locs\nMegaphone Award | Loudest"}
            />
            {duplicates.length > 0 && (
                <p className="text-footnote text-warn mt-2">
                    {duplicates.length} duplicate{duplicates.length === 1 ? "" : "s"} skipped: {duplicates.map((d) => `"${d}"`).join(", ")}
                </p>
            )}
            <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFile} />
        </Sheet>
    )
}

export default BulkImportPanel
