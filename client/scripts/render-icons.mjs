// Renders the PWA icons from the wordmark. Run: node scripts/render-icons.mjs
// The SVGs are generated here (not hand-kept) so the PNGs and icon.svg stay in sync.
// Colors mirror src/ui/tokens.ts (bg, label, pebble lemon); pwa.test.ts pins them.
import { Resvg } from "@resvg/resvg-js"
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const out = (f) => join(root, "public", "icons", f)
const BG = "#18181B"
const CREAM = "#FFFADD"
const LEMON = "#FFD23F"
const FONT = join(root, "public/fonts/CenturyGothic/centurygothic.ttf")

// content = fraction of the canvas the artwork occupies (maskable keeps it inside the central 80%)
function svg({ withTag, scale }) {
    const s = scale
    const c = 256
    const oscarsSize = 112 * s
    const tagSize = 21 * s
    const oscarsY = c + (withTag ? 42 : 38) * s
    const tagY = oscarsY - oscarsSize * 0.78 - 14 * s
    const ruleY = oscarsY + 26 * s
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${BG}"/>
  ${withTag ? `<text x="${c}" y="${tagY}" text-anchor="middle" font-family="Century Gothic, CenturyGothic, sans-serif" font-size="${tagSize}" letter-spacing="${3 * s}" fill="${CREAM}">JUST SIDECHATTING</text>` : ""}
  <text x="${c}" y="${oscarsY}" text-anchor="middle" font-family="Century Gothic, CenturyGothic, sans-serif" font-size="${oscarsSize}" fill="${CREAM}">OSCARS</text>
  <rect x="${c - 70 * s}" y="${ruleY}" width="${140 * s}" height="${4 * s}" rx="${2 * s}" fill="${LEMON}"/>
</svg>`
}

function png(source, size, file) {
    const r = new Resvg(source, {
        fitTo: { mode: "width", value: size },
        font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: "Century Gothic" },
    })
    writeFileSync(out(file), r.render().asPng())
}

// "OSCARS" is ~3.1em wide; 112px gives ~350 of 512 (68%). Maskable: scale to ~0.8 so it is well inside the 80% circle.
const full = svg({ withTag: true, scale: 1 })
const small = svg({ withTag: false, scale: 1 }) // 192 and favicon: drop the tagline
const maskable = svg({ withTag: true, scale: 0.82 })
writeFileSync(out("icon.svg"), full)
png(small, 192, "icon-192.png")
png(full, 512, "icon-512.png")
png(maskable, 512, "icon-maskable-512.png")
png(small, 180, "apple-touch-icon.png") // opaque: the svg has a solid background
png(small, 32, "favicon-32.png")
console.log("icons written")
