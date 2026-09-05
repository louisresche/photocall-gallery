import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GalleryPage from './pages/GalleryPage'
import ExpiredPage from './pages/ExpiredPage'
import { PrivacyPage, TermsPage } from './pages/LegalPage'
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/g/:sessionId" element={<GalleryPage />} />
        <Route path="/expired" element={<ExpiredPage />} />
        <Route path="/confidentialite" element={<PrivacyPage />} />
        <Route path="/conditions" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
