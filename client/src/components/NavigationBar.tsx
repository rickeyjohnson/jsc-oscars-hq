import OscarLogo from "./OscarLogo"

const NavigationBar = () => {
    return (
        <div className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-sm border-b border-amber-100/10">
            <div className="px-6 py-4">
                <OscarLogo size={"xsmall"} />
            </div>
        </div>
    )
}

export default NavigationBar
