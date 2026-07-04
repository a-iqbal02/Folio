import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldQuestion, Loader2, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import RiskQuestionnaire from '../components/risk/RiskQuestionnaire'
import RiskResultChart from '../components/risk/RiskResultChart'

export default function RiskAssessmentPage() {
  const { user } = useAuth()
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleComplete(answers) {
    setSubmitting(true)
    setError(null)
    try {
      const data = await api.submitRiskAnswers(answers)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Something went wrong scoring your answers.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleRetake() {
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {!result && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <ShieldQuestion className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Risk Assessment</h1>
          </div>
          <p className="text-slate-400 text-sm">
            5 quick questions to gauge your investing time horizon, risk capacity, and reaction to volatility —
            mapped to a suggested asset allocation.
          </p>
        </div>
      )}

      {submitting ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          <p className="text-slate-500 text-sm">Scoring your answers…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      ) : result ? (
        <>
          <RiskResultChart result={result} onRetake={handleRetake} />
          {!user && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 mt-6 text-sm text-blue-300">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                <Link to="/login" className="font-semibold underline hover:text-blue-200">Log in</Link> or{' '}
                <Link to="/register" className="font-semibold underline hover:text-blue-200">sign up</Link>{' '}
                to save this risk profile to your account.
              </span>
            </div>
          )}
        </>
      ) : (
        <RiskQuestionnaire onComplete={handleComplete} />
      )}
    </div>
  )
}
