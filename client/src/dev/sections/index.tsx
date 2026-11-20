import type { ComponentType } from "react"
import Foundations from "./Foundations"
import Type from "./Type"
import Logo from "./Logo"

export type GallerySection = { id: string; title: string; Component: ComponentType }

function placeholder(name: string): ComponentType {
    return function Placeholder() {
        return <p className="text-callout text-label-2">Placeholder: {name} is added by a later task.</p>
    }
}

// Later tasks replace a placeholder with the real section.
const UPCOMING = ["Buttons", "Pebbles and chips", "Cards and lists", "Inputs", "Sheets and dialogs", "Navigation", "Motion", "Feedback"]

export const SECTIONS: GallerySection[] = [
    { id: "foundations", title: "Foundations", Component: Foundations },
    { id: "type", title: "Type", Component: Type },
    { id: "logo", title: "Logo", Component: Logo },
    ...UPCOMING.map((t) => ({ id: t.toLowerCase().replace(/[^a-z]+/g, "-"), title: t, Component: placeholder(t) })),
]
