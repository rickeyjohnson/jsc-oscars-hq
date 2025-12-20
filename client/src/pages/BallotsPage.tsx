import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import { useState } from "react"
import BallotCard from "../components/BallotCard"

const BallotsPage = () => {
    const [selectedCategory, setSelectedCategory] = useState("all")
    const baseClasses =
        "px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors"

    const selectedClasses = "bg-amber-100 text-zinc-900 font-bold"
    const unselectedClasses =
        "bg-amber-100/10 text-amber-100 border-amber-100/20 font-medium"

    return (
        <div>
            <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
                <NavigationBar />
                <main>
                    <div className="space-y-6 p-6">
                        <h2 className="text-3xl font-black">Ballots</h2>

                        {/* Filter Tabs */}
                        <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2">
                            {/* All Time */}
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className={`${baseClasses} ${
                                    selectedCategory === "all"
                                        ? selectedClasses
                                        : unselectedClasses
                                }`}
                            >
                                All
                            </button>
                            {["Open", "Voted", "Closed"].map((category) => (
                                <button
                                    key={category}
                                    onClick={() =>
                                        setSelectedCategory(category)
                                    }
                                    className={`${baseClasses} ${
                                        selectedCategory === category
                                            ? selectedClasses
                                            : unselectedClasses
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        {/* Ballot Cards */}
                        <div className="space-y-4">
                            {[].map((ballot, index) => (
                                <BallotCard key={index} ballot={ballot} />
                            )) && (
                                <div className="text-center">No ballots</div>
                            )}{" "}
                            {/* replace key */}
                        </div>
                    </div>
                </main>
                <NavigationTabs activeTab={"ballots"} />
            </div>
        </div>
    )
}

export default BallotsPage
