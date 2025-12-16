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
    Body,
} from "matter-js"

const BALL_COUNT = 13
const BALL_RADIUS = 40

interface BallBody extends Body {
    avatar?: HTMLImageElement
}

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
        const ground = Bodies.rectangle(
            window.innerWidth / 2,
            window.innerHeight + 50,
            window.innerWidth,
            100,
            { isStatic: true }
        )

        const leftWall = Bodies.rectangle(
            -50,
            window.innerHeight / 2,
            100,
            window.innerHeight,
            { isStatic: true }
        )

        const rightWall = Bodies.rectangle(
            window.innerWidth + 50,
            window.innerHeight / 2,
            100,
            window.innerHeight,
            { isStatic: true }
        )

        /* ---------- Balls ---------- */
        const balls: BallBody[] = Array.from({ length: BALL_COUNT }).map(() => {
            const body = Bodies.circle(
                Math.random() * window.innerWidth,
                Math.random() * -400,
                BALL_RADIUS,
                {
                    restitution: 0.85,
                    friction: 0.1,
                    render: { visible: false }, // we draw manually
                }
            ) as BallBody

            const img = new Image()
            img.src = "/blank-pfp.png"
            body.avatar = img

            return body
        })

        /* ---------- Mouse ---------- */
        const mouse = Mouse.create(render.canvas)
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse,
            constraint: {
                stiffness: 0.25,
                render: {
                    visible: false,
                },
            } as any,
        })

        render.mouse = mouse

        Composite.add(engine.world, [
            ground,
            leftWall,
            rightWall,
            mouseConstraint,
            ...balls,
        ] as any)

        /* ---------- Custom Draw (Circle Mask) ---------- */
        Events.on(render, "afterRender", () => {
            const ctx = render.context

            balls.forEach((ball) => {
                if (!ball.avatar) return

                const { x, y } = ball.position

                ctx.save()
                ctx.translate(x, y)
                ctx.rotate(ball.angle)

                // Circle mask
                ctx.beginPath()
                ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()

                // Draw image centered
                ctx.drawImage(
                    ball.avatar,
                    -BALL_RADIUS,
                    -BALL_RADIUS,
                    BALL_RADIUS * 2,
                    BALL_RADIUS * 2
                )

                ctx.restore()
            })
        })

        Render.run(render)
        const runner = Runner.create()
        Runner.run(runner, engine)

        /* ---------- Resize ---------- */
        const handleResize = () => {
            render.canvas.width = window.innerWidth
            render.canvas.height = window.innerHeight
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
