import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import UploadPage from './pages/UploadPage'
import ManualPage from './pages/ManualPage'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import ETFExplorerPage from './pages/ETFExplorerPage'
import ETFEducationPage from './pages/ETFEducationPage'
import GrowthCalculatorPage from './pages/GrowthCalculatorPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="manual" element={<ManualPage />} />
        <Route path="etf-explorer" element={<ETFExplorerPage />} />
        <Route path="etf-guide" element={<ETFEducationPage />} />
        <Route path="growth-calculator" element={<GrowthCalculatorPage />} />
        <Route path="dashboard/:sessionId" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
