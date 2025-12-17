import { Link } from "react-router-dom"
import FallingProfileBallsPhysics from "../components/FallingProfileBallPhysics"
import OscarLogo from "../components/OscarLogo"
import { ChevronRight } from "lucide-react"

const LandingPage = () => {
    return (
        <div className="bg-zinc-900 min-h-screen flex items-center justify-center flex-col overflow-hidden text-[#fffadd]">
            <div className="z-10 flex flex-col items-center justify-center max-w-md">
                <OscarLogo size="small" />
                <div className="mx-auto my-6">Be there of be ...</div>
                <div className="flex gap-4 items-center m-5">
                    <Link to={"/login"}>
                        <button className="px-8 py-4 rounded-full bg-[#302f2d] text-[#fffadd] hover:bg-[#45433f] font-medium">
                            Login
                        </button>
                    </Link>
                    <Link to={"/signup"}>
                        <button className="px-8 py-4 rounded-full bg-[#fffadd] text-black hover:bg-[#e6e6e6] font-medium font-poppins inline-flex items-center gap-2 group">
                            Get Started{" "}
                            <ChevronRight className="group-hover:translate-x-1 transition" />
                        </button>
                    </Link>
                </div>
            </div>
            <FallingProfileBallsPhysics />
        </div>
    )
}

export default LandingPage
