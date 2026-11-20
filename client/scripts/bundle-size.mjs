import { readdirSync, readFileSync, statSync, existsSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist")
const kb = (n) => (n / 1024).toFixed(1) + " KB"
let js = 0, css = 0, fonts = 0

const assets = join(dist, "assets")
if (existsSync(assets)) {
    for (const f of readdirSync(assets)) {
        if (!/\.(js|css)$/.test(f)) continue
        const gz = gzipSync(readFileSync(join(assets, f))).length
        console.log(`${f}  gzip ${kb(gz)}`)
        if (f.endsWith(".js")) js += gz
        else css += gz
    }
}
const walk = (d) => {
    for (const f of readdirSync(d)) {
        const p = join(d, f)
        if (statSync(p).isDirectory()) walk(p)
        else {
            const s = statSync(p).size
            console.log(`${p.slice(dist.length + 1)}  raw ${kb(s)}`)
            fonts += s
        }
    }
}
if (existsSync(join(dist, "fonts"))) walk(join(dist, "fonts"))
console.log(`\nTOTAL js gzip ${kb(js)} | css gzip ${kb(css)} | fonts raw ${kb(fonts)}`)
