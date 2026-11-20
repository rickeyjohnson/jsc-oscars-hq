import { Trash2, GripVertical, Calendar, Clock, Trophy } from "lucide-react"
// Legacy builder types; Task 6 replaces this page.
type Nominee = { id: string; display_name: string; secondary_text?: string; user_ids: string[]; is_preset?: boolean }
type Category = { id: string; name: string; description?: string; order: number; nominees: Nominee[] }
type BallotFormData = { event_id: string; name: string; opens_at: string; closes_at: string; categories: Category[] }
type EventOption = { id: string; name: string; date: string }

// --- Basic Info Form Component ---
interface BasicInfoProps {
    formData: BallotFormData
    setFormData: (data: BallotFormData) => void
    events: EventOption[]
}

export const BallotBasicInfo: React.FC<BasicInfoProps> = ({
    formData,
    setFormData,
    events,
}) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChange = (field: keyof BallotFormData, value: any) => {
        setFormData({ ...formData, [field]: value })
    }

    return (
        <div className="space-y-5">
            {/* Event Selection */}
            <div>
                <label className="block text-sm font-bold mb-2 text-amber-100 uppercase tracking-wider">
                    Associated Event
                </label>
                <div className="relative">
                    <select
                        value={formData.event_id}
                        onChange={(e) =>
                            handleChange("event_id", e.target.value)
                        }
                        className="w-full appearance-none bg-zinc-800 border border-amber-100/10 rounded-xl px-4 py-4 pr-10 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition text-amber-100 text-base"
                    >
                        <option value="" disabled>
                            Select an Event
                        </option>
                        {events.map((evt) => (
                            <option key={evt.id} value={evt.id}>
                                {evt.name} ({evt.date})
                            </option>
                        ))}
                    </select>
                    <Trophy className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/30 pointer-events-none" />
                </div>
            </div>

            {/* Ballot Name */}
            <div>
                <label className="block text-sm font-bold mb-2 text-amber-100 uppercase tracking-wider">
                    Ballot Name
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-4 focus:outline-none focus:border-amber-100/30 transition text-amber-100 text-lg placeholder-amber-100/20"
                    placeholder="e.g. 97th Academy Awards - Main Categories"
                />
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold mb-2 text-amber-100/70 uppercase">
                        Opens At
                    </label>
                    <div className="relative">
                        <input
                            type="datetime-local"
                            value={formData.opens_at}
                            onChange={(e) =>
                                handleChange("opens_at", e.target.value)
                            }
                            className="w-full bg-zinc-800 border border-amber-100/10 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-amber-100/30 text-amber-100 text-sm [color-scheme:dark]"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/40" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-2 text-amber-100/70 uppercase">
                        Closes At
                    </label>
                    <div className="relative">
                        <input
                            type="datetime-local"
                            value={formData.closes_at}
                            onChange={(e) =>
                                handleChange("closes_at", e.target.value)
                            }
                            className="w-full bg-zinc-800 border border-amber-100/10 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-amber-100/30 text-amber-100 text-sm [color-scheme:dark]"
                        />
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/40" />
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Draggable Category Row Component ---
interface CategoryRowProps {
    category: Category
    index: number
    onDelete: (index: number) => void
    onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void
    onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void
    isDragging: boolean
}

export const DraggableCategoryRow: React.FC<CategoryRowProps> = ({
    category,
    index,
    onDelete,
    onDragStart,
    onDragEnter,
    onDragEnd,
    isDragging,
}) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()} // Necessary to allow dropping
            className={`
                relative group flex items-start gap-3 bg-zinc-800/80 border border-amber-100/10 rounded-2xl p-4 
                transition-all duration-200 ease-out
                ${
                    isDragging
                        ? "opacity-40 scale-95 border-dashed border-amber-500/50"
                        : "hover:bg-zinc-800 hover:border-amber-100/20 shadow-lg shadow-black/20"
                }
            `}
        >
            {/* Drag Handle */}
            <div className="mt-1 cursor-grab active:cursor-grabbing text-amber-100/20 hover:text-amber-100/60 p-1">
                <GripVertical className="w-6 h-6" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                    <div>
                        <h3 className="text-lg font-bold text-amber-100 truncate pr-2">
                            {category.name}
                        </h3>
                        <p className="text-xs text-amber-100/50 font-medium tracking-wide uppercase">
                            {category.nominees.length} Nominees
                        </p>
                    </div>
                </div>
                {category.description && (
                    <p className="text-sm text-amber-100/60 mt-2 line-clamp-2">
                        {category.description}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
                <button
                    onClick={() => onDelete(index)}
                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition border border-red-500/10"
                    title="Delete Category"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

import { Link } from "react-router-dom"
import { Award, ChevronRight, Plus, Save } from "lucide-react"
import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"

// Mock Data for Events (In real app, fetch from API)
const MOCK_EVENTS: EventOption[] = [
    { id: "1", name: "97th Academy Awards", date: "2025" },
    { id: "2", name: "82nd Golden Globes", date: "2025" },
]

const CreateBallotPage = () => {
    // --- State ---
    const [ballotFormData, setBallotFormData] = useState<BallotFormData>({
        event_id: "",
        name: "",
        opens_at: "",
        closes_at: "",
        categories: [],
    })

    const [dragItemIndex, setDragItemIndex] = useState<number | null>(null)
    const [, setDragOverItemIndex] = useState<number | null>(
        null
    )

    // --- Handlers ---

    // 1. Add Category (Mock implementation for demo)
    const handleAddCategory = () => {
        const newCategory: Category = {
            id: crypto.randomUUID(),
            name: `New Category ${ballotFormData.categories.length + 1}`,
            description: "Description pending...",
            order: ballotFormData.categories.length,
            nominees: [],
        }

        setBallotFormData((prev) => ({
            ...prev,
            categories: [...prev.categories, newCategory],
        }))
    }

    // 2. Delete Category
    const handleDeleteCategory = (indexToDelete: number) => {
        setBallotFormData((prev) => ({
            ...prev,
            categories: prev.categories.filter((_, i) => i !== indexToDelete),
        }))
    }

    // 3. Drag and Drop Logic
    const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDragItemIndex(index)
        // Ghost image styling fix for some browsers
        e.dataTransfer.effectAllowed = "move"
    }

    const onDragEnter = (_e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDragOverItemIndex(index)

        // If we are dragging over a different item, reorder the array immediately
        // This creates the "live sort" visual effect
        if (dragItemIndex === null || dragItemIndex === index) return

        const newCategories = [...ballotFormData.categories]
        const draggedItem = newCategories[dragItemIndex]

        // Remove item from old position
        newCategories.splice(dragItemIndex, 1)
        // Insert item at new position
        newCategories.splice(index, 0, draggedItem)

        setBallotFormData((prev) => ({ ...prev, categories: newCategories }))
        setDragItemIndex(index) // Update tracker to new position
    }

    const onDragEnd = () => {
        setDragItemIndex(null)
        setDragOverItemIndex(null)

        // Optional: Recalculate 'order' property for all items here if your backend needs it
        const reordered = ballotFormData.categories.map((cat, idx) => ({
            ...cat,
            order: idx,
        }))
        setBallotFormData((prev) => ({ ...prev, categories: reordered }))
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-amber-50 pb-32 font-sans selection:bg-amber-500/30">
            <NavigationBar />
            <NavigationTabs activeTab="profile" />

            {/* Header / Nav Back */}
            <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
                <div className="px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
                    <Link
                        to={"/app/profile"}
                        className="flex items-center gap-2 group"
                    >
                        <div className="p-1 rounded-full bg-amber-100/5 group-hover:bg-amber-100/10 transition">
                            <ChevronRight className="w-5 h-5 rotate-180 text-amber-100/70" />
                        </div>
                        <span className="text-sm font-medium text-amber-100/70 group-hover:text-amber-100 transition">
                            Cancel
                        </span>
                    </Link>
                    <h1 className="text-base font-bold text-amber-100">
                        Create Ballot
                    </h1>
                    <div className="w-16" /> {/* Spacer for centering */}
                </div>
            </div>

            <div className="px-4 py-6 max-w-3xl mx-auto space-y-8">
                {/* Section 1: Basic Info */}
                <section className="bg-zinc-900/50 rounded-3xl p-6 border border-white/5 shadow-xl shadow-black/20">
                    <BallotBasicInfo
                        formData={ballotFormData}
                        setFormData={setBallotFormData}
                        events={MOCK_EVENTS}
                    />
                </section>

                {/* Section 2: Categories */}
                <section>
                    <div className="flex items-end justify-between mb-4 px-2">
                        <div>
                            <h2 className="text-xl font-bold text-amber-100 flex items-center gap-2">
                                Categories
                                <span className="text-sm font-normal text-amber-100/40 bg-white/5 px-2 py-0.5 rounded-full">
                                    {ballotFormData.categories.length}
                                </span>
                            </h2>
                            <p className="text-xs text-amber-100/50 mt-1">
                                Drag items to reorder priority
                            </p>
                        </div>
                        <button
                            onClick={handleAddCategory}
                            className="px-4 py-2 bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-900 rounded-xl text-sm font-bold hover:brightness-110 active:scale-95 transition flex items-center gap-2 shadow-lg shadow-amber-500/10"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>

                    <div className="space-y-3 min-h-[100px]">
                        {ballotFormData.categories.length === 0 ? (
                            <div className="bg-zinc-900/50 rounded-2xl p-10 text-center border-2 border-dashed border-amber-100/10 flex flex-col items-center justify-center gap-3">
                                <div className="p-4 bg-amber-100/5 rounded-full">
                                    <Award className="w-8 h-8 text-amber-100/40" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-amber-100/60">
                                        No categories added
                                    </p>
                                    <p className="text-xs text-amber-100/30 mt-1">
                                        Start building your ballot
                                    </p>
                                </div>
                            </div>
                        ) : (
                            ballotFormData.categories.map((category, index) => (
                                <DraggableCategoryRow
                                    key={category.id}
                                    index={index}
                                    category={category}
                                    onDelete={handleDeleteCategory}
                                    onDragStart={onDragStart}
                                    onDragEnter={onDragEnter}
                                    onDragEnd={onDragEnd}
                                    isDragging={dragItemIndex === index}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Section 3: Submit Action */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/80 backdrop-blur-xl border-t border-white/10 sm:relative sm:bg-transparent sm:border-0 sm:backdrop-blur-none sm:p-0">
                    <button className="w-full max-w-3xl mx-auto py-4 bg-amber-100 text-zinc-900 rounded-2xl font-bold text-lg hover:bg-white active:scale-[0.98] transition shadow-xl shadow-amber-900/20 flex items-center justify-center gap-2">
                        <Save className="w-5 h-5" />
                        Publish Ballot
                    </button>
                </div>
            </div>
        </div>
    )
}
import { Users, X, Link as LinkIcon } from "lucide-react";

// --- 1. Basic Info Inputs ---
interface CategoryBasicInputsProps {
    name: string;
    description: string;
    onNameChange: (val: string) => void;
    onDescChange: (val: string) => void;
}

export const CategoryBasicInputs: React.FC<CategoryBasicInputsProps> = ({ name, description, onNameChange, onDescChange }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-sm font-bold mb-2 text-amber-100 uppercase tracking-wide">Category Name</label>
            <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 text-lg placeholder-amber-100/20"
                placeholder="e.g. Best Picture"
                autoFocus
            />
        </div>
        <div>
            <label className="block text-sm font-bold mb-2 text-amber-100 uppercase tracking-wide">Description (Optional)</label>
            <textarea
                value={description}
                onChange={(e) => onDescChange(e.target.value)}
                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 resize-none placeholder-amber-100/20"
                placeholder="e.g. Vote for the best film of the year"
                rows={2}
            />
        </div>
    </div>
);

// --- 2. Preset Selector ---
interface PresetSelectorProps {
    presets: string[]; // List of names available
    currentNominees: Nominee[];
    onToggle: (name: string) => void;
    onSelectAll: () => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({ presets, currentNominees, onToggle, onSelectAll }) => {
    const isSelected = (name: string) => currentNominees.some(n => n.display_name === name && n.is_preset);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-amber-100 uppercase tracking-wide">Preset Nominees</label>
                <button
                    onClick={onSelectAll}
                    className="px-3 py-1.5 bg-amber-100/10 text-amber-100 rounded-lg text-xs font-bold hover:bg-amber-100/20 transition border border-amber-100/20 flex items-center gap-2"
                >
                    <Users className="w-3 h-3" />
                    Select All
                </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presets.map((name) => {
                    const active = isSelected(name);
                    return (
                        <button
                            key={name}
                            onClick={() => onToggle(name)}
                            className={`
                                py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition truncate border-2
                                ${active
                                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                                }
                            `}
                        >
                            {name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// --- 3. Custom Nominee Builder ---
interface CustomBuilderProps {
    onAdd: (nominee: Nominee) => void;
}

export const CustomNomineeBuilder: React.FC<CustomBuilderProps> = ({ onAdd }) => {
    const [name, setName] = useState("");
    const [values, setValues] = useState<string[]>([""]);

    const handleAddValue = () => setValues([...values, ""]);
    const handleValueChange = (idx: number, val: string) => {
        const newValues = [...values];
        newValues[idx] = val;
        setValues(newValues);
    };
    const handleRemoveValue = (idx: number) => setValues(values.filter((_, i) => i !== idx));

    const handleSubmit = () => {
        if (!name.trim()) return;
        const cleanValues = values.filter(v => v.trim() !== "");
        
        const newNominee: Nominee = {
            id: crypto.randomUUID(),
            display_name: name,
            secondary_text: cleanValues.length > 0 ? cleanValues.join(", ") : undefined,
            user_ids: [], // Mock: Empty for now
            is_preset: false
        };

        onAdd(newNominee);
        // Reset form
        setName("");
        setValues([""]);
    };

    return (
        <div className="bg-zinc-950/30 border border-amber-100/10 rounded-2xl p-5 space-y-4">
            <label className="block text-sm font-bold text-amber-100 uppercase tracking-wide">Add Custom Nominee</label>
            
            {/* Main Name */}
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 placeholder-amber-100/20"
                placeholder="Main Name (e.g. Barbie)"
            />

            {/* Sub-Values */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-100/50 uppercase">Values / Credits</label>
                    <button onClick={handleAddValue} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold">
                        <Plus className="w-3 h-3" /> Add Value
                    </button>
                </div>
                {values.map((val, idx) => (
                    <div key={idx} className="flex gap-2">
                        <input
                            type="text"
                            value={val}
                            onChange={(e) => handleValueChange(idx, e.target.value)}
                            className="flex-1 bg-zinc-900 border border-amber-100/10 rounded-lg px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-100/30"
                            placeholder="e.g. Margot Robbie"
                        />
                         <button className="px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition" title="Link User">
                            <LinkIcon className="w-4 h-4" />
                        </button>
                        {values.length > 1 && (
                            <button onClick={() => handleRemoveValue(idx)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={handleSubmit}
                disabled={!name.trim()}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/20"
            >
                Add Nominee
            </button>
        </div>
    );
};

// --- 4. Selected List ---
interface NomineeListProps {
    nominees: Nominee[];
    onRemove: (id: string) => void;
}

export const SelectedNomineeList: React.FC<NomineeListProps> = ({ nominees, onRemove }) => (
    <div className="space-y-2">
        <label className="block text-sm font-bold text-amber-100 uppercase tracking-wide">
            Selected ({nominees.length})
        </label>
        <div className="bg-zinc-900 rounded-xl p-2 max-h-48 overflow-y-auto border border-amber-100/5 space-y-1 custom-scrollbar">
            {nominees.length === 0 ? (
                <div className="text-center py-8 text-amber-100/30 text-sm">No nominees added yet</div>
            ) : (
                nominees.map((n, i) => (
                    <div key={n.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition group border border-transparent hover:border-amber-100/10">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {i + 1}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-amber-100 truncate">{n.display_name}</div>
                                {n.secondary_text && (
                                    <div className="text-xs text-amber-100/50 truncate">{n.secondary_text}</div>
                                )}
                            </div>
                        </div>
                        <button onClick={() => onRemove(n.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))
            )}
        </div>
    </div>
);

import React, { useState, useEffect } from "react";

// Mock Data for Presets (This would come from your backend)
const MOCK_PRESETS = ["User A", "User B", "User C", "User D", "User E", "User F"];

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Category) => void;
    initialData?: Category; // If editing
    existingCategoriesCount: number; // For default ordering
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData,
    existingCategoriesCount 
}) => {
    // --- State ---
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [nominees, setNominees] = useState<Nominee[]>([]);

    // --- Effects ---
    // Load initial data if editing, or reset if adding new
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setDescription(initialData.description || "");
                setNominees(initialData.nominees);
            } else {
                setName("");
                setDescription("");
                setNominees([]);
            }
        }
    }, [isOpen, initialData]);

    // --- Handlers ---
    
    // Toggle Preset Nominee
    const handleTogglePreset = (presetName: string) => {
        const exists = nominees.find(n => n.display_name === presetName && n.is_preset);
        
        if (exists) {
            setNominees(prev => prev.filter(n => n.id !== exists.id));
        } else {
            const newNominee: Nominee = {
                id: crypto.randomUUID(),
                display_name: presetName,
                user_ids: [], // Would link to real user ID here
                is_preset: true
            };
            setNominees(prev => [...prev, newNominee]);
        }
    };

    // Select All Presets
    const handleSelectAll = () => {
        const newNominees = [...nominees];
        MOCK_PRESETS.forEach(preset => {
            if (!newNominees.some(n => n.display_name === preset && n.is_preset)) {
                newNominees.push({
                    id: crypto.randomUUID(),
                    display_name: preset,
                    user_ids: [],
                    is_preset: true
                });
            }
        });
        setNominees(newNominees);
    };

    // Add Custom Nominee
    const handleAddCustom = (nominee: Nominee) => {
        setNominees(prev => [...prev, nominee]);
    };

    // Remove Any Nominee
    const handleRemoveNominee = (id: string) => {
        setNominees(prev => prev.filter(n => n.id !== id));
    };

    // Save
    const handleSave = () => {
        if (!name.trim()) return;

        const categoryData: Category = {
            id: initialData?.id || crypto.randomUUID(),
            name,
            description,
            order: initialData?.order ?? existingCategoriesCount,
            nominees
        };

        onSave(categoryData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-zinc-900 border border-amber-100/20 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-amber-100/5 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-2xl font-black text-amber-100">
                        {initialData ? 'Edit Category' : 'Add Category'}
                    </h2>
                    <p className="text-sm text-amber-100/60 mt-1">
                        Configure category details and nominees
                    </p>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 sm:p-8 overflow-y-auto space-y-8 custom-scrollbar">
                    <CategoryBasicInputs 
                        name={name} 
                        description={description} 
                        onNameChange={setName} 
                        onDescChange={setDescription} 
                    />

                    <hr className="border-amber-100/5" />

                    <PresetSelector 
                        presets={MOCK_PRESETS} 
                        currentNominees={nominees} 
                        onToggle={handleTogglePreset}
                        onSelectAll={handleSelectAll}
                    />

                    <CustomNomineeBuilder onAdd={handleAddCustom} />

                    <SelectedNomineeList 
                        nominees={nominees} 
                        onRemove={handleRemoveNominee} 
                    />
                </div>

                {/* Footer Buttons */}
                <div className="p-6 bg-zinc-900 border-t border-amber-100/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-zinc-800 text-amber-100/70 rounded-xl font-bold hover:bg-zinc-700 hover:text-amber-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 py-3.5 bg-amber-100 text-zinc-950 rounded-xl font-bold hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/10"
                    >
                        {initialData ? 'Save Changes' : 'Create Category'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default CreateBallotPage
