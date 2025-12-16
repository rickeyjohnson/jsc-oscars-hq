import { BrowserRouter, Route, Routes } from "react-router-dom"
import "./App.css"
import OscarLogo from "./components/OscarLogo"

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<OscarLogo/>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
