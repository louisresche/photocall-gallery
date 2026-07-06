import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GalleryPage from './pages/GalleryPage'
import ExpiredPage from './pages/ExpiredPage'
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/g/:sessionId" element={<GalleryPage />} />
        <Route path="/expired" element={<ExpiredPage />} />
      </Routes>
    </BrowserRouter>
  )
}
