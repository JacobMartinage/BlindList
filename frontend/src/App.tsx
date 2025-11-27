import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CreatorView from './pages/CreatorView'
import BuyerView from './pages/BuyerView'
import MyLists from './pages/MyLists'
import FindLists from './pages/FindLists'
import VerifyEmail from './pages/VerifyEmail'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/my-lists" element={<MyLists />} />
        <Route path="/find-lists" element={<FindLists />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/list/creator/:token" element={<CreatorView />} />
        <Route path="/list/buyer/:token" element={<BuyerView />} />
      </Routes>
    </div>
  )
}

export default App
