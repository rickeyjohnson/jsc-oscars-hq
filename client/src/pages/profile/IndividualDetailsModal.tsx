import Modal from "../../components/Modal"



const IndividualDetailsModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void 
}) => {
    return (
        <Modal onClose={onClose} isOpen={isOpen}>
            <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 ${selectedUser.color} rounded-full flex items-center justify-center text-white font-black text-2xl`}>
                  {selectedUser.initial}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-amber-100">{selectedUser.name}</h2>
                  <p className="text-sm text-amber-100/60">Edit Statistics</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Wins</label>
                    <input
                      type="number"
                      value={editUserStats.wins}
                      onChange={(e) => setEditUserStats({ ...editUserStats, wins: parseInt(e.target.value) || 0 })}
                      className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nominations</label>
                    <input
                      type="number"
                      value={editUserStats.nominations}
                      onChange={(e) => setEditUserStats({ ...editUserStats, nominations: parseInt(e.target.value) || 0 })}
                      className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Win Rate (%)</label>
                    <input
                      type="number"
                      value={editUserStats.winRate}
                      onChange={(e) => setEditUserStats({ ...editUserStats, winRate: parseInt(e.target.value) || 0 })}
                      className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Categories Won</label>
                  
                  {/* Add New Category Won */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newCategoryWon.category}
                      onChange={(e) => setNewCategoryWon({ ...newCategoryWon, category: e.target.value })}
                      className="flex-1 bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                      placeholder="Best Picture"
                    />
                    <input
                      type="number"
                      value={newCategoryWon.year}
                      onChange={(e) => setNewCategoryWon({ ...newCategoryWon, year: e.target.value })}
                      className="w-24 bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                      placeholder="2024"
                    />
                    <button
                      onClick={() => {
                        if (newCategoryWon.category && newCategoryWon.year) {
                          setEditUserStats({
                            ...editUserStats,
                            categoriesWon: [...editUserStats.categoriesWon, { 
                              category: newCategoryWon.category, 
                              year: parseInt(newCategoryWon.year) 
                            }]
                          });
                          setNewCategoryWon({ category: '', year: '' });
                        }
                      }}
                      className="px-4 bg-amber-100 text-zinc-900 rounded-xl font-bold hover:bg-amber-200 transition"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* List of Categories Won */}
                  <div className="bg-zinc-800/50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                    {editUserStats.categoriesWon.length === 0 ? (
                      <p className="text-sm text-amber-100/40 text-center py-4">No categories won yet</p>
                    ) : (
                      editUserStats.categoriesWon.map((cat, index) => (
                        <div key={index} className="flex items-center justify-between bg-amber-100/10 rounded-lg px-3 py-2">
                          <div>
                            <div className="text-sm font-bold text-amber-100">{cat.category}</div>
                            <div className="text-xs text-amber-100/60">{cat.year}</div>
                          </div>
                          <button
                            onClick={() => {
                              setEditUserStats({
                                ...editUserStats,
                                categoriesWon: editUserStats.categoriesWon.filter((_, i) => i !== index)
                              });
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
        </Modal>
    )
}

export default IndividualDetailsModal
