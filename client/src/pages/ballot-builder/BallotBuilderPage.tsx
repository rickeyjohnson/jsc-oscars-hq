import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Save } from "lucide-react"
import NavigationBar from "../../components/NavigationBar"
import NavigationTabs from "../../components/NavigationTabs"
import { supabase } from "../../supabaseClient"
import type { BallotFormData, Category, Season } from "../../types"
import BallotBasicInfo from "./BallotBasicInfo"
import CategoryList from "./CategoryList"
import CategoryModal from "./CategoryModal"
import BulkImportPanel from "./BulkImportPanel"

const BallotBuilderPage = () => {
    const [formData, setFormData] = useState<BallotFormData>({
        season_id: "",
        name: "",
        opens_at: "",
        closes_at: "",
        categories: [],
    })
    const [seasons, setSeasons] = useState<Season[]>([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editIndex, setEditIndex] = useState<number | null>(null)
    const [importOpen, setImportOpen] = useState(false)
    const importBtnRef = useRef<HTMLButtonElement>(null)

    // Minimal season source; a later task replaces this with an API module.
    useEffect(() => {
        supabase
            .from("seasons")
            .select("*")
            .order("ceremony_at", { ascending: false })
            .then(({ data }) => setSeasons((data ?? []) as Season[]))
    }, [])

    const setCategories = (categories: Category[]) => setFormData((prev) => ({ ...prev, categories }))

    const handleSaveCategory = (category: Category) => {
        if (editIndex === null) setCategories([...formData.categories, category])
        else setCategories(formData.categories.map((c, i) => (i === editIndex ? category : c)))
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-amber-50 pb-32 font-sans selection:bg-amber-500/30">
            <NavigationBar />
            <NavigationTabs activeTab="profile" />

            <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
                <div className="px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
                    <Link to={"/app/profile"} className="flex items-center gap-2 group">
                        <div className="p-1 rounded-full bg-amber-100/5 group-hover:bg-amber-100/10 transition">
                            <ChevronRight className="w-5 h-5 rotate-180 text-amber-100/70" />
                        </div>
                        <span className="text-sm font-medium text-amber-100/70 group-hover:text-amber-100 transition">
                            Cancel
                        </span>
                    </Link>
                    <h1 className="text-base font-bold text-amber-100">Create Ballot</h1>
                    <div className="w-16" />
                </div>
            </div>

            <div className="px-4 py-6 max-w-3xl mx-auto space-y-8">
                <section className="bg-zinc-900/50 rounded-3xl p-6 border border-white/5 shadow-xl shadow-black/20">
                    <BallotBasicInfo formData={formData} setFormData={setFormData} seasons={seasons} />
                </section>

                <section>
                    <div className="flex flex-wrap items-end justify-between gap-2 mb-4 px-2">
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-xl font-bold text-amber-100 flex items-center gap-2">
                                Category count
                                <span className="text-sm font-normal text-amber-100/40 bg-white/5 px-2 py-0.5 rounded-full">
                                    {formData.categories.length}
                                </span>
                            </h2>
                            <p className="text-xs text-amber-100/50 mt-1">Drag items to reorder priority</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                ref={importBtnRef}
                                onClick={() => setImportOpen(true)}
                                className="px-4 py-2 bg-[#302f2d] text-[#fffadd] rounded-full text-sm font-bold hover:brightness-125 transition"
                            >
                                Import
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditIndex(null)
                                    setModalOpen(true)
                                }}
                                className="px-4 py-2 bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-900 rounded-xl text-sm font-bold hover:brightness-110 active:scale-95 transition flex items-center gap-2 shadow-lg shadow-amber-500/10"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                    </div>

                    <CategoryList
                        categories={formData.categories}
                        onChange={setCategories}
                        onEdit={(i) => {
                            setEditIndex(i)
                            setModalOpen(true)
                        }}
                    />
                </section>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/80 backdrop-blur-xl border-t border-white/10 sm:relative sm:bg-transparent sm:border-0 sm:backdrop-blur-none sm:p-0">
                    <button className="w-full max-w-3xl mx-auto py-4 bg-amber-100 text-zinc-900 rounded-2xl font-bold text-lg hover:bg-white active:scale-[0.98] transition shadow-xl shadow-amber-900/20 flex items-center justify-center gap-2">
                        <Save className="w-5 h-5" />
                        Publish Ballot
                    </button>
                </div>
            </div>

            <CategoryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveCategory}
                initialData={editIndex === null ? undefined : formData.categories[editIndex]}
                existingCategoriesCount={formData.categories.length}
            />
            <BulkImportPanel
                isOpen={importOpen}
                returnFocusRef={importBtnRef}
                onClose={() => setImportOpen(false)}
                existingNames={formData.categories.map((c) => c.name)}
                onImport={(cats) => setCategories([...formData.categories, ...cats])}
            />
        </div>
    )
}

export default BallotBuilderPage
