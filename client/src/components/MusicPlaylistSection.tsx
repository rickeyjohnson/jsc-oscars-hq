import { Music, Plus } from "lucide-react"

const Song = () => {
    return (
        <div className="bg-zinc-900/40 rounded-xl p-3 border border-green-100/10">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-lime-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-amber-100 truncate">
                        Shallow - Lady Gaga
                    </div>
                    <div className="text-xs text-amber-100/60">
                        Added by Alex
                    </div>
                </div>
            </div>
        </div>
    )
}

const MusicPlaylistSection = () => {
    return (
        <>
            <div className="bg-gradient-to-br from-green-500/10 to-lime-500/10 border border-green-500/20 rounded-3xl p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-lime-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Music className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                Oscar Party Playlist
                            </h3>
                            <span className="text-xs text-amber-100/60 ml-auto">
                                24 songs
                            </span>
                        </div>
                        <p className="text-sm text-amber-100/70 mb-4">
                            Everyone's favorite tracks for Oscar night! Add your
                            songs to the communal playlist.
                        </p>
                    </div>
                </div>
                <div className="space-y-2 mb-4">
                    <Song />
                </div>
                <button className="w-full bg-gradient-to-r from-green-500 to-lime-500 text-white rounded-xl py-3 font-bold hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Your Song
                </button>
            </div>
        </>
    )
}

export default MusicPlaylistSection
