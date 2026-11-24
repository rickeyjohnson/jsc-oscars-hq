/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react"
import {
    Engine,
    Render,
    Runner,
    Bodies,
    Body,
    Composite,
    Mouse,
    MouseConstraint,
    Events,
} from "matter-js"
import { settledLayout } from "../ui/logic/settle"
import { BALL_RADIUS_MAX, ballRadius, ballRingColor } from "../ui/logic/landingBalls"

const BALL_COUNT = 14
const WALL_THICKNESS = 200
const RING_WIDTH = 3
const RING_GAP = 2

// The fixed layer is sized by the browser (inset-0 tracks the dynamic viewport), so measure it instead of window.inner*.
const measure = (el: HTMLElement) => {
    const vv = window.visualViewport
    return {
        w: el.clientWidth || vv?.width || window.innerWidth,
        h: el.clientHeight || vv?.height || window.innerHeight,
    }
}

/** `contained` fills its (positioned) parent instead of the whole screen, for use inside a page like the Balls lab. */
const FallingProfileBallsPhysics: React.FC<{ contained?: boolean }> = ({ contained = false }) => {
    const sceneRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const host = sceneRef.current
        if (!host) return
        const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        let { w, h } = measure(host)

        const engine: any = Engine.create()
        engine.gravity.y = 1

        const render: any = Render.create({
            element: host,
            engine,
            options: {
                width: w,
                height: h,
                wireframes: false,
                background: "transparent",
                pixelRatio: window.devicePixelRatio,
            } as any,
        })
        render.canvas.setAttribute("aria-hidden", "true")
        render.canvas.style.touchAction = "none"

        /* ---------- Walls ---------- */
        const createWalls = () => [
            Bodies.rectangle(w / 2, h + WALL_THICKNESS / 2, w + WALL_THICKNESS * 2, WALL_THICKNESS, { isStatic: true }),
            Bodies.rectangle(-WALL_THICKNESS / 2, h / 2, WALL_THICKNESS, h + WALL_THICKNESS * 2, { isStatic: true }),
            Bodies.rectangle(w + WALL_THICKNESS / 2, h / 2, WALL_THICKNESS, h + WALL_THICKNESS * 2, { isStatic: true }),
        ]

        let walls: any = createWalls()
        Composite.add(engine.world, walls)

        /* ---------- Balls ---------- */
        const balls: any = Array.from({ length: BALL_COUNT }).map((_, index) => {
            const body = Bodies.circle(
                Math.random() * (w - ballRadius(index) * 2) + ballRadius(index),
                Math.random() * -300,
                ballRadius(index),
                {
                    restitution: 0.85,
                    friction: 0.1,
                    frictionAir: 0.01,
                    render: { visible: false },
                }
            ) as any

            const img = new Image()
            img.src = "/sidechatters/" + (index + 1) + ".jpg"
            body.avatar = img
            body.radius = ballRadius(index)
            body.failed = false
            // A 404 would draw as a blank ring (and drawImage throws on a broken image): fill the ring with its pebble instead.
            img.onerror = () => {
                body.failed = true
            }
            body.ringColor = ballRingColor(index)

            return body
        })

        Composite.add(engine.world, balls)

        /* ---------- Reduced motion: settled arrangement, drawn once ---------- */
        const arrange = () => {
            settledLayout(BALL_COUNT, w, h, BALL_RADIUS_MAX).forEach((p, i) => Body.setPosition(balls[i], p))
        }

        /* ---------- Mouse ---------- */
        if (!reduced) {
            const mouse: any = Mouse.create(render.canvas)
            if (contained) {
                // Inside a scrolling page the pit must not swallow the wheel.
                mouse.element.removeEventListener("mousewheel", mouse.mousewheel)
                mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel)
            }
            const mouseConstraint: any = MouseConstraint.create(engine, {
                mouse,
                constraint: {
                    stiffness: 0.25,
                    render: { visible: false },
                } as any,
            })
            render.mouse = mouse
            Composite.add(engine.world, mouseConstraint)
        }

        /* ---------- Custom Draw (Circle Mask) ---------- */
        Events.on(render, "afterRender", () => {
            const ctx = render.context

            balls.forEach(
                (ball: {
                    avatar: any
                    radius: number
                    failed: boolean
                    ringColor: string
                    position: { x: any; y: any }
                    angle: any
                }) => {
                    if (!ball.avatar) return

                    const { x, y } = ball.position

                    ctx.save()
                    ctx.translate(x, y)
                    ctx.rotate(ball.angle)

                    ctx.beginPath()
                    // Photo sits inside a pebble-colored ring with a small transparent gap.
                    const photoR = ball.radius - RING_WIDTH - RING_GAP
                    ctx.arc(0, 0, photoR, 0, Math.PI * 2)
                    ctx.clip()

                    if (ball.failed) {
                        ctx.fillStyle = ball.ringColor
                        ctx.fill()
                    } else {
                        ctx.drawImage(ball.avatar, -photoR, -photoR, photoR * 2, photoR * 2)
                    }
                    ctx.restore()

                    ctx.save()
                    ctx.translate(x, y)
                    ctx.beginPath()
                    ctx.arc(0, 0, ball.radius - RING_WIDTH / 2, 0, Math.PI * 2)
                    ctx.lineWidth = RING_WIDTH
                    ctx.strokeStyle = ball.ringColor
                    ctx.stroke()

                    ctx.restore()
                }
            )
        })

        let runner: any = null
        if (reduced) {
            arrange()
            const draw = () => Render.world(render)
            balls.forEach((b: any) => {
                b.avatar.addEventListener("load", draw)
                b.avatar.addEventListener("error", draw)
            })
            draw()
        } else {
            Render.run(render)
            runner = Runner.create()
            Runner.run(runner, engine)
        }

        /* ---------- Resize ---------- */
        const handleResize = () => {
            ;({ w, h } = measure(host))
            const ratio = window.devicePixelRatio || 1
            render.options.width = w
            render.options.height = h
            render.bounds.max.x = w
            render.bounds.max.y = h
            render.canvas.width = w * ratio
            render.canvas.height = h * ratio
            render.canvas.style.width = `${w}px`
            render.canvas.style.height = `${h}px`

            Composite.remove(engine.world, walls)
            walls = createWalls()
            Composite.add(engine.world, walls)
            if (reduced) {
                arrange()
                Render.world(render)
            }
        }

        window.addEventListener("resize", handleResize)
        window.visualViewport?.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
            window.visualViewport?.removeEventListener("resize", handleResize)
            Render.stop(render)
            if (runner) Runner.stop(runner)
            Engine.clear(engine)
            render.canvas.remove()
        }
    }, [])

    return <div ref={sceneRef} className={contained ? "absolute inset-0 z-0" : "pointer-events-auto fixed inset-0 z-0"} />
}

export default FallingProfileBallsPhysics
