export type RGBA = { r: number; g: number; b: number; a: number }

export function parseColor(c: string): RGBA {
    const s = c.trim()
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3) h = h.split("").map((x) => x + x).join("")
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 }
    }
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/i.exec(s)
    if (!m) throw new Error(`Unsupported color: ${c}`)
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4])
    return { r: +m[1], g: +m[2], b: +m[3], a }
}

export function composite(fg: string, bg: string): { r: number; g: number; b: number } {
    const f = parseColor(fg)
    const b = parseColor(bg)
    return {
        r: f.r * f.a + b.r * (1 - f.a),
        g: f.g * f.a + b.g * (1 - f.a),
        b: f.b * f.a + b.b * (1 - f.a),
    }
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
    const lin = (v: number) => {
        const x = v / 255
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// bg is treated as opaque; a translucent fg is composited over it.
export function contrastRatio(fg: string, bg: string): number {
    const l1 = luminance(composite(fg, bg))
    const l2 = luminance(parseColor(bg))
    const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
    return (hi + 0.05) / (lo + 0.05)
}
