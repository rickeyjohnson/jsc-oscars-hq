import type { ComponentType } from "react"
import Foundations from "./Foundations"
import Type from "./Type"
import Logo from "./Logo"
import PrimitivesA from "./PrimitivesA"
import PrimitivesB from "./PrimitivesB"
import Shell from "./Shell"
import Sheets from "./Sheets"
import Reveal from "./Reveal"

export type GallerySection = { id: string; title: string; Component: ComponentType }

function placeholder(name: string): ComponentType {
    return function Placeholder() {
        return <p className="text-callout text-label-2">Placeholder: {name} is added by a later task.</p>
    }
}

// Later tasks replace a placeholder with the real section.
const UPCOMING = ["Inputs", "Motion", "Feedback"]

export const SECTIONS: GallerySection[] = [
    { id: "foundations", title: "Foundations", Component: Foundations },
    { id: "type", title: "Type", Component: Type },
    { id: "logo", title: "Logo", Component: Logo },
    { id: "primitives-a", title: "Primitives A", Component: PrimitivesA },
    { id: "primitives-b", title: "Primitives B", Component: PrimitivesB },
    { id: "navigation", title: "Navigation", Component: Shell },
    { id: "sheets-and-dialogs", title: "Sheets and dialogs", Component: Sheets },
    { id: "reveal", title: "Reveal", Component: Reveal },
    ...UPCOMING.map((t) => ({ id: t.toLowerCase().replace(/[^a-z]+/g, "-"), title: t, Component: placeholder(t) })),
]
