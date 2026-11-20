import OscarLogo, { LOGO_SIZES } from "../../components/OscarLogo"
import { PEBBLES } from "../../ui/logic/pebble"
import { PEBBLE_CLASS } from "../../ui/logic/pebble"

function Placement({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <div className="min-w-0">
            <p className="text-footnote text-label-2 mb-2">{title}</p>
            <div className={`rounded-card overflow-hidden ${className}`}>{children}</div>
        </div>
    )
}

export default function Logo() {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-headline mb-3">Every size</h3>
                <div className="flex flex-col gap-4 items-start overflow-hidden">
                    {LOGO_SIZES.map((s) => (
                        <div key={s} className="max-w-full">
                            <p className="text-caption-1 text-label-2">{s}</p>
                            <OscarLogo size={s} decorative />
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Placement title="Landing hero over the falling-avatar strip" className="relative bg-bg py-8 border border-sep">
                    <div className="absolute inset-0 flex justify-around items-start opacity-80" aria-hidden>
                        {PEBBLES.map((p, i) => (
                            <span key={p} className={`size-8 rounded-full ${PEBBLE_CLASS[p].bg}`} style={{ marginTop: `${(i % 3) * 18}px` }} />
                        ))}
                    </div>
                    <div className="relative">
                        <OscarLogo size="medium" as="h1" />
                    </div>
                </Placement>

                <Placement title="Auth header" className="bg-bg py-6 border border-sep">
                    <OscarLogo size="small" decorative />
                </Placement>

                <Placement title="NavBar compact (xxsmall on material-bar)" className="bg-linear-to-r from-pebble-strawberry via-pebble-sky to-pebble-lime">
                    <div className="material-bar px-gutter py-2 flex justify-center">
                        <OscarLogo size="xxsmall" decorative />
                    </div>
                </Placement>

                <Placement title="Home header (small)" className="bg-bg py-6 border border-sep">
                    <OscarLogo size="small" decorative />
                </Placement>

                <Placement title="Sidebar top (xsmall, shown at 1280)" className="bg-surface w-60 py-4">
                    <OscarLogo size="xsmall" decorative />
                </Placement>

                <Placement title="Release header on lemon (tone=onLemon)" className="bg-pebble-lemon py-6">
                    <OscarLogo size="small" tone="onLemon" decorative />
                </Placement>

                <Placement title="Release hold on lime (tone=onLime)" className="bg-pebble-lime py-6">
                    <OscarLogo size="small" tone="onLime" decorative />
                </Placement>

                <Placement title="Reveal header" className="bg-bg py-6 border border-sep">
                    <OscarLogo size="medium" decorative />
                </Placement>
            </div>
        </div>
    )
}
