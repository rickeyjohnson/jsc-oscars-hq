import { Award, Plus } from "lucide-react"

const CustomCategory = () => {
    return (
        <div className="bg-zinc-900/40 rounded-xl p-4 border border-amber-100/10">
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-amber-100">
                    🔥 Best Hot Take
                </span>
                <span className="text-xs text-amber-100/40">
                    Created by Jordan
                </span>
            </div>
            <p className="text-xs text-amber-100/60">
                Most controversial Oscar opinion
            </p>
        </div>
    )
}

const MakeYourOwnCategories = () => {
    return (
        <>
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-amber-100">
                            Make Your Own Category
                        </h3>
                        <p className="text-sm text-amber-100/70">
                            Create custom awards for the group!
                        </p>
                    </div>
                </div>

                <div className="space-y-3 mb-4">
                    <CustomCategory />
                </div>

                <button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl py-3 font-bold hover:from-blue-600 hover:to-cyan-600 transition flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create New Category
                </button>
            </div>
        </>
    )
}

export default MakeYourOwnCategories
