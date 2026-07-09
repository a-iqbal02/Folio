import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import ETFExplorerPage from './pages/ETFExplorerPage'
import ETFEducationPage from './pages/ETFEducationPage'
import GrowthCalculatorPage from './pages/GrowthCalculatorPage'
import ETFComparePage from './pages/ETFComparePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AccountPage from './pages/AccountPage'
import RiskAssessmentPage from './pages/RiskAssessmentPage'
import ModelPortfoliosPage from './pages/ModelPortfoliosPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="manual" element={<Navigate to="/upload" replace />} />
        <Route path="etf-explorer" element={<ETFExplorerPage />} />
        <Route path="etf-guide" element={<ETFEducationPage />} />
        <Route path="growth-calculator" element={<GrowthCalculatorPage />} />
        <Route path="etf-compare" element={<ETFComparePage />} />
        <Route path="dashboard/:sessionId" element={<DashboardPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="risk-assessment" element={<RiskAssessmentPage />} />
        <Route path="model-portfolios" element={<ModelPortfoliosPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
