import { Link } from "react-router-dom"
import FallingProfileBallsPhysics from "../components/FallingProfileBallPhysics"
import OscarLogo from "../components/OscarLogo"

const LandingPage = () => {

  return (
    <div className="bg-zinc-900 min-h-screen flex items-center justify-center flex-col">
        <div className="z-10 flex flex-col items-center justify-center">
          <OscarLogo />
          <p className="font-sans text-white -mt-4">The all-in-one platform for everything Oscars</p>
          <div className="flex gap-4 items-center m-5">
             <Link to={"/signup"}>
                <button className="px-6 py-3 rounded-full bg-[#302f2d] text-white hover:bg-[#45433f] font-medium">
                    Get Started
                </button>
             </Link>
              <Link to="/login">
                <button className="px-6 py-3 rounded-full bg-white text-black hover:bg-[#e6e6e6] font-medium">
                    Login
                </button>
              </Link>
          </div>
        </div>
        <FallingProfileBallsPhysics />
    </div>
  )
}

export default LandingPage