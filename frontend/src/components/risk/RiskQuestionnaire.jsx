import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { api } from '../../utils/api'

export default function RiskQuestionnaire({ onComplete }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState([])

  useEffect(() => {
    api.getRiskQuestions()
      .then(data => setQuestions(data.questions))
      .catch(err => setError(err.message || 'Failed to load questions.'))
      .finally(() => setLoading(false))
  }, [])

  function selectChoice(value) {
    const next = [...answers]
    next[step] = value
    setAnswers(next)

    if (step < questions.length - 1) {
      setStep(step + 1)
    } else {
      onComplete(next)
    }
  }

  function goBack() {
    if (step > 0) setStep(step - 1)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        <p className="text-slate-500 text-sm">Loading questions…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    )
  }

  const q = questions[step]
  const progress = ((step) / questions.length) * 100

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-8">
        {step > 0 && (
          <button onClick={goBack} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-slate-500 text-xs font-medium shrink-0">{step + 1} / {questions.length}</span>
      </div>

      <h2 className="text-xl font-bold text-white mb-6 leading-snug">{q.question}</h2>

      <div className="space-y-2">
        {q.choices.map((choice) => (
          <button
            key={choice.value}
            onClick={() => selectChoice(choice.value)}
            className="w-full text-left px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-800/40 hover:border-blue-500/60 hover:bg-blue-500/5 text-slate-200 text-sm font-medium transition-colors"
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  )
}
