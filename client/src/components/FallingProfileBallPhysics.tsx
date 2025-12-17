/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react"
import {
    Engine,
    Render,
    Runner,
    Bodies,
    Composite,
    Mouse,
    MouseConstraint,
    Events,
} from "matter-js"

const BALL_COUNT = 13
const BALL_RADIUS = 40
const WALL_THICKNESS = 200

const FallingProfileBallsPhysics: React.FC = () => {
    const sceneRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!sceneRef.current) return

        const engine: any = Engine.create()
        engine.gravity.y = 1

        const render: any = Render.create({
            element: sceneRef.current,
            engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false,
                background: "transparent",
                pixelRatio: window.devicePixelRatio,
            } as any,
        })

        /* ---------- Walls ---------- */
        const createWalls = () => [
            Bodies.rectangle(
                window.innerWidth / 2,
                window.innerHeight + WALL_THICKNESS / 2,
                window.innerWidth + WALL_THICKNESS * 2,
                WALL_THICKNESS,
                { isStatic: true }
            ),
            Bodies.rectangle(
                -WALL_THICKNESS / 2,
                window.innerHeight / 2,
                WALL_THICKNESS,
                window.innerHeight + WALL_THICKNESS * 2,
                { isStatic: true }
            ),
            Bodies.rectangle(
                window.innerWidth + WALL_THICKNESS / 2,
                window.innerHeight / 2,
                WALL_THICKNESS,
                window.innerHeight + WALL_THICKNESS * 2,
                { isStatic: true }
            ),
        ]

        let walls: any = createWalls()
        Composite.add(engine.world, walls)

        /* ---------- Balls ---------- */
        const balls: any = Array.from({ length: BALL_COUNT }).map((_, index) => {
            const body = Bodies.circle(
                Math.random() * (window.innerWidth - BALL_RADIUS * 2) +
                    BALL_RADIUS,
                Math.random() * -300,
                BALL_RADIUS,
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

            return body
        })

        Composite.add(engine.world, balls)

        /* ---------- Mouse ---------- */
        const mouse = Mouse.create(render.canvas)
        const mouseConstraint: any = MouseConstraint.create(engine, {
            mouse,
            constraint: {
                stiffness: 0.25,
                render: { visible: false },
            } as any,
        })

        render.mouse = mouse
        Composite.add(engine.world, mouseConstraint)

        /* ---------- Custom Draw (Circle Mask) ---------- */
        Events.on(render, "afterRender", () => {
            const ctx = render.context

            balls.forEach(
                (ball: {
                    avatar: any
                    position: { x: any; y: any }
                    angle: any
                }) => {
                    if (!ball.avatar) return

                    const { x, y } = ball.position

                    ctx.save()
                    ctx.translate(x, y)
                    ctx.rotate(ball.angle)

                    ctx.beginPath()
                    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2)
                    ctx.clip()

                    ctx.drawImage(
                        ball.avatar,
                        -BALL_RADIUS,
                        -BALL_RADIUS,
                        BALL_RADIUS * 2,
                        BALL_RADIUS * 2
                    )

                    ctx.restore()
                }
            )
        })

        Render.run(render)
        const runner = Runner.create()
        Runner.run(runner, engine)

        /* ---------- Resize ---------- */
        const handleResize = () => {
            render.canvas.width = window.innerWidth
            render.canvas.height = window.innerHeight

            Composite.remove(engine.world, walls)
            walls = createWalls()
            Composite.add(engine.world, walls)
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
            Render.stop(render)
            Runner.stop(runner)
            Engine.clear(engine)
            render.canvas.remove()
        }
    }, [])

    return (
        <div ref={sceneRef} className="pointer-events-auto fixed inset-0 z-0" />
    )
}

export default FallingProfileBallsPhysics
