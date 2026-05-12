import { useState } from 'react'
import { Download, Link, Check } from 'lucide-react'
import { api } from '../../utils/api'

export default function ExportBar({ sessionId }) {
  const [copied, setCopied] = useState(false)

  function downloadPdf() {
    const url = api.snapshotUrl(sessionId)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfoliolens-${sessionId.slice(0, 8)}.pdf`
    a.click()
  }

  function copyLink() {
    const url = `${window.location.origin}/dashboard/${sessionId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={copyLink} className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-3">
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Link className="w-3 h-3" />}
        {copied ? 'Copied!' : 'Share'}
      </button>
      <button onClick={downloadPdf} className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
        <Download className="w-3 h-3" />
        PDF
      </button>
    </div>
  )
}
