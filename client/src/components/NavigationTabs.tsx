import { BarChart3, Home, User, Vote } from "lucide-react"

const NavigationTabs = ({ activeTab = "home" }: { activeTab: string }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-sm border-t border-amber-100/10 px-6 py-4">
            <div className="flex justify-around items-center max-w-2xl mx-auto">
                <button
                    className={`flex flex-col items-center gap-1 transition ${
                        activeTab === "home"
                            ? "text-amber-100"
                            : "text-amber-100/40"
                    }`}
                >
                    <Home className="w-6 h-6" />
                    <span className="text-xs font-medium">Home</span>
                </button>

                <button
                    className={`flex flex-col items-center gap-1 transition ${
                        activeTab === "ballot"
                            ? "text-amber-100"
                            : "text-amber-100/40"
                    }`}
                >
                    <Vote className="w-6 h-6" />
                    <span className="text-xs font-medium">Ballot</span>
                </button>

                <button
                    className={`flex flex-col items-center gap-1 transition ${
                        activeTab === "stats"
                            ? "text-amber-100"
                            : "text-amber-100/40"
                    }`}
                >
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-xs font-medium">Stats</span>
                </button>

                <button
                    className={`flex flex-col items-center gap-1 transition ${
                        activeTab === "profile"
                            ? "text-amber-100"
                            : "text-amber-100/40"
                    }`}
                >
                    <User className="w-6 h-6" />
                    <span className="text-xs font-medium">Profile</span>
                </button>
            </div>
        </div>
    )
}

export default NavigationTabs
