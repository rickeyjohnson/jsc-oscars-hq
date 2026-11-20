import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
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


    useEffect(() => {
        if (!isOpen) return
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeRef.current()
        }
        document.addEventListener("keydown", onKey)
        return () => {
            document.body.style.overflow = prevOverflow
            document.removeEventListener("keydown", onKey)
            returnFocusRef?.current?.focus()
        }
    }, [isOpen])

    const parsed = parseCategoryImport(text)
    const count = parsed.categories.length

    const close = () => {
        setText("")
        setDuplicates([])
        onClose()
    }

    const closeRef = useRef(close)
    useEffect(() => {
        closeRef.current = close
    })

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
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    <motion.div
                        className="absolute inset-0 bg-black/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={close}
                    />
                    <motion.div
                        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-zinc-800 rounded-t-3xl p-5 pb-8 text-[#fffadd] shadow-2xl"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Import categories"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "tween", duration: 0.25 }}
                    >
                        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#fffadd]/20" />
                        <h2 className="text-lg font-bold">Import categories</h2>
                        <p className="text-xs text-[#fffadd]/60 mt-1 mb-3">
                            One per line: Name | Description, or a CSV with name,description columns
                        </p>
                        <textarea
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value)
                                setDuplicates([])
                            }}
                            rows={6}
                            autoFocus
                            className="w-full bg-zinc-900 border border-amber-100/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-100/30 placeholder-amber-100/20"
                            placeholder={"Best Locs | Who has the best locs\nMegaphone Award | Loudest"}
                        />
                        {duplicates.length > 0 && (
                            <p className="text-xs text-amber-400 mt-2">
                                {duplicates.length} duplicate{duplicates.length === 1 ? "" : "s"} skipped:{" "}
                                {duplicates.map((d) => `"${d}"`).join(", ")}
                            </p>
                        )}
                        <div className="mt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={count === 0}
                                className="flex-1 py-3 rounded-full bg-[#fffadd] text-black font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Import {count}
                            </button>
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="px-5 py-3 rounded-full bg-[#302f2d] text-[#fffadd] font-bold"
                            >
                                Choose file
                            </button>
                            <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFile} />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default BulkImportPanel
