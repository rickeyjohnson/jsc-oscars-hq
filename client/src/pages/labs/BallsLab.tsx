/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react"
import { Bodies, Body, Composite, Engine, Events, Mouse, MouseConstraint, Render, Runner } from "matter-js"
import { Feather, RotateCcw, Zap } from "lucide-react"
import { fetchMemberAvatars, fetchMembers } from "../../api/members"
import type { Member } from "../../types"
import { Button } from "../../ui/Button"
import { ErrorState } from "../../ui/ErrorState"
import { Screen } from "../../ui/Screen"
import { PEBBLE_COLORS } from "../../ui/tokens"
import { pebbleFor } from "../../ui/logic/pebble"
import { settledLayout } from "../../ui/logic/settle"

const WALL = 200
const RING = 3
const GAP = 2

const radiusFor = (count: number, w: number, h: number) => Math.max(22, Math.min(44, Math.sqrt((w * h) / Math.max(1, count)) / 3.1))

/** A ball pit of everyone's profile photo. Drag and toss them, shake the pile, switch gravity off. */
const BallsLab = () => {
    const hostRef = useRef<HTMLDivElement | null>(null)
    const api = useRef<{ shake: () => void; reset: () => void; setFloat: (on: boolean) => void } | null>(null)
    const [people, setPeople] = useState<{ members: Member[]; avatars: Record<string, string | null> } | null>(null)
    const [failed, setFailed] = useState(false)
    const [attempt, setAttempt] = useState(0)
    const [held, setHeld] = useState<string | null>(null)
    const [float, setFloat] = useState(false)
    const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    useEffect(() => {
        let live = true
        Promise.all([fetchMembers(), fetchMemberAvatars().catch(() => ({}) as Record<string, string | null>)])
            .then(([members, avatars]) => live && setPeople({ members, avatars }))
            .catch((e) => {
                console.error(e)
                if (live) setFailed(true)
            })
        return () => {
            live = false
        }
    }, [attempt])

    useEffect(() => {
        const host = hostRef.current
        if (!host || !people || people.members.length === 0) return
        let w = host.clientWidth
        let h = host.clientHeight
        const engine: any = Engine.create()
        engine.gravity.y = 1
        const render: any = Render.create({ element: host, engine, options: { width: w, height: h, wireframes: false, background: "transparent", pixelRatio: window.devicePixelRatio } as any })
        render.canvas.setAttribute("aria-hidden", "true")
        render.canvas.style.touchAction = "none"

        const walls = () => [
            Bodies.rectangle(w / 2, h + WALL / 2, w + WALL * 2, WALL, { isStatic: true }),
            Bodies.rectangle(w / 2, -WALL / 2, w + WALL * 2, WALL, { isStatic: true }),
            Bodies.rectangle(-WALL / 2, h / 2, WALL, h + WALL * 2, { isStatic: true }),
            Bodies.rectangle(w + WALL / 2, h / 2, WALL, h + WALL * 2, { isStatic: true }),
        ]
        let wallBodies: any = walls()
        Composite.add(engine.world, wallBodies)

        const r = radiusFor(people.members.length, w, h)
        const balls: any = people.members.map((m) => {
            const body: any = Bodies.circle(Math.random() * (w - r * 2) + r, -Math.random() * 400 - r, r, { restitution: 0.8, friction: 0.1, frictionAir: 0.01, render: { visible: false } })
            body.radius = r
            body.memberName = m.name
            body.ring = PEBBLE_COLORS[pebbleFor(m.id)]
            body.failed = false
            const src = people.avatars[m.id]
            if (src) {
                const img = new Image()
                img.src = src
                img.onerror = () => (body.failed = true)
                body.avatar = img
            } else body.failed = true
            return body
        })
        Composite.add(engine.world, balls)

        const arrange = () => settledLayout(balls.length, w, h, r).forEach((p, i) => Body.setPosition(balls[i], p))

        if (!reduced) {
            const mouse: any = Mouse.create(render.canvas)
            mouse.element.removeEventListener("mousewheel", mouse.mousewheel)
            mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel)
            const drag: any = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.25, render: { visible: false } } as any })
            render.mouse = mouse
            Composite.add(engine.world, drag)
            Events.on(drag, "startdrag", (e: any) => setHeld(e.body?.memberName ?? null))
            Events.on(drag, "enddrag", () => setHeld(null))
        }

        Events.on(render, "afterRender", () => {
            const ctx = render.context
            for (const b of balls) {
                const { x, y } = b.position
                const pr = b.radius - RING - GAP
                ctx.save()
                ctx.translate(x, y)
                ctx.rotate(b.angle)
                ctx.beginPath()
                ctx.arc(0, 0, pr, 0, Math.PI * 2)
                ctx.clip()
                if (b.failed || !b.avatar?.complete || b.avatar.naturalWidth === 0) {
                    ctx.fillStyle = b.ring.bg
                    ctx.fill()
                    ctx.fillStyle = b.ring.on
                    ctx.font = `700 ${pr}px sans-serif`
                    ctx.textAlign = "center"
                    ctx.textBaseline = "middle"
                    ctx.fillText(b.memberName.slice(0, 1).toUpperCase(), 0, 1)
                } else ctx.drawImage(b.avatar, -pr, -pr, pr * 2, pr * 2)
                ctx.restore()
                ctx.beginPath()
                ctx.arc(x, y, b.radius - RING / 2, 0, Math.PI * 2)
                ctx.lineWidth = RING
                ctx.strokeStyle = b.ring.bg
                ctx.stroke()
            }
        })

        let runner: any = null
        if (reduced) {
            arrange()
            balls.forEach((b: any) => b.avatar?.addEventListener("load", () => Render.world(render)))
            Render.world(render)
        } else {
            Render.run(render)
            runner = Runner.create()
            Runner.run(runner, engine)
        }

        api.current = {
            shake: () => balls.forEach((b: any) => Body.setVelocity(b, { x: (Math.random() - 0.5) * 36, y: -Math.random() * 28 - 6 })),
            reset: () => balls.forEach((b: any) => { Body.setVelocity(b, { x: 0, y: 0 }); Body.setPosition(b, { x: Math.random() * (w - r * 2) + r, y: -Math.random() * 400 - r }) }),
            setFloat: (on) => { engine.gravity.y = on ? 0 : 1 },
        }

        const onResize = () => {
            w = host.clientWidth
            h = host.clientHeight
            const ratio = window.devicePixelRatio || 1
            render.options.width = w
            render.options.height = h
            render.bounds.max.x = w
            render.bounds.max.y = h
            render.canvas.width = w * ratio
            render.canvas.height = h * ratio
            render.canvas.style.width = `${w}px`
            render.canvas.style.height = `${h}px`
            Composite.remove(engine.world, wallBodies)
            wallBodies = walls()
            Composite.add(engine.world, wallBodies)
            if (reduced) { arrange(); Render.world(render) }
        }
        const ro = new ResizeObserver(onResize)
        ro.observe(host)

        return () => {
            ro.disconnect()
            api.current = null
            Render.stop(render)
            if (runner) Runner.stop(runner)
            Engine.clear(engine)
            render.canvas.remove()
        }
    }, [people, reduced])

    return (
        <Screen title="Balls" back={{ to: "/app/profile", label: "You" }}>
            {failed ? (
                <ErrorState title="Couldn't load the balls" body="Check your connection and try again." onRetry={() => { setFailed(false); setAttempt((n) => n + 1) }} />
            ) : (
                <>
                    <p className="mb-3 text-callout text-label-2">{reduced ? "Motion is off, so the balls are resting. Turn off Reduce motion in Settings to play." : "Everyone's photo, one pit. Drag to toss, shake the pile, or turn gravity off."}</p>
                    <div className="relative h-[calc(100dvh-20rem)] min-h-[320px] overflow-hidden rounded-card bg-surface">
                        <div ref={hostRef} className="absolute inset-0" />
                        {held && <p aria-live="polite" className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-inverse px-4 py-1.5 text-subhead font-bold text-on-inverse">{held}</p>}
                        {!people && <p role="status" className="absolute inset-0 grid place-items-center text-callout text-label-2">Filling the pit…</p>}
                    </div>
                    {!reduced && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="md" variant="primary" icon={<Zap aria-hidden className="size-4" />} onClick={() => api.current?.shake()}>
                                Shake
                            </Button>
                            <Button size="md" variant={float ? "primary" : "secondary"} icon={<Feather aria-hidden className="size-4" />} onClick={() => { setFloat(!float); api.current?.setFloat(!float) }}>
                                {float ? "Gravity off" : "Float"}
                            </Button>
                            <Button size="md" variant="secondary" icon={<RotateCcw aria-hidden className="size-4" />} onClick={() => api.current?.reset()}>
                                Drop again
                            </Button>
                        </div>
                    )}
                </>
            )}
        </Screen>
    )
}

export default BallsLab
