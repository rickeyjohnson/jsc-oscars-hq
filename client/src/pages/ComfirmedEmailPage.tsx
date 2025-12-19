import { CircleCheck } from "lucide-react"
import FallingProfileBallsPhysics from "../components/FallingProfileBallPhysics"

const ComfirmedEmailPage = () => {
    return (
        <>
            <div className="h-screen bg-zinc-900 min-h-screen flex items-center justify-center flex-col overflow-hidden text-[#fffadd]">
                <CircleCheck className="w-10 h-10 mb-7 text-center" />
                <p>Email confirmed, diddyblud </p>
                <p>You can close this tab, Einstein</p>
            </div>
            <FallingProfileBallsPhysics />
        </>
    )
}

export default ComfirmedEmailPage
