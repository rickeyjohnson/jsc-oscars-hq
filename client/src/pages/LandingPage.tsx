import FallingProfileBallsPhysics from "../components/FallingProfileBallPhysics"
import OscarLogo from "../components/OscarLogo"

const LandingPage = () => {
  return (
    <div className="bg-[#1a1717] min-h-screen flex items-center justify-center flex-col">
        <FallingProfileBallsPhysics />
        <OscarLogo />
        <p className="font-sans text-white -mt-4">The all-in-one platform for everything Oscars</p>
        <div className="flex gap-4 items-center m-5">
            <button className="px-6 py-3 rounded-full bg-[#302f2d] text-white hover:bg-[#45433f] font-medium">
                Get Started
            </button>
            <button className="px-6 py-3 rounded-full bg-white text-black hover:bg-[#e6e6e6] font-medium">
                Login
            </button>
        </div>
    </div>
  )
}

export default LandingPage