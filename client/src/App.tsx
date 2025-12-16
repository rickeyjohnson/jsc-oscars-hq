import { BrowserRouter, Route, Routes } from "react-router-dom"
import "./App.css"
import Logo from "./components/Logo"

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Logo/>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
